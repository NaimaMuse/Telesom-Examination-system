require('dotenv').config({path:require('path').join(__dirname,'../.env')});
const mongoose=require('mongoose');
const Enrollment=require('../models/Enrollment');
async function migrateBatchIndex(){
  const collection=Enrollment.collection;
  await collection.createIndex({student:1,course:1,academicYear:1,batch:1},{unique:true,name:'student_1_course_1_academicYear_1_batch_1'});
  const old=(await collection.indexes()).find(i=>i.name==='student_1_course_1_academicYear_1'&&JSON.stringify(i.key)===JSON.stringify({student:1,course:1,academicYear:1})&&i.unique);
  if(old)await collection.dropIndex(old.name);
  console.log('Batch-aware enrollment uniqueness is ready. No enrollment records were changed.');
}
if(require.main===module)mongoose.connect(process.env.MONGODB_URI).then(migrateBatchIndex).catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>mongoose.disconnect());
module.exports={migrateBatchIndex};
