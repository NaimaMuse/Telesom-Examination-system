const path = require('path');
const fs = require('fs/promises');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const {verifyPassword} = require('../utils/passwords');
const User = require('../models/User');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Exam = require('../models/Exam');
const ExamResult = require('../models/ExamResult');
const Quiz = require('../models/Quiz');
const QuizResult = require('../models/QuizResult');
const Attendance = require('../models/Attendance');
const AttendanceImport = require('../models/AttendanceImport');
const generateToken = require('../utils/generateToken');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

let BASE_URL;
let testServer;
const isolatedDbName = `telesom_user_test_${require('crypto').randomBytes(6).toString('hex')}`;
const stamp = Date.now();
const adminEmail = `userctrl.admin.${stamp}@telesom.local`;
const studentEmail = `userctrl.student.${stamp}@telesom.local`;
const teacherEmail = `userctrl.teacher.${stamp}@telesom.local`;
let studentId;
let teacherId;
let teacherPassword;

const createdIds = {
  adminUser: null,
  studentUser: null,
  studentProfile: null,
  teacherUser: null,
  teacherProfile: null,
  course: null,
  enrollment: null,
  exam: null,
  examResult: null,
  quiz: null,
  quizResult: null,
  attendanceImport: null,
  attendanceFile: null,
};
let databaseConnected = false;

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

