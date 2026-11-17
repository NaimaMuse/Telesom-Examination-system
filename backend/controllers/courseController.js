const mongoose = require('mongoose');
const Course = require('../models/Course');
const { createResourceController, asyncHandler } = require('./resourceController');

const courseReferences = [
  require('../models/Attendance'),
  require('../models/AttendanceImport'),
  require('../models/CourseOutline'),
  require('../models/CourseTeacher'),
  require('../models/Enrollment'),
  require('../models/Evaluation').Form,
  require('../models/Exam'),
  require('../models/Internship'),
  require('../models/MakeupClass'),
  require('../models/Note'),
  require('../models/ProjectDefense'),
  require('../models/Quiz'),
  require('../models/TeacherContract'),
  require('../models/TeachingLesson'),
];

const controller = createResourceController(Course, {
  scopeFilter:async req=>{const scope=await require('../services/gradebookIntegrityService').assessmentReadScope(req);return scope?{_id:scope.course}:null;},
  authorizeRead:(req,record)=>require('../services/gradebookIntegrityService').authorizeCourse(req,record._id),
  fields: [
    'courseCode',
    'title',
    'name',
    'description',
    'credits',
    'teachingSchedule',
    'durationWeeks',
    'status',
    'department',
    'semester',
    'academicYear',
    'batch',
    'isActive',
  ],
  filterFields: ['courseCode', 'title', 'name', 'status', 'department', 'semester', 'academicYear', 'isActive'],
  sortFields: ['createdAt', 'updatedAt', 'courseCode', 'title', 'name', 'credits', 'status'],
});

const deleteCourse = asyncHandler(async (req, res, next) => {
  if (mongoose.isValidObjectId(req.params.id)) {
    const references = await Promise.all(
      courseReferences.map(Model => Model.exists({ course: req.params.id }))
    );
    if (references.some(Boolean)) {
      res.status(409);
      throw new Error('This course has linked records. Archive the course to keep its history.');
    }
  }
  return controller.remove(req, res, next);
});

module.exports = {
  listCourses: controller.list,
  getCourseById: controller.getById,
  createCourse: controller.create,
  updateCourse: controller.update,
  deleteCourse,
};
