const orderPlan=(a,b)=>(a.position||0)-(b.position||0)||String(a.createdAt||a._id).localeCompare(String(b.createdAt||b._id))||String(a._id).localeCompare(String(b._id));
const lessonProgress=lesson=>lesson.status==='completed'?100:Math.min(99,Math.max(0,Number(lesson.progress)||0));
function numberChapters(rows) {
  const counts=new Map();
  return [...rows].sort(orderPlan).map(row=>{const key=String(row.contract);const number=(counts.get(key)||0)+1;counts.set(key,number);return {...row,chapterNumber:number};});
}
async function moveItem(Model,filter,itemId,direction) {
  if(!['up','down'].includes(direction))throw Object.assign(new Error('Choose up or down.'),{statusCode:400});
  const rows=(await Model.find(filter).lean()).sort(orderPlan);
  const index=rows.findIndex(row=>String(row._id)===String(itemId));
  if(index<0)throw Object.assign(new Error('Item not found.'),{statusCode:404});
  const target=index+(direction==='up'?-1:1);
  if(target<0||target>=rows.length)return;
  [rows[index],rows[target]]=[rows[target],rows[index]];
  await Model.bulkWrite(rows.map((row,position)=>({updateOne:{filter:{_id:row._id,...filter},update:{$set:{position}}}})));
}
module.exports={orderPlan,lessonProgress,numberChapters,moveItem};
