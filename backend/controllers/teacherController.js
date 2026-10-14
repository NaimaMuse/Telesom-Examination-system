const Teacher = require('../models/Teacher');
const { createResourceController } = require('./resourceController');
const { createTeacher } = require('./userController');

const controller = createResourceController(Teacher, {
  fields: [
    'teacherId',
    'gender',
    'phone',
    'department',
    'qualification',
    'specialization',
    'status',
  ],
  filterFields: ['user', 'teacherId', 'gender', 'department', 'status'],
  populate: [{ path: 'user', select: 'name email role isActive' }],
  sortFields: ['createdAt', 'updatedAt', 'teacherId'],
});

module.exports = {
  listTeachers: controller.list,
  getTeacherById: controller.getById,
  createTeacher,
  updateTeacher: controller.update,
  deleteTeacher: controller.remove,
};
