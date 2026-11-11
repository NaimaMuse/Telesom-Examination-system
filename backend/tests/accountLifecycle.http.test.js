require('dotenv').config({path:require('path').join(__dirname,'../.env')});
const assert=require('assert'),crypto=require('crypto'),mongoose=require('mongoose'),bcrypt=require('bcryptjs');
const jwt=require('jsonwebtoken');
const {verifyPassword}=require('../utils/passwords');
const User=require('../models/User'),Teacher=require('../models/Teacher'),Student=require('../models/Student'),Sequence=require('../models/Sequence');
const generateToken=require('../utils/generateToken');
const {app}=require('../server');
const Session=require('../models/Session');
const testDbName='telesom_auth_test_'+crypto.randomBytes(6).toString('hex');
const created=[];
const clientId='test-client.apps.googleusercontent.com';
process.env.GOOGLE_CLIENT_ID=clientId;
const {publicKey,privateKey}=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
const googleKey={...publicKey.export({format:'jwk'}),kid:'test-key',alg:'RS256'};
const realFetch=global.fetch;
global.fetch=(url,options)=>url==='https://www.googleapis.com/oauth2/v3/certs'
 ? Promise.resolve(new Response(JSON.stringify({keys:[googleKey]}),{headers:{'Cache-Control':'max-age=60'}}))
 : realFetch(url,options);
