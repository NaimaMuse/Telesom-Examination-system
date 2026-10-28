const Attendance = require('../models/Attendance');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Exam = require('../models/Exam');
const ExamResult = require('../models/ExamResult');
const Quiz = require('../models/Quiz');
const QuizResult = require('../models/QuizResult');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const { asyncHandler } = require('./resourceController');

const getDashboardOverview = asyncHandler(async (req, res) => {
  const now = new Date();
  if (req.user && req.user.role === 'student') {
    const student = await Student.findOne({ user: req.user._id }).populate(
      'user',
      'name email'
    );
    if (!student) {
      res.status(404);
      throw new Error('Student profile not found');
    }
    const enrollments = await Enrollment.find({
      student: student._id,
      status: 'enrolled',
    }).select('course');
    const courseIds = enrollments.map((enrollment) => enrollment.course);
    const [
      examResults,
      quizResults,
      attendance,
      upcomingExams,
      upcomingQuizzes,
    ] = await Promise.all([
      ExamResult.countDocuments({ student: student._id }),
      QuizResult.countDocuments({ student: student._id }),
      Attendance.countDocuments({ student: student._id }),
      Exam.find({
        course: { $in: courseIds },
        examDate: { $gte: now },
        status: 'scheduled',
      })
        .populate('course', 'courseCode title')
        .sort({ examDate: 1 })
        .limit(5),
      Quiz.find({
        course: { $in: courseIds },
        quizDate: { $gte: now },
        status: 'published',
      })
        .populate('course', 'courseCode title')
        .sort({ quizDate: 1 })
        .limit(5),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        student,
        totals: {
          courses: courseIds.length,
          examResults,
          quizResults,
          attendance,
        },
        upcomingExams,
        upcomingQuizzes,
      },
    });
  }

  const [students, teachers, courses, enrollments, exams, quizzes, attendance, upcomingExams] =
    await Promise.all([
      Student.countDocuments({ status: 'active' }),
      Teacher.countDocuments({ status: 'active' }),
      Course.countDocuments({ isActive: true }),
      Enrollment.countDocuments({ status: 'enrolled' }),
      Exam.countDocuments(),
      Quiz.countDocuments(),
      Attendance.countDocuments(),
      Exam.find({ examDate: { $gte: now }, status: 'scheduled' })
        .populate('course', 'courseCode title')
        .sort({ examDate: 1 })
        .limit(5),
    ]);

  return res.status(200).json({
    success: true,
    data: {
      totals: {
        students,
        teachers,
        courses,
        enrollments,
        exams,
        quizzes,
        attendance,
      },
      upcomingExams,
    },
  });
});

module.exports = {
  getDashboardOverview,
};

module.exports.getAdminDashboard = asyncHandler(async (req,res) => {
  const [students,teachers,courses,exams,quizzes,recent] = await Promise.all([
    Student.countDocuments(),Teacher.countDocuments(),Course.countDocuments(),Exam.countDocuments(),Quiz.countDocuments(),
    Student.find().populate('user','name email isActive').sort({createdAt:-1,_id:-1}).limit(8).lean(),
  ]);
  res.json({success:true,data:{totals:{students,teachers,courses,assessments:exams+quizzes},recentStudents:recent.map(student=>({_id:student._id,name:student.user?.name||'Student account unavailable',email:student.user?.email||'',studentId:student.studentId,status:student.user?.isActive===false?'inactive':student.status||'active'}))}});
});
