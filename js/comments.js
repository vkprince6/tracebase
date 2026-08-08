/**
 * TRACEBASE — Comments
 */
import { db } from "./firebase-config.js";
import {
  collection, addDoc, doc, updateDoc, deleteDoc, query, where, orderBy,
  onSnapshot, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { generateId } from "./utils.js";
import { logActivity } from "./activity.js";

const COMMENTS_COLLECTION = "comments";

export async function addComment({ taskId, projectId, userId, userName, userPhoto = "", comment, links = [] }) {
  const commentId = generateId("cmt");
  await addDoc(collection(db, COMMENTS_COLLECTION), {
    commentId, taskId, userId, userName, userPhoto, comment, links,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  await logActivity({
    taskId, projectId, userId, userName, userPhoto,
    action: "comment_added",
    message: `added a comment`,
  });
  return commentId;
}

export async function editComment(docId, newText) {
  await updateDoc(doc(db, COMMENTS_COLLECTION, docId), { comment: newText, updatedAt: serverTimestamp() });
}

export async function deleteComment(docId) {
  await deleteDoc(doc(db, COMMENTS_COLLECTION, docId));
}

/** Subscribe to a task's comment timeline, oldest first. */
export function subscribeTaskComments(taskId, callback) {
  const q = query(collection(db, COMMENTS_COLLECTION), where("taskId", "==", taskId), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ docId: d.id, ...d.data() })));
  }, (error) => {
    console.error("Comments subscription error", error);
    callback([]);
  });
}
