import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,setup,give,inst,act,cast,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const GUARD='dm38-043',DARK='dm36-026',SKULL='dm37-044',VY='dm39-006';
const LAND='dm01-108',WATER='dm01-083',FIRE='dm01-097',LIGHT='dm01-075',SPELL='dm01-086';
const EVO='dm02-033',NEO='dm25rp2-012',TWIN='dm24bd4-007',QX='dmrp07-m01',TSU='dmrp22-030';
function put(s,p,z,id){const x=inst(id);s.players[p][z].push(x);return x;}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const choices=s=>s.decision.choices.map(o=>o.value?.uid??o.value);
function pick(s,v){act(s,'extended',a=>choices(s)[a.choice]===v);}
const resume=s=>JSON.parse(JSON.stringify(s));
const ids=rows=>rows.map(x=>x.uid);
const physical=s=>ids(e.physicalCards(s)).sort();
function deploy(s,p,...rows){
 s.phase='main';
 s.extTasks=rows.map(x=>({op:'g34_Put',source:VY,p,target:x.uid,origin:'hand'}));
 act(s,'toAttack');
}
function end(s){s.phase='attack';act(s,'endTurn');}
function selectEnd(s,x){act(s,'orderEffect',a=>a.uid===x.uid);}

test('Phase 834 pins the full official text, limits, and image of each unique card',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-834.json',import.meta.url)));
 assert.deepEqual(m.cards.map(x=>x.id),[GUARD,DARK,SKULL,VY]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),f=d.faces[0];
  assert.deepEqual(row.faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:834}),row.spec);
  assert.deepEqual([c.name,c.cost,c.power,c.race,c.manaValue,c.limit],[f.name,f.cost,Number(f.powerText),f.race,1,4]);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(data.cards.filter(x=>x.name===c.name).length,1);
  const unknown=structuredClone(d);unknown.faces[0].abilityText+='未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:834}));
 }
});

for(const owner of [0,1])test('Guard Vision privately reorders only the chosen library '+owner,()=>{
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',[LAND,WATER,FIRE,LIGHT]);
 const original=s.players.map(p=>ids(p.deck));
 const [a,b,c,d]=original[owner],spell=put(s,0,'hand',GUARD),before=physical(s);
 act(s,'play',action=>action.uid===spell.uid);
 assert.deepEqual(choices(s),[0,1]);
 pick(s,owner);
 assert.equal(s.decision.player,0);
 assert.deepEqual(choices(s),[a,b,c]);
 assert.ok(!s.log.some(x=>x.type==='reveal'));
 pick(s,c);
 const saved=resume(s);
 assert.deepEqual(choices(saved),[a,b]);
 pick(saved,a);
 assert.deepEqual(ids(saved.players[owner].deck),[c,a,b,d]);
 assert.deepEqual(ids(saved.players[1-owner].deck),original[1-owner]);
 assert.deepEqual(saved.players[owner].g34Protected,[]);
 assert.deepEqual(physical(saved),before);
});

test('Guard Vision handles one available card and preserves a card reserved by another effect',()=>{
 const s=setup();give(s,0,'deck',[LAND,WATER,FIRE,LIGHT]);
 const [a,b,c,d]=ids(s.players[0].deck);
 s.players[0].g34Protected=[b];
 cast(s,GUARD);pick(s,0);
 assert.deepEqual(choices(s),[a,c,d]);
 pick(s,d);pick(s,a);
 assert.deepEqual(ids(s.players[0].deck),[d,b,a,c]);
 assert.deepEqual(s.players[0].g34Protected,[b]);
 give(s,0,'deck',[LIGHT]);cast(s,GUARD);pick(s,0);
 const [only]=s.players[0].deck;
 assert.deepEqual(choices(s),[only.uid]);
 pick(s,only.uid);
 assert.ok(has(s,0,'deck',only));
});

test('Guard Vision obeys QX for either library and Tsu for only the caster library',()=>{
 for(const [lock,owner,n] of [[QX,0,0],[QX,1,0],[TSU,0,1],[TSU,1,3]]){
  const s=setup();put(s,1,'battle',lock);
  for(const p of [0,1])give(s,p,'deck',[LAND,WATER,FIRE,LIGHT]);
  cast(s,GUARD);pick(s,owner);
  assert.equal(s.decision?.choices.length??0,n);
  assert.equal(s.log.some(x=>x.type==='reveal'),lock===TSU&&owner===0);
  drain(s);
 }
});

