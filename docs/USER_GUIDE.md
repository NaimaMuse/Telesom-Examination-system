# Telesom Academy Examination System User Guide

This guide explains how administrators, teachers, judges, and students use the academy portal. Use the role table to find your starting point or follow the Project Defense workflow from form preparation through publication of exam results.

## Sign in

1. Select **Login** on the academy website or open `/login`.
2. Enter your registered email and password, then select **Sign in**. The portal opens the dashboard for your account role.
3. On your first visit as a student, use the Google button with the email address registered by the academy. Follow the prompt to set a portal password.
4. Select **Sign Out** when you finish.

Students can reset a password using their registered Google account at `/student/forgot-password`. Teachers and judges should contact the academy administrator for password help. Administrators should contact the system operator.

## Find your workspace

| Role | Common tasks | Where to start |
| --- | --- | --- |
| **Admin** | Manage accounts, courses, cohorts, assessments, marks, attendance, reports, and certificates. | **Students**, **Teacher Management**, **Judges**, **Course Management**, **Exam & Quiz Mgmt**, **Marks & Results** |
| **Teacher** | View assigned courses and students, prepare assessments, manage marks, and create Project Defense forms and groups. | **My Course**, **Exams & Quizzes**, **Results & Marks**, **Project Defense** |
| **Judge** | Open assigned groups, rate questions, add comments, and submit evaluations. | **Assigned Evaluations** |
| **Student** | View assessments, published results, attendance, and available certificates. Complete assigned feedback forms. | `/student/assessments`, `/student/results`, `/student/attendance`, `/student/evaluations` |

## Project Defense

Several groups in the same exam can use one approved evaluation form. Each group has its own members, evaluators, and result.

### 1. Prepare and approve an evaluation form

1. As a teacher or administrator, open **Project Defense**, select the exam, and choose **New form**.
2. Enter the **Form Title**. For each section, enter its title and **Maximum Marks**, then add the questions.
3. Check **Allocated Marks**. The section maximums must add up to the exam maximum. A 50-mark exam could have two sections worth 20 and 30 marks.
4. Select **Preview Form** to review the questions. Select **Save Draft** to keep your progress.
5. Select a **Reviewer**, then select **Send to Admin** or **Send to Teacher**. The reviewer opens the same form from their notification and selects **Approve Form** when it is ready to use.

### 2. Create a group and assign evaluators

1. With the same exam selected, choose **New group** and enter the group name and project title.
2. Select an **Approved evaluation form** for that exam.
3. Select enrolled students and one or more evaluators. Teachers and administrators can evaluate groups assigned to them. A student can belong to one defense group per exam.
4. Select **Save Group** to save and view the confirmation, or **Create Group** to save and open the group immediately.
5. Use **Edit evaluators** to change assignments before an evaluator saves or submits an evaluation.

### 3. Rate the questions and submit

1. Open the group from **My Evaluator Assignments**. Judges start in **Assigned Evaluations**.
2. Give each question **1 to 5 stars**. You can add comments for each section.
3. The portal converts the average star rating to section marks. For a section worth 20 marks, two ratings of 4 and 5 stars give **18/20**.
4. Select **Save Draft** to continue later. Once every question has a rating, select **Submit Evaluation**.

### 4. Finalize and publish results

1. As an administrator, open a group marked **Ready to finalize**. If the group is **Awaiting evaluators**, check **Evaluator submissions** to see whose submission is outstanding.
2. Review each evaluator's total and the group average. If two evaluators award 42 and 48 marks on a 50-mark exam, the group average is **45/50**.
3. Select **Review Finalization**. If a student already has a result for the exam, compare **Existing mark** and **New mark** before confirming the replacement.
4. Select **Finalize and Save Results**. The portal records the group average as each member's result for the selected exam.
5. To make the result visible to students, enable exam visibility and publish the marks. Students can then find the published result in **Results**.

## Course feedback forms

Under **Course Feedback Forms**, an administrator prepares questions, assigns students, and publishes the form. Assigned students open it in **Evaluations**, where they can save progress or submit their answers. Administrators can review responses, outstanding submissions, and completion counts.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| Google sign-in fails | Use the Google account registered with the academy. |
| An exam is missing from the selector | Check that the exam is available and that your account has access to it. Teachers should confirm the course assignment. |
| **No approved forms available** | Confirm that an approved form belongs to the selected exam and its allocated marks match that exam's current maximum. |
| A student is missing from the group picker | Check the student's enrollment, the exam cohort, and whether the student already belongs to another group for that exam. |
| **Submit Evaluation** is disabled | Give every question a star rating. |
| A group is **Awaiting evaluators** | Check **Evaluator submissions** for the outstanding evaluator. |
| A student cannot see a result | Confirm that the group was finalized, the exam is visible to students, and marks have been published. |

For installation, deployment, and maintenance, see the [Technical and Setup Guide](TECHNICAL_GUIDE.md).
