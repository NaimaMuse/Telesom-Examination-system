const express = require('express');
const {
  listQuizResults,
  getQuizResultById,
  createQuizResult,
  updateQuizResult,
  deleteQuizResult,
} = require('../controllers/quizResultController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

const router = express.Router();
router.use(protect, authorizeRoles('admin', 'teacher'));

router
  .route('/')
  .get(listQuizResults)
  .post(createQuizResult);
router
  .route('/:id')
  .get(getQuizResultById)
  .put(updateQuizResult)
  .patch(updateQuizResult)
  .delete(authorizeRoles('admin', 'teacher'), deleteQuizResult);

module.exports = router;
