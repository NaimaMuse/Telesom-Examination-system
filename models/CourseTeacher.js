const mongoose = require('mongoose');

const courseTeacherSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'Teacher reference is required'],
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required'],
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required'],
      trim: true,
    },
    semester: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: {
        values: ['lead', 'assistant', 'lecturer'],
        message: '{VALUE} is not a valid teaching role',
      },
      default: 'lead',
    },
    isPrimary: {
      type: Boolean,
      default: true,
    },
    assignedDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'inactive'],
        message: '{VALUE} is not a valid status',
      },
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

// Prevent assigning the same teacher to the same course multiple times in the same academic year
courseTeacherSchema.index({ teacher: 1, course: 1, academicYear: 1 }, { unique: true });
courseTeacherSchema.index({ teacher: 1 });
courseTeacherSchema.index({ course: 1 });

const CourseTeacher = mongoose.model('CourseTeacher', courseTeacherSchema);

module.exports = CourseTeacher;
