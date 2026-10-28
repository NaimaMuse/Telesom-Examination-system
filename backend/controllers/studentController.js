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
    'batch',
    'status',
  ],
  filterFields: ['user', 'studentId', 'gender', 'academicYear', 'batch', 'status'],
  populate: [{ path: 'user', select: 'name email role isActive' }],
  sortFields: ['createdAt', 'updatedAt', 'studentId'],
  beforeUpdate: async req => {
    const original=await Student.findById(req.params.id);
    if((req.body.batch!==undefined&&req.body.batch!==(original?.batch||''))||(req.body.academicYear!==undefined&&req.body.academicYear!==original?.academicYear))await require('../services/batchService').validateBatch(req.body.batch??original?.batch,req.body.academicYear??original?.academicYear);
    if(req.body.status==='dropped'&&original?.status!=='dropped'){
      const droppedAt=new Date();await require('../models/Enrollment').updateMany({student:req.params.id,status:'enrolled'},{$set:{status:'dropped',droppedAt}});return {droppedAt};
    }
    return {};
  },
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
  student.status = 'dropped';
  student.droppedAt = new Date();
  await require('../models/Enrollment').updateMany({student:student._id,status:'enrolled'},{$set:{status:'dropped',droppedAt:student.droppedAt}});
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
