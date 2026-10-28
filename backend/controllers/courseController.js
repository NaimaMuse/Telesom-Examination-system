const Course = require('../models/Course');
const { createResourceController } = require('./resourceController');

const controller = createResourceController(Course, {
  scopeFilter:async req=>{const scope=await require('../services/gradebookIntegrityService').assessmentReadScope(req);return scope?{_id:scope.course}:null;},
  authorizeRead:(req,record)=>require('../services/gradebookIntegrityService').authorizeCourse(req,record._id),
  fields: [
    'courseCode',
    'title',
    'name',
    'description',
    'credits',
    'status',
    'department',
    'semester',
    'academicYear',
    'isActive',
  ],
  filterFields: ['courseCode', 'title', 'name', 'status', 'department', 'semester', 'academicYear', 'isActive'],
  sortFields: ['createdAt', 'updatedAt', 'courseCode', 'title', 'name', 'credits', 'status'],
});

module.exports = {
  listCourses: controller.list,
  getCourseById: controller.getById,
  createCourse: controller.create,
  updateCourse: controller.update,
  deleteCourse: controller.remove,
};
