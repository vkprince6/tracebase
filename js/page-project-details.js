/**
 * TRACEBASE — Project Details page controller
 */
import { requireAuth, isManagerOrAbove } from "./auth-guard.js";
import { getProject, updateProject, archiveProject, computeProjectStats } from "./projects.js";
import { subscribeProjectTasks, createTask } from "./tasks.js";
import { listUsers } from "./users.js";
import {
  renderProjectStatusBadge, renderStatusBadge, renderPriorityBadge, renderProgressBar,
  renderTaskCard, renderEmptyState, renderPageSpinner, renderModal, closeModal, showToast, renderAvatar,
} from "./ui.js";
import { escapeHtml, formatDate, isOverdue, PROJECT_STATUS_LIST, PRIORITY_LIST } from "./utils.js";
import { validateForm, required } from "./validation.js";

const params = new URLSearchParams(window.location.search);
const projectDocId = params.get("id");

let session, project, tasks = [], users = [];

async function init() {
  session = await requireAuth("projects");
  const content = document.getElementById("project-details-root");
  content.innerHTML = renderPageSpinner();

  if (!projectDocId) {
    content.innerHTML = renderEmptyState({ title: "Project not found", message: "No project id was provided.", actionLabel: "Back to Projects", actionHref: "projects.html" });
    return;
  }

  project = await getProject(projectDocId);
  if (!project) {
    content.innerHTML = renderEmptyState({ title: "Project not found", message: "This project may have been removed.", actionLabel: "Back to Projects", actionHref: "projects.html" });
    return;
  }

  users = await listUsers();
  renderShell();
  subscribeProjectTasks(project.projectId, (t) => { tasks = t; renderStats(); renderTaskList(); });
}

function renderShell() {
  const content = document.getElementById("project-details-root");
  const canManage = isManagerOrAbove(session.profile);
  content.innerHTML = `
    <div class="panel" style="padding: var(--space-5); margin-bottom: var(--space-4);">
      <div class="page-header" style="margin-bottom: var(--space-3);">
        <div>
          <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
            <h1>${escapeHtml(project.projectName)}</h1>
            ${renderProjectStatusBadge(project.status)}
            ${renderPriorityBadge(project.priority)}
          </div>
          <p class="subtitle">${escapeHtml(project.description || "")}</p>
        </div>
        ${canManage ? `
        <div class="dropdown">
          <button class="btn btn-secondary" id="project-actions-btn">Actions</button>
          <div class="dropdown-menu" id="project-actions-menu">
            <button class="dropdown-item" id="edit-project-btn">Edit Project</button>
            <button class="dropdown-item" id="archive-project-btn">Archive Project</button>
          </div>
        </div>` : ""}
      </div>
      <div style="display:flex; gap: var(--space-6); flex-wrap:wrap; font-size:var(--text-sm); color:var(--text-secondary);">
        <span><strong>Manager:</strong> ${escapeHtml(project.projectManager || "—")}</span>
        <span><strong>Reporter:</strong> ${escapeHtml(project.reporter || "—")}</span>
        <span><strong>Start:</strong> ${formatDate(project.startDate)}</span>
        <span><strong>Due:</strong> ${formatDate(project.dueDate)}</span>
      </div>
    </div>

    <div class="kpi-grid" id="project-kpi-grid" style="margin-bottom: var(--space-5);"></div>

    <div class="panel">
      <div class="panel-header">
        <h3>Tasks</h3>
        ${canManage ? `<button class="btn btn-primary btn-sm" id="add-task-btn">+ New Task</button>` : ""}
      </div>
      <div class="panel-body" id="project-task-list-wrap"></div>
    </div>
  `;

  document.getElementById("project-actions-btn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    document.getElementById("project-actions-menu").classList.toggle("open");
  });
  document.addEventListener("click", () => document.getElementById("project-actions-menu")?.classList.remove("open"));
  document.getElementById("edit-project-btn")?.addEventListener("click", openEditModal);
  document.getElementById("archive-project-btn")?.addEventListener("click", handleArchive);
  document.getElementById("add-task-btn")?.addEventListener("click", openCreateTaskModal);
}

function renderStats() {
  const stats = computeProjectStats(tasks);
  const grid = document.getElementById("project-kpi-grid");
  const cards = [
    { label: "Total Tasks", value: stats.total },
    { label: "Completed", value: stats.completed },
    { label: "In Progress", value: stats.inProgress },
    { label: "Review", value: stats.review },
    { label: "Blocked", value: stats.blocked },
    { label: "Overdue", value: stats.overdue },
  ];
  grid.innerHTML = cards.map((c) => `<div class="kpi-card"><div class="kpi-label">${c.label}</div><div class="kpi-value">${c.value}</div></div>`).join("");
}

