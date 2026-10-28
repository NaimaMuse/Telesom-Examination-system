const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  lesson:{type:mongoose.Schema.Types.ObjectId,ref:'TeachingLesson',required:true,index:true},
  contract:{type:mongoose.Schema.Types.ObjectId,ref:'TeacherContract',required:true},
  teacher:{type:mongoose.Schema.Types.ObjectId,ref:'Teacher',required:true},
  course:{type:mongoose.Schema.Types.ObjectId,ref:'Course',required:true},
  batch:{type:String,required:true},
  academicYear:{type:String,trim:true,default:''},
  originalDate:{type:String,required:true},
  start:{type:Date,required:true},end:{type:Date,required:true},
  reason:{type:String,required:true,trim:true,maxlength:1000},
  status:{type:String,enum:['scheduled','cancelled'],default:'scheduled'},
  createdBy:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
}, {timestamps:true});
schema.index({teacher:1,start:1,end:1});
// A shared academy lock serializes scheduling across different courses.
module.exports = mongoose.model('MakeupClass',schema);
