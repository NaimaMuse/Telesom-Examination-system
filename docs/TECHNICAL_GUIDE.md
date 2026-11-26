# Telesom Academy Examination System Technical and Setup Guide

This guide is for developers and operators who run, deploy, or maintain the system. See the [User Guide](USER_GUIDE.md) for day-to-day workflows for administrators, teachers, judges, and students.

## Architecture

| Layer | Responsibility | Repository location |
| --- | --- | --- |
| React and Vite | Login, role dashboards, and assessment workflows | [Application routes](../frontend/src/App.jsx), [Dashboard routes](../frontend/src/components/DashboardLayout.jsx) |
| Express | API requests, permissions, validation, and application rules | [Server entry point](../backend/server.js), [Routes](../backend/routes/) |
| MongoDB and Mongoose | Accounts, enrollment, assessments, evaluations, and results | [Models](../backend/models/) |

The browser uses the `/api` base path. During local development, Vite forwards API requests to Express. The API enforces account roles and record-level access.

## Local setup

### Prerequisites

- Node.js and npm.
- A MongoDB replica set or sharded cluster for transactional course feedback operations and Project Defense finalization.
- A Google OAuth web client ID if the environment uses Google Sign-In.

### Install dependencies

Run these commands from the repository root in PowerShell. The conditional copies preserve existing environment files.

```powershell
npm --prefix backend ci
npm --prefix frontend ci
if (!(Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
if (!(Test-Path frontend/.env)) { Copy-Item frontend/.env.example frontend/.env }
```

### Configure the environment

| Setting | Location | Purpose |
| --- | --- | --- |
| `PORT` | `backend/.env` | Express port. Defaults to `5000`. |
| `NODE_ENV` | Backend environment | Selects development or production behavior. |
| `MONGODB_URI` | Backend environment | Database connection. An example for a configured local replica set is `mongodb://localhost:27017/telesom_exam_db?replicaSet=rs0`. |
| `JWT_SECRET` | Backend environment or secret store | Signs bearer tokens. Use a random secret of at least 32 bytes in production. |
| `GOOGLE_CLIENT_ID` | Backend environment | Enables Google Identity Services. Register the frontend origin with the Google OAuth client. |
| `VITE_API_URL` | `frontend/.env` | Frontend API base. Use `/api` with the local Vite proxy or a same-site HTTPS deployment. |

