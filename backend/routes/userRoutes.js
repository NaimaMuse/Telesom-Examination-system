const express = require('express');
const router = express.Router();
const { createStudent, createTeacher, createJudge, listJudges } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

// All user-management routes require a valid JWT and an admin account
router.post('/students', protect, authorizeRoles('admin'), createStudent);
router.post('/teachers', protect, authorizeRoles('admin'), createTeacher);
router.get('/judges', protect, authorizeRoles('admin'), listJudges);
router.post('/judges', protect, authorizeRoles('admin'), createJudge);

module.exports = router;
