/**
 * TRACEBASE — Auth Guard
 * Include this on every protected page (all pages except index.html/login).
 * It verifies the user is authenticated + active, loads their profile,
 * renders the app shell, and resolves with { user, profile } so the
 * page-specific script can continue.
 *
 * Usage:
 *   import { requireAuth } from "./auth-guard.js";
 *   const { user, profile } = await requireAuth("dashboard");
 */
import { onAuthChange, logout } from "./auth.js";
import { renderAppShell, showToast } from "./ui.js";
import { subscribeUnreadNotificationCount, loadRecentNotifications, markNotificationRead } from "./notifications.js";
import { formatDateTime } from "./utils.js";

let cachedSession = null;

export function requireAuth(activeNavKey) {
  return new Promise((resolve) => {
    onAuthChange((session) => {
      if (!session || !session.profile) {
        window.location.href = "index.html";
        return;
      }
      if (session.profile.active === false) {
        showToast("Your account has been disabled. Contact your administrator.", "error");
        logout().then(() => (window.location.href = "index.html"));
        return;
      }

      cachedSession = session;
      renderAppShell({ activeKey: activeNavKey, user: session.profile, pageContent: document.getElementById("page-content-template")?.innerHTML || "" });
      wireGlobalHeaderActions(session);
      resolve(session);
    });
  });
}

function wireGlobalHeaderActions(session) {
  document.getElementById("logout-btn")?.addEventListener("click", async () => {
    await logout();
    window.location.href = "index.html";
  });

  // Notifications bell
  const notifBtn = document.getElementById("notif-btn");
  const notifPanel = document.getElementById("notif-panel");
  if (notifBtn && notifPanel) {
    subscribeUnreadNotificationCount(session.user.uid, (count) => {
      const dot = document.getElementById("notif-dot");
      if (dot) dot.hidden = count === 0;
    });

    notifBtn.addEventListener("click", async () => {
      const notifs = await loadRecentNotifications(session.user.uid, 15);
      if (notifs.length === 0) {
        notifPanel.innerHTML = `<div class="empty-state" style="padding: var(--space-6) var(--space-3);"><p>No notifications yet.</p></div>`;
        return;
      }
      notifPanel.innerHTML = notifs.map((n) => `
        <div class="notif-item ${n.read ? "" : "unread"}" data-notif-id="${n.notificationId}" role="button" tabindex="0">
          ${!n.read ? '<span class="notif-dot"></span>' : '<span style="width:8px;flex-shrink:0;"></span>'}
          <div class="timeline-content">
            <div class="timeline-name">${escapeHtml(n.title)}</div>
            <div class="timeline-text">${escapeHtml(n.message)}</div>
            <div class="timeline-meta">${formatDateTime(n.createdAt)}</div>
          </div>
        </div>
      `).join("");
      notifPanel.querySelectorAll("[data-notif-id]").forEach((node) => {
        node.addEventListener("click", async () => {
          const id = node.getAttribute("data-notif-id");
          await markNotificationRead(id);
          node.classList.remove("unread");
        });
      });
    });
  }

  // Global search (Enter to run)
  const searchInput = document.getElementById("global-search-input");
  searchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && searchInput.value.trim()) {
      window.location.href = `tasks.html?q=${encodeURIComponent(searchInput.value.trim())}`;
    }
  });

  // Theme: restore saved preference
  const savedTheme = localStorage.getItem("tracebase-theme");
  if (savedTheme) document.documentElement.setAttribute("data-theme", savedTheme);
}

function escapeHtml(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function getSession() {
  return cachedSession;
}

/** Role helpers used throughout the app for conditional UI. */
export function isAdmin(profile) { return profile?.role === "admin"; }
export function isReporter(profile) { return profile?.role === "reporter"; }
export function isManagerOrAbove(profile) { return profile?.role === "admin" || profile?.role === "reporter"; }
export function canManageTask(profile, task) {
  if (!profile || !task) return false;
  if (isManagerOrAbove(profile)) return true;
  return task.assigneeId === profile.userId;
}
