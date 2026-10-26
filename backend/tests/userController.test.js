const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { createStudent, createTeacher } = require('../controllers/userController');
const User = require('../models/User');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Counter = require('../models/Counter');

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
    const req = { body: body || {} };
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

  const origUserFindOne = User.findOne;
  const origStudentFindOne = Student.findOne;
  const origStudentExists = Student.exists;
  const origTeacherFindOne = Teacher.findOne;
  const origUserCreate = User.create;
  const origStudentCreate = Student.create;
  const origTeacherCreate = Teacher.create;
  const origUserDelete = User.findByIdAndDelete;
  const origStartSession = mongoose.startSession;
  const origCounterFindOneAndUpdate = Counter.findOneAndUpdate;
  let studentSequence = 2000;

  mongoose.startSession = async () => ({
    startTransaction() {},
    async commitTransaction() {},
    async abortTransaction() {},
    endSession() {},
  });

  User.findOne = () => Promise.resolve(null);
  Student.findOne = () => Promise.resolve(null);
  Student.exists = () => Promise.resolve(null);
  Counter.findOneAndUpdate = async () => ({ sequence: ++studentSequence });
  Teacher.findOne = () => Promise.resolve(null);
  User.findByIdAndDelete = () => Promise.resolve();

  const mockCreate = (ModelName) => async (docs) => {
    const payload = Array.isArray(docs) ? docs[0] : docs;
    const created = {
      _id: new mongoose.Types.ObjectId(),
      ...payload,
    };
    if (Array.isArray(docs)) {
      return [created];
    }
    return created;
  };

  User.create = mockCreate('User');
  Student.create = mockCreate('Student');
  Teacher.create = mockCreate('Teacher');

  console.log('--- Running User Controller Tests ---\n');

  {
    const { req, res, next, getResult } = createMock({
      name: 'Amina Student',
      email: 'amina@student.telesom.com',
    });
    await createStudent(req, res, next);
    const result = getResult();
    assert(
      result.statusCode === 400 &&
        result.nextCalled &&
        /name, email, and gender/i.test(result.nextError.message),
      'Student creation rejects missing required fields'
    );
  }

  {
    const { req, res, next, getResult } = createMock({
      name: 'Amina Student',
      email: 'amina@student.telesom.com',
      studentId: 'std-2001',
      gender: 'unknown',
    });
    await createStudent(req, res, next);
    const result = getResult();
    assert(
      result.statusCode === 400 && /gender/i.test(result.nextError.message),
      'Student creation rejects invalid gender'
    );
  }

  {
    User.findOne = () =>
      Promise.resolve({ email: 'amina@student.telesom.com' });
    const { req, res, next, getResult } = createMock({
      name: 'Amina Student',
      email: 'amina@student.telesom.com',
      studentId: 'STD-2001',
      gender: 'female',
    });
    await createStudent(req, res, next);
    const result = getResult();
    assert(
      result.statusCode === 409 &&
        result.nextError.message === 'Email is already registered',
      'Student creation rejects duplicate email'
    );
    User.findOne = () => Promise.resolve(null);
  }

  {
    let existsChecks = 0;
    Student.exists = async () => (++existsChecks === 1 ? { _id: 'legacy' } : null);
    const { req, res, next, getResult } = createMock({
      name: 'Amina Student',
      email: 'amina@student.telesom.com',
      gender: 'female',
    });
    await createStudent(req, res, next);
    const result = getResult();
    assert(
      result.statusCode === 201 &&
        result.responseBody?.data?.student?.studentId === 'STD-2002' &&
        existsChecks === 2,
      'Student ID generation skips IDs already used by existing students'
    );
    Student.exists = () => Promise.resolve(null);
  }

  {
    let createdUserPayload = null;
    User.create = async (docs) => {
      const payload = Array.isArray(docs) ? docs[0] : docs;
      createdUserPayload = payload;
      const created = {
        _id: new mongoose.Types.ObjectId(),
        ...payload,
      };
      return Array.isArray(docs) ? [created] : created;
    };

    const { req, res, next, getResult } = createMock({
      name: '  Amina Student  ',
      email: '  Amina@Student.Telesom.com ',
      studentId: 'USER-PROVIDED-ID',
      gender: 'Female',
      academicYear: '2026',
    });
    await createStudent(req, res, next);
    const result = getResult();

    assert(
      result.statusCode === 201 &&
        result.responseBody?.success === true &&
        result.responseBody?.data?.user?.role === 'student' &&
        result.responseBody?.data?.user?.email === 'amina@student.telesom.com' &&
        result.responseBody?.data?.student?.studentId === 'STD-2003' &&
        createdUserPayload.password === undefined &&
        result.responseBody?.data?.user?.password === undefined,
      'Student account is created without a password and returns safe data'
    );
  }

  {
    let deletedUserId = null;
    const userId = new mongoose.Types.ObjectId();

    mongoose.startSession = async () => ({
      startTransaction() {},
      async commitTransaction() {},
      async abortTransaction() {},
      endSession() {},
    });

    User.create = async (docs, options) => {
      if (options && options.session) {
        const err = new Error(
          'Transaction numbers are only allowed on a replica set member or mongos'
        );
        err.code = 20;
        err.codeName = 'IllegalOperation';
        throw err;
      }
      return { _id: userId, ...docs };
    };

    Student.create = async () => {
      throw new Error('Profile validation failed');
    };

    User.findByIdAndDelete = async (id) => {
      deletedUserId = id;
    };

    const { req, res, next, getResult } = createMock({
      name: 'Amina Student',
      email: 'amina@student.telesom.com',
      studentId: 'STD-2004',
      gender: 'female',
    });
    await createStudent(req, res, next);
    const result = getResult();

    assert(
      result.nextCalled &&
        result.nextError.message === 'Profile validation failed' &&
        String(deletedUserId) === String(userId),
      'Failed student profile creation removes the orphaned user'
    );

    User.create = mockCreate('User');
    Student.create = mockCreate('Student');
    User.findByIdAndDelete = () => Promise.resolve();
    mongoose.startSession = async () => ({
      startTransaction() {},
      async commitTransaction() {},
      async abortTransaction() {},
      endSession() {},
    });
  }

  {
    const { req, res, next, getResult } = createMock({
      name: 'Hassan Teacher',
      email: 'hassan@telesom.com',
      teacherId: 'TCH-10',
    });
    await createTeacher(req, res, next);
    const result = getResult();
    assert(
      result.statusCode === 400 && /password/i.test(result.nextError.message),
      'Teacher creation rejects missing required fields'
    );
  }

  {
    const { req, res, next, getResult } = createMock({
      name: 'Hassan Teacher',
      email: 'hassan@telesom.com',
      password: 'short',
      teacherId: 'TCH-10',
    });
    await createTeacher(req, res, next);
    const result = getResult();
    assert(
      result.statusCode === 400 &&
        result.nextError.message === 'Password must be at least 8 characters long',
      'Teacher creation rejects short passwords'
    );
  }

  {
    Teacher.findOne = () => Promise.resolve({ teacherId: 'TCH-10' });
    const { req, res, next, getResult } = createMock({
      name: 'Hassan Teacher',
      email: 'hassan@telesom.com',
      password: 'TeacherPass1',
      teacherId: 'tch-10',
    });
    await createTeacher(req, res, next);
    const result = getResult();
    assert(
      result.statusCode === 409 &&
        result.nextError.message === 'Teacher ID already exists',
      'Teacher creation rejects duplicate Teacher ID'
    );
    Teacher.findOne = () => Promise.resolve(null);
  }

  {
    let createdUserPayload = null;
    User.create = async (docs) => {
      const payload = Array.isArray(docs) ? docs[0] : docs;
      createdUserPayload = payload;
      const created = {
        _id: new mongoose.Types.ObjectId(),
        ...payload,
      };
      return Array.isArray(docs) ? [created] : created;
    };

    const plainPassword = 'TeacherPass1';
    const { req, res, next, getResult } = createMock({
      name: 'Hassan Teacher',
      email: '  Hassan@Telesom.com ',
      password: plainPassword,
      teacherId: 'tch-10',
      department: 'Networking',
    });
    await createTeacher(req, res, next);
    const result = getResult();

    const storedHash = createdUserPayload?.password;
    const hashMatches = storedHash
      ? await bcrypt.compare(plainPassword, storedHash)
      : false;
    const responseHasNoPassword =
      result.responseBody?.data?.user?.password === undefined &&
      !('password' in (result.responseBody?.data?.teacher || {}));

    assert(
      result.statusCode === 201 &&
        result.responseBody?.data?.user?.role === 'teacher' &&
        result.responseBody?.data?.user?.email === 'hassan@telesom.com' &&
        result.responseBody?.data?.teacher?.teacherId === 'TCH-10' &&
        hashMatches &&
        storedHash !== plainPassword &&
        responseHasNoPassword,
      'Teacher account hashes the password and never returns it'
    );
  }

  User.findOne = origUserFindOne;
  Student.findOne = origStudentFindOne;
  Student.exists = origStudentExists;
  Teacher.findOne = origTeacherFindOne;
  User.create = origUserCreate;
  Student.create = origStudentCreate;
  Teacher.create = origTeacherCreate;
  User.findByIdAndDelete = origUserDelete;
  mongoose.startSession = origStartSession;
  Counter.findOneAndUpdate = origCounterFindOneAndUpdate;

  console.log(`\nTests finished: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
};

runTests().catch((error) => {
  console.error('Test execution error:', error);
  process.exit(1);
});
