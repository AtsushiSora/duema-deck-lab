import {createExtendedRules} from './extended-rules.js?v=0.51';
// Supported-card rules engine. No strength-based or precomputed win rates.
export const RULE_VERSION='総合ルール 1.53 / 対応カード版 0.30';
export const ENGINE_VERSION='0.30.0';
const EFFECTS=new Set(['ramp1','ramp2','discard','teamBuff','optionalDraw','drawUpTo3','searchCreature','tap','tapTwo','buff','unblock','bounce','destroySmall','destroyUntapped','draw2','destroy','manaRemoval','tapAll','discardAll','bounceOptional','bounceSmall','bounceBlockers','dragonRamp2','ramp2Return1','optionalRamp4Return2','purgeNonDragonMana','fightOptional','destroyWeakerLimitNextTurn','shieldTop1','deployMulticolor7','superheroSweep','destroyBattleCard3','jadowShield','vamBounce','goodEvil','aterModes','jaganRevive','reverseLock','urEvolve','muteLoot','tensaiLoot','graveRecycle','destroyMin','vtBounce','miradaCast','spellLock','miracleDraw','serpentModal','icicleModes','mirageModes','judgeDraw','maryRevive','darknessModes','fumiModes','brainSlash','charonReset','jennySacrifice','inspectDiscard','gospelRecover','dolsuzakuTurn','frozenCarnival','finalStop','oriotisJudge','nextSummonSpeed','tripleMode','sirenMana','courageMode','burningLoot','lastDragonFlame','destroy6000','masterGGGLoot','untapTwoMana','fairyDiscard6000','graveShuffle','permitManaSummon','wellkius','mikadoreo','sheva','rudolf','saiphogate','heavensGate','stargaze','bambooRamp','sharappu','fairyPower','takeback','hugePlan','shakoRecycle','naturalGo','herculesRecycle','jurassicHowl','corenReveal','plantRamp','sonicMana','jumboReveal','granRamp','kiyonagaReveal','gohaten','zenonRamp','wiseShutter','dokiBounce','minogamiRecover','hazardPact','fortress','casablancaBounce','sheketDraw','petrovaProtect','bojiMill','dranEntry','goldShield','c0braRevive','mechaDraw','ameliaShield','mechaMinus','goryuShield','magicNapo','magicSmallDestroy','magicIgnore','magicNumberLock','magicFire','magicKaraku','magicHime','magicBounce','magicPeecap','magicDraw','armoredBaku','armoredValkyria','armoredVal','armoredMonster','hunterMekraid','hunterBambi','hunterSweep4','hunterSweep2','hunterVictory','hunterMana','hunterDraw','zardCast','dogiRamp','dolfSweep','damdRemove','fiveModes','dragonSign','aquaReveal','bossDeploy','dedoAllocate','fireAllocate','fairyMiracle','babaBottom','cycleEntry','jaougaShields','katsuLook','reverseMinus','jaoumon','fortuneRamp','giantHeavy','giantLake','giantTouch','giantYuki','giantSpace','giantSineraria','giantFirefly','gachiRobo','gachiCambiare','gachiFight','gachiMystery','gachiNicol','gachiBigBang','gachiMagrul','gachiRice','gachiGuignol','samuraiBui','samuraiMusashi','samuraiMekraid','samuraiFlash']);
let catalogue=new Map();
export function setCards(cards){for(const c of cards){if(c.effect&&!EFFECTS.has(c.effect))throw Error('未実装の効果です：'+c.effect);if(c.breaker!=null&&![2,3,4,'∞'].includes(c.breaker))throw Error('未実装のブレイカーです');if(c.evolution&&c.exLife)throw Error('進化EXライフは未対応です');if(c.evolution&&c.trigger)throw Error('進化S・トリガーは未対応です');if(c.costReduction&&!['opponentMulticolorMana3','ownFourDragonsMana3','ownFiveLightFireMana3','allCreatures'].includes(c.costReduction))throw Error('未実装のコスト軽減です');for(const key of ['dragonEntryTap','attackDragonReveal','exLife','zRush','shieldEntryTapLock','soulShieldGuard','attackJudge','stopSelfEntryAttack','gNeo','dream','multiAssault','manaSummon','entryGate','manaGuard','machFighter','ignoreSmall','gaia'])if(c[key]!=null&&c[key]!==true)throw Error('未実装の能力です：'+key);}for(const c of cards)if(c.hyper&&(!(c.zRush||c.hyperTap)||!Number.isFinite(c.hyper.power)||(c.hyper.breaker!=null&&![2,3,4,'∞'].includes(c.hyper.breaker))||Object.keys(c.hyper).some(k=>!['power','blocker','breaker','spellLockMaxCost','stopEntryAttack','attackExecuteHand','drawDiscard','reverseBurn','manaOnce','blazeLoot','engelsProtect','petrovaAttack'].includes(k))))throw Error('未実装のハイパーモードです');for(const c of cards)if(c.spellFace&&!(c.spellFace.type==='spell'&&EFFECTS.has(c.spellFace.effect)&&Number.isFinite(c.spellFace.cost)&&Array.isArray(c.spellFace.civilizations||String(c.spellFace.civ).split('/'))&&(!c.spellFace.charger||c.spellFace.effect==='judgeDraw')))throw Error('未実装のツインパクトです');for(const c of cards){if(c.neoEvolution&&(!c.neoEvolution.any||c.neoEvolution.any.length!==3||c.neoEvolution.any.some(x=>Object.keys(x).length!==1||!['光','水','闇','火','自然'].includes(x.civilization))))throw Error('未実装のNEO進化です');if(c.neoEvolution&&c.evolution)throw Error('進化形式が重複しています');if(c.ddd&&(!c.neoEvolution||!(([4,7].includes(c.ddd.cost)&&Object.keys(c.ddd).length===1)||(c.ddd.cost===8&&c.ddd.attackDiscount===true&&Object.keys(c.ddd).length===2))))throw Error('未実装のD・D・Dです');if(c.mugenCrime!=null&&![2,4].includes(c.mugenCrime))throw Error('未実装のムゲンクライムです');}catalogue=new Map([...cards.map(c=>[c.id,c]),[FACE_DOWN.id,FACE_DOWN]]);}
const FACE_DOWN={id:'face-down-mana',name:'裏向きのマナ',type:'unknown',cost:0,power:0,race:'',civ:'',civilizations:[],manaValue:1};
export const card=id=>typeof id!=='string'&&id?.faceDown?FACE_DOWN:catalogue.get(typeof id==='string'?id:id.cardId);
export const numeric=value=>value==='∞'?Infinity:Number(value);
export const costValue=c=>numeric(c.cost);
function rawNumberIgnored(s,x){return !!s&&(s.extLimits||[]).some(l=>l.kind==='numberIgnore'&&x.g9IgnoreScopes?.includes(l.scope)&&costValue(card(x))===(l.cost==='∞'?Infinity:l.cost));}
export function genmuActive(s){return !!s?.players.some(p=>p.battle.some(x=>card(x).ignoreSmall&&!rawNumberIgnored(s,x)));}
export function numberIgnored(s,x){return rawNumberIgnored(s,x)&&!genmuActive(s);}
export function natureElements(s,p){return s.players[p].battle.filter(x=>['creature','seed'].includes(card(x).type)&&civilizations(card(x)).includes('自然')).length;}
export function isCreature(s,x){const c=card(x);if(c.type!=='creature')return false;if(!c.natureAce4)return true;const p=s.players.findIndex(p=>p.battle.some(y=>y.uid===x.uid));return p<0||numberIgnored(s,x)||!!x.aceIgnored||natureElements(s,p)>=4;}
function refreshDynamicTypes(s){const g=genmuActive(s);for(const p of[0,1])for(const x of s.players[p].battle)if(card(x).natureAce4){if(!g&&!numberIgnored(s,x))delete x.aceIgnored;else if(numberIgnored(s,x)||natureElements(s,p)>=4)x.aceIgnored=true;}extra.gearCleanup(s);}
export function abilitiesIgnored(s,c){return numberIgnored(s,c)||isCreature(s,c)&&genmuActive(s)&&costValue(card(c))<=5;}
export function spellIgnored(s,c){return c.type==='spell'&&costValue(c)<=5&&genmuActive(s);}
// Identity and printed stats stay intact; all abilities, including granted ones, are ignored.
export function effectiveCard(inst,context){
 const base=card(inst),owner=context?.players.findIndex(p=>p.battle.some(x=>x.uid===inst.uid));
 if(owner==null||owner<0)return base;
 if(abilitiesIgnored(context,inst)){const {id,name,type,civ,civilizations,manaValue,cost,power,race,limit}=base;return {id,name,type,civ,civilizations,manaValue,cost,power:base.hyperTap&&inst.hyperActive?base.hyper.power:power,race,limit};}
 let c=base.hyper&&inst.hyperActive?{...base,...base.hyper}:base;if(base.natureAce4&&!isCreature(context,inst))c={...c,type:'seed',power:0};
 if(c.sheket&&context.players[owner].battle.filter(x=>['creature','seed'].includes(card(x).type)&&civilizations(card(x)).includes('光')).length>=5)c={...c,power:c.power+10000,breaker:3,sheketAttack:true};
 if(c.type==='creature'&&context.players[owner].battle.some(x=>x.uid!==inst.uid&&!abilitiesIgnored(context,x)&&card(x).bakteras))c={...c,blocker:true,speedAttacker:true};
 if(c.type==='creature'&&context.players[owner].battle.some(x=>!abilitiesIgnored(context,x)&&card(x).gachiTeamSpeed))c={...c,speedAttacker:true};
 if(c.type==='creature'&&civilizations(c).includes('水')&&context.players[1-owner].shields.length<=2&&context.players[owner].battle.some(x=>!abilitiesIgnored(context,x)&&card(x).gachiRoboProtect))c={...c,unblockable:true,cannotBeAttacked:true};
 if(inst.justDiverActive)c={...c,justDiver:true};
 if(inst.g2Blocker?.length)c={...c,blocker:true};
 if(inst.g19Blocker!==undefined)c={...c,blocker:true};
 if(civilizations(base).length>1&&context.players[owner].battle.some(x=>x.uid!==inst.uid&&!abilitiesIgnored(context,x)&&card(x).multiAssault))c={...c,speedAttacker:true,machFighter:true,escape:true};
 if(c.type==='creature'&&context.players[owner].battle.some(x=>!abilitiesIgnored(context,x)&&card(x).hades))c={...c,escape:true};
 if(c.oniTime&&context.players.reduce((n,p)=>n+p.shields.length,0)<=6)c={...c,power:c.power+4000,breaker:2};
 if((inst.g18Blocker||[]).some(x=>!spellIgnored(context,{type:'spell',cost:x.cost})))c={...c,blocker:true};
 if(extra.samuraiSpeed(context,owner,inst))c={...c,speedAttacker:true};
 if(layers(inst).slice(1).some(x=>card(x).soulBlocker))c={...c,blocker:true};
 if(c.gggSpeed&&context.players[owner].hand.length<=1)c={...c,speedAttacker:true};
 if((inst.g9Speed||[]).some(g=>g.turn===context.turn&&!spellIgnored(context,{type:'spell',cost:g.cost})))c={...c,speedAttacker:true};
 if(c.race?.includes('マジック')&&context.players[owner].battle.some(x=>!abilitiesIgnored(context,x)&&card(x).kakumeijin))c={...c,speedAttacker:true};
 if(inst.gospelSpeed===context.turn)c={...c,speedAttacker:true};
 if(c.type==='creature'&&context.players[owner].battle.some(x=>!abilitiesIgnored(context,x)&&card(x).hunterSpeed))c={...c,speedAttacker:true};
 if(c.hunterShieldSpeed&&context.players[1-owner].shields.length>=5)c={...c,speedAttacker:true};
 if(c.type==='creature'&&base.spellFace&&context.players[owner].battle.some(x=>!abilitiesIgnored(context,x)&&card(x).zenon))c={...c,speedAttacker:true};
 if(c.race?.includes('デスパペット')&&context.players[owner].battle.some(x=>!abilitiesIgnored(context,x)&&card(x).puppetLord))c={...c,blocker:true};
 if(c.katsuZero&&context.players[owner].shields.length===0)c={...c,power:c.power+10000,speedAttacker:true,breaker:3};
 if(c.type==='creature'&&civilizations(c).length>1&&context.players[owner].battle.some(x=>!abilitiesIgnored(context,x)&&card(x).burstSpeed))c={...c,speedAttacker:true};
 if(c.type==='creature'&&String(c.race).includes('ジャイアント')&&context.players[owner].battle.some(x=>!abilitiesIgnored(context,x)&&card(x).giantUnblock))c={...c,unblockable:true};
 return c;
}
export const playFaces=c=>c.spellFace?[c,{id:c.id,limit:c.limit,...c.spellFace}]:[c];
export function canCastSpell(s,p,c){return extra.allowedCard(s,p,c)&&(c.type!=='spell'||(extra.allowedSpell(s,p,c)&&!s.players[1-p].battle.some(x=>c.cost<=(effectiveCard(x,s).spellLockMaxCost??-1))&&!(s.extLimits||[]).some(l=>l.player===p&&(l.kind==='cast'||l.kind==='spellCostLock'&&costValue(c)<=l.max||l.kind==='numberCast'&&!spellIgnored(s,{type:'spell',cost:4})&&costValue(c)===(l.cost==='∞'?Infinity:l.cost)))));}
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
let randomSource=null;
export function setRandomSource(source=null){if(source!==null&&typeof source!=='function')throw TypeError('乱数源が正しくありません');randomSource=source;}
export function random(state){if(randomSource)return randomSource();let t=state.rng+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;}
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
function endGame(s,winner,reason){s.winner=winner;s.reason=reason;s.decision=null;delete s.lossEvent;log(s,winner,'finish',reason);}
function finish(s,winner,reason,kind='win',condition=null){
 if(s.winner!==null)return;if(extra.noLose(s,1-winner)){log(s,1-winner,'lossPrevented','ゲームに負けない効果が適用中');return;}
 if(kind!=='replacementWin'&&extra.lossOptions(s,1-winner).length){s.lossEvent??={winner,loser:1-winner,reason,condition};return;}
 endGame(s,winner,reason);
}
function deckCheck(s,p){if(!s.players[p].deck.length&&!extra.deckSafe(s,p))finish(s,1-p,`${s.players[p].name}の山札がなくなった`,'loss','deck');}
// State-based defeat is checked before queued death abilities (official QA36823).
function advanceLoss(s){
 const e=s.lossEvent;if(!e||s.winner!==null)return false;
 if(s.decision?.task?.op==='g12Loss')return true;
 if(!e.captured){e.resume=s.decision;e.captured=true;}
 const choices=extra.lossOptions(s,e.loser);if(!choices.length){endGame(s,e.winner,e.reason);return true;}
 s.decision={type:'extended',player:e.loser,source:choices[0].cardId,title:'敗北を置き換える効果を選ぶ',task:extra.task('g12Loss',e.loser,choices[0].cardId),choices};return true;
}
function replaceLoss(s,p,uid){
 const e=s.lossEvent,own=s.players[p],x=own.battle.find(x=>x.uid===uid);if(!e||e.loser!==p||!x||!extra.canLeave(s,p,x))throw Error('適用できない敗北置換です');
 const snapshot=extra.leaveSnapshot(s,[{player:p,uid}]),all=layers(x);recordLastPower(s,p,x,all);extra.leaving(s,p,x,!!effectiveCard(x,s).kakuLeave,snapshot,'grave',true);
 remove(own.battle,uid);for(const y of all)clearBattleState(y);own.grave.push(...all);if(s.attack&&[s.attack.attacker,s.attack.target,s.attack.blockUid].includes(uid))s.attack=null;
 log(s,p,'lossReplace',card(x).name+'をかわりに破壊し、敗北を置換',{cardId:x.cardId});delete s.lossEvent;s.decision=e.resume;
 if(e.condition==='deck'&&!own.deck.length)finish(s,e.winner,e.reason,'loss','deck');
}
function replaceHandLoss(s,p,uid){const e=s.lossEvent,x=s.players[p].hand.find(x=>x.uid===uid);if(!e||e.loser!==p||!x||!extra.lossOptions(s,p).some(o=>o.value?.kind==='baba'&&o.value.uid===uid))throw Error('適用できない手札の敗北置換です');remove(s.players[p].hand,uid);clearBattleState(x,'deck');s.players[p].deck.push(x);delete s.lossEvent;s.decision=e.resume;log(s,p,'lossReplace',card(x).name+'を公開して山札の下に置き、敗北を置換',{cardId:x.cardId});}
function declineLoss(s){const e=s.lossEvent;if(e)endGame(s,e.winner,e.reason);}
function takeDeckTop(s,p){const own=s.players[p],protectedIds=[...(own.g18Protected||[]),...(own.g10Protected||[]),...(own.g17Protected||[]),...(own.g3Protected||[]),...(own.g2Protected||[]),...(own.g19Reveals||[]),...(own.g21Protected||[]),...(own.g7Reveals||[]),...(own.g12Reveals||[])],i=own.deck.findIndex(x=>!protectedIds.includes(x.uid));return i<0?null:own.deck.splice(i,1)[0];}
function draw(s,p,n){let actual=0;for(let i=0;i<n&&s.winner===null;i++){if(!s.players[p].deck.length&&extra.deckSafe(s,p)){extra.put(s,extra.task("g10_Draws",p,s.players[p].battle.find(x=>effectiveCard(x,s).bigBang).cardId,{n:n-i}));break;}const last=s.players[p].deck.length===1&&!extra.deckSafe(s,p)&&s.players[p].battle.some(x=>effectiveCard(x,s).shako),c=takeDeckTop(s,p);if(c){s.players[p].hand.push(c);actual++;}if(last&&c){finish(s,p,'シャコガイル：山札の最後の1枚を引いて勝利','replacementWin');if(s.winner===null)deckCheck(s,p);}else deckCheck(s,p);}extra.drawn(s,p,actual);log(s,p,'draw',`カードを${actual}枚引いた`);}
function mill(s,p,n){for(let i=0;i<n&&s.winner===null;i++){const x=takeDeckTop(s,p);if(x){clearBattleState(x);s.players[p].grave.push(x);}deckCheck(s,p);}}
function remove(list,uid){const i=list.findIndex(x=>x.uid===uid);if(i<0)return null;return list.splice(i,1)[0];}
const layers=c=>[c,...(c.under||[]).flatMap(layers)];
// Only the marked soul ability transfers; entry effects and other base abilities do not.
export function shieldGuardSources(s,p){return s.players[p].battle.filter(c=>!abilitiesIgnored(s,c)&&c.under?.length&&layers(c).some(x=>card(x).soulShieldGuard));}
function shieldGuardChoices(s){const b=s.shieldBreak;return shieldGuardSources(s,b.player).filter(c=>!b.protections.some(x=>x.uid===c.uid));}
function recordLastPower(s,p,c,leaving){
 for(const e of [...(s.pendingEffects||[]),...(s.triggers?.entries||[]),...(s.judge?.deferredEffects||[])])if(e.player===p&&leaving.some(x=>x.uid===e.uid&&(x.incarnation||0)===(e.incarnation||0)))e.lastKnownPower=power(c,c.uid===s.attack?.attacker,s);
}
function tapCard(s,p,x){if(x&&!x.tapped){x.tapped=true;extra.tapped(s,p,x);}}
function clearBattleState(x,to='grave'){x.zoneSerial=(x.zoneSerial||0)+1;delete x.crossedTo;delete x.g18Blocker;delete x.g2Blocker;delete x.g7Para;delete x.g9IgnoreScopes;delete x.g9LockScopes;delete x.g9Speed;delete x.g9Untap;delete x.g9AttackTurn;delete x.g9AttackCount;delete x.g19Blocker;delete x.g19Protected;delete x.g19ShieldST;delete x.under;delete x.faceDown;delete x.g22ManaAllowed;delete x.g5Origin;delete x.g20Origin;delete x.aceIgnored;delete x.gospelSpeed;delete x.skipUntap;delete x.exLifeShieldUid;delete x.hyperActive;delete x.tapLocks;delete x.buffSources;delete x.unblockSpellCost;delete x.powerModifiers;delete x.triggerPlus;delete x.hyperResolved;delete x.faceUp;delete x.uraNinja;delete x.justDiverActive;x.tapped=to==='mana'&&manaCivilizations(card(x)).length>1;x.buff=0;x.unblocked=false;x.entered=0;}
function finishShieldGuards(s){
 const b=s.shieldBreak,p=b.player,protectedShields=new Set(b.protections.map(x=>x.shield));
 const remaining=b.uids.filter(uid=>!protectedShields.has(uid));
 // Each reserved stack pays for exactly one shield. All choices precede all moves (609.9).
 const batch=b.protections.map(row=>{const c=s.players[p].battle.find(x=>x.uid===row.uid);return {c,cards:(c.under||[]).flatMap(layers)};});
 for(const {c,cards}of batch)recordLastPower(s,p,c,cards);
 for(const {c,cards}of batch){delete c.under;for(const x of cards)clearBattleState(x);s.players[p].grave.push(...cards);log(s,p,'shieldGuard',`${card(c).name}の下のカード${cards.length}枚をすべて墓地へ置き、シールド1つを残す`,{cardId:c.cardId});}
 s.shieldBreak=null;s.decision=null;
 if(remaining.length)commitShieldBreak(s,p,remaining);else s.breakContext=null;
}

