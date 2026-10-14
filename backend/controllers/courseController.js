const Course = require('../models/Course');
const { createResourceController } = require('./resourceController');

const controller = createResourceController(Course, {
  fields: [
    'courseCode',
    'title',
    'description',
    'credits',
    'department',
    'semester',
    'academicYear',
    'isActive',
  ],
  filterFields: ['courseCode', 'department', 'semester', 'academicYear', 'isActive'],
  sortFields: ['createdAt', 'updatedAt', 'courseCode', 'title'],
});

module.exports = {
  listCourses: controller.list,
  getCourseById: controller.getById,
  createCourse: controller.create,
  updateCourse: controller.update,
  deleteCourse: controller.remove,
};
