const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const Exam = require('./models/Exam');
const Quiz = require('./models/Quiz');
const { syncAssessmentCompletion } = require('./services/assessmentCompletionService');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  try {
    for (const [Model, type] of [[Exam, 'exam'], [Quiz, 'quiz']]) {
      const assessments = await Model.find({ status: { $ne: 'cancelled' } }).lean();
      let completed = 0;
      for (const assessment of assessments) {
        await syncAssessmentCompletion(Model, assessment, type);
        const updated = await Model.findById(assessment._id).select('status').lean();
        if (updated?.status === 'completed') completed++;
      }
      console.log(`${Model.modelName}: ${completed} completed of ${assessments.length} checked.`);
    }
  } finally { await mongoose.disconnect(); }
})().catch(() => { console.error('Completion sync failed. Check the database connection.'); process.exitCode = 1; });
