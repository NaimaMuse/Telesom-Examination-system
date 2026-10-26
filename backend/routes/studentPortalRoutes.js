const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { asyncHandler } = require('../controllers/resourceController');
const Student = require('../models/Student');
const Enrollment = require('../models/Enrollment');
const CourseTeacher = require('../models/CourseTeacher');
const Exam = require('../models/Exam');
const ExamResult = require('../models/ExamResult');
const Quiz = require('../models/Quiz');
const QuizResult = require('../models/QuizResult');
const Attendance = require('../models/Attendance');
const Note = require('../models/Note');
const { gradeFor } = require('../services/gradebookIntegrityService');
const router = express.Router();
const date = value => value ? new Date(value).toISOString().slice(0, 10) : '';
const courseLabel = course => course?.courseCode || course?.title || course?.name || 'Unavailable course';
router.use(protect, authorizeRoles('student'));
router.use(asyncHandler(async (req, res, next) => {
  req.student = await Student.findOne({ user: req.user._id });
  if (!req.student) { res.status(404); throw new Error('Student profile not found'); }
  next();
}));
router.get('/courses', asyncHandler(async (req, res) => {
  const enrollments = await Enrollment.find({ student: req.student._id, status: 'enrolled' }).populate('course').lean();
  const assignments = await CourseTeacher.find({ course: { $in: enrollments.map(e => e.course?._id).filter(Boolean) }, status: 'active' }).populate({ path: 'teacher', populate: { path: 'user', select: 'name' } }).lean();
  const courses = enrollments.filter(e => e.course).map(e => ({ ...e.course, code: e.course.courseCode, name: e.course.title || e.course.name, semester: e.semester || e.course.semester, teacher: assignments.filter(a => String(a.course) === String(e.course._id) && a.academicYear === e.academicYear && (!a.semester || !e.semester || a.semester === e.semester)).map(a => a.teacher?.user?.name).filter(Boolean).join(', ') || 'Not assigned', schedule: 'Not scheduled' }));
  res.json({ courses });
}));
async function enrolledScopes(student) {
  const rows = await Enrollment.find({ student, status: 'enrolled' }).lean();
  return rows.map(e => ({ course: e.course, academicYear: e.academicYear, ...(e.semester ? { semester: e.semester } : {}) }));
}
router.get('/exams/upcoming', asyncHandler(async (req, res) => {
  const scopes = await enrolledScopes(req.student._id);
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const exams = scopes.length ? await Exam.find({ $or: scopes, status: { $in: ['scheduled', 'upcoming', 'ongoing'] }, examDate: { $gte: today } }).populate('course').sort({ examDate: 1 }).lean() : [];
  const quizzes = scopes.length ? await Quiz.find({ $or: scopes, status: 'published', quizDate: { $gte: today } }).populate('course').lean() : [];
  res.json({ exams: [...exams.map(e => ({ ...e, date: date(e.examDate), course: courseLabel(e.course) })), ...quizzes.map(q => ({ ...q, _id: 'quiz-' + q._id, type: 'quiz', date: date(q.quizDate), course: courseLabel(q.course) }))].sort((a,b) => a.date.localeCompare(b.date)) });
}));
router.get('/results', asyncHandler(async (req, res) => {
  const rows = await ExamResult.find({ student: req.student._id }).populate({ path: 'exam', populate: { path: 'course' } }).sort({ createdAt: -1 }).lean();
  res.json({ results: rows.filter(r => r.exam && r.exam.status !== 'cancelled' && r.exam.totalMarks > 0 && Number.isFinite(r.marksObtained) && r.marksObtained >= 0 && r.marksObtained <= r.exam.totalMarks).map(r => ({ _id: r._id, course: courseLabel(r.exam.course), exam: r.exam.title, date: date(r.exam.examDate), marks: r.marksObtained, totalMarks: r.exam.totalMarks, grade: gradeFor(r.marksObtained / r.exam.totalMarks * 100), isPassed: r.marksObtained >= r.exam.passingMarks, status: 'published' })) });
}));
router.get('/quizzes', asyncHandler(async (req, res) => {
  const scopes = await enrolledScopes(req.student._id);
  const rows = await QuizResult.find({ student: req.student._id }).populate({ path: 'quiz', populate: { path: 'course' } }).lean();
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const scheduled = scopes.length ? await Quiz.find({ $or: scopes, status: 'published', quizDate: { $gte: today } }).populate('course').lean() : [];
  const graded = rows.filter(r => r.quiz && !['draft', 'cancelled'].includes(r.quiz.status) && r.quiz.totalMarks > 0 && Number.isFinite(r.marksObtained) && r.marksObtained >= 0 && r.marksObtained <= r.quiz.totalMarks).map(r => ({ _id: r._id, assessmentId: String(r.quiz._id), course: courseLabel(r.quiz.course), quiz: r.quiz.title, date: date(r.quiz.quizDate), marks: r.marksObtained, totalMarks: r.quiz.totalMarks, grade: gradeFor(r.marksObtained / r.quiz.totalMarks * 100), status: 'graded' }));
  const examRows = await ExamResult.find({ student: req.student._id }).populate({ path: 'exam', match: { type: 'quiz', status: { $ne: 'cancelled' } }, populate: { path: 'course' } }).lean();
  const examQuizzes = scopes.length ? await Exam.find({ $or: scopes, type: 'quiz', status: { $in: ['scheduled', 'upcoming', 'ongoing'] }, examDate: { $gte: today } }).populate('course').lean() : [];
  const examGraded = examRows.filter(r => r.exam && r.exam.totalMarks > 0 && Number.isFinite(r.marksObtained) && r.marksObtained >= 0 && r.marksObtained <= r.exam.totalMarks).map(r => ({ _id: 'exam-' + r._id, assessmentId: String(r.exam._id), course: courseLabel(r.exam.course), quiz: r.exam.title, date: date(r.exam.examDate), marks: r.marksObtained, totalMarks: r.exam.totalMarks, grade: gradeFor(r.marksObtained / r.exam.totalMarks * 100), status: 'graded' }));
  res.json({ quizzes: [...graded, ...examGraded, ...examQuizzes.filter(q => !examGraded.some(r => r.assessmentId === String(q._id))).map(q => ({ _id: 'exam-' + q._id, course: courseLabel(q.course), quiz: q.title, date: date(q.examDate), totalMarks: q.totalMarks, status: 'upcoming' })), ...scheduled.filter(q => !graded.some(r => r.assessmentId === String(q._id))).map(q => ({ _id: q._id, course: courseLabel(q.course), quiz: q.title, date: date(q.quizDate), totalMarks: q.totalMarks, status: 'upcoming' }))] });
}));
router.get('/attendance', asyncHandler(async (req, res) => {
  const rows = await Attendance.find({ student: req.student._id }).populate('course').sort({ date: -1 }).lean();
  res.json({ attendance: rows.map(r => ({ ...r, course: courseLabel(r.course), date: date(r.date) })) });
}));
router.get('/attendance/summary', asyncHandler(async (req, res) => {
  const rows = await Attendance.find({ student: req.student._id }).lean();
  res.json({ total: rows.length, present: rows.filter(r => r.status === 'present').length });
}));
router.get('/notes', asyncHandler(async (req, res) => {
  // Notes are private staff records unless explicitly addressed to this student.
  const rows = await Note.find({ student: req.student._id }).populate('course').populate('createdBy', 'name').sort({ updatedAt: -1 }).lean();
  res.json({ notes: rows.map(n => ({ ...n, course: courseLabel(n.course), teacher: n.createdBy?.name || 'Staff', uploadedAt: date(n.updatedAt) })) });
}));
const { pick } = require('../controllers/resourceController');
const User = require('../models/User');
router.put('/profile', asyncHandler(async (req, res) => {
  const updates = pick(req.body, ['name', 'email']);
  if (updates.email) updates.email = String(updates.email).trim().toLowerCase();
  const user = await User.findById(req.user._id);
  user.set(updates);
  req.student.set(pick(req.body, ['phone', 'address']));
  await Promise.all([user.validate(), req.student.validate()]);
  await user.save();
  await req.student.save();
  res.json({ user, profile: req.student });
}));

module.exports = router;
