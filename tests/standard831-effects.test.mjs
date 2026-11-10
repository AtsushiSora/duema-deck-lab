import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,cast,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const GIGA='dm33-014',MACH='dm35-048',SUN='dm35-030',PRINT='dmc60-005';
const SMALL='dm33-045',MID='dm33-028',BIG='dm36-054',TWIN='dm24bd4-007',DEATH_SPELL='dm34-047';
const LAND='dm01-108',EVO='dm02-033',BOUNCE='dm01-086',KILL='dm01-027',CIP='dm01-080';
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
function put(s,p,zone,id){const x=inst(id);s.players[p][zone].push(x);return x;}
function task(s,op,p,more){s.phase='main';s.extTasks=[{op,p,source:KILL,...more}];act(s,'toAttack');}
function pick(s,v){act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===v);}
const choices=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
function deploy(s,p,origin,x){task(s,'putCreature',p,{origin,uid:x.uid});}
function stack(s,p,id){const x=put(s,p,'battle',id);x.under=[{...inst(EVO),under:[inst(LAND)]}];return x;}
const resume=s=>JSON.parse(JSON.stringify(s));
const uids=s=>e.physicalCards(s).map(x=>x.uid).sort();

test('Phase 831 matches complete definitions and resolves the Giga Anima reprint as one card',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-831.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[GIGA,MACH,SUN]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),f=d.faces[0];
  assert.deepEqual(row.faces,d.faces);
  assert.deepEqual(row.spec,standardCardSpec(d,{phase:831}));
  const unknown=structuredClone(d);unknown.faces[0].abilityText+='未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:831}));
  assert.deepEqual([c.name,c.cost,c.power,c.race,c.manaValue,c.limit],[f.name,f.cost,Number(f.powerText),f.race,1,4]);
  assert.equal(CARD_IMAGES[row.id],row.image);
 }
 const [print]=m.printAliases;
 assert.equal(print.id,PRINT);
 assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:831}),m.cards[0].spec);
 assert.deepEqual(registry.resolveRows([{id:PRINT,count:2},{id:GIGA,count:2}]),[{id:GIGA,count:4}]);
 assert.equal(m.regulationVerification.limits[PRINT],4);
});

test('Giga Anima ignores itself, enemy Death Gods and allies with other names',()=>{
 const s=setup();put(s,0,'grave',SMALL);
 cast(s,GIGA);
 deploy(s,1,'hand',put(s,1,'hand',BIG));
 deploy(s,0,'hand',put(s,0,'hand',LAND));
 assert.equal(s.decision,null);
 assert.equal(s.players[0].grave.length,1);
});

test('Giga Anima recovers only a strictly cheaper Death God creature from its own grave',()=>{
 const s=setup();put(s,0,'battle',GIGA);
 give(s,0,'grave',[SMALL,MID,TWIN,DEATH_SPELL,GIGA,LAND]);
 put(s,1,'grave',SMALL);
 const [small,mid,twin]=s.players[0].grave;
 deploy(s,0,'hand',put(s,0,'hand',BIG));
 const saved=resume(s);
 assert.deepEqual(e.getLegalActions(saved),e.getLegalActions(s));
 assert.deepEqual(choices(saved),[small.uid,mid.uid,twin.uid,null]);
 pick(saved,twin.uid);
 assert.ok(has(saved,0,'hand',twin));
 assert.equal(saved.players[1].grave.length,1);
});

test('Giga Anima may skip and compares the creature half of an entering Twinpact',()=>{
 const s=setup();put(s,0,'battle',GIGA);
 const small=put(s,0,'grave',SMALL);put(s,0,'grave',MID);
 deploy(s,0,'hand',put(s,0,'hand',TWIN));
 if(s.decision?.type==='effectOrder')act(s,'orderEffect',a=>s.pendingEffects.some(q=>q.effectId===a.effectId&&q.source===GIGA));
 assert.deepEqual(choices(s),[small.uid,null]);
 pick(s,null);drain(s);
 assert.ok(has(s,0,'grave',small));
});

test('Giga Anima resolves for a Death God that destroyed itself before the trigger resolved',()=>{
 const s=setup();put(s,0,'battle',GIGA);
 const cheap=put(s,0,'grave',SMALL),equal=put(s,0,'grave',MID);
 const entrant=put(s,0,'hand','dm33-027');
 deploy(s,0,'hand',entrant);
 act(s,'orderEffect',a=>a.cardId===entrant.cardId);
 pick(s,entrant.uid);
 assert.ok(has(s,0,'grave',entrant));
 assert.deepEqual(choices(s),[cheap.uid,null]);
 pick(s,cheap.uid);
 assert.ok(has(s,0,'hand',cheap));
 assert.ok(has(s,0,'grave',equal));
});

test('Mach evolves only from the first card, does not trigger its base, and can attack at once',()=>{
 const s=setup();
 give(s,0,'deck',[CIP,LAND,LAND]);
 const [base,next]=s.players[0].deck;
 cast(s,MACH);
 assert.equal(s.decision,null);
 const [mach]=s.players[0].battle;
 assert.ok(e.isEvolution(mach));
 assert.deepEqual(mach.under.map(x=>x.uid),[base.uid]);
 assert.equal(s.players[0].deck[0].uid,next.uid);
 assert.deepEqual(s.players[0].g34Protected,[]);
 attack(s,mach.uid);drain(s);
 assert.equal(s.players[1].shields.length,4);
});

for(const base of [EVO,TWIN])test('Mach accepts a printed evolution or a Twinpact creature as its deck base '+base,()=>{
 const s=setup();give(s,0,'deck',[base,LAND,LAND]);
 cast(s,MACH);
 assert.equal(s.players[0].battle[0].under[0].cardId,base);
 assert.equal(s.players[0].battle[0].under[0].under,undefined);
 assert.equal(s.decision,null);
});

