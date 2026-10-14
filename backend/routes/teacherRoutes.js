const express = require('express');
const {
  listTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
} = require('../controllers/teacherController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

const router = express.Router();
router.use(protect, authorizeRoles('admin'));

router.route('/').get(listTeachers).post(createTeacher);
router
  .route('/:id')
  .get(getTeacherById)
  .put(updateTeacher)
  .patch(updateTeacher)
  .delete(deleteTeacher);

module.exports = router;
