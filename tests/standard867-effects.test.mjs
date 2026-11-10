import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,cast,GEN} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const NARUTO='dmr01-051',BLAST='dmr04-010',DESPAIR='dmr04-020',REPRINT='dmx16-067';
const LIGHT='dm01-075',WATER='dm01-083',DARK='dm01-090',FIRE='dm01-097',NATURE='dm01-108';
const HUNTER='dmr04-054',TRICOLOR='dmx01-015',JULIANA='dm11-007';
const field=()=>{
 const s=setup();
 for(const p of [0,1]){
  give(s,p,'deck',Array(12).fill(NATURE));
  give(s,p,'grave',[]);
 }
 return s;
};
function add(s,p,zone,id,props){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===(value?.uid??value));
const ids=xs=>xs.map(x=>x.uid);
const has=(s,p,zone,x)=>ids(s.players[p][zone]).includes(x.uid);
const restore=s=>JSON.parse(JSON.stringify(s));
function enemy(s,power,id=FIRE){
 return add(s,1,'battle',id,{powerModifiers:[{amount:power-e.card(id).power,expires:'end',who:s.active}]});
}
const extra=(s,x)=>e.effectiveCard(x,s).extraBreak??0;

test('Phase 867 pins three official spells and one reprint without a second playable ID',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-867.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[NARUTO,BLAST,DESPAIR]);
 assert.deepEqual(m.printAliases.map(({id,canonicalId})=>[id,canonicalId]),[[REPRINT,DESPAIR]]);
 assert.deepEqual(registry.resolveRows([{id:REPRINT,count:1},{id:DESPAIR,count:3}]),[{id:DESPAIR,count:4}]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(d.faces,row.faces);
  assert.deepEqual(standardCardSpec(d,{phase:867}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:866}));
  const unknown=structuredClone(d);
  unknown.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:867}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.civilizations,c.manaValue,c.limit],['spell',f.cost,f.civilizations,1,4]);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);
 }
});

test('Naruto lets the opponent choose its own distinct untapped creatures and returns them together',()=>{
 for(const ally of [LIGHT,DARK]){
  let s=field();
  add(s,0,'battle',ally);
  const a=add(s,1,'battle',JULIANA),b=add(s,1,'battle',FIRE),c=add(s,1,'battle',DARK);
  const tapped=add(s,1,'battle',NATURE,{tapped:true});
  cast(s,NARUTO);
  assert.equal(s.decision.player,1);
  assert.deepEqual(values(s),ids([a,b,c]));
  pick(s,a);
  assert.ok(has(s,1,'battle',a));
  assert.deepEqual(values(s),ids([b,c]));
  s=restore(s);
  pick(s,c);
  assert.deepEqual(ids(s.players[1].hand),ids([a,c]));
  assert.deepEqual(ids(s.players[1].battle),ids([b,tapped]));
 }
});

test('Naruto returns one without allied light or darkness, and still works with only one eligible creature',()=>{
 for(const ally of [WATER,DARK]){
  const s=field();
  add(s,0,'battle',ally);
  const a=add(s,1,'battle',DARK);
  if(ally===WATER)add(s,1,'battle',LIGHT);
  cast(s,NARUTO);
  pick(s,a);
  assert.deepEqual(ids(s.players[1].hand),[a.uid]);
  assert.equal(s.decision,null);
 }
});

test('Naruto is a free Shield Trigger and cannot choose the tapped attacker',()=>{
 const s=field(),attacker=add(s,1,'battle',FIRE),other=add(s,1,'battle',WATER);
 give(s,0,'shields',[NARUTO]);
 s.active=1;
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 assert.equal(s.decision.player,1);
 assert.deepEqual(values(s),[other.uid]);
 pick(s,other);
 assert.ok(has(s,1,'battle',attacker)&&has(s,1,'hand',other));
 assert.equal(s.metrics[0].triggers,1);
 assert.ok(s.players[0].mana.every(x=>!x.tapped));
});

