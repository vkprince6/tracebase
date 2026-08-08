/**
 * TRACEBASE — Task Details page controller
 */
import { requireAuth, canManageTask, isManagerOrAbove } from "./auth-guard.js";
import {
  getTask, updateTaskStatus, updateTaskProgress, updateTaskTime, reassignTask,
  updateTaskPriority, updateTaskDueDate, addTaskLink, isValidStatusTransition,
} from "./tasks.js";
import { subscribeTaskComments, addComment } from "./comments.js";
import { subscribeTaskActivity } from "./activity.js";
import { listUsers } from "./users.js";
import {
  renderStatusBadge, renderPriorityBadge, renderProgressBar, renderAvatar,
  renderComment, renderActivityItem, renderEmptyState, renderPageSpinner,
  renderModal, closeModal, showToast,
} from "./ui.js";
import { escapeHtml, formatDate, formatDateTime, isOverdue, STATUS_LIST, PRIORITY_LIST } from "./utils.js";
import { isValidUrl, required, validateForm } from "./validation.js";

const params = new URLSearchParams(window.location.search);
const taskDocId = params.get("id");

let session, task, users = [];

async function init() {
  session = await requireAuth("tasks");
  const root = document.getElementById("task-details-root");
  root.innerHTML = renderPageSpinner();

  if (!taskDocId) {
    root.innerHTML = renderEmptyState({ title: "Task not found", message: "No task id was provided.", actionLabel: "Back to Tasks", actionHref: "tasks.html" });
    return;
  }
  task = await getTask(taskDocId);
  if (!task) {
    root.innerHTML = renderEmptyState({ title: "Task not found", message: "This task may have been removed.", actionLabel: "Back to Tasks", actionHref: "tasks.html" });
    return;
  }

  users = await listUsers();
  renderShell();
  subscribeTaskComments(task.taskId, renderComments);
  subscribeTaskActivity(task.taskId, renderActivity);
}

function canManage() { return canManageTask(session.profile, task); }
function actor() { return { userId: session.user.uid, name: session.profile.name }; }