export function exLifeShields(s,p,c){return effectiveCard(c,s).exLife?s.players[p].shields.filter(x=>x.uid===c.exLifeShieldUid):[];}
export function exLifeShieldInfo(s,p,uid){
 for(const top of s.players[p].battle)for(const source of layers(top))if(source.exLifeShieldUid===uid&&s.players[p].shields.some(x=>x.uid===uid))return {sourceUid:source.uid,sourceCardId:source.cardId,active:top===source&&!!effectiveCard(top,s).exLife};
 return null;
}
function removeShield(s,p,uid){
 const x=remove(s.players[p].shields,uid);
 if(x){
  extra.shieldLeft(s,p,x);delete x.g19ShieldST;
  for(const top of s.players[p].battle)for(const c of layers(top))if(c.exLifeShieldUid===uid)delete c.exLifeShieldUid;
  // Z rush is continuous and applies immediately, including replacement moves.
  for(const who of [0,1])for(const c of s.players[who].battle)if(card(c).zRush){if(!c.hyperActive)log(s,who,'hyper',`${card(c).name}のZラッシュでハイパーモードを解放`,{cardId:c.cardId});c.hyperActive=true;}
 }
 return x;
}
function deckRedirect(s){return s.players.some(p=>p.battle.some(x=>effectiveCard(x,s).deckRedirect));}
function shieldTop(s,p,source,exLifeSource=null){
 const own=s.players[p],index=own.deck.findIndex(x=>![...(own.g18Protected||[]),...(own.g10Protected||[]),...(own.g17Protected||[]),...(own.g3Protected||[]),...(own.g2Protected||[]),...(own.g21Protected||[]),...(own.g19Reveals||[]),...(own.g7Reveals||[]),...(own.g12Reveals||[])].includes(x.uid)),shield=index<0?null:own.deck.splice(index,1)[0];
 if(shield&&deckRedirect(s)){clearBattleState(shield);own.grave.push(shield);log(s,p,'deckReplace','カレイコの黒像でシールドのかわりに墓地へ置く',{cardId:shield.cardId});deckCheck(s,p);return;}
 if(shield){own.shields.push(shield);if(exLifeSource)exLifeSource.exLifeShieldUid=shield.uid;
  log(s,p,exLifeSource?'exLifeAdd':'shieldAdd',`${source.name}${exLifeSource?'のEXライフ':''}で山札の上から1枚をシールド化（内容は非公開）`,{cardId:source.id});
  extra.shieldAdded(s,p,shield);
  for(const c of own.battle)if(effectiveCard(c,s).shieldEntryTapLock)enqueueEffect(s,p,{uid:c.uid,source:c.cardId,effect:'shieldEntryTapLock'});
 }
 deckCheck(s,p);return shield;
}
export function canEnterCreature(s,p,c=null,{origin='hand',execution=true}={}){
 if(c&&execution&&!extra.allowedCard(s,p,c))return false;
 const own=s.players[p];if((!c||c.type==='creature')&&own.entryLimitThisTurn&&(own.enteredThisTurn||0)>=1)return false;
 if(!c)return true;
 if((s.extLimits||[]).some(l=>l.player===p&&l.active!==false&&((l.kind==='entryPower'&&c.type==='creature'&&numeric(c.power)<=l.max)||(l.kind==='summon'&&execution&&c.type==='creature'&&costValue(c)<=l.max))))return false;
 if(c.type==='creature'&&s.players[1-p].battle.some(x=>effectiveCard(x,s).handEntryOnly)&&origin!=='hand')return false;
 if(c.dream&&own.battle.some(x=>x.cardId===c.id))return false;
 if(s.players[1-p].battle.some(x=>effectiveCard(x,s).entryGate)&&(origin!=='hand'||!execution))return false;
 return true;
}
export function dddPayment(s,p,c){
 if(!c.ddd)return null;
 if(c.ddd.attackDiscount&&s.players[1-p].battle.some(x=>effectiveCard(x,s).noCostReduction))return null;
 if(!c.ddd.attackDiscount)return {cost:c.ddd.cost,civilizations:civilizations(c)};
 const colors=new Set(s.players[p].mana.flatMap(x=>manaColors(card(x),s,p)));if(!['光','火','自然'].every(x=>colors.has(x)))return null;
 const attacker=s.players[p].battle.find(x=>x.uid===s.attack?.attacker);return {cost:Math.max(1,8-(attacker?costValue(card(attacker)):0)),civilizations:[]};
}

