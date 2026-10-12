const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required'],
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required'],
    },
    date: {
      type: Date,
      required: [true, 'Attendance date is required'],
    },
    status: {
      type: String,
      enum: {
        values: ['present', 'absent', 'late', 'excused'],
        message: '{VALUE} is not a valid attendance status',
      },
      required: [true, 'Attendance status is required'],
      default: 'present',
    },
    remarks: {
      type: String,
      trim: true,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    importBatch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AttendanceImport',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate attendance record for the same student, course, and date
attendanceSchema.index({ student: 1, course: 1, date: 1 }, { unique: true });
attendanceSchema.index({ course: 1, date: 1 });
attendanceSchema.index({ student: 1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
