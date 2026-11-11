const express = require('express');
const mongoose = require('mongoose');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { asyncHandler } = require('../controllers/resourceController');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const Student = require('../models/Student');
const Certificate = require('../models/Certificate');
const { certificateYear, renderCertificatePdf } = require('../services/certificatePdf');

const router = express.Router();
const adminOnly = authorizeRoles('admin');
const fail = (statusCode, message) => { throw Object.assign(new Error(message), { statusCode }); };
const requireId = id => {
  if (!mongoose.isObjectIdOrHexString(id)) fail(400, 'Invalid record ID.');
};
const displayText = value => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
const courseTitle = course => course?.title || course?.name || '';
const courseFields = 'title name courseCode durationWeeks teachingSchedule';
const minutesOfDay = time => {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return NaN;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

function totalCreditHours(course) {
  const { durationWeeks, teachingSchedule } = course;
  if (!Number.isSafeInteger(durationWeeks) || durationWeeks < 1 || !teachingSchedule?.length) return null;
  let weeklyMinutes = 0;
  const days = new Set();
  for (const slot of teachingSchedule) {
    const minutes = minutesOfDay(slot.endTime) - minutesOfDay(slot.startTime);
    if (!(minutes > 0) || days.has(slot.day)) return null;
    days.add(slot.day);
    weeklyMinutes += minutes;
  }
  return Math.round((weeklyMinutes * durationWeeks / 60) * 100) / 100;
}

router.use(protect, authorizeRoles('admin', 'student'));

router.get('/courses', adminOnly, asyncHandler(async (req, res) => {
  const courses = await Course.find().select(courseFields).sort('title name courseCode').lean();
  res.json({ data: courses.map(course => ({
    _id: course._id, title: courseTitle(course), code: course.courseCode, creditHours: totalCreditHours(course),
  })) });
}));

router.get('/courses/:id/students', adminOnly, asyncHandler(async (req, res) => {
  requireId(req.params.id);
  const rows = await Enrollment.find({
    course: req.params.id, status: { $in: ['enrolled', 'completed'] },
  }).select('student status academicYear batch').populate({
    path: 'student', select: 'studentId user', populate: { path: 'user', select: 'name' },
  }).lean();
  const certificates = await Certificate.find({ enrollment: { $in: rows.map(row => row._id) } })
    .select('enrollment certificateNo').lean();
  const issued = new Map(certificates.map(row => [String(row.enrollment), row]));
  res.json({
    success: true,
    data: rows.filter(row => row.student?.user).map(row => ({
      _id: row._id, status: row.status, academicYear: row.academicYear, cohort: row.batch,
      studentName: row.student.user.name, studentId: row.student.studentId,
      certificate: issued.get(String(row._id)),
    })).sort((a, b) => a.studentName.localeCompare(b.studentName) || a.studentId.localeCompare(b.studentId)),
  });
}));

router.patch('/enrollments/:id/complete', adminOnly, asyncHandler(async (req, res) => {
  requireId(req.params.id);
  const row = await Enrollment.findOneAndUpdate(
    { _id: req.params.id, status: 'enrolled' }, { $set: { status: 'completed' } }, { new: true }
  ).select('_id status');
  if (!row) fail(409, 'Only an enrolled course can be marked completed.');
  res.json({ success: true, data: row });
}));

async function readFilter(req) {
  if (req.user.role === 'admin') return {};
  const student = await Student.findOne({ user: req.user._id }).select('_id').lean();
  return { student: student?._id ?? null };
}

router.get('/', asyncHandler(async (req, res) => {
  const filter = await readFilter(req);
  const page = Math.max(1, Math.min(100000, parseInt(req.query.page, 10) || 1));
  const limit = 25;
  const [data, count] = await Promise.all([
    Certificate.find(filter).sort({ awardedAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Certificate.countDocuments(filter),
  ]);
  res.json({ success: true, data, page, pages: Math.max(1, Math.ceil(count / limit)) });
}));

router.post('/', adminOnly, asyncHandler(async (req, res) => {
  const { enrollmentId, suffix } = req.body;
  requireId(enrollmentId);
  if (typeof suffix !== 'string' || !/^\d{1,16}$/.test(suffix)) {
    fail(400, 'Enter a certificate number suffix with 1–16 digits.');
  }
  const enrollment = await Enrollment.findById(enrollmentId)
    .populate('course', courseFields)
    .populate({ path: 'student', select: 'user', populate: { path: 'user', select: 'name' } }).lean();
  if (!enrollment) fail(404, 'Enrollment not found.');
  if (enrollment.status !== 'completed') fail(409, 'The course must be completed before issuing a certificate.');
  if (!enrollment.student?.user || !enrollment.course) fail(409, 'The student and course records are required.');
  const studentName = displayText(req.body.studentName ?? enrollment.student.user.name);
  const title = displayText(req.body.courseTitle ?? courseTitle(enrollment.course));
  if (!studentName || studentName.length > 120 || !title || title.length > 160) {
    fail(400, 'Enter a student name and a course title within the character limits.');
  }
  const creditHours = totalCreditHours(enrollment.course);
  if (!creditHours) fail(409, 'Set the course duration and weekly teaching schedule before issuing.');
  const awardedAt = new Date();
  const certificateNo = `TA: ${certificateYear(awardedAt)}-${suffix}`;
  try {
    const certificate = await Certificate.create({
      enrollment: enrollment._id, student: enrollment.student._id, issuedBy: req.user._id,
      studentName, courseTitle: title, creditHours, awardedAt, certificateNo,
    });
    const { issuedBy, ...data } = certificate.toObject();
    res.status(201).json({ success: true, data });
  } catch (error) {
    if (error.code !== 11000) throw error;
    fail(409, error.keyPattern?.enrollment
      ? 'A certificate has already been issued for this enrollment.'
      : 'This certificate number is already in use.');
  }
}));

router.get('/:id/pdf', asyncHandler(async (req, res) => {
  requireId(req.params.id);
  const certificate = await Certificate.findOne({ _id: req.params.id, ...await readFilter(req) }).lean();
  if (!certificate) fail(404, 'Certificate not found.');
  const pdf = await renderCertificatePdf(certificate);
  const filename = certificate.certificateNo.replace(/^TA: /, 'TA-');
  res.set({
    'Content-Disposition': `inline; filename="${filename}.pdf"`,
    'Cache-Control': 'private, no-store',
  }).type('application/pdf').send(pdf);
}));

module.exports = router;
