/**
 * TRACEBASE — UI Components
 * Reusable render functions shared by every page (vanilla JS "component system").
 */
import { escapeHtml, initials, formatDate, formatDateTime, statusBadgeClass, priorityClass, clampPercent } from "./utils.js";

/* ================= NAVIGATION ================= */

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", href: "dashboard.html", icon: iconGrid() },
  { key: "projects", label: "Projects", href: "projects.html", icon: iconFolder() },
  { key: "my-tasks", label: "My Tasks", href: "my-tasks.html", icon: iconCheck() },
  { key: "tasks", label: "All Tasks", href: "tasks.html", icon: iconList() },
  { key: "team", label: "Team", href: "team.html", icon: iconUsers(), adminOnly: true },
  { key: "reports", label: "Reports", href: "reports.html", icon: iconChart(), managerOnly: true },
  { key: "settings", label: "Settings", href: "settings.html", icon: iconSettings() },
];

const BOTTOM_NAV_KEYS = ["dashboard", "my-tasks", "projects", "tasks", "settings"];

function iconWrap(path) { return `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`; }
function iconGrid() { return iconWrap(`<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>`); }
function iconFolder() { return iconWrap(`<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>`); }
function iconCheck() { return iconWrap(`<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>`); }
function iconList() { return iconWrap(`<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>`); }
function iconUsers() { return iconWrap(`<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`); }
function iconChart() { return iconWrap(`<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>`); }
function iconSettings() { return iconWrap(`<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>`); }
export function iconBell() { return iconWrap(`<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>`); }
export function iconSearch() { return iconWrap(`<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>`); }
export function iconMenu() { return iconWrap(`<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>`); }
export function iconClose() { return iconWrap(`<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`); }
export function iconMoon() { return `<svg class="icon icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></svg>`; }
export function iconSun() { return `<svg class="icon icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`; }

/**
 * Renders the sidebar, header, mobile drawer + bottom nav into the given container.
 * Expects a <div id="app-shell"></div> in the page HTML.
 */
export function renderAppShell({ activeKey, user, pageContent }) {
  const shell = document.getElementById("app-shell");
  if (!shell) return;

  const role = user?.role || "assignee";
  const visibleItems = NAV_ITEMS.filter(item => {
    if (item.adminOnly) return role === "admin";
    if (item.managerOnly) return role === "admin" || role === "reporter";
    return true;
  });

  const navHtml = visibleItems.map(item => `
    <a href="${item.href}" class="nav-item ${item.key === activeKey ? "active" : ""}" data-nav-key="${item.key}">
      ${item.icon}
      <span class="nav-label">${item.label}</span>
    </a>
  `).join("");

  const bottomNavHtml = visibleItems.filter(i => BOTTOM_NAV_KEYS.includes(i.key)).slice(0, 5).map(item => `
    <a href="${item.href}" class="bottom-nav-item ${item.key === activeKey ? "active" : ""}">
      ${item.icon}
      <span>${item.label}</span>
    </a>
  `).join("");

  shell.innerHTML = `
    <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-brand">
        <span class="logo-mark">TB</span>
        <span class="brand-text">TraceBase</span>
      </div>
      <nav class="sidebar-nav">${navHtml}</nav>
      <div class="sidebar-footer">
        <div class="sidebar-user" id="sidebar-user-btn">
          ${renderAvatar(user, "avatar")}
          <div>
            <div class="sidebar-user-name">${escapeHtml(user?.name || "User")}</div>
            <div class="sidebar-user-role">${escapeHtml(capitalize(role))}</div>
          </div>
        </div>
      </div>
    </aside>
    <div class="main-col">
      <header class="app-header">
        <button class="header-menu-btn" id="menu-toggle-btn" aria-label="Open menu">${iconMenu()}</button>
        <div class="header-search">
          <span class="icon">${iconSearch()}</span>
          <input type="search" id="global-search-input" placeholder="Search tasks, projects, people…" aria-label="Global search" />
        </div>
        <div class="header-actions">
          <button class="header-icon-btn theme-toggle-btn" id="theme-toggle-btn" aria-label="Toggle theme">
            ${iconMoon()}${iconSun()}
          </button>
          <div class="dropdown">
            <button class="header-icon-btn" id="notif-btn" aria-label="Notifications">
              ${iconBell()}
              <span class="dot" id="notif-dot" hidden></span>
            </button>
            <div class="dropdown-menu notif-panel" id="notif-panel"></div>
          </div>
          <div class="dropdown">
            <button class="header-icon-btn" id="user-menu-btn" aria-label="Account menu">
              ${renderAvatar(user, "avatar avatar-sm")}
            </button>
            <div class="dropdown-menu" id="user-menu">
              <div class="dropdown-item" style="pointer-events:none;">
                <div>
                  <div style="font-weight:700;">${escapeHtml(user?.name || "")}</div>
                  <div style="color:var(--text-muted); font-size:12px;">${escapeHtml(user?.email || "")}</div>
                </div>
              </div>
              <div class="dropdown-divider"></div>
              <a href="settings.html" class="dropdown-item">Profile Settings</a>
              <button class="dropdown-item" id="logout-btn">Log Out</button>
            </div>
          </div>
        </div>
      </header>
      <main class="page-content" id="page-content">${pageContent || ""}</main>
      <nav class="bottom-nav">
        <div class="bottom-nav-list">${bottomNavHtml}</div>
      </nav>
    </div>
  `;

  wireShellEvents();
}

