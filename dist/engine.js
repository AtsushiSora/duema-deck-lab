// Supported-card rules engine. No strength-based or precomputed win rates.
export const RULE_VERSION='総合ルール 1.53 / 対応カード版 0.11';
export const ENGINE_VERSION='0.11.0';
const EFFECTS=new Set(['ramp1','ramp2','discard','teamBuff','optionalDraw','drawUpTo3','searchCreature','tap','tapTwo','buff','unblock','bounce','destroySmall','destroyUntapped','draw2','destroy','manaRemoval','tapAll','discardAll','bounceOptional','bounceSmall','bounceBlockers','dragonRamp2','ramp2Return1','optionalRamp4Return2','purgeNonDragonMana','fightOptional','destroyWeakerLimitNextTurn','shieldTop1']);
let catalogue=new Map();
export function setCards(cards){for(const c of cards){if(c.effect&&!EFFECTS.has(c.effect))throw Error('未実装の効果です：'+c.effect);if(c.breaker!=null&&![2,3].includes(c.breaker))throw Error('未実装のブレイカーです');if(c.evolution&&c.exLife)throw Error('進化EXライフは未対応です');if(c.evolution&&c.trigger)throw Error('進化S・トリガーは未対応です');if(c.costReduction&&!['opponentMulticolorMana3','ownFourDragonsMana3','ownFiveLightFireMana3'].includes(c.costReduction))throw Error('未実装のコスト軽減です');for(const key of ['dragonEntryTap','attackDragonReveal','exLife','zRush','shieldEntryTapLock','soulShieldGuard','attackJudge'])if(c[key]!=null&&c[key]!==true)throw Error('未実装の能力です：'+key);}for(const c of cards)if(c.hyper&&(!c.zRush||JSON.stringify(c.hyper)!==JSON.stringify({power:7500,blocker:true,breaker:2,spellLockMaxCost:5})))throw Error('未実装のハイパーモードです');for(const c of cards)if(c.spellFace&&(!c.attackJudge||c.spellFace.type!=='spell'||c.spellFace.effect!=='judgeDraw'||c.spellFace.charger!==true||c.spellFace.cost!==3||c.spellFace.civ!=='火'))throw Error('未実装のツインパクトです');catalogue=new Map(cards.map(c=>[c.id,c]));}
export const card=id=>catalogue.get(typeof id==='string'?id:id.cardId);
// Hyper abilities exist only on an unlocked top creature in the battle zone.
export function effectiveCard(inst,context){const c=card(inst);return c.hyper&&inst.hyperActive&&context?.players.some(p=>p.battle.some(x=>x.uid===inst.uid))?{...c,...c.hyper}:c;}
export const playFaces=c=>c.spellFace?[c,{id:c.id,limit:c.limit,...c.spellFace}]:[c];
export function canCastSpell(s,p,c){return c.type!=='spell'||!s.players[1-p].battle.some(x=>c.cost<=(effectiveCard(x,s).spellLockMaxCost??-1));}
export const canUntap=c=>!c.tapLocks?.length;
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
const layers=c=>[c,...(c.under||[]).flatMap(layers)];
// Only the marked soul ability transfers; entry effects and other base abilities do not.
export function shieldGuardSources(s,p){return s.players[p].battle.filter(c=>c.under?.length&&layers(c).some(x=>card(x).soulShieldGuard));}
function shieldGuardChoices(s){const b=s.shieldBreak;return shieldGuardSources(s,b.player).filter(c=>!b.protections.some(x=>x.uid===c.uid));}
function recordLastPower(s,p,c,leaving){
 for(const e of [...(s.pendingEffects||[]),...(s.triggers?.entries||[])])if(e.player===p&&leaving.some(x=>x.uid===e.uid&&(x.incarnation||0)===(e.incarnation||0)))e.lastKnownPower=power(c,c.uid===s.attack?.attacker,s);
}
function clearBattleState(x,to='grave'){delete x.under;delete x.exLifeShieldUid;delete x.hyperActive;delete x.tapLocks;x.tapped=to==='mana'&&civilizations(card(x)).length>1;x.buff=0;x.unblocked=false;x.entered=0;}
function finishShieldGuards(s){
 const b=s.shieldBreak,p=b.player,protectedShields=new Set(b.protections.map(x=>x.shield));
 const remaining=b.uids.filter(uid=>!protectedShields.has(uid));
 // Each reserved stack pays for exactly one shield. All choices precede all moves (609.9).
 const batch=b.protections.map(row=>{const c=s.players[p].battle.find(x=>x.uid===row.uid);return {c,cards:(c.under||[]).flatMap(layers)};});
 for(const {c,cards}of batch)recordLastPower(s,p,c,cards);
 for(const {c,cards}of batch){delete c.under;for(const x of cards)clearBattleState(x);s.players[p].grave.push(...cards);log(s,p,'shieldGuard',`${card(c).name}の下のカード${cards.length}枚をすべて墓地へ置き、シールド1つを残す`,{cardId:c.cardId});}
 s.shieldBreak=null;s.decision=null;
 if(remaining.length)commitShieldBreak(s,p,remaining);
}