const requestMultipart = async (urlPath, formData, token) => {
  const response = await fetch(`${BASE_URL}${urlPath}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
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

const assertSafeTestDatabase = (connectionString) => {
  let databaseUrl;
  try {
    databaseUrl = new URL(connectionString);
  } catch (error) {
    throw new Error('Integration tests require a valid local test database URI');
  }
  const databaseName = decodeURIComponent(databaseUrl.pathname)
    .replace(/^\/+/, '')
    .split('/')[0];
  const isLocal =
    ['localhost', '127.0.0.1', '[::1]'].includes(databaseUrl.hostname);
  const isTestDatabase = /(^|[_-])test($|[_-])/i.test(databaseName);
  if (!isLocal || !isTestDatabase) {
    throw new Error(
      'Integration tests only run against a local database whose name includes "test"'
    );
  }
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
  const isolatedUrl = new URL(process.env.MONGODB_URI);
  isolatedUrl.pathname = '/'+isolatedDbName;
  process.env.MONGODB_URI = isolatedUrl.toString();
  assertSafeTestDatabase(process.env.MONGODB_URI);
  await mongoose.connect(process.env.MONGODB_URI, {serverSelectionTimeoutMS:8000});
  if(mongoose.connection.name!==isolatedDbName)throw new Error('Unexpected test database');
  databaseConnected = true;
  const {app}=require('../server');
  testServer=await new Promise(resolve=>{const server=app.listen(0,'127.0.0.1',()=>resolve(server));});
  BASE_URL='http://127.0.0.1:'+testServer.address().port;

  const health = await requestJson('GET', '/api/health');
  assert(
    health.status === 200 && health.json?.status === 'success',
    'GET /api/health is reachable'
  );


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
  studentId = createdStudent.json?.data?.student?.studentId;
  assert(
    createdStudent.status === 201 &&
      createdStudent.json?.data?.user?.role === 'student' &&
      /^TL-\d{4}-\d{2,}$/.test(studentId) &&
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
  teacherId = createdTeacher.json?.data?.teacher?.teacherId;
  teacherPassword = createdTeacher.json?.data?.credentials?.temporaryPassword;
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
    ? await verifyPassword(teacherPassword, storedTeacherUser.password)
    : false;
  assert(
    teacherHashMatches,
    'Created teacher password is stored as a verifiable hash'
  );

  const teacherLogin = await requestJson('POST', '/api/auth/login', {
    body: { email: teacherEmail, password: teacherPassword },
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

  const attendanceDate = new Date().toISOString().slice(0, 10);
  const createdCourse = await requestJson('POST', '/api/courses', {
    token: adminToken,
    body: {
      courseCode: `INT-${stamp}`,
      title: 'Integration Test Course',
      credits: 3,
      teachingSchedule: [{day:new Date(attendanceDate).getUTCDay(),startTime:'08:00',endTime:'10:00'}],
      academicYear: '2026',
    },
  });
  createdIds.course = createdCourse.json?.data?._id;
  assert(
    createdCourse.status === 201 && createdIds.course,
    'Admin can create a course'
  );

  const studentRecord = await Student.findById(createdIds.studentProfile);
  const enrollment = await requestJson('POST', '/api/enrollments', {
    token: adminToken,
    body: {
      student: createdIds.studentProfile,
      course: createdIds.course,
      academicYear: '2026',
      semester: '1',
    },
  });
  createdIds.enrollment = enrollment.json?.data?._id;
  assert(
    enrollment.status === 201 && createdIds.enrollment,
    'Admin can enroll a student in a course'
  );

  const assignment=await requestJson('POST','/api/course-teachers',{token:adminToken,body:{teacher:createdIds.teacherProfile,course:createdIds.course,academicYear:'2026'}});
  createdIds.assignment=assignment.json?.data?._id;
  assert(assignment.status===201,'Admin assigns the course to the teacher');
  const examDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const exam = await requestJson('POST', '/api/exams', {
    token: teacherLogin.json?.token,
    body: {
      title: 'Integration Test Exam',
      examCode: `INT-${stamp}`,
      course: createdIds.course,
      totalMarks: 70,
      passingMarks: 35,
      examDate,
      durationMinutes: 60,
    },
  });
  if(exam.status!==201)console.error('Exam creation response:',exam.status,exam.json?.message);
  createdIds.exam = exam.json?.data?._id;
  assert(exam.status === 201 && createdIds.exam, 'Assigned teacher can schedule an exam');

  const examResult = await requestJson('POST', '/api/exam-results', {
    token: adminToken,
    body: {
      exam: createdIds.exam,
      student: createdIds.studentProfile,
      marksObtained: 56,
    },
  });
  createdIds.examResult = examResult.json?.data?._id;
  assert(
    examResult.status === 201 &&
      examResult.json?.data?.percentage === 80 &&
      examResult.json?.data?.isPassed === true,
    'Exam results calculate percentage and pass status'
  );

  const quiz = await requestJson('POST', '/api/quizzes', {
    token: adminToken,
    body: {
      title: 'Integration Test Quiz',
      quizCode: `INT-${stamp}`,
      course: createdIds.course,
      totalMarks: 20,
      passingMarks: 10,
      quizDate: examDate,
      durationMinutes: 30,
    },
  });
  createdIds.quiz = quiz.json?.data?._id;
  assert(quiz.status === 201 && createdIds.quiz, 'Admin can create a quiz');

  const quizResult = await requestJson('POST', '/api/quiz-results', {
    token: adminToken,
    body: {
      quiz: createdIds.quiz,
      student: createdIds.studentProfile,
      marksObtained: 15,
    },
  });
  createdIds.quizResult = quizResult.json?.data?._id;
  assert(
    quizResult.status === 201 &&
      quizResult.json?.data?.percentage === 75 &&
      quizResult.json?.data?.isPassed === true,
    'Quiz results calculate percentage and pass status'
  );

  const attendanceMonth = attendanceDate.slice(0, 7);
  const attendanceForm = new FormData();
  attendanceForm.append('course', createdIds.course);
  attendanceForm.append('attendanceMonth', attendanceMonth);
  attendanceForm.append('academicYear', '2026');
  attendanceForm.append(
    'file',
    new Blob(
      [`studentId,date,status,remarks\n${studentRecord.studentId},${attendanceDate},present,Integration test`],
      { type: 'text/csv' }
    ),
    'attendance.csv'
  );
  const importedAttendance = await requestMultipart(
    '/api/attendance-imports',
    attendanceForm,
    adminToken
  );
  createdIds.attendanceImport = importedAttendance.json?.data?._id;
  createdIds.attendanceFile =
    importedAttendance.json?.data?.fileStoragePath || null;
  assert(
    importedAttendance.status === 201 &&
      importedAttendance.json?.data?.summary?.successfulRecords === 1,
    'Admin can upload and import attendance CSV'
  );

  const studentDashboard = await requestJson('GET', '/api/dashboard', {
    token: studentLogin.json?.token,
  });
  assert(
    studentDashboard.status === 200 &&
      studentDashboard.json?.data?.totals?.courses === 1,
    'Student dashboard contains only their enrolled course data'
  );
  const studentProfile = await requestJson('GET', '/api/profile', {
    token: studentLogin.json?.token,
  });
  assert(
    studentProfile.status === 200 &&
      studentProfile.json?.data?.profile?.studentId === studentId,
    'Student can retrieve their own profile'
  );

  const deactivatedStudent = await requestJson(
    'DELETE',
    `/api/students/${createdIds.studentProfile}`,
    { token: adminToken }
  );
  const studentAccountAfterDeactivation = await User.findById(
    createdIds.studentUser
  );
  assert(
    deactivatedStudent.status === 200 &&
      deactivatedStudent.json?.data?.status === 'dropped' &&
      studentAccountAfterDeactivation?.isActive === false,
    'Student deactivation preserves records and disables account access'
  );

  const deactivatedTeacher = await requestJson(
    'DELETE',
    `/api/teachers/${createdIds.teacherProfile}`,
    { token: adminToken }
  );
  const teacherAccountAfterDeactivation = await User.findById(
    createdIds.teacherUser
  );
  assert(
    deactivatedTeacher.status === 200 &&
      deactivatedTeacher.json?.data?.status === 'inactive' &&
      teacherAccountAfterDeactivation?.isActive === false,
    'Teacher deactivation preserves records and disables account access'
  );

  console.log(`\nHTTP tests finished: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exitCode = 1;
  }
};

