// Starts an isolated local replica set; never connects to or changes the application database.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawn}=require('node:child_process'),mongoose=require('mongoose');
require('dotenv').config({path:path.join(__dirname,'../.env')});
const mongod=process.env.TEST_MONGOD||'C:/Program Files/MongoDB/Server/8.3/bin/mongod.exe';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'telesom-evaluations-'));const port=Number(process.env.TEST_MONGO_PORT||27931);let child,server;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 child=spawn(mongod,['--dbpath',dir,'--port',String(port),'--bind_ip','127.0.0.1','--replSet','evaluationTest','--logpath',path.join(dir,'mongo.log')],{windowsHide:true,stdio:'ignore'});child.on('error',e=>console.error(e.message));
 let client;for(let i=0;i<30;i++){try{client=await mongoose.mongo.MongoClient.connect(`mongodb://127.0.0.1:${port}/?directConnection=true`,{serverSelectionTimeoutMS:500});break;}catch(e){if(i===29)throw e;await delay(300);}}
 await client.db('admin').command({replSetInitiate:{_id:'evaluationTest',members:[{_id:0,host:`127.0.0.1:${port}`}]}});for(let i=0;i<60;i++){if((await client.db('admin').command({hello:1})).isWritablePrimary)break;await delay(300);}await client.close();
 await mongoose.connect(`mongodb://127.0.0.1:${port}/evaluation_test?replicaSet=evaluationTest`);
 const User=require('../models/User'),Student=require('../models/Student'),Course=require('../models/Course'),Enrollment=require('../models/Enrollment');const {Form,Response,Notice}=require('../models/Evaluation');
 await Promise.all([User,Student,Course,Enrollment,Form,Response,Notice].map(m=>m.init()));
 const {app}=require('../server'),token=require('../utils/generateToken');server=app.listen(0);await new Promise(r=>server.on('listening',r));const base=`http://127.0.0.1:${server.address().port}/api`;
 const admin=await User.create({name:'Admin Test',email:'admin@eval.test',role:'admin',password:'hashed-test-password'});
 const users=[],students=[];for(let i=0;i<4;i++){const u=await User.create({name:'Student '+i,email:`student${i}@eval.test`,role:'student'});users.push(u);students.push(await Student.create({user:u._id,studentId:'EVAL-'+i,gender:'female'}));}
 const course=await Course.create({name:'Evaluation Course',durationWeeks:16});for(const s of students.slice(0,3))await Enrollment.create({student:s._id,course:course._id,academicYear:'2026'});
 async function req(method,p,body,user=admin){const r=await fetch(base+p,{method,headers:{Authorization:'Bearer '+token(user._id),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,data:r.status===204?null:await r.json()};}
 function ok(r,status=200){assert.equal(r.status,status,JSON.stringify(r.data));return r.data;}
 const eligible=ok(await req('GET','/evaluations/eligible/'+course._id));assert.equal(eligible.total,3);
 let f=ok(await req('POST','/evaluations',{course:course._id,title:'Course feedback'}),201).form;
 const questions=[{key:'q1',title:'Overall',type:'scale',max:5,options:[],description:'',required:true}];
 f=ok(await req('PUT','/evaluations/'+f._id,{...f,questions,assignAll:true,allowEdit:true,responseLimit:2})).form;
 assert.equal(f.students.length,3);ok(await req('GET','/evaluations/'+f._id,null,users[0]),403);
 f=ok(await req('POST',`/evaluations/${f._id}/publish`)).form;ok(await req('POST',`/evaluations/${f._id}/publish`));assert.equal(await Notice.countDocuments({form:f._id}),3);
 assert.equal(ok(await req('GET','/evaluations',null,users[3])).total,0);ok(await req('GET','/evaluations/'+f._id,null,users[3]),403);
 assert.ok(ok(await req('GET','/notifications',null,users[0])).notifications.some(n=>n.type==='evaluation'));
 ok(await req('GET','/evaluations/'+f._id,null,users[0]));assert.ok((await Notice.findOne({student:students[0]._id})).readAt);
 ok(await req('PUT',`/evaluations/${f._id}/response`,{answers:{},submit:true},users[0]),400);
 ok(await req('PUT',`/evaluations/${f._id}/response`,{answers:{q1:4},submit:false},users[0]));assert.equal((await Form.findById(f._id)).responseCount,0);
 const results=await Promise.all(users.slice(0,3).map(u=>req('PUT',`/evaluations/${f._id}/response`,{answers:{q1:4},submit:true},u)));assert.equal(results.filter(r=>r.status===200).length,2,JSON.stringify(results));assert.equal((await Form.findById(f._id)).responseCount,2);assert.equal(await Response.countDocuments({form:f._id,submittedAt:{$ne:null}}),2);
 const winner=results.findIndex(r=>r.status===200);const first=await Response.findOne({form:f._id,student:students[winner]._id});ok(await req('PUT',`/evaluations/${f._id}/response`,{answers:{q1:3},submit:true},users[winner]),409);
 f=ok(await req('GET','/evaluations/'+f._id)).form;f.responseLimit=3;f=ok(await req('PUT','/evaluations/'+f._id,f)).form;
 const edited=ok(await req('PUT',`/evaluations/${f._id}/response`,{answers:{q1:3},submit:true},users[winner])).response;assert.equal(String(edited._id),String(first._id));assert.equal(edited.submittedAt,first.submittedAt.toISOString());assert.ok(edited.editedAt);
 f=ok(await req('GET','/evaluations/'+f._id)).form;
 f=ok(await req('PUT','/evaluations/'+f._id,{...f,questions:[{...questions[0],title:'Changed'}]})).form;
 assert.equal(f.questions[0].title,'Changed');
 ok(await req('PUT','/evaluations/'+f._id,{...f,questions:[{...questions[0],key:'replacement'}]}),409);
 f=ok(await req('PUT','/evaluations/'+f._id,{...f,allowEdit:false})).form;ok(await req('PUT',`/evaluations/${f._id}/response`,{answers:{q1:3},submit:true},users[winner]),409);
 f=ok(await req('PUT','/evaluations/'+f._id,{...f,allowEdit:true,deadline:new Date(Date.now()-1000).toISOString()})).form;ok(await req('PUT',`/evaluations/${f._id}/response`,{answers:{q1:3},submit:true},users[winner]),409);
 f=ok(await req('PUT','/evaluations/'+f._id,{...f,allowClosedEdit:true})).form;ok(await req('PUT',`/evaluations/${f._id}/response`,{answers:{q1:2},submit:true},users[winner]));
 f=ok(await req('GET','/evaluations/'+f._id)).form;f=ok(await req('PUT','/evaluations/'+f._id,{...f,deadline:new Date(Date.now()+86400000).toISOString()})).form;ok(await req('POST',`/evaluations/${f._id}/close`));ok(await req('POST',`/evaluations/${f._id}/reopen`));
 const report=ok(await req('GET',`/evaluations/${f._id}/report`));assert.equal(report.submitted,2);assert.equal(report.pendingCount,1);assert.equal(report.completion,67);assert.equal(Object.values(report.stats[0].counts).reduce((a,b)=>a+b,0),2);
 ok(await req('GET',`/evaluations/${f._id}/report`,null,users[0]),403);ok(await req('POST','/evaluations',{course:course._id},users[0]),403);
 await assert.rejects(()=>Response.create({form:f._id,student:students[winner]._id,answers:{}}),e=>e.code===11000);
 const copy=ok(await req('POST',`/evaluations/${f._id}/duplicate`)).form;assert.equal(copy.responseCount,0);assert.equal(copy.status,'draft');
 ok(await req('DELETE','/evaluations/'+copy._id));assert.equal(await Form.countDocuments({_id:copy._id}),0);
 const secondCourse=await Course.create({name:'Second Evaluation Course',durationWeeks:16});
 await Enrollment.create({student:students[0]._id,course:secondCourse._id,academicYear:'2026'});
 await Enrollment.create({student:students[3]._id,course:secondCourse._id,academicYear:'2026'});
 assert.equal(ok(await req('GET','/evaluations/eligible/all')).total,4);
 let all=ok(await req('POST','/evaluations',{title:'All Courses Feedback',allCourses:true,questions}),201).form;
 all=ok(await req('PUT','/evaluations/'+all._id,{...all,assignAll:true})).form;
 assert.equal(all.students.length,4);
 ok(await req('POST','/evaluations/'+all._id+'/publish'));
 ok(await req('PUT','/evaluations/'+all._id+'/response',{answers:{q1:5},submit:true},users[3]));
 const defenseCourse=await Course.create({name:'Defense Course',durationWeeks:16,academicYear:'2026',batch:'cohort 6'});
 await Enrollment.insertMany([
   {course:defenseCourse._id,student:students[0]._id,academicYear:'2026',batch:'cohort 6'},
   {course:defenseCourse._id,student:students[1]._id,academicYear:'2026'},
   {course:defenseCourse._id,student:students[2]._id,academicYear:'2026',batch:'cohort 7'},
   {course:defenseCourse._id,student:students[3]._id,academicYear:'2025'},
 ]);
 const defenseEligible=ok(await req('GET',`/evaluations/eligible/${defenseCourse._id}?cohortName=cohort%206&cohortYear=2026`));
 assert.equal(defenseEligible.total,2);
 assert.deepEqual(defenseEligible.students.map(s=>s._id),students.slice(0,2).map(s=>String(s._id)));
 const teacher=await User.create({name:'Defense Teacher',email:'teacher@eval.test',role:'teacher',password:'hashed-test-password'});
 const judgeResponse=ok(await req('POST','/users/judges',{
   name:'Defense Judge',email:'judge@eval.test',password:'JudgePassword123!',
 }),201);
 const judge=await User.findById(judgeResponse.judge._id).select('+password');
 assert.equal(judge.role,'judge');
 assert.equal(await require('../utils/passwords').verifyPassword('JudgePassword123!',judge.password),true);
 assert.equal(judgeResponse.credentials.temporaryPassword,'JudgePassword123!');
 assert.equal(ok(await req('GET','/users/judges')).judges[0].email,'judge@eval.test');
 ok(await req('GET','/users/judges',null,judge),403);
 const exam=await require('../models/Exam').create({
   title:'Final Project',course:defenseCourse._id,totalMarks:50,examDate:new Date(),createdBy:teacher._id,
 });
 const defense={course:defenseCourse._id,cohort:'cohort 6',cohortYear:'2026',assessment:exam._id,assessmentType:'exam'};
 const teacherProfile=await require('../models/Teacher').create({user:teacher._id,teacherId:'DEFENSE-TEACHER'});
 await require('../models/CourseTeacher').create({teacher:teacherProfile._id,course:defenseCourse._id,academicYear:'2026'});
 assert.deepEqual(ok(await req('GET','/evaluations/courses',null,teacher)).courses.map(item=>item._id),[String(defenseCourse._id)]);
 assert.equal(ok(await req('GET','/evaluations/defenses/assessments',null,teacher)).assessments.length,1);
 assert.equal(ok(await req('GET','/evaluations/eligible/'+defenseCourse._id,null,teacher)).total,4);
 ok(await req('GET','/evaluations/eligible/'+secondCourse._id,null,teacher),403);
 ok(await req('GET','/evaluations/defenses/courses/'+secondCourse._id+'/groups',null,teacher),403);
 ok(await req('GET','/evaluations',null,teacher),403);
 ok(await req('GET','/evaluations/'+f._id,null,teacher),403);
 const teacherRubric=[{key:'s'+require('node:crypto').randomUUID(),title:'Demo',marks:50,
   questions:[{key:'q'+require('node:crypto').randomUUID(),title:'Explain the demo',marks:50}]}];
 const teacherForm={...defense,students:[],customRubric:teacherRubric,projectTotalMarks:90};
 ok(await req('POST','/evaluations/defenses',teacherForm,teacher),400);
 const alignedForm=ok(await req('POST','/evaluations/defenses',{...teacherForm,projectTotalMarks:50},teacher),201).record;
 assert.equal(alignedForm.projectTotalMarks,50);
 assert.equal(alignedForm.assessmentTotalMarks,50);
 const submittedForm=ok(await req('POST','/evaluations/defenses/'+alignedForm._id+'/submit',{__v:alignedForm.__v},teacher)).record;
 assert.ok(submittedForm.submittedAt);
 const adminNotices=ok(await req('GET','/notifications')).notifications;
 const submissionNotice=adminNotices.find(notice=>notice.id==='defense-submission:'+submittedForm._id);
 assert.equal(submissionNotice.href,'/admin/project-defenses/'+submittedForm._id);
 assert.ok(submissionNotice.title.includes('Defense Teacher'));
 assert.ok(!ok(await req('GET','/notifications',null,teacher)).notifications.some(notice=>notice.id===submissionNotice.id));
 ok(await req('POST','/evaluations/defenses/'+alignedForm._id+'/submit',{__v:alignedForm.__v},teacher));
 assert.equal(ok(await req('GET','/evaluations/defenses/'+alignedForm._id)).record.submittedAt,submittedForm.submittedAt);
 ok(await req('PUT','/evaluations/defenses/'+alignedForm._id,{...submittedForm},teacher),409);
 ok(await req('DELETE','/evaluations/defenses/'+alignedForm._id,{__v:submittedForm.__v},teacher),204);
 await require('../models/ProjectDefense').init();
 const judgeCourse=await Course.create({name:'Judge Defense Course',durationWeeks:16,academicYear:'2026',batch:'cohort 6'});
 await Enrollment.create({course:judgeCourse._id,student:students[0]._id,academicYear:'2026',batch:'cohort 6'});
 const judgeExam=await require('../models/Exam').create({
   title:'Judge assessment',course:judgeCourse._id,totalMarks:50,examDate:new Date(),createdBy:teacher._id,
 });
 const judgeQuestion='q'+require('node:crypto').randomUUID();
 let judgeForm=ok(await req('POST','/evaluations/defenses',{
   ...defense,course:judgeCourse._id,assessment:judgeExam._id,students:[students[0]._id],groupName:'Judge group',
   projectTitle:'Judge project',defenseDate:'2026-11-17',evaluatorName:'Admin',
   customRubric:[{key:'s'+require('node:crypto').randomUUID(),title:'Project evaluation',marks:90,
     questions:[{key:judgeQuestion,title:'Demonstrate the project',marks:90}]}],
   appendCustomRubric:false,
 }),201).record;
 ok(await req('PATCH',`/evaluations/defenses/${judgeForm._id}/judge`,{judge:String(judge._id),__v:judgeForm.__v}));
 judgeForm=ok(await req('GET',`/evaluations/defenses/${judgeForm._id}`)).record;
 let judgeRecords=ok(await req('GET','/evaluations/defenses',null,judge)).records;
 assert.deepEqual(judgeRecords.map(record=>record._id),[String(judgeForm._id)]);
 assert.equal(ok(await req('GET',`/evaluations/defenses/${judgeForm._id}`,null,judge)).record._id,String(judgeForm._id));
 const judgeSaved=ok(await req('PUT',`/evaluations/defenses/${judgeForm._id}`,{
   ...judgeForm,groupName:'Tampered group',students:[],projectTitle:'Tampered title',
   ratings:{[judgeQuestion]:5},outcome:'pass',summary:'Excellent project',signature:'Judge User',
   signatureDate:'2026-11-17',finalize:true,
 },judge)).record;
 assert.equal(judgeSaved.status,'finalized');
 assert.equal(judgeSaved.groupName,'Judge group');
 assert.equal(judgeSaved.projectTitle,'Judge project');
 assert.deepEqual(judgeSaved.students,[String(students[0]._id)]);
 assert.equal(judgeSaved.evaluatorName,'Defense Judge');
 assert.equal(judgeSaved.ratings[judgeQuestion],5);
 ok(await req('GET',`/evaluations/defenses/${judgeForm._id}`,null,teacher),404);
 ok(await req('DELETE',`/evaluations/defenses/${judgeForm._id}`,{__v:judgeSaved.__v},judge),403);
 ok(await req('POST','/evaluations/defenses',{...defense},judge),403);
 const saved=ok(await req('POST','/evaluations/defenses',{
   ...defense,students:[students[1]._id],additionalEvaluations:[{name:'Second evaluator',ratings:{b1:4},notes:{b1:'Good explanation'}}],
 }),201);
 const otherTeacher=await User.create({name:'Other Teacher',email:'other-teacher@eval.test',role:'teacher',password:'hashed-test-password'});
 const sharedUrl='/evaluations/defenses/'+saved.record._id;
 ok(await req('GET',sharedUrl,null,teacher),404);
 assert.deepEqual(ok(await req('GET','/evaluations/defenses',null,teacher)).records,[]);
 assert.deepEqual(ok(await req('GET','/evaluations/defenses/recent',null,teacher)).records,[]);
 assert.deepEqual(ok(await req('GET','/evaluations/defenses/courses/'+defenseCourse._id+'/groups',null,teacher)).records,[]);
 assert.ok(ok(await req('GET','/evaluations/courses',null,teacher)).courses.some(course=>course._id===String(defenseCourse._id)));
 assert.deepEqual(ok(await req('GET','/evaluations/defenses',null,otherTeacher)).records,[]);
 assert.deepEqual(ok(await req('GET','/evaluations/defenses/recent',null,otherTeacher)).records,[]);
 ok(await req('GET',sharedUrl,null,otherTeacher),404);
 ok(await req('GET','/evaluations/defenses/courses/'+defenseCourse._id+'/groups',null,otherTeacher),403);
 ok(await req('GET','/evaluations/defenses/courses/'+defenseCourse._id+'/cohorts',null,otherTeacher),403);
 ok(await req('GET','/evaluations/eligible/'+defenseCourse._id,null,otherTeacher),403);
 ok(await req('GET','/evaluations/'+f._id,null,teacher),403);
 ok(await req('PUT',sharedUrl,saved.record,otherTeacher),404);
 ok(await req('POST','/evaluations/defenses',{...defense,students:[]},otherTeacher),403);
 ok(await req('PUT',sharedUrl,saved.record,teacher),404);
 const teacherDraft=ok(await req('POST','/evaluations/defenses',{
   course:defenseCourse._id,assessment:exam._id,assessmentType:'exam',groupName:'Final defense form',students:[],
   customRubric:[{
     key:'s'+require('node:crypto').randomUUID(),title:'System demo',marks:90,
     questions:[{key:'q'+require('node:crypto').randomUUID(),title:'Demonstrate the final system',marks:90}],
   }],appendCustomRubric:false,
 },teacher),201).record;
 const teacherUrl='/evaluations/defenses/'+teacherDraft._id;
 assert.deepEqual(teacherDraft.ratings,{});
 assert.deepEqual(teacherDraft.students,[]);
 assert.equal(teacherDraft.summary,'');
 const midterm=await require('../models/Exam').create({
   title:'Midterm',type:'midterm',course:defenseCourse._id,totalMarks:50,examDate:new Date(),createdBy:teacher._id,
 });
 assert.ok(ok(await req('GET','/evaluations/defenses/assessments',null,teacher)).assessments.some(item=>item._id===String(midterm._id)));
 const midtermForm=ok(await req('POST','/evaluations/defenses',{
   ...teacherDraft,_id:undefined,assessment:String(midterm._id),
 },teacher),201).record;
 ok(await req('DELETE','/evaluations/defenses/'+midtermForm._id,{__v:midtermForm.__v},teacher),204);
 const profile=await require('../models/Teacher').create({user:teacher._id,teacherId:'DEFENSE-TEACHER'});
 await require('../models/CourseTeacher').create({teacher:profile._id,course:defenseCourse._id,academicYear:'2026'});
 const assignedExam=await require('../models/Exam').create({
   title:'Existing course exam',course:defenseCourse._id,totalMarks:50,examDate:new Date(),createdBy:admin._id,
 });
 assert.ok(ok(await req('GET','/evaluations/defenses/assessments',null,teacher)).assessments.some(item=>item._id===String(assignedExam._id)));
 const assignedForm=ok(await req('POST','/evaluations/defenses',{
   ...teacherDraft,_id:undefined,assessment:String(assignedExam._id),
 },teacher),201).record;
 ok(await req('DELETE','/evaluations/defenses/'+assignedForm._id,{__v:assignedForm.__v},teacher),204);
 ok(await req('PUT',teacherUrl,{...teacherDraft,students:[students[0]._id]},teacher),403);
 ok(await req('PUT',teacherUrl,{...teacherDraft,ratings:{b1:5}},teacher),403);
 ok(await req('GET',teacherUrl),404);
 assert.ok(!ok(await req('GET','/evaluations/defenses')).records.some(item=>item._id===teacherDraft._id));
 ok(await req('POST',teacherUrl+'/submit',{__v:teacherDraft.__v},otherTeacher),404);
 ok(await req('POST',teacherUrl+'/submit',{__v:teacherDraft.__v+1},teacher),409);
 const sent=ok(await req('POST',teacherUrl+'/submit',{__v:teacherDraft.__v},teacher)).record;
 assert.ok(sent.submittedAt);
 assert.equal(ok(await req('GET',teacherUrl)).record._id,sent._id);
 assert.ok(ok(await req('GET','/evaluations/defenses')).records.some(item=>item._id===sent._id));
 assert.equal(ok(await req('POST',teacherUrl+'/submit',{__v:teacherDraft.__v},teacher)).record.submittedAt,sent.submittedAt);
 ok(await req('PUT',teacherUrl,sent,teacher),409);
 ok(await req('DELETE',teacherUrl,{__v:sent.__v},teacher),404);
 const reviewed=ok(await req('PUT',teacherUrl,{
   ...sent,groupName:'Admin group',students:[students[0]._id],summary:'Admin reviewed submission',
   customRubric:sent.customRubric.map(section=>({...section,title:'Admin revised section'})),
 })).record;
 assert.deepEqual(reviewed.students,[String(students[0]._id)]);
 assert.equal(reviewed.customRubric[0].title,'Admin revised section');
 ok(await req('POST','/evaluations/defenses',{...defense,students:[students[0]._id]}),409);
 ok(await req('DELETE',teacherUrl,{__v:reviewed.__v}),204);
 assert.ok(ok(await req('GET','/evaluations/defenses/assessments',null,teacher)).assessments.some(item=>item._id===String(exam._id)));
 assert.deepEqual(ok(await req('GET','/evaluations/defenses/assessments',null,otherTeacher)).assessments,[]);
 assert.deepEqual(saved.record.students,[String(students[1]._id)]);
 assert.equal(saved.record.additionalEvaluations[0].ratings.b1,4);
 ok(await req('GET','/evaluations/defenses/'+saved.record._id,null,teacher));
 assert.equal(ok(await req('GET','/evaluations/defenses',null,teacher)).total,1);
 ok(await req('POST','/evaluations/defenses',{course:secondCourse._id,students:[]},teacher),403);
 const available=ok(await req('GET',`/evaluations/eligible/${defenseCourse._id}?cohortName=cohort%206&cohortYear=2026&assessment=${exam._id}&assessmentType=exam`));
 assert.deepEqual(available.students.map(s=>s._id),[String(students[0]._id)]);
 ok(await req('POST','/evaluations/defenses',{...defense,students:[students[1]._id]}),409);
 const extraSection={
   key:'s'+require('node:crypto').randomUUID(),title:'Project demo',marks:10,
   questions:['Demonstrate the solution','Explain the results'].map(title=>({
     key:'q'+require('node:crypto').randomUUID(),title,marks:5,
   })),
 };
 const extendedDraft={...saved.record,appendCustomRubric:true,customRubric:[extraSection]};
 const savedUrl='/evaluations/defenses/'+saved.record._id;
 ok(await req('PUT',savedUrl,extendedDraft),400);
 ok(await req('PUT',savedUrl,{...extendedDraft,projectTotalMarks:100}));
 const extended=ok(await req('GET',savedUrl)).record;
 assert.equal(extended.appendCustomRubric,true);
 assert.deepEqual(extended.customRubric,[extraSection]);
 assert.equal(extended.additionalEvaluations[0].ratings.b1,4);
 assert.equal(extended.additionalEvaluations[0].notes.b1,'Good explanation');
 const keys=['b1','b2','b3','c1','d1','e1','f1','g1','g2','g3','g4',...extraSection.questions.map(question=>question.key)];
 const ratings=Object.fromEntries(keys.map(key=>[key,5]));
 const finish={...extended,evaluatorName:'First evaluator',projectTitle:'Project',defenseDate:'2026-11-17',ratings,finalize:true};
 ok(await req('PUT','/evaluations/defenses/'+saved.record._id,finish),400);
 finish.additionalEvaluations[0].ratings=ratings;
 const incompleteRatings={...ratings};
 delete incompleteRatings[extraSection.questions[0].key];
 ok(await req('PUT',savedUrl,{...finish,ratings:incompleteRatings}),400);
 const finalized=ok(await req('PUT','/evaluations/defenses/'+saved.record._id,finish)).record;
 assert.equal(finalized.status,'finalized');
 const updated=ok(await req('PATCH',`/evaluations/defenses/${finalized._id}/marks`,{
   __v:finalized.__v,evaluatorId:finalized.additionalEvaluations[0]._id,ratings:{...ratings,b1:3},
 })).record;
 assert.equal(updated.ratings.b1,5);
 assert.equal(updated.additionalEvaluations[0].ratings.b1,3);
 assert.equal(updated.additionalEvaluations[0].ratings[extraSection.questions[0].key],5);
 ok(await req('PATCH',sharedUrl+'/marks',{__v:updated.__v,ratings},otherTeacher),404);
 ok(await req('PATCH',sharedUrl+'/marks',{__v:updated.__v,ratings},teacher),404);
 const groupDraft={...defense,groupName:'Group 2',students:[students[0]._id],projectTotalMarks:100};
 ok(await req('POST','/evaluations/defenses',groupDraft),400);
 const rubricSectionMarks={B:15,C:20,D:20,E:15,F:10,G:20};
 const secondGroup=ok(await req('POST','/evaluations/defenses',{...groupDraft,rubricSectionMarks}),201).record;
 assert.equal(secondGroup.projectTotalMarks,100);
 assert.deepEqual(secondGroup.rubricSectionMarks,rubricSectionMarks);
 const courseGroups=ok(await req('GET',`/evaluations/defenses/courses/${defenseCourse._id}/groups`)).records;
 assert.deepEqual(courseGroups.map(group=>group._id),[finalized._id,secondGroup._id]);
 assert.equal(courseGroups[0].additionalEvaluations[0].ratings.b1,3);
 assert.deepEqual(ok(await req('GET',`/evaluations/defenses/courses/${secondCourse._id}/groups`)).records,[]);
 const questionKey='q'+require('node:crypto').randomUUID();
 const customRubric=[{
   key:'s'+require('node:crypto').randomUUID(),title:'Project demo',marks:100,
   questions:[{key:questionKey,title:'Demonstrate the solution',marks:90}],
 }];
 const customDraft={...secondGroup,customRubric,evaluatorName:'Evaluator',projectTitle:'Demo',defenseDate:'2026-11-17',finalize:true};
 const groupUrl='/evaluations/defenses/'+secondGroup._id;
 ok(await req('PUT',groupUrl,customDraft),400);
 customRubric[0].questions[0].marks=100;
 ok(await req('PUT',groupUrl,customDraft),400);
 const customFinal=ok(await req('PUT',groupUrl,{...customDraft,ratings:{[questionKey]:4}})).record;
 assert.deepEqual(customFinal.customRubric,customRubric);
 assert.equal(customFinal.status,'finalized');
 const rescored=ok(await req('PATCH',groupUrl+'/marks',{__v:customFinal.__v,ratings:{[questionKey]:5}})).record;
 ok(await req('DELETE',groupUrl,{__v:customFinal.__v}),409);
 ok(await req('DELETE',groupUrl,{__v:rescored.__v},users[0]),403);
 ok(await req('DELETE',groupUrl,{__v:rescored.__v}),204);
 ok(await req('GET',groupUrl),404);
 ok(await req('POST','/evaluations/defenses',{...defense,students:[students[2]._id]}),400);
 console.log('Evaluation HTTP integration passed: assignments, publication, notifications, validation, concurrent limits, uniqueness, editing, closure, reports and authorization.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(server)await new Promise(r=>server.close(r));await mongoose.disconnect();if(child){child.kill();await delay(500);}console.log('Isolated MongoDB test files: '+dir);});
