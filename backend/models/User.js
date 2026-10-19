const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      // Students log in with Student ID only, so they do not store a password.
      // Admin and teacher accounts still require a hashed password.
      required: [
        function passwordRequired() {
          return this.role !== 'student';
        },
        'Password hash is required',
      ],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false, // Prevents password from being returned in queries by default
    },
    role: {
      type: String,
      enum: {
        values: ['admin', 'teacher', 'student'],
        message: '{VALUE} is not a valid role',
      },
      required: [true, 'User role is required'],
      default: 'student',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);

module.exports = User;
