const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const generateStudentId = require('../utils/generateStudentId');

const VALID_GENDERS = ['male', 'female'];

const isDuplicateKeyError = (error) => error && error.code === 11000;

const isTransactionUnsupported = (error) => {
  const message = error && error.message ? error.message : '';
  return (
    error?.code === 20 ||
    error?.codeName === 'IllegalOperation' ||
    message.includes('Transaction numbers are only allowed') ||
    message.includes('replica set member')
  );
};

const getDuplicateMessage = (error, fallbackMessage) => {
  const keyPattern = error.keyPattern || {};
  if (keyPattern.email) {
    return 'Email is already registered';
  }
  if (keyPattern.studentId) {
    return 'Student ID already exists';
  }
  if (keyPattern.teacherId) {
    return 'Teacher ID already exists';
  }
  if (keyPattern.user) {
    return 'A profile is already linked to this user';
  }
  return fallbackMessage;
};

const toSafeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  isActive: user.isActive,
});

const normalizeGender = (gender) => {
  if (gender === undefined || gender === null || gender === '') {
    return undefined;
  }
  return String(gender).trim().toLowerCase();
};

/**
 * Create a User and a linked profile together.
 * Uses a MongoDB transaction when the database supports it.
 * Falls back to create-then-cleanup on standalone MongoDB.
 */
const createUserWithProfile = async ({ userData, ProfileModel, profileData }) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    const [user] = await User.create([userData], { session });
    const [profile] = await ProfileModel.create(
      [{ ...profileData, user: user._id }],
      { session }
    );
    await session.commitTransaction();
    return { user, profile };
  } catch (error) {
    try {
      await session.abortTransaction();
    } catch (abortError) {
      // Ignore abort errors from databases that do not support transactions
    }

    if (!isTransactionUnsupported(error)) {
      throw error;
    }
  } finally {
    session.endSession();
  }

  const user = await User.create(userData);

  try {
    const profile = await ProfileModel.create({
      ...profileData,
      user: user._id,
    });
    return { user, profile };
  } catch (profileError) {
    try {
      await User.findByIdAndDelete(user._id);
    } catch (cleanupError) {
      console.error(
        'Failed to remove orphaned user after profile creation error:',
        cleanupError.message
      );
    }
    throw profileError;
  }
};

const handleAccountError = (error, res, next, duplicateFallback) => {
  if (isDuplicateKeyError(error)) {
    res.status(409);
    return next(new Error(getDuplicateMessage(error, duplicateFallback)));
  }

  if (error.name === 'ValidationError') {
    res.status(400);
    return next(error);
  }

  return next(error);
};

// @desc    Create a student account (Student ID-only login, no password)
// @route   POST /api/users/students
// @access  Admin only
const createStudent = async (req, res, next) => {
  try {
    const {
      name,
      email,
      gender,
      phone,
      address,
      academicYear,
      status,
    } = req.body;

    if (!name || !email || !gender) {
      res.status(400);
      return next(
        new Error('Name, email, and gender are required')
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedGender = normalizeGender(gender);

    if (!normalizedEmail) {
      res.status(400);
      return next(
        new Error('Name, email, and gender are required')
      );
    }

    if (!VALID_GENDERS.includes(normalizedGender)) {
      res.status(400);
      return next(new Error('Gender must be male or female'));
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      res.status(409);
      return next(new Error('Email is already registered'));
    }

    const normalizedStudentId = await generateStudentId();

    // SECURITY: Student accounts have no password because login uses Student ID only.
    // Anyone who knows a Student ID can access that student's records until extra
    // verification is added. Do not expose real grades or attendance on this login
    // method in a production setting without a stronger identity check.
    const { user, profile: student } = await createUserWithProfile({
      userData: {
        name: String(name).trim(),
        email: normalizedEmail,
        role: 'student',
        isActive: true,
      },
      ProfileModel: Student,
      profileData: {
        studentId: normalizedStudentId,
        gender: normalizedGender,
        phone,
        address,
        academicYear,
        status: status || 'active',
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Student account created successfully',
      data: {
        user: toSafeUser(user),
        student,
      },
    });
  } catch (error) {
    return handleAccountError(
      error,
      res,
      next,
      'A user or student record already exists'
    );
  }
};

// @desc    Create a teacher account
// @route   POST /api/users/teachers
// @access  Admin only
const createTeacher = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      teacherId,
      gender,
      phone,
      department,
      qualification,
      specialization,
    } = req.body;

    if (!name || !email || !password || !teacherId) {
      res.status(400);
      return next(
        new Error('Name, email, password, and teacher ID are required')
      );
    }

    if (String(password).length < 8) {
      res.status(400);
      return next(
        new Error('Password must be at least 8 characters long')
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedTeacherId = String(teacherId).trim().toUpperCase();
    const normalizedGender = normalizeGender(gender);

    if (!normalizedEmail || !normalizedTeacherId) {
      res.status(400);
      return next(
        new Error('Name, email, password, and teacher ID are required')
      );
    }

    if (normalizedGender && !VALID_GENDERS.includes(normalizedGender)) {
      res.status(400);
      return next(new Error('Gender must be male or female'));
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      res.status(409);
      return next(new Error('Email is already registered'));
    }

    const existingTeacher = await Teacher.findOne({
      teacherId: normalizedTeacherId,
    });
    if (existingTeacher) {
      res.status(409);
      return next(new Error('Teacher ID already exists'));
    }

    const hashedPassword = await bcrypt.hash(String(password), 12);

    const { user, profile: teacher } = await createUserWithProfile({
      userData: {
        name: String(name).trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: 'teacher',
        isActive: true,
      },
      ProfileModel: Teacher,
      profileData: {
        teacherId: normalizedTeacherId,
        gender: normalizedGender,
        phone,
        department,
        qualification,
        specialization,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Teacher account created successfully',
      data: {
        user: toSafeUser(user),
        teacher,
      },
    });
  } catch (error) {
    return handleAccountError(
      error,
      res,
      next,
      'A user or teacher record already exists'
    );
  }
};

module.exports = {
  createStudent,
  createTeacher,
};
