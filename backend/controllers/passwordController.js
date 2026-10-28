const bcrypt = require('bcryptjs');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { asyncHandler } = require('./resourceController');
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
    res.status(400); throw new Error('Enter your current password and a new password of 8–128 characters.');
  }
  if (currentPassword === newPassword) { res.status(400); throw new Error('Choose a different new password.'); }
  const user = await User.findById(req.user._id).select('+password');
  if (!user || !await bcrypt.compare(currentPassword, user.password)) { res.status(400); throw new Error('Current password is incorrect.'); }
  const version = user.authVersion || 0;
  const password = await bcrypt.hash(newPassword, 12);
  const updated = await User.findOneAndUpdate({ _id: user._id, ...(version ? {authVersion:version} : {$or:[{authVersion:0},{authVersion:{$exists:false}}]}) }, { $set: { password, mustChangePassword: false }, $inc: {authVersion:1} }, {new:true,runValidators:true});
  if (!updated) { res.status(409); throw new Error('Your account changed. Please sign in and try again.'); }
  res.json({success:true, message:'Password changed successfully.', token:generateToken(updated._id,updated.authVersion), user:{mustChangePassword:false}});
});
module.exports = { changePassword };
