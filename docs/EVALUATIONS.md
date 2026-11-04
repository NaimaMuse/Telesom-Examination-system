# Evaluation Forms

The feature extends the existing Express/Mongoose API, JWT role middleware, enrollment and student records, React dashboard layout, shared Axios client, and notification bell. Existing login changes in the working tree were left intact.

## Database prerequisite

The local MongoDB installation has been configured and verified as the single-member replica set rs0, preserving the existing databases. Its previous configuration is backed up at C:\Program Files\MongoDB\Server\8.3\bin\mongod.cfg.evaluation-20261102094202.bak. Evaluation writes require a replica set or sharded cluster; deployment to a standalone MongoDB returns HTTP 503 with a specific setup message.

For other environments, use an existing replica-set MongoDB deployment (including Atlas), or configure a local MongoDB installation as a single-member replica set. The included backend/scripts/enableEvaluationTransactions.ps1 performs the local Windows setup from an Administrator PowerShell terminal. Back up the database before changing service configuration. For the local installation, add `replication: { replSetName: rs0 }` to mongod.cfg, restart MongoDB, and run `replSetInitiate` with the localhost member. Set MONGODB_URI to the same database with `replicaSet=rs0` in the query string, then restart the backend. Do not run the seed command: evaluations reuse existing data.

The backend initializes evaluation models and unique indexes before listening. No destructive migrations are required. Deadlines persist as UTC dates and display in Africa/Nairobi, matching the existing academy notification calendar.

## Added models

`backend/models/Evaluation.js` defines:

- EvaluationForm: existing Course reference, existing Student assignments, ordered question subdocuments, closing settings, edit policy, revision, response count, publication event, and timestamps.
- EvaluationResponse: existing Student and EvaluationForm references, embedded answer values, draft progress, original submission and last edited timestamps. A unique compound index enforces one record per form/student, including drafts.
- EvaluationNotice: persistent publication/deadline/reopen/reminder notifications and read timestamps, with a unique student/form/event index.

Questions and assignments are embedded in the form so revisions and ordered questions can be checked together. Answers are embedded in the unique response. Once a submission exists, course, question definitions, and assignments lock; duplicate the form for structural revisions. Administrative settings and descriptions remain editable. Unsaved previews do not write responses.

## API

All routes are under `/api/evaluations` and use the existing JWT middleware.

| Method and path | Access | Purpose |
| --- | --- | --- |
| GET / | Admin / Student | Paginated forms; student results are assignment scoped |
| GET /courses | Admin | Existing course selector |
| GET /eligible/:course | Admin | Distinct enrolled students, 50 per page |
| POST / | Admin | Create draft |
| GET /:id | Admin / assigned student | Builder or own response; marks notices read |
| PUT /:id | Admin | Save settings, questions and assignment changes with revision check |
| POST /:id/publish, unpublish, close, reopen, duplicate | Admin | Form lifecycle |
| DELETE /:id | Admin | Delete form, responses and evaluation notices together |
| PUT /:id/response | Assigned student | Save progress (`submit:false`), submit, or update original response |
| GET /:id/report | Admin | Counts, pending students, distributions, searchable paginated individual responses |

Existing `/api/notifications` now combines assessment notices and persisted evaluation notices. PATCH `/api/notifications/evaluations/read` marks only the authenticated student's notices read.

## Consistency and closing

Response, counter and form writes commit in one transaction. Every response write touches the same form document, making concurrent submissions, closure and admin changes conflict and retry safely. The unique response index additionally prevents duplicate records. Transaction retries recompute deadlines and limits.

Effective closed/expired status is calculated at read and write time. No scheduled job is needed to enforce deadlines. Reopening requires a future deadline and available response capacity. Editing after closure requires both allowEdit and allowClosedEdit. Publication event numbers prevent duplicate notices for repeated publish calls. Reminders are created lazily when the student notification center polls within 24 hours of the deadline; no email or offline push delivery is implemented.

## UI

`frontend/src/components/Evaluations.jsx` and its scoped CSS implement both role interfaces. DashboardLayout adds menu entries and routes without changing existing navigation. The builder includes ten question types, sections, drag reorder plus keyboard-accessible arrow buttons, required fields, course/student selection, preview, settings and lifecycle actions. Students can save progress, submit, view, and explicitly edit their response. Reports include bar distributions, individual response details, pending students, search, pagination and CSV export. CSV is Excel-readable and protects cells beginning with formula characters.

## Verification

- `npm --prefix frontend run build`
- `npm --prefix backend test`
- `npm --prefix backend run test:evaluations:integration`

The integration suite launches a temporary, isolated local MongoDB replica set on port 27931, creates synthetic test fixtures only inside that database, and stops it afterward. It never uses the application database. Set TEST_MONGOD to the mongod executable on other installations and TEST_MONGO_PORT if the default test port is occupied. Temporary log/data files are retained for diagnosis.

Coverage includes role and assignment privacy, real enrollment lookup, publication notification idempotency/read state, required answers, draft progress, simultaneous submissions at a response limit, database uniqueness, response editing and original timestamps, disabled and closed editing, deadline/combined closure, structural protection, close/reopen, reports, duplication and deletion. Browser interaction and responsive visual QA have not been automated.

