const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const CourseTeacher = require('../models/CourseTeacher');
const Enrollment = require('../models/Enrollment');
const Exam = require('../models/Exam');
const Quiz = require('../models/Quiz');
const ExamResult = require('../models/ExamResult');
const QuizResult = require('../models/QuizResult');
const { getMilestoneNotices } = require('./milestoneNotifications');

async function getResultNotices(studentId) {
  const notices = await Promise.all([['exam', ExamResult], ['quiz', QuizResult]].map(async ([kind, Model]) => {
    const rows = await Model.find({student:studentId}).populate(kind).sort({updatedAt:-1}).lean();
    return rows.flatMap(row => {
      const assessment = row[kind];
      if (!assessment || assessment.visibleToStudents !== true || assessment.marksPublished !== true ||
          ['draft','cancelled'].includes(assessment.status) || !(assessment.totalMarks > 0) ||
          !Number.isFinite(row.marksObtained) || row.marksObtained < 0 || row.marksObtained > assessment.totalMarks) return [];
      const updatedAt = new Date(row.updatedAt || row.createdAt).toISOString();
      return [{
        id: 'result:'+kind+':'+row._id+':'+updatedAt,
        type: 'result',
        title: 'New result: '+assessment.title,
        href: kind === 'quiz' || assessment.type === 'quiz' ? '/student/quizzes' : '/student/exams',
        scheduledAt: updatedAt,
      }];
    });
  }));
  return notices.flat().sort((a,b)=>b.scheduledAt.localeCompare(a.scheduledAt)).slice(0,60);
}

async function getNotifications(user, now = new Date()) {
  // Include today's assessments using the academy's Nairobi calendar day.
  const today = new Date(now.getTime() + 3 * 3600000);
  today.setUTCHours(0, 0, 0, 0);
  const upcomingStart = new Date(today.getTime() - 3 * 3600000);
  const upcomingEnd = new Date(upcomingStart.getTime() + 7 * 86400000);
  let scopes = [];
  let results = [];
  let teacherId;
  if (user.role === 'student') {
    const student = await Student.findOne({ user: user._id }).lean();
    if (!student) throw Object.assign(new Error('Student profile not found'), { statusCode: 404 });
    results = await getResultNotices(student._id);
    const enrollments = await Enrollment.find({ student: student._id, status: 'enrolled' }).lean();
    scopes = enrollments.map(e => ({ course: e.course, academicYear: e.academicYear, ...(e.semester ? { semester: e.semester } : {}) }));
  } else if (user.role === 'teacher') {
    const teacher = await Teacher.findOne({ user: user._id }).lean();
    if (!teacher) throw Object.assign(new Error('Teacher profile not found'), { statusCode: 404 });
    teacherId = teacher._id;
    const assignments = await CourseTeacher.find({ teacher: teacher._id, status: 'active' }).lean();
    scopes = assignments.map(a => ({ course: a.course, academicYear: a.academicYear, ...(a.semester ? { semester: a.semester } : {}) }));
  }
  const filter = user.role === 'admin' ? {} : scopes.length ? { $or: scopes } : null;
  const milestones = await getMilestoneNotices(user, teacherId, today.toISOString().slice(0, 10), now);
  if (!filter) return [...milestones, ...results];
  const dates = { $gte: upcomingStart, $lt: upcomingEnd };
  const [exams, quizzes] = await Promise.all([
    Exam.find({ ...filter, ...(user.role==='student'?{visibleToStudents:true}:{}), status: { $in: ['scheduled', 'upcoming', 'ongoing'] }, examDate: dates }).sort({ examDate: 1 }).limit(30).lean(),
    Quiz.find({ ...filter, ...(user.role==='student'?{visibleToStudents:true}:{}), status: 'published', quizDate: dates }).sort({ quizDate: 1 }).limit(30).lean(),
  ]);
  const toNotice = (row, storageType) => {
    const type = storageType === 'quiz' || row.type === 'quiz' ? 'quiz' : ['assignment', 'assessment', 'practical'].includes(row.type) ? 'assessment' : 'exam';
    const scheduledAt = new Date(storageType === 'quiz' ? row.quizDate : row.examDate).toISOString();
    const updatedAt = new Date(row.updatedAt || row.createdAt || scheduledAt).toISOString();
    return {
      id: `${storageType}:${row._id}:${updatedAt}`,
      type,
      title: `${row.title}: upcoming ${type}`,
      href: user.role === 'student' ? (type === 'quiz' ? '/student/quizzes' : '/student') : `/${user.role}/exams`,
      scheduledAt,
      updatedAt,
    };
  };
  const upcoming = [...exams.map(row => toNotice(row, 'exam')), ...quizzes.map(row => toNotice(row, 'quiz'))]
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)).slice(0, 60);
  return [...milestones, ...results, ...upcoming];
}
module.exports = { getNotifications };
