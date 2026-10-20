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
        values: ['midterm', 'final', 'practical', 'supplementary', 'quiz', 'assignment', 'exam'],
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
      default: Date.now,
    },
    startTime: {
      type: String,
      trim: true,
      default: '09:00 AM',
    },
    durationMinutes: {
      type: Number,
      min: [1, 'Duration must be at least 1 minute'],
      default: 60,
    },
    room: {
      type: String,
      trim: true,
      default: 'Hall A',
    },
    academicYear: {
      type: String,
      trim: true,
      default: '2025-2026',
    },
    semester: {
      type: String,
      trim: true,
      default: 'Semester 1',
    },
    status: {
      type: String,
      enum: {
        values: ['scheduled', 'upcoming', 'ongoing', 'completed', 'cancelled'],
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

examSchema.pre('validate', function (next) {
  if (!this.examCode) {
    const prefix = (this.type || 'EXAM').slice(0, 3).toUpperCase();
    this.examCode = `EX-${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
  }
  next();
});

// Indexes
examSchema.index({ course: 1, examDate: 1 });

const Exam = mongoose.model('Exam', examSchema);

module.exports = Exam;
