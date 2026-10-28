const Enrollment = require('../models/Enrollment');
const ExamResult = require('../models/ExamResult');
const QuizResult = require('../models/QuizResult');

function allStudentsGraded(enrolledIds, results, maximum) {
  const enrolled = new Set(enrolledIds.map(String));
  const graded = new Set(results.filter(row => typeof row.marksObtained === 'number' && Number.isFinite(row.marksObtained) && row.marksObtained >= 0 && row.marksObtained <= maximum).map(row => String(row.student)));
  return enrolled.size > 0 && [...enrolled].every(id => graded.has(id));
}

async function syncAssessmentCompletion(Assessment, assessment, type) {
  if (assessment.status === 'cancelled') return;
  const Result = type === 'exam' ? ExamResult : QuizResult;
  const [enrolled, results] = await Promise.all([
    Enrollment.distinct('student', { course: assessment.course, status: 'enrolled',...(assessment.academicYear?{academicYear:assessment.academicYear}:{}),...(assessment.batch?{batch:assessment.batch}:{}) }),
    Result.find({ [type]: assessment._id }).select('student marksObtained').lean(),
  ]);
  const complete = allStudentsGraded(enrolled, results, assessment.totalMarks);
  if (complete || assessment.status === 'completed') {
    await Assessment.updateOne({ _id: assessment._id, status: { $ne: 'cancelled' } }, { $set: { status: complete ? 'completed' : type==='quiz'?'published':'ongoing' } });
  }
}
module.exports = { allStudentsGraded, syncAssessmentCompletion };
