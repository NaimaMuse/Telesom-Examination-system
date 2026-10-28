const multer=require('multer'),mongoose=require('mongoose');
const Note=require('../models/Note');
const {asyncHandler}=require('./resourceController');
const {resolveScope,materialFilter,safeMaterial}=require('../services/teacherCourseWorkspaceService');
const fail=(message,statusCode=400)=>{throw Object.assign(new Error(message),{statusCode});};
const receive=multer({storage:multer.memoryStorage(),limits:{files:1,fields:8,fieldSize:8000,fileSize:15*1024*1024}}).single('file');
const upload=(req,res,next)=>receive(req,res,error=>{if(error){error.statusCode=error.code==='LIMIT_FILE_SIZE'?413:400;error.message=error.code==='LIMIT_FILE_SIZE'?'The document must be 15 MB or smaller.':error.message;}next(error);});
function attachment(file){
  if(!file)return null;
  const ext=file.originalname.split('.').pop().toLowerCase(),b=file.buffer;
  const pdf=ext==='pdf'&&b.toString('ascii',0,5)==='%PDF-';
  const zip=b.toString('ascii',0,2)==='PK';
  const docx=ext==='docx'&&zip&&b.includes(Buffer.from('word/document.xml'));
  const pptx=ext==='pptx'&&zip&&b.includes(Buffer.from('ppt/presentation.xml'));
  const legacy=['doc','ppt'].includes(ext)&&b.subarray(0,8).equals(Buffer.from([208,207,17,224,161,177,26,225]));
  if(!pdf&&!docx&&!pptx&&!legacy)fail('Select a valid PDF, DOC, DOCX, PPT or PPTX document.');
  const mime={pdf:'application/pdf',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',ppt:'application/vnd.ms-powerpoint',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation'}[ext];
  return {filename:file.originalname.replace(/[\/\\\x00-\x1f]/g,'_').slice(0,200),mime,size:file.size,data:b};
}
async function loadOwned(req){
  if(!mongoose.isValidObjectId(req.params.id))fail('Invalid study material ID.');
  const note=await Note.findOne({_id:req.params.id,createdBy:req.user._id,material:true,archivedAt:null});
  if(!note)fail('Study material not found.',404);
  await resolveScope(req.user,{courseId:String(note.course),academicYear:note.academicYear,batch:note.batch||''});
  return note;
}
const list=asyncHandler(async(req,res)=>{const context=await resolveScope(req.user,req.query);res.json({notes:context.selected?(await Note.find(materialFilter(req.user,context.selected)).sort('-updatedAt').lean()).map(safeMaterial):[]});});
const create=asyncHandler(async(req,res)=>{
  const context=await resolveScope(req.user,req.body);if(!context.selected)fail('Select an assigned course and batch.');
  const file=attachment(req.file);if(!file)fail('Select a learning document to upload.');
  if(String(req.body.description||'').length>4000)fail('Description must not exceed 4,000 characters.');
  const title=String(req.body.title||'').trim();if(!title)fail('Document title is required.');
  const note=await Note.create({title,content:String(req.body.description||'').trim()||title,createdBy:req.user._id,course:context.selected.course._id,academicYear:context.selected.academicYear,batch:context.selected.batch,material:true,attachment:file});
  res.status(201).json({note:safeMaterial(note)});
});
const update=asyncHandler(async(req,res)=>{
  const note=await loadOwned(req),file=attachment(req.file);
  // Scope is immutable, so editing a document cannot move it to another class.
  for(const [key,stored] of [['courseId',note.course],['academicYear',note.academicYear],['batch',note.batch||'']])if(req.body[key]!==undefined&&String(req.body[key])!==String(stored))fail('A study material cannot be moved to another class.');
  if(String(req.body.description||'').length>4000)fail('Description must not exceed 4,000 characters.');
  note.title=String(req.body.title??note.title).trim();note.content=String(req.body.description??note.content).trim()||note.title;if(file)note.attachment=file;
  await note.save();res.json({note:safeMaterial(note)});
});
const remove=asyncHandler(async(req,res)=>{const note=await loadOwned(req);note.archivedAt=new Date();await note.save();res.json({message:'Study material removed from this course.'});});
const download=asyncHandler(async(req,res)=>{
  const note=await loadOwned(req);
  const stored=await Note.findById(note._id).select('+attachment.data');
  if(!stored.attachment?.data)fail('Document file not found.',404);
  sendFile(res,stored);
});
function sendFile(res,note){res.set('Content-Type',note.attachment.mime).set('Content-Disposition',`attachment; filename="${encodeURIComponent(note.attachment.filename)}"`).set('X-Content-Type-Options','nosniff').send(note.attachment.data);}
module.exports={upload,list,create,update,remove,download,sendFile};