function renderShell() {
  const root = document.getElementById("task-details-root");
  const overdue = isOverdue(task.dueDate, task.status);
  const statusOptions = STATUS_LIST.filter(s => s === task.status || isValidStatusTransition(task.status, s))
    .map(s => `<option value="${s}" ${s === task.status ? "selected" : ""}>${s}</option>`).join("");

  root.innerHTML = `
    <div class="panel" style="padding: var(--space-5); margin-bottom: var(--space-4);">
      <div class="page-header" style="margin-bottom: var(--space-2);">
        <div>
          <div style="font-size:12px; color:var(--text-muted); font-family:var(--font-mono);">TASK-${escapeHtml(task.taskId.slice(-6).toUpperCase())}</div>
          <h1>${escapeHtml(task.title)}</h1>
          <p class="subtitle">${escapeHtml(task.projectName || "")}</p>
        </div>
        <a class="btn btn-secondary btn-sm" href="project-details.html?id=${escapeHtml(task.projectId)}">View Project</a>
      </div>
      <div style="display:flex; gap: var(--space-3); flex-wrap:wrap; align-items:center;">
        ${renderStatusBadge(task.status)}
        ${renderPriorityBadge(task.priority)}
        ${overdue ? `<span class="badge badge-danger">Overdue</span>` : ""}
      </div>
    </div>

    <div style="display:grid; grid-template-columns: 2fr 1fr; gap: var(--space-4);" id="task-details-grid">
      <div>
        <div class="panel" style="margin-bottom: var(--space-4);">
          <div class="panel-header"><h3>Description</h3></div>
          <div class="panel-body">
            <p style="white-space:pre-wrap;">${escapeHtml(task.description || "No description provided.")}</p>
            ${(task.tags || []).length ? `<div style="margin-top:12px; display:flex; gap:6px; flex-wrap:wrap;">${task.tags.map(t => `<span class="chip">${escapeHtml(t)}</span>`).join("")}</div>` : ""}
          </div>
        </div>

        <div class="panel" style="margin-bottom: var(--space-4);">
          <div class="panel-header"><h3>Links</h3> ${canManage() ? `<button class="btn btn-sm btn-secondary" id="add-link-btn">+ Add Link</button>` : ""}</div>
          <div class="panel-body" id="task-links-list">
            ${(task.links || []).length === 0 ? `<p style="color:var(--text-muted); font-size:var(--text-sm);">No links added.</p>` :
              task.links.map(l => `<div style="margin-bottom:8px;"><a href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(l.title || l.url)}</a> <span style="color:var(--text-muted); font-size:12px;"> — added by ${escapeHtml(l.addedBy || "")}</span></div>`).join("")}
          </div>
        </div>

        <div class="panel" style="margin-bottom: var(--space-4);">
          <div class="panel-header"><h3>Comments</h3></div>
          <div class="panel-body">
            <div id="comments-list"></div>
            <form id="comment-form" style="margin-top: var(--space-3); display:flex; flex-direction:column; gap: var(--space-2);">
              <textarea id="comment-input" placeholder="Add a comment…" rows="3"></textarea>
              <button type="submit" class="btn btn-primary btn-sm" style="align-self:flex-end;">Post Comment</button>
            </form>
          </div>
        </div>

        <div class="panel">
          <div class="panel-header"><h3>Activity</h3></div>
          <div class="panel-body" id="activity-list"></div>
        </div>
      </div>

      <div>
        <div class="panel" style="margin-bottom: var(--space-4);">
          <div class="panel-header"><h3>Details</h3></div>
          <div class="panel-body" style="display:flex; flex-direction:column; gap: var(--space-3); font-size: var(--text-sm);">
            <div><label>Assignee</label><div style="display:flex; align-items:center; gap:8px;">${renderAvatar({ name: task.assigneeName }, "avatar avatar-sm")} ${escapeHtml(task.assigneeName || "Unassigned")}</div></div>
            <div><label>Reporter</label><div>${escapeHtml(task.reporterName || "—")}</div></div>
            <div><label>Start Date</label><div>${formatDate(task.startDate)}</div></div>
            <div><label>Due Date</label><div>${formatDate(task.dueDate)}</div></div>
            <div><label>Created</label><div>${formatDateTime(task.createdAt)}</div></div>
            <div><label>Last Updated</label><div>${formatDateTime(task.updatedAt)}</div></div>
          </div>
        </div>

        <div class="panel" style="margin-bottom: var(--space-4);">
          <div class="panel-header"><h3>Status &amp; Progress</h3></div>
          <div class="panel-body" style="display:flex; flex-direction:column; gap: var(--space-4);">
            <div class="form-group">
              <label>Status</label>
              <select id="status-select" ${canManage() ? "" : "disabled"}>${statusOptions}</select>
            </div>
            <div class="form-group">
              <label>Progress</label>
              <input type="range" id="progress-slider" min="0" max="100" step="10" value="${task.progress || 0}" ${canManage() ? "" : "disabled"} />
              <div id="progress-display" style="margin-top:6px;">${renderProgressBar(task.progress)}</div>
            </div>
          </div>
        </div>

        <div class="panel" style="margin-bottom: var(--space-4);">
          <div class="panel-header"><h3>Time Tracking</h3></div>
          <div class="panel-body" style="display:flex; flex-direction:column; gap: var(--space-3); font-size: var(--text-sm);">
            <div style="display:flex; justify-content:space-between;"><span>Allocated</span><strong>${task.allocatedHours || 0}h</strong></div>
            <div style="display:flex; justify-content:space-between;"><span>Actual</span><strong id="actual-hours-display">${task.actualHours || 0}h</strong></div>
            <div style="display:flex; justify-content:space-between;"><span>Remaining</span><strong>${task.remainingHours || 0}h</strong></div>
            ${canManage() ? `
            <div class="form-group" style="margin-top:8px;">
              <label>Update Actual Hours</label>
              <div style="display:flex; gap:8px;">
                <input type="number" min="0" step="0.5" id="actual-hours-input" value="${task.actualHours || 0}" />
                <button class="btn btn-secondary btn-sm" id="save-hours-btn">Save</button>
              </div>
            </div>` : ""}
          </div>
        </div>

        ${isManagerOrAbove(session.profile) ? `
        <div class="panel">
          <div class="panel-header"><h3>Reassign</h3></div>
          <div class="panel-body">
            <select id="reassign-select">
              <option value="">Select new assignee…</option>
              ${users.filter(u => u.active !== false).map(u => `<option value="${u.userId}" data-name="${escapeHtml(u.name)}" ${u.userId === task.assigneeId ? "selected" : ""}>${escapeHtml(u.name)}</option>`).join("")}
            </select>
            <button class="btn btn-secondary btn-sm btn-block" id="reassign-btn" style="margin-top:8px;">Reassign Task</button>
          </div>
        </div>` : ""}
      </div>
    </div>
  `;

  wireEvents();
}

