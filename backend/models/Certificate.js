const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  enrollment: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment', required: true, unique: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, select: false },
  studentName: { type: String, required: true },
  courseTitle: { type: String, required: true },
  creditHours: { type: Number, required: true },
  awardedAt: { type: Date, required: true },
  certificateNo: { type: String, required: true, unique: true },
}, { versionKey: false });

module.exports = mongoose.model('Certificate', schema);
