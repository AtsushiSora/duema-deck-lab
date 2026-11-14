import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const IPPON='dmrp06-081',SKULL='dmrp08-006',LANTERN='dm24rp4-065',GUARD='dmrp06-060';
const SMALL='dm01-108',DARK='dm01-090',DARK_SPELL='dm01-027',TWIN='dmex17-105',AMO='dmrp19-s10',BIG='dm01-s01';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
const field=(active=0)=>{
 const s=Object.assign(setup(),{active});
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(SMALL));
 return s;
};
const add=(s,p,z,id,props={})=>{const x=Object.assign(inst(id),props);s.players[p][z].push(x);return x;};
const has=(s,p,z,x)=>s.players[p][z].some(y=>x.uid===y.uid);
const choices=s=>s.decision?.choices?.map(o=>o.value?.uid??o.value)??[];
const pick=(s,v)=>act(s,'extended',a=>choices(s)[a.choice]===v);
const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);
const end=s=>{s.phase='attack';act(s,'endTurn');drain(s);};
function moveCreature(s,p,x,properties={}){
 s.phase='main';
 s.extTasks=[{op:'g34_Target',p,source:DARK_SPELL,to:'grave',filter:{exactUid:x.uid},...properties}];
 act(s,'toAttack');pick(s,x.uid);drain(s);
}

