const mongoose = require('mongoose');
const Student = require('../models/Student');
const User = require('../models/User');
const {
  asyncHandler,
  createResourceController,
} = require('./resourceController');
const { createStudent } = require('./userController');

const controller = createResourceController(Student, {
  fields: [
    'gender',
    'phone',
    'address',
    'academicYear',
    'batch',
    'status',
  ],
  filterFields: ['user', 'studentId', 'gender', 'academicYear', 'batch', 'status'],
  populate: [{ path: 'user', select: 'name email role isActive' }],
  sortFields: ['createdAt', 'updatedAt', 'studentId'],
  beforeUpdate: async req => {
    const original=await Student.findById(req.params.id);
    if((req.body.batch!==undefined&&req.body.batch!==(original?.batch||''))||(req.body.academicYear!==undefined&&req.body.academicYear!==original?.academicYear))await require('../services/batchService').validateBatch(req.body.batch??original?.batch,req.body.academicYear??original?.academicYear);
    if (req.body.email !== undefined && original?.user) {
      const account = await User.findOne({_id:original.user,role:'student'});
      const email = String(req.body.email ?? '').trim().toLowerCase();
      if (account && (account.email || '') !== email) {
        account.email = email;
        await account.validate(['email']);
        await User.updateOne({_id:account._id}, {
          $set:{...(email ? {email} : {}),studentPasswordSet:false},
          $unset:{password:1,...(!email ? {email:1} : {})},
          $inc:{authVersion:1},
        });
      }
    }
    if(req.body.status==='dropped'&&original?.status!=='dropped'){
      const droppedAt=new Date();await require('../models/Enrollment').updateMany({student:req.params.id,status:'enrolled'},{$set:{status:'dropped',droppedAt}});return {droppedAt};
    }
    return {};
  },
});

const deleteStudent = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    throw new Error('Invalid student ID');
  }

  let outcome;
  const remove = async session => {
    const options = session ? {session} : {};
    const student = await Student.findById(req.params.id, null, options);
    if (!student) throw Object.assign(new Error('Student not found'), {statusCode:404});

    const {Form, Response, Notice} = require('../models/Evaluation');
    const responses = await Response.find({student:student._id}, 'form submittedAt', options).lean();
    for (const response of responses) {
      if (response.submittedAt) {
        await Form.updateOne(
          {_id:response.form, responseCount:{$gt:0}},
          {$inc:{responseCount:-1}},
          options
        );
      }
    }
    await Form.updateMany({students:student._id}, {$pull:{students:student._id}}, options);
    for (const Model of [
      require('../models/Attendance'), require('../models/ExamResult'),
      require('../models/QuizResult'), require('../models/Certificate'),
      require('../models/Internship'), require('../models/Enrollment'), Response, Notice,
    ]) {
      await Model.deleteMany({student:student._id}, options);
    }
    await require('../models/Note').deleteMany({
      $or:[{student:student._id}, {createdBy:student.user}],
    }, options);

    const Defense = require('../models/ProjectDefense');
    await Defense.deleteMany({students:student._id, $expr:{$eq:[{$size:'$students'},1]}}, options);
    await Defense.updateMany({students:student._id}, {$pull:{students:student._id}}, options);

    if (student.user) {
      const Announcement = require('../models/Announcement');
      await Announcement.deleteMany({sender:student.user}, options);
      await Announcement.updateMany(
        {$or:[{studentRecipients:student.user},{readBy:student.user},{dismissedBy:student.user}]},
        {$pull:{studentRecipients:student.user,readBy:student.user,dismissedBy:student.user}},
        options
      );
      await require('../models/Session').deleteMany({user:student.user}, options);
      await User.deleteOne({_id:student.user,role:'student'}, options);
    }
    await Student.deleteOne({_id:student._id}, options);
    outcome = 'deleted';
  };

  try {
    await mongoose.connection.transaction(remove);
  } catch (error) {
    if (error.code !== 20 && error.codeName !== 'IllegalOperation' &&
        !error.message?.includes('Transaction numbers are only allowed')) throw error;
    // Keep the student profile until cleanup succeeds so standalone retries can finish.
    await remove();
  }
  res.json({success:true,action:outcome,message:outcome === 'archived'
    ? 'Student archived because linked records exist'
    : 'Student and account permanently deleted'});
});

module.exports = {
  listStudents: controller.list,
  getStudentById: controller.getById,
  createStudent,
  updateStudent: controller.update,
  deleteStudent,
};
