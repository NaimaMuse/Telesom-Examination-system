const express = require('express');
const multer = require('multer');
const { getProfile, updateProfile, saveProfilePicture, removeProfilePicture } = require('../controllers/profileController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

const router = express.Router();
router.use(protect);
const profileUpload = multer({
  storage:multer.memoryStorage(),
  limits:{fileSize:2*1024*1024,files:1,fields:0,parts:2},
});
const uploadPicture = (req,res,next) => profileUpload.single('file')(req,res,error => {
  if (error instanceof multer.MulterError) {
    res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400);
    return next(new Error(error.code === 'LIMIT_FILE_SIZE'
      ? 'Uploaded image exceeds the 2 MB limit.'
      : error.message));
  }
  next(error);
});

router.get('/', getProfile);
router.put('/', updateProfile);
router.patch('/', updateProfile);
router.put('/picture', authorizeRoles('admin'), uploadPicture, saveProfilePicture);
router.delete('/picture', authorizeRoles('admin'), removeProfilePicture);

module.exports = router;
