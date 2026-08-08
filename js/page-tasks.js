/**
 * TRACEBASE — All Tasks page controller
 * Supports Table view and Kanban view, with filtering, sorting, and search.
 */
import { requireAuth } from "./auth-guard.js";
import { subscribeAllTasks, filterTasks, updateTaskStatus, isValidStatusTransition } from "./tasks.js";
import { listProjects } from "./projects.js";
import { listUsers } from "./users.js";
import {
  renderStatusBadge, renderPriorityBadge, renderProgressBar, renderEmptyState,
  renderSkeletonRows, showToast,
} from "./ui.js";
import { escapeHtml, formatDate, isOverdue, sortBy, STATUS_LIST, PRIORITY_LIST, debounce } from "./utils.js";

let session, allTasks = [], projects = [], users = [];
let currentView = "table";
let sortField = "dueDate", sortDir = "asc";
let filters = { project: "", assignee: "", status: "", priority: "", search: "" };

async function init() {
  session = await requireAuth("tasks");
  document.getElementById("task-list-wrap").innerHTML = renderSkeletonRows(6);

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("q")) filters.search = urlParams.get("q");

  projects = await listProjects();
  users = await listUsers();
  populateFilterOptions();
  wireControls();

  subscribeAllTasks((tasks) => { allTasks = tasks; render(); });
}

function populateFilterOptions() {
  document.getElementById("filter-project").innerHTML = `<option value="">All Projects</option>` + projects.map((p) => `<option value="${p.projectId}">${escapeHtml(p.projectName)}</option>`).join("");
  document.getElementById("filter-assignee").innerHTML = `<option value="">All Assignees</option>` + users.map((u) => `<option value="${u.userId}">${escapeHtml(u.name)}</option>`).join("");
  document.getElementById("filter-status").innerHTML = `<option value="">All Statuses</option>` + STATUS_LIST.map((s) => `<option value="${s}">${s}</option>`).join("");
  document.getElementById("filter-priority").innerHTML = `<option value="">All Priorities</option>` + PRIORITY_LIST.map((p) => `<option value="${p}">${p}</option>`).join("");
  if (filters.search) document.getElementById("search-input").value = filters.search;
}

function wireControls() {
  document.getElementById("filter-project").addEventListener("change", (e) => { filters.project = e.target.value; render(); });
  document.getElementById("filter-assignee").addEventListener("change", (e) => { filters.assignee = e.target.value; render(); });
  document.getElementById("filter-status").addEventListener("change", (e) => { filters.status = e.target.value; render(); });
  document.getElementById("filter-priority").addEventListener("change", (e) => { filters.priority = e.target.value; render(); });
  document.getElementById("reset-filters-btn").addEventListener("click", () => {
    filters = { project: "", assignee: "", status: "", priority: "", search: "" };
    ["filter-project","filter-assignee","filter-status","filter-priority"].forEach(id => document.getElementById(id).value = "");
    document.getElementById("search-input").value = "";
    render();
  });
  document.getElementById("search-input").addEventListener("input", debounce((e) => { filters.search = e.target.value; render(); }, 300));
  document.getElementById("sort-select").addEventListener("change", (e) => {
    [sortField, sortDir] = e.target.value.split(":");
    render();
  });
  document.getElementById("view-table-btn").addEventListener("click", () => setView("table"));
  document.getElementById("view-kanban-btn").addEventListener("click", () => setView("kanban"));
}

function setView(view) {
  currentView = view;
  document.getElementById("view-table-btn").classList.toggle("btn-primary", view === "table");
  document.getElementById("view-table-btn").classList.toggle("btn-secondary", view !== "table");
  document.getElementById("view-kanban-btn").classList.toggle("btn-primary", view === "kanban");
  document.getElementById("view-kanban-btn").classList.toggle("btn-secondary", view !== "kanban");
  render();
}

function render() {
  const filtered = sortBy(filterTasks(allTasks, filters), sortField, sortDir);
  document.getElementById("result-count").textContent = `${filtered.length} task${filtered.length === 1 ? "" : "s"}`;
  if (currentView === "table") renderTable(filtered);
  else renderKanban(filtered);
}

