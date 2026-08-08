/**
 * TRACEBASE — Dashboard
 * Bootstraps the dashboard page: KPI cards, team workload, project progress, charts.
 */
import { requireAuth, isManagerOrAbove } from "./auth-guard.js";
import { subscribeAllTasks } from "./tasks.js";
import { subscribeProjects } from "./projects.js";
import { listUsers } from "./users.js";
import { renderProgressBar, renderStatusBadge, renderAvatar, renderSkeletonRows, renderEmptyState, showToast } from "./ui.js";
import { escapeHtml, isOverdue, isToday, formatDate } from "./utils.js";

let session, allTasks = [], allProjects = [], allUsers = [];

async function init() {
  session = await requireAuth("dashboard");
  document.getElementById("kpi-grid").innerHTML = renderSkeletonRows(1);

  allUsers = await listUsers();

  subscribeAllTasks((tasks) => { allTasks = tasks; renderAll(); });
  subscribeProjects((projects) => { allProjects = projects; renderAll(); });
}

function renderAll() {
  renderKpis();
  renderWorkload();
  renderProjectProgress();
  renderCharts();
}

function renderKpis() {
  const grid = document.getElementById("kpi-grid");
  const total = allTasks.length;
  const completed = allTasks.filter((t) => t.status === "Completed").length;
  const inProgress = allTasks.filter((t) => t.status === "In Progress").length;
  const review = allTasks.filter((t) => t.status === "Review").length;
  const blocked = allTasks.filter((t) => t.status === "Blocked").length;
  const overdue = allTasks.filter((t) => isOverdue(t.dueDate, t.status)).length;
  const dueToday = allTasks.filter((t) => isToday(t.dueDate) && t.status !== "Completed").length;

  const cards = [
    { label: "Total Projects", value: allProjects.length },
    { label: "Total Tasks", value: total },
    { label: "Completed", value: completed },
    { label: "In Progress", value: inProgress },
    { label: "Review", value: review },
    { label: "Blocked", value: blocked },
    { label: "Overdue", value: overdue },
    { label: "Due Today", value: dueToday },
  ];

  grid.innerHTML = cards.map((c) => `
    <div class="kpi-card">
      <div class="kpi-label">${c.label}</div>
      <div class="kpi-value">${c.value}</div>
    </div>
  `).join("");
}

function renderWorkload() {
  const container = document.getElementById("workload-table-wrap");
  if (!container) return;
  if (!isManagerOrAbove(session.profile)) {
    container.closest(".panel").style.display = "none";
    return;
  }
  if (allUsers.length === 0) {
    container.innerHTML = renderEmptyState({ title: "No team members yet", message: "Add users from the Team page." });
    return;
  }

  const rows = allUsers.filter(u => u.active !== false).map((u) => {
    const userTasks = allTasks.filter((t) => t.assigneeId === u.userId);
    const completed = userTasks.filter((t) => t.status === "Completed").length;
    const inProgress = userTasks.filter((t) => t.status === "In Progress").length;
    const overdue = userTasks.filter((t) => isOverdue(t.dueDate, t.status)).length;
    const allocated = userTasks.reduce((sum, t) => sum + (t.allocatedHours || 0), 0);
    const actual = userTasks.reduce((sum, t) => sum + (t.actualHours || 0), 0);
    const remaining = userTasks.reduce((sum, t) => sum + (t.remainingHours || 0), 0);
    return `
      <tr>
        <td data-label="User"><div style="display:flex;align-items:center;gap:8px;">${renderAvatar(u, "avatar avatar-sm")} ${escapeHtml(u.name)}</div></td>
        <td data-label="Assigned">${userTasks.length}</td>
        <td data-label="Completed">${completed}</td>
        <td data-label="In Progress">${inProgress}</td>
        <td data-label="Overdue">${overdue > 0 ? `<span class="badge badge-danger">${overdue}</span>` : "0"}</td>
        <td data-label="Allocated Hrs">${allocated}h</td>
        <td data-label="Actual Hrs">${actual}h</td>
        <td data-label="Remaining Hrs">${remaining}h</td>
      </tr>
    `;
  }).join("");

  container.innerHTML = `
    <div class="table-wrap responsive-table">
      <table class="data-table">
        <thead><tr><th>User</th><th>Assigned</th><th>Completed</th><th>In Progress</th><th>Overdue</th><th>Allocated</th><th>Actual</th><th>Remaining</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderProjectProgress() {
  const container = document.getElementById("project-progress-wrap");
  if (!container) return;
  if (allProjects.length === 0) {
    container.innerHTML = renderEmptyState({ title: "No projects yet", message: "Create your first project to see progress here.", actionLabel: "Create Project", actionHref: "projects.html" });
    return;
  }
  const rows = allProjects.map((p) => {
    const projectTasks = allTasks.filter((t) => t.projectId === p.projectId);
    const completed = projectTasks.filter((t) => t.status === "Completed").length;
    const inProgress = projectTasks.filter((t) => t.status === "In Progress").length;
    const overdue = projectTasks.filter((t) => isOverdue(t.dueDate, t.status)).length;
    const progress = projectTasks.length === 0 ? 0 : Math.round((completed / projectTasks.length) * 100);
    return `
      <tr data-project-id="${p.docId}">
        <td data-label="Project"><strong>${escapeHtml(p.projectName)}</strong></td>
        <td data-label="Total Tasks">${projectTasks.length}</td>
        <td data-label="Completed">${completed}</td>
        <td data-label="In Progress">${inProgress}</td>
        <td data-label="Overdue">${overdue}</td>
        <td data-label="Progress" style="min-width:160px;">${renderProgressBar(progress)}</td>
      </tr>
    `;
  }).join("");

  container.innerHTML = `
    <div class="table-wrap responsive-table">
      <table class="data-table">
        <thead><tr><th>Project</th><th>Total</th><th>Completed</th><th>In Progress</th><th>Overdue</th><th>Progress</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
  container.querySelectorAll("tr[data-project-id]").forEach((row) => {
    row.addEventListener("click", () => window.location.href = `project-details.html?id=${row.getAttribute("data-project-id")}`);
  });
}

