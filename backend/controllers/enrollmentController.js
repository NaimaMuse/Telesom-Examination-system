const Enrollment = require('../models/Enrollment');
const CourseTeacher = require('../models/CourseTeacher');
const Teacher = require('../models/Teacher');
const { createResourceController, asyncHandler } = require('./resourceController');

const controller = createResourceController(Enrollment, {
  authorizeRead:(req,record)=>require('../services/gradebookIntegrityService').authorizeCourse(req,record.course?._id||record.course),
  fields: [
    'student',
    'course',
    'academicYear',
    'semester',
    'batch',
    'enrollmentDate',
    'status',
  ],
  filterFields: ['student', 'course', 'academicYear', 'semester', 'batch', 'status'],
  populate: [
    { path: 'student', populate: { path: 'user', select: 'name email' } },
    { path: 'course', select: 'courseCode title credits' },
  ],
  sortFields: ['createdAt', 'updatedAt', 'enrollmentDate'],
  beforeCreate: async req=>{await require('../services/batchService').validateBatch(req.body.batch,req.body.academicYear);if(!req.body.batch&&await Enrollment.exists({student:req.body.student,course:req.body.course,academicYear:req.body.academicYear,$or:[{batch:''},{batch:{$exists:false}}]}))throw Object.assign(new Error('Student is already enrolled in this course, year and batch.'),{statusCode:409});return {};},
  beforeUpdate: async req=>{const original=await Enrollment.findById(req.params.id);if((req.body.batch!==undefined&&req.body.batch!==(original?.batch||''))||(req.body.academicYear!==undefined&&req.body.academicYear!==original?.academicYear))await require('../services/batchService').validateBatch(req.body.batch??original?.batch,req.body.academicYear??original?.academicYear);return req.body.status==='dropped'&&!original?.droppedAt?{droppedAt:new Date()}:{};},
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
  deleteEnrollment: asyncHandler(async(req,res)=>{const row=await Enrollment.findByIdAndUpdate(req.params.id,{$set:{status:'dropped',droppedAt:new Date()}},{new:true});if(!row)throw Object.assign(new Error('Enrollment not found.'),{statusCode:404});res.json({success:true,data:row});}),
};
