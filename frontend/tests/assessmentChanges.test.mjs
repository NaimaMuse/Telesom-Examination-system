import assert from 'node:assert/strict';
import {publishAssessmentChange} from '../src/services/assessmentChanges.mjs';
const events=[],writes=[];
const env={Event,window:{dispatchEvent:event=>events.push(event.type)},localStorage:{setItem:(key,value)=>writes.push([key,value])}};
for(const [method,url] of [['post','/exams'],['put','/exams/1'],['delete','/teacher/exams/1'],['patch','/quizzes/2']]) {
 const response={status:200,config:{method,url},data:{private:'not shared'}};
 assert.equal(publishAssessmentChange(response,env),response);
}
assert.equal(events.length,4);assert(events.every(event=>event==='assessments:changed'));
assert(writes.every(([key,value])=>key==='assessments:last-change'&&!value.includes('not shared')));
for(const config of [{method:'get',url:'/exams'},{method:'post',url:'/teacher/profile'}])publishAssessmentChange({status:200,config},env);
publishAssessmentChange({status:400,config:{method:'post',url:'/exams'}},env);
assert.equal(events.length,4,'Reads, unrelated changes and failed writes must not trigger refresh loops');
publishAssessmentChange({status:200,config:{method:'post',url:'/exams'}},{...env,localStorage:{setItem(){throw Error('unavailable');}}});
assert.equal(events.length,5,'Same-tab updates work even when cross-tab storage is unavailable');
console.log('Live assessment notifications passed: successful writes, both quiz/exam endpoints, no read loops, privacy and storage fallback.');
