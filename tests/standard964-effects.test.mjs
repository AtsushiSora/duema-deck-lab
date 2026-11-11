import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,cast,drain,PRESETS,GEN} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const GATE='dmc57-007',VICE='dm08-014',MAGICIAN='dm10-018';
const PLAIN='dm01-108',BERRY='dm10-107',GIGA='dm10-051',GOD='dm26rp1-009';
const METAL='dmex17-059',HEAVY='dmex17-033',TOO_COSTLY='dmrp20-km2',DOOM='dm01-027',BOUNCE='dm01-086';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const choices=s=>(s.decision?.choices??[]).map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>choices(s)[a.choice]===(value?.uid??value));
const zone=(s,p,z)=>s.players[p][z].map(x=>x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();

function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1]){give(s,p,'deck',Array(16).fill(PLAIN));give(s,p,'grave',[]);}
 return s;
}

function put(s,p,z,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][z].push(x);
 return x;
}

test('Phase 964 keeps three canonical IDs, both Gate reprints, and the Premium Hall of Fame limit',()=>{
 const m=read('tools/support-phase-964.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(r=>r.id),[GATE,VICE,MAGICIAN]);
 assert.deepEqual(m.printAliases.map(r=>[r.id,r.canonicalId]),[['dmx14-017',GATE],['dmex15-b052',GATE]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0],d={...row,status:'complete'};
  const canonical=m.cards.find(r=>r.id===id),limit=id===VICE?0:4;
  assert.deepEqual(standardCardSpec(d,{phase:964}),canonical.spec);
  assert.throws(()=>standardCardSpec(d,{phase:963}));
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'未知の能力。'}]},{phase:964}));
  for(const [key,value] of Object.entries(canonical.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.cost,c.race,e.civilizations(c),c.manaValue,c.limit],
   [f.cost,f.race,f.civilizations,1,limit]);
  assert.equal(c.supportBatch,'phase-964');
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[row.id],limit);
  assert.deepEqual(refs.filter(r=>r.id===row.id).map(r=>[r.canonicalId,r.image]),[[id,row.image]]);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(r=>nameKey(r.name)===nameKey(row.name)).map(r=>r.id),[id]);
 }
 const deck=structuredClone(PRESETS[0]);
 deck.cards[0].id=VICE;
 assert.ok(e.validateDeck(deck).some(error=>error.includes('スケルトン・バイス')));
});

for(const origin of ['grave','mana'])test('Gate selects one eligible God across both own zones and resumes from JSON '+origin,()=>{
 let s=field(),spell=put(s,0,'hand',GATE),grave=put(s,0,'grave',GOD),mana=put(s,0,'mana',METAL);
 const hidden=put(s,0,'mana',GOD,{faceDown:true}),expensive=put(s,0,'grave',TOO_COSTLY);
 const enemy=put(s,1,'grave',GOD),nonGod=put(s,0,'grave',PLAIN);
 const before=physical(s),chosen=origin==='grave'?grave:mana,other=origin==='grave'?mana:grave;
 act(s,'play',a=>a.uid===spell.uid);
 assert.deepEqual(choices(s),[grave.uid,mana.uid]);
 s=restore(s);pick(s,chosen);drain(s);
 assert.ok(zone(s,0,'battle').includes(chosen.uid));
 assert.ok(zone(s,0,origin==='grave'?'mana':'grave').includes(other.uid));
 assert.ok(zone(s,0,'mana').includes(hidden.uid));
 assert.ok(zone(s,0,'grave').includes(nonGod.uid)&&zone(s,0,'grave').includes(expensive.uid));
 assert.ok(zone(s,1,'grave').includes(enemy.uid));
 assert.equal(s.players[0].battle.find(x=>x.uid===chosen.uid).summonedTurn,undefined);
 assert.deepEqual(physical(s),before);
});

test('Gate uses existing God Link when Metal enters from the grave',()=>{
 const s=field(),heav=put(s,0,'battle',HEAVY),metal=put(s,0,'grave',METAL);
 cast(s,GATE);
 pick(s,metal);
 assert.equal(s.decision?.task?.op,'g31_Link');
 pick(s,heav);
 drain(s);
 assert.equal(s.players[0].battle.length,1);
 const [top]=s.players[0].battle;
 assert.deepEqual([top,...top.godLinks].map(x=>x.uid).sort(),[heav.uid,metal.uid].sort());
});

