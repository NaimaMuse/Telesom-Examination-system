const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const User = require('../models/User');
const { verifyPassword } = require('../utils/passwords');
const generateToken = require('../utils/generateToken');
const { startSession } = require('../services/sessionService');
const sharp = require('sharp');
const { asyncHandler, pick } = require('./resourceController');

const getProfile = asyncHandler(async (req, res) => {
  if (!req.user || !req.user._id) {
    res.status(401);
    throw new Error('Authentication is required');
  }
  const user = await User.findById(req.user._id).select(req.user.role === 'admin' ? '+profilePicture' : '');
  if (!user) {
    res.status(404);
    throw new Error('User profile not found');
  }

  const profileQuery =
    user.role === 'student'
      ? Student.findOne({ user: user._id })
      : user.role === 'teacher'
        ? Teacher.findOne({ user: user._id })
        : null;
  const profile = profileQuery ? await profileQuery : null;
  res.status(200).json({
    success: true,
    data: { user, profile },
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  if (!req.user || !req.user._id) {
    res.status(401);
    throw new Error('Authentication is required');
  }
  const userUpdates = pick(req.body, req.user.role === 'student' ? ['name'] : ['name', 'email']);
  const user = await User.findById(req.user._id).select('+password');
  if (!user) {
    res.status(404);
    throw new Error('User profile not found');
  }

  if (Object.prototype.hasOwnProperty.call(userUpdates, 'email')) {
    if (typeof userUpdates.email !== 'string' || userUpdates.email.length > 254) {
      res.status(400);
      throw new Error('Enter a valid email address.');
    }
    userUpdates.email = userUpdates.email.trim().toLowerCase();
  }

  const emailChanged = req.user.role === 'admin' && userUpdates.email !== undefined && userUpdates.email !== user.email;
  let updatedUser;
  if (emailChanged) {
    const { currentPassword } = req.body || {};
    if (typeof currentPassword !== 'string' || currentPassword.length > 1024 ||
        !await verifyPassword(currentPassword, user.password)) {
      res.status(400);
      throw new Error('Enter your current password to change your account email.');
    }
    const version = req.user.authVersion || 0;
    if (version !== (user.authVersion || 0)) {
      res.status(409);
      throw new Error('Your account changed. Please sign in and try again.');
    }
    updatedUser = await User.findOneAndUpdate({
      _id: user._id,
      ...(version ? {authVersion:version} : {$or:[{authVersion:0},{authVersion:{$exists:false}}]}),
    }, {
      $set: userUpdates,
      $inc: {authVersion:1},
    }, {new:true,runValidators:true}).select('+profilePicture');
    if (!updatedUser) {
      res.status(409);
      throw new Error('Your account changed. Please sign in and try again.');
    }
    req.securityEvent = 'admin_email_change';
    if (req.browserSession) await startSession(req,res,updatedUser);
  } else {
    updatedUser = await User.findByIdAndUpdate(req.user._id, userUpdates, {
      new: true,
      runValidators: true,
    }).select(req.user.role === 'admin' ? '+profilePicture' : '');
    if (!updatedUser) {
      res.status(404);
      throw new Error('User profile not found');
    }
  }
  res.status(200).json({
    success: true,
    data: { user: updatedUser },
    ...(emailChanged && !req.browserSession ? {token:generateToken(updatedUser._id,updatedUser.authVersion)} : {}),
  });
});

const saveProfilePicture = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Only administrators can change this profile picture.');
  }
  const file = req.file;
  if (!file || file.size > 2 * 1024 * 1024) {
    res.status(400);
    throw new Error('Select a PNG, JPEG or WebP image up to 2 MB.');
  }
  const buffer = file.buffer;
  const type = buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    ? 'image/png'
    : buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255
      ? 'image/jpeg'
      : buffer.toString('ascii',0,4) === 'RIFF' && buffer.toString('ascii',8,12) === 'WEBP'
        ? 'image/webp'
        : null;
  if (!type || type !== file.mimetype) {
    res.status(400);
    throw new Error('Only valid PNG, JPEG and WebP images are supported.');
  }
  let image;
  try {
    image = await sharp(buffer,{animated:true,limitInputPixels:16_000_000})
      .autoOrient()
      .resize(512,512,{fit:'inside',withoutEnlargement:true})
      .webp({quality:82})
      .toBuffer();
  } catch {
    res.status(400);
    throw new Error('The image could not be decoded. Select a valid PNG, JPEG or WebP image.');
  }
  const picture = `data:image/webp;base64,${image.toString('base64')}`;
  const user = await User.findByIdAndUpdate(req.user._id,{$set:{profilePicture:picture}},{new:true,runValidators:true}).select('+profilePicture');
  if (!user) {
    res.status(404);
    throw new Error('User profile not found.');
  }
  req.securityEvent = 'admin_profile_picture_change';
  res.json({success:true,picture:user.profilePicture});
});

const removeProfilePicture = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Only administrators can change this profile picture.');
  }
  const user = await User.findByIdAndUpdate(req.user._id,{$set:{profilePicture:''}},{new:true});
  if (!user) {
    res.status(404);
    throw new Error('User profile not found.');
  }
  req.securityEvent = 'admin_profile_picture_remove';
  res.json({success:true,picture:''});
});

module.exports = {
  getProfile,
  updateProfile,
  saveProfilePicture,
  removeProfilePicture,
};
