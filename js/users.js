/**
 * TRACEBASE — Users / Team Management
 * NOTE: creating a brand-new login (Firebase Auth account) for a teammate
 * requires the Firebase Admin SDK and must happen in a trusted backend
 * (e.g. a Cloud Function) — the client SDK cannot create other users'
 * auth accounts without signing in as them. This module manages the
 * Firestore `users/{uid}` profile documents (role, status, details) for
 * accounts that already exist in Firebase Authentication. See README
 * "How to add users" for the full workflow.
 */
import { db } from "./firebase-config.js";
import {
  collection, doc, getDoc, getDocs, updateDoc, query, orderBy, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const USERS_COLLECTION = "users";

export async function listUsers() {
  try {
    const q = query(collection(db, USERS_COLLECTION), orderBy("name", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ userId: d.id, ...d.data() }));
  } catch (error) {
    console.error("Failed to list users", error);
    return [];
  }
}

export async function getUser(userId) {
  const snap = await getDoc(doc(db, USERS_COLLECTION, userId));
  return snap.exists() ? { userId: snap.id, ...snap.data() } : null;
}

/** Admin: update a user's editable profile fields (role, department, designation, name). */
export async function updateUserProfile(userId, fields) {
  await updateDoc(doc(db, USERS_COLLECTION, userId), { ...fields, updatedAt: serverTimestamp() });
}

export async function setUserActive(userId, active) {
  await updateDoc(doc(db, USERS_COLLECTION, userId), { active, updatedAt: serverTimestamp() });
}

export async function setUserRole(userId, role) {
  await updateDoc(doc(db, USERS_COLLECTION, userId), { role, updatedAt: serverTimestamp() });
}
