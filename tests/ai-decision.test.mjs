import test from 'node:test';import assert from 'node:assert/strict';import {Worker} from 'node:worker_threads';
import {e,data,setup,give,PRESETS} from './target-fixture.mjs';
import {createAIDecision} from '../dist/ai-decision.js';
import {createAIPlayback,aiPlaybackHTML} from '../dist/ai-playback.js';
const tick=()=>new Promise(r=>setImmediate(r));
function fakeWorker(){return {messages:[],ended:0,postMessage(m){this.messages.push(m);},terminate(){this.ended++;}};}
function productionWorker(){
 const url=new URL('../dist/ai-decision-worker.js',import.meta.url).href,thread=new Worker(`const {parentPort}=require('node:worker_threads');globalThis.self=globalThis;globalThis.postMessage=m=>parentPort.postMessage(m);import(${JSON.stringify(url)}).then(()=>parentPort.on('message',data=>self.onmessage({data})));`,{eval:true});
 const adapter={postMessage:m=>thread.postMessage(m),terminate:()=>thread.terminate()};thread.on('message',data=>adapter.onmessage?.({data}));thread.on('error',error=>adapter.onerror?.(error));return adapter;
}
test('worker results return a choice without executing or mutating the live match; initialization is reused',async()=>{
 const w=fakeWorker(),s=e.createGame([PRESETS[0],PRESETS[0]],{first:1}),before=structuredClone(s),a=e.chooseAI(s),c=createAIDecision({cards:data.cards,createWorker:()=>w});
 const first=c.choose(s);assert.deepEqual(w.messages.map(x=>x.type),['init','choose']);assert.deepEqual(s,before);w.onmessage({data:{type:'choice',id:w.messages[1].id,action:a}});assert.deepEqual(await first,a);assert.deepEqual(s,before);
 const second=c.choose(s);assert.equal(w.messages.filter(x=>x.type==='init').length,1);w.onmessage({data:{type:'choice',id:w.messages.at(-1).id,action:a}});assert.deepEqual(await second,a);c.dispose();assert.equal(w.ended,1);
});
test('cancelled or replaced workers cannot deliver an old action or disable the new worker',async()=>{
 const workers=[],c=createAIDecision({cards:data.cards,createWorker:()=>{const w=fakeWorker();workers.push(w);return w;},fallback:()=>assert.fail('stale worker must not cause fallback')}),s=setup();
 const first=c.choose(s),w=workers[0],oldId=w.messages.at(-1).id;c.cancel();assert.equal(await first,null);assert.equal(w.ended,1);
 const second=c.choose(s),next=workers[1],a=e.chooseAI(s);w.onmessage({data:{type:'choice',id:oldId,action:a}});w.onerror(new Error('late error'));next.onmessage({data:{type:'choice',id:next.messages.at(-1).id,action:a}});assert.deepEqual(await second,a);c.dispose();assert.equal(await c.choose(s),null);
});
test('unavailable or failed workers use the established policy and do not repeatedly restart',async()=>{
 const s=setup(),a=e.chooseAI(s);let constructions=0,calls=0;
 const c=createAIDecision({cards:data.cards,createWorker:()=>{constructions++;throw Error('Worker unavailable');},fallback:state=>{calls++;assert.equal(state,s);return a;}});
 assert.deepEqual(await c.choose(s),a);assert.deepEqual(await c.choose(s),a);assert.equal(constructions,1);assert.equal(calls,2);c.dispose();
 const w=fakeWorker(),other=createAIDecision({cards:data.cards,createWorker:()=>w});const pending=other.choose(s);w.onmessage({data:{type:'error',id:w.messages.at(-1).id}});assert.deepEqual(await pending,a);assert.equal(w.ended,1);other.dispose();
});
function clock(){const s=e.createGame([PRESETS[0],PRESETS[0]],{first:1}),tasks=new Map(),requests=[];let seq=0,blocked=false,active=true,cancels=0;
 const p=createAIPlayback({getState:()=>s,choose:()=>new Promise((resolve,reject)=>requests.push({resolve,reject})),cancelChoose:()=>cancels++,isBlocked:()=>blocked,isActive:()=>active,timer:fn=>{tasks.set(++seq,fn);return seq;},cancelTimer:id=>tasks.delete(id)});
 return {s,p,tasks,requests,get cancels(){return cancels;},block:v=>blocked=v,active:v=>active=v,fire(){const row=tasks.entries().next().value;if(row){tasks.delete(row[0]);row[1]();}}};
}
test('asynchronous thinking keeps pause available, announces first and waits before executing one validated move',async()=>{
 const h=clock(),before=structuredClone(h.s);h.p.start();h.p.start();assert.equal(h.requests.length,1);assert.equal(h.p.snapshot().thinking,true);assert.deepEqual(h.s,before);assert.equal(h.tasks.size,0);
 const html=aiPlaybackHTML(h.p.snapshot());assert.match(html,/考えています/);assert.match(html,/manual-ai-pause/);assert.match(html,/manual-ai-next" disabled/);
 h.requests[0].resolve(e.chooseAI(h.s));await tick();assert.equal(h.p.snapshot().cue.stage,'before');assert.equal(h.s.actions,0);assert.equal(h.tasks.size,1);h.fire();assert.equal(h.s.actions,1);assert.equal(h.p.snapshot().cue.stage,'result');h.p.dispose();
});
test('pause, next, reset and disposal reject late choices without executing another move',async()=>{
 for(const stop of ['pause','reset','suspend','dispose']){const h=clock();h.p.start();const a=e.chooseAI(h.s);if(stop==='pause')h.p.togglePause();else h.p[stop]();assert.ok(h.cancels>0);h.requests[0].resolve(a);await tick();assert.equal(h.s.actions,0);assert.equal(h.tasks.size,0);h.p.dispose();}
 const h=clock();h.p.togglePause();h.p.next();h.p.next();assert.equal(h.requests.length,1);h.requests[0].resolve(e.chooseAI(h.s));await tick();assert.equal(h.s.actions,0);assert.equal(h.p.snapshot().paused,true);assert.equal(h.tasks.size,0);h.p.next();assert.equal(h.s.actions,1);h.p.dispose();
});
test('changed positions, human choices, dialogs and background state cannot consume a pending choice',async()=>{
 for(const mode of ['changed','dialog','background','human']){const h=clock();h.p.start();const a=e.chooseAI(h.s);if(mode==='changed')e.step(h.s,e.getLegalActions(h.s).find(x=>x.kind==='skipCharge'));if(mode==='dialog')h.block(true);if(mode==='background')h.active(false);if(mode==='human')h.s.decision={type:'block',player:0};
  const n=h.s.actions;h.requests[0].resolve(a);await tick();assert.equal(h.s.actions,n);assert.equal(h.tasks.size,0);h.p.dispose();}
});
test('worker failure pauses the clock for retry instead of stalling silently or executing a fallback move',async()=>{
 const h=clock();h.p.start();h.requests[0].reject(Error('engine error'));await tick();assert.equal(h.s.actions,0);assert.equal(h.p.snapshot().paused,true);assert.equal(h.p.snapshot().thinking,false);assert.match(h.p.snapshot().cue.text,/再開/);h.p.dispose();
});
test('production worker chooses the identical action while the main event loop remains responsive',async()=>{
 let created=0;const createWorker=()=>{created++;return productionWorker();};
 const s=setup();s.active=1;s.challenge={heroId:'kira',seat:1,signature:['dmrp04s-m02']};give(s,1,'mana',['dm01-075','dm01-075','dm01-075','dm01-075','dm01-083','dm01-083']);give(s,1,'hand',['dmr13-016','dmrp04s-m02','dm23rp4-011','dm24ex4-032']);const before=structuredClone(s),expected=e.analyzeAI(s);assert.ok(expected.nodes>0);
 let beats=0;const timer=setInterval(()=>beats++,2),c=createAIDecision({cards:data.cards,createWorker,fallback:()=>assert.fail('real worker must answer')});
 try{assert.deepEqual(await c.choose(s),expected.action);assert.ok(beats>0);assert.deepEqual(s,before);assert.equal(created,1);}finally{clearInterval(timer);c.dispose();}
});
test('a complete match through the production worker preserves seeded outcomes and all eighty identities',async()=>{
 const decks=[PRESETS[0],PRESETS[1]],options={seed:14742,first:1},s=e.createGame(decks,options),before=e.physicalCards(s).map(x=>x.uid).sort();let created=0;
 const c=createAIDecision({cards:data.cards,createWorker:()=>{created++;return productionWorker();},fallback:()=>assert.fail('production worker must not fall back')});
 try{while(s.winner===null&&s.actions<1600){const a=e.getLegalActions(s)[0]?.player===1?await c.choose(s):e.chooseAI(s);assert.ok(a);e.step(s,a);assert.deepEqual(e.physicalCards(s).map(x=>x.uid).sort(),before);}
  assert.notEqual(s.winner,null);assert.deepEqual(s,e.runGame(decks,options));assert.equal(created,1);
 }finally{c.dispose();}
});
