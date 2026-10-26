const assert = require('assert');
const mongoose = require('mongoose');
const Course = require('../models/Course');
const Exam = require('../models/Exam');
const ExamResult = require('../models/ExamResult');
const Note = require('../models/Note');
const { createCourse } = require('../controllers/courseController');
const { createExamResult } = require('../controllers/examResultController');
const { createNote } = require('../controllers/noteController');

const createContext = ({ body = {}, params = {}, query = {}, user } = {}) => {
  const context = {
    req: { body, params, query, user },
    statusCode: 200,
    responseBody: null,
    nextError: null,
  };
  context.res = {
    status(code) {
      context.statusCode = code;
      return this;
    },
    json(data) {
      context.responseBody = data;
      return this;
    },
  };
  context.next = (error) => {
    context.nextError = error;
  };
  return context;
};

const run = async () => {
  const originals = {
    courseLock: Course.findOneAndUpdate,
    courseUnlock: Course.updateOne,
    enrollmentDistinct: require('../models/Enrollment').distinct,
    resultFind: ExamResult.find,
    examUpdate: Exam.updateOne,
    enrollmentExists: require('../models/Enrollment').exists,
    courseCreate: Course.create,
    examFindById: Exam.findById,
    examResultCreate: ExamResult.create,
    noteCreate: Note.create,
  };

  try {
    Course.findOneAndUpdate = async () => ({});
    Course.updateOne = async () => ({});
    require('../models/Enrollment').exists = async () => true;
    let createdCourse;
    Course.create = async (data) => {
      createdCourse = data;
      return data;
    };
    const courseContext = createContext({
      body: {
        courseCode: 'NET-101',
        title: 'Networking',
        unexpectedField: 'ignored',
      },
    });
    await createCourse(
      courseContext.req,
      courseContext.res,
      courseContext.next
    );
    assert.strictEqual(courseContext.statusCode, 201);
    assert.strictEqual(createdCourse.courseCode, 'NET-101');
    assert.strictEqual(createdCourse.unexpectedField, undefined);

    const examId = new mongoose.Types.ObjectId();
    const studentId = new mongoose.Types.ObjectId();
    let createdResult;
    require('../models/Enrollment').distinct = async () => [studentId];
    ExamResult.find = () => ({ select: () => ({ lean: async () => createdResult ? [createdResult] : [] }) });
    Exam.updateOne = async () => ({ modifiedCount: 1 });
    Exam.findById = async () => ({
      _id: examId,
      course: new mongoose.Types.ObjectId(),
      totalMarks: 100,
      passingMarks: 50,
    });
    ExamResult.create = async (data) => {
      createdResult = data;
      return data;
    };
    const resultContext = createContext({
      user: { role: 'admin', _id: new mongoose.Types.ObjectId() },
      body: { exam: examId, student: studentId, marksObtained: 75 },
    });
    await createExamResult(
      resultContext.req,
      resultContext.res,
      resultContext.next
    );
    assert.strictEqual(resultContext.statusCode, 201);
    assert.strictEqual(createdResult.percentage, 75);
    assert.strictEqual(createdResult.isPassed, true);

    const invalidMarksContext = createContext({
      user: { role: 'admin', _id: new mongoose.Types.ObjectId() },
      body: { exam: examId, student: studentId, marksObtained: 101 },
    });
    await createExamResult(
      invalidMarksContext.req,
      invalidMarksContext.res,
      invalidMarksContext.next
    );
    assert.strictEqual(invalidMarksContext.statusCode, 400);
    assert.match(invalidMarksContext.nextError.message, /cannot exceed/i);

    let createdNote;
    Note.create = async (data) => {
      createdNote = data;
      return data;
    };
    const authorId = new mongoose.Types.ObjectId();
    const noteContext = createContext({
      user: { _id: authorId, role: 'teacher' },
      body: {
        title: 'Exam prep',
        content: 'Review chapter one',
        createdBy: new mongoose.Types.ObjectId(),
      },
    });
    await createNote(noteContext.req, noteContext.res, noteContext.next);
    assert.strictEqual(noteContext.statusCode, 201);
    assert.strictEqual(String(createdNote.createdBy), String(authorId));
  } finally {
    require('../models/Enrollment').distinct = originals.enrollmentDistinct;
    ExamResult.find = originals.resultFind;
    Exam.updateOne = originals.examUpdate;
    Course.findOneAndUpdate = originals.courseLock;
    Course.updateOne = originals.courseUnlock;
    require('../models/Enrollment').exists = originals.enrollmentExists;
    Course.create = originals.courseCreate;
    Exam.findById = originals.examFindById;
    ExamResult.create = originals.examResultCreate;
    Note.create = originals.noteCreate;
  }

  console.log('Domain controller smoke tests passed.');
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
