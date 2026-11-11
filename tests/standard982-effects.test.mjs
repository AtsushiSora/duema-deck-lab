import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const GAGA='dmx05-s01',GIO='dmx05-014',HOWL='dmr15-014',HEIKE='dmx05-005';
const GIO_PRINT='dmx12a-035',HEIKE_PRINTS=['dmd06-010','dmx20-035'];
const ZABI='dmx05-006',REX='dmr15-018',DRAGON_TWIN='dm22ex1-030';
const SWORD='dmx16-029',NATURE='dm01-108',FIRE='dm01-097',WATER='dm01-083';
const TRIGGER='dm01-027',SURFER='dm05-024';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const value=c=>c.value?.uid??c.value;
const choices=s=>s.decision.choices.map(value);
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);

function field(){
 const s=setup();
 for(const p of [0,1]){give(s,p,'deck',Array(20).fill(NATURE));give(s,p,'grave',[]);}
 return s;
}

function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}

function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}

test('Phase 982 registers four canonical cards and resolves three reprints to their original IDs',()=>{
 const m=read('tools/support-phase-982.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[GAGA,GIO,HOWL,HEIKE]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[[GIO_PRINT,GIO],...HEIKE_PRINTS.map(id=>[id,HEIKE])]);
 assert.deepEqual(catalogue.resolveRows([{id:GIO_PRINT,count:2},...HEIKE_PRINTS.map(id=>({id,count:1}))]),
  [{id:GIO,count:2},{id:HEIKE,count:2}]);
 for(const row of m.cards){
  const {id,name,faces}=row,[f]=faces,d=details.cards.find(x=>x.id===id),c=e.card(id);
  assert.deepEqual(faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:982}),row.spec);
  const altered=structuredClone(d);
  altered.faces[0].abilityText+='未知の追加能力。';
  assert.throws(()=>standardCardSpec(altered,{phase:982}));
  for(const [key,v] of Object.entries(row.spec))assert.deepEqual(c[key],v);
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [name,id===HOWL?'spell':'creature',f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-982');
  assert.equal(CARD_IMAGES[id],row.image);
  assert.ok(catalogue.get(id).supported);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
 }
 for(const row of [...m.cards,...m.printAliases]){
  assert.ok(row.verification.facesMatched);
  assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[row.canonicalId??row.id,row.image]]);
  if(row.canonicalId)assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:982}),m.cards.find(x=>x.id===row.canonicalId).spec);
 }
});

test('Gaga evolves on an Alien and breaks three shields immediately',()=>{
 const s=field(),alien=put(s,0,'battle',HEIKE),wrong=put(s,0,'battle',NATURE);
 const gaga=play(s,GAGA),all=physical(s);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[alien.uid]);
 act(s,'evolve',a=>a.baseUid===alien.uid);
 assert.ok(gaga.under.some(x=>x.uid===alien.uid)&&has(s,0,'battle',wrong));
 attack(s,gaga.uid);
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,2);
 assert.deepEqual(physical(s),all);
});

test('Gaga prevents opposing spell casting until a live Alien is controlled by that player',()=>{
 let s=field();
 const gaga=put(s,0,'battle',GAGA),spell=put(s,1,'hand',SWORD),creature=put(s,1,'hand',FIRE);
 const alienUnder=put(s,1,'battle',NATURE,{under:[inst(HEIKE)]});
 const alien=put(s,1,'battle',HEIKE,{sealed:true});
 put(s,1,'seals',FIRE,{sealOf:alien.uid,faceDown:true});
 s.active=1;
 const canPlay=(uid)=>e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===uid);
 assert.ok(!canPlay(spell.uid)&&canPlay(creature.uid));
 assert.ok(e.canCastSpell(s,0,e.card(SWORD),'grave'));
 assert.ok(!e.canCastSpell(s,1,e.card(SWORD),'grave'));
 s=restore(s);
 const live=put(s,1,'battle',GIO);
 assert.ok(canPlay(spell.uid));
 s.players[1].battle.splice(s.players[1].battle.indexOf(live),1);
 assert.ok(!canPlay(spell.uid));
 s.players[0].battle=s.players[0].battle.filter(x=>x.uid!==gaga.uid);
 assert.ok(canPlay(spell.uid)&&has(s,1,'battle',alienUnder));
});

test('Gaga stops opposing spell S-Triggers but allows creature S-Triggers',()=>{
 for(const id of [TRIGGER,SURFER]){
  const s=field(),gaga=put(s,0,'battle',GAGA);
  give(s,1,'shields',[id]);
  attack(s,gaga.uid);
  act(s,'noBlock');
  assert.equal(e.getLegalActions(s).some(a=>a.kind==='useTrigger'),id===SURFER);
 }
});

