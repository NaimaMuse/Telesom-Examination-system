const Course = require('../models/Course');
const Teacher = require('../models/Teacher');
const CourseTeacher = require('../models/CourseTeacher');
const Enrollment = require('../models/Enrollment');
const Exam = require('../models/Exam');
const Quiz = require('../models/Quiz');
const ExamResult = require('../models/ExamResult');
const QuizResult = require('../models/QuizResult');
const { calculatePerformance, filterPerformanceReport } = require('../services/teacherPerformanceService');
async function loadMarksOverview() {
    const [courses, teachers, assignments, enrollments, exams, quizzes, examResults, quizResults] = await Promise.all([
      Course.find().sort({title:1}).lean(), Teacher.find().populate('user','name email').lean(),
      CourseTeacher.find({status:'active'}).lean(),
      Enrollment.find({status:'enrolled'}).populate({path:'student',populate:{path:'user',select:'name email'}}).lean(),
      Exam.find().lean(), Quiz.find().lean(), ExamResult.find().lean(), QuizResult.find().lean(),
    ]);
    const teacherMap = new Map(teachers.filter(t=>t.user).map(t=>[String(t._id),t.user]));
    const students = [], assessments = [], batches = new Set();
    for (const course of courses) {
      const id=String(course._id), courseExams=exams.filter(a=>String(a.course)===id), courseQuizzes=quizzes.filter(a=>String(a.course)===id);
      const teacherUsers=assignments.filter(a=>String(a.course)===id).map(a=>teacherMap.get(String(a.teacher))).filter(Boolean);
      const rows=[...courseExams.map(a=>({...a,storageType:'exam',assessmentType:a.type==='quiz'?'quiz':'exam'})),...courseQuizzes.map(a=>({...a,storageType:'quiz',assessmentType:'quiz'}))];
      const examIds=new Set(courseExams.map(a=>String(a._id))),quizIds=new Set(courseQuizzes.map(a=>String(a._id)));
      const report=calculatePerformance({course,attendance:await require('../models/Attendance').find({course:course._id}).lean(),assessments:rows,enrollments:enrollments.filter(e=>String(e.course)===id),results:[...examResults.filter(r=>examIds.has(String(r.exam))).map(r=>({...r,storageType:'exam',assessmentId:r.exam})),...quizResults.filter(r=>quizIds.has(String(r.quiz))).map(r=>({...r,storageType:'quiz',assessmentId:r.quiz}))]});
      const teacherIds=[...new Set([...teacherUsers.map(t=>String(t._id)),...rows.map(a=>String(a.createdBy||'')).filter(Boolean)])];
      for(const student of filterPerformanceReport(report, { type: 'all' }).students){student.batches.forEach(batch=>batches.add(batch));students.push({...student,key:id+':'+student._id,teacherIds,teachers:teacherUsers.map(t=>t.name),allocatedMarks:report.allocation.allocatedMarks});}
      assessments.push(...report.assessments.map(a=>({...a,courseId:course._id})));
    }
    return {success:true,students,assessments,batches:[...batches].sort(),courses:courses.map(c=>({_id:c._id,title:c.title,courseCode:c.courseCode})),teachers:teachers.filter(t=>t.user).map(t=>({_id:t.user._id,name:t.user.name||t.user.email})).sort((a,b)=>a.name.localeCompare(b.name))};
}
exports.loadMarksOverview = loadMarksOverview;
exports.getMarksOverview = async (req,res,next) => { try { res.json(await loadMarksOverview()); } catch(error) { next(error); } };

