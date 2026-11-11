import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const LAST='dmr18-016',GATE='dmr19-013',LEAF='dmr20-028';
const NATURE='dm01-108',WATER='dm01-083',FIRE='dm01-097',LIGHT='dm01-001',HAND='dm01-027';
const INVADER='dmr20-002',EVOLUTION='dmex17-105',CASTLE='dm26rp1-062',QX='dmrp07-m01';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
const value=c=>c.value?.uid??c.value;
const choices=s=>s.decision?.choices?.map(value)??[];
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();

function field(active=0){
 const s=Object.assign(setup(),{active});
 for(const p of [0,1]){give(s,p,'deck',Array(20).fill(NATURE));give(s,p,'grave',[]);}
 return s;
}
function put(s,p,z,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][z].push(x);
 return x;
}
function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}
function finishAttack(s){
 if(s.decision?.type==='block')act(s,'noBlock');
 drain(s);
}
function pass(s){
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
}

test('Phase 1018 pins all three complete single-print official definitions',()=>{
 const m=read('tools/support-phase-1018.json'),refs=read('tools/image-reference-prints.json').prints;
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[LAST,GATE,LEAF]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const {id,name,faces}=row,[f]=faces,d=details.cards.find(x=>x.id===id),c=e.card(id);
  assert.deepEqual(faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:1018}),row.spec);
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'未知の能力。'}]},{phase:1018}));
  for(const [key,v] of Object.entries(row.spec))assert.deepEqual(c[key],v);
  assert.deepEqual([c.name,c.type,c.cost,c.race,e.civilizations(c),c.manaValue,c.limit],
   [name,id===GATE?'spell':'creature',f.cost,f.race,f.civilizations,1,4]);
  if(id!==GATE)assert.equal(c.power,Number(f.powerText));
  assert.equal(c.supportBatch,'phase-1018');
  assert.equal(CARD_IMAGES[id],row.image);
  assert.ok(registry.get(id).supported&&row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[id],4);
  assert.deepEqual(refs.filter(x=>x.id===id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  for(const source of [data,details,snapshot])
   assert.deepEqual(source.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
 }
});

for(const owner of [0,1])
 test('Last draws first and replaces only the chosen shield owner at turn end '+owner,()=>{
  let s=field();
  const drawn=s.players[0].deck[0],root=s.players[owner].shields[0];
  const x=play(s,LAST),all=physical(s);
  assert.ok(has(s,0,'hand',drawn));
  assert.ok(s.decision.choices.every(c=>c.cardId===undefined));
  s=JSON.parse(JSON.stringify(s));
  pick(s,root.uid);
  assert.ok(has(s,owner,'deck',root));
  assert.equal(s.players[owner].shields.length,4);
  assert.equal(s.players[1-owner].shields.length,5);
  assert.equal(s.metrics[0].breaks,0);
  assert.ok(has(s,0,'battle',x));
  const newTop=s.players[owner].deck[0];
  pass(s);
  assert.equal(s.players[owner].shields.length,5);
  assert.ok(has(s,owner,'shields',newTop));
  assert.ok(!s.players[owner].shields.at(-1).faceUp);
  assert.deepEqual(physical(s),all);
 });

test('Last shuffles both cards of a stacked shield and puts its castle in the grave (QA 37278)',()=>{
 const s=field();
 const root=s.players[1].shields[0],under=inst(WATER),castle={...inst(CASTLE),faceUp:true};
 root.shieldStack=[under,castle];
 play(s,LAST);
 const all=physical(s);
 pick(s,root.uid);
 assert.ok(has(s,1,'deck',root)&&has(s,1,'deck',under)&&has(s,1,'grave',castle));
 assert.equal(s.players[1].shields.length,4);
 assert.deepEqual(physical(s),all);
});

test('Last still schedules the shield when the source is gone and permits a direct attack before the delay',()=>{
 const s=field(),attacker=put(s,0,'battle',FIRE);
 give(s,1,'shields',[NATURE]);
 const root=s.players[1].shields[0],x=play(s,LAST);
 pick(s,root.uid);
 const remaining=structuredClone(s);
 attack(s,attacker.uid);
 finishAttack(s);
 assert.equal(s.winner,0);
 const spell=put(remaining,0,'hand','dm01-086');
 act(remaining,'play',a=>a.uid===spell.uid);
 act(remaining,'effect',a=>a.targets.some(t=>t.uid===x.uid));
 drain(remaining);
 assert.ok(has(remaining,0,'hand',x));
 pass(remaining);
 assert.equal(remaining.players[1].shields.length,1);
});

test('Last has only its draw when both shield zones are empty',()=>{
 const s=field();
 give(s,0,'shields',[]);give(s,1,'shields',[]);
 play(s,LAST);
 assert.equal(s.decision,null);
 assert.equal(s.players[0].hand.length,1);
 pass(s);
 assert.ok(s.players.every(p=>p.shields.length===0));
});

