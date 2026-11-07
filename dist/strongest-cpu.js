import {card,playFaces,civilizations,validateDeck,manaPayment,manaValue} from './engine.js';
import {ONLINE_COMPATIBILITY} from './online-compatibility.js?v=0.693.0';
export const STRONGEST_BUILD_VERSION=1;
const finite=n=>Number.isFinite(Number(n))?Number(n):30;
const rowsSignature=rows=>{const counts=new Map();for(const r of rows||[])counts.set(r.id,(counts.get(r.id)||0)+r.count);return JSON.stringify([...counts].sort(([a],[b])=>a.localeCompare(b)));};
export function strongestDeckKey(deck){return JSON.stringify([STRONGEST_BUILD_VERSION,ONLINE_COMPATIBILITY.engineVersion,ONLINE_COMPATIBILITY.rulesHash,deck?.format||'original',deck?.historicalId||'',rowsSignature(deck?.cards)]);}
const rampEffects=new Set(['ramp1','ramp2','dragonRamp2','ramp2Return1','dogiRamp','girlsRupia']);
const removalEffects=new Set(['destroy','destroySmall','destroyUntapped','destroy6000','bounce','bounceSmall','vtBounce','superheroSweep','tapAll','abyssMakua']);
// Exact compiled rules distinguish a real counter from incidental card text.
const hasOperation=(defs,op,accept=()=>true)=>(defs||[]).some(d=>d.op===op&&accept(d)||hasOperation(d.defs,op,accept)||hasOperation(d.elseDefs,op,accept)||d.modes?.some(m=>hasOperation(m.defs,op,accept)));
const discardEffects=new Set(['discard','discardAll','inspectDiscard','jennySacrifice','vamBounce','darknessModes','fumiModes','abyssMurder','abyssBella']);
const discardsOpponent=d=>d.owner===undefined||d.owner==='opponent';
const respondsToSpell=c=>c.g204SpellWatch?.who==='opponent'&&c.g204SpellWatch.defs.some(d=>
 d.op==='CastCostDeploy595'||d.op==='Target'&&['hand','grave'].includes(d.to)||d.op==='Select'&&d.owner==='opponent'&&d.to==='hand'
);
const oneSidedSweep=d=>!d.both&&d.to==='grave'&&d.filter?.creature;
function swarmResponse(c,faces){
 const defs=faces.flatMap(f=>f.g34Tasks||[]);
 const conditional=hasOperation(defs,'IfOwn',d=>d.filter?.g334ZoneCount?.sumBoth&&hasOperation(d.defs,'Sweep',oneSidedSweep));
 const tradeShield=hasOperation(defs,'Offer',d=>hasOperation(d.defs,'ShieldHand')&&hasOperation(d.defs,'Sweep',oneSidedSweep));
 if(conditional||tradeShield||hasOperation(defs,'CostSweep596')||faces.some(f=>hasOperation(f.g34Plus,'Sweep',d=>oneSidedSweep(d)&&d.filter.g596EnteredThisTurn)))return 'sweep';
 if(c.g205Aura?.opponent&&c.g205Aura.power<0&&c.g303DeathWatch?.both||hasOperation(defs,'Sweep',d=>oneSidedSweep(d)&&d.filter.maxPower===1000))return 'small';
 return null;
}
const printedShieldTrigger=f=>f.trigger||f.triggerPlus||f.superTrigger||f.rev2Trigger||f.graveTotalTrigger||f.shieldConditionalTrigger;
function graveResponseWeight(c){
 const defs=c.g34Tasks;
 if(c.g598UnpaidBottom&&hasOperation(defs,'GraveShuffle545'))return 31;
 if(hasOperation(defs,'GravePick598',d=>d.mode==='destroy'))return 36;
 if(hasOperation(defs,'GravePick598',d=>d.mode==='draw'))return 30;
 return hasOperation(defs,'GravePick598',d=>d.mode==='shuffle')?18:0;
}
const destroysBlocker=d=>d.to==='grave'&&d.filter?.blocker;
function blockerResponseWeight(faces){
 if(faces.some(f=>(f.crystalCharger||f.normalCharger)&&hasOperation(f.g34Tasks,'Target',destroysBlocker)))return faces.length>1?48:20;
 if(faces.some(f=>f.speedAttacker&&hasOperation(f.g34Tasks,'GroupGrant364',d=>d.owner==='self'&&d.grant.unblockable)))return 47;
 if(faces.some(f=>hasOperation(f.g34Tasks,'Sequence',d=>d.defs.some(e=>e.op==='IfOwn'&&e.filter?.color==='自然'&&hasOperation(e.defs,'Target',destroysBlocker)))))return 36;
 return faces.some(f=>hasOperation(f.g34Attack,'IfOwn',d=>d.filter?.g334ZoneCount?.zone==='shields'&&d.filter.g334ZoneCount.opponent&&hasOperation(d.defs,'Target',destroysBlocker)))?28:0;
}
function earlyDeploymentResponse(c,faces){
 const overMana=d=>d.filter?.g600OverMana;
 if(c.g600OverManaEntry)return 30;
 if(faces.some(f=>hasOperation(f.g34Tasks,'Sweep',overMana)))return 28;
 return faces.some(f=>hasOperation(f.g34Tasks,'Target',overMana))?17:0;
}
function nonMultiRemoval(c){
 const target=c.g34Tasks?.find(d=>d.op==='Target'&&d.filter?.g510NonMulticolor&&!d.filter.max);
 return target?.to==='hand'?29:target?.to==='grave'?31:0;
}
function defensiveTriggerWeight(c){
 if(!printedShieldTrigger(c))return 0;
 const defs=c.g34Tasks,bonus=c.g34Plus;
 if(hasOperation(defs,'Sweep',d=>d.filter?.tapped&&d.to==='mana')&&hasOperation(defs,'Sweep',d=>d.filter?.untapped&&d.to==='hand'))return 55;
 if(hasOperation(defs,'Choose',d=>d.modes.some(m=>m.condition&&hasOperation(m.defs,'TapAll'))))return 31;
 if(c.type==='creature'&&hasOperation(defs,'Target',d=>d.element&&d.to==='mana'&&d.filter?.max===6)&&hasOperation(defs,'ShieldTop'))return 24;
 if(hasOperation(defs,'TapAll')&&hasOperation(defs,'Schedule537',d=>hasOperation(d.defs,'GroupUntap')))return 20;
 if(hasOperation(bonus,'Select',d=>d.g190Freeze&&d.n>=2)&&hasOperation(defs,'Target',d=>d.element))return 42;
 return c.blocker&&hasOperation(bonus,'GroupLasting412',d=>d.destroySafe&&d.untilEnd)?30:0;
}
function openingRampWeight(c){
 if(c.type!=='spell'||finite(c.cost)>3)return 0;
 const defs=c.g34Tasks,ramps=hasOperation(defs,'Ramp');
 if(ramps&&c.ddd&&hasOperation(defs,'IfOwn',d=>d.filter?.g603AttackThisTurn))return 10;
 if(ramps&&hasOperation(defs,'Ramp',d=>d.g603Draw))return 17;
 return printedShieldTrigger(c)&&hasOperation(defs,'Look',d=>d.n===2&&d.rest==='top'&&d.stages[0]?.to==='mana')?16:0;
}
function handBoardResponse(c,profile){
 const defs=c.g34Tasks,w=profile.weights;
 if(c.g472OpponentDiscard&&hasOperation(defs,'Discard',discardsOpponent))
  return 58*Math.min(1,Math.max(0,(profile.counts.cheapSupport-5)/6));
 const modes=defs?.[0]?.modes;
 if(!c.trigger||!modes?.some(m=>m.defs.length===1&&m.defs[0].op==='Discard'&&m.defs[0].random))return 0;
 if(modes.length===2&&hasOperation(defs,'Target',d=>d.element&&d.to==='hand'))
  return 38*Math.min(1,Math.max(0,(profile.counts.cheapSupport-5)/6));
 if(modes.some(m=>m.condition?.all)&&hasOperation(defs,'Target',d=>d.to==='grave'&&d.filter?.maxPower===3000))
  return 56*Math.min(1,Math.max(0,(profile.counts.smallBody-10)/12))*Math.min(1,w.rush);
 return 0;
}
function spellHandResponse(c,profile){
 const spells=Math.min(1,Math.max(0,(profile.counts.spellOnly-14)/11));
 if(hasOperation(c.g34Tasks,'InspectHand',d=>d.chooseOne&&d.filter?.g228Face?.type==='spell'))return 68*spells;
 if(hasOperation(c.g34Tasks,'InspectHand',d=>d.chooseOne&&d.filter?.nonCreature))return 38*spells;
 if(c.g222SpellTax?.opponent&&c.g222SpellTax.amount===1&&hasOperation(c.g536ShieldLeft,'Select',d=>d.filter?.blocker))return 40*spells;
 return 0;
}
function playsEarly(c){
 return c.type==='creature'&&finite(c.cost)>=5&&(
  c.rev||c.invasion||c.mugenCrime||c.fushigibirth||c.ddd||c.kirifudaDash||c.abyssRush||
  /召喚コスト|コストを支払わず.{0,12}召喚|ハイパーエナジー|B・A・D|G・[0０ゼ]/.test(c.text||'')
 );
}
const graveBottom=defs=>hasOperation(defs,'GraveBottom589',d=>!d.self);
const features=c=>{const faces=playFaces(c),text=String(c.text||''),openingRamp=Math.max(...faces.map(openingRampWeight));return {faces,colors:[...new Set(faces.flatMap(civilizations))],cost:Math.min(...faces.map(f=>finite(f.cost))),bodyCost:Math.min(...faces.filter(f=>f.type==='creature').map(f=>finite(f.cost))),body:faces.some(f=>f.type==='creature'),tiny:faces.some(f=>f.type==='creature'&&finite(f.power)<=1000),swarmResponse:swarmResponse(c,faces),graveResponse:graveResponseWeight(c),blockerResponse:blockerResponseWeight(faces),earlyDeploymentResponse:earlyDeploymentResponse(c,faces),earlyDeployment:faces.some(playsEarly),nonMultiBody:faces.some(f=>f.type==='creature'&&civilizations(f).length<=1),nonMultiRemoval:Math.max(...faces.map(nonMultiRemoval)),defensiveTrigger:Math.max(...faces.map(defensiveTriggerWeight)),openingRamp,answersSupport:faces.some(f=>hasOperation(f.g34Tasks,'IfOwn',d=>d.filter?.g603AttackThisTurn)),cheapSupport:faces.some(f=>finite(f.cost)<=5&&['seed','field','gear','aura','artifact','land'].includes(f.type)),blocks:faces.some(f=>f.blocker||f.g260Self?.grants?.blocker||f.g208Auras?.some(a=>a.grants?.blocker)),shieldLock:c.g597TriggerLock,attacker:faces.some(f=>f.type==='creature'&&!f.noAttack&&!f.noPlayerAttack),fast:faces.some(f=>f.speedAttacker||f.invasion||f.rev),block:faces.some(f=>f.blocker||f.slayer),trigger:faces.some(f=>f.trigger||f.gStrike||f.strikeBack||f.triggerPlus&&hasOperation(f.g34Plus,'Sweep',d=>oneSidedSweep(d)&&d.filter.g596EnteredThisTurn)),ramp:openingRamp>0||faces.some(f=>rampEffects.has(f.effect)||graveBottom(f.g34Tasks)&&hasOperation(f.g34Tasks,'Ramp')),removal:faces.some(f=>removalEffects.has(f.effect)||hasOperation(f.g34Tasks,'OverManaBottom590')),grave:/墓地から|墓地にある|墓地の.*召喚/.test(text)||!!c.graveSummon||!!c.mugenCrime,spell:faces.some(f=>f.type==='spell'),discard:/相手(?:は(?:自身|自分自身|自分)?の?|の)手札[^。\n]*捨て/.test(text)||faces.some(f=>discardEffects.has(f.effect)||f.drawDiscard||f.g394Jao||[f.g34Tasks,f.g34Attack,f.g174End].some(defs=>hasOperation(defs,'Discard',discardsOpponent))),discardHate:!!(c.g591HandShield||c.g591Discard||c.enemyDiscardDeploy||c.discardDeploy),cheat:/コストを支払わず|召喚せず/.test(text)||!!c.rev||!!c.invasion||!!c.mugenCrime,graveHate:/(?:相手の墓地|相手は自身の墓地).*(?:山札|マナ)/.test(text)||!!(c.graveGate||c.g277GraveLock||c.g44Apul||c.g592GravesStay)||faces.some(f=>graveBottom(f.g34Tasks)),cheatHate:!!(c.tokoshie||c.oniBounce||c.noNonsummonEntry||c.handEntryOnly||c.entryGate||c.g403Bloom||c.g26Queen)||faces.some(f=>hasOperation(f.g34Tasks,'OverManaBottom590')||hasOperation(f.g397Shinka,'OverManaBottom590')),spellResponse:!!respondsToSpell(c),spellHate:!!(c.g222SpellTax?.perOtherCreature||c.g260Self?.grants?.g595NonLightSpellLock||c.spellLockMaxCost||c.travelSpellLock||c.shiroLock||c.g32Dolf||c.genmu||c.g590SpellOnce||c.g26OneNote)||faces.some(f=>hasOperation(f.g34Tasks,'SpellLock589')||hasOperation(f.g34Attack,'SpellLock589')),graveReliant:/自分の墓地から/.test(text)||!!(c.graveCast||c.graveSummon||c.mugenCrime||c.abyssRush||c.fushigibirth),symmetricGraveLock:!!c.g592GravesStay,entryStop:!!c.g593EntryStop,powerStop:faces.some(f=>hasOperation(f.g34Tasks,'PowerAttack593')),draw:faces.some(f=>/draw|search/i.test(f.effect||'')||hasOperation(f.g34Tasks,'Draw')&&(f.g593EntryStop||hasOperation(f.g34Tasks,'PowerAttack593'))),race:String(c.race||'')};};
export function analyzeStrongestTarget(deck){
 const counts={cheap:0,fast:0,spell:0,spellOnly:0,grave:0,cheat:0,large:0,body:0,discard:0,tiny:0,smallBody:0,blocks:0,earlyDeployment:0,nonMultiBody:0,cheapSupport:0},costs=new Map();
 const shieldTriggers={all:0,spell:0,creature:0};
 let cost=0;
 for(const r of deck.cards){const f=features(card(r.id));cost+=f.cost*r.count;
  const triggerFaces=f.faces.filter(printedShieldTrigger);
  if(triggerFaces.length)shieldTriggers.all+=r.count;
  if(f.faces.every(face=>face.type==='spell'))counts.spellOnly+=r.count;
  for(const kind of ['spell','creature'])if(triggerFaces.some(face=>face.type===kind))shieldTriggers[kind]+=r.count;
  for(const key of ['fast','spell','grave','cheat','body','discard','tiny','blocks','earlyDeployment','nonMultiBody','cheapSupport'])if(f[key]&&(key!=='fast'||f.bodyCost<=5))counts[key]+=r.count;if(f.faces.some(face=>face.type==='creature'&&finite(face.power)<=3000))counts.smallBody+=r.count;if(f.body&&f.bodyCost<=3)counts.cheap+=r.count;if(f.body&&f.bodyCost>=7)counts.large+=r.count;const n=Math.min(20,f.cost);costs.set(n,(costs.get(n)||0)+r.count);}
 const weights={rush:Math.min(1,(counts.cheap+counts.fast)/22),spells:counts.spell/40,grave:Math.min(1,counts.grave/12),cheat:Math.min(1,counts.cheat/12),large:Math.min(1,counts.large/16),discard:Math.min(1,Math.max(0,counts.discard-4)/10)};
 const labels={rush:'序盤の攻めへの防御・除去',spells:'呪文中心の展開を妨害',grave:'墓地利用を抑える',cheat:'踏み倒し・特殊な登場を牽制',large:'大型が並ぶ前の攻めと除去',discard:'手札破壊に備える'};
 const priorities=Object.entries(weights).sort((a,b)=>b[1]-a[1]);return {counts,weights,shieldTriggers,averageCost:cost/40,priorities:priorities.filter(([,n])=>n>=.2).slice(0,3).map(([key])=>labels[key]),main:priorities[0][0],commonCost:[...costs].sort((a,b)=>b[1]-a[1])[0]?.[0]||0};
}
const learningKeys=['rush','spells','grave','cheat','large','discard'];
const bounded=(value,max=1000)=>Number.isFinite(value)?Math.max(0,Math.min(max,value)):0;
export function normalizeStrongestLearning(value,target){
 const key=strongestDeckKey(target),valid=value?.key===key,rows=new Set((target?.cards||[]).map(r=>r.id));
 return {key,revision:valid?Math.floor(bounded(value.revision,1000000)):0,losses:valid?Math.floor(bounded(value.losses)):0,weights:Object.fromEntries(learningKeys.map(k=>[k,valid?bounded(value.weights?.[k],2):0])),threats:valid&&Array.isArray(value.threats)?value.threats.filter(x=>rows.has(x?.id)&&bounded(x.score)>0).slice(0,12).map(x=>({id:x.id,score:bounded(x.score,100)})):[],failed:valid&&Array.isArray(value.failed)?value.failed.filter(x=>typeof x?.signature==='string'&&x.signature.length<=4000&&bounded(x.losses)>0).slice(0,8).map(x=>({signature:x.signature,losses:Math.ceil(bounded(x.losses,100))})):[],games:valid&&Array.isArray(value.games)?value.games.filter(x=>typeof x==='string'&&x.length<=128).slice(-32):[]};
}
// Learn only from cards actually played/attacked with and public turn counts.
// Hidden hands, shields and deck order are never inspected or retained.
export function learnStrongestDefeat(previous,battle){
 const target=battle?.decks?.[0],s=battle?.state,game=battle?.manualGame;
 if(!target||!battle.strongestCPU||s?.winner!==0||!game||battle.strongestCPU.key!==strongestDeckKey(target))return previous;
 const old=normalizeStrongestLearning(previous,target);if(old.games.includes(game))return previous;
 const ids=new Map();for(const r of target.cards)for(const face of playFaces(card(r.id)))ids.set(face.id,r.id);
 const played=new Map(),attacks=new Map();for(const [id,n]of Object.entries(s.metrics?.[0]?.played||{})){const base=ids.get(id)||id;if(target.cards.some(r=>r.id===base))played.set(base,(played.get(base)||0)+bounded(n,20));}
 for(const event of s.log||[]){if(event.player!==0)continue;const id=ids.get(event.cardId)||event.cardId;if(!target.cards.some(r=>r.id===id))continue;if(event.type==='attack')attacks.set(id,(attacks.get(id)||0)+1);else if(['play','trigger','gaiaSummon','enter'].includes(event.type)&&!played.has(id))played.set(id,1);}
 const signals=Object.fromEntries(learningKeys.map(k=>[k,0])),threats=new Map(old.threats.map(x=>[x.id,x.score*.7]));let total=0;
 for(const id of new Set([...played.keys(),...attacks.keys()])){const score=Math.min(12,(played.get(id)||0)+(attacks.get(id)||0)*2),f=features(card(id));total+=score;threats.set(id,Math.min(100,(threats.get(id)||0)+score));if(f.body&&(f.bodyCost<=3||f.fast))signals.rush+=score;if(f.spell)signals.spells+=score;if(f.grave)signals.grave+=score;if(f.cheat)signals.cheat+=score;if(f.discard)signals.discard+=score;if(f.body&&f.bodyCost>=7)signals.large+=score;}
 const turns=s.metrics?.[0]?.turns||0;if(turns>0&&turns<=4&&(s.metrics?.[0]?.breaks||attacks.size))signals.rush+=Math.max(1,total)*.5;
 const weights=Object.fromEntries(learningKeys.map(k=>[k,Math.min(2,old.weights[k]*.65+(signals[k]/Math.max(1,total))*.7)]));
 const signature=rowsSignature(battle.strongestCPU.deck.cards),failed=old.failed.find(x=>x.signature===signature);
 return {key:old.key,revision:old.revision+1,losses:Math.min(1000,old.losses+1),weights,threats:[...threats].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,12).map(([id,score])=>({id,score})),failed:[{signature,losses:Math.min(100,(failed?.losses||0)+1)},...old.failed.filter(x=>x.signature!==signature)].slice(0,8),games:[...old.games,game].slice(-32)};
}