const cleanup = async () => {
  if (!databaseConnected) {
    return;
  }
  try {
    if (createdIds.attendanceImport) {
      await Attendance.deleteMany({ importBatch: createdIds.attendanceImport });
      await AttendanceImport.findByIdAndDelete(createdIds.attendanceImport);
    }
    if (createdIds.attendanceFile) {
      const uploadsDirectory = path.resolve(
        __dirname,
        '..',
        'uploads',
        'attendance'
      );
      const uploadedFilePath = path.resolve(
        __dirname,
        '..',
        createdIds.attendanceFile
      );
      const relativeUploadPath = path.relative(
        uploadsDirectory,
        uploadedFilePath
      );
      if (
        relativeUploadPath.startsWith('..') ||
        path.isAbsolute(relativeUploadPath)
      ) {
        throw new Error('Integration cleanup refused an unexpected upload path');
      }
      await fs.unlink(uploadedFilePath).catch((error) => {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      });
    }
    if (createdIds.quizResult) {
      await QuizResult.findByIdAndDelete(createdIds.quizResult);
    }
    if (createdIds.examResult) {
      await ExamResult.findByIdAndDelete(createdIds.examResult);
    }
    if (createdIds.quiz) {
      await Quiz.findByIdAndDelete(createdIds.quiz);
    }
    if (createdIds.exam) {
      await Exam.findByIdAndDelete(createdIds.exam);
    }
    if (createdIds.enrollment) {
      await Enrollment.findByIdAndDelete(createdIds.enrollment);
    }
    if(createdIds.assignment)await require('../models/CourseTeacher').findByIdAndDelete(createdIds.assignment);
    if (createdIds.course) {
      await Course.findByIdAndDelete(createdIds.course);
    }
    await Quiz.deleteMany({ quizCode: `INT-${stamp}` });
    await Exam.deleteMany({ examCode: `INT-${stamp}` });
    await Course.deleteMany({ courseCode: `INT-${stamp}` });
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
    if(testServer)await new Promise(resolve=>testServer.close(resolve));
    await mongoose.disconnect();
    databaseConnected = false;
  }
};

run()
  .catch((error) => {
    console.error('HTTP test execution error:', error.message);
    process.exitCode = 1;
  })
  .finally(cleanup);