function wireEvents() {
  document.getElementById("status-select")?.addEventListener("change", async (e) => {
    const newStatus = e.target.value;
    if (newStatus === task.status) return;
    try {
      await updateTaskStatus(taskDocId, task, newStatus, actor());
      task.status = newStatus;
      showToast(`Status updated to ${newStatus}.`, "success");
      renderShell();
    } catch (error) {
      console.error(error);
      showToast("Unable to update status.", "error");
    }
  });

  const slider = document.getElementById("progress-slider");
  slider?.addEventListener("input", () => {
    document.getElementById("progress-display").innerHTML = renderProgressBar(slider.value);
  });
  slider?.addEventListener("change", async () => {
    try {
      await updateTaskProgress(taskDocId, task, slider.value, actor());
      task.progress = Number(slider.value);
      showToast("Progress updated.", "success");
    } catch (error) {
      console.error(error);
      showToast("Unable to update progress.", "error");
    }
  });

  document.getElementById("save-hours-btn")?.addEventListener("click", async () => {
    const input = document.getElementById("actual-hours-input");
    const value = Number(input.value);
    if (isNaN(value) || value < 0) { showToast("Enter a valid non-negative number of hours.", "error"); return; }
    try {
      await updateTaskTime(taskDocId, task, value, actor());
      task = await getTask(taskDocId);
      renderShell();
      showToast("Time updated.", "success");
    } catch (error) {
      console.error(error);
      showToast("Unable to update time.", "error");
    }
  });

  document.getElementById("reassign-btn")?.addEventListener("click", async () => {
    const select = document.getElementById("reassign-select");
    const newAssigneeId = select.value;
    if (!newAssigneeId) return;
    const newAssigneeName = select.selectedOptions[0]?.dataset.name;
    try {
      await reassignTask(taskDocId, task, newAssigneeId, newAssigneeName, actor());
      task.assigneeId = newAssigneeId; task.assigneeName = newAssigneeName;
      showToast("Task reassigned.", "success");
      renderShell();
    } catch (error) {
      console.error(error);
      showToast("Unable to reassign task.", "error");
    }
  });

  document.getElementById("add-link-btn")?.addEventListener("click", openAddLinkModal);

  document.getElementById("comment-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("comment-input");
    const text = input.value.trim();
    if (!text) return;
    try {
      await addComment({
        taskId: task.taskId, projectId: task.projectId,
        userId: session.user.uid, userName: session.profile.name, userPhoto: session.profile.profilePhoto || "",
        comment: text, links: [],
      });
      input.value = "";
    } catch (error) {
      console.error(error);
      showToast("Unable to post comment.", "error");
    }
  });
}

function openAddLinkModal() {
  const bodyHtml = `
    <form id="link-form">
      <div class="form-group" id="fg-link-title"><label>Link Title</label><input id="link-title" placeholder="e.g. GitHub PR" /></div>
      <div class="form-group" id="fg-link-url"><label>URL <span class="required-mark">*</span></label><input id="link-url" placeholder="https://…" /><div class="form-error">Enter a valid URL.</div></div>
    </form>
  `;
  const footerHtml = `<button class="btn btn-secondary" id="link-cancel">Cancel</button><button class="btn btn-primary" id="link-submit">Add Link</button>`;
  renderModal({ title: "Add Link", bodyHtml, footerHtml });
  document.getElementById("link-cancel").addEventListener("click", () => closeModal());
  document.getElementById("link-submit").addEventListener("click", async () => {
    const url = document.getElementById("link-url").value.trim();
    const valid = isValidUrl(url);
    document.getElementById("fg-link-url").classList.toggle("invalid", !valid);
    if (!valid) return;
    try {
      await addTaskLink(taskDocId, task, { title: document.getElementById("link-title").value.trim(), url }, actor());
      task = await getTask(taskDocId);
      closeModal();
      renderShell();
      showToast("Link added.", "success");
    } catch (error) {
      console.error(error);
      showToast("Unable to add link.", "error");
    }
  });
}

function renderComments(comments) {
  const list = document.getElementById("comments-list");
  if (!list) return;
  list.innerHTML = comments.length === 0
    ? `<p style="color:var(--text-muted); font-size:var(--text-sm);">No comments yet. Be the first to add one.</p>`
    : comments.map(renderComment).join("");
}

function renderActivity(activities) {
  const list = document.getElementById("activity-list");
  if (!list) return;
  list.innerHTML = activities.length === 0
    ? `<p style="color:var(--text-muted); font-size:var(--text-sm);">No activity yet.</p>`
    : activities.slice().reverse().map(a => renderActivityItem({ userName: a.userName, userPhoto: a.userPhoto, message: a.message, createdAt: a.createdAt })).join("");
}

init().catch((err) => { console.error(err); showToast("Unable to load task.", "error"); });
