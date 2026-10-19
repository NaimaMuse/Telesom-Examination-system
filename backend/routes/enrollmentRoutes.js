const express = require('express');
const {
  listEnrollments,
  getEnrollmentById,
  createEnrollment,
  updateEnrollment,
  deleteEnrollment,
} = require('../controllers/enrollmentController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

const router = express.Router();
router.use(protect);

router.get('/', authorizeRoles('admin', 'teacher'), listEnrollments);
router.get('/:id', authorizeRoles('admin', 'teacher'), getEnrollmentById);
router.post('/', authorizeRoles('admin'), createEnrollment);
router.put('/:id', authorizeRoles('admin'), updateEnrollment);
router.patch('/:id', authorizeRoles('admin'), updateEnrollment);
router.delete('/:id', authorizeRoles('admin'), deleteEnrollment);

module.exports = router;
