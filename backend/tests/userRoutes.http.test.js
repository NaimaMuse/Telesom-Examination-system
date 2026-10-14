const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const generateToken = require('../utils/generateToken');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const BASE_URL = `http://localhost:${process.env.PORT || 5000}`;
const stamp = Date.now();
const adminEmail = `userctrl.admin.${stamp}@telesom.local`;
const studentEmail = `userctrl.student.${stamp}@telesom.local`;
const teacherEmail = `userctrl.teacher.${stamp}@telesom.local`;
const studentId = `TST-${stamp}`;
const teacherId = `TCH-${stamp}`;

const createdIds = {
  adminUser: null,
  studentUser: null,
  studentProfile: null,
  teacherUser: null,
  teacherProfile: null,
};

const requestJson = async (method, urlPath, { token, body } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${urlPath}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (error) {
    json = { raw: text };
  }

  return { status: response.status, json };
};

const run = async () => {
  let passed = 0;
  let failed = 0;

  const assert = (condition, testName) => {
    if (condition) {
      console.log(`PASS: ${testName}`);
      passed++;
    } else {
      console.error(`FAIL: ${testName}`);
      failed++;
    }
  };

  if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
    throw new Error('MONGODB_URI and JWT_SECRET must be set in backend/.env');
  }

  const health = await requestJson('GET', '/api/health');
  assert(
    health.status === 200 && health.json?.status === 'success',
    'GET /api/health is reachable'
  );

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 8000,
  });
  console.log('Connected to MongoDB for test setup');

  const adminPassword = 'AdminTestPass1';
  const adminUser = await User.create({
    name: 'User Controller Test Admin',
    email: adminEmail,
    password: await bcrypt.hash(adminPassword, 10),
    role: 'admin',
    isActive: true,
  });
  createdIds.adminUser = adminUser._id;

  const adminToken = generateToken(adminUser._id);

  const unauthenticated = await requestJson('POST', '/api/users/students', {
    body: {
      name: 'Blocked Student',
      email: studentEmail,
      studentId,
      gender: 'female',
    },
  });
  assert(
    unauthenticated.status === 401,
    'POST /api/users/students rejects missing JWT'
  );

  const studentTokenUser = await User.create({
    name: 'Temporary Student Token User',
    email: `userctrl.studenttoken.${stamp}@telesom.local`,
    role: 'student',
    isActive: true,
  });
  const studentToken = generateToken(studentTokenUser._id);
  const forbidden = await requestJson('POST', '/api/users/students', {
    token: studentToken,
    body: {
      name: 'Blocked Student',
      email: studentEmail,
      studentId,
      gender: 'female',
    },
  });
  assert(
    forbidden.status === 403,
    'POST /api/users/students rejects a non-admin JWT'
  );
  await User.findByIdAndDelete(studentTokenUser._id);

  const createdStudent = await requestJson('POST', '/api/users/students', {
    token: adminToken,
    body: {
      name: 'Test Student',
      email: studentEmail,
      studentId,
      gender: 'female',
      academicYear: '2026',
    },
  });
  createdIds.studentUser = createdStudent.json?.data?.user?._id;
  createdIds.studentProfile = createdStudent.json?.data?.student?._id;
  assert(
    createdStudent.status === 201 &&
      createdStudent.json?.data?.user?.role === 'student' &&
      createdStudent.json?.data?.student?.studentId === studentId &&
      createdStudent.json?.data?.user?.password === undefined,
    'Admin can create a student account'
  );

  const storedStudentUser = await User.findById(createdIds.studentUser).select(
    '+password'
  );
  assert(
    storedStudentUser && storedStudentUser.password === undefined,
    'Created student user has no password hash stored'
  );

  const duplicateStudent = await requestJson('POST', '/api/users/students', {
    token: adminToken,
    body: {
      name: 'Test Student',
      email: studentEmail,
      studentId,
      gender: 'female',
    },
  });
  assert(
    duplicateStudent.status === 409,
    'Duplicate student email or ID returns 409'
  );

  const createdTeacher = await requestJson('POST', '/api/users/teachers', {
    token: adminToken,
    body: {
      name: 'Test Teacher',
      email: teacherEmail,
      password: 'TeacherPass1',
      teacherId,
      department: 'Networking',
    },
  });
  createdIds.teacherUser = createdTeacher.json?.data?.user?._id;
  createdIds.teacherProfile = createdTeacher.json?.data?.teacher?._id;
  const teacherResponseHasNoPassword =
    createdTeacher.json?.data?.user?.password === undefined &&
    createdTeacher.json?.data?.teacher &&
    !('password' in createdTeacher.json.data.teacher);
  assert(
    createdTeacher.status === 201 &&
      createdTeacher.json?.data?.user?.role === 'teacher' &&
      createdTeacher.json?.data?.teacher?.teacherId === teacherId &&
      teacherResponseHasNoPassword,
    'Admin can create a teacher account without exposing the password'
  );

  const storedTeacherUser = await User.findById(createdIds.teacherUser).select(
    '+password'
  );
  const teacherHashMatches = storedTeacherUser?.password
    ? await bcrypt.compare('TeacherPass1', storedTeacherUser.password)
    : false;
  assert(
    teacherHashMatches,
    'Created teacher password is stored as a bcrypt hash'
  );

  const teacherLogin = await requestJson('POST', '/api/auth/login', {
    body: { email: teacherEmail, password: 'TeacherPass1' },
  });
  assert(
    teacherLogin.status === 200 && teacherLogin.json?.user?.role === 'teacher',
    'Created teacher can log in with email and password'
  );

  const studentLogin = await requestJson('POST', '/api/auth/login', {
    body: { studentId },
  });
  assert(
    studentLogin.status === 200 && studentLogin.json?.user?.role === 'student',
    'Created student can log in with Student ID only'
  );

  console.log(`\nHTTP tests finished: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exitCode = 1;
  }
};

const cleanup = async () => {
  try {
    if (createdIds.studentProfile) {
      await Student.findByIdAndDelete(createdIds.studentProfile);
    }
    if (createdIds.teacherProfile) {
      await Teacher.findByIdAndDelete(createdIds.teacherProfile);
    }
    if (createdIds.studentUser) {
      await User.findByIdAndDelete(createdIds.studentUser);
    }
    if (createdIds.teacherUser) {
      await User.findByIdAndDelete(createdIds.teacherUser);
    }
    if (createdIds.adminUser) {
      await User.findByIdAndDelete(createdIds.adminUser);
    }
    await Student.deleteMany({ studentId });
    await Teacher.deleteMany({ teacherId });
    await User.deleteMany({
      email: { $in: [adminEmail, studentEmail, teacherEmail] },
    });
  } catch (error) {
    console.error('Cleanup warning:', error.message);
  } finally {
    await mongoose.disconnect();
  }
};

run()
  .catch((error) => {
    console.error('HTTP test execution error:', error.message);
    process.exitCode = 1;
  })
  .finally(cleanup);
