const mongoose = require('mongoose');
const Teacher = require('../models/Teacher');
const CourseTeacher = require('../models/CourseTeacher');
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

const updateTeacherProfile = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    throw new Error('Invalid teacher ID');
  }

  const teacher = await Teacher.findById(req.params.id);
  if (!teacher) {
    res.status(404);
    throw new Error('Teacher not found');
  }

  const { name, email, phone } = req.body;
  if (!name || !email) {
    res.status(400);
    throw new Error('Full name and email are required');
  }

  const normalizedName = String(name).trim();
  const normalizedEmail = String(email).trim().toLowerCase();
  if (normalizedName.length < 2 || normalizedName.length > 100) {
    res.status(400);
    throw new Error('Name must be between 2 and 100 characters');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    res.status(400);
    throw new Error('Please provide a valid email address');
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser && String(existingUser._id) !== String(teacher.user)) {
    res.status(409);
    throw new Error('Email is already registered');
  }

  const user = await User.findById(teacher.user);
  if (!user) {
    res.status(404);
    throw new Error('Teacher account not found');
  }

  if (req.body.teacherId !== undefined) {
    const teacherId = String(req.body.teacherId).trim().toUpperCase();
    if (!teacherId) { res.status(400); throw new Error('Teacher ID is required'); }
    const duplicate = await Teacher.findOne({teacherId, _id: {$ne: teacher._id}});
    if (duplicate) { res.status(409); throw new Error('Teacher ID already exists'); }
    teacher.teacherId = teacherId;
  }
  if (req.body.gender !== undefined) {
    if (req.body.gender && !['male', 'female'].includes(req.body.gender)) { res.status(400); throw new Error('Invalid gender'); }
    teacher.gender = req.body.gender || undefined;
  }
  if (req.body.status !== undefined) {
    if (!['active', 'on_leave', 'inactive'].includes(req.body.status)) { res.status(400); throw new Error('Invalid teacher status'); }
    teacher.status = req.body.status;
  }
  for (const field of ['department', 'qualification', 'specialization']) {
    if (req.body[field] !== undefined) teacher[field] = String(req.body[field]).trim();
  }
  await teacher.validate();
  user.name = normalizedName;
  user.email = normalizedEmail;
  await user.save();
  teacher.phone = phone ? String(phone).trim() : '';
  await teacher.save();

  return res.status(200).json({
    success: true,
    data: {
      ...teacher.toObject(),
      name: user.name,
      email: user.email,
    },
  });
});

const getTeacherDetails = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    throw new Error('Invalid teacher ID');
  }

  const teacher = await Teacher.findById(req.params.id)
    .select('+profilePicture')
    .populate('user', 'name email role isActive')
    .lean();
  if (!teacher) {
    res.status(404);
    throw new Error('Teacher not found');
  }

  const assignments = await CourseTeacher.find({ teacher: teacher._id, status: 'active' })
    .populate('course', 'courseCode title name description credits')
    .sort({ isPrimary: -1, assignedDate: -1 })
    .lean();

  return res.status(200).json({
    success: true,
    data: {
      ...teacher,
      name: teacher.user?.name || '',
      email: teacher.user?.email || '',
      assignments,
      assignedCourse: assignments[0] || null,
    },
  });
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
  getTeacherDetails,
  listTeachers: controller.list,
  getTeacherById: controller.getById,
  createTeacher,
  updateTeacher: updateTeacherProfile,
  deleteTeacher: deactivateTeacher,
};
