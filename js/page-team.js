/**
 * TRACEBASE — Team / User Management page controller (Admin only)
 */
import { requireAuth, isAdmin } from "./auth-guard.js";
import { listUsers, setUserActive, setUserRole, updateUserProfile } from "./users.js";
import { renderAvatar, renderEmptyState, renderModal, closeModal, showToast, renderSkeletonRows } from "./ui.js";
import { escapeHtml, formatDate } from "./utils.js";

let session, users = [];

async function init() {
  session = await requireAuth("team");
  if (!isAdmin(session.profile)) {
    document.getElementById("team-root").innerHTML = renderEmptyState({
      title: "Admins only",
      message: "You need administrator access to view the Team page.",
      actionLabel: "Back to Dashboard", actionHref: "dashboard.html",
    });
    return;
  }
  document.getElementById("team-root").innerHTML = renderSkeletonRows(5);
  document.getElementById("add-user-info-btn")?.addEventListener("click", showAddUserInfo);
  await refresh();
}

async function refresh() {
  users = await listUsers();
  render();
}

function render() {
  const root = document.getElementById("team-root");
  if (users.length === 0) {
    root.innerHTML = renderEmptyState({ title: "No users yet", message: "See README for how to add your first users." });
    return;
  }
  const rows = users.map((u) => `
    <tr data-user-id="${u.userId}">
      <td data-label="User"><div style="display:flex; align-items:center; gap:8px;">${renderAvatar(u, "avatar avatar-sm")} <div><div style="font-weight:600;">${escapeHtml(u.name)}</div><div style="font-size:12px; color:var(--text-muted);">${escapeHtml(u.email)}</div></div></div></td>
      <td data-label="Role">
        <select class="role-select" data-user-id="${u.userId}" style="height:34px; font-size:13px;">
          <option value="admin" ${u.role === "admin" ? "selected" : ""}>Admin</option>
          <option value="reporter" ${u.role === "reporter" ? "selected" : ""}>Reporter / Manager</option>
          <option value="assignee" ${u.role === "assignee" ? "selected" : ""}>Assignee</option>
        </select>
      </td>
      <td data-label="Department">${escapeHtml(u.department || "—")}</td>
      <td data-label="Designation">${escapeHtml(u.designation || "—")}</td>
      <td data-label="Status">${u.active === false ? `<span class="badge badge-neutral">Disabled</span>` : `<span class="badge badge-success">Active</span>`}</td>
      <td data-label="Joined">${formatDate(u.createdAt)}</td>
      <td data-label="Actions">
        <button class="btn btn-sm btn-secondary toggle-active-btn" data-user-id="${u.userId}" data-active="${u.active !== false}">${u.active === false ? "Activate" : "Disable"}</button>
      </td>
    </tr>
  `).join("");

  root.innerHTML = `
    <div class="table-wrap responsive-table">
      <table class="data-table">
        <thead><tr><th>User</th><th>Role</th><th>Department</th><th>Designation</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;

  root.querySelectorAll(".role-select").forEach((select) => {
    select.addEventListener("change", async () => {
      try {
        await setUserRole(select.getAttribute("data-user-id"), select.value);
        showToast("Role updated.", "success");
      } catch (error) {
        console.error(error);
        showToast("Unable to update role.", "error");
      }
    });
  });

  root.querySelectorAll(".toggle-active-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const userId = btn.getAttribute("data-user-id");
      const currentlyActive = btn.getAttribute("data-active") === "true";
      try {
        await setUserActive(userId, !currentlyActive);
        showToast(currentlyActive ? "User disabled." : "User activated.", "success");
        await refresh();
      } catch (error) {
        console.error(error);
        showToast("Unable to update user status.", "error");
      }
    });
  });
}

function showAddUserInfo() {
  const bodyHtml = `
    <p style="margin-bottom:12px;">Creating a brand-new login requires a Firebase Authentication account, which must be created through the Firebase Console or a trusted backend — the browser app can't create other people's logins for security reasons.</p>
    <ol style="padding-left: 20px; display:flex; flex-direction:column; gap:8px; font-size: var(--text-sm);">
      <li>In the Firebase Console, go to <strong>Authentication → Users → Add user</strong> and create their email/password login.</li>
      <li>Copy the generated <strong>User UID</strong>.</li>
      <li>In <strong>Firestore Database</strong>, create a document in the <code>users</code> collection with that UID as the document ID, containing: name, email, role, department, designation, active: true.</li>
      <li>They can now log in and will immediately appear on this page.</li>
    </ol>
    <p style="margin-top:12px; font-size: var(--text-sm); color:var(--text-secondary);">Full step-by-step instructions are in the project README under "How to add users".</p>
  `;
  renderModal({ title: "How to Add a New User", bodyHtml, footerHtml: `<button class="btn btn-primary" id="ok-btn">Got it</button>` });
  document.getElementById("ok-btn").addEventListener("click", () => closeModal());
}

init().catch((err) => { console.error(err); showToast("Unable to load team.", "error"); });
