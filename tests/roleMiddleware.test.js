const { authorizeRoles } = require('../middleware/roleMiddleware');
const { errorHandler } = require('../middleware/errorHandler');

const runTests = () => {
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

  // Helper to create mock req, res, next
  const createMock = (user) => {
    const req = {
      user: user || null,
      originalUrl: '/api/resource',
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
    let nextCalled = false;
    let nextError = null;
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

  console.log('--- Running Role Middleware Tests ---\n');

  // Test 1: Admin accessing an admin-only resource
  {
    const adminMiddleware = authorizeRoles('admin');
    const { req, res, next, getResult } = createMock({ role: 'admin' });
    adminMiddleware(req, res, next);
    const result = getResult();
    assert(result.nextCalled && !result.nextError, 'Admin accessing an admin-only resource');
  }

  // Test 2: Teacher accessing a teacher-only resource
  {
    const teacherMiddleware = authorizeRoles('teacher');
    const { req, res, next, getResult } = createMock({ role: 'teacher' });
    teacherMiddleware(req, res, next);
    const result = getResult();
    assert(result.nextCalled && !result.nextError, 'Teacher accessing a teacher-only resource');
  }

  // Test 3: Student denied access to an admin-only resource
  {
    const adminMiddleware = authorizeRoles('admin');
    const { req, res, next, getResult } = createMock({ role: 'student' });
    adminMiddleware(req, res, next);
    const result = getResult();
    assert(
      result.nextCalled &&
      result.statusCode === 403 &&
      result.nextError?.message.includes("Role 'student' is not authorized"),
      'Student denied access to an admin-only resource (returns 403)'
    );
  }

  // Test 4: Teacher denied access to an admin-only resource
  {
    const adminMiddleware = authorizeRoles('admin');
    const { req, res, next, getResult } = createMock({ role: 'teacher' });
    adminMiddleware(req, res, next);
    const result = getResult();
    assert(
      result.nextCalled &&
      result.statusCode === 403 &&
      result.nextError?.message.includes("Role 'teacher' is not authorized"),
      'Teacher denied access to an admin-only resource (returns 403)'
    );
  }

  // Test 5: Missing req.user returns 401
  {
    const adminMiddleware = authorizeRoles('admin');
    const { req, res, next, getResult } = createMock(null); // No req.user
    adminMiddleware(req, res, next);
    const result = getResult();
    assert(
      result.nextCalled &&
      result.statusCode === 401 &&
      result.nextError?.message.includes('authentication required'),
      'Missing req.user returns 401'
    );
  }

  // Test 6: Multiple allowed roles work correctly
  {
    const staffMiddleware = authorizeRoles('admin', 'teacher');

    // Admin allowed
    const adminMock = createMock({ role: 'admin' });
    staffMiddleware(adminMock.req, adminMock.res, adminMock.next);
    const adminResult = adminMock.getResult();

    // Teacher allowed
    const teacherMock = createMock({ role: 'teacher' });
    staffMiddleware(teacherMock.req, teacherMock.res, teacherMock.next);
    const teacherResult = teacherMock.getResult();

    // Student denied
    const studentMock = createMock({ role: 'student' });
    staffMiddleware(studentMock.req, studentMock.res, studentMock.next);
    const studentResult = studentMock.getResult();

    assert(
      adminResult.nextCalled && !adminResult.nextError &&
      teacherResult.nextCalled && !teacherResult.nextError &&
      studentResult.nextCalled && studentResult.statusCode === 403,
      'Multiple allowed roles (admin, teacher) work correctly'
    );
  }

  // Test 7: Reject invalid role configuration during setup
  {
    let emptyCaught = false;
    try {
      authorizeRoles();
    } catch (err) {
      emptyCaught = err.message.includes('At least one role must be specified');
    }

    let invalidRoleCaught = false;
    try {
      authorizeRoles('superadmin'); // not a valid role
    } catch (err) {
      invalidRoleCaught = err.message.includes("not a valid system role");
    }

    assert(
      emptyCaught && invalidRoleCaught,
      'Rejects invalid role configuration during setup'
    );
  }

  // Test 8: Integration with centralized errorHandler
  {
    const adminMiddleware = authorizeRoles('admin');
    const { req, res, next, getResult } = createMock({ role: 'student' });
    adminMiddleware(req, res, next);
    const mockResult = getResult();

    // Pass the error to centralized errorHandler
    errorHandler(mockResult.nextError, req, res, () => {});
    const finalResult = getResult();

    assert(
      finalResult.statusCode === 403 &&
      finalResult.responseBody?.success === false &&
      finalResult.responseBody?.message?.includes("Role 'student' is not authorized"),
      'Integration with centralized errorHandler produces consistent 403 JSON response'
    );
  }

  console.log(`\nTests completed: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
};

runTests();
