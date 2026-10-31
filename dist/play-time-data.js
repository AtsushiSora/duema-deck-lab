// Per-browser monotonic components make transaction retries idempotent.
export const PLAY_TIME_SYNC_KEY='duema-deck-lab-playtime-sync-v1';
export const validPlayMs=n=>Number.isSafeInteger(n)&&n>=0;
export const validPlayDevice=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{16,80}$/.test(id);
export function playComponents(value={}){if(!value||typeof value!=='object'||Array.isArray(value))throw Error('プレイ時間の保存形式が正しくありません');const out={};for(const[id,n]of Object.entries(value)){if(!validPlayDevice(id)||!validPlayMs(n))throw Error('プレイ時間の保存形式が正しくありません');out[id]=n;}return out;}
export function mergePlayComponents(a,b){const out=playComponents(a);for(const[id,n]of Object.entries(playComponents(b)))out[id]=Math.max(out[id]||0,n);return out;}
export const sumPlayComponents=value=>Object.values(playComponents(value)).reduce((n,v)=>Math.min(Number.MAX_SAFE_INTEGER,n+v),0);
export function accountEnvelope(payload){const v=JSON.parse(payload);if(!v||typeof v!=='object'||Array.isArray(v))throw Error('アカウントの保存形式が正しくありません');if(v._playTime!==undefined){if(v._playTime?.schemaVersion!==1||!Object.hasOwn(v._playTime,'devices')||!validPlayMs(v._deckRevision))throw Error('プレイ時間の保存形式が正しくありません');playComponents(v._playTime.devices);}return v;}
export const accountDeckRevision=(data,envelope)=>envelope._playTime===undefined?data.revision:envelope._deckRevision;
