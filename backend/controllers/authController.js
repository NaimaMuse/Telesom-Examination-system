const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const generateToken = require('../utils/generateToken');

/**
 * Authenticate students with their student ID and staff with email/password.
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, studentId, identifier, password } = req.body;

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
      const student = await Student.findOne({
        $or: [
          { studentId: normalizedStudentId },
          { phone: rawStudentId },
          { phone: rawStudentId.replace(/\s+/g, '') },
        ],
      });

      if (!student || !student.user) {
        res.status(401);
        return next(new Error('Invalid credentials'));
      }

      // Find associated user account
      user = await User.findById(student.user);

      if (!user) {
        res.status(401);
        return next(new Error('Invalid credentials'));
      }

      // Reject inactive student accounts
      if (!user.isActive) {
        res.status(401);
        return next(new Error('Account is inactive, please contact administrator'));
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

      if (!user) {
        res.status(401);
        return next(new Error('Invalid credentials'));
      }

      // Students must not use email login
      if (user.role === 'student') {
        res.status(401);
        return next(new Error('Invalid credentials'));
      }

      // Reject inactive staff accounts
      if (!user.isActive) {
        res.status(401);
        return next(new Error('Account is inactive, please contact administrator'));
      }

      // Verify submitted password against stored bcrypt hash
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        res.status(401);
        return next(new Error('Invalid credentials'));
      }
    }

    // Update lastLogin timestamp
    const loginTime = new Date();
    await User.findByIdAndUpdate(user._id, { lastLogin: loginTime });

    // Generate JWT token
    const token = generateToken(user._id);

    let teacherProfile = null;
    if (user.role === 'teacher') {
      try {
        teacherProfile = await Teacher.findOne({ user: user._id });
      } catch {
        teacherProfile = null;
      }
    }

    // Return safe user information (never expose password or password hash)
    res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        lastLogin: loginTime,
        ...(studentProfile
          ? {
              studentId: studentProfile.studentId,
              studentProfileId: studentProfile._id,
              phone: studentProfile.phone,
            }
          : {}),
        ...(teacherProfile
          ? {
              teacherId: teacherProfile.teacherId,
              teacherProfileId: teacherProfile._id,
              department: teacherProfile.department,
              phone: teacherProfile.phone,
            }
          : {}),
      },
    });
  } catch (error) {
    res.status(500);
    next(error);
  }
};

/**
 * Register a new user (Student, Teacher, or Admin).
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role = 'student', studentId, phone, department, gender = 'male' } = req.body;

    if (!name || !email) {
      res.status(400);
      return next(new Error('Name and email are required'));
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      res.status(400);
      return next(new Error('Email is already registered'));
    }

    let hashedPassword = undefined;
    if (role !== 'student' || password) {
      if (password && password.length < 6) {
        res.status(400);
        return next(new Error('Password must be at least 6 characters'));
      }
      hashedPassword = password ? await bcrypt.hash(password, 10) : await bcrypt.hash('password123', 10);
    }

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role,
      isActive: true,
    });

    let extraProfile = {};
    if (role === 'student') {
      const generatedId = (studentId && String(studentId).trim())
        ? String(studentId).trim().toUpperCase()
        : 'STD-' + Math.floor(1000 + Math.random() * 9000);

      const student = await Student.create({
        user: user._id,
        studentId: generatedId,
        gender: gender || 'male',
        phone: phone || '',
      });

      extraProfile = {
        studentId: student.studentId,
        studentProfileId: student._id,
        phone: student.phone,
      };
    } else if (role === 'teacher') {
      const teacher = await Teacher.create({
        user: user._id,
        teacherId: 'TCH-' + Math.floor(1000 + Math.random() * 9000),
        gender: gender || 'male',
        phone: phone || '',
        department: department || 'General Academic',
      });

      extraProfile = {
        teacherId: teacher.teacherId,
        teacherProfileId: teacher._id,
        department: teacher.department,
        phone: teacher.phone,
      };
    }

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        lastLogin: new Date(),
        ...extraProfile,
      },
    });
  } catch (error) {
    res.status(500);
    next(error);
  }
};

module.exports = {
  login,
  register,
};
