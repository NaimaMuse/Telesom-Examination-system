const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { login } = require('../controllers/authController');
const User = require('../models/User');
const Student = require('../models/Student');

process.env.JWT_SECRET = 'test_secret_for_login_tests_12345';
process.env.JWT_ALGORITHM = 'HS256';
process.env.JWT_EXPIRES_IN = '7d';

const runTests = async () => {
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

  const createMock = (body) => {
    const req = {
      body: body || {},
    };
    let responseBody = null;
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        responseBody = data;
        return this;
      },
    };
    let nextError = null;
    let nextCalled = false;
    const next = (err) => {
      nextCalled = true;
      nextError = err;
    };
    return {
      req,
      res,
      next,
      getResult: () => ({
        nextCalled,
        nextError,
        statusCode: res.statusCode,
        responseBody,
      }),
    };
  };

  const plainPassword = 'SecretPassword123';
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  // Save original model methods
  const origStudentFindOne = Student.findOne;
  const origUserFindById = User.findById;
  const origUserFindOne = User.findOne;
  const origUserFindByIdAndUpdate = User.findByIdAndUpdate;

  console.log('--- Running Login Controller Tests (Student ID-Only Login & Staff Login) ---\n');

  // Test 1: Valid Student ID login without a password
  {
    const studentUserId = new mongoose.Types.ObjectId();
    const mockStudent = {
      _id: new mongoose.Types.ObjectId(),
      studentId: 'STD-1001',
      user: studentUserId,
    };
    const mockUser = {
      _id: studentUserId,
      name: 'Ahmed Student',
      email: 'ahmed@student.telesom.com',
      role: 'student',
      isActive: true,
    };

    Student.findOne = () => Promise.resolve(mockStudent);
    User.findById = () => Promise.resolve(mockUser);
    User.findByIdAndUpdate = () => Promise.resolve();

    // Notice: NO password provided in body
    const { req, res, next, getResult } = createMock({
      studentId: 'std-1001', // Normalization test (lowercase to uppercase)
    });
    await login(req, res, next);
    const result = getResult();

    assert(
      result.statusCode === 200 &&
      result.responseBody?.success === true &&
      result.responseBody?.token &&
      result.responseBody?.user?.studentId === 'STD-1001' &&
      result.responseBody?.user?.role === 'student' &&
      result.responseBody?.user?.password === undefined,
      'Valid Student ID login without a password succeeds'
    );
  }

  // Test 2: Unknown Student ID
  {
    Student.findOne = () => Promise.resolve(null);

    const { req, res, next, getResult } = createMock({
      studentId: 'STD-UNKNOWN-999',
    });
    await login(req, res, next);
    const result = getResult();

    assert(
      result.nextCalled &&
      result.statusCode === 401 &&
      result.nextError?.message === 'Invalid credentials',
      'Unknown Student ID returns generic 401'
    );
  }

  // Test 3: Missing Student ID
  {
    const { req, res, next, getResult } = createMock({}); // Empty request body
    await login(req, res, next);
    const result = getResult();

    assert(
      result.nextCalled &&
      result.statusCode === 400 &&
      result.nextError?.message.includes('required to log in'),
      'Missing Student ID returns 400 Bad Request'
    );
  }

  // Test 4: Student record without an associated User account
  {
    const mockStudent = {
      _id: new mongoose.Types.ObjectId(),
      studentId: 'STD-1002',
      user: null, // Missing User reference
    };
    Student.findOne = () => Promise.resolve(mockStudent);

    const { req, res, next, getResult } = createMock({
      studentId: 'STD-1002',
    });
    await login(req, res, next);
    const result = getResult();

    assert(
      result.nextCalled &&
      result.statusCode === 401 &&
      result.nextError?.message === 'Invalid credentials',
      'Student without an associated User account returns 401'
    );
  }

  // Test 5: Inactive student account
  {
    const studentUserId = new mongoose.Types.ObjectId();
    const mockStudent = {
      _id: new mongoose.Types.ObjectId(),
      studentId: 'STD-1003',
      user: studentUserId,
    };
    const mockUser = {
      _id: studentUserId,
      name: 'Inactive Student',
      email: 'inactive@student.telesom.com',
      role: 'student',
      isActive: false, // Inactive account
    };

    Student.findOne = () => Promise.resolve(mockStudent);
    User.findById = () => Promise.resolve(mockUser);

    const { req, res, next, getResult } = createMock({
      studentId: 'STD-1003',
    });
    await login(req, res, next);
    const result = getResult();

    assert(
      result.nextCalled &&
      result.statusCode === 401 &&
      result.nextError?.message.includes('Account is inactive'),
      'Inactive student account returns 401'
    );
  }

  // Test 6: Admin email + password login
  {
    const adminId = new mongoose.Types.ObjectId();
    const mockAdmin = {
      _id: adminId,
      name: 'System Admin',
      email: 'admin@telesom.com',
      role: 'admin',
      isActive: true,
      password: hashedPassword,
    };

    User.findOne = () => ({
      select: () => Promise.resolve(mockAdmin),
    });
    User.findByIdAndUpdate = () => Promise.resolve();

    const { req, res, next, getResult } = createMock({
      email: 'ADMIN@telesom.com', // test lowercase normalization
      password: plainPassword,
    });
    await login(req, res, next);
    const result = getResult();

    assert(
      result.statusCode === 200 &&
      result.responseBody?.success === true &&
      result.responseBody?.user?.role === 'admin' &&
      result.responseBody?.user?.email === 'admin@telesom.com' &&
      result.responseBody?.user?.password === undefined,
      'Admin email + password login succeeds'
    );
  }

  // Test 7: Teacher email + password login
  {
    const teacherId = new mongoose.Types.ObjectId();
    const mockTeacher = {
      _id: teacherId,
      name: 'Prof. Hassan',
      email: 'hassan@telesom.com',
      role: 'teacher',
      isActive: true,
      password: hashedPassword,
    };

    User.findOne = () => ({
      select: () => Promise.resolve(mockTeacher),
    });
    User.findByIdAndUpdate = () => Promise.resolve();

    const { req, res, next, getResult } = createMock({
      email: 'hassan@telesom.com',
      password: plainPassword,
    });
    await login(req, res, next);
    const result = getResult();

    assert(
      result.statusCode === 200 &&
      result.responseBody?.success === true &&
      result.responseBody?.user?.role === 'teacher' &&
      result.responseBody?.user?.password === undefined,
      'Teacher email + password login succeeds'
    );
  }

  // Test 8: Safe response data and JWT generation
  {
    const studentUserId = new mongoose.Types.ObjectId();
    const mockStudent = {
      _id: new mongoose.Types.ObjectId(),
      studentId: 'STD-1005',
      user: studentUserId,
    };
    const mockUser = {
      _id: studentUserId,
      name: 'Mariam Student',
      email: 'mariam@student.telesom.com',
      role: 'student',
      isActive: true,
      password: hashedPassword,
    };

    Student.findOne = () => Promise.resolve(mockStudent);
    User.findById = () => Promise.resolve(mockUser);
    User.findByIdAndUpdate = () => Promise.resolve();

    const { req, res, next, getResult } = createMock({
      studentId: 'STD-1005',
    });
    await login(req, res, next);
    const result = getResult();

    // Verify token can be verified and decoded
    const decoded = jwt.verify(result.responseBody.token, process.env.JWT_SECRET);
    const hasNoPassword = !('password' in result.responseBody.user);

    assert(
      decoded.id === studentUserId.toString() &&
      hasNoPassword &&
      result.responseBody.user.studentId === 'STD-1005' &&
      result.responseBody.user.studentProfileId.toString() === mockStudent._id.toString(),
      'Safe response data and JWT generation verified'
    );
  }

  // Restore original methods
  Student.findOne = origStudentFindOne;
  User.findById = origUserFindById;
  User.findOne = origUserFindOne;
  User.findByIdAndUpdate = origUserFindByIdAndUpdate;

  console.log(`\nTests finished: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
};

runTests().catch((e) => {
  console.error('Test execution error:', e);
  process.exit(1);
});
