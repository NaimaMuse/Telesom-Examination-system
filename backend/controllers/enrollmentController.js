const Enrollment = require('../models/Enrollment');
const CourseTeacher = require('../models/CourseTeacher');
const Teacher = require('../models/Teacher');
const { createResourceController, asyncHandler } = require('./resourceController');

const controller = createResourceController(Enrollment, {
  fields: [
    'student',
    'course',
    'academicYear',
    'semester',
    'enrollmentDate',
    'status',
  ],
  filterFields: ['student', 'course', 'academicYear', 'semester', 'status'],
  populate: [
    { path: 'student', populate: { path: 'user', select: 'name email' } },
    { path: 'course', select: 'courseCode title credits' },
  ],
  sortFields: ['createdAt', 'updatedAt', 'enrollmentDate'],
});

const listEnrollments = asyncHandler(async (req, res, next) => {
  if (req.user && req.user.role === 'teacher') {
    const teacher = await Teacher.findOne({ user: req.user._id });
    if (!teacher) {
      return res.status(200).json({ success: true, data: [] });
    }
    const assignments = await CourseTeacher.find({ teacher: teacher._id, status: 'active' }).select('course');
    const assignedCourseIds = assignments.map((a) => a.course);

    const filter = {
      course: { $in: assignedCourseIds },
      status: 'enrolled',
    };
    if (req.query.course) {
      if (!assignedCourseIds.map(String).includes(String(req.query.course))) {
        return res.status(200).json({ success: true, data: [] });
      }
      filter.course = req.query.course;
    }

    const enrollments = await Enrollment.find(filter)
      .populate({ path: 'student', populate: { path: 'user', select: 'name email' } })
      .populate({ path: 'course', select: 'courseCode title credits' })
      .sort('-createdAt');

    return res.status(200).json({
      success: true,
      data: enrollments,
    });
  }

  return controller.list(req, res, next);
});

module.exports = {
  listEnrollments,
  getEnrollmentById: controller.getById,
  createEnrollment: controller.create,
  updateEnrollment: controller.update,
  deleteEnrollment: controller.remove,
};
