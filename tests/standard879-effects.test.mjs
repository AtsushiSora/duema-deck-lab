import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,cast,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const RS='dmr08-004',TWIN='dm22ex1-030',MEI='dmr07-005',ASSIST='dmr10-052';
const SMALL='dm01-108',GUARD='dm01-084',SURFER='dm05-024',REVERSE='dm24rp3-005';
const DREAMMATES=['dm34-052','dm32-106','dm33-053','dmr02-054','dm32-103','dm36-068'];
const REPRINTS=[['dmex12-009',RS],['dmx22b-079',RS],
 ['dm24ex1-024',MEI],['dmex08-187',MEI],['dmx25-011',MEI]];
const field=()=>{
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(12).fill(SMALL));
 return s;
};
function add(s,p,zone,id,props){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const choices=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>choices(s)[a.choice]===(value?.uid??value));
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}

test('Phase 879 registers three whole cards, five reprints and the shared Mei restriction',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-879.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[RS,MEI,ASSIST]);
 assert.deepEqual(m.printAliases.map(({id,canonicalId})=>[id,canonicalId]),REPRINTS);
 assert.deepEqual(registry.resolveRows(REPRINTS.map(([id])=>({id,count:1}))),[{id:RS,count:2},{id:MEI,count:3}]);
 assert.equal(registry.get(TWIN).id,TWIN);
 for(const row of m.printAliases){
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:879}),m.cards.find(x=>x.id===row.canonicalId).spec);
  assert.equal(m.regulationVerification.limits[row.id],row.canonicalId===MEI?1:4);
 }
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(d.faces,row.faces);
  assert.deepEqual(standardCardSpec(d,{phase:879}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:878}));
  const changed=structuredClone(d);
  changed.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(changed,{phase:879}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.cost,c.civilizations,c.power,c.race,c.manaValue,c.limit],
   [f.cost,f.civilizations,Number(f.powerText),f.race,1,row.id===MEI?1:4]);
  assert.equal(c.type,row.id===ASSIST?'spell':'creature');
  assert.ok(registry.get(row.id).supported);
  assert.equal(m.regulationVerification.limits[row.id],c.limit);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);
 }
 assert.ok(registry.validate({cards:[{id:MEI,count:1},{id:'dm24ex1-024',count:1}]})
  .some(error=>error.includes('お目覚めメイ様')&&error.includes('1枚')));
});

test('Single-face RS can attack on entry, must judge once, and can stop after a tie win',()=>{
 const s=field();
 cast(s,RS);
 const attacker=s.players[0].battle[0];
 assert.equal(attacker.entered,s.turn);
 attack(s,attacker.uid);
 assert.equal(s.decision.type,'judgeContinue');
 assert.equal(s.judge.round,1);
 assert.equal(s.judge.wins,1);
 act(s,'stopJudge');
 assert.equal(s.judge.remaining,1);
 act(s,'judgeBreak');
 assert.equal(s.players[1].shields.length,4);
 assert.equal(s.decision.type,'block');
 act(s,'noBlock');
 act(s,'breakShields');
 assert.equal(s.players[1].shields.length,3);
});

test('Single-face RS fixes the break count on a loss and resolves each Shield Trigger before the next break',()=>{
 let s=field();
 const attacker=add(s,0,'battle',RS);
 give(s,1,'shields',[SURFER,SMALL,SMALL,SMALL,SMALL]);
 const shield=s.players[1].shields[0];
 give(s,0,'deck',[RS,RS,SMALL]);
 give(s,1,'deck',[SMALL,SMALL,RS]);
 attack(s,attacker.uid);
 act(s,'judgeAgain');
 act(s,'judgeAgain');
 assert.equal(s.judge.round,3);
 assert.equal(s.judge.remaining,2);
 s=JSON.parse(JSON.stringify(s));
 act(s,'judgeBreak',a=>a.shield===shield.uid);
 act(s,'useTrigger');
 act(s,'effect',a=>a.targets[0].uid===attacker.uid);
 assert.equal(s.attack,null);
 assert.ok(has(s,0,'hand',attacker));
 assert.equal(s.decision.type,'judgeBreak');
 act(s,'judgeBreak');
 assert.equal(s.players[1].shields.length,3);
 assert.equal(s.judge,null);
});

test('Single-face RS also judges when attacking a creature; a first-round loss does not break shields',()=>{
 const s=field(),attacker=add(s,0,'battle',RS),target=add(s,1,'battle',SMALL,{tapped:true});
 give(s,1,'deck',[RS,SMALL]);
 attack(s,attacker.uid,target.uid);
 assert.equal(s.decision.type,'block');
 assert.equal(s.log.filter(x=>x.type==='judgeResult').length,1);
 act(s,'noBlock');
 assert.ok(has(s,1,'grave',target));
 assert.equal(s.players[1].shields.length,5);
});

