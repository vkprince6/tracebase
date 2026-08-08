/**
 * TRACEBASE — Reports page controller (Manager / Admin)
 */
import { requireAuth, isManagerOrAbove } from "./auth-guard.js";
import { listAllTasks } from "./tasks.js";
import { listProjects } from "./projects.js";
import { listUsers } from "./users.js";
import { renderEmptyState, renderProgressBar, showToast, renderSkeletonRows } from "./ui.js";
import { escapeHtml, isOverdue, toDate } from "./utils.js";

let session, tasks = [], projects = [], users = [];
let dateFrom = null, dateTo = null;

async function init() {
  session = await requireAuth("reports");
  if (!isManagerOrAbove(session.profile)) {
    document.getElementById("reports-root").innerHTML = renderEmptyState({
      title: "Managers and admins only", message: "You don't have access to reports.",
      actionLabel: "Back to Dashboard", actionHref: "dashboard.html",
    });
    return;
  }
  document.getElementById("reports-root").innerHTML = renderSkeletonRows(4);

  document.getElementById("apply-date-filter-btn")?.addEventListener("click", () => {
    dateFrom = document.getElementById("date-from").value || null;
    dateTo = document.getElementById("date-to").value || null;
    render();
  });
  document.getElementById("clear-date-filter-btn")?.addEventListener("click", () => {
    dateFrom = null; dateTo = null;
    document.getElementById("date-from").value = ""; document.getElementById("date-to").value = "";
    render();
  });

  [tasks, projects, users] = await Promise.all([listAllTasks(), listProjects(), listUsers()]);
  render();
}

function inRange(task) {
  if (!dateFrom && !dateTo) return true;
  const created = toDate(task.createdAt);
  if (!created) return true;
  if (dateFrom && created < new Date(dateFrom)) return false;
  if (dateTo && created > new Date(new Date(dateTo).setHours(23, 59, 59))) return false;
  return true;
}

function render() {
  const root = document.getElementById("reports-root");
  const filtered = tasks.filter(inRange);

  const totalAllocated = filtered.reduce((s, t) => s + (t.allocatedHours || 0), 0);
  const totalActual = filtered.reduce((s, t) => s + (t.actualHours || 0), 0);
  const completed = filtered.filter((t) => t.status === "Completed").length;
  const overdueCount = filtered.filter((t) => isOverdue(t.dueDate, t.status)).length;
  const completionPct = filtered.length === 0 ? 0 : Math.round((completed / filtered.length) * 100);

  const byProjectRows = projects.map((p) => {
    const pTasks = filtered.filter((t) => t.projectId === p.projectId);
    const pCompleted = pTasks.filter((t) => t.status === "Completed").length;
    const pct = pTasks.length === 0 ? 0 : Math.round((pCompleted / pTasks.length) * 100);
    return `<tr><td data-label="Project">${escapeHtml(p.projectName)}</td><td data-label="Total">${pTasks.length}</td><td data-label="Completed">${pCompleted}</td><td data-label="Completion" style="min-width:140px;">${renderProgressBar(pct)}</td></tr>`;
  }).join("");

  const byAssigneeRows = users.filter(u => u.active !== false).map((u) => {
    const uTasks = filtered.filter((t) => t.assigneeId === u.userId);
    const uCompleted = uTasks.filter((t) => t.status === "Completed").length;
    const uOverdue = uTasks.filter((t) => isOverdue(t.dueDate, t.status)).length;
    const alloc = uTasks.reduce((s, t) => s + (t.allocatedHours || 0), 0);
    const act = uTasks.reduce((s, t) => s + (t.actualHours || 0), 0);
    return `<tr><td data-label="Assignee">${escapeHtml(u.name)}</td><td data-label="Total">${uTasks.length}</td><td data-label="Completed">${uCompleted}</td><td data-label="Overdue">${uOverdue}</td><td data-label="Allocated">${alloc}h</td><td data-label="Actual">${act}h</td></tr>`;
  }).join("");

  const overdueRows = filtered.filter((t) => isOverdue(t.dueDate, t.status)).map((t) => `
    <tr><td data-label="Task">${escapeHtml(t.title)}</td><td data-label="Project">${escapeHtml(t.projectName || "")}</td><td data-label="Assignee">${escapeHtml(t.assigneeName || "Unassigned")}</td><td data-label="Due">${escapeHtml(t.dueDate ? new Date(t.dueDate.toDate ? t.dueDate.toDate() : t.dueDate).toLocaleDateString() : "—")}</td></tr>
  `).join("");

  root.innerHTML = `
    <div class="kpi-grid" style="margin-bottom: var(--space-5);">
      <div class="kpi-card"><div class="kpi-label">Tasks in Range</div><div class="kpi-value">${filtered.length}</div></div>
      <div class="kpi-card"><div class="kpi-label">Completion %</div><div class="kpi-value">${completionPct}%</div></div>
      <div class="kpi-card"><div class="kpi-label">Hours Allocated</div><div class="kpi-value">${totalAllocated}h</div></div>
      <div class="kpi-card"><div class="kpi-label">Hours Consumed</div><div class="kpi-value">${totalActual}h</div></div>
    </div>

    <div class="panel" style="margin-bottom: var(--space-4);">
      <div class="panel-header"><h3>Project Progress</h3></div>
      <div class="panel-body">
        ${projects.length === 0 ? renderEmptyState({ title: "No projects yet" }) : `
        <div class="table-wrap responsive-table"><table class="data-table">
          <thead><tr><th>Project</th><th>Total</th><th>Completed</th><th>Completion</th></tr></thead>
          <tbody>${byProjectRows}</tbody>
        </table></div>`}
      </div>
    </div>

    <div class="panel" style="margin-bottom: var(--space-4);">
      <div class="panel-header"><h3>Team Workload</h3></div>
      <div class="panel-body">
        <div class="table-wrap responsive-table"><table class="data-table">
          <thead><tr><th>Assignee</th><th>Total</th><th>Completed</th><th>Overdue</th><th>Allocated</th><th>Actual</th></tr></thead>
          <tbody>${byAssigneeRows}</tbody>
        </table></div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-header"><h3>Overdue Tasks (${overdueCount})</h3></div>
      <div class="panel-body">
        ${overdueCount === 0 ? renderEmptyState({ title: "Nothing overdue", message: "Great work — no overdue tasks in range." }) : `
        <div class="table-wrap responsive-table"><table class="data-table">
          <thead><tr><th>Task</th><th>Project</th><th>Assignee</th><th>Due</th></tr></thead>
          <tbody>${overdueRows}</tbody>
        </table></div>`}
      </div>
    </div>
  `;
}

init().catch((err) => { console.error(err); showToast("Unable to load reports.", "error"); });
