/**
 * TRACEBASE — Authentication
 * Wraps Firebase Authentication + the corresponding /users/{uid} Firestore profile.
 */
import { auth, db } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

/** Friendly error messages — never expose raw Firebase error codes to end users. */
function friendlyAuthError(error) {
  const code = error?.code || "";
  const map = {
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/user-disabled": "This account has been disabled. Contact your administrator.",
    "auth/user-not-found": "No account found with that email or password.",
    "auth/wrong-password": "No account found with that email or password.",
    "auth/invalid-credential": "No account found with that email or password.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
    "auth/network-request-failed": "Network error. Check your connection and try again.",
  };
  return map[code] || "Something went wrong. Please try again.";
}

/**
 * Log in a user with email/password.
 * @param {string} email
 * @param {string} password
 * @param {boolean} rememberMe - if false, session persists only for the current tab/session.
 */
export async function login(email, password, rememberMe = true) {
  try {
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);

    const profile = await getUserProfile(credential.user.uid);
    if (profile && profile.active === false) {
      await signOut(auth);
      return { success: false, message: "Your account has been disabled. Contact your administrator." };
    }
    return { success: true, user: credential.user, profile };
  } catch (error) {
    return { success: false, message: friendlyAuthError(error) };
  }
}

export async function logout() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, message: "Unable to log out. Please try again." };
  }
}

export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email.trim());
    return { success: true, message: "Password reset email sent. Check your inbox." };
  } catch (error) {
    // Do not reveal whether the email exists — respond generically for unknown accounts.
    if (error?.code === "auth/user-not-found") {
      return { success: true, message: "If an account exists for that email, a reset link has been sent." };
    }
    return { success: false, message: friendlyAuthError(error) };
  }
}

/** Fetch the Firestore user profile document for a given uid. */
export async function getUserProfile(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? { userId: snap.id, ...snap.data() } : null;
  } catch (error) {
    console.error("Failed to load user profile", error);
    return null;
  }
}

/**
 * Create the Firestore profile document for a newly created Firebase Auth user.
 * Typically called once, right after Firebase Authentication account creation
 * (e.g. by an admin via the Team page, or during first-admin setup — see README).
 */
export async function createUserProfile(uid, { name, email, role = "assignee", department = "", designation = "" }) {
  const profile = {
    name,
    email,
    role,
    department,
    designation,
    profilePhoto: "",
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(doc(db, "users", uid), profile);
  return profile;
}

/**
 * Subscribe to authentication state changes. Calls back with { user, profile } or null.
 * Returns the unsubscribe function.
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback(null);
      return;
    }
    const profile = await getUserProfile(user.uid);
    callback({ user, profile });
  });
}

export function currentUser() {
  return auth.currentUser;
}
