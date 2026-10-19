const mongoose = require('mongoose');
const Note = require('../models/Note');
const { asyncHandler, pick } = require('./resourceController');

const getOwnerFilter = (req) => {
  if (!req.user || !req.user._id) {
    const error = new Error('Authentication is required');
    error.statusCode = 401;
    throw error;
  }
  return req.user.role === 'admin' ? {} : { createdBy: req.user._id };
};

const listNotes = asyncHandler(async (req, res) => {
  const filters = getOwnerFilter(req);
  for (const field of ['course', 'student', 'isPinned']) {
    if (req.query && req.query[field] !== undefined) {
      filters[field] = req.query[field];
    }
  }
  const notes = await Note.find(filters)
    .populate('createdBy', 'name email')
    .populate('course', 'courseCode title')
    .populate({
      path: 'student',
      populate: { path: 'user', select: 'name email' },
    })
    .sort({ isPinned: -1, updatedAt: -1 });
  res.status(200).json({ success: true, data: notes });
});

const getNoteById = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    throw new Error('Invalid note ID');
  }
  const note = await Note.findOne({
    _id: req.params.id,
    ...getOwnerFilter(req),
  })
    .populate('createdBy', 'name email')
    .populate('course', 'courseCode title')
    .populate({
      path: 'student',
      populate: { path: 'user', select: 'name email' },
    });
  if (!note) {
    res.status(404);
    throw new Error('Note not found');
  }
  res.status(200).json({ success: true, data: note });
});

const createNote = asyncHandler(async (req, res) => {
  const userId = getOwnerFilter(req).createdBy || req.user._id;
  const note = await Note.create({
    ...pick(req.body, ['title', 'content', 'course', 'student', 'isPinned']),
    createdBy: userId,
  });
  res.status(201).json({ success: true, data: note });
});

const updateNote = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    throw new Error('Invalid note ID');
  }
  const note = await Note.findOneAndUpdate(
    { _id: req.params.id, ...getOwnerFilter(req) },
    pick(req.body, ['title', 'content', 'course', 'student', 'isPinned']),
    { new: true, runValidators: true }
  );
  if (!note) {
    res.status(404);
    throw new Error('Note not found');
  }
  res.status(200).json({ success: true, data: note });
});

const deleteNote = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    throw new Error('Invalid note ID');
  }
  const note = await Note.findOneAndDelete({
    _id: req.params.id,
    ...getOwnerFilter(req),
  });
  if (!note) {
    res.status(404);
    throw new Error('Note not found');
  }
  res.status(200).json({
    success: true,
    message: 'Note deleted successfully',
    data: note,
  });
});

module.exports = {
  listNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
};
