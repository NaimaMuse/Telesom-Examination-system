const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    material: {type:Boolean,default:false},
    academicYear: {type:String,trim:true,default:''},
    batch: {type:String,trim:true,default:''},
    archivedAt: {type:Date,default:null},
    attachment: {filename:String,mime:String,size:Number,data:{type:Buffer,select:false}},
    title: {
      type: String,
      required: [true, 'Note title is required'],
      trim: true,
      maxlength: [200, 'Note title cannot exceed 200 characters'],
    },
    content: {
      type: String,
      required: [true, 'Note content is required'],
      trim: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Note author is required'],
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

noteSchema.index({ createdBy: 1, updatedAt: -1 });
noteSchema.index({ course: 1, student: 1 });

const Note = mongoose.model('Note', noteSchema);

module.exports = Note;
