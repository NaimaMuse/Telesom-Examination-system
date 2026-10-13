const mongoose = require('mongoose');

const examResultSchema = new mongoose.Schema(
  {
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: [true, 'Exam reference is required'],
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
    grade: {
      type: String,
      trim: true,
      uppercase: true,
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

// Prevent duplicate exam results for the same student on the same exam
examResultSchema.index({ exam: 1, student: 1 }, { unique: true });
examResultSchema.index({ student: 1 });
examResultSchema.index({ exam: 1 });

const ExamResult = mongoose.model('ExamResult', examResultSchema);

module.exports = ExamResult;
