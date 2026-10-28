const Enrollment=require('../models/Enrollment');
const Exam=require('../models/Exam'),Quiz=require('../models/Quiz');
const ExamResult=require('../models/ExamResult'),QuizResult=require('../models/QuizResult');
const Attendance=require('../models/Attendance');
const round=n=>Math.round(n*100)/100;
const visible=a=>a.visibleToStudents===true&&!['draft','cancelled'].includes(a.status);
const assessmentApplies=(a,e)=>String(a.course?._id||a.course)===String(e.course?._id||e.course)&&(!a.academicYear||a.academicYear===e.academicYear)&&(!a.batch||a.batch===(e.batch||''))&&(!a.semester||!e.semester||a.semester===e.semester);
const day=value=>new Date(new Date(value).getTime()+10800000).toISOString().slice(0,10);
function attendanceScore(records) {
  const unique=new Map();
  for(const record of [...records].sort((a,b)=>new Date(a.updatedAt||0)-new Date(b.updatedAt||0)))unique.set(day(record.date),record);
  const rows=[...unique.values()].filter(r=>r.status!=='excused');
  const present=rows.filter(r=>r.status==='present').length;
  return {presentSessions:present,eligibleSessions:rows.length,attendancePercentage:rows.length?round(present/rows.length*100):0,attendanceMarks:rows.length?round(present/rows.length*10):0};
}
function calculateCourseMarks(assessments,results,attendance) {
  const valid=assessments.filter(a=>a.status!=='cancelled'&&a.totalMarks>0);
  const allocated=round(valid.reduce((sum,a)=>sum+a.totalMarks,0));
  // Preserve legacy scores: explicitly normalize old allocations above 90 rather than rewriting records.
  const scale=allocated>90?90/allocated:1;
  const seen=new Set();let raw=0,completed=0;
  for(const result of [...results].sort((a,b)=>new Date(b.updatedAt||0)-new Date(a.updatedAt||0))) {
    const key=result.kind+':'+result.assessment;
    const assessment=valid.find(a=>a.kind===result.kind&&String(a._id)===String(result.assessment));
    if(!assessment||seen.has(key))continue;seen.add(key);
    if(!Number.isFinite(result.marksObtained)||result.marksObtained<0||result.marksObtained>assessment.totalMarks)continue;
    raw+=result.marksObtained;completed++;
  }
  const teacherMarks=round(Math.min(90,raw*scale)),att=attendanceScore(attendance);
  return {...att,teacherMarks,teacherMaximum:90,attendanceMaximum:10,finalMarks:round(Math.min(100,teacherMarks+att.attendanceMarks)),maximumMarks:100,allocatedTeacherMarks:allocated,legacyNormalization:allocated>90,completedAssessments:completed,totalAssessments:valid.length,complete:allocated>=90&&completed===valid.length&&att.eligibleSessions>0};
}
async function getStudentProgress(student,{publishedOnly=true}={}) {
  const enrollments=await Enrollment.find({student,status:'enrolled'}).populate('course').lean();
  const scopes=enrollments.filter(e=>e.course).map(e=>({course:e.course._id,academicYear:e.academicYear,...(e.semester?{semester:e.semester}:{}),$or:[{batch:e.batch||''},{batch:{$exists:false}},{batch:''}]}));
  if(!scopes.length)return {courses:[],activities:[],summary:{total:0,completed:0,pending:0,upcoming:0,earned:0,maximum:0}};
  const [exams,quizzes,examResults,quizResults,attendance]=await Promise.all([
    Exam.find({$or:scopes,status:{$ne:'cancelled'}}).lean(),Quiz.find({$or:scopes,status:{$ne:'cancelled'}}).lean(),
    ExamResult.find({student}).lean(),QuizResult.find({student}).lean(),Attendance.find({student}).lean(),
  ]);
  const all=[...exams.map(a=>({...a,kind:'exam',date:a.examDate})),...quizzes.map(a=>({...a,kind:'quiz',type:'quiz',date:a.quizDate}))];
  const assessments=publishedOnly?all.filter(visible):all;
  const results=[...examResults.map(r=>({...r,kind:'exam',assessment:r.exam})),...quizResults.map(r=>({...r,kind:'quiz',assessment:r.quiz}))];
  const courses=enrollments.filter(e=>e.course).map(e=>({courseId:e.course._id,course:e.course.title||e.course.name,batch:e.batch||'',academicYear:e.academicYear,...calculateCourseMarks(assessments.filter(a=>assessmentApplies(a,e)),results.filter(r=>!publishedOnly||assessments.some(a=>a.kind===r.kind&&String(a._id)===String(r.assessment)&&a.marksPublished===true)),attendance.filter(r=>String(r.course)===String(e.course._id)&&day(r.date)>=day(e.enrollmentDate)))}));
  const activities=assessments.map(a=>{const r=results.find(r=>r.kind===a.kind&&String(r.assessment)===String(a._id));const valid=r&&(!publishedOnly||a.marksPublished===true)&&r.marksObtained>=0&&r.marksObtained<=a.totalMarks;const enrollment=enrollments.find(e=>assessmentApplies(a,e));return {_id:a.kind+':'+a._id,courseId:a.course,batch:enrollment?.batch||'',academicYear:enrollment?.academicYear||'',title:a.title,type:a.type||'exam',course:enrollments.find(e=>String(e.course?._id)===String(a.course))?.course?.title||'',totalMarks:a.totalMarks,marks:valid?r.marksObtained:null,date:a.date,status:valid?'Completed':new Date(a.date)>new Date()?'Upcoming':a.status==='completed'?'Missed':'Pending'};});
  return {courses,activities,summary:{total:activities.length,completed:activities.filter(a=>a.status==='Completed').length,pending:activities.filter(a=>['Pending','Missed'].includes(a.status)).length,upcoming:activities.filter(a=>a.status==='Upcoming').length,earned:round(activities.reduce((sum,a)=>sum+(a.marks||0),0)),maximum:round(activities.reduce((sum,a)=>sum+a.totalMarks,0))}};
}
module.exports={attendanceScore,calculateCourseMarks,getStudentProgress,visible,day,assessmentApplies};
