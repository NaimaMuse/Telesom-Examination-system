const express = require('express');
const {
  listCourseTeachers,
  getCourseTeacherById,
  assignCourseTeacher,
  updateCourseTeacher,
  removeCourseTeacher,
} = require('../controllers/courseTeacherController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

const router = express.Router();
router.use(protect);

router.get('/', authorizeRoles('admin', 'teacher'), listCourseTeachers);
router.get('/:id', authorizeRoles('admin', 'teacher'), getCourseTeacherById);
router.post('/', authorizeRoles('admin'), assignCourseTeacher);
router.put('/:id', authorizeRoles('admin'), updateCourseTeacher);
router.patch('/:id', authorizeRoles('admin'), updateCourseTeacher);
router.delete('/:id', authorizeRoles('admin'), removeCourseTeacher);

module.exports = router;
