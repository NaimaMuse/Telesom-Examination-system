const express = require('express');
const {
  getAcademicSummary,
  getStudentPerformanceReport,
} = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

const router = express.Router();
router.use(protect, authorizeRoles('admin', 'teacher'));

router.get('/analytics', authorizeRoles('admin'), require('../controllers/adminAnalyticsController').getAnalytics);

router.get('/marks-overview', authorizeRoles('admin'), require('../controllers/marksOverviewController').getMarksOverview);

router.get('/assessment-overview', authorizeRoles('admin'), require('../controllers/assessmentOverviewController').getAssessmentOverview);

router.get('/academic-summary', getAcademicSummary);
router.get(
  '/students/:studentId',
  authorizeRoles('admin', 'teacher', 'student'),
  getStudentPerformanceReport
);

module.exports = router;
