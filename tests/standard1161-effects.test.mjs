import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const LAYLA='dm24rp4-070',DARUPI='dmex12-034',NAMEKO='dmx16-071';
const FIRE='dm01-097',NATURE='dm01-108',DRAGON='dm01-s08',AQUA='dm01-083',GONTA='dm10-068';
const SIGN='dmc44-001',DESTROY='dm01-027',BOUNCE='dm01-086',NIGHTMARE='dmr19-070';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url)));
const put=(s,p,z,id,fields={})=>{const x=Object.assign(inst(id),fields);s.players[p][z].push(x);return x;};
const pick=(s,wanted)=>act(s,'extended',a=>{
 const value=s.decision.choices[a.choice].value;
 return (value?.uid??value)===(wanted?.uid??wanted);
});
const field=()=>{const s=setup();for(const p of [0,1])give(s,p,'deck',Array(20).fill(NATURE));return s;};
const target=(s,x)=>act(s,'effect',a=>a.targets[0]?.uid===x.uid);

test('phase 1161 verifies three official definitions and their single printings',()=>{
 const m=read('tools/support-phase-1161.json'),registry=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(x=>x.id),[LAYLA,DARUPI,NAMEKO]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1161}),row.spec);
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
  assert.throws(()=>standardCardSpec({...row,status:'complete',faces:[{...f,abilityText:f.abilityText+'\n未知の能力。'}]},{phase:1161}));
 }
});

test('Layla offers a shield break when destroyed by power comparison on either turn',()=>{
 for(const defender of [false,true]){
  const s=field(),p=defender?1:0;
  const layla=put(s,p,'battle',LAYLA,{tapped:defender}),dragon=put(s,1-p,'battle',DRAGON,{tapped:!defender});
  attack(s,(defender?dragon:layla).uid,(defender?layla:dragon).uid);
  act(s,'noBlock');
  assert.ok(s.players[p].grave.includes(layla));
  assert.equal(s.decision.source,LAYLA);
  assert.equal(s.decision.player,p);
  pick(s,s.players[1-p].shields[2]);drain(s);
  assert.equal(s.players[1-p].shields.length,4);
 }
});

test('Layla can decline and ignores destruction outside a battle',()=>{
 const s=field(),layla=put(s,0,'battle',LAYLA),dragon=put(s,1,'battle',DRAGON,{tapped:true});
 attack(s,layla.uid,dragon.uid);act(s,'noBlock');pick(s,null);
 assert.equal(s.players[1].shields.length,5);
 const t=field(),foe=put(t,1,'battle',LAYLA);
 cast(t,DESTROY);target(t,foe);drain(t);
 assert.ok(t.players[1].grave.includes(foe));
 assert.equal(t.players[0].shields.length,5);
});

test('Layla also triggers in an effect battle, but a destruction replacement prevents it',()=>{
 for(const saved of [false,true]){
  const s=field(),layla=put(s,0,'battle',LAYLA),dragon=put(s,1,'battle',DRAGON);
  if(saved)layla.g34Grants=[{turn:s.turn,destroyToMana:true}];
  cast(s,'dmrp19-085');pick(s,layla);pick(s,dragon);
  if(saved){
   assert.ok(s.players[0].mana.includes(layla));
   assert.equal(s.decision,null);
  }else{
   assert.ok(s.players[0].grave.includes(layla));
   assert.equal(s.decision.source,LAYLA);
   pick(s,s.players[1].shields[0]);drain(s);
  }
  assert.equal(s.players[1].shields.length,saved?5:4);
 }
});

test('Layla’s destruction by Slayer happens after battle (QA42496)',()=>{
 const s=field(),layla=put(s,0,'battle',LAYLA),enemy=put(s,1,'battle',NATURE,{tapped:true});
 enemy.g34Grants=[{turn:s.turn,slayer:true}];
 attack(s,layla.uid,enemy.uid);act(s,'noBlock');
 assert.ok(s.players[0].grave.includes(layla));
 assert.equal(s.decision,null);
 assert.equal(s.players[1].shields.length,5);
});

test('Darupi reduces only its controller’s Funky Nightmare summon and respects a one-mana floor',()=>{
 const s=field();
 for(let n=0;n<2;n++)put(s,0,'battle',DARUPI);
 assert.equal(e.summonCost(s,0,e.card(NIGHTMARE)),1);
 assert.equal(e.summonCost(s,1,e.card(NIGHTMARE)),2);
 assert.equal(e.summonCost(s,0,e.card(FIRE)),2);
 cast(s,NIGHTMARE);drain(s);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,1);
});

test('Darupi destroys a creature brought out of the opposing graveyard',()=>{
 const s=field(),unit=put(s,0,'grave',NATURE);
 put(s,1,'battle',DARUPI);
 cast(s,SIGN);pick(s,unit);drain(s);
 assert.ok(s.players[0].grave.includes(unit));
 assert.ok(!s.players[0].battle.includes(unit));
});

test('Darupi leaves hand entries and its own graveyard entries alone',()=>{
 const s=field();
 put(s,1,'battle',DARUPI);
 cast(s,NATURE);drain(s);
 assert.ok(s.players[0].battle.some(x=>x.cardId===NATURE));
 s.active=1;
 const unit=put(s,1,'grave',AQUA);
 cast(s,SIGN);pick(s,unit);drain(s);
 assert.ok(s.players[1].battle.includes(unit));
});

test('Nameko buffs the current allied creatures with no printed ability',()=>{
 const s=field(),plain=put(s,0,'battle',NATURE),legacy=put(s,0,'battle',GONTA);
 const printed=put(s,0,'battle',DRAGON),enemy=put(s,1,'battle',NATURE);
 plain.g34Grants=[{turn:s.turn,speedAttacker:true}];
 cast(s,NAMEKO);drain(s);
 assert.equal(e.power(plain,false,s),7000);
 assert.equal(e.power(legacy,false,s),9000);
 assert.equal(e.power(printed,false,s),6000);
 assert.equal(e.power(enemy,false,s),2000);
 assert.equal(e.effectiveCard(plain,s).extraBreak,1);
 assert.equal(e.effectiveCard(legacy,s).extraBreak,1);
 cast(s,AQUA);drain(s);
 assert.equal(e.power(s.players[0].battle.find(x=>x.cardId===AQUA),false,s),1000);
});

test('Nameko’s bonus survives its source leaving and expires at turn end',()=>{
 const s=field(),plain=put(s,0,'battle',NATURE);
 cast(s,NAMEKO);
 const source=s.players[0].battle.find(x=>x.cardId===NAMEKO);
 cast(s,BOUNCE);target(s,source);
 assert.ok(s.players[0].hand.includes(source));
 attack(s,plain.uid);drain(s);
 assert.equal(s.players[1].shields.length,3);
 act(s,'endTurn');drain(s);
 assert.equal(e.power(plain,false,s),2000);
 assert.equal(e.effectiveCard(plain,s).extraBreak??0,0);
});
