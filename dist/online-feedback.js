import {displayTurn} from './turn-count.js';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Compare only the already projected room. Never inspect a hidden card's identity,
// or infer a draw from a hand increase (searches and returns can look identical).
export function updateOnlineFeedback(before,room,current=null){
 if(!room?.game)return null;
 const events=room.events||[];
 if(!before?.game||before.code!==room.code||before.seat!==room.seat){
  return events.length?{items:events.slice(-1),index:0}:null;
 }
 if(before.revision===room.revision)return current;
 const old=before.events||[];
 let overlap=Math.min(old.length,events.length);
 for(;overlap>0;overlap--)if(JSON.stringify(old.slice(-overlap))===JSON.stringify(events.slice(0,overlap)))break;
 const items=events.slice(overlap).map(e=>({...e}));
 const add=(player,text)=>items.push({player,text,turn:room.game.turn,round:displayTurn(room.game),change:true});
 const counts={handCount:'手札',shieldCount:'シールド',mana:'マナ',grave:'墓地',battle:'バトルゾーンのカード',extra:'超次元ゾーンのカード',abyss:'深淵ゾーンのカード'};
 room.game.players.forEach((p,player)=>{
  const previous=before.game.players[player];if(!previous)return;
  for(const [zone,label] of Object.entries(counts)){
   const count=(value)=>Array.isArray(value)?value.length:value??(zone.endsWith('Count')?undefined:0);
   const a=count(previous[zone]),b=count(p[zone]);
   if(Number.isFinite(a)&&Number.isFinite(b)&&a!==b)add(player,`${label}が${Math.abs(b-a)}枚${b>a?'増えた':'減った'}`);
  }
  for(const zone of ['mana','battle']){
   const prior=new Map((previous[zone]||[]).map(c=>[c.uid,c]));
   for(const tapped of [true,false]){
    const n=(p[zone]||[]).filter(c=>prior.has(c.uid)&&!!prior.get(c.uid).tapped!==!!c.tapped&&!!c.tapped===tapped).length;
    if(n)add(player,`${zone==='mana'?'マナ':'バトルゾーンのカード'}を${n}枚${tapped?'タップ':'アンタップ'}した`);
   }
  }
 });
 return items.length?{items,index:items.length-1}:current;
}

export function onlineFeedbackHTML(feedback,seat){
 const items=feedback?.items||[],index=Math.max(0,Math.min(feedback?.index||0,items.length-1)),cue=items[index];
 const label=cue?cue.player===seat?'あなたの場の変化':'相手の場の変化':'対戦の状況';
 return `<section class="online-feedback" aria-label="直前の対戦状況"><div class="online-feedback-message" role="status" aria-live="polite" aria-atomic="true"><small>${esc(label)}${cue?` · ${index+1}/${items.length} · T${displayTurn(cue)}`:''}</small><strong>${esc(cue?.text||'操作の結果をここに表示します')}</strong></div><div class="online-feedback-buttons">${items.length>1?`<button type="button" data-action="online-feedback-prev" aria-label="前の変化を見る" ${index===0?'disabled':''}>‹</button><button type="button" data-action="online-feedback-next" aria-label="次の変化を見る" ${index===items.length-1?'disabled':''}>›</button>`:''}<button type="button" data-action="online-log" aria-label="対戦ログを開く">ログ</button></div></section>`;
}
