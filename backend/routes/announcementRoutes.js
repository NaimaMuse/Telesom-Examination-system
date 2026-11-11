const express = require('express');
const {isObjectIdOrHexString} = require('mongoose');
const Announcement = require('../models/Announcement');
const CourseTeacher = require('../models/CourseTeacher');
const Enrollment = require('../models/Enrollment');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const {protect} = require('../middleware/authMiddleware');
const {authorizeRoles} = require('../middleware/roleMiddleware');
const {asyncHandler} = require('../controllers/resourceController');

const router = express.Router();
const pageSize = 20;
const allowedAudiences = {admin:['teacher', 'student'], teacher:['admin', 'student']};
const fail = (statusCode, message) => { throw Object.assign(new Error(message), {statusCode}); };
const activeTeacherAccount = {path:'user', match:{role:'teacher', isActive:true}, select:'name'};

router.use(protect, authorizeRoles('admin', 'teacher', 'student'));

function recipientScopes({_id, role}) {
  const scopes = [{audience:role, targetTeacher:null, ...(role === 'student' ? {senderRole:'admin'} : {})}];
  if (role === 'teacher') scopes.push({audience:'teacher', targetTeacher:_id});
  if (role === 'student') scopes.push({audience:'student', studentRecipients:_id});
  return scopes;
}

function countUnread(user) {
  return Announcement.countDocuments({
    $or:recipientScopes(user), sender:{$ne:user._id}, readBy:{$ne:user._id}, dismissedBy:{$ne:user._id},
  });
}

router.get('/unread-count', asyncHandler(async (req, res) => {
  res.json({unreadCount:await countUnread(req.user)});
}));

router.get('/', asyncHandler(async (req, res) => {
  const page = Number(req.query.page ?? 1);
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(page * pageSize)) {
    fail(400, 'Invalid announcement page.');
  }
  const {_id} = req.user;
  const visible = [...recipientScopes(req.user), {sender:_id}];
  const [rows, unreadCount] = await Promise.all([
    Announcement.find({$or:visible, dismissedBy:{$ne:_id}})
      .select('sender senderName senderRole audience targetTeacher title message createdAt readBy')
      .sort({createdAt:-1, _id:-1}).skip((page - 1) * pageSize).limit(pageSize + 1).lean(),
    countUnread(req.user),
  ]);
  const announcements = rows.slice(0, pageSize).map(({sender, targetTeacher, readBy, ...item}) => ({
    ...item, targeted:Boolean(targetTeacher), sentByMe:String(sender) === String(_id),
    read:Boolean(readBy?.some(id => String(id) === String(_id))),
  }));
  res.json({announcements, hasMore:rows.length > pageSize, unreadCount});
}));

function recipientAnnouncement(req) {
  if (!isObjectIdOrHexString(req.params.id)) fail(400, 'Invalid announcement ID.');
  return {_id:req.params.id, sender:{$ne:req.user._id}, $or:recipientScopes(req.user)};
}

router.patch('/:id/read', asyncHandler(async (req, res) => {
  const result = await Announcement.updateOne(
    {...recipientAnnouncement(req), dismissedBy:{$ne:req.user._id}},
    {$addToSet:{readBy:req.user._id}},
  );
  if (!result.matchedCount) fail(404, 'Announcement not found.');
  res.json({success:true});
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const result = await Announcement.updateOne(recipientAnnouncement(req), {$addToSet:{dismissedBy:req.user._id}});
  if (!result.matchedCount) fail(404, 'Announcement not found.');
  res.json({success:true});
}));

async function assignedStudents(teacherId) {
  const assignments = await CourseTeacher.find({teacher:teacherId, status:'active'})
    .select('course academicYear semester').lean();
  if (!assignments.length) return [];

  const scopes = assignments.map(({course, academicYear, semester}) => ({
    course, academicYear, ...(semester ? {semester} : {}),
  }));
  const students = await Enrollment.distinct('student', {status:'enrolled', $or:scopes});
  return Student.find({_id:{$in:students}, status:{$in:['active', null]}})
    .select('user studentId').populate({path:'user', match:{role:'student', isActive:true}, select:'name'}).lean();
}

async function findTeacher(id) {
  if (!isObjectIdOrHexString(id)) fail(400, 'Select a teacher.');
  const teacher = await Teacher.findById(id).select('user').populate(activeTeacherAccount).lean();
  if (!teacher?.user) fail(404, 'This teacher is unavailable.');
  return teacher;
}

router.get('/recipients/teachers', authorizeRoles('admin'), asyncHandler(async (_req, res) => {
  const rows = await Teacher.find().select('user teacherId').populate(activeTeacherAccount).lean();
  const teachers = rows.filter(row => row.user)
    .map(row => ({id:row._id, name:row.user.name, teacherId:row.teacherId}))
    .sort((a, b) => a.name.localeCompare(b.name));
  res.json({teachers});
}));

router.get('/recipients/teachers/:id/students', authorizeRoles('admin'), asyncHandler(async (req, res) => {
  const teacher = await findTeacher(req.params.id);
  const rows = await assignedStudents(teacher._id);
  const students = rows.filter(row => row.user)
    .map(row => ({id:row._id, name:row.user.name, studentId:row.studentId}))
    .sort((a, b) => a.name.localeCompare(b.name));
  res.json({students});
}));

router.post('/', authorizeRoles('admin', 'teacher'), asyncHandler(async (req, res) => {
  const {title, message, audience, teacherId, studentIds} = req.body || {};
  if (typeof title !== 'string' || !title.trim() || title.trim().length > 120 ||
      typeof message !== 'string' || !message.trim() || message.trim().length > 4000) {
    fail(400, 'Enter a title of up to 120 characters and a message of up to 4,000 characters.');
  }
  const {_id, name, role} = req.user;
  if (!Array.isArray(audience) || !audience.length || audience.length > 2 ||
      !audience.every(recipient => allowedAudiences[role].includes(recipient))) {
    fail(400, 'Select one or both available recipient groups.');
  }
  let targetTeacher;
  let studentRecipients = [];
  if (teacherId !== undefined || studentIds !== undefined) {
    if (role !== 'admin') fail(403, 'Only admins can select individual recipients.');
    if (!Array.isArray(studentIds) || studentIds.length > 5000 ||
        !studentIds.every(id => typeof id === 'string' && isObjectIdOrHexString(id)) ||
        audience.includes('student') !== (studentIds.length > 0)) {
      fail(400, 'Select the students who should receive this announcement.');
    }
    const teacher = await findTeacher(teacherId);
    targetTeacher = teacher.user._id;
    if (studentIds.length) {
      const selected = new Set(studentIds.map(id => id.toLowerCase()));
      const rows = await assignedStudents(teacher._id);
      const recipients = rows.filter(row => row.user && selected.has(String(row._id)));
      if (recipients.length !== selected.size) fail(400, 'Some students are outside this teacher’s active courses.');
      studentRecipients = recipients.map(row => row.user._id);
    }
  } else if (role === 'teacher' && audience.includes('student')) {
    const teacher = await Teacher.findOne({user:_id}).select('_id').lean();
    const rows = teacher ? await assignedStudents(teacher._id) : [];
    studentRecipients = rows.filter(row => row.user).map(row => row.user._id);
    if (!studentRecipients.length) {
      fail(400, 'There are no active students in your assigned courses. Select Admins to send to that group.');
    }
  }
  await Announcement.create({
    sender:_id, senderName:name, senderRole:role, audience:[...new Set(audience)],
    targetTeacher, studentRecipients, title, message,
  });
  req.securityEvent = 'announcement_created';
  res.status(201).json({success:true});
}));

module.exports = router;
