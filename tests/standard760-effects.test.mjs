import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,cast,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-760.json',import.meta.url)));
const SONIA='dmx22b-041',TATSUMAKI='dm02-008',CHOP='dmr05-073';
const NATURE='dm01-108',FIRE='dm01-097',DARK='dm01-090',LIGHT='dm01-075',WATER='dm01-083';
const COURTNEY='dm13-015',PEACAP='dm06-032',GAIASH='dmex17-021';
function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
const inZone=(s,p,z,uid)=>s.players[p][z].find(x=>x.uid===uid);
const block=(s,x)=>act(s,'block',a=>a.uid===x.uid);

test('three complete definitions keep their existing catalogue IDs and verified images',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:760}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:760}));
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

test('Sonia charges tapped and produces either of its two civilizations',()=>{
 const s=setup();
 s.phase='charge';
 const sonia=put(s,0,'hand',SONIA);
 act(s,'charge',a=>a.uid===sonia.uid);
 assert.ok(inZone(s,0,'mana',sonia.uid).tapped);
 assert.deepEqual(e.manaColors(e.card(SONIA),s,0),['闇','火']);
});

test('summoning Sonia untaps own dark and fire mana, including multicolor but excluding locked or colorless mana',()=>{
 const s=setup();
 const dark=put(s,0,'mana',DARK,{tapped:true}),fire=put(s,0,'mana',FIRE,{tapped:true});
 const multi=put(s,0,'mana',SONIA,{tapped:true}),locked=put(s,0,'mana',FIRE,{tapped:true,tapLocks:[1]});
 const hidden=put(s,0,'mana',DARK,{tapped:true,faceDown:true});
 const light=put(s,0,'mana',LIGHT,{tapped:true}),water=put(s,0,'mana',WATER,{tapped:true});
 const rival=put(s,1,'mana',FIRE,{tapped:true});
 cast(s,SONIA);
 drain(s);
 for(const x of [dark,fire,multi])assert.equal(x.tapped,false,x.cardId);
 for(const x of [locked,hidden,light,water,rival])assert.equal(x.tapped,true,x.cardId);
 const sonia=s.players[0].battle.find(x=>x.cardId===SONIA);
 assert.ok(sonia);
 sonia.entered=0;
 attack(s,sonia.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('Sonia distinguishes non-summon deployment and free summons, including mana civilization grants',()=>{
 for(const execution of [false,true]){
  const s=setup();
  const sonia=put(s,0,'hand',SONIA);
  put(s,0,'battle',COURTNEY);
  const nature=put(s,0,'mana',NATURE,{tapped:true}),hidden=put(s,0,'mana',DARK,{tapped:true,faceDown:true});
  s.extTasks=[{op:'g34_Put',p:0,source:SONIA,origin:'hand',target:sonia.uid,execution}];
  act(s,'toAttack');
  drain(s);
  assert.ok(inZone(s,0,'battle',sonia.uid));
  assert.equal(nature.tapped,!execution);
  assert.equal(hidden.tapped,!execution);
 }
});

test('both blockers untap only after a surviving block battle, including after restoring the pending result',()=>{
 for(const id of [TATSUMAKI,CHOP]){
  let s=setup();
  const first=put(s,0,'battle',NATURE),second=put(s,0,'battle',NATURE),defender=put(s,1,'battle',id);
  defender.g34Grants=[{turn:s.turn,battleWinDraw:true}];
  attack(s,first.uid);
  block(s,defender);
  assert.equal(s.decision.type,'draw');
  assert.ok(defender.tapped&&inZone(s,0,'grave',first.uid));
  s=JSON.parse(JSON.stringify(s));
  act(s,'draw');
  assert.equal(inZone(s,1,'battle',defender.uid).tapped,false);
  attack(s,second.uid);
  block(s,inZone(s,1,'battle',defender.uid));
  act(s,'draw');
  assert.equal(inZone(s,1,'battle',defender.uid).tapped,false);
  assert.equal(s.players[1].shields.length,5);
 }
});

test('no untap follows a cancelled block battle, destruction, or a battle without blocking',()=>{
 for(const id of [TATSUMAKI,CHOP]){
  for(const mode of ['cancelled','destroyed','attacked']){
   const s=setup(),defender=put(s,1,'battle',id,{tapped:mode==='attacked'});
   const attacker=put(s,0,'battle',mode==='cancelled'?PEACAP:mode==='destroyed'?GAIASH:NATURE);
   attack(s,attacker.uid,mode==='attacked'?defender.uid:'player');
   if(mode!=='attacked')block(s,defender);
   else if(s.decision?.type==='block')act(s,'noBlock');
   drain(s);
   if(mode==='destroyed')assert.ok(inZone(s,1,'grave',defender.uid));
   else assert.ok(inZone(s,1,'battle',defender.uid).tapped);
   assert.ok(!s.log.some(row=>row.type==='afterBattle'&&row.cardId===id));
  }
 }
});

test('Tatsumaki can attack the player, while Chop can only attack creatures',()=>{
 const s=setup();
 s.phase='attack';
 const tatsumaki=put(s,0,'battle',TATSUMAKI),chop=put(s,0,'battle',CHOP);
 const enemy=put(s,1,'battle',NATURE,{tapped:true});
 const attacks=x=>e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===x.uid).map(a=>a.target);
 assert.deepEqual(attacks(chop),[enemy.uid]);
 assert.ok(attacks(tatsumaki).includes('player'));
});
