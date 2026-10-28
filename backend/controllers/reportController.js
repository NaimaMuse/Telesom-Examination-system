const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const Enrollment = require('../models/Enrollment');
const ExamResult = require('../models/ExamResult');
const QuizResult = require('../models/QuizResult');
const Student = require('../models/Student');
const { asyncHandler } = require('./resourceController');

const getAcademicSummary = asyncHandler(async (req, res) => {
  const [students, enrollments, examPerformance, quizPerformance, attendance] =
    await Promise.all([
      Student.countDocuments({ status: 'active' }),
      Enrollment.countDocuments(
        req.query && req.query.academicYear
          ? { academicYear: req.query.academicYear }
          : {}
      ),
      ExamResult.aggregate([
        {
          $group: {
            _id: null,
            resultCount: { $sum: 1 },
            averagePercentage: { $avg: '$percentage' },
            passedCount: { $sum: { $cond: ['$isPassed', 1, 0] } },
          },
        },
      ]),
      QuizResult.aggregate([
        {
          $group: {
            _id: null,
            resultCount: { $sum: 1 },
            averagePercentage: { $avg: '$percentage' },
            passedCount: { $sum: { $cond: ['$isPassed', 1, 0] } },
          },
        },
      ]),
      Attendance.countDocuments(),
    ]);

  res.status(200).json({
    success: true,
    data: {
      students,
      enrollments,
      attendanceRecords: attendance,
      exams: examPerformance[0] || {
        resultCount: 0,
        averagePercentage: null,
        passedCount: 0,
      },
      quizzes: quizPerformance[0] || {
        resultCount: 0,
        averagePercentage: null,
        passedCount: 0,
      },
    },
  });
});

const getStudentPerformanceReport = asyncHandler(async (req, res) => {
  const studentId = req.params.studentId;
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    res.status(400);
    throw new Error('Invalid student ID');
  }
  const student = await Student.findById(studentId).populate(
    'user',
    'name email'
  );
  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }
  if (req.user && req.user.role === 'student') {
    const ownsStudentProfile =
      student.user && String(student.user._id) === String(req.user._id);
    if (!ownsStudentProfile) {
      res.status(403);
      throw new Error('You may only view your own student report');
    }
  }

  if(req.user.role==='teacher'){
    const teacher=await require('../models/Teacher').findOne({user:req.user._id});
    const assignments=teacher?await require('../models/CourseTeacher').find({teacher:teacher._id,status:'active'}).select('course').lean():[];
    const allowed=assignments.map(a=>a.course);
    if(!await Enrollment.exists({student:studentId,course:{$in:allowed},status:'enrolled'}))throw Object.assign(new Error('Student is not enrolled in your assigned courses.'),{statusCode:403});
    // Return only the authorized course totals, never the student's unrelated records.
    const progress=await require('../services/academicProgressService').getStudentProgress(studentId,{publishedOnly:false});
    return res.json({success:true,data:{student:{studentId:student.studentId,name:student.user?.name},courses:progress.courses.filter(c=>allowed.map(String).includes(String(c.courseId)))}});
  }
  const [enrollments, examResults, quizResults, attendance] = await Promise.all([
    Enrollment.find({ student: studentId }).populate(
      'course',
      'courseCode title credits'
    ),
    ExamResult.find({ student: studentId })
      .populate('exam', 'title examCode totalMarks passingMarks examDate course')
      .sort({ createdAt: -1 }),
    QuizResult.find({ student: studentId })
      .populate('quiz', 'title quizCode totalMarks passingMarks quizDate course')
      .sort({ createdAt: -1 }),
    Attendance.find({ student: studentId })
      .populate('course', 'courseCode title')
      .sort({ date: -1 }),
  ]);

  res.status(200).json({
    success: true,
    data: { student, enrollments, examResults, quizResults, attendance },
  });
});

module.exports = {
  getAcademicSummary,
  getStudentPerformanceReport,
};
