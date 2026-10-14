const Attendance = require('../models/Attendance');
const { createResourceController } = require('./resourceController');

const controller = createResourceController(Attendance, {
  fields: ['student', 'course', 'date', 'status', 'remarks', 'importBatch'],
  filterFields: ['student', 'course', 'status', 'importBatch'],
  populate: [
    { path: 'student', populate: { path: 'user', select: 'name email' } },
    { path: 'course', select: 'courseCode title' },
  ],
  sortFields: ['createdAt', 'updatedAt', 'date'],
  beforeCreate: (req) => ({ recordedBy: req.user && req.user._id }),
});

module.exports = {
  listAttendance: controller.list,
  getAttendanceById: controller.getById,
  recordAttendance: controller.create,
  updateAttendance: controller.update,
  deleteAttendance: controller.remove,
};
