import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const KABUKIRI='dm12-052',ASADA='dmr23-056',JONES='dmx04-015';
const FIRE='dm01-097',NATURE='dm01-108',AQUA='dm01-083',EVO='dm10-017',GONTA='dm10-068';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url)));
const put=(s,p,z,id,fields={})=>{const x=Object.assign(inst(id),fields);s.players[p][z].push(x);return x;};
const pick=(s,x)=>act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===x.uid);
const field=()=>{const s=setup();for(const p of [0,1])give(s,p,'deck',Array(20).fill(NATURE));return s;};
const evolve=(s,id,base)=>{
 cast(s,id);
 act(s,'evolve',a=>a.baseUid===base.uid);
 drain(s);
};

test('phase 1159 verifies three official definitions and both reprints',()=>{
 const m=read('tools/support-phase-1159.json'),registry=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(x=>x.id),[KABUKIRI,ASADA,JONES]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[
  ['dmc34-052',KABUKIRI],['promoy25-049',JONES]
 ]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1159}),row.spec);
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
  assert.throws(()=>standardCardSpec({...row,status:'complete',faces:[{...f,abilityText:f.abilityText+'\n未知の能力。'}]},{phase:1159}));
 }
});

test('Kabukiri destroys itself when either player evolves a different creature',()=>{
 const s=field(),base=put(s,0,'battle',AQUA);
 const kabukiri=[0,1].map(p=>put(s,p,'battle',KABUKIRI));
 evolve(s,EVO,base);
 for(const [p,x] of kabukiri.entries())assert.ok(s.players[p].grave.includes(x));
 assert.ok(s.players[0].battle.some(x=>x.cardId===EVO&&x.under.includes(base)));
});

test('Kabukiri also sees mana evolution',()=>{
 const s=field(),kabukiri=put(s,1,'battle',KABUKIRI);
 const base=s.players[0].mana.find(x=>x.cardId===NATURE);
 evolve(s,'dm35-033',base);
 assert.ok(s.players[1].grave.includes(kabukiri));
});

test('Kabukiri survives ordinary entry and S-MAX entry without an evolution base',()=>{
 const s=field(),kabukiri=put(s,1,'battle',KABUKIRI);
 cast(s,GONTA);drain(s);
 cast(s,'dmrp21-1B');drain(s);
 assert.ok(s.players[1].battle.includes(kabukiri));
});

test('Asadappy forces a battle when an allied Fire and Nature creature enters',()=>{
 const s=field(),enemy=put(s,1,'battle',FIRE);
 put(s,0,'battle',ASADA);
 cast(s,GONTA);
 assert.equal(s.decision.choices.length,1);
 pick(s,enemy);
 assert.ok(s.players[1].grave.includes(enemy));
 assert.ok(s.players[0].battle.some(x=>x.cardId===GONTA));
});

test('Asadappy requires both civilizations on a single allied entrant',()=>{
 const s=field(),enemy=put(s,1,'battle',FIRE);
 cast(s,ASADA);
 for(const id of [FIRE,NATURE])cast(s,id);
 assert.equal(s.decision,null);
 assert.ok(s.players[1].battle.includes(enemy));
 s.active=1;
 cast(s,GONTA);
 assert.equal(s.decision,null);
 assert.ok(s.players[1].battle.some(x=>x.cardId===GONTA));
});

test('Asadappy has no battle when the opponent has no eligible creature',()=>{
 const s=field();
 put(s,0,'battle',ASADA);
 cast(s,GONTA);
 assert.equal(s.decision,null);
 assert.ok(s.players[0].battle.some(x=>x.cardId===GONTA));
});

test('Jones returns only at its turn end after personally breaking a shield',()=>{
 const s=field(),jones=put(s,0,'battle',JONES),other=put(s,0,'battle',JONES);
 attack(s,jones.uid);drain(s);
 assert.ok(s.players[0].battle.includes(jones));
 assert.equal(s.players[1].shields.length,4);
 act(s,'endTurn');drain(s);
 assert.ok(s.players[0].hand.includes(jones));
 assert.ok(s.players[0].battle.includes(other));
});

test('Jones stays in battle after attacking a creature without breaking a shield',()=>{
 const s=field(),jones=put(s,0,'battle',JONES),enemy=put(s,1,'battle',FIRE,{tapped:true});
 attack(s,jones.uid,enemy.uid);drain(s);
 act(s,'endTurn');drain(s);
 assert.ok(s.players[0].battle.includes(jones));
 assert.equal(s.players[1].shields.length,5);
});

test('Jones counts a shield it breaks by an effect while battling a creature',()=>{
 const s=field(),jones=put(s,0,'battle',JONES),enemy=put(s,1,'battle',FIRE,{tapped:true});
 cast(s,'dm35-019');
 attack(s,jones.uid,enemy.uid);
 act(s,'noBlock');
 pick(s,s.players[1].shields[0]);
 assert.equal(s.players[1].shields.length,4);
 assert.ok(s.players[0].battle.includes(jones));
 act(s,'endTurn');drain(s);
 assert.ok(s.players[0].hand.includes(jones));
});
