const express = require('express');
const router = express.Router();
const { login, googleConfig, googleLogin, register, currentSession, logout } = require('../controllers/authController');
const { loginByIp, loginByIdentifier } = require('../middleware/security');
const { protect } = require('../middleware/authMiddleware');

// @route   POST /api/auth/login
// @desc    Sign in with an account email and portal password.
// @access  Public
router.post('/login', loginByIp, loginByIdentifier, login);
router.post('/google/config', googleConfig);
router.post('/google', loginByIp, googleLogin);

// @route   POST /api/auth/register
// @desc    Register a new user (Student, Teacher, Admin)
// @access  Public
router.post('/register', register);

const { authorizeRoles } = require('../middleware/roleMiddleware');
const { changePassword, setStudentPassword } = require('../controllers/passwordController');
router.get('/session', protect, currentSession);
router.post('/logout', (req,res,next) => req.headers.authorization ? protect(req,res,next) : next(), logout);
router.put('/password', protect, authorizeRoles('admin'), changePassword);
router.put('/student/password', protect, authorizeRoles('student'), setStudentPassword);
module.exports = router;
