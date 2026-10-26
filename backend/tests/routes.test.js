const assert = require('assert');
const { app } = require('../server');

const protectedPaths = [
  '/api/notifications',
  '/api/students',
  '/api/student/courses',
  '/api/student/results',
  '/api/student/quizzes',
  '/api/student/notes',
  '/api/student/attendance',
  '/api/teachers',
  '/api/courses',
  '/api/enrollments',
  '/api/course-teachers',
  '/api/exams',
  '/api/exam-results',
  '/api/quizzes',
  '/api/quiz-results',
  '/api/attendance',
  '/api/attendance-imports',
  '/api/notes',
  '/api/dashboard',
  '/api/reports',
  '/api/profile',
  '/api/teacher/profile',
];

const run = async () => {
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, () => resolve(listener));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    for (const path of protectedPaths) {
      const response = await fetch(baseUrl + path);
      assert.strictEqual(response.status, 401, `${path} must require auth`);
    }
    const teacherProfileUpdate = await fetch(`${baseUrl}/api/teacher/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Teacher', email: 'teacher@example.com' }),
    });
    assert.strictEqual(teacherProfileUpdate.status, 401, 'teacher profile update must require auth');
    for (const path of ['/api/users/students', '/api/users/teachers']) {
      const response = await fetch(baseUrl + path, { method: 'POST' });
      assert.strictEqual(response.status, 401, `${path} must require auth`);
    }

    const health = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(health.status, 503, 'health reports missing DB readiness');

    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.strictEqual(loginResponse.status, 400, 'login remains public');
    console.log('Route registration and authentication checks passed.');
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
