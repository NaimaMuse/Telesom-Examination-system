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

const deleteCourse = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw Object.assign(new Error('Invalid course ID'), {statusCode:400});
  }
  const remove = async session => {
    const options = session ? {session} : {};
    const course = await Course.findById(req.params.id, null, options);
    if (!course) throw Object.assign(new Error('Course not found'), {statusCode:404});
    const Enrollment = require('../models/Enrollment');
    if (await Enrollment.findOne({course:course._id}, '_id', options)) {
      throw Object.assign(new Error('Delete the students enrolled in this course first, then permanently delete the course.'), {statusCode:409});
    }
    const Exam = require('../models/Exam');
    const Quiz = require('../models/Quiz');
    const {Form, Response, Notice} = require('../models/Evaluation');
    const exams = await Exam.find({course:course._id}, '_id', options).lean();
    const quizzes = await Quiz.find({course:course._id}, '_id', options).lean();
    const forms = await Form.find({course:course._id}, '_id', options).lean();
    await require('../models/ExamResult').deleteMany({exam:{$in:exams.map(row => row._id)}}, options);
    await require('../models/QuizResult').deleteMany({quiz:{$in:quizzes.map(row => row._id)}}, options);
    const formFilter = {form:{$in:forms.map(row => row._id)}};
    await Response.deleteMany(formFilter, options);
    await Notice.deleteMany(formFilter, options);
    for (const Model of courseReferences) {
      await Model.deleteMany({course:course._id}, options);
    }
    // Retain the course until its dependent records are removed, allowing retry on standalone MongoDB.
    await Course.deleteOne({_id:course._id}, options);
  };
  try {
    await mongoose.connection.transaction(remove);
  } catch (error) {
    if (error.code !== 20 && error.codeName !== 'IllegalOperation' &&
        !error.message?.includes('Transaction numbers are only allowed')) throw error;
    await remove();
  }
  res.json({success:true,message:'Course and linked records permanently deleted'});
});

module.exports = {
  listCourses: controller.list,
  getCourseById: controller.getById,
  createCourse: controller.create,
  updateCourse: controller.update,
  deleteCourse,
};
