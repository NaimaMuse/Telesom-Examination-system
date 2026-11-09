const { isObjectIdOrHexString } = require('mongoose');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Makeup = require('../models/MakeupClass');
const { enrollmentBatch } = require('./batchService');

const fail = message => { throw Object.assign(new Error(message), {statusCode:400}); };
const cohortKey = (year,batch) => JSON.stringify([year,batch]);

async function getAttendanceSession(courseId,date) {
  if (!isObjectIdOrHexString(courseId)) fail('Choose a valid course.');
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) fail('Choose a valid date.');
  const course = await Course.findById(courseId).select('teachingSchedule academicYear batch').lean();
  if (!course) fail('Choose a valid course.');

  const teachingDays = course.teachingSchedule?.map(slot => slot.day).sort((a,b) => a-b) || [];
  if (teachingDays.includes(date.getUTCDay())) return {kind:'regular',teachingDays};

  const start = new Date(date.toISOString().slice(0,10) + 'T00:00:00+03:00');
  const end = new Date(start.getTime() + 86400000);
  const makeups = await Makeup.find({course:courseId,status:'scheduled',start:{$gte:start,$lt:end}})
    .select('academicYear batch').lean();
  if (!makeups.length) return {kind:'none',teachingDays};

  const cohorts = new Set(makeups.map(row => cohortKey(row.academicYear,row.batch)));
  const enrollments = await Enrollment.find({course:courseId,status:'enrolled',academicYear:{$in:makeups.map(row => row.academicYear)}})
    .select('student academicYear batch').lean();
  const eligibleStudents = new Set(enrollments.filter(row => cohorts.has(
    cohortKey(row.academicYear,enrollmentBatch({...row,course}))
  )).map(row => String(row.student)));
  return {kind:'makeup',teachingDays,eligibleStudents};
}

function canMarkAttendance(session,studentId) {
  return session.kind === 'regular' || Boolean(session.eligibleStudents?.has(String(studentId)));
}

function requireScheduledAttendance(session,studentId) {
  if (!canMarkAttendance(session,studentId)) fail('No class is scheduled for this student on the selected date.');
}

module.exports = {getAttendanceSession,canMarkAttendance,requireScheduledAttendance};
