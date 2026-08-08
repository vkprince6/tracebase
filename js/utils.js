/**
 * TRACEBASE — Utilities
 * Shared helper functions used across the app.
 */

/* ---------------- DOM helpers ---------------- */
export function qs(selector, scope = document) {
  return scope.querySelector(selector);
}
export function qsa(selector, scope = document) {
  return Array.from(scope.querySelectorAll(selector));
}
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "class") node.className = value;
    else if (key === "html") node.innerHTML = value; // only ever pass trusted/escaped strings
    else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2), value);
    else if (value !== undefined && value !== null) node.setAttribute(key, value);
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined) continue;
    node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

/**
 * Escape text for safe insertion into HTML strings.
 * ALWAYS use this when interpolating user-generated content into template strings.
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ---------------- IDs ---------------- */
export function generateId(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

/* ---------------- Dates ---------------- */
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/** Accepts a Firestore Timestamp, Date, or millis and returns a JS Date (or null). */
export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") return value.toDate(); // Firestore Timestamp
  if (typeof value === "number") return new Date(value);
  if (typeof value === "string") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Format: 08 Aug 2026 */
export function formatDate(value) {
  const d = toDate(value);
  if (!d) return "—";
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Format: 11:42 AM */
export function formatTime(value) {
  const d = toDate(value);
  if (!d) return "";
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}

export function formatDateTime(value) {
  const d = toDate(value);
  if (!d) return "—";
  return `${formatDate(d)}, ${formatTime(d)}`;
}

/** Format an <input type="date"> compatible string (YYYY-MM-DD). */
export function toInputDate(value) {
  const d = toDate(value);
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isSameDay(a, b) {
  const da = toDate(a), db = toDate(b);
  if (!da || !db) return false;
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

export function isToday(value) {
  return isSameDay(value, new Date());
}

export function isOverdue(dueDate, status) {
  const d = toDate(dueDate);
  if (!d || status === "Completed") return false;
  const now = new Date();
  now.setHours(0,0,0,0);
  return d.getTime() < now.getTime();
}

export function relativeTime(value) {
  const d = toDate(value);
  if (!d) return "—";
  const diffMs = Date.now() - d.getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
}

/* ---------------- Strings ---------------- */
export function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function truncate(str = "", max = 80) {
  if (str.length <= max) return str;
  return str.slice(0, max - 1).trimEnd() + "…";
}

export function slugify(str = "") {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/* ---------------- Numbers ---------------- */
export function clampHours(value) {
  const n = Number(value);
  if (isNaN(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

export function clampPercent(value) {
  const n = Number(value);
  if (isNaN(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/* ---------------- Misc ---------------- */
export function debounce(fn, wait = 250) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

export function groupBy(arr, keyFn) {
  return arr.reduce((acc, item) => {
    const key = keyFn(item);
    (acc[key] = acc[key] || []).push(item);
    return acc;
  }, {});
}

export function sortBy(arr, key, dir = "asc") {
  const sorted = [...arr].sort((a, b) => {
    let av = a[key], bv = b[key];
    av = toDate(av) || av; bv = toDate(bv) || bv;
    if (av instanceof Date && bv instanceof Date) { av = av.getTime(); bv = bv.getTime(); }
    if (typeof av === "string") av = av.toLowerCase();
    if (typeof bv === "string") bv = bv.toLowerCase();
    if (av === undefined || av === null) return 1;
    if (bv === undefined || bv === null) return -1;
    if (av < bv) return dir === "asc" ? -1 : 1;
    if (av > bv) return dir === "asc" ? 1 : -1;
    return 0;
  });
  return sorted;
}

export const STATUS_LIST = ["Not Started", "In Progress", "Blocked", "Review", "Completed"];
export const PRIORITY_LIST = ["Low", "Medium", "High", "Critical"];
export const PROJECT_STATUS_LIST = ["Planning", "Active", "On Hold", "Completed", "Archived"];

export function statusBadgeClass(status) {
  switch (status) {
    case "Completed": return "badge-success";
    case "In Progress": return "badge-info";
    case "Blocked": return "badge-danger";
    case "Review": return "badge-blocked";
    default: return "badge-neutral";
  }
}

export function priorityClass(priority) {
  return `priority-${String(priority || "low").toLowerCase()}`;
}
