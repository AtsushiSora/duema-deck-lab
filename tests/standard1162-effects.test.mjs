import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const PROCYON='dmx01-021',PARABOLA='dm32-097',VANILLA='dmx22b-158';
const NATURE='dm01-108',AQUA='dm01-083',GONTA='dm10-068',EVO='dm10-017';
const LIFE='dm06-110',DESTROY='dm01-027';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url)));
const put=(s,p,z,id,fields={})=>{const x=Object.assign(inst(id),fields);s.players[p][z].push(x);return x;};
const pick=(s,wanted)=>act(s,'extended',a=>s.decision.choices[a.choice].value===(wanted?.uid??wanted));
const field=()=>{const s=setup();for(const p of [0,1])give(s,p,'deck',Array(20).fill(NATURE));return s;};
const charge=(s,id)=>{
 const x=put(s,s.active,'hand',id);
 s.phase='charge';
 act(s,'charge',a=>a.uid===x.uid);
};
const evolve=(s,base)=>{
 cast(s,EVO);
 act(s,'evolve',a=>a.baseUid===base.uid);
};

test('phase 1162 verifies three official definitions and the official reprint',()=>{
 const m=read('tools/support-phase-1162.json'),registry=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(x=>x.id),[PROCYON,PARABOLA,VANILLA]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[['dmx03-019',PROCYON]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1162}),row.spec);
  assert.deepEqual([c.type,c.cost,c.power,c.civilizations,c.race,c.manaValue,c.limit],
   [f.typeText==='呪文'?'spell':'creature',f.cost,Number(f.powerText),f.civilizations.filter(color=>color!=='無色'),f.race,1,4]);
  assert.equal(m.regulationVerification.limits[row.id],4);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.equal(registry.get(row.id).id,id);
  assert.equal(registry.byName.get(nameKey(row.name)).id,id);
  assert.ok(refs.some(x=>x.id===row.id&&x.canonicalId===id&&x.image===row.image));
  if(!row.canonicalId){
   assert.deepEqual(details.cards.find(x=>x.id===id).faces,row.faces);
   assert.equal(CARD_IMAGES[id],row.image);
  }
  assert.throws(()=>standardCardSpec({...row,status:'complete',faces:[{...f,abilityText:f.abilityText+'\n未知の能力。'}]},{phase:1162}));
 }
});

test('Procyon returns the same mana card and the return cannot trigger it again',()=>{
 const s=field(),mana=put(s,0,'mana',NATURE,{tapped:true});
 put(s,0,'battle',PROCYON);
 charge(s,AQUA);
 assert.equal(s.decision.source,PROCYON);
 pick(s,mana);
 assert.equal(s.players[0].mana.at(-1),mana);
 assert.equal(mana.tapped,false);
 assert.equal(mana.zoneSerial,2);
 assert.equal(s.decision,null);
 cast(s,LIFE);
 assert.equal(s.decision,null);
});

test('Procyon may decline and respects a lock on its graveyard',()=>{
 for(const locked of [false,true]){
  const s=field(),mana=put(s,0,'mana',NATURE,{tapped:true});
  put(s,0,'battle',PROCYON);
  if(locked)put(s,1,'battle','dmrp08-014');
  charge(s,AQUA);
  pick(s,locked?mana:null);
  assert.equal(s.players[0].mana.includes(mana),!locked);
  assert.equal(s.players[0].grave.includes(mana),locked);
  assert.equal(s.decision,null);
 }
});

test('Procyon sees each card in a simultaneous first placement',()=>{
 const s=field(),dragons=['dmr23-072','dmr23-060'];
 put(s,0,'battle',PROCYON);
 give(s,0,'deck',[...dragons,...Array(18).fill(NATURE)]);
 cast(s,'dmx11-012');
 const effects=e.getLegalActions(s).filter(a=>a.kind==='orderEffect'&&a.cardId===PROCYON);
 assert.equal(effects.length,2);
 act(s,'orderEffect',a=>a.cardId===PROCYON);pick(s,null);pick(s,null);
 assert.equal(s.decision,null);
 assert.deepEqual(s.players[0].mana.slice(-2).map(x=>x.cardId),dragons);
});

