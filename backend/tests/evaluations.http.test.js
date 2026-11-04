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
 const course=await Course.create({name:'Evaluation Course'});for(const s of students.slice(0,3))await Enrollment.create({student:s._id,course:course._id,academicYear:'2026'});
 async function req(method,p,body,user=admin){const r=await fetch(base+p,{method,headers:{Authorization:'Bearer '+token(user._id),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};}
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
 const secondCourse=await Course.create({name:'Second Evaluation Course'});
 await Enrollment.create({student:students[0]._id,course:secondCourse._id,academicYear:'2026'});
 await Enrollment.create({student:students[3]._id,course:secondCourse._id,academicYear:'2026'});
 assert.equal(ok(await req('GET','/evaluations/eligible/all')).total,4);
 let all=ok(await req('POST','/evaluations',{title:'All Courses Feedback',allCourses:true,questions}),201).form;
 all=ok(await req('PUT','/evaluations/'+all._id,{...all,assignAll:true})).form;
 assert.equal(all.students.length,4);
 ok(await req('POST','/evaluations/'+all._id+'/publish'));
 ok(await req('PUT','/evaluations/'+all._id+'/response',{answers:{q1:5},submit:true},users[3]));
 console.log('Evaluation HTTP integration passed: assignments, publication, notifications, validation, concurrent limits, uniqueness, editing, closure, reports and authorization.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(server)await new Promise(r=>server.close(r));await mongoose.disconnect();if(child){child.kill();await delay(500);}console.log('Isolated MongoDB test files: '+dir);});
