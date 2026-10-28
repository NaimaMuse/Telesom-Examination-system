const { assessmentReadScope, authorizeCourse } = require('../services/gradebookIntegrityService');
const Quiz = require('../models/Quiz');
const { createResourceController } = require('./resourceController');

const controller = createResourceController(Quiz, {
  scopeFilter: assessmentReadScope,
  authorizeRead: (req, record) => authorizeCourse(req, record.course?._id || record.course),
  fields: [
    'title',
    'quizCode',
    'course',
    'totalMarks',
    'passingMarks',
    'weightage',
    'quizDate',
    'durationMinutes',
    'academicYear',
    'semester',
    'status',
  ],
  filterFields: ['course', 'academicYear', 'semester', 'status'],
  populate: [{ path: 'course', select: 'courseCode title' }],
  sortFields: ['createdAt', 'updatedAt', 'quizDate', 'quizCode'],
  beforeCreate: (req) => ({ createdBy: req.user && req.user._id }),
});

const { assessmentWrites } = require('../services/gradebookIntegrityService');
module.exports = {
  listQuizzes: controller.list,
  getQuizById: controller.getById,
  createQuiz: assessmentWrites(Quiz, controller.create, 'create'),
  updateQuiz: assessmentWrites(Quiz, controller.update, 'update'),
  deleteQuiz: assessmentWrites(Quiz, controller.remove, 'remove'),
};
