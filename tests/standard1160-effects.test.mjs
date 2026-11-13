import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const COSME='dmex14-033',PEACH='dm27-052',GOLDEN='promoy11-059';
const FIRE='dm01-097',NATURE='dm01-108',MULTI='dm10-068',LIFE='dm06-110',ZENITH='dmx13-011';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url)));
const put=(s,p,z,id)=>{const x=inst(id);s.players[p][z].push(x);return x;};
const pick=(s,value)=>act(s,'extended',a=>s.decision.choices[a.choice].value===value);
const field=()=>{const s=setup();for(const p of [0,1])give(s,p,'deck',Array(20).fill(NATURE));return s;};
const charge=(s,id)=>{
 const p=s.active,x=put(s,p,'hand',id);
 s.phase='charge';
 act(s,'charge',a=>a.uid===x.uid);
 drain(s);
 return x;
};
const ramp=(s,id)=>{
 const p=s.active;
 give(s,p,'deck',[id,...Array(19).fill(NATURE)]);
 const x=s.players[p].deck[0];
 cast(s,LIFE);drain(s);
 assert.equal(s.players[p].mana.at(-1),x);
 return x;
};
const paid=s=>s.players[s.active].mana.filter(x=>x.tapped).length;

test('phase 1160 verifies three official definitions and all three reprints',()=>{
 const m=read('tools/support-phase-1160.json'),registry=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(x=>x.id),[COSME,PEACH,GOLDEN]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[
  ['dm24bd5-033',COSME],['dmx11-063',PEACH],['dmr19-083',PEACH]
 ]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1160}),row.spec);
  assert.deepEqual([c.type,c.cost,c.power,c.civilizations,c.race,c.manaValue,c.limit],
   ['creature',f.cost,parseInt(f.powerText,10),f.civilizations.filter(color=>color!=='無色'),f.race,1,4]);
  assert.equal(m.regulationVerification.limits[row.id],4);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.equal(registry.get(row.id).id,id);
  assert.equal(registry.byName.get(nameKey(row.name)).id,id);
  assert.ok(refs.some(x=>x.id===row.id&&x.canonicalId===id&&x.image===row.image));
  if(!row.canonicalId){
   assert.deepEqual(details.cards.find(x=>x.id===id).faces,row.faces);
   assert.equal(CARD_IMAGES[id],row.image);
  }
  assert.throws(()=>standardCardSpec({...row,status:'complete',faces:[{...f,abilityText:f.abilityText+'\n未知の能力。'}]},{phase:1160}));
 }
});

test('Cosme draws and untaps only the first multicolor mana placement each turn',()=>{
 const s=field();
 put(s,0,'battle',COSME);
 assert.equal(charge(s,NATURE).tapped,false);
 assert.equal(s.players[0].hand.length,0);
 assert.equal(ramp(s,MULTI).tapped,false);
 assert.equal(s.players[0].hand.length,1);
 assert.equal(ramp(s,MULTI).tapped,true);
 assert.equal(s.players[0].hand.length,1);
 s.phase='attack';act(s,'endTurn');drain(s);
 s.phase='attack';act(s,'endTurn');drain(s);
 const hand=s.players[0].hand.length;
 assert.equal(charge(s,MULTI).tapped,false);
 assert.equal(s.players[0].hand.length,hand+1);
});

test('Cosme remembers a multicolor placement before it entered',()=>{
 const s=field();
 charge(s,MULTI);
 cast(s,COSME);
 assert.equal(ramp(s,MULTI).tapped,true);
 assert.equal(s.players[0].hand.length,0);
});

test('Cosme sees a single-color mana placement changed by Bouka (QA39418)',()=>{
 const s=field();
 put(s,0,'battle',COSME);
 put(s,0,'battle','dmex14-010');
 assert.equal(charge(s,NATURE).tapped,false);
 assert.equal(s.players[0].hand.length,1);
 assert.equal(ramp(s,MULTI).tapped,true);
 assert.equal(s.players[0].hand.length,1);
});

test('Cosme triggers for both cards of a simultaneous first placement (QA48286)',()=>{
 const s=field(),ids=['dmr23-072','dmr23-060'];
 put(s,0,'battle',COSME);
 give(s,0,'deck',[...ids,...Array(18).fill(NATURE)]);
 cast(s,'dmx11-012');drain(s);
 assert.deepEqual(s.players[0].mana.slice(-2).map(x=>[x.cardId,x.tapped]),ids.map(id=>[id,false]));
 assert.equal(s.players[0].hand.length,2);
});

test('Cosme applies during the other player’s turn via a shield trigger',()=>{
 const s=field();
 put(s,1,'battle',COSME);
 give(s,1,'deck',[MULTI,...Array(19).fill(NATURE)]);
 give(s,1,'shields',[LIFE]);
 attack(s,put(s,0,'battle',FIRE).uid);
 drain(s);
 assert.equal(s.players[1].mana.at(-1).cardId,MULTI);
 assert.equal(s.players[1].mana.at(-1).tapped,false);
 assert.equal(s.players[1].hand.length,1);
});

test('Peach summoned first can reduce the second creature by zero, one or two',()=>{
 for(const amount of [0,1,2]){
  const s=field();
  cast(s,PEACH);
  const before=paid(s);
  cast(s,'dm01-s08');
  assert.deepEqual(s.decision.choices.map(c=>c.value),[2,1,0,false]);
  pick(s,amount);drain(s);
  assert.equal(paid(s)-before,7-amount);
  const next=paid(s);
  cast(s,NATURE);drain(s);
  assert.equal(paid(s)-next,2);
 }
});

test('Peach entering as the second summon does not reduce itself or the third summon',()=>{
 const s=field();
 cast(s,FIRE);
 const before=paid(s);
 cast(s,PEACH);drain(s);
 assert.equal(paid(s)-before,3);
 const next=paid(s);
 cast(s,NATURE);drain(s);
 assert.equal(paid(s)-next,2);
});

test('Peach reduction leaves at least one mana and multiple copies stack on the second summon',()=>{
 const s=field();
 put(s,0,'battle',PEACH);
 put(s,0,'battle',PEACH);
 cast(s,FIRE);
 const before=paid(s);
 cast(s,NATURE);
 pick(s,4);drain(s);
 assert.equal(paid(s)-before,1);
});

test('Golden K offers up to three reduction only to the controller’s Zenith',()=>{
 const s=field();
 put(s,0,'battle',GOLDEN);
 cast(s,NATURE);
 assert.equal(paid(s),2);
 cast(s,ZENITH);
 assert.deepEqual(s.decision.choices.map(c=>c.value),[3,2,1,0,false]);
 pick(s,2);drain(s);
 assert.equal(paid(s),10);
 const t=field();
 put(t,1,'battle',GOLDEN);
 cast(t,ZENITH);drain(t);
 assert.equal(paid(t),10);
});

test('Golden K stacks its reduction to zero for a colorless Zenith and breaks two shields',()=>{
 const s=field();
 for(let i=0;i<4;i++)put(s,0,'battle',GOLDEN);
 cast(s,ZENITH);
 pick(s,10);drain(s);
 assert.equal(paid(s),0);
 attack(s,s.players[0].battle[0].uid);drain(s);
 assert.equal(s.players[1].shields.length,3);
});
