const {resolveScope}=require('../services/teacherCourseWorkspaceService');
const {fail}=require('../services/evaluationRules');

async function loadDefenseAccess(req,res,next){
  try{
    if(req.user.role==='teacher'){
      const scope=await resolveScope(req.user);
      req.defenseCourses=scope.courses.map(course=>String(course._id));
    }
    next();
  }catch(error){
    next(error);
  }
}

function requireDefenseCourse(req,course){
  if(req.defenseCourses&&!req.defenseCourses.includes(String(course))){
    fail('This course is not assigned to you.',403);
  }
}

function defenseCourseFilter(req){
  return req.defenseCourses?{course:{$in:req.defenseCourses}}:{};
}

module.exports={loadDefenseAccess,requireDefenseCourse,defenseCourseFilter};
