const assert=require('node:assert/strict');
const Attendance=require('../models/TeacherAttendance');
const Lesson=require('../models/TeachingLesson');
const {summary}=require('../services/teacherContractService');
const original=Attendance.distinct;
const originalLessons=Lesson.distinct;
let dates=['2026-11-18'];
Attendance.distinct=async(field,filter)=>{
  assert.equal(field,'date');
  assert.deepEqual(filter,{contract:'contract-1',status:'present'});
  return dates;
};
Lesson.distinct=()=>{throw Error('Lesson completion must not drive attendance totals');};
(async()=>{
  const contract={_id:'contract-1',startDate:'2026-11-01',endDate:'2026-12-01',totalDays:10,status:'active',course:{teachingSchedule:[{day:3}]}};
  assert.equal((await summary(contract)).completedTeachingDays,1);
  dates=['2026-11-18','2026-11-18'];
  assert.equal((await summary(contract)).completedTeachingDays,1);
  dates=[];
  assert.equal((await summary(contract)).completedTeachingDays,0);
  const calendar={...contract,dayBasis:'calendar',startDate:'2026-11-01',totalDays:120,course:{teachingSchedule:[{day:1},{day:3}]}};
  dates=['2026-11-02','2026-11-04','2026-11-09','2026-11-11','2026-11-16'];
  const balance=await summary(calendar);
  assert.equal(balance.targetTeachingDays,32);
  assert.equal(balance.completedTeachingDays,5);
  assert.equal(balance.remainingTeachingDays,27);
  dates=dates.slice(0,4);
  assert.equal((await summary(calendar)).remainingTeachingDays,28);
  console.log('Contract attendance passed: Present counts once; reversing to Absent removes it; lesson completion does not count.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{
  Attendance.distinct=original;Lesson.distinct=originalLessons;
});
