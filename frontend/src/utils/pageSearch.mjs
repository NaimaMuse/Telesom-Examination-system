const normalize=value=>String(value??'').normalize('NFKC').toLocaleLowerCase().trim();

function searchableValues(value){
  if(Array.isArray(value))return value.flatMap(searchableValues);
  if(value&&typeof value==='object')return Object.values(value).flatMap(searchableValues);
  return value==null?[]:[normalize(value)];
}

export function matchesPageSearch(query,...values){
  const terms=normalize(query).split(/\s+/).filter(Boolean);
  const text=searchableValues(values).join(' ');
  return terms.every(term=>text.includes(term));
}
