# TraceBase

**Track Work. Drive Progress.**

TraceBase is a responsive project, task, team, time, and collaboration management platform built with plain HTML, CSS, and vanilla JavaScript (ES modules) on top of Firebase (Authentication, Firestore, Storage, Hosting).

---

## 1. Features

- **Authentication** — email/password login, logout, password reset, "remember me" session persistence, protected pages.
- **Role-based access control** — Admin, Reporter/Manager, Assignee, enforced both in the UI and in Firestore Security Rules.
- **Dashboard** — KPI cards, team workload table, project progress table, and responsive canvas charts (status, priority, per-project, allocated vs actual hours).
- **Projects** — create/edit/archive, project details with stats and task list.
- **Tasks** — full CRUD, status workflow (Not Started → In Progress → Review → Completed, plus Blocked), progress %, time tracking (allocated/actual/remaining hours), tags, links.
- **My Tasks** — personal view with Today / Upcoming / Overdue / In Progress / Review / Completed filters and search.
- **Table & Kanban views** — drag-and-drop Kanban on desktop, touch-friendly on mobile; responsive card-based tables on small screens.
- **Comments & Activity** — per-task comment timeline and a full chronological activity log (status changes, reassignments, priority/due-date changes, etc.).
- **Notifications** — in-app notification bell with unread counter, generated on assignment, reassignment, status changes, comments, and completion.
- **Reports** — project progress, team workload, overdue tasks, hours allocated vs consumed, with date-range filtering.
- **Team management (Admin)** — assign roles, activate/disable users.
- **Global search, filters, sorting** — across tasks, with a clear "reset filters" action.
- **Light/dark theme**, saved locally.
- **Fully responsive** — mobile-first, tested from 320px to 2560px+, hamburger drawer + bottom navigation on mobile, icon-rail sidebar on tablet, full sidebar on desktop.
- **Accessible** — semantic HTML, focus states, ARIA labels, keyboard-navigable menus and modals, 44px minimum touch targets.

---

## 2. Technology Stack

- HTML5, CSS3 (Grid + Flexbox, mobile-first responsive design), vanilla JavaScript ES2020+ (ES Modules)
- Firebase Authentication, Cloud Firestore, Firebase Storage, Firebase Hosting (modular Firebase JS SDK v10, loaded via CDN — no build step required)
- No frontend framework, no bundler required to run locally

---

## 3. Folder Structure

```text
tracebase/
├── index.html                  # Login page
├── dashboard.html
├── projects.html
├── project-details.html
├── tasks.html
├── my-tasks.html
├── task-details.html
├── team.html
├── reports.html
├── settings.html
│
├── css/
│   ├── variables.css            # Design tokens (colors, spacing, type scale)
│   ├── base.css                 # Reset + base element styles
│   ├── layout.css                # App shell: sidebar, header, mobile nav
│   ├── components.css            # Buttons, badges, cards, tables, modals, toasts…
│   ├── responsive.css            # Breakpoint overrides
│   └── themes.css                # Dark-theme specific tweaks
│
├── js/
│   ├── firebase-config.example.js   # Copy → firebase-config.js and fill in your project values
│   ├── firebase-config.js
│   ├── auth.js                      # Login/logout/reset/session
│   ├── auth-guard.js                 # Protects pages, renders app shell, role helpers
│   ├── ui.js                         # Reusable render functions (sidebar, badges, modal, toast…)
│   ├── utils.js                      # Dates, formatting, sorting, constants
│   ├── validation.js                 # Form validation helpers
│   ├── users.js                      # Team/user profile management
│   ├── projects.js                   # Project CRUD + stats
│   ├── tasks.js                      # Task CRUD, status transitions, time tracking
│   ├── comments.js                   # Task comments
│   ├── activity.js                   # Task activity log
│   ├── notifications.js              # In-app notifications
│   ├── dashboard.js                  # Dashboard page controller
│   ├── page-login.js                 # Login page controller
│   ├── page-projects.js              # Projects list page controller
│   ├── page-project-details.js       # Project details page controller
│   ├── page-tasks.js                 # All Tasks (table/kanban) page controller
│   ├── page-my-tasks.js              # My Tasks page controller
│   ├── page-task-details.js          # Task details page controller
│   ├── page-team.js                  # Team management page controller
│   ├── page-reports.js               # Reports page controller
│   └── page-settings.js              # Settings page controller
│
├── firebase/
│   ├── firestore.rules
│   ├── storage.rules
│   └── firestore.indexes.json
│
├── assets/
│   ├── logo/
│   ├── icons/
│   └── images/
│
├── .gitignore
├── firebase.json
└── README.md
```

