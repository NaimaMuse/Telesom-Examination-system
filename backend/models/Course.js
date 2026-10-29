const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    performanceWriteLock: { token: String, expiresAt: Date },
    courseCode: {
      type: String,
      trim: true,
      uppercase: true,
    },
    title: {
      type: String,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    credits: {
      type: Number,
      required: [true, 'Credits are required'],
      min: [1, 'Credits must be at least 1'],
      default: 3,
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'inactive', 'archived'],
        message: '{VALUE} is not a valid status',
      },
      default: 'active',
    },
    department: {
      type: String,
      trim: true,
    },
    semester: {
      type: String,
      trim: true,
    },
    batch: { type: String, trim: true, default: '' },
    academicYear: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

courseSchema.pre('validate', function (next) {
  if (!this.title && this.name) {
    this.title = this.name;
  }
  if (!this.name && this.title) {
    this.name = this.title;
  }
  if (!this.courseCode) {
    const slug = (this.name || this.title || 'CRS')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 4)
      .toUpperCase();
    this.courseCode = `${slug || 'CRS'}-${Math.floor(100 + Math.random() * 900)}`;
  }
  if (this.status) {
    this.isActive = this.status === 'active';
  }
  next();
});

// Indexes
courseSchema.index({ department: 1 });
courseSchema.index({ courseCode: 1 });

const Course = mongoose.model('Course', courseSchema);

module.exports = Course;
