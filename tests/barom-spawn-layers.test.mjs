import test from 'node:test';
import assert from 'node:assert/strict';
import {e,setup,give,inst,act} from './target-fixture.mjs';
const SPAWN='dm22ex2-002',BASE='dm24ex2-066',DARK='dm01-090',FIRE='dm01-097';
const EVOLUTION='dmx04-013',DARK_EVOLUTION='dm32-054',STAR='dmsd21-013';
const HEAVY='dmex17-033',METAL='dmex17-059';
const add=(s,p,id,extra={})=>{const x=Object.assign(inst(id),extra);s.players[p].battle.push(x);return x;};
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function field(){const s=setup();for(const p of[0,1]){give(s,p,'deck',Array(30).fill(FIRE));give(s,p,'battle',[]);give(s,p,'grave',[]);}add(s,0,BASE);return s;}
function spawn(s){s.active=0;s.phase='main';const x=inst(SPAWN);s.players[0].hand.push(x);act(s,'play',a=>a.uid===x.uid);return x;}
function finish(s,pick){for(let n=0;(s.decision||s.extTasks?.length||s.pendingEffects?.length||s.leaving)&&s.winner===null;n++){assert.ok(n<200,'resolution terminates');const as=e.getLegalActions(s);assert.ok(as.length,JSON.stringify(s.decision));const a=pick?.(s,as)||(s.decision?.type==='evolution'?as.find(a=>a.kind==='evolve'):null)||e.chooseAI(s);e.step(s,a);}}
for(const p of[0,1])test('Spawn removes non-dark nested evolution bases but keeps the dark creature and dark bases, seat '+p,()=>{const s=field(),inner=inst(FIRE),dark=inst(DARK);dark.under=[inner];const direct=inst(FIRE),top=add(s,p,DARK_EVOLUTION,{under:[dark,direct]});const before=physical(s);spawn(s);finish(s);assert.ok(has(s,p,'battle',top));assert.deepEqual(top.under.map(x=>x.uid),[dark.uid]);assert.ok(has(s,p,'grave',inner)&&has(s,p,'grave',direct));assert.ok(!has(s,p,'grave',dark));assert.deepEqual(physical(s).filter(uid=>before.includes(uid)),before);});
for(const id of[EVOLUTION,STAR])test('Spawn destroys just the non-dark evolution card and reconstructs the surviving dark base '+id,()=>{const s=field(),dark=inst(id===STAR?'dmrp17-078':'dmd05-003'),top=add(s,1,id,{under:[dark]});spawn(s);finish(s);assert.ok(has(s,1,'grave',top));assert.ok(has(s,1,'battle',dark));assert.equal(s.players[1].battle.length,1);});
for(const reversed of[false,true])for(const departing of['dark','fire'])test('a physical sweep lets a linked God choose either component once, reversed '+reversed+', departing '+departing,()=>{
 const s=field(),dark=inst(HEAVY),fire=inst(METAL),top=reversed?fire:dark;top.godLinks=[reversed?dark:fire];s.players[1].battle.push(top);spawn(s);
 const out=departing==='dark'?dark:fire,stay=out===dark?fire:dark;
 finish(s,(game,as)=>game.decision?.type==='godLeave'?as.find(a=>a.uid===out.uid):null);
 assert.ok(has(s,1,'grave',out));assert.ok(has(s,1,'battle',stay));assert.equal(s.players[1].battle.length,1);assert.ok(!stay.godLinks?.length);
});

