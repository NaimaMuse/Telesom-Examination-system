const Sequence = require('../models/Sequence');
const Student = require('../models/Student');

const getStudentIdYear = (now = new Date()) => Number(new Intl.DateTimeFormat('en-US', {
  timeZone: 'Africa/Nairobi', year: 'numeric',
}).format(now));

const nextStudentId = async (now = new Date()) => {
  const year = getStudentIdYear(now);
  const key = `student-id:${year}`;
  if (!await Sequence.findById(key).lean()) {
    // Initialize above existing IDs when enabling this format on an existing database.
    const existing = await Student.find({ studentId: { $regex: `^TL-${year}-[0-9]+$` } }).select('studentId').lean();
    const maximum = existing.reduce((max, row) => Math.max(max, Number(row.studentId.split('-')[2]) || 0), 0);
    try {
      await Sequence.updateOne({ _id: key }, { $max: { value: maximum } }, { upsert: true });
    } catch (error) {
      // Another request may initialize this year's unique counter first.
      if (error.code !== 11000) throw error;
    }
  }
  // MongoDB increments atomically, including across multiple server processes.
  const counter = await Sequence.findOneAndUpdate({ _id: key }, { $inc: { value: 1 } }, { new: true });
  if (!counter) throw new Error('Student ID counter is unavailable');
  return `TL-${year}-${String(counter.value).padStart(2, '0')}`;
};

module.exports = { nextStudentId, getStudentIdYear };
