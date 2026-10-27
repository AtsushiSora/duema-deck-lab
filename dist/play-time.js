// Keep time separate from deck data so periodic saves cannot overwrite deck edits.
export const PLAY_TIME_KEY='duema-deck-lab-playtime-v1';
const SAVE_INTERVAL=10000,MAX_SAMPLE_GAP=30000;
const validTime=n=>Number.isFinite(n)&&n>=0?Math.min(Math.floor(n),Number.MAX_SAFE_INTEGER):0;
export function formatPlayTime(ms){const seconds=Math.floor(validTime(ms)/1000),hours=Math.floor(seconds/3600),minutes=Math.floor(seconds/60)%60;return hours.toLocaleString('ja-JP')+'時間'+String(minutes).padStart(2,'0')+'分'+String(seconds%60).padStart(2,'0')+'秒';}
export const playTimeStorageNote=storageOK=>storageOK===false?'保存できないため、再読み込みすると今回の時間を失うことがあります。':'このブラウザに自動保存。記録開始前の時間は含みません。';
export function createPlayTimeCounter({storage,now=()=>performance.now(),onChange=()=>{}}={}){
 function read(){try{if(!storage)throw Error('unavailable');const raw=JSON.parse(storage.getItem(PLAY_TIME_KEY)||'null');return{total:raw?.schemaVersion===1?validTime(raw.totalMs):0,available:true};}catch{return{total:0,available:false};}}
 const initial=read();let committed=initial.total,pending=0,anchor=null,lastSave=now(),available=initial.available;
 const snapshot=()=>({totalMs:Math.min(Number.MAX_SAFE_INTEGER,Math.floor(committed+pending)),active:anchor!==null,storageOK:available});
 const notify=()=>onChange(snapshot());
 function save(at){if(!pending)return;const latest=read();committed=Math.max(committed,latest.total);const total=validTime(committed+pending);try{if(!storage)throw Error('unavailable');storage.setItem(PLAY_TIME_KEY,JSON.stringify({schemaVersion:1,totalMs:total}));committed=total;pending=0;available=true;}catch{available=false;}lastSave=at;}
 function update(active,{flush=false}={}){const at=now(),wasActive=anchor!==null;if(wasActive){const elapsed=at-anchor;
  // Long suspended intervals are not evidence of active use (e.g. device sleep).
  if(elapsed>0&&elapsed<=MAX_SAMPLE_GAP)pending+=elapsed;
 }anchor=active?at:null;if(flush||wasActive!==active||at-lastSave>=SAVE_INTERVAL)save(at);notify();return snapshot();}
 return{snapshot,update,flush(){return update(anchor!==null,{flush:true});},refresh(){const latest=read();committed=Math.max(committed,latest.total);available=latest.available&&(available||pending===0);notify();return snapshot();}};
}
export function createPlayTimeTracker({window:win=globalThis.window,document:doc=globalThis.document,storage,now,onChange}={}){
 if(!storage)try{storage=win.localStorage;}catch{}
 const counter=createPlayTimeCounter({storage,now,onChange}),active=()=>!doc.hidden&&doc.hasFocus();let stopped=false;
 const sync=()=>{if(!stopped)counter.update(active());},pause=()=>{if(!stopped)counter.update(false,{flush:true});};
 const storageChanged=e=>{if(!stopped&&(e.key===PLAY_TIME_KEY||e.key===null))counter.refresh();};
 const listeners=[[doc,'visibilitychange',sync],[win,'focus',sync],[win,'blur',pause],[win,'pagehide',pause],[win,'pageshow',sync],[doc,'freeze',pause],[doc,'resume',sync],[win,'storage',storageChanged]];
 for(const[target,event,handler]of listeners)target.addEventListener(event,handler);
 const timer=win.setInterval(sync,1000);sync();
 return{snapshot:counter.snapshot,flush:counter.flush,destroy(){if(stopped)return;pause();stopped=true;win.clearInterval(timer);for(const[target,event,handler]of listeners)target.removeEventListener(event,handler);}};
}
