# Academy feature enhancements

## Using the features

- **Admin → Reports Center** contains dropped students, teacher assessments, exams/quizzes, upcoming activities, outlines/lesson completion, makeup classes, teacher contracts, student assessment progress, attendance, and academic year/batch reports. The displayed filters also apply to PDF and Excel exports. Global header search narrows exported rows.
- **Admin → Years & Batches** creates batches under academic years and archives/reactivates batches without removing enrollments. Select academic year before batch in Add Student. The student Excel template includes both fields and a sheet listing real available batches.
- **Admin → Makeup Classes** schedules, edits, reschedules, or cancels replacement classes for incomplete lessons from a previous day. Teacher and course/batch time conflicts are rejected. The reason is private to staff.
- **Teacher → Exams & Quizzes** manages both exam-backed and native quizzes. `Visible to students` controls discovery independently of scheduling. `Publish marks` controls release of saved scores. Draft/cancelled activities stay unavailable to students.
- **Teacher → Course Outlines** creates/edits outlines against an assigned contract, adds dated lessons, uploads/downloads PDF or DOCX documents, publishes outlines, and completes/reverses lessons. Admins monitor outlines and missed topics. Students see only published outlines for their enrolled course/year/batch.
- **Teacher → My Profile** uploads, previews, replaces, or removes a persistent PNG/JPEG/WebP picture (maximum 2 MB). The picture appears on the dashboard and in Admin → Teacher Management → View.
- **Teacher Dashboard** shows contract balance, makeup class indicators, and upcoming activities from assigned courses. Completing a lesson or makeup class counts the actual Nairobi teaching date once per contract. Reversals recalculate the balance without approval.
- **Student Dashboard / Exams** displays assessment progress and course marks with the teacher/attendance breakdown. Relevant makeup classes and published outlines have their own pages.

## Calculation and data policy

- New assessment allocations are capped at **90** per course/year/batch, across exams and quizzes together. Assessments without a batch apply to every batch in that academic year. Writes are serialized on the course to protect concurrent allocations.
- Attendance marks are `present / eligible recorded sessions × 10`. A calendar day counts once per student/course; latest saved status wins. `late` is eligible but is not `present`; `excused` is excluded. Attendance before enrollment is excluded from course marks. No recorded eligible sessions means zero attendance marks and an incomplete final result.
- Final course marks are teacher marks (maximum 90) plus attendance marks (maximum 10). Teacher APIs cannot create/edit attendance. Authorized teachers can view their own students' attendance contribution in performance reports.
- Existing assessment allocations above 90 are proportionally normalized to 90 for course totals, with a visible legacy note. Original assessment maximums and student scores are **not rewritten**. New or changed allocations must comply with 90. Visibility/title edits remain possible on legacy assessments.
- Existing assessments without explicit visibility/publication flags remain hidden until staff enable them. Stored scores are preserved. Upcoming visibility alone does not release marks.
- Dropping/removing a student preserves their profile, attendance, grades, and enrollments, timestamps the removal, and archives active enrollments. Existing inactive records can be reported; unknown historical removal dates remain blank. Permanently deleted records are not reconstructed.
- Existing records without a batch are retained. New batch selections must belong to the selected academic year. No historical batch assignment is invented. The enrollment index migration adds batch to the existing uniqueness constraint without changing enrollment records.
- Remaining contract days are `total days − distinct completed teaching dates`, never negative. Duplicate clicks and multiple lessons on one date do not duplicate deductions. Makeup classes reuse the original lesson rather than creating a second completion.
- Outline uploads are stored privately in MongoDB (maximum 5 MB). Downloads enforce the same authorization as outline reads. Image uploads check content signatures as well as accepted types.

## Main implementation files

- Models: `backend/models/Batch.js`, `CourseOutline.js`, `MakeupClass.js`, and extensions to Student, Enrollment, Teacher, Exam, Quiz, and TeachingLesson.
- APIs/services: `backend/routes/academyRoutes.js`, `backend/services/academicProgressService.js`, `academyReportService.js`, `batchService.js`, and existing gradebook, portal, dashboard, enrollment, attendance, and authorization integrations.
- UI: `frontend/src/components/AcademyWorkspace.jsx`, `AcademyWorkspace.css`, DashboardLayout, student management/template, teacher assessments/profile/dashboard, student dashboards, and marks/performance breakdowns.
- Migration: `backend/scripts/migrateBatchIndex.js` (`npm run migrate:batches --prefix backend`). It was applied to the local database; no enrollment documents were changed.

## Verification

- Backend regression suite: `npm test --prefix backend`.
- Calculation tests: `backend/tests/academicProgress.test.js`.
- Isolated MongoDB workflows for Admin, Teacher, and Student: `npm run test:academy:integration --prefix backend`.
- Existing gradebook integration, adapted for 90+10: `npm run test:performance:integration --prefix backend`.
- Contract idempotency/concurrency/reversals: `npm run test:contracts:integration --prefix backend`.
- Frontend refresh behavior: `npm run test:refresh --prefix frontend`.
- Production frontend build and browser checks of Reports Center and actual PDF/Excel downloads.

The academy and performance integration tests create separate uniquely named test databases and clean only their test records. Production accounts and academic records are not used as test fixtures.
