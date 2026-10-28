const mongoose = require('mongoose');
const Exam = require('../models/Exam');
const ExamResult = require('../models/ExamResult');
const { asyncHandler, createResourceController } = require('./resourceController');

const controller = createResourceController(ExamResult, {
  fields: ['exam', 'student', 'marksObtained', 'grade', 'remarks'],
  filterFields: ['exam', 'student', 'isPassed'],
  populate: [
    { path: 'exam', select: 'title examCode totalMarks passingMarks' },
    { path: 'student', populate: { path: 'user', select: 'name email' } },
    { path: 'gradedBy', select: 'name email' },
  ],
  sortFields: ['createdAt', 'updatedAt', 'marksObtained', 'percentage'],
});

const prepareResult = async (req, result = {}) => {
  const examId = (req.body && req.body.exam) || result.exam;
  if (!mongoose.Types.ObjectId.isValid(examId)) {
    const error = new Error('A valid exam ID is required');
    error.statusCode = 400;
    throw error;
  }
  const exam = await Exam.findById(examId);
  if (!exam) {
    const error = new Error('Exam not found');
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
  if (marksObtained > exam.totalMarks) {
    const error = new Error('Marks obtained cannot exceed the exam total');
    error.statusCode = 400;
    throw error;
  }
  if (!mongoose.Types.ObjectId.isValid(student)) {
    const error = new Error('A valid student ID is required');
    error.statusCode = 400;
    throw error;
  }

  return {
    exam: exam._id,
    student,
    marksObtained,
    percentage: exam.totalMarks
      ? Math.round((marksObtained / exam.totalMarks) * 10000) / 100
      : 0,
    isPassed: marksObtained >= exam.passingMarks,
    gradedBy: req.user && req.user._id,
    ...(req.body && req.body.grade !== undefined
      ? { grade: req.body.grade }
      : {}),
    ...(req.body && req.body.remarks !== undefined
      ? { remarks: req.body.remarks }
      : {}),
  };
};

const createExamResult = asyncHandler(async (req, res) => {
  const data = await prepareResult(req);
  const result = await ExamResult.create(data);
  res.status(201).json({ success: true, data: result });
});

const updateExamResult = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    throw new Error('Invalid result ID');
  }
  const existing = await ExamResult.findById(req.params.id);
  if (!existing) {
    res.status(404);
    throw new Error('Exam result not found');
  }
  const data = await prepareResult(req, existing);
  const result = await ExamResult.findByIdAndUpdate(req.params.id, data, {
    new: true,
    runValidators: true,
  });
  res.status(200).json({ success: true, data: result });
});

const { resultWrite, resultRead } = require('../services/gradebookIntegrityService');
module.exports = {
  listExamResults: resultRead('exam', controller.list),
  getExamResultById: resultRead('exam', controller.getById, true),
  createExamResult: resultWrite('exam', createExamResult),
  updateExamResult: resultWrite('exam', updateExamResult),
  deleteExamResult: resultWrite('exam', controller.remove, 'remove'),
};
