const Course=require('../models/Course'),Teacher=require('../models/Teacher'),Student=require('../models/Student');
const Enrollment=require('../models/Enrollment'),Assignment=require('../models/CourseTeacher');
const Exam=require('../models/Exam'),Quiz=require('../models/Quiz'),ExamResult=require('../models/ExamResult'),QuizResult=require('../models/QuizResult');
const Attendance=require('../models/Attendance'),Lesson=require('../models/TeachingLesson'),Outline=require('../models/CourseOutline'),Makeup=require('../models/MakeupClass'),Contract=require('../models/TeacherContract'),Batch=require('../models/Batch');
const {summary,validDate,teachingDay}=require('./teacherContractService');
const {getStudentProgress,attendanceScore}=require('./academicProgressService');
const types=['dropped','activities','exams','upcoming','outlines','makeup','contracts','progress','attendance','batches'];
const label=c=>c?.title||c?.name||'Unavailable course';
const day=v=>v?require('./academicProgressService').day(v):'';
async function getReport(type,query={}) {
  const fail=message=>{throw Object.assign(new Error(message),{statusCode:400});};
  if(!types.includes(type))fail('Unknown report.');
  const f={};for(const k of ['teacher','course','batch','academicYear','status','assessmentType','from','to']){if(query[k]!==undefined&&typeof query[k]!=='string')fail('Invalid report filter.');f[k]=query[k]||'';}
  if((f.from&&!validDate(f.from))||(f.to&&!validDate(f.to))||(f.from&&f.to&&f.from>f.to))fail('Invalid date range.');
  const [courses,teachers,students,enrollments,assignments,batches]=await Promise.all([Course.find().lean(),Teacher.find().populate('user','name').lean(),Student.find().populate('user','name').lean(),Enrollment.find().populate('course','title name').lean(),Assignment.find().lean(),Batch.find().lean()]);
  const courseFor=id=>courses.find(c=>String(c._id)===String(id));
  const teacherFor=id=>teachers.find(t=>String(t._id)===String(id));
  const studentFor=id=>students.find(s=>String(s._id)===String(id));
  const teacherFields=id=>{const t=teacherFor(id);return {teacherKey:String(id||''),teacher:t?.user?.name||'Not assigned',teacherId:t?.teacherId||''};};
  const common=(course,batch,year,teacher)=>({courseKey:String(course||''),course:label(courseFor(course)),batch:batch||'',academicYear:year||'',...teacherFields(teacher)});
  let rows=[],cards={},charts=[];
  if(['activities','exams','upcoming'].includes(type)) {
    const [exams,quizzes,er,qr]=await Promise.all([Exam.find().lean(),Quiz.find().lean(),ExamResult.find().lean(),QuizResult.find().lean()]);
    const activities=[...exams.map(a=>({...a,kind:'exam',date:a.examDate})),...quizzes.map(a=>({...a,kind:'quiz',type:'quiz',date:a.quizDate}))];
    rows=activities.map(a=>{
      const assigned=teachers.find(t=>String(t.user?._id)===String(a.createdBy))||teacherFor(assignments.find(t=>String(t.course)===String(a.course)&&t.academicYear===a.academicYear&&t.status==='active')?.teacher);
      const cohort=enrollments.filter(e=>String(e.course?._id)===String(a.course)&&e.academicYear===a.academicYear&&(!a.batch||e.batch===a.batch)&&(!a.semester||!e.semester||e.semester===a.semester)&&e.status!=='dropped');
      const ids=new Set(cohort.map(e=>String(e.student))),results=a.kind==='exam'?er:qr;
      const participated=new Set(results.filter(r=>String(r[a.kind])===String(a._id)&&ids.has(String(r.student))&&Number.isFinite(r.marksObtained)).map(r=>String(r.student))).size;
      return {...common(a.course,a.batch,a.academicYear,assigned?._id),title:a.title,assessmentType:a.type||'exam',totalMarks:a.totalMarks,date:day(a.date),time:a.startTime||'',status:a.status,visibility:a.visibleToStudents?'Visible':'Hidden',participated,notParticipated:Math.max(0,ids.size-participated)};
    });
    if(type==='exams')rows=rows.filter(r=>!['assignment','assessment','other'].includes(r.assessmentType));
    if(type==='upcoming')rows=rows.filter(r=>!['completed','cancelled','draft'].includes(r.status)&&r.date>=teachingDay());
  } else if(type==='dropped') {
    const seen=new Set();
    for(const e of enrollments){const s=studentFor(e.student);if(!s||!(e.status==='dropped'||['dropped','inactive'].includes(s.status)))continue;seen.add(String(s._id));rows.push({...common(e.course?._id,e.batch||s.batch,e.academicYear),student:s.user?.name||'Unavailable student',studentId:s.studentId,date:day(e.droppedAt||s.droppedAt),status:e.status==='dropped'?'dropped':s.status});}
    for(const s of students.filter(s=>['dropped','inactive'].includes(s.status)&&!seen.has(String(s._id))))rows.push({...common(null,s.batch,s.academicYear),student:s.user?.name||'Unavailable student',studentId:s.studentId,date:day(s.droppedAt),status:s.status});
  } else if(type==='contracts') {
    rows=await Promise.all((await Contract.find().lean()).map(async c=>{const balance=await summary(c);return {...common(c.course,c.batch,c.academicYear,c.teacher),date:c.startDate,endDate:c.endDate||'',totalDays:balance.totalContractDays,completedDays:balance.completedTeachingDays,remainingDays:balance.remainingContractDays,progress:balance.progress,status:balance.contractStatus};}));
  } else if(type==='outlines') {
    const [outlines,lessons]=await Promise.all([Outline.find().lean(),Lesson.find().lean()]);
    for(const o of outlines){const items=lessons.filter(l=>String(l.outline)===String(o._id));for(const l of items)rows.push({...common(o.course,o.batch,o.academicYear,o.teacher),outline:o.title,title:l.title,date:l.plannedDate,completionDate:l.completedDay||'',status:l.status==='completed'?'Completed':l.plannedDate<teachingDay()?'Missed':'Planned',progress:items.length?Math.round(items.filter(l=>l.status==='completed').length/items.length*100):0});if(!items.length)rows.push({...common(o.course,o.batch,o.academicYear,o.teacher),outline:o.title,title:'No lessons',date:day(o.createdAt),status:'Empty',progress:0});}
    for(const l of lessons.filter(l=>!l.outline))rows.push({...common(l.course,l.batch,'',l.teacher),outline:'Contract lessons',title:l.title,date:l.plannedDate,completionDate:l.completedDay||'',status:l.status==='completed'?'Completed':l.plannedDate<teachingDay()?'Missed':'Planned'});
  } else if(type==='makeup') {
    rows=(await Makeup.find().populate('lesson','title status').lean()).map(m=>({...common(m.course,m.batch,m.academicYear,m.teacher),title:m.lesson?.title||'Unavailable lesson',originalDate:m.originalDate,date:day(m.start),start:new Date(m.start).toISOString(),end:new Date(m.end).toISOString(),reason:m.reason,status:m.status==='cancelled'?'Cancelled':m.lesson?.status==='completed'?'Completed':'Scheduled'}));
  } else if(type==='progress') {
    for(const s of students){const p=await getStudentProgress(s._id,{publishedOnly:true});for(const a of p.activities){const c=p.courses.find(c=>String(c.courseId)===String(a.courseId)&&c.batch===a.batch&&c.academicYear===a.academicYear);const teacher=assignments.find(t=>String(t.course)===String(a.courseId)&&t.academicYear===a.academicYear&&t.status==='active');rows.push({...common(a.courseId,a.batch,a.academicYear,teacher?.teacher),student:s.user?.name||'',studentId:s.studentId,title:a.title,assessmentType:a.type,totalMarks:a.totalMarks,studentMarks:a.marks,date:day(a.date),status:a.status,courseTeacherMarks:c?.teacherMarks,courseAttendanceMarks:c?.attendanceMarks,courseFinalMarks:c?.finalMarks,legacyNormalization:c?.legacyNormalization?'Legacy scores normalized to 90':'No'});}}
  } else if(type==='attendance') {
    rows=(await Attendance.find().sort({updatedAt:1}).lean()).map(a=>{const s=studentFor(a.student),e=enrollments.find(e=>String(e.student)===String(a.student)&&String(e.course?._id)===String(a.course));return {...common(a.course,e?.batch||s?.batch,e?.academicYear||s?.academicYear),student:s?.user?.name||'Unavailable student',studentId:s?.studentId||'',studentKey:String(a.student),date:day(a.date),status:a.status};});
    rows=[...new Map(rows.map(r=>[r.studentKey+':'+r.courseKey+':'+r.date,r])).values()];
  } else if(type==='batches') {
    rows=batches.map(b=>{const cohort=enrollments.filter(e=>e.academicYear===b.academicYear&&e.batch===b.name&&e.status==='enrolled');return {batch:b.name,academicYear:b.academicYear,date:day(b.createdAt),status:b.status,enrolledStudents:new Set(cohort.map(e=>String(e.student))).size,courses:new Set(cohort.map(e=>String(e.course?._id))).size};});
  }
  const contractsForTeacher = f.teacher ? await Contract.find({teacher:f.teacher,status:'active'}).sort({createdAt:-1,_id:-1}).lean() : [];
  const teacherScopes = [
    ...assignments.filter(a=>String(a.teacher)===f.teacher&&a.status==='active').map(a=>({course:String(a.course),academicYear:a.academicYear,batch:a.batch||''})),
    ...contractsForTeacher.map(c=>({course:String(c.course),academicYear:c.academicYear,batch:c.batch||''})),
    ...rows.filter(r=>r.teacherKey===f.teacher).map(r=>({course:r.courseKey,academicYear:r.academicYear,batch:r.batch})),
  ];
  const scopedCourses = f.teacher ? courses.filter(c=>teacherScopes.some(scope=>scope.course===String(c._id))) : courses;
  const matchingScopes = teacherScopes.filter(scope=>!f.course||scope.course===f.course);
  const scopedEnrollments = enrollments.filter(e=>matchingScopes.some(scope=>scope.course===String(e.course?._id)&&(!scope.academicYear||scope.academicYear===e.academicYear)&&(!scope.batch||scope.batch===e.batch)));
  const optionBatches = f.teacher ? [...new Set([...matchingScopes.map(scope=>scope.batch),...scopedEnrollments.map(e=>e.batch)].filter(Boolean))].sort() : [...new Set([...batches.map(b=>b.name),...enrollments.map(e=>e.batch).filter(Boolean)])];
  const optionYears = f.teacher ? [...new Set([...matchingScopes.map(scope=>scope.academicYear),...scopedEnrollments.map(e=>e.academicYear)].filter(Boolean))].sort() : [...new Set([...batches.map(b=>b.academicYear),...enrollments.map(e=>e.academicYear)])].sort();
  rows=rows.filter(r=>(!f.teacher||r.teacherKey===f.teacher)&&(!f.course||r.courseKey===f.course)&&(!f.batch||r.batch===f.batch)&&(!f.academicYear||r.academicYear===f.academicYear)&&(!f.status||String(r.status).toLowerCase()===f.status.toLowerCase())&&(!f.assessmentType||r.assessmentType===f.assessmentType)&&(!f.from||(r.date&&r.date>=f.from))&&(!f.to||(r.date&&r.date<=f.to)));
  cards={Records:rows.length};
  if(['activities','exams','upcoming'].includes(type))cards={Exams:rows.filter(r=>!['quiz','assessment','assignment','other'].includes(r.assessmentType)).length,Quizzes:rows.filter(r=>r.assessmentType==='quiz').length,Assessments:rows.filter(r=>['assessment','assignment','other'].includes(r.assessmentType)).length,Upcoming:rows.filter(r=>r.date>=teachingDay()&&!['completed','cancelled','draft'].includes(r.status)).length,Completed:rows.filter(r=>r.status==='completed').length};
  if(type==='progress')cards={Assigned:rows.length,Completed:rows.filter(r=>r.status==='Completed').length,Pending:rows.filter(r=>['Pending','Missed'].includes(r.status)).length,Upcoming:rows.filter(r=>r.status==='Upcoming').length};
  if(type==='outlines')cards={'Lesson records':rows.filter(r=>r.status!=='Empty').length,Completed:rows.filter(r=>r.status==='Completed').length,Missed:rows.filter(r=>r.status==='Missed').length,Planned:rows.filter(r=>r.status==='Planned').length};
  if(type==='dropped')cards={'Total dropped students':new Set(rows.map(r=>r.studentId)).size};
  if(type==='makeup')cards={'Total classes':rows.length,Scheduled:rows.filter(r=>r.status==='Scheduled').length,Completed:rows.filter(r=>r.status==='Completed').length,Cancelled:rows.filter(r=>r.status==='Cancelled').length};
  if(type==='attendance') {
    const present=rows.filter(r=>r.status==='present'),absent=rows.filter(r=>r.status==='absent'),eligible=rows.filter(r=>r.status!=='excused');
    const eligibleEnrollments=enrollments.filter(e=>e.status==='enrolled'&&(!f.course||String(e.course?._id)===f.course)&&(!f.batch||e.batch===f.batch)&&(!f.academicYear||e.academicYear===f.academicYear));
    cards={'Enrolled students':new Set(eligibleEnrollments.map(e=>String(e.student))).size,'Present students':new Set(present.map(r=>r.studentKey)).size,'Absent students':new Set(absent.map(r=>r.studentKey)).size,'Recorded sessions':rows.length,'Present sessions':present.length,'Absent sessions':absent.length,'Attendance %':eligible.length?Math.round(present.length/eligible.length*10000)/100:0,'Attendance marks /10':eligible.length?Math.round(present.length/eligible.length*1000)/100:0};
    charts=['present','absent','late','excused'].map(status=>({label:status,count:rows.filter(r=>r.status===status).length}));
  }
  // Internal filter keys are not exposed as report columns.
  rows=rows.map(({courseKey,teacherKey,studentKey,...row})=>row);
  const yearBatches = [...new Map((f.teacher ? [...matchingScopes,...scopedEnrollments.map(e=>({academicYear:e.academicYear,batch:e.batch}))] : [...batches.map(b=>({academicYear:b.academicYear,batch:b.name})),...enrollments.map(e=>({academicYear:e.academicYear,batch:e.batch}))]).filter(pair=>pair.academicYear&&pair.batch).map(pair=>[JSON.stringify([pair.academicYear,pair.batch]),{academicYear:pair.academicYear,batch:pair.batch}])).values()].sort((a,b)=>b.academicYear.localeCompare(a.academicYear)||a.batch.localeCompare(b.batch));
  const defaultScope = teacherScopes.find(scope=>scope.course&&scope.academicYear&&scope.batch&&scopedCourses.some(course=>String(course._id)===scope.course)) || teacherScopes.find(scope=>scope.course&&scopedCourses.some(course=>String(course._id)===scope.course));
  const defaultCourse = defaultScope?.course || String(scopedCourses[0]?._id || '');
  const defaultPair = yearBatches.find(pair=>pair.academicYear===defaultScope?.academicYear&&pair.batch===defaultScope?.batch) || yearBatches[0];
  const teacherDefault = f.teacher ? {course:defaultCourse,academicYear:defaultPair?.academicYear||defaultScope?.academicYear||'',batch:defaultPair?.batch||''} : null;
  return {rows,cards,charts,options:{courses:scopedCourses.map(c=>({_id:c._id,name:label(c)})),teachers:teachers.map(t=>({_id:t._id,name:t.user?.name||t.teacherId})),batches:optionBatches,academicYears:optionYears,yearBatches,teacherDefault},filters:f};
}
module.exports={getReport,types};
