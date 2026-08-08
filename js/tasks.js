/**
 * TRACEBASE — Tasks
 * Core task CRUD, status transitions, progress, and time tracking.
 * Every mutating operation also writes an activity log entry (see activity.js)
 * and, where relevant, a notification (see notifications.js).
 */
import { db } from "./firebase-config.js";
import {
  collection, addDoc, doc, getDoc, getDocs, updateDoc, query, where, orderBy,
  onSnapshot, serverTimestamp, Timestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { generateId, clampHours, clampPercent } from "./utils.js";
import { logActivity } from "./activity.js";
import { createNotification } from "./notifications.js";

const TASKS_COLLECTION = "tasks";

function toTimestamp(dateStr) {
  if (!dateStr) return null;
  return Timestamp.fromDate(new Date(dateStr));
}

export async function createTask({
  projectId, projectName, title, description, assigneeId, assigneeName,
  reporterId, reporterName, priority = "Medium", status = "Not Started",
  startDate, dueDate, allocatedHours = 0, tags = [], links = [], createdBy, createdByName,
}) {
  const taskId = generateId("task");
  const payload = {
    taskId, projectId, projectName, title, description,
    assigneeId, assigneeName, reporterId, reporterName,
    priority, status, progress: 0,
    startDate: toTimestamp(startDate), dueDate: toTimestamp(dueDate),
    allocatedHours: clampHours(allocatedHours), actualHours: 0,
    remainingHours: clampHours(allocatedHours),
    tags, links,
    createdBy, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), completedAt: null,
  };
  const ref = await addDoc(collection(db, TASKS_COLLECTION), payload);

  await logActivity({
    taskId, projectId, userId: createdBy, userName: createdByName,
    action: "created", message: `created this task`,
  });

  if (assigneeId && assigneeId !== createdBy) {
    await createNotification({
      userId: assigneeId, type: "task_assigned",
      title: "New task assigned", message: `You were assigned "${title}"`,
      taskId, projectId,
    });
  }

  return { docId: ref.id, ...payload };
}

export async function getTask(docId) {
  const snap = await getDoc(doc(db, TASKS_COLLECTION, docId));
  return snap.exists() ? { docId: snap.id, ...snap.data() } : null;
}

export async function listAllTasks() {
  try {
    const q = query(collection(db, TASKS_COLLECTION), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ docId: d.id, ...d.data() }));
  } catch (error) {
    console.error("Failed to list tasks", error);
    return [];
  }
}

export function subscribeAllTasks(callback) {
  const q = query(collection(db, TASKS_COLLECTION), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ docId: d.id, ...d.data() }))), (error) => {
    console.error("Tasks subscription error", error);
    callback([]);
  });
}

export function subscribeProjectTasks(projectId, callback) {
  const q = query(collection(db, TASKS_COLLECTION), where("projectId", "==", projectId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ docId: d.id, ...d.data() }))), (error) => {
    console.error("Project tasks subscription error", error);
    callback([]);
  });
}

export function subscribeAssigneeTasks(assigneeId, callback) {
  const q = query(collection(db, TASKS_COLLECTION), where("assigneeId", "==", assigneeId), orderBy("dueDate", "asc"));
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ docId: d.id, ...d.data() }))), (error) => {
    console.error("My tasks subscription error", error);
    callback([]);
  });
}

/* ---------------- Mutations ---------------- */

const VALID_TRANSITIONS = {
  "Not Started": ["In Progress", "Blocked"],
  "In Progress": ["Review", "Blocked", "Not Started"],
  "Blocked": ["In Progress", "Not Started"],
  "Review": ["Completed", "In Progress"],
  "Completed": ["In Progress"], // reopen
};

export function isValidStatusTransition(from, to) {
  if (from === to) return false;
  return (VALID_TRANSITIONS[from] || []).includes(to);
}

