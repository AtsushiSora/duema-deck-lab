import {shieldCards} from './shield-state.js';
import {card,getLegalActions,chooseAI,step} from './engine.js';
import {createAIDecision} from './ai-decision.js?v=0.170.0';

export const AI_SPEEDS={slow:{label:'ゆっくり',delay:3000},normal:{label:'標準',delay:2000},fast:{label:'速い',delay:700}};
export const aiSpeedLabel=speed=>(AI_SPEEDS[speed]||AI_SPEEDS.normal).label;
const visible=x=>!x.faceDown&&!x.hidden;
const rows=(p,player)=>['battle','mana','grave','extra'].flatMap(zone=>(p[zone]||[]).filter(visible).map(x=>({player,zone,uid:x.uid,cardId:x.cardId}))).concat((p.shields||[]).flatMap(shieldCards).filter(x=>x.faceUp).map(x=>({player,zone:'shields',uid:x.uid,cardId:x.cardId})));
// Only public identities and counts enter presentation snapshots. Draws stay anonymous.
export function aiPublicSnapshot(s){return {actions:s.actions,turn:s.turn,logIndex:s.log.length,players:s.players.map((p,player)=>({cards:rows(p,player),deck:p.deck.length,hand:p.hand.length,mana:p.mana.length,grave:p.grave.length,shields:p.shields.length,battle:p.battle.length}))};}
const cueKeys=(snapshot,id)=>snapshot.players.flatMap(p=>p.cards.filter(x=>x.cardId===id&&x.zone==='battle').map(x=>`creature:${x.player}:${x.uid}`));
export function aiActionCue(s,a){
 const snapshot=aiPublicSnapshot(s),source=snapshot.players.flatMap(p=>p.cards).find(x=>x.uid===a.uid),cardId=source?.cardId||null,keys=cardId?cueKeys(snapshot,cardId):[];
 let text='相手が能力の選択を行います',zones=[];
 if(a.kind==='charge'){text='相手がカードをマナに置きます';zones=['1:mana'];}
 else if(a.kind==='pandora'){text='相手がパンドラ・シフトで超次元ゾーンへ置きます';zones=['1:extra'];}
 else if(a.kind==='play')text=source?`相手が「${card(cardId).name}」を使います`:'相手がカードを使います';
 else if(a.kind==='attack'){
  text=`相手の「${source?card(cardId).name:'クリーチャー'}」が攻撃します`;
  if(a.target==='player'){if(a.shield)keys.push(`shield:0:${a.shield}`);else keys.push('player:0');text+=' → あなた'+(s.players[0].shields.length?'のシールド':'へダイレクトアタック');}
  else {const target=s.players[0].battle.find(x=>x.uid===a.target);if(target){keys.push(`creature:0:${target.uid}`);text+=` → 「${card(target).name}」`;}}
 }
 else if(a.kind==='skipCharge')text='相手がマナに置かずに進みます';
 else if(a.kind==='toAttack')text='相手が攻撃のステップに進みます';
 else if(a.kind==='endTurn')text='相手がターンを終えます';
 else if(a.kind==='noBlock')text='相手はブロックせずに攻撃を受けます';
 return {label:'相手の行動',text,cardId,keys,zones,turn:s.turn,stage:'before'};
}
export function aiResultCues(before,s,{opponentOnly=false}={}){
 const after=aiPublicSnapshot(s),publicIds=new Set([...before.players,...after.players].flatMap(p=>p.cards.map(x=>x.cardId)));
 const hidden=s.players[1],privateNames=[...hidden.hand,...hidden.deck,...hidden.shields.filter(x=>!x.faceUp),...hidden.mana.filter(x=>!visible(x)),...hidden.battle.filter(x=>!visible(x))].filter(x=>!publicIds.has(x.cardId)).map(x=>card(x)?.name).filter(Boolean).sort((a,b)=>b.length-a.length);
 const changes=after.players.flatMap((p,who)=>['deck','hand','mana','grave','shields','battle'].filter(z=>p[z]!==before.players[who][z]).map(z=>`${who}:${z}`));
 const events=s.log.slice(before.logIndex).filter(e=>!opponentOnly||e.player===1);
 return events.map(e=>{
  const privateEvent=e.player===1&&['draw','peek','look','scry','reorder','search'].includes(e.type),cardId=!privateEvent&&publicIds.has(e.cardId)?e.cardId:null;let text=e.text||'能力を処理しました';
  if(privateEvent){if(e.type==='draw'){const n=String(e.text).match(/(\d+)枚/);text=n?`カードを${n[1]}枚引いた`:'カードを引きました';}else if(e.type==='search')text='山札からカードを探して手札に加えました';else text='非公開のカードを確認しました';}
  for(const name of privateNames)text=text.split(name).join('非公開のカード');
  // Never attach a private card thumbnail, even if a log contains its internal ID.
  const zoneMap={draw:['deck','hand'],charge:['mana'],ramp:['mana'],break:['shields'],shieldAdd:['shields'],exLifeAdd:['shields'],leave:['battle','grave'],play:['battle'],search:['hand']};
  const zones=zoneMap[e.type]?.map(z=>`${e.player}:${z}`)||changes;
  return {label:e.player===1?'相手の行動の結果':'あなたの場の変化',text,cardId,keys:cardId?cueKeys(after,cardId):[],zones,turn:e.turn,stage:'result'};
 });
}

