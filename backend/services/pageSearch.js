function textSearchFilter(query,fields){
  if(query==null||query==='')return {};
  if(typeof query!=='string'||query.length>200)throw Object.assign(new Error('Enter a search up to 200 characters.'),{statusCode:400});
  const terms=query.normalize('NFKC').trim().split(/\s+/).filter(Boolean);
  return terms.length?{$and:terms.map(term=>{
    const escaped=term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    return {$or:fields.map(field=>({[field]:{$regex:escaped,$options:'i'}}))};
  })}:{};
}
module.exports={textSearchFilter};