test('Gio Horn reveals one matching Alien and shuffles the remaining library after JSON continuation',()=>{
 let s=field();
 give(s,0,'deck',[NATURE,FIRE,HEIKE,TRIGGER,ZABI,WATER,NATURE]);
 const first=s.players[0].deck[2],second=s.players[0].deck[4],rng=s.rng;
 const gio=play(s,GIO),all=physical(s);
 assert.equal(s.decision.task.op,'g34_LookPick');
 assert.deepEqual(choices(s),[first.uid,second.uid,null]);
 assert.ok(!s.log.some(x=>x.type==='reveal'&&x.cardId===HEIKE));
 s=restore(s);
 pick(s,first.uid);
 assert.ok(has(s,0,'hand',first)&&has(s,0,'deck',second)&&has(s,0,'battle',gio));
 assert.ok(s.log.some(x=>x.type==='reveal'&&x.cardId===HEIKE));
 assert.notEqual(s.rng,rng);
 assert.deepEqual(physical(s),all);
});

test('Gio Horn shuffles after declining and when the library has no Alien',()=>{
 for(const found of [true,false]){
  const s=field();
  give(s,0,'deck',[FIRE,WATER,NATURE,found?HEIKE:TRIGGER,NATURE]);
  const before=s.players[0].deck.map(x=>x.uid).sort(),rng=s.rng;
  play(s,GIO);
  if(found)pick(s,null);
  assert.equal(s.decision,null);
  assert.equal(s.players[0].hand.length,0);
  assert.notEqual(s.rng,rng);
  assert.deepEqual(s.players[0].deck.map(x=>x.uid).sort(),before);
 }
});

test('Howl counts only visible Dragon creatures in the caster mana and fixes one target’s reduction',()=>{
 let s=field();
 const twin=e.playFaces(e.card(DRAGON_TWIN));
 assert.ok(twin.some(c=>c.type==='creature'&&c.race.includes('ドラゴン'))&&twin.some(c=>c.type==='spell'));
 put(s,0,'mana',REX,{tapped:true});
 put(s,0,'mana',DRAGON_TWIN);
 put(s,0,'mana',REX,{faceDown:true});
 put(s,1,'mana',REX);
 put(s,0,'battle',REX);
 const foe=put(s,1,'battle',REX),unselected=put(s,1,'battle',ZABI);
 put(s,1,'battle',HEIKE);
 const howl=play(s,HOWL),all=physical(s);
 assert.deepEqual(choices(s),[foe.uid,unselected.uid]);
 s=restore(s);
 pick(s,foe.uid);
 const live=()=>s.players[1].battle.find(x=>x.uid===foe.uid);
 assert.equal(e.power(live(),false,s),3000);
 assert.equal(e.power(s.players[1].battle.find(x=>x.uid===unselected.uid),false,s),5000);
 const later=put(s,0,'mana',REX);
 assert.equal(e.power(live(),false,s),3000);
 assert.ok(has(s,0,'grave',howl));
 assert.deepEqual(physical(s).filter(uid=>uid!==later.uid),all);
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
 assert.equal(e.power(live(),false,s),5000);
});

test('Howl with no Dragons causes no loss of power, and lethal reduction uses rule destruction',()=>{
 for(const count of [0,2]){
  const s=field(),foe=put(s,1,'battle',FIRE),allied=put(s,0,'battle',FIRE);
  assert.ok(e.power(foe,false,s)>0&&e.power(foe,false,s)<=2000);
  for(let i=0;i<count;i++)put(s,0,'mana',REX);
  const howl=play(s,HOWL);
  if(s.decision)pick(s,foe.uid);
  drain(s);
  assert.ok(has(s,1,count?'grave':'battle',foe)&&has(s,0,'battle',allied)&&has(s,0,'grave',howl));
 }
});

test('HEIKE is excluded from opposing effect selection but is selectable by its controller',()=>{
 const s=field(),mine=put(s,0,'battle',HEIKE),theirs=put(s,1,'battle',HEIKE),enemy=put(s,1,'battle',FIRE);
 play(s,SWORD);
 assert.deepEqual(new Set(choices(s)),new Set([mine.uid,enemy.uid]));
 pick(s,mine.uid);
 assert.ok(has(s,0,'hand',mine)&&has(s,1,'battle',theirs));
});

test('HEIKE can block and be attacked, and can attack creatures but cannot attack players',()=>{
 const s=field(),heike=play(s,HEIKE),enemy=put(s,1,'battle',FIRE,{tapped:true});
 heike.entered=0;
 s.phase='attack';
 const attacks=e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===heike.uid);
 assert.deepEqual(attacks.map(a=>a.target),[enemy.uid]);
 s.active=1;
 enemy.tapped=false;
 attack(s,enemy.uid);
 act(s,'block',a=>a.uid===heike.uid);
 drain(s);
 assert.ok(has(s,1,'grave',enemy)&&has(s,0,'battle',heike)&&heike.tapped);
 const attacker=put(s,1,'battle',FIRE);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===attacker.uid&&a.target===heike.uid));
});
