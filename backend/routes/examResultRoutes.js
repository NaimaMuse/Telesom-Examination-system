const express = require('express');
const {
  listExamResults,
  getExamResultById,
  createExamResult,
  updateExamResult,
  deleteExamResult,
} = require('../controllers/examResultController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

const router = express.Router();
router.use(protect, authorizeRoles('admin', 'teacher'));

router
  .route('/')
  .get(listExamResults)
  .post(createExamResult);
router
  .route('/:id')
  .get(getExamResultById)
  .put(updateExamResult)
  .patch(updateExamResult)
  .delete(authorizeRoles('admin', 'teacher'), deleteExamResult);

module.exports = router;
