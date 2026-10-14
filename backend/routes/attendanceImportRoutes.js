const express = require('express');
const {
  importAttendance,
  listAttendanceImports,
  getAttendanceImportById,
} = require('../controllers/attendanceImportController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { uploadAttendanceFile } = require('../middleware/uploadMiddleware');
const {
  validateAttendanceImportRequest,
} = require('../validators/attendanceImportValidator');

const router = express.Router();
router.use(protect, authorizeRoles('admin'));

router.get('/', listAttendanceImports);
router.get('/:id', getAttendanceImportById);
router.post(
  '/',
  uploadAttendanceFile,
  validateAttendanceImportRequest,
  importAttendance
);

module.exports = router;
