const CourseTeacher = require('../models/CourseTeacher');
const { createResourceController } = require('./resourceController');

const controller = createResourceController(CourseTeacher, {
  fields: [
    'teacher',
    'course',
    'academicYear',
    'semester',
    'role',
    'isPrimary',
    'assignedDate',
    'status',
  ],
  filterFields: ['teacher', 'course', 'academicYear', 'semester', 'role', 'status'],
  populate: [
    { path: 'teacher', populate: { path: 'user', select: 'name email' } },
    { path: 'course', select: 'courseCode title name description' },
  ],
  sortFields: ['createdAt', 'updatedAt', 'assignedDate'],
});

module.exports = {
  listCourseTeachers: controller.list,
  getCourseTeacherById: controller.getById,
  assignCourseTeacher: controller.create,
  updateCourseTeacher: controller.update,
  removeCourseTeacher: controller.remove,
};