> Note: the file structure adds one small controller file per page (`page-*.js`) alongside the data-layer modules named in the original spec (`tasks.js`, `projects.js`, etc.) so each file stays focused and readable — this keeps `tasks.js`/`projects.js`/etc. as pure data modules reusable by any page, while `page-*.js` files hold only page-specific DOM wiring.

---

## 4. Prerequisites

- A [Firebase](https://console.firebase.google.com) account and project
- [Firebase CLI](https://firebase.google.com/docs/cli) installed globally: `npm install -g firebase-tools`
- Any static file server for local development (or the Firebase CLI's own emulator/hosting serve)

---

## 5. Firebase Project Setup

1. Go to the [Firebase Console](https://console.firebase.google.com) → **Add project**.
2. Once created, go to **Build → Authentication → Get started** → enable the **Email/Password** sign-in provider.
3. Go to **Build → Firestore Database → Create database** → start in **production mode** (rules are provided in this repo).
4. Go to **Build → Storage → Get started** → start in **production mode**.
5. Go to **Project settings → General → Your apps** → click the **Web** icon (`</>`) → register the app (no Firebase Hosting setup needed at this step) → copy the `firebaseConfig` object shown.

---

## 6. Local Configuration

1. Copy the example config:
   ```bash
   cp js/firebase-config.example.js js/firebase-config.js
   ```
2. Open `js/firebase-config.js` and paste in the values from step 5 above (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`).

**About these values:** `apiKey`, `authDomain`, `projectId`, etc. are **public client identifiers**, not secrets — they identify which Firebase project your app talks to. It is safe for them to be visible in browser code. Actual security is enforced by the Firestore/Storage **Security Rules** in `/firebase`, not by hiding this file.

**Never** put a Firebase **Admin SDK service-account key** or any other server-side secret in this repository's frontend files — those only belong in a trusted backend or CI environment.

---

## 7. Deploying Security Rules & Indexes

From the project root:

```bash
firebase login
firebase use --add          # select your Firebase project, give it an alias e.g. "default"
firebase deploy --only firestore:rules,firestore:indexes,storage
```

This deploys `firebase/firestore.rules`, `firebase/firestore.indexes.json`, and `firebase/storage.rules`. Re-run this command any time you change those files.

---

## 8. Creating the First Admin

There is intentionally no hard-coded admin account or password in this codebase. Set up your first administrator like this:

1. In the Firebase Console, go to **Authentication → Users → Add user**. Enter an email and a strong password for yourself, then create the user.
2. Copy the generated **User UID** shown in the users table.
3. Go to **Firestore Database → Start collection** (if `users` doesn't exist yet) and create a document:
   - **Collection ID:** `users`
   - **Document ID:** paste the UID from step 2
   - Fields:
     | Field | Type | Value |
     |---|---|---|
     | `name` | string | Your name |
     | `email` | string | The email you used |
     | `role` | string | `admin` |
     | `department` | string | (optional) |
     | `designation` | string | (optional) |
     | `active` | boolean | `true` |
     | `profilePhoto` | string | `` (empty) |
     | `createdAt` | timestamp | now |
     | `updatedAt` | timestamp | now |
4. Log in at `index.html` with that email/password. You now have full admin access, including the **Team** page.

---

## 9. How to Add Users

The client app cannot create *other people's* Firebase Authentication logins directly (this would be a security hole — only a trusted backend/Admin SDK can do that). The workflow is:

1. **Firebase Console → Authentication → Users → Add user** — create their email/password login. Copy their **User UID**.
2. **Firestore Database → `users` collection** — create a document using that UID as the Document ID, with `name`, `email`, `role` (`admin` / `reporter` / `assignee`), `department`, `designation`, `active: true`.
3. They can now log in immediately, and an admin can adjust their role or disable them anytime from the **Team** page in the app (no console access needed after this point).

---

## 10. How to Create Projects

1. Log in as an Admin or Reporter/Manager.
2. Go to **Projects → + New Project**.
3. Fill in the project name, description, manager, reporter, start/due dates, and priority. Save.
4. Open the project to view its detail page, stats, and task list.

## 11. How to Create Tasks

1. Open a project's detail page (or go to **All Tasks**, if a "New Task" flow is added there).
2. Click **+ New Task**.
3. Fill in title, description, assignee, reporter, priority, status, dates, and allocated hours. Save.
4. The task appears in the project's task list, in **All Tasks**, and in the assignee's **My Tasks** page. The assignee also receives an in-app notification.

---

## 12. Local Development

No build step is required — this is plain HTML/CSS/JS loaded as ES modules.

```bash
# From the project root, serve the folder with any static server, e.g.:
npx serve .
# or
python3 -m http.server 8080
# or use the Firebase CLI's own hosting emulator:
firebase emulators:start --only hosting
```

Then open `http://localhost:PORT/index.html` in your browser.

> ES module imports require the site to be served over `http://` or `https://` — opening `index.html` directly via `file://` will not work.

---

## 13. Firebase Hosting Deployment

```bash
firebase deploy --only hosting
```

This deploys everything in the project root except the files listed in `firebase.json`'s `ignore` array (source-control-only files like `firebase/`, `README.md`, and the example config). Your live URL will be shown in the CLI output (`https://YOUR_PROJECT_ID.web.app`).

To deploy rules and hosting together:

```bash
firebase deploy
```

---

## 14. Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Blank page, console error about imports | You opened the file directly (`file://`) instead of via a local server. Serve it over `http://localhost`. |
| "Missing or insufficient permissions" in the console | Firestore Security Rules haven't been deployed yet, or the signed-in user's `/users/{uid}` document doesn't exist or has `active: false`. |
| Can log in but immediately get redirected back to login | The user's Firestore profile document is missing — see [Creating the First Admin](#8-creating-the-first-admin) / [How to Add Users](#9-how-to-add-users). |
| "The query requires an index" error in the console | Firestore needs a composite index for that query. Either click the link Firebase prints in the error (it deep-links to create it), or run `firebase deploy --only firestore:indexes` after checking `firebase/firestore.indexes.json` covers it. |
| Charts look blank or misaligned after resizing the window | They redraw on the `resize` event; if a chart looks stuck, refresh the page. |
| Kanban drag-and-drop won't drop a card in a column | Status transitions are restricted to valid workflow moves (e.g. you can't jump straight from "Not Started" to "Completed"). Move it through the intermediate statuses, or use the status dropdown on the task detail page. |

---

## 15. Security Notes

- Passwords are never stored in Firestore — only Firebase Authentication handles credentials.
- All authorization is enforced server-side via `firebase/firestore.rules` and `firebase/storage.rules`; the frontend UI hiding a button is a convenience, not a security boundary.
- User-generated text (comments, task titles/descriptions, link titles) is HTML-escaped before insertion into the DOM (see `escapeHtml` in `js/utils.js`) to prevent script injection.
- URLs entered for task/comment links are validated to be `http://` or `https://` before being saved or rendered as clickable links.
