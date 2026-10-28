const Batch=require('../models/Batch');
const fail=message=>{throw Object.assign(new Error(message),{statusCode:400});};
async function validateBatch(batch,academicYear) {
  if(!batch)return; // Preserve existing enrollments with no historical batch.
  if(typeof batch!=='string'||typeof academicYear!=='string')fail('Select a batch and academic year.');
  if(!await Batch.exists({name:batch,academicYear,status:'active'}))fail('The selected batch does not belong to this academic year or is archived.');
}
module.exports={validateBatch};