test('Mach leaves a revealed noncreature on top, returns to hand and keeps mana paid',()=>{
 const s=setup();give(s,0,'deck',[BOUNCE,LAND,LAND]);
 const [top]=s.players[0].deck,mach=put(s,0,'hand',MACH),before=uids(s);
 act(s,'play',a=>a.uid===mach.uid);
 assert.deepEqual(uids(s),before);
 assert.equal(s.players[0].deck[0].uid,top.uid);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,4);
 assert.ok(has(s,0,'hand',mach));
 assert.equal(s.players[0].hand[0].zoneSerial,undefined);
 assert.equal(s.players[0].battle.length,0);
 assert.ok(!s.players[0].enteredThisTurn);
});

test('Mach returns to hand even if its failed entry originated in the grave',()=>{
 const s=setup();give(s,0,'deck',[BOUNCE,LAND,LAND]);
 const mach=put(s,0,'grave',MACH),before=uids(s);
 deploy(s,0,'grave',mach);
 assert.deepEqual(uids(s),before);
 assert.ok(has(s,0,'hand',mach));
 assert.equal(s.players[0].deck[0].cardId,BOUNCE);
 assert.equal(s.players[0].grave.length,0);
});

for(const [replacement,baseMoves] of [['dmrp17-025',false],['dmrp19-044',true]])test('Mach separates card and creature entry replacements '+replacement,()=>{
 const s=setup();give(s,0,'mana',[]);give(s,0,'deck',[LAND,LAND,LAND]);
 put(s,1,'battle',replacement);
 const [base]=s.players[0].deck,mach=put(s,0,'grave',MACH),before=uids(s);
 deploy(s,0,'grave',mach);
 drain(s);
 assert.deepEqual(uids(s),before);
 assert.ok(has(s,0,'mana',mach));
 assert.equal(has(s,0,'mana',base),baseMoves);
 assert.equal(has(s,0,'deck',base),!baseMoves);
 assert.deepEqual(s.players[0].g34Protected,[]);
});

test('Sunshine requires an evolution and breaks two shields after evolving',()=>{
 const s=setup();const normal=put(s,0,'battle',LAND),sun=put(s,0,'hand',SUN);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===sun.uid));
 const evo=put(s,0,'battle',EVO);evo.under=[inst(LAND)];
 act(s,'play',a=>a.uid===sun.uid);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.baseUid).map(a=>a.baseUid),[evo.uid]);
 act(s,'evolve',a=>a.baseUid===evo.uid);
 assert.ok(has(s,0,'battle',normal));
 attack(s,sun.uid);drain(s);
 assert.equal(s.players[1].shields.length,3);
});

for(const [to,destroy] of [['grave',true],['hand',false],['mana',false]])test('Sunshine can replace a move to '+to+' with one noncreature discard',()=>{
 const s=setup(),sun=stack(s,0,SUN),spell=put(s,0,'hand',BOUNCE);
 put(s,0,'hand',LAND);put(s,0,'hand',TWIN);
 const before=uids(s);
 task(s,'g34_Sweep',1,{to,destroy,filter:{creature:true}});
 act(s,'replaceJashin');
 const saved=resume(s);
 assert.deepEqual(e.getLegalActions(saved).filter(a=>a.kind==='leaveHand').map(a=>a.uid),[spell.uid]);
 act(saved,'leaveHand',a=>a.uid===spell.uid);
 assert.deepEqual(uids(saved),before);
 assert.ok(has(saved,0,'battle',sun));
 assert.ok(has(saved,0,'grave',spell));
});

test('Sunshine with only creatures leaves, and can explicitly decline with a spell in hand',()=>{
 for(const decline of [false,true]){
  const s=setup(),sun=stack(s,0,SUN);
  put(s,0,'hand',TWIN);
  if(decline)put(s,0,'hand',BOUNCE);
  task(s,'g34_Sweep',1,{to:'mana',filter:{creature:true}});
  if(decline)act(s,'allowLeave');
  assert.ok(has(s,0,'mana',sun));
 }
});

test('Sunshine can replace zero-power destruction repeatedly before declining',()=>{
 const s=setup(),sun=stack(s,0,SUN);
 give(s,0,'hand',[BOUNCE,KILL,DEATH_SPELL]);
 sun.powerModifiers=[{amount:-11000}];
 act(s,'toAttack');
 for(let i=0;i<2;i++){act(s,'replaceJashin');act(s,'leaveHand');}
 act(s,'allowLeave');
 assert.ok(has(s,0,'grave',sun));
 assert.equal(s.players[0].hand.length,1);
});

test('Sunshine cannot replace destruction already redirected from another creature',()=>{
 const s=setup(),sun=stack(s,0,SUN),ater=put(s,0,'battle','dm23rp3-S03');
 const spell=put(s,0,'hand',BOUNCE);
 task(s,'destroyPower',1,{max:20000});
 pick(s,ater.uid);
 act(s,'replaceAter',a=>a.uid===sun.uid);
 assert.ok(has(s,0,'battle',ater));
 assert.ok(has(s,0,'grave',sun));
 assert.ok(has(s,0,'hand',spell));
 assert.equal(s.decision,null);
});

test('Two Sunshines in a simultaneous batch cannot share one discarded card',()=>{
 const s=setup(),a=stack(s,0,SUN),b=stack(s,0,SUN);
 put(s,0,'hand',BOUNCE);
 task(s,'g34_Sweep',1,{to:'grave',filter:{creature:true}});
 act(s,'replaceJashin');act(s,'leaveHand');
 assert.ok(has(s,0,'battle',a));
 assert.ok(has(s,0,'grave',b));
 assert.equal(s.players[0].hand.length,0);
});
