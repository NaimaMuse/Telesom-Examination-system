const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  teacher: {type:mongoose.Schema.Types.ObjectId,ref:'Teacher',required:true},
  course: {type:mongoose.Schema.Types.ObjectId,ref:'Course',required:true},
  academicYear: {type:String,required:true,trim:true},
  batch: {type:String,required:true,trim:true},
  startDate: {type:String,required:true},
  endDate: {type:String,default:null},
  totalDays: {type:Number,required:true,min:1,validate:Number.isInteger},
  status: {type:String,enum:['active','cancelled'],default:'active'},
  createdBy: {type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
  writeLock: {token:String,expiresAt:Date},
}, {timestamps:true});
schema.index({teacher:1,course:1,academicYear:1,batch:1,startDate:1},{unique:true});
module.exports = mongoose.model('TeacherContract',schema);
