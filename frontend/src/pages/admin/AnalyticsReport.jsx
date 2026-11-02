import {useState} from 'react';

// Vector PDF export: searchable text, repeated headers and automatic page breaks.
export function buildAnalyticsPdf({courses,monthly=[],distribution=[],filters,stats,generatedAt}) {
  const green=[.12,.45,.22],gold=[.84,.60,.18],ink=[.16,.29,.20],muted=[.42,.51,.45];
  const pages=[];let commands=[],y=0;
  const safe=value=>String(value??'—').replace(/[^\x20-\x7e]/g,'-').replace(/[\\()]/g,'\\$&');
  const rect=(x,top,w,h,color)=>commands.push(`${color.join(' ')} rg ${x} ${842-top-h} ${w} ${h} re f`);
  const text=(value,x,top,size=10,color=ink,bold=false)=>commands.push(`BT /${bold?'F2':'F1'} ${size} Tf ${color.join(' ')} rg ${x} ${842-top-size} Td (${safe(value)}) Tj ET`);
  const wrap=(value,max)=>{const words=String(value??'-').replace(/[^\x20-\x7e]/g,'-').split(/\s+/);const lines=[''];for(let word of words){while(word.length>max){if(lines.at(-1))lines.push('');lines[lines.length-1]=word.slice(0,max);word=word.slice(max);lines.push('');}if((lines.at(-1)+' '+word).trim().length>max)lines.push(word);else lines[lines.length-1]=(lines.at(-1)+' '+word).trim();}return lines;};
  const page=()=>{if(commands.length)pages.push(commands.join('\n'));commands=[];rect(0,0,595,90,green);rect(0,90,595,3,gold);text('TELESOM ACADEMY',32,22,10,[1,1,1],true);text('Academic Analytics Report',32,42,21,[1,1,1],true);text('Generated: '+generatedAt,32,71,8,[.86,.94,.87]);y=111;};
  const ensure=height=>{if(y+height>790)page();};
  const heading=label=>{ensure(42);text(label,32,y,13,green,true);y+=24;};
  const paragraph=value=>{for(const line of wrap(value,100)){ensure(15);text(line,32,y,9,muted);y+=14;}y+=4;};
  const table=(headers,rows,widths)=>{
    const header=()=>{rect(32,y,531,25,green);let x=40;headers.forEach((h,i)=>{text(h,x,y+8,8,[1,1,1],true);x+=widths[i];});y+=25;};
    ensure(55);header();
    if(!rows.length)rows=[['No records for this selection.',...headers.slice(1).map(()=> '')]];
    rows.forEach((row,index)=>{const cells=row.map((v,i)=>wrap(v,Math.max(3,Math.floor((widths[i]-15)/4.5))));const height=Math.max(29,Math.max(...cells.map(c=>c.length))*12+14);if(y+height>790){page();header();}rect(32,y,531,height,index%2?[1,1,1]:[.95,.98,.96]);let x=40;cells.forEach((lines,i)=>{lines.forEach((line,j)=>text(line,x,y+7+j*12,8,ink,i===0));x+=widths[i];});y+=height;});y+=20;
  };
  page();heading('Report scope');filters.forEach(([label,value])=>paragraph(label+': '+value));paragraph('Attendance dates apply only to attendance. Marks include all saved results in the selected course, teacher and batch. Search applies to course rows and the overview indicators.');
  heading('Overview');table(['Indicator','Value'],stats.map(([label,value])=>[label,value]),[440,91]);
  heading('Course performance');table(['Course','Enrolled','Marked','Avg /100','Final','Passed','Attend.'],courses.map(c=>[c.title+' ('+c.courseCode+')',c.enrolled,c.recorded,c.average??'-',c.finalized,c.passed,c.attendanceRate==null?'-':c.attendanceRate+'%']),[198,53,53,64,45,50,68]);
  heading('Attendance by month');table(['Month','Present','Absent','Late','Excused','Rate'],monthly.map(m=>[m.month,m.present,m.absent,m.late,m.excused,m.rate==null?'-':m.rate+'%']),[146,77,77,77,77,77]);
  heading('Final course grades');table(['Grade','Final results'],distribution.map(g=>[g.grade,g.count]),[440,91]);paragraph('Averages use records with marks. Grade distribution uses finalized course results. A dash means no available data.');pages.push(commands.join('\n'));
  const objects=['','', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'],ids=[];
  pages.forEach((stream,i)=>{const id=objects.length+1;ids.push(id);objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${id+1} 0 R >>`);const footer=`\nBT /F1 8 Tf .42 .51 .45 rg 32 25 Td (Telesom Academy | Page ${i+1} of ${pages.length}) Tj ET`;const content=stream+footer;objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);});objects[0]='<< /Type /Catalog /Pages 2 0 R >>';objects[1]=`<< /Type /Pages /Count ${ids.length} /Kids [${ids.map(id=>id+' 0 R').join(' ')}] >>`;let pdf='%PDF-1.4\n',offsets=[0];objects.forEach((o,i)=>{offsets.push(pdf.length);pdf+=`${i+1} 0 obj\n${o}\nendobj\n`;});const start=pdf.length;pdf+=`xref\n0 ${offsets.length}\n0000000000 65535 f \n`+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer << /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;return new Blob([pdf],{type:'application/pdf'});
}
export default function AnalyticsReport({data,courses,stats,filters,loading,buttonOnly=false}) {
  const [error,setError]=useState('');
  const download=()=>{try{setError('');const blob=buildAnalyticsPdf({...data,courses,stats,filters,generatedAt:new Date().toLocaleString('en-GB',{timeZone:'Africa/Nairobi'})+' EAT'});const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='Telesom-Academic-Analytics-'+new Date().toISOString().slice(0,10)+'.pdf';link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}catch{setError('PDF could not be generated. Please retry.');}};
  if(buttonOnly)return <><button className="marks-export analytics-pdf-button" disabled={loading||!data} onClick={download}>↓ Download PDF</button>{error&&<span role="alert">{error}</span>}</>;
  return <section className="analytics-report"><div className="analytics-report-icon" aria-hidden="true">▤</div><div><span>TELESOM ACADEMY</span><h2>Academic report</h2><p>Course performance, attendance trends and final grades in one PDF.</p><small>Uses your selected filters · {courses.length} courses · Nairobi time</small></div><button className="btn btn-primary" disabled={loading||!data} onClick={download}>↓ Download PDF</button>{error&&<p role="alert">{error}</p>}</section>;
}
