import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const TUBE='dmex14-003',BONGA='dmr22-007',ELEKI='dmex14-054';
const MONO='dm01-108',ENEMY='dm01-097',GEAR='dm31-019';
const TWIN='dmex12-074',COURTNEY='dmrp20-046',FATHER='dmr02-005';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(MONO));
 return s;
}
function put(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{
 const v=s.decision.choices[a.choice].value;
 return (v?.uid??v)===(value?.uid??value);
});
const end=s=>{s.phase='attack';act(s,'endTurn');};

test('phase 1168 verifies all three official definitions, limits, images and canonical IDs',()=>{
 const m=read('tools/support-phase-1168.json'),registry=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(x=>x.id),[TUBE,BONGA,ELEKI]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const {id}=row,c=e.card(id),f=row.faces[0],d=details.cards.find(x=>x.id===id);
  assert.deepEqual(d.faces,row.faces);
  assert.deepEqual(standardCardSpec(d,{phase:1168}),row.spec);
  assert.deepEqual([c.type,c.cost,c.civilizations,c.race,c.power,c.manaValue,c.limit],
   ['creature',f.cost,f.civilizations,f.race,Number(f.powerText),1,4]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.equal(registry.get(id).id,id);
  assert.equal(registry.byName.get(nameKey(row.name)).id,id);
  assert.equal(CARD_IMAGES[id],row.image);
  assert.ok(refs.some(x=>x.id===id&&x.canonicalId===id&&x.image===row.image));
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'\n未知の能力。'}]},{phase:1168}));
 }
});

test('Tube draws three and discards one of its own, with a bounce only for a multicolor creature',()=>{
 for(const ally of [BONGA,TWIN,null]){
  const s=field(),own=s.players[0],enemy=put(s,1,'battle',ENEMY,{cardOwner:0});
  if(ally)put(s,0,'battle',ally);
  const [discard,...draws]=own.deck.slice(0,3);
  const enemyHand=put(s,1,'hand',ENEMY);
  cast(s,TUBE);
  assert.equal(s.decision.player,0);
  assert.deepEqual(own.hand,[discard,...draws]);
  pick(s,discard);
  if(ally===BONGA)pick(s,enemy);
  assert.equal(s.decision,null);
  assert.ok(own.grave.includes(discard));
  assert.equal(own.hand.includes(enemy),ally===BONGA);
  assert.equal(s.players[1].battle.includes(enemy),ally!==BONGA);
  assert.ok(s.players[1].hand.includes(enemyHand));
 }
});

test('Tube triggers once per actual discard in a simultaneous batch',()=>{
 const s=field(),own=s.players[0];
 put(s,0,'battle',TUBE);
 put(s,0,'battle',BONGA);
 give(s,0,'hand',[MONO,MONO]);
 give(s,1,'battle',[ENEMY,ENEMY]);
 const before=s.players[1].battle.slice();
 s.active=1;
 cast(s,'dm02-029');
 drain(s);
 assert.equal(own.grave.length,2);
 assert.deepEqual(s.players[1].hand,before);
 assert.equal(s.players[1].battle.length,0);
});

test('Tube does not trigger when a discard is replaced by a mana placement',()=>{
 const s=field();
 const father=put(s,0,'hand',FATHER);
 put(s,0,'battle',TUBE);
 put(s,0,'battle',BONGA);
 const enemy=put(s,1,'battle',ENEMY);
 s.active=1;
 cast(s,'dm02-029');
 assert.equal(s.decision.player,0);
 act(s,'extended',a=>!!s.decision.choices[a.choice].value);
 drain(s);
 assert.ok(s.players[0].mana.includes(father));
 assert.ok(!s.players[0].grave.includes(father));
 assert.ok(s.players[1].battle.includes(enemy));
});

test('Bonga watches another allied multicolor card entering even when it is a cross gear',()=>{
 const s=field(),own=s.players[0],first=own.deck[0];
 cast(s,BONGA);
 assert.equal(s.decision,null);
 cast(s,TWIN);
 drain(s);
 assert.equal(s.decision,null);
 assert.equal(own.hand.length,0);
 s.active=1;
 cast(s,GEAR);
 assert.equal(own.hand.length,0);
 s.active=0;
 cast(s,GEAR);
 pick(s,1);
 assert.deepEqual(own.hand,[first]);
});

test('Bonga watches repeated mana placements using actual mana colors and the draw is optional',()=>{
 for(const [charge,courtney,draws] of [[BONGA,false,true],[MONO,false,false],[MONO,true,true]]){
  const s=field(),own=s.players[0];
  put(s,0,'battle',BONGA);
  if(courtney)put(s,0,'battle',COURTNEY);
  for(const count of [0,1]){
   s.phase='charge';
   const charged=put(s,0,'hand',charge);
   act(s,'charge',a=>a.uid===charged.uid);
   if(draws)pick(s,count);
   assert.equal(own.hand.length,draws?count:0);
   assert.equal(!!charged.tapped,charge===BONGA);
  }
 }
});

test('Eleki discounts only its own summons and spells, floors at one and can attack immediately',()=>{
 const s=field(),own=s.players[0];
 const c=e.card(ELEKI);
 assert.equal(e.summonCost(s,0,c),5);
 s.active=1;
 cast(s,MONO);
 assert.equal(e.summonCost(s,0,c),5);
 s.active=0;
 cast(s,GEAR);
 assert.equal(e.summonCost(s,0,c),5);
 cast(s,MONO);
 assert.equal(e.summonCost(s,0,c),3);
 cast(s,'dm06-110');
 assert.equal(e.summonCost(s,0,c),1);
 const tapped=own.mana.filter(x=>x.tapped).length;
 cast(s,ELEKI);
 assert.equal(own.mana.filter(x=>x.tapped).length,tapped+1);
 const eleki=own.battle.find(x=>x.cardId===ELEKI);
 attack(s,eleki.uid);
 drain(s);
 assert.equal(s.players[1].shields.length,4);
 end(s);
 assert.equal(e.summonCost(s,0,c),5);
});
