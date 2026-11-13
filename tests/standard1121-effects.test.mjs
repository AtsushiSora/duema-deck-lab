import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const FLASH='dm25rp2-057',RELOADED='dm25ex4-061',PULSAR='dm25ex4-055';
const NATURE='dm01-108',FIRE='dm01-097',WATER='dm01-083',FIRE_SPELL='dm39-051';
const JOHN='dm37-033',FIRE_PSYCHIC='dm36-s07',D2='dm25ex2-067';
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);
const inZone=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const untapped=(s,p)=>s.players[p].mana.filter(x=>!x.tapped).length;
function add(s,p,zone,id,props={}){
 const x={...inst(id),...props};
 s.players[p][zone].push(x);
 return x;
}
function play(s,id){
 const x=add(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}
function trigger(s,id){
 s.active=1;
 s.phase='attack';
 const attacker=add(s,1,'battle',NATURE);
 give(s,0,'shields',[id]);
 act(s,'attack',a=>a.uid===attacker.uid&&a.target==='player');
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.cardId===id);
 return attacker;
}

test('the three canonical cards match the complete official definitions, images and limits',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-1121.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.equal(manifest.cards.length,3);
 for(const row of manifest.cards){
  const detail=details.cards.find(d=>d.id===row.id);
  assert.deepEqual(detail.faces,row.faces);
  assert.deepEqual(standardCardSpec(detail,{phase:1121}),row.spec);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[row.id]);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(e.card(row.id).limit,manifest.regulationVerification.limits[row.id]);
  assert.ok(registry.get(row.id).supported);
  const changed=structuredClone(detail);
  changed.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(changed,{phase:1121}));
 }
});

test('Immortal Flash counts creatures, can choose a target more than once and taps only after all choices',()=>{
 const s=setup();
 add(s,0,'battle',NATURE);
 add(s,0,'battle',WATER);
 add(s,0,'battle',NATURE);
 add(s,0,'battle',D2);
 const sealed=add(s,0,'battle',NATURE,{sealed:true});
 add(s,0,'seals',WATER,{faceDown:true,sealOf:sealed.uid});
 const first=add(s,1,'battle',WATER),second=add(s,1,'battle',NATURE);
 const spell=play(s,FLASH);
 assert.deepEqual(values(s),[first.uid,second.uid]);
 pick(s,first.uid);
 assert.equal(first.tapped,false);
 assert.deepEqual(values(s),[first.uid,second.uid]);
 pick(s,first.uid);
 assert.equal(first.tapped,false);
 pick(s,second.uid);
 assert.equal(first.tapped,true);
 assert.equal(second.tapped,true);
 assert.equal(s.decision,null);
 assert.ok(inZone(s,0,'grave',spell));
});

test('Immortal Flash resolves from shields for free and can choose the already tapped attacker',()=>{
 const s=setup(),before=untapped(s,0);
 add(s,0,'battle',WATER);
 add(s,0,'battle',NATURE);
 const later=add(s,1,'battle',WATER);
 const attacker=trigger(s,FLASH);
 assert.equal(attacker.tapped,true);
 assert.deepEqual(new Set(values(s)),new Set([attacker.uid,later.uid]));
 pick(s,attacker.uid);
 pick(s,later.uid);
 drain(s);
 assert.equal(untapped(s,0),before);
 assert.equal(later.tapped,true);
 assert.ok(s.players[0].grave.some(x=>x.cardId===FLASH));
});

test('Immortal Flash skips the choice without allies or a legal enemy target',()=>{
 for(const hasAlly of [false,true]){
  const s=setup();
  if(hasAlly){
   add(s,0,'battle',NATURE);
   add(s,1,'battle',WATER,{g34Grants:[{turn:s.turn,untargetable:true}]});
  }else add(s,1,'battle',WATER);
  play(s,FLASH);
  assert.equal(s.decision,null);
  assert.ok(s.players[1].battle.every(x=>!x.tapped));
 }
});

test('Reloaded uses the own extra zone and the visible creature face, including earlier Reloaded copies',()=>{
 const scenarios=[
  ['empty',[],true],['non-fire',[[0,JOHN]],true],['fire spell',[[0,FIRE_SPELL]],true],
  ['opponent',[[1,FIRE_PSYCHIC]],true],['fire psychic',[[0,FIRE_PSYCHIC]],false],
  ['ordinary fire',[[0,FIRE]],false],['earlier copy',[[0,RELOADED]],false]
 ];
 for(const [scenario,cards,leaves] of scenarios){
  const s=setup();
  s.format='advance';
  for(const [p,id] of cards)add(s,p,'extra',id);
  const x=play(s,RELOADED);
  assert.equal(inZone(s,0,'extra',x),leaves,scenario);
  assert.equal(inZone(s,0,'battle',x),!leaves,scenario);
 }
});

test('Reloaded puts its first physical copy in extra, then the next copy stays on the board',()=>{
 const s=setup();
 const first=play(s,RELOADED),second=play(s,RELOADED);
 assert.ok(inZone(s,0,'extra',first));
 assert.ok(inZone(s,0,'battle',second));
 assert.equal(s.players[0].extra.filter(x=>x.cardId===RELOADED).length,1);
});

test('Pulsar can send either player’s creature to its owner’s extra zone and only that owner draws',()=>{
 for(const [controller,owner] of [[0,0],[1,1],[1,0]]){
  const s=setup(),before=s.players.map(p=>p.deck.length);
  const target=add(s,controller,'battle',controller===1&&owner===1?FIRE_PSYCHIC:NATURE,{cardOwner:owner});
  play(s,PULSAR);
  pick(s,target.uid);
  drain(s);
  assert.ok(inZone(s,owner,'extra',target));
  assert.equal(inZone(s,controller,'battle',target),false);
  assert.equal(s.players[owner].hand.length,1);
  assert.equal(s.players[owner].deck.length,before[owner]-1);
  assert.equal(s.players[1-owner].hand.length,0);
 }
});

test('Pulsar can decline and the selected owner still draws when a leave replacement keeps the target',()=>{
 for(const mode of ['decline','replace']){
  const s=setup(),before=s.players[1].deck.length;
  const target=add(s,1,'battle',FIRE_PSYCHIC,{g1085Awakened:true});
  play(s,PULSAR);
  pick(s,mode==='decline'?null:target.uid);
  drain(s);
  assert.ok(inZone(s,1,'battle',target));
  assert.equal(!!target.g1085Awakened,mode==='decline');
  assert.equal(s.players[1].deck.length,before-(mode==='replace'?1:0));
 }
});

test('Pulsar’s Shield Trigger can send itself to the extra zone and draws without paying mana',()=>{
 const s=setup(),before=untapped(s,0);
 trigger(s,PULSAR);
 const pulsar=s.players[0].battle.find(x=>x.cardId===PULSAR);
 assert.ok(pulsar);
 pick(s,pulsar.uid);
 drain(s);
 assert.ok(inZone(s,0,'extra',pulsar));
 assert.equal(s.players[0].hand.length,1);
 assert.equal(untapped(s,0),before);
});
