const Exam = require('../models/Exam');
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
  populate: [{ path: 'course', select: 'courseCode title' }],
  sortFields: ['createdAt', 'updatedAt', 'examDate', 'examCode'],
  beforeCreate: (req) => ({ createdBy: req.user && req.user._id }),
});

module.exports = {
  listExams: controller.list,
  getExamById: controller.getById,
  createExam: controller.create,
  updateExam: controller.update,
  deleteExam: controller.remove,
};
