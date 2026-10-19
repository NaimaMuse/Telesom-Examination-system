const mongoose = require('mongoose');
const Teacher = require('../models/Teacher');
const User = require('../models/User');
const {
  asyncHandler,
  createResourceController,
} = require('./resourceController');
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

const deactivateTeacher = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    throw new Error('Invalid teacher ID');
  }
  const teacher = await Teacher.findById(req.params.id);
  if (!teacher) {
    res.status(404);
    throw new Error('Teacher not found');
  }
  if (teacher.user) {
    await User.findByIdAndUpdate(teacher.user, { isActive: false });
  }
  teacher.status = 'inactive';
  await teacher.save();
  return res.status(200).json({
    success: true,
    message: 'Teacher account deactivated',
    data: teacher,
  });
});

module.exports = {
  listTeachers: controller.list,
  getTeacherById: controller.getById,
  createTeacher,
  updateTeacher: controller.update,
  deleteTeacher: deactivateTeacher,
};
