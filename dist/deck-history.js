// Content snapshots stay local and never include previous snapshots or game data.
export const DECK_HISTORY_LIMIT=10,DECK_HISTORY_TOTAL=100;
const fields=['name','cards','format','extraCards','description','historicalId','tournament','templateId','sourceTitle','source','product'];
const roleKey=(role,id)=>{if(!['mine','opponent'].includes(role)||typeof id!=='string'||!id)throw Error('デッキを確認してください');return role+':'+id;};
const zone=role=>role==='opponent'?'friends':'decks';
const timestamp=(value,fallback)=>typeof value==='string'&&Number.isFinite(Date.parse(value))?value:fallback;
export function deckContentSnapshot(deck){const value={};for(const k of fields)if(Object.hasOwn(deck,k))value[k]=structuredClone(deck[k]);return value;}
const signature=deck=>{const value=deckContentSnapshot(deck);value.cards=[...(value.cards||[])].map(r=>({id:r.id,count:r.count})).sort((a,b)=>a.id.localeCompare(b.id));if(value.extraCards)value.extraCards.sort((a,b)=>a.id.localeCompare(b.id));return JSON.stringify(fields.map(k=>value[k]??null));};
export function deckRevisions(saved,role,id){const rows=saved.deckRevisions?.[roleKey(role,id)];return Array.isArray(rows)?rows.filter(r=>r&&typeof r.id==='string'&&r.deck&&typeof r.deck.name==='string'&&Array.isArray(r.deck.cards)).slice(0,DECK_HISTORY_LIMIT):[];}
export function deckCardChanges(current,previous){
 const sum=rows=>{const counts=new Map();for(const r of rows||[])counts.set(r.id,(counts.get(r.id)||0)+r.count);return counts;};
 return ['cards','extraCards'].flatMap(zone=>{
  const a=sum(current[zone]),b=sum(previous[zone]);
  return [...new Set([...a.keys(),...b.keys()])].flatMap(id=>{
   const count=(b.get(id)||0)-(a.get(id)||0);
   return count?[{id,count,...(zone==='extraCards'?{zone:'extra'}:{})}]:[];
  });
 });
}
export function deckFromRevision(current,revision){if(!current||!revision?.deck)throw Error('保存履歴を確認してください');const next={...current};for(const k of fields)delete next[k];return {...next,...deckContentSnapshot(revision.deck)};}
export function saveDeckWithHistory(saved,deck,{role='mine',now=new Date().toISOString(),newId=()=>crypto.randomUUID()}={}){
 const key=roleKey(role,deck.id),collection=saved[zone(role)]||[],old=collection.find(d=>d.id===deck.id),copy=structuredClone(deck),history=Object.fromEntries(Object.entries(saved.deckRevisions&&typeof saved.deckRevisions==='object'&&!Array.isArray(saved.deckRevisions)?saved.deckRevisions:{}).filter(([,rows])=>Array.isArray(rows)).map(([key,rows])=>[key,rows.filter(r=>r&&typeof r.id==='string'&&r.deck&&typeof r.deck.name==='string'&&Array.isArray(r.deck.cards))]));
 if(old&&signature(old)!==signature(copy)){
  const revision={id:newId(),savedAt:timestamp(old.updated,timestamp(old.created,now)),archivedAt:now,deck:deckContentSnapshot(old)};
  history[key]=[revision,...deckRevisions(saved,role,deck.id)].slice(0,DECK_HISTORY_LIMIT);
 }
 const all=Object.entries(history).flatMap(([key,rows])=>Array.isArray(rows)?rows.map((r,index)=>({key,id:r.id,index,date:Date.parse(r.archivedAt)||0})):[]).sort((a,b)=>b.date-a.date||a.index-b.index);
 if(all.length>DECK_HISTORY_TOTAL){const keep=new Set(all.slice(0,DECK_HISTORY_TOTAL).map(r=>r.key+'\u0000'+r.id));for(const key of Object.keys(history)){if(!Array.isArray(history[key])){delete history[key];continue;}history[key]=history[key].filter(r=>keep.has(key+'\u0000'+r.id));if(!history[key].length)delete history[key];}}
 return {...saved,[zone(role)]:old?collection.map(d=>d.id===deck.id?copy:d):[...collection,copy],deckRevisions:history};
}
export function forgetDeckRevisions(saved,role,id){const history=Object.fromEntries(Object.entries(saved.deckRevisions&&typeof saved.deckRevisions==='object'&&!Array.isArray(saved.deckRevisions)?saved.deckRevisions:{}).filter(([,rows])=>Array.isArray(rows)).map(([key,rows])=>[key,rows.filter(r=>r&&typeof r.id==='string'&&r.deck&&typeof r.deck.name==='string'&&Array.isArray(r.deck.cards))]));delete history[roleKey(role,id)];return {...saved,deckRevisions:history};}
