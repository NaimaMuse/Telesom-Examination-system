const express = require('express');
const router = express.Router();
const { login, register, currentSession, logout } = require('../controllers/authController');
const { loginByIp, loginByIdentifier } = require('../middleware/security');
const { protect } = require('../middleware/authMiddleware');

// @route   POST /api/auth/login
// @desc    User login (Student by studentId or phone, Admin/Teacher by email + password)
// @access  Public
router.post('/login', loginByIp, loginByIdentifier, login);

// @route   POST /api/auth/register
// @desc    Register a new user (Student, Teacher, Admin)
// @access  Public
router.post('/register', register);

const { authorizeRoles } = require('../middleware/roleMiddleware');
router.get('/session', protect, currentSession);
router.post('/logout', (req,res,next) => req.headers.authorization ? protect(req,res,next) : next(), logout);
router.put('/password', protect, authorizeRoles('admin'), require('../controllers/passwordController').changePassword);
module.exports = router;