let server;
(async()=>{
 await mongoose.connect(process.env.MONGODB_URI,{dbName:testDbName,serverSelectionTimeoutMS:10000});
 assert.strictEqual(mongoose.connection.name,testDbName);
 const admin=await User.create({name:'Test Admin',email:'admin@test.example',role:'admin',password:await bcrypt.hash('Test-admin-password!',12),isActive:true});created.push([User,admin._id]);
 server=app.listen(0);await new Promise(resolve=>server.on('listening',resolve));
 const base=`http://127.0.0.1:${server.address().port}/api`;
 const request=async(method,path,body,token)=>{const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined});return {status:response.status,body:await response.json()};};
 const adminToken=generateToken(admin._id);
 const origin='http://localhost:3000';
 const browserHeaders={'Origin':origin,'X-Requested-With':'XMLHttpRequest','X-Session-Mode':'cookie','Content-Type':'application/json'};
 const browserLogin=await fetch(base+'/auth/login',{method:'POST',headers:browserHeaders,body:JSON.stringify({email:admin.email,password:'Test-admin-password!',role:'admin'})});
 assert.strictEqual(browserLogin.status,200);
 assert.strictEqual((await browserLogin.json()).token,undefined);
 const sessionCookie=browserLogin.headers.get('set-cookie');
 assert.match(sessionCookie,/HttpOnly/i);
 assert.match(sessionCookie,/SameSite=Lax/i);
 assert.strictEqual(browserLogin.headers.get('access-control-allow-origin'),origin);
 assert.strictEqual(browserLogin.headers.get('x-content-type-options'),'nosniff');
 assert.strictEqual(browserLogin.headers.get('cache-control'),'no-store');
 assert.match((await User.findById(admin._id).select('+password')).password,/^\$argon2id\$/);
 const Cookie=sessionCookie.split(';')[0];
 const getSession=()=>fetch(base+'/auth/session',{headers:{Cookie,Origin:origin}});
 assert.strictEqual((await getSession()).status,200);
 assert.strictEqual((await fetch(base+'/auth/session',{headers:{Cookie,Origin:'https://untrusted.example'}})).status,403);
 assert.strictEqual((await fetch(base+'/auth/logout',{method:'POST',headers:{Cookie,Origin:origin}})).status,403,'Cookie writes require the CSRF header');
 assert.strictEqual((await getSession()).status,200);
 assert.strictEqual((await fetch(base+'/auth/logout',{method:'POST',headers:{...browserHeaders,Cookie}})).status,204);
 assert.strictEqual((await getSession()).status,401,'A logged-out cookie cannot be reused');
 const expiredLogin=await fetch(base+'/auth/login',{method:'POST',headers:browserHeaders,body:JSON.stringify({email:admin.email,password:'Test-admin-password!',role:'admin'})});
 const expiredCookie=expiredLogin.headers.get('set-cookie').split(';')[0];
 await Session.updateOne({user:admin._id},{$set:{expiresAt:new Date(Date.now()-60_000)}});
 assert.strictEqual((await fetch(base+'/auth/session',{headers:{Cookie:expiredCookie}})).status,401,'Expiration applies before TTL cleanup');
 assert.strictEqual((await request('GET','/profile',null,adminToken+'invalid')).status,401);
 assert.strictEqual((await request('GET','/users/students?email%5B%24ne%5D=x',null,adminToken)).status,400);
 assert.strictEqual((await request('POST','/auth/login',{email:{$ne:''},password:'invalid'})).status,400);
 assert.strictEqual((await request('POST','/auth/login',{email:'large@test.example',password:'x'.repeat(1024*1024)})).status,413);
 for(let attempt=0;attempt<8;attempt++)assert.strictEqual((await request('POST','/auth/login',{email:'rate-test@example.com',password:'bad'})).status,401);
 assert.strictEqual((await request('POST','/auth/login',{email:'rate-test@example.com',password:'bad'})).status,429);
 for(const role of ['admin','teacher','student'])assert.strictEqual((await request('POST','/auth/register',{name:'Blocked',email:'blocked@test.example',role})).status,403);
 const teacher=await request('POST','/users/teachers',{name:'Test Teacher',email:'teacher@test.example',password:'ignore-me',teacherId:'IGNORED'},adminToken);
 assert.strictEqual(teacher.status,201);created.push([User,teacher.body.data.user._id],[Teacher,teacher.body.data.teacher._id]);
 const temporary=teacher.body.data.credentials.temporaryPassword;
 assert.strictEqual(temporary,'ignore-me','Admin-supplied initial password must be respected');
 let login=await request('POST','/auth/login',{email:'teacher@test.example',password:temporary,role:'teacher'});
 assert.strictEqual(login.status,200);assert.strictEqual(login.body.user.mustChangePassword,false);
 await User.updateOne({_id:teacher.body.data.user._id},{$set:{mustChangePassword:true}});
 login=await request('POST','/auth/login',{email:'teacher@test.example',password:temporary,role:'teacher'});
 assert.strictEqual(login.status,200);assert.strictEqual(login.body.user.mustChangePassword,false,'Legacy teachers can use their current password');
 const oldToken=login.body.token;
 assert.strictEqual((await request('POST','/auth/login',{email:'teacher@test.example',password:'wrong',role:'teacher'})).status,401);
 assert.strictEqual((await request('POST','/auth/login',{email:'teacher@test.example',password:temporary,role:'admin'})).status,401);
 assert.strictEqual((await request('PUT','/auth/password',{currentPassword:temporary,newPassword:'New-teacher-pass!'},oldToken)).status,403);
 const teacherPath='/teachers/'+teacher.body.data.teacher._id;
 const edit={name:'Test Teacher',email:'teacher@test.example'};
 assert.strictEqual((await request('PUT',teacherPath,{...edit,newPassword:'New-teacher-pass!'},oldToken)).status,403);
 assert.strictEqual((await request('PUT',teacherPath,edit,adminToken)).status,200);
 assert.strictEqual((await request('GET','/profile',null,oldToken)).status,200,'Profile edits keep the current session');
 assert.strictEqual((await request('PUT',teacherPath,{...edit,newPassword:'short'},adminToken)).status,400);
 const changed=await request('PUT',teacherPath,{...edit,newPassword:'New-teacher-pass!'},adminToken);
 assert.strictEqual(changed.status,200);
 assert.strictEqual(changed.body.data.password,undefined);
 assert.strictEqual((await request('GET','/profile',null,oldToken)).status,401,'Previous sessions must expire');
 assert.strictEqual((await request('POST','/auth/login',{email:'teacher@test.example',password:temporary,role:'teacher'})).status,401);
 login=await request('POST','/auth/login',{email:'teacher@test.example',password:'New-teacher-pass!',role:'teacher'});assert.strictEqual(login.status,200);
 assert.strictEqual((await request('GET','/profile',null,login.body.token)).status,200,'New session must work');
 const studentEmail='registered-student@gmail.com';
 const student=await request('POST','/users/students',{name:'Test Student',email:studentEmail,gender:'female'},adminToken);
 assert.strictEqual(student.status,201);created.push([User,student.body.data.user._id],[Student,student.body.data.student._id]);
 const studentId=student.body.data.student.studentId;assert.match(studentId,/^TA\d{5,}$/);
 assert.strictEqual((await request('POST','/auth/login',{studentId,role:'student'})).status,401);
 assert.strictEqual((await request('POST','/auth/login',{studentId:'UNKNOWN',role:'student'})).status,401);
 const studentUserId=student.body.data.user._id;
 const studentPassword='Student-portal-password!';
 const legacyToken=generateToken(studentUserId);
 assert.strictEqual((await request('PUT','/auth/student/password',{newPassword:studentPassword},legacyToken)).status,403);
 assert.strictEqual((await request('POST','/auth/login',{email:studentEmail,password:studentPassword})).status,401);

 const config=await fetch(base+'/auth/google/config',{method:'POST',headers:browserHeaders});
 assert.strictEqual(config.status,200);
 const {nonce}=await config.json();
 const googleCookie=config.headers.get('set-cookie').split(';')[0];
 const googleSignIn=(claims={},audience=clientId,Cookie=googleCookie)=>fetch(base+'/auth/google',{
  method:'POST',headers:{...browserHeaders,Cookie},body:JSON.stringify({
   credential:jwt.sign({sub:'test-google-subject',email:studentEmail,email_verified:true,nonce,...claims},privateKey,{
    keyid:googleKey.kid,algorithm:'RS256',issuer:'https://accounts.google.com',audience,expiresIn:'5m',
   }),
  }),
 });
 assert.strictEqual((await googleSignIn({email:'unregistered@gmail.com'})).status,401);
 assert.strictEqual((await googleSignIn({email_verified:false})).status,401);
 assert.strictEqual((await googleSignIn({nonce:'wrong-nonce'})).status,401);
 assert.strictEqual((await googleSignIn({},'wrong-client')).status,401);
 assert.strictEqual((await googleSignIn({},clientId,'')).status,401);

 const googleLogin=await googleSignIn();
 assert.strictEqual(googleLogin.status,200);
 const firstLogin=await googleLogin.json();
 assert.strictEqual(firstLogin.user.mustChangePassword,true);
 assert.strictEqual(firstLogin.user.studentId,studentId);
 assert.strictEqual(firstLogin.token,undefined);
 const googleSession=googleLogin.headers.getSetCookie().find(cookie=>cookie.startsWith('telesom_session=')).split(';')[0];
 const pending=await fetch(base+'/auth/session',{headers:{Cookie:googleSession,Origin:origin}});
 assert.strictEqual((await pending.json()).user.mustChangePassword,true);
 const setup=await fetch(base+'/auth/student/password',{
  method:'PUT',headers:{...browserHeaders,Cookie:googleSession},body:JSON.stringify({newPassword:studentPassword}),
 });
 assert.strictEqual(setup.status,200);
 assert.strictEqual((await setup.json()).user.mustChangePassword,false);
 let newSession=setup.headers.get('set-cookie').split(';')[0];
 const restored=await fetch(base+'/auth/session',{headers:{Cookie:newSession,Origin:origin}});
 assert.strictEqual(restored.status,200);
 assert.strictEqual((await restored.json()).user.mustChangePassword,false);
 assert.strictEqual((await fetch(base+'/auth/session',{headers:{Cookie:googleSession,Origin:origin}})).status,401);
 const studentLogin=await request('POST','/auth/login',{email:studentEmail,password:studentPassword,role:'student'});
 assert.strictEqual(studentLogin.status,401);
 const studentRequest=(method,path,body)=>fetch(base+path,{
  method,headers:{...browserHeaders,Cookie:newSession},body:body?JSON.stringify(body):undefined,
 });
 const sessionHash=crypto.createHash('sha256').update(newSession.split('=')[1]).digest('hex');
 await Session.updateOne({_id:sessionHash},{$set:{googleVerified:false}});
 assert.strictEqual((await studentRequest('GET','/profile')).status,401);
 assert.strictEqual((await studentRequest('PUT','/auth/student/password',{newPassword:'Replacement-password!'})).status,401);
 await Session.updateOne({_id:sessionHash},{$set:{googleVerified:true}});
 const replacement='Replacement-password!';
 const reset=await studentRequest('PUT','/auth/student/password',{newPassword:replacement});
 assert.strictEqual(reset.status,200);
 assert.strictEqual((await reset.json()).user.mustChangePassword,false);
 assert.strictEqual((await studentRequest('GET','/profile')).status,401);
 newSession=reset.headers.get('set-cookie').split(';')[0];
 assert.strictEqual((await studentRequest('GET','/profile')).status,200);
 const resetHash=(await User.findById(studentUserId).select('+password')).password;
 assert.strictEqual(await verifyPassword(replacement,resetHash),true);
 assert.strictEqual(await verifyPassword(studentPassword,resetHash),false);
 assert.strictEqual((await request('POST','/auth/login',{email:studentEmail,password:replacement})).status,401);
 assert.strictEqual((await studentRequest('POST','/users/teachers',{name:'Blocked',email:'blocked@test.example'})).status,403);
 assert.strictEqual((await studentRequest('PUT','/auth/password',{currentPassword:'anything',newPassword:'Something-new!'})).status,403);
 const profile=await studentRequest('PUT','/profile',{email:'other@gmail.com'});
 assert.strictEqual((await profile.json()).data.user.email,studentEmail);
 const newEmail='updated-student@gmail.com';
 const updatedStudent=await request('PUT','/students/'+student.body.data.student._id,{email:newEmail},adminToken);
 assert.strictEqual(updatedStudent.status,200);
 assert.strictEqual((await studentRequest('GET','/profile')).status,401);
 assert.strictEqual((await request('POST','/auth/login',{email:newEmail,password:studentPassword})).status,401);
 assert.strictEqual((await googleSignIn()).status,401);
 console.log('Account lifecycle integration passed, including verified Google sign-in and student password setup.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{
 if(server)await new Promise(resolve=>server.close(resolve));
 if(mongoose.connection.readyState===1&&mongoose.connection.name===testDbName){for(const [Model,id]of created.reverse())await Model.deleteOne({_id:id});await Sequence.deleteMany({_id:{$regex:'^student-id:'}});await Session.deleteMany({});}
 await mongoose.disconnect();
});
