/**
 * TRACEBASE — Projects
 */
import { db } from "./firebase-config.js";
import {
  collection, addDoc, doc, getDoc, getDocs, updateDoc, query, where, orderBy,
  onSnapshot, serverTimestamp, Timestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { generateId } from "./utils.js";

const PROJECTS_COLLECTION = "projects";

function toTimestamp(dateStr) {
  if (!dateStr) return null;
  return Timestamp.fromDate(new Date(dateStr));
}

export async function createProject({ projectName, description, projectManager, reporter, startDate, dueDate, priority = "Medium", createdBy }) {
  const projectId = generateId("proj");
  const payload = {
    projectId, projectName, description,
    projectManager, reporter,
    startDate: toTimestamp(startDate),
    dueDate: toTimestamp(dueDate),
    status: "Planning",
    priority,
    progress: 0,
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, PROJECTS_COLLECTION), payload);
  return { docId: ref.id, ...payload };
}

export async function updateProject(docId, fields) {
  const payload = { ...fields, updatedAt: serverTimestamp() };
  if (fields.startDate !== undefined) payload.startDate = toTimestamp(fields.startDate);
  if (fields.dueDate !== undefined) payload.dueDate = toTimestamp(fields.dueDate);
  await updateDoc(doc(db, PROJECTS_COLLECTION, docId), payload);
}

export async function archiveProject(docId) {
  await updateDoc(doc(db, PROJECTS_COLLECTION, docId), { status: "Archived", updatedAt: serverTimestamp() });
}

export async function getProject(docId) {
  const snap = await getDoc(doc(db, PROJECTS_COLLECTION, docId));
  return snap.exists() ? { docId: snap.id, ...snap.data() } : null;
}

export async function listProjects({ includeArchived = false } = {}) {
  try {
    const q = query(collection(db, PROJECTS_COLLECTION), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    let projects = snap.docs.map((d) => ({ docId: d.id, ...d.data() }));
    if (!includeArchived) projects = projects.filter((p) => p.status !== "Archived");
    return projects;
  } catch (error) {
    console.error("Failed to list projects", error);
    return [];
  }
}

export function subscribeProjects(callback, { includeArchived = false } = {}) {
  const q = query(collection(db, PROJECTS_COLLECTION), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    let projects = snap.docs.map((d) => ({ docId: d.id, ...d.data() }));
    if (!includeArchived) projects = projects.filter((p) => p.status !== "Archived");
    callback(projects);
  }, (error) => {
    console.error("Projects subscription error", error);
    callback([]);
  });
}

/** Compute progress % and status counts for a project from its tasks array. */
export function computeProjectStats(tasks) {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "Completed").length;
  const inProgress = tasks.filter((t) => t.status === "In Progress").length;
  const review = tasks.filter((t) => t.status === "Review").length;
  const blocked = tasks.filter((t) => t.status === "Blocked").length;
  const overdue = tasks.filter((t) => {
    if (!t.dueDate || t.status === "Completed") return false;
    const due = t.dueDate.toDate ? t.dueDate.toDate() : new Date(t.dueDate);
    return due.getTime() < new Date().setHours(0, 0, 0, 0);
  }).length;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { total, completed, inProgress, review, blocked, overdue, progress };
}
