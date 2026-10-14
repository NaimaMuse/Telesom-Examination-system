const Quiz = require('../models/Quiz');
const { createResourceController } = require('./resourceController');

const controller = createResourceController(Quiz, {
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

module.exports = {
  listQuizzes: controller.list,
  getQuizById: controller.getById,
  createQuiz: controller.create,
  updateQuiz: controller.update,
  deleteQuiz: controller.remove,
};
