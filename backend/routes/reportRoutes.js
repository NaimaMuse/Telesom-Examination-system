const express = require('express');
const {
  getAcademicSummary,
  getStudentPerformanceReport,
} = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

const router = express.Router();
router.use(protect, authorizeRoles('admin', 'teacher'));

router.get('/academic-summary', getAcademicSummary);
router.get(
  '/students/:studentId',
  authorizeRoles('admin', 'teacher', 'student'),
  getStudentPerformanceReport
);

module.exports = router;
