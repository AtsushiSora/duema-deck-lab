import {encodeBattleData,decodeBattleData} from './battle-insights.js?v=0.100.0';
export const APP_VERSION='0.112.0';
export const UPDATE_RESUME_KEY='duema-update-resume-v1';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const versionParts=v=>/^\d+\.\d+\.\d+$/.test(v||'')?v.split('.').map(Number):null;
export function newerVersion(candidate,current){const a=versionParts(candidate),b=versionParts(current);if(!a||!b)return false;for(let i=0;i<3;i++){if(a[i]!==b[i])return a[i]>b[i];}return false;}
export function createUpdateController({version=APP_VERSION,fetcher=globalThis.fetch,now=Date.now,onChange=()=>{}}={}){
 let state={available:null,checking:false,error:null,dismissed:null},lastCheck=-Infinity,inFlight=null;
 const snapshot=()=>({...state}),emit=()=>onChange(snapshot());
 return {snapshot,dismiss(){state.dismissed=state.available?.version||null;emit();},
  check({force=false}={}){
   if(inFlight)return inFlight;
   if(!force&&now()-lastCheck<60000)return Promise.resolve(snapshot());
   lastCheck=now();state.checking=true;state.error=null;if(force)state.dismissed=null;emit();
   inFlight=Promise.resolve().then(async()=>{try{const r=await fetcher('release.json?check='+lastCheck,{cache:'no-store',credentials:'same-origin'});if(!r.ok)throw Error('更新情報を取得できませんでした');const release=await r.json();if(!versionParts(release.version)||typeof release.engineVersion!=='string')throw Error('更新情報の形式を確認できませんでした');state.available=newerVersion(release.version,version)?{version:release.version,engineVersion:release.engineVersion}:null;
    }catch(e){state.error=String(e.message||e);}finally{state.checking=false;inFlight=null;emit();}return snapshot();});return inFlight;
  }
 };
}
export function updateNoticeHTML(state){
 const release=state?.available;if(!release||state.dismissed===release.version)return '';
 return `<div class="update-notice" role="status"><div><strong>新しいバージョンがあります</strong><span>v${esc(APP_VERSION)} → v${esc(release.version)}</span></div><button class="btn primary" data-action="apply-update">更新する</button><button class="btn ghost" data-action="dismiss-update">あとで</button></div>`;
}
export function saveUpdateResume(storage,value){
 const data={format:'duema-update-resume',formatVersion:1,savedAt:new Date().toISOString(),...value};
 const encoded=encodeBattleData(data);storage.setItem(UPDATE_RESUME_KEY,encoded);if(storage.getItem(UPDATE_RESUME_KEY)!==encoded)throw Error('更新前の保存を確認できませんでした');return data;
}
export function readUpdateResume(storage){const raw=storage.getItem(UPDATE_RESUME_KEY);if(!raw)return null;const data=decodeBattleData(raw);if(data.format!=='duema-update-resume'||data.formatVersion!==1||typeof data.engineVersion!=='string'||!['decks','manual','editor','battle','challenge','analysis','history','deck','account','replay','online'].includes(data.view))throw Error('更新前の保存データを確認できませんでした');return data;}
export function validateBattleResume(battle,engineVersion,legal){
 if(!battle)return;
 const s=battle.state;if(!s||s.version!==engineVersion||!Array.isArray(s.players)||s.players.length!==2||!Number.isSafeInteger(s.actions))throw Error('この対戦は現在のルール版で再開できません。保存データを書き出せます。');
 for(const p of s.players)for(const z of ['hand','deck','mana','battle','grave','shields'])if(!Array.isArray(p[z]))throw Error('対戦の保存データが不完全です');
 legal(s);
}
