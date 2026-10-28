const {lessonProgress}=require('./outlinePlanService');
const mongoose=require('mongoose');
const Teacher=require('../models/Teacher'),Assignment=require('../models/CourseTeacher');
const Enrollment=require('../models/Enrollment'),Contract=require('../models/TeacherContract');
const Lesson=require('../models/TeachingLesson'),Exam=require('../models/Exam'),Quiz=require('../models/Quiz'),Note=require('../models/Note');
const {summary,teachingDay}=require('./teacherContractService');
const fail=(message,statusCode=400)=>{throw Object.assign(new Error(message),{statusCode});};
const publicCourse=course=>{const {performanceWriteLock,__v,...safe}=course;return safe;};
const id=value=>String(value?._id||value||'');
const cohortKey=s=>[id(s.course),s.academicYear,s.batch||''].join(':');
async function resolveScope(user,query={}) {
  for(const key of ['courseId','academicYear','batch','contractId'])if(query[key]!==undefined&&typeof query[key]!=='string')fail('Invalid '+key+' filter.');
  const teacher=await Teacher.findOne({user:user._id}).lean();if(!teacher)fail('Teacher profile not found.',404);
  const assignments=(await Assignment.find({teacher:teacher._id,status:'active'}).populate('course').lean()).filter(a=>a.course);
  const pairs=assignments.map(a=>({course:a.course._id,academicYear:a.academicYear}));
  const [enrollments,contracts]=pairs.length?await Promise.all([
    Enrollment.find({status:'enrolled',$or:pairs}).lean(),
    Contract.find({teacher:teacher._id,$or:pairs}).sort({status:1,startDate:-1}).lean(),
  ]):[[],[]];
  const cohorts=[];
  for(const assignment of assignments){
    const matches=r=>id(r.course)===id(assignment.course)&&r.academicYear===assignment.academicYear;
    const batches=[...new Set([...contracts.filter(matches).map(c=>c.batch),...enrollments.filter(matches).map(e=>e.batch||'')])];
    for(const batch of batches.length?batches:[''])cohorts.push({course:assignment.course,academicYear:assignment.academicYear,batch,semester:assignment.semester||assignment.course.semester||''});
  }
  if(query.contractId&&!query.courseId){const contract=contracts.find(c=>id(c)===query.contractId);if(!contract)fail('Contract is not assigned to you.',403);query={...query,courseId:id(contract.course),academicYear:query.academicYear||contract.academicYear,batch:query.batch??contract.batch};}
  const courseMatches=cohorts.filter(c=>!query.courseId||id(c.course)===query.courseId);
  if(query.courseId&&!courseMatches.length)fail('This course is not assigned to you.',403);
  const yearMatches=courseMatches.filter(c=>!query.academicYear||c.academicYear===query.academicYear);
  if(query.academicYear&&!yearMatches.length)fail('This academic year is not assigned to you.',403);
  const selected=query.batch!==undefined?yearMatches.find(c=>c.batch===query.batch):yearMatches[0];
  if(query.batch!==undefined&&!selected)fail('Batch not found in your assigned course and year.',403);
  if(!selected)return {teacher,cohorts,contracts:[],selected:null,courses:[]};
  const matchingContracts=contracts.filter(c=>cohortKey(c)===cohortKey(selected));
  const contract=query.contractId?matchingContracts.find(c=>id(c)===query.contractId):matchingContracts.find(c=>c.status==='active'&&c.startDate<=teachingDay()&&(!c.endDate||c.endDate>=teachingDay()))||matchingContracts.find(c=>c.status==='active')||matchingContracts[0]||null;
  if(query.contractId&&!contract)fail('Contract does not belong to the selected course and batch.',403);
  const courses=[...new Map(assignments.map(a=>[id(a.course),a.course])).values()];
  return {teacher,cohorts,courses,contracts:matchingContracts,selected,contract};
}
const enrollmentFilter=scope=>({course:scope.course._id,academicYear:scope.academicYear,status:'enrolled',...(scope.batch?{batch:scope.batch}:{$or:[{batch:''},{batch:{$exists:false}}]})});
const assessmentFilter=scope=>({course:scope.course._id,academicYear:scope.academicYear,$and:[{$or:[{batch:scope.batch||''},{batch:''},{batch:{$exists:false}}]},...(scope.semester?[{$or:[{semester:scope.semester},{semester:''},{semester:{$exists:false}}]}]:[])]});
const materialFilter=(user,scope)=>({createdBy:user._id,course:scope.course._id,academicYear:scope.academicYear,batch:scope.batch||'',material:true,archivedAt:null});
const safeMaterial=note=>({_id:note._id,title:note.title,description:note.content,filename:note.attachment?.filename||'',fileType:note.attachment?.filename?.split('.').pop()||'',size:note.attachment?.size?`${(note.attachment.size/1024/1024).toFixed(1)} MB`:'',hasAttachment:!!note.attachment?.filename,uploadedAt:note.updatedAt,course:note.course,batch:note.batch,academicYear:note.academicYear});
async function getWorkspace(user,query) {
  const context=await resolveScope(user,query);
  const {selected,contract}=context;
  const options=context.cohorts.map(c=>({key:cohortKey(c),courseId:c.course._id,courseName:c.course.title||c.course.name,academicYear:c.academicYear,batch:c.batch,semester:c.semester}));
  if(!selected)return {success:true,course:null,courses:[],cohorts:[],students:[],upcomingExams:[],assessments:[],notes:[],contract:null,contracts:[],lessonProgress:{total:0,completed:0,remaining:0,percentage:0}};
  const [enrollments,exams,quizzes,notes,lessons]=await Promise.all([
    Enrollment.find(enrollmentFilter(selected)).populate({path:'student',populate:{path:'user',select:'name email'}}).lean(),
    Exam.find(assessmentFilter(selected)).sort({examDate:1}).populate('course','title name courseCode').lean(),
    Quiz.find(assessmentFilter(selected)).sort({quizDate:1}).populate('course','title name courseCode').lean(),
    Note.find(materialFilter(user,selected)).sort('-updatedAt').lean(),
    contract?Lesson.find({contract:contract._id}).lean():[],
  ]);
  const assessments=[...exams.map(a=>({...a,storageType:'exam',date:a.examDate})),...quizzes.map(a=>({...a,type:'quiz',storageType:'quiz',nativeQuiz:true,examDate:a.quizDate,date:a.quizDate}))].sort((a,b)=>new Date(a.date)-new Date(b.date));
  const completed=lessons.filter(l=>l.status==='completed').length;
  const today=new Date(teachingDay()+'T00:00:00+03:00');
  return {success:true,course:{...publicCourse(selected.course),academicYear:selected.academicYear,batch:selected.batch,semester:selected.semester},courses:context.courses.map(publicCourse),cohorts:options,scope:{courseId:selected.course._id,academicYear:selected.academicYear,batch:selected.batch,contractId:contract?._id||''},
    students:[...new Map(enrollments.filter(e=>e.student).map(e=>[id(e.student),{_id:e.student._id,name:e.student.user?.name||'Student',email:e.student.user?.email||'',studentId:e.student.studentId,status:e.student.status,batch:selected.batch,academicYear:selected.academicYear}])).values()],
    assessments,upcomingExams:assessments.filter(a=>['scheduled','upcoming','ongoing','published'].includes(a.status)&&new Date(a.date)>=today),notes:notes.map(safeMaterial),
    contract:contract?await summary(contract):null,contracts:context.contracts.map(c=>({_id:c._id,startDate:c.startDate,endDate:c.endDate,status:c.status})),lessonProgress:{total:lessons.length,completed,remaining:lessons.length-completed,percentage:lessons.length?Math.round(lessons.reduce((sum,l)=>sum+lessonProgress(l),0)/lessons.length):0}};
}
module.exports={resolveScope,enrollmentFilter,assessmentFilter,materialFilter,safeMaterial,getWorkspace};
