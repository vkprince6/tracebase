/**
 * TRACEBASE — Demo Data Seeder
 * -------------------------------------------------------
 * Populates Firestore with realistic sample projects and tasks so you can
 * explore TraceBase without manually creating everything by hand.
 *
 * IMPORTANT: This script only creates Firestore documents (projects, tasks).
 * It does NOT create Firebase Authentication accounts or passwords — those
 * must already exist (see README "Creating the First Admin" / "How to add
 * users"). No real passwords are ever included here.
 *
 * HOW TO RUN:
 * 1. Make sure you have at least 2-3 real users already set up in
 *    Authentication + Firestore /users (see README section 9).
 * 2. Log into TraceBase in your browser as an Admin.
 * 3. Open the browser DevTools console on any TraceBase page.
 * 4. Paste and run:
 *      const mod = await import('./js/seed-demo-data.js');
 *      await mod.seedDemoData();
 * 5. Refresh the Dashboard/Projects/Tasks pages to see the demo content.
 */
import { db } from "./firebase-config.js";
import { collection, addDoc, serverTimestamp, Timestamp, getDocs, query, limit } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { generateId } from "./utils.js";
import { listUsers } from "./users.js";

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return Timestamp.fromDate(d);
}

export async function seedDemoData() {
  const users = await listUsers();
  if (users.length === 0) {
    console.error("No users found. Create at least one user profile first (see README section 9) before seeding demo data.");
    return;
  }

  const pick = (i) => users[i % users.length];

  const demoProjects = [
    {
      projectName: "Website Redesign",
      description: "Refresh the public marketing site with a new design system and improved performance.",
      priority: "High",
    },
    {
      projectName: "Student Management System",
      description: "Internal tool for tracking student enrollment, grades, and attendance.",
      priority: "Medium",
    },
    {
      projectName: "AI Automation Platform",
      description: "Workflow automation platform with pluggable AI-powered task handlers.",
      priority: "Critical",
    },
  ];

  const demoTaskTitles = [
    { title: "Login Page", description: "Build the authentication screen with validation and error states." },
    { title: "Dashboard UI", description: "Implement the KPI cards, workload table, and charts." },
    { title: "API Integration", description: "Wire up the frontend to the backend/Firestore data layer." },
    { title: "Testing", description: "Write and run test cases across desktop and mobile breakpoints." },
    { title: "Documentation", description: "Document setup, usage, and deployment steps." },
  ];

  const statuses = ["Not Started", "In Progress", "Review", "Completed", "Blocked"];
  const priorities = ["Low", "Medium", "High", "Critical"];

  let projectCount = 0, taskCount = 0;

  for (const proj of demoProjects) {
    const projectId = generateId("proj");
    const manager = pick(projectCount);
    const reporter = pick(projectCount + 1);

    await addDoc(collection(db, "projects"), {
      projectId,
      projectName: proj.projectName,
      description: proj.description,
      projectManager: manager.name,
      reporter: reporter.name,
      startDate: daysFromNow(-14),
      dueDate: daysFromNow(30),
      status: "Active",
      priority: proj.priority,
      progress: 0,
      createdBy: manager.userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    for (let i = 0; i < demoTaskTitles.length; i++) {
      const t = demoTaskTitles[i];
      const assignee = pick(taskCount);
      const taskReporter = pick(taskCount + 1);
      const status = statuses[i % statuses.length];
      const allocated = [4, 8, 16, 6, 3][i % 5];

      await addDoc(collection(db, "tasks"), {
        taskId: generateId("task"),
        projectId,
        projectName: proj.projectName,
        title: `${t.title} — ${proj.projectName}`,
        description: t.description,
        assigneeId: assignee.userId,
        assigneeName: assignee.name,
        reporterId: taskReporter.userId,
        reporterName: taskReporter.name,
        priority: priorities[i % priorities.length],
        status,
        progress: status === "Completed" ? 100 : status === "In Progress" ? 50 : 0,
        startDate: daysFromNow(-7),
        dueDate: daysFromNow(i % 2 === 0 ? 5 : -3), // mix of upcoming + overdue
        allocatedHours: allocated,
        actualHours: status === "Completed" ? allocated : Math.round(allocated / 2),
        remainingHours: status === "Completed" ? 0 : Math.round(allocated / 2),
        tags: i === 0 ? ["frontend"] : i === 2 ? ["backend", "urgent"] : [],
        links: [],
        createdBy: taskReporter.userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        completedAt: status === "Completed" ? serverTimestamp() : null,
      });
      taskCount++;
    }
    projectCount++;
  }

  console.log(`Seed complete: created ${demoProjects.length} projects and ${taskCount} tasks.`);
}
