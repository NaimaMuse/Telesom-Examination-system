require('dotenv').config({ path: require('node:path').join(__dirname, '../.env') });
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const mongoose = require('mongoose');
const { app } = require('../server');
const token = require('../utils/generateToken');
const User = require('../models/User');
const Student = require('../models/Student');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Certificate = require('../models/Certificate');

const dbName = 'telesom_certificate_test_' + randomBytes(6).toString('hex');
let server;

(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { dbName, serverSelectionTimeoutMS: 8000 });
  assert.equal(mongoose.connection.name, dbName);
  await Certificate.init();
  const admin = await User.create({ name: 'Admin', email: 'admin@certificate.test', role: 'admin', password: 'Test-password-123!' });
  const owner = await User.create({ name: 'Student One', role: 'student' });
  const other = await User.create({ name: 'Student Two', role: 'student' });
  const student = await Student.create({ user: owner._id, studentId: 'TA26001' });
  const otherStudent = await Student.create({ user: other._id, studentId: 'TA26002' });
  const course = await Course.create({
    name: 'Digital Marketing & Branding', courseCode: 'DMB', academicYear: '2026', credits: 3,
    durationWeeks: 16,
    teachingSchedule: [
      { day: 1, startTime: '09:00', endTime: '11:00' },
      { day: 3, startTime: '09:00', endTime: '11:00' },
    ],
  });
  const enrollment = await Enrollment.create({ student: student._id, course: course._id, academicYear: '2026' });
  const otherEnrollment = await Enrollment.create({ student: otherStudent._id, course: course._id, academicYear: '2026', status: 'completed' });
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const root = `http://127.0.0.1:${server.address().port}/api/certificates`;
  const request = (method, path, user, body) => fetch(root + path, {
    method,
    headers: { Authorization: 'Bearer ' + token(user._id), 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body),
  });
  const details = { enrollmentId: String(enrollment._id), suffix: '0001', studentName: 'Student One Extended', creditHours: 1 };
  const courses = await request('GET', '/courses', admin);
  assert.deepEqual((await courses.json()).data.map(row => [row._id, row.creditHours]), [[String(course._id), 64]]);
  const rosterPath = `/courses/${course._id}/students`;
  assert.equal((await request('GET', rosterPath, owner)).status, 403);
  const find = await request('GET', rosterPath, admin);
  assert.equal(find.status, 200);
  assert.deepEqual((await find.json()).data.map(row => [row.studentId, row.status]),
    [['TA26001', 'enrolled'], ['TA26002', 'completed']]);
  assert.equal((await request('POST', '', admin, details)).status, 409);
  const complete = `/enrollments/${enrollment._id}/complete`;
  assert.equal((await request('PATCH', complete, owner)).status, 403);
  assert.equal((await request('PATCH', complete, admin)).status, 200);
  assert.equal((await request('POST', '', owner, details)).status, 403);
  assert.equal((await request('POST', '', admin, { ...details, suffix: 'abc' })).status, 400);
  const beforeIssue = Date.now();
  const issued = await request('POST', '', admin, details);
  assert.equal(issued.status, 201, await issued.clone().text());
  const { data } = await issued.json();
  const issuedTime = new Date(data.awardedAt);
  assert(issuedTime.getTime() >= beforeIssue && issuedTime.getTime() <= Date.now());
  const year = new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Africa/Nairobi' }).format(issuedTime);
  assert.equal(data.certificateNo, `TA: ${year}-0001`);
  assert.equal(data.studentName, details.studentName);
  assert.equal(data.courseTitle, course.name);
  assert.equal(data.creditHours, 64);
  assert.equal((await request('POST', '', admin, { ...details, suffix: '0002' })).status, 409);
  assert.equal((await request('POST', '', admin, { ...details, enrollmentId: String(otherEnrollment._id) })).status, 409);
  const roster = (await (await request('GET', rosterPath, admin)).json()).data;
  assert.equal(roster.find(row => row.studentId === 'TA26001').certificate.certificateNo, data.certificateNo);
  assert.equal(roster.find(row => row.studentId === 'TA26002').certificate, undefined);
  await Course.updateOne({ _id: course._id }, { $set: { durationWeeks: null } });
  assert.equal((await request('POST', '', admin, { ...details, enrollmentId: String(otherEnrollment._id), suffix: '0002' })).status, 409);
  await Course.updateOne({ _id: course._id }, { $set: { durationWeeks: 18 } });
  const list = async user => (await (await request('GET', '', user)).json()).data;
  assert.deepEqual((await list(owner)).map(row => [row._id, row.creditHours]), [[data._id, 64]]);
  assert.deepEqual(await list(other), []);
  const pdf = `/${data._id}/pdf`;
  assert.equal((await request('GET', pdf, other)).status, 404);
  const response = await request('GET', pdf, owner);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/pdf');
  assert.equal(Buffer.from(await response.arrayBuffer()).subarray(0, 8).toString(), '%PDF-1.4');
  const second = await request('POST', '', admin, {
    enrollmentId: String(otherEnrollment._id), suffix: '0002', courseTitle: 'Digital Marketing',
  });
  assert.equal(second.status, 201);
  const secondCertificate = (await second.json()).data;
  assert.equal(secondCertificate.creditHours, 72);
  assert.equal(secondCertificate.courseTitle, 'Digital Marketing');
  assert.equal((await request('GET', `/${secondCertificate._id}/pdf`, owner)).status, 404);
  console.log('Certificate integration passed: completion, role permissions, credit snapshot, unique numbers and PDF ownership.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (mongoose.connection.readyState === 1 && mongoose.connection.name === dbName) {
    await mongoose.connection.dropDatabase();
  }
  await mongoose.disconnect();
});
