const mongoose = require('mongoose');
const Student = require('../models/Student');
const User = require('../models/User');
const {
  asyncHandler,
  createResourceController,
} = require('./resourceController');
const { createStudent } = require('./userController');

const controller = createResourceController(Student, {
  fields: [
    'gender',
    'phone',
    'address',
    'academicYear',
    'status',
  ],
  filterFields: ['user', 'studentId', 'gender', 'academicYear', 'status'],
  populate: [{ path: 'user', select: 'name email role isActive' }],
  sortFields: ['createdAt', 'updatedAt', 'studentId'],
});

const deactivateStudent = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    throw new Error('Invalid student ID');
  }
  const student = await Student.findById(req.params.id);
  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }
  if (student.user) {
    await User.findByIdAndUpdate(student.user, { isActive: false });
  }
  student.status = 'inactive';
  await student.save();
  return res.status(200).json({
    success: true,
    message: 'Student account deactivated',
    data: student,
  });
});

module.exports = {
  listStudents: controller.list,
  getStudentById: controller.getById,
  createStudent,
  updateStudent: controller.update,
  deleteStudent: deactivateStudent,
};
