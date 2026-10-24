// Account backups contain deck lists only. Local match history stays on this device.
export const ACCOUNT_SCHEMA=1,MAX_ACCOUNT_DECKS=1000,MAX_ACCOUNT_CHARS=200000,MAX_ACCOUNT_BYTES=700000;
const text=(s,max)=>typeof s==='string'?s.slice(0,max):'';
const validId=id=>typeof id==='string'&&/^[A-Za-z0-9:_-]{1,128}$/.test(id);
function cleanDeck(input,registry,category){
 if(!input||!validId(input.id)||typeof input.name!=='string'||!Array.isArray(input.cards)||input.cards.length>40)throw Error('保存デッキの形式が正しくありません');
 const errors=registry.validate(input);if(errors.length)throw Error(text(input.name,80)+'：'+errors[0]);
 const deck={id:input.id,name:text(input.name,120),format:input.format||'original',cards:registry.resolveRows(input.cards).map(r=>({id:r.id,count:r.count})),category};
 if(typeof input.favorite==='boolean')deck.favorite=input.favorite;
 for(const k of['created','updated'])if(typeof input[k]==='string'&&Number.isFinite(Date.parse(input[k])))deck[k]=input[k];
 for(const k of['description','templateId','sourceTitle'])if(typeof input[k]==='string')deck[k]=text(input[k],k==='description'?2000:200);
 if(typeof input.source==='string'){try{const url=new URL(input.source);if(url.protocol==='https:')deck.source=url.href.slice(0,1000);}catch{}}
 if(input.product&&Number.isSafeInteger(input.product.number)&&input.product.number>=1&&input.product.number<=25){deck.product={number:input.product.number};for(const k of['name','title','code','label'])if(typeof input.product[k]==='string')deck.product[k]=text(input.product[k],200);}
 return deck;
}
export function validateAccountSnapshot(value,registry){
 if(!value||value.schemaVersion!==ACCOUNT_SCHEMA||!Array.isArray(value.decks)||!Array.isArray(value.friends)||value.decks.length+value.friends.length>MAX_ACCOUNT_DECKS)throw Error('アカウント保存の形式が正しくありません');
 const decks=value.decks.map(d=>cleanDeck(d,registry,'自分')),friends=value.friends.map(d=>cleanDeck(d,registry,'相手'));
 for(const rows of[decks,friends])if(new Set(rows.map(d=>d.id)).size!==rows.length)throw Error('保存デッキのIDが重複しています');
 return {schemaVersion:ACCOUNT_SCHEMA,decks,friends,selected:decks.some(d=>d.id===value.selected)?value.selected:decks[0]?.id||null};
}
export function makeAccountSnapshot(saved,registry){return validateAccountSnapshot({schemaVersion:ACCOUNT_SCHEMA,decks:saved.decks,friends:saved.friends||[],selected:saved.selected},registry);}
export function encodeAccountSnapshot(value){const payload=JSON.stringify(value);if(payload.length>MAX_ACCOUNT_CHARS||new TextEncoder().encode(payload).length>MAX_ACCOUNT_BYTES)throw Error('保存するデッキが多すぎます。デッキを書き出して整理してください');return payload;}
export function decodeAccountSnapshot(payload,registry){if(typeof payload!=='string'||payload.length>MAX_ACCOUNT_CHARS||new TextEncoder().encode(payload).length>MAX_ACCOUNT_BYTES)throw Error('アカウント保存のサイズが正しくありません');let value;try{value=JSON.parse(payload);}catch{throw Error('アカウントの保存内容を読み取れません');}return validateAccountSnapshot(value,registry);}
const signature=d=>JSON.stringify([d.name,d.format||'original',[...d.cards].sort((a,b)=>a.id.localeCompare(b.id))]);
export function mergeAccountSnapshot(local,remote,registry,{newId=()=>crypto.randomUUID()}={}){
 const snapshot=validateAccountSnapshot(remote,registry),saved=structuredClone(local),used=new Set([...(saved.decks||[]),...(saved.friends||[])].map(d=>d.id)),report={decks:0,friends:0,duplicates:0,renamed:0};saved.decks??=[];saved.friends??=[];const selectedMap=new Map();
 for(const zone of['decks','friends'])for(const d of snapshot[zone]){
  const same=saved[zone].find(old=>{try{return signature(cleanDeck(old,registry,zone==='decks'?'自分':'相手'))===signature(d);}catch{return false;}});
  if(same){if(d.favorite===true)same.favorite=true;report.duplicates++;if(zone==='decks')selectedMap.set(d.id,same.id);continue;}
  const copy=structuredClone(d);if(used.has(copy.id)){let id;for(let i=0;i<20;i++){id=newId();if(validId(id)&&!used.has(id))break;id=null;}if(!id)throw Error('新しいデッキIDを作成できません');copy.id=id;report.renamed++;}used.add(copy.id);saved[zone].push(copy);report[zone]++;if(zone==='decks')selectedMap.set(d.id,copy.id);
 }
 if(!saved.decks.some(d=>d.id===saved.selected))saved.selected=selectedMap.get(snapshot.selected)||saved.decks[0]?.id||null;
 return {saved,report};
}
