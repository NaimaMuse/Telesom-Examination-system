const mongoose = require('mongoose');

const attendanceImportSchema = new mongoose.Schema(
  {
    originalFileName: {
      type: String,
      required: [true, 'Original file name is required'],
      trim: true,
    },
    fileStoragePath: {
      type: String,
      trim: true,
    },
    importedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Importing admin user reference is required'],
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required'],
    },
    attendanceMonth: {
      type: String,
      required: [true, 'Attendance month is required (e.g. 2026-10)'],
      trim: true,
    },
    academicYear: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'processing', 'completed', 'failed'],
        message: '{VALUE} is not a valid import status',
      },
      default: 'pending',
    },
    summary: {
      totalRows: {
        type: Number,
        default: 0,
        min: 0,
      },
      successfulRecords: {
        type: Number,
        default: 0,
        min: 0,
      },
      failedRecords: {
        type: Number,
        default: 0,
        min: 0,
      },
      duplicateRecords: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    errorLogs: [
      {
        row: {
          type: Number,
        },
        reason: {
          type: String,
          trim: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes
attendanceImportSchema.index({ course: 1, attendanceMonth: 1 });
attendanceImportSchema.index({ importedBy: 1 });

const AttendanceImport = mongoose.model('AttendanceImport', attendanceImportSchema);

module.exports = AttendanceImport;
