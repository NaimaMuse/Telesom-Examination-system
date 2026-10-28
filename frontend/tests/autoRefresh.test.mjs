import assert from 'node:assert/strict';
import { createRefreshLoop } from '../src/hooks/refreshLoop.js';

const flush = () => new Promise(resolve => setImmediate(resolve));
function environment() {
  const listeners = { window:new Map(), document:new Map() };
  const target = name => ({
    addEventListener(type, listener) { listeners[name].set(type, listener); },
    removeEventListener(type, listener) { if (listeners[name].get(type) === listener) listeners[name].delete(type); },
  });
  const timers = new Map();
  const env = { AbortController, window:target('window'), document:{...target('document'),hidden:false},
    setInterval(callback,delay) { assert.equal(delay,10000); const id=timers.size+1;timers.set(id,callback);return id; },
    clearInterval(id) {timers.delete(id);},
  };
  return { env, timers, listeners, tick:()=>[...timers.values()].forEach(callback=>callback()) };
}
{
  const fixture=environment();let calls=0,complete,context;
  const stop=createRefreshLoop(async ctx=>{calls++;context=ctx;await new Promise(resolve=>{complete=resolve;});}, {environment:fixture.env});
  assert.equal(calls,1);assert.equal(context.initial,true);
  fixture.tick();fixture.listeners.window.get('focus')();assert.equal(calls,1,'Pending requests must not overlap');
  complete();await flush();fixture.tick();assert.equal(calls,2);assert.equal(context.initial,false);
  complete();await flush();fixture.env.document.hidden=true;fixture.tick();assert.equal(calls,2,'Hidden views must not poll');
  fixture.env.document.hidden=false;fixture.listeners.document.get('visibilitychange')();assert.equal(calls,3);
  assert.equal(context.isCurrent(),true);stop();assert.equal(context.signal.aborted,true);assert.equal(context.isCurrent(),false,'Unmounted or paused forms reject stale responses');
  assert.equal(fixture.timers.size,0);assert.equal(fixture.listeners.window.size,0);assert.equal(fixture.listeners.document.size,0);
  complete();await flush();fixture.tick();assert.equal(calls,3);
}
{
  const fixture=environment();let calls=0,errors=0;
  const stop=createRefreshLoop(async()=>{calls++;if(calls===1)throw new Error('offline');},{environment:fixture.env,onError:()=>errors++});
  await flush();assert.equal(errors,1);fixture.tick();await flush();assert.equal(calls,2,'A failed request must retry');
  stop();
}
{
  const fixture=environment();let calls=0;
  const stop=createRefreshLoop(async()=>{calls++;},{environment:fixture.env,immediate:false});
  assert.equal(calls,0);fixture.listeners.window.get('focus')();await flush();assert.equal(calls,1);stop();
}
console.log('Auto-refresh tests passed: 10-second polling, focus/visibility refresh, no overlapping requests, abort/stale-response protection, cleanup and failure recovery.');