test('Blast boosts only allied Hunters present at resolution and breaks one additional shield (QA 36520)',()=>{
 const s=field(),hunter=add(s,0,'battle',HUNTER),ally=add(s,0,'battle',DARK),opponent=add(s,1,'battle',HUNTER);
 cast(s,BLAST);
 const late=add(s,0,'battle',HUNTER);
 const base=e.card(HUNTER).power;
 assert.equal(e.power(hunter,false,s),base+3000);
 assert.equal(extra(s,hunter),1);
 for(const x of [late,opponent]){
  assert.equal(e.power(x,false,s),base);
  assert.equal(extra(s,x),0);
 }
 assert.equal(e.power(ally,false,s),e.card(DARK).power);
 assert.equal(extra(s,ally),0);
 attack(s,hunter.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 act(s,'breakShields',a=>a.shields.length===2);
 assert.equal(s.players[1].brokenThisTurn,2);
});

test('Blast sweeps enemy creatures at exactly seven allied Hunters and leaves other elements alone',()=>{
 for(const n of [6,7]){
  const s=field();
  give(s,0,'battle',Array(n).fill(HUNTER));
  const opponent=add(s,1,'battle',HUNTER),untargetable=add(s,1,'battle',JULIANA);
  const element=add(s,1,'battle','dmrp08-005');
  assert.notEqual(e.card(element).type,'creature');
  cast(s,BLAST);
  assert.ok(has(s,1,'battle',element));
  assert.equal(s.players[0].battle.length,n);
  for(const x of [opponent,untargetable])assert.ok(has(s,1,n===7?'grave':'battle',x));
 }
});

test('Blast’s two temporary effects are suppressed together by Genmu (QA 34191)',()=>{
 const s=field(),hunter=add(s,0,'battle',HUNTER);
 cast(s,BLAST);
 const genmu=add(s,1,'battle',GEN);
 const base=e.card(HUNTER).power;
 assert.equal(e.power(hunter,false,s),base);
 assert.equal(extra(s,hunter),0);
 s.players[1].battle.splice(s.players[1].battle.indexOf(genmu),1);
 assert.equal(e.power(hunter,false,s),base+3000);
 assert.equal(extra(s,hunter),1);
});

test('Despair counts five tricolor cards and resolves draw, opponent discard, then simultaneous destruction (QA 36526 and 36527)',()=>{
 let s=field();
 give(s,0,'mana',[...Array(5).fill(TRICOLOR),NATURE,NATURE]);
 give(s,1,'hand',[LIGHT,NATURE,WATER]);
 const [left,keep,right]=s.players[1].hand;
 const a=enemy(s,6000),b=enemy(s,4000),above=enemy(s,6001);
 const top=s.players[0].deck[0];
 cast(s,DESPAIR);
 assert.equal(s.decision.player,0);
 assert.deepEqual(values(s),[true,null]);
 pick(s,true);
 assert.ok(has(s,0,'hand',top));
 pick(s,null);
 assert.equal(s.decision.player,1);
 pick(s,left);
 assert.ok(has(s,1,'hand',left));
 pick(s,right);
 assert.deepEqual(ids(s.players[1].hand),[keep.uid]);
 assert.equal(s.decision.player,0);
 assert.deepEqual(values(s),ids([a,b]));
 pick(s,a);
 assert.ok(has(s,1,'battle',a));
 s=restore(s);
 pick(s,b);
 assert.deepEqual(ids(s.players[1].battle),[above.uid]);
 for(const x of [a,b])assert.ok(has(s,1,'grave',x));
});

test('Despair tests the three thresholds independently and uses as many eligible targets as exist',()=>{
 const singleCivilization={水:WATER,闇:DARK,火:FIRE};
 for(const color of ['水','闇','火']){
  const s=field(),mana=Object.values(singleCivilization).flatMap(id=>Array(id===singleCivilization[color]?5:4).fill(id));
  give(s,0,'mana',mana);
  const hand=add(s,1,'hand',DARK),target=enemy(s,6000);
  cast(s,DESPAIR);
  if(color==='水'){pick(s,true);pick(s,true);}
  else pick(s,color==='闇'?hand:target);
  assert.equal(s.decision,null);
  assert.equal(s.players[0].hand.length,color==='水'?2:0);
  assert.ok(has(s,1,color==='闇'?'grave':'hand',hand));
  assert.ok(has(s,1,color==='火'?'grave':'battle',target));
 }
});

test('Despair enters mana tapped and face-down mana does not supply its printed civilizations',()=>{
 const s=field();
 give(s,0,'mana',[...Array(5).fill(TRICOLOR),LIGHT,WATER,DARK,FIRE]);
 s.players[0].mana.slice(3,5).forEach(x=>{x.faceDown=true;});
 const hand=add(s,1,'hand',DARK),target=enemy(s,5000);
 cast(s,DESPAIR);
 assert.equal(s.decision,null);
 assert.ok(has(s,1,'hand',hand)&&has(s,1,'battle',target));
 const copy=add(s,0,'hand',DESPAIR);
 s.phase='charge';
 act(s,'charge',a=>a.uid===copy.uid);
 assert.ok(copy.tapped&&has(s,0,'mana',copy));
});