test('Unblocked Mei counts herself and live allied Dreammates, winning with seven and cancelling with six',()=>{
 for(const enough of [false,true]){
  const s=field(),mei=add(s,0,'battle',MEI);
  for(const id of DREAMMATES.slice(0,enough?6:5))add(s,0,'battle',id);
  add(s,1,'battle',DREAMMATES[0]);
  add(s,0,'hand',DREAMMATES[0]);
  add(s,0,'battle',SMALL);
  attack(s,mei.uid);
  assert.equal(s.winner,null);
  act(s,'noBlock');
  assert.equal(s.winner,enough?0:null);
  assert.equal(s.players[1].shields.length,5);
  if(!enough)assert.equal(s.attack,null);
  assert.ok(mei.tapped);
 }
});

test('Mei does not cancel a creature attack or win when her player attack is blocked',()=>{
 for(const targetPlayer of [false,true]){
  const s=field(),mei=add(s,0,'battle',MEI);
  if(targetPlayer)for(const id of DREAMMATES)add(s,0,'battle',id);
  const target=add(s,1,'battle',GUARD,{tapped:!targetPlayer});
  attack(s,mei.uid,targetPlayer?'player':target.uid);
  act(s,targetPlayer?'block':'noBlock');
  assert.equal(s.winner,null);
  assert.ok(has(s,0,'grave',mei));
  assert.ok(s.log.some(x=>x.type==='battle'));
 }
});

test('Mei counts Dreammates after the defending player resolves Reverse Shot (QA 46616)',()=>{
 const s=field();
 give(s,0,'battle',[MEI,...DREAMMATES]);
 give(s,1,'hand',[REVERSE]);
 const [attacker,removed]=s.players[0].battle;
 attack(s,attacker.uid);
 pick(s,true);
 pick(s,true);
 pick(s,removed);
 assert.ok(has(s,0,'grave',removed));
 assert.equal(s.decision.type,'block');
 act(s,'noBlock');
 assert.equal(s.winner,null);
 assert.equal(s.attack,null);
 assert.equal(s.players[1].shields.length,5);
});

test('Assist goes to mana tapped and applies both effects only to the chosen allied creature',()=>{
 const s=field(),target=add(s,0,'battle',SMALL),other=add(s,0,'battle',SMALL);
 const opponent=add(s,1,'battle',SMALL);
 s.phase='charge';
 const assist=add(s,0,'hand',ASSIST);
 act(s,'charge',a=>a.uid===assist.uid);
 assert.ok(has(s,0,'mana',assist));
 assert.ok(assist.tapped);
 cast(s,ASSIST);
 assert.deepEqual(choices(s),[target.uid,other.uid]);
 pick(s,target);
 assert.equal(e.power(target,false,s),5000);
 assert.ok(e.effectiveCard(target,s).blocker);
 assert.equal(e.power(other,false,s),2000);
 assert.equal(e.power(opponent,false,s),2000);
 end(s);
 assert.equal(s.active,1);
 assert.equal(e.power(target,false,s),5000);
 assert.ok(e.effectiveCard(target,s).blocker);
 end(s);
 assert.equal(s.active,0);
 assert.equal(e.power(target,false,s),2000);
 assert.ok(!e.effectiveCard(target,s).blocker);
});

test('Assist casts for free as a Shield Trigger and enables blocking a later attack that turn',()=>{
 const s=field(),target=add(s,0,'battle',SMALL);
 const first=add(s,1,'battle',SMALL),next=add(s,1,'battle',SMALL);
 give(s,0,'shields',[ASSIST,SMALL]);
 s.active=1;
 attack(s,first.uid);
 act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields',a=>a.shields.includes(s.players[0].shields[0].uid));
 act(s,'useTrigger');
 pick(s,target);
 assert.equal(s.metrics[0].triggers,1);
 assert.ok(s.players[0].mana.every(x=>!x.tapped));
 assert.equal(e.power(target,false,s),5000);
 attack(s,next.uid);
 act(s,'block',a=>a.uid===target.uid);
 assert.ok(has(s,1,'grave',next));
 assert.ok(has(s,0,'battle',target));
 end(s);
 assert.equal(e.power(target,false,s),2000);
 assert.ok(!e.effectiveCard(target,s).blocker);
});

test('Assist resolves with no eligible target when only the opponent has a creature',()=>{
 const s=field(),opponent=add(s,1,'battle',SMALL);
 cast(s,ASSIST);
 assert.equal(s.decision,null);
 assert.equal(e.power(opponent,false,s),2000);
 assert.ok(!e.effectiveCard(opponent,s).blocker);
 assert.ok(s.players[0].grave.some(x=>x.cardId===ASSIST));
});

test('Assist’s granted power and blocker are ignored while Genmu is present (QA 45095)',()=>{
 const s=field(),target=add(s,0,'battle',SMALL);
 cast(s,ASSIST);
 pick(s,target);
 assert.equal(e.power(target,false,s),5000);
 assert.ok(e.effectiveCard(target,s).blocker);
 add(s,1,'battle','dmrp15-km1');
 assert.equal(e.power(target,false,s),2000);
 assert.ok(!e.effectiveCard(target,s).blocker);
});
