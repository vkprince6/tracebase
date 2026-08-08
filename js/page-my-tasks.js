/**
 * TRACEBASE — My Tasks page controller
 */
import { requireAuth } from "./auth-guard.js";
import { subscribeAssigneeTasks } from "./tasks.js";
import { renderTaskCard, renderEmptyState, renderSkeletonRows, showToast } from "./ui.js";
import { isToday, isOverdue, debounce, toDate } from "./utils.js";

let session, myTasks = [];
let activeFilter = "all";
let searchTerm = "";

async function init() {
  session = await requireAuth("my-tasks");
  document.getElementById("my-tasks-list").innerHTML = renderSkeletonRows(4);

  document.querySelectorAll(".chip[data-filter]").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".chip[data-filter]").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      activeFilter = chip.getAttribute("data-filter");
      render();
    });
  });
  document.getElementById("my-tasks-search").addEventListener("input", debounce((e) => {
    searchTerm = e.target.value.trim().toLowerCase();
    render();
  }, 250));

  subscribeAssigneeTasks(session.user.uid, (tasks) => { myTasks = tasks; render(); });
}

function bucketize(task) {
  if (task.status === "Completed") return "completed";
  if (task.status === "Review") return "review";
  if (isOverdue(task.dueDate, task.status)) return "overdue";
  if (isToday(task.dueDate)) return "today";
  if (task.status === "In Progress") return "in-progress";
  const due = toDate(task.dueDate);
  if (due && due.getTime() > Date.now()) return "upcoming";
  return "upcoming";
}

function render() {
  let list = myTasks;
  if (activeFilter !== "all") {
    list = list.filter((t) => {
      const bucket = bucketize(t);
      if (activeFilter === "overdue") return bucket === "overdue";
      if (activeFilter === "today") return bucket === "today";
      if (activeFilter === "upcoming") return bucket === "upcoming" || bucket === "today";
      if (activeFilter === "in-progress") return t.status === "In Progress";
      if (activeFilter === "review") return t.status === "Review";
      if (activeFilter === "completed") return t.status === "Completed";
      return true;
    });
  }
  if (searchTerm) {
    list = list.filter((t) => t.title.toLowerCase().includes(searchTerm));
  }

  const counts = {
    today: myTasks.filter((t) => bucketize(t) === "today").length,
    overdue: myTasks.filter((t) => bucketize(t) === "overdue").length,
  };
  document.getElementById("my-tasks-summary").textContent =
    `${counts.today} due today · ${counts.overdue} overdue · ${myTasks.length} total assigned`;

  const container = document.getElementById("my-tasks-list");
  if (list.length === 0) {
    container.innerHTML = renderEmptyState({ title: "No tasks found", message: "You're all caught up, or try a different filter." });
    return;
  }
  container.innerHTML = list.map((t) => renderTaskCard(t, { overdue: isOverdue(t.dueDate, t.status) })).join("");
  container.querySelectorAll("[data-task-id]").forEach((card) => {
    card.addEventListener("click", () => window.location.href = `task-details.html?id=${myTasks.find(t => t.taskId === card.getAttribute("data-task-id"))?.docId}`);
  });
}

init().catch((err) => { console.error(err); showToast("Unable to load your tasks.", "error"); });
