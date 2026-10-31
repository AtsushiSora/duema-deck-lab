import{PLAY_TIME_SYNC_KEY,validPlayMs,validPlayDevice,playComponents,mergePlayComponents,sumPlayComponents}from'./play-time-data.js';
// Cloud totals never replace the local clock. Only unclaimed, persisted local
// increments are assigned to an account, so switching accounts cannot copy time.
export function createPlayTimeSync({storage=null,getLocal,syncAccount,onChange=()=>{},now=()=>Date.now(),newDevice=()=>globalThis.crypto.randomUUID(),withLock=fn=>globalThis.navigator?.locks?.request?globalThis.navigator.locks.request(PLAY_TIME_SYNC_KEY,fn):fn(),intervalMs=60000}={}){
 if(!storage)try{storage=globalThis.localStorage;}catch{}
 let uid=null,epoch=0,queue=Promise.resolve(),flight=null,lastAttempt=-Infinity,phase='local',storageOK=true,wasActive=false,disposed=false;
 function read(){const raw=storage.getItem(PLAY_TIME_SYNC_KEY);if(!raw)return{schemaVersion:1,deviceId:newDevice(),claimedMs:0,accounts:{}};const v=JSON.parse(raw);if(v?.schemaVersion!==1||!validPlayDevice(v.deviceId)||!validPlayMs(v.claimedMs)||!v.accounts||typeof v.accounts!=='object'||Array.isArray(v.accounts))throw Error('端末のプレイ時間を読み込めません');for(const[id,a]of Object.entries(v.accounts)){if(!id||id.length>128||!validPlayMs(a.ms))throw Error('端末のプレイ時間を読み込めません');playComponents(a.cloud);}return v;}
 let ledger;try{ledger=read();if(!validPlayDevice(ledger.deviceId))throw Error('device');storage.setItem(PLAY_TIME_SYNC_KEY,JSON.stringify(ledger));}catch{storageOK=false;ledger={schemaVersion:1,deviceId:null,claimedMs:0,accounts:{}};}
 const local=()=>getLocal()||{totalMs:0,committedMs:0,storageOK:false};
 function snapshot(){const v=local();if(!uid)return{...v,syncPhase:'local'};const a=ledger.accounts[uid]||{ms:0,cloud:{}},pending=Math.max(0,(v.totalMs||0)-ledger.claimedMs),parts={...a.cloud};if(ledger.deviceId)parts[ledger.deviceId]=Math.min(Number.MAX_SAFE_INTEGER,Math.max(parts[ledger.deviceId]||0,a.ms+pending));return{...v,totalMs:sumPlayComponents(parts),localTotalMs:v.totalMs,syncPhase:storageOK&&v.storageOK?phase:'storage-error',storageOK:storageOK&&v.storageOK};}
 const emit=()=>{if(!disposed)onChange(snapshot());};
 function serial(fn){const next=queue.then(()=>withLock(async()=>{const latest=read();const result=await fn(latest);storage.setItem(PLAY_TIME_SYNC_KEY,JSON.stringify(latest));ledger=latest;storageOK=true;return result;}));queue=next.catch(()=>{storageOK=false;emit();});return next;}
 function capture(v=local()){
  const who=uid,committed=v.committedMs,paused=wasActive&&!v.active;wasActive=!!v.active;
  if(who&&v.storageOK&&validPlayMs(committed)&&committed>ledger.claimedMs)void serial(l=>{const delta=Math.max(0,committed-l.claimedMs);if(delta){const a=l.accounts[who]??={ms:0,cloud:{}};a.ms=Math.min(Number.MAX_SAFE_INTEGER,a.ms+delta);l.claimedMs=committed;}}).then(emit,()=>{});
  emit();if(who&&(v.active||paused))void sync({force:paused});
 }
 async function sync({force=false}={}){
  if(disposed||!uid||!storageOK||!local().storageOK)return false;
  if(flight)return flight;if(!force&&now()-lastAttempt<intervalMs)return false;
  const who=uid,version=epoch;lastAttempt=now();phase='syncing';emit();
  const request=(async()=>{try{await queue;if(!storageOK||uid!==who||epoch!==version)return false;const a=ledger.accounts[who]||{ms:0,cloud:{}},deviceId=ledger.deviceId;const result=playComponents(await syncAccount(who,deviceId,a.ms));if(disposed||uid!==who||epoch!==version)return false;await serial(l=>{const latest=l.accounts[who]??={ms:0,cloud:{}};latest.cloud=mergePlayComponents(latest.cloud,result);latest.ms=Math.max(latest.ms,result[deviceId]||0);});if(uid===who&&epoch===version){phase='synced';emit();}return true;}catch{if(uid===who&&epoch===version){phase='offline';emit();}return false;}})();
  flight=request;try{return await request;}finally{if(flight===request)flight=null;if(!disposed&&uid&&epoch!==version)void sync({force:true});}
 }
 function setUser(next){next=next||null;if(next&&(typeof next!=='string'||next.length>128||['__proto__','constructor','prototype'].includes(next)))throw Error('アカウントの形式が正しくありません');if(next===uid)return;uid=next;epoch++;phase=uid?'syncing':'local';lastAttempt=-Infinity;capture();if(uid)void sync({force:true});}
 return{snapshot,capture,setUser,sync,async settled(){await queue;},destroy(){disposed=true;epoch++;uid=null;}};
}
