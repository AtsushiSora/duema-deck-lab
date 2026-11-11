import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const JACKPOT='dmr15-016',ANTHEM='dmr15-022',PSY='dmr15-s02';
const PRINTS=['dmx26-043','dmex12-039','dmex16-050','dm25sp1-011','dm26ex5-DP014','promoy13-058','promoy21-063'].map(id=>[id,JACKPOT]);
const LIGHT='dm01-075',FIRE='dm01-097',NATURE='dm01-108',WATER='dm01-083';
const BOLSHACK='dm01-008',MULTI='dm25bd3-020',TWIN='dmex04-027',GAI='dmr14-v02',EVO='dm27-007';
const ESPOIR='dmr13-001',LOCK='dmx11-009',BOUNCE='dm01-086';
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

test('Phase 997 registers three official definitions and maps seven reprints to their canonical IDs',()=>{
 const m=read('tools/support-phase-997.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[JACKPOT,ANTHEM,PSY]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),PRINTS);
 assert.deepEqual(catalogue.resolveRows(PRINTS.map(([id])=>({id,count:1}))),
  [{id:JACKPOT,count:7}]);
 for(const row of m.cards){
  const {id,name,faces}=row,[f]=faces,d=details.cards.find(x=>x.id===id),c=e.card(id);
  assert.deepEqual(faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:997}),row.spec);
  const altered=structuredClone(d);
  altered.faces[0].abilityText+='未知の追加能力。';
  assert.throws(()=>standardCardSpec(altered,{phase:997}));
  for(const [key,v] of Object.entries(row.spec))assert.deepEqual(c[key],v);
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [name,f.typeText==='呪文'?'spell':'creature',f.cost,Number(f.powerText),f.race,f.civilizations.filter(color=>color!=='無色'),1,4]);
  assert.equal(c.supportBatch,'phase-997');
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
  if(row.canonicalId)assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:997}),m.cards.find(x=>x.id===row.canonicalId).spec);
 }
});

const ids=rows=>rows.map(x=>x.uid);
const bottom=(s,n)=>ids(s.players[0].deck.slice(-n));

function dragonMana(s,p,count){
 for(const id of [BOLSHACK,TWIN,MULTI].slice(0,count))put(s,p,'mana',id,{tapped:true});
 put(s,p,'mana',GAI,{faceDown:true});
}

test('Jackpot privately inspects the number of face-up mana Dragons and deploys one eligible creature',()=>{
 let s=field();
 dragonMana(s,0,3);dragonMana(s,1,3);
 give(s,0,'deck',[GAI,EVO,TWIN,ESPOIR,...Array(10).fill(NATURE)]);
 const [expensive,evolution,twin,outside]=s.players[0].deck;
 const before=physical(s),spell=play(s,JACKPOT);
 assert.deepEqual(s.decision.task.g585Peek.map(x=>x.id),[GAI,EVO,TWIN]);
 assert.deepEqual(choices(s),[twin.uid,null]);
 assert.ok(!s.log.some(r=>r.type==='reveal'&&[GAI,EVO,TWIN].includes(r.cardId)));
 pick(s,twin.uid);s=restore(s);
 assert.deepEqual(choices(s),[expensive.uid,evolution.uid]);
 pick(s,evolution.uid);
 assert.deepEqual(bottom(s,2),[evolution.uid,expensive.uid]);
 assert.equal(s.players[0].deck[0].uid,outside.uid);
 assert.ok(has(s,0,'battle',twin));
 assert.deepEqual(physical(s).filter(uid=>uid!==spell.uid),before);
});

test('Jackpot can decline a legal Dragon and sends all inspected cards to the chosen bottom order',()=>{
 const s=field();dragonMana(s,0,2);
 give(s,0,'deck',[BOLSHACK,WATER,NATURE,FIRE]);
 const [dragon,water,next]=s.players[0].deck;
 play(s,JACKPOT);
 pick(s,null);pick(s,water.uid);
 assert.equal(s.players[0].deck[0].uid,next.uid);
 assert.deepEqual(bottom(s,2),[water.uid,dragon.uid]);
 assert.equal(s.players[0].battle.length,0);
});

test('Anthem chooses exactly one card, including a spell, and orders the other cards',()=>{
 let s=field();dragonMana(s,0,3);
 give(s,0,'deck',[FIRE,BOUNCE,WATER,ESPOIR,...Array(8).fill(NATURE)]);
 const [fire,spell,water,outside]=s.players[0].deck;
 play(s,ANTHEM);
 assert.deepEqual(choices(s),[fire.uid,spell.uid,water.uid]);
 pick(s,spell.uid);s=restore(s);
 assert.deepEqual(choices(s),[fire.uid,water.uid]);
 pick(s,water.uid);
 assert.equal(s.players[0].deck[0].uid,outside.uid);
 assert.deepEqual(bottom(s,2),[water.uid,fire.uid]);
 assert.equal(s.players[0].shields.length,6);
 assert.ok(!s.players[0].shields.find(x=>x.uid===spell.uid).faceUp);
});