export async function updateTaskStatus(docId, task, newStatus, actor) {
  const oldStatus = task.status;
  const updates = { status: newStatus, updatedAt: serverTimestamp() };
  if (newStatus === "Completed") {
    updates.completedAt = serverTimestamp();
    updates.progress = 100;
  }
  if (oldStatus === "Completed" && newStatus !== "Completed") {
    updates.completedAt = null;
  }
  await updateDoc(doc(db, TASKS_COLLECTION, docId), updates);

  await logActivity({
    taskId: task.taskId, projectId: task.projectId, userId: actor.userId, userName: actor.name,
    action: "status_changed",
    message: `changed status from ${oldStatus} to ${newStatus}`,
  });

  const notifyTargets = new Set();
  if (task.reporterId && task.reporterId !== actor.userId) notifyTargets.add(task.reporterId);
  if (task.assigneeId && task.assigneeId !== actor.userId) notifyTargets.add(task.assigneeId);

  if (newStatus === "Review") {
    notifyTargets.forEach((uid) => createNotification({
      userId: uid, type: "sent_for_review", title: "Task sent for review",
      message: `"${task.title}" is ready for review`, taskId: task.taskId, projectId: task.projectId,
    }));
  } else if (newStatus === "Completed") {
    notifyTargets.forEach((uid) => createNotification({
      userId: uid, type: "task_completed", title: "Task completed",
      message: `"${task.title}" was marked completed`, taskId: task.taskId, projectId: task.projectId,
    }));
  } else {
    notifyTargets.forEach((uid) => createNotification({
      userId: uid, type: "status_changed", title: "Task status updated",
      message: `"${task.title}" moved to ${newStatus}`, taskId: task.taskId, projectId: task.projectId,
    }));
  }
}

export async function updateTaskProgress(docId, task, progress, actor) {
  const p = clampPercent(progress);
  await updateDoc(doc(db, TASKS_COLLECTION, docId), { progress: p, updatedAt: serverTimestamp() });
  await logActivity({
    taskId: task.taskId, projectId: task.projectId, userId: actor.userId, userName: actor.name,
    action: "progress_changed", message: `updated progress to ${p}%`,
  });
}

export async function updateTaskTime(docId, task, actualHours, actor) {
  const actual = clampHours(actualHours);
  const remaining = clampHours(Math.max(0, (task.allocatedHours || 0) - actual));
  await updateDoc(doc(db, TASKS_COLLECTION, docId), {
    actualHours: actual, remainingHours: remaining, updatedAt: serverTimestamp(),
  });
  await logActivity({
    taskId: task.taskId, projectId: task.projectId, userId: actor.userId, userName: actor.name,
    action: "time_updated", message: `logged actual time as ${actual}h`,
  });
}

export async function reassignTask(docId, task, newAssigneeId, newAssigneeName, actor) {
  await updateDoc(doc(db, TASKS_COLLECTION, docId), {
    assigneeId: newAssigneeId, assigneeName: newAssigneeName, updatedAt: serverTimestamp(),
  });
  await logActivity({
    taskId: task.taskId, projectId: task.projectId, userId: actor.userId, userName: actor.name,
    action: "reassigned", message: `reassigned task from ${task.assigneeName || "unassigned"} to ${newAssigneeName}`,
  });
  if (newAssigneeId) {
    await createNotification({
      userId: newAssigneeId, type: "task_reassigned", title: "Task reassigned to you",
      message: `"${task.title}" was reassigned to you`, taskId: task.taskId, projectId: task.projectId,
    });
  }
}

export async function updateTaskPriority(docId, task, newPriority, actor) {
  await updateDoc(doc(db, TASKS_COLLECTION, docId), { priority: newPriority, updatedAt: serverTimestamp() });
  await logActivity({
    taskId: task.taskId, projectId: task.projectId, userId: actor.userId, userName: actor.name,
    action: "priority_changed", message: `changed priority from ${task.priority} to ${newPriority}`,
  });
}

export async function updateTaskDueDate(docId, task, newDueDate, actor) {
  await updateDoc(doc(db, TASKS_COLLECTION, docId), { dueDate: toTimestamp(newDueDate), updatedAt: serverTimestamp() });
  await logActivity({
    taskId: task.taskId, projectId: task.projectId, userId: actor.userId, userName: actor.name,
    action: "due_date_changed", message: `changed the due date`,
  });
}

export async function addTaskLink(docId, task, link, actor) {
  const updatedLinks = [...(task.links || []), { ...link, addedBy: actor.name, addedAt: new Date().toISOString() }];
  await updateDoc(doc(db, TASKS_COLLECTION, docId), { links: updatedLinks, updatedAt: serverTimestamp() });
  await logActivity({
    taskId: task.taskId, projectId: task.projectId, userId: actor.userId, userName: actor.name,
    action: "link_added", message: `added a link: ${link.title || link.url}`,
  });
}

/* ---------------- Filtering / sorting helpers ---------------- */
export function filterTasks(tasks, filters = {}) {
  return tasks.filter((t) => {
    if (filters.project && t.projectId !== filters.project) return false;
    if (filters.assignee && t.assigneeId !== filters.assignee) return false;
    if (filters.reporter && t.reporterId !== filters.reporter) return false;
    if (filters.status && t.status !== filters.status) return false;
    if (filters.priority && t.priority !== filters.priority) return false;
    if (filters.tag && !(t.tags || []).includes(filters.tag)) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!t.title?.toLowerCase().includes(q) && !t.taskId?.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}
