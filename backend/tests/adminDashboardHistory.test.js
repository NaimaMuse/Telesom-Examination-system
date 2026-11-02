const assert=require('assert/strict');const {dashboardHistory}=require('../services/adminDashboardHistoryService');
const rows=dashboardHistory({Student:[{_id:'2025-10',count:3},{_id:'2026-09',count:2},{_id:'2026-10',count:4}],Course:[{_id:'2026-10',count:1}],Exam:[{_id:'2026-10',count:2}],Quiz:[{_id:'2026-09',count:1}]},new Date('2026-10-29T08:00:00Z'));
assert.equal(rows.length,12);assert.equal(rows[0].month,'2025-11');assert.equal(rows[0].students,3);assert.equal(rows.at(-2).students,5);assert.equal(rows.at(-1).students,9);assert.equal(rows.at(-1).assessments,3);assert.equal(rows.at(-1).courses,1);
assert.equal(dashboardHistory({},new Date('2026-12-31T21:30:00Z')).at(-1).month,'2027-01','Nairobi year rollover');assert(dashboardHistory({},new Date()).every(r=>r.students===0));
console.log('Dashboard history tests passed: real cumulative counts, empty months, exam + quiz totals, previous month and Nairobi year rollover.');