function limitNextTurn(s,p,source){s.players[1-p].entryLimitNextTurn=true;log(s,p,'entryLimit',`${source.name}：次の相手のターン、相手が出せるクリーチャーは1体まで`,{cardId:source.id});}
export const civilizations=c=>c.civilizations||String(c.civ).split('/');
export const manaCivilizations=c=>[...new Set(playFaces(c).flatMap(civilizations))];
export const manaValue=c=>c.manaValue??(civilizations(c).length===5?0:1);
export const isDragon=c=>c.type==='creature'&&String(c.race).includes('ドラゴン');
export function physicalCards(s){const flatten=c=>[c,...(c.under||[]).flatMap(flatten)];return [...s.players.flatMap(p=>['deck','hand','shields','mana','battle','grave'].flatMap(z=>p[z].flatMap(flatten))),...s.players.flatMap(p=>[...(p.g5Holding||[]),...(p.g20Holding||[]),...(p.g21Holding||[]),...(p.g21ManaPending||[]),...(p.g19Holding||[]),...(p.g7Holding||[])].flatMap(flatten)),...(s.g22Entry?flatten(s.g22Entry.inst):[]),...(s.resolvingSpell?flatten(s.resolvingSpell.inst):[]),...(s.extSpells||[]).filter(f=>!f.virtual).flatMap(f=>flatten(f.inst))];}
function leaveOptions(s,row){
 const own=s.players[row.player],batch=s.leaving,usedShields=new Set(batch.rows.flatMap(r=>r.plan?.shield?[r.plan.shield]:[])),usedMana=new Set(batch.rows.flatMap(r=>r.plan?.mana||[]));
 if(row.selfDeath)return {ex:null,gneo:false,escape:[],mana:[],ultra:[],ater:[]};
 return {ex:row.ex&&!usedShields.has(row.ex)?row.ex:null,gneo:row.gneo,escape:row.escape?own.shields.filter(x=>!usedShields.has(x.uid)):[],mana:row.manaGuard?own.mana.filter(x=>!usedMana.has(x.uid)):[],ultra:own.battle.filter(x=>(effectiveCard(x,s).ultraMecha&&String(card(own.battle.find(y=>y.uid===row.uid)).race).includes('メカ')||effectiveCard(x,s).ultraGiant&&String(card(own.battle.find(y=>y.uid===row.uid)).race).includes('ジャイアント'))&&extra.canLeave(s,row.player,x)&&!batch.rows.some(r=>r.plan?.kind==='ultra'&&r.plan.uid===x.uid)),ater:row.aterGuard?own.battle.filter(x=>isCreature(s,x)&&x.uid!==row.uid&&!batch.rows.some(r=>r.plan?.kind==='ater'&&r.plan.uid===x.uid)):[]};
}
function shevaProtection(s,p){const own=s.players[p];return own.battle.some(x=>effectiveCard(x,s).sheva)&&new Set(own.battle.map(x=>costValue(card(x)))).size>=5;}
function moveCreatures(s,moves,after=null){
 const rows=moves.flatMap(m=>{const top=s.players[m.player].battle.find(x=>x.uid===m.uid);if(!top||!extra.canLeave(s,m.player,top))return [];const c=effectiveCard(top,s);if(c.caddy&&(m.to||'grave')==='grave'&&shevaProtection(s,m.player))return [];if(c.type==='creature'&&((m.to||'grave')!=='grave'||m.destroy===false)&&shevaProtection(s,m.player))return [];return [{...m,to:m.to||'grave',ex:exLifeShields(s,m.player,top)[0]?.uid||null,gneo:!!(c.gNeo&&top.under?.length),escape:!!(c.escape&&m.destroy!==false&&(m.to||'grave')==='grave'),manaGuard:c.type==='creature'&&s.players[m.player].battle.some(x=>effectiveCard(x,s).manaGuard),leaveKaku:!!c.kakuLeave,death:c.caddy?((m.to||'grave')==='grave'?'mana':null):c.death||null,selfDeath:!!(c.caddy&&(m.to||'grave')==='grave'),aterGuard:!!c.aterGuard,plan:null}];});
 if(s.leaving)throw Error('未完了の移動があります');s.leaving={rows,after};advanceLeaving(s);
}
function advanceLeaving(s){if(s.lossEvent)return;
 if(!s.leaving||s.decision||s.winner!==null)return;
 for(const who of [s.active,1-s.active])for(const row of s.leaving.rows.filter(x=>x.player===who&&!x.plan)){
  const opts=leaveOptions(s,row),mandatory=!!(opts.ex||opts.gneo),optional=opts.escape.length||opts.mana.length>=3||opts.ater.length||opts.ultra.length;
  if(!optional&&Number(!!opts.ex)+Number(!!opts.gneo)<=1)row.plan=opts.ex?{kind:'ex',shield:opts.ex}:opts.gneo?{kind:'gneo'}:{kind:'leave'};
  else{s.decision={type:'leaveReplace',player:who,uid:row.uid,mandatory};return;}
 }
 const batch=s.leaving,savers=[...new Set(batch.rows.filter(r=>r.plan.kind==='ultra').map(r=>r.plan.uid))];
 batch.snapshot=extra.leaveSnapshot(s,batch.rows.flatMap(r=>r.plan.kind==='ultra'?[{player:r.player,uid:r.plan.uid}]:r.plan.kind==='leave'&&!savers.includes(r.uid)?[{player:r.player,uid:r.uid}]:r.plan.kind==='ater'?[{player:r.player,uid:r.plan.uid}]:[]));
 s.g20LeavingUids=[...savers,...batch.rows.flatMap(r=>r.plan.kind==='leave'?[r.uid]:r.plan.kind==='ater'?[r.plan.uid]:[])];
 // Ultra-Saver is itself a replacement: its destruction cannot be replaced again.
 for(const uid of savers){const row=batch.rows.find(r=>r.plan.kind==='ultra'&&r.plan.uid===uid),own=s.players[row.player],x=own.battle.find(x=>x.uid===uid);if(!x)continue;recordLastPower(s,row.player,x,layers(x));extra.leaving(s,row.player,x,!!effectiveCard(x,s).kakuLeave,batch.snapshot,'grave');remove(own.battle,uid);const all=layers(x);for(const y of all)clearBattleState(y);own.grave.push(...all);if(s.attack&&[s.attack.attacker,s.attack.target,s.attack.blockUid].includes(uid))s.attack=null;log(s,row.player,'ultraSaver',card(x).name+'をかわりに破壊する',{cardId:x.cardId});}
 // Preserve LKI for every card before applying any of the simultaneous moves.
 for(const row of batch.rows){const c=s.players[row.player].battle.find(x=>x.uid===row.uid);if(!c)continue;if(row.plan.kind==='leave')recordLastPower(s,row.player,c,row.cardOnly?[c]:layers(c));else if(row.plan.kind==='gneo')recordLastPower(s,row.player,c,(c.under||[]).flatMap(layers));}
 for(const row of batch.rows.filter(r=>r.plan.kind==='ater')){const own=s.players[row.player],victim=own.battle.find(x=>x.uid===row.plan.uid),kaku=!!(victim&&effectiveCard(victim,s).kakuLeave),other=remove(own.battle,row.plan.uid);if(other){const cards=layers(other);recordLastPower(s,row.player,other,cards);extra.leaving(s,row.player,other,kaku,batch.snapshot,'grave');for(const x of cards)clearBattleState(x);own.grave.push(...cards);log(s,row.player,'aterGuard',`${card(other).name}をかわりに破壊する`,{cardId:other.cardId});}}
 for(const row of batch.rows){
  const own=s.players[row.player],top=own.battle.find(x=>x.uid===row.uid),plan=row.plan;if(!top)continue;
  if(plan.kind==='ater'||plan.kind==='ultra'){continue;}
  if(plan.kind==='ex'||plan.kind==='escape'){const x=removeShield(s,row.player,plan.shield);if(x){const castle=x.faceUp&&card(x).gCastle;clearBattleState(x);own[plan.kind==='ex'||castle?'grave':'hand'].push(x);if(plan.kind==='escape'&&!castle)extra.shieldHand(s,row.player,x);}log(s,row.player,plan.kind==='ex'?'exLifeReplace':'escape',`${card(top).name}は${plan.kind==='ex'?'EXライフのシールドを墓地へ':'シールド1つを手札へ（S・トリガー不可）'}置いて残る`,{cardId:top.cardId});}
  else if(plan.kind==='mana'){for(const uid of plan.mana){const x=remove(own.mana,uid);clearBattleState(x);own.grave.push(x);}log(s,row.player,'manaGuard',`${card(top).name}を残し、マナ3枚を墓地へ置く`,{cardId:top.cardId});}
  else if(plan.kind==='gneo'){const below=(top.under||[]).flatMap(layers);delete top.under;for(const x of below)clearBattleState(x,row.to);if(row.to==='deckTop')own.deck.unshift(...below);else own[row.to].push(...below);log(s,row.player,'gNeoReplace',`${card(top).name}の下の${below.length}枚がかわりに${row.to==='hand'?'手札':row.to==='mana'?'マナ':'墓地'}へ移動し、本体は残る`,{cardId:top.cardId});}
  else if(row.cardOnly&&top.under?.length){
   const [base,...other]=top.under;const index=own.battle.indexOf(top);own.battle[index]=base;if(other.length)(base.under??=[]).push(...other);
   for(const key of ['tapped','entered','buff','unblocked','tapLocks','buffSources','unblockSpellCost'])if(top[key]!==undefined)base[key]=structuredClone(top[key]);
   if(s.attack?.attacker===top.uid)s.attack.attacker=base.uid;if(s.attack?.target===top.uid)s.attack.target=base.uid;
   extra.gearInherit(s,top,base);extra.leaving(s,row.player,top,row.leaveKaku,batch.snapshot,row.to,false);clearBattleState(top,row.to);if(row.to==='deckTop')own.deck.unshift(top);else own[row.to].push(top);log(s,row.player,'reconstruct',`${card(top).name}だけが墓地へ移動し、下の${card(base).name}が残る`,{cardId:top.cardId});
  }
  else{remove(own.battle,top.uid);if(s.attack&&(s.attack.attacker===top.uid||s.attack.target===top.uid))s.attack=null;const to=row.to==='grave'&&row.death?row.death:row.to,cards=layers(top);extra.leaving(s,row.player,top,row.leaveKaku,batch.snapshot,to,row.destroy!==false&&to==='grave');for(const x of cards){clearBattleState(x,to);if(row.tapped&&to==='mana')x.tapped=true;}if(to==='deckTop')own.deck.unshift(...cards);else own[to].push(...cards);if(to==='shields')for(const x of cards)extra.shieldAdded(s,row.player,x);log(s,row.player,'leave',`${card(top).name}${cards.length>1?`と進化元${cards.length-1}枚`:''}が${{grave:'墓地',hand:'手札',mana:'マナ',deck:'山札の下',deckTop:'山札の上',shields:'シールド'}[to]}へ移動`,{cardId:top.cardId});}
 }
 s.leaving=null;delete s.g20LeavingUids;refreshDynamicTypes(s);
 if(batch.after?.kind==='limit')limitNextTurn(s,batch.after.player,card(batch.after.source));
 if(batch.after?.kind==='battleResult')finishBattleResult(s,batch.after.winner,batch.after.late,batch.after.winning,batch.after.both);
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
export function evolutionBases(s,p,c){const condition=c.evolution||c.neoEvolution;return condition?s.players[p].battle.filter(x=>(isCreature(s,x)||card(x).shinkalize)&&matchesEvolution(x,condition,s)):[];}
export function isEvolution(inst){return !!(card(inst).evolution||(card(inst).neoEvolution&&inst.under?.length));}
export function selfTriggersStopped(s,p){return s.players[1-p].battle.some(x=>effectiveCard(x,s).stopSelfEntryAttack&&isEvolution(x));}
export function power(c,attacking=false,context=null){
 const modifiers=(c.powerModifiers||[]).filter(x=>x.spellCost===undefined||!spellIgnored(context,{type:'spell',cost:x.spellCost}));if(modifiers.some(x=>x.amount==='-infinity'))return -Infinity;
 const data=effectiveCard(c,context),owner=data.ownTurnBonus&&context?context.players.findIndex(p=>p.battle.some(x=>x.uid===c.uid)):-1;
 return numeric(data.power)+(context?extra.samuraiPower(context,context.players.findIndex(p=>p.battle.some(x=>x.uid===c.uid)),c):0)+modifiers.reduce((n,x)=>n+x.amount,0)+(attacking?(data.attackBonus||0)+(c.buff||0)-(c.buffSources||[]).filter(x=>spellIgnored(context,{type:'spell',cost:x.cost})).reduce((n,x)=>n+x.amount,0):0)+(owner>=0&&context.active===owner?data.ownTurnBonus:0);
}
function canAttack(s,p,c){const d=effectiveCard(c,s);return d.type==='creature'&&(!d.twoTappedAttack||s.players[p].battle.filter(x=>isCreature(s,x)&&x.tapped).length>=2)&&!c.tapped&&!d.noAttack&&(!d.needsBigAttack||s.g16BigAttack?.[p]===s.turn)&&!extra.locked(s,p,c,'attack')&&!(c.entered===s.turn&&s.players[1-p].battle.some(x=>effectiveCard(x,s).stopEntryAttack)&&!s.players[p].battle.some(x=>effectiveCard(x,s).ignoreAttackLocks))&&(c.entered<s.turn||d.speedAttacker||isEvolution(c)||d.machFighter);}
function canAttackPlayer(s,c){const p=s.players.findIndex(x=>x.battle.some(y=>y.uid===c.uid));return !(c.entered===s.turn&&s.players[1-p].battle.some(x=>effectiveCard(x,s).gaia)&&!s.players[p].battle.some(x=>effectiveCard(x,s).ignoreAttackLocks))&&(c.entered<s.turn||effectiveCard(c,s).speedAttacker||isEvolution(c));}
function unblockedNow(s,c){return effectiveCard(c,s).unblockable||c.unblocked&&(!c.unblockSpellCost||!spellIgnored(s,{type:'spell',cost:c.unblockSpellCost}));}
function targets(s,p,effect){
 const own=s.players[p],opp=s.players[1-p];let ts;
 if(effect==='destroyBattleCard3')ts=opp.battle.flatMap(top=>layers(top).filter(x=>(x===top?[card(x)]:playFaces(card(x))).some(c=>costValue(c)<=3)).map(x=>({player:1-p,uid:x.uid,cardId:x.cardId,topUid:top.uid})));
 else if(['buff','unblock'].includes(effect))ts=own.battle.filter(x=>isCreature(s,x)).map(x=>({player:p,uid:x.uid}));
 else if(['bounce','bounceOptional','bounceSmall','bounceBlockers'].includes(effect))ts=[p,1-p].flatMap(player=>s.players[player].battle.filter(x=>isCreature(s,x)).filter(x=>effect!=='bounceSmall'||card(x).cost<=6).map(x=>({player,uid:x.uid})));
 else ts=opp.battle.filter(x=>isCreature(s,x)).filter(x=>effect!=='destroyUntapped'||!x.tapped).filter(x=>effect!=='destroySmall'||power(x,x.uid===s.attack?.attacker,s)<=2000).map(x=>({player:1-p,uid:x.uid}));
 return ts.filter(t=>extra.targetable(s,p,t.player,s.players[t.player].battle.find(x=>layers(x).some(y=>y.uid===t.uid))));
}
// One distinct mana card per required civilization; five-color mana has value zero.
export function manaPayment(mana,c){
 const pool=mana.filter(x=>!x.tapped),colors=civilizations(c),goal=(1<<colors.length)-1,cost=costValue(c);
 if(pool.reduce((n,x)=>n+manaValue(card(x)),0)<cost)return null;
 if(colors.length===1&&pool.every(x=>manaValue(card(x))===1)){const same=pool.find(x=>(x.paymentBird||x.paymentAllColors?['光','水','闇','火','自然']:manaCivilizations(card(x))).includes(colors[0]));return same?[same,...pool.filter(x=>x!==same).slice(0,cost-1)].map(x=>x.uid):null;}
 let states=new Map([['0:0',{mask:0,amount:0,ids:[]}]]);
 for(const x of pool){const next=new Map(states),value=manaValue(card(x)),bits=[0,...colors.flatMap((v,i)=>(x.paymentBird||x.paymentAllColors?['光','水','闇','火','自然']:manaCivilizations(card(x))).includes(v)?[1<<i]:[])];
  for(const st of states.values())for(const bit of bits){const amount=Math.min(cost,st.amount+value),mask=st.mask|bit,key=mask+':'+amount,ids=[...st.ids,x.uid],old=next.get(key);if(!old||ids.length<old.ids.length)next.set(key,{mask,amount,ids});}
  states=next;
 }
 return states.get(goal+':'+cost)?.ids||null;
}
// Printed cost remains unchanged for all references, searches, and card details (201.2a).
export function summonCost(s,p,c){
 if(s.players[1-p].battle.some(x=>effectiveCard(x,s).noCostReduction))return costValue(c);
 if(c.crossing)return Math.max(1,costValue(c)-extra.samuraiDiscount(s,p,c));
 const reduce=c.type==='creature'&&((c.costReduction==='opponentMulticolorMana3'&&s.players[1-p].mana.some(x=>manaColors(card(x),s,p).length>1))||(c.costReduction==='ownFourDragonsMana3'&&s.players[p].mana.filter(x=>isDragon(card(x))).length>=4)||(c.costReduction==='ownFiveLightFireMana3'&&s.players[p].mana.filter(x=>manaColors(card(x),s,p).some(v=>v==='光'||v==='火')).length>=5));
 const gaia=c.type==='creature'&&numeric(c.printedCost??c.cost)>=10?s.players[p].battle.filter(x=>effectiveCard(x,s).gaia).length*4:0;
 const base=c.graveSpellReduction?Math.max(2,costValue(c)-s.players[p].grave.filter(x=>playFaces(card(x)).some(c=>c.type==='spell')).length):costValue(c);
 return Math.max(c.graveSpellReduction?2:1,base-extra.samuraiDiscount(s,p,c)-extra.giantDiscount(s,p,c)-extra.hunterDiscount(s,p,c)-extra.armoredDiscount(s,p,c)-extra.magicDiscount(s,p,c)-extra.mechaDiscount(s,p,c)-extra.granDiscount(s,p,c)-(c.gio?c.gioRevealCount||0:0)-(c.gggReduction&&s.players[p].hand.length<=1?c.gggReduction:0)-extra.raceDiscount(s,p,c)-(c.type==='creature'?extra.nextDiscount(s,p):0)-(reduce?3:0)-gaia-(c.costReduction==='allCreatures'?s.players.reduce((n,p)=>n+p.battle.filter(x=>isCreature(s,x)).length,0):0));
}
export function manaColors(c,s=null,p=null){return s&&p!==null&&s.players[p].battle.some(x=>effectiveCard(x,s).casablanca)?['光','水','闇','火','自然']:manaCivilizations(c);}
export function paymentPool(s,p,exclude=[]){const all=s.players[p].battle.some(x=>effectiveCard(x,s).casablanca);return [...s.players[p].mana.map(x=>all?{...x,paymentAllColors:true}:x),...s.players[p].battle.filter(x=>effectiveCard(x,s).manaBird).map(x=>({...x,paymentBird:true}))].filter(x=>!exclude.includes(x.uid));}
function validMana(s,p,c){return manaPayment(paymentPool(s,p),{...c,cost:summonCost(s,p,c)})!==null;}
function pay(s,p,c){const ids=manaPayment(paymentPool(s,p),{...c,cost:summonCost(s,p,c)});if(!ids)throw Error('必要な文明・マナが足りません');let real=false;for(const x of s.players[p].mana)if(ids.includes(x.uid)){x.tapped=true;real=true;}for(const x of s.players[p].battle)if(ids.includes(x.uid))tapCard(s,p,x);return real;}
// Move the whole batch together (400.7). Looking/revealing alone does not empty the library.
function rampTapped(s,p,c,n,dragonsOnly=false){
 const own=s.players[p],batch=own.deck.splice(0,n);
 if(dragonsOnly)log(s,p,'reveal',`${c.name}で公開：${batch.map(x=>card(x).name).join('・')}`,{cardId:c.id});
 const redirected=deckRedirect(s),mana=batch.filter(x=>!redirected&&(!dragonsOnly||isDragon(card(x)))),grave=batch.filter(x=>redirected||dragonsOnly&&!isDragon(card(x)));
 for(const x of batch){x.tapped=mana.includes(x);x.buff=0;x.unblocked=false;x.entered=0;}
 own.mana.push(...mana);own.grave.push(...grave);if(redirected&&batch.length)log(s,p,'deckReplace','カレイコの黒像でマナのかわりに墓地へ置く',{cardId:c.id});
 log(s,p,'ramp',`${c.name}：${mana.length}枚をタップしてマナへ${grave.length?`、${grave.length}枚を墓地へ`:''}`,{cardId:c.id});
 deckCheck(s,p);
}
function chooseManaTop(s,p,c,n){
 const count=Math.min(n,s.players[p].mana.length);
 if(s.winner===null&&count)s.decision={type:'manaTop',player:p,source:c.id,count,chosen:[]};
}
function doEffect(s,p,c,sourceUid=null,entry=null){
 const e=c.effect;if(!e)return;
 if(extra.effect(s,p,c,sourceUid,entry))return;
 if(e==='destroyWeakerLimitNextTurn'){
  const source=s.players[p].battle.find(top=>layers(top).some(x=>x.uid===sourceUid&&(x.incarnation||0)===(entry?.incarnation||0))),max=source?power(source,source.uid===s.attack?.attacker,s):entry?.lastKnownPower??c.power;
  const ts=s.players[1-p].battle.filter(x=>isCreature(s,x)&&extra.targetable(s,p,1-p,x)).filter(x=>power(x,x.uid===s.attack?.attacker,s)<max).map(x=>({player:1-p,uid:x.uid}));
  if(ts.length)s.decision={type:'effect',player:p,effect:e,source:c.id,targets:ts,limitAfter:true};else limitNextTurn(s,p,c);
  return;
 }
 if(e==='deployMulticolor7'){s.decision={type:'deploy',player:p,source:c.id};return;}
 if(e==='shieldTop1'){shieldTop(s,p,c);return;}
 if(e==='fightOptional'){if(s.players[p].battle.some(x=>x.uid===sourceUid)&&s.players[1-p].battle.length)s.decision={type:'fight',player:p,source:c.id,uid:sourceUid};return;}
 if(e==='dragonRamp2'){rampTapped(s,p,c,2,true);return;}
 if(e==='ramp2Return1'){rampTapped(s,p,c,2);chooseManaTop(s,p,c,1);return;}
 if(e==='optionalRamp4Return2'){s.decision={type:'optionalRamp',player:p,source:c.id};return;}
 if(e==='purgeNonDragonMana'){
  for(const who of [0,1]){const own=s.players[who],removed=own.mana.filter(x=>!isDragon(card(x)));own.mana=own.mana.filter(x=>isDragon(card(x)));for(const x of removed){x.tapped=false;x.buff=0;x.unblocked=false;x.entered=0;}own.grave.push(...removed);log(s,who,'manaLeave',`${c.name}でドラゴン以外のマナ${removed.length}枚を墓地へ`,{cardId:c.id});}return;
 }
 if(e==='bounceBlockers'){const batch=[0,1].flatMap(who=>s.players[who].battle.filter(x=>isCreature(s,x)&&effectiveCard(x,s).blocker).map(x=>({who,uid:x.uid})));moveCreatures(s,batch.map(x=>({player:x.who,uid:x.uid,to:'hand'})));return;}
 if(e==='superheroSweep'){const moves=[0,1].flatMap(player=>s.players[player].battle.filter(x=>isCreature(s,x)&&power(x,x.uid===s.attack?.attacker,s)<=3000).map(x=>({player,uid:x.uid,to:'grave'})));if(moves.length)moveCreatures(s,moves);return;}
 if(e==='draw2'){draw(s,p,2);return;}
 if(e==='tapAll'){for(const x of s.players[1-p].battle.filter(x=>isCreature(s,x)))tapCard(s,1-p,x);log(s,p,'effect',`${c.name}で相手のクリーチャーすべてをタップ`,{cardId:c.id});return;}
 if(e==='discardAll'){extra.put(s,extra.task('discard',1-p,c.id,{causedBy:p,n:s.players[1-p].hand.length,all:true}));return;}
 if(e==='ramp1'||e==='ramp2'){const n=e==='ramp1'?1:2;let added=0;for(let i=0;i<n&&s.winner===null;i++){const x=takeDeckTop(s,p);if(x){x.tapped=manaCivilizations(card(x)).length>1;if(deckRedirect(s)){clearBattleState(x);s.players[p].grave.push(x);log(s,p,'deckReplace','カレイコの黒像でマナのかわりに墓地へ置く',{cardId:x.cardId});}else{s.players[p].mana.push(x);added++;}}deckCheck(s,p);}log(s,p,'ramp',`${c.name}でマナを${added}枚追加`,{cardId:c.id});return;}
 if(e==='discard'){extra.put(s,extra.task('discard',1-p,c.id,{causedBy:p,n:1,random:true}));return;}
 if(e==='teamBuff'){for(const x of s.players[p].battle){x.buff+=2000;if(c.type==='spell')(x.buffSources??=[]).push({amount:2000,cost:c.cost});}log(s,p,'buff','このターン、攻撃中のパワーを+2000');return;}
 if(e==='optionalDraw'||e==='drawUpTo3'){s.decision={type:'draw',player:p,max:e==='optionalDraw'?1:3,source:c.id};return;}
 if(e==='searchCreature'){s.decision={type:'search',player:p,source:c.id};return;}
 const ts=targets(s,p,e);if(ts.length)s.decision={type:'effect',player:p,effect:e,source:c.id,targets:ts,optional:e==='bounceOptional'};
}
function enqueueEffect(s,p,entry){
 const queue=s.triggers?s.triggers.entries:(s.pendingEffects??=[]);
 queue.push({...entry,player:p,effectId:s.effectSerial=(s.effectSerial||0)+1});
}
// Check all entry triggers after the new top card has entered (603.5a).
function enterCreature(s,p,inst,baseUid=null,entryOptions={}){
 if(!canEnterCreature(s,p,card(inst),entryOptions))throw Error('このクリーチャーは現在出せません');
 const baseWasCreature=!!baseUid&&s.players[p].battle.some(x=>x.uid===baseUid&&isCreature(s,x));
 const c=card(inst);if(extra.replaceEntry(s,p,inst,baseUid,entryOptions))return;delete inst.g22ManaAllowed;inst.entered=s.turn;inst.tapped=c.type==='creature'&&(extra.tapEntry(s,p)||s.players[1-p].battle.some(x=>effectiveCard(x,s).opponentTapEntry));inst.incarnation=(inst.incarnation||0)+1;
 if(c.evolution||(c.neoEvolution&&baseUid)){const base=s.players[p].battle.find(x=>x.uid===baseUid);if(!base||!matchesEvolution(base,c.evolution||c.neoEvolution,s))throw Error('進化元が正しくありません');remove(s.players[p].battle,baseUid);inst.under=[base];inst.tapped=base.tapped||extra.tapEntry(s,p)||s.players[1-p].battle.some(x=>effectiveCard(x,s).opponentTapEntry);inst.buff=base.buff||0;inst.unblocked=base.unblocked||false;if(base.tapLocks)inst.tapLocks=[...base.tapLocks];if(base.buffSources)inst.buffSources=base.buffSources.map(x=>({...x}));if(base.unblockSpellCost)inst.unblockSpellCost=base.unblockSpellCost;if(base.powerModifiers)inst.powerModifiers=structuredClone(base.powerModifiers);if(base.skipUntap)inst.skipUntap=true;if(base.gospelSpeed===s.turn)inst.gospelSpeed=s.turn;if(base.g19Protected)inst.g19Protected=true;if(base.g19Blocker!==undefined)inst.g19Blocker=base.g19Blocker;
  extra.inherit(s,base,inst);if(s.attack?.attacker===baseUid)s.attack.attacker=inst.uid;
  if(s.attack?.target===baseUid)s.attack.target=inst.uid;
  log(s,p,'evolve',`${card(base).name}から${c.name}へ進化`,{cardId:c.id});
 }
 if(c.natureAce4&&genmuActive(s))inst.aceIgnored=true;s.players[p].battle.push(inst);if(c.type==='creature')(s.g7Entries??=[0,0])[p]++;refreshDynamicTypes(s);if(isCreature(s,inst)&&s.metrics[p].firstCreature===null)s.metrics[p].firstCreature=s.players[p].turns;
 if(c.justDiver)inst.justDiverActive=true;
 if(isCreature(s,inst)){s.players[p].enteredThisTurn=(s.players[p].enteredThisTurn||0)+1;s.creaturesEntered=(s.creaturesEntered||0)+1;}
 const selfMuted=isCreature(s,inst)&&(selfTriggersStopped(s,p)||extra.muteEntry(s,p));
 if(!entryOptions.ignoreEntry)extra.entry(s,p,inst,{...entryOptions,selfMuted});
 if(!entryOptions.paidMana)(s.noManaUse??=[false,false])[p]=true;
 if(effectiveCard(inst,s).exLife){shieldTop(s,p,c,inst);if(s.winner!==null)return;}
 const stopped=entryOptions.ignoreEntry||(isCreature(s,inst)&&(!c.stackOnlyEntry&&selfTriggersStopped(s,p)||extra.muteEntry(s,p)))||abilitiesIgnored(s,inst);
 if(stopped&&(c.effect||c.dragonEntryTap))log(s,p,'triggerPrevented',`${c.name}自身の登場時能力は${abilitiesIgnored(s,inst)?'ゲンムエンペラー':extra.muteEntry(s,p)?'マリニャンX':'GG'}によりトリガーしない`,{cardId:c.id});
 if(c.triggerPlus&&inst.triggerPlus&&!stopped)enqueueEffect(s,p,{uid:inst.uid,source:c.id,effect:'extended',task:extra.task('muteAttackLock',p,c.id)});
 if(c.effect&&!stopped&&(!c.stackOnlyEntry||baseWasCreature)&&(!c.summonedEntryOnly||entryOptions.execution!==false))enqueueEffect(s,p,{uid:inst.uid,incarnation:inst.incarnation,lastKnownPower:power(inst,false,s),source:c.id,effect:'entry'});
 if(!entryOptions.ignoreEntry&&isDragon(c))for(const x of s.players[p].battle)if(effectiveCard(x,s).dragonEntryTap&&(!stopped||x.uid!==inst.uid)){const key=x.uid+'@'+(x.incarnation||0);if(s.once?.[key]!==s.turn)enqueueEffect(s,p,{uid:x.uid,source:x.cardId,effect:'dragonEntryTap',key});}
}
function resolveEntry(s,entry){
 const p=entry.player;
 if(entry.effect==='extended'){extra.resolve(s,entry);return;}
 if(entry.effect==='ddd'){s.decision={type:'dddSummon',player:p,uid:entry.uid,source:entry.source};}
 else if(entry.effect==='endUntap'){s.decision={type:'untap',player:p,uids:entry.uids};}
 else if(entry.effect==='attackDragonReveal')revealDragon(s,p,card(entry.source));
 else if(entry.effect==='attackExecuteHand'){extra.put(s,extra.task('execute',p,entry.source,{origin:'hand',max:s.players[p].hand.length,noncreature:true}));}
 else if(entry.effect==='deploy')doEffect(s,p,{...card(entry.source),effect:'deployMulticolor7'},entry.uid,entry);
 else if(entry.effect==='attackJudge')startJudge(s,p,entry.source,entry.uid,'attack');
 else if(entry.effect==='shieldEntryTapLock'){
  const ts=targets(s,p,'tap');if(ts.length)s.decision={type:'effect',player:p,effect:'shieldEntryTapLock',source:entry.source,targets:ts};
 }else if(entry.effect==='dragonEntryTap'){
  if(s.once?.[entry.key]!==s.turn&&s.players[1-p].battle.length)s.decision={type:'dragonTap',player:p,source:entry.source,key:entry.key};
 }else doEffect(s,p,card(entry.source),entry.uid,entry);
}
function availableEffects(s,queue){return queue.filter(e=>e.effect!=='dragonEntryTap'||s.once?.[e.key]!==s.turn);}
function advanceEffects(s){if(s.lossEvent)return;
 while(!s.lossEvent&&s.pendingEffects?.length&&!s.triggers&&!s.extTasks?.length&&!s.decision&&s.winner===null&&(!s.judge||s.judge.stage==='breaks')){
  s.pendingEffects=availableEffects(s,s.pendingEffects);if(!s.pendingEffects.length)return;
  if(!s.pendingEffects.some(e=>e.player===s.active)&&extra.beforeNonActive(s))return;
  const p=s.pendingEffects.some(e=>e.player===s.active)?s.active:1-s.active,entries=s.pendingEffects.filter(e=>e.player===p);
  if(entries.length>1){s.decision={type:'effectOrder',player:p};return;}
  s.pendingEffects.splice(s.pendingEffects.indexOf(entries[0]),1);resolveEntry(s,entries[0]);advanceBattle(s);
 }
}
function playCard(s,p,uid,free=false,baseUid=null,face=0,alternativeCost=null,origin='hand',freeReason='S・トリガー',ownGraveCast=false,permit=null,snowReducers=null,gioReveals=null,magicReducers=null,g7Payment=null,g18Reducers=null){
 const source=s.players[p][origin].find(x=>x.uid===uid),ruleOrigin=source?.g5Origin||origin,c=source&&{...playFaces(card(source))[face],summonOrigin:ruleOrigin,...(g18Reducers!==null?{g18Reducers}:{}),...(g7Payment?{g7Payment}:{}),...(magicReducers?{magicReducers}:{}),...(snowReducers?{snowReducers}:{}),...(gioReveals?{gioRevealCount:gioReveals.length}:{})};if(!c||!canCastSpell(s,p,c)||(c.type!=='spell'&&!canEnterCreature(s,p,c,{origin:ruleOrigin,execution:true})))throw Error('このカードは使えません');
 if(gioReveals?.length)log(s,p,'reveal','超七極 Gioの召喚のため手札を公開：'+gioReveals.map(uid=>card(s.players[p].hand.find(x=>x.uid===uid)).name).join('、'),{cardId:c.id});
 if(!free)for(const id of c.g7Payment?.energy||[])tapCard(s,p,s.players[p].battle.find(x=>x.uid===id));
 const payment=alternativeCost===null?c:{...c,...(typeof alternativeCost==='object'?alternativeCost:{cost:alternativeCost}),costReduction:undefined,printedCost:c.cost},cost=summonCost(s,p,payment);const paidMana=free?false:pay(s,p,payment);const inst=remove(s.players[p][origin],uid);
 extra.played(s,p,free?{...c,snowReducers:[],magicReducers:[],g7Payment:{reducers:[]}}:c,inst,ruleOrigin,permit);if(c.type==='creature')extra.summoned(s,p,inst);delete inst.g5Origin;
 if(ownGraveCast&&origin==='grave'&&c.graveCast)inst.finishTo='deck';
 const met=s.metrics[p];met.played[c.id]=(met.played[c.id]||0)+1;if(s.players[p].turns<=3)met.earlyPlayed[c.id]=true;if(free&&freeReason==='S・トリガー')met.triggers++;
 if(!paidMana)(s.noManaUse??=[false,false])[p]=true;
 log(s,p,free?(freeReason==='S・トリガー'?'trigger':'gaiaSummon'):'play',`${c.name}を${free?freeReason+'で':''}${c.type==='creature'?'召喚':c.type==='gear'?'ジェネレート':'使用'}${!free&&cost!==c.cost?`（支払い${cost}マナ / 元のコスト${c.cost}）`:''}`,{cardId:c.id});
 if(c.type==='spell')extra.spellCast(s,p,c,inst,ruleOrigin,face);
 if(c.type==='castle'){inst.faceUp=true;s.players[p].shields.push(inst);extra.shieldAdded(s,p,inst);if(free)(s.noManaUse??=[false,false])[p]=true;}
 else if(c.type==='creature'||c.type==='seed'||c.type==='gear'){enterCreature(s,p,inst,baseUid,{origin:ruleOrigin,execution:true,paidMana,costPaid:!free});if(ruleOrigin==='deck')deckCheck(s,p);}
 else if(spellIgnored(s,c)){const to=inst.finishTo||'grave';delete inst.finishTo;clearBattleState(inst,to);s.players[inst.cardOwner??p][to].push(inst);log(s,p,'spellIgnored',`${c.name}の効果はゲンムエンペラーにより無視される`,{cardId:c.id});}
 else if(c.charger){s.resolvingSpell={player:p,inst,source:c.id,face,origin:'hand'};startJudge(s,p,c.id,inst.uid,'spell');}
 else{const before=s.extTasks?.length||0;if(c.crystalCharger)inst.crystalFinish=true;if(c.normalCharger)inst.normalFinish=true;extra.finishSpell(s,p,inst);doEffect(s,p,c,inst.uid);(s.extTasks??=[]).splice(s.extTasks.length-before,0,extra.task('finishSpell',p,c.id,{uid:inst.uid}));}
}
// Smash Burst executes a spell without moving or duplicating its physical battlefield card.
function castBattleSpell(s,p,uid,incarnation,source,reason='スマッシュ・バースト'){const c=playFaces(card(source))[1];if(!c||!canCastSpell(s,p,c))return;(s.noManaUse??=[false,false])[p]=true;s.metrics[p].played[c.id]=(s.metrics[p].played[c.id]||0)+1;log(s,p,'play',c.name+'を'+reason+'で唱える',{cardId:c.id});extra.spellCast(s,p,c);if(spellIgnored(s,c))return;if(c.charger){startJudge(s,p,c.id,uid,'spell');return;}const before=s.extTasks?.length||0;const virtualUid=uid+':spell:'+String(s.virtualSerial=(s.virtualSerial||0)+1);(s.extSpells??=[]).push({inst:{uid:virtualUid,cardId:source},owner:p,virtual:true});doEffect(s,p,c,uid);s.extTasks.splice(s.extTasks.length-before,0,extra.task('finishSpell',p,c.id,{uid:virtualUid}));}
// The revealed card remains in its library until an actual move succeeds.
function revealDragon(s,p,c){
 const own=s.players[p],top=own.deck[0];if(!top){deckCheck(s,p);return;}
 const data=card(top);log(s,p,'reveal',`${c.name}で山札の上を公開：${data.name}`,{cardId:data.id});
 if(!isDragon(data)){own.grave.push(own.deck.shift());log(s,p,'revealMove',`${data.name}はドラゴンではないため墓地へ`,{cardId:data.id});deckCheck(s,p);return;}
 if(!canEnterCreature(s,p,data,{origin:'deck',execution:false})){log(s,p,'revealStay',`${data.name}はこのターンの登場制限により山札の上に残る`,{cardId:data.id});return;}
 if(data.evolution||data.neoEvolution){
  if(data.neoEvolution||evolutionBases(s,p,data).length)s.decision={type:'revealEvolution',player:p,uid:top.uid,source:data.id};
  else log(s,p,'revealStay',`${data.name}は進化元がないため山札の上に残る`,{cardId:data.id});
  return;
 }
 enterRevealed(s,p,top.uid);
}
function enterRevealed(s,p,uid,baseUid=null){
 const inst=remove(s.players[p].deck,uid);
 const met=s.metrics[p];met.played[inst.cardId]=(met.played[inst.cardId]||0)+1;if(s.players[p].turns<=3)met.earlyPlayed[inst.cardId]=true;
 log(s,p,'enter',`${card(inst).name}を山札からバトルゾーンへ出す（召喚ではない）`,{cardId:inst.cardId});enterCreature(s,p,inst,baseUid,{origin:'deck',execution:false});deckCheck(s,p);
}
function deployCandidates(s,p){return ['hand','mana'].flatMap(origin=>s.players[p][origin].filter(x=>isCreature(s,x)&&costValue(card(x))<=7&&civilizations(card(x)).length>1&&canEnterCreature(s,p,card(x),{origin,execution:false})&&(!card(x).evolution||evolutionBases(s,p,card(x)).length)).map(x=>({origin,inst:x})));}
function deployCreature(s,p,uid,origin,baseUid=null){
 const inst=remove(s.players[p][origin],uid),c=card(inst),met=s.metrics[p];met.played[c.id]=(met.played[c.id]||0)+1;if(s.players[p].turns<=3)met.earlyPlayed[c.id]=true;
 log(s,p,'deploy',`${c.name}を${origin==='hand'?'手札':'マナ'}から出す（召喚ではない）`,{cardId:c.id});enterCreature(s,p,inst,baseUid,{origin,execution:false});
}
function canMugen(s,p,c,origin,selected=[]){if(![2,4].includes(c.mugenCrime)||!canEnterCreature(s,p,c,{origin,execution:true}))return false;const free=s.players[p].battle.filter(x=>isCreature(s,x)&&!x.tapped&&!selected.includes(x.uid)),need=c.mugenCrime-selected.length;if(need<0||free.length<need)return false;const birds=free.filter(x=>effectiveCard(x,s).manaBird),ordinary=free.length-birds.length,required=Math.max(0,need-ordinary),payment={...c,cost:summonCost(s,p,{...c,cost:c.mugenCrime,printedCost:c.cost,summonOrigin:origin})};return combinations(birds,required).some(bs=>manaPayment(paymentPool(s,p,[...selected,...bs.map(x=>x.uid)]),payment));}
function finishCharger(s){
 const r=s.resolvingSpell;if(!r||s.winner!==null)return;
 const c=playFaces(card(r.source))[r.face];const to='mana';delete r.inst.finishTo;clearBattleState(r.inst,to);s.players[r.inst.cardOwner??r.player][to].push(r.inst);s.resolvingSpell=null;
 log(s,r.player,'charger',`${c.name}をチャージャーでマナへ（${r.inst.tapped?'タップ':'アンタップ'}）`,{cardId:r.source,face:r.face});
}
function startJudge(s,p,source,uid,mode,onWin=null){s.judge={player:p,source,uid,mode,onWin,parent:s.judge||null,wins:0,round:0,...(mode==='attack'?{deferredEffects:(s.pendingEffects||[]).splice(0)}:{})};judgeRound(s);}
function judgeRound(s){
 const j=s.judge;j.round++;j.stage='compare';j.revealed=s.players.map(p=>p.deck[0]?{uid:p.deck[0].uid,cardId:p.deck[0].cardId}:null);
 for(const who of [s.active,1-s.active])if(!j.revealed[who]){deckCheck(s,who);if(s.winner!==null||s.lossEvent)return;}
 j.costs=j.revealed.map(x=>{if(!x)return 'no-card';const costs=[...new Set(playFaces(card(x)).map(c=>c.cost))];return costs.length===1?costs[0]:null;});
 log(s,j.player,'judgeReveal',`ガチンコ・ジャッジ${j.round}回目：${j.revealed.map((x,i)=>`${s.players[i].name}は${x?card(x).name:'公開できるカードなし'}`).join(' / ')}を公開`,{cardId:j.source});
 advanceJudgeCosts(s);
}
function advanceJudgeCosts(s){
 const j=s.judge;if(!j||j.stage!=='compare'||s.winner!==null)return;
 for(const who of [s.active,1-s.active])if(j.costs[who]===null){s.decision={type:'judgeCost',player:who,source:j.revealed[who].cardId};return;}
 // The two cards rotate directly within their libraries; a one-card library never becomes empty.
 for(const who of [0,1]){const x=s.players[who].deck.shift();if(x)s.players[who].deck.push(x);}
 const won=j.costs[j.player]==='no-card'?j.costs[1-j.player]==='no-card':j.costs[1-j.player]==='no-card'||numeric(j.costs[j.player])>=numeric(j.costs[1-j.player]);
 log(s,j.player,'judgeResult',`ガチンコ・ジャッジ：${j.costs[j.player]} 対 ${j.costs[1-j.player]}、${won?'勝ち':'負け'}`,{cardId:j.source});
 s.decision=null;
 if(j.mode==='single'){s.judge=j.parent||null;if(won&&j.onWin)extra.put(s,j.onWin);return;}
 if(j.mode==='spell'){s.judge=j.parent||null;if(won){extra.put(s,extra.task('finishJudgeCharger',j.player,j.source));draw(s,j.player,1);}else finishCharger(s);return;}
 if(won){j.wins++;s.decision={type:'judgeContinue',player:j.player};}
 else beginJudgeBreaks(s);
}
function beginJudgeBreaks(s){const j=s.judge;j.stage='breaks';j.remaining=j.wins;s.decision=null;}
function advanceJudgeBreaks(s){if(s.lossEvent)return;
 const j=s.judge;if(!j||j.stage!=='breaks'||s.extTasks?.length||s.decision||s.triggers||s.pendingEffects?.length||s.battleResolution||s.winner!==null)return;
 if(j.remaining&&s.players[1-j.player].shields.length){s.decision={type:'judgeBreak',player:j.player};return;}
 if(j.deferredEffects?.length)(s.pendingEffects??=[]).push(...j.deferredEffects);s.judge=j.parent||null;
}
// Usage declarations precede every attack-trigger resolution (506.3b).
function advanceDeclarations(s){if(s.lossEvent)return;
 if(!s.decision&&!s.triggers?.undeclared.length&&extra.shieldDeclarations(s))return;
 if(!s.attackDeclarations||s.decision||s.winner!==null)return;
 if(s.attackDeclarations.length){const uid=s.attackDeclarations[0],inst=s.players[s.active].hand.find(x=>x.uid===uid);s.decision={type:'dddDeclare',player:s.active,uid,source:inst.cardId};}
 else delete s.attackDeclarations;
}
function defenseOptions(s,p){if(!s.attack)return [];const a=s.players[s.active].battle.find(x=>x.uid===s.attack.attacker);if(!a)return [];const list=[];for(const x of s.players[p].battle){const c=effectiveCard(x,s);if(!isCreature(s,x)||x.tapped)continue;if(c.blocker&&!card(a).unblockable&&!unblockedNow(s,a)&&(!effectiveCard(a,s).flying||c.flying)&&!extra.locked(s,p,x,'block'))list.push({kind:'block',uid:x.uid,cardId:x.cardId,label:card(x).name+'でブロック'});if(c.guardman&&!c.cannotBeAttacked&&s.attack.target!=='player'&&s.attack.target!==x.uid&&s.players[p].battle.some(y=>y.uid===s.attack.target&&isCreature(s,y)))list.push({kind:'guardman',uid:x.uid,cardId:x.cardId,label:card(x).name+'でガードマン'});}return list;}
function defend(s,p,uid,kind,incarnation){if(!s.attack)return;const x=s.players[p].battle.find(x=>x.uid===uid&&(x.incarnation||0)===incarnation),a=s.players[s.active].battle.find(x=>x.uid===s.attack.attacker);if(!x||!a||x.tapped||!isCreature(s,x))return;if(kind==='guardman'&&(effectiveCard(x,s).cannotBeAttacked||s.attack.target==='player'||s.attack.target===uid||!s.players[p].battle.some(y=>y.uid===s.attack.target&&isCreature(s,y))))return;if(kind==='block'&&(card(a).unblockable||unblockedNow(s,a)||(effectiveCard(a,s).flying&&!effectiveCard(x,s).flying)||extra.locked(s,p,x,'block')))return;tapCard(s,p,x);s.attack.target=uid;log(s,p,kind==='block'?'block':'guardman',card(x).name+(kind==='block'?'でブロック':'へ攻撃先を変更'),{cardId:x.cardId});if(kind==='block'){s.attack.stage='redirecting'+(s.attack.defenseSerial=(s.attack.defenseSerial||0)+1);extra.ninjaWindow(s,s.active);}}
function advanceAttack(s){if(s.lossEvent)return;
 if(!s.attack||s.decision||s.winner!==null||s.pendingEffects?.length||s.extTasks?.length||s.triggers||s.battleResolution||s.judge||s.attackDeclarations||s.leaving)return;
 if(s.attack.stage==='effects'){if(extra.ninjaWindow(s,1-s.active))return;s.attack.stage='block';s.decision={type:'block',player:1-s.active};}
 else if(s.attack.stage.startsWith('redirecting'))resolveAttack(s,null);
 else if(s.attack.stage==='blockedEffects'){const a=s.players[s.active].battle.find(x=>x.uid===s.attack.attacker),b=s.players[1-s.active].battle.find(x=>x.uid===s.attack.blockUid);if(a&&b)battle(s,s.active,a,1-s.active,b,a.uid);s.attack=null;}
}
function battle(s,pa,a,pd,b,attackingUid=null,replaced=false){
 if(!replaced&&extra.replaceBattle(s,pa,a,pd,b,attackingUid))return;
 if(s.battleResolution){(s.battleStack??=[]).push(s.battleResolution);s.battleResolution=null;}
 const bonus=(x,p)=>effectiveCard(x,s).revZero&&!s.players[p].shields.length?10000:0;
 const ap=power(a,a.uid===attackingUid,s)+bonus(a,pa),bp=power(b,b.uid===attackingUid,s)+bonus(b,pd),late=[],forced=extra.beforeBattle(s,pa,a,pd,b);
 if(effectiveCard(a,s).slayer)late.push({controller:pa,player:pd,uid:b.uid,source:a.cardId});
 if(effectiveCard(b,s).slayer)late.push({controller:pd,player:pa,uid:a.uid,source:b.cardId});
 if(effectiveCard(a,s).afterBattleDie)late.push({controller:pa,player:pa,uid:a.uid,source:a.cardId});
 if(effectiveCard(b,s).afterBattleDie)late.push({controller:pd,player:pd,uid:b.uid,source:b.cardId});
 log(s,pa,'battle',`${card(a).name}(${ap}) 対 ${card(b).name}(${bp})`);
 const aw=forced[0]||!forced[1]&&ap>bp,bw=forced[1]||!forced[0]&&bp>ap,winner=aw&&!bw?pa:bw&&!aw?pd:null,winning=aw&&!bw?a:bw&&!aw?b:null,moves=[];if(!aw)moves.push({player:pa,uid:a.uid});if(!bw)moves.push({player:pd,uid:b.uid});
 moveCreatures(s,moves,{kind:'battleResult',winner,both:aw&&bw?[{player:pa,uid:a.uid,source:a.cardId,mechade:!!effectiveCard(a,s).mechade,breakNine:!!effectiveCard(a,s).breakNine},{player:pd,uid:b.uid,source:b.cardId,mechade:!!effectiveCard(b,s).mechade,breakNine:!!effectiveCard(b,s).breakNine}]:null,winning:winning?{uid:winning.uid,source:winning.cardId,mechade:!!effectiveCard(winning,s).mechade,breakNine:!!effectiveCard(winning,s).breakNine}:null,late:late.sort((x,y)=>Number(y.controller===s.active)-Number(x.controller===s.active))});
}
function finishBattleResult(s,winner,late,winning=null,both=null){
 if(both){const wins=[];for(const p of[s.active,1-s.active])for(const w of both.filter(x=>x.player===p)){wins.push(...s.players[p].battle.filter(x=>effectiveCard(x,s).battleWinDraw).map(x=>({player:p,uid:x.uid,source:x.cardId})),...extra.battleWins(s,p,w));if(w.breakNine)wins.push(w);}s.battleResolution={wins,late};return;}
 const wins=winner===null?[]:s.players[winner].battle.filter(x=>effectiveCard(x,s).battleWinDraw).map(x=>({player:winner,uid:x.uid,source:x.cardId}));if(winner!==null){wins.push(...extra.battleWins(s,winner,winning));if(winning?.breakNine)wins.push({player:winner,uid:winning.uid,source:winning.source,breakNine:true});}s.battleResolution={wins,late};
}
// Resolve battle-result triggers before Slayer and other "after the battle" effects (115.3d).
function resolveBattleWin(s,e){if(e.task){s.battleResolution.gateWait=true;extra.put(s,e.task);}else if(e.hunter){s.battleResolution.gateWait=true;extra.put(s,extra.task('g12Mechade',e.player,e.source));}else if(e.breakNine){s.battleResolution.gateWait=true;extra.put(s,extra.task('g21BreakNine',e.player,e.source));}else if(e.gate){s.battleResolution.gateWait=true;extra.put(s,extra.task('g20Wellkius',e.player,e.source));}else s.decision={type:'draw',player:e.player,max:1,source:e.source,reason:'battleWin'};}
function advanceBattle(s){
 while(s.battleResolution&&!s.lossEvent&&s.judge?.stage!=='compare'&&!s.decision&&!s.leaving&&s.winner===null){
  const r=s.battleResolution;
  if(r.gateWait){if(s.extTasks?.length||s.pendingEffects?.length||s.triggers)return;delete r.gateWait;}
  const who=r.wins.some(x=>x.player===s.active)?s.active:1-s.active,available=r.wins.filter(x=>x.player===who);
  if(available.length>1){s.decision={type:'battleWinOrder',player:who};return;}
  if(available.length){const e=available[0];r.wins.splice(r.wins.indexOf(e),1);resolveBattleWin(s,e);return;}
  if(r.late.length){const e=r.late.shift();if(s.players[e.player].battle.some(x=>x.uid===e.uid)){log(s,e.controller,'afterBattle',`${card(e.source).name}のバトルの後の効果`,{cardId:e.source});moveCreatures(s,[e]);}}else s.battleResolution=s.battleStack?.pop()||null;
 }
}
function resolveAttack(s,blockUid){
 const a=s.players[s.active].battle.find(x=>x.uid===s.attack.attacker),other=1-s.active;
 if(!a){s.attack=null;return;}
 if(blockUid){const b=s.players[other].battle.find(x=>x.uid===blockUid);tapCard(s,other,b);log(s,other,'block',`${card(b).name}でブロック`,{cardId:b.cardId});s.attack.stage='blockedEffects';s.attack.blockUid=blockUid;extra.ninjaWindow(s,s.active);return;}
 else if(s.attack.target!=='player'){const b=s.players[other].battle.find(x=>x.uid===s.attack.target);if(b)battle(s,s.active,a,other,b,a.uid);}
 else if(!s.players[other].shields.length)finish(s,s.active,'ダイレクトアタックが成立','loss');
 else{
  s.breakContext={player:s.active,sourceUid:a.uid,source:a.cardId,reverse:!!effectiveCard(a,s).reverseBurn,burn:!!effectiveCard(a,s).shieldBurn};
  const shields=s.players[other].shields,n=Math.min(numeric(effectiveCard(a,s).breaker||1),shields.length);
  if(effectiveCard(a,s).breaker==='∞')s.decision={type:'infinityCount',player:s.active,defender:other};
  else if(n===shields.length)breakShields(s,other,shields.map(c=>c.uid));
  else if(n===1){if(s.attack.shield&&!shields.some(x=>x.uid===s.attack.shield)&&shields.length>1)s.decision={type:'breakChoice',player:s.active,defender:other,count:1};else breakShields(s,other,[shields.some(x=>x.uid===s.attack.shield)?s.attack.shield:shields[0].uid]);}
  else s.decision={type:'breakChoice',player:s.active,defender:other,count:n};
 }
 s.attack=null;
}
// Rule 509.5: selected shields leave together. Declare every trigger before executing any.
function breakShields(s,defender,uids){
 if(extra.beforeBreak(s,defender,uids))return;
 if(s.breakContext?.burn){const burned=[];s.breakContext=null;for(const uid of uids){const x=removeShield(s,defender,uid);if(x){clearBattleState(x);s.players[defender].grave.push(x);burned.push(x);}}s.players[defender].brokenThisTurn=(s.players[defender].brokenThisTurn||0)+burned.length;s.metrics[s.active].breaks+=burned.length;log(s,s.active,'break',`シールド${burned.length}枚をブレイクして墓地へ（S・トリガー不可）`);return;}
 if(extra.reverseBreak(s,defender,uids))return;
 if(shieldGuardSources(s,defender).length){s.shieldBreak={player:defender,uids:[...uids],protections:[]};s.decision={type:'shieldGuard',player:defender};return;}
 commitShieldBreak(s,defender,uids);
}
function commitShieldBreak(s,defender,uids){
 s.breakContext=null;
 // Declaration eligibility is captured BEFORE the shields leave (official QA 48474).
 const eligibleFaces=Object.fromEntries(uids.flatMap(uid=>{const x=s.players[defender].shields.find(c=>c.uid===uid);if(!x||x.faceUp)return [];const faces=extra.triggersAllowed(s,defender)?playFaces(card(x)).flatMap((c,face)=>(c.trigger||c.triggerPlus||c.rev2Trigger&&s.players[defender].shields.length-uids.filter(uid=>s.players[defender].shields.some(x=>x.uid===uid)).length<=2||x.g19ShieldST!==undefined||c.type==='spell'&&extra.spellShieldTrigger(s,defender)||c.shieldConditionalTrigger&&s.players[defender].grave.filter(x=>playFaces(card(x)).some(c=>c.type==='spell')).length>=2)&&canCastSpell(s,defender,c)?[face]:[]):[];return faces.length?[[uid,faces]]:[];})),eligible=Object.keys(eligibleFaces);
 const broken=[];for(const uid of uids){const x=removeShield(s,defender,uid);if(!x)continue;if(x.faceUp&&card(x).gCastle){clearBattleState(x);s.players[defender].grave.push(x);}else broken.push(x);}
 s.players[defender].hand.push(...broken);s.players[defender].brokenThisTurn=(s.players[defender].brokenThisTurn||0)+broken.length;s.metrics[s.active].breaks+=broken.length;
 for(const x of broken)if(card(x).triggerPlus)x.triggerPlus=defender!==s.active&&s.players[defender].brokenThisTurn>=2;
 log(s,s.active,'break',`シールドを${broken.length}枚同時にブレイク（残り${s.players[defender].shields.length}枚）`);
 for(const x of broken)extra.shieldHand(s,defender,x,true);
 const gs=broken.filter(x=>card(x).gStrike).map(x=>x.uid);
 if(eligible.length||gs.length){if(s.triggers)(s.triggerStack??=[]).push(s.triggers);s.triggers={interrupt:!!s.g19Interrupt?.breaking,player:defender,undeclared:eligible.filter(uid=>broken.some(x=>x.uid===uid)),declared:[],entries:[],eligibleFaces,faceByUid:{},gsUndeclared:gs,gsDeclared:[]};if(s.g19Interrupt?.breaking)s.g19Interrupt.breaking=false;}
}
function interruptBreak(s,p,uids,follow){if(s.g19Interrupt)throw Error('重複した割り込み');s.g19Interrupt={breaking:true,tasks:[follow,...(s.extTasks||[])],effects:(s.pendingEffects||[]).splice(0),context:s.breakContext};s.extTasks=[];s.breakContext=null;breakShields(s,p,uids);}
function resumeInterrupt(s){const w=s.g19Interrupt;if(!w||s.shieldBreak||s.decision||!w.breaking)return;finishInterrupt(s);}
function finishInterrupt(s){const w=s.g19Interrupt;delete s.g19Interrupt;s.extTasks=[...w.tasks,...(s.extTasks||[])];s.pendingEffects=[...w.effects,...(s.pendingEffects||[])];s.breakContext=w.context;}

// Rule 112.3a: spell triggers finish first; creature entry effects wait until all triggers finish.
function advanceTriggers(s){if(s.lossEvent)return;
 while(!s.lossEvent&&s.triggers&&!s.extTasks?.length&&!s.decision&&s.winner===null){
  const t=s.triggers,p=t.player;
  if(t.undeclared.length){const c=s.players[p].hand.find(c=>c.uid===t.undeclared[0]);s.decision={type:'trigger',player:p,uid:c.uid,source:c.cardId};return;}
  if(extra.shieldDeclarations(s))return;
  t.declared=t.declared.filter(uid=>{const x=s.players[p].hand.find(c=>c.uid===uid);if(!x)return false;const c=playFaces(card(x))[t.faceByUid?.[uid]||0];if(c.type!=='creature'||canEnterCreature(s,p,c))return true;log(s,p,'entryPrevented',`${card(x).name}は登場制限により召喚できず手札に残る`,{cardId:x.cardId});return false;});
  if(t.gsUndeclared?.length){const uid=t.gsUndeclared[0];extra.choice(s,extra.task('gsDeclare',p,s.players[p].hand.find(x=>x.uid===uid).cardId,{uid}),'G・ストライクを使いますか？',[{label:'使う',value:true,score:15},{label:'使わない',value:false,score:0}]);return;}
  t.gsDeclared=(t.gsDeclared||[]).filter(uid=>s.players[p].hand.some(x=>x.uid===uid));
  const usable=t.declared.filter(uid=>canUseTrigger(s,p,playFaces(card(s.players[p].hand.find(x=>x.uid===uid)))[t.faceByUid?.[uid]||0]));
  if(usable.length+(t.gsDeclared?.length||0)>1){s.decision={type:'triggerOrder',player:p};return;}
  if(usable.length){const uid=usable[0];t.declared.splice(t.declared.indexOf(uid),1);executeTrigger(s,p,uid,t.faceByUid?.[uid]||0);continue;}
  if(t.gsDeclared?.length){const uid=t.gsDeclared.shift();extra.put(s,extra.task('gsTarget',p,s.players[p].hand.find(x=>x.uid===uid).cardId));continue;}
  for(const uid of t.declared){const c=card(s.players[p].hand.find(x=>x.uid===uid));log(s,p,'spellPrevented',`${c.name}は実行条件を満たさないため使用できず手札に残る`,{cardId:c.id});}t.declared=[];
  if(t.interrupt){s.pendingEffects=[...(s.pendingEffects||[]),...t.entries];s.triggers=s.triggerStack?.pop()||null;finishInterrupt(s);return;}
  if(s.pendingEffects?.length)t.entries.push(...s.pendingEffects.splice(0));
  t.entries=availableEffects(s,t.entries);
  if(!t.entries.some(x=>x.player===s.active)&&extra.beforeNonActive(s))return;
  const ep=t.entries.some(x=>x.player===s.active)?s.active:1-s.active,entries=t.entries.filter(x=>x.player===ep);
  if(entries.length>1){s.decision={type:'entryOrder',player:ep};return;}
  if(entries.length){const e=entries[0];t.entries.splice(t.entries.indexOf(e),1);resolveEntry(s,e);advanceBattle(s);continue;}
  s.triggers=s.triggerStack?.pop()||null;
 }
}
function canUseTrigger(s,p,c){return extra.triggersAllowed(s,p)&&canCastSpell(s,p,c)&&!spellIgnored(s,c)&&(c.type!=='creature'||canEnterCreature(s,p,c))&&(!c.evolution||evolutionBases(s,p,c).length>0);}
function executeTrigger(s,p,uid,face){const x=s.players[p].hand.find(x=>x.uid===uid),c=playFaces(card(x))[face];if(c.evolution||c.neoEvolution)s.decision={type:'triggerEvolution',player:p,uid,source:x.cardId,face};else playCard(s,p,uid,true,null,face);}
function combinations(items,n){if(n===0)return [[]];if(n>items.length)return [];return items.flatMap((x,i)=>combinations(items.slice(i+1),n-1).map(rest=>[x,...rest]));}

function nextTurn(s){
 extra.expire(s,'end',s.active);for(const p of[s.active,1-s.active]){deckCheck(s,p);if(s.winner!==null||s.lossEvent)return;}s.noManaUse=[false,false];s.endStep=null;s.creaturesEntered=0;
 for(const p of s.players){p.enteredThisTurn=0;p.entryLimitThisTurn=false;for(const c of p.battle){c.buff=0;c.unblocked=false;delete c.buffSources;delete c.unblockSpellCost;}}
 s.active=s.extraTurns?.length?s.extraTurns.shift().player:1-s.active;extra.expire(s,'start',s.active);s.turn++;s.phase='charge';const p=s.players[s.active];p.turns++;s.metrics[s.active].turns=p.turns;if(!p.deck.length){deckCheck(s,s.active);if(s.winner!==null||s.lossEvent)return;}
 // Expire effects at the specified controller's turn start, before untapping.
 for(const own of s.players)for(const top of own.battle)for(const c of layers(top)){if(c.tapLocks)c.tapLocks=c.tapLocks.filter(who=>who!==s.active);}
 for(const top of p.battle)for(const c of layers(top))delete c.hyperActive;
 for(const c of [...p.mana,...p.battle]){if(!c.skipUntap&&canUntap(c))c.tapped=false;delete c.skipUntap;}
 p.entryLimitThisTurn=!!p.entryLimitNextTurn;p.entryLimitNextTurn=false;
 log(s,s.active,'turn',`${p.name}の${p.turns}ターン目`);s.startStep={player:s.active};s.phase='start';for(const e of extra.start(s,s.active))enqueueEffect(s,e.player??s.active,e);advanceStart(s);
}
function advanceStart(s){if(s.lossEvent)return;if(!s.startStep||s.decision||s.extTasks?.length||s.pendingEffects?.length||s.triggers||s.leaving||s.battleResolution||s.winner!==null)return;const p=s.startStep.player;delete s.startStep;s.phase='charge';draw(s,p,1);}
function beginEnd(s){
 const untappers=s.players[s.active].battle.filter(c=>effectiveCard(c,s).endUntap&&c.tapped&&canUntap(c)),deferred=[...extra.end(s),...(untappers.length?[{uid:untappers[0].uid,source:untappers[0].cardId,effect:'endUntap',uids:untappers.map(x=>x.uid)}]:[])],p=1-s.active;s.endStep={player:p,stage:'declare',deferred,remaining:s.players[p].hand.filter(x=>card(x).gaia||card(x).endMirage).map(x=>x.uid),declared:[],untap:[]};advanceEnd(s);
}
function advanceEnd(s){if(s.lossEvent)return;
 const end=s.endStep;if(!end||s.decision||s.extTasks?.length||s.winner!==null||s.pendingEffects?.length||s.triggers||s.leaving||s.battleResolution||s.judge||s.attack)return;
 const p=end.player,own=s.players[p];
 if(end.stage==='declare'){
  end.remaining=end.remaining.filter(uid=>{const x=own.hand.find(x=>x.uid===uid);return x&&(card(x).endMirage||s.noManaUse?.[s.active]&&!own.battle.some(x=>card(x).gaia));});
  if(end.remaining.length){s.decision={type:card(own.hand.find(x=>x.uid===end.remaining[0])).endMirage?'mirageDeclare':'gaiaDeclare',player:p,uid:end.remaining[0],source:own.hand.find(x=>x.uid===end.remaining[0])?.cardId};return;}
  end.stage='resolve';const deferred=end.deferred||[];end.deferred=[];for(const e of deferred)enqueueEffect(s,e.player??s.active,e);if(deferred.length)return;
  if(end.untap.length){s.decision={type:'untap',player:s.active,uids:end.untap};return;}
 }
 end.declared=end.declared.filter(uid=>own.hand.some(x=>x.uid===uid));
 while(end.declared.length){
  if(end.declared.length>1&&end.declared.some(uid=>card(own.hand.find(x=>x.uid===uid)).endMirage)){s.decision={type:'endAbilityOrder',player:p};return;}
  const uid=end.declared.shift(),x=own.hand.find(x=>x.uid===uid);
  if(x&&card(x).endMirage){extra.put(s,extra.task('mirageCast',p,x.cardId,{uid}));return;}
  if(x&&s.noManaUse?.[s.active]&&!own.battle.some(x=>card(x).gaia)&&canEnterCreature(s,p,card(x))){s.decision={type:'gaiaSummon',player:p,uid,source:x.cardId};return;}
 }
 nextTurn(s);
}

function option(kind,label,extra={}){return {kind,label,...extra};}
function effectOptions(entries,kind){return entries.map((e,i)=>option(kind,`${card(e.source).name} ${i+1}：${e.effect==='dragonEntryTap'?'ドラゴン登場時の任意タップ':e.effect==='shieldEntryTapLock'?'シールド追加時のタップとアンタップ制限':e.effect==='ddd'?'宣言したD・D・D':e.effect==='attackDragonReveal'?'攻撃時の山札公開':e.effect==='attackJudge'?'攻撃時のガチンコ・ジャッジ':e.effect==='extended'?'カードの能力':'出た時の効果'}を先に解決`,{uid:e.uid,cardId:e.source,effectId:e.effectId}));}
export function getLegalActions(s){
 if(s.winner!==null)return [];
 let out=[];const d=s.decision,p=d?d.player:s.active,own=s.players[p],opp=s.players[1-p];
 if(d){
  if(d.type==='extended')out=extra.actions(s,d);
  if(d.type==='leaveReplace'){
   const row=s.leaving.rows.find(x=>x.uid===d.uid&&x.player===p),v=leaveOptions(s,row),name=card(own.battle.find(x=>x.uid===row.uid)).name;
   if(v.ex)out.push(option('replaceEx',`${name}をEXライフで残す`,{shield:v.ex}));
   if(v.gneo)out.push(option('replaceGneo',`${name}の下のカードすべてをかわりに移動する`));
   for(const shield of v.escape)out.push(option('replaceEscape',`${name}を残し、シールド${own.shields.findIndex(x=>x.uid===shield.uid)+1}を手札へ（S・トリガー不可）`,{shield:shield.uid}));
   for(const x of v.ultra)out.push(option('replaceUltra',card(x).name+'をウルトラ・セイバーでかわりに破壊する',{uid:x.uid,cardId:x.cardId}));
   for(const x of v.ater)out.push(option('replaceAter',`${card(x).name}をかわりに破壊して残す`,{uid:x.uid,cardId:x.cardId}));
   if(v.mana.length>=3)out.push(option('replaceMana',`${name}を残すためマナ3枚を選ぶ`));
   if(!d.mandatory)out.push(option('allowLeave',`${name}をそのまま移動する`));
  }
  if(d.type==='leaveMana'){const row=s.leaving.rows.find(x=>x.uid===d.uid&&x.player===p),v=leaveOptions(s,row);out=v.mana.filter(x=>!d.chosen.includes(x.uid)).map(x=>option('leaveMana',`${card(x).name}を保護コスト${d.chosen.length+1}/3枚目に選ぶ`,{uid:x.uid,cardId:x.cardId}));out.push(option('cancelLeaveMana','マナの選択をやり直す'));}
  if(d.type==='deploy'){out=deployCandidates(s,p).map(({origin,inst})=>option('deploy',`${origin==='hand'?'手札':'マナ'}の${card(inst).name}を出す`,{uid:inst.uid,cardId:inst.cardId,origin}));out.push(option('skipDeploy','クリーチャーを出さない'));}
  if(d.type==='deployEvolution'){const c=card(d.source);out=evolutionBases(s,p,c).map(x=>option('deployEvolve',`${card(x).name}の上に${c.name}を重ねて出す`,{uid:d.uid,cardId:c.id,origin:d.origin,baseUid:x.uid}));if(c.neoEvolution)out.unshift(option('deployEvolve',`${c.name}を進化させず出す`,{uid:d.uid,cardId:c.id,origin:d.origin}));out.push(option('cancelDeploy','出すカードを選び直す'));}
  if(d.type==='mugen'){out=own.battle.filter(x=>isCreature(s,x)&&!x.tapped&&!d.chosen.includes(x.uid)&&canMugen(s,p,card(d.source),d.origin,[...d.chosen,x.uid])).map(x=>option('mugenTap',`${card(x).name}をタップする${d.chosen.length+1}/${card(d.source).mugenCrime}体目に選ぶ`,{uid:x.uid,cardId:x.cardId}));out.push(option('cancelMugen','召喚をやめる'));}
  if(d.type==='infinityCount')out=Array.from({length:opp.shields.length+1},(_,n)=>option('infinityCount',`${n}つのシールドをブレイクする`,{n}));
  if(d.type==='infinityShields')out=opp.shields.filter(x=>!d.chosen.includes(x.uid)).map(x=>option('infinityShield',`シールド${opp.shields.findIndex(y=>y.uid===x.uid)+1}を${d.chosen.length+1}/${d.count}つ目に選ぶ`,{shield:x.uid,exLifeHit:!!exLifeShieldInfo(s,1-p,x.uid)?.active}));
  if(d.type==='dddDeclare')out=[option('declareDDD',`${card(d.source).name}のD・D・Dを宣言（支払いは解決時）`,{uid:d.uid,cardId:d.source}),option('skipDDD','このカードは宣言しない')];
  if(d.type==='dddSummon'){
   const c=card(d.source),inst=own.hand.find(x=>x.uid===d.uid),payment=dddPayment(s,p,c);
   if(inst&&payment&&canEnterCreature(s,p,c)&&manaPayment(paymentPool(s,p),{...c,...payment})){out=[option('summonDDD',`${payment.cost}マナで${c.name}を進化させず召喚`,{uid:d.uid,cardId:c.id,cost:payment.cost}),...evolutionBases(s,p,c).map(base=>option('summonDDD',`${payment.cost}マナで${card(base).name}の上に${c.name}を重ねる`,{uid:d.uid,baseUid:base.uid,cardId:c.id,cost:payment.cost}))];}
   out.push(option('skipDDDSummon','召喚せず手札に残す'));
  }
  if(d.type==='triggerEvolution'){const c=playFaces(card(d.source))[d.face];out=evolutionBases(s,p,c).map(base=>option('triggerEvolve',card(base).name+'の上にS・トリガーで召喚',{uid:d.uid,cardId:d.source,baseUid:base.uid}));if(c.neoEvolution)out.unshift(option('triggerEvolve','進化させずにS・トリガーで召喚',{uid:d.uid,cardId:d.source}));}
  if(d.type==='evolution'){const c=card(d.source);out=evolutionBases(s,p,c).map(base=>option('evolve',`${card(base).name}の上に${c.name}を重ねる`,{uid:d.uid,baseUid:base.uid,cardId:c.id}));if(c.neoEvolution)out.unshift(option('evolve',`${c.name}を進化させず召喚`,{uid:d.uid,cardId:c.id}));out.push(option('cancelEvolution','召喚をやめる'));}
  if(d.type==='revealEvolution'){const c=card(d.source);out=evolutionBases(s,p,c).map(base=>option('revealEvolve',`${card(base).name}の上に公開した${c.name}を重ねる`,{uid:d.uid,baseUid:base.uid,cardId:c.id}));if(c.neoEvolution)out.unshift(option('revealEvolve',`公開した${c.name}を進化させず出す`,{uid:d.uid,cardId:c.id}));}
  if(d.type==='judgeCost')out=playFaces(card(d.source)).map((c,face)=>option('judgeCost',`${c.name}のコスト${c.cost}を参照`,{face,cost:c.cost,cardId:d.source}));
  if(d.type==='judgeContinue')out=[option('judgeAgain',`もう一度ガチンコ・ジャッジ（現在${s.judge.wins}勝）`),option('stopJudge',`${s.judge.wins}勝で中止し、ブレイクへ進む`)];
  if(d.type==='judgeBreak')out=opp.shields.map((x,i)=>{const ex=!!exLifeShieldInfo(s,1-p,x.uid)?.active;return option('judgeBreak',`効果でシールド${i+1}${ex?'（EXライフ）':''}を1つブレイク（残り${s.judge.remaining}回）`,{shield:x.uid,exLifeHit:ex});});
  if(d.type==='shieldGuard'){
   const b=s.shieldBreak,remaining=b.uids.filter(uid=>!b.protections.some(x=>x.shield===uid));
   out=shieldGuardChoices(s).flatMap(c=>remaining.map(shield=>{const i=own.shields.findIndex(x=>x.uid===shield)+1,ex=!!exLifeShieldInfo(s,p,shield)?.active;return option('guardShield',`${card(c).name}の下の${layers(c).length-1}枚をすべて墓地へ置き、シールド${i}${ex?'（EXライフ）':''}を残す`,{uid:c.uid,cardId:c.cardId,shield,exLifeHit:ex});}));
   out.push(option('finishShieldGuards',b.protections.length?'選択を確定し、残りはブレイクする':'置き換えずにブレイクする'));
  }
  if(d.type==='mirageDeclare')out=[option('declareGaia','真気楼の使用を宣言する',{uid:d.uid,cardId:d.source}),option('skipGaiaDeclare','このカードは宣言しない')];
  if(d.type==='endAbilityOrder')out=s.endStep.declared.map(uid=>option('orderEndAbility',card(own.hand.find(x=>x.uid===uid)).name+'を先に解決',{uid,cardId:own.hand.find(x=>x.uid===uid).cardId}));
  if(d.type==='gaiaDeclare')out=[option('declareGaia','ガイアッシュの使用を宣言する',{uid:d.uid,cardId:d.source}),option('skipGaiaDeclare','このカードは宣言しない')];
  if(d.type==='gaiaSummon')out=[option('summonGaia','ガイアッシュをコストを支払わずに召喚する',{uid:d.uid,cardId:d.source,origin:'hand'}),option('skipGaiaSummon','召喚せず手札に残す')];
  if(d.type==='block'){const a=opp.battle.find(x=>x.uid===s.attack.attacker);out=[option('noBlock','ブロックしない')];if(a&&!card(a).unblockable&&!unblockedNow(s,a))for(const c of own.battle)if(effectiveCard(c,s).type==='creature'&&effectiveCard(c,s).blocker&&(!effectiveCard(a,s).flying||effectiveCard(c,s).flying)&&!c.tapped&&!extra.locked(s,p,c,'block'))out.push(option('block',`${card(c).name}でブロック`,{uid:c.uid}));}
  if(d.type==='block'&&s.attack.target!=='player'&&own.battle.some(x=>x.uid===s.attack.target&&isCreature(s,x)))for(const x of own.battle)if(x.uid!==s.attack.target&&!x.tapped&&isCreature(s,x)&&!effectiveCard(x,s).cannotBeAttacked&&effectiveCard(x,s).guardman)out.push(option('guardman',card(x).name+'でガードマン（ブロックではありません）',{uid:x.uid,cardId:x.cardId}));
  if(d.type==='block'&&defenseOptions(s,p).length>1)out.push(option('defendMany','複数のブロッカー・ガードマンを選ぶ'));
  if(d.type==='breakChoice')out=combinations(opp.shields.map((c,i)=>({uid:c.uid,index:i+1,ex:!!exLifeShieldInfo(s,1-p,c.uid)?.active})),d.count).map(rows=>option('breakShields',`シールド${rows.map(r=>r.index+(r.ex?'（EXライフ）':'')).join('・')}をブレイク`,{shields:rows.map(r=>r.uid),exLifeHits:rows.filter(r=>r.ex).length}));
  if(d.type==='triggerOrder')out=s.triggers.declared.filter(uid=>canUseTrigger(s,p,playFaces(card(own.hand.find(c=>c.uid===uid)))[s.triggers.faceByUid?.[uid]||0])).map(uid=>{const c=own.hand.find(c=>c.uid===uid);return option('orderTrigger',`${playFaces(card(c))[s.triggers.faceByUid?.[uid]||0].name}を先に使う`,{uid,cardId:c.cardId});});
  if(d.type==='triggerOrder')out.push(...(s.triggers.gsDeclared||[]).map(uid=>option('orderGS','G・ストライクを先に使う',{uid,cardId:own.hand.find(x=>x.uid===uid).cardId})));
  if(d.type==='entryOrder')out=effectOptions(s.triggers.entries.filter(e=>e.player===p),'orderEntry');
  if(d.type==='effectOrder')out=effectOptions(s.pendingEffects.filter(e=>e.player===p),'orderEffect');
  if(d.type==='dragonTap'){out=opp.battle.filter(x=>isCreature(s,x)).map(x=>option('dragonTap',`${card(x).name}をタップ${x.tapped?'（タップ中）':''}`,{uid:x.uid,cardId:x.cardId}));out.push(option('skipDragonTap','今回はタップせず、次の登場時に使えるようにする'));}
  if(d.type==='trigger')out=[...(s.triggers.eligibleFaces?.[d.uid]||[0]).map(face=>option('useTrigger',`${playFaces(card(d.source))[face].name}を使う`,{uid:d.uid,cardId:d.source,...(card(d.source).spellFace?{face}:{})})),option('skipTrigger','使わず手札に加える')];
  if(d.type==='fight'){out=own.battle.some(x=>x.uid===d.uid)?opp.battle.filter(x=>isCreature(s,x)).map(x=>option('fight',`${card(x).name}とバトル（相手のパワー${power(x,x.uid===s.attack?.attacker,s)}）`,{uid:d.uid,target:x.uid,cardId:x.cardId})):[];out.push(option('skipFight','バトルさせない'));}
  if(d.type==='battleWinOrder')out=s.battleResolution.wins.filter(e=>e.player===p).map((e,i)=>option('battleWinOrder',`${card(e.source).name} ${i+1}体目の勝利時能力を先に解決`,{uid:e.uid,cardId:e.source}));
  if(d.type==='draw')out=Array.from({length:d.max+1},(_,n)=>option('draw',n?`${n}枚引く`:'引かない',{n}));
  if(d.type==='optionalRamp')out=[option('useRamp','4枚をマナに置き、2枚を山札に戻す'),option('skipRamp','マナに置かない')];
  if(d.type==='manaTop')out=own.mana.filter(x=>!d.chosen.includes(x.uid)).map(x=>option('manaTop',`山札の上から${d.chosen.length+1}枚目に${card(x).name}を置く（${x.tapped?'タップ中':'アンタップ'}）`,{uid:x.uid,cardId:x.cardId}));
  if(d.type==='search'){out=[option('search','選ばずにシャッフル',{uid:null})];for(const c of own.deck)if(isCreature(s,c)&&!out.some(a=>a.cardId===c.cardId))out.push(option('search',`${card(c).name}を手札へ`,{uid:c.uid,cardId:c.cardId}));}
  if(d.type==='untap')out=[option('endUntap','アンタップする',{yes:true}),option('endUntap','アンタップしない',{yes:false})];
  if(d.type==='effect'){
   if(d.effect==='tapTwo'){out=[option('effect','選ばない',{targets:[]})];for(let i=0;i<d.targets.length;i++){const a=d.targets[i];out.push(option('effect',`${nameOf(s,a)}をタップ`,{targets:[a]}));for(let j=i+1;j<d.targets.length;j++){const b=d.targets[j];out.push(option('effect',`${nameOf(s,a)}・${nameOf(s,b)}をタップ`,{targets:[a,b]}));}}}
   else out=d.targets.map(t=>option('effect',`${nameOf(s,t)}を選ぶ`,{targets:[t]}));
   if(d.optional)out.push(option('skipEffect','効果を使わない'));
  }
 }else if(s.phase==='charge'){out=own.hand.map(c=>option('charge',`${card(c).name}をマナへ`,{uid:c.uid,cardId:c.cardId}));out.push(option('skipCharge','マナを置かずに進む'));}
 else if(s.phase==='main'){
  out=own.hand.flatMap(inst=>playFaces(card(inst)).flatMap((c,face)=>canCastSpell(s,p,c)&&(c.type!=='creature'||canEnterCreature(s,p,c))&&validMana(s,p,c)&&(!c.evolution||evolutionBases(s,p,c).length)?[option('play',`${c.name}を${c.type==='creature'?'召喚':c.type==='gear'?'ジェネレート':'使用'}`,{uid:inst.uid,cardId:inst.cardId,cost:summonCost(s,p,c),...(card(inst).spellFace?{face}:{})})]:[]));out.push(...own.mana.filter(x=>card(x).manaSummon&&canEnterCreature(s,p,card(x),{origin:'mana',execution:true})&&validMana(s,p,{...card(x),summonOrigin:'mana'})).map(x=>option('play',`マナの${card(x).name}を召喚`,{uid:x.uid,cardId:x.cardId,cost:summonCost(s,p,{...card(x),summonOrigin:'mana'}),origin:'mana'})));
  for(const origin of ['hand','grave'])out.push(...own[origin].filter(x=>canMugen(s,p,card(x),origin)).map(x=>option('mugenStart',`${origin==='hand'?'手札':'墓地'}の${card(x).name}をムゲンクライム${card(x).mugenCrime}で召喚`,{uid:x.uid,cardId:x.cardId,origin,cost:Math.max(civilizations(card(x)).length,summonCost(s,p,{...card(x),cost:card(x).mugenCrime,printedCost:card(x).cost,summonOrigin:origin}))})));
  out.push(...extra.mainActions(s,p));out.push(option('toAttack','攻撃へ進む'));
 }else if(s.phase==='attack'){
  for(const c of own.battle.filter(c=>canAttack(s,p,c))){if(!effectiveCard(c,s).noPlayerAttack&&canAttackPlayer(s,c)){if(opp.shields.length&&effectiveCard(c,s).noShieldBreak){}else if(opp.shields.length&&effectiveCard(c,s).breaker)out.push(option('attack',`${card(c).name} → 相手（${effectiveCard(c,s).breaker==='∞'?'∞ブレイカー':Math.min(effectiveCard(c,s).breaker,opp.shields.length)+'枚ブレイク'}）`,{uid:c.uid,target:'player'}));else if(opp.shields.length)for(let i=0;i<opp.shields.length;i++){const ex=!!exLifeShieldInfo(s,1-p,opp.shields[i].uid)?.active;out.push(option('attack',`${card(c).name} → シールド${i+1}${ex?'（EXライフ）':''}`,{uid:c.uid,target:'player',shield:opp.shields[i].uid,exLifeHit:ex}));}else out.push(option('attack',`${card(c).name}でダイレクトアタック`,{uid:c.uid,target:'player'}));}
   for(const target of opp.battle.filter(x=>isCreature(s,x)&&!effectiveCard(x,s).cannotBeAttacked&&(!effectiveCard(x,s).flying||effectiveCard(c,s).flying)&&(x.tapped||(c.entered===s.turn&&effectiveCard(c,s).machFighter))&&(!effectiveCard(x,s).justDiver||!x.justDiverActive||extra.creatures(s,p).some(y=>effectiveCard(y,s).ignoreAttackLocks))))out.push(option('attack',`${card(c).name} → ${card(target).name}`,{uid:c.uid,target:target.uid}));
  }
  if(!own.battle.some(c=>effectiveCard(c,s).mustAttack&&canAttack(s,p,c)))out.push(option('endTurn','ターン終了'));
 }
 out=out.filter(a=>(!['fight','dragonTap'].includes(a.kind)||extra.targetable(s,p,1-p,s.players[1-p].battle.find(x=>x.uid===(a.target||a.uid))))&&(!a.targets||a.targets.every(t=>extra.targetable(s,p,t.player,s.players[t.player].battle.find(x=>layers(x).some(y=>y.uid===t.uid))))));
 out=extra.variants(s,p,extra.forceActions(s,p,out));
 return out.map((a,i)=>({...a,id:i,player:p}));
}
function nameOf(s,t){const top=s.players[t.player].battle.find(x=>layers(x).some(y=>y.uid===t.uid)),x=top&&layers(top).find(x=>x.uid===t.uid);return card(x).name+(top.uid!==x.uid?'（'+card(top).name+'の下）':'');}
const evolutionFace=a=>playFaces(card(a.cardId))[a.face||0];
export function step(s,action){
 const opts=getLegalActions(s);let a=typeof action==='number'?opts[action]:opts.find(x=>JSON.stringify(x)===JSON.stringify(action));
 // Only the declared number may differ from a legal template; all other fields stay validated.
 if(!a&&s.decision?.task?.op==='g9Number'&&(action?.number==='∞'||Number.isSafeInteger(action?.number)&&action.number>=0)){const template=opts.find(x=>JSON.stringify({...x,number:action.number})===JSON.stringify(action));if(template)a={...template,number:action.number};}
 if(!a)throw Error('選択できない行動です');
 const p=a.player,d=s.decision;s.actions++;
 if(a.kind==='extended')extra.step(s,a,d);
 if(a.kind==='crossGear')extra.crossAction(s,p,a);
 if(a.kind==='hyper')extra.hyper(s,p,a.uid);
 if(['replaceEx','replaceGneo','replaceEscape','allowLeave'].includes(a.kind)){const row=s.leaving.rows.find(x=>x.uid===d.uid&&x.player===p);row.plan=a.kind==='replaceEx'?{kind:'ex',shield:a.shield}:a.kind==='replaceGneo'?{kind:'gneo'}:a.kind==='replaceEscape'?{kind:'escape',shield:a.shield}:{kind:'leave'};s.decision=null;}
 if(a.kind==='replaceUltra'){s.leaving.rows.find(x=>x.uid===d.uid&&x.player===p).plan={kind:'ultra',uid:a.uid};s.decision=null;}
 if(a.kind==='replaceAter'){s.leaving.rows.find(x=>x.uid===d.uid&&x.player===p).plan={kind:'ater',uid:a.uid};s.decision=null;}
 if(a.kind==='replaceMana')s.decision={type:'leaveMana',player:p,uid:d.uid,chosen:[],mandatory:d.mandatory};
 if(a.kind==='leaveMana'){d.chosen.push(a.uid);if(d.chosen.length===3){s.leaving.rows.find(x=>x.uid===d.uid&&x.player===p).plan={kind:'mana',mana:[...d.chosen]};s.decision=null;}}
 if(a.kind==='cancelLeaveMana')s.decision={type:'leaveReplace',player:p,uid:d.uid,mandatory:d.mandatory};
 if(a.kind==='deploy'){const c=card(a.cardId);if(c.evolution||c.neoEvolution)s.decision={type:'deployEvolution',player:p,uid:a.uid,source:c.id,origin:a.origin};else{s.decision=null;deployCreature(s,p,a.uid,a.origin);}}
 if(a.kind==='deployEvolve'){s.decision=null;deployCreature(s,p,a.uid,a.origin,a.baseUid);}
 if(a.kind==='cancelDeploy')s.decision={type:'deploy',player:p};
 if(a.kind==='skipDeploy')s.decision=null;
 if(a.kind==='mugenStart')s.decision={type:'mugen',player:p,uid:a.uid,source:a.cardId,origin:a.origin,chosen:[]};
 if(a.kind==='mugenTap'){d.chosen.push(a.uid);if(d.chosen.length===card(d.source).mugenCrime){for(const uid of d.chosen)tapCard(s,p,s.players[p].battle.find(x=>x.uid===uid));s.decision=null;log(s,p,'mugenCrime',`${card(d.source).name}をムゲンクライム${card(d.source).mugenCrime}で召喚`,{cardId:d.source});playCard(s,p,d.uid,false,null,0,card(d.source).mugenCrime,d.origin);}}
 if(a.kind==='cancelMugen')s.decision=null;
 if(a.kind==='infinityCount'){if(!a.n)s.breakContext=null;s.decision=a.n?{type:'infinityShields',player:p,defender:d.defender,count:a.n,chosen:[]}:null;}
 if(a.kind==='infinityShield'){d.chosen.push(a.shield);if(d.chosen.length===d.count){s.decision=null;breakShields(s,d.defender,d.chosen);}}
 if(a.kind==='charge'){const c=remove(s.players[p].hand,a.uid);c.tapped=manaCivilizations(card(c)).length>1;s.players[p].mana.push(c);extra.handMana(s,p,c);s.metrics[p].charges++;s.phase='main';log(s,p,'charge',`${card(c).name}をマナへ`,{cardId:c.cardId});}
 if(a.kind==='skipCharge'){s.phase='main';log(s,p,'skip','マナチャージを省略');}
 if(a.kind==='play'){if(a.freeSummon&&(evolutionFace(a).evolution||evolutionFace(a).neoEvolution))s.decision={type:'evolution',player:p,uid:a.uid,source:a.cardId,playAction:a};else if(a.freeSummon)playCard(s,p,a.uid,true,null,a.face||0,null,a.origin||'hand',a.freeSummon,false,a.manaPermit,a.snowReducers,null,a.magicReducers,a.g7Payment,a.g18Reducers??null);else if(a.alternative)extra.beginAlternative(s,p,a);else if(evolutionFace(a).evolution||evolutionFace(a).neoEvolution)s.decision={type:'evolution',player:p,uid:a.uid,source:a.cardId,playAction:a};else playCard(s,p,a.uid,false,null,a.face||0,null,a.origin||'hand','S・トリガー',!!a.ownGraveCast,a.manaPermit,a.snowReducers,null,a.magicReducers,a.g7Payment,a.g18Reducers??null);}
 if(a.kind==='evolve'){s.decision=null;playCard(s,p,a.uid,!!d.playAction?.freeSummon,a.baseUid,d.playAction?.face||0,null,d.playAction?.origin||'hand',d.playAction?.freeSummon||'S・トリガー',!!d.playAction?.ownGraveCast,d.playAction?.manaPermit,d.playAction?.snowReducers,null,d.playAction?.magicReducers,d.playAction?.g7Payment,d.playAction?.g18Reducers??null);}
 if(a.kind==='revealEvolve'){s.decision=null;enterRevealed(s,p,a.uid,a.baseUid);}
 if(a.kind==='cancelEvolution')s.decision=null;
 if(a.kind==='toAttack'){s.phase='attack';log(s,p,'phase','攻撃ステップへ');}
 if(a.kind==='attack'){
  const c=s.players[p].battle.find(x=>x.uid===a.uid),data=effectiveCard(c,s),stopped=selfTriggersStopped(s,p);s.attack={attacker:a.uid,target:a.target,shield:a.shield,stage:'effects'};if(power(c,true,s)>=12000)(s.g16BigAttack??={})[p]=s.turn;tapCard(s,p,c);extra.attackStart(s,p,c);extra.attackTriggers(s,p,c);log(s,p,'attack',a.label,{cardId:c.cardId});
  s.attackDeclarations=s.players[p].hand.filter(x=>dddPayment(s,p,card(x))).map(x=>x.uid);
  for(const effect of ['attackDragonReveal','attackJudge','deployMulticolor7','attackExecuteHand'])if(data[effect]||(effect==='deployMulticolor7'&&data.effect===effect)){if(stopped)log(s,p,'triggerPrevented',`${data.name}自身の攻撃時能力はGGによりトリガーしない`,{cardId:data.id});else enqueueEffect(s,p,{uid:c.uid,source:data.id,effect:effect==='deployMulticolor7'?'deploy':effect});}
 }
 if(a.kind==='declareDDD'||a.kind==='skipDDD'){s.decision=null;s.attackDeclarations.shift();if(a.kind==='declareDDD'){enqueueEffect(s,p,{uid:a.uid,source:a.cardId,effect:'ddd'});log(s,p,'dddDeclare',`${card(a.cardId).name}のD・D・Dを宣言`,{cardId:a.cardId});}}
 if(a.kind==='summonDDD'){s.decision=null;log(s,p,'dddSummon',`${card(a.cardId).name}のD・D・Dを解決（${a.cost}マナ）`,{cardId:a.cardId});playCard(s,p,a.uid,false,a.baseUid||null,0,dddPayment(s,p,card(a.cardId)));}
 if(a.kind==='skipDDDSummon'){s.decision=null;log(s,p,'skip',`${card(d.source).name}のD・D・Dで召喚しない`,{cardId:d.source});}
 if(a.kind==='defendMany'){s.decision=null;extra.put(s,extra.task('g16DefenseSelect',p,s.players[p].battle.find(x=>x.uid===defenseOptions(s,p)[0].uid).cardId,{selected:[]}));}
 if(a.kind==='guardman'){s.decision=null;const x=s.players[p].battle.find(x=>x.uid===a.uid);tapCard(s,p,x);s.attack.target=x.uid;log(s,p,'guardman',card(x).name+'へ攻撃先を変更',{cardId:x.cardId});resolveAttack(s,null);}
 if(a.kind==='block'||a.kind==='noBlock'){s.decision=null;resolveAttack(s,a.kind==='block'?a.uid:null);}
 if(a.kind==='useTrigger'){s.decision=null;s.triggers.undeclared.shift();s.triggers.declared.push(a.uid);(s.triggers.faceByUid??={})[a.uid]=a.face||0;log(s,p,'declare',`${playFaces(card(d.source))[a.face||0].name}のS・トリガーを宣言`,{cardId:d.source});}
 if(a.kind==='skipTrigger'){s.decision=null;s.triggers.undeclared.shift();log(s,p,'skip','S・トリガーを使わない');}
 if(a.kind==='breakShields'){s.decision=null;breakShields(s,d.defender,a.shields);}
 if(a.kind==='judgeCost'){s.judge.costs[p]=a.cost;s.decision=null;advanceJudgeCosts(s);}
 if(a.kind==='judgeAgain'){s.decision=null;judgeRound(s);}
 if(a.kind==='stopJudge')beginJudgeBreaks(s);
 if(a.kind==='judgeBreak'){s.decision=null;s.judge.remaining--;breakShields(s,1-p,[a.shield]);}
 if(a.kind==='guardShield'){const b=s.shieldBreak;b.protections.push({uid:a.uid,shield:a.shield});if(b.protections.length===b.uids.length||!shieldGuardChoices(s).length)finishShieldGuards(s);}
 if(a.kind==='finishShieldGuards')finishShieldGuards(s);
 if(a.kind==='orderGS'){s.decision=null;s.triggers.gsDeclared.splice(s.triggers.gsDeclared.indexOf(a.uid),1);extra.put(s,extra.task('gsTarget',p,a.cardId));}
 if(a.kind==='orderTrigger'){s.decision=null;s.triggers.declared.splice(s.triggers.declared.indexOf(a.uid),1);executeTrigger(s,p,a.uid,s.triggers.faceByUid?.[a.uid]||0);}
 if(a.kind==='triggerEvolve'){s.decision=null;playCard(s,p,a.uid,true,a.baseUid||null,d.face);}
 if(a.kind==='orderEntry'||a.kind==='orderEffect'){s.decision=null;const queue=a.kind==='orderEntry'?s.triggers.entries:s.pendingEffects,i=queue.findIndex(e=>e.effectId===a.effectId),[entry]=queue.splice(i,1);resolveEntry(s,entry);}
 if(a.kind==='dragonTap'){s.decision=null;tapCard(s,1-p,s.players[1-p].battle.find(x=>x.uid===a.uid));(s.once??={})[d.key]=s.turn;log(s,p,'dragonTap',`${card(d.source).name}：${card(a.cardId).name}をタップ（このターンの1回を使用）`,{cardId:d.source});}
 if(a.kind==='skipDragonTap'){s.decision=null;log(s,p,'skip',`${card(d.source).name}の任意タップを見送る（このターンは未使用）`,{cardId:d.source});}
 if(a.kind==='fight'){s.decision=null;const source=s.players[p].battle.find(x=>x.uid===a.uid),target=s.players[1-p].battle.find(x=>x.uid===a.target);if(source&&target){log(s,p,'fight',`${card(source).name}の効果で${card(target).name}とバトル`,{cardId:source.cardId});battle(s,p,source,1-p,target,s.attack?.attacker);}}
 if(a.kind==='skipFight'){s.decision=null;log(s,p,'skip',`${card(d.source).name}の登場時バトルを使わない`,{cardId:d.source});}
 if(a.kind==='battleWinOrder'){const i=s.battleResolution.wins.findIndex(e=>e.uid===a.uid),[e]=s.battleResolution.wins.splice(i,1);s.decision=null;resolveBattleWin(s,e);}
 if(a.kind==='draw'){s.decision=null;if(d.reason==='battleWin')log(s,p,'battleWin',`${card(d.source).name}：バトル勝利時のドローを${a.n?'使う':'使わない'}`,{cardId:d.source});if(a.n)draw(s,p,a.n);else log(s,p,'skip','任意のドローを省略');}
 if(a.kind==='useRamp'){s.decision=null;const source=card(d.source);rampTapped(s,p,source,4);chooseManaTop(s,p,source,2);}
 if(a.kind==='skipRamp'){s.decision=null;log(s,p,'skip',`${card(d.source).name}のマナ加速を使わない`,{cardId:d.source});}
 if(a.kind==='manaTop'){
  d.chosen.push(a.uid);
  if(d.chosen.length===d.count){const returned=d.chosen.map(uid=>remove(s.players[p].mana,uid));for(const x of returned)clearBattleState(x,'deck');s.players[p].deck.unshift(...returned);s.decision=null;log(s,p,'manaTop',`${card(d.source).name}でマナ${returned.length}枚を山札の上へ（順序は非公開）`,{cardId:d.source});}
 }
 if(a.kind==='skipEffect'){s.decision=null;log(s,p,'skip','任意の効果を使わない');}
 if(a.kind==='search'){s.decision=null;if(a.uid){const c=remove(s.players[p].deck,a.uid);s.players[p].hand.push(c);log(s,p,'search',`${card(c).name}を探して手札へ`,{cardId:c.cardId});}s.players[p].deck=shuffled(s.players[p].deck,Math.floor(random(s)*4294967296));deckCheck(s,p);}
 if(a.kind==='effect'){
  s.decision=null;const moves=[];
  if(d.effect==='destroyBattleCard3'){const t=a.targets[0],top=s.players[t.player].battle.find(x=>x.uid===t.topUid);if(top){if(t.uid===top.uid)moveCreatures(s,[{player:t.player,uid:top.uid,to:'grave',destroy:false,cardOnly:true}]);else{const parent=layers(top).find(x=>x.under?.some(y=>y.uid===t.uid)),index=parent?.under.findIndex(x=>x.uid===t.uid);if(parent&&index>=0){const x=parent.under[index];recordLastPower(s,t.player,top,[x]);parent.under.splice(index,1,...(x.under||[]));clearBattleState(x);s.players[t.player].grave.push(x);log(s,p,'cardLeave',`${card(d.source).spellFace.name}で進化元の${card(x).name}を墓地へ`,{cardId:d.source});}}}}

  for(const t of d.effect==='destroyBattleCard3'?[]:a.targets){const c=s.players[t.player].battle.find(x=>x.uid===t.uid);if(!c)continue;
   if(['tap','tapTwo','shieldEntryTapLock'].includes(d.effect))tapCard(s,t.player,c);
   if(d.effect==='shieldEntryTapLock')c.tapLocks=[...new Set([...(c.tapLocks||[]),p])];
   if(d.effect==='buff'){c.buff+=2000;const source=card(d.source);if(source.type==='spell')(c.buffSources??=[]).push({amount:2000,cost:source.cost});}
   if(d.effect==='unblock'){c.unblocked=true;const source=card(d.source);if(source.type==='spell')c.unblockSpellCost=source.cost;}
   if(['bounce','bounceOptional','bounceSmall','bounceBlockers','destroy','destroySmall','destroyUntapped','destroyWeakerLimitNextTurn','manaRemoval'].includes(d.effect))moves.push({player:t.player,uid:t.uid,to:['bounce','bounceOptional','bounceSmall','bounceBlockers'].includes(d.effect)?'hand':d.effect==='manaRemoval'?'mana':'grave'});
   log(s,p,'effect',`${card(d.source).name}：${card(c).name}を選択`,{cardId:d.source});
  }
  if(moves.length)moveCreatures(s,moves,d.limitAfter?{kind:'limit',player:p,source:d.source}:null);else if(d.limitAfter)limitNextTurn(s,p,card(d.source));
 }
 if(a.kind==='orderEndAbility'){const ids=s.endStep.declared;s.endStep.declared=ids.filter(x=>x!==a.uid);const x=s.players[p].hand.find(x=>x.uid===a.uid);s.decision=null;if(card(x).endMirage)extra.put(s,extra.task('mirageCast',p,x.cardId,{uid:a.uid}));else if(s.noManaUse?.[s.active]&&!s.players[p].battle.some(x=>card(x).gaia)&&canEnterCreature(s,p,card(x)))s.decision={type:'gaiaSummon',player:p,uid:x.uid,source:x.cardId};}
 if(a.kind==='declareGaia'||a.kind==='skipGaiaDeclare'){s.endStep.remaining.shift();if(a.kind==='declareGaia'){s.endStep.declared.push(d.uid);log(s,p,'gaiaDeclare',`${card(d.source).name}の使用を宣言`,{cardId:d.source});}s.decision=null;}
 if(a.kind==='summonGaia'){s.decision=null;playCard(s,p,a.uid,true,null,0,null,'hand','ターン終了時の能力');}
 if(a.kind==='skipGaiaSummon')s.decision=null;
 if(a.kind==='endTurn')beginEnd(s);
 if(a.kind==='endUntap'){s.decision=null;if(a.yes)for(const c of s.players[p].battle)if(d.uids.includes(c.uid)&&canUntap(c))c.tapped=false;if(!s.endStep)nextTurn(s);}
 for(let n=0;n<1000;n++){
  if(advanceLoss(s)){if(s.decision||s.winner!==null)break;continue;}
  refreshDynamicTypes(s);advanceLeaving(s);if(!s.leaving&&!s.decision)for(const p of[s.active,1-s.active]){deckCheck(s,p);if(s.winner!==null||s.lossEvent)break;}if(s.winner!==null)break;if(s.lossEvent)continue;resumeInterrupt(s);advanceDeclarations(s);advanceBattle(s);if(!s.attackDeclarations&&!s.leaving)advanceEffects(s);if(!s.leaving)advanceTriggers(s);advanceJudgeBreaks(s);powerCleanup(s);if(!s.pendingEffects?.length&&!s.triggers)extra.beforeNonActive(s);extra.advance(s);refreshDynamicTypes(s);powerCleanup(s);advanceAttack(s);extra.advanceBreak(s);extra.advanceAttackEnd(s);advanceEnd(s);advanceStart(s);
  if(s.lossEvent){advanceLoss(s);if(s.decision||s.winner!==null)break;continue;}
  if(s.decision||s.winner!==null||!(s.pendingEffects?.length||s.triggers||s.battleResolution||s.judge||s.attackDeclarations||s.leaving||s.endStep||s.startStep||s.extTasks?.length||s.g19BreakSequence||s.g19Interrupt||s.attackLifecycle||s.g10RevDeclarations?.length||s.g3Window&&!s.g3Window.done))break;
  if(n===999)throw Error('待機中の処理を完了できません');
 }
 return s;
}
// This observation deliberately omits both players' shield identities and deck order,
// and the opponent's hand. The AI receives only this object and its legal choices.
export function peekDeckTop(s,p){if(p!==s.active||!s.players[p].battle.some(x=>effectiveCard(x,s).orochiTop))return null;const own=s.players[p],excluded=[...(own.g18Protected||[]),...(own.g10Protected||[]),...(own.g17Protected||[]),...(own.g3Protected||[]),...(own.g2Protected||[]),...(own.g7Reveals||[]),...(own.g19Reveals||[]),...(own.g21Protected||[]),...(own.g12Reveals||[])];return own.deck.find(x=>!excluded.includes(x.uid))||null;}
export function observation(s,p){return {active:s.active,turn:s.turn,phase:s.phase,attack:s.attack?{attacker:s.attack.attacker,target:s.attack.target}:null,leaving:s.leaving?{rows:s.leaving.rows.map(r=>({player:r.player,uid:r.uid,to:r.to})),uid:s.decision?.uid}:null,decision:s.decision?{type:s.decision.type,effect:s.decision.effect,...(s.decision.type==='judgeContinue'?{wins:s.judge.wins}:{})}:null,judge:s.judge?.stage==='compare'?{revealed:s.judge.revealed,costs:s.judge.costs}:null,resolvingSpell:s.resolvingSpell?{player:s.resolvingSpell.player,cardId:s.resolvingSpell.source,face:s.resolvingSpell.face}:null,players:s.players.map((x,i)=>({turns:x.turns,battle:x.battle,mana:x.mana.map(c=>c.faceDown&&i!==p?{uid:c.uid,tapped:c.tapped,faceDown:true,cardId:FACE_DOWN.id}:c),grave:x.grave,hand:i===p?x.hand:x.hand.map(()=>({hidden:true})),shields:x.shields.length,deckCount:x.deck.length,...(i===p&&peekDeckTop(s,p)?{deckTop:peekDeckTop(s,p)}:{})}))};}
const aiCost=c=>Math.min(20,costValue(c));
export function chooseAI(s){
 const acts=getLegalActions(s);if(!acts.length)return null;const p=acts[0].player,v=observation(s,p),me=v.players[p],them=v.players[1-p];
 const find=(who,uid)=>v.players[who].battle.find(x=>x.uid===uid);
 const score=a=>{
  const c=a.cardId?(a.kind==='play'?playFaces(card(a.cardId))[a.face||0]:card(a.cardId)):null;
  if(a.kind==='extended')return a.score??0;
  if(a.kind==='crossGear')return a.score;
  if(a.kind==='hyper')return 12;
  if(a.kind==='replaceEx'||a.kind==='replaceGneo')return 40;
  if(a.kind==='replaceEscape')return 30;
  if(a.kind==='replaceAter'||a.kind==='replaceUltra')return 25-aiCost(c);
  if(a.kind==='replaceMana')return 20;
  if(a.kind==='allowLeave')return 0;
  if(a.kind==='leaveMana'){const x=me.mana.find(x=>x.uid===a.uid);return(x.tapped?15:0)-aiCost(c);}
  if(a.kind==='cancelLeaveMana'||a.kind==='cancelMugen'||a.kind==='cancelDeploy')return -100;
  if(a.kind==='declareGaia')return 10;
  if(a.kind==='summonGaia')return me.deckCount>2?80:-10;
  if(a.kind==='skipGaiaDeclare'||a.kind==='skipGaiaSummon')return 0;
  if(a.kind==='mugenStart')return 95;
  if(a.kind==='mugenTap'){const x=find(p,a.uid);return(x.entered===v.turn&&!effectiveCard(x,v).speedAttacker?20:0)-aiCost(c)-(effectiveCard(x,v).blocker?8:0);}
  if(a.kind==='deploy')return 30+aiCost(c)*3+(c.effect==='destroyWeakerLimitNextTurn'?15:0);
  if(a.kind==='skipDeploy')return 0;
  if(a.kind==='infinityCount')return a.n*10;
  if(a.kind==='infinityShield')return a.exLifeHit?5:1;
  if(a.kind==='charge'){
   const duplicates=me.hand.filter(x=>x.cardId===c.id).length;
   const colors=manaCivilizations(c).filter(v=>!me.mana.some(x=>manaCivilizations(card(x)).includes(v))).length;
   return 50+colors*10+aiCost(c)*1.5+(duplicates>1?4:0)-(c.type==='creature'&&aiCost(c)<=3?10:0);
  }
  if(a.kind==='skipCharge')return me.mana.reduce((n,x)=>n+manaValue(card(x)),0)>=Math.max(7,...me.hand.map(x=>aiCost(card(x))))?100:me.hand.length<=1&&me.mana.length>=4?70:0;
  if(a.kind==='play'){
   if(c.type==='gear')return c.doss?34:c.takion?30:26;
   if(c.effect==='samuraiFlash')return me.deckCount>1?24:-5;
   if(c.type==='seed')return 28;
   if(c.type==='creature')return 30+aiCost(c)*2+(aiCost(c)-a.cost)*2+(c.effect==='ramp1'&&me.mana.length<6?12:0)+(c.blocker&&them.battle.length>me.battle.length?8:0)+(c.unblockable?7:0)+(c.speedAttacker?8:0);
   if(c.effect==='darknessModes')return them.hand.length||them.battle.length||me.grave.some(x=>isCreature(s,x)&&costValue(card(x))<=4)?30:0;
   if(c.effect==='brainSlash')return me.deckCount>3||me.grave.some(x=>isCreature(s,x)&&costValue(card(x))<=8)?32:0;
   if(c.effect==='fumiModes')return me.deckCount>2||them.battle.length?29:0;
   if(c.effect==='judgeDraw')return me.deckCount>1?(me.mana.length<9?38:16):-5;
   if(c.effect==='discard')return them.hand.length?22:0;
   if(c.effect==='ramp2')return me.mana.length<7?20:1;
   if(c.effect==='ramp1')return me.mana.length<7&&me.deckCount>1?23:1;
   if(c.effect==='dragonRamp2')return me.mana.length<9&&me.deckCount>2?36:1;
   if(c.effect==='searchCreature')return me.hand.filter(x=>isCreature(s,x)).length<2?25:0;
   if(c.effect==='drawUpTo3')return me.deckCount>6?32:0;
   if(c.effect==='draw2')return me.deckCount>2?28:0;
   if(c.effect==='discardAll')return them.hand.length?15+them.hand.length*5:0;
   if(['destroy','manaRemoval'].includes(c.effect))return them.battle.length?28:0;
   if(c.effect==='tapAll')return them.battle.length&&me.battle.some(x=>!x.tapped&&(x.entered<v.turn||effectiveCard(x,v).speedAttacker||isEvolution(x))&&!effectiveCard(x,v).noAttack)?25:0;
   if(c.effect==='bounceSmall')return them.battle.some(x=>aiCost(card(x))<=6)?24:0;
   if(c.effect==='bounce')return them.battle.some(x=>aiCost(card(x))>=3)?24:0;
   if(['tap','tapTwo','teamBuff','buff','unblock'].includes(c.effect))return me.battle.some(x=>!x.tapped&&(x.entered<v.turn||effectiveCard(x,v).speedAttacker||isEvolution(x))&&!effectiveCard(x,v).noAttack)?15:0;
   if(c.effect==='destroySmall')return them.battle.some(x=>power(x,false,v)<=2000)?27:0;
   if(c.effect==='destroyBattleCard3')return them.battle.some(top=>layers(top).some(x=>(x===top?[card(x)]:playFaces(card(x))).some(c=>costValue(c)<=3)))?29:0;
   if(c.effect==='destroyUntapped')return them.battle.some(x=>!x.tapped)?26:0;
   return 1;
  }
  if(a.kind==='declareDDD')return 10;
  if(['skipDDD','skipDDDSummon'].includes(a.kind))return 0;
  if(['evolve','revealEvolve','summonDDD','deployEvolve','triggerEvolve'].includes(a.kind)){const base=a.baseUid?find(p,a.baseUid):null;return 30+aiCost(c)*2+(base&&c.stopSelfEntryAttack?15:0)-(base?.tapped?(a.baseUid===v.attack?.attacker?0:20):0)-(base?aiCost(card(base)):5);}
  if(a.kind==='cancelEvolution')return -1;
  if(a.kind==='toAttack')return 5;
  if(a.kind==='attack'){
   const x=find(p,a.uid);if(a.target==='player')return 25+(a.exLifeHit?3:0)+(them.shields===0?100:0)+(effectiveCard(x,v).unblockable?8:0)-(effectiveCard(x,v).blocker&&me.shields===0?20:0);
   const y=find(1-p,a.target);return power(x,true,v)>power(y,false,v)?40+aiCost(card(y)):power(x,true,v)===power(y,false,v)?16:effectiveCard(x,v).mustAttack?1:-10;
  }
  if(a.kind==='endTurn')return 0;
  if(a.kind==='defendMany')return -1;
  if(a.kind==='guardman'){const b=find(p,a.uid),a1=them.battle.find(x=>x.uid===v.attack?.attacker),target=find(p,v.attack?.target);return a1&&power(b,false,v)>=power(a1,true,v)?50:target&&aiCost(card(target))>aiCost(card(b))?15:-2;}
  if(a.kind==='block'){const b=find(p,a.uid);const attacker=them.battle.find(x=>x.uid===v.attack?.attacker);return(me.shields===0?100:0)+(attacker&&power(b,false,v)>=power(attacker,true,v)?50:me.shields<=2?20:-2)-aiCost(card(b))*.1;}
  if(a.kind==='noBlock')return 0;
  if(a.kind==='breakShields')return 1+(a.exLifeHits||0)*2;
  if(a.kind==='judgeCost')return a.cost;
  if(a.kind==='judgeAgain')return v.decision.wins<them.shields?10:-1;
  if(a.kind==='stopJudge')return 0;
  if(a.kind==='judgeBreak')return a.exLifeHit?5:1;
  if(a.kind==='guardShield'){const x=find(p,a.uid),cost=layers(x).slice(1);return 20+Math.max(0,3-me.shields)*15+(a.exLifeHit?5:0)-cost.length-cost.reduce((n,x)=>n+aiCost(card(x)),0)*.2;}
  if(a.kind==='finishShieldGuards')return 0;
  if(a.kind==='orderTrigger')return (c.type==='creature'?35:30)+aiCost(c);
  if(a.kind==='orderEntry'||a.kind==='orderEffect')return aiCost(c)+(c.multiAssault?20:0);
  if(a.kind==='dragonTap'){const x=find(1-p,a.uid);return x.tapped?-1:10+aiCost(c)*2+(effectiveCard(x,v).blocker?12:0);}
  if(a.kind==='skipDragonTap')return 0;
  if(a.kind==='useTrigger')return 30;
  if(a.kind==='skipTrigger')return 0;
  if(a.kind==='draw')return me.deckCount>a.n+2?a.n*10:-a.n;
  if(a.kind==='search')return a.cardId?20-Math.abs(aiCost(card(a.cardId))-me.mana.length)*2+(card(a.cardId).unblockable?3:0):0;
  if(a.kind==='endUntap')return a.yes?10:0;
  if(a.kind==='fight'){
   const own=find(p,a.uid),target=find(1-p,a.target),ap=power(own,own.uid===v.attack?.attacker,v),bp=power(target,target.uid===v.attack?.attacker,v);
   return ap>bp?25+aiCost(c)*3-(c.slayer?aiCost(card(own))*4:0):ap===bp?aiCost(c)*3-aiCost(card(own))*3:-20;
  }
  if(a.kind==='skipFight'||a.kind==='battleWinOrder')return 0;
  if(a.kind==='useRamp')return me.deckCount>4&&me.mana.length<11?20:-1;
  if(a.kind==='skipRamp')return 0;
  if(a.kind==='manaTop'){
   const x=me.mana.find(x=>x.uid===a.uid),others=me.mana.filter(x=>x.uid!==a.uid),lostColors=manaCivilizations(c).filter(color=>!others.some(y=>manaCivilizations(card(y)).includes(color))).length;
   return(x.tapped?15:0)-lostColors*18+(c.type==='creature'&&aiCost(c)<=me.mana.length?10:0)-(me.hand.some(y=>y.cardId===c.id)?8:0);
  }
  if(a.kind==='effect')return a.targets.reduce((sum,t)=>{const top=v.players[t.player].battle.find(x=>layers(x).some(y=>y.uid===t.uid)),x=top&&layers(top).find(x=>x.uid===t.uid);if(!x)return sum;const e=v.decision.effect;if(['buff','unblock'].includes(e))return sum+(t.player===p&&!x.tapped&&(x.entered<v.turn||effectiveCard(x,v).speedAttacker||isEvolution(x))?20:0)+aiCost(card(x));if(['bounce','bounceOptional','bounceSmall','bounceBlockers'].includes(e)&&t.player===p)return sum-20;return sum+aiCost(card(x))*3+(effectiveCard(x,v).blocker?8:0);},0);
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

function powerCleanup(s){if(s.lossEvent)return;if(s.winner!==null||s.leaving||s.decision)return;for(const p of[0,1])if(!s.players[p].deck.length){deckCheck(s,p);if(s.winner!==null||s.lossEvent)return;}const bad=[0,1].flatMap(player=>s.players[player].battle.filter(x=>isCreature(s,x)&&power(x,false,s)<=0&&extra.canLeave(s,player,x)).map(x=>({player,uid:x.uid,to:'grave'})));if(bad.length)moveCreatures(s,bad);}
const extra=createExtendedRules({takeTop:takeDeckTop,finishCharger,pay,manaMoveForbidden:shevaProtection,card,faces:playFaces,cost:costValue,colors:civilizations,effective:effectiveCard,power,layers,draw,mill,move:moveCreatures,enter:enterCreature,cast:playCard,remove,removeShield,clear:clearBattleState,enqueue:enqueueEffect,log,random,canEnter:canEnterCreature,canCast:canCastSpell,evolutionBases,battle,tap:tapCard,selfStopped:selfTriggersStopped,ignored:abilitiesIgnored,spellIgnored,deckRedirect,shieldTop,canPay:validMana,summonCost,shuffled,manaColors,deckCheck,finish,isCreature,castBattleSpell,breakShields,interruptBreak,canUntap,singleJudge:(s,p,source,uid,onWin)=>startJudge(s,p,source,uid,'single',onWin),replaceLoss,replaceHandLoss,declineLoss,payDeferred(s,p,n,civ){const ids=manaPayment(paymentPool(s,p),{cost:n,civilizations:[civ]});if(!ids)return false;for(const uid of ids){const x=s.players[p].mana.find(x=>x.uid===uid);if(x)x.tapped=true;else tapCard(s,p,s.players[p].battle.find(x=>x.uid===uid));}return true;},shieldHand:(s,p,x)=>extra.shieldHand(s,p,x),defenseOptions,defend,handMana:(s,p,x)=>extra.handMana(s,p,x)});
