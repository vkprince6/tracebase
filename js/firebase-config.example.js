/**
 * TRACEBASE — Firebase Configuration (EXAMPLE)
 * -------------------------------------------------------
 * 1. Copy this file to js/firebase-config.js
 * 2. Replace the placeholders below with the values from
 *    Firebase Console → Project Settings → General → Your apps → SDK setup and configuration.
 *
 * IMPORTANT:
 * The values below (apiKey, authDomain, projectId, etc.) are PUBLIC
 * client identifiers. They are safe to ship in frontend code — they are
 * NOT secrets. Firebase security is enforced by Firestore/Storage
 * Security Rules (see /firebase/firestore.rules and /firebase/storage.rules),
 * not by hiding this config.
 *
 * Do NOT put any server-side secret key, service-account JSON, or
 * Admin SDK credential in frontend code. Those must only ever live
 * in a secure backend/CI environment, never in this repository's
 * client-side files.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
