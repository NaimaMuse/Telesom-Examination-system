const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const Exam = require('./models/Exam');
const Quiz = require('./models/Quiz');
const ExamResult = require('./models/ExamResult');
const QuizResult = require('./models/QuizResult');

// Repair impossible legacy thresholds only; preserve valid configured pass marks.
async function repair() {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  try {
    for (const [Model, Result, key] of [[Exam, ExamResult, 'exam'], [Quiz, QuizResult, 'quiz']]) {
      const rows = await Model.find({ totalMarks: { $gt: 0 }, $expr: { $gt: ['$passingMarks', '$totalMarks'] } }).lean();
      let repaired = 0;
      for (const row of rows) {
        const passingMarks = Math.round(row.totalMarks * 50) / 100;
        const updated = await Model.updateOne({ _id: row._id, totalMarks: row.totalMarks, passingMarks: row.passingMarks }, { $set: { passingMarks } });
        if (!updated.modifiedCount) continue;
        await Result.updateMany({ [key]: row._id }, [{ $set: { isPassed: { $gte: ['$marksObtained', passingMarks] } } }]);
        repaired++;
      }
      console.log(`${Model.modelName}: repaired ${repaired} invalid pass marks.`);
    }
  } finally { await mongoose.disconnect(); }
}
repair().catch(() => { console.error('Pass mark repair failed. Check the database connection.'); process.exitCode = 1; });
