const mongoose = require('mongoose');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Attendance = require('../models/Attendance');
const { withCourseLock } = require('../services/gradebookIntegrityService');
const statuses = ['present','absent','late','excused'];
const fail = message => { throw Object.assign(new Error(message),{statusCode:400}); };
function day(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))fail('Choose a valid date.');const date=new Date(value+'T00:00:00.000Z');if(Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==value)fail('Choose a valid date.');return date;}
const nextDay=date=>new Date(date.getTime()+86400000);
async function roster(course,batch=''){
  if(!mongoose.isValidObjectId(course)||!await Course.exists({_id:course}))fail('Choose a valid course.');
  const enrollments=await Enrollment.find({course,status:'enrolled'}).populate({path:'student',populate:{path:'user',select:'name email'}}).lean();
  const rows=new Map();
  for(const enrollment of enrollments){const student=enrollment.student;if(!student)continue;const year=student.academicYear?.trim()||enrollment.academicYear?.trim()||'';const key=String(student._id);if(!rows.has(key))rows.set(key,{_id:student._id,name:student.user?.name||'Student',studentId:student.studentId,batches:[]});if(year&&!rows.get(key).batches.includes(year))rows.get(key).batches.push(year);}
  const all=[...rows.values()];return {batches:[...new Set(all.flatMap(s=>s.batches))].sort(),students:batch?all.filter(s=>s.batches.includes(batch)):all};
}
exports.getRegister=async(req,res,next)=>{try{
  const courses=await Course.find().select('title courseCode').sort({title:1}).lean();
  const courseId=req.query.course||courses[0]?._id;
  if(!courseId)return res.json({courses,batches:[],students:[],courseId:null});
  const date=day(req.query.date),data=await roster(courseId,req.query.batch||'');
  const records=await Attendance.find({course:courseId,student:{$in:data.students.map(s=>s._id)},date:{$gte:date,$lt:nextDay(date)}}).sort({updatedAt:1}).lean();
  const saved=new Map(records.map(row=>[String(row.student),row]));
  res.json({courses,courseId,batches:data.batches,students:data.students.map(student=>({...student,status:saved.get(String(student._id))?.status||'',remarks:saved.get(String(student._id))?.remarks||''}))});
}catch(error){next(error);}};
exports.saveRegister=async(req,res,next)=>{try{
  const {course,batch='',date,records}=req.body;const normalized=day(date);
  if(!Array.isArray(records)||!records.length)fail('Mark at least one student.');
  if(!mongoose.isValidObjectId(course))fail('Choose a valid course.');
  const savedCount=await withCourseLock(course,async()=>{
    const {students}=await roster(course,batch),allowed=new Set(students.map(s=>String(s._id))),seen=new Set();
    for(const record of records){const id=String(record.student);if(!allowed.has(id))fail('Student is not enrolled in the selected course and batch.');if(seen.has(id))fail('Duplicate student in submission.');seen.add(id);if(!statuses.includes(record.status))fail('Invalid attendance status.');if(typeof(record.remarks??'')!=='string'||(record.remarks||'').length>250)fail('Remarks must be at most 250 characters.');}
    const previous=await Attendance.find({course,student:{$in:[...seen]},date:{$gte:normalized,$lt:nextDay(normalized)}}).sort({updatedAt:1}).lean();
    const byStudent=new Map(previous.map(row=>[String(row.student),row]));
    await Attendance.bulkWrite(records.map(record=>({updateOne:{filter:byStudent.has(String(record.student))?{_id:byStudent.get(String(record.student))._id}:{course,student:record.student,date:normalized},update:{$set:{status:record.status,remarks:(record.remarks||'').trim(),recordedBy:req.user._id}},upsert:true}})),{ordered:true});
    return records.length;
  });res.json({success:true,savedCount});
}catch(error){next(error);}};
exports.getReport=async(req,res,next)=>{try{
  const from=day(req.query.from),to=day(req.query.to);if(from>to)fail('End date must be on or after start date.');
  const {students}=await roster(req.query.course,req.query.batch||'');
  const records=await Attendance.find({course:req.query.course,student:{$in:students.map(s=>s._id)},date:{$gte:from,$lt:nextDay(to)}}).populate('recordedBy','name').sort({date:1,updatedAt:1}).lean();
  const unique=new Map();for(const row of records)unique.set(String(row.student)+':'+row.date.toISOString().slice(0,10),row);
  res.json({from:req.query.from,to:req.query.to,students:students.map(student=>{const history=[...unique.values()].filter(row=>String(row.student)===String(student._id)).map(row=>({date:row.date.toISOString().slice(0,10),status:row.status,remarks:row.remarks||'',recordedBy:row.recordedBy?.name||'Not recorded'}));const counts={present:0,absent:0,late:0,excused:0};for(const row of history)counts[row.status]++;const denominator=counts.present+counts.absent+counts.late;return {...student,...counts,recordedDays:history.length,attendanceRate:denominator?Math.round((counts.present+counts.late)/denominator*10000)/100:null,history};})});
}catch(error){next(error);}};
