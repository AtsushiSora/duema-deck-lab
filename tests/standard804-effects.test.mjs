import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-804.json',import.meta.url)));
const VICE="dm24-051",SOL="dm24-042",OCTO="dm24-046";
const FIRE="dm01-097",NATURE="dm01-108",WATER="dm01-083";
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 804 definitions preserve their canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:804}));
  assert.throws(()=>standardCardSpec(detail,{phase:803}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:804}));
  assert.deepEqual(registry.cards.filter(c=>canonicalCardName(c.name)===canonicalCardName(row.name)).map(c=>c.id),[row.id]);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[key],value);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:row.id,count:1});
  deck.cards=registry.resolveRows(deck.cards);
  assert.equal(deck.cards.at(-1).id,row.id);
  assert.deepEqual(e.validateDeck(deck),[]);
 }
});

const task=(s,op)=>assert.equal(s.decision?.task?.op,op,JSON.stringify(s.decision));
const use=(s,x)=>{s.phase='attack';act(s,'tapAbility',a=>a.uid===x.uid);};

function pay(s,x,mana){
 use(s,x);
 for(const [i,card] of mana.entries()){
  task(s,'g34_TapAbilityMana804');
  assert.ok(!x.tapped&&mana.every(y=>!y.tapped));
  assert.equal(s.decision.task.selected?.length??0,i);
  pick(s,card.uid);
 }
 assert.ok(x.tapped&&mana.every(y=>y.tapped));
 assert.ok(!s.attack);
 assert.equal(s.log.filter(row=>row.type==='attack').length,0);
}

for(const id of [VICE,SOL,OCTO]){
 test(e.card(id).name+' requires an available attack and eight untapped mana cards',()=>{
  const s=setup(),x=put(s,0,'battle',id);
  give(s,0,'mana',Array(9).fill(NATURE));
  s.phase='attack';
  const available=()=>e.getLegalActions(s).some(a=>a.kind==='tapAbility'&&a.uid===x.uid);
  const [first,second]=s.players[0].mana;
  first.tapped=second.tapped=true;
  assert.ok(!available());
  assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid));
  second.tapped=false;
  assert.ok(available());
  x.entered=s.turn;
  assert.ok(!available());
  x.entered=0;
  x.tapped=true;
  assert.ok(!available());
  x.tapped=false;
  s.extLimits=[{kind:'attack',player:0,uid:x.uid,incarnation:0,expires:'end',who:0}];
  assert.ok(!available());
 });
}

test('cancelling the paid tap choice after seven picks leaves mana and creature unchanged',()=>{
 let s=setup();
 const x=put(s,0,'battle',VICE);
 give(s,0,'mana',Array(9).fill(NATURE));
 const mana=s.players[0].mana;
 use(s,x);
 for(const card of mana.slice(0,7))pick(s,card.uid);
 const available=s.decision.choices.map(c=>c.value);
 assert.deepEqual(available,[mana[7].uid,mana[8].uid,null]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,null);
 assert.equal(s.decision,null);
 assert.ok(s.players[0].mana.every(y=>!y.tapped));
 assert.ok(!s.players[0].battle[0].tapped);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid));
});

test('Vice inspects and discards exactly the selected opposing card after payment',()=>{
 const s=setup(),x=put(s,0,'battle',VICE);
 const keep=put(s,1,'hand',FIRE),discard=put(s,1,'hand','dm01-027');
 give(s,0,'mana',[...Array(7).fill(NATURE),'dm26-012',WATER]);
 const mana=s.players[0].mana;
 mana[7].faceDown=true;
 pay(s,x,mana.slice(0,8));
 task(s,'s6Inspect');
 assert.equal(s.decision.player,0);
 assert.deepEqual(s.decision.choices.map(c=>c.value),[keep.uid,discard.uid]);
 pick(s,discard.uid);
 drain(s);
 assert.ok(has(s,1,'hand',keep)&&has(s,1,'grave',discard));
 assert.ok(!mana[8].tapped);
 assert.equal(s.players[1].shields.length,5);
});

test('Soldias returns the twinpact with a spell face from its own graveyard',()=>{
 const s=setup();s.active=1;
 const x=put(s,1,'battle',SOL),mono=put(s,1,'grave','dm01-027');
 const twin=put(s,1,'grave','dm23rp3-013'),creature=put(s,1,'grave',WATER);
 put(s,0,'grave','dm01-086');
 give(s,1,'mana',Array(8).fill(FIRE));
 pay(s,x,s.players[1].mana);
 assert.equal(s.decision.player,1);
 assert.deepEqual(s.decision.choices.map(c=>c.value.uid),[mono.uid,twin.uid]);
 pick(s,twin.uid);
 drain(s);
 assert.ok(has(s,1,'hand',twin));
 assert.ok(has(s,1,'grave',mono)&&has(s,1,'grave',creature));
});

for(const owner of [0,1]){
 test('Octaryx returns a card from either mana zone to its owner without exposing its face '+owner,()=>{
  const s=setup(),x=put(s,0,'battle',OCTO);
  give(s,0,'mana',Array(8).fill(NATURE));
  give(s,1,'mana',[FIRE]);
  const hidden=s.players[owner].mana[0];
  hidden.faceDown=true;
  pay(s,x,s.players[0].mana);
  assert.ok(e.effectiveCard(x,s).blocker);
  const choice=s.decision.choices.find(c=>c.value.uid===hidden.uid);
  assert.match(choice.label,/裏向き/);
  assert.ok(!choice.cardId);
  pick(s,hidden.uid);
  drain(s);
  assert.ok(has(s,owner,'hand',hidden));
  assert.ok(!has(s,1-owner,'hand',hidden));
  assert.ok(!s.log.some(row=>row.type==='reveal'&&row.cardId===hidden.cardId));
 });
}

for(const id of ['dmrp13-039','dmrp05-026']){
 test('a mandatory attack cannot be replaced with the paid tap ability '+id,()=>{
  const s=setup(),x=put(s,0,'battle',VICE),enemy=put(s,1,'battle',id);
  give(s,0,'mana',Array(8).fill(NATURE));
  enemy.tapped=true;
  s.phase='attack';
  const actions=e.getLegalActions(s);
  assert.ok(actions.some(a=>a.kind==='attack'&&a.uid===x.uid));
  assert.ok(!actions.some(a=>a.kind==='tapAbility'&&a.uid===x.uid));
  enemy.tapped=false;
  if(id==='dmrp05-026')assert.ok(e.getLegalActions(s).some(a=>a.kind==='tapAbility'&&a.uid===x.uid));
 });
}
