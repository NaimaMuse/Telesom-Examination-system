const {hashPassword} = require('../utils/passwords');
const mongoose = require('mongoose');
const { login } = require('../controllers/authController');
const User = require('../models/User');
const Teacher = require('../models/Teacher');

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
  const hashedPassword = await hashPassword(plainPassword);

  // Save original model methods
  const origUserFindById = User.findById;
  const origUserFindOne = User.findOne;
  const origUserFindByIdAndUpdate = User.findByIdAndUpdate;
  const origTeacherFindOne = Teacher.findOne;
  Teacher.findOne = async () => null;

  console.log('--- Running Login Controller Tests ---');

  {
    const { req, res, next, getResult } = createMock({studentId:'STD-1001'});
    await login(req, res, next);
    assert(getResult().statusCode === 401, 'Student ID alone cannot sign in');
  }

  {
    const { req, res, next, getResult } = createMock({});
    await login(req, res, next);
    assert(getResult().statusCode === 400, 'Missing email returns 400 Bad Request');
  }
  // Admin email and password login
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

  // Teacher email and password login
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

  // Students must use Google even after creating a portal password.
  {
    const mockUser = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Mariam Student',
      email: 'mariam@gmail.com',
      role: 'student',
      isActive: true,
      password: hashedPassword,
      studentPasswordSet: true,
    };

    User.findOne = () => ({select:async () => mockUser});

    const { req, res, next, getResult } = createMock({
      email: mockUser.email,
      password: plainPassword,
    });
    await login(req, res, next);
    const result = getResult();

    assert(
      result.statusCode === 401 && result.responseBody === null,
      'A valid student portal password cannot establish a session'
    );
  }

  // Restore original methods
  User.findOne = origUserFindOne;
  User.findByIdAndUpdate = origUserFindByIdAndUpdate;
  Teacher.findOne = origTeacherFindOne;

  console.log(`\nTests finished: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
};

runTests().catch((e) => {
  console.error('Test execution error:', e);
  process.exit(1);
});