test('Gate is put into mana tapped, and casting it with no eligible God ends normally',()=>{
 const s=field(),mana=put(s,0,'hand',GATE);
 s.phase='charge';act(s,'charge',a=>a.uid===mana.uid);
 assert.ok(s.players[0].mana.find(x=>x.uid===mana.uid).tapped);
 cast(s,GATE);
 assert.equal(s.decision,null);
 assert.equal(s.players[0].battle.length,0);
});

test('Vice offers only facedown positions and discards both selected cards together after JSON restore',()=>{
 let s=field(),spell=put(s,0,'hand',VICE),own=put(s,0,'hand',PLAIN);
 const a=put(s,1,'hand',METAL),b=put(s,1,'hand',HEAVY),c=put(s,1,'hand',GIGA);
 const before=physical(s);
 act(s,'play',x=>x.uid===spell.uid);
 assert.deepEqual(choices(s),[0,1,2]);
 assert.ok(s.decision.choices.every(x=>!x.cardId&&x.label.includes('裏向き')));
 pick(s,0);
 assert.deepEqual(zone(s,1,'hand'),[a.uid,b.uid,c.uid]);
 assert.deepEqual(zone(s,1,'grave'),[]);
 assert.deepEqual(choices(s),[1,2]);
 const observation=JSON.stringify(e.observation(s,0));
 for(const x of [a,b,c]){
  assert.ok(!observation.includes(x.cardId));
  assert.ok(!observation.includes(x.uid));
 }
 s=restore(s);pick(s,2);
 assert.deepEqual(zone(s,1,'hand'),[b.uid]);
 assert.deepEqual(zone(s,1,'grave'),[a.uid,c.uid]);
 assert.deepEqual(zone(s,0,'hand'),[own.uid]);
 assert.deepEqual(physical(s),before);
});

for(const count of [0,1])test('Vice resolves with an opponent hand of size '+count,()=>{
 const s=field();
 const victim=count?put(s,1,'hand',GIGA):null;
 cast(s,VICE);
 assert.equal(s.decision,null);
 assert.deepEqual(zone(s,1,'hand'),[]);
 assert.deepEqual(zone(s,1,'grave'),victim?[victim.uid]:[]);
});

test('Magician taps only the controller’s entering Silent Skill creatures, including a later summon',()=>{
 const s=field(),magician=put(s,0,'hand',MAGICIAN),berry=put(s,0,'hand',BERRY),plain=put(s,0,'hand',PLAIN);
 act(s,'play',a=>a.uid===magician.uid);
 act(s,'play',a=>a.uid===berry.uid);
 act(s,'play',a=>a.uid===plain.uid);
 assert.deepEqual(s.players[0].battle.map(x=>[x.uid,x.tapped]),[[magician.uid,false],[berry.uid,true],[plain.uid,false]]);
 s.active=1;s.phase='main';
 const opposing=put(s,1,'hand',BERRY);
 act(s,'play',a=>a.uid===opposing.uid);
 assert.equal(s.players[1].battle[0].tapped,false);
 s.phase='attack';act(s,'endTurn');
 assert.equal(s.decision?.type,'silent496');
 assert.equal(s.decision?.uid,berry.uid);
 act(s,'silent496',a=>a.yes);
 assert.equal(s.players[0].mana.length,51);
 assert.equal(s.players[0].battle.find(x=>x.uid===berry.uid).tapped,true);
});

for(const mode of ['protect','absent','suppressed','ordinary','bounce'])test('Magician applies the hand replacement to destruction of active Silent Skill allies '+mode,()=>{
 const s=field(1);
 if(mode!=='absent')put(s,0,'battle',MAGICIAN);
 if(mode==='suppressed')put(s,0,'battle',GEN);
 const victim=put(s,0,'battle',mode==='ordinary'?PLAIN:BERRY);
 cast(s,mode==='bounce'?BOUNCE:DOOM);
 act(s,'effect',a=>a.targets?.some(x=>x.uid===victim.uid));
 drain(s);
 assert.ok(zone(s,0,mode==='protect'||mode==='bounce'?'hand':'grave').includes(victim.uid));
});
