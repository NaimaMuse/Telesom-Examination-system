const Counter = require('../models/Counter');
const Student = require('../models/Student');

async function generateStudentId() {
  while (true) {
    const counter = await Counter.findOneAndUpdate(
      { _id: 'student' },
      [{
        $set: {
          sequence: {
            $add: [{ $ifNull: ['$sequence', 1000] }, 1],
          },
        },
      }],
      { new: true, upsert: true }
    );
    const studentId = `STD-${counter.sequence}`;

    if (!(await Student.exists({ studentId }))) {
      return studentId;
    }
  }
}

module.exports = generateStudentId;