function renderTaskList() {
  const wrap = document.getElementById("project-task-list-wrap");
  if (tasks.length === 0) {
    wrap.innerHTML = renderEmptyState({ title: "No tasks yet", message: "Create the first task for this project." });
    return;
  }

  // Desktop table
  const rows = tasks.map((t) => `
    <tr data-task-id="${t.docId}">
      <td data-label="Task ID" style="font-family:var(--font-mono); font-size:12px; color:var(--text-muted);">${escapeHtml(t.taskId.slice(-6))}</td>
      <td data-label="Task"><strong>${escapeHtml(t.title)}</strong></td>
      <td data-label="Assignee">${escapeHtml(t.assigneeName || "Unassigned")}</td>
      <td data-label="Reporter">${escapeHtml(t.reporterName || "—")}</td>
      <td data-label="Priority">${renderPriorityBadge(t.priority)}</td>
      <td data-label="Status">${renderStatusBadge(t.status)}</td>
      <td data-label="Progress" style="min-width:140px;">${renderProgressBar(t.progress)}</td>
      <td data-label="Due Date">${isOverdue(t.dueDate, t.status) ? `<span style="color:var(--color-danger-fg); font-weight:700;">${formatDate(t.dueDate)}</span>` : formatDate(t.dueDate)}</td>
      <td data-label="Allocated">${t.allocatedHours || 0}h</td>
      <td data-label="Actual">${t.actualHours || 0}h</td>
    </tr>
  `).join("");

  wrap.innerHTML = `
    <div class="table-wrap responsive-table hide-mobile">
      <table class="data-table">
        <thead><tr><th>ID</th><th>Task</th><th>Assignee</th><th>Reporter</th><th>Priority</th><th>Status</th><th>Progress</th><th>Due</th><th>Alloc.</th><th>Actual</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
  wrap.querySelectorAll("[data-task-id]").forEach((row) => {
    row.addEventListener("click", () => window.location.href = `task-details.html?id=${row.getAttribute("data-task-id")}`);
  });
}

function openEditModal() {
  document.getElementById("project-actions-menu")?.classList.remove("open");
  const statusOptions = PROJECT_STATUS_LIST.map(s => `<option value="${s}" ${s === project.status ? "selected" : ""}>${s}</option>`).join("");
  const userOptions = users.filter(u => u.active !== false).map((u) => `<option value="${escapeHtml(u.name)}" ${u.name === project.projectManager ? "selected" : ""}>${escapeHtml(u.name)}</option>`).join("");
  const bodyHtml = `
    <form id="edit-project-form">
      <div class="form-grid">
        <div class="form-group full"><label>Project Name</label><input id="ef-name" value="${escapeHtml(project.projectName)}" /></div>
        <div class="form-group full"><label>Description</label><textarea id="ef-desc">${escapeHtml(project.description || "")}</textarea></div>
        <div class="form-group"><label>Status</label><select id="ef-status">${statusOptions}</select></div>
        <div class="form-group"><label>Project Manager</label><select id="ef-manager"><option value="">Unassigned</option>${userOptions}</select></div>
        <div class="form-group"><label>Start Date</label><input type="date" id="ef-start" value="${project.startDate?.toDate ? project.startDate.toDate().toISOString().slice(0,10) : ""}" /></div>
        <div class="form-group"><label>Due Date</label><input type="date" id="ef-due" value="${project.dueDate?.toDate ? project.dueDate.toDate().toISOString().slice(0,10) : ""}" /></div>
      </div>
    </form>
  `;
  const footerHtml = `<button class="btn btn-secondary" id="ef-cancel">Cancel</button><button class="btn btn-primary" id="ef-save">Save Changes</button>`;
  renderModal({ title: "Edit Project", bodyHtml, footerHtml });
  document.getElementById("ef-cancel").addEventListener("click", () => closeModal());
  document.getElementById("ef-save").addEventListener("click", async () => {
    try {
      await updateProject(projectDocId, {
        projectName: document.getElementById("ef-name").value.trim(),
        description: document.getElementById("ef-desc").value.trim(),
        status: document.getElementById("ef-status").value,
        projectManager: document.getElementById("ef-manager").value,
        startDate: document.getElementById("ef-start").value,
        dueDate: document.getElementById("ef-due").value,
      });
      project = await getProject(projectDocId);
      renderShell(); renderStats(); renderTaskList();
      closeModal();
      showToast("Project updated.", "success");
    } catch (error) {
      console.error(error);
      showToast("Unable to update project.", "error");
    }
  });
}

async function handleArchive() {
  document.getElementById("project-actions-menu")?.classList.remove("open");
  if (!confirm("Archive this project? It will be hidden from the active projects list.")) return;
  try {
    await archiveProject(projectDocId);
    showToast("Project archived.", "success");
    window.location.href = "projects.html";
  } catch (error) {
    console.error(error);
    showToast("Unable to archive project.", "error");
  }
}

function openCreateTaskModal() {
  const userOptions = users.filter(u => u.active !== false).map((u) => `<option value="${u.userId}" data-name="${escapeHtml(u.name)}">${escapeHtml(u.name)}</option>`).join("");
  const bodyHtml = `
    <form id="create-task-form">
      <div class="form-grid">
        <div class="form-group full" id="fg-title"><label>Task Title <span class="required-mark">*</span></label><input id="tf-title" /><div class="form-error">Task title is required.</div></div>
        <div class="form-group full"><label>Description</label><textarea id="tf-desc"></textarea></div>
        <div class="form-group" id="fg-assignee"><label>Assignee <span class="required-mark">*</span></label><select id="tf-assignee"><option value="">Select assignee</option>${userOptions}</select><div class="form-error">Please select an assignee.</div></div>
        <div class="form-group" id="fg-reporter"><label>Reporter <span class="required-mark">*</span></label><select id="tf-reporter"><option value="">Select reporter</option>${userOptions}</select><div class="form-error">Please select a reporter.</div></div>
        <div class="form-group"><label>Priority</label><select id="tf-priority"><option>Low</option><option selected>Medium</option><option>High</option><option>Critical</option></select></div>
        <div class="form-group"><label>Status</label><select id="tf-status"><option selected>Not Started</option><option>In Progress</option><option>Blocked</option><option>Review</option><option>Completed</option></select></div>
        <div class="form-group" id="fg-start"><label>Start Date <span class="required-mark">*</span></label><input type="date" id="tf-start" /><div class="form-error">Start date is required.</div></div>
        <div class="form-group" id="fg-due"><label>Due Date <span class="required-mark">*</span></label><input type="date" id="tf-due" /><div class="form-error">Due date is required.</div></div>
        <div class="form-group"><label>Allocated Hours</label><input type="number" min="0" step="0.5" id="tf-hours" value="8" /></div>
        <div class="form-group"><label>Tags (comma separated)</label><input id="tf-tags" placeholder="frontend, urgent" /></div>
      </div>
    </form>
  `;
  const footerHtml = `<button class="btn btn-secondary" id="tf-cancel">Cancel</button><button class="btn btn-primary" id="tf-submit">Create Task</button>`;
  renderModal({ title: "Create Task", bodyHtml, footerHtml, size: "lg" });
  document.getElementById("tf-cancel").addEventListener("click", () => closeModal());
  document.getElementById("tf-submit").addEventListener("click", handleCreateTask);
}

async function handleCreateTask() {
  const title = document.getElementById("tf-title").value.trim();
  const assigneeSelect = document.getElementById("tf-assignee");
  const reporterSelect = document.getElementById("tf-reporter");
  const start = document.getElementById("tf-start").value;
  const due = document.getElementById("tf-due").value;

  const values = { title, assignee: assigneeSelect.value, reporter: reporterSelect.value, start, due };
  const { valid, errors } = validateForm(values, {
    title: [required()], assignee: [required()], reporter: [required()], start: [required()], due: [required()],
  });
  [["title","title"],["assignee","assignee"],["reporter","reporter"],["start","start"],["due","due"]].forEach(([f]) => {
    const map = { title: "fg-title", assignee: "fg-assignee", reporter: "fg-reporter", start: "fg-start", due: "fg-due" };
    document.getElementById(map[f])?.classList.toggle("invalid", !!errors[f]);
  });
  if (!valid) return;

  const btn = document.getElementById("tf-submit");
  btn.disabled = true; btn.textContent = "Creating…";
  try {
    const assigneeName = assigneeSelect.selectedOptions[0]?.dataset.name || "";
    const reporterName = reporterSelect.selectedOptions[0]?.dataset.name || "";
    const tags = document.getElementById("tf-tags").value.split(",").map(s => s.trim()).filter(Boolean);
    await createTask({
      projectId: project.projectId, projectName: project.projectName,
      title, description: document.getElementById("tf-desc").value.trim(),
      assigneeId: assigneeSelect.value, assigneeName,
      reporterId: reporterSelect.value, reporterName,
      priority: document.getElementById("tf-priority").value,
      status: document.getElementById("tf-status").value,
      startDate: start, dueDate: due,
      allocatedHours: document.getElementById("tf-hours").value,
      tags,
      createdBy: session.user.uid, createdByName: session.profile.name,
    });
    closeModal();
    showToast("Task created successfully.", "success");
  } catch (error) {
    console.error(error);
    showToast("Unable to create task.", "error");
    btn.disabled = false; btn.textContent = "Create Task";
  }
}

init().catch((err) => { console.error(err); showToast("Unable to load project.", "error"); });
