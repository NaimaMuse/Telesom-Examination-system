const express = require('express');
const {
  listAttendance,
  getAttendanceById,
  recordAttendance,
  updateAttendance,
  deleteAttendance,
} = require('../controllers/attendanceController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

const router = express.Router();
router.use(protect, authorizeRoles('admin', 'teacher'));

router
  .route('/')
  .get(listAttendance)
  .post(recordAttendance);
router
  .route('/:id')
  .get(getAttendanceById)
  .put(updateAttendance)
  .patch(updateAttendance)
  .delete(authorizeRoles('admin'), deleteAttendance);

module.exports = router;
