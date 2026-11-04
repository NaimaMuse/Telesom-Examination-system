const fail=(message,statusCode=400)=>{throw Object.assign(new Error(message),{statusCode});};
function state(f,now=new Date()) {return f.status==='published' && f.deadline && new Date(f.deadline)<=now?'expired':f.status==='published' && f.responseLimit && f.responseCount>=f.responseLimit?'closed':f.status;}
function validateQuestions(questions,allowEmpty=false) {
 if(!Array.isArray(questions)||(!questions.length&&!allowEmpty)||questions.length>100) fail('Add between 1 and 100 questions');
 if(!allowEmpty&&!questions.some(q=>q.type!=='section'))fail('Add at least one answerable question');
 const keys=new Set();
 for(const q of questions){if(typeof q.key!=='string'||!(/^[a-zA-Z0-9_-]{1,100}$/).test(q.key)||['__proto__','constructor','prototype'].includes(q.key)||keys.has(q.key))fail('Question keys must be unique');keys.add(q.key);if(q.type==='grid'&&(!Array.isArray(q.rows)||!q.rows.length||q.rows.length>50||q.rows.some(r=>typeof r!=='string'||!r.trim()||['__proto__','constructor','prototype'].includes(r)||r.length>500)||new Set(q.rows).size!==q.rows.length))fail('Provide unique nonempty grid rows (maximum 50)');if(['choice','checkbox','dropdown','grid'].includes(q.type)&&(!q.options?.length||q.options.some(o=>typeof o!=='string'||!o.trim())||new Set(q.options).size!==q.options.length))fail('Provide unique nonempty options');}
}
function validateAnswers(questions,answers,partial=false) {
 if(!answers||typeof answers!=='object'||Array.isArray(answers))fail('Answers must be an object');
 if(Object.keys(answers).some(k=>!questions.some(q=>q.key===k&&q.type!=='section')))fail('Unknown question');
 for(const q of questions){if(q.type==='section')continue;const a=answers[q.key];const empty=a===undefined||a===null||a===''||(Array.isArray(a)&&!a.length);if(empty){if(q.required&&!partial)fail(`Answer required: ${q.title}`);continue;}
 if(q.type==='grid'){if(typeof a!=='object'||Array.isArray(a)||Object.keys(a).some(r=>!q.rows.includes(r))||Object.values(a).some(v=>!q.options.includes(v)))fail('Invalid grid answer');if(q.required&&!partial&&q.rows.some(r=>!a[r]))fail(`Answer every row: ${q.title}`);}
 else if(q.type==='checkbox'){if(!Array.isArray(a)||new Set(a).size!==a.length||a.some(v=>!q.options.includes(v)))fail('Invalid checkbox answer');}
 else if(['scale','rating'].includes(q.type)){if(!Number.isInteger(a)||a<1||a>(q.max||5))fail('Invalid scale or rating');}
 else {if(typeof a!=='string'||a.length>10000)fail('Invalid text answer');if(['choice','dropdown'].includes(q.type)&&!q.options.includes(a))fail('Invalid option');if(q.type==='yesno'&&!['Yes','No'].includes(a))fail('Invalid Yes/No answer');if(q.type==='date'&&(!/^\d{4}-\d{2}-\d{2}$/.test(a)||!Number.isFinite(Date.parse(a))||new Date(a).toISOString().slice(0,10)!==a))fail('Invalid date');}
 }
 return answers;
}
module.exports={fail,state,validateQuestions,validateAnswers};



