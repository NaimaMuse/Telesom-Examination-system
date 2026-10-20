const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const {
  getTeacherDashboard,
  getTeacherMyCourse,
  getTeacherStudents,
  getTeacherExams,
  getTeacherPerformance,
  getTeacherProfile,
  updateTeacherProfile,
  getTeacherAssessments,
  getTeacherAssessmentResults,
  saveTeacherAssessmentResults,
} = require('../controllers/teacherDashboardController');

const router = express.Router();

router.use(protect);
router.use(authorizeRoles('teacher'));

router.get('/dashboard', getTeacherDashboard);
router.get('/my-course', getTeacherMyCourse);
router.get('/courses', getTeacherMyCourse);
router.get('/upcoming-exams', getTeacherDashboard);
router.get('/students', getTeacherStudents);
router.get('/exams', getTeacherExams);
router.get('/performance', getTeacherPerformance);
router.get('/profile', getTeacherProfile);
router.put('/profile', updateTeacherProfile);
router.patch('/profile', updateTeacherProfile);
router.get('/results/assessments', getTeacherAssessments);
router.get('/results/:assessmentType/:assessmentId', getTeacherAssessmentResults);
router.put('/results/:assessmentType/:assessmentId', saveTeacherAssessmentResults);

module.exports = router;
