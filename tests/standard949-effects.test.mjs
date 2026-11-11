import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain,cast} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const PONY='dm30-018',URALUS='dm12-006',PUPPET='dm14-005',PUPPET_BASE='dm06-092';
const PLAIN='dm01-108',LIGHT='dm01-075',WATER='dm01-083',EVO='dm11-s01',SPELL='dm01-086',CASTLE='dm26rp1-023';
const LOST='dm02-029',FATHER='dmr02-005',LOOT='dm11-043',HALKAS='dm01-080',SHIELD_GO='dmr11-025';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const choices=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>choices(s)[a.choice]===(value?.uid??value));
const legal=(s,kind,pred=()=>true)=>e.getLegalActions(s).some(a=>a.kind===kind&&pred(a));
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);

function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1]){give(s,p,'deck',Array(18).fill(PLAIN));give(s,p,'grave',[]);}
 return s;
}

function put(s,p,z,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][z].push(x);
 return x;
}

test('Phase 949 verifies three complete names and resolves both reprints to the first-print IDs',()=>{
 const m=read('tools/support-phase-949.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[PONY,URALUS,PUPPET]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[['dmex08-011',URALUS],['dmc42-011',PUPPET]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,f=row.faces[0],c=e.card(id),canonical=m.cards.find(x=>x.id===id);
  const d={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(d,{phase:949}),canonical.spec);
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'不明な能力。'}]},{phase:949}));
  for(const [key,value] of Object.entries(canonical.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   ['creature',f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-949');
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
 }
});

for(const accept of [true,false])test('Pony lets the opponent choose a shield and one card without revealing it '+accept,()=>{
 let s=field();
 const spell=inst(SPELL),target=inst(HALKAS);
 spell.shieldStack=[target];
 s.players[0].shields[0]=spell;
 cast(s,PONY);
 assert.equal(s.decision.player,1);
 assert.ok(s.decision.choices.every(x=>!x.cardId));
 pick(s,spell);
 assert.equal(s.decision.player,1);
 assert.deepEqual(choices(s),[spell.uid,target.uid]);
 assert.ok(s.decision.choices.every(x=>!x.cardId));
 s=restore(s);pick(s,target);
 assert.equal(s.decision.player,0);
 assert.deepEqual(s.decision.task.g585Peek.map(x=>x.id),[HALKAS]);
 assert.ok(s.log.filter(x=>x.type==='look').every(x=>!x.text.includes(e.card(HALKAS).name)));
 assert.deepEqual(choices(s),[true,null]);
 s=restore(s);pick(s,accept?true:null);
 assert.equal(s.players[0].shields.length,5);
 assert.equal(s.players[0].shields[0].uid,spell.uid);
 assert.equal(has(s,0,'battle',target),accept);
 if(accept){
  assert.equal(s.decision.source,HALKAS);
  assert.equal(s.players[0].shields[0].shieldStack.length,0);
  act(s,'draw',a=>a.n===0);
 }else assert.equal(s.players[0].shields[0].shieldStack[0].uid,target.uid);
});

for(const cardId of [SPELL,EVO])test('Pony privately inspects a single ineligible shield card '+cardId,()=>{
 const s=field(),target=inst(cardId);
 s.players[0].shields[0]=target;
 cast(s,PONY);pick(s,target);
 assert.equal(s.decision.player,0);
 assert.deepEqual(s.decision.task.g585Peek.map(x=>x.id),[cardId]);
 assert.deepEqual(choices(s),[null]);
 pick(s,null);
 assert.ok(has(s,0,'shields',target));
 assert.ok(!has(s,0,'battle',target));
});