// This clock advances the existing engine only at a validated AI action boundary.
// Reading cues, changing speed, pausing and opening a dialog never execute a move.
export function createAIPlayback({getState,isActive=()=>true,isBlocked=()=>false,onChange=()=>{},timer=setTimeout,cancelTimer=clearTimeout,legal=getLegalActions,choose=null,cancelChoose=()=>{},disposeChoose=()=>{},cards=null,execute=step,speed='normal'}={}){
 const chooser=!choose&&cards&&typeof Worker!=='undefined'?createAIDecision({cards}):null,pick=choose||(chooser?s=>chooser.choose(s):chooseAI);
 let currentSpeed=AI_SPEEDS[speed]?speed:'normal',paused=false,cue=null,queue=[],plan=null,handle=null,generation=0,disposed=false,position=0,total=0,thinking=false,thinkingGeneration=0;
 const active=()=>!disposed&&isActive(),aiTurn=()=>{const s=getState();return s&&s.winner===null&&(s.decision?.player??s.active)===1;};
 const clear=()=>{generation++;if(handle!==null)cancelTimer(handle);handle=null;};
 const snapshot=()=>({speed:currentSpeed,paused,cue,position,total,thinking,hasNext:thinking||!!plan||queue.length>0||!!aiTurn(),pending:queue.length+(plan?1:0)});
 const notify=()=>onChange(snapshot());
 const cancelThinking=()=>{thinkingGeneration++;if(!thinking)return;thinking=false;cue=null;chooser?.cancel();cancelChoose();};
 const schedule=()=>{clear();if(!active()||isBlocked()||paused||thinking||!snapshot().hasNext)return;const token=generation;handle=timer(()=>{handle=null;if(token!==generation||!active()||isBlocked()||paused)return;advance();},AI_SPEEDS[currentSpeed].delay);};
 const announce=(s,a)=>{if(!a||a.player!==1)return false;plan={signature:JSON.stringify(a),actions:s.actions};cue=aiActionCue(s,a);position=0;total=0;return true;};
 function advance(){
  clear();if(!active()||isBlocked()||thinking)return false;
  const s=getState();
  if(plan){
   const pending=plan;plan=null;
   const a=s.actions===pending.actions?legal(s).find(a=>a.player===1&&JSON.stringify(a)===pending.signature):null;
   if(!a){queue=[];cue=null;notify();schedule();return false;}
   const before=aiPublicSnapshot(s);execute(s,a);queue=aiResultCues(before,s);total=queue.length;position=queue.length?1:0;
   cue=queue.shift()||{label:'相手の行動の結果',text:'相手の選択を処理しました',keys:[],zones:[],turn:s.turn,stage:'result'};
  }else if(queue.length){cue=queue.shift();position++;}
  else if(aiTurn()){
   const result=pick(s);
   if(result&&typeof result.then==='function'){
    const token=++thinkingGeneration,actions=s.actions;thinking=true;cue={label:'相手の行動',text:'相手が考えています…',keys:[],zones:[],turn:s.turn,stage:'thinking'};position=0;total=0;notify();
    Promise.resolve(result).then(a=>{
     if(token!==thinkingGeneration)return;
     thinking=false;cue=null;
     if(!active()||isBlocked()||getState()!==s||s.actions!==actions||!aiTurn())return;
     if(a&&legal(s).some(x=>x.player===1&&JSON.stringify(x)===JSON.stringify(a)))announce(s,a);
     notify();schedule();
    }).catch(()=>{
     if(token!==thinkingGeneration)return;
     thinking=false;if(!active())return;
     paused=true;cue={label:'相手の行動',text:'相手の思考を再開してください',keys:[],zones:[],turn:s.turn,stage:'error'};notify();
    });return true;
   }
   if(!announce(s,result))return false;
  }else return false;
  notify();schedule();return true;
 }
 return {
  snapshot,capture:()=>aiPublicSnapshot(getState()),
  start(){if(!active()||isBlocked()||thinking)return;if(!cue&&!plan&&!queue.length&&aiTurn()&&!paused)advance();else schedule();},
  suspend(){clear();cancelThinking();},
  setSpeed(value){if(!AI_SPEEDS[value])return;currentSpeed=value;notify();schedule();},
  togglePause(){paused=!paused;if(paused)cancelThinking();notify();if(!paused&&!cue&&aiTurn())advance();else schedule();},
  next(){if(!active()||isBlocked())return;paused=true;if(!advance())notify();},
  reset(){clear();cancelThinking();queue=[];plan=null;cue=null;position=0;total=0;},
  recordHuman(before){clear();cancelThinking();plan=null;queue=aiResultCues(before,getState(),{opponentOnly:true});total=queue.length;position=total?1:0;cue=queue.shift()||null;},
  dispose(){clear();cancelThinking();chooser?.dispose();disposeChoose();disposed=true;queue=[];plan=null;cue=null;}
 };
}
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function aiPlaybackHTML(playback){
 if(!playback?.cue&&!playback?.hasNext)return '';
 const {paused,hasNext,position,total,speed}=playback,cue=playback.cue||{label:'相手の行動',text:paused?'相手AIを一時停止しています':'相手の行動を確認します'};
 return `<section class="ai-playback ${paused?'is-paused':''}" aria-label="相手AIの行動を確認"><button class="ai-cue" data-action="manual-ai-detail" aria-label="行動の説明を詳しく見る"><small>${paused?'一時停止中 · ':''}${esc(cue.label)}${total>1?` · ${position}/${total}`:''}</small><strong role="status" aria-live="polite" aria-atomic="true">${esc(cue.text)}</strong></button><div class="ai-playback-buttons"><button data-action="manual-speed" aria-label="AIの速さを変更">速さ：${aiSpeedLabel(speed)}</button><button data-action="manual-ai-pause" aria-pressed="${paused}" ${!hasNext&&!paused?'disabled':''}>${paused?'▶ 再開':'Ⅱ 一時停止'}</button><button data-action="manual-ai-next" ${hasNext&&!playback.thinking?'':'disabled'}>次へ ›</button></div></section>`;
}
export function applyAIHighlights(area,cue){
 if(!area?.querySelectorAll||!cue)return;
 const keys=new Set(cue.keys||[]),zones=new Set(cue.zones||[]);
 for(const el of area.querySelectorAll('[data-visual-key],[data-playback-zone]'))el.classList.toggle('ai-highlight',keys.has(el.dataset.visualKey)||zones.has(el.dataset.playbackZone));
}
