# System database and integration audit

Checked 29 October 2026 (Africa/Nairobi).

## Real database: read-only verification

- 40 active accounts: 1 Admin, 8 Teachers, 31 Students.
- 491 successful authenticated/public read requests out of 491 checked.
- Read APIs checked for every active teacher and student, including each available teacher assessment roster.
- Admin dashboard totals match database counts: 31 students, 8 teachers, 4 courses, 7 assessments.
- All top-level model references checked against their referenced collections; no dangling references found.
- Courses, enrollments, assessments/results, attendance, study materials, outlines/lessons, contracts, makeup classes, reports and profiles use MongoDB-backed APIs. Calculated percentages and totals are derived from those records. No mock business-data fallback was found in active frontend pages.
- Browser storage is used for authentication session caching and notification read preferences; it is not the source for courses, student records, marks or attendance.
- The read-only audit did not change existing accounts, credentials or academic records.

## Existing data requiring attention

- 20 active student profiles have no active enrollment. They correctly do not appear in a course roster until enrolled.
- 6 active enrollments have an academic-year label different from the referenced course. For example, legacy course/exam labels may use `2025-2026` while enrollment labels use `2026`. These are database values, not fabricated UI data. Year-scoped workspaces may therefore differ from the standalone course roster.
- Historical records were not relabelled automatically: the intended academic year must be established before changing existing cohorts.

## Automated verification

Passed:

- Complete backend unit/route/controller/service suite.
- Account lifecycle integration: login, automatic IDs, initial password, change password, role restrictions, session revocation.
- CRUD/import integration: 22 passed, 0 failed; Admin creates accounts/course/enrollment, assigns teacher, teacher creates exam, marks/quiz calculations, attendance CSV import, student dashboard/profile and recoverable deactivation.
- Teacher contract integration: same-day uniqueness, concurrency, reversal, deduction and access restrictions.
- Academy integration: every report category, 90+10 calculation, attendance, outline files, photos, makeup classes and permissions.
- Teacher performance integration: shared gradebook records, recalculation, course/batch filters and allocation limits.
- My Course integration: year/batch isolation, lessons, documents, persistent materials, result save -> performance, and cross-course rejection.
- Frontend auto-refresh tests and production build.

Tests that create or update records run against uniquely named temporary databases, not the application database. The CRUD test runner was updated to launch its own loopback API and isolated database. Old test expectations were aligned with existing Admin-supplied temporary passwords, teacher-only exam creation, 90 teacher marks and dropped-student preservation.

A real regression found by these tests was fixed: standalone Results authorizes assessments by the teacher's assigned course, avoiding rejection solely because legacy academic-year labels differ. Explicit My Course cohort boundaries are retained.

## UI verification

Admin Dashboard was inspected in the browser with actual database totals. Sidebar icons for all three roles, header controls and Admin Dashboard shortcuts now use a consistent SVG icon component. Dashboard changes are presentation-only.

## Scope and repeatability

This verifies database/API integration and representative write workflows. It is not a claim that every possible browser interaction, uploaded file, device size or historical combination was exhaustively tested. PDF analytics export was separately rendered and visually checked during implementation.

Run the read-only database/API audit from the repository root:

    node backend/scripts/auditDatabase.js SYSTEM_DATABASE_AUDIT.json

The JSON result contains counts and API failures, without account names, passwords or access tokens.
