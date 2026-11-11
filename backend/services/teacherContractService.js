const mongoose = require('mongoose');
const crypto = require('crypto');
const Contract = require('../models/TeacherContract');
const Lesson = require('../models/TeachingLesson');
const Teacher = require('../models/Teacher');
const Course = require('../models/Course');
const Assignment = require('../models/CourseTeacher');
const fail = (message,statusCode=400) => {throw Object.assign(new Error(message),{statusCode});};
const teachingDay = (now = new Date()) => new Date(now.getTime()+3*3600000).toISOString().slice(0,10);
const validDate = value => typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10)===value;
function calendarEnd(startDate,totalDays) {
  if (!validDate(startDate) || !Number.isInteger(totalDays) || totalDays < 1 || totalDays > 36500) fail('Enter a valid start date and duration (1–36500 days).');
  const end=new Date(startDate+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+totalDays-1);return end.toISOString().slice(0,10);
}
const validateContract = data => {
  if (!Number.isInteger(data.totalDays) || data.totalDays<1) fail('Contract duration must be a positive whole number.');
  if (!validDate(data.startDate) || (data.endDate && (!validDate(data.endDate)||data.endDate<data.startDate))) fail('Enter valid contract dates. End date cannot precede start date.');
  if (!String(data.batch||'').trim() || !String(data.academicYear||'').trim()) fail('Cohort and academic year are required.');
};
const completedDays = async contractId => Lesson.distinct('completedDay',{contract:contractId,status:'completed',completedDay:{$ne:null}});
function teachingDayTarget(contract, endDate, weekdays) {
  if (contract.dayBasis !== 'calendar') return contract.totalDays;
  if (!weekdays || !validDate(contract.startDate) || !validDate(endDate)) return null;
  const start = new Date(contract.startDate + 'T12:00:00Z');
  const exclusiveEnd = new Date(endDate + 'T12:00:00Z');
  exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
  const months = (exclusiveEnd.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    exclusiveEnd.getUTCMonth() - start.getUTCMonth();
  const monthBoundary = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + months, 1, 12));
  const lastDay = new Date(Date.UTC(monthBoundary.getUTCFullYear(), monthBoundary.getUTCMonth() + 1, 0)).getUTCDate();
  monthBoundary.setUTCDate(Math.min(start.getUTCDate(), lastDay));
  // A contract month budgets four teaching weeks. A day-based term uses 30 days per budget month.
  const budgetMonths = months > 0 && +monthBoundary === +exclusiveEnd ? months : contract.totalDays / 30;
  return Math.floor(budgetMonths * 4 * weekdays);
}

