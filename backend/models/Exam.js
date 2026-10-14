const mongoose = require('mongoose');

const examSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Exam title is required'],
      trim: true,
    },
    examCode: {
      type: String,
      required: [true, 'Exam code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required'],
    },
    type: {
      type: String,
      enum: {
        values: ['midterm', 'final', 'practical', 'supplementary'],
        message: '{VALUE} is not a valid exam type',
      },
      default: 'final',
    },
    totalMarks: {
      type: Number,
      required: [true, 'Total marks are required'],
      min: [0, 'Total marks cannot be negative'],
      default: 100,
    },
    passingMarks: {
      type: Number,
      required: [true, 'Passing marks are required'],
      min: [0, 'Passing marks cannot be negative'],
      default: 50,
    },
    weightage: {
      type: Number,
      min: [0, 'Weightage cannot be negative'],
      max: [100, 'Weightage cannot exceed 100%'],
      default: 40,
    },
    examDate: {
      type: Date,
      required: [true, 'Exam date is required'],
    },
    startTime: {
      type: String,
      trim: true,
    },
    durationMinutes: {
      type: Number,
      required: [true, 'Exam duration in minutes is required'],
      min: [1, 'Duration must be at least 1 minute'],
    },
    room: {
      type: String,
      trim: true,
    },
    academicYear: {
      type: String,
      trim: true,
    },
    semester: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ['scheduled', 'ongoing', 'completed', 'cancelled'],
        message: '{VALUE} is not a valid exam status',
      },
      default: 'scheduled',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
examSchema.index({ course: 1, examDate: 1 });

const Exam = mongoose.model('Exam', examSchema);

module.exports = Exam;