function renderTable(list) {
  const wrap = document.getElementById("task-list-wrap");
  if (list.length === 0) {
    wrap.innerHTML = renderEmptyState({ title: "No tasks found", message: "Try adjusting your filters or search." });
    return;
  }
  const rows = list.map((t) => `
    <tr data-task-id="${t.docId}">
      <td data-label="ID" style="font-family:var(--font-mono); font-size:12px; color:var(--text-muted);">${escapeHtml(t.taskId.slice(-6))}</td>
      <td data-label="Task"><strong>${escapeHtml(t.title)}</strong></td>
      <td data-label="Project">${escapeHtml(t.projectName || "")}</td>
      <td data-label="Assignee">${escapeHtml(t.assigneeName || "Unassigned")}</td>
      <td data-label="Reporter">${escapeHtml(t.reporterName || "—")}</td>
      <td data-label="Priority">${renderPriorityBadge(t.priority)}</td>
      <td data-label="Status">${renderStatusBadge(t.status)}</td>
      <td data-label="Progress" style="min-width:140px;">${renderProgressBar(t.progress)}</td>
      <td data-label="Due Date">${isOverdue(t.dueDate, t.status) ? `<span style="color:var(--color-danger-fg); font-weight:700;">${formatDate(t.dueDate)}</span>` : formatDate(t.dueDate)}</td>
      <td data-label="Allocated">${t.allocatedHours || 0}h</td>
      <td data-label="Actual">${t.actualHours || 0}h</td>
      <td data-label="Updated">${formatDate(t.updatedAt)}</td>
    </tr>
  `).join("");
  wrap.innerHTML = `
    <div class="table-wrap responsive-table">
      <table class="data-table">
        <thead><tr><th>ID</th><th>Task</th><th>Project</th><th>Assignee</th><th>Reporter</th><th>Priority</th><th>Status</th><th>Progress</th><th>Due</th><th>Alloc.</th><th>Actual</th><th>Updated</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
  wrap.querySelectorAll("[data-task-id]").forEach((row) => {
    row.addEventListener("click", () => window.location.href = `task-details.html?id=${row.getAttribute("data-task-id")}`);
  });
}

function renderKanban(list) {
  const wrap = document.getElementById("task-list-wrap");
  const columns = STATUS_LIST.map((status) => {
    const colTasks = list.filter((t) => t.status === status);
    const cards = colTasks.map((t) => `
      <div class="kanban-card" draggable="true" data-task-id="${t.docId}" data-current-status="${status}">
        <div style="font-weight:600; font-size:var(--text-sm); margin-bottom:6px;">${escapeHtml(t.title)}</div>
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
          ${renderPriorityBadge(t.priority)}
          <span style="font-size:11px; color:var(--text-muted);">${formatDate(t.dueDate)}</span>
        </div>
        ${renderProgressBar(t.progress)}
      </div>
    `).join("");
    return `
      <div class="kanban-col">
        <div class="kanban-col-header"><span>${status}</span><span class="badge badge-neutral">${colTasks.length}</span></div>
        <div class="kanban-col-body" data-status="${status}">${cards}</div>
      </div>
    `;
  }).join("");
  wrap.innerHTML = `<div class="kanban-board">${columns}</div>`;

  wrap.querySelectorAll(".kanban-card").forEach((card) => {
    card.addEventListener("click", (e) => window.location.href = `task-details.html?id=${card.getAttribute("data-task-id")}`);
    card.addEventListener("dragstart", (e) => {
      card.classList.add("dragging");
      e.dataTransfer.setData("text/plain", card.getAttribute("data-task-id"));
      e.dataTransfer.setData("text/from-status", card.getAttribute("data-current-status"));
    });
    card.addEventListener("dragend", () => card.classList.remove("dragging"));
  });

  wrap.querySelectorAll(".kanban-col-body").forEach((col) => {
    col.addEventListener("dragover", (e) => { e.preventDefault(); col.classList.add("drag-over"); });
    col.addEventListener("dragleave", () => col.classList.remove("drag-over"));
    col.addEventListener("drop", async (e) => {
      e.preventDefault();
      col.classList.remove("drag-over");
      const taskDocId = e.dataTransfer.getData("text/plain");
      const fromStatus = e.dataTransfer.getData("text/from-status");
      const toStatus = col.getAttribute("data-status");
      if (fromStatus === toStatus) return;
      if (!isValidStatusTransition(fromStatus, toStatus)) {
        showToast(`Cannot move task from ${fromStatus} directly to ${toStatus}.`, "warning");
        return;
      }
      const task = allTasks.find((t) => t.docId === taskDocId);
      if (!task) return;
      try {
        await updateTaskStatus(taskDocId, task, toStatus, { userId: session.user.uid, name: session.profile.name });
        showToast(`Task moved to ${toStatus}.`, "success");
      } catch (error) {
        console.error(error);
        showToast("Unable to update task status.", "error");
      }
    });
  });
}

init().catch((err) => { console.error(err); showToast("Unable to load tasks.", "error"); });
