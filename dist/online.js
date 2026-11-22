import {updateOnlineFeedback} from './online-feedback.js';
import {ONLINE_COMPATIBILITY} from './online-compatibility.js?v=0.722.4';
const needsUserAction=e=>['room/version','room/schema','room/integrity'].includes(e.code)
 ||[400,401,403,404,405,410,413,415].includes(e.status)
 ||/^auth\//.test(String(e.code||''))&&!['auth/network-request-failed','auth/internal-error'].includes(e.code);
export function createOnlineClient({getToken,fetcher=fetch,onChange=()=>{},interval=3000,liveInterval=15000,watchRoom=null,timeout=15000,timer=setTimeout,cancel=clearTimeout}={}){
 let identity=null,epoch=0,handle=null,controller=null,active=false,reading=false,verifiedRules=false,failures=0,live=null;
 const state={room:null,busy:false,connected:false,error:null,loaded:false,feedback:null,retry:null};
 const emit=()=>onChange(structuredClone(state));
 const later=()=>{cancel(handle);handle=null;if(active&&identity&&state.retry?.automatic!==false)handle=timer(()=>{void refresh({automatic:true});},state.retry?.delay??(live?.ready?Math.max(interval,liveInterval):interval));};
 function stopWatching(){const previous=live;live=null;previous?.stop?.();}
 function flushLive(){
  const scope=live;
  if(!scope?.pending||!active||reading||state.busy||state.retry)return;
  scope.pending=false;
  if(scope.revision>=(state.room?.revision??0)+1)void refresh({automatic:true});
 }
 function syncWatch(){
  const room=state.room;
  if(!active||!identity||typeof watchRoom!=='function'||!room||![0,1].includes(room.seat)||!['waiting','playing'].includes(room.phase)||state.retry?.automatic===false){stopWatching();return;}
  if(live?.uid===identity&&live.code===room.code)return;
  stopWatching();const scope={uid:identity,code:room.code,ready:false,pending:false,revision:room.revision,stop:null,failed:false};live=scope;
  const current=()=>live===scope&&active&&identity===scope.uid&&state.room?.code===scope.code;
  const failed=()=>{if(!current())return;scope.failed=true;scope.ready=false;scope.pending=false;scope.stop?.();scope.stop=null;later();};
  try{
   const stop=watchRoom(room.code,hint=>{
    if(!current()||scope.failed)return;
    if(hint?.fromCache){scope.ready=false;later();return;}
    if(!Number.isSafeInteger(hint?.revision)||hint.revision<0)return;
    scope.ready=true;scope.revision=Math.max(scope.revision,hint.revision);
    if(hint.revision>(state.room?.revision??-1)){scope.pending=true;queueMicrotask(flushLive);}
    later();
   },failed);
   if(typeof stop==='function'){if(current()&&!scope.failed)scope.stop=stop;else stop();}else if(current())live=null;
  }catch{failed();}
 }
 async function request(body,code){
  const ownController=new AbortController();controller=ownController;const limit=timer(()=>ownController.abort(),timeout);
  try{
   const token=await Promise.race([getToken(),new Promise((_,reject)=>ownController.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true}))]);
   const url='/api/duel'+(!body&&code?'?code='+encodeURIComponent(code):''),r=await fetcher(url,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'X-Duema-Rules':ONLINE_COMPATIBILITY.rulesHash,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify({schemaVersion:1,...body}):undefined,cache:'no-store',credentials:'omit',signal:ownController.signal});
   let data;try{data=await r.json();}catch{throw Object.assign(Error('対戦サーバーの応答を読み取れません。再接続してください。'),{status:r.status});}
   if(!r.ok)throw Object.assign(Error(data?.message||'対戦サーバーに接続できません。'),{code:data?.error,status:r.status});
   if(r.headers.get('x-duema-rules')!==ONLINE_COMPATIBILITY.rulesHash)throw Object.assign(Error('アプリと対戦サーバーの対応カードが異なります。更新してから再接続してください。'),{code:'room/version'});
   if(data.room&&data.room.engineVersion&&data.room.engineVersion!==ONLINE_COMPATIBILITY.engineVersion)throw Object.assign(Error('対戦処理が異なります。アプリを更新してください。'),{code:'room/version'});
   if(data.room&&data.room.schemaVersion!==1)throw Object.assign(Error('アプリを再読込してください。'),{code:'room/schema'});
   return data.room;
  }finally{cancel(limit);if(controller===ownController)controller=null;}
 }
 async function run(body,code){
  if(!identity||state.busy)return null;
  if(reading){if(!body)return null;epoch++;controller?.abort();reading=false;cancel(handle);}
  const generation=epoch,foreground=!!body||!state.loaded;let changed=false;reading=true;
  if(foreground){state.busy=true;state.error=null;emit();}
  try{
   const room=await request(body,code);if(generation!==epoch)return null;
   verifiedRules=true;failures=0;changed=JSON.stringify(room)!==JSON.stringify(state.room)||!state.connected||!!state.error;
   state.feedback=updateOnlineFeedback(state.room,room,state.feedback);state.room=room;state.connected=true;state.loaded=true;state.error=null;state.retry=null;return room;
  }catch(e){
   if(generation===epoch){
    failures=Math.min(failures+1,10);
    const error=e.name==='AbortError'?'通信の完了を確認できません。「再接続」で盤面を確認してください。':e.message||'通信が切れました。再接続してください。';
    const retry={automatic:!needsUserAction(e),delay:Math.min(interval*2**failures,Math.max(interval,60000))};
    changed=state.connected||state.error!==error||JSON.stringify(state.retry)!==JSON.stringify(retry);
    state.error=error;state.retry=retry;state.connected=false;verifiedRules=false;
   }
   return null;
  }finally{if(generation===epoch){reading=false;state.busy=false;if(foreground||changed)emit();syncWatch();later();flushLive();}}
 }
 // Automatic retries only reconcile with GET. Uncertain game moves are never replayed.
 async function refresh({automatic=false}={}){if(!automatic&&live?.failed)stopWatching();if(automatic&&state.retry?.automatic===false)return null;return run(null,state.room?.code);}
 function reset(){failures=0;Object.assign(state,{room:null,busy:false,connected:false,error:null,loaded:false,feedback:null,retry:null});}
 function setIdentity(uid){if(uid===identity)return;stopWatching();epoch++;identity=uid||null;verifiedRules=false;controller?.abort();cancel(handle);reading=false;reset();emit();if(identity&&active)void refresh({automatic:true});}
 function setActive(value){if(active===value)return;active=value;if(!active)stopWatching();else syncWatch();cancel(handle);if(active&&identity&&!state.busy)void refresh({automatic:true});}
 const mutation=async(op,body={})=>{const generation=epoch,who=identity;if(!who)return null;if(!verifiedRules){await refresh();if(generation!==epoch||who!==identity||!state.connected)return null;}return run({op,requestId:crypto.randomUUID(),...body});};
 return{setIdentity,setActive,refresh,reviewFeedback(delta){const f=state.feedback;if(!f||![-1,1].includes(delta))return;const next=Math.max(0,Math.min(f.items.length-1,f.index+delta));if(next!==f.index){f.index=next;emit();}},getState:()=>structuredClone(state),create:deck=>mutation('create',{deck}),join:(code,deck)=>mutation('join',{code,deck}),move:(actionId,number)=>mutation('move',{code:state.room?.code,revision:state.room?.revision,actionId,...(number!==undefined?{number}:{})}),resign:()=>mutation('resign',{code:state.room?.code,revision:state.room?.revision}),cancel:()=>mutation('cancel',{code:state.room?.code,revision:state.room?.revision}),clear(){stopWatching();epoch++;controller?.abort();cancel(handle);reading=false;verifiedRules=false;reset();emit();},dispose(){stopWatching();epoch++;identity=null;active=false;controller?.abort();cancel(handle);}};
}
