const assert=require('node:assert/strict');
const {state,validateAnswers,validateQuestions}=require('../services/evaluationRules');
const q=[{key:'a',title:'Required',type:'choice',options:['A','B'],required:true},{key:'b',title:'Scale',type:'scale',max:5},{key:'c',title:'Checkbox',type:'checkbox',options:['A','B']},{key:'d',title:'Date',type:'date'}];
validateQuestions([],true);assert.throws(()=>validateQuestions([]));validateQuestions(q);validateAnswers(q,{a:'A',b:5,c:['A'],d:'2026-11-01'});
for(const answers of [{},{a:'C'},{a:'A',b:6},{a:'A',b:2.5},{a:'A',c:['A','A']},{a:'A',d:'2026-02-30'},{a:'A',unknown:'x'}])assert.throws(()=>validateAnswers(q,answers));
validateAnswers(q,{},true);assert.throws(()=>validateQuestions([...q,q[0]]));
assert.equal(state({status:'published',deadline:'2026-01-01'},new Date('2026-01-02')),'expired');
assert.equal(state({status:'published',responseLimit:2,responseCount:2}),'closed');
assert.equal(state({status:'published',responseLimit:2,responseCount:1,deadline:'2099-01-01'}),'published');
assert.equal(state({status:'closed',deadline:'2099-01-01'}),'closed');
assert.equal(state({status:'draft',deadline:'2020-01-01'}),'draft');
console.log('Evaluation validation and closing rules passed');


const matrix=[{key:'grid',title:'Instructor',type:'grid',required:true,rows:['Clear','Helpful'],options:['Agree','Neutral']}];
validateQuestions(matrix);
validateAnswers(matrix,{grid:{Clear:'Agree',Helpful:'Neutral'}});
validateAnswers(matrix,{grid:{Clear:'Agree'}},true);
for(const answers of [{},{grid:{}},{grid:{Clear:'Agree'}},{grid:{Clear:'Bad',Helpful:'Neutral'}},{grid:{Unknown:'Agree'}},{grid:['Agree']}])assert.throws(()=>validateAnswers(matrix,answers));
assert.throws(()=>validateQuestions([{...matrix[0],rows:[]}]));
assert.throws(()=>validateQuestions([{...matrix[0],rows:['Clear','Clear']}]));
assert.throws(()=>validateQuestions([{...matrix[0],options:['Agree','Agree']}]));
validateAnswers([...matrix,{key:'new',title:'New field',type:'paragraph',required:true}],{grid:{Clear:'Agree',Helpful:'Neutral'}},true);
assert.throws(()=>validateAnswers([{...matrix[0],options:['Neutral']}],{grid:{Clear:'Agree'}},true));
console.log('Grid validation and compatible form edits passed');
