// Read-only audit of the configured database and every active role's read APIs.
require('dotenv').config({path:require('path').join(__dirname,'../.env')});
const fs=require('fs'),path=require('path'),mongoose=require('mongoose');
const {app}=require('../server'),token=require('../utils/generateToken');
for(const file of fs.readdirSync(path.join(__dirname,'../models')).filter(f=>f.endsWith('.js')))require('../models/'+file);
const report={checkedAt:new Date().toISOString(),mode:'read-only',collections:{},brokenReferences:[],yearLabelMismatches:0,api:{checked:0,passed:0,failures:[]},accounts:{}};let server;
(async()=>{
 await mongoose.connect(process.env.MONGODB_URI,{serverSelectionTimeoutMS:10000,autoIndex:false,autoCreate:false});
 for(const Model of Object.values(mongoose.models)){
  report.collections[Model.modelName]=await Model.countDocuments();
  for(const [field,schema]of Object.entries(Model.schema.paths)){
   const ref=schema.options?.ref;if(!ref||!mongoose.models[ref]||field.includes('.')||schema.instance==='Array')continue;
   const broken=await Model.aggregate([{$match:{[field]:{$exists:true,$ne:null}}},{$lookup:{from:mongoose.models[ref].collection.name,localField:field,foreignField:'_id',as:'linked'}},{$match:{linked:{$size:0}}},{$count:'count'}]);
   if(broken[0]?.count)report.brokenReferences.push({model:Model.modelName,field,count:broken[0].count});
  }
 }
 const enrolled=await mongoose.models.Enrollment.distinct('student',{status:'enrolled'});report.studentsWithoutEnrollment=await mongoose.models.Student.countDocuments({status:'active',_id:{$nin:enrolled}});
 const mismatches=await mongoose.models.Enrollment.aggregate([{$match:{status:'enrolled'}},{$lookup:{from:'courses',localField:'course',foreignField:'_id',as:'linked'}},{$unwind:'$linked'},{$match:{$expr:{$ne:['$academicYear','$linked.academicYear']}}},{$count:'count'}]);report.yearLabelMismatches=mismatches[0]?.count||0;
 server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
 const date=new Date(Date.now()+10800000).toISOString().slice(0,10);
 const base='http://127.0.0.1:'+server.address().port+'/api';
 async function read(url,user){const response=await fetch(base+url,{headers:user?{Authorization:'Bearer '+token(user._id,user.authVersion||0)}:{},signal:AbortSignal.timeout(20000)});const body=await response.json();report.api.checked++;if(response.ok)report.api.passed++;else report.api.failures.push({role:user?.role||'public',path:url,status:response.status,message:body.message});return body;}
 await read('/health');
 const routes={admin:['/dashboard/admin','/students?limit=100','/teachers?limit=100','/courses?limit=100','/enrollments?limit=100','/course-teachers?limit=100','/exams?limit=100','/quizzes?limit=100','/reports/analytics','/reports/marks-overview','/reports/assessment-overview','/academy/batches','/academy/outlines','/academy/makeup-classes','/teacher-contracts','/attendance/register?date='+date,'/notifications','/profile'],teacher:['/teacher/dashboard','/teacher/my-course','/teacher/students','/teacher/exams','/teacher/performance','/teacher/results/assessments','/teacher/profile','/academy/outlines','/academy/makeup-classes','/teacher-contracts','/notifications'],student:['/student/courses','/student/exams/upcoming','/student/results','/student/quizzes','/student/attendance','/student/attendance/summary','/student/notes','/academy/outlines','/academy/makeup-classes','/academy/progress','/notifications','/profile']};
 const users=await mongoose.models.User.find({isActive:true}).select('_id role authVersion').lean();
 for(const role of ['admin','teacher','student']){
  const accounts=users.filter(u=>u.role===role);report.accounts[role]=accounts.length;
  for(const user of (role==='admin'?accounts.slice(0,1):accounts)){
   for(const route of routes[role]){const body=await read(route,user);
    if(route==='/dashboard/admin'){const expected={students:report.collections.Student,teachers:report.collections.Teacher,courses:report.collections.Course,assessments:report.collections.Exam+report.collections.Quiz};for(const [key,value]of Object.entries(expected))if(body.data?.totals?.[key]!==value)report.api.failures.push({role:'admin',path:route,message:'Dashboard count differs from database: '+key});}
    if(route==='/teacher/results/assessments')for(const a of body.assessments||[])await read('/teacher/results/'+a.type+'/'+a._id,user);
   }
  }
 }
 if(report.brokenReferences.length||report.api.failures.length)process.exitCode=1;
 const output=process.argv[2];if(output)fs.writeFileSync(output,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error('Audit failed: '+e.name+': '+e.message);process.exitCode=1;}).finally(async()=>{if(server)await new Promise(resolve=>server.close(resolve));await mongoose.disconnect();});

