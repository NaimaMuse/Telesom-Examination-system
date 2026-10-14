const Student = require('../models/Student');
const { createResourceController } = require('./resourceController');
const { createStudent } = require('./userController');

const controller = createResourceController(Student, {
  fields: [
    'studentId',
    'gender',
    'dateOfBirth',
    'phone',
    'address',
    'guardianName',
    'guardianPhone',
    'academicYear',
    'status',
  ],
  filterFields: ['user', 'studentId', 'gender', 'academicYear', 'status'],
  populate: [{ path: 'user', select: 'name email role isActive' }],
  sortFields: ['createdAt', 'updatedAt', 'studentId'],
});

module.exports = {
  listStudents: controller.list,
  getStudentById: controller.getById,
  createStudent,
  updateStudent: controller.update,
  deleteStudent: controller.remove,
};