test('mixed bases are selected together and the non-dark evolution reconstructs only its surviving dark base',()=>{
 const s=field(),dark=inst('dmd05-003'),first=inst(FIRE),last=inst(FIRE),top=add(s,1,EVOLUTION,{under:[first,dark,last]});
 const before=physical(s);spawn(s);finish(s);
 assert.ok([top,first,last].every(x=>has(s,1,'grave',x)));
 assert.ok(has(s,1,'battle',dark));assert.ok(!dark.under?.length);
 assert.deepEqual(physical(s).filter(uid=>before.includes(uid)),before);
});
test('an ordinary evolution loses its entire non-dark stack without reconstructing a newly exposed target',()=>{const id=EVOLUTION;
 const s=field(),source=inst(FIRE),top=add(s,1,id,{under:[source]});spawn(s);finish(s);
 assert.ok(has(s,1,'grave',source)&&has(s,1,'grave',top));assert.equal(s.players[1].battle.length,0);
});
test('an unaffected dark host keeps its leave protection while its non-dark sources are removed',()=>{
 const s=field(),source=inst(FIRE),top=add(s,1,DARK_EVOLUTION,{under:[source],g26Stay:s.turn});spawn(s);finish(s);
 assert.ok(has(s,1,'battle',top));assert.ok(has(s,1,'grave',source));assert.ok(!top.under.length);
});
test('buried face-down cards are colourless even when their hidden printed card is dark',()=>{
 const s=field(),hidden=Object.assign(inst(DARK),{faceDown:true}),top=add(s,1,DARK_EVOLUTION,{under:[hidden]});spawn(s);finish(s);
 assert.ok(has(s,1,'battle',top));assert.ok(has(s,1,'grave',hidden));assert.ok(!hidden.faceDown);
});
test('a sealed dark evolution and its sources remain ignored for this sweep after the last seal is removed',()=>{
 const s=field(),base=inst(FIRE),top=add(s,1,DARK_EVOLUTION,{under:[base],sealed:true});const seal={...inst(FIRE),faceDown:true,sealOf:top.uid};s.players[1].seals.push(seal,{...inst(DARK),faceDown:true,sealOf:top.uid});
 spawn(s);finish(s);assert.ok(has(s,1,'battle',top));assert.ok(!top.sealed);assert.ok(top.under.some(x=>x.uid===base.uid));assert.ok(has(s,1,'grave',seal));
});
test('G-NEO replacement is chosen before its sources leave, including sources separately hit by the sweep',()=>{
 for(const baseId of[DARK,FIRE]){
  const s=field(),base=inst(baseId),top=add(s,1,'dm25rp3-DM1',{under:[base]});spawn(s);finish(s);
  assert.ok(has(s,1,'battle',top));assert.ok(has(s,1,'grave',base));assert.ok(!top.under?.length);
 }
});
test('each source removed from under a surviving Jashin triggers exactly once without treating the sources as dead creatures',()=>{
 const s=field(),watch=add(s,1,'dm25rp2-OR1'),top=add(s,1,DARK_EVOLUTION,{under:[inst(FIRE),inst(FIRE)]});give(s,0,'hand',[FIRE,FIRE,FIRE]);const originalHand=s.players[0].hand.map(x=>x.uid);
 spawn(s);finish(s);assert.ok(has(s,1,'battle',top));assert.ok(has(s,1,'battle',watch));assert.equal(s.players[0].grave.filter(x=>originalHand.includes(x.uid)).length,2);
});
test('buried cards stay pending through EX Life choice, encrypted room storage and both account projections',async()=>{
 const s=field(),buried=inst(FIRE),dark=add(s,1,DARK_EVOLUTION,{under:[buried]}),victim=add(s,1,'dmrp18-025');
 victim.exLifeShieldUids=s.players[1].shields.slice(0,2).map(x=>x.uid);
 spawn(s);
 for(let n=0;s.decision?.type!=='leaveReplace';n++){
  assert.ok(n<30&&s.decision,'replacement choice is reached');
  const as=e.getLegalActions(s);e.step(s,s.decision.type==='evolution'?as.find(a=>a.kind==='evolve'):e.chooseAI(s));
 }
 assert.ok(dark.under.some(x=>x.uid===buried.uid));
 assert.equal(s.leaving.after.kind,'physicalCardSweep');
 const {sealRoom,openRoom,projectRoom}=await import('../server/duel-core.mjs');
 e.setRandomSource(null);
 const key=Buffer.alloc(32,9).toString('base64'),room={schemaVersion:1,code:'A'.repeat(16),hostUid:'host-test',guestUid:'guest-test',phase:'playing',revision:1,expiresAt:Date.now()+60000,engineVersion:e.ENGINE_VERSION,profiles:[{name:'自分'},{name:'相手'}],events:[],game:s};
 const restored=openRoom(sealRoom(room,key),key).game,before=physical(s);
 assert.deepEqual(restored,JSON.parse(JSON.stringify(s)));
 for(const [seat,uid] of ['host-test','guest-test'].entries()){
  const view=projectRoom({...room,game:restored},{uid});
  assert.equal(view.game.actor,1);assert.equal(view.game.actions.length>0,seat===1);
  assert.ok(!JSON.stringify(view).includes('physicalCardSweep'));
  assert.ok(!Object.hasOwn(view.game,'leaving'));
  assert.ok(!view.game.players[1].grave.some(x=>x.uid===buried.uid));
 }
 assert.deepEqual(e.getLegalActions(restored),e.getLegalActions(s));
 for(const game of[s,restored]){
  const a=e.getLegalActions(game).find(a=>a.kind==='replaceEx');assert.ok(a,'EX Life is an available replacement');e.step(game,a);finish(game);
  assert.ok(has(game,1,'battle',victim));assert.ok(has(game,1,'battle',dark));assert.ok(has(game,1,'grave',buried));assert.deepEqual(physical(game),before);
  for(const uid of ['host-test','guest-test'])assert.ok(projectRoom({...room,game},{uid}).game.players[1].grave.some(x=>x.uid===buried.uid));
 }
 assert.deepEqual(e.getLegalActions(restored),e.getLegalActions(s));
});

