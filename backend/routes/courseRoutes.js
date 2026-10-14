const express = require('express');
const {
  listCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
} = require('../controllers/courseController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

const router = express.Router();
router.use(protect);

router.get('/', authorizeRoles('admin', 'teacher'), listCourses);
router.get('/:id', authorizeRoles('admin', 'teacher'), getCourseById);
router.post('/', authorizeRoles('admin'), createCourse);
router.put('/:id', authorizeRoles('admin'), updateCourse);
router.patch('/:id', authorizeRoles('admin'), updateCourse);
router.delete('/:id', authorizeRoles('admin'), deleteCourse);

module.exports = router;
