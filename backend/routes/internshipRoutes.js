const express = require('express');
const { isObjectIdOrHexString } = require('mongoose');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Internship = require('../models/Internship');
const Student = require('../models/Student');
const { asyncHandler, createResourceController } = require('../controllers/resourceController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { calendarEnd, validDate } = require('../services/teacherContractService');

const fail = (message, statusCode = 400) => { throw Object.assign(new Error(message), {statusCode}); };
const studentName = student => student.user?.name || student.studentId;
const courseName = course => course.title || course.name || course.courseCode;
const enrolledIn = course => ({course, status:'enrolled'});

async function internshipDetails(req, record) {
  const {courseId, studentId, startDate, totalDays, attendanceSchedule, monthlyStipendCents} = req.body;
  if (monthlyStipendCents !== undefined && (!Number.isSafeInteger(monthlyStipendCents) || monthlyStipendCents < 0)) {
    fail('Enter a valid monthly stipend.');
  }
  const endDate = calendarEnd(startDate,totalDays);
  if (!validDate(endDate)) fail('The calculated end date is outside the supported range.');
  if (!Array.isArray(attendanceSchedule) || attendanceSchedule.length < 1 || attendanceSchedule.length > 7) {
    fail('Select at least one attendance day.');
  }
  const details = {startDate, totalDays, attendanceSchedule, monthlyStipendCents, endDate};
  if (record && (courseId || '') === (record.course?.toString() || '') &&
      (studentId || '') === (record.student?.toString() || '')) return details;
  if (!isObjectIdOrHexString(courseId) || !isObjectIdOrHexString(studentId)) fail('Select a course and student.');
  const [course, student, enrolled] = await Promise.all([
    Course.findById(courseId).select('title name courseCode').lean(),
    Student.findById(studentId).select('user studentId').populate('user','name').lean(),
    Enrollment.exists({...enrolledIn(courseId), student:studentId}),
  ]);
  if (!course || !student || !enrolled) fail('Select a student enrolled in this course.');
  return {...details, student:student._id, course:course._id, studentName:studentName(student), courseName:courseName(course)};
}

const { list, create, remove } = createResourceController(Internship, {
  fields: [],
  beforeCreate: internshipDetails,
});

const router = express.Router();
router.use(protect, authorizeRoles('admin'));
router.route('/').get(list).post(create);
router.route('/:id').put(asyncHandler(async (req, res) => {
  if (!isObjectIdOrHexString(req.params.id)) fail('Invalid internship ID.');
  const record = await Internship.findById(req.params.id);
  if (!record) fail('Internship not found.', 404);
  record.set(await internshipDetails(req, record));
  await record.save();
  res.json({success:true, data:record});
})).delete(remove);
router.get('/courses', asyncHandler(async (_req,res) => {
  const courses = await Course.find().select('title name courseCode').sort({title:1,_id:1}).lean();
  res.json({courses:courses.map(course => ({_id:course._id, name:courseName(course), code:course.courseCode}))});
}));
router.get('/courses/:courseId/students', asyncHandler(async (req,res) => {
  const {courseId} = req.params;
  if (!isObjectIdOrHexString(courseId)) fail('Select a valid course.');
  if (!await Course.exists({_id:courseId})) fail('Course not found.',404);
  const ids = await Enrollment.distinct('student',enrolledIn(courseId));
  const students = await Student.find({_id:{$in:ids}}).select('user studentId').populate('user','name').lean();
  const options = students.map(student => ({_id:student._id, name:studentName(student), code:student.studentId}));
  options.sort((a,b) => a.name.localeCompare(b.name) || a.code.localeCompare(b.code));
  res.json({students:options});
}));

module.exports = router;
