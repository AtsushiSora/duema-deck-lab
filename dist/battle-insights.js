import {card,effectiveCard,power,isEvolution,canUntap,skipsStartUntap,abilitiesIgnored,attackLocked,canCreatureAttack,exLifeShields,getLegalActions,manaSelectionStatus,playFaces,spellIgnored} from './engine.js';
import {sourceCardCount} from './card-info.js';

const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const layers=x=>[x,...(x.under||[]).flatMap(layers),...(x.godLinks||[]).flatMap(layers)];
const side=p=>p===0?'自分':'相手';
const number=n=>n===Infinity||n==='∞'?'∞':Number(n).toLocaleString('ja-JP');
export function effectExpiry(s,e){
 const who=Number.isInteger(e.who)?e.who:s.active;
 if(e.expires==='end')return who===s.active?'このターン終了まで':side(who)+'のターン終了まで';
 if(e.expires==='start')return e.afterTurns===undefined?'次の'+side(who)+'のターン開始まで':side(who)+'のターン開始時に解除判定';
 return 'カードの条件を満たすまで';
}
export function creatureStatusModel(s,player,uid){
 if(![0,1].includes(player))return null;
 const own=s.players[player],x=own.battle.find(x=>x.uid===uid);if(!x)return null;
 const position=own.battle.indexOf(x)+1;
 if(x.sealed||x.faceDown)return {player,uid,position,name:x.sealed?'封印されているカード':'裏向きのカード',hidden:true,rows:[['状態',x.sealed?'封印中':'裏向き'],['封印',(own.seals||[]).filter(y=>y.sealOf===uid).length+'枚']],effects:[],sources:[]};
 const c=effectiveCard(x,s),creature=c.type==='creature',reasons=[],effects=[];
 const allowed=creature&&canCreatureAttack(s,player,x),locked=creature&&attackLocked(s,player,x);
 if(creature){
  if(x.tapped)reasons.push('タップ中');
  if(c.noAttack)reasons.push('このカードの能力で攻撃できない');
  if(locked)reasons.push('カードの効果で攻撃できない');
  if(!allowed&&!reasons.length)reasons.push(x.entered===s.turn&&!isEvolution(x)&&!c.speedAttacker&&!c.machFighter?'出たターンの攻撃条件を満たしていない（召喚酔いなど）':'攻撃に必要な条件を満たしていない');
 }
 const rows=[['状態',x.tapped?'タップ中':'アンタップ']];
 if(creature){rows.push(['現在のパワー',number(power(x,x.uid===s.attack?.attacker,s))]);
  const legal=s.active===player&&s.phase==='attack'&&!s.decision?getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===uid):null;
  rows.push(['攻撃',s.winner!==null?'対戦終了':reasons.length?reasons.join(' / '):legal===false?'選べる攻撃先がない':s.active!==player?'現在は'+side(s.active)+'のターン（持ち主の攻撃ステップで判定）':s.decision?'能力・支払いの選択を解決中':s.phase!=='attack'?side(player)+'の攻撃ステップで攻撃可能':'攻撃可能']);
  if(c.g38BattleBonus)effects.push({name:'バトル中のパワー +'+number(c.g38BattleBonus),until:'この能力が有効な間（通常のパワーには含まない）'});
  if(c.noCreatureAttack)effects.push({name:'クリーチャーには攻撃できない',until:'この能力が有効な間'});
  if(c.noPlayerAttack)effects.push({name:'相手プレイヤーには攻撃できない',until:'この能力が有効な間'});
  rows.push([isEvolution(x)?'進化元':'下のカード',sourceCardCount(x)+'枚']);
  const shields=exLifeShields(s,player,x),positions=shields.map(y=>own.shields.indexOf(y)+1);
  if(c.exLife||shields.length)rows.push(['EXライフ',shields.length?shields.length+'つ有効（シールド'+positions.join('・')+'）':'対応するシールドなし']);
 }
 if(abilitiesIgnored(s,x))effects.push({name:'能力が無効になっている',until:'無効にする効果が有効な間'});
 const physical=layers(x),matches=l=>l.player===player&&(!l.uid||physical.some(y=>y.uid===l.uid&&(y.incarnation||0)===(l.incarnation||0)))&&(l.cost===undefined||playFaces(card(x)).some(f=>Number(f.cost)===(l.cost==='∞'?Infinity:Number(l.cost))))&&(l.spellCost===undefined||!spellIgnored(s,{type:'spell',cost:l.spellCost,spellSource:l.spellSource}));
 for(const l of s.extLimits||[])if(matches(l)&&((l.kind==='attack'&&locked)||l.kind==='block'))effects.push({name:l.kind==='attack'?(l.reason==='gStrike'?'G・ストライク：攻撃不可':'攻撃不可'):'ブロック不可',until:effectExpiry(s,l)});
 if(locked&&!effects.some(e=>e.name.includes('攻撃不可')))effects.push({name:'攻撃制限',until:'制限しているカードの条件を満たすまで'});
 for(const l of x.powerModifiers||[])effects.push({name:'パワー '+(l.amount>=0?'+':'')+number(l.amount),until:effectExpiry(s,l)});
 if(!canUntap(x)){
  for(const l of x.tapLocks||[])effects.push({name:'アンタップ制限',until:typeof l==='number'?'次の'+side(l)+'のターン開始まで':effectExpiry(s,{...l,expires:'start'})});
  if(x.g32NoUntap||x.g34NoUntap)effects.push({name:'アンタップ制限',until:'カードの条件を満たすまで'});
 }
 if(skipsStartUntap(s,x))effects.push({name:'次の'+side(player)+'のターン開始時にアンタップしない',until:'次の'+side(player)+'のターン開始時に解除判定'});
 if(x.justDiverActive&&c.justDiver)effects.push({name:'ジャストダイバー',until:'次の'+side(player)+'のターン開始まで'});
 const sources=(x.under||[]).flatMap(layers).map(y=>({uid:y.uid,id:y.faceDown?null:y.cardId,name:y.faceDown?'裏向きのカード':card(y).name}));
 return {player,uid,position,id:x.cardId,name:card(x).name,hidden:false,rows,effects:[...new Map(effects.map(e=>[e.name+e.until,e])).values()],sources};
}
export function creatureStatusHTML(s,player,uid,{art}){
 const m=creatureStatusModel(s,player,uid);if(!m)return '<p>このカードは場を離れています。</p>';
 return `<section class="battle-card-status"><div class="status-card-head">${m.id?art(m.id):''}<div><small>${side(player)}の場${m.position}</small><h3>${esc(m.name)}</h3></div></div><dl class="battle-status-rows">${m.rows.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl><h4>適用中の効果と期限</h4>${m.effects.length?`<ul class="battle-status-effects">${m.effects.map(e=>`<li><strong>${esc(e.name)}</strong><span>${esc(e.until)}</span></li>`).join('')}</ul>`:'<p class="small">表示できる一時的な制限・強化はありません。カード固有の能力は「能力を見る」で確認できます。</p>'}${m.sources.length?`<details class="battle-status-sources"><summary>${m.rows.find(r=>r[0]==='進化元')?'進化元':'下のカード'} ${m.sources.length}枚を見る</summary>${m.sources.map((x,i)=>`<div>${x.id?art(x.id):''}<span>${i+1}. ${esc(x.name)}</span></div>`).join('')}</details>`:''}</section>`;
}
function ownPhysical(s,p,uid){for(const zone of ['battle','mana','grave','hand','extra'])for(const top of s.players[p][zone]||[]){const x=layers(top).find(x=>x.uid===uid);if(x)return {inst:x,zone,index:s.players[p][zone].indexOf(top)+1};}return null;}
const zoneLabel={battle:'場',mana:'マナ',grave:'墓地',hand:'手札',extra:'超次元'};
export function paymentReviewModel(s){
 const d=s.decision;if(d?.type!=='manaPayment')return null;
 const a=d.action||{},use=d.use||{},source=d.source?card(d.source):null,face=source&&(playFaces(source).find(f=>f.name===use.name&&f.type===use.type)||playFaces(source)[a.face??d.baseDecision?.face??d.baseDecision?.playAction?.face??0]),name=use.name||face?.name||source?.name||a.label||'カードの使用';
 const baseValue=use.baseUids??a.baseUid,baseIds=Array.isArray(baseValue)?baseValue:baseValue?[baseValue]:[];
 const bases=baseIds.map(uid=>{const found=ownPhysical(s,d.player,uid);return found?zoneLabel[found.zone]+found.index+' '+card(found.inst).name:'選択した進化元';});
 const target=a.kind==='crossGear'?ownPhysical(s,d.player,a.target):null;
 const method=a.kind==='galaxyShield'?'ギャラクシールドでシールドに置く':a.kind==='crossGear'?'クロスする':a.kind==='pandora'?'パンドラ・シフト':(use.type||face?.type)==='spell'?'呪文を唱える':bases.length?'進化して召喚':'召喚・使用';
 const context=a.kind==='galaxyShield'?'表向きのシールドに置きます。次の自分のターンのはじめに召喚します。':bases.length?'進化元：'+bases.join(' ＋ '):target?'クロス先：場'+target.index+' '+card(target.inst).name:face?.neoEvolution?'進化元なしで召喚':(use.type||face?.type)==='spell'?'効果の対象は、支払い後に必要に応じて選びます。':'進化元・対象の選択はありません。';
 const selected=d.selected.map(uid=>d.pool.find(x=>x.uid===uid)).filter(Boolean).map(x=>({uid:x.uid,id:x.cardId,name:card(x).name}));
 return {name,method,context,cost:d.cost,selected,status:manaSelectionStatus(d),origin:a.kind==='crossGear'?'場':zoneLabel[use.origin||a.origin||'hand']||'手札'};
}
export function paymentReviewHTML(s){
 const m=paymentReviewModel(s);if(!m)return '';
 return `<section class="payment-review" aria-label="実行する内容"><strong>実行する内容</strong><p><b>${esc(m.name)}</b><span>${esc(m.origin)}から · ${esc(m.method)}</span></p><p>${esc(m.context)}</p><p class="payment-review-mana">支払うマナ：${m.selected.length?m.selected.map(x=>esc(x.name)).join(' / '):'未選択'}<span>${m.status.amount} / ${m.cost}マナ · ${m.selected.length}枚</span></p></section>`;
}
export function recordBattleAction(battle,action,options,execute){
 const s=battle.state,before=structuredClone(s),entry={turn:s.turn,number:s.actions,player:action.player,action:structuredClone(action),manualMana:!!options.manualMana};
 battle.beforeLastAction=before;(battle.recentActions??=[]).push(entry);battle.recentActions=battle.recentActions.slice(-60);
 try{const result=execute(s,action,options);entry.after=s.actions;return result;}catch(e){entry.error=String(e.message||e);throw e;}
}
export function createBattleReport(battle,{appVersion,engineVersion,rules,aiVersion,note='',viewport=null,createdAt=new Date().toISOString()}={}){
 const decks=(battle.decks||[]).map(d=>({id:d.id,name:d.name,cards:structuredClone(d.cards)}));
 return {format:'duema-battle-report',formatVersion:1,createdAt,appVersion,engineVersion,rules,aiVersion,note:String(note).slice(0,4000),viewport,decks,state:structuredClone(battle.state),beforeLastAction:battle.beforeLastAction?structuredClone(battle.beforeLastAction):null,recentActions:structuredClone(battle.recentActions||[]),log:structuredClone(battle.state.log),scope:'再現用の全対戦データ。CPUの手札・山札・シールドも含みます。'};
}
export const encodeBattleData=value=>JSON.stringify(value,(_key,v)=>v===Infinity?{$duemaNumber:'Infinity'}:v===-Infinity?{$duemaNumber:'-Infinity'}:v,2);
export const decodeBattleData=text=>JSON.parse(text,(_key,v)=>v&&typeof v==='object'&&Object.keys(v).length===1&&v.$duemaNumber==='Infinity'?Infinity:v&&typeof v==='object'&&Object.keys(v).length===1&&v.$duemaNumber==='-Infinity'?-Infinity:v);