test('Pony respects face-up Shield Go and its own W-breaker works on an attack',()=>{
 const s=field(),target=inst(SHIELD_GO);
 target.faceUp=true;
 s.players[0].shields[0]=target;
 cast(s,PONY);pick(s,target);pick(s,true);
 assert.ok(has(s,0,'grave',target));
 assert.ok(!has(s,0,'battle',target));
 assert.equal(s.players[0].shields.length,4);
 const pony=s.players[0].battle.find(x=>x.cardId===PONY);
 pony.entered=0;
 attack(s,pony.uid);act(s,'noBlock');act(s,'breakShields',a=>a.shields.length===2);drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('Uralus counts itself, can pick either player’s shields and turns an entire selected group face up',()=>{
 let s=field();
 put(s,0,'battle',PLAIN);
 const own=inst(CASTLE),enemy=inst(PLAIN),under=inst(SPELL),untouched=s.players[1].shields[1];
 enemy.shieldStack=[under];
 s.players[0].shields[0]=own;
 s.players[1].shields[0]=enemy;
 const before=e.physicalCards(s).map(x=>x.uid).sort();
 cast(s,URALUS);
 assert.equal(s.decision.task.n,2);
 pick(s,enemy);
 assert.ok(!enemy.faceUp&&!under.faceUp&&!own.faceUp);
 assert.ok(!choices(s).includes(enemy.uid));
 assert.ok(choices(s).includes(null));
 s=restore(s);pick(s,own);
 const root=s.players[1].shields[0];
 assert.ok(root.faceUp&&root.shieldStack[0].faceUp&&s.players[0].shields[0].faceUp);
 assert.ok(!s.players[1].shields.find(x=>x.uid===untouched.uid).faceUp);
 assert.equal(s.players[0].hand.length,0);
 assert.equal(s.decision,null);
 const newCard=s.players[0].battle.find(x=>x.cardId===URALUS);
 assert.deepEqual(e.physicalCards(s).map(x=>x.uid).filter(uid=>uid!==newCard.uid).sort(),before);
 assert.equal(s.log.filter(x=>x.type==='reveal').length,3);
});

test('Uralus may finish before its maximum selection',()=>{
 const s=field(),only=s.players[1].shields[0];
 put(s,0,'battle',PLAIN);
 cast(s,URALUS);pick(s,only);pick(s,null);
 assert.ok(only.faceUp);
 assert.equal(s.players.flatMap(p=>p.shields).filter(x=>x.faceUp).length,1);
});

test('Uralus may decline and caps the selection at the shields that exist',()=>{
 for(const accept of [true,false]){
  const s=field(),one=inst(PLAIN);
  s.players[0].shields=[];s.players[1].shields=[one];
  put(s,0,'battle',PLAIN);put(s,0,'battle',LIGHT);
  cast(s,URALUS);
  assert.equal(s.decision.task.n,1);
  pick(s,accept?one:null);
  assert.equal(!!one.faceUp,accept);
  assert.equal(s.decision,null);
 }
});

for(const accept of [true,false])test('Puppet evolves on a friendly Death Puppet and draws exactly the discarded batch size '+accept,()=>{
 let s=field(),puppet=put(s,0,'hand',PUPPET),other=put(s,0,'battle',PLAIN);
 put(s,1,'battle',PUPPET_BASE);
 assert.ok(!legal(s,'play',a=>a.uid===puppet.uid));
 const base=put(s,0,'battle',PUPPET_BASE);
 act(s,'play',a=>a.uid===puppet.uid);
 assert.ok(!legal(s,'evolve',a=>a.baseUid===other.uid));
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.equal(puppet.under[0].uid,base.uid);
 give(s,1,'hand',[PLAIN,LIGHT,WATER]);
 cast(s,LOST);
 assert.equal(s.players[1].hand.length,0);
 assert.equal(s.players[1].grave.length,3);
 assert.equal(s.decision.source,PUPPET);
 assert.deepEqual(choices(s),[true,null]);
 assert.equal(s.decision.task.defs[0].n,3);
 s=restore(s);pick(s,accept?true:null);
 assert.equal(s.players[0].hand.length,accept?3:0);
});

test('Puppet only counts actual discards when a hand card moves to mana instead',()=>{
 const s=field(),father=put(s,1,'hand',FATHER),other=put(s,1,'hand',PLAIN);
 put(s,0,'battle',PUPPET,{under:[inst(PUPPET_BASE)]});
 cast(s,LOST);
 assert.equal(s.decision.player,1);
 pick(s,true);
 assert.ok(has(s,1,'mana',father)&&has(s,1,'grave',other));
 assert.equal(s.decision.source,PUPPET);
 assert.equal(s.decision.task.defs[0].n,1);
 pick(s,true);
 assert.equal(s.players[0].hand.length,1);
});

test('Puppet watches the opponent’s self-discard and does not watch its own controller’s discard',()=>{
 for(const active of [0,1]){
  const s=field(active),toDiscard=put(s,active,'hand',LIGHT);
  put(s,0,'battle',PUPPET,{under:[inst(PUPPET_BASE)]});
  cast(s,LOOT);pick(s,0);pick(s,toDiscard);
  assert.ok(has(s,active,'grave',toDiscard));
  if(active===1){
   assert.equal(s.decision.source,PUPPET);
   assert.equal(s.decision.player,0);
   pick(s,true);
   assert.equal(s.players[0].hand.length,1);
  }else assert.equal(s.decision,null);
 }
});
