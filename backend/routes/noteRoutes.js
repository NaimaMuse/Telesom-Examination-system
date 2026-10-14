const express = require('express');
const {
  listNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
} = require('../controllers/noteController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

const router = express.Router();
router.use(protect, authorizeRoles('admin', 'teacher'));

router
  .route('/')
  .get(listNotes)
  .post(createNote);
router
  .route('/:id')
  .get(getNoteById)
  .put(updateNote)
  .patch(updateNote)
  .delete(deleteNote);

module.exports = router;
