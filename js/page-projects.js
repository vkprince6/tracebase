/**
 * TRACEBASE — Projects page controller
 */
import { requireAuth, isManagerOrAbove } from "./auth-guard.js";
import { subscribeProjects, createProject } from "./projects.js";
import { subscribeAllTasks } from "./tasks.js";
import { listUsers } from "./users.js";
import { renderProjectStatusBadge, renderProgressBar, renderEmptyState, renderSkeletonRows, renderModal, closeModal, showToast } from "./ui.js";
import { escapeHtml, formatDate, PROJECT_STATUS_LIST } from "./utils.js";
import { validateForm, required } from "./validation.js";

let session, projects = [], tasks = [], users = [];
let statusFilter = "";

async function init() {
  session = await requireAuth("projects");
  document.getElementById("projects-list").innerHTML = renderSkeletonRows(4);

  users = await listUsers();

  document.getElementById("new-project-btn")?.addEventListener("click", openCreateModal);
  if (!isManagerOrAbove(session.profile)) document.getElementById("new-project-btn")?.remove();

  document.getElementById("status-filter")?.addEventListener("change", (e) => {
    statusFilter = e.target.value;
    render();
  });

  subscribeAllTasks((t) => { tasks = t; render(); });
  subscribeProjects((p) => { projects = p; render(); }, { includeArchived: true });
}

function render() {
  const list = document.getElementById("projects-list");
  let visible = projects;
  if (statusFilter) visible = visible.filter((p) => p.status === statusFilter);
  else visible = visible.filter((p) => p.status !== "Archived");

  if (visible.length === 0) {
    list.innerHTML = renderEmptyState({
      title: "No projects found",
      message: "Create a project to start assigning tasks to your team.",
      actionLabel: isManagerOrAbove(session.profile) ? "Create Project" : null,
      actionHref: "#",
    });
    return;
  }

  list.innerHTML = visible.map((p) => {
    const projectTasks = tasks.filter((t) => t.projectId === p.projectId);
    const completed = projectTasks.filter((t) => t.status === "Completed").length;
    const progress = projectTasks.length === 0 ? 0 : Math.round((completed / projectTasks.length) * 100);
    return `
      <div class="panel" style="padding: var(--space-5); margin-bottom: var(--space-3); cursor:pointer;" data-project-id="${p.docId}">
        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap: var(--space-3); flex-wrap:wrap;">
          <div style="min-width:0;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; flex-wrap:wrap;">
              <h3 style="margin:0;">${escapeHtml(p.projectName)}</h3>
              ${renderProjectStatusBadge(p.status)}
            </div>
            <p style="color:var(--text-secondary); font-size:var(--text-sm); margin-bottom:8px;">${escapeHtml(p.description || "")}</p>
            <div style="display:flex; gap: var(--space-4); flex-wrap:wrap; font-size:var(--text-xs); color:var(--text-muted);">
              <span>Manager: ${escapeHtml(p.projectManager || "—")}</span>
              <span>Due: ${formatDate(p.dueDate)}</span>
              <span>${projectTasks.length} tasks</span>
            </div>
          </div>
          <div style="min-width:160px;">${renderProgressBar(progress)}</div>
        </div>
      </div>
    `;
  }).join("");

  list.querySelectorAll("[data-project-id]").forEach((card) => {
    card.addEventListener("click", () => window.location.href = `project-details.html?id=${card.getAttribute("data-project-id")}`);
  });
}

function openCreateModal() {
  const userOptions = users.filter(u => u.active !== false).map((u) => `<option value="${escapeHtml(u.name)}">${escapeHtml(u.name)}</option>`).join("");
  const bodyHtml = `
    <form id="create-project-form">
      <div class="form-grid">
        <div class="form-group full" id="fg-projectName">
          <label>Project Name <span class="required-mark">*</span></label>
          <input type="text" id="f-projectName" placeholder="e.g. Website Redesign" />
          <div class="form-error">Project name is required.</div>
        </div>
        <div class="form-group full">
          <label>Description</label>
          <textarea id="f-description" placeholder="Short project summary"></textarea>
        </div>
        <div class="form-group">
          <label>Project Manager</label>
          <select id="f-projectManager"><option value="">Unassigned</option>${userOptions}</select>
        </div>
        <div class="form-group">
          <label>Reporter</label>
          <select id="f-reporter"><option value="">Unassigned</option>${userOptions}</select>
        </div>
        <div class="form-group" id="fg-startDate">
          <label>Start Date <span class="required-mark">*</span></label>
          <input type="date" id="f-startDate" />
          <div class="form-error">Start date is required.</div>
        </div>
        <div class="form-group" id="fg-dueDate">
          <label>Due Date <span class="required-mark">*</span></label>
          <input type="date" id="f-dueDate" />
          <div class="form-error">Due date is required.</div>
        </div>
        <div class="form-group">
          <label>Priority</label>
          <select id="f-priority"><option>Low</option><option selected>Medium</option><option>High</option><option>Critical</option></select>
        </div>
      </div>
    </form>
  `;
  const footerHtml = `
    <button class="btn btn-secondary" id="cancel-create-project">Cancel</button>
    <button class="btn btn-primary" id="submit-create-project">Create Project</button>
  `;
  renderModal({ title: "Create Project", bodyHtml, footerHtml });
  document.getElementById("cancel-create-project").addEventListener("click", () => closeModal());
  document.getElementById("submit-create-project").addEventListener("click", handleCreateSubmit);
}

async function handleCreateSubmit() {
  const values = {
    projectName: document.getElementById("f-projectName").value.trim(),
    startDate: document.getElementById("f-startDate").value,
    dueDate: document.getElementById("f-dueDate").value,
  };
  const { valid, errors } = validateForm(values, {
    projectName: [required("Project name is required.")],
    startDate: [required("Start date is required.")],
    dueDate: [required("Due date is required.")],
  });

  ["projectName", "startDate", "dueDate"].forEach((field) => {
    const group = document.getElementById(`fg-${field}`);
    group.classList.toggle("invalid", !!errors[field]);
  });
  if (!valid) return;

  const btn = document.getElementById("submit-create-project");
  btn.disabled = true;
  btn.textContent = "Creating…";
  try {
    await createProject({
      projectName: values.projectName,
      description: document.getElementById("f-description").value.trim(),
      projectManager: document.getElementById("f-projectManager").value,
      reporter: document.getElementById("f-reporter").value,
      startDate: values.startDate,
      dueDate: values.dueDate,
      priority: document.getElementById("f-priority").value,
      createdBy: session.user.uid,
    });
    closeModal();
    showToast("Project created successfully.", "success");
  } catch (error) {
    console.error(error);
    showToast("Unable to create project. Please try again.", "error");
    btn.disabled = false;
    btn.textContent = "Create Project";
  }
}

init().catch((err) => { console.error(err); showToast("Unable to load projects.", "error"); });