export function exLifeShields(s,p,c){return card(c).exLife?s.players[p].shields.filter(x=>x.uid===c.exLifeShieldUid):[];}
export function exLifeShieldInfo(s,p,uid){
 for(const top of s.players[p].battle)for(const source of layers(top))if(source.exLifeShieldUid===uid&&s.players[p].shields.some(x=>x.uid===uid))return {sourceUid:source.uid,sourceCardId:source.cardId,active:top===source&&!!card(top).exLife};
 return null;
}
function removeShield(s,p,uid){
 const x=remove(s.players[p].shields,uid);
 if(x){
  for(const top of s.players[p].battle)for(const c of layers(top))if(c.exLifeShieldUid===uid)delete c.exLifeShieldUid;
  // Z rush is continuous and applies immediately, including replacement moves.
  for(const who of [0,1])for(const c of s.players[who].battle)if(card(c).zRush){if(!c.hyperActive)log(s,who,'hyper',`${card(c).name}のZラッシュでハイパーモードを解放`,{cardId:c.cardId});c.hyperActive=true;}
 }
 return x;
}
function shieldTop(s,p,source,exLifeSource=null){
 const own=s.players[p],shield=own.deck.shift();
 if(shield){own.shields.push(shield);if(exLifeSource)exLifeSource.exLifeShieldUid=shield.uid;
  log(s,p,exLifeSource?'exLifeAdd':'shieldAdd',`${source.name}${exLifeSource?'のEXライフ':''}で山札の上から1枚をシールド化（内容は非公開）`,{cardId:source.id});
  for(const c of own.battle)if(card(c).shieldEntryTapLock)enqueueEffect(s,p,{uid:c.uid,source:c.cardId,effect:'shieldEntryTapLock'});
 }
 deckCheck(s,p);
}
export function canEnterCreature(s,p){const own=s.players[p];return !own.entryLimitThisTurn||(own.enteredThisTurn||0)<1;}
function limitNextTurn(s,p,source){s.players[1-p].entryLimitNextTurn=true;log(s,p,'entryLimit',`${source.name}：次の相手のターン、相手が出せるクリーチャーは1体まで`,{cardId:source.id});}
export const civilizations=c=>c.civilizations||String(c.civ).split('/');
export const manaValue=c=>c.manaValue??(civilizations(c).length===5?0:1);
export const isDragon=c=>c.type==='creature'&&String(c.race).includes('ドラゴン');
export function physicalCards(s){const flatten=c=>[c,...(c.under||[]).flatMap(flatten)];return [...s.players.flatMap(p=>['deck','hand','shields','mana','battle','grave'].flatMap(z=>p[z].flatMap(flatten))),...(s.resolvingSpell?flatten(s.resolvingSpell.inst):[])];}
function moveCreature(s,p,uid,to='grave'){
 const c=s.players[p].battle.find(x=>x.uid===uid);if(!c)return;
 const shield=exLifeShields(s,p,c)[0];
 // A shield move produced by EX life is already replaced; shield guards cannot chain (101.5).
 if(shield){s.players[p].grave.push(removeShield(s,p,shield.uid));log(s,p,'exLifeReplace',`${card(c).name}はEXライフのシールドを墓地に置いてバトルゾーンに残る`,{cardId:c.cardId});return;}
 // Record the last public power before leaving, including an evolved top (605.2e).
 recordLastPower(s,p,c,layers(c));
 remove(s.players[p].battle,uid);
 if(s.attack&&(s.attack.attacker===uid||s.attack.target===uid))s.attack=null;
 const target=to==='grave'&&card(c).death?card(c).death:to;
 const flatten=x=>[x,...(x.under||[]).flatMap(flatten)],cards=flatten(c);
 for(const x of cards)clearBattleState(x,target);
 s.players[p][target].push(...cards);
 log(s,p,'leave',`${card(c).name}${cards.length>1?`と進化元${cards.length-1}枚`:''}が${{grave:'墓地',hand:'手札',mana:'マナ'}[target]}へ移動`,{cardId:c.cardId});
}
function matchesEvolution(base,condition,context){
 const c=effectiveCard(base,context),races=String(c.race).split('/');
 if(condition.any)return condition.any.some(x=>matchesEvolution(base,x,context));
 if(condition.race)return races.includes(condition.race);
 if(condition.category)return races.some(r=>r.includes(condition.category));
 if(condition.civilization)return civilizations(c).includes(condition.civilization);
 if(condition.blocker)return !!c.blocker;
 return false;
}
export function evolutionBases(s,p,c){return c.evolution?s.players[p].battle.filter(x=>matchesEvolution(x,c.evolution,s)):[];}
export function power(c,attacking=false,context=null){
 const data=effectiveCard(c,context),owner=data.ownTurnBonus&&context?context.players.findIndex(p=>p.battle.some(x=>x.uid===c.uid)):-1;
 return data.power+(attacking?(data.attackBonus||0)+(c.buff||0):0)+(owner>=0&&context.active===owner?data.ownTurnBonus:0);
}
function canAttack(s,p,c){return !c.tapped&&!card(c).noAttack&&(c.entered<s.turn||card(c).speedAttacker||card(c).evolution);}
function targets(s,p,effect){
 const own=s.players[p],opp=s.players[1-p];
 if(['buff','unblock'].includes(effect))return own.battle.map(x=>({player:p,uid:x.uid}));
 if(['bounce','bounceOptional','bounceSmall','bounceBlockers'].includes(effect))return [p,1-p].flatMap(player=>s.players[player].battle.filter(x=>effect!=='bounceSmall'||card(x).cost<=6).map(x=>({player,uid:x.uid})));
 return opp.battle.filter(x=>effect!=='destroyUntapped'||!x.tapped).filter(x=>effect!=='destroySmall'||power(x,x.uid===s.attack?.attacker,s)<=2000).map(x=>({player:1-p,uid:x.uid}));
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
// Printed cost remains unchanged for all references, searches, and card details (201.2a).
export function summonCost(s,p,c){
 const reduce=c.type==='creature'&&((c.costReduction==='opponentMulticolorMana3'&&s.players[1-p].mana.some(x=>civilizations(card(x)).length>1))||(c.costReduction==='ownFourDragonsMana3'&&s.players[p].mana.filter(x=>isDragon(card(x))).length>=4)||(c.costReduction==='ownFiveLightFireMana3'&&s.players[p].mana.filter(x=>civilizations(card(x)).some(v=>v==='光'||v==='火')).length>=5));
 return Math.max(1,c.cost-(reduce?3:0));
}
function validMana(s,p,c){return manaPayment(s.players[p].mana,{...c,cost:summonCost(s,p,c)})!==null;}
function pay(s,p,c){const ids=manaPayment(s.players[p].mana,{...c,cost:summonCost(s,p,c)});if(!ids)throw Error('必要な文明・マナが足りません');for(const x of s.players[p].mana)if(ids.includes(x.uid))x.tapped=true;}
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
function doEffect(s,p,c,sourceUid=null,entry=null){
 const e=c.effect;if(!e)return;
 if(e==='destroyWeakerLimitNextTurn'){
  const source=s.players[p].battle.find(top=>layers(top).some(x=>x.uid===sourceUid&&(x.incarnation||0)===(entry?.incarnation||0))),max=source?power(source,source.uid===s.attack?.attacker,s):entry?.lastKnownPower??c.power;
  const ts=s.players[1-p].battle.filter(x=>power(x,x.uid===s.attack?.attacker,s)<max).map(x=>({player:1-p,uid:x.uid}));
  if(ts.length)s.decision={type:'effect',player:p,effect:e,source:c.id,targets:ts,limitAfter:true};else limitNextTurn(s,p,c);
  return;
 }
 if(e==='shieldTop1'){shieldTop(s,p,c);return;}
 if(e==='fightOptional'){if(s.players[p].battle.some(x=>x.uid===sourceUid)&&s.players[1-p].battle.length)s.decision={type:'fight',player:p,source:c.id,uid:sourceUid};return;}
 if(e==='dragonRamp2'){rampTapped(s,p,c,2,true);return;}
 if(e==='ramp2Return1'){rampTapped(s,p,c,2);chooseManaTop(s,p,c,1);return;}
 if(e==='optionalRamp4Return2'){s.decision={type:'optionalRamp',player:p,source:c.id};return;}
 if(e==='purgeNonDragonMana'){
  for(const who of [0,1]){const own=s.players[who],removed=own.mana.filter(x=>!isDragon(card(x)));own.mana=own.mana.filter(x=>isDragon(card(x)));for(const x of removed){x.tapped=false;x.buff=0;x.unblocked=false;x.entered=0;}own.grave.push(...removed);log(s,who,'manaLeave',`${c.name}でドラゴン以外のマナ${removed.length}枚を墓地へ`,{cardId:c.id});}return;
 }
 if(e==='bounceBlockers'){const batch=[0,1].flatMap(who=>s.players[who].battle.filter(x=>effectiveCard(x,s).blocker).map(x=>({who,uid:x.uid})));for(const x of batch)moveCreature(s,x.who,x.uid,'hand');return;}
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
function enqueueEffect(s,p,entry){
 const queue=s.triggers?s.triggers.entries:(s.pendingEffects??=[]);
 queue.push({...entry,player:p,effectId:s.effectSerial=(s.effectSerial||0)+1});
}
// Check all entry triggers after the new top card has entered (603.5a).
function enterCreature(s,p,inst,baseUid=null){
 if(!canEnterCreature(s,p))throw Error('このターンはクリーチャーを1体しか出せません');
 const c=card(inst);inst.entered=s.turn;inst.tapped=false;inst.incarnation=(inst.incarnation||0)+1;
 if(c.evolution){const base=s.players[p].battle.find(x=>x.uid===baseUid);if(!base||!matchesEvolution(base,c.evolution,s))throw Error('進化元が正しくありません');remove(s.players[p].battle,baseUid);inst.under=[base];inst.tapped=base.tapped;inst.buff=base.buff||0;inst.unblocked=base.unblocked||false;if(base.tapLocks)inst.tapLocks=[...base.tapLocks];
  if(s.attack?.attacker===baseUid)s.attack.attacker=inst.uid;
  if(s.attack?.target===baseUid)s.attack.target=inst.uid;
  log(s,p,'evolve',`${card(base).name}から${c.name}へ進化`,{cardId:c.id});
 }
 s.players[p].battle.push(inst);if(s.metrics[p].firstCreature===null)s.metrics[p].firstCreature=s.players[p].turns;
 s.players[p].enteredThisTurn=(s.players[p].enteredThisTurn||0)+1;
 if(c.exLife){shieldTop(s,p,c,inst);if(s.winner!==null)return;}
 if(c.effect)enqueueEffect(s,p,{uid:inst.uid,incarnation:inst.incarnation,lastKnownPower:power(inst,false,s),source:c.id,effect:'entry'});
 if(isDragon(c))for(const x of s.players[p].battle)if(card(x).dragonEntryTap){const key=x.uid+'@'+(x.incarnation||0);if(s.once?.[key]!==s.turn)enqueueEffect(s,p,{uid:x.uid,source:x.cardId,effect:'dragonEntryTap',key});}
}
function resolveEntry(s,entry){
 const p=entry.player;
 if(entry.effect==='shieldEntryTapLock'){
  const ts=targets(s,p,'tap');if(ts.length)s.decision={type:'effect',player:p,effect:'shieldEntryTapLock',source:entry.source,targets:ts};
 }else if(entry.effect==='dragonEntryTap'){
  if(s.once?.[entry.key]!==s.turn&&s.players[1-p].battle.length)s.decision={type:'dragonTap',player:p,source:entry.source,key:entry.key};
 }else doEffect(s,p,card(entry.source),entry.uid,entry);
}
function availableEffects(s,queue){return queue.filter(e=>e.effect!=='dragonEntryTap'||s.once?.[e.key]!==s.turn);}
function advanceEffects(s){
 while(s.pendingEffects?.length&&!s.decision&&s.winner===null){
  s.pendingEffects=availableEffects(s,s.pendingEffects);if(!s.pendingEffects.length)return;
  const p=s.pendingEffects.some(e=>e.player===s.active)?s.active:1-s.active,entries=s.pendingEffects.filter(e=>e.player===p);
  if(entries.length>1){s.decision={type:'effectOrder',player:p};return;}
  s.pendingEffects.splice(s.pendingEffects.indexOf(entries[0]),1);resolveEntry(s,entries[0]);advanceBattle(s);
 }
}
function playCard(s,p,uid,free=false,baseUid=null,face=0){
 const source=s.players[p].hand.find(x=>x.uid===uid),c=source&&playFaces(card(source))[face];if(!c||!canCastSpell(s,p,c))throw Error('このカードは使えません');
 const inst=remove(s.players[p].hand,uid),cost=summonCost(s,p,c);if(!free)pay(s,p,c);
 const met=s.metrics[p];met.played[c.id]=(met.played[c.id]||0)+1;if(s.players[p].turns<=3)met.earlyPlayed[c.id]=true;if(free)met.triggers++;
 log(s,p,free?'trigger':'play',`${c.name}を${free?'S・トリガーで':''}${c.type==='creature'?'召喚':'使用'}${!free&&cost!==c.cost?`（支払い${cost}マナ / 元のコスト${c.cost}）`:''}`,{cardId:c.id});
 if(c.type==='creature')enterCreature(s,p,inst,baseUid);
 else if(c.charger){s.resolvingSpell={player:p,inst,source:c.id,face,origin:'hand'};startJudge(s,p,c.id,inst.uid,'spell');}
 else{s.players[p].grave.push(inst);doEffect(s,p,c,inst.uid);}
}
// The revealed card remains in its library until an actual move succeeds.
function revealDragon(s,p,c){
 const own=s.players[p],top=own.deck[0];if(!top){deckCheck(s,p);return;}
 const data=card(top);log(s,p,'reveal',`${c.name}で山札の上を公開：${data.name}`,{cardId:data.id});
 if(!isDragon(data)){own.grave.push(own.deck.shift());log(s,p,'revealMove',`${data.name}はドラゴンではないため墓地へ`,{cardId:data.id});deckCheck(s,p);return;}
 if(!canEnterCreature(s,p)){log(s,p,'revealStay',`${data.name}はこのターンの登場制限により山札の上に残る`,{cardId:data.id});return;}
 if(data.evolution){
  if(evolutionBases(s,p,data).length)s.decision={type:'revealEvolution',player:p,uid:top.uid,source:data.id};
  else log(s,p,'revealStay',`${data.name}は進化元がないため山札の上に残る`,{cardId:data.id});
  return;
 }
 enterRevealed(s,p,top.uid);
}
function enterRevealed(s,p,uid,baseUid=null){
 const inst=remove(s.players[p].deck,uid);
 const met=s.metrics[p];met.played[inst.cardId]=(met.played[inst.cardId]||0)+1;if(s.players[p].turns<=3)met.earlyPlayed[inst.cardId]=true;
 log(s,p,'enter',`${card(inst).name}を山札からバトルゾーンへ出す（召喚ではない）`,{cardId:inst.cardId});enterCreature(s,p,inst,baseUid);deckCheck(s,p);
}
function finishCharger(s){
 const r=s.resolvingSpell;if(!r||s.winner!==null)return;
 const c=playFaces(card(r.source))[r.face];clearBattleState(r.inst,'mana');s.players[r.player].mana.push(r.inst);s.resolvingSpell=null;
 log(s,r.player,'charger',`${c.name}をチャージャーでマナへ（${r.inst.tapped?'タップ':'アンタップ'}）`,{cardId:r.source,face:r.face});
}
function startJudge(s,p,source,uid,mode){s.judge={player:p,source,uid,mode,wins:0,round:0};judgeRound(s);}
function judgeRound(s){
 const j=s.judge;j.round++;j.stage='compare';j.revealed=s.players.map(p=>p.deck[0]?{uid:p.deck[0].uid,cardId:p.deck[0].cardId}:null);
 for(const who of [0,1])if(!j.revealed[who]){deckCheck(s,who);return;}
 j.costs=j.revealed.map(x=>{const costs=[...new Set(playFaces(card(x)).map(c=>c.cost))];return costs.length===1?costs[0]:null;});
 log(s,j.player,'judgeReveal',`ガチンコ・ジャッジ${j.round}回目：${j.revealed.map((x,i)=>`${s.players[i].name}は${card(x).name}`).join(' / ')}を公開`,{cardId:j.source});
 advanceJudgeCosts(s);
}
function advanceJudgeCosts(s){
 const j=s.judge;if(!j||j.stage!=='compare'||s.winner!==null)return;
 for(const who of [s.active,1-s.active])if(j.costs[who]===null){s.decision={type:'judgeCost',player:who,source:j.revealed[who].cardId};return;}
 // The two cards rotate directly within their libraries; a one-card library never becomes empty.
 for(const who of [0,1]){const x=s.players[who].deck.shift();s.players[who].deck.push(x);}
 const won=j.costs[j.player]>=j.costs[1-j.player];
 log(s,j.player,'judgeResult',`ガチンコ・ジャッジ：${j.costs[j.player]} 対 ${j.costs[1-j.player]}、${won?'勝ち':'負け'}`,{cardId:j.source});
 s.decision=null;
 if(j.mode==='spell'){s.judge=null;if(won)draw(s,j.player,1);finishCharger(s);return;}
 if(won){j.wins++;s.decision={type:'judgeContinue',player:j.player};}
 else beginJudgeBreaks(s);
}
function beginJudgeBreaks(s){const j=s.judge;j.stage='breaks';j.remaining=j.wins;s.decision=null;}
function advanceJudgeBreaks(s){
 const j=s.judge;if(!j||j.stage!=='breaks'||s.decision||s.triggers||s.pendingEffects?.length||s.battleResolution||s.winner!==null)return;
 if(j.remaining&&s.players[1-j.player].shields.length){s.decision={type:'judgeBreak',player:j.player};return;}
 s.judge=null;
}
function advanceAttack(s){
 if(!s.attack||s.attack.stage!=='effects'||s.decision||s.winner!==null||s.pendingEffects?.length||s.triggers||s.battleResolution||s.judge)return;
 s.attack.stage='block';s.decision={type:'block',player:1-s.active};
}
function battle(s,pa,a,pd,b,attackingUid=null){
 const ap=power(a,a.uid===attackingUid,s),bp=power(b,b.uid===attackingUid,s),late=[];
 if(card(a).slayer)late.push({controller:pa,player:pd,uid:b.uid,source:a.cardId});
 if(card(b).slayer)late.push({controller:pd,player:pa,uid:a.uid,source:b.cardId});
 if(card(a).afterBattleDie)late.push({controller:pa,player:pa,uid:a.uid,source:a.cardId});
 if(card(b).afterBattleDie)late.push({controller:pd,player:pd,uid:b.uid,source:b.cardId});
 log(s,pa,'battle',`${card(a).name}(${ap}) 対 ${card(b).name}(${bp})`);
 if(ap<=bp)moveCreature(s,pa,a.uid);if(bp<=ap)moveCreature(s,pd,b.uid);
 const winner=ap>bp?pa:bp>ap?pd:null;
 const wins=winner===null?[]:s.players[winner].battle.filter(x=>card(x).battleWinDraw).map(x=>({player:winner,uid:x.uid,source:x.cardId}));
 s.battleResolution={wins,late:late.sort((x,y)=>Number(y.controller===s.active)-Number(x.controller===s.active))};
}
// Resolve battle-result triggers before Slayer and other "after the battle" effects (115.3d).
function advanceBattle(s){
 while(s.battleResolution&&!s.decision&&s.winner===null){
  const r=s.battleResolution;
  if(r.wins.length>1){s.decision={type:'battleWinOrder',player:r.wins[0].player};return;}
  if(r.wins.length){const e=r.wins.shift();s.decision={type:'draw',player:e.player,max:1,source:e.source,reason:'battleWin'};return;}
  for(const e of r.late)if(s.players[e.player].battle.some(x=>x.uid===e.uid)){log(s,e.controller,'afterBattle',`${card(e.source).name}のバトルの後の効果`,{cardId:e.source});moveCreature(s,e.player,e.uid);}
  s.battleResolution=null;
 }
}
function resolveAttack(s,blockUid){
 const a=s.players[s.active].battle.find(x=>x.uid===s.attack.attacker),other=1-s.active;
 if(!a){s.attack=null;return;}
 if(blockUid){const b=s.players[other].battle.find(x=>x.uid===blockUid);b.tapped=true;log(s,other,'block',`${card(b).name}でブロック`,{cardId:b.cardId});battle(s,s.active,a,other,b,a.uid);}
 else if(s.attack.target!=='player'){const b=s.players[other].battle.find(x=>x.uid===s.attack.target);if(b)battle(s,s.active,a,other,b,a.uid);}
 else if(!s.players[other].shields.length)finish(s,s.active,'ダイレクトアタックが成立');
 else{
  const shields=s.players[other].shields,n=Math.min(effectiveCard(a,s).breaker||1,shields.length);
  if(n===shields.length)breakShields(s,other,shields.map(c=>c.uid));
  else if(n===1){if(s.attack.shield&&!shields.some(x=>x.uid===s.attack.shield)&&shields.length>1)s.decision={type:'breakChoice',player:s.active,defender:other,count:1};else breakShields(s,other,[shields.some(x=>x.uid===s.attack.shield)?s.attack.shield:shields[0].uid]);}
  else s.decision={type:'breakChoice',player:s.active,defender:other,count:n};
 }
 s.attack=null;
}
// Rule 509.5: selected shields leave together. Declare every trigger before executing any.
function breakShields(s,defender,uids){
 if(shieldGuardSources(s,defender).length){s.shieldBreak={player:defender,uids:[...uids],protections:[]};s.decision={type:'shieldGuard',player:defender};return;}
 commitShieldBreak(s,defender,uids);
}
function commitShieldBreak(s,defender,uids){
 // Declaration eligibility is captured BEFORE the shields leave (official QA 48474).
 const eligible=uids.filter(uid=>{const x=s.players[defender].shields.find(c=>c.uid===uid);return x&&card(x).trigger&&canCastSpell(s,defender,card(x));});
 const broken=uids.map(uid=>removeShield(s,defender,uid)).filter(Boolean);
 s.players[defender].hand.push(...broken);s.metrics[s.active].breaks+=broken.length;
 log(s,s.active,'break',`シールドを${broken.length}枚同時にブレイク（残り${s.players[defender].shields.length}枚）`);
 if(eligible.length)s.triggers={player:defender,undeclared:eligible,declared:[],entries:[]};
}
// Rule 112.3a: spell triggers finish first; creature entry effects wait until all triggers finish.
function advanceTriggers(s){
 while(s.triggers&&!s.decision&&s.winner===null){
  const t=s.triggers,p=t.player;
  if(t.undeclared.length){const c=s.players[p].hand.find(c=>c.uid===t.undeclared[0]);s.decision={type:'trigger',player:p,uid:c.uid,source:c.cardId};return;}
  if(!canEnterCreature(s,p))t.declared=t.declared.filter(uid=>{const x=s.players[p].hand.find(c=>c.uid===uid);if(card(x).type!=='creature')return true;log(s,p,'entryPrevented',`${card(x).name}は登場制限により召喚できず手札に残る`,{cardId:x.cardId});return false;});
  const usable=t.declared.filter(uid=>canCastSpell(s,p,card(s.players[p].hand.find(x=>x.uid===uid))));
  if(usable.length>1){s.decision={type:'triggerOrder',player:p};return;}
  if(usable.length){const uid=usable[0];t.declared.splice(t.declared.indexOf(uid),1);playCard(s,p,uid,true);continue;}
  for(const uid of t.declared){const c=card(s.players[p].hand.find(x=>x.uid===uid));log(s,p,'spellPrevented',`${c.name}は呪文の使用制限により唱えられず手札に残る`,{cardId:c.id});}t.declared=[];
  t.entries=availableEffects(s,t.entries);
  if(t.entries.length>1){s.decision={type:'entryOrder',player:p};return;}
  if(t.entries.length){resolveEntry(s,t.entries.shift());advanceBattle(s);continue;}
  s.triggers=null;
 }
}
function combinations(items,n){if(n===0)return [[]];if(n>items.length)return [];return items.flatMap((x,i)=>combinations(items.slice(i+1),n-1).map(rest=>[x,...rest]));}

function nextTurn(s){
 for(const p of s.players){p.enteredThisTurn=0;p.entryLimitThisTurn=false;for(const c of p.battle){c.buff=0;c.unblocked=false;}}
 s.active=1-s.active;s.turn++;s.phase='charge';const p=s.players[s.active];p.turns++;s.metrics[s.active].turns=p.turns;
 // Expire effects at the specified controller's turn start, before untapping.
 for(const own of s.players)for(const top of own.battle)for(const c of layers(top)){if(c.tapLocks)c.tapLocks=c.tapLocks.filter(who=>who!==s.active);}
 for(const top of p.battle)for(const c of layers(top))delete c.hyperActive;
 for(const c of [...p.mana,...p.battle])if(canUntap(c))c.tapped=false;
 p.entryLimitThisTurn=!!p.entryLimitNextTurn;p.entryLimitNextTurn=false;
 log(s,s.active,'turn',`${p.name}の${p.turns}ターン目`);draw(s,s.active,1);
}
function beginEnd(s){const list=s.players[s.active].battle.filter(c=>card(c).endUntap&&c.tapped&&canUntap(c));if(list.length){s.decision={type:'untap',player:s.active,uids:list.map(x=>x.uid)};}else nextTurn(s);}
function option(kind,label,extra={}){return {kind,label,...extra};}
function effectOptions(entries,kind){return entries.map((e,i)=>option(kind,`${card(e.source).name} ${i+1}：${e.effect==='dragonEntryTap'?'ドラゴン登場時の任意タップ':e.effect==='shieldEntryTapLock'?'シールド追加時のタップとアンタップ制限':'出た時の効果'}を先に解決`,{uid:e.uid,cardId:e.source,effectId:e.effectId}));}
export function getLegalActions(s){
 if(s.winner!==null)return [];
 let out=[];const d=s.decision,p=d?d.player:s.active,own=s.players[p],opp=s.players[1-p];
 if(d){
  if(d.type==='evolution'){const c=card(d.source);out=evolutionBases(s,p,c).map(base=>option('evolve',`${card(base).name}の上に${c.name}を重ねる`,{uid:d.uid,baseUid:base.uid,cardId:c.id}));out.push(option('cancelEvolution','進化をやめる'));}
  if(d.type==='revealEvolution'){const c=card(d.source);out=evolutionBases(s,p,c).map(base=>option('revealEvolve',`${card(base).name}の上に公開した${c.name}を重ねる`,{uid:d.uid,baseUid:base.uid,cardId:c.id}));}
  if(d.type==='judgeCost')out=playFaces(card(d.source)).map((c,face)=>option('judgeCost',`${c.name}のコスト${c.cost}を参照`,{face,cost:c.cost,cardId:d.source}));
  if(d.type==='judgeContinue')out=[option('judgeAgain',`もう一度ガチンコ・ジャッジ（現在${s.judge.wins}勝）`),option('stopJudge',`${s.judge.wins}勝で中止し、ブレイクへ進む`)];
  if(d.type==='judgeBreak')out=opp.shields.map((x,i)=>{const ex=!!exLifeShieldInfo(s,1-p,x.uid)?.active;return option('judgeBreak',`効果でシールド${i+1}${ex?'（EXライフ）':''}を1つブレイク（残り${s.judge.remaining}回）`,{shield:x.uid,exLifeHit:ex});});
  if(d.type==='shieldGuard'){
   const b=s.shieldBreak,remaining=b.uids.filter(uid=>!b.protections.some(x=>x.shield===uid));
   out=shieldGuardChoices(s).flatMap(c=>remaining.map(shield=>{const i=own.shields.findIndex(x=>x.uid===shield)+1,ex=!!exLifeShieldInfo(s,p,shield)?.active;return option('guardShield',`${card(c).name}の下の${layers(c).length-1}枚をすべて墓地へ置き、シールド${i}${ex?'（EXライフ）':''}を残す`,{uid:c.uid,cardId:c.cardId,shield,exLifeHit:ex});}));
   out.push(option('finishShieldGuards',b.protections.length?'選択を確定し、残りはブレイクする':'置き換えずにブレイクする'));
  }
  if(d.type==='block'){const a=opp.battle.find(x=>x.uid===s.attack.attacker);out=[option('noBlock','ブロックしない')];if(a&&!card(a).unblockable&&!a.unblocked)for(const c of own.battle)if(effectiveCard(c,s).blocker&&!c.tapped)out.push(option('block',`${card(c).name}でブロック`,{uid:c.uid}));}
  if(d.type==='breakChoice')out=combinations(opp.shields.map((c,i)=>({uid:c.uid,index:i+1,ex:!!exLifeShieldInfo(s,1-p,c.uid)?.active})),d.count).map(rows=>option('breakShields',`シールド${rows.map(r=>r.index+(r.ex?'（EXライフ）':'')).join('・')}をブレイク`,{shields:rows.map(r=>r.uid),exLifeHits:rows.filter(r=>r.ex).length}));
  if(d.type==='triggerOrder')out=s.triggers.declared.filter(uid=>canCastSpell(s,p,card(own.hand.find(c=>c.uid===uid)))).map(uid=>{const c=own.hand.find(c=>c.uid===uid);return option('orderTrigger',`${card(c).name}を先に使う`,{uid,cardId:c.cardId});});
  if(d.type==='entryOrder')out=effectOptions(s.triggers.entries,'orderEntry');
  if(d.type==='effectOrder')out=effectOptions(s.pendingEffects.filter(e=>e.player===p),'orderEffect');
  if(d.type==='dragonTap'){out=opp.battle.map(x=>option('dragonTap',`${card(x).name}をタップ${x.tapped?'（タップ中）':''}`,{uid:x.uid,cardId:x.cardId}));out.push(option('skipDragonTap','今回はタップせず、次の登場時に使えるようにする'));}
  if(d.type==='trigger')out=[option('useTrigger',`${card(d.source).name}を使う`,{uid:d.uid,cardId:d.source}),option('skipTrigger','使わず手札に加える')];
  if(d.type==='fight'){out=own.battle.some(x=>x.uid===d.uid)?opp.battle.map(x=>option('fight',`${card(x).name}とバトル（相手のパワー${power(x,x.uid===s.attack?.attacker,s)}）`,{uid:d.uid,target:x.uid,cardId:x.cardId})):[];out.push(option('skipFight','バトルさせない'));}
  if(d.type==='battleWinOrder')out=s.battleResolution.wins.map((e,i)=>option('battleWinOrder',`${card(e.source).name} ${i+1}体目の勝利時ドローを先に解決`,{uid:e.uid,cardId:e.source}));
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
  out=own.hand.flatMap(inst=>playFaces(card(inst)).flatMap((c,face)=>canCastSpell(s,p,c)&&(c.type!=='creature'||canEnterCreature(s,p))&&validMana(s,p,c)&&(!c.evolution||evolutionBases(s,p,c).length)?[option('play',`${c.name}を${c.type==='creature'?'召喚':'使用'}`,{uid:inst.uid,cardId:inst.cardId,cost:summonCost(s,p,c),...(card(inst).spellFace?{face}:{})})]:[]));out.push(option('toAttack','攻撃へ進む'));
 }else if(s.phase==='attack'){
  for(const c of own.battle.filter(c=>canAttack(s,p,c))){if(!card(c).noPlayerAttack){if(opp.shields.length&&effectiveCard(c,s).breaker)out.push(option('attack',`${card(c).name} → 相手（${Math.min(effectiveCard(c,s).breaker,opp.shields.length)}枚ブレイク）`,{uid:c.uid,target:'player'}));else if(opp.shields.length)for(let i=0;i<opp.shields.length;i++){const ex=!!exLifeShieldInfo(s,1-p,opp.shields[i].uid)?.active;out.push(option('attack',`${card(c).name} → シールド${i+1}${ex?'（EXライフ）':''}`,{uid:c.uid,target:'player',shield:opp.shields[i].uid,exLifeHit:ex}));}else out.push(option('attack',`${card(c).name}でダイレクトアタック`,{uid:c.uid,target:'player'}));}
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
 if(a.kind==='play'){if(card(a.cardId).evolution)s.decision={type:'evolution',player:p,uid:a.uid,source:a.cardId};else playCard(s,p,a.uid,false,null,a.face||0);}
 if(a.kind==='evolve'){s.decision=null;playCard(s,p,a.uid,false,a.baseUid);}
 if(a.kind==='revealEvolve'){s.decision=null;enterRevealed(s,p,a.uid,a.baseUid);}
 if(a.kind==='cancelEvolution')s.decision=null;
 if(a.kind==='toAttack'){s.phase='attack';log(s,p,'phase','攻撃ステップへ');}
 if(a.kind==='attack'){const c=s.players[p].battle.find(x=>x.uid===a.uid);c.tapped=true;s.attack={attacker:a.uid,target:a.target,shield:a.shield,stage:'effects'};log(s,p,'attack',a.label,{cardId:c.cardId});if(card(c).attackDragonReveal)revealDragon(s,p,card(c));if(card(c).attackJudge)startJudge(s,p,c.cardId,c.uid,'attack');}
 if(a.kind==='block'||a.kind==='noBlock'){s.decision=null;resolveAttack(s,a.kind==='block'?a.uid:null);}
 if(a.kind==='useTrigger'){s.decision=null;s.triggers.undeclared.shift();s.triggers.declared.push(a.uid);log(s,p,'declare',`${card(d.source).name}のS・トリガーを宣言`,{cardId:d.source});}
 if(a.kind==='skipTrigger'){s.decision=null;s.triggers.undeclared.shift();log(s,p,'skip','S・トリガーを使わない');}
 if(a.kind==='breakShields'){s.decision=null;breakShields(s,d.defender,a.shields);}
 if(a.kind==='judgeCost'){s.judge.costs[p]=a.cost;s.decision=null;advanceJudgeCosts(s);}
 if(a.kind==='judgeAgain'){s.decision=null;judgeRound(s);}
 if(a.kind==='stopJudge')beginJudgeBreaks(s);
 if(a.kind==='judgeBreak'){s.decision=null;s.judge.remaining--;breakShields(s,1-p,[a.shield]);}
 if(a.kind==='guardShield'){const b=s.shieldBreak;b.protections.push({uid:a.uid,shield:a.shield});if(b.protections.length===b.uids.length||!shieldGuardChoices(s).length)finishShieldGuards(s);}
 if(a.kind==='finishShieldGuards')finishShieldGuards(s);
 if(a.kind==='orderTrigger'){s.decision=null;s.triggers.declared.splice(s.triggers.declared.indexOf(a.uid),1);playCard(s,p,a.uid,true);}
 if(a.kind==='orderEntry'||a.kind==='orderEffect'){s.decision=null;const queue=a.kind==='orderEntry'?s.triggers.entries:s.pendingEffects,i=queue.findIndex(e=>e.effectId===a.effectId),[entry]=queue.splice(i,1);resolveEntry(s,entry);}
 if(a.kind==='dragonTap'){s.decision=null;s.players[1-p].battle.find(x=>x.uid===a.uid).tapped=true;(s.once??={})[d.key]=s.turn;log(s,p,'dragonTap',`${card(d.source).name}：${card(a.cardId).name}をタップ（このターンの1回を使用）`,{cardId:d.source});}
 if(a.kind==='skipDragonTap'){s.decision=null;log(s,p,'skip',`${card(d.source).name}の任意タップを見送る（このターンは未使用）`,{cardId:d.source});}
 if(a.kind==='fight'){s.decision=null;const source=s.players[p].battle.find(x=>x.uid===a.uid),target=s.players[1-p].battle.find(x=>x.uid===a.target);if(source&&target){log(s,p,'fight',`${card(source).name}の効果で${card(target).name}とバトル`,{cardId:source.cardId});battle(s,p,source,1-p,target,s.attack?.attacker);}}
 if(a.kind==='skipFight'){s.decision=null;log(s,p,'skip',`${card(d.source).name}の登場時バトルを使わない`,{cardId:d.source});}
 if(a.kind==='battleWinOrder'){const i=s.battleResolution.wins.findIndex(e=>e.uid===a.uid),[e]=s.battleResolution.wins.splice(i,1);s.decision={type:'draw',player:p,max:1,source:e.source,reason:'battleWin'};}
 if(a.kind==='draw'){s.decision=null;if(d.reason==='battleWin')log(s,p,'battleWin',`${card(d.source).name}：バトル勝利時のドローを${a.n?'使う':'使わない'}`,{cardId:d.source});if(a.n)draw(s,p,a.n);else log(s,p,'skip','任意のドローを省略');}
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
   if(['tap','tapTwo','shieldEntryTapLock'].includes(d.effect))c.tapped=true;
   if(d.effect==='shieldEntryTapLock')c.tapLocks=[...new Set([...(c.tapLocks||[]),p])];
   if(d.effect==='buff')c.buff+=2000;
   if(d.effect==='unblock')c.unblocked=true;
   if(['bounce','bounceOptional','bounceSmall','bounceBlockers'].includes(d.effect))moveCreature(s,t.player,t.uid,'hand');
   if(['destroy','destroySmall','destroyUntapped','destroyWeakerLimitNextTurn'].includes(d.effect))moveCreature(s,t.player,t.uid);
   if(d.effect==='manaRemoval')moveCreature(s,t.player,t.uid,'mana');
   log(s,p,'effect',`${card(d.source).name}：${card(c).name}を選択`,{cardId:d.source});
  }
 }
 if(a.kind==='effect'&&d.limitAfter)limitNextTurn(s,p,card(d.source));
 if(a.kind==='endTurn')beginEnd(s);
 if(a.kind==='endUntap'){s.decision=null;if(a.yes)for(const c of s.players[p].battle)if(d.uids.includes(c.uid)&&canUntap(c))c.tapped=false;nextTurn(s);}
 advanceBattle(s);advanceEffects(s);advanceTriggers(s);advanceJudgeBreaks(s);advanceAttack(s);
 return s;
}
// This observation deliberately omits both players' shield identities and deck order,
// and the opponent's hand. The AI receives only this object and its legal choices.
export function observation(s,p){return {active:s.active,turn:s.turn,phase:s.phase,attack:s.attack?{attacker:s.attack.attacker,target:s.attack.target}:null,decision:s.decision?{type:s.decision.type,effect:s.decision.effect,...(s.decision.type==='judgeContinue'?{wins:s.judge.wins}:{})}:null,judge:s.judge?.stage==='compare'?{revealed:s.judge.revealed,costs:s.judge.costs}:null,resolvingSpell:s.resolvingSpell?{player:s.resolvingSpell.player,cardId:s.resolvingSpell.source,face:s.resolvingSpell.face}:null,players:s.players.map((x,i)=>({turns:x.turns,battle:x.battle,mana:x.mana,grave:x.grave,hand:i===p?x.hand:x.hand.map(()=>({hidden:true})),shields:x.shields.length,deckCount:x.deck.length}))};}
export function chooseAI(s){
 const acts=getLegalActions(s);if(!acts.length)return null;const p=acts[0].player,v=observation(s,p),me=v.players[p],them=v.players[1-p];
 const find=(who,uid)=>v.players[who].battle.find(x=>x.uid===uid);
 const score=a=>{
  const c=a.cardId?(a.kind==='play'?playFaces(card(a.cardId))[a.face||0]:card(a.cardId)):null;
  if(a.kind==='charge'){
   const duplicates=me.hand.filter(x=>x.cardId===c.id).length;
   const colors=civilizations(c).filter(v=>!me.mana.some(x=>civilizations(card(x)).includes(v))).length;
   return 50+colors*10+c.cost*1.5+(duplicates>1?4:0)-(c.type==='creature'&&c.cost<=3?10:0);
  }
  if(a.kind==='skipCharge')return me.mana.reduce((n,x)=>n+manaValue(card(x)),0)>=Math.max(7,...me.hand.map(x=>card(x).cost))?100:me.hand.length<=1&&me.mana.length>=4?70:0;
  if(a.kind==='play'){
   if(c.type==='creature')return 30+c.cost*2+(c.cost-a.cost)*2+(c.effect==='ramp1'&&me.mana.length<6?12:0)+(c.blocker&&them.battle.length>me.battle.length?8:0)+(c.unblockable?7:0)+(c.speedAttacker?8:0);
   if(c.effect==='judgeDraw')return me.deckCount>1?(me.mana.length<9?38:16):-5;
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
   if(c.effect==='destroySmall')return them.battle.some(x=>power(x,false,v)<=2000)?27:0;
   if(c.effect==='destroyUntapped')return them.battle.some(x=>!x.tapped)?26:0;
   return 1;
  }
  if(a.kind==='evolve'||a.kind==='revealEvolve'){const base=find(p,a.baseUid);return 30+c.cost*2-(base.tapped?12:0)-card(base).cost;}
  if(a.kind==='cancelEvolution')return -1;
  if(a.kind==='toAttack')return 5;
  if(a.kind==='attack'){
   const x=find(p,a.uid);if(a.target==='player')return 25+(a.exLifeHit?3:0)+(them.shields===0?100:0)+(effectiveCard(x,v).unblockable?8:0)-(effectiveCard(x,v).blocker&&me.shields===0?20:0);
   const y=find(1-p,a.target);return power(x,true,v)>power(y,false,v)?40+card(y).cost:power(x,true,v)===power(y,false,v)?16:card(x).mustAttack?1:-10;
  }
  if(a.kind==='endTurn')return 0;
  if(a.kind==='block'){const b=find(p,a.uid);const attacker=them.battle.find(x=>x.uid===v.attack?.attacker);return(me.shields===0?100:0)+(attacker&&power(b,false,v)>=power(attacker,true,v)?50:me.shields<=2?20:-2)-card(b).cost*.1;}
  if(a.kind==='noBlock')return 0;
  if(a.kind==='breakShields')return 1+(a.exLifeHits||0)*2;
  if(a.kind==='judgeCost')return a.cost;
  if(a.kind==='judgeAgain')return v.decision.wins<them.shields?10:-1;
  if(a.kind==='stopJudge')return 0;
  if(a.kind==='judgeBreak')return a.exLifeHit?5:1;
  if(a.kind==='guardShield'){const x=find(p,a.uid),cost=layers(x).slice(1);return 20+Math.max(0,3-me.shields)*15+(a.exLifeHit?5:0)-cost.length-cost.reduce((n,x)=>n+card(x).cost,0)*.2;}
  if(a.kind==='finishShieldGuards')return 0;
  if(a.kind==='orderTrigger')return (c.type==='creature'?35:30)+c.cost;
  if(a.kind==='orderEntry'||a.kind==='orderEffect')return c.cost;
  if(a.kind==='dragonTap'){const x=find(1-p,a.uid);return x.tapped?-1:10+c.cost*2+(effectiveCard(x,v).blocker?12:0);}
  if(a.kind==='skipDragonTap')return 0;
  if(a.kind==='useTrigger')return 30;
  if(a.kind==='skipTrigger')return 0;
  if(a.kind==='draw')return me.deckCount>a.n+2?a.n*10:-a.n;
  if(a.kind==='search')return a.cardId?20-Math.abs(card(a.cardId).cost-me.mana.length)*2+(card(a.cardId).unblockable?3:0):0;
  if(a.kind==='endUntap')return a.yes?10:0;
  if(a.kind==='fight'){
   const own=find(p,a.uid),target=find(1-p,a.target),ap=power(own,own.uid===v.attack?.attacker,v),bp=power(target,target.uid===v.attack?.attacker,v);
   return ap>bp?25+c.cost*3-(c.slayer?card(own).cost*4:0):ap===bp?c.cost*3-card(own).cost*3:-20;
  }
  if(a.kind==='skipFight'||a.kind==='battleWinOrder')return 0;
  if(a.kind==='useRamp')return me.deckCount>4&&me.mana.length<11?20:-1;
  if(a.kind==='skipRamp')return 0;
  if(a.kind==='manaTop'){
   const x=me.mana.find(x=>x.uid===a.uid),others=me.mana.filter(x=>x.uid!==a.uid),lostColors=civilizations(c).filter(color=>!others.some(y=>civilizations(card(y)).includes(color))).length;
   return(x.tapped?15:0)-lostColors*18+(c.type==='creature'&&c.cost<=me.mana.length?10:0)-(me.hand.some(y=>y.cardId===c.id)?8:0);
  }
  if(a.kind==='effect')return a.targets.reduce((sum,t)=>{const x=find(t.player,t.uid);if(!x)return sum;const e=v.decision.effect;if(['buff','unblock'].includes(e))return sum+(t.player===p&&!x.tapped&&(x.entered<v.turn||card(x).speedAttacker||card(x).evolution)?20:0)+card(x).cost;if(['bounce','bounceOptional','bounceSmall','bounceBlockers'].includes(e)&&t.player===p)return sum-20;return sum+card(x).cost*3+(effectiveCard(x,v).blocker?8:0);},0);
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
