const CourseTeacher = require('../models/CourseTeacher');
const { createResourceController } = require('./resourceController');

const controller = createResourceController(CourseTeacher, {
  scopeFilter:async req=>{if(req.user.role==='admin')return null;const teacher=await require('../models/Teacher').findOne({user:req.user._id});return {teacher:teacher?._id||null};},
  authorizeRead:async(req,record)=>{if(req.user.role==='admin')return;const teacher=await require('../models/Teacher').findOne({user:req.user._id});if(!teacher||String(record.teacher?._id||record.teacher)!==String(teacher._id))throw Object.assign(new Error('Assignment unavailable.'),{statusCode:403});},
  fields: [
    'teacher',
    'course',
    'academicYear',
    'semester',
    'role',
    'isPrimary',
    'assignedDate',
    'status',
  ],
  filterFields: ['teacher', 'course', 'academicYear', 'semester', 'role', 'status'],
  populate: [
    { path: 'teacher', populate: { path: 'user', select: 'name email' } },
    { path: 'course', select: 'courseCode title name description' },
  ],
  sortFields: ['createdAt', 'updatedAt', 'assignedDate'],
});

module.exports = {
  listCourseTeachers: controller.list,
  getCourseTeacherById: controller.getById,
  assignCourseTeacher: controller.create,
  updateCourseTeacher: controller.update,
  removeCourseTeacher: controller.remove,
};
