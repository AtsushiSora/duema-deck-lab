import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const GUGLIELMO='dm30-040',EKATERINA='dm35-001',BELLADOMAI='dmex10-027';
const LAND='dm01-108',FIRE='dm01-097',SPELL='dm01-027',TWIN='dmrp12-s01';
const NASUO='dmex01-018',NINGYO='dmrp22-033';
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const legal=(s,kind)=>e.getLegalActions(s).filter(a=>a.kind===kind);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
function task(op,p,more={}){
 return {op,p,source:SPELL,...more};
}
function run(s,...tasks){
 s.phase='main';
 s.extTasks=tasks;
 act(s,'toAttack');
}
function destroy(s,p,x,to='grave'){
 run(s,task('g34_ExactMove',1-p,{owner:p,target:x.uid,to}));
}
function sweep(p){
 return task('g34_Sweep',p,{owner:'self',to:'grave',filter:{creature:true}});
}

test('Phase 846 verifies three original printings with no new same-name identities',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-846.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[GUGLIELMO,EKATERINA,BELLADOMAI]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(row.faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:846}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:845}));
  const unknown=structuredClone(d);
  unknown.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:846}));
  assert.deepEqual([c.name,c.cost,c.power,c.race,c.civilizations,c.limit],[f.name,f.cost,Number(f.powerText),f.race,f.civilizations,4]);
  assert.ok(registry.get(row.id).supported);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(m.regulationVerification.limits[row.id],4);
 }
});

for(const discardId of [SPELL,TWIN])test('Guglielmo can keep itself by discarding one spell '+discardId,()=>{
 let s=setup();
 const x=put(s,0,'hand',GUGLIELMO),creature=put(s,0,'hand',FIRE),cost=put(s,0,'hand',discardId);
 act(s,'play',a=>a.uid===x.uid);
 const before=physical(s);
 destroy(s,0,x);
 assert.equal(s.decision.mandatory,false);
 act(s,'replaceJashin');
 assert.deepEqual(legal(s,'leaveHand').map(a=>a.uid),[cost.uid]);
 s=structuredClone(s);
 act(s,'leaveHand',a=>a.uid===cost.uid);
 assert.ok(has(s,0,'battle',x)&&has(s,0,'grave',cost)&&has(s,0,'hand',creature));
 assert.deepEqual(physical(s),before);
});

test('Guglielmo can decline, cannot discard a creature, and does not protect against a non-destruction move',()=>{
 for(const [to,payment] of [['grave',SPELL],['grave',FIRE],['hand',SPELL]]){
  const s=setup(),x=put(s,0,'battle',GUGLIELMO),cost=put(s,0,'hand',payment);
  destroy(s,0,x,to);
  if(to==='grave'&&payment===SPELL)act(s,'allowLeave');
  assert.equal(s.decision,null);
  assert.ok(has(s,0,to,x)&&has(s,0,'hand',cost));
 }
});

test('A single spell cannot pay for two Guglielmo replacements in a simultaneous destruction',()=>{
 const s=setup(),first=put(s,0,'battle',GUGLIELMO),second=put(s,0,'battle',GUGLIELMO),cost=put(s,0,'hand',SPELL);
 const before=physical(s);
 run(s,sweep(0));
 act(s,'replaceJashin');
 act(s,'leaveHand',a=>a.uid===cost.uid);
 assert.equal(s.decision,null);
 assert.ok(has(s,0,'battle',first)&&has(s,0,'grave',second)&&has(s,0,'grave',cost));
 assert.deepEqual(physical(s),before);
});

test('Cancelling the spell selection preserves a competing mandatory replacement',()=>{
 let s=setup();
 const x=put(s,0,'battle',GUGLIELMO),cost=put(s,0,'hand',SPELL);
 put(s,0,'battle','dmrp13-052');
 destroy(s,0,x);
 assert.equal(s.decision.mandatory,true);
 act(s,'replaceJashin');
 s=structuredClone(s);
 act(s,'cancelLeaveHand');
 assert.equal(s.decision.mandatory,true);
 assert.equal(legal(s,'allowLeave').length,0);
 act(s,'replaceYamata',a=>a.tapped);
 assert.ok(has(s,0,'mana',x)&&has(s,0,'hand',cost));
});

test('Ekaterina can block and choose the top of its deck when destroyed in that battle',()=>{
 const s=setup(),x=put(s,0,'battle',EKATERINA),attacker=put(s,1,'battle','dm01-008');
 s.active=1;
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===x.uid);
 assert.equal(s.decision?.type,'leaveReplace');
 assert.equal(s.decision.player,0);
 act(s,'replaceDeckTop846');
 drain(s);
 assert.equal(s.players[0].deck[0].uid,x.uid);
 assert.equal(s.players[0].shields.length,5);
 assert.ok(!has(s,0,'grave',x));
});

test('Ekaterina can decline and its replacement does not apply to bounce',()=>{
 for(const to of ['grave','hand']){
  const s=setup(),x=put(s,0,'battle',EKATERINA),first=s.players[0].deck[0];
  destroy(s,0,x,to);
  if(to==='grave')act(s,'allowLeave');
  assert.equal(s.decision,null);
  assert.ok(has(s,0,to,x));
  assert.equal(s.players[0].deck[0],first);
 }
});

