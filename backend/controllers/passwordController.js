const {hashPassword,verifyPassword} = require('../utils/passwords');
const User = require('../models/User');
const Student = require('../models/Student');
const generateToken = require('../utils/generateToken');
const { asyncHandler } = require('./resourceController');
const {startSession} = require('../services/sessionService');
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
    res.status(400); throw new Error('Enter your current password and a new password of 8–128 characters.');
  }
  if (currentPassword === newPassword) { res.status(400); throw new Error('Choose a different new password.'); }
  const user = await User.findById(req.user._id).select('+password');
  if (!user || !await verifyPassword(currentPassword, user.password)) { res.status(400); throw new Error('Current password is incorrect.'); }
  const version = user.authVersion || 0;
  const password = await hashPassword(newPassword);
  const updated = await User.findOneAndUpdate({ _id: user._id, ...(version ? {authVersion:version} : {$or:[{authVersion:0},{authVersion:{$exists:false}}]}) }, { $set: { password, mustChangePassword: false }, $inc: {authVersion:1} }, {new:true,runValidators:true});
  if (!updated) { res.status(409); throw new Error('Your account changed. Please sign in and try again.'); }
  req.securityEvent = 'password_change';
  if (req.browserSession) await startSession(req,res,updated);
  res.json({success:true, message:'Password changed successfully.', ...(!req.browserSession ? {token:generateToken(updated._id,updated.authVersion)} : {}), user:{mustChangePassword:false}});
});
const setStudentPassword = asyncHandler(async (req, res) => {
  const {newPassword} = req.body || {};
  if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
    res.status(400); throw new Error('Choose a password of 8–128 characters.');
  }
  if (!req.googleVerified) {
    res.status(403); throw new Error('Sign in with your registered Google account to set a password.');
  }
  const user = req.user;
  const student = await Student.findOne({user:user._id});
  if (!student || (student.status && student.status !== 'active')) {
    res.status(403); throw new Error('Student account is inactive.');
  }
  const version = user.authVersion || 0;
  const updated = await User.findOneAndUpdate({
    _id:user._id,
    isActive:true,
    role:'student',
    ...(version ? {authVersion:version} : {$or:[{authVersion:0},{authVersion:{$exists:false}}]}),
  }, {
    $set:{password:await hashPassword(newPassword),studentPasswordSet:true,mustChangePassword:false},
    $inc:{authVersion:1},
  }, {new:true,runValidators:true});
  if (!updated) {
    res.status(409); throw new Error('Your account changed. Sign in again to continue.');
  }
  req.securityEvent = user.studentPasswordSet ? 'student_password_reset' : 'student_password_setup';
  await startSession(req,res,updated,{googleVerified:true});
  res.json({success:true,user:{mustChangePassword:false}});
});

module.exports = { changePassword, setStudentPassword };