test('Four officially verified cards resolve to distinct original IDs with their full definitions and artwork',()=>{
 const m=read('tools/support-phase-1241.json'),refs=read('tools/image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[IPPON,SKULL,LANTERN,GUARD]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const c=e.card(row.id),f=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1241}),row.spec);
  assert.deepEqual(cat.resolveRows([{id:row.id,count:1}]),[{id:row.id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[row.id]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===row.id)?.image,row.image);
  assert.equal(CARD_IMAGES[row.id],row.image);
 }
});

test('Ippon waits until this turn ends, even after leaving, and a declined discard does not draw',()=>{
 for(const accept of [false,true]){
  let s=field(),x=add(s,0,'hand',IPPON),fodder=add(s,0,'hand',SMALL);
  const [one,two]=s.players[0].deck;
  play(s,x);pick(s,accept?fodder.uid:null);
  assert.equal(has(s,0,'grave',fodder),accept);
  assert.equal(s.players[0].deck.length,20);
  moveCreature(s,0,x,{owner:'self'});
  s=JSON.parse(JSON.stringify(s));end(s);
  assert.equal(has(s,0,'hand',one),accept);assert.equal(has(s,0,'hand',two),accept);
  assert.equal(s.players[0].deck.length,accept?18:20);
  end(s);
  assert.equal(s.players[0].drawsThisTurn,1);
 }
});

test('Ippon uses S-Trigger and can schedule its draw on the opposing turn with a replaced discard',()=>{
 const s=field(1),attacker=add(s,1,'battle',SMALL),fodder=add(s,0,'hand',DARK);
 add(s,0,'battle',AMO);give(s,0,'shields',[IPPON]);
 const [one,two]=s.players[0].deck;
 attack(s,attacker.uid);act(s,'noBlock');act(s,'useTrigger',a=>a.cardId===IPPON);pick(s,fodder.uid);
 act(s,'extended',a=>s.decision.choices[a.choice].value?.g1090Mana);
 assert.ok(has(s,0,'mana',fodder));assert.ok(!has(s,0,'grave',fodder));
 assert.ok(s.players[0].battle.some(x=>x.cardId===IPPON));
 assert.ok(s.players[0].mana.every(x=>!x.tapped));assert.ok(!has(s,0,'hand',one));
 end(s);assert.ok(has(s,0,'hand',one)&&has(s,0,'hand',two));
});

test('Ippon entering during end resolution cannot reserve a draw for the current or next turn end',()=>{
 const s=field(),x=add(s,0,'hand',IPPON),fodder=add(s,0,'hand',SMALL);
 s.endStep={stage:'resolve',player:1,deferred:[],remaining:[],declared:[],untap:[]};
 s.extTasks=[{op:'g34_Put',p:0,source:GUARD,target:x.uid,origin:'hand'}];
 act(s,'toAttack');pick(s,fodder.uid);drain(s);
 assert.ok(has(s,0,'battle',x)&&has(s,0,'grave',fodder));
 assert.equal(s.players[0].deck.length,20);
 assert.ok(!(s.g537Delays||[]).some(r=>r.source===IPPON));
});

test('A discarded twinpact triggers both Skull effects, and a second creature discard stacks for four breaks',()=>{
 const s=field(),x=add(s,0,'hand',SKULL),victim=add(s,1,'battle',BIG);
 const twin=add(s,0,'hand',TWIN),fodder=add(s,0,'hand',DARK);
 play(s,x);pick(s,twin.uid);
 assert.ok(has(s,0,'grave',twin));assert.equal(s.decision.type,'effectOrder');
 act(s,'orderEffect',a=>s.pendingEffects.find(t=>t.effectId===a.effectId)?.task.defs[0].op==='Target');
 pick(s,victim.uid);drain(s);
 assert.equal(e.power(victim,false,s),3500);assert.equal(e.power(x,false,s),12000);
 assert.equal(e.effectiveCard(x,s).extraBreak,1);
 x.entered=0;attack(s,x.uid);pick(s,fodder.uid);
 assert.equal(e.power(x,true,s),18000);assert.equal(e.effectiveCard(x,s).extraBreak,2);
 act(s,'noBlock');drain(s);assert.equal(s.players[1].shields.length,1);
 end(s);
 assert.equal(e.power(x,false,s),6000);assert.equal(e.power(victim,false,s),9500);
 assert.equal(e.effectiveCard(x,s).extraBreak,undefined);
});

test('Skull checks who discarded, watches outside its own entry/attack, and ignores a replaced discard',()=>{
 const s=field(1),x=add(s,0,'battle',SKULL),enemy=add(s,1,'battle',SMALL);
 const spell=add(s,0,'hand',DARK_SPELL),other=add(s,1,'hand',DARK);
 s.extTasks=[{op:'discard',p:1,source:DARK_SPELL,n:1,causedBy:1}];
 act(s,'toAttack');pick(s,other.uid);assert.ok(!s.decision);assert.equal(e.power(x,false,s),6000);
 add(s,0,'battle',AMO);s.phase='main';
 s.extTasks=[{op:'discard',p:0,source:DARK_SPELL,n:1,causedBy:1}];
 act(s,'toAttack');pick(s,spell.uid);
 act(s,'extended',a=>s.decision.choices[a.choice].value?.g1090Mana);
 assert.ok(!s.decision);assert.ok(has(s,0,'mana',spell));assert.ok(has(s,1,'battle',enemy));
 const actual=add(s,0,'hand',DARK_SPELL);s.phase='main';
 s.extTasks=[{op:'discard',p:0,source:DARK_SPELL,n:1,causedBy:1}];
 act(s,'toAttack');pick(s,actual.uid);pick(s,false);pick(s,enemy.uid);drain(s);
 assert.ok(has(s,1,'grave',enemy));assert.equal(e.power(x,false,s),6000);
});

test('Lantern applies its reduction before comparing, with no choice required, then clears it',()=>{
 for(const [power,lanternSurvives] of [[2000,true],[4500,false]]){
  const s=field(),x=add(s,0,'hand',LANTERN);
  play(s,x);x.entered=0;
  const other=add(s,1,'battle',SMALL,{tapped:true,powerModifiers:[{amount:power-2000}]});
  attack(s,x.uid,other.uid);act(s,'noBlock');drain(s);
  assert.equal(has(s,0,'battle',x),lanternSurvives);
  if(lanternSurvives){assert.ok(has(s,1,'grave',other));assert.ok(!s.log.some(l=>l.type==='battle'));}
  else{assert.ok(has(s,1,'battle',other));assert.equal(e.power(other,false,s),power);}
 }
});

test('Guard cannot attack a player, can block, and on destruction becomes a new hidden shield',()=>{
 const s=field(1),guard=add(s,0,'battle',GUARD),enemy=add(s,1,'battle',BIG);
 s.active=0;s.phase='attack';enemy.tapped=true;
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===guard.uid&&a.target===enemy.uid));
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===guard.uid&&a.target==='player'));
 enemy.tapped=false;s.active=1;const shields=s.players[0].shields.map(x=>x.uid);
 attack(s,enemy.uid);act(s,'block',a=>a.uid===guard.uid);drain(s);
 assert.deepEqual(s.players[0].shields.map(x=>x.uid),[...shields,guard.uid]);
 assert.ok(!guard.faceUp&&!has(s,0,'grave',guard));
});

test('Guard does not replace a bounce or destruction while shield placement is prohibited',()=>{
 const s=field(),x=add(s,0,'battle',GUARD);
 moveCreature(s,0,x,{owner:'self',to:'hand'});assert.ok(has(s,0,'hand',x));
 add(s,1,'battle','dmrp22-037');const y=add(s,0,'battle',GUARD);
 moveCreature(s,0,y,{owner:'self'});assert.ok(has(s,0,'grave',y));assert.equal(s.players[0].shields.length,5);
});

test('Skull observes an actual hand discard used to replace a loss',()=>{
 const s=field(1),johnny='dmrp21-1B',x=add(s,0,'battle',SKULL),attacker=add(s,1,'battle',SMALL);
 add(s,0,'battle',johnny);add(s,0,'hand',johnny);give(s,0,'shields',[]);
 attack(s,attacker.uid);act(s,'noBlock');
 act(s,'extended',a=>s.decision.choices[a.choice].value?.kind==='johnnyHand');
 drain(s);assert.equal(s.winner,null);
 assert.equal(e.power(x,false,s),12000);assert.equal(e.effectiveCard(x,s).extraBreak,1);
});
