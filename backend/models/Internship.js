const mongoose = require('mongoose');
const { validDate } = require('../services/teacherContractService');
const weeklySchedule = require('./weeklySchedule');

const schema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  courseName: { type: String, trim: true },
  studentName: { type: String, required: true, trim: true, maxlength: 120 },
  totalDays: { type: Number, min: 1, max: 36500, validate: Number.isInteger },
  monthlyStipendCents: { type: Number, min: 0, validate: Number.isSafeInteger },
  attendanceSchedule: { ...weeklySchedule, default: undefined },
  startDate: { type: String, required: true, validate: [validDate, 'Enter a valid start date.'] },
  endDate: {
    type: String,
    required: true,
    validate: {
      validator(value) { return validDate(value) && value >= this.startDate; },
      message: 'Enter a valid end date on or after the start date.',
    },
  },
}, { timestamps: true });

module.exports = mongoose.model('Internship', schema);
