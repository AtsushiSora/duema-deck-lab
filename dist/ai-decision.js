import {chooseAI} from './engine.js';

// One local worker per active manual match. Only the chosen action returns;
// the worker never executes a move on the live game or sends data externally.
export function createAIDecision({cards,createWorker=()=>new Worker(new URL('./ai-decision-worker.js?v=0.229.2',import.meta.url),{type:'module'}),fallback=chooseAI}={}){
 let worker=null,pending=null,serial=0,disabled=false,disposed=false;
 const stop=()=>{worker?.terminate();worker=null;};
 const cancel=()=>{const old=pending;pending=null;serial++;stop();old?.resolve(null);};
 const fail=()=>{
  disabled=true;const old=pending;pending=null;stop();
  if(old){try{old.resolve(fallback(old.state));}catch(e){old.reject(e);}}
 };
 function choose(state){
  if(disposed)return Promise.resolve(null);
  if(disabled)return Promise.resolve().then(()=>fallback(state));
  // The playback clock serializes requests; a replaced one cannot deliver a
  // stale action after reset, undo, a dialog, a pause or a different match.
  if(pending)cancel();
  return new Promise((resolve,reject)=>{
   const id=++serial;pending={id,state,resolve,reject};
   try{
    if(!worker){worker=createWorker();const current=worker;worker.onmessage=({data})=>{
     if(worker!==current||!pending||data?.id!==pending.id)return;
     if(data.type==='error'){fail();return;}
     if(data.type!=='choice')return;
     const old=pending;pending=null;old.resolve(data.action);
    };worker.onerror=()=>{if(worker===current)fail();};worker.onmessageerror=worker.onerror;worker.postMessage({type:'init',cards});}
    worker.postMessage({type:'choose',id,state});
   }catch{fail();}
  });
 }
 return {choose,cancel,dispose(){disposed=true;cancel();}};
}
