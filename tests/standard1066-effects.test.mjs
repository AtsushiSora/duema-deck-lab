import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const SIDARS='dmrp06-012',JUTOKU='dmrp02-020',GIANT='dmrp07-049',RABBIT='dmex08-115';
const LIGHT='dm01-075',WATER='dm01-083',DARK='dm01-090',FIRE='dm01-097',GREEN='dm01-108';
const KIRIN='dm25rp4-074',GALLOP='dm25rp4-064',HAM='dm24ex2-078',GRASPER='dmrp02-s09';
const RED_SPELL='dm01-102',KAREN='dmex08-046',GNEO='dm25rp2-017';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
const restore=s=>decodeBattleData(encodeBattleData(s));
const values=s=>(s.decision?.choices??[]).map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const ids=(s,p,z)=>s.players[p][z].map(x=>x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();

function add(s,p,z,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][z].push(x);
 return x;
}
function field(){
 const s=setup();
 for(const p of [0,1]){
  give(s,p,'deck',Array(12).fill(GREEN));
  give(s,p,'grave',[]);
 }
 return s;
}
function summon(s,id,base){
 const x=add(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 act(s,'evolve',a=>a.baseUid===base?.uid);
 return x;
}
function end(s){
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
}

test('Four official definitions and two reprints preserve exact IDs, mana values, limits and art',()=>{
 const m=read('tools/support-phase-1066.json'),cat=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(c=>c.id),[SIDARS,JUTOKU,GIANT,RABBIT]);
 assert.deepEqual(m.printAliases.map(c=>[c.id,c.canonicalId]),[['dmex18-015',RABBIT],['dm25ex1-035',RABBIT]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.equal(cat.get(id).supported,true);
  assert.equal(row.verification.facesMatched,true);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1066}),m.cards.find(r=>r.id===id).spec);
  assert.throws(()=>standardCardSpec({...row,status:'complete'},{phase:1065}),/未実装|未対応/);
  assert.deepEqual([c.type,c.cost,c.race,c.power,e.civilizations(c),c.manaValue,c.limit],
   ['creature',f.cost,f.race,Number(f.powerText),f.civilizations,id===RABBIT?0:1,4]);
  assert.deepEqual(cat.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(refs.filter(r=>r.id===row.id).map(r=>[r.canonicalId,r.image]),[[id,row.image]]);
  if(row.canonicalId)continue;
  assert.equal(CARD_IMAGES[id],row.image);
  assert.deepEqual(details.cards.find(r=>r.id===id).faces,row.faces);
  assert.deepEqual(data.cards.filter(r=>nameKey(r.name)===nameKey(row.name)).map(r=>r.id),[id]);
 }
});

test('Sidars privately looks at three cards and can evolve a cost-four creature from them',()=>{
 let s=field();
 const base=add(s,0,'battle',LIGHT),recipient=add(s,0,'battle',FIRE);
 add(s,0,'battle',WATER);
 const x=summon(s,SIDARS,base);
 give(s,0,'deck',[HAM,KIRIN,RED_SPELL,GREEN,GREEN]);
 const [high,hit,spell,rest1,rest2]=ids(s,0,'deck'),before=physical(s);
 attack(s,x.uid);
 assert.deepEqual(new Set(values(s)),new Set([hit,null]));
 assert.deepEqual(s.decision.task.g585Peek.map(c=>c.id),[HAM,KIRIN,RED_SPELL]);
 assert.ok(!JSON.stringify(e.observation(s,1)).includes(e.card(HAM).name));
 assert.ok(!s.log.some(row=>row.type==='reveal'&&row.cardId===SIDARS));
 s=restore(s);
 pick(s,hit);
 pick(s,recipient.uid);
 assert.deepEqual(new Set(values(s)),new Set([high,spell]));
 pick(s,spell);
 assert.deepEqual(ids(s,0,'deck'),[rest1,rest2,spell,high]);
 assert.equal(s.players[0].battle.find(y=>y.uid===hit).under[0].uid,recipient.uid);
 assert.equal(s.attack.attacker,x.uid);
 drain(s);
 assert.equal(s.players[1].shields.length,3);
 assert.deepEqual(physical(s),before);
});

test('Sidars can deploy zero cards and orders every remaining inspected card at the bottom',()=>{
 const s=field(),x=add(s,0,'battle',SIDARS);
 give(s,0,'deck',[GALLOP,FIRE,RED_SPELL,GREEN]);
 const [neo,creature,spell,rest]=ids(s,0,'deck');
 attack(s,x.uid);
 assert.deepEqual(new Set(values(s)),new Set([neo,creature,null]));
 pick(s,null);
 pick(s,creature);
 pick(s,spell);
 assert.deepEqual(ids(s,0,'deck'),[rest,creature,spell,neo]);
 assert.deepEqual(ids(s,0,'battle'),[x.uid]);
});

