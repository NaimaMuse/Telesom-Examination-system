const express = require('express');
const {
  listQuizzes,
  getQuizById,
  createQuiz,
  updateQuiz,
  deleteQuiz,
} = require('../controllers/quizController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

const router = express.Router();
router.use(protect);

router.get('/', authorizeRoles('admin', 'teacher'), listQuizzes);
router.get('/:id', authorizeRoles('admin', 'teacher'), getQuizById);
router.post('/', authorizeRoles('admin', 'teacher'), createQuiz);
router.put('/:id', authorizeRoles('admin', 'teacher'), updateQuiz);
router.patch('/:id', authorizeRoles('admin', 'teacher'), updateQuiz);
router.delete('/:id', authorizeRoles('admin'), deleteQuiz);

module.exports = router;
