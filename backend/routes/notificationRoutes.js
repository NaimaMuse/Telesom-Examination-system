const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { asyncHandler } = require('../controllers/resourceController');
const { getNotifications } = require('../services/notificationService');
const router = express.Router();
router.get('/', protect, authorizeRoles('admin','teacher','student'), asyncHandler(async (req,res) => {
  res.json({ notifications: await getNotifications(req.user) });
}));
module.exports = router;
