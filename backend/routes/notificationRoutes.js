const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { asyncHandler } = require('../controllers/resourceController');
const { getNotifications } = require('../services/notificationService');
const router = express.Router();
router.get('/', protect, authorizeRoles('admin','teacher','student'), asyncHandler(async (req,res) => {
  const evaluations = await require('../services/evaluationNotifications').evaluationNotices(req.user);
  res.json({ notifications: [...evaluations, ...await getNotifications(req.user)] });
}));
router.patch('/evaluations/read', protect, authorizeRoles('student'), asyncHandler(async(req,res)=>{
 const student=await require('../models/Student').findOne({user:req.user._id});
 if(student)await require('../models/Evaluation').Notice.updateMany({student:student._id,_id:{$in:(req.body.ids||[]).filter(id=>String(id).startsWith('evaluation:')).map(id=>id.slice(11))}},{$set:{readAt:new Date()}});
 res.json({success:true});
}));
module.exports = router;
