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
    if (!req.body.durationMinutes && req.body.duration) {
      extra.durationMinutes = Number(req.body.duration);
    }
    if (!req.body.examDate && req.body.date) {
      extra.examDate = new Date(req.body.date);
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