function utility(c,f,profile){
 const w=profile.weights;let v=6+(f.body?Math.min(8,finite(c.power)/1500):0)+(f.attacker?4:0)+(f.cost<=3?5:0)+(f.draw?6:0)+(f.ramp?7:0)+(f.trigger?4:0)+(f.fast?5:0)+(f.removal?5:0);
 v+=(f.block?13:0)*w.rush+(f.trigger?16:0)*w.rush+(f.removal?9:0)*Math.max(w.rush,w.large)+(f.spellHate?35:0)*w.spells+(f.cheatHate?35:0)*w.cheat+(f.symmetricGraveLock?40:f.graveHate?32:0)*w.grave+(f.fast?9:0)*w.large+(f.discardHate?38:0)*w.discard+(c.g591HandShield?18:0)*Math.min(w.cheat,w.discard);
 if(f.openingRamp)v+=f.openingRamp*Math.min(1,.4+.6*Math.max(w.rush,w.large));
 v+=handBoardResponse(c,profile)+spellHandResponse(c,profile);
 if(f.answersSupport)v+=34*Math.min(1,profile.counts.cheapSupport/10);
 if(f.defensiveTrigger)v+=f.defensiveTrigger*Math.max(0,(w.rush-.5)*2);
 if(f.nonMultiRemoval)v+=f.nonMultiRemoval*Math.min(1,Math.max(0,(profile.counts.nonMultiBody-23)/11));
 if(c.g601UnpaidDestroy)v+=35*w.cheat;
 if(c.g601OffHandMana)v+=22*Math.min(w.grave,w.cheat);
 if(f.earlyDeploymentResponse)v+=f.earlyDeploymentResponse*Math.min(1,Math.max(0,(profile.counts.earlyDeployment-6)/9));
 if(f.blockerResponse)v+=f.blockerResponse*Math.min(1,Math.max(0,(profile.counts.blocks-4)/10));
 if(f.graveResponse)v+=f.graveResponse*w.grave+(c.g598UnpaidBottom?18*w.cheat:0);
 if(f.swarmResponse==='sweep')v+=27*w.rush;
 if(f.swarmResponse==='small')v+=28*Math.min(1,profile.counts.tiny/10);
 if(f.shieldLock){
  const lock=f.shieldLock,matched=profile.shieldTriggers[lock.type||'all'];
  const threat=Math.min(1,Math.max(0,(matched-4)/12));
  v+=(lock.minShields?18:lock.ownBreak?29:lock.allColors?24:40)*threat;
 }
 if(f.spellResponse)v+=(c.g204SpellWatch.colorsAny?26:42)*w.spells;
 if(c.g222SpellTax?.perOtherCreature)v+=30*w.spells;
 if(f.entryStop)v+=18*w.rush+12*Math.min(1,profile.counts.fast/12);
 if(f.powerStop)v+=25*w.rush;
 if(c.effect==='magicNumberLock')v+=8+profile.weights.spells*15;if(f.cost>7)v-=Math.min(18,(f.cost-7)*4);if(!f.attacker&&f.body)v-=4;
 return v;
}
const countRows=rows=>new Map(rows.map(r=>[r.id,r.count]));
const asRows=map=>[...map].filter(([,n])=>n>0).map(([id,count])=>({id,count})).sort((a,b)=>a.id.localeCompare(b.id));
function structuralScore(rows,info,utilities,base){
 let score=0,early=0,attackers=0,high=0,ramp=0,overlap=0,graveReliant=0,symmetricGraveLock=0;const colors=new Map(),races=new Map();
 for(const {id,count}of rows){const f=info.get(id);score+=(utilities.get(id)||0)*count;if(f.cost<=3)early+=count;if(f.attacker)attackers+=count;if(f.bodyCost>=6&&f.body||!f.body&&f.cost>=6)high+=count;if(f.ramp)ramp+=count;if(f.graveReliant)graveReliant+=count;if(f.symmetricGraveLock)symmetricGraveLock+=count;overlap+=Math.min(base.counts.get(id)||0,count);for(const color of f.colors)colors.set(color,(colors.get(color)||0)+count);for(const race of base.races)if(f.race.includes(race))races.set(race,(races.get(race)||0)+count);}
 if(overlap<28||attackers<Math.min(8,base.attackers)||high<Math.min(4,base.high))return -Infinity;
 score-=symmetricGraveLock*Math.max(0,graveReliant-4)*2+Math.max(0,12-early)*14+Math.max(0,high-12)*8+Math.max(0,ramp-12)*5;
 for(const color of base.colors)score-=Math.max(0,Math.min(8,base.sources.get(color)||0)-(colors.get(color)||0))*12;
 for(const race of base.races)score-=Math.max(0,(base.raceCounts.get(race)||0)-4-(races.get(race)||0))*7;
 return score;
}
export function buildStrongestCPU(target,seeds,implemented,{onProgress=()=>{},learning=null,previousBuild=null}={}){
 const errors=validateDeck(target);if(errors.length)throw Error(errors[0]);const feedback=normalizeStrongestLearning(learning,target),profile=analyzeStrongestTarget(target);
 for(const k of learningKeys)profile.weights[k]=Math.min(3,profile.weights[k]+feedback.weights[k]*Math.min(1.5,.5+feedback.losses*.1));
 const info=new Map(implemented.map(c=>[c.id,features(c)])),utilities=new Map(implemented.map(c=>[c.id,utility(c,info.get(c.id),profile)])),failed=new Map(feedback.failed.map(x=>[x.signature,x.losses]));
 const scoreDeck=(rows,base)=>structuralScore(rows,info,utilities,base)-Math.min(240,(failed.get(rowsSignature(rows))||0)*80);
 if(validStrongestBuild(previousBuild,target))seeds=[{...previousBuild.deck,name:'前回の対策デッキ'},...seeds];
 const seen=new Set(),valid=[];
 for(const d of seeds){const rows=asRows(countRows(d.cards||[])),plain={cards:rows,format:'original'},sig=rowsSignature(rows);if(seen.has(sig)||validateDeck(plain).length)continue;seen.add(sig);
  const counts=countRows(rows),colors=[...new Set(rows.flatMap(r=>info.get(r.id).colors))],sources=new Map(colors.map(color=>[color,rows.reduce((n,r)=>n+(info.get(r.id).colors.includes(color)?r.count:0),0)])),raceCounts=new Map();for(const r of rows)for(const race of ['ドラゴン','アビス','ジョーカーズ','コマンド','魔導具','メタリカ','ジャイアント','ファイアー・バード'])if(info.get(r.id).race.includes(race))raceCounts.set(race,(raceCounts.get(race)||0)+r.count);
  const base={counts,colors,sources,raceCounts,races:[...raceCounts].filter(([,n])=>n>=16).map(([race])=>race),attackers:rows.reduce((n,r)=>n+(info.get(r.id).attacker?r.count:0),0),high:rows.reduce((n,r)=>n+((info.get(r.id).body&&info.get(r.id).bodyCost>=6||!info.get(r.id).body&&info.get(r.id).cost>=6)?r.count:0),0)};
  valid.push({rows,base,name:d.name,score:scoreDeck(rows,base)});
 }
 if(!valid.length)throw Error('対策構築の基になる対応済みデッキがありません');
 const trusted=new Set(valid.flatMap(d=>d.rows.map(r=>r.id))),ranked=valid.sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name)).slice(0,8);let best=null;
 ranked.forEach((seed,index)=>{
  const colors=new Set(seed.base.colors);
  const creatureColors=new Set(seed.rows.flatMap(r=>info.get(r.id).faces.filter(f=>f.type==='creature').flatMap(civilizations)));
  const pool=implemented.filter(c=>{const f=info.get(c.id);return (c.limit??4)>0&&f.cost<=8&&f.colors.every(k=>colors.has(k))&&(trusted.has(c.id)||f.cheatHate||f.spellHate||f.spellResponse||f.graveHate||f.graveResponse&&profile.weights.grave>=.35||c.g598UnpaidBottom&&profile.weights.cheat>=.5||f.discardHate||f.entryStop||f.powerStop||f.swarmResponse||f.openingRamp||handBoardResponse(c,profile)>=16||spellHandResponse(c,profile)>=20||f.defensiveTrigger&&profile.weights.rush>=.65||f.nonMultiRemoval&&profile.counts.nonMultiBody>=26||c.g601UnpaidDestroy&&profile.weights.cheat>=.5||c.g601OffHandMana&&Math.min(profile.weights.grave,profile.weights.cheat)>=.5||f.earlyDeploymentResponse&&profile.counts.earlyDeployment>=9||f.blockerResponse&&profile.counts.blocks>=8||f.shieldLock&&profile.shieldTriggers[f.shieldLock.type||'all']>=8)&&(!f.shieldLock?.allColors||['光','水','闇','火','自然'].every(color=>creatureColors.has(color)))&&(!c.evolution&&!c.manaEvolution&&!c.graveEvolution||seed.base.counts.has(c.id));}).sort((a,b)=>(utilities.get(b.id)-utilities.get(a.id))||a.id.localeCompare(b.id)).slice(0,28);
  let rows=seed.rows,score=seed.score;
  for(let round=0;round<6;round++){let chosen=null;
   const removable=[...rows].sort((a,b)=>utilities.get(a.id)-utilities.get(b.id)).slice(0,12);
   for(const add of pool)for(const remove of removable){if(add.id===remove.id)continue;const current=countRows(rows),amount=Math.min(2,remove.count,Math.min(4,add.limit??4)-(current.get(add.id)||0));if(amount<1)continue;current.set(remove.id,remove.count-amount);current.set(add.id,(current.get(add.id)||0)+amount);const next=asRows(current),value=scoreDeck(next,seed.base);if(value>score+.01&&(!chosen||value>chosen.score)){if(validateDeck({cards:next,format:'original'}).length)continue;chosen={rows:next,score:value};}}
   if(!chosen)break;({rows,score}=chosen);
  }
  const repeated=failed.has(rowsSignature(rows));if(!best||best.repeated&&!repeated||best.repeated===repeated&&score>best.score)best={rows,score,repeated,baseName:seed.name};onProgress({completed:index+1,total:ranked.length});
 });
 const deck={id:'strongest-cpu',name:'最強CPU・専用対策デッキ',format:'original',cards:best.rows};if(validateDeck(deck).length)throw Error('対策デッキの40枚を確認できませんでした');
 return {version:STRONGEST_BUILD_VERSION,key:strongestDeckKey(target),learningRevision:feedback.revision,deck,profile,baseName:best.baseName,notes:profile.priorities.length?profile.priorities:['序盤の安定性と対応力を重視'],created:new Date().toISOString()};
}
export function validStrongestBuild(build,target,learning){try{return (learning===undefined||(build?.learningRevision||0)===normalizeStrongestLearning(learning,target).revision)&&build?.version===STRONGEST_BUILD_VERSION&&Array.isArray(build.notes)&&build.notes.length<=3&&build.notes.every(x=>typeof x==='string')&&build.key===strongestDeckKey(target)&&build.deck.format==='original'&&!build.deck.historicalId&&!validateDeck(build.deck).length&&build.deck.cards.reduce((n,r)=>n+r.count,0)===40;}catch{return false;}}
// This policy sees CPU cards only. It never reads the human hand, shields or order.
export function arrangeStrongestCPU(s){
 const own=s.players[1],pool=[...own.hand,...own.deck].sort((a,b)=>a.cardId.localeCompare(b.cardId)||a.uid.localeCompare(b.uid)),info=new Map(pool.map(x=>[x.cardId,features(card(x))]));
 const quality=hand=>{let v=0;const counts=new Map();for(const x of hand)counts.set(x.cardId,(counts.get(x.cardId)||0)+1);for(const x of hand){const f=info.get(x.cardId);v+=(f.cost<=3?10:0)+(f.ramp?14:0)+(f.body&&f.cost>=4&&f.cost<=6?8:0)-(f.cost>=7?9:0)-(counts.get(x.cardId)-1)*4;for(const face of playFaces(card(x)).filter(c=>finite(c.cost)<=3)){const others=hand.filter(y=>y!==x);if(others.some(a=>others.some(b=>a!==b&&civilizations(card(b)).length<=1&&manaPayment([a,b],face))))v+=20+(f.ramp?12:0);}}return v;};
 let beam=[{hand:[],last:-1,score:0}];for(let depth=0;depth<5;depth++){const next=[];for(const row of beam){const seen=new Set();for(let i=row.last+1;i<pool.length;i++){const x=pool[i];if(seen.has(x.cardId)||pool.length-i<5-depth)continue;seen.add(x.cardId);const hand=[...row.hand,x];next.push({hand,last:i,score:quality(hand)});}}beam=next.sort((a,b)=>b.score-a.score||a.last-b.last).slice(0,24);}
 const hand=beam[0]?.hand||pool.slice(0,5),chosen=new Set(hand.map(x=>x.uid)),rest=pool.filter(x=>!chosen.has(x.uid)),seen=new Map(hand.map(x=>[x.cardId,1])),order=[];let hasRamp=hand.some(x=>info.get(x.cardId).ramp);
 for(let turn=2;rest.length;turn++){const score=x=>{const f=info.get(x.cardId),n=Math.min(turn+1,9);return 30-Math.abs(f.cost-n)*5+(f.ramp&&!hasRamp&&turn<=4?24:0)+(f.attacker?5:0)+(f.draw?4:0)-(seen.get(x.cardId)||0)*8+(turn<=4&&f.colors.length===1?4:0);};rest.sort((a,b)=>score(b)-score(a)||a.cardId.localeCompare(b.cardId)||a.uid.localeCompare(b.uid));const x=rest.shift();order.push(x);seen.set(x.cardId,(seen.get(x.cardId)||0)+1);hasRamp||=info.get(x.cardId).ramp;}
 own.hand=hand;own.deck=order;
 return {opening:hand.map(x=>x.cardId),order:order.map(x=>x.cardId)};
}
