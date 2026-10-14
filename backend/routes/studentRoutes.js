const express = require('express');
const {
  listStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
} = require('../controllers/studentController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

const router = express.Router();
router.use(protect, authorizeRoles('admin'));

router.route('/').get(listStudents).post(createStudent);
router
  .route('/:id')
  .get(getStudentById)
  .put(updateStudent)
  .patch(updateStudent)
  .delete(deleteStudent);

module.exports = router;