test('a linked Psychic resolves one link-release choice, preserves both surviving creatures and survives restore',()=>{
 const s=field();s.format='advance';const top=add(s,1,'dmr01-v02'),left=inst('dmr01-062'),right=inst('dmr01-060');
 left.psychicCell=true;right.psychicCell=true;top.psychicLinks=[left,right];
 const before=physical(s);spawn(s);
 for(let n=0;s.decision?.type!=='psychicUnlink';n++){
  assert.ok(n<30&&s.decision,'link-release choice is reached');
  const as=e.getLegalActions(s);e.step(s,s.decision.type==='evolution'?as.find(a=>a.kind==='evolve'):e.chooseAI(s));
 }
 const restored=JSON.parse(JSON.stringify(s));assert.deepEqual(e.getLegalActions(restored),e.getLegalActions(s));
 for(const game of[s,restored]){
  act(game,'psychicUnlink',a=>a.uid===left.uid);finish(game);
  assert.ok(has(game,1,'extra',left));assert.ok(has(game,1,'battle',top)&&has(game,1,'battle',right));
  assert.ok(!game.players[1].battle.some(x=>x.psychicLinks?.length));
  assert.deepEqual(physical(game).filter(uid=>before.includes(uid)),before);
 }
});
test('an indestructible linked Psychic stays linked while its ordinary buried cards are removed',()=>{
 const s=field();s.format='advance';const source=inst(FIRE),top=add(s,1,'dmd03-001',{under:[source]}),part=inst('dmd03-002');part.psychicCell=true;top.psychicLinks=[part];
 spawn(s);finish(s);assert.ok(has(s,1,'battle',top));assert.ok(top.psychicLinks.some(x=>x.uid===part.uid));assert.ok(has(s,1,'grave',source));
});

