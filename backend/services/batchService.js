const Batch=require('../models/Batch');
const fail=message=>{throw Object.assign(new Error(message),{statusCode:400});};
async function validateBatch(batch,academicYear) {
  if(!batch)return; // Preserve existing enrollments with no historical batch.
  if(typeof batch!=='string'||typeof academicYear!=='string')fail('Select a cohort and academic year.');
  if(!await Batch.exists({name:batch,academicYear,status:'active'}))fail('The selected cohort does not belong to this academic year or is archived.');
}
function enrollmentBatch(enrollment) {
  if (enrollment.batch) return enrollment.batch;
  const course = enrollment.course;
  return course?.academicYear === enrollment.academicYear ? course?.batch || '' : '';
}
function enrollmentCohortFilter(course, academicYear, batch) {
  const configuredBatch = enrollmentBatch({course, academicYear});
  return {academicYear, batch: batch === configuredBatch ? {$in: [batch, '', null]} : batch};
}
module.exports={validateBatch,enrollmentBatch,enrollmentCohortFilter};