test('Dark Magellan survives its own entry, enemy entry, and an allied evolution',()=>{
 const s=setup(),base=put(s,0,'battle',LAND);
 cast(s,DARK);
 const dark=s.players[0].battle.find(x=>x.cardId===DARK);
 deploy(s,1,put(s,1,'hand',LAND));
 s.phase='main';cast(s,EVO);act(s,'evolve',a=>a.baseUid===base.uid);
 assert.ok(has(s,0,'battle',dark));
 assert.equal(e.effectiveCard(dark,s).breaker,2);
});

for(const darkFirst of [true,false])test('Dark Magellan checks each entry in order '+darkFirst,()=>{
 const s=setup(),dark=put(s,0,'hand',DARK),ally=put(s,0,'hand',LAND);
 deploy(s,0,...(darkFirst?[dark,ally]:[ally,dark]));drain(s);
 assert.equal(has(s,0,'grave',dark),darkFirst);
 assert.equal(has(s,0,'battle',dark),!darkFirst);
 assert.ok(has(s,0,'battle',ally));
});

test('Dark Magellan is destroyed by an allied non-evolved NEO entry',()=>{
 const s=setup(),dark=put(s,0,'battle',DARK);
 cast(s,NEO);
 act(s,'evolve',a=>!a.baseUid);
 drain(s);
 assert.ok(has(s,0,'grave',dark));
});

test('Skull Meldy updates power and breaker whenever either hand becomes empty or refills',()=>{
 const s=setup(),skull=put(s,0,'battle',SKULL);
 for(const [own,opp] of [[1,1],[0,1],[1,0],[0,0],[1,1]]){
  give(s,0,'hand',Array(own).fill(LAND));give(s,1,'hand',Array(opp).fill(LAND));
  assert.equal(e.power(skull,false,s),!own||!opp?6000:2000);
  assert.equal(e.effectiveCard(skull,s).breaker??1,!own||!opp?2:1);
 }
});

for(const empty of [false,true])test('Skull Meldy uses the current hand counts for shield breaks '+empty,()=>{
 const s=setup(),skull=put(s,0,'battle',SKULL);
 give(s,0,'hand',[LAND]);if(!empty)give(s,1,'hand',[LAND]);
 attack(s,skull.uid);drain(s);
 assert.equal(s.players[1].shields.length,empty?3:4);
});

test('Vy offers only creature discards, can decline, and makes a new face-down shield',()=>{
 for(const accept of [false,true]){
  const s=setup();put(s,0,'battle',VY);give(s,0,'shields',[LAND,LAND,LAND]);
  const top=s.players[0].deck[0],plain=put(s,0,'hand',LAND),twin=put(s,0,'hand',TWIN);
  put(s,0,'hand',SPELL);
  end(s);assert.deepEqual(choices(s),[plain.uid,twin.uid,null]);
  const saved=resume(s);pick(saved,accept?twin.uid:null);drain(saved);
  assert.equal(has(saved,0,'grave',twin),accept);
  assert.equal(has(saved,0,'shields',top),accept);
  assert.equal(saved.players[0].shields.length,accept?4:3);
  if(accept)assert.ok(!saved.players[0].shields.find(x=>x.uid===top.uid).faceUp);
 }
});

test('Vy checks its shield threshold when its turn-end ability resolves',()=>{
 const s=setup(),vy=put(s,0,'battle',VY),kooni=put(s,0,'battle','dm26rp3-051');
 give(s,0,'shields',[LAND,LAND,LAND,LAND]);
 const first=s.players[0].shields[0],discard=put(s,0,'hand',LAND);
 end(s);selectEnd(s,kooni);pick(s,first.uid);
 if(s.decision.type==='effectOrder')selectEnd(s,vy);
 pick(s,discard.uid);drain(s);
 assert.ok(has(s,0,'hand',first));
 assert.ok(has(s,0,'grave',discard));
 assert.equal(s.players[0].shields.length,4);
});

test('Vy resolves both turn-end abilities but only the first can add a fourth shield (QA 36217)',()=>{
 const s=setup(),first=put(s,0,'battle',VY);
 put(s,0,'battle',VY);give(s,0,'shields',[LAND,LAND,LAND]);
 const discard=put(s,0,'hand',LAND),keep=put(s,0,'hand',LAND);
 end(s);selectEnd(s,first);pick(s,discard.uid);
 assert.ok(has(s,0,'hand',keep));
 assert.ok(has(s,0,'grave',discard));
 assert.equal(s.players[0].shields.length,4);
 assert.equal(s.decision,null);
});

test('Vy has no discard option at four shields or on the opposing turn',()=>{
 for(const active of [0,1]){
  const s=setup();s.active=active;put(s,0,'battle',VY);
  give(s,0,'shields',Array(active===0?4:3).fill(LAND));
  const keep=put(s,0,'hand',LAND);
  end(s);drain(s);
  assert.ok(has(s,0,'hand',keep));
  assert.equal(s.players[0].grave.length,0);
 }
});