for(const [mode,id] of [['deploy',INVADER],['decline',INVADER],['wrong card',HAND],['missing evolution base',EVOLUTION],['evolve',EVOLUTION],['library locked',INVADER]])
 test('Ultimate Gate taps before shuffling and handles the inspected top card '+mode,()=>{
  let s=field();
  const target=put(s,1,'battle',FIRE);
  const base=mode==='evolve'?put(s,0,'battle',LIGHT):null;
  if(mode==='library locked')put(s,1,'battle',QX);
  give(s,0,'deck',Array(4).fill(id));
  const original=s.players[0].deck.map(x=>x.uid),x=play(s,GATE),all=physical(s);
  assert.equal(s.decision.task.op,'g34_Target');
  assert.ok(!target.tapped);
  pick(s,target.uid);
  assert.equal(target.tapped,true);
  if(['deploy','decline','evolve'].includes(mode)){
   assert.equal(s.decision.task.op,'g34_Select');
   const uid=choices(s).find(v=>v!==null);
   assert.ok(original.includes(uid));
   s=JSON.parse(JSON.stringify(s));
   pick(s,mode==='decline'?null:uid);
   if(base)pick(s,base.uid);
   drain(s);
   assert.equal(s.players[0].battle.some(y=>y.uid===uid),mode!=='decline');
   if(base)assert.equal(s.players[0].battle.find(y=>y.uid===uid).under[0].uid,base.uid);
  }else if(mode!=='library locked'){
   assert.deepEqual(choices(s),[null]);
   pick(s,null);
  }
  assert.equal(s.players[0].hand.length,['decline','wrong card','missing evolution base'].includes(mode)?1:0);
  assert.ok(has(s,0,'grave',x));
  assert.equal(s.log.some(l=>l.type==='look'&&l.cardId===GATE),mode!=='library locked');
  assert.deepEqual(physical(s),all);
 });

test('Ultimate Gate can use S-Trigger for free and the tap does not cancel an already declared attack',()=>{
 const s=field(1),attacker=put(s,1,'battle',FIRE),target=put(s,1,'battle',WATER);
 give(s,0,'shields',[GATE,NATURE]);
 give(s,0,'deck',Array(4).fill(HAND));
 give(s,0,'mana',[]);
 const spell=s.players[0].shields[0],all=physical(s);
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.uid===spell.uid);
 pick(s,target.uid);
 drain(s);
 assert.equal(target.tapped,true);
 assert.equal(s.metrics[1].breaks,1);
 assert.equal(s.players[0].hand.length,1);
 assert.ok(has(s,0,'grave',spell));
 assert.deepEqual(physical(s),all);
});

for(const mode of ['draw','decline','three shields'])
 test('Revolution Captain Leaf evolves on Water and optionally draws exactly three at Revolution 2 '+mode,()=>{
  const s=field(),base=put(s,0,'battle',WATER);
  put(s,0,'battle',FIRE);
  give(s,0,'shields',Array(mode==='three shields'?3:2).fill(NATURE));
  const x=play(s,LEAF),all=physical(s);
  assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[base.uid]);
  act(s,'evolve',a=>a.baseUid===base.uid);
  if(mode!=='three shields')pick(s,mode==='draw'?true:null);
  drain(s);
  assert.equal(s.players[0].hand.length,mode==='draw'?3:0);
  assert.equal(s.players[0].battle.find(y=>y.uid===x.uid).under[0].uid,base.uid);
  assert.deepEqual(physical(s),all);
 });

for(const mode of ['Water','no Water','sealed Water'])
 test('Leaf gains Shield Trigger only with an active Water evolution base '+mode,()=>{
  const s=field(1),attacker=put(s,1,'battle',FIRE);
  const base=put(s,0,'battle',mode==='no Water'?NATURE:WATER);
  if(mode==='sealed Water'){
   base.sealed=true;
   s.players[0].seals.push({...inst(FIRE),faceDown:true,sealOf:base.uid});
  }
  give(s,0,'shields',[LEAF,NATURE,NATURE]);
  give(s,0,'mana',[]);
  const [leaf]=s.players[0].shields,all=physical(s);
  attack(s,attacker.uid);
  act(s,'noBlock');
  if(mode==='Water'){
   act(s,'useTrigger',a=>a.uid===leaf.uid);
   act(s,'triggerEvolve',a=>a.baseUid===base.uid);
   pick(s,true);
  }else assert.notEqual(s.decision?.type,'trigger');
  drain(s);
  assert.equal(has(s,0,'battle',leaf),mode==='Water');
  assert.equal(has(s,0,'hand',leaf),mode!=='Water');
  assert.equal(s.players[0].hand.length,mode==='Water'?3:1);
  assert.deepEqual(physical(s),all);
 });

test('Leaf can block after its Shield Trigger evolution',()=>{
 const s=field(1),first=put(s,1,'battle',FIRE),second=put(s,1,'battle',FIRE),base=put(s,0,'battle',WATER);
 give(s,0,'shields',[LEAF,NATURE,NATURE]);
 const [leaf]=s.players[0].shields;
 attack(s,first.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.uid===leaf.uid);
 act(s,'triggerEvolve',a=>a.baseUid===base.uid);
 pick(s,null);
 drain(s);
 attack(s,second.uid);
 act(s,'block',a=>a.uid===leaf.uid);
 drain(s);
 assert.ok(has(s,1,'grave',second));
 assert.equal(s.players[0].shields.length,2);
});
