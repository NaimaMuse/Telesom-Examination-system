const {hashPassword, verifyPassword, isLegacyHash} = require('../utils/passwords');
const User = require('../models/User');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const generateToken = require('../utils/generateToken');
const {startSession,endSession} = require('../services/sessionService');
const {asyncHandler} = require('./resourceController');
const dummyHash = '$argon2id$v=19$m=19456,t=2,p=1$x0EoN30zbT3WfLJuIxbAqw$rzEKbDC5C8qLpmc8ui6dlV+qCLtjp5bkS8cwg9nN4Kg';

async function sessionUser(user, studentProfile) {
  const teacher = user.role === 'teacher' ? await Teacher.findOne({user:user._id}) : null;
  return {
    _id:user._id, name:user.name, email:user.email, role:user.role,
    isActive:user.isActive, lastLogin:user.lastLogin,
    mustChangePassword:user.role !== 'teacher' && !!user.mustChangePassword,
    ...(studentProfile ? {studentId:studentProfile.studentId,studentProfileId:studentProfile._id,phone:studentProfile.phone} : {}),
    ...(teacher ? {teacherId:teacher.teacherId,teacherProfileId:teacher._id,department:teacher.department,phone:teacher.phone} : {}),
  };
}

/**
 * Authenticate students with their student ID and staff with email/password.
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, studentId, identifier, password } = req.body;
    if ([email,studentId,identifier,password,req.body.role].some(value => value !== undefined &&
        (typeof value !== 'string' || value.length > 1024))) {
      res.status(400);
      return next(new Error('Invalid sign-in fields'));
    }

    // Check if any login identifier is provided
    const hasStudentId = Boolean(studentId && String(studentId).trim());
    const hasEmail = Boolean(email && String(email).trim());
    const hasIdentifier = Boolean(identifier && String(identifier).trim());

    if (!hasStudentId && !hasEmail && !hasIdentifier) {
      res.status(400);
      return next(new Error('Student ID or Email is required to log in'));
    }

    // Determine login type: Student ID vs Email
    // Explicit studentId takes precedence; otherwise check if identifier contains '@'
    const isStudentLogin = hasStudentId || (hasIdentifier && !identifier.includes('@') && !hasEmail);

    let user;
    let studentProfile = null;

    if (isStudentLogin) {
      // --- Student Login Flow (Student ID only, no password required) ---
      const rawStudentId = String(studentId || identifier).trim();

      if (!rawStudentId) {
        res.status(400);
        return next(new Error('Student ID is required'));
      }

      const normalizedStudentId = rawStudentId.toUpperCase();

      // Find student record by normalized studentId or phone
      const student = await Student.findOne({ studentId: normalizedStudentId });

      if (!student || !student.user || (student.status && student.status !== 'active')) {
        res.status(401);
        return next(new Error('Invalid credentials'));
      }

      // Find associated user account
      user = await User.findById(student.user);

      if (!user || user.role !== 'student' || !user.isActive) {
        res.status(401);
        return next(new Error('Invalid credentials'));
      }

      studentProfile = student;
    } else {
      // --- Admin / Teacher Login Flow (Email + Password) ---
      const rawEmail = String(email || identifier).trim();

      if (!password) {
        res.status(400);
        return next(new Error('Password is required for email login'));
      }

      const normalizedEmail = rawEmail.toLowerCase();

      // Find user account by email, including password hash for verification
      user = await User.findOne({ email: normalizedEmail }).select('+password');

      const eligible = user && ['teacher','admin'].includes(user.role) && user.isActive;
      const isMatch = await verifyPassword(password, (eligible && user.password) || dummyHash);
      if (!eligible || !isMatch) {
        res.status(401);
        return next(new Error('Invalid credentials'));
      }
    }

    if (req.body.role && req.body.role !== user.role) { res.status(401); return next(new Error('Invalid credentials')); }

    if (!studentProfile && isLegacyHash(user.password)) {
      await User.updateOne({_id:user._id,password:user.password},{$set:{password:await hashPassword(password)}});
    }

    // Update lastLogin timestamp
    const loginTime = new Date();
    await User.findByIdAndUpdate(user._id, { lastLogin: loginTime });

    const safeUser = await sessionUser(user, studentProfile);
    req.auditActor = user._id;
    safeUser.lastLogin = loginTime;
    const browser = req.headers?.origin || req.headers?.['x-session-mode'] === 'cookie';
    if (browser) await startSession(req,res,user);
    res.status(200).json({success:true,user:safeUser,...(browser ? {} : {token:generateToken(user._id,user.authVersion || 0)})});
  } catch (error) {
    res.status(500);
    next(error);
  }
};

// Accounts can only be provisioned by the administrator.
const register = (req, res) => res.status(403).json({ success: false, message: 'Public registration is disabled. Contact the administrator for an account.' });
const currentSession = asyncHandler(async (req,res) => {
  const student = req.user.role === 'student' ? await Student.findOne({user:req.user._id}) : null;
  res.json({success:true,user:await sessionUser(req.user,student)});
});
const logout = asyncHandler(async (req,res) => {
  req.securityEvent = 'logout';
  if (!req.browserSession && req.user) await User.updateOne({_id:req.user._id},{$inc:{authVersion:1}});
  req.auditActor = await endSession(req,res);
  res.status(204).end();
});
module.exports = { login, register, currentSession, logout };