function renderCharts() {
  drawBarChart("chart-status", groupCount(allTasks, "status"), ["#a4abb8", "#1a6fb4", "#6a2fb0", "#916b00", "#157347"]);
  drawBarChart("chart-priority", groupCount(allTasks, "priority"), ["#5c6373", "#1a6fb4", "#b3720e", "#b3261e"]);

  const byProject = {};
  allProjects.forEach((p) => { byProject[p.projectName] = allTasks.filter((t) => t.projectId === p.projectId).length; });
  drawBarChart("chart-project", byProject, null);

  const hoursCanvas = document.getElementById("chart-hours");
  if (hoursCanvas) {
    const allocated = allTasks.reduce((s, t) => s + (t.allocatedHours || 0), 0);
    const actual = allTasks.reduce((s, t) => s + (t.actualHours || 0), 0);
    drawBarChart("chart-hours", { "Allocated": allocated, "Actual": actual }, ["#33339f", "#4f5ae8"]);
  }
}

function groupCount(items, field) {
  const out = {};
  items.forEach((item) => { const key = item[field] || "Unspecified"; out[key] = (out[key] || 0) + 1; });
  return out;
}

/** Minimal dependency-free bar chart renderer on <canvas>, responsive to container width. */
function drawBarChart(canvasId, dataObj, palette) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const parent = canvas.parentElement;
  const dpr = window.devicePixelRatio || 1;
  const width = parent.clientWidth;
  const height = 220;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  const entries = Object.entries(dataObj);
  if (entries.length === 0) {
    ctx.fillStyle = "#a4abb8";
    ctx.font = "13px sans-serif";
    ctx.fillText("No data yet", 12, 24);
    return;
  }
  const maxVal = Math.max(...entries.map(([, v]) => v), 1);
  const paddingBottom = 34;
  const paddingTop = 12;
  const chartHeight = height - paddingBottom - paddingTop;
  const barWidth = Math.min(56, (width - 24) / entries.length - 16);
  const gap = (width - 24 - barWidth * entries.length) / (entries.length + 1);
  const colors = palette || ["#33339f", "#4f5ae8", "#7480fb", "#9ba6ff", "#c3caff"];

  entries.forEach(([label, value], i) => {
    const barHeight = (value / maxVal) * chartHeight;
    const x = 12 + gap * (i + 1) + barWidth * i;
    const y = paddingTop + (chartHeight - barHeight);
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath();
    const radius = 4;
    ctx.moveTo(x, y + barHeight);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.lineTo(x + barWidth - radius, y);
    ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
    ctx.lineTo(x + barWidth, y + barHeight);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#181b23";
    ctx.font = "700 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(value), x + barWidth / 2, y - 6);

    ctx.fillStyle = "#7c8494";
    ctx.font = "11px sans-serif";
    const shortLabel = label.length > 10 ? label.slice(0, 9) + "…" : label;
    ctx.fillText(shortLabel, x + barWidth / 2, height - paddingBottom + 16);
  });
}

window.addEventListener("resize", () => { if (allTasks.length || allProjects.length) renderCharts(); });

init().catch((err) => { console.error(err); showToast("Unable to load dashboard.", "error"); });
