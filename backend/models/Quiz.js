const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema(
  {
    batch: {type:String,trim:true,default:''},
    marksPublished: {type:Boolean,default:false},
    visibleToStudents: {type:Boolean,default:false},
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
      min: [0.01, 'Total marks must be positive'],
      max: [100, 'Assessment maximum cannot exceed 100 marks'],
      default: 20,
    },
    passingMarks: {
      type: Number,
      required: [true, 'Passing marks are required'],
      min: [0, 'Passing marks cannot be negative'],
      default: function () { return Math.round(this.totalMarks * 50) / 100; },
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
        values: ['draft', 'scheduled', 'upcoming', 'published', 'completed', 'cancelled'],
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

quizSchema.pre('validate', function (next) {
  if (this.passingMarks > this.totalMarks) this.invalidate('passingMarks', 'Passing marks cannot exceed total marks.');
  next();
});

// Indexes
quizSchema.index({ course: 1, quizDate: 1 });

const Quiz = mongoose.model('Quiz', quizSchema);

module.exports = Quiz;
