/**
 * TRACEBASE — Notifications
 */
import { db } from "./firebase-config.js";
import {
  collection, addDoc, doc, updateDoc, query, where, orderBy, limit,
  onSnapshot, getDocs, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { generateId } from "./utils.js";

const NOTIF_COLLECTION = "notifications";

/**
 * Create a notification for a user.
 * type: "task_assigned" | "task_reassigned" | "due_soon" | "overdue" | "comment_added" |
 *       "mentioned" | "status_changed" | "sent_for_review" | "task_completed"
 */
export async function createNotification({ userId, type, title, message, taskId = null, projectId = null }) {
  if (!userId) return;
  try {
    await addDoc(collection(db, NOTIF_COLLECTION), {
      notificationId: generateId("notif"),
      userId, type, title, message, taskId, projectId,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to create notification", error);
  }
}

export function subscribeUnreadNotificationCount(userId, callback) {
  const q = query(collection(db, NOTIF_COLLECTION), where("userId", "==", userId), where("read", "==", false));
  return onSnapshot(q, (snap) => callback(snap.size), (error) => {
    console.error("Notification subscription error", error);
    callback(0);
  });
}

export async function loadRecentNotifications(userId, max = 15) {
  try {
    const q = query(collection(db, NOTIF_COLLECTION), where("userId", "==", userId), orderBy("createdAt", "desc"), limit(max));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ notificationId: d.id, ...d.data() }));
  } catch (error) {
    console.error("Failed to load notifications", error);
    return [];
  }
}

export async function markNotificationRead(notificationId) {
  try {
    await updateDoc(doc(db, NOTIF_COLLECTION, notificationId), { read: true });
  } catch (error) {
    console.error("Failed to mark notification read", error);
  }
}
