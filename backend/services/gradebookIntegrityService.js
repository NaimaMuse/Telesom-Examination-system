const mongoose = require('mongoose');
const { syncAssessmentCompletion } = require('./assessmentCompletionService');
const Course = require('../models/Course');
const Teacher = require('../models/Teacher');
const CourseTeacher = require('../models/CourseTeacher');
const Enrollment = require('../models/Enrollment');
const Exam = require('../models/Exam');
const Quiz = require('../models/Quiz');
const ExamResult = require('../models/ExamResult');
const QuizResult = require('../models/QuizResult');
const { asyncHandler } = require('../controllers/resourceController');
const fail = (message, statusCode = 400) => { throw Object.assign(new Error(message), { statusCode }); };
const round = value => Math.round((value + Number.EPSILON) * 100) / 100;
const gradeFor = percentage => percentage >= 90 ? 'A' : percentage >= 80 ? 'B' : percentage >= 70 ? 'C' : percentage >= 60 ? 'D' : 'F';
const authorizeCourse = async (req, course) => {
  if (req.user?.role === 'admin') return;
  if (req.user?.role !== 'teacher') fail('Teacher access is required.', 403);
  const teacher = await Teacher.findOne({ user: req.user._id });
  if (!teacher || !await CourseTeacher.exists({ teacher: teacher._id, course, status: 'active' })) fail('This course is not assigned to you.', 403);
};
// A shared course lock serializes allocations and marks on standalone MongoDB too.
const withCourseLock = async (course, work) => {
  const token = new mongoose.Types.ObjectId().toString(), deadline = Date.now() + 15000;
  while (!await Course.findOneAndUpdate({ _id: course, $or: [{ 'performanceWriteLock.token': { $exists: false } }, { 'performanceWriteLock.expiresAt': { $lt: new Date() } }] }, { $set: { performanceWriteLock: { token, expiresAt: new Date(Date.now() + 120000) } } })) {
    if (!await Course.exists({ _id: course })) fail('Course not found.', 404);
    if (Date.now() > deadline) fail('Course marks are being updated. Please retry.', 409);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const timer = setInterval(() => { Course.updateOne({ _id: course, 'performanceWriteLock.token': token }, { $set: { 'performanceWriteLock.expiresAt': new Date(Date.now() + 120000) } }).catch(() => {}); }, 20000);
  try { return await work(); }
  finally { clearInterval(timer); await Course.updateOne({ _id: course, 'performanceWriteLock.token': token }, { $unset: { performanceWriteLock: '' } }); }
};
const capture = async (handler, req) => {
  let status = 200, body;
  const response = { status(code) { status = code; return this; }, json(value) { body = value; return this; } };
  await handler(req, response, error => { throw error; });
  return { status, body };
};
const assessmentWrites = (Model, handler, action) => asyncHandler(async (req, res) => {
  const original = action === 'create' ? null : await Model.findById(req.params.id);
  if (action !== 'create' && !original) fail('Assessment not found.', 404);
  const course = original?.course || req.body.course?._id || req.body.course;
  if (!mongoose.isValidObjectId(course)) fail('A valid course is required.');
  await authorizeCourse(req, course);
  const reply = await withCourseLock(course, async () => {
    const existing = original ? await Model.findById(original._id) : null;
    if (original && !existing) fail('Assessment not found.', 404);
    const type = Model.modelName === 'Exam' ? 'exam' : 'quiz', Result = type === 'exam' ? ExamResult : QuizResult;
    if (existing && req.body.course && String(req.body.course?._id || req.body.course) !== String(course)) fail('Assessments cannot be moved between courses.');
    if (action !== 'remove') {
      const total = Number(req.body.totalMarks ?? existing?.totalMarks ?? Model.schema.path('totalMarks').defaultValue);
      if (!Number.isFinite(total) || total <= 0 || total > 100 || Math.abs(total * 100 - Math.round(total * 100)) > 1e-7) fail('Assessment maximum must be between 0.01 and 100, with at most two decimals.');
      const rows = [...await Exam.find({ course }).lean(), ...await Quiz.find({ course }).lean()];
      const other = rows.filter(row => !(existing && String(row._id) === String(existing._id)) && row.status !== 'cancelled').reduce((sum, row) => sum + row.totalMarks, 0);
      if ((req.body.status ?? existing?.status) !== 'cancelled' && round(other + total) > 100) fail(`Course allocations cannot exceed 100 marks. Available: ${round(100 - other)}.`);
      if (existing && await Result.exists({ [type]: existing._id, marksObtained: { $gt: total } })) fail('Maximum marks cannot be lower than an existing student score.');
      if (req.body.passingMarks == null) {
        const previousMaximum = existing?.totalMarks;
        const previousPass = existing?.passingMarks;
        const ratio = previousMaximum > 0 && Number.isFinite(previousPass) && previousPass >= 0 && previousPass <= previousMaximum ? previousPass / previousMaximum : 0.5;
        req.body.passingMarks = round(ratio * total);
      }
      const pass = Number(req.body.passingMarks);
      if (!Number.isFinite(pass) || pass < 0 || pass > total) fail('Passing marks must be within the assessment maximum.');
    }
    const result = await capture(handler, req);
    if (result.status < 400 && existing) {
      if (action === 'remove') await Result.deleteMany({ [type]: existing._id });
      else {
        const updated = await Model.findById(existing._id);
        if (updated.totalMarks !== existing.totalMarks || updated.passingMarks !== existing.passingMarks) {
          const scores = await Result.find({ [type]: existing._id }).lean();
          if (scores.length) await Result.bulkWrite(scores.map(score => {
            const percentage = round(score.marksObtained / updated.totalMarks * 100);
            return { updateOne: { filter: { _id: score._id }, update: { $set: { percentage, isPassed: score.marksObtained >= updated.passingMarks, ...(type === 'exam' ? { grade: gradeFor(percentage) } : {}) } } } };
          }));
        }
      }
    }
    return result;
  });
  res.status(reply.status).json(reply.body);
});
const resultWrite = (type, handler, action = 'save') => asyncHandler(async (req, res) => {
  const Assessment = type === 'exam' ? Exam : Quiz, Result = type === 'exam' ? ExamResult : QuizResult;
  const existing = req.params.id ? await Result.findById(req.params.id) : null;
  if (req.params.id && !existing) fail('Result not found.', 404);
  if (existing && req.body[type] && String(req.body[type]) !== String(existing[type])) fail('A saved result cannot be moved to another assessment.');
  const assessmentId = req.params.assessmentId || req.body[type] || existing?.[type];
  const assessment = await Assessment.findById(assessmentId);
  if (!assessment) fail('Assessment not found.', 404);
  await authorizeCourse(req, assessment.course);
  const reply = await withCourseLock(assessment.course, async () => {
    const current = await Assessment.findById(assessmentId);
    if (!current || current.status === 'cancelled') fail('Assessment is unavailable.', 404);
    if (!req.params.assessmentId) {
      const student = req.body.student || existing?.student;
      if (!await Enrollment.exists({ student, course: current.course, status: 'enrolled' })) fail('Student is not enrolled in the assessment course.', 403);
      if (existing && req.body.student && String(req.body.student) !== String(existing.student)) fail('A saved result cannot be moved to another student.');
    }
    const result = await capture(handler, req);
    if (result.status < 400) await syncAssessmentCompletion(Assessment, current, type);
    return result;
  });
  res.status(reply.status).json(reply.body);
});
const bulkResultWrite = handler => asyncHandler(async (req, res, next) => {
  if (!['exam', 'quiz'].includes(req.params.assessmentType)) fail('Invalid assessment type.');
  return resultWrite(req.params.assessmentType, handler)(req, res, next);
});
module.exports = { assessmentWrites, resultWrite, bulkResultWrite, authorizeCourse, gradeFor, round };
const resultRead = (type, handler, detail = false) => asyncHandler(async (req, res, next) => {
  if (req.user.role === 'admin') return handler(req, res, next);
  const Assessment = type === 'exam' ? Exam : Quiz, Result = type === 'exam' ? ExamResult : QuizResult;
  if (detail) {
    const result = await Result.findById(req.params.id);
    if (!result) fail('Result not found.', 404);
    const assessment = await Assessment.findById(result[type]);
    if (!assessment) fail('Assessment not found.', 404);
    await authorizeCourse(req, assessment.course);
    if (!await Enrollment.exists({ student: result.student, course: assessment.course, status: 'enrolled' })) fail('Student is not enrolled in your course.', 403);
    return handler(req, res, next);
  }
  const teacher = await Teacher.findOne({ user: req.user._id });
  const assignments = teacher ? await CourseTeacher.find({ teacher: teacher._id, status: 'active' }).lean() : [];
  const courses = assignments.map(a => a.course);
  const assessments = await Assessment.find({ course: { $in: courses }, status: { $ne: 'cancelled' } }).lean();
  const byId = new Map(assessments.map(a => [String(a._id), a]));
  if (req.query[type] && !byId.has(String(req.query[type]))) fail('Assessment is not assigned to you.', 403);
  const enrollments = await Enrollment.find({ course: { $in: courses }, status: 'enrolled' }).lean();
  const allowed = new Set(enrollments.map(e => `${e.student}:${e.course}`));
  const records = await Result.find({ [type]: { $in: assessments.map(a => a._id) } }).populate({ path: 'student', populate: { path: 'user', select: 'name email' } }).populate(type).sort('-updatedAt').lean();
  const data = records.filter(row => row.student && allowed.has(`${row.student._id}:${byId.get(String(row[type]?._id))?.course}`) && (!req.query.student || String(row.student._id) === String(req.query.student)) && (!req.query[type] || String(row[type]?._id) === String(req.query[type])));
  res.json({ success: true, data, pagination: { page: 1, limit: data.length, total: data.length, pages: data.length ? 1 : 0 } });
});
module.exports.resultRead = resultRead;

// Restrict teacher assessment reads even when no course filter is supplied.
module.exports.assessmentReadScope = async req => {
  if (req.user?.role === 'admin') return null;
  if (req.user?.role !== 'teacher') fail('Teacher access is required.', 403);
  const teacher = await Teacher.findOne({ user: req.user._id });
  const assignments = teacher ? await CourseTeacher.find({ teacher: teacher._id, status: 'active' }).select('course').lean() : [];
  return { course: { $in: assignments.map(row => row.course) } };
};

module.exports.withCourseLock = withCourseLock;
