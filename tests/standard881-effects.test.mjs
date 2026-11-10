import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,cast,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const FROG='dmr09-069',PROMO='promoy12-050',SHADOW='dmr09-023',PANDA='dmr08-018';
const NATURE='dm01-108',WATER='dm01-083',DARK='dm01-090',BAMBOO='dm14-108';
const BIRD='dmex18-029',LIFE='dm06-110',GENMU='dmrp15-km1',SASUKE='dmbd02-008';
const HAND='dm01-027',CROSS='dm36-094',CRISIS='dm02-035',FORTRESS='dm06-008';
const MULTI='dm24ex2-019',TSU='dmrp22-030';
function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(12).fill(NATURE));
 return s;
}
function add(s,p,zone,id,props){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const choices=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>choices(s)[a.choice]===(value?.uid??value));
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const ids=rows=>rows.map(x=>x.uid);
function end(s){s.phase='attack';act(s,'endTurn');}
function manual(s,kind,predicate=()=>true){
 const a=e.getLegalActions(s).find(a=>a.kind===kind&&predicate(a));
 assert.ok(a,kind);
 e.step(s,a,{manualMana:true});
}
function darkMana(s,n,other=[]){give(s,0,'mana',[...Array(n).fill(DARK),...other]);}

test('Phase 881 uses three complete original definitions and resolves the Frog promo to its existing catalogue ID',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-881.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[FROG,SHADOW,PANDA]);
 assert.deepEqual(m.printAliases.map(({id,canonicalId})=>[id,canonicalId]),[[PROMO,FROG]]);
 assert.deepEqual(registry.resolveRows([{id:PROMO,count:2},{id:FROG,count:2}]),[{id:FROG,count:4}]);
 assert.deepEqual(standardCardSpec({...m.printAliases[0],status:'complete'},{phase:881}),m.cards[0].spec);
 assert.equal(m.regulationVerification.limits[PROMO],4);
 for(const row of m.cards){
  const detail=details.cards.find(x=>x.id===row.id),card=e.card(row.id),[face]=row.faces;
  assert.deepEqual(detail.faces,row.faces);
  assert.deepEqual(standardCardSpec(detail,{phase:881}),row.spec);
  assert.throws(()=>standardCardSpec(detail,{phase:880}));
  const changed=structuredClone(detail);
  changed.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(changed,{phase:881}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(card[key],value);
  assert.deepEqual([card.type,card.cost,card.power,card.civilizations,card.race,card.manaValue,card.limit],
   ['creature',face.cost,Number(face.powerText),face.civilizations,face.race,1,4]);
  assert.ok(registry.get(row.id).supported);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(card.name)).map(x=>x.id),[row.id]);
 }
});

test('Frog can pay mana on the same turn it was summoned and only taps in the battle zone',()=>{
 const s=field();
 give(s,0,'mana',[NATURE,NATURE]);
 cast(s,FROG);
 const frog=s.players[0].battle[0];
 assert.equal(frog.entered,s.turn);
 assert.ok(s.players[0].mana.every(x=>x.tapped));
 cast(s,BAMBOO);
 assert.ok(frog.tapped);
 assert.ok(has(s,0,'battle',frog));
 assert.equal(s.players[0].mana.length,2);
 assert.ok(s.players[0].battle.some(x=>x.cardId===BAMBOO));
});

test('Frog supplies Nature for a creature or spell without any Nature in mana (QA 36851)',()=>{
 for(const id of [NATURE,LIFE]){
  const s=field();
  give(s,0,'mana',[WATER]);
  const frog=add(s,0,'battle',FROG),water=s.players[0].mana[0];
  cast(s,id);
  assert.ok(frog.tapped);
  assert.ok(water.tapped);
  assert.ok(has(s,0,'battle',frog));
  assert.ok(s.players[0][id===LIFE?'grave':'battle'].some(x=>x.cardId===id));
 }
});

test('Manual Frog payment survives reload and cannot satisfy Water, while Birds retains its all-color payment',()=>{
 let s=field();
 give(s,0,'mana',[WATER]);
 const frog=add(s,0,'battle',FROG),nature=add(s,0,'hand',BAMBOO);
 const water=add(s,0,'hand',WATER);
 manual(s,'play',a=>a.uid===water.uid);
 manual(s,'selectMana',a=>a.uid===frog.uid);
 assert.equal(e.manaSelectionStatus(s.decision).colors[0].paid,false);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='confirmMana'));
 manual(s,'cancelMana');
 manual(s,'play',a=>a.uid===nature.uid);
 manual(s,'selectMana',a=>a.uid===frog.uid);
 s=JSON.parse(JSON.stringify(s));
 manual(s,'confirmMana');
 assert.ok(s.players[0].battle.find(x=>x.uid===frog.uid).tapped);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===water.uid));
 const t=field();
 give(t,0,'mana',[WATER]);
 const bird=add(t,0,'battle',BIRD);
 cast(t,WATER);
 assert.ok(bird.tapped);
});

test('Frog does not produce mana while tapped or ignored by Genmu',()=>{
 for(const disabled of ['tapped','ignored']){
  const s=field();
  give(s,0,'mana',[]);
  add(s,0,'battle',FROG,{tapped:disabled==='tapped'});
  if(disabled==='ignored')add(s,1,'battle',GENMU);
  const card=add(s,0,'hand',BAMBOO);
  assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===card.uid));
 }
});

