import assert from 'node:assert/strict';
import {classesOnDate,contractEndDate} from '../src/pages/teacher/teachingSchedule.mjs';
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