test('Procyon ignores later placements if it entered after the first one',()=>{
 const s=field();
 charge(s,NATURE);
 cast(s,PROCYON);cast(s,LIFE);
 assert.equal(s.decision,null);
});

test('Parabola takes one S-Trigger card from a bundle without exposing other cards',()=>{
 const s=field(),base=put(s,0,'battle',AQUA);
 put(s,0,'battle',PARABOLA);
 const nonTrigger=inst(NATURE),trigger=inst('dmrp06-s09');
 s.players[1].shields=[{...nonTrigger,shieldStack:[trigger]}];
 evolve(s,base);
 assert.equal(s.decision.choices.length,2);
 assert.ok(s.decision.choices.every(x=>!x.cardId));
 pick(s,trigger);
 assert.equal(s.players[1].grave.at(-1),trigger);
 assert.equal(s.players[1].shields[0].uid,nonTrigger.uid);
 assert.ok(!s.players[1].shields[0].faceUp);
 assert.equal(s.players[1].hand.length,0);
});

test('Parabola leaves a non-trigger face up and ignores non-evolution summons',()=>{
 const s=field(),base=put(s,0,'battle',AQUA);
 put(s,0,'battle',PARABOLA);
 cast(s,NATURE);
 assert.equal(s.decision,null);
 const shield=s.players[1].shields[0];
 evolve(s,base);pick(s,shield);
 assert.ok(shield.faceUp);
 assert.equal(s.players[1].shields.length,5);
 assert.equal(s.players[1].grave.length,0);
});

test('Parabola recognizes a trigger granted in the shield zone',()=>{
 const s=field(),base=put(s,0,'battle',AQUA);
 put(s,0,'battle',PARABOLA);
 put(s,1,'battle','dm22ex1-098');
 give(s,1,'shields',['dmx11-012']);
 const shield=s.players[1].shields[0];
 assert.equal(e.card(shield).type,'spell');
 assert.ok(!e.card(shield).trigger);
 evolve(s,base);pick(s,shield);
 assert.equal(s.players[1].grave.at(-1),shield);
});

test('Parabola excludes a trigger granted only when the shield goes to hand',()=>{
 const s=field(),base=put(s,0,'battle',AQUA);
 put(s,0,'battle',PARABOLA);
 give(s,1,'shields',['dm24rp2-S10']);
 const shield=s.players[1].shields[0];
 evolve(s,base);pick(s,shield);
 assert.ok(s.players[1].shields.includes(shield)&&shield.faceUp);
 assert.equal(s.players[1].grave.length,0);
});

test('Vanilla Zone reveals two cards and sends plain and printed abilities to their respective zones',()=>{
 const s=field();
 give(s,0,'deck',[DESTROY,GONTA,...Array(18).fill(NATURE)]);
 const [spell,vanilla]=s.players[0].deck;
 cast(s,VANILLA);drain(s);
 assert.equal(s.players[0].mana.at(-1),vanilla);
 assert.equal(vanilla.tapped,true);
 assert.ok(s.players[0].grave.includes(spell));
 assert.ok(s.log.some(x=>x.type==='reveal'&&JSON.stringify(x).includes('無頼勇騎ゴンタ')));
});

test('Vanilla Zone commits both matching mana cards together and honors ramp replacement',()=>{
 for(const redirect of [false,true]){
  const s=field();
  put(s,0,'battle',PROCYON);
  if(redirect)put(s,1,'battle','dm22ex1-086');
  give(s,0,'deck',[NATURE,AQUA,...Array(18).fill(NATURE)]);
  const selected=s.players[0].deck.slice(0,2);
  cast(s,VANILLA);
  if(!redirect){
   assert.equal(e.getLegalActions(s).filter(a=>a.kind==='orderEffect'&&a.cardId===PROCYON).length,2);
   assert.deepEqual(s.players[0].mana.slice(-2),selected);
  }else{
   assert.equal(s.decision,null);
   assert.ok(selected.every(x=>s.players[0].grave.includes(x)));
  }
  drain(s);
 }
});
