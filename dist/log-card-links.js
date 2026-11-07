import {card} from './engine.js';
import {aiPublicSnapshot,aiResultCues} from './ai-playback.js?v=0.682.0';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const publicLogCards=s=>[...new Set(aiPublicSnapshot(s).players.flatMap(p=>p.cards.map(x=>x.cardId)))].map(id=>({id,name:card(id)?.name})).filter(x=>x.name);
export function logCardReferences(s,index,{spectator=false}={}){
 const e=s.log[index];if(!e)return {text:'',ids:[]};const snapshot=aiPublicSnapshot(s),cue=aiResultCues({...snapshot,logIndex:index},s,{spectator})[0],text=cue?.text||'対戦の処理';
 const ids=[...new Set(snapshot.players.flatMap(p=>p.cards.map(x=>x.cardId)))].filter(id=>card(id)?.name&&text.includes(card(id).name));if(cue?.cardId&&!ids.includes(cue.cardId))ids.push(cue.cardId);
 return {text,ids};
}
export function linkedLogText(s,index,{spectator=false,text,ids,publicCards=null,cueCardId=null}={}){
 if(text!==undefined&&!ids&&publicCards){ids=publicCards.filter(x=>text.includes(x.name)||x.id===cueCardId).map(x=>x.id);}
 if(text===undefined||!ids)({text,ids}=logCardReferences(s,index,{spectator}));
 const names=ids.map(id=>({id,name:card(id).name})).sort((a,b)=>b.name.length-a.name.length);let result='',offset=0;
 while(offset<text.length){let found=null,at=text.length;for(const item of names){const i=text.indexOf(item.name,offset);if(i>=0&&i<at){at=i;found=item;}}if(!found){result+=esc(text.slice(offset));break;}result+=esc(text.slice(offset,at))+`<button type="button" class="manual-log-card-link" data-action="manual-log-card" data-id="${esc(found.id)}" data-log-index="${index}" aria-label="${esc(found.name)}のカード情報">${esc(found.name)}</button>`;offset=at+found.name.length;}
 const extra=names.filter(x=>!text.includes(x.name));return result+(extra.length?` <span class="manual-log-card-refs">${extra.map(x=>`<button type="button" class="manual-log-card-link" data-action="manual-log-card" data-id="${esc(x.id)}" data-log-index="${index}">${esc(x.name)}</button>`).join(' / ')}</span>`:'');
}