function wireShellEvents() {
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("sidebar-backdrop");
  const menuBtn = document.getElementById("menu-toggle-btn");
  const openDrawer = () => { sidebar.classList.add("open"); backdrop.classList.add("open"); };
  const closeDrawer = () => { sidebar.classList.remove("open"); backdrop.classList.remove("open"); };
  menuBtn?.addEventListener("click", openDrawer);
  backdrop?.addEventListener("click", closeDrawer);

  document.querySelectorAll(".dropdown").forEach(dropdown => {
    const menu = dropdown.querySelector(".dropdown-menu");
    const btn = dropdown.querySelector("button");
    btn?.addEventListener("click", (e) => {
      e.stopPropagation();
      const willOpen = !menu.classList.contains("open");
      document.querySelectorAll(".dropdown-menu.open").forEach(m => m.classList.remove("open"));
      if (willOpen) menu.classList.add("open");
    });
  });
  document.addEventListener("click", () => {
    document.querySelectorAll(".dropdown-menu.open").forEach(m => m.classList.remove("open"));
  });

  const themeBtn = document.getElementById("theme-toggle-btn");
  themeBtn?.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("tracebase-theme", next);
  });
}

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

/* ================= AVATAR ================= */
export function renderAvatar(user, className = "avatar") {
  const name = user?.name || user?.userName || "?";
  if (user?.profilePhoto) {
    return `<img src="${escapeHtml(user.profilePhoto)}" class="${className}" alt="${escapeHtml(name)}" />`;
  }
  return `<div class="${className}" title="${escapeHtml(name)}">${initials(name)}</div>`;
}

/* ================= BADGES ================= */
export function renderStatusBadge(status) {
  return `<span class="badge ${statusBadgeClass(status)}">${escapeHtml(status || "—")}</span>`;
}
export function renderPriorityBadge(priority) {
  return `<span class="priority-tag ${priorityClass(priority)}">${escapeHtml(priority || "—")}</span>`;
}
export function renderProjectStatusBadge(status) {
  const map = { Active: "badge-info", Completed: "badge-success", "On Hold": "badge-warning", Archived: "badge-neutral", Planning: "badge-neutral" };
  return `<span class="badge ${map[status] || "badge-neutral"}">${escapeHtml(status || "—")}</span>`;
}

/* ================= PROGRESS ================= */
export function renderProgressBar(percent) {
  const p = clampPercent(percent);
  return `
    <div class="progress-row">
      <div class="progress-track"><div class="progress-fill ${p >= 100 ? "complete" : ""}" style="width:${p}%"></div></div>
      <span class="progress-label">${p}%</span>
    </div>
  `;
}

/* ================= TASK CARD (mobile) ================= */
export function renderTaskCard(task, opts = {}) {
  const overdueTag = opts.overdue ? `<span class="badge badge-danger">Overdue</span>` : "";
  return `
    <div class="task-card" data-task-id="${escapeHtml(task.taskId)}" role="button" tabindex="0">
      <div class="task-card-top">
        <div class="task-card-title">${escapeHtml(task.title)}</div>
        ${renderPriorityBadge(task.priority)}
      </div>
      <div class="task-card-meta">
        <span>${escapeHtml(task.projectName || "")}</span>
        <span>•</span>
        <span>Due ${formatDate(task.dueDate)}</span>
        ${overdueTag}
      </div>
      ${renderProgressBar(task.progress)}
      <div class="task-card-footer">
        ${renderStatusBadge(task.status)}
        ${renderAvatar({ name: task.assigneeName, profilePhoto: task.assigneePhoto }, "avatar avatar-sm")}
      </div>
    </div>
  `;
}

/* ================= ACTIVITY / COMMENT ITEM ================= */
export function renderActivityItem(activity) {
  return `
    <div class="timeline-item">
      ${renderAvatar({ name: activity.userName, profilePhoto: activity.userPhoto }, "avatar avatar-sm")}
      <div class="timeline-content">
        <div class="timeline-text"><span class="timeline-name">${escapeHtml(activity.userName)}</span> ${escapeHtml(activity.message)}</div>
        <div class="timeline-meta">${formatDateTime(activity.createdAt)}</div>
      </div>
    </div>
  `;
}

