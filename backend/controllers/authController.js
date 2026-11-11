const { createHash, randomBytes } = require('node:crypto');
const {hashPassword, verifyPassword, isLegacyHash} = require('../utils/passwords');
const User = require('../models/User');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const generateToken = require('../utils/generateToken');
const {startSession,endSession} = require('../services/sessionService');
const {verifiedEmail} = require('../services/googleIdentityService');
const {asyncHandler} = require('./resourceController');
const dummyHash = '$argon2id$v=19$m=19456,t=2,p=1$x0EoN30zbT3WfLJuIxbAqw$rzEKbDC5C8qLpmc8ui6dlV+qCLtjp5bkS8cwg9nN4Kg';

const activeStudent = async user => {
  const student = await Student.findOne({user:user._id});
  return student && (!student.status || student.status === 'active') ? student : null;
};
const fail = (statusCode, message) => { throw Object.assign(new Error(message), {statusCode}); };

async function sessionUser(user, studentProfile) {
  const teacher = user.role === 'teacher' ? await Teacher.findOne({user:user._id}) : null;
  return {
    _id:user._id, name:user.name, email:user.email, role:user.role,
    isActive:user.isActive, lastLogin:user.lastLogin,
    mustChangePassword:user.role === 'student' ? !user.studentPasswordSet : user.role !== 'teacher' && !!user.mustChangePassword,
    ...(studentProfile ? {studentId:studentProfile.studentId,studentProfileId:studentProfile._id,phone:studentProfile.phone} : {}),
    ...(teacher ? {teacherId:teacher.teacherId,teacherProfileId:teacher._id,department:teacher.department,phone:teacher.phone} : {}),
  };
}

async function completeLogin(req, res, user, student, googleVerified = false) {
  const lastLogin = new Date();
  await User.findByIdAndUpdate(user._id, {lastLogin});
  const safeUser = await sessionUser(user, student);
  req.auditActor = user._id;
  safeUser.lastLogin = lastLogin;
  const browser = googleVerified || req.headers?.origin || req.headers?.['x-session-mode'] === 'cookie';
  if (browser) await startSession(req, res, user, {googleVerified});
  res.status(200).json({success:true,user:safeUser,...(browser ? {} : {token:generateToken(user._id,user.authVersion || 0)})});
}

const login = asyncHandler(async (req, res) => {
  const {email, identifier, studentId, password, role} = req.body || {};
  if ([email, identifier, studentId, password, role].some(value => value !== undefined &&
      (typeof value !== 'string' || value.length > 1024))) {
    fail(400, 'Invalid sign-in fields');
  }
  if (studentId || (!email && identifier && !identifier.includes('@'))) fail(401, 'Invalid credentials');
  const normalizedEmail = (email || identifier || '').trim().toLowerCase();
  if (!normalizedEmail) fail(400, 'Email is required to log in');
  if (!password) fail(400, 'Password is required for email login');

  const user = await User.findOne({email:normalizedEmail}).select('+password');
  const eligible = user?.isActive && ['admin', 'teacher'].includes(user.role) &&
    (!role || role === user.role);
  const isMatch = await verifyPassword(password, (eligible && user.password) || dummyHash);
  if (!eligible || !isMatch) fail(401, 'Invalid credentials');

  if (isLegacyHash(user.password)) {
    await User.updateOne({_id:user._id,password:user.password},{$set:{password:await hashPassword(password)}});
  }
  await completeLogin(req, res, user, null);
});

const nonceCookie = () => process.env.NODE_ENV === 'production' ? '__Host-telesom_google' : 'telesom_google';
const nonceOptions = () => ({httpOnly:true,secure:process.env.NODE_ENV === 'production',sameSite:'strict',path:'/'});
const nonceHash = secret => createHash('sha256').update(secret).digest('base64url');
const googleConfig = (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) return res.json({clientId:null});
  const secret = randomBytes(32).toString('base64url');
  res.cookie(nonceCookie(), secret, {...nonceOptions(),maxAge:10 * 60_000});
  res.json({clientId,nonce:nonceHash(secret)});
};

const googleLogin = asyncHandler(async (req, res) => {
  req.securityEvent = 'google_login';
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) fail(503, 'Google sign-in is unavailable. Contact the administrator.');
  const {credential} = req.body || {};
  if (typeof credential !== 'string' || credential.length > 8192) fail(400, 'Invalid Google credential.');
  const prefix = nonceCookie() + '=';
  const secret = (req.get('cookie') || '').split(';').map(part => part.trim())
    .find(part => part.startsWith(prefix))?.slice(prefix.length);
  if (!secret || !/^[A-Za-z0-9_-]{43}$/.test(secret)) fail(401, 'Google sign-in expired. Refresh the page and try again.');

  const email = await verifiedEmail(credential, clientId, nonceHash(secret));
  if (!email) fail(401, 'Google sign-in could not be verified. Try again with your registered account.');
  const user = await User.findOne({email,role:'student',isActive:true});
  const student = user ? await activeStudent(user) : null;
  if (!student) fail(401, 'Use the Google account registered by your administrator.');
  res.clearCookie(nonceCookie(), nonceOptions());
  await completeLogin(req, res, user, student, true);
});

// Accounts can only be provisioned by the administrator.
const register = (req, res) => res.status(403).json({ success: false, message: 'Public registration is disabled. Contact the administrator for an account.' });
const currentSession = asyncHandler(async (req,res) => {
  const student = req.user.role === 'student' ? await activeStudent(req.user) : null;
  if (req.user.role === 'student' && !student) fail(403, 'Student account is inactive.');
  if (student && !req.googleVerified) {
    fail(401, 'Sign in with your registered Google account.');
  }
  res.json({success:true,user:await sessionUser(req.user,student)});
});
const logout = asyncHandler(async (req,res) => {
  req.securityEvent = 'logout';
  if (!req.browserSession && req.user) await User.updateOne({_id:req.user._id},{$inc:{authVersion:1}});
  req.auditActor = await endSession(req,res);
  res.status(204).end();
});
module.exports = { login, googleConfig, googleLogin, register, currentSession, logout };
