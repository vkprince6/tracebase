/**
 * TRACEBASE — Settings page controller
 */
import { requireAuth, isAdmin } from "./auth-guard.js";
import { updateUserProfile } from "./users.js";
import { resetPassword } from "./auth.js";
import { showToast } from "./ui.js";
import { escapeHtml, STATUS_LIST, PRIORITY_LIST, PROJECT_STATUS_LIST } from "./utils.js";
import { validateForm, required } from "./validation.js";

let session;

async function init() {
  session = await requireAuth("settings");
  renderProfileForm();
  renderPreferences();
  if (isAdmin(session.profile)) renderAdminConfig();
  else document.getElementById("admin-config-section")?.remove();
}

function renderProfileForm() {
  const el = document.getElementById("profile-settings-body");
  el.innerHTML = `
    <div class="form-grid">
      <div class="form-group" id="fg-name"><label>Full Name <span class="required-mark">*</span></label><input id="s-name" value="${escapeHtml(session.profile.name || "")}" /><div class="form-error">Name is required.</div></div>
      <div class="form-group"><label>Email</label><input value="${escapeHtml(session.profile.email || "")}" disabled /></div>
      <div class="form-group"><label>Department</label><input id="s-department" value="${escapeHtml(session.profile.department || "")}" /></div>
      <div class="form-group"><label>Designation</label><input id="s-designation" value="${escapeHtml(session.profile.designation || "")}" /></div>
    </div>
    <button class="btn btn-primary" id="save-profile-btn" style="margin-top: var(--space-4);">Save Profile</button>
    <hr style="border:none; border-top:1px solid var(--surface-border); margin: var(--space-5) 0;" />
    <h3 style="margin-bottom: var(--space-2);">Password</h3>
    <p style="color:var(--text-secondary); font-size: var(--text-sm); margin-bottom: var(--space-3);">Send a password reset link to your email.</p>
    <button class="btn btn-secondary" id="send-reset-btn">Send Reset Email</button>
  `;

  document.getElementById("save-profile-btn").addEventListener("click", async () => {
    const name = document.getElementById("s-name").value.trim();
    const { valid } = validateForm({ name }, { name: [required()] });
    document.getElementById("fg-name").classList.toggle("invalid", !valid);
    if (!valid) return;
    try {
      await updateUserProfile(session.user.uid, {
        name, department: document.getElementById("s-department").value.trim(),
        designation: document.getElementById("s-designation").value.trim(),
      });
      showToast("Profile updated.", "success");
    } catch (error) {
      console.error(error);
      showToast("Unable to update profile.", "error");
    }
  });

  document.getElementById("send-reset-btn").addEventListener("click", async () => {
    const result = await resetPassword(session.profile.email);
    showToast(result.message, result.success ? "success" : "error");
  });
}

function renderPreferences() {
  const el = document.getElementById("preferences-body");
  const currentTheme = localStorage.getItem("tracebase-theme") || "light";
  el.innerHTML = `
    <div class="form-group">
      <label>Theme</label>
      <select id="theme-select">
        <option value="light" ${currentTheme === "light" ? "selected" : ""}>Light</option>
        <option value="dark" ${currentTheme === "dark" ? "selected" : ""}>Dark</option>
      </select>
    </div>
    <div class="checkbox-row" style="margin-top: var(--space-3);">
      <input type="checkbox" id="notif-email-pref" checked />
      <label style="margin:0;">Notify me by in-app alerts for assignments, comments, and status changes</label>
    </div>
    <p style="color:var(--text-muted); font-size: var(--text-xs); margin-top: var(--space-2);">Notification preferences are saved locally for this browser in this demo build.</p>
  `;
  document.getElementById("theme-select").addEventListener("change", (e) => {
    document.documentElement.setAttribute("data-theme", e.target.value);
    localStorage.setItem("tracebase-theme", e.target.value);
  });
}

function renderAdminConfig() {
  const el = document.getElementById("admin-config-body");
  el.innerHTML = `
    <div style="margin-bottom: var(--space-4);">
      <h4 style="margin-bottom: var(--space-2);">Task Statuses</h4>
      <div style="display:flex; gap:6px; flex-wrap:wrap;">${STATUS_LIST.map(s => `<span class="chip">${s}</span>`).join("")}</div>
    </div>
    <div style="margin-bottom: var(--space-4);">
      <h4 style="margin-bottom: var(--space-2);">Priorities</h4>
      <div style="display:flex; gap:6px; flex-wrap:wrap;">${PRIORITY_LIST.map(p => `<span class="chip">${p}</span>`).join("")}</div>
    </div>
    <div>
      <h4 style="margin-bottom: var(--space-2);">Project Statuses</h4>
      <div style="display:flex; gap:6px; flex-wrap:wrap;">${PROJECT_STATUS_LIST.map(p => `<span class="chip">${p}</span>`).join("")}</div>
    </div>
    <p style="color:var(--text-muted); font-size: var(--text-xs); margin-top: var(--space-4);">These configuration lists are defined in js/utils.js. Editing them there updates every form and filter across the app.</p>
  `;
}

init().catch((err) => { console.error(err); showToast("Unable to load settings.", "error"); });
