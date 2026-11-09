import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,cast,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-756.json',import.meta.url)));
const ZERO='dmx13-034',FISH='dm08-040',GIGA='dm08-044';
const LAA='dmrp01-058',YATTARE='dmsd01-012',NATURE='dm01-108',LOW='dm01-083',BLOCK='dm01-001';
const BURN='dm06-s08',SPELL_BREAK='dm26rp1-071',EAGLE='dmr11-047',TARGET='dm01-084';
function base(){
 const s=setup();
 s.active=0;
 for(const p of [0,1])give(s,p,'deck',Array(25).fill(NATURE));
 return s;
}
function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}
const pick=(s,value)=>act(s,'extended',a=>s.decision.choices[a.choice].value===value);
const unblockable=(s,x)=>!!e.effectiveCard(x,s).unblockable;

test('three cards and three alternate prints use verified IDs, images and full definitions',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:756}));
  assert.throws(()=>standardCardSpec(detail,{phase:755}));
  const incomplete=structuredClone(detail);
  incomplete.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(incomplete,{phase:756}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[key],value);
  assert.ok(row.verification.facesMatched);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:row.id,count:1});
  assert.deepEqual(registry.resolveRows(deck.cards),deck.cards);
  assert.deepEqual(e.validateDeck(deck),[]);
 }
 for(const row of printAliases){
  const original=cards.find(c=>c.id===row.canonicalId);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:756}),original.spec);
  assert.ok(row.verification.facesMatched);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
  assert.deepEqual(registry.resolveRows([{id:row.id,count:1},{id:row.canonicalId,count:2}]),[{id:row.canonicalId,count:3}]);
 }
});

test('Zero Rupia offers the full range of optional discounts and can summon for zero',()=>{
 for(const discount of [0,1,2]){
  let s=base();
  put(s,0,'battle',ZERO);
  const target=put(s,0,'hand',LAA);
  act(s,'play',a=>a.uid===target.uid);
  assert.deepEqual(s.decision.choices.map(x=>x.value),[2,1,0,false]);
  s=JSON.parse(JSON.stringify(s));
  pick(s,discount);
  drain(s);
  assert.ok(s.players[0].battle.some(x=>x.uid===target.uid));
  assert.equal(s.players[0].mana.filter(x=>x.tapped).length,2-discount);
 }
 const s=base();
 put(s,0,'battle',ZERO);
 give(s,0,'mana',[]);
 cast(s,LAA);
 assert.deepEqual(s.decision.choices.map(x=>x.value),[2,false]);
 pick(s,2);
 assert.equal(s.players[0].battle.at(-1).cardId,LAA);
});

test('Zero Rupia leaves Yattareman’s minimum and civilization requirements intact',()=>{
 const s=base();
 put(s,0,'battle',ZERO);
 assert.equal(e.summonCost(s,0,e.card(LAA)),0);
 assert.equal(e.summonCost(s,0,e.card(NATURE)),2);
 put(s,0,'battle',YATTARE);
 assert.equal(e.summonCost(s,0,e.card(LAA)),1);
 cast(s,LAA);
 pick(s,2);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,1);
});

test('Illusion Fish gains Turbo Rush from a different friendly creature and loses it next turn',()=>{
 const s=base(),fish=put(s,0,'battle',FISH),ally=put(s,0,'battle',LOW);
 assert.equal(unblockable(s,fish),false);
 attack(s,fish.uid);
 drain(s);
 assert.equal(unblockable(s,fish),false);
 attack(s,ally.uid);
 drain(s);
 assert.equal(unblockable(s,fish),true);
 end(s);
 assert.equal(unblockable(s,fish),false);
});

test('a spell break, a replacement to the grave and the opponent’s break do not enable Turbo Rush',()=>{
 for(const kind of ['spell','burn','opponent']){
  const s=base(),fish=put(s,0,'battle',FISH);
  if(kind==='spell'){
   cast(s,SPELL_BREAK);
   pick(s,s.players[1].shields[0].uid);
  }else{
   const p=kind==='opponent'?1:0;
   s.active=p;
   const attacker=put(s,p,'battle',kind==='burn'?BURN:LOW);
   attack(s,attacker.uid);
  }
  drain(s);
  assert.equal(unblockable(s,fish),false,kind);
 }
});

test('Gigaclose entering after a break discards the entire opposing hand on attack before blockers',()=>{
 let s=base();
 const ally=put(s,0,'battle',LOW);
 attack(s,ally.uid);
 drain(s);
 s.phase='main';
 put(s,0,'battle','dmr02-s03'); // Eternal Ryusei Kaiser grants Speed Attacker.
 cast(s,GIGA);
 const giga=s.players[0].battle.at(-1);
 const blocker=put(s,1,'battle',BLOCK);
 give(s,1,'hand',[NATURE,NATURE,NATURE]);
 const ids=s.players[1].hand.map(x=>x.uid);
 assert.equal(giga.entered,s.turn);
 s=JSON.parse(JSON.stringify(s));
 attack(s,giga.uid);
 assert.equal(s.decision?.type,'block');
 assert.equal(s.players[1].hand.length,0);
 assert.ok(ids.every(uid=>s.players[1].grave.some(x=>x.uid===uid)));
 act(s,'block',a=>a.uid===blocker.uid);
 drain(s);
});

test('a creature effect that actually breaks a shield enables Turbo Rush on an allied Fish',()=>{
 const s=base(),fish=put(s,0,'battle',FISH),eagle=put(s,0,'battle',EAGLE);
 const victim=put(s,1,'battle',TARGET,{tapped:true});
 attack(s,eagle.uid,victim.uid);
 act(s,'noBlock');
 assert.equal(s.decision.task.op,'g34_Break497');
 pick(s,s.players[1].shields[1].uid);
 drain(s);
 assert.equal(unblockable(s,fish),true);
});
