import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,cast,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const RESIST='dm39-042',HAUNTED='dm36-057',FILI='dm36-073',ALT='dmex08-031';
const LAND='dm01-108',LOW='dm01-102',MID='dm01-086',TWIN='dmbd08-b-001',WRONG_HALF='dmex06-026';
const QQX='dmrp07-m01',TSU='dmrp22-030',GRAVE_LOCK='dmrp08-014';
function put(s,p,z,id){const x=inst(id);s.players[p][z].push(x);return x;}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const options=s=>s.decision.choices.map(o=>o.value?.uid??o.value);
function pick(s,v){act(s,'extended',a=>options(s)[a.choice]===v);}
function setDeck(s,p,ids){give(s,p,'deck',ids);return [...s.players[p].deck];}
const resume=s=>JSON.parse(JSON.stringify(s));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();

test('Phase 833 pins official faces, image power, and the Haunted Choice reprint',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-833.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[RESIST,HAUNTED,FILI]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),f=d.faces[0];
  assert.deepEqual(row.faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:833}),row.spec);
  const bad=structuredClone(d);bad.faces[0].abilityText+='未知の能力。';
  assert.throws(()=>standardCardSpec(bad,{phase:833}));
  assert.deepEqual([c.name,c.cost,c.power,c.race,c.manaValue,c.limit],[f.name,f.cost,row.powerReference?.printedPower??Number(f.powerText),f.race,1,4]);
  assert.equal(CARD_IMAGES[row.id],row.image);
 }
 assert.equal(m.cards[0].powerReference.image,CARD_IMAGES[RESIST]);
 assert.equal(m.printAliases[0].id,ALT);
 assert.equal(m.regulationVerification.limits[ALT],4);
 assert.deepEqual(registry.resolveRows([{id:HAUNTED,count:2},{id:ALT,count:2}]),[{id:HAUNTED,count:4}]);
});

test('Shinkai Resist blocks and uses the 4000 printed power',()=>{
 const s=setup(),attacker=put(s,0,'battle',LAND),resist=put(s,1,'battle',RESIST);
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===resist.uid);drain(s);
 assert.ok(has(s,0,'grave',attacker));
 assert.ok(has(s,1,'battle',resist));
 assert.equal(resist.tapped,true);
 assert.equal(e.power(resist,false,s),4000);
 assert.equal(s.players[1].shields.length,5);
});

test('Shinkai Resist cannot attack a player or a tapped creature',()=>{
 const s=setup(),resist=put(s,0,'battle',RESIST);
 put(s,1,'battle',LAND).tapped=true;s.phase='attack';
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===resist.uid));
});

for(const [owner,mill] of [[0,true],[0,false],[1,true],[1,false]])test('Haunted Choice looks privately and draws after the optional mill '+owner+' '+mill,()=>{
 const s=setup(),[own,next]=setDeck(s,0,[LOW,LAND,LAND]),[opp]=setDeck(s,1,[MID,LAND,LAND]);
 const target=owner===0?own:opp,spell=put(s,0,'hand',HAUNTED),before=physical(s);
 act(s,'play',a=>a.uid===spell.uid);
 assert.ok(e.getLegalActions(s).every(a=>!a.cardId));
 pick(s,owner);
 const saved=resume(s);
 assert.equal(e.getLegalActions(saved).find(a=>a.cardId).cardId,target.cardId);
 assert.ok(!saved.log.some(x=>x.type==='reveal'));
 pick(saved,mill?true:null);
 assert.equal(has(saved,owner,'grave',target),mill);
 assert.ok(has(saved,0,'hand',owner===0&&mill?next:own));
 if(owner===1&&!mill)assert.equal(saved.players[1].deck[0].uid,opp.uid);
 assert.deepEqual(physical(saved),before);
});

test('Haunted Choice stops before drawing after the optional mill empties the opposing deck',()=>{
 const s=setup(),[own]=setDeck(s,0,[LOW,LAND,LAND]),[opp]=setDeck(s,1,[MID]);
 cast(s,HAUNTED);pick(s,1);pick(s,true);
 assert.equal(s.winner,0);
 assert.ok(has(s,1,'grave',opp));
 assert.equal(s.players[0].deck[0].uid,own.uid);
});

for(const owner of [0,1])test('Haunted Choice can mill blind under a look prohibition '+owner,()=>{
 const s=setup(),[own]=setDeck(s,0,[LOW,LAND,LAND]),[opp]=setDeck(s,1,[MID,LAND,LAND]);
 put(s,1,'battle',QQX);
 cast(s,HAUNTED);pick(s,owner);
 assert.ok(e.getLegalActions(s).every(a=>!a.cardId));
 pick(s,true);
 assert.ok(has(s,owner,'grave',owner===0?own:opp));
 assert.equal(s.players[0].hand.length,1);
});

test('Haunted Choice reveals under Tsu only when choosing the caster library',()=>{
 for(const owner of [0,1]){
  const s=setup();put(s,1,'battle',TSU);setDeck(s,0,[LOW,LAND,LAND]);setDeck(s,1,[MID,LAND,LAND]);
  cast(s,HAUNTED);pick(s,owner);pick(s,null);
  assert.equal(s.log.some(x=>x.type==='reveal'),owner===0);
 }
});

test('Haunted Choice is a Shield Trigger and draws for its caster during the opposing turn',()=>{
 const s=setup(),a=put(s,0,'battle',LAND),[top]=setDeck(s,1,[LOW,LAND,LAND]);
 give(s,1,'shields',[HAUNTED]);
 attack(s,a.uid);
 if(e.getLegalActions(s).some(a=>a.kind==='noBlock'))act(s,'noBlock');
 act(s,'useTrigger',a=>a.cardId===HAUNTED);pick(s,1);pick(s,null);
 assert.ok(has(s,1,'hand',top));
 assert.ok(s.players[1].mana.every(x=>!x.tapped));
});

test('Filippo recovers only cost-one spells, including the correct half of a Twinpact',()=>{
 const s=setup();give(s,0,'grave',[LOW,MID,TWIN,WRONG_HALF,LAND]);give(s,1,'grave',[LOW]);
 const [low,,twin]=s.players[0].grave;
 cast(s,FILI);
 assert.deepEqual(options(s),[low.uid,twin.uid,null]);
 pick(s,twin.uid);
 assert.ok(has(s,0,'hand',twin));
 assert.equal(s.players[1].grave.length,1);
});

test('Filippo can decline and obeys the graveyard move prohibition',()=>{
 for(const locked of [false,true]){
  const s=setup(),low=put(s,0,'grave',LOW);
  if(locked)put(s,1,'battle',GRAVE_LOCK);
  cast(s,FILI);
  if(!locked)pick(s,null);
  assert.equal(s.decision,null);
  assert.ok(has(s,0,'grave',low));
 }
});

test('Filippo can enter by Shield Trigger, then recover a spell without paying mana',()=>{
 const s=setup(),a=put(s,0,'battle',LAND),low=put(s,1,'grave',LOW);
 give(s,1,'shields',[FILI]);
 attack(s,a.uid);
 if(e.getLegalActions(s).some(a=>a.kind==='noBlock'))act(s,'noBlock');
 act(s,'useTrigger',a=>a.cardId===FILI);
 pick(s,low.uid);drain(s);
 assert.ok(has(s,1,'hand',low));
 assert.ok(s.players[1].battle.some(x=>x.cardId===FILI));
 assert.ok(s.players[1].mana.every(x=>!x.tapped));
});
