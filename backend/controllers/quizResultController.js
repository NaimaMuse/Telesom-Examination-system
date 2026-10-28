const mongoose = require('mongoose');
const Quiz = require('../models/Quiz');
const QuizResult = require('../models/QuizResult');
const { asyncHandler, createResourceController } = require('./resourceController');

const controller = createResourceController(QuizResult, {
  fields: ['quiz', 'student', 'marksObtained', 'remarks'],
  filterFields: ['quiz', 'student', 'isPassed'],
  populate: [
    { path: 'quiz', select: 'title quizCode totalMarks passingMarks' },
    { path: 'student', populate: { path: 'user', select: 'name email' } },
    { path: 'gradedBy', select: 'name email' },
  ],
  sortFields: ['createdAt', 'updatedAt', 'marksObtained', 'percentage'],
});

const prepareResult = async (req, result = {}) => {
  const quizId = (req.body && req.body.quiz) || result.quiz;
  if (!mongoose.Types.ObjectId.isValid(quizId)) {
    const error = new Error('A valid quiz ID is required');
    error.statusCode = 400;
    throw error;
  }
  const quiz = await Quiz.findById(quizId);
  if (!quiz) {
    const error = new Error('Quiz not found');
    error.statusCode = 404;
    throw error;
  }
  const student = (req.body && req.body.student) || result.student;
  const rawMarks =
    req.body && req.body.marksObtained !== undefined
      ? req.body.marksObtained
      : result.marksObtained;
  const marksObtained =
    typeof rawMarks === 'number' ||
    (typeof rawMarks === 'string' && rawMarks.trim() !== '')
      ? Number(rawMarks)
      : NaN;
  if (!Number.isFinite(marksObtained) || marksObtained < 0) {
    const error = new Error('Marks obtained must be a non-negative number');
    error.statusCode = 400;
    throw error;
  }
  if (marksObtained > quiz.totalMarks) {
    const error = new Error('Marks obtained cannot exceed the quiz total');
    error.statusCode = 400;
    throw error;
  }
  if (!mongoose.Types.ObjectId.isValid(student)) {
    const error = new Error('A valid student ID is required');
    error.statusCode = 400;
    throw error;
  }

  return {
    quiz: quiz._id,
    student,
    marksObtained,
    percentage: quiz.totalMarks
      ? Math.round((marksObtained / quiz.totalMarks) * 10000) / 100
      : 0,
    isPassed: marksObtained >= quiz.passingMarks,
    gradedBy: req.user && req.user._id,
    ...(req.body && req.body.remarks !== undefined
      ? { remarks: req.body.remarks }
      : {}),
  };
};

const createQuizResult = asyncHandler(async (req, res) => {
  const data = await prepareResult(req);
  const result = await QuizResult.create(data);
  res.status(201).json({ success: true, data: result });
});

const updateQuizResult = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    throw new Error('Invalid result ID');
  }
  const existing = await QuizResult.findById(req.params.id);
  if (!existing) {
    res.status(404);
    throw new Error('Quiz result not found');
  }
  const data = await prepareResult(req, existing);
  const result = await QuizResult.findByIdAndUpdate(req.params.id, data, {
    new: true,
    runValidators: true,
  });
  res.status(200).json({ success: true, data: result });
});

const { resultWrite, resultRead } = require('../services/gradebookIntegrityService');
module.exports = {
  listQuizResults: resultRead('quiz', controller.list),
  getQuizResultById: resultRead('quiz', controller.getById, true),
  createQuizResult: resultWrite('quiz', createQuizResult),
  updateQuizResult: resultWrite('quiz', updateQuizResult),
  deleteQuizResult: resultWrite('quiz', controller.remove, 'remove'),
};
