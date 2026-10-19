const express = require('express');
const router = express.Router();
const { login, register } = require('../controllers/authController');

// @route   POST /api/auth/login
// @desc    User login (Student by studentId or phone, Admin/Teacher by email + password)
// @access  Public
router.post('/login', login);

// @route   POST /api/auth/register
// @desc    Register a new user (Student, Teacher, Admin)
// @access  Public
router.post('/register', register);

module.exports = router;