test('Jutoku must destroy an own nonevolution creature, including an ordinary NEO',()=>{
 const s=field(),base=add(s,0,'battle',DARK),plain=add(s,0,'battle',FIRE);
 const ordinary=add(s,0,'battle',GALLOP),evolved=add(s,0,'battle',GALLOP,{under:[inst(DARK)]});
 const x=summon(s,JUTOKU,base);
 add(s,1,'battle',WATER);
 const before=physical(s);
 attack(s,x.uid);
 assert.deepEqual(new Set(values(s)),new Set([plain.uid,ordinary.uid]));
 pick(s,ordinary.uid);
 drain(s);
 assert.ok(ids(s,0,'grave').includes(ordinary.uid));
 assert.ok(ids(s,0,'battle').includes(evolved.uid));
 assert.equal(s.players[1].shields.length,3);
 assert.deepEqual(physical(s),before);
});

test('An ordinary lone Jutoku destroys itself before the attack can break shields',()=>{
 const s=field(),x=add(s,0,'battle',JUTOKU);
 attack(s,x.uid);
 if(values(s).includes(x.uid))pick(s,x.uid);
 drain(s);
 assert.deepEqual(ids(s,0,'grave'),[x.uid]);
 assert.equal(s.players[1].shields.length,5);
 assert.equal(s.attack,null);
});

test('A lone evolved Jutoku continues attacking if no eligible destruction target remains',()=>{
 const s=field(),base=add(s,0,'battle',DARK),x=summon(s,JUTOKU,base);
 attack(s,x.uid);
 drain(s);
 assert.ok(ids(s,0,'battle').includes(x.uid));
 assert.equal(s.players[1].shields.length,3);
});

test('The Giant can choose W or Q Breaker after evolving, and loses the grant when the turn ends',()=>{
 for(const n of [2,4]){
  let s=field();
  const base=add(s,0,'battle',GREEN),x=summon(s,GIANT,base);
  assert.equal(e.power(x,false,s),18000);
  assert.deepEqual(new Set(e.effectiveCard(x,s).g633BreakerChoices),new Set([2,4]));
  attack(s,x.uid);
  if(s.decision?.type==='block')act(s,'noBlock');
  assert.equal(s.decision.task.op,'g34_GrantedBreaker633');
  assert.deepEqual(new Set(values(s)),new Set([2,4]));
  s=restore(s);
  pick(s,n);
  drain(s);
  assert.equal(s.players[1].shields.length,5-n);
  end(s);
  const y=s.players[0].battle.find(y=>y.uid===x.uid);
  assert.equal(e.power(y,false,s),6000);
  assert.equal(e.effectiveCard(y,s).breaker,2);
  assert.equal(e.effectiveCard(y,s).g633BreakerChoices,undefined);
 }
});

test('The Giant gets its entry power even when summoned as an ordinary NEO',()=>{
 const s=field(),x=summon(s,GIANT);
 assert.equal(e.power(x,false,s),18000);
 assert.ok(!e.isEvolution(x));
 s.phase='attack';
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid));
});

test('Future X can deploy two Graspers and evolve the second over the first (QA 33217)',()=>{
 let s=field();
 const x=add(s,0,'battle',RABBIT);
 give(s,0,'deck',[GRASPER,FIRE,GRASPER,GREEN,GREEN]);
 const [first,plain,second,rest1,rest2]=ids(s,0,'deck'),before=physical(s);
 attack(s,x.uid);
 assert.equal(e.effectiveCard(x,s).breaker,3);
 assert.deepEqual(new Set(values(s)),new Set([first,second,null]));
 pick(s,first);
 s=restore(s);
 pick(s,second);
 assert.equal(s.decision.task.target,first);
 pick(s,null);
 assert.equal(s.decision.task.target,second);
 assert.ok(values(s).includes(first));
 pick(s,first);
 drain(s);
 assert.equal(s.players[0].battle.find(y=>y.uid===second).under[0].uid,first);
 assert.deepEqual(ids(s,0,'deck'),[rest1,rest2,plain]);
 assert.ok(s.players[0].mana.every(y=>!y.tapped));
 assert.deepEqual(physical(s),before);
});

test('Future X can deploy a G-NEO and its chosen evolution enters tapped under Karen',()=>{
 const s=field(),x=add(s,0,'battle',RABBIT),base=add(s,0,'battle',DARK);
 add(s,1,'battle',KAREN);
 give(s,0,'deck',[GNEO,RED_SPELL,FIRE,GREEN,GREEN]);
 const [hit,spell,plain,rest1,rest2]=ids(s,0,'deck');
 attack(s,x.uid);
 assert.deepEqual(new Set(values(s)),new Set([hit,null]));
 pick(s,hit);
 pick(s,base.uid);
 assert.equal(s.players[0].battle.find(y=>y.uid===hit).tapped,true);
 assert.ok(values(s).includes(plain));
 pick(s,plain);
 drain(s);
 assert.deepEqual(ids(s,0,'deck'),[rest1,rest2,plain,spell]);
});