for(const pickIndex of [0,1])test('Ekaterina chooses the simultaneous top order before a following draw '+pickIndex,()=>{
 let s=setup();
 const cards=[put(s,0,'battle',EKATERINA),put(s,0,'battle',EKATERINA)],first=s.players[0].deck[0],before=physical(s);
 run(s,sweep(0),task('g34_Draw',0,{n:1}));
 act(s,'replaceDeckTop846');
 act(s,'replaceDeckTop846');
 assert.equal(s.decision?.task?.op,'g78_TopOrder');
 assert.deepEqual(values(s),cards.map(x=>x.uid));
 s=structuredClone(s);
 pick(s,cards[pickIndex].uid);
 assert.ok(has(s,0,'hand',cards[pickIndex]));
 assert.deepEqual(s.players[0].deck.slice(0,2).map(x=>x.uid),[cards[1-pickIndex].uid,first.uid]);
 assert.deepEqual(physical(s),before);
});

test('Ekaterina can order the entire returned stack without revealing a face-down source',()=>{
 const s=setup(),x=put(s,0,'battle',EKATERINA),base={...inst(FIRE),faceDown:true},first=s.players[0].deck[0];
 x.under=[base];
 destroy(s,0,x);
 act(s,'replaceDeckTop846');
 assert.equal(s.decision.task.op,'g78_TopOrder');
 const hidden=s.decision.choices.find(c=>c.value===base.uid);
 assert.match(hidden.label,/裏向き/);
 assert.equal(hidden.cardId,undefined);
 pick(s,base.uid);
 assert.deepEqual(s.players[0].deck.slice(0,3).map(c=>c.uid),[base.uid,x.uid,first.uid]);
});

test('A simultaneous shuffle includes the cards returned to the top by Ekaterina',()=>{
 const runBatch=shuffleFirst=>{
  const s=setup(),x=inst(EKATERINA),y=inst(EKATERINA),shuffle=inst('dm10-002');
  give(s,0,'deck',Array(10).fill(LAND));
  s.players[0].battle=shuffleFirst?[shuffle,x,y]:[x,y,shuffle];
  const before=physical(s);
  run(s,sweep(0));
  act(s,'replaceDeckTop846');
  act(s,'replaceDeckTop846');
  assert.equal(s.decision,null);
  assert.ok([x,y,shuffle].every(card=>has(s,0,'deck',card)));
  assert.deepEqual(physical(s),before);
  return s.players[0].deck.map(card=>card.cardId);
 };
 assert.deepEqual(runBatch(true),runBatch(false));
});

for(const accept of [false,true])test('Belladomai sees a normal mana charge and offers optional milling '+accept,()=>{
 const s=setup(),x=put(s,0,'battle',BELLADOMAI),charge=put(s,0,'hand',LAND),first=s.players[0].deck[0];
 s.phase='charge';
 act(s,'charge',a=>a.uid===charge.uid);
 assert.equal(s.decision.task.source,x.cardId);
 assert.equal(s.decision.task.op,'g34_Mill');
 pick(s,accept?true:null);
 assert.ok(has(s,0,'mana',charge));
 assert.equal(has(s,0,'grave',first),accept);
 if(!accept)assert.equal(s.players[0].deck[0],first);
});

test('Belladomai triggers separately for every one of the four mana entries from Nasuo (QA33469)',()=>{
 let s=setup();
 put(s,0,'battle',BELLADOMAI);
 const x=put(s,0,'hand',NASUO);
 give(s,0,'deck',Array(9).fill(LAND));
 const before=physical(s);
 const top=s.players[0].deck.slice(0,6);
 act(s,'play',a=>a.uid===x.uid);
 assert.ok(top.slice(0,4).every(y=>has(s,0,'mana',y)&&y.tapped));
 for(let i=0;i<4;i++)pick(s,s.players[0].mana.find(y=>!top.includes(y)&&!s.decision.task.selected?.includes(y.uid)).uid);
 assert.equal(s.decision.type,'effectOrder');
 assert.equal(s.pendingEffects.filter(q=>q.source===BELLADOMAI).length,4);
 s=structuredClone(s);
 for(const accept of [false,true,false,true]){
  if(s.decision.type==='effectOrder')act(s,'orderEffect',a=>a.cardId===BELLADOMAI);
  pick(s,accept?true:null);
 }
 assert.equal(s.decision,null);
 assert.ok(top.slice(4).every(y=>has(s,0,'grave',y)));
 assert.deepEqual(physical(s),before);
});

test('Belladomai ignores enemy mana, silenced abilities, and ramp redirected to the grave',()=>{
 for(const variant of ['enemy','ignored','redirect']){
  const s=setup(),x=put(s,0,'battle',BELLADOMAI);
  const p=variant==='enemy'?1:0;
  if(variant==='ignored')x.g35Ignored=s.turn;
  if(variant==='redirect')put(s,1,'battle',NINGYO);
  const first=s.players[p].deck[0];
  run(s,task('g34_Ramp',p,{n:1}));
  assert.equal(s.decision,null);
  assert.ok(has(s,p,variant==='redirect'?'grave':'mana',first));
 }
});

test('Belladomai keeps a pending mana trigger after it leaves the battle zone',()=>{
 const s=setup(),x=put(s,0,'battle',BELLADOMAI),milled=s.players[0].deck[1];
 run(s,task('g34_Ramp',0,{n:1}),task('g34_ExactMove',1,{owner:0,target:x.uid,to:'grave'}));
 assert.ok(has(s,0,'grave',x));
 assert.equal(s.decision.task.source,BELLADOMAI);
 pick(s,true);
 assert.ok(has(s,0,'grave',milled));
});
