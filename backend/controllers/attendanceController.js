const Attendance = require('../models/Attendance');
const { createResourceController } = require('./resourceController');
const { getAttendanceSession, requireScheduledAttendance } = require('../services/attendanceScheduleService');

const controller = createResourceController(Attendance, {
  fields: ['student', 'course', 'date', 'status', 'remarks', 'importBatch'],
  filterFields: ['student', 'course', 'status', 'importBatch'],
  populate: [
    { path: 'student', populate: { path: 'user', select: 'name email' } },
    { path: 'course', select: 'courseCode title' },
  ],
  sortFields: ['createdAt', 'updatedAt', 'date'],
  async beforeCreate(req) {
    const {course,date,student}=req.body;
    requireScheduledAttendance(await getAttendanceSession(course,new Date(date)),student);
    return {recordedBy:req.user._id};
  },
  async beforeUpdate(req) {
    const existing=await Attendance.findById(req.params.id).select('course date student').lean();
    if (!existing) return;
    const {course=existing.course,date=existing.date,student=existing.student}=req.body;
    requireScheduledAttendance(await getAttendanceSession(course,new Date(date)),student);
  },
});

module.exports = {
  listAttendance: controller.list,
  getAttendanceById: controller.getById,
  recordAttendance: controller.create,
  updateAttendance: controller.update,
  deleteAttendance: controller.remove,
};
