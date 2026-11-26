const orderPlan=(a,b)=>(a.position||0)-(b.position||0)||String(a.createdAt||a._id).localeCompare(String(b.createdAt||b._id))||String(a._id).localeCompare(String(b._id));
const lessonProgress=lesson=>lesson.status==='completed'?100:Math.min(99,Math.max(0,Number(lesson.progress)||0));
function numberChapters(rows) {
  const reserved = new Map();
  for (const row of rows) {
    if (!row.chapterNumber) continue;
    const key = String(row.contract);
    if (!reserved.has(key)) reserved.set(key, new Set());
    reserved.get(key).add(row.chapterNumber);
  }
  const nextByContract = new Map();
  return [...rows].sort(orderPlan).map(row => {
    if (row.chapterNumber) return row;
    const key = String(row.contract);
    let number = nextByContract.get(key) || 1;
    while (reserved.get(key)?.has(number)) number++;
    nextByContract.set(key, number + 1);
    return {...row, chapterNumber: number};
  });
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
function numberLessons(rows) {
  const children = new Map();
  for (const row of rows) {
    if (!row.parentLesson) continue;
    const key = String(row.parentLesson);
    if (!children.has(key)) children.set(key, []);
    children.get(key).push(row);
  }
  return rows.filter(row => !row.parentLesson).flatMap((row, index) => {
    const lessonNumber = index + 1;
    return [{...row, lessonNumber}, ...(children.get(String(row._id)) || [])
      .map((child, childIndex) => ({...child, lessonNumber: `${lessonNumber}.${childIndex + 1}`}))];
  });
}
module.exports={orderPlan,lessonProgress,numberChapters,numberLessons,moveItem};
