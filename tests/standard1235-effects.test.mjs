import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const JASHIN='dm24rp1-OR2',BAS='dm24rp2-020',RAMAR='dm24rp1-S04',FOUNTAIN='dm24rp1-S06';
const NON='dm01-108',DARK='dm01-090',WATER='dm01-083',TYPOON='dm11-043';
const ABYSS='dm22rp1-1B',INVASION='dm22rp1-017',BEETLE='dmrp01-027',AMO='dmrp19-s10';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));

function field(p=0){
 const s=setup();s.active=p;
 for(const who of [0,1]){give(s,who,'deck',Array(20).fill(NON));give(s,who,'grave',[]);}
 return s;
}
function add(s,p,z,id,props={}){const x=Object.assign(inst(id),props);s.players[p][z].push(x);return x;}
function pick(s,wanted){
 act(s,'extended',a=>{
  const value=s.decision.choices[a.choice].value;
  return typeof wanted==='function'?wanted(value):(value?.uid??value)===wanted;
 });
}
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}
const has=(s,p,z,x)=>s.players[p][z].some(y=>x.uid===y.uid);
const choices=s=>s.decision?.choices?.map(x=>x.value?.uid??x.value)??[];

test('the official versions preserve the three original IDs and link all related prints',()=>{
 const m=read('tools/support-phase-1235.json'),refs=read('tools/image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[JASHIN,BAS,RAMAR]);
 assert.deepEqual(m.printAliases.map(x=>x.id),['dm24rp1-Sec02','dm24ex3-rp1OR2','dm24ex3-rp1Sec02','dm24ex3-027','dm24ex3-rp1S04','dm24ex3-Sec03']);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1235}),row.spec);
  assert.deepEqual(cat.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [f.cost,parseInt(f.powerText,10)||0,f.race,f.civilizations,1,4]);
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===id)?.image,row.image);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
 }
});

