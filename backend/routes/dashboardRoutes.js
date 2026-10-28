const express = require('express');
const { getDashboardOverview } = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

const router = express.Router();
router.get('/admin', protect, authorizeRoles('admin'), require('../controllers/dashboardController').getAdminDashboard);
router.get(
  '/',
  protect,
  authorizeRoles('admin', 'teacher', 'student'),
  getDashboardOverview
);

module.exports = router;
