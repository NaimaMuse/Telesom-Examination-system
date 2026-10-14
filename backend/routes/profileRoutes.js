const express = require('express');
const { getProfile, updateProfile } = require('../controllers/profileController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);

router.get('/', getProfile);
router.put('/', updateProfile);
router.patch('/', updateProfile);

module.exports = router;
