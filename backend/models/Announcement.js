const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  sender: {type:mongoose.Schema.Types.ObjectId, ref:'User', required:true},
  senderName: {type:String, required:true},
  senderRole: {type:String, enum:['admin', 'teacher'], required:true},
  audience: [{type:String, enum:['admin', 'teacher', 'student']}],
  targetTeacher: {type:mongoose.Schema.Types.ObjectId, ref:'User'},
  studentRecipients: [{type:mongoose.Schema.Types.ObjectId, ref:'User'}],
  readBy: [{type:mongoose.Schema.Types.ObjectId, ref:'User'}],
  dismissedBy: [{type:mongoose.Schema.Types.ObjectId, ref:'User'}],
  title: {type:String, required:true, trim:true, maxlength:120},
  message: {type:String, required:true, trim:true, maxlength:4000},
}, {timestamps:true});

announcementSchema.index({sender:1, createdAt:-1, _id:-1});
announcementSchema.index({audience:1, createdAt:-1, _id:-1});
announcementSchema.index({targetTeacher:1, createdAt:-1, _id:-1});
announcementSchema.index({studentRecipients:1, createdAt:-1, _id:-1});

module.exports = mongoose.model('Announcement', announcementSchema);