The MongoDB host must already be configured as a replica set before using `replicaSet=rs0` in the connection URI. See the [Evaluation database notes](EVALUATIONS.md#database-prerequisite) for the Windows setup.

### Start both services

From the repository root, run the backend and frontend in separate terminals:

```powershell
npm run dev:backend
```

```powershell
npm run dev:frontend
```

Check the backend at `http://localhost:5000/api/health`. Open the frontend address printed by Vite, typically `http://localhost:3000/login`.

For a new database that needs its first administrator, run:

```powershell
npm --prefix backend run admin:setup
```

The provisioning script reports whether an administrator already exists. When it generates a temporary password, deliver it through a secure channel. Production provisioning requires `INITIAL_ADMIN_PASSWORD` from the deployment secret store.

## Authentication and permissions

- Staff and students use `/login`. The former `/staff/login` and `/admin/login` URLs redirect there.
- Browser sessions use an `HttpOnly` cookie. MongoDB stores the session token digest. Student password sign-in requires an active account, an active student profile, and a configured portal password.
- Google Sign-In verifies the student's identity and matches the email against the registered account. The stored account determines the session role.
- Admin and teacher access to Project Defense follows the exam scope. Assigned evaluators can write their own evaluations. Administrators finalize group results.

See [Security deployment notes](SECURITY.md) for session handling, CORS, CSRF, OAuth configuration, and production controls.

## Project Defense data model

| Model | Stored data |
| --- | --- |
| [Exam](../backend/models/Exam.js) | Course, cohort, academic year, maximum and passing marks, and publication settings. |
| [DefenseRubric](../backend/models/DefenseRubric.js) | Exam, form title, sections, questions, review status, and reviewer handoff. |
| [ProjectDefense](../backend/models/ProjectDefense.js) | Group members, rubric snapshot, evaluator assignments, star ratings, computed section scores, and final mark. |
| [ExamResult](../backend/models/ExamResult.js) | A student's exam result. A unique index enforces one result per student and exam. |

Enrollment determines eligibility for group membership. When a group is created, the system stores the rubric snapshot and exam maximum used for that group. Later changes to the form do not change the group's scoring criteria.

### Scoring and rounding

```text
Section marks  = (sum of stars / (5 × number of questions)) × section maximum
Evaluator mark = sum of section marks
Group mark     = mean of the assigned evaluators' totals, rounded to 2 decimals
```

Questions are weighted equally within each section. The API derives section marks from the submitted ratings. Every assigned evaluator must submit before the group can be finalized.

### Finalization and publication

The administrator first reviews each existing result against the proposed mark. If the underlying data changes before confirmation, the API requires a fresh preview. Finalization writes student results and the group's final status in one MongoDB transaction. Repeating finalization for the same group returns its existing final mark without creating duplicate results.

The student portal shows exam results when `visibleToStudents` and `marksPublished` are both enabled and the exam status is neither draft nor cancelled.

### Workflow API

All paths below are relative to `/api/evaluations/defenses/workflow`.

| Method and path | Purpose |
| --- | --- |
| `GET /exams`, `GET /exams/:id/options` | List accessible exams and the people eligible for group selection. |
| `GET /forms?exam=...`, `GET /forms/:id` | List an exam's forms or open a specific form. |
| `POST /forms`, `PUT /forms/:id` | Create or update a form. |
| `POST /forms/:id/send`, `POST /forms/:id/approve` | Hand off a form for review or approve it. |
| `GET /groups`, `POST /groups`, `GET /groups/:id` | List assignments or exam groups, create a group, or open a specific group. |
| `PUT /groups/:id/evaluators` | Update evaluator assignments before scoring starts. |
| `PUT /groups/:id/score` | Save a draft or submit the authenticated evaluator's ratings. |
| `GET /groups/:id/finalization`, `POST /groups/:id/finalize` | Preview and confirm a group's results as an administrator. |

See the [Project Defense route implementation](../backend/routes/defenseWorkflowRoutes.js) for validation and authorization, and [Evaluation Forms](EVALUATIONS.md) for the separate course feedback API.

## Testing

```powershell
npm run test:backend
npm --prefix frontend run build
npm --prefix frontend run test:search
npm --prefix backend run test:defense-workflow
npm --prefix backend run test:evaluations:integration
```

The two evaluation integration suites start isolated local MongoDB replica sets with synthetic fixtures. See the [Project Defense integration test](../backend/tests/defenseWorkflow.http.test.js) and [Evaluation Forms integration test](../backend/tests/evaluations.http.test.js) for the `TEST_MONGOD` and `TEST_MONGO_PORT` settings.

## Deployment and troubleshooting

Build the frontend with `npm --prefix frontend run build`. Serve the frontend and `/api` under the same HTTPS site. Configure a frontend route fallback so refreshing the login and dashboard URLs serves the React application. Connect the backend to a transactional MongoDB deployment. For reverse proxy, TLS, and secrets configuration, see [Production configuration](SECURITY.md#production-configuration).

| Symptom | What to check |
| --- | --- |
| Vite reports `Unexpected token` after a Git merge | Search the source for unresolved merge markers such as `<<<<<<<`, `=======`, and `>>>>>>>`. Resolve the affected blocks and run the frontend build. |
| The API does not respond through Vite | Check the backend health endpoint and the proxy target in the [Vite configuration](../frontend/vite.config.js). |
| Finalization returns HTTP 503 | Check that the API is connected to a replica set or sharded cluster. |
| Google Sign-In is unavailable | Check `GOOGLE_CLIENT_ID`, authorized frontend origins, and backend logs. |
| Finalization requests a new review | Reopen the preview and review the current results before confirming replacements. |
