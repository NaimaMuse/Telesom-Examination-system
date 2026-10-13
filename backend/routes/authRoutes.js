const express = require('express');
const router = express.Router();
const { login } = require('../controllers/authController');

// @route   POST /api/auth/login
// @desc    User login (Student by studentId, Admin/Teacher by email + password)
// @access  Public
router.post('/login', login);

module.exports = router;