function scheduledTeachingDays(contract, endDate, completedDates, today) {
  const schedule = contract.course?.teachingSchedule;
  const weekdays = new Set((schedule || []).map(slot => slot.day).filter(day => Number.isInteger(day) && day >= 0 && day <= 6));
  const targetTeachingDays = teachingDayTarget(contract, endDate, weekdays.size);
  if (!validDate(contract.startDate) || !validDate(endDate) || !weekdays.size) {
    return {targetTeachingDays, scheduledTeachingDays:null, remainingScheduledTeachingDays:null};
  }
  const completed = new Set(completedDates);
  let scheduled = 0;
  let remaining = 0;
  for (const date = new Date(contract.startDate + 'T12:00:00Z'); date.toISOString().slice(0,10) <= endDate; date.setUTCDate(date.getUTCDate()+1)) {
    if (!weekdays.has(date.getUTCDay())) continue;
    scheduled++;
    const key = date.toISOString().slice(0,10);
    if (key >= today && !completed.has(key) && contract.status !== 'cancelled') remaining++;
  }
  return {targetTeachingDays, scheduledTeachingDays:scheduled, remainingScheduledTeachingDays:remaining};
}
function calculateBalance(contract, days, now=new Date()) {
  const dates=[...new Set(days.filter(Boolean))].sort();
  const completedTeachingDays=dates.length;
  const calendar=contract.dayBasis==='calendar';
  const endDate=calendar?calendarEnd(contract.startDate,contract.totalDays):contract.endDate;
  const day=teachingDay(now);
  const elapsedCalendarDays=day<contract.startDate?0:Math.min(contract.totalDays,Math.floor((Date.parse(day)-Date.parse(contract.startDate))/86400000)+1);
  const elapsed=calendar?elapsedCalendarDays:completedTeachingDays;
  const remainingContractDays=Math.max(0,contract.totalDays-elapsed);
  const contractStatus=contract.status==='cancelled'?'Cancelled':day<contract.startDate?'Scheduled':endDate&&day>endDate?'Expired':!calendar&&remainingContractDays===0?'Completed':'Active';
  return {...scheduledTeachingDays(contract,endDate,dates,day),endDate:endDate||null,dayBasis:contract.dayBasis||'teaching',elapsedCalendarDays,totalContractDays:contract.totalDays,completedTeachingDays,remainingContractDays,progress:Math.min(100,Math.round(elapsed/contract.totalDays*100)),contractStatus,completedDates:dates};
}
const summary = async contract => {
  const plain=contract.toObject?contract.toObject():contract;
  const {writeLock,...safe}=plain;
  const [days, course] = await Promise.all([
    completedDays(plain._id),
    plain.course?.teachingSchedule !== undefined || !plain.course ? plain.course :
      Course.findById(plain.course._id || plain.course).select('teachingSchedule').lean(),
  ]);
  return {...safe,...calculateBalance({...plain,course},days)};
};
const authorize = async (user,contract,write=false) => {
  if(user.role==='admin'&&!write)return;
  if(user.role!=='teacher')fail('Only the assigned teacher can complete lessons.',403);
  const teacher=await Teacher.findOne({user:user._id});
  const teacherId=contract.teacher?._id||contract.teacher;
  if(!teacher||String(teacher._id)!==String(teacherId))fail('This contract is not assigned to you.',403);
  if(write && (teacher.status==='inactive'||!await Assignment.exists({teacher:teacher._id,course:contract.course?._id||contract.course,academicYear:contract.academicYear,status:'active'})))fail('An active course assignment is required.',403);
};
const withContractLock = async (id,work) => {
  const token=crypto.randomUUID(),deadline=Date.now()+4000;
  while(!await Contract.findOneAndUpdate({_id:id,$or:[{'writeLock.token':{$exists:false}},{'writeLock.expiresAt':{$lt:new Date()}}]},{$set:{writeLock:{token,expiresAt:new Date(Date.now()+60000)}}})) {
    if(!await Contract.exists({_id:id}))fail('Contract not found.',404);
    if(Date.now()>deadline)fail('This contract is being updated. Please retry.',409);
    await new Promise(resolve=>setTimeout(resolve,75));
  }
  const renew=setInterval(()=>{Contract.updateOne({_id:id,'writeLock.token':token},{$set:{'writeLock.expiresAt':new Date(Date.now()+60000)}}).catch(()=>{});},15000);
  try{return await work();}finally{clearInterval(renew);await Contract.updateOne({_id:id,'writeLock.token':token},{$unset:{writeLock:''}});}
};
const loadContract = async id => {
  if(!mongoose.isValidObjectId(id))fail('Invalid contract ID.');
  const contract=await Contract.findById(id);
  if(!contract)fail('Contract not found.',404);
  return contract;
};
async function createContract(user,data) {
  if(user.role!=='admin')fail('Only admins can configure contracts.',403);
  const fields={teacher:data.teacher,course:data.course,academicYear:String(data.academicYear||'').trim(),batch:String(data.batch||'').trim(),startDate:data.startDate,endDate:data.endDate||null,totalDays:Number(data.totalDays)};
  fields.dayBasis=data.dayBasis||'calendar';
  if(!['calendar','teaching'].includes(fields.dayBasis))fail('Invalid contract day basis.');
  if(fields.dayBasis==='calendar')fields.endDate=calendarEnd(fields.startDate,fields.totalDays);
  validateContract(fields);
  if(!mongoose.isValidObjectId(fields.teacher)||!mongoose.isValidObjectId(fields.course))fail('Select a valid teacher and course.');
  if(!await Teacher.exists({_id:fields.teacher})||!await Course.exists({_id:fields.course}))fail('Teacher or course not found.',404);
  const course=await Course.findById(fields.course).select('batch academicYear').lean();
  if(course.batch && (course.batch!==fields.batch || course.academicYear!==fields.academicYear))fail('Select the year and cohort configured for this course.');
  if(!await Assignment.exists({teacher:fields.teacher,course:fields.course,academicYear:fields.academicYear,status:'active'}))fail('Assign this course and academic year to the teacher first.');
  const contract=await Contract.create({...fields,createdBy:user._id});
  return summary(contract);
}
async function updateContract(user,id,data) {
  if(user.role!=='admin')fail('Only admins can configure contracts.',403);
  await loadContract(id);
  return withContractLock(id,async()=>{
    const contract=await loadContract(id);
    const fields={...contract.toObject(),...Object.fromEntries(['totalDays','startDate','endDate','status','dayBasis'].filter(k=>data[k]!==undefined).map(k=>[k,k==='totalDays'?Number(data[k]):data[k]||null]))};
    if(!['calendar','teaching'].includes(fields.dayBasis))fail('Invalid contract day basis.');
    if(fields.dayBasis==='calendar')fields.endDate=calendarEnd(fields.startDate,fields.totalDays);
    validateContract(fields);
    if(!['active','cancelled'].includes(fields.status))fail('Invalid contract status.');
    const days=await completedDays(id);
    if(fields.dayBasis!=='calendar'&&fields.totalDays<days.length)fail('Contract days cannot be lower than completed teaching days.');
    if(days.some(day=>day<fields.startDate||(fields.endDate&&day>fields.endDate)))fail('Contract dates must include all completed teaching days.');
    for(const key of ['totalDays','startDate','endDate','status','dayBasis'])contract[key]=fields[key];
    await contract.save();return summary(contract);
  });
}
  async function createLesson(user,id,data,{outlineId=null}={}) {
  const contract=await loadContract(id);await authorize(user,contract,true);
  if(contract.status!=='active')fail('This contract is cancelled.');
    if((!outlineId||data.plannedDate)&&(!validDate(data.plannedDate)||data.plannedDate<contract.startDate||(contract.endDate&&data.plannedDate>contract.endDate)))fail('Planned date must be within the contract dates.');
    return Lesson.create({outline:outlineId,contract:contract._id,teacher:contract.teacher,course:contract.course,batch:contract.batch,title:data.title,description:data.description,plannedDate:data.plannedDate||null});
}
async function setLessonStatus(user,contractId,lessonId,status,now=new Date()) {
  const original=await loadContract(contractId);await authorize(user,original,true);
  if(!mongoose.isValidObjectId(lessonId)||!['planned','completed'].includes(status))fail('Invalid lesson or status.');
  return withContractLock(contractId,async()=>{
    const contract=await loadContract(contractId);await authorize(user,contract,true);
    const lesson=await Lesson.findOne({_id:lessonId,contract:contractId,teacher:contract.teacher});
    if(!lesson)fail('Assigned lesson not found.',404);
    if(lesson.status!==status) {
      const day=teachingDay(now);
      if(status==='completed') {
        if(contract.status!=='active')fail('This teaching contract is cancelled. Contact Admin before completing lessons.');
        if(day<contract.startDate)fail(`You can complete lessons from ${contract.startDate}, when your teaching contract starts. Today in Nairobi is ${day}. Contact Admin if the start date is incorrect.`);
        if(contract.endDate&&day>contract.endDate)fail(`This teaching contract ended on ${contract.endDate}. Contact Admin to review the contract dates.`);
        const days=await completedDays(contractId);
        if(contract.dayBasis!=='calendar'&&!days.includes(day)&&days.length>=contract.totalDays)fail('All contracted teaching days have been used.');
        lesson.status='completed';lesson.progress=100;lesson.completedAt=now;lesson.completedDay=day;lesson.completedBy=user._id;
        lesson.history.push({action:'completed',at:now,by:user._id,teachingDay:day});
      } else {
        lesson.history.push({action:'reversed',at:now,by:user._id,teachingDay:lesson.completedDay});
        lesson.status='planned';lesson.progress=0;lesson.completedAt=null;lesson.completedDay=null;lesson.completedBy=null;
      }
      await lesson.save();
    }
    return {lesson,contract:await summary(contract)};
  });
}
module.exports={calendarEnd,withContractLock,loadContract,teachingDay,validDate,validateContract,calculateBalance,summary,authorize,createContract,updateContract,createLesson,setLessonStatus};