test('Shadow triggers from a discard and counts its own move from grave to mana at resolution (QA 40025)',()=>{
 const s=field();
 darkMana(s,2,[NATURE,WATER,WATER,WATER]);
 const shadow=add(s,0,'hand',SHADOW),enemy=add(s,1,'battle',WATER);
 cast(s,SASUKE);
 pick(s,shadow);
 assert.ok(has(s,0,'grave',shadow));
 pick(s,shadow);
 assert.ok(has(s,0,'mana',shadow));
 assert.deepEqual(choices(s),[enemy.uid]);
 pick(s,enemy);
 assert.ok(has(s,1,'grave',enemy));
});

test('Shadow counts remaining dark mana on resolution after being milled or leaving mana',()=>{
 for(const origin of ['deck','mana'])for(const enough of [false,true]){
  const s=field();
  darkMana(s,enough?3:2,[NATURE]);
  const target=add(s,1,'battle',WATER);
  let shadow;
  if(origin==='deck'){
   shadow=inst(SHADOW);
   s.players[0].deck.unshift(shadow);
   cast(s,CROSS);
  }else{
   shadow=add(s,0,'mana',SHADOW);
   s.active=1;
   cast(s,CRISIS);
   pick(s,shadow);
  }
  assert.ok(has(s,0,'grave',shadow));
  if(enough)pick(s,target);
  assert.equal(has(s,1,'grave',target),enough);
  assert.equal(s.decision,null);
 }
});

test('Shadow from the battle zone or a shield applies a mandatory reduction through the end of the active turn',()=>{
 for(const origin of ['battle','shields']){
  const s=field();
  darkMana(s,3);
  s.active=1;
  const target=add(s,1,'battle',PANDA);
  give(s,0,'shields',[]);
  const shadow=add(s,0,origin,SHADOW);
  cast(s,origin==='battle'?HAND:FORTRESS);
  if(origin==='battle')act(s,'effect',a=>a.targets.some(t=>t.uid===shadow.uid));
  else pick(s,shadow);
  assert.ok(has(s,0,'grave',shadow));
  pick(s,target);
  assert.equal(e.power(target,false,s),5000);
  end(s);
  drain(s);
  assert.equal(e.power(target,false,s),7000);
 }
});

test('Panda requires a sole strongest friendly creature across both fields (QA 36795)',()=>{
 for(const caseName of ['own tie','enemy tie','enemy stronger','own stronger']){
  const s=field();
  add(s,0,'battle',PANDA);
  if(caseName==='own tie')add(s,0,'battle',PANDA);
  if(caseName==='enemy tie')add(s,1,'battle',PANDA);
  if(caseName==='enemy stronger')add(s,1,'battle',GENMU);
  if(caseName==='own stronger')add(s,0,'battle',GENMU);
  s.active=1;
  end(s);
  assert.equal(s.decision?.task?.op,caseName==='own stronger'?'g34_Offer':undefined,caseName);
 }
});

test('Panda may decline before looking, or move one to hand and the other to mana before drawing',()=>{
 for(const accept of [false,true]){
  let s=field();
  add(s,0,'battle',PANDA);
  give(s,0,'deck',[MULTI,WATER,NATURE,DARK]);
  const [multi,water,next]=s.players[0].deck;
  s.active=1;
  end(s);
  pick(s,accept?true:null);
  if(accept){
   assert.deepEqual(choices(s),[multi.uid,water.uid]);
   s=JSON.parse(JSON.stringify(s));
   pick(s,water);
   const moved=s.players[0].mana.find(x=>x.uid===multi.uid);
   assert.ok(moved?.tapped);
   assert.deepEqual(ids(s.players[0].hand),[water.uid,next.uid]);
  }else{
   assert.deepEqual(ids(s.players[0].hand),[multi.uid]);
   assert.ok(!s.log.some(x=>x.type==='look'&&x.cardId===PANDA));
   assert.equal(s.players[0].deck[0].uid,water.uid);
  }
 }
});

test('Panda takes the one available card under Curved Traffic and keeps the other cards in order',()=>{
 const s=field();
 add(s,0,'battle',PANDA);
 add(s,1,'battle',TSU);
 const [first,second,third]=s.players[0].deck;
 const mana=s.players[0].mana.length;
 s.active=1;
 end(s);
 pick(s,true);
 assert.deepEqual(choices(s),[first.uid]);
 pick(s,first);
 assert.deepEqual(ids(s.players[0].hand),[first.uid,second.uid]);
 assert.equal(s.players[0].deck[0].uid,third.uid);
 assert.equal(s.players[0].mana.length,mana);
});

test('Shadow and Panda each use their printed W-Breaker for an ordinary player attack',()=>{
 for(const id of [SHADOW,PANDA]){
  const s=field(),card=add(s,0,'battle',id);
  attack(s,card.uid);
  act(s,'noBlock');
  act(s,'breakShields',a=>a.shields.length===2);
  assert.equal(s.players[1].shields.length,3);
 }
});