test('Neither dragon-count spell looks at a card when only the opponent has face-up Dragons',()=>{
 for(const spell of [JACKPOT,ANTHEM]){
  const s=field();dragonMana(s,0,0);dragonMana(s,1,3);
  give(s,0,'deck',[BOLSHACK,...Array(8).fill(NATURE)]);
  const before=ids(s.players[0].deck);
  play(s,spell);
  assert.equal(s.decision,null);
  assert.deepEqual(ids(s.players[0].deck),before);
  assert.equal(s.players[0].shields.length,5);
  assert.equal(s.players[0].battle.length,0);
 }
});

test('Psychedelica publicly reveals four, opponent chooses a spell, and caster orders the rest first',()=>{
 let s=field();
 give(s,0,'deck',[WATER,BOUNCE,TWIN,FIRE,...Array(9).fill(NATURE)]);
 const [water,bounce,twin,fire]=s.players[0].deck;
 const foe=put(s,1,'battle',FIRE),x=play(s,PSY);
 assert.equal(e.effectiveCard(x,s).breaker,2);
 assert.equal(s.decision.player,1);
 assert.deepEqual(choices(s),[bounce.uid,twin.uid]);
 assert.deepEqual(s.decision.choices.map(c=>c.value.face),[0,1]);
 assert.ok(s.log.some(r=>r.type==='reveal'&&r.cardId===PSY&&[WATER,BOUNCE,TWIN,FIRE].every(id=>r.text.includes(e.card(id).name))));
 pick(s,bounce.uid);s=restore(s);
 assert.equal(s.decision.player,0);
 assert.deepEqual(choices(s),[water.uid,twin.uid,fire.uid]);
 assert.ok(has(s,0,'deck',bounce));
 pick(s,fire.uid);pick(s,twin.uid);
 assert.deepEqual(bottom(s,3),[fire.uid,twin.uid,water.uid]);
 act(s,'effect',a=>a.targets.some(t=>t.uid===foe.uid));
 assert.ok(has(s,0,'grave',bounce)&&has(s,1,'hand',foe));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,7);
});

test('Psychedelica leaves a chosen but prohibited spell at the top after ordering the other three',()=>{
 const s=field();put(s,1,'battle',LOCK);
 give(s,0,'deck',[FIRE,NATURE,BOUNCE,WATER,...Array(9).fill(NATURE)]);
 const [fire,nature,spell,water]=s.players[0].deck;
 play(s,PSY);
 assert.equal(s.decision.player,1);
 assert.deepEqual(choices(s),[spell.uid]);
 pick(s,spell.uid);pick(s,water.uid);pick(s,nature.uid);
 assert.equal(s.decision,null);
 assert.equal(s.players[0].deck[0].uid,spell.uid);
 assert.deepEqual(bottom(s,3),[water.uid,nature.uid,fire.uid]);
 assert.ok(!has(s,0,'grave',spell));
 assert.equal(s.players[0].g34Protected.length,0);
});

test('Psychedelica observes another Command Dragon entering by summon and ignores an effect deployment',()=>{
 for(const mode of ['command','ordinary','effect']){
  const s=field();put(s,0,'battle',PSY);
  give(s,0,'deck',[ESPOIR,BOUNCE,...Array(9).fill(NATURE)]);
  if(mode==='effect'){
   dragonMana(s,0,1);const dragon=s.players[0].deck[0];
   play(s,JACKPOT);pick(s,dragon.uid);drain(s);
   assert.ok(has(s,0,'battle',dragon));
  }else play(s,mode==='command'?ESPOIR:BOLSHACK);
  assert.equal(s.log.filter(r=>r.type==='reveal'&&r.cardId===PSY).length,mode==='command'?1:0);
  assert.equal(s.decision?.player,mode==='command'?1:undefined);
 }
});

test('Psychedelica puts all revealed cards on the bottom when none is a spell',()=>{
 const s=field();give(s,0,'deck',[FIRE,WATER,NATURE,LIGHT,...Array(8).fill(FIRE)]);
 const [fire,water,nature,light]=s.players[0].deck;
 play(s,PSY);
 assert.equal(s.decision.player,0);
 pick(s,light.uid);pick(s,water.uid);pick(s,nature.uid);
 assert.deepEqual(bottom(s,4),[light.uid,water.uid,nature.uid,fire.uid]);
 assert.equal(s.decision,null);
});

test('Casting the last library card via Psychedelica loses before the spell resolves',()=>{
 const s=field();give(s,0,'deck',[BOUNCE]);const foe=put(s,1,'battle',FIRE),spell=s.players[0].deck[0];
 play(s,PSY);pick(s,spell.uid);
 assert.equal(s.winner,1);
 assert.ok(has(s,1,'battle',foe));
});
