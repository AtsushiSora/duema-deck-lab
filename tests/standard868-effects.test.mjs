import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,cast} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const MISSILE='dmr04-027',DRIVE='dmr04-033',EMERGENCY='dmr04-030';
const BELLA='dmr04-046',GEAR='dm23ex1-024',JULIANA='dm11-007';
const LIGHT='dm01-075',WATER='dm01-083',DARK='dm01-090',FIRE='dm01-097',NATURE='dm01-108';
const spells=[MISSILE,DRIVE,EMERGENCY];

function field(){
 const s=setup();
 for(const p of [0,1]){
  give(s,p,'deck',Array(12).fill(NATURE));
  give(s,p,'grave',[]);
 }
 return s;
}
function add(s,p,zone,id,props){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===(value?.uid??value));
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const ids=xs=>xs.map(x=>x.uid);
const restore=s=>JSON.parse(JSON.stringify(s));

test('Phase 868 registers three complete official spells without changing their IDs',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-868.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),spells);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(d.faces,row.faces);
  assert.deepEqual(standardCardSpec(d,{phase:868}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:867}));
  const unknown=structuredClone(d);
  unknown.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:868}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.civilizations,c.manaValue,c.limit],['spell',f.cost,f.civilizations,1,4]);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);
  assert.deepEqual(registry.resolveRows([{id:row.id,count:4}]),[{id:row.id,count:4}]);
 }
});

test('Each spell enters mana tapped and requires an allied multicolor creature for the third choice',()=>{
 for(const id of spells){
  for(const qualifies of [false,true]){
   const s=field();
   add(s,0,'battle',GEAR);
   add(s,0,'battle',WATER,{under:[inst(BELLA)]});
   add(s,1,'battle',BELLA);
   add(s,0,'mana',BELLA);
   if(qualifies)add(s,0,'battle',BELLA);
   cast(s,id);
   assert.equal(s.decision.player,0);
   assert.deepEqual(values(s),qualifies?[0,1,2]:[0,1]);
  }
  const s=field(),copy=add(s,0,'hand',id);
  s.phase='charge';
  act(s,'charge',a=>a.uid===copy.uid);
  assert.ok(copy.tapped&&has(s,0,'mana',copy));
 }
});

test('Missile can choose bounce alone even when both modes are available (QA 36530)',()=>{
 const s=field(),bounced=add(s,1,'battle',FIRE),other=add(s,1,'battle',WATER);
 const protectedCreature=add(s,1,'battle',JULIANA);
 add(s,0,'battle',BELLA);
 cast(s,MISSILE);
 pick(s,1);
 assert.deepEqual(values(s),ids([bounced,other]));
 pick(s,bounced);
 assert.ok(has(s,1,'hand',bounced)&&has(s,1,'battle',other)&&has(s,1,'battle',protectedCreature));
 assert.equal(other.tapped,false);
});

test('Missile resolves tap before bounce and can choose the same target twice (QA 37527)',()=>{
 for(const sameTarget of [false,true]){
  let s=field();
  add(s,0,'battle',BELLA);
  const tapped=add(s,1,'battle',LIGHT),other=add(s,1,'battle',WATER);
  cast(s,MISSILE);
  pick(s,2);
  s=restore(s);
  pick(s,tapped);
  assert.equal(s.players[1].battle.find(x=>x.uid===tapped.uid).tapped,true);
  assert.deepEqual(values(s),ids([tapped,other]));
  pick(s,sameTarget?tapped:other);
  assert.ok(has(s,1,'hand',sameTarget?tapped:other));
  assert.ok(has(s,1,'battle',sameTarget?other:tapped));
 }
});

test('Drive recovers a creature before destroying an enemy at the inclusive current-power threshold',()=>{
 const s=field();
 add(s,0,'battle',BELLA);
 const spell=add(s,0,'grave',MISSILE),recovered=add(s,0,'grave',WATER);
 const foe=(power,id=FIRE)=>add(s,1,'battle',id,{powerModifiers:[{amount:power-e.card(id).power,expires:'end',who:0}]});
 const valid=foe(4000),above=foe(4001),immune=foe(3000,JULIANA);
 cast(s,DRIVE);
 pick(s,2);
 assert.deepEqual(values(s),[recovered.uid]);
 assert.ok(has(s,1,'battle',valid));
 pick(s,recovered);
 assert.ok(has(s,0,'hand',recovered)&&has(s,0,'grave',spell));
 assert.deepEqual(values(s),[valid.uid]);
 pick(s,valid);
 assert.ok(has(s,1,'grave',valid)&&has(s,1,'battle',above)&&has(s,1,'battle',immune));
});

test('Drive still resolves the chosen destruction when there is no creature to recover',()=>{
 const s=field();
 add(s,0,'battle',BELLA);
 const victim=add(s,1,'battle',DARK);
 cast(s,DRIVE);
 pick(s,2);
 assert.deepEqual(values(s),[victim.uid]);
 pick(s,victim);
 assert.ok(has(s,1,'grave',victim));
});

test('Emergency allows zero to two draws and requires one discard even when zero were drawn',()=>{
 for(const count of [0,1,2]){
  const s=field(),paid=add(s,0,'hand',FIRE),opponentDeck=ids(s.players[1].deck);
  cast(s,EMERGENCY);
  pick(s,0);
  for(let n=0;n<count;n++)pick(s,true);
  if(count<2)pick(s,null);
  assert.equal(s.decision.player,0);
  assert.equal(s.players[0].hand.length,1+count);
  pick(s,paid);
  assert.equal(s.players[0].hand.length,count);
  assert.ok(has(s,0,'grave',paid));
  assert.deepEqual(ids(s.players[1].deck),opponentDeck);
 }
});

test('Emergency completes the caster’s mode before the opponent draws and selects their own discards',()=>{
 let s=field();
 add(s,0,'battle',BELLA);
 const paid=add(s,0,'hand',FIRE),keep=add(s,1,'hand',DARK),discard=add(s,1,'hand',LIGHT);
 const drawn=s.players[1].deck[0];
 cast(s,EMERGENCY);
 pick(s,2);
 pick(s,true);
 pick(s,null);
 assert.equal(s.decision.player,0);
 assert.ok(!has(s,1,'hand',drawn));
 pick(s,paid);
 assert.equal(s.decision.player,1);
 assert.ok(has(s,1,'hand',drawn));
 s=restore(s);
 pick(s,drawn);
 assert.ok(has(s,1,'hand',drawn));
 pick(s,discard);
 assert.deepEqual(ids(s.players[1].hand),[keep.uid]);
 assert.ok(has(s,1,'grave',drawn)&&has(s,1,'grave',discard));
});

test('Emergency can choose only the opponent mode and discards the one available card after drawing',()=>{
 const s=field(),paid=add(s,0,'hand',FIRE),drawn=s.players[1].deck[0];
 add(s,0,'battle',BELLA);
 cast(s,EMERGENCY);
 pick(s,1);
 assert.equal(s.decision.player,1);
 assert.deepEqual(values(s),[drawn.uid]);
 pick(s,drawn);
 assert.equal(s.decision,null);
 assert.ok(has(s,0,'hand',paid)&&has(s,1,'grave',drawn));
});