test('Jashin pays OVER Hyper with two other creatures and computes the removal budget after milling three',()=>{
 const s=field(),j=add(s,0,'battle',JASHIN),left=add(s,0,'battle',NON),right=add(s,0,'battle',NON);
 const tapped=add(s,0,'battle',NON,{tapped:true});
 const first=add(s,1,'battle',WATER),second=add(s,1,'battle',NON),extra=add(s,1,'battle',DARK);
 const expensive=add(s,1,'battle',FOUNTAIN);
 add(s,0,'grave',NON);
 assert.equal(e.power(j,false,s),4000);
 act(s,'hyper',a=>a.uid===j.uid);
 assert.deepEqual(choices(s),[left.uid,right.uid,null]);
 pick(s,left.uid);assert.ok(!left.tapped);pick(s,right.uid);
 assert.ok(left.tapped&&right.tapped&&tapped.tapped&&!j.tapped);
 assert.equal(e.power(j,false,s),13000);assert.equal(e.effectiveCard(j,s).breaker,3);
 attack(s,j.uid);
 assert.equal(s.players[0].grave.length,4);
 assert.deepEqual(choices(s),[first.uid,second.uid,extra.uid,null]);
 pick(s,first.uid);assert.deepEqual(choices(s),[second.uid,extra.uid,null]);
 pick(s,second.uid);
 assert.ok(has(s,1,'grave',first)&&has(s,1,'grave',second)&&has(s,1,'battle',expensive)&&has(s,1,'battle',extra));
 drain(s);end(s);assert.ok(j.hyperActive);end(s);assert.ok(!j.hyperActive);
});
test('normal Jashin does not mill and Hyper mode can decline destruction or leave the second target',()=>{
 for(const [hyper,want] of [[false,0],[true,0],[true,1]]){
  const s=field(),j=add(s,0,'battle',JASHIN,{hyperActive:hyper}),victim=add(s,1,'battle',WATER),other=add(s,1,'battle',NON);
  add(s,0,'grave',NON);attack(s,j.uid);
  if(hyper){if(want)pick(s,victim.uid);pick(s,null);}
  drain(s);
  assert.equal(s.players[0].grave.length,hyper?4:1);
  assert.equal(has(s,1,'grave',victim),!!want);assert.ok(has(s,1,'battle',other));
 }
});
test('Fountain counts itself for the two-mana grave summon with the named Jashin (QA46074)',()=>{
 const s=field(),f=add(s,0,'grave',FOUNTAIN);
 give(s,0,'mana',[DARK,NON]);for(let i=0;i<5;i++)add(s,0,'grave',NON);
 const alt=()=>e.getLegalActions(s).filter(a=>a.uid===f.uid&&a.role==='paidAlt568');
 assert.deepEqual(alt(),[]);const j=add(s,0,'battle',JASHIN);
 assert.equal(alt().length,1);assert.equal(alt()[0].cost,2);assert.match(alt()[0].manaPermit,/^g294:/);
 assert.ok(!e.getLegalActions(s).some(a=>a.origin==='grave'&&a.cardId===NON));
 e.step(s,alt()[0]);
 assert.ok(has(s,0,'battle',f)&&s.players[0].mana.every(x=>x.tapped));
 s.phase='attack';assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===f.uid));
 end(s);assert.ok(has(s,0,'battle',f)&&has(s,0,'battle',j));
});
test('Hyper Jashin still grants separate grave permissions with or without Abyss Rush (QA44826)',()=>{
 const s=field(),f=add(s,0,'grave',FOUNTAIN);
 for(let i=0;i<5;i++)add(s,0,'grave',NON);
 add(s,0,'battle',JASHIN,{hyperActive:true});add(s,0,'battle',ABYSS);
 give(s,0,'mana',[DARK]);
 const actions=e.getLegalActions(s).filter(a=>a.uid===f.uid&&a.role==='paidAlt568');
 assert.equal(actions.length,2);assert.equal(actions.find(a=>a.manaPermit==='abyssRush')?.cost,1);
 const regular=actions.find(a=>a.manaPermit?.startsWith('g294:'));assert.equal(regular.cost,1);
 e.step(s,regular);end(s);
 assert.ok(has(s,0,'battle',f));
});
test('Jashin cannot activate Hyper before Deathmatch Beetle resolves (QA44824)',()=>{
 const s=field(),j=add(s,0,'grave',JASHIN);
 add(s,0,'battle',NON);add(s,0,'battle',NON);add(s,1,'battle',BEETLE);
 cast(s,INVASION);pick(s,j.uid);
 assert.equal(s.decision.player,1);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='hyper'));
 drain(s);
});
const quoted=(s,id)=>e.getLegalActions(s).find(a=>a.kind==='play'&&a.cardId===id)?.cost;
test('Basteler counts earlier discards, has speed attacker and pays at least one, with a fresh count next turn',()=>{
 const s=field();const b=add(s,0,'hand',BAS),one=add(s,0,'hand',NON);
 assert.equal(quoted(s,BAS),5);cast(s,TYPOON);pick(s,2);pick(s,one.uid);assert.equal(quoted(s,BAS),3);
 cast(s,TYPOON);pick(s,2);pick(s,s.players[0].hand.find(x=>x!==b).uid);assert.equal(quoted(s,BAS),1);
 cast(s,TYPOON);pick(s,2);pick(s,s.players[0].hand.find(x=>x!==b).uid);assert.equal(quoted(s,BAS),1);
 act(s,'play',a=>a.uid===b.uid);assert.ok(e.effectiveCard(b,s).speedAttacker);
 const next=add(s,0,'hand',BAS);
 end(s);end(s);s.phase='main';assert.equal(quoted(s,BAS),5);assert.ok(has(s,0,'hand',next));
});
test('Basteler offers exactly all five draws or none (QA45119)',()=>{
 for(const accept of [false,true]){
  const s=field(),b=add(s,0,'battle',BAS);
  for(let i=0;i<5;i++){
   const hand=add(s,0,'hand',NON);cast(s,TYPOON);pick(s,2);pick(s,hand.uid);
  }
  const before=s.players[0].hand.length;s.phase='attack';act(s,'endTurn');
  assert.equal(s.decision.task.source,b.cardId);
  assert.deepEqual(choices(s),[true,null]);assert.match(s.decision.title,/5枚/);
  pick(s,accept?true:null);
  assert.equal(s.players[0].hand.length,before+(accept?5:0));
 }
});
test('Basteler excludes a hand card moved by a discard replacement',()=>{
 const s=field(),b=add(s,0,'hand',BAS),amo=add(s,0,'hand',NON);
 add(s,0,'battle',AMO);
 cast(s,TYPOON);pick(s,2);pick(s,amo.uid);pick(s,v=>v?.g1090Mana);
 assert.equal(quoted(s,BAS),5);assert.ok(has(s,0,'mana',amo)&&has(s,0,'hand',b));
});
test('Ramar has Blocker and Just Diver; the draw is offered when tapped at the opponent end',()=>{
 for(const [active,tapped,offer] of [[0,true,false],[1,false,false],[1,true,true]]){
  const s=field(active);const r=add(s,0,'battle',RAMAR,{tapped});
  assert.ok(e.effectiveCard(r,s).blocker&&e.effectiveCard(r,s).justDiver);
  s.phase='attack';act(s,'endTurn');
  if(offer){assert.equal(s.decision.task.source,RAMAR);pick(s,null);}
  assert.notEqual(s.decision?.task?.source,RAMAR);
  assert.equal(s.players[0].hand.length,active===0?0:1);
 }
});
test('Ramar draws two, checks the resulting hand size, and can use a water spell or creature without mana',()=>{
 for(const kind of ['creature','spell','decline']){
  const s=field(1);add(s,0,'battle',RAMAR,{tapped:true});
  const body=add(s,0,'hand',WATER),spell=add(s,0,'hand','dm01-086'),wrong=add(s,0,'hand',DARK),big=add(s,0,'hand','dm01-s04');
  give(s,0,'mana',[]);s.phase='attack';act(s,'endTurn');pick(s,true);
  assert.equal(s.players[0].hand.length,6);
  assert.deepEqual(choices(s),[body.uid,spell.uid,null]);
  pick(s,kind==='creature'?body.uid:kind==='spell'?spell.uid:null);drain(s);
  assert.equal(has(s,0,'battle',body),kind==='creature');
  assert.equal(has(s,0,'grave',spell),kind==='spell');assert.ok(has(s,0,'hand',wrong)&&has(s,0,'hand',big));
 }
});
