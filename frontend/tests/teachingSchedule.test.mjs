import assert from 'node:assert/strict';
import {classesOnDate,contractEndDate,makeupClassesByDate,studentClassesOnDate,teachingDateKey} from '../src/pages/teacher/teachingSchedule.mjs';
const contract={_id:'c',startDate:'2026-11-02',totalDays:120,dayBasis:'calendar',status:'active',batch:'A',academicYear:'2026',course:{batch:'A',academicYear:'2026',teachingSchedule:[{day:1,startTime:'08:00',endTime:'10:00'},{day:3,startTime:'10:00',endTime:'11:00'}]}};
assert.equal(contractEndDate(contract.startDate,120),'2027-03-01');
assert.equal(contractEndDate('',120),'');
assert.equal(classesOnDate([contract],'2026-11-02').length,1);
assert.equal(classesOnDate([contract],'2026-11-04')[0].slot.startTime,'10:00');
assert.equal(classesOnDate([contract],'2026-11-03').length,0);
assert.equal(classesOnDate([contract],'2026-10-26').length,0);
assert.equal(classesOnDate([contract],'2027-03-01').length,1);
assert.equal(classesOnDate([contract],'2027-03-08').length,0);
assert.equal(classesOnDate([{...contract,status:'cancelled'}],'2026-11-02').length,0);
assert.equal(classesOnDate([{...contract,batch:'B'}],'2026-11-02').length,0);
assert.equal(classesOnDate([{...contract,dayBasis:'teaching',endDate:'2027-05-01'}],'2027-03-08').length,1);
assert.equal(classesOnDate([{...contract,course:{}}],'2026-11-02').length,0);
console.log('Weekly calendar passed: recurrence, times, inclusive bounds, cancellation, batch scope and legacy duration.');

assert.equal(contractEndDate('2026-02-30',120),'');
assert.equal(classesOnDate([{...contract,activeAssignment:false}],'2026-11-02').length,0);
assert.equal(classesOnDate([{...contract,dayBasis:undefined,totalDays:3}],'2026-11-09').length,1);
const weekly = {weekly:true,course:contract.course};
assert.equal(studentClassesOnDate([weekly],'2026-10-26').length,1);
assert.equal(studentClassesOnDate([contract,weekly],'2026-11-02').length,1);

const makeup = {_id:'m', status:'scheduled', start:'2026-11-08T22:00:00Z', end:'2026-11-08T23:30:00Z'};
assert.equal(teachingDateKey(makeup.start),'2026-11-09');
assert.deepEqual(makeupClassesByDate([makeup]).get('2026-11-09'),[makeup]);
assert.equal(makeupClassesByDate([{...makeup,status:'cancelled'}]).size,0);
const rescheduled = {_id:makeup._id,status:'scheduled',date:'2026-11-10'};
const makeupDates = makeupClassesByDate([rescheduled]);
assert.equal(makeupDates.has('2026-11-09'),false);
assert.deepEqual(makeupDates.get('2026-11-10'),[rescheduled]);

const {contractDurationDays,contractDurationLabel}=await import('../src/pages/teacher/teachingSchedule.mjs');
assert.equal(contractDurationDays('2026-11-05',4,'months'),120);
assert.equal(contractDurationLabel({dayBasis:'calendar',startDate:'2026-11-05',endDate:'2027-03-04',totalContractDays:120}),'4 months');
assert.equal(contractDurationDays('2027-01-31',1,'months'),28);
