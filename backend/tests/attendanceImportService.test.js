const assert = require('assert');
const {
  parseAttendanceCsv,
} = require('../services/attendanceImportService');

const csv =
  '\uFEFFStudent ID,Date,Status,Remarks\r\n' +
  'std-1001,2026-10-01,present,"Arrived, on time"\r\n' +
  'std-1002,2026-10-02,late,"Needs ""follow-up"""\r\n';

const records = parseAttendanceCsv(csv);
assert.deepStrictEqual(records, [
  {
    studentId: 'std-1001',
    date: '2026-10-01',
    status: 'present',
    remarks: 'Arrived, on time',
  },
  {
    studentId: 'std-1002',
    date: '2026-10-02',
    status: 'late',
    remarks: 'Needs "follow-up"',
  },
]);
assert.throws(
  () => parseAttendanceCsv('studentId,status\nstd-1,present'),
  /missing the required "date" column/
);
assert.throws(
  () => parseAttendanceCsv('studentId,date,status\nstd-1,2026-10-01,"present'),
  /unterminated quoted field/
);

console.log('Attendance CSV parser tests passed.');
