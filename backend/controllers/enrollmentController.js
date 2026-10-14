const Enrollment = require('../models/Enrollment');
const { createResourceController } = require('./resourceController');

const controller = createResourceController(Enrollment, {
  fields: [
    'student',
    'course',
    'academicYear',
    'semester',
    'enrollmentDate',
    'status',
  ],
  filterFields: ['student', 'course', 'academicYear', 'semester', 'status'],
  populate: [
    { path: 'student', populate: { path: 'user', select: 'name email' } },
    { path: 'course', select: 'courseCode title credits' },
  ],
  sortFields: ['createdAt', 'updatedAt', 'enrollmentDate'],
});

module.exports = {
  listEnrollments: controller.list,
  getEnrollmentById: controller.getById,
  createEnrollment: controller.create,
  updateEnrollment: controller.update,
  deleteEnrollment: controller.remove,
};
