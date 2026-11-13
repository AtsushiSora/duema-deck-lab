import {card,playFaces,civilizations,validateDeck,manaPayment,manaValue} from './engine.js';
import {ONLINE_COMPATIBILITY} from './online-compatibility.js?v=0.721.1';
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
 if(faces[0].supportBatch==='phase-613'){
  if(faces.some(f=>hasOperation(f.g34Tasks,'Sweep',destroysBlocker)))return 57;
  if(hasOperation(faces[0].g397Shinka,'Target',destroysBlocker))return 66;
  if(hasOperation(faces[0].g34Tasks,'Target',destroysBlocker))return 57;
  if(hasOperation(faces[0].g34Tasks,'TurnAttackDraw613'))return 63;
 }
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
 if(hasOperation(defs,'LockUntap606')&&hasOperation(defs,'TapAll'))return 19;
 if(hasOperation(defs,'Select',d=>d.g190Freeze==='end'&&d.n==='all'))return 26;
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
function largeRemoval608(c,profile){
 if(!c.trigger)return 0;
 const modes=c.g34Tasks?.[0]?.modes;
 if(modes?.some(m=>hasOperation(m.defs,'Target',d=>d.to==='grave'&&!d.filter)&&hasOperation(m.defs,'ShieldHand'))&&
    modes.some(m=>hasOperation(m.defs,'ShieldTop')))return 50*Math.min(1,Math.max(0,(profile.counts.large-4)/8));
 if(modes?.some(m=>hasOperation(m.defs,'Target',d=>d.to==='shields'&&d.faceUp&&d.filter?.nonEvolution)))
  return 39*Math.min(1,Math.max(0,(profile.counts.large-4)/8))+14*Math.min(1,profile.counts.tiny/12);
 return 0;
}
function protectsLarge608(c,profile){
 return c.g608Protect?32*Math.min(1,Math.max(0,(profile.counts.targetRemoval-4)/10)):0;
}
function tempoResponse609(c,profile){
 const {fastEntry,machEntry,cheap,cheapSupport}=profile.counts;
 if(c.g609TapEntry){
  const threats=fastEntry+(c.g609TapEntry.mach?machEntry:0);
  return 48*Math.min(1,Math.max(0,(threats-7)/10));
 }
 if(c.supportBatch==='phase-609'&&c.spellFace)
  return 42*Math.min(1,Math.max(0,(cheap+cheapSupport*2-10)/18));
 return 0;
}
function resourceResponse610(c,profile){
 if(c.supportBatch!=='phase-610')return 0;
 const {spellOnly,openingBoost}=profile.counts;
 const spellPressure=Math.min(1,Math.max(0,(spellOnly-12)/14));
 const watch=c.g204SpellWatch?.defs;
 if(hasOperation(watch,'ManaChoose582'))return 58*spellPressure;
 if(hasOperation(watch,'LookDeploy530'))return 58*Math.min(1,Math.max(0,(spellOnly-10)/13));
 if(c.g174End)return 48*profile.weights.discard;
 return 64*Math.min(1,Math.max(0,(openingBoost-5)/6));
}
function untappedResponse611(c,profile){
 if(c.supportBatch!=='phase-611')return 0;
 const {blocks,large,fastEntry,body,targetRemoval}=profile.counts;
 const slowerBodies=Math.max(0,body-fastEntry);
 const blockers=Math.min(1,Math.max(0,(blocks-4)/9));
 if(c.g401ShieldSaver)return 49*profile.weights.rush*Math.min(1,Math.max(0,(body-15)/13));
 if(c.graveSummon)return 62*Math.min(1,Math.max(0,(targetRemoval+blocks-6)/11));
 if(c.spellFace)return 34*Math.min(1,Math.max(0,(slowerBodies-14)/16))+17*blockers;
 return 46*Math.min(1,Math.max(0,(large+blocks-6)/11));
}
function addsShields618(c){
 if(c.exLife||c.effect==='shieldTop1')return true;
 return [c.g34Tasks,c.g34Attack,c.g174End,c.g34Plus].some(defs=>
  hasOperation(defs,'ShieldTop')||hasOperation(defs,'Select',d=>d.to==='shields')||
  hasOperation(defs,'Look',d=>d.stages?.some(stage=>stage.to==='shields')));
}
const echoTarget629=f=>f.type!=='creature'&&finite(f.cost)<=3;
const lowCostDeployment630=f=>f.type==='creature'&&!f.evolution&&finite(f.cost)<=3;
function smallCreatureResponse632(c,profile){
 if(c.supportBatch!=='phase-632')return 0;
 const {lowCostBodies,lowPowerBodies,body}=profile.counts;
 if(c.g571Saver)return lowCostBodies>=12&&body>=30?79:0;
 return lowPowerBodies>=20&&body>=35?82:0;
}
function darkControl631(c,profile){
 if(c.supportBatch!=='phase-631')return 0;
 const {commands,offHandEntry,large,body}=profile.counts;
 if(c.gStrike)return commands<=4&&large>=10&&offHandEntry>=6?78:0;
 return body>=30&&large<=4&&offHandEntry>=13?79:0;
}
function handDeployment630(c,profile){
 if(c.supportBatch!=='phase-630')return 0;
 const {large,lowCostBodies,fast,shieldBuilders,earlyMultiExecution}=profile.counts;
 if(c.normalCharger)return large>=20&&lowCostBodies<=4&&shieldBuilders>=6?72:0;
 return fast>=4&&earlyMultiExecution>=12&&large<=9?82:0;
}
function drawTempo629(c,profile){
 if(c.supportBatch!=='phase-629')return 0;
 const {fast,lowCostBodies,lowPowerBodies,large,blocks}=profile.counts;
 if(c.ddd)return lowCostBodies>=12&&large<=8&&blocks<=4?82:0;
 return lowPowerBodies>=12&&fast>=8&&large<=5?89:0;
}
function recoveryDefense628(c,profile){
 if(c.supportBatch!=='phase-628')return 0;
 const {body,blocks,cheap,machEntry}=profile.counts;
 if(c.ddd)return body>=28&&blocks>=12&&cheap>=14&&machEntry<=2?84:0;
 return machEntry>=12&&cheap>=12?85:0;
}
function attackDefense627(c,profile){
 if(c.supportBatch!=='phase-627')return 0;
 const {body,fast,large}=profile.counts;
 if(c.type==='spell')return body>=28&&fast>=8&&large<=9?86:0;
 return large>=12&&large<24&&fast>=8?83:0;
}
function removalResponse626(c,profile){
 if(c.supportBatch!=='phase-626')return 0;
 const {lowCostElements,cheapSupport,large}=profile.counts;
 if(c.type==='spell')return lowCostElements>=18&&large<=10?88:0;
 return cheapSupport>=10?86:0;
}
function discardResponse625(c,profile){
 if(c.supportBatch!=='phase-625')return 0;
 const {discard,cheap}=profile.counts;
 if(c.triggerPlus)return discard>=8&&discard<14&&cheap>=12?74:0;
 return discard>=14?74:0;
}
function entryResponse624(c,profile){
 const {smallMultiBody,batchDeployment,offHandEntry,cheat}=profile.counts;
 if(c.g624EntryResponse==='multicolorFight')return smallMultiBody>=10?100:0;
 if(c.g624EntryResponse==='untappedManaShield')return batchDeployment>=4&&offHandEntry>=10&&cheat>=8?100:0;
 return 0;
}
function spellBoardResponse623(c,profile){
 if(c.supportBatch!=='phase-623')return 0;
 const {blocks,large,cheap,fast,machEntry,offHandEntry}=profile.counts;
 if(c.g485SpellReduction)return fast<=6&&blocks>=12&&cheap<=18&&machEntry<=2&&offHandEntry<=4?76:0;
 return fast<=6&&large>=16&&cheap<=14&&blocks<=3?80:0;
}
function combatResponse622(c,profile){
 if(c.supportBatch!=='phase-622')return 0;
 const {counts}=profile;
 if(c.g252WinWatch)return counts.machEntry>=8&&counts.cheap<=10&&counts.large<=12?82:0;
 if(c.triggerPlus)return counts.fast>=10&&counts.large>=12?76:0;
 return counts.cheap>=30&&counts.lowCostBodies>=20&&counts.large<=10?77:0;
}
function deploymentResponse621(c,profile){
 if(c.supportBatch!=='phase-621')return 0;
 const {counts}=profile;
 if(c.g621NonSummon==='skip')return counts.batchDeployment>=4&&counts.cheap>=20?82:0;
 if(c.g621NonSummon==='bottom')return counts.batchDeployment>=4&&counts.blocks>=10&&counts.offHandEntry>=5?78:0;
 return counts.body>=36&&counts.cheap>=14&&counts.machEntry>=8?74:0;
}
function neoCounter620(c,profile){
 if(c.supportBatch!=='phase-620')return 0;
 const {counts}=profile;
 if(c.g403Bloom)return counts.invasion>=8&&counts.offHandEntry>=8?58:0;
 if(c.g178Block)return counts.fast>=8&&counts.cheap>=14&&counts.smallBody>=14?64:0;
 if(c.ddd)return counts.blocks>=14&&counts.large>=6&&counts.cheap>=12?68:0;
 return counts.large>=28&&counts.batchDeployment===0&&counts.offHandEntry<=8?72:0;
}
function executionTax619(c,profile){
 const tax=c.g619Tax;
 if(!tax)return 0;
 const {multiExecution,earlyMultiExecution,spellOnly,seedOnly,noncreatureExecution}=profile.counts;
 if(tax.kind==='multicolor')return multiExecution>=22?78*Math.min(1,Math.max(0,(earlyMultiExecution-8)/8)):0;
 if(tax.kind==='spellOrSeed')return seedOnly>=10?72*Math.min(1,(spellOnly+seedOnly)/18):0;
 return spellOnly>=28?77*Math.min(1,(noncreatureExecution-18)/12):0;
}
function shieldPressure618(c,profile){
 if(c.supportBatch!=='phase-618')return 0;
 const {counts,shieldTriggers}=profile;
 if(!c.shieldBurn)return counts.shieldBuilders>=6&&shieldTriggers.spell>=8?60:0;
 if(c.gStrike)return shieldTriggers.creature>=12?70:0;
 return shieldTriggers.spell>=14&&counts.cheap>=4&&counts.cheap<=8?87:0;
}
function elementRemoval617(c,profile){
 if(c.supportBatch!=='phase-617')return 0;
 const {counts,shieldTriggers}=profile;
 if(c.g617OpponentElementLeaves)
  return counts.cheap>=18&&counts.blocks>=9&&shieldTriggers.all<=3?64:0;
 if(c.evolvedEntryOnly)
  return counts.gear>=8?40:0;
 return 46*Math.min(1,Math.max(0,counts.largeSupport-4)/6);
}
const batchDeployEffects=new Set(['gachiRobo','heavensGate','bandeRadio','sheva','mikadoreo','abyssJaga']);
function repeatedDeployment616(c,profile){
 if(!c.g616EntryLimit)return 0;
 const {counts,shieldTriggers}=profile;
 if(c.spellFace)return counts.fastEntry>=22&&counts.offHandEntry>=8?56:0;
 if(c.gStrike){
  // Large bodies with little early defense are handled by the existing rush plan.
  if(counts.batchDeployment<3||counts.blocks>8||counts.large>=25&&shieldTriggers.all<=4)return 0;
  return 48*Math.min(1,counts.batchDeployment/4);
 }
 return shieldTriggers.creature>=12?66:0;
}
function attackPressure615(c,profile){
 if(c.supportBatch!=='phase-615')return 0;
 const {counts,shieldTriggers,weights}=profile;
 if(counts.large<16||counts.cheap>8||counts.openingBoost>8||counts.earlyDeployment>12||counts.grave>=12||weights.rush>=.6||counts.blocks>7||shieldTriggers.all>10)return 0;
 const window=Math.min(1,(counts.large-12)/12)*(1-counts.openingBoost/12);
 if(c.invasion)return 76*window;
 if(c.g208Auras)return (68+Math.max(0,5-counts.blocks)*4)*window;
 return (64+counts.blocks*4)*window;
}
function graveResponse614(c,profile){
 const {counts,weights}=profile;
 if(hasOperation(c.g34Tasks,'Scorpion614'))
  return 75*Math.min(1,Math.max(0,counts.grave-13)/8)*Math.min(1,(counts.blocks+3)/6);
 if(hasOperation(c.g34Tasks,'Target',d=>d.filter?.g614GraveCreatureName))
  return 51*weights.grave*Math.min(1,Math.max(0,counts.repeatedBodies-22)/9);
 if(c.g614GraveNameSpellLock)
  return 71*Math.min(1,Math.max(0,counts.repeatedLightNatureSpells-10)/9);
 return 0;
}
function smallBoardResponse612(c,profile){
 if(c.supportBatch!=='phase-612')return 0;
 const {lowCostBodies,lowPowerBodies,under4000}=profile.counts;
 const scale=(count,min,range)=>Math.min(1,Math.max(0,(count-min)/range));
 if(c.g303DeathWatch)return 65*scale(lowPowerBodies,6,15);
 if(c.spellFace)return 47*scale(under4000,12,18);
 return 49*scale(lowCostBodies,6,11);
}
function playsFromOtherZones(c){
 return !!(c.abyssRush||c.graveSummon||c.fushigibirth||c.mugenCrime&&c.type==='creature'||
  /メクレイド|リアニメイト|(?:墓地|マナゾーン|山札|超次元ゾーン)から[^。\n]{0,45}(?:出す|出して|召喚)/.test(c.text||''));
}
function playsEarly(c){
 return c.type==='creature'&&finite(c.cost)>=5&&(
  c.rev||c.invasion||c.mugenCrime||c.fushigibirth||c.ddd||c.kirifudaDash||c.abyssRush||
  /召喚コスト|コストを支払わず.{0,12}召喚|ハイパーエナジー|B・A・D|G・[0０ゼ]/.test(c.text||'')
 );
}
const graveBottom=defs=>hasOperation(defs,'GraveBottom589',d=>!d.self);
const features=c=>{const faces=playFaces(c),text=String(c.text||''),openingRamp=Math.max(...faces.map(openingRampWeight));return {faces,echo629:c.supportBatch==='phase-629'&&!!c.ddd,echoTarget629:faces.some(echoTarget629),colors:[...new Set(faces.flatMap(civilizations))],cost:Math.min(...faces.map(f=>finite(f.cost))),bodyCost:Math.min(...faces.filter(f=>f.type==='creature').map(f=>finite(f.cost))),body:faces.some(f=>f.type==='creature'),tiny:faces.some(f=>f.type==='creature'&&finite(f.power)<=1000),swarmResponse:swarmResponse(c,faces),graveResponse:graveResponseWeight(c),blockerResponse:blockerResponseWeight(faces),earlyDeploymentResponse:earlyDeploymentResponse(c,faces),targetRemoval:faces.some(f=>['destroy','destroyUntapped','destroySmall','destroy6000','bounce','bounceSmall','bounceBlockers'].includes(f.effect)||hasOperation(f.g34Tasks,'Target',d=>['grave','deck','hand','mana','shields'].includes(d.to))),earlyDeployment:faces.some(playsEarly),offHandEntry:faces.some(playsFromOtherZones),nonMultiBody:faces.some(f=>f.type==='creature'&&civilizations(f).length<=1),nonMultiRemoval:Math.max(...faces.map(nonMultiRemoval)),defensiveTrigger:Math.max(...faces.map(defensiveTriggerWeight)),openingRamp,answersSupport:faces.some(f=>hasOperation(f.g34Tasks,'IfOwn',d=>d.filter?.g603AttackThisTurn)||hasOperation(f.g34Tasks,'Target',d=>d.element&&d.filter?.nonCreatureElement)),cheapSupport:faces.some(f=>finite(f.cost)<=5&&['seed','field','gear','aura','artifact','land'].includes(f.type)),blocks:faces.some(f=>f.blocker||f.g260Self?.grants?.blocker||f.g208Auras?.some(a=>a.grants?.blocker)),shieldLock:c.g597TriggerLock,attacker:faces.some(f=>f.type==='creature'&&!f.noAttack&&!f.noPlayerAttack),fast:faces.some(f=>f.speedAttacker||f.invasion||f.rev),block:faces.some(f=>f.blocker||f.slayer),trigger:faces.some(f=>f.trigger||f.gStrike||f.strikeBack||f.triggerPlus&&hasOperation(f.g34Plus,'Sweep',d=>oneSidedSweep(d)&&d.filter.g596EnteredThisTurn)),ramp:openingRamp>0||faces.some(f=>rampEffects.has(f.effect)||graveBottom(f.g34Tasks)&&hasOperation(f.g34Tasks,'Ramp')),removal:faces.some(f=>removalEffects.has(f.effect)||hasOperation(f.g34Tasks,'OverManaBottom590')),grave:/墓地から|墓地にある|墓地の.*召喚/.test(text)||!!c.graveSummon||!!c.mugenCrime,spell:faces.some(f=>f.type==='spell'),discard:/相手(?:は(?:自身|自分自身|自分)?の?|の)手札[^。\n]*捨て/.test(text)||faces.some(f=>discardEffects.has(f.effect)||f.drawDiscard||f.g394Jao||[f.g34Tasks,f.g34Attack,f.g174End].some(defs=>hasOperation(defs,'Discard',discardsOpponent))),discardHate:!!(c.g591HandShield||c.g591Discard||c.enemyDiscardDeploy||c.discardDeploy),cheat:/コストを支払わず|召喚せず/.test(text)||!!c.rev||!!c.invasion||!!c.mugenCrime,graveHate:!hasOperation(c.g34Tasks,'Scorpion614')&&/(?:相手の墓地|相手は自身の墓地).*(?:山札|マナ)/.test(text)||!!(c.graveGate||c.g277GraveLock||c.g44Apul||c.g592GravesStay)||faces.some(f=>graveBottom(f.g34Tasks)),cheatHate:!!(c.tokoshie||c.oniBounce||c.noNonsummonEntry||c.handEntryOnly||c.entryGate||c.g403Bloom&&c.supportBatch!=='phase-620'||c.g26Queen)||faces.some(f=>hasOperation(f.g34Tasks,'OverManaBottom590')||hasOperation(f.g397Shinka,'OverManaBottom590')),spellResponse:!!respondsToSpell(c),spellHate:!!(c.g222SpellTax?.perOtherCreature||c.g260Self?.grants?.g595NonLightSpellLock||c.spellLockMaxCost||c.travelSpellLock||c.shiroLock||c.g32Dolf||c.genmu||c.g590SpellOnce||c.g26OneNote)||faces.some(f=>hasOperation(f.g34Tasks,'SpellLock589')||hasOperation(f.g34Attack,'SpellLock589')),graveReliant:/自分の墓地から/.test(text)||!!(c.graveCast||c.graveSummon||c.mugenCrime||c.abyssRush||c.fushigibirth),symmetricGraveLock:!!c.g592GravesStay,entryStop:!!c.g593EntryStop,powerStop:faces.some(f=>hasOperation(f.g34Tasks,'PowerAttack593')),draw:faces.some(f=>/draw|search/i.test(f.effect||'')||hasOperation(f.g34Tasks,'Draw')&&(f.g593EntryStop||hasOperation(f.g34Tasks,'PowerAttack593'))),race:String(c.race||'')};};
export function analyzeStrongestTarget(deck){
 const counts={commands:0,cheap:0,lowCostElements:0,smallMultiBody:0,fast:0,fastEntry:0,machEntry:0,spell:0,spellOnly:0,openingBoost:0,grave:0,cheat:0,large:0,body:0,discard:0,tiny:0,smallBody:0,lowCostBodies:0,lowPowerBodies:0,under4000:0,blocks:0,earlyDeployment:0,offHandEntry:0,targetRemoval:0,nonMultiBody:0,cheapSupport:0,repeatedBodies:0,repeatedLightNatureSpells:0,batchDeployment:0,gear:0,largeSupport:0,shieldBuilders:0,multiExecution:0,earlyMultiExecution:0,invasion:0,seedOnly:0,noncreatureExecution:0},costs=new Map();
 const shieldTriggers={all:0,spell:0,creature:0};
 let cost=0;
 for(const r of deck.cards){const f=features(card(r.id));cost+=f.cost*r.count;
  if(f.faces.some(face=>batchDeployEffects.has(face.effect)||hasOperation(face.g34Tasks,'Select',d=>d.deploy&&(d.n==='all'||d.n>=2))))counts.batchDeployment+=r.count;
  if(f.faces.some(face=>face.type==='gear'))counts.gear+=r.count;
  if(f.faces.some(face=>['seed','field'].includes(face.type)&&finite(face.cost)>=4))counts.largeSupport+=r.count;
  if(f.faces.some(addsShields618))counts.shieldBuilders+=r.count;
  if(f.faces.some(face=>face.invasion))counts.invasion+=r.count;
  if(f.faces.every(face=>civilizations(face).length>1)){
   counts.multiExecution+=r.count;
   if(f.faces.every(face=>finite(face.cost)<=5))counts.earlyMultiExecution+=r.count;
  }
  if(f.faces.every(face=>face.type==='seed'&&!face.seedCreature))counts.seedOnly+=r.count;
  if(f.faces.every(face=>face.type!=='creature'&&!face.seedCreature))counts.noncreatureExecution+=r.count;
  const triggerFaces=f.faces.filter(printedShieldTrigger);
  if(triggerFaces.length)shieldTriggers.all+=r.count;
  const creatures=f.faces.filter(face=>face.type==='creature');
  if(creatures.some(face=>String(face.race||'').includes('コマンド')))counts.commands+=r.count;
  if(r.count>=3){
   if(creatures.length)counts.repeatedBodies+=r.count;
   if(f.faces.some(face=>face.type==='spell'&&civilizations(face).some(color=>color==='光'||color==='自然')))counts.repeatedLightNatureSpells+=r.count;
  }
  if(creatures.some(face=>civilizations(face).length>1&&finite(face.cost)<=4&&finite(face.power)<=5000))counts.smallMultiBody+=r.count;
  if(f.faces.some(face=>['creature','seed','gear','field'].includes(face.type)&&finite(face.cost)<=2))counts.lowCostElements+=r.count;
  if(creatures.some(face=>finite(face.cost)<=2))counts.lowCostBodies+=r.count;
  if(creatures.some(face=>finite(face.power)<=2000))counts.lowPowerBodies+=r.count;
  if(creatures.some(face=>finite(face.power)<=4000))counts.under4000+=r.count;
  if(f.faces.some(face=>face.type==='creature'&&(face.speedAttacker||face.evolution||face.neoEvolution||face.sMax)))counts.fastEntry+=r.count;
  else if(f.faces.some(face=>face.type==='creature'&&face.machFighter))counts.machEntry+=r.count;
  if(f.faces.every(face=>face.type==='spell'))counts.spellOnly+=r.count;
  if(f.faces.some(face=>finite(face.cost)<=5&&(rampEffects.has(face.effect)||hasOperation(face.g34Tasks,'Ramp')||hasOperation(face.g34Tasks,'Look',d=>d.stages?.some(stage=>stage.to==='mana')))))counts.openingBoost+=r.count;
  for(const kind of ['spell','creature'])if(triggerFaces.some(face=>face.type===kind))shieldTriggers[kind]+=r.count;
  for(const key of ['fast','spell','grave','cheat','body','discard','tiny','blocks','earlyDeployment','offHandEntry','targetRemoval','nonMultiBody','cheapSupport'])if(f[key]&&(key!=='fast'||f.bodyCost<=5))counts[key]+=r.count;if(f.faces.some(face=>face.type==='creature'&&finite(face.power)<=3000))counts.smallBody+=r.count;if(f.body&&f.bodyCost<=3)counts.cheap+=r.count;if(f.body&&f.bodyCost>=7)counts.large+=r.count;const n=Math.min(20,f.cost);costs.set(n,(costs.get(n)||0)+r.count);}
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
 v+=handBoardResponse(c,profile)+spellHandResponse(c,profile)+largeRemoval608(c,profile)+protectsLarge608(c,profile)+tempoResponse609(c,profile)+resourceResponse610(c,profile)+untappedResponse611(c,profile)+smallBoardResponse612(c,profile)+graveResponse614(c,profile)+f.attackPressure+repeatedDeployment616(c,profile)+elementRemoval617(c,profile)+shieldPressure618(c,profile)+executionTax619(c,profile)+neoCounter620(c,profile)+deploymentResponse621(c,profile)+combatResponse622(c,profile)+spellBoardResponse623(c,profile)+entryResponse624(c,profile)+discardResponse625(c,profile)+removalResponse626(c,profile)+attackDefense627(c,profile)+recoveryDefense628(c,profile)+drawTempo629(c,profile)+handDeployment630(c,profile)+darkControl631(c,profile)+smallCreatureResponse632(c,profile);
 if(f.answersSupport)v+=34*Math.min(1,profile.counts.cheapSupport/10);
 if(c.g607HandOnly)v+=54*Math.min(1,Math.max(0,(profile.counts.offHandEntry-7)/6));
 if(c.g591Discard==='opponentEffect607')v+=16*w.discard;
 if(f.defensiveTrigger){
  const lowPowerLock=hasOperation(c.g34Tasks,'LockUntap606')?34*Math.min(1,Math.max(0,(profile.counts.smallBody-8)/6)):0;
  v+=(f.defensiveTrigger+lowPowerLock)*Math.max(0,(w.rush-.5)*2);
 }
 if(f.nonMultiRemoval)v+=f.nonMultiRemoval*Math.min(1,Math.max(0,(profile.counts.nonMultiBody-23)/11));
 if(c.g601UnpaidDestroy)v+=35*w.cheat;
 if(c.g601OffHandMana)v+=22*Math.min(w.grave,w.cheat);
 if(f.earlyDeploymentResponse)v+=f.earlyDeploymentResponse*Math.min(1,Math.max(0,(profile.counts.earlyDeployment-6)/9));
 if(f.blockerResponse){
  const cheapSpell=c.supportBatch==='phase-613'&&c.type==='spell';
  const blocks=profile.counts.blocks;
  v+=f.blockerResponse*Math.min(1,Math.max(0,(blocks-(cheapSpell?3:4))/(cheapSpell?8:10)));
  if(c.supportBatch==='phase-613'&&c.spellFace)v+=24*Math.min(1,Math.max(0,(blocks-14)/8));
 }
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
 let score=0,early=0,attackers=0,high=0,ramp=0,overlap=0,graveReliant=0,symmetricGraveLock=0,spells=0,echo=0,echoTargets=0,cheapDeployments=0,largeAllies=0,smallAllies=0;
 let hasNewBeetle=false,hasNewHorror=false;
 let hasNewAdvent=false,hasNewNoval=false,hasNewGraveRemoval=false;
 const colors=new Map(),races=new Map(),spellResponseColors=new Set();
 for(const {id,count}of rows){const f=info.get(id);score+=(utilities.get(id)||0)*count-f.redundantPressure*Math.max(0,count-2);if(f.cost<=3)early+=count;if(f.attacker)attackers+=count;if(f.bodyCost>=6&&f.body||!f.body&&f.cost>=6)high+=count;if(f.ramp)ramp+=count;if(f.spell)spells+=count;if(f.echo629)echo+=Math.max(0,count-(base.counts.get(id)||0));if(f.echoTarget629)echoTargets+=count;if(f.lowCostDeployment630)cheapDeployments+=count;
  if(f.largeAlly632&&!f.beetle632)largeAllies+=count;
  if(f.smallAlly632)smallAllies+=count;
  if(count>(base.counts.get(id)||0)){
   hasNewAdvent||=f.advent630;hasNewNoval||=f.noval630;hasNewGraveRemoval||=f.graveRemoval631;
   hasNewBeetle||=f.beetle632;hasNewHorror||=f.horror632;
  }
  if(f.spellBoardResponse&&count>(base.counts.get(id)||0))for(const color of f.colors)spellResponseColors.add(color);if(f.graveReliant)graveReliant+=count;if(f.symmetricGraveLock)symmetricGraveLock+=count;overlap+=Math.min(base.counts.get(id)||0,count);for(const color of f.colors)colors.set(color,(colors.get(color)||0)+count);for(const race of base.races)if(f.race.includes(race))races.set(race,(races.get(race)||0)+count);}
 if(echo&&(echoTargets<6||attackers<16)||hasNewGraveRemoval&&graveReliant<6)return -Infinity;
 if(hasNewAdvent&&(echoTargets<6||high<6)||hasNewNoval&&cheapDeployments<10)return -Infinity;
 if(hasNewBeetle&&largeAllies<6||hasNewHorror&&smallAllies<10)return -Infinity;
 if(overlap<28||attackers<Math.min(8,base.attackers)||high<Math.min(4,base.high))return -Infinity;
 if(spellResponseColors.size&&(spells<8||[...spellResponseColors].some(color=>(colors.get(color)||0)<8)))return -Infinity;
 score-=symmetricGraveLock*Math.max(0,graveReliant-4)*2+Math.max(0,12-early)*14+Math.max(0,high-12)*8+Math.max(0,ramp-12)*5;
 for(const color of base.colors)score-=Math.max(0,Math.min(8,base.sources.get(color)||0)-(colors.get(color)||0))*12;
 for(const race of base.races)score-=Math.max(0,(base.raceCounts.get(race)||0)-4-(races.get(race)||0))*7;
 return score;
}
export function buildStrongestCPU(target,seeds,implemented,{onProgress=()=>{},learning=null,previousBuild=null}={}){
 const errors=validateDeck(target);if(errors.length)throw Error(errors[0]);const feedback=normalizeStrongestLearning(learning,target),profile=analyzeStrongestTarget(target);
 for(const k of learningKeys)profile.weights[k]=Math.min(3,profile.weights[k]+feedback.weights[k]*Math.min(1.5,.5+feedback.losses*.1));
 const info=new Map(implemented.map(c=>{
  const f=features(c),attackPressure=attackPressure615(c,profile);
  // Extra copies of the conditional aura or the finishing spell compete for the same role.
  const is632=c.supportBatch==='phase-632';
  const largeAlly632=f.faces.some(face=>face.type==='creature'&&finite(face.power)>=12000);
  const smallAlly632=f.faces.some(face=>face.type==='creature'&&finite(face.cost)<=3&&finite(face.power)<=5000);
  return [c.id,{...f,attackPressure,beetle632:is632&&!!c.g571Saver,horror632:is632&&!!c.trigger,largeAlly632,smallAlly632,graveRemoval631:c.supportBatch==='phase-631'&&!!c.trigger,advent630:c.supportBatch==='phase-630'&&!!c.normalCharger,noval630:c.supportBatch==='phase-630'&&!!c.superTrigger,lowCostDeployment630:f.faces.some(lowCostDeployment630),spellBoardResponse:c.supportBatch==='phase-623',redundantPressure:['phase-631','phase-632'].includes(c.supportBatch)?40:c.supportBatch==='phase-630'?46:c.invasion?0:attackPressure*.55}];
 })),utilities=new Map(implemented.map(c=>[c.id,utility(c,info.get(c.id),profile)])),failed=new Map(feedback.failed.map(x=>[x.signature,x.losses]));
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
  const protectedAllies={cost:0,power:0,largePower:0};
  let earlyFire=0,spellSupport=0,echoSupport=0,cheapDeployments=0,graveSupport=0,smallAllies=0;
  for(const r of seed.rows){
   const f=info.get(r.id);
   if(f.spell)spellSupport+=r.count;
   if(f.echoTarget629)echoSupport+=r.count;
   if(f.lowCostDeployment630)cheapDeployments+=r.count;
   if(f.graveReliant)graveSupport+=r.count;
   if(f.faces.some(face=>face.type==='creature'&&finite(face.cost)<=4&&civilizations(face).includes('火')&&!face.noAttack&&!face.noPlayerAttack))earlyFire+=r.count;
   if(f.faces.some(face=>face.type==='creature'&&finite(face.cost)>=7))protectedAllies.cost+=r.count;
   if(f.faces.some(face=>face.type==='creature'&&finite(face.power)>=6000))protectedAllies.power+=r.count;
   if(f.largeAlly632&&!f.beetle632)protectedAllies.largePower+=r.count;
   if(f.smallAlly632)smallAllies+=r.count;
  }
  const pool=implemented.filter(c=>{const f=info.get(c.id);return (c.limit??4)>0&&f.cost<=8&&f.colors.every(k=>colors.has(k))&&(trusted.has(c.id)||f.cheatHate||f.spellHate||f.spellResponse||f.graveHate||f.graveResponse&&profile.weights.grave>=.35||c.g598UnpaidBottom&&profile.weights.cheat>=.5||f.discardHate||f.entryStop||f.powerStop||(smallCreatureResponse632(c,profile)>0&&(c.g571Saver?protectedAllies.largePower>=6:smallAllies>=12)||darkControl631(c,profile)>0&&(c.gStrike||graveSupport>=6)||handDeployment630(c,profile)>0&&(c.normalCharger?echoSupport>=6&&seed.base.high>=6:cheapDeployments>=10)||drawTempo629(c,profile)>0&&(!c.ddd||echoSupport>=6&&seed.base.attackers>=16)||recoveryDefense628(c,profile)>0&&(c.ddd||seed.base.attackers>=18)||attackDefense627(c,profile)>0||removalResponse626(c,profile)>0&&(c.type==='spell'||earlyFire>=12)||entryResponse624(c,profile)>0||spellBoardResponse623(c,profile)>0&&spellSupport>=8||combatResponse622(c,profile)>0||deploymentResponse621(c,profile)>0||neoCounter620(c,profile)>0||executionTax619(c,profile)>=28)&&f.colors.every(color=>(seed.base.sources.get(color)||0)>=8)||shieldPressure618(c,profile)>=28&&(!c.g204SpellWatch||spellSupport>=8)||elementRemoval617(c,profile)>=24||repeatedDeployment616(c,profile)>=28||earlyFire>=10&&f.attackPressure>=22||graveResponse614(c,profile)>=22||smallBoardResponse612(c,profile)>=22||untappedResponse611(c,profile)>=22||resourceResponse610(c,profile)>=22||tempoResponse609(c,profile)>=22||largeRemoval608(c,profile)>=22||protectsLarge608(c,profile)>=16&&protectedAllies[c.g608Protect.min?"cost":"power"]>=8||c.g607HandOnly&&profile.counts.offHandEntry>=10||f.answersSupport&&profile.counts.cheapSupport>=8||f.swarmResponse||f.openingRamp||handBoardResponse(c,profile)>=16||spellHandResponse(c,profile)>=20||f.defensiveTrigger&&profile.weights.rush>=.65||f.nonMultiRemoval&&profile.counts.nonMultiBody>=26||c.g601UnpaidDestroy&&profile.weights.cheat>=.5||c.g601OffHandMana&&Math.min(profile.weights.grave,profile.weights.cheat)>=.5||f.earlyDeploymentResponse&&profile.counts.earlyDeployment>=9||f.blockerResponse&&profile.counts.blocks>=8||f.shieldLock&&profile.shieldTriggers[f.shieldLock.type||'all']>=8)&&(!f.shieldLock?.allColors||['光','水','闇','火','自然'].every(color=>creatureColors.has(color)))&&(!c.evolution&&!c.manaEvolution&&!c.graveEvolution||seed.base.counts.has(c.id));}).sort((a,b)=>(utilities.get(b.id)-utilities.get(a.id))||a.id.localeCompare(b.id)).slice(0,28);
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
 const quality=hand=>{
  let v=0;
  // Early responses need enough charges, including one that enters untapped.
  const earlyResponse=hand.filter(x=>card(x).g624EntryResponse||card(x).supportBatch==='phase-625')
   .sort((a,b)=>info.get(a.cardId).cost-info.get(b.cardId).cost)[0];
  if(earlyResponse){
   const others=hand.filter(x=>x!==earlyResponse),face=card(earlyResponse);
   v+=14;
   if(others.some(x=>info.get(x.cardId).colors.length<=1&&manaValue(card(x))>0)&&manaPayment(others,face))v+=26;
  }
  const counter=hand.find(x=>card(x).g619Tax||card(x).g621NonSummon==='skip'||card(x).supportBatch==='phase-620'&&card(x).g403Bloom);
  if(counter){
   const sources=hand.filter(x=>x!==counter),face=card(counter);
   if(sources.length>=face.cost&&manaPayment(sources,face))v+=26;
  }
  const counts=new Map();for(const x of hand)counts.set(x.cardId,(counts.get(x.cardId)||0)+1);for(const x of hand){const f=info.get(x.cardId);v+=(f.cost<=3?10:0)+(f.ramp?14:0)+(f.body&&f.cost>=4&&f.cost<=6?8:0)-(f.cost>=7?9:0)-(counts.get(x.cardId)-1)*4;for(const face of playFaces(card(x)).filter(c=>finite(c.cost)<=3)){const others=hand.filter(y=>y!==x);if(others.some(a=>others.some(b=>a!==b&&civilizations(card(b)).length<=1&&manaPayment([a,b],face))))v+=20+(f.ramp?12:0);}}return v;};
 let beam=[{hand:[],last:-1,score:0}];for(let depth=0;depth<5;depth++){const next=[];for(const row of beam){const seen=new Set();for(let i=row.last+1;i<pool.length;i++){const x=pool[i];if(seen.has(x.cardId)||pool.length-i<5-depth)continue;seen.add(x.cardId);const hand=[...row.hand,x];next.push({hand,last:i,score:quality(hand)});}}beam=next.sort((a,b)=>b.score-a.score||a.last-b.last).slice(0,24);}
 const hand=beam[0]?.hand||pool.slice(0,5),chosen=new Set(hand.map(x=>x.uid)),rest=pool.filter(x=>!chosen.has(x.uid)),seen=new Map(hand.map(x=>[x.cardId,1])),order=[];let hasRamp=hand.some(x=>info.get(x.cardId).ramp);
 for(let turn=2;rest.length;turn++){const score=x=>{const f=info.get(x.cardId),n=Math.min(turn+1,9);return 30-Math.abs(f.cost-n)*5+(f.ramp&&!hasRamp&&turn<=4?24:0)+(f.attacker?5:0)+(f.draw?4:0)+(turn<=4&&card(x).g619Tax&&!seen.has(x.cardId)?10:0)-(seen.get(x.cardId)||0)*8+(turn<=4&&f.colors.length===1?4:0);};rest.sort((a,b)=>score(b)-score(a)||a.cardId.localeCompare(b.cardId)||a.uid.localeCompare(b.uid));const x=rest.shift();order.push(x);seen.set(x.cardId,(seen.get(x.cardId)||0)+1);hasRamp||=info.get(x.cardId).ramp;}
 own.hand=hand;own.deck=order;
 return {opening:hand.map(x=>x.cardId),order:order.map(x=>x.cardId)};
}
