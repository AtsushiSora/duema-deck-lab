// Supported-card rules engine. No strength-based or precomputed win rates.
export const RULE_VERSION='総合ルール 1.53 / 対応カード版 0.5';
export const ENGINE_VERSION='0.5.0';
const EFFECTS=new Set(['ramp1','ramp2','discard','teamBuff','optionalDraw','drawUpTo3','searchCreature','tap','tapTwo','buff','unblock','bounce','destroySmall','destroyUntapped','draw2','destroy','manaRemoval','tapAll','discardAll','bounceOptional','bounceSmall','bounceBlockers','dragonRamp2','ramp2Return1','optionalRamp4Return2','purgeNonDragonMana']);
let catalogue=new Map();
export function setCards(cards){for(const c of cards){if(c.effect&&!EFFECTS.has(c.effect))throw Error('未実装の効果です：'+c.effect);if(c.breaker!=null&&![2,3].includes(c.breaker))throw Error('未実装のブレイカーです');if(c.evolution&&c.trigger)throw Error('進化S・トリガーは未対応です');}catalogue=new Map(cards.map(c=>[c.id,c]));}
export const card=id=>catalogue.get(typeof id==='string'?id:id.cardId);
export function validateDeck(deck){
 const errors=[];
 if(!deck||!Array.isArray(deck.cards))return ['デッキ形式が正しくありません'];
 let total=0;const counts={};
 for(const row of deck.cards){
  if(!row||typeof row.id!=='string'||!Number.isSafeInteger(row.count)||row.count<1||row.count>40){errors.push('カードの枚数が正しくありません');continue;}
  total+=row.count;counts[row.id]=(counts[row.id]||0)+row.count;
 }
 for(const[id,n]of Object.entries(counts)){const c=card(id);if(!c)errors.push(`未対応カード：${id}`);else if(n>c.limit)errors.push(`${c.name}は${c.limit}枚までです`);}
 if(total!==40)errors.push(`40枚必要です（現在${total}枚）`);
 if(deck.format&&deck.format!=='original')errors.push('現在はオリジナルのみ対応しています');
 return [...new Set(errors)];
}
export function random(state){let t=state.rng+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;}
export function shuffled(items,seed){const s={rng:seed>>>0},out=[...items];for(let i=out.length-1;i>0;i--){const j=Math.floor(random(s)*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
const instance=(id,uid)=>({cardId:id,uid,tapped:false,entered:0,buff:0,unblocked:false});
export function createGame(decks,{seed=1,first=0}={}){
 for(const d of decks){const e=validateDeck(d);if(e.length)throw Error(e.join(' / '));}
 const s={seed:seed>>>0,rng:(seed^0x317)>>>0,first,active:first,turn:1,phase:'charge',winner:null,reason:'',decision:null,after:[],log:[],actions:0,version:ENGINE_VERSION,metrics:[0,1].map(()=>({played:{},earlyPlayed:{},firstCreature:null,charges:0,breaks:0,triggers:0,turns:0}))};
 s.players=decks.map((d,p)=>{let n=0;const deck=shuffled(d.cards.flatMap(r=>Array.from({length:r.count},()=>instance(r.id,`${p}-${n++}`))),seed^(p?0x9e3779b9:0x42));const shields=deck.splice(0,5),hand=deck.splice(0,5);return {name:d.name,deck,hand,shields,mana:[],battle:[],grave:[],turns:0};});
 s.players[first].turns=1;s.metrics[first].turns=1;
 log(s,first,'start','対戦開始。先攻の最初のドローを省略');return s;
}
function log(s,p,type,text,extra={}){s.log.push({index:s.log.length,turn:s.turn,player:p,type,text,...extra});}
function finish(s,winner,reason){if(s.winner!==null)return;s.winner=winner;s.reason=reason;s.decision=null;log(s,winner,'finish',reason);}
function deckCheck(s,p){if(!s.players[p].deck.length)finish(s,1-p,`${s.players[p].name}の山札がなくなった`);}
function draw(s,p,n){for(let i=0;i<n&&s.winner===null;i++){const c=s.players[p].deck.shift();if(c)s.players[p].hand.push(c);deckCheck(s,p);}log(s,p,'draw',`カードを${n}枚引いた`);}
function remove(list,uid){const i=list.findIndex(x=>x.uid===uid);if(i<0)return null;return list.splice(i,1)[0];}
export const civilizations=c=>c.civilizations||String(c.civ).split('/');
export const manaValue=c=>c.manaValue??(civilizations(c).length===5?0:1);
export const isDragon=c=>c.type==='creature'&&String(c.race).includes('ドラゴン');
export function physicalCards(s){const flatten=c=>[c,...(c.under||[]).flatMap(flatten)];return s.players.flatMap(p=>['deck','hand','shields','mana','battle','grave'].flatMap(z=>p[z].flatMap(flatten)));}
function moveCreature(s,p,uid,to='grave'){
 const c=remove(s.players[p].battle,uid);if(!c)return;
 const target=to==='grave'&&card(c).death?card(c).death:to;
 const flatten=x=>[x,...(x.under||[]).flatMap(flatten)],cards=flatten(c);
 for(const x of cards){delete x.under;x.tapped=target==='mana'&&civilizations(card(x)).length>1;x.buff=0;x.unblocked=false;x.entered=0;}
 s.players[p][target].push(...cards);
 log(s,p,'leave',`${card(c).name}${cards.length>1?`と進化元${cards.length-1}枚`:''}が${{grave:'墓地',hand:'手札',mana:'マナ'}[target]}へ移動`,{cardId:c.cardId});
}
function matchesEvolution(base,condition){
 const c=card(base),races=String(c.race).split('/');
 if(condition.any)return condition.any.some(x=>matchesEvolution(base,x));
 if(condition.race)return races.includes(condition.race);
 if(condition.category)return races.some(r=>r.includes(condition.category));
 if(condition.civilization)return civilizations(c).includes(condition.civilization);
 if(condition.blocker)return !!c.blocker;
 return false;
}
export function evolutionBases(s,p,c){return c.evolution?s.players[p].battle.filter(x=>matchesEvolution(x,c.evolution)):[];}
export function power(c,attacking=false){return card(c).power+(attacking?(card(c).attackBonus||0)+(c.buff||0):0);}
function canAttack(s,p,c){return !c.tapped&&!card(c).noAttack&&(c.entered<s.turn||card(c).speedAttacker||card(c).evolution);}
function targets(s,p,effect){
 const own=s.players[p],opp=s.players[1-p];
 if(['buff','unblock'].includes(effect))return own.battle.map(x=>({player:p,uid:x.uid}));
 if(['bounce','bounceOptional','bounceSmall','bounceBlockers'].includes(effect))return [p,1-p].flatMap(player=>s.players[player].battle.filter(x=>effect!=='bounceSmall'||card(x).cost<=6).map(x=>({player,uid:x.uid})));
 return opp.battle.filter(x=>effect!=='destroyUntapped'||!x.tapped).filter(x=>effect!=='destroySmall'||power(x,x.uid===s.attack?.attacker)<=2000).map(x=>({player:1-p,uid:x.uid}));
}
// One distinct mana card per required civilization; five-color mana has value zero.
export function manaPayment(mana,c){
 const pool=mana.filter(x=>!x.tapped),colors=civilizations(c),goal=(1<<colors.length)-1,cost=c.cost;
 if(pool.reduce((n,x)=>n+manaValue(card(x)),0)<cost)return null;
 if(colors.length===1&&pool.every(x=>manaValue(card(x))===1)){const same=pool.find(x=>civilizations(card(x)).includes(colors[0]));return same?[same,...pool.filter(x=>x!==same).slice(0,cost-1)].map(x=>x.uid):null;}
 let states=new Map([['0:0',{mask:0,amount:0,ids:[]}]]);
 for(const x of pool){const next=new Map(states),value=manaValue(card(x)),bits=[0,...colors.flatMap((v,i)=>civilizations(card(x)).includes(v)?[1<<i]:[])];
  for(const st of states.values())for(const bit of bits){const amount=Math.min(cost,st.amount+value),mask=st.mask|bit,key=mask+':'+amount,ids=[...st.ids,x.uid],old=next.get(key);if(!old||ids.length<old.ids.length)next.set(key,{mask,amount,ids});}
  states=next;
 }
 return states.get(goal+':'+cost)?.ids||null;
}
function validMana(s,p,c){return manaPayment(s.players[p].mana,c)!==null;}
function pay(s,p,c){const ids=manaPayment(s.players[p].mana,c);if(!ids)throw Error('必要な文明・マナが足りません');for(const x of s.players[p].mana)if(ids.includes(x.uid))x.tapped=true;}
// Move the whole batch together (400.7). Looking/revealing alone does not empty the library.
function rampTapped(s,p,c,n,dragonsOnly=false){
 const own=s.players[p],batch=own.deck.splice(0,n);
 if(dragonsOnly)log(s,p,'reveal',`${c.name}で公開：${batch.map(x=>card(x).name).join('・')}`,{cardId:c.id});
 const mana=batch.filter(x=>!dragonsOnly||isDragon(card(x))),grave=batch.filter(x=>dragonsOnly&&!isDragon(card(x)));
 for(const x of batch){x.tapped=mana.includes(x);x.buff=0;x.unblocked=false;x.entered=0;}
 own.mana.push(...mana);own.grave.push(...grave);
 log(s,p,'ramp',`${c.name}：${mana.length}枚をタップしてマナへ${grave.length?`、${grave.length}枚を墓地へ`:''}`,{cardId:c.id});
 deckCheck(s,p);
}
function chooseManaTop(s,p,c,n){
 const count=Math.min(n,s.players[p].mana.length);
 if(s.winner===null&&count)s.decision={type:'manaTop',player:p,source:c.id,count,chosen:[]};
}
function doEffect(s,p,c){
 const e=c.effect;if(!e)return;
 if(e==='dragonRamp2'){rampTapped(s,p,c,2,true);return;}
 if(e==='ramp2Return1'){rampTapped(s,p,c,2);chooseManaTop(s,p,c,1);return;}
 if(e==='optionalRamp4Return2'){s.decision={type:'optionalRamp',player:p,source:c.id};return;}
 if(e==='purgeNonDragonMana'){
  for(const who of [0,1]){const own=s.players[who],removed=own.mana.filter(x=>!isDragon(card(x)));own.mana=own.mana.filter(x=>isDragon(card(x)));for(const x of removed){x.tapped=false;x.buff=0;x.unblocked=false;x.entered=0;}own.grave.push(...removed);log(s,who,'manaLeave',`${c.name}でドラゴン以外のマナ${removed.length}枚を墓地へ`,{cardId:c.id});}return;
 }
 if(e==='bounceBlockers'){for(const who of [0,1])for(const x of [...s.players[who].battle])if(card(x).blocker)moveCreature(s,who,x.uid,'hand');return;}
 if(e==='draw2'){draw(s,p,2);return;}
 if(e==='tapAll'){for(const x of s.players[1-p].battle)x.tapped=true;log(s,p,'effect',`${c.name}で相手のクリーチャーすべてをタップ`,{cardId:c.id});return;}
 if(e==='discardAll'){const other=s.players[1-p],n=other.hand.length;other.grave.push(...other.hand.splice(0));log(s,p,'discard',`${c.name}で相手の手札${n}枚をすべて墓地へ`,{cardId:c.id});return;}
 if(e==='ramp1'||e==='ramp2'){const n=e==='ramp1'?1:2;let added=0;for(let i=0;i<n&&s.winner===null;i++){const x=s.players[p].deck.shift();if(x){x.tapped=civilizations(card(x)).length>1;s.players[p].mana.push(x);added++;}deckCheck(s,p);}log(s,p,'ramp',`${c.name}でマナを${added}枚追加`,{cardId:c.id});return;}
 if(e==='discard'){const hand=s.players[1-p].hand;if(hand.length){const i=Math.floor(random(s)*hand.length);const[x]=hand.splice(i,1);s.players[1-p].grave.push(x);log(s,p,'discard',`${c.name}で相手の手札を1枚墓地へ`,{cardId:c.id});}return;}
 if(e==='teamBuff'){for(const x of s.players[p].battle)x.buff+=2000;log(s,p,'buff','このターン、攻撃中のパワーを+2000');return;}
 if(e==='optionalDraw'||e==='drawUpTo3'){s.decision={type:'draw',player:p,max:e==='optionalDraw'?1:3,source:c.id};return;}
 if(e==='searchCreature'){s.decision={type:'search',player:p,source:c.id};return;}
 const ts=targets(s,p,e);if(ts.length)s.decision={type:'effect',player:p,effect:e,source:c.id,targets:ts,optional:e==='bounceOptional'};
}
function playCard(s,p,uid,free=false,baseUid=null){
 const inst=remove(s.players[p].hand,uid),c=card(inst);if(!free)pay(s,p,c);
 if(c.type==='creature'){inst.entered=s.turn;inst.tapped=false;if(c.evolution){const base=remove(s.players[p].battle,baseUid);if(!base||!matchesEvolution(base,c.evolution))throw Error('進化元が正しくありません');inst.under=[base];inst.tapped=base.tapped;inst.buff=base.buff||0;inst.unblocked=base.unblocked||false;log(s,p,'evolve',`${card(base).name}から${c.name}へ進化`,{cardId:c.id});}s.players[p].battle.push(inst);if(s.metrics[p].firstCreature===null)s.metrics[p].firstCreature=s.players[p].turns;}else s.players[p].grave.push(inst);
 const met=s.metrics[p];met.played[c.id]=(met.played[c.id]||0)+1;if(s.players[p].turns<=3)met.earlyPlayed[c.id]=true;if(free)met.triggers++;
 log(s,p,free?'trigger':'play',`${c.name}を${free?'S・トリガーで':''}${c.type==='creature'?'召喚':'使用'}`,{cardId:c.id});
 if(free&&c.type==='creature'&&s.triggers){if(c.effect)s.triggers.entries.push({uid:inst.uid,source:c.id});}else doEffect(s,p,c);
}
function battle(s,attacker,defender){const pa=s.active,pd=1-pa;const ap=power(attacker,true),dp=power(defender,false);const aDies=ap<=dp||card(defender).slayer||card(attacker).afterBattleDie;const dDies=dp<=ap||card(attacker).slayer||card(defender).afterBattleDie;log(s,pa,'battle',`${card(attacker).name}(${ap}) 対 ${card(defender).name}(${dp})`);if(aDies)moveCreature(s,pa,attacker.uid);if(dDies)moveCreature(s,pd,defender.uid);}
function resolveAttack(s,blockUid){
 const a=s.players[s.active].battle.find(x=>x.uid===s.attack.attacker),other=1-s.active;
 if(!a){s.attack=null;return;}
 if(blockUid){const b=s.players[other].battle.find(x=>x.uid===blockUid);b.tapped=true;log(s,other,'block',`${card(b).name}でブロック`,{cardId:b.cardId});battle(s,a,b);}
 else if(s.attack.target!=='player'){const b=s.players[other].battle.find(x=>x.uid===s.attack.target);if(b)battle(s,a,b);}
 else if(!s.players[other].shields.length)finish(s,s.active,'ダイレクトアタックが成立');
 else{
  const shields=s.players[other].shields,n=Math.min(card(a).breaker||1,shields.length);
  if(n===shields.length)breakShields(s,other,shields.map(c=>c.uid));
  else if(n===1)breakShields(s,other,[s.attack.shield||shields[0].uid]);
  else s.decision={type:'breakChoice',player:s.active,defender:other,count:n};
 }
 s.attack=null;
}
// Rule 509.5: selected shields leave together. Declare every trigger before executing any.
function breakShields(s,defender,uids){
 const broken=uids.map(uid=>remove(s.players[defender].shields,uid)).filter(Boolean);
 s.players[defender].hand.push(...broken);s.metrics[s.active].breaks+=broken.length;
 log(s,s.active,'break',`シールドを${broken.length}枚同時にブレイク（残り${s.players[defender].shields.length}枚）`);
 const eligible=broken.filter(c=>card(c).trigger).map(c=>c.uid);
 if(eligible.length)s.triggers={player:defender,undeclared:eligible,declared:[],entries:[]};
}
// Rule 112.3a: spell triggers finish first; creature entry effects wait until all triggers finish.
function advanceTriggers(s){
 while(s.triggers&&!s.decision&&s.winner===null){
  const t=s.triggers,p=t.player;
  if(t.undeclared.length){const c=s.players[p].hand.find(c=>c.uid===t.undeclared[0]);s.decision={type:'trigger',player:p,uid:c.uid,source:c.cardId};return;}
  if(t.declared.length>1){s.decision={type:'triggerOrder',player:p};return;}
  if(t.declared.length){playCard(s,p,t.declared.shift(),true);continue;}
  if(t.entries.length>1){s.decision={type:'entryOrder',player:p};return;}
  if(t.entries.length){doEffect(s,p,card(t.entries.shift().source));continue;}
  s.triggers=null;
 }
}
function combinations(items,n){if(n===0)return [[]];if(n>items.length)return [];return items.flatMap((x,i)=>combinations(items.slice(i+1),n-1).map(rest=>[x,...rest]));}

function nextTurn(s){
 for(const p of s.players)for(const c of p.battle){c.buff=0;c.unblocked=false;}
 s.active=1-s.active;s.turn++;s.phase='charge';const p=s.players[s.active];p.turns++;s.metrics[s.active].turns=p.turns;for(const c of [...p.mana,...p.battle])c.tapped=false;
 log(s,s.active,'turn',`${p.name}の${p.turns}ターン目`);draw(s,s.active,1);
}
function beginEnd(s){const list=s.players[s.active].battle.filter(c=>card(c).endUntap&&c.tapped);if(list.length){s.decision={type:'untap',player:s.active,uids:list.map(x=>x.uid)};}else nextTurn(s);}
function option(kind,label,extra={}){return {kind,label,...extra};}
export function getLegalActions(s){
 if(s.winner!==null)return [];
 let out=[];const d=s.decision,p=d?d.player:s.active,own=s.players[p],opp=s.players[1-p];
 if(d){
  if(d.type==='evolution'){const c=card(d.source);out=evolutionBases(s,p,c).map(base=>option('evolve',`${card(base).name}の上に${c.name}を重ねる`,{uid:d.uid,baseUid:base.uid,cardId:c.id}));out.push(option('cancelEvolution','進化をやめる'));}
  if(d.type==='block'){const a=opp.battle.find(x=>x.uid===s.attack.attacker);out=[option('noBlock','ブロックしない')];if(a&&!card(a).unblockable&&!a.unblocked)for(const c of own.battle)if(card(c).blocker&&!c.tapped)out.push(option('block',`${card(c).name}でブロック`,{uid:c.uid}));}
  if(d.type==='breakChoice')out=combinations(opp.shields.map((c,i)=>({uid:c.uid,index:i+1})),d.count).map(rows=>option('breakShields',`シールド${rows.map(r=>r.index).join('・')}をブレイク`,{shields:rows.map(r=>r.uid)}));
  if(d.type==='triggerOrder')out=s.triggers.declared.map(uid=>{const c=own.hand.find(c=>c.uid===uid);return option('orderTrigger',`${card(c).name}を先に使う`,{uid,cardId:c.cardId});});
  if(d.type==='entryOrder')out=s.triggers.entries.map(e=>option('orderEntry',`${card(e.source).name}の出た時の効果を先に解決`,{uid:e.uid,cardId:e.source}));
  if(d.type==='trigger')out=[option('useTrigger',`${card(d.source).name}を使う`,{uid:d.uid,cardId:d.source}),option('skipTrigger','使わず手札に加える')];
  if(d.type==='draw')out=Array.from({length:d.max+1},(_,n)=>option('draw',n?`${n}枚引く`:'引かない',{n}));
  if(d.type==='optionalRamp')out=[option('useRamp','4枚をマナに置き、2枚を山札に戻す'),option('skipRamp','マナに置かない')];
  if(d.type==='manaTop')out=own.mana.filter(x=>!d.chosen.includes(x.uid)).map(x=>option('manaTop',`山札の上から${d.chosen.length+1}枚目に${card(x).name}を置く（${x.tapped?'タップ中':'アンタップ'}）`,{uid:x.uid,cardId:x.cardId}));
  if(d.type==='search'){out=[option('search','選ばずにシャッフル',{uid:null})];for(const c of own.deck)if(card(c).type==='creature'&&!out.some(a=>a.cardId===c.cardId))out.push(option('search',`${card(c).name}を手札へ`,{uid:c.uid,cardId:c.cardId}));}
  if(d.type==='untap')out=[option('endUntap','アンタップする',{yes:true}),option('endUntap','アンタップしない',{yes:false})];
  if(d.type==='effect'){
   if(d.effect==='tapTwo'){out=[option('effect','選ばない',{targets:[]})];for(let i=0;i<d.targets.length;i++){const a=d.targets[i];out.push(option('effect',`${nameOf(s,a)}をタップ`,{targets:[a]}));for(let j=i+1;j<d.targets.length;j++){const b=d.targets[j];out.push(option('effect',`${nameOf(s,a)}・${nameOf(s,b)}をタップ`,{targets:[a,b]}));}}}
   else out=d.targets.map(t=>option('effect',`${nameOf(s,t)}を選ぶ`,{targets:[t]}));
   if(d.optional)out.push(option('skipEffect','効果を使わない'));
  }
 }else if(s.phase==='charge'){out=own.hand.map(c=>option('charge',`${card(c).name}をマナへ`,{uid:c.uid,cardId:c.cardId}));out.push(option('skipCharge','マナを置かずに進む'));}
 else if(s.phase==='main'){
  out=own.hand.filter(c=>validMana(s,p,card(c))&&(!card(c).evolution||evolutionBases(s,p,card(c)).length)).map(c=>option('play',`${card(c).name}を${card(c).type==='creature'?'召喚':'使用'}`,{uid:c.uid,cardId:c.cardId}));out.push(option('toAttack','攻撃へ進む'));
 }else if(s.phase==='attack'){
  for(const c of own.battle.filter(c=>canAttack(s,p,c))){if(!card(c).noPlayerAttack){if(opp.shields.length&&card(c).breaker)out.push(option('attack',`${card(c).name} → 相手（${Math.min(card(c).breaker,opp.shields.length)}枚ブレイク）`,{uid:c.uid,target:'player'}));else if(opp.shields.length)for(let i=0;i<opp.shields.length;i++)out.push(option('attack',`${card(c).name} → シールド${i+1}`,{uid:c.uid,target:'player',shield:opp.shields[i].uid}));else out.push(option('attack',`${card(c).name}でダイレクトアタック`,{uid:c.uid,target:'player'}));}
   for(const target of opp.battle.filter(x=>x.tapped))out.push(option('attack',`${card(c).name} → ${card(target).name}`,{uid:c.uid,target:target.uid}));
  }
  if(!own.battle.some(c=>card(c).mustAttack&&canAttack(s,p,c)))out.push(option('endTurn','ターン終了'));
 }
 return out.map((a,i)=>({...a,id:i,player:p}));
}
function nameOf(s,t){return card(s.players[t.player].battle.find(x=>x.uid===t.uid)).name;}
export function step(s,action){
 const opts=getLegalActions(s);const a=typeof action==='number'?opts[action]:opts.find(x=>JSON.stringify(x)===JSON.stringify(action));if(!a)throw Error('選択できない行動です');
 const p=a.player,d=s.decision;s.actions++;
 if(a.kind==='charge'){const c=remove(s.players[p].hand,a.uid);c.tapped=civilizations(card(c)).length>1;s.players[p].mana.push(c);s.metrics[p].charges++;s.phase='main';log(s,p,'charge',`${card(c).name}をマナへ`,{cardId:c.cardId});}
 if(a.kind==='skipCharge'){s.phase='main';log(s,p,'skip','マナチャージを省略');}
 if(a.kind==='play'){if(card(a.cardId).evolution)s.decision={type:'evolution',player:p,uid:a.uid,source:a.cardId};else playCard(s,p,a.uid);}
 if(a.kind==='evolve'){s.decision=null;playCard(s,p,a.uid,false,a.baseUid);}
 if(a.kind==='cancelEvolution')s.decision=null;
 if(a.kind==='toAttack'){s.phase='attack';log(s,p,'phase','攻撃ステップへ');}
 if(a.kind==='attack'){const c=s.players[p].battle.find(x=>x.uid===a.uid);c.tapped=true;s.attack={attacker:a.uid,target:a.target,shield:a.shield};log(s,p,'attack',a.label,{cardId:c.cardId});s.decision={type:'block',player:1-p};}
 if(a.kind==='block'||a.kind==='noBlock'){s.decision=null;resolveAttack(s,a.kind==='block'?a.uid:null);}
 if(a.kind==='useTrigger'){s.decision=null;s.triggers.undeclared.shift();s.triggers.declared.push(a.uid);log(s,p,'declare',`${card(d.source).name}のS・トリガーを宣言`,{cardId:d.source});}
 if(a.kind==='skipTrigger'){s.decision=null;s.triggers.undeclared.shift();log(s,p,'skip','S・トリガーを使わない');}
 if(a.kind==='breakShields'){s.decision=null;breakShields(s,d.defender,a.shields);}
 if(a.kind==='orderTrigger'){s.decision=null;s.triggers.declared.splice(s.triggers.declared.indexOf(a.uid),1);playCard(s,p,a.uid,true);}
 if(a.kind==='orderEntry'){s.decision=null;const i=s.triggers.entries.findIndex(e=>e.uid===a.uid),[entry]=s.triggers.entries.splice(i,1);doEffect(s,p,card(entry.source));}
 if(a.kind==='draw'){s.decision=null;if(a.n)draw(s,p,a.n);else log(s,p,'skip','任意のドローを省略');}
 if(a.kind==='useRamp'){s.decision=null;const source=card(d.source);rampTapped(s,p,source,4);chooseManaTop(s,p,source,2);}
 if(a.kind==='skipRamp'){s.decision=null;log(s,p,'skip',`${card(d.source).name}のマナ加速を使わない`,{cardId:d.source});}
 if(a.kind==='manaTop'){
  d.chosen.push(a.uid);
  if(d.chosen.length===d.count){const returned=d.chosen.map(uid=>remove(s.players[p].mana,uid));for(const x of returned){x.tapped=false;x.buff=0;x.unblocked=false;x.entered=0;}s.players[p].deck.unshift(...returned);s.decision=null;log(s,p,'manaTop',`${card(d.source).name}でマナ${returned.length}枚を山札の上へ（順序は非公開）`,{cardId:d.source});}
 }
 if(a.kind==='skipEffect'){s.decision=null;log(s,p,'skip','任意の効果を使わない');}
 if(a.kind==='search'){s.decision=null;if(a.uid){const c=remove(s.players[p].deck,a.uid);s.players[p].hand.push(c);log(s,p,'search',`${card(c).name}を探して手札へ`,{cardId:c.cardId});}s.players[p].deck=shuffled(s.players[p].deck,Math.floor(random(s)*4294967296));deckCheck(s,p);}
 if(a.kind==='effect'){
  s.decision=null;for(const t of a.targets){const c=s.players[t.player].battle.find(x=>x.uid===t.uid);if(!c)continue;
   if(['tap','tapTwo'].includes(d.effect))c.tapped=true;
   if(d.effect==='buff')c.buff+=2000;
   if(d.effect==='unblock')c.unblocked=true;
   if(['bounce','bounceOptional','bounceSmall','bounceBlockers'].includes(d.effect))moveCreature(s,t.player,t.uid,'hand');
   if(['destroy','destroySmall','destroyUntapped'].includes(d.effect))moveCreature(s,t.player,t.uid);
   if(d.effect==='manaRemoval')moveCreature(s,t.player,t.uid,'mana');
   log(s,p,'effect',`${card(d.source).name}：${card(c).name}を選択`,{cardId:d.source});
  }
 }
 if(a.kind==='endTurn')beginEnd(s);
 if(a.kind==='endUntap'){s.decision=null;if(a.yes)for(const c of s.players[p].battle)if(d.uids.includes(c.uid))c.tapped=false;nextTurn(s);}
 advanceTriggers(s);
 return s;
}
// This observation deliberately omits both players' shield identities and deck order,
// and the opponent's hand. The AI receives only this object and its legal choices.
export function observation(s,p){return {active:s.active,turn:s.turn,phase:s.phase,attack:s.attack?{attacker:s.attack.attacker,target:s.attack.target}:null,decision:s.decision?{type:s.decision.type,effect:s.decision.effect}:null,players:s.players.map((x,i)=>({turns:x.turns,battle:x.battle,mana:x.mana,grave:x.grave,hand:i===p?x.hand:x.hand.map(()=>({hidden:true})),shields:x.shields.length,deckCount:x.deck.length}))};}
export function chooseAI(s){
 const acts=getLegalActions(s);if(!acts.length)return null;const p=acts[0].player,v=observation(s,p),me=v.players[p],them=v.players[1-p];
 const find=(who,uid)=>v.players[who].battle.find(x=>x.uid===uid);
 const score=a=>{
  const c=a.cardId?card(a.cardId):null;
  if(a.kind==='charge'){
   const duplicates=me.hand.filter(x=>x.cardId===c.id).length;
   const colors=civilizations(c).filter(v=>!me.mana.some(x=>civilizations(card(x)).includes(v))).length;
   return 50+colors*10+c.cost*1.5+(duplicates>1?4:0)-(c.type==='creature'&&c.cost<=3?10:0);
  }
  if(a.kind==='skipCharge')return me.mana.reduce((n,x)=>n+manaValue(card(x)),0)>=Math.max(7,...me.hand.map(x=>card(x).cost))?100:me.hand.length<=1&&me.mana.length>=4?70:0;
  if(a.kind==='play'){
   if(c.type==='creature')return 30+c.cost*2+(c.effect==='ramp1'&&me.mana.length<6?12:0)+(c.blocker&&them.battle.length>me.battle.length?8:0)+(c.unblockable?7:0)+(c.speedAttacker?8:0);
   if(c.effect==='discard')return them.hand.length?22:0;
   if(c.effect==='ramp2')return me.mana.length<7?20:1;
   if(c.effect==='ramp1')return me.mana.length<7&&me.deckCount>1?23:1;
   if(c.effect==='dragonRamp2')return me.mana.length<9&&me.deckCount>2?36:1;
   if(c.effect==='searchCreature')return me.hand.filter(x=>card(x).type==='creature').length<2?25:0;
   if(c.effect==='drawUpTo3')return me.deckCount>6?32:0;
   if(c.effect==='draw2')return me.deckCount>2?28:0;
   if(c.effect==='discardAll')return them.hand.length?15+them.hand.length*5:0;
   if(['destroy','manaRemoval'].includes(c.effect))return them.battle.length?28:0;
   if(c.effect==='tapAll')return them.battle.length&&me.battle.some(x=>!x.tapped&&(x.entered<v.turn||card(x).speedAttacker||card(x).evolution)&&!card(x).noAttack)?25:0;
   if(c.effect==='bounceSmall')return them.battle.some(x=>card(x).cost<=6)?24:0;
   if(c.effect==='bounce')return them.battle.some(x=>card(x).cost>=3)?24:0;
   if(['tap','tapTwo','teamBuff','buff','unblock'].includes(c.effect))return me.battle.some(x=>!x.tapped&&(x.entered<v.turn||card(x).speedAttacker||card(x).evolution)&&!card(x).noAttack)?15:0;
   if(c.effect==='destroySmall')return them.battle.some(x=>power(x)<=2000)?27:0;
   if(c.effect==='destroyUntapped')return them.battle.some(x=>!x.tapped)?26:0;
   return 1;
  }
  if(a.kind==='evolve'){const base=find(p,a.baseUid);return 30+c.cost*2-(base.tapped?12:0)-card(base).cost;}
  if(a.kind==='cancelEvolution')return -1;
  if(a.kind==='toAttack')return 5;
  if(a.kind==='attack'){
   const x=find(p,a.uid);if(a.target==='player')return 25+(them.shields===0?100:0)+(card(x).unblockable?8:0)-(card(x).blocker&&me.shields===0?20:0);
   const y=find(1-p,a.target);return power(x,true)>power(y)?40+card(y).cost:power(x,true)===power(y)?16:card(x).mustAttack?1:-10;
  }
  if(a.kind==='endTurn')return 0;
  if(a.kind==='block'){const b=find(p,a.uid);const attacker=them.battle.find(x=>x.uid===v.attack?.attacker);return(me.shields===0?100:0)+(attacker&&power(b)>=power(attacker,true)?50:me.shields<=2?20:-2)-card(b).cost*.1;}
  if(a.kind==='noBlock')return 0;
  if(a.kind==='breakShields')return 1;
  if(a.kind==='orderTrigger')return (c.type==='creature'?35:30)+c.cost;
  if(a.kind==='orderEntry')return c.cost;
  if(a.kind==='useTrigger')return 30;
  if(a.kind==='skipTrigger')return 0;
  if(a.kind==='draw')return me.deckCount>a.n+2?a.n*10:-a.n;
  if(a.kind==='search')return a.cardId?20-Math.abs(card(a.cardId).cost-me.mana.length)*2+(card(a.cardId).unblockable?3:0):0;
  if(a.kind==='endUntap')return a.yes?10:0;
  if(a.kind==='useRamp')return me.deckCount>4&&me.mana.length<11?20:-1;
  if(a.kind==='skipRamp')return 0;
  if(a.kind==='manaTop'){
   const x=me.mana.find(x=>x.uid===a.uid),others=me.mana.filter(x=>x.uid!==a.uid),lostColors=civilizations(c).filter(color=>!others.some(y=>civilizations(card(y)).includes(color))).length;
   return(x.tapped?15:0)-lostColors*18+(c.type==='creature'&&c.cost<=me.mana.length?10:0)-(me.hand.some(y=>y.cardId===c.id)?8:0);
  }
  if(a.kind==='effect')return a.targets.reduce((sum,t)=>{const x=find(t.player,t.uid);if(!x)return sum;const e=v.decision.effect;if(['buff','unblock'].includes(e))return sum+(t.player===p&&!x.tapped&&(x.entered<v.turn||card(x).speedAttacker||card(x).evolution)?20:0)+card(x).cost;if(['bounce','bounceOptional','bounceSmall','bounceBlockers'].includes(e)&&t.player===p)return sum-20;return sum+card(x).cost*3+(card(x).blocker?8:0);},0);
  return 0;
 };
 return acts.map(a=>({a,value:score(a)})).sort((a,b)=>b.value-a.value||a.a.id-b.a.id)[0].a;
}
export function runGame(decks,options={}){const s=createGame(decks,options);while(s.winner===null&&s.actions<2500&&s.turn<160){const a=chooseAI(s);if(!a)break;step(s,a);}return s;}
export function runSummary(s){return {seed:s.seed,first:s.first,winner:s.winner,reason:s.reason,turns:s.turn,metrics:s.metrics,actions:s.actions,version:s.version};}
export function aggregate(games){
 const total=games.length,wins=games.filter(g=>g.winner===0).length,losses=games.filter(g=>g.winner===1).length,unresolved=total-wins-losses,completed=wins+losses;
 const rate=completed?wins/completed:0,z=1.96,den=1+z*z/(completed||1),center=(rate+z*z/(2*(completed||1)))/den,half=z*Math.sqrt(rate*(1-rate)/(completed||1)+z*z/(4*(completed||1)**2))/den;
 const groups=[0,1].map(first=>{const gs=games.filter(g=>g.first===first&&g.winner!==null);return {count:gs.length,wins:gs.filter(g=>g.winner===0).length};});
 const cards={};for(const g of games){if(g.winner===null)continue;for(const id of Object.keys(g.metrics[0].earlyPlayed)){const x=cards[id]||={count:0,wins:0};x.count++;if(g.winner===0)x.wins++;}}
 return {total,wins,losses,unresolved,completed,rate,interval:completed?[Math.max(0,center-half),Math.min(1,center+half)]:null,groups,averageTurns:completed?games.filter(g=>g.winner!==null).reduce((n,g)=>n+g.turns,0)/completed:0,earlyCreatures:games.filter(g=>g.metrics[0].firstCreature!==null&&g.metrics[0].firstCreature<=3).length,cards};
}
