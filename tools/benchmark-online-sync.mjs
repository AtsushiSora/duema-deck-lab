import assert from 'node:assert/strict';
import {createOnlineClient} from '../dist/online.js';
import {ONLINE_COMPATIBILITY} from '../dist/online-compatibility.js';
const settle=()=>new Promise(resolve=>setImmediate(resolve));
async function measure(live,update){
 let now=0,id=0,reads=0,notify=null,deliveredAt=null;const tasks=new Map();let room={schemaVersion:1,code:'AAAAAAAAAAAAAAAA',phase:'playing',seat:0,revision:0};
 const client=createOnlineClient({getToken:async()=> 'synthetic-token',timer:(fn,delay)=>{tasks.set(++id,{fn,at:now+delay});return id;},cancel:id=>tasks.delete(id),watchRoom:live?(_,next)=>{notify=next;queueMicrotask(()=>next({revision:room.revision,fromCache:false}));return()=>{notify=null;};}:null,fetcher:async()=>{reads++;return Response.json({room},{headers:{'X-Duema-Rules':ONLINE_COMPATIBILITY.rulesHash}});},onChange:state=>{if(update&&state.room?.revision===1&&deliveredAt===null)deliveredAt=now;}});
 async function advanceTo(target){for(;;){const row=[...tasks].sort((a,b)=>a[1].at-b[1].at).find(([,task])=>task.at<=target);if(!row)break;const [key,task]=row;tasks.delete(key);now=task.at;task.fn();await settle();}now=target;await settle();}
 client.setIdentity('synthetic-user');client.setActive(true);await settle();
 if(update){await advanceTo(100);room={...room,revision:1};notify?.({revision:1,fromCache:false});await settle();await advanceTo(3000);}else await advanceTo(60000);
 client.dispose();assert.equal(tasks.size,0);return update?{fixedSchedulerWaitMs:deliveredAt-100}:{idleGetsIn60Seconds:reads};
}
const before={...(await measure(false,true)),...(await measure(false,false))},after={...(await measure(true,true)),...(await measure(true,false))};
assert.equal(before.fixedSchedulerWaitMs,2900);assert.equal(after.fixedSchedulerWaitMs,0);assert.equal(before.idleGetsIn60Seconds,21);assert.equal(after.idleGetsIn60Seconds,5);
console.log(JSON.stringify({measurement:'Deterministic scheduler simulation. Excludes real notification transport, token acquisition, server and network latency. Idle request counts include initial load.',before,after},null,2));
