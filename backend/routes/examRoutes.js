const express = require('express');
const {
  listExams,
  getExamById,
  createExam,
  updateExam,
  deleteExam,
} = require('../controllers/examController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

const router = express.Router();
router.use(protect);

router.get('/', authorizeRoles('admin', 'teacher'), listExams);
router.get('/:id', authorizeRoles('admin', 'teacher'), getExamById);
router.post('/', authorizeRoles('teacher'), createExam);
router.put('/:id', authorizeRoles('teacher'), updateExam);
router.patch('/:id', authorizeRoles('teacher'), updateExam);
router.delete('/:id', authorizeRoles('teacher'), deleteExam);

module.exports = router;
