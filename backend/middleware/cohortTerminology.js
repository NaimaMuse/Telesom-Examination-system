const mongoose = require('mongoose');

const fields = new Map([
  ['batch', 'cohort'],
  ['batches', 'cohorts'],
  ['batchStats', 'cohortStats'],
  ['yearBatches', 'yearCohorts'],
]);
const academicResources = new Set([
  'academy', 'attendance', 'course-teachers', 'courses', 'dashboard', 'enrollments',
  'exam-results', 'exams', 'notes', 'profile', 'quiz-results', 'quizzes', 'reports',
  'student', 'students', 'teacher', 'teacher-contracts', 'teachers', 'users',
]);

function cohortFields(value) {
  if (Array.isArray(value)) return value.map(cohortFields);
  if (value instanceof mongoose.Document) return cohortFields(value.toJSON());
  if (!value || typeof value !== 'object') return value;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    fields.get(key) ?? key, cohortFields(item),
  ]));
}

function normalizeCohortField(input) {
  if (!input || !Object.hasOwn(input, 'cohort')) return;
  input.batch = input.cohort;
  delete input.cohort;
}

function cohortTerminology(req, res, next) {
  if (!academicResources.has(req.path.split('/')[1])) return next();
  const canonicalPath = /^\/academy\/(?:cohorts(?:\/|$)|reports\/cohorts\/?$)/.test(req.path);
  res.vary('X-Academic-Terminology');
  if (canonicalPath || req.get('X-Academic-Terminology') === 'cohort' ||
      Object.hasOwn(req.query, 'cohort') || Object.hasOwn(req.body || {}, 'cohort')) {
    // Academic groups keep their existing storage fields and relationships in MongoDB.
    normalizeCohortField(req.query);
    normalizeCohortField(req.body);
    const json = res.json;
    res.json = function (payload) {
      return json.call(this, cohortFields(payload));
    };
  }
  next();
}

module.exports = {cohortTerminology, normalizeCohortField};
