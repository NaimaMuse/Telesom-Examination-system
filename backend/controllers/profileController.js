const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const User = require('../models/User');
const { asyncHandler, pick } = require('./resourceController');

const getProfile = asyncHandler(async (req, res) => {
  if (!req.user || !req.user._id) {
    res.status(401);
    throw new Error('Authentication is required');
  }
  const user = await User.findById(req.user._id);
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
  const userUpdates = pick(req.body, ['name', 'email']);
  if (userUpdates.email) {
    userUpdates.email = String(userUpdates.email).trim().toLowerCase();
  }
  const user = await User.findByIdAndUpdate(req.user._id, userUpdates, {
    new: true,
    runValidators: true,
  });
  if (!user) {
    res.status(404);
    throw new Error('User profile not found');
  }
  res.status(200).json({ success: true, data: { user } });
});

module.exports = {
  getProfile,
  updateProfile,
};