test('all cells of a five-civilization linked Psychic retain their dark civilization and stay linked',()=>{
 const s=field();s.format='advance';const top=add(s,1,'dmr04-v03'),left=inst('dmr04-v02'),right=inst('dmr04-051');left.psychicCell=true;right.psychicCell=true;top.psychicLinks=[left,right];
 spawn(s);finish(s);assert.ok(has(s,1,'battle',top));assert.deepEqual(top.psychicLinks.map(x=>x.uid),[left.uid,right.uid]);
});
test('sources under a linked God are swept independently of both the root orientation and the attached card',()=>{
 for(const root of['dark','fire']){
  const s=field(),dark=inst(HEAVY),fire=inst(METAL),darkBase=inst(DARK),first=inst(FIRE),second=inst(FIRE);
  dark.under=[darkBase,first];fire.under=[second];const top=root==='dark'?dark:fire;top.godLinks=[root==='dark'?fire:dark];s.players[1].battle.push(top);
  const before=physical(s);spawn(s);finish(s,(game,as)=>game.decision?.type==='godLeave'?as.find(a=>a.uid===fire.uid):null);
  assert.ok(has(s,1,'battle',dark));assert.deepEqual(dark.under.map(x=>x.uid),[darkBase.uid]);assert.ok([fire,first,second].every(x=>has(s,1,'grave',x)));
  assert.deepEqual(physical(s).filter(uid=>before.includes(uid)),before);
 }
});
test('the official New World field and all its physical sources reach the grave without duplicate card instances',()=>{
 const s=field(),spell=inst('dm01-044'),dark=inst(DARK),top=add(s,1,'dmrp08-005',{under:[spell,dark]});const before=physical(s);spawn(s);finish(s);
 assert.ok([top,spell,dark].every(x=>has(s,1,'grave',x)));assert.deepEqual(physical(s).filter(uid=>before.includes(uid)),before);
});

test('Star evolution replacement leaves a non-dark base even when both physical cards were swept (QA39561)',()=>{
 const s=field(),base=inst(FIRE),top=add(s,1,STAR,{under:[base]});spawn(s);finish(s);
 assert.ok(has(s,1,'grave',top));assert.ok(has(s,1,'battle',base));
});
test('EX Life replaces the destruction of its creature and all simultaneously hit sources (QA40612)',()=>{
 const s=field(),base=inst(FIRE),top=add(s,1,'dmrp18-025',{under:[base],exLifeShieldUid:s.players[1].shields[0].uid});
 spawn(s);finish(s);assert.ok(has(s,1,'battle',top));assert.ok(top.under.some(x=>x.uid===base.uid));assert.ok(!has(s,1,'grave',base));
});
for(const id of['dmbd17-007','dm24bd4-007','dm24ex2-066'])test('buried twinpact can be referenced through either appropriate face '+id,()=>{
 const s=field(),base=inst(id),top=add(s,1,DARK_EVOLUTION,{under:[base]}),exposed=add(s,1,id);spawn(s);finish(s);
 const nonDark=e.playFaces(e.card(id)).some(c=>!e.civilizations(c).includes('闇'));
 assert.equal(has(s,1,'grave',base),nonDark);assert.equal(top.under.some(x=>x.uid===base.uid),!nonDark);
 assert.equal(has(s,1,'battle',exposed),e.civilizations(e.card(id)).includes('闇'));
});

for(const id of ['dmrp02-036','dm06-s04'])test('a destroy-to-hand replacement moves the entire evolution stack together '+id,()=>{
 const s=field(),base=inst('dm01-079'),top=add(s,1,id,{under:[base]});spawn(s);finish(s);
 assert.ok(has(s,1,'hand',top)&&has(s,1,'hand',base));assert.ok(!has(s,1,'battle',base));assert.ok(!has(s,1,'grave',base));
});

test('a queued sweep snapshots a civilisation-changing field before any physical cards leave',()=>{
 const s=field(),source=inst(DARK),top=add(s,1,DARK_EVOLUTION,{under:[source]}),joe=inst('dmex12-022');
 const spawned=add(s,0,SPAWN,{under:[inst(BASE)]});
 s.active=1;s.players[1].hand.push(joe);act(s,'play',a=>a.uid===joe.uid);finish(s);
 s.active=0;s.phase='main';
 s.extTasks=[{op:'g34_Sweep',p:0,source:SPAWN,uid:spawned.uid,both:true,to:'grave',filter:{element:true,notColor:'闇'}}];
 act(s,'toAttack');finish(s);assert.ok([top,source,joe].every(x=>has(s,1,'grave',x)));assert.ok(has(s,0,'grave',spawned));
});
