import api from './api';

export async function getAllPages(url,options={}){
  const params={...options.params,page:1,limit:100};
  const response=await api.get(url,{...options,params});
  const rows=[...(response.data.data||[])];
  const pages=response.data.pagination?.pages||1;
  for(let page=2;page<=pages;page++){
    const next=await api.get(url,{...options,params:{...params,page}});
    rows.push(...(next.data.data||[]));
  }
  return {...response,data:{...response.data,data:rows}};
}
