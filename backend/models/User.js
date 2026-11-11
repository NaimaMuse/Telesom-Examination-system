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
      required: [function emailRequired() { return this.role !== 'student'; }, 'Email is required'],
      set: value => value == null || String(value).trim() === '' ? undefined : value,
      trim: true,
      lowercase: true,
      match: [
        /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      // Students set their own password after verifying their Google account.
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
    mustChangePassword: { type: Boolean, default: false },
    studentPasswordSet: { type: Boolean, default: false },
    authVersion: { type: Number, default: 0 },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const emailIndexOptions = {name:'unique_present_email', unique:true, sparse:true};
userSchema.index({email:1},emailIndexOptions);

userSchema.statics.ensureOptionalStudentEmailIndex = async function () {
  await this.collection.createIndex({email:1},emailIndexOptions);
  const indexes = await this.collection.indexes();
  for (const index of indexes) {
    if (index.name === emailIndexOptions.name || !index.unique ||
        Object.keys(index.key).length !== 1 || index.key.email !== 1) continue;
    try {
      await this.collection.dropIndex(index.name);
    } catch (error) {
      if (error.code !== 27) throw error;
    }
  }
};

const User = mongoose.model('User', userSchema);

module.exports = User;
