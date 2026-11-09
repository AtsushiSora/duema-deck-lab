import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,cast,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-759.json',import.meta.url)));
const SHUKRAN='dmrp05-061',GREEN='dmrp04s-062',RAIBA='dmrp02-061',EDGE='dmr01-s02';
const CREATURE='dm01-108',BLOCKER='dm01-001';
function put(s,p,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
}
const choices=s=>s.decision.choices.map(o=>o.value);
const pick=(s,uid)=>act(s,'extended',a=>{
 const value=s.decision.choices[a.choice].value;
 return uid===null?value===null:value?.uid===uid;
});
const battleCard=(s,p,uid)=>s.players[p].battle.find(x=>x.uid===uid);

test('four complete definitions keep their existing catalogue IDs and verified images',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:759}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:759}));
  assert.deepEqual(registry.cards.filter(c=>key(c.name)===key(row.name)).map(c=>c.id),[row.id]);
  assert.ok(row.verification.facesMatched);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  for(const [field,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[field],value);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:row.id,count:1});
  assert.deepEqual(registry.resolveRows(deck.cards),deck.cards);
  assert.deepEqual(e.validateDeck(deck),[]);
 }
});

test('Shukran requires more creatures and can tap a blocker before it can block',()=>{
 for(const allyCount of [0,1,2]){
  const s=setup(),source=put(s,0,SHUKRAN);
  for(let i=0;i<allyCount;i++)put(s,0,CREATURE);
  const blocker=put(s,1,BLOCKER),other=put(s,1,CREATURE);
  attack(s,source.uid);
  if(allyCount===2){
   assert.deepEqual(choices(s).map(v=>v.uid),[blocker.uid,other.uid]);
   pick(s,blocker.uid);
   assert.ok(blocker.tapped&&!other.tapped);
   assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'));
  }else{
   assert.equal(s.decision.type,'block');
   assert.ok(!blocker.tapped);
  }
 }
});

test('Green declares its attack target first and can tap either side or decline',()=>{
 for(const side of [0,1,null]){
  const s=setup(),source=put(s,0,GREEN),ally=put(s,0,CREATURE);
  const blocker=put(s,1,BLOCKER),target=put(s,1,CREATURE,{tapped:true});
  attack(s,source.uid,target.uid);
  assert.equal(s.attack.target,target.uid);
  const candidates=choices(s);
  assert.ok(candidates.some(x=>x?.uid===ally.uid)&&candidates.some(x=>x?.uid===blocker.uid));
  assert.ok(candidates.includes(null));
  pick(s,side===0?ally.uid:side===1?blocker.uid:null);
  assert.equal(ally.tapped,side===0);
  assert.equal(blocker.tapped,side===1);
 }
});

test('Raiba accepts zero, one or two distinct targets across both sides and restores an in-progress choice',()=>{
 for(const count of [0,1,2]){
  let s=setup();
  const ally=put(s,0,CREATURE),enemy=put(s,1,CREATURE);
  cast(s,RAIBA);
  assert.equal(s.decision.player,0);
  if(count){
   pick(s,enemy.uid);
   assert.ok(!enemy.tapped);
   assert.ok(!choices(s).some(x=>x?.uid===enemy.uid));
   s=JSON.parse(JSON.stringify(s));
  }
  if(count===2)pick(s,ally.uid);
  else pick(s,null);
  assert.equal(battleCard(s,1,enemy.uid).tapped,count>0);
  assert.equal(battleCard(s,0,ally.uid).tapped,count===2);
 }
});

test('Raiba can actually be summoned as a shield trigger and tap the attacker’s ally',()=>{
 const s=setup(),attacker=put(s,0,CREATURE),ally=put(s,0,CREATURE);
 give(s,1,'shields',[RAIBA]);
 attack(s,attacker.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 act(s,'useTrigger');
 assert.equal(s.decision.player,1);
 pick(s,ally.uid);
 pick(s,null);
 assert.ok(ally.tapped);
 assert.ok(s.players[1].battle.some(x=>x.cardId===RAIBA));
});

test('Edge makes the attacking player choose their own untapped creature after declaration',()=>{
 const s=setup(),edge=put(s,1,EDGE),attacker=put(s,0,CREATURE);
 const first=put(s,0,CREATURE),second=put(s,0,CREATURE);
 put(s,0,CREATURE,{tapped:true});
 const blocker=put(s,1,BLOCKER);
 attack(s,attacker.uid);
 assert.equal(s.decision.player,0);
 assert.ok(attacker.tapped);
 assert.deepEqual(choices(s).map(v=>v.uid),[first.uid,second.uid]);
 pick(s,second.uid);
 assert.ok(second.tapped&&!first.tapped&&!edge.tapped);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===blocker.uid));
});

test('Edge lets an opposing attack continue with no eligible tap target and breaks two on its own attack',()=>{
 const s=setup(),attacker=put(s,0,CREATURE),edge=put(s,1,EDGE);
 attack(s,attacker.uid);
 drain(s);
 assert.equal(s.players[1].shields.length,4);
 const shields=s.players[0].shields.length;
 s.active=1;
 attack(s,edge.uid);
 drain(s);
 assert.equal(s.players[0].shields.length,shields-2);
});
