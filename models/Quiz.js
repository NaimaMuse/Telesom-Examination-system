const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Quiz title is required'],
      trim: true,
    },
    quizCode: {
      type: String,
      required: [true, 'Quiz code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required'],
    },
    totalMarks: {
      type: Number,
      required: [true, 'Total marks are required'],
      min: [0, 'Total marks cannot be negative'],
      default: 20,
    },
    passingMarks: {
      type: Number,
      required: [true, 'Passing marks are required'],
      min: [0, 'Passing marks cannot be negative'],
      default: 10,
    },
    weightage: {
      type: Number,
      min: [0, 'Weightage cannot be negative'],
      max: [100, 'Weightage cannot exceed 100%'],
      default: 10,
    },
    quizDate: {
      type: Date,
      required: [true, 'Quiz date is required'],
    },
    durationMinutes: {
      type: Number,
      required: [true, 'Quiz duration in minutes is required'],
      min: [1, 'Duration must be at least 1 minute'],
      default: 30,
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
        values: ['draft', 'published', 'completed', 'cancelled'],
        message: '{VALUE} is not a valid quiz status',
      },
      default: 'draft',
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
quizSchema.index({ quizCode: 1 });
quizSchema.index({ course: 1, quizDate: 1 });

const Quiz = mongoose.model('Quiz', quizSchema);

module.exports = Quiz;
