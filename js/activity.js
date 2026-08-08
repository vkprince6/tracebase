/**
 * TRACEBASE — Activity History
 * Every meaningful task operation is logged here for the task's activity timeline.
 */
import { db } from "./firebase-config.js";
import {
  collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { generateId } from "./utils.js";

const ACTIVITY_COLLECTION = "activity";

/**
 * Log an activity entry.
 * action: "created" | "assigned" | "reassigned" | "status_changed" | "priority_changed" |
 *         "due_date_changed" | "progress_changed" | "comment_added" | "link_added" |
 *         "time_updated" | "completed" | "reopened"
 */
export async function logActivity({ taskId, projectId, userId, userName, userPhoto = "", action, message }) {
  try {
    await addDoc(collection(db, ACTIVITY_COLLECTION), {
      activityId: generateId("act"),
      taskId, projectId, userId, userName, userPhoto,
      action, message,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to log activity", error);
  }
}

/** Subscribe to a task's activity feed in chronological order (oldest first). */
export function subscribeTaskActivity(taskId, callback) {
  const q = query(collection(db, ACTIVITY_COLLECTION), where("taskId", "==", taskId), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, (error) => {
    console.error("Activity subscription error", error);
    callback([]);
  });
}

/** Human-readable status transition helper. */
export function statusChangeMessage(oldStatus, newStatus) {
  return `changed status from ${oldStatus} to ${newStatus}`;
}