export function renderComment(comment) {
  const links = (comment.links || []).map(l => `<a href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(l.title || l.url)}</a>`).join(" · ");
  return `
    <div class="timeline-item" data-comment-id="${escapeHtml(comment.commentId)}">
      ${renderAvatar({ name: comment.userName, profilePhoto: comment.userPhoto }, "avatar avatar-sm")}
      <div class="timeline-content">
        <div class="timeline-name">${escapeHtml(comment.userName)}</div>
        <div class="timeline-text">${escapeHtml(comment.comment)}</div>
        ${links ? `<div class="timeline-meta">${links}</div>` : ""}
        <div class="timeline-meta">${formatDateTime(comment.createdAt)}</div>
      </div>
    </div>
  `;
}

/* ================= MODAL ================= */
let activeModalCleanup = null;
export function renderModal({ title, bodyHtml, footerHtml, size = "" , onClose}) {
  closeModal();
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.id = "active-modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal ${size === "lg" ? "modal-lg" : ""}" role="dialog" aria-modal="true" aria-label="${escapeHtml(title || "")}">
      <div class="modal-header">
        <h3>${escapeHtml(title || "")}</h3>
        <button class="btn btn-icon btn-ghost" id="modal-close-btn" aria-label="Close">${iconClose()}</button>
      </div>
      <div class="modal-body">${bodyHtml || ""}</div>
      ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ""}
    </div>
  `;
  document.body.appendChild(backdrop);
  document.body.style.overflow = "hidden";

  const close = () => closeModal(onClose);
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
  backdrop.querySelector("#modal-close-btn").addEventListener("click", close);
  const escHandler = (e) => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", escHandler);
  activeModalCleanup = () => document.removeEventListener("keydown", escHandler);

  return backdrop;
}
export function closeModal(onClose) {
  const existing = document.getElementById("active-modal-backdrop");
  if (existing) existing.remove();
  document.body.style.overflow = "";
  if (activeModalCleanup) { activeModalCleanup(); activeModalCleanup = null; }
  if (typeof onClose === "function") onClose();
}

/* ================= TOAST ================= */
function getToastRegion() {
  let region = document.querySelector(".toast-region");
  if (!region) {
    region = document.createElement("div");
    region.className = "toast-region";
    document.body.appendChild(region);
  }
  return region;
}
export function showToast(message, type = "info", duration = 4000) {
  const region = getToastRegion();
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.setAttribute("role", "status");
  toast.textContent = message;
  region.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 200ms ease";
    setTimeout(() => toast.remove(), 200);
  }, duration);
}

/* ================= EMPTY / LOADING STATES ================= */
export function renderEmptyState({ title, message, actionLabel, actionHref, iconSvg }) {
  return `
    <div class="empty-state">
      <div class="empty-icon">${iconSvg || iconFolder()}</div>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(message || "")}</p>
      ${actionLabel ? `<a href="${escapeHtml(actionHref || "#")}" class="btn btn-primary">${escapeHtml(actionLabel)}</a>` : ""}
    </div>
  `;
}
export function renderSkeletonRows(count = 5) {
  return Array.from({ length: count }).map(() => `<div class="skeleton skeleton-row"></div>`).join("");
}
export function renderPageSpinner() {
  return `<div class="spinner-page"><div class="spinner"></div></div>`;
}

/* ================= PAGINATION ================= */
export function renderPagination(current, totalPages, onPageChange) {
  const container = document.createElement("div");
  container.className = "pagination";
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    if (i === current) btn.classList.add("active");
    btn.addEventListener("click", () => onPageChange(i));
    container.appendChild(btn);
  }
  return container;
}

/* ================= NOTIFICATION ITEM ================= */
export function renderNotificationItem(notif) {
  return `
    <div class="notif-item ${notif.read ? "" : "unread"}" data-notif-id="${escapeHtml(notif.notificationId)}" role="button" tabindex="0">
      ${!notif.read ? '<span class="notif-dot"></span>' : '<span style="width:8px;flex-shrink:0;"></span>'}
      <div class="timeline-content">
        <div class="timeline-name">${escapeHtml(notif.title)}</div>
        <div class="timeline-text">${escapeHtml(notif.message)}</div>
        <div class="timeline-meta">${formatDateTime(notif.createdAt)}</div>
      </div>
    </div>
  `;
}

/* ================= CONFIRM DIALOG ================= */
export function confirmDialog({ title, message, confirmLabel = "Confirm", danger = false }) {
  return new Promise((resolve) => {
    const footer = `
      <button class="btn btn-secondary" id="confirm-cancel-btn">Cancel</button>
      <button class="btn ${danger ? "btn-danger" : "btn-primary"}" id="confirm-ok-btn">${escapeHtml(confirmLabel)}</button>
    `;
    renderModal({ title, bodyHtml: `<p>${escapeHtml(message)}</p>`, footerHtml: footer, onClose: () => resolve(false) });
    document.getElementById("confirm-cancel-btn").addEventListener("click", () => { closeModal(); resolve(false); });
    document.getElementById("confirm-ok-btn").addEventListener("click", () => { closeModal(); resolve(true); });
  });
}
