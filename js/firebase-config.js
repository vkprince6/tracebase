/**
 * TRACEBASE — Firebase Configuration
 * -------------------------------------------------------
 * These are the PUBLIC client identifiers for the Firebase project.
 * They are safe to include in frontend code — they identify which Firebase
 * project the app talks to. Security is enforced by Firestore/Storage
 * Security Rules (see /firebase/), NOT by hiding this config.
 *
 * Do NOT put any Firebase Admin SDK service-account key or any other
 * server-side secret in this file or anywhere in this repository.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyB8bW-bRS9J2zhP5VQ-KnyQlSxLRI_kNao",
  authDomain: "trackbase-2f55f.firebaseapp.com",
  projectId: "trackbase-2f55f",
  storageBucket: "trackbase-2f55f.firebasestorage.app",
  messagingSenderId: "348469798348",
  appId: "1:348469798348:web:b0450458d86979fbe86969",
  measurementId: "G-F1VPBZMNRY",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
