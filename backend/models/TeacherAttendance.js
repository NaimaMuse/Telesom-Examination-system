const mongoose = require('mongoose');
const {Schema} = mongoose;

const teacherAttendance = new Schema({
  contract: {type:Schema.Types.ObjectId,ref:'TeacherContract',required:true},
  date: {type:String,required:true},
  status: {type:String,enum:['present','absent'],required:true},
  markedBy: {type:Schema.Types.ObjectId,ref:'User',required:true},
}, {timestamps:true});

teacherAttendance.index({contract:1,date:1},{unique:true});
module.exports = mongoose.model('TeacherAttendance',teacherAttendance);
