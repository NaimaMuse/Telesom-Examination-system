const assert=require('assert');
const {calculateBalance,teachingDay,validDate,validateContract}=require('../services/teacherContractService');
const contract={totalDays:90,startDate:'2026-01-01',status:'active'};
let balance=calculateBalance(contract,['2026-10-01','2026-10-01','2026-10-02'],new Date('2026-10-27T10:00:00Z'));
assert.strictEqual(balance.completedTeachingDays,2);assert.strictEqual(balance.remainingContractDays,88);
assert.strictEqual(calculateBalance(contract,['2026-10-02']).remainingContractDays,89);
assert.strictEqual(calculateBalance(contract,[]).remainingContractDays,90);
assert.strictEqual(teachingDay(new Date('2026-10-26T20:59:59Z')),'2026-10-26');
assert.strictEqual(teachingDay(new Date('2026-10-26T21:00:00Z')),'2026-10-27');
assert.strictEqual(validDate('2026-02-30'),false);assert.strictEqual(validDate('2028-02-29'),true);
assert.throws(()=>validateContract({...contract,totalDays:1.5,batch:'B1',academicYear:'2026'}));
assert.throws(()=>validateContract({...contract,endDate:'2025-01-01',batch:'B1',academicYear:'2026'}));
assert.strictEqual(calculateBalance({...contract,totalDays:1},['2026-01-01','2026-01-02']).remainingContractDays,0);
console.log('Contract balance tests passed: unique days, reversals, Nairobi midnight, date validation and non-negative balances.');

const {calendarEnd}=require('../services/teacherContractService');
assert.strictEqual(calendarEnd('2026-11-02',120),'2027-03-01');
assert.strictEqual(calendarEnd('2028-02-28',3),'2028-03-01');
assert.strictEqual(calendarEnd('2026-11-02',1),'2026-11-02');
assert.throws(()=>calendarEnd('2026-02-30',120));
assert.throws(()=>calendarEnd('2026-11-02',0));
const calendar={...contract,startDate:'2026-11-02',totalDays:120,dayBasis:'calendar'};
const at=value=>new Date(value+'T12:00:00+03:00');
assert.strictEqual(calculateBalance(calendar,[],at('2026-11-01')).remainingContractDays,120);
assert.strictEqual(calculateBalance(calendar,[],at('2026-11-02')).remainingContractDays,119);
assert.strictEqual(calculateBalance(calendar,['2026-11-02'],at('2026-11-02')).remainingContractDays,119);
assert.strictEqual(calculateBalance(calendar,[],at('2027-03-01')).contractStatus,'Active');
assert.strictEqual(calculateBalance(calendar,[],at('2027-03-02')).contractStatus,'Expired');
assert.strictEqual(calculateBalance(calendar,[],at('2027-03-02')).remainingContractDays,0);
console.log('Calendar contracts passed: inclusive dates, leap year, elapsed days independent of lessons, and expiry.');

const Course=require('../models/Course');
assert(new Course({teachingSchedule:[{day:7,startTime:'08:00',endTime:'10:00'}]}).validateSync());
assert(new Course({teachingSchedule:[{day:1,startTime:'10:00',endTime:'08:00'}]}).validateSync());
assert(new Course({teachingSchedule:[{day:1,startTime:'08:00',endTime:'10:00'},{day:1,startTime:'11:00',endTime:'12:00'}]}).validateSync());
assert.equal(new Course({teachingSchedule:[{day:1,startTime:'08:00',endTime:'10:00'}]}).validateSync(),undefined);

const fourMonthContract = {
  ...calendar, startDate:'2026-11-05', totalDays:120,
  course:{teachingSchedule:[{day:1},{day:2},{day:3},{day:3}]}
};
const fourMonthBalance = calculateBalance(fourMonthContract,['2026-11-09','2026-11-09'],at('2026-11-10'));
assert.strictEqual(fourMonthBalance.endDate,'2027-03-04');
assert.strictEqual(fourMonthBalance.scheduledTeachingDays,51);
assert.strictEqual(fourMonthBalance.completedTeachingDays,1);
assert.strictEqual(fourMonthBalance.remainingScheduledTeachingDays,50);
assert.strictEqual(calculateBalance(fourMonthContract,[],at('2027-03-05')).remainingScheduledTeachingDays,0);
assert.strictEqual(fourMonthBalance.targetTeachingDays,48);
assert.strictEqual(calculateBalance({...fourMonthContract,startDate:'2026-06-01',totalDays:122},[],at('2026-06-01')).targetTeachingDays,48);
