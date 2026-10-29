import {reportLogo} from './reportLogo.js';
const clean = value => String(value ?? '').replace(/[^\x20-\x7e]/g, ' ').replace(/\s+/g, ' ').trim();
const escape = value => clean(value).replace(/[\\()]/g, '\\$&');
const label = key => key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
const colors = {green:'0.13 0.45 0.23',gold:'0.85 0.65 0.18',ink:'0.16 0.24 0.19',muted:'0.38 0.46 0.41',line:'0.80 0.87 0.82',soft:'0.95 0.98 0.96',white:'1 1 1'};
// Standard PDF fonts keep exports self-contained and available offline.
export function buildReportPdf(rows, name, filters = {}, cards = {}, options = {}, generatedAt = new Date()) {
  const pages=[];let commands=[],y=0;
  const rect=(x,top,w,h,color)=>commands.push(colors[color]+' rg '+x+' '+(842-top-h)+' '+w+' '+h+' re f');
  const text=(value,x,top,size=10,bold=false,color='ink')=>commands.push('BT /'+(bold?'F2':'F1')+' '+size+' Tf '+colors[color]+' rg 1 0 0 1 '+x+' '+(842-top-size)+' Tm ('+escape(value)+') Tj ET');
  const wrap=(value,width,size)=>{
    const limit=Math.max(8,Math.floor(width/(size*0.55))),words=clean(value === '' || value == null ? '-' : value).split(' '),lines=[];let line='';
    for(let word of words){while(word.length>limit){if(line){lines.push(line);line='';}lines.push(word.slice(0,limit));word=word.slice(limit);}if((line+' '+word).trim().length>limit){lines.push(line);line=word;}else line=(line+' '+word).trim();}if(line)lines.push(line);return lines;
  };
  const newPage=()=>{if(commands.length)pages.push(commands);commands=[];rect(0,0,595,91,'green');rect(0,91,595,4,'gold');rect(34,14,64,64,'white');commands.push('q 58 0 0 58 37 767 cm /Logo Do Q');text('TELESOM ACADEMY',112,21,11,true,'white');text(name,112,43,18,true,'white');y=114;};
  const ensure=height=>{if(y+height>790)newPage();};
  newPage();
  const displayFilters=Object.entries(filters).filter(([,v])=>v).map(([key,value])=>[label(key),key==='teacher'?(options.teachers||[]).find(t=>String(t._id)===String(value))?.name||'Selected teacher':key==='course'?(options.courses||[]).find(c=>String(c._id)===String(value))?.name||'Selected course':value]);
  text('REPORT DETAILS',34,y,9,true,'green');y+=20;
  for(let i=0;i<displayFilters.length;i+=2){const pair=displayFilters.slice(i,i+2);const lines=pair.map(([,v])=>wrap(v,240,10));const height=22+Math.max(...lines.map(l=>l.length))*13;ensure(height+10);pair.forEach(([key],col)=>{const x=34+col*270;text(key.toUpperCase(),x,y,8,true,'muted');lines[col].forEach((line,index)=>text(line,x,y+14+index*13,10));});y+=height+8;}
  if(Object.keys(cards).length){y+=5;text('SUMMARY',34,y,9,true,'green');y+=20;const entries=Object.entries(cards);for(let i=0;i<entries.length;i+=3){ensure(66);entries.slice(i,i+3).forEach(([key,value],index)=>{const x=34+index*179;rect(x,y,169,55,'soft');rect(x,y,3,55,index===1?'gold':'green');text(value,x+12,y+7,19,true,'green');text(label(key),x+12,y+33,8,false,'muted');});y+=65;}}
  y+=8;ensure(30);text('REPORT RECORDS',34,y,10,true,'green');text(rows.length+' records',470,y,9,false,'muted');y+=24;
  if(!rows.length){text('No records match the selected filters.',34,y,11);y+=30;}
  rows.forEach((row,index)=>{
    const fields=Object.entries(row).filter(([key])=>!['courseKey','teacherKey','studentKey','_id'].includes(key));
    let recordHeight=43;
    for(let i=0;i<fields.length;i+=2)recordHeight+=25+Math.max(...fields.slice(i,i+2).map(([,value])=>wrap(value,236,10).length))*13;
    ensure(recordHeight<=676?recordHeight:70);rect(34,y,527,25,'green');text('RECORD '+String(index+1).padStart(2,'0'),44,y+7,9,true,'white');y+=25;
    for(let i=0;i<fields.length;i+=2){const pair=fields.slice(i,i+2),lines=pair.map(([,value])=>wrap(value,236,10)),height=25+Math.max(...lines.map(l=>l.length))*13;
      if(y+height>790){newPage();rect(34,y,527,25,'green');text('RECORD '+String(index+1).padStart(2,'0')+' (continued)',44,y+7,9,true,'white');y+=25;}
      rect(34,y,527,height,(i/2)%2===0?'soft':'white');pair.forEach(([key],col)=>{const x=44+col*264;text(label(key).toUpperCase(),x,y+7,8,true,'muted');lines[col].forEach((line,j)=>text(line,x,y+21+j*13,10));});rect(34,y+height-1,527,0.5,'line');y+=height;
    }y+=18;
  });
  pages.push(commands);
  const stamp=generatedAt.toLocaleDateString('en-GB',{timeZone:'Africa/Nairobi',day:'2-digit',month:'short',year:'numeric'});
  pages.forEach((page,index)=>{commands=page;rect(34,808,527,0.5,'line');text('Generated '+stamp+' | Telesom Academy',34,817,8,false,'muted');text('Page '+(index+1)+' of '+pages.length,487,817,8,false,'muted');});
  const objects=['<< /Type /Catalog /Pages 2 0 R >>','', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>', '<< /Type /XObject /Subtype /Image /Width '+reportLogo.width+' /Height '+reportLogo.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter [/ASCIIHexDecode /DCTDecode] /Length '+(reportLogo.hex.length+1)+' >>\nstream\n'+reportLogo.hex+'>\nendstream'],ids=[];
  pages.forEach(page=>{const id=objects.length+1;ids.push(id);const stream=page.join('\n');objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> /XObject << /Logo 5 0 R >> >> /Contents '+(id+1)+' 0 R >>');objects.push('<< /Length '+stream.length+' >>\nstream\n'+stream+'\nendstream');});
  objects[1]='<< /Type /Pages /Count '+pages.length+' /Kids ['+ids.map(id=>id+' 0 R').join(' ')+'] >>';let pdf='%PDF-1.4\n',offsets=[0];objects.forEach((object,index)=>{offsets.push(pdf.length);pdf+=(index+1)+' 0 obj\n'+object+'\nendobj\n';});const start=pdf.length;pdf+='xref\n0 '+offsets.length+'\n0000000000 65535 f \n'+offsets.slice(1).map(offset=>String(offset).padStart(10,'0')+' 00000 n \n').join('')+'trailer << /Size '+offsets.length+' /Root 1 0 R >>\nstartxref\n'+start+'\n%%EOF';return pdf;
}
