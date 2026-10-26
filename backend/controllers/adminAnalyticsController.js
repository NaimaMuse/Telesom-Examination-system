const Attendance=require('../models/Attendance');
const {loadMarksOverview}=require('./marksOverviewController');
const {buildAnalytics}=require('../services/adminAnalyticsService');
exports.getAnalytics=async(req,res,next)=>{try{
  const filters={};for(const key of ['course','teacher','batch','from','to']){if(req.query[key]!==undefined&&typeof req.query[key]!=='string')throw Object.assign(new Error('Invalid filter.'),{statusCode:400});filters[key]=req.query[key]||'';}
  for(const key of ['from','to'])if(filters[key]&&(!/^\d{4}-\d{2}-\d{2}$/.test(filters[key])||Number.isNaN(new Date(filters[key]).getTime())||new Date(filters[key]).toISOString().slice(0,10)!==filters[key]))throw Object.assign(new Error('Invalid date range.'),{statusCode:400});
  if(filters.from&&filters.to&&filters.from>filters.to)throw Object.assign(new Error('End date must follow start date.'),{statusCode:400});
  const [data,attendance]=await Promise.all([loadMarksOverview(),Attendance.find().select('student course date status updatedAt').sort({updatedAt:1}).lean()]);
  res.json({success:true,...buildAnalytics(data,attendance,filters),options:{courses:data.courses,teachers:data.teachers,batches:data.batches}});
}catch(error){next(error);}};
