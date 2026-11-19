// Starts an isolated local replica set; never connects to or changes the application database.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawn}=require('node:child_process'),mongoose=require('mongoose');
require('dotenv').config({path:path.join(__dirname,'../.env')});
const mongod=process.env.TEST_MONGOD||'C:/Program Files/MongoDB/Server/8.3/bin/mongod.exe';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'telesom-defense-workflow-'));const port=Number(process.env.TEST_MONGO_PORT||27932);let child,server;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 child=spawn(mongod,['--dbpath',dir,'--port',String(port),'--bind_ip','127.0.0.1','--replSet','evaluationTest','--logpath',path.join(dir,'mongo.log')],{windowsHide:true,stdio:'ignore'});child.on('error',e=>console.error(e.message));
 let client;for(let i=0;i<30;i++){try{client=await mongoose.mongo.MongoClient.connect(`mongodb://127.0.0.1:${port}/?directConnection=true`,{serverSelectionTimeoutMS:500});break;}catch(e){if(i===29)throw e;await delay(300);}}
 await client.db('admin').command({replSetInitiate:{_id:'evaluationTest',members:[{_id:0,host:`127.0.0.1:${port}`}]}});for(let i=0;i<60;i++){if((await client.db('admin').command({hello:1})).isWritablePrimary)break;await delay(300);}await client.close();
 await mongoose.connect(`mongodb://127.0.0.1:${port}/evaluation_test?replicaSet=evaluationTest`);
 const User=require('../models/User'),Student=require('../models/Student'),Course=require('../models/Course'),Enrollment=require('../models/Enrollment');
 await Promise.all([User,Student,Course,Enrollment].map(m=>m.init()));
 const {app}=require('../server'),token=require('../utils/generateToken');server=app.listen(0);await new Promise(r=>server.on('listening',r));const base=`http://127.0.0.1:${server.address().port}/api`;
 const admin=await User.create({name:'Admin Test',email:'admin@eval.test',role:'admin',password:'hashed-test-password'});
 const users=[],students=[];for(let i=0;i<4;i++){const u=await User.create({name:'Student '+i,email:`student${i}@eval.test`,role:'student'});users.push(u);students.push(await Student.create({user:u._id,studentId:'EVAL-'+i,gender:'female'}));}
 const course=await Course.create({name:'Evaluation Course',durationWeeks:16});for(const s of students.slice(0,3))await Enrollment.create({student:s._id,course:course._id,academicYear:'2026'});
 async function req(method,p,body,user=admin){const r=await fetch(base+p,{method,headers:{Authorization:'Bearer '+token(user._id),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,data:r.status===204?null:await r.json()};}
 function ok(r,status=200){assert.equal(r.status,status,JSON.stringify(r.data));return r.data;}
 const defenseCourse=await Course.create({name:'Project Defense Course',durationWeeks:16,academicYear:'2026',batch:'cohort 6'});
 for(const student of students.slice(0,3))await Enrollment.create({student:student._id,course:defenseCourse._id,academicYear:'2026',batch:'cohort 6'});
 const teacher=await User.create({name:'Defense Teacher',email:'teacher@eval.test',role:'teacher',password:'hashed-test-password'});
 await require('../models/Teacher').create({user:teacher._id,teacherId:'DEFENSE-TEACHER'});
 const judge=await User.create({name:'Defense Judge',email:'judge@eval.test',role:'judge',password:'hashed-test-password'});

 const WorkflowExam=require('../models/Exam'),ExamResult=require('../models/ExamResult');
 await Promise.all([require('../models/ProjectDefense').init(),ExamResult.init()]);
 const workflow='/evaluations/defenses/workflow';
 const practical=await WorkflowExam.create({title:'Shared Defense Exam',course:defenseCourse._id,
   totalMarks:60,passingMarks:30,batch:'cohort 6',academicYear:'2026',createdBy:teacher._id});
 const sections=[
   {title:'Demonstration',marks:30,questions:[{title:'Demo the project'},{title:'Show the outcome'}]},
   {title:'Technical discussion',marks:30,questions:[{title:'Explain the design'}]},
 ];
 const draft=ok(await req('POST',workflow+'/forms',{title:'Defense rubric',exam:practical._id,
   sections:[{title:'',marks:null,questions:[{title:''}]}]},teacher),201).form;
 const formUrl=workflow+'/forms/'+draft._id;
 ok(await req('POST',formUrl+'/send',{__v:draft.__v,recipient:admin._id},teacher),400);
 const shared=ok(await req('PUT',formUrl,{...draft,sections},teacher)).form;
 const sent=ok(await req('POST',formUrl+'/send',{__v:shared.__v,recipient:admin._id},teacher)).form;
 assert.ok(ok(await req('GET','/notifications')).notifications.some(notice=>notice.href.includes('/workflow/forms/'+shared._id+'?exam=')));
 const approved=ok(await req('POST',formUrl+'/approve',{__v:sent.__v})).form;
 const groupData={exam:practical._id,form:approved._id};
 const alpha=ok(await req('POST',workflow+'/groups',{...groupData,groupName:'Alpha',
   students:[students[0]._id,students[2]._id],evaluators:[judge._id,teacher._id]},teacher),201).id;
 const beta=ok(await req('POST',workflow+'/groups',{...groupData,groupName:'Beta',
   students:[students[1]._id],evaluators:[admin._id]}),201).id;
 ok(await req('POST',workflow+'/groups',{...groupData,groupName:'Duplicate',
   students:[students[0]._id],evaluators:[admin._id]}),409);
 const alphaUrl=workflow+'/groups/'+alpha,betaUrl=workflow+'/groups/'+beta;
 ok(await req('GET','/evaluations/defenses/'+alpha),404);
 assert.equal(ok(await req('GET',alphaUrl)).group.workflowForm,approved._id);
 assert.equal(ok(await req('GET',betaUrl)).group.workflowForm,approved._id);
 ok(await req('PUT',formUrl,{...approved,title:'Updated rubric',sections:[{...sections[0],title:'Updated demo'},sections[1]]}));
 assert.equal(ok(await req('GET',alphaUrl)).group.workflowSections[0].title,'Demonstration');
 const revised=ok(await req('GET',formUrl)).form;
 const returned=ok(await req('POST',formUrl+'/send',{__v:revised.__v,recipient:teacher._id})).form;
 assert.ok(ok(await req('GET','/notifications',null,teacher)).notifications.some(notice=>notice.href.includes('/teacher/project-defenses/workflow/forms/'+shared._id)));
 ok(await req('POST',formUrl+'/approve',{__v:returned.__v},teacher));
 const score=(url,user,ratings,revision=0,submit=true)=>req('PUT',url+'/score',{ratings,comments:['',''],revision,submit},user);
 ok(await score(alphaUrl,admin,[[4,4],[4]]),403);
 ok(await score(alphaUrl,judge,[[6,4],[4]]),400);
 ok(await score(alphaUrl,judge,[[4,null],[4]]),400);
 ok(await score(alphaUrl,judge,[[4,null],[4]],0,false));
 assert.deepEqual(ok(await req('GET',alphaUrl,null,judge)).mine.questionRatings,[[4,null],[4]]);
 ok(await req('GET',alphaUrl+'/finalization'),409);
 ok(await score(alphaUrl,judge,[[4,4],[4]],1));
 assert.equal(ok(await req('GET',alphaUrl)).average,null);
 ok(await score(alphaUrl,teacher,[[4,4],[5]]));
 ok(await score(betaUrl,admin,[[3,4],[4]]));
 assert.equal(ok(await req('GET',betaUrl+'/finalization')).proposed,45);
 assert.equal(ok(await req('GET',alphaUrl)).average,51);
 await ExamResult.create({exam:practical._id,student:students[0]._id,marksObtained:40});
 const review=ok(await req('GET',alphaUrl+'/finalization'));
 assert.equal(review.current[0].marksObtained,40);
 assert.equal(review.proposed,51);
 ok(await req('POST',alphaUrl+'/finalize',{token:review.token}),409);
 ok(await req('POST',alphaUrl+'/finalize',{token:review.token,replaceExisting:true},teacher),403);
 assert.equal(ok(await req('POST',alphaUrl+'/finalize',{token:review.token,replaceExisting:true})).mark,51);
 assert.equal(ok(await req('POST',alphaUrl+'/finalize',{token:review.token,replaceExisting:true})).mark,51);
 assert.equal(await ExamResult.countDocuments({exam:practical._id,student:students[0]._id}),1);
 assert.equal((await ExamResult.findOne({exam:practical._id,student:students[0]._id})).marksObtained,51);
 assert.equal((await ExamResult.findOne({exam:practical._id,student:students[2]._id})).marksObtained,51);
 const betaReview=ok(await req('GET',betaUrl+'/finalization'));
 ok(await req('POST',betaUrl+'/finalize',{token:betaReview.token}));
 assert.equal((await ExamResult.findOne({exam:practical._id,student:students[1]._id})).marksObtained,45);
 console.log('Evaluation HTTP integration passed, including shared defense forms, distinct evaluators and transactional exam results.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(server)await new Promise(r=>server.close(r));await mongoose.disconnect();if(child){child.kill();await delay(500);}console.log('Isolated MongoDB test files: '+dir);});
