const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  contract:{type:mongoose.Schema.Types.ObjectId,ref:'TeacherContract',required:true},
  teacher:{type:mongoose.Schema.Types.ObjectId,ref:'Teacher',required:true},
  course:{type:mongoose.Schema.Types.ObjectId,ref:'Course',required:true},
  batch:{type:String,required:true},
  academicYear:{type:String,required:true},
  title:{type:String,required:true,trim:true,maxlength:200},
  position:{type:Number,default:0,min:0},
  description:{type:String,trim:true,maxlength:4000,default:''},
  published:{type:Boolean,default:false},
  document:{name:String,mime:String,data:{type:Buffer,select:false}},
}, {timestamps:true});
module.exports = mongoose.model('CourseOutline',schema);
