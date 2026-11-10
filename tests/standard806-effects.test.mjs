import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-806.json',import.meta.url)));
const BUL="dm25-031",CAM="dm25-041",CLAUDE="dm25-049",RALFAS="dm25-042";
const FIRE="dm01-097",DARK="dm01-090",WATER="dm01-083",ZERO="dmrp07-001",MULTI="dmrp13-084";
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 806 definitions preserve their canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:806}));
  assert.throws(()=>standardCardSpec(detail,{phase:805}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:806}));
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

const play=(s,x)=>act(s,'play',a=>a.uid===x.uid&&!a.alternative);
const ids=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const canAttack=(s,x,target)=>e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target===target.uid);

for(const id of [BUL,CAM]){
 test(e.card(id).name+' protects against a current shared civilization, but not a colorless attacker',()=>{
  const s=setup();
  s.active=1;s.phase='attack';
  const defender=put(s,0,'battle',id),water=put(s,1,'battle',WATER);
  const fire=put(s,1,'battle',FIRE),multi=put(s,1,'battle',MULTI),zero=put(s,1,'battle',ZERO);
  defender.tapped=true;
  assert.equal(canAttack(s,water,defender),false);
  assert.equal(canAttack(s,multi,defender),false);
  assert.equal(canAttack(s,fire,defender),true);
  assert.equal(canAttack(s,zero,defender),true);
  const ally=put(s,0,'battle',FIRE);
  assert.equal(canAttack(s,fire,defender),id===BUL);
  s.players[0].seals=[{...inst(WATER),sealOf:ally.uid}];
  ally.sealed=true;
  assert.equal(canAttack(s,fire,defender),true);
  const ralfas=put(s,1,'battle',RALFAS);
  act(s,'tapAbility',a=>a.uid===ralfas.uid);
  pick(s,fire.uid);
  pick(s,'水');
  drain(s);
  assert.equal(canAttack(s,fire,defender),false);
 });
 test(e.card(id).name+' bars same-color blockers but allows a blocker from a different civilization',()=>{
  const s=setup(),source=put(s,0,'battle',id);
  if(id===CAM)put(s,0,'battle',FIRE);
  const same=put(s,1,'battle','dm01-084'),other=put(s,1,'battle','dm01-055');
  attack(s,source.uid);
  const blocks=e.getLegalActions(s).filter(a=>a.kind==='block');
  assert.ok(!blocks.some(a=>a.uid===same.uid));
  assert.ok(blocks.some(a=>a.uid===other.uid));
  act(s,'block',a=>a.uid===other.uid);
  drain(s);
  assert.ok(has(s,1,'grave',other));
 });
}

test('Bulfarion charges tapped and breaks two shields when no eligible blocker interferes',()=>{
 const s=setup(),charged=put(s,0,'hand',BUL);
 s.phase='charge';act(s,'charge',a=>a.uid===charged.uid);
 assert.equal(s.players[0].mana.find(x=>x.uid===charged.uid).tapped,true);
 const source=put(s,0,'battle',BUL);
 put(s,1,'battle','dm01-084');
 attack(s,source.uid);
 drain(s);
 assert.equal(s.players[1].shields.length,3);
});

for(const mode of ['battle','mana','decline','untap prohibited']){
 test('Claude chooses a single own multicolor card and respects both zones '+mode,()=>{
  let s=setup();
  const source=put(s,0,'hand',CLAUDE),battle=put(s,0,'battle',MULTI);
  const sealed=put(s,0,'battle','dmrp15-086'),mono=put(s,0,'battle',DARK);
  const mana=put(s,0,'mana',MULTI),hidden=put(s,0,'mana','dmrp15-086');
  put(s,1,'battle',MULTI).tapped=true;
  put(s,1,'battle','dmrp22-042');
  battle.tapped=sealed.tapped=mono.tapped=mana.tapped=hidden.tapped=true;
  hidden.faceDown=true;
  s.players[0].seals=[{...inst(WATER),sealOf:sealed.uid}];
  if(mode==='untap prohibited')battle.tapLocks=[1];
  play(s,source);
  assert.equal(s.decision.player,0);
  assert.deepEqual(ids(s),[battle.uid,mana.uid,null]);
  s=JSON.parse(JSON.stringify(s));
  pick(s,mode==='decline'?null:mode==='mana'?mana.uid:battle.uid);
  drain(s);
  const isTapped=(zone,x)=>s.players[0][zone].find(y=>y.uid===x.uid).tapped;
  assert.equal(isTapped('battle',battle),mode!=='battle');
  assert.equal(isTapped('mana',mana),mode!=='mana');
  assert.ok(isTapped('battle',sealed)&&isTapped('battle',mono)&&isTapped('mana',hidden));
 });
}

test('Claude resolves its shield trigger and untaps a dual-civilization twinpact in mana',()=>{
 const s=setup();
 s.active=1;
 const enemy=put(s,1,'battle',FIRE);
 give(s,0,'mana',['dm24bd4-007']);
 const mana=s.players[0].mana[0];
 mana.tapped=true;
 give(s,0,'shields',[CLAUDE]);
 const source=s.players[0].shields[0];
 attack(s,enemy.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 assert.deepEqual(ids(s),[mana.uid,null]);
 pick(s,mana.uid);
 drain(s);
 assert.ok(has(s,0,'battle',source));
 assert.equal(s.players[0].mana[0].tapped,false);
 assert.equal(s.metrics[0].triggers,1);
});

test('Claude sees current mana civilizations without exposing the face of a card affected by Courtney',()=>{
 const s=setup(),source=put(s,0,'hand',CLAUDE);
 put(s,0,'battle','dm13-015');
 const hidden=put(s,0,'mana','dm26-012');
 hidden.faceDown=hidden.tapped=true;
 play(s,source);
 const candidate=s.decision.choices.find(c=>c.value?.uid===hidden.uid);
 assert.match(candidate.label,/裏向き/);
 assert.ok(!candidate.cardId);
 pick(s,hidden.uid);
 drain(s);
 assert.ok(!hidden.tapped&&hidden.faceDown);
 assert.ok(!s.log.some(r=>r.type==='untap'&&r.cardId===hidden.cardId));
});

test('Claude can untap a multicolor Tamaseed in the battle zone',()=>{
 const s=setup(),source=put(s,0,'hand',CLAUDE),seed=put(s,0,'battle','dmrp22-007');
 seed.tapped=true;
 play(s,source);
 assert.deepEqual(ids(s),[seed.uid,null]);
 pick(s,seed.uid);
 assert.equal(seed.tapped,false);
});
