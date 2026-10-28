const Course = require('../models/Course');
const Teacher = require('../models/Teacher');
const Exam = require('../models/Exam');
const Quiz = require('../models/Quiz');
const Enrollment = require('../models/Enrollment');
const ExamResult = require('../models/ExamResult');
const QuizResult = require('../models/QuizResult');

exports.getAssessmentOverview = async (req, res, next) => {
  try {
    const [exams, quizzes, enrollments, examResults, quizResults, courses, teachers] = await Promise.all([
      Exam.find().populate('course', 'title courseCode').populate('createdBy', 'name email').lean(),
      Quiz.find().populate('course', 'title courseCode').populate('createdBy', 'name email').lean(),
      Enrollment.find({ status: 'enrolled' }).populate('student', 'academicYear').lean(),
      ExamResult.find().select('exam student marksObtained').lean(),
      QuizResult.find().select('quiz student marksObtained').lean(),
      Course.find().select('title courseCode').sort({ title: 1 }).lean(),
      Teacher.find().select('user teacherId').populate('user', 'name email').lean(),
    ]);
    const roster = new Map(), saved = new Map();
    for (const enrollment of enrollments) {
      if (!enrollment.student) continue;
      const id = String(enrollment.course);
      if (!roster.has(id)) roster.set(id, new Map());
      const studentId = String(enrollment.student._id);
      const batch = enrollment.student.academicYear?.trim() || enrollment.academicYear?.trim() || '';
      if (!roster.get(id).has(studentId)) roster.get(id).set(studentId, new Set());
      if (batch) roster.get(id).get(studentId).add(batch);
    }
    for (const [type, results] of [['exam', examResults], ['quiz', quizResults]]) {
      for (const result of results) {
        const key = `${type}:${result[type]}`;
        if (!saved.has(key)) saved.set(key, []);
        saved.get(key).push(result);
      }
    }
    const data = [...exams.map(row => ({ ...row, source: 'exam' })), ...quizzes.map(row => ({ ...row, source: 'quiz', type: 'quiz', examDate: row.quizDate, examCode: row.quizCode }))].map(row => {
      const students = roster.get(String(row.course?._id)) || new Map();
      const graded = new Set((saved.get(`${row.source}:${row._id}`) || []).filter(result => typeof result.marksObtained === 'number' && result.marksObtained >= 0 && result.marksObtained <= row.totalMarks && students.has(String(result.student))).map(result => String(result.student)));
      const batches = [...new Set([...students.values()].flatMap(values => [...values]))].sort();
      const batchStats = batches.map(batch => {
        const ids = [...students].filter(([, values]) => values.has(batch)).map(([id]) => id);
        return { batch, enrolled: ids.length, graded: ids.filter(id => graded.has(id)).length };
      });
      return { ...row, key: `${row.source}:${row._id}`, enrolledCount: students.size, gradedCount: graded.size, batches, batchStats };
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ success: true, data, courses, teachers: teachers.filter(teacher => teacher.user).map(teacher => ({ _id: teacher.user._id, teacherId: teacher.teacherId, name: teacher.user.name || teacher.user.email })).sort((a, b) => a.name.localeCompare(b.name)) });
  } catch (error) { next(error); }
};
