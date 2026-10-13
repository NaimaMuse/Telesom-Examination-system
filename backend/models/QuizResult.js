const mongoose = require('mongoose');

const quizResultSchema = new mongoose.Schema(
  {
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      required: [true, 'Quiz reference is required'],
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required'],
    },
    marksObtained: {
      type: Number,
      required: [true, 'Marks obtained are required'],
      min: [0, 'Marks obtained cannot be negative'],
    },
    percentage: {
      type: Number,
      min: [0, 'Percentage cannot be negative'],
      max: [100, 'Percentage cannot exceed 100%'],
    },
    isPassed: {
      type: Boolean,
      default: false,
    },
    remarks: {
      type: String,
      trim: true,
    },
    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate quiz results for the same student on the same quiz
quizResultSchema.index({ quiz: 1, student: 1 }, { unique: true });
quizResultSchema.index({ student: 1 });
quizResultSchema.index({ quiz: 1 });

const QuizResult = mongoose.model('QuizResult', quizResultSchema);

module.exports = QuizResult;
