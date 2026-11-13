import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const TROOPER='promoy14-047',DECALPA='dmx23-044',KENKI='sp-035';
const FIRE='dm01-097',DARK='dm01-090',NATURE='dm01-108',WATER='dm01-083';
const DESTROY='dm01-027',BOUNCE='dm01-086',FIGHT='dmrp19-085';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url)));
const put=(s,p,zone,id,attrs)=>{const x=Object.assign(inst(id),attrs);s.players[p][zone].push(x);return x;};
const play=(s,id)=>{const x=put(s,s.active,'hand',id);act(s,'play',a=>a.uid===x.uid);return x;};
const values=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);
const field=()=>{const s=setup();for(const p of [0,1])give(s,p,'deck',Array(18).fill(NATURE));return s;};
const seal=(s,p,host,id)=>{host.sealed=true;return put(s,p,'seals',id,{faceDown:true,sealOf:host.uid});};
const target=(s,x)=>act(s,'effect',a=>a.targets[0]?.uid===x.uid);

test('phase 1156 verifies three official definitions and both Trooper print aliases',()=>{
 const m=read('tools/support-phase-1156.json'),registry=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(x=>x.id),[TROOPER,DECALPA,KENKI]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[['dmr19-043',TROOPER],['dmx23-046',TROOPER]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1156}),row.spec);
  assert.deepEqual([c.type,c.cost,c.power,c.civilizations,c.race,c.manaValue,c.limit],
   ['creature',f.cost,parseInt(f.powerText,10),f.civilizations,f.race,1,4]);
  assert.equal(m.regulationVerification.limits[row.id],4);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.equal(registry.get(row.id).id,id);
  assert.equal(registry.byName.get(nameKey(row.name)).id,id);
  assert.ok(refs.some(x=>x.id===row.id&&x.canonicalId===id&&x.image===row.image));
  if(!row.canonicalId){
   assert.deepEqual(details.cards.find(x=>x.id===id).faces,row.faces);
   assert.equal(CARD_IMAGES[id],row.image);
  }
  const modified={...row,status:'complete',faces:[{...f,abilityText:f.abilityText+'\n未知の能力。'}]};
  assert.throws(()=>standardCardSpec(modified,{phase:1156}));
 }
});

test('Trooper can send an owned seal on a non-fire host to the grave',()=>{
 const s=field(),trooper=put(s,0,'battle',TROOPER);
 const first=seal(s,0,put(s,0,'battle',WATER),DARK),other=seal(s,0,put(s,0,'battle',FIRE),NATURE);
 const enemy=seal(s,1,put(s,1,'battle',FIRE),WATER);
 attack(s,trooper.uid);
 assert.deepEqual(values(s),[first.uid,other.uid]);
 assert.ok(s.decision.choices.every(x=>!x.cardId));
 pick(s,first.uid);
 assert.ok(s.players[0].grave.includes(first)&&!first.faceDown);
 assert.deepEqual(s.players[0].seals,[other]);
 assert.deepEqual(s.players[1].seals,[enemy]);
});

test('Decalpa draws from its own Command entry seal, as in QA 37855',()=>{
 const s=field(),first=seal(s,0,put(s,0,'battle',FIRE),NATURE);
 const wrong=seal(s,0,put(s,0,'battle',WATER),DARK);
 const top=s.players[0].deck[0];
 play(s,DECALPA);
 assert.equal(s.decision.task.op,'g23_Unseal');
 assert.deepEqual(values(s),[first.uid]);
 pick(s,first.uid);
 assert.equal(s.decision.task.op,'g34_Draw');
 assert.deepEqual(values(s),[0,1]);
 pick(s,1);
 assert.deepEqual(s.players[0].hand,[top]);
 assert.deepEqual(s.players[0].grave,[first]);
 assert.deepEqual(s.players[0].seals,[wrong]);
});

test('Decalpa chooses two seals before moving them and offers one draw per seal',()=>{
 const s=field(),decalpa=put(s,0,'battle',DECALPA);
 const host=put(s,0,'battle',DARK);
 const first=seal(s,0,host,WATER),second=seal(s,0,host,FIRE),third=seal(s,0,host,NATURE);
 attack(s,decalpa.uid);
 assert.deepEqual(values(s),[first.uid,second.uid,third.uid]);
 pick(s,first.uid);
 assert.deepEqual(values(s),[second.uid,third.uid]);
 assert.equal(s.players[0].grave.length,0);
 pick(s,third.uid);
 assert.deepEqual(s.players[0].grave,[first,third]);
 assert.deepEqual(s.players[0].seals,[second]);
 act(s,'orderEffect');
 pick(s,1);
 pick(s,0);
 assert.equal(s.players[0].hand.length,1);
});

test('Decalpa moves the last available seal without triggering a just-unsealed Decalpa',()=>{
 const s=field(),attacker=put(s,0,'battle',DECALPA),covered=put(s,0,'battle',DECALPA);
 const only=seal(s,0,covered,NATURE);
 attack(s,attacker.uid);
 assert.deepEqual(s.players[0].grave,[only]);
 assert.equal(covered.sealed,undefined);
 pick(s,1);
 assert.equal(s.players[0].hand.length,1);
 assert.equal(s.decision?.task?.op,undefined);
});

test('Decalpa has no draw for an opponent seal or when no seal can be moved',()=>{
 const s=field(),decalpa=put(s,0,'battle',DECALPA);
 const enemy=seal(s,1,put(s,1,'battle',FIRE),DARK);
 attack(s,decalpa.uid);
 assert.equal(s.players[0].hand.length,0);
 assert.deepEqual(s.players[1].seals,[enemy]);
 assert.equal(s.decision?.task?.op,undefined);
});

test('Kenki returns before selecting a mandatory discard from the updated hand',()=>{
 const s=field(),kenki=put(s,1,'battle',KENKI),other=put(s,1,'hand',FIRE);
 play(s,DESTROY);target(s,kenki);
 act(s,'returnDiscard1156');
 assert.deepEqual(s.players[1].hand,[other,kenki]);
 assert.equal(s.decision.player,1);
 assert.deepEqual(values(s),[other.uid,kenki.uid]);
 pick(s,other.uid);
 assert.deepEqual(s.players[1].grave,[other]);
 assert.deepEqual(s.players[1].hand,[kenki]);
});

test('Kenki can discard itself after replacing battle destruction with an empty hand',()=>{
 const s=field(),kenki=put(s,1,'battle',KENKI);
 const stronger=put(s,0,'battle',DECALPA);
 play(s,FIGHT);pick(s,stronger.uid);pick(s,kenki.uid);
 act(s,'returnDiscard1156');
 assert.deepEqual(values(s),[kenki.uid]);
 pick(s,kenki.uid);
 assert.deepEqual(s.players[1].grave,[kenki]);
 assert.equal(s.battleResolution,null);
});

test('Kenki can decline the replacement and a bounce has no discard',()=>{
 for(const id of [DESTROY,BOUNCE]){
  const s=field(),kenki=put(s,1,'battle',KENKI),other=put(s,1,'hand',FIRE);
  play(s,id);target(s,kenki);
  if(id===DESTROY)act(s,'allowLeave');
  assert.equal(s.decision,null);
  assert.ok(s.players[1].hand.includes(other));
  assert.ok(s.players[1][id===DESTROY?'grave':'hand'].includes(kenki));
 }
});
