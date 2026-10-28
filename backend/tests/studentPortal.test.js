const assert = require('assert');
const express = require('express');
const Student = require('../models/Student');
require('../models/Enrollment').find=()=>({lean:async()=>[]});
const Attendance = require('../models/Attendance');
const ExamResult = require('../models/ExamResult');
const Note = require('../models/Note');
const auth = require('../middleware/authMiddleware');
auth.protect = (req, res, next) => { req.user = { _id: 'user-a', role: req.headers['x-role'] || 'student' }; next(); };
const query = rows => ({ populate() { return this; }, sort() { return this; }, lean: async () => rows });
Student.findOne = async filter => { assert.deepStrictEqual(filter, { user: 'user-a' }); return { _id: 'student-a' }; };
Attendance.find = filter => { assert.deepStrictEqual(filter, { student: 'student-a' }); return query([{ status: 'present', course: { courseCode: 'REAL101' }, date: new Date('2026-10-01') }, {status:'absent'}]); };
ExamResult.find = filter => { assert.deepStrictEqual(filter, {student:'student-a'}); return query([{_id:'r1',marksObtained:12,exam:{visibleToStudents:true,marksPublished:true,title:'Real exam',totalMarks:20,passingMarks:10,status:'completed',course:{courseCode:'REAL101'},examDate:new Date('2026-10-01')}},{marksObtained:10,exam:null}]); };
Note.find = filter => { assert.deepStrictEqual(filter, {student:'student-a'}); return query([]); };
const app = express();
app.use('/student', require('../routes/studentPortalRoutes'));
app.use(require('../middleware/errorHandler').errorHandler);
(async () => {
 const server = app.listen(0);
 await new Promise(resolve => server.on('listening',resolve));
 const base=`http://127.0.0.1:${server.address().port}/student`;
 try {
  let response=await fetch(base+'/attendance/summary'); assert.deepStrictEqual(await response.json(),{total:2,present:1});
  response=await fetch(base+'/results');const body=await response.json();assert.strictEqual(body.results.length,1);assert.strictEqual(body.results[0].marks,12);assert.strictEqual(body.results[0].grade,'D');assert.strictEqual(body.results[0].isPassed,true);
  response=await fetch(base+'/notes');assert.deepStrictEqual(await response.json(),{notes:[]});
  response=await fetch(base+'/results',{headers:{'x-role':'teacher'}});assert.strictEqual(response.status,403);
  console.log('Student portal identity scoping, result calculation, empty data and role checks passed.');
 } finally { await new Promise(resolve=>server.close(resolve)); }
})().catch(error=>{console.error(error);process.exitCode=1;});
