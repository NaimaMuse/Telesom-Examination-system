const Attendance = require('../models/Attendance');
const assert = require('assert');
const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname,'../.env') });
const { app } = require('../server');
const User=require('../models/User'), Teacher=require('../models/Teacher'), Student=require('../models/Student'), Course=require('../models/Course'), CourseTeacher=require('../models/CourseTeacher'), Enrollment=require('../models/Enrollment'), Exam=require('../models/Exam'), Quiz=require('../models/Quiz'), ExamResult=require('../models/ExamResult'), QuizResult=require('../models/QuizResult');
const token=require('../utils/generateToken');
const run=async()=>{
 await mongoose.connect(process.env.MONGODB_URI,{serverSelectionTimeoutMS:5000});
 const marker='perf-'+new mongoose.Types.ObjectId(),users=[],courses=[],students=[];let teacher,server;
 try{
  for(const role of ['teacher','student','student']) users.push(await User.create({name:role==='teacher'?'Performance Teacher':`Student ${users.length}`,email:`${marker}-${users.length}@example.test`,role,...(role==='teacher'?{password:'test-password-hash'}:{})}));
  teacher=await Teacher.create({user:users[0]._id,teacherId:marker});
  for(let i=0;i<3;i++)courses.push(await Course.create({title:`${marker} course ${i}`,courseCode:`${marker}-${i}`}));
  for(const course of courses.slice(0,2))await CourseTeacher.create({teacher:teacher._id,course:course._id,academicYear:'2026-2027'});
  for(let i=0;i<2;i++)students.push(await Student.create({user:users[i+1]._id,studentId:`${marker}-${i}`,gender:'male'}));
  await Enrollment.create([{student:students[0]._id,course:courses[0]._id,academicYear:'2026-2027'},{student:students[0]._id,course:courses[0]._id,academicYear:'2025-2026'},{student:students[0]._id,course:courses[1]._id,academicYear:'2026-2027'},{student:students[1]._id,course:courses[2]._id,academicYear:'2026-2027'}]);
  server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
  const base=`http://127.0.0.1:${server.address().port}/api`;
  const request=async(path,method='GET',body)=>{const response=await fetch(base+path,{method,headers:{Authorization:`Bearer ${token(users[0]._id)}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return{status:response.status,data:await response.json()};};
  const assessmentIds=[];
  for(const [i,total] of [10,10,30,50].entries()){
   const type=i<2?'quiz':'exam';const result=await request(type==='quiz'?'/quizzes':'/teacher/exams','POST',{title:`${marker} assessment ${i}`,course:courses[0]._id,totalMarks:total,passingMarks:total/2,quizCode:`${marker}-${i}`,quizDate:new Date()});
   assert.strictEqual(result.status,201,JSON.stringify(result.data));assessmentIds.push({type,id:result.data.data._id});
  }
  let result=await request('/teacher/performance?courseId='+courses[0]._id);assert.strictEqual(result.status,200);assert.strictEqual(result.data.allocation.allocatedMarks,100);assert.strictEqual(result.data.summary.classAverage,null);assert.strictEqual(result.data.students.length,1);
  for(const [i,marks] of [8,9,25,45].entries()){
   const a=assessmentIds[i];result=await request(`/teacher/results/${a.type}/${a.id}`,'PUT',{results:[{studentId:students[0]._id,marksObtained:marks}]});assert.strictEqual(result.status,200,JSON.stringify(result.data));
   assert.strictEqual((await (a.type === 'exam' ? Exam : Quiz).findById(a.id).lean()).status, 'completed', 'Saving every student result completes the assessment');
  }
  result=await request('/teacher/performance?courseId='+courses[0]._id);assert.strictEqual(result.data.summary.classAverage,87);assert.strictEqual(result.data.summary.highestScore,87);assert.strictEqual(result.data.summary.passingStudents,1);assert.strictEqual(result.data.students[0].marksLost,13);assert.strictEqual(result.data.results[0].student,'Student 1');assert.ok(result.data.results.every(r=>r.assessmentName));
  result=await request('/teacher/performance?courseId='+courses[0]._id+'&assessmentType=quiz');assert.strictEqual(result.data.results.length,2);assert.strictEqual(result.data.summary.classAverage,87);
  result=await request('/teacher/performance?courseId='+courses[0]._id+'&assessmentId='+encodeURIComponent('quiz:'+assessmentIds[0].id));assert.strictEqual(result.data.results.length,1);assert.strictEqual(result.data.results[0].percentage,80);assert.strictEqual(result.data.students[0].totalMarks,87);
  result=await request('/teacher/performance?courseId='+courses[0]._id+'&search=missing');assert.strictEqual(result.data.results.length,0);assert.strictEqual(result.data.summary.classAverage,87);
  assert.strictEqual((await request('/teacher/performance?courseId='+courses[2]._id)).status,403);
  assert.strictEqual((await request('/teacher/exams','POST',{course:courses[0]._id,title:'Over 100',totalMarks:1,passingMarks:0})).status,400);
  result=await request('/quiz-results','POST',{quiz:assessmentIds[0].id,student:students[1]._id,marksObtained:8});assert.strictEqual(result.status,403);
  result=await request(`/teacher/results/quiz/${assessmentIds[0].id}`,'PUT',{results:[{studentId:students[0]._id,marksObtained:11}]});assert.strictEqual(result.status,400);
  result=await request(`/teacher/results/quiz/${assessmentIds[0].id}`,'PUT',{results:[{studentId:students[0]._id,marksObtained:7}]});assert.strictEqual(result.status,200);
  result=await request('/teacher/performance?courseId='+courses[0]._id);assert.strictEqual(result.data.summary.classAverage,86);
  // Second assigned course also works in the existing Gradebook.
  result=await request('/teacher/exams','POST',{course:courses[1]._id,title:'Second course',totalMarks:20});assert.strictEqual(result.status,201);assert.strictEqual(result.data.data.passingMarks,10);const secondId=result.data.data._id;
  result=await request(`/teacher/results/exam/${secondId}`,'PUT',{results:[{studentId:students[0]._id,marksObtained:15}]});assert.strictEqual(result.status,200,JSON.stringify(result.data));
  result=await request('/teacher/performance?courseId='+courses[1]._id);assert.strictEqual(result.data.students[0].totalMarks,15);assert.strictEqual(result.data.summary.failingStudents,0);assert.strictEqual(result.data.summary.highestScore,15);
  result=await request('/quizzes','POST',{course:courses[1]._id,title:'Low max quiz',totalMarks:10,quizCode:marker+'-small',quizDate:new Date()});assert.strictEqual(result.status,201);assert.strictEqual(result.data.data.passingMarks,5);
  const attempts=await Promise.all([1,2].map(i=>request('/teacher/exams','POST',{course:courses[1]._id,title:`Concurrent ${i}`,totalMarks:50,passingMarks:25})));assert.strictEqual(attempts.filter(r=>r.status===201).length,1);
  const foreign=await Exam.create({course:courses[2]._id,title:'Foreign exam',totalMarks:100,passingMarks:50});await ExamResult.create({exam:foreign._id,student:students[1]._id,marksObtained:90});
  result=await request('/exam-results');assert.strictEqual(result.status,200);assert.ok(result.data.data.every(row=>row.student.studentId===students[0].studentId));
  const score=await QuizResult.findOne({quiz:assessmentIds[0].id,student:students[0]._id});result=await request('/quiz-results/'+score._id,'DELETE');assert.strictEqual(result.status,200);
  result=await request('/teacher/performance?courseId='+courses[0]._id);assert.strictEqual(result.data.students[0].totalMarks,79);assert.strictEqual(result.data.summary.passingStudents,0);assert.strictEqual(result.data.summary.failingStudents,0);
  result=await request('/teacher/exams/'+assessmentIds[3].id,'DELETE');assert.strictEqual(result.status,200);
  result=await request('/teacher/performance?courseId='+courses[0]._id);assert.strictEqual(result.data.allocation.allocatedMarks,50);assert.strictEqual(result.data.students[0].totalMarks,34);assert.strictEqual(result.data.allocation.remainingMarks,50);
  const batchUser=await User.create({name:'Batch Student',email:marker+'-batch@example.test',role:'student'});users.push(batchUser);
  const batchStudent=await Student.create({user:batchUser._id,studentId:marker+'-batch',gender:'female',academicYear:'2024-2025'});students.push(batchStudent);
  await Enrollment.create({student:batchStudent._id,course:courses[0]._id,academicYear:'2026-2027'});
  result=await request('/quiz-results','POST',{quiz:assessmentIds[1].id,student:batchStudent._id,marksObtained:6});assert.strictEqual(result.status,201);
  const performancePath='/teacher/performance?courseId='+courses[0]._id;
  result=await request(performancePath+'&batch=2024-2025');assert.strictEqual(result.status,200);assert.strictEqual(result.data.students.length,1);assert.strictEqual(result.data.students[0].student,'Batch Student');assert.strictEqual(result.data.students[0].totalMarks,6);assert.strictEqual(result.data.summary.classAverage,6);assert.ok(result.data.batches.includes('2024-2025'));
  result=await request(performancePath+'&batch=2026-2027');assert.strictEqual(result.data.students.length,1);assert.strictEqual(result.data.students[0].student,'Student 1');assert.strictEqual(result.data.summary.classAverage,34);
  result=await request(performancePath+'&batch=2024-2025&assessmentId='+encodeURIComponent('quiz:'+assessmentIds[1].id));assert.strictEqual(result.data.students.length,1);assert.strictEqual(result.data.students[0].filteredMarks,6);assert.strictEqual(result.data.students[0].filteredMaximum,10);assert.strictEqual(result.data.students[0].assessmentResults.length,1);assert.ok(result.data.students[0].courseName);
  result=await request(performancePath+'&batch=2024-2025&assessmentId='+encodeURIComponent('exam:'+assessmentIds[2].id));assert.strictEqual(result.data.students.length,0);assert.strictEqual(result.data.summary.classAverage,6);
  result=await request(performancePath+'&batch=unknown-batch');assert.strictEqual(result.data.students.length,0);assert.strictEqual(result.data.summary.recordedStudents,0);
  const preserved = await QuizResult.findOne({quiz:assessmentIds[1].id,student:students[0]._id}).lean();
  result=await request('/teacher/results/quiz/'+assessmentIds[1].id,'PUT',{results:[{studentId:batchStudent._id,marksObtained:0}]});
  assert.strictEqual(result.status,200,JSON.stringify(result.data));assert.strictEqual(result.data.savedCount,1);
  assert.strictEqual((await QuizResult.findOne({quiz:assessmentIds[1].id,student:batchStudent._id}).lean()).marksObtained,0);
  assert.strictEqual((await QuizResult.findOne({quiz:assessmentIds[1].id,student:students[0]._id}).lean()).marksObtained,preserved.marksObtained,'Omitted students keep their saved scores');
  result=await request('/teacher/results/quiz/'+assessmentIds[1].id,'PUT',{results:[]});assert.strictEqual(result.status,400);
  const dashboardBefore=await request('/teacher/dashboard');assert.strictEqual(dashboardBefore.status,200);
  const embeddedQuiz=await request('/teacher/exams','POST',{title:marker+' embedded quiz',course:courses[0]._id,type:'quiz',totalMarks:5,examDate:new Date(Date.now()+86400000).toISOString(),status:'scheduled'});
  assert.strictEqual(embeddedQuiz.status,201,JSON.stringify(embeddedQuiz.data));
  const dashboardAfter=await request('/teacher/dashboard');assert.strictEqual(dashboardAfter.status,200);
  assert.strictEqual(dashboardAfter.data.summary.totalQuizzes,dashboardBefore.data.summary.totalQuizzes+1,'Exam-backed quizzes count in Total Quizzes');
  assert.strictEqual(dashboardAfter.data.summary.totalExams,dashboardBefore.data.summary.totalExams,'Quizzes do not inflate Total Exams');
  assert.ok(dashboardAfter.data.upcomingExams.some(row=>String(row._id)===String(embeddedQuiz.data.data._id)));
  result=await request('/reports/assessment-overview');assert.strictEqual(result.status,403,'Teacher cannot access admin overview');
  const overviewAdmin=await User.create({name:'Overview Admin',email:marker+'-overview-admin@example.test',role:'admin',password:'SecureTest123!'});users.push(overviewAdmin);
  const overviewResponse=await fetch(base+'/reports/assessment-overview',{headers:{Authorization:'Bearer '+token(overviewAdmin._id)}});
  assert.strictEqual(overviewResponse.status,200);const overview=await overviewResponse.json();
  const quizOverview=overview.data.find(row=>row.key==='quiz:'+assessmentIds[1].id);
  assert.ok(quizOverview);assert.strictEqual(quizOverview.enrolledCount,2);assert.strictEqual(quizOverview.gradedCount,2,'Zero scores included in graded count');
  assert.ok(quizOverview.batches.includes('2024-2025'));assert.strictEqual(quizOverview.batchStats.find(row=>row.batch==='2024-2025').graded,1);
  assert.ok(overview.courses.some(row=>String(row._id)===String(courses[2]._id)),'Course without assessments included in dropdown');
  assert.ok(overview.teachers.some(row=>String(row._id)===String(users[0]._id)));
  assert.ok(quizOverview.createdBy.name);assert.ok(quizOverview.course.title);
  assert.ok(overview.data.some(row=>row.key==='exam:'+embeddedQuiz.data.data._id),'Exam-backed quizzes included');
  const foreignExam=await Exam.create({title:marker+' private exam',course:courses[2]._id,totalMarks:5});
  const foreignQuiz=await Quiz.create({title:marker+' private quiz',course:courses[2]._id,totalMarks:5,quizCode:marker+'-private',quizDate:new Date()});
  for(const [path, record] of [['/exams',foreignExam],['/quizzes',foreignQuiz]]) {
    result=await request(path);assert.strictEqual(result.status,200);assert.ok(!result.data.data.some(row=>String(row._id)===String(record._id)),'Unassigned course hidden');
    result=await request(path+'?course='+courses[2]._id);assert.strictEqual(result.status,200);assert.strictEqual(result.data.data.length,0,'Query cannot bypass assignment scope');
    result=await request(path+'/'+record._id);assert.strictEqual(result.status,403,'Direct record access blocked');
  }
  const freshUser=await User.create({name:'New Teacher',email:marker+'-fresh@example.test',role:'teacher',password:'SecureTest123!'});users.push(freshUser);
  const freshTeacher=await Teacher.create({user:freshUser._id,teacherId:marker+'-fresh'});
  try {
    const optionsResponse=await fetch(base+'/reports/assessment-overview',{headers:{Authorization:'Bearer '+token(overviewAdmin._id)}});
    const options=await optionsResponse.json();assert.ok(options.teachers.some(row=>String(row._id)===String(freshUser._id)),'Teacher without assessments included in dropdown');
    for(const path of ['/exams','/quizzes']) {const response=await fetch(base+path,{headers:{Authorization:'Bearer '+token(freshUser._id)}});assert.strictEqual(response.status,200);assert.strictEqual((await response.json()).data.length,0,'New unassigned teacher sees no previous teacher data');}
    await CourseTeacher.create({teacher:freshTeacher._id,course:courses[2]._id,academicYear:'2026-2027'});
    const response=await fetch(base+'/exams',{headers:{Authorization:'Bearer '+token(freshUser._id)}});const payload=await response.json();assert.ok(payload.data.some(row=>String(row._id)===String(foreignExam._id)));assert.ok(payload.data.every(row=>String(row.course._id)===String(courses[2]._id)));
  } finally {await CourseTeacher.deleteMany({teacher:freshTeacher._id});await Teacher.deleteOne({_id:freshTeacher._id});}
  result=await request('/reports/marks-overview');assert.strictEqual(result.status,403,'Marks overview is admin-only');
  const marksResponse=await fetch(base+'/reports/marks-overview',{headers:{Authorization:'Bearer '+token(overviewAdmin._id)}});assert.strictEqual(marksResponse.status,200);const marksOverview=await marksResponse.json();
  const adminStudent=marksOverview.students.find(row=>String(row._id)===String(students[0]._id)&&String(row.courseId)===String(courses[0]._id));
  assert.ok(adminStudent);assert.ok(adminStudent.assessmentResults.length);assert.strictEqual(adminStudent.totalMarks,adminStudent.assessmentResults.reduce((sum,row)=>sum+row.marks,0));
  assert.ok(marksOverview.students.some(row=>String(row._id)===String(batchStudent._id)&&row.assessmentResults.some(result=>result.marks===0)),'Zero results preserved');
  assert.ok(marksOverview.assessments.length);assert.ok(marksOverview.teachers.some(t=>String(t._id)===String(users[0]._id)));assert.ok(marksOverview.batches.includes('2024-2025'));
  result=await request('/attendance/register?course='+courses[0]._id+'&date=2026-10-25');assert.strictEqual(result.status,403,'Attendance register is admin-only');
  const attendanceRequest=async(path,method='GET',body)=>{const response=await fetch(base+'/attendance'+path,{method,headers:{Authorization:'Bearer '+token(overviewAdmin._id),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,data:await response.json()};};
  let attendance=await attendanceRequest('/register?course='+courses[0]._id+'&date=2026-10-25');assert.strictEqual(attendance.status,200);assert.strictEqual(attendance.data.students.length,2);assert.ok(attendance.data.students.every(s=>s.status===''));
  attendance=await attendanceRequest('/register?course='+courses[0]._id+'&date=2026-10-25&batch=2024-2025');assert.strictEqual(attendance.data.students.length,1);assert.strictEqual(attendance.data.students[0].studentId,batchStudent.studentId);
  const attendanceBody={course:String(courses[0]._id),date:'2026-10-25',records:[{student:String(students[0]._id),status:'present',remarks:'On time'}]};
  attendance=await attendanceRequest('/register','PUT',attendanceBody);assert.strictEqual(attendance.status,200,JSON.stringify(attendance.data));assert.strictEqual(attendance.data.savedCount,1);
  attendanceBody.records[0].status='late';attendance=await attendanceRequest('/register','PUT',attendanceBody);assert.strictEqual(attendance.status,200);assert.strictEqual(await Attendance.countDocuments({course:courses[0]._id}),1,'Update does not duplicate attendance');
  attendance=await attendanceRequest('/register?course='+courses[0]._id+'&date=2026-10-25');assert.strictEqual(attendance.data.students.find(s=>String(s._id)===String(batchStudent._id)).status,'','Unmarked student remains unrecorded');
  attendance=await attendanceRequest('/register','PUT',{...attendanceBody,records:[{student:String(students[1]._id),status:'present'}]});assert.strictEqual(attendance.status,400,'Cross-course student blocked');
  attendance=await attendanceRequest('/register','PUT',{...attendanceBody,date:'2026-02-30'});assert.strictEqual(attendance.status,400,'Invalid dates blocked');
  attendance=await attendanceRequest('/register','PUT',{...attendanceBody,records:[...attendanceBody.records,...attendanceBody.records]});assert.strictEqual(attendance.status,400,'Duplicate submitted students blocked');
  for(const [date,status] of [['2026-10-26','absent'],['2026-10-27','excused']]){attendance=await attendanceRequest('/register','PUT',{...attendanceBody,date,records:[{student:String(students[0]._id),status}]});assert.strictEqual(attendance.status,200);}
  attendance=await attendanceRequest('/report?course='+courses[0]._id+'&from=2026-10-25&to=2026-10-27');assert.strictEqual(attendance.status,200);const attendanceStudent=attendance.data.students.find(s=>String(s._id)===String(students[0]._id));assert.strictEqual(attendanceStudent.attendanceRate,50);assert.strictEqual(attendanceStudent.excused,1);assert.strictEqual(attendanceStudent.history.length,3);assert.strictEqual(attendanceStudent.history[0].recordedBy,'Overview Admin');assert.strictEqual(attendance.data.students.find(s=>String(s._id)===String(batchStudent._id)).attendanceRate,null);
  result=await request('/reports/analytics');assert.strictEqual(result.status,403,'Analytics is admin-only');
  const analyticsResponse=await fetch(base+'/reports/analytics?course='+courses[0]._id+'&from=2026-10-25&to=2026-10-27',{headers:{Authorization:'Bearer '+token(overviewAdmin._id)}});assert.strictEqual(analyticsResponse.status,200);const analytics=await analyticsResponse.json();assert.strictEqual(analytics.summary.enrolledStudents,2);assert.strictEqual(analytics.summary.attendanceRate,50);assert.strictEqual(analytics.summary.attendanceRecords,3);assert.strictEqual(analytics.courses.length,1);assert.ok(analytics.options.courses.length);
  result=await request('/dashboard/admin');assert.strictEqual(result.status,403,'Admin dashboard rejects teacher access');
  const adminDashboardResponse=await fetch(base+'/dashboard/admin',{headers:{Authorization:'Bearer '+token(overviewAdmin._id)}});assert.strictEqual(adminDashboardResponse.status,200);const adminDashboard=(await adminDashboardResponse.json()).data;
  assert.strictEqual(adminDashboard.totals.students,await Student.countDocuments());assert.strictEqual(adminDashboard.totals.teachers,await Teacher.countDocuments());assert.strictEqual(adminDashboard.totals.courses,await Course.countDocuments());assert.strictEqual(adminDashboard.totals.assessments,await Exam.countDocuments()+await Quiz.countDocuments());assert.ok(adminDashboard.recentStudents.some(s=>String(s._id)===String(batchStudent._id)));assert.ok(adminDashboard.recentStudents.every(s=>s.name&&s.studentId));
  console.log('Performance HTTP integration passed: shared gradebook marks, 87/100, update/delete recalculation, course isolation, filters, multiple assignments, batch cohorts, participant rows, popup records and concurrent allocation cap.');
 }finally{
  if(server)await new Promise(resolve=>server.close(resolve));
  const ids=courses.map(c=>c._id),studentIds=students.map(s=>s._id);
  await Attendance.deleteMany({course:{$in:ids}});
  await ExamResult.deleteMany({student:{$in:studentIds}});await QuizResult.deleteMany({student:{$in:studentIds}});
  await Exam.deleteMany({course:{$in:ids}});await Quiz.deleteMany({course:{$in:ids}});await Enrollment.deleteMany({course:{$in:ids}});await CourseTeacher.deleteMany({course:{$in:ids}});
  if(teacher)await Teacher.deleteOne({_id:teacher._id});await Student.deleteMany({_id:{$in:studentIds}});await Course.deleteMany({_id:{$in:ids}});await User.deleteMany({_id:{$in:users.map(u=>u._id)}});await mongoose.disconnect();
 }
};run().catch(async error=>{console.error(error);await mongoose.disconnect();process.exitCode=1;});
