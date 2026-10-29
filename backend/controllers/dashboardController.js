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
  if(req.user?.role==='teacher')return require('./teacherDashboardController').getTeacherDashboard(req,res,error=>{throw error;});
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
    }).select('course academicYear semester batch');
    const scopes=enrollments.map(e=>({course:e.course,academicYear:e.academicYear,...(e.semester?{semester:e.semester}:{}),$or:[{batch:e.batch||''},{batch:{$exists:false}},{batch:''}]}));
    const scope=scopes.length?{$or:scopes}:{_id:null};
    const progress=await require('../services/academicProgressService').getStudentProgress(student._id);
    const courseIds = enrollments.map((enrollment) => enrollment.course);
    const [
      examResults,
      quizResults,
      attendance,
      upcomingExams,
      upcomingQuizzes,
    ] = await Promise.all([
      Promise.resolve(progress.activities.filter(a=>a._id.startsWith('exam:')&&a.status==='Completed').length),
      Promise.resolve(progress.activities.filter(a=>a._id.startsWith('quiz:')&&a.status==='Completed').length),
      Attendance.countDocuments({ student: student._id }),
      Exam.find({
        ...scope,
        visibleToStudents:true,
        examDate: { $gte: now },
        status: 'scheduled',
      })
        .populate('course', 'courseCode title')
        .sort({ examDate: 1 })
        .limit(5),
      Quiz.find({
        ...scope,
        visibleToStudents:true,
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
  const [students,teachers,courses,exams,quizzes,recent,recentTeachers,recentCourses,recentExams,recentQuizzes] = await Promise.all([
    Student.countDocuments(),Teacher.countDocuments(),Course.countDocuments(),Exam.countDocuments(),Quiz.countDocuments(),
    Student.find().populate('user','name email isActive').sort({createdAt:-1,_id:-1}).limit(8).lean(),
    Teacher.find().select('user createdAt').populate('user','name').sort({createdAt:-1,_id:-1}).limit(5).lean(),
    Course.find().select('title name createdAt').sort({createdAt:-1,_id:-1}).limit(5).lean(),
    Exam.find().select('title createdAt').sort({createdAt:-1,_id:-1}).limit(5).lean(),
    Quiz.find().select('title createdAt').sort({createdAt:-1,_id:-1}).limit(5).lean(),
  ]);
  const groups = [
    [recent, 'student', 'Student registered', '/admin/students'],
    [recentTeachers, 'teacher', 'Teacher added', '/admin/teachers'],
    [recentCourses, 'course', 'Course created', '/admin/courses'],
    [recentExams, 'exam', 'Assessment created', '/admin/exams'],
    [recentQuizzes, 'quiz', 'Quiz created', '/admin/exams'],
  ];
  const recentActivities = groups.flatMap(([records,type,title,to]) => records.map(record => ({
    id: type + ':' + record._id, title, to, createdAt: record.createdAt,
    description: record.user?.name || record.title || record.name || record.studentId || 'Account unavailable',
  }))).sort((a,b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0) || b.id.localeCompare(a.id)).slice(0,5);
  res.json({success:true,data:{recentActivities,totals:{students,teachers,courses,assessments:exams+quizzes},recentStudents:recent.map(student=>({_id:student._id,createdAt:student.createdAt,name:student.user?.name||'Student account unavailable',email:student.user?.email||'',studentId:student.studentId,status:student.user?.isActive===false?'inactive':student.status||'active'}))}});
});
