const { assessmentReadScope, authorizeCourse } = require('../services/gradebookIntegrityService');
const Exam = require('../models/Exam');
const CourseTeacher = require('../models/CourseTeacher');
const Teacher = require('../models/Teacher');
require('../models/Course');
require('../models/User');
const { createResourceController } = require('./resourceController');

const validateTeacherCourse = async (req, courseId) => {
  if (req.user && req.user.role === 'teacher' && courseId) {
    const teacher = await Teacher.findOne({ user: req.user._id });
    if (teacher) {
      const isAssigned = await CourseTeacher.exists({
        teacher: teacher._id,
        course: courseId,
        status: 'active',
      });
      if (!isAssigned) {
        const err = new Error('You can only create assessments for courses assigned to you');
        err.statusCode = 403;
        throw err;
      }
    }
  }
};

const controller = createResourceController(Exam, {
  scopeFilter: assessmentReadScope,
  authorizeRead: (req, record) => authorizeCourse(req, record.course?._id || record.course),
  fields: [
    'title',
    'batch',
    'visibleToStudents',
    'marksPublished',
    'examCode',
    'course',
    'type',
    'totalMarks',
    'passingMarks',
    'weightage',
    'examDate',
    'startTime',
    'durationMinutes',
    'room',
    'academicYear',
    'semester',
    'status',
  ],
  filterFields: ['course', 'type', 'academicYear', 'semester', 'status'],
  populate: [
    { path: 'course', select: 'courseCode title name' },
    { path: 'createdBy', select: 'name email role' },
  ],
  sortFields: ['createdAt', 'updatedAt', 'examDate', 'examCode'],
  beforeCreate: async (req) => {
    const extra = { createdBy: req.user && req.user._id };
    if (!req.body.durationMinutes && req.body.duration !== undefined) {
      extra.durationMinutes = Number(req.body.duration);
    }
    if (!req.body.examDate && req.body.date !== undefined) {
      extra.examDate = new Date(req.body.date);
    }
    const courseId = req.body.course && typeof req.body.course === 'object' ? req.body.course._id : req.body.course;
    if (courseId) {
      extra.course = courseId;
      const course=await require('../models/Course').findById(courseId);
      if(!req.body.academicYear)extra.academicYear=course?.academicYear||String(new Date().getFullYear());
      if(!req.body.semester)extra.semester=course?.semester||'';
    }
    await validateTeacherCourse(req, courseId);
    return extra;
  },
  beforeUpdate: async (req) => {
    const extra = {};
    if (!req.body.durationMinutes && req.body.duration !== undefined) {
      extra.durationMinutes = Number(req.body.duration);
    }
    if (!req.body.examDate && req.body.date !== undefined) {
      extra.examDate = new Date(req.body.date);
    }
    const courseId = req.body.course && typeof req.body.course === 'object' ? req.body.course._id : req.body.course;
    if (courseId) {
      extra.course = courseId;
    }
    await validateTeacherCourse(req, courseId);
    return extra;
  },
});

const { assessmentWrites } = require('../services/gradebookIntegrityService');
module.exports = {
  listExams: controller.list,
  getExamById: controller.getById,
  createExam: assessmentWrites(Exam, controller.create, 'create'),
  updateExam: assessmentWrites(Exam, controller.update, 'update'),
  deleteExam: assessmentWrites(Exam, controller.remove, 'remove'),
};
