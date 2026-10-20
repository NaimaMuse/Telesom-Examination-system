const Exam = require('../models/Exam');
require('../models/Course');
require('../models/User');
const { createResourceController } = require('./resourceController');

const controller = createResourceController(Exam, {
  fields: [
    'title',
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
  beforeCreate: (req) => {
    const extra = { createdBy: req.user && req.user._id };
    if (!req.body.durationMinutes && req.body.duration !== undefined) {
      extra.durationMinutes = Number(req.body.duration);
    }
    if (!req.body.examDate && req.body.date !== undefined) {
      extra.examDate = new Date(req.body.date);
    }
    if (req.body.course && typeof req.body.course === 'object' && req.body.course._id) {
      extra.course = req.body.course._id;
    }
    return extra;
  },
  beforeUpdate: (req) => {
    const extra = {};
    if (!req.body.durationMinutes && req.body.duration !== undefined) {
      extra.durationMinutes = Number(req.body.duration);
    }
    if (!req.body.examDate && req.body.date !== undefined) {
      extra.examDate = new Date(req.body.date);
    }
    if (req.body.course && typeof req.body.course === 'object' && req.body.course._id) {
      extra.course = req.body.course._id;
    }
    return extra;
  },
});

module.exports = {
  listExams: controller.list,
  getExamById: controller.getById,
  createExam: controller.create,
  updateExam: controller.update,
  deleteExam: controller.remove,
};
