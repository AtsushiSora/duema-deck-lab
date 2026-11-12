import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const CANNON='dmex11-006',EMERAL='dmrp14-015',SLASH='dmr11-030';
const N='dm01-108',SPARK='dm01-015',CREST='dmrp06-065',MAO='dm24rp1-013',FUJIN='dmrp22-037';

function add(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const choose=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const cast=(s,x)=>act(s,'play',a=>a.uid===x.uid&&!a.alternative);
const restore=s=>decodeBattleData(encodeBattleData(s));
const zoneHas=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function end(s){
 if(s.phase==='charge')act(s,'skipCharge');
 if(s.phase==='main')act(s,'toAttack');
 act(s,'endTurn');
}

test('three whole official definitions and two alternate prints retain canonical IDs, art and limits',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-1034.json',import.meta.url)));
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[CANNON,EMERAL,SLASH]);
 assert.equal(m.printAliases.length,2);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=registry.get(row.id),f=row.faces[0],base=m.cards.find(r=>r.id===id);
  assert.equal(c.id,id);
  assert.equal(c.supported,true);
  assert.equal(c.limit,4);
  assert.equal(c.manaValue,1);
  assert.equal(c.cost,f.cost);
  assert.equal(c.power,Number(f.powerText));
  assert.deepEqual(c.civilizations,f.civilizations);
  assert.equal(CARD_IMAGES[id],base.image);
  assert.equal(refs.find(r=>r.id===row.id).image,row.image);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1034}),base.spec);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[id]);
 }
});

test('Cannon shields on entry and can select the same blocker again without extending the attack and block restriction',()=>{
 const s=setup(),cannon=add(s,0,'hand',CANNON),ally=add(s,0,'battle',N);
 const foe=add(s,1,'battle',MAO),another=add(s,1,'battle',MAO);
 const first=s.players[0].deck[0],n=s.players[0].shields.length;
 cast(s,cannon);
 assert.equal(e.effectiveCard(cannon,s).blocker,true);
 assert.equal(s.players[0].shields.length,n+1);
 assert.equal(s.players[0].shields.at(-1).uid,first.uid);
 assert.ok(!s.players[0].shields.at(-1).faceUp);
 assert.deepEqual(values(s),[foe.uid,another.uid]);
 choose(s,foe.uid);
 cast(s,add(s,0,'hand',CREST));
 choose(s,first.uid);
 assert.deepEqual(values(s),[foe.uid,another.uid]);
 choose(s,foe.uid);
 assert.equal(foe.tapped,false);
 attack(s,ally.uid);
 const blockers=e.getLegalActions(s).filter(a=>a.kind==='block').map(a=>a.uid);
 assert.deepEqual(blockers,[another.uid]);
 act(s,'noBlock');
 drain(s);
 end(s);
 assert.ok(e.attackLocked(s,1,foe));
 assert.ok(!e.attackLocked(s,1,another));
 end(s);
 assert.ok(!e.attackLocked(s,1,foe));
});

test('Cannon does not trigger if adding a shield is prohibited',()=>{
 const s=setup(),foe=add(s,1,'battle',FUJIN),n=s.players[0].shields.length;
 cast(s,add(s,0,'hand',CANNON));
 assert.equal(s.players[0].shields.length,n);
 assert.equal(s.decision,null);
 assert.ok(!e.attackLocked(s,1,foe));
});

for(const faceUp of [false,true])test('Emeral chooses either shield orientation before taking an entire bundle without S-Triggers '+faceUp,()=>{
 let s=setup();
 give(s,0,'shields',[SPARK,N]);
 const [root]=s.players[0].shields,leaf=inst(SPARK);
 root.shieldStack=[leaf];
 const emeral=add(s,0,'hand',EMERAL),placed=add(s,0,'hand',N),enemy=add(s,1,'battle',N),all=physical(s);
 cast(s,emeral);
 assert.equal(e.effectiveCard(emeral,s).blocker,true);
 choose(s,placed.uid);
 assert.deepEqual(values(s),[true,false]);
 s=restore(s);
 choose(s,faceUp);
 const added=s.players[0].shields.at(-1);
 assert.equal(added.uid,placed.uid);
 assert.equal(!!added.faceUp,faceUp);
 assert.ok(values(s).includes(added.uid));
 choose(s,root.uid);
 assert.ok(zoneHas(s,0,'hand',root)&&zoneHas(s,0,'hand',leaf));
 assert.equal(s.players[1].battle.find(x=>x.uid===enemy.uid).tapped,false);
 assert.deepEqual(physical(s),all);
 assert.equal(s.decision,null);
});

test('Emeral can retrieve a shield after an attempted placement is prohibited, or decline the whole ability',()=>{
 for(const attempt of [false,true]){
  const s=setup(),root=s.players[0].shields[0],placed=add(s,0,'hand',N),n=s.players[0].shields.length;
  add(s,1,'battle',FUJIN);
  cast(s,add(s,0,'hand',EMERAL));
  choose(s,attempt?placed.uid:null);
  if(attempt){
   choose(s,false);
   assert.equal(s.players[0].shields.length,n);
   choose(s,root.uid);
  }
  assert.ok(zoneHas(s,0,'hand',placed));
  assert.equal(zoneHas(s,0,'hand',root),attempt);
  assert.equal(s.players[0].shields.length,n-Number(attempt));
  assert.equal(s.decision,null);
 }
});

for(const n of [2,3])test('Contradiction checks its shield mode when resolving and counts groups '+n,()=>{
 const s=setup(),top=s.players[0].deck[0];
 give(s,0,'shields',Array(n).fill(N));
 s.players[0].shields[0].shieldStack=[inst(N),inst(N)];
 cast(s,add(s,0,'hand',SLASH));
 assert.deepEqual(values(s),[0,1]);
 choose(s,0);
 assert.equal(s.players[0].shields.length,n+Number(n===2));
 assert.equal(zoneHas(s,0,'shields',top),n===2);
 if(n===2)assert.ok(!s.players[0].shields.at(-1).faceUp);
 assert.equal(s.decision,null);
});

test('Contradiction may destroy exactly one enemy at 3000 power or lower when cast as an S-Trigger',()=>{
 const s=Object.assign(setup(),{active:1}),weak=add(s,1,'battle','dm01-107'),big=add(s,1,'battle',MAO);
 const friend=add(s,0,'battle',N),attacker=add(s,1,'battle',N);
 give(s,0,'shields',[SLASH]);
 const root=s.players[0].shields[0];
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.uid===root.uid);
 choose(s,1);
 assert.deepEqual(values(s),[weak.uid,attacker.uid]);
 choose(s,weak.uid);
 drain(s);
 assert.ok(zoneHas(s,1,'grave',weak)&&zoneHas(s,0,'grave',root));
 assert.ok(zoneHas(s,1,'battle',big)&&zoneHas(s,0,'battle',friend));
});

test('Contradiction enters the mana zone tapped when charged',()=>{
 const s=setup(),spell=add(s,0,'hand',SLASH);
 s.phase='charge';
 act(s,'charge',a=>a.uid===spell.uid);
 assert.ok(zoneHas(s,0,'mana',spell)&&spell.tapped);
});
