import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {act,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const MEMOTTA='dm26rp2-006', JASHIN='dm25rp2-OR1', TOTTORO='dm25rp3-039';
const FIRE='dm01-097', GREEN='dm01-108', LIGHT='dm01-075', DARK='dm01-090';
const EX_LIFE='dmrp18-025', DEDODAM='dmbd10-010', GAIA='dmrp16-s05', HAND='dm01-027';
const add=(s,p,z,id,props={})=>{const x=Object.assign(inst(id),props);s.players[p][z].push(x);return x;};
const values=s=>s.decision?.choices?.map(c=>c.value?.uid??c.value)??[];
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(14).fill(GREEN));
 return s;
}
function resolveTrigger(s,source){
 if(s.decision?.type==='effectOrder')act(s,'orderEffect',a=>s.pendingEffects.some(x=>x.effectId===a.effectId&&x.source===source));
 if(s.decision?.type==='entryOrder')act(s,'orderEffect',a=>s.triggers.entries.some(x=>x.effectId===a.effectId&&x.source===source));
}

test('Both cards use the official basic data, image, and a single deck slot across printings',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-1084.json',import.meta.url)));
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const references=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 assert.deepEqual(m.cards.map(x=>x.id),[MEMOTTA,JASHIN]);
 for(const row of m.cards){
  const c=e.card(row.id),f=row.faces[0];
  assert.deepEqual([c.cost,c.power,c.race,c.manaValue,e.civilizations(c),c.breaker,c.limit],
   [f.cost,Number(f.powerText),f.race,1,f.civilizations,2,m.regulationVerification.limits[row.id]]);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[row.id]);
 }
 for(const row of m.printAliases){
  assert.equal(catalogue.get(row.id).id,row.canonicalId);
  assert.equal(references.find(x=>x.id===row.id)?.image,row.image);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:2},{id:row.canonicalId,count:2}]),[{id:row.canonicalId,count:4}]);
 }
});

test('QA48925: Tottoro triggers when Memotta puts sealed Jashin on it, with no Raid or Command entry',()=>{
 const s=field(),base=add(s,0,'battle',TOTTORO),jashin=add(s,0,'grave',JASHIN),revive=add(s,0,'grave',FIRE);
 const memotta=add(s,0,'hand',MEMOTTA);
 const all=physical(s);
 act(s,'play',a=>a.uid===memotta.uid);
 pick(s,jashin.uid);
 pick(s,base.uid);
 assert.ok(jashin.sealed);
 assert.ok(jashin.under.some(x=>x.uid===base.uid));
 assert.equal(s.players[0].seals.filter(x=>x.sealOf===jashin.uid).length,1);
 assert.equal(s.players[0].deck.length,10);
 resolveTrigger(s,TOTTORO);
 assert.equal(s.decision?.task?.source,TOTTORO);
 pick(s,revive.uid);
 if(values(s).includes(null))pick(s,null);
 assert.ok(has(s,0,'battle',revive));
 assert.ok(!has(s,0,'battle',base));
 assert.ok(!s.decision);
 assert.equal(s.players[0].deck.length,10);
 assert.deepEqual(physical(s),all);
});

test('QA48926 and QA48927: sealed deployment retains placement states and can be replaced by Gaia',()=>{
 for(const blocked of [false,true]){
  const s=field(),target=add(s,0,'grave',blocked?DEDODAM:EX_LIFE);
  if(blocked)add(s,1,'battle',GAIA);
  cast(s,MEMOTTA);
  pick(s,target.uid);
  if(values(s).includes(null))pick(s,null);
  if(blocked){
   assert.ok(has(s,0,'mana',target));
   assert.equal(s.players[0].seals.length,0);
   assert.equal(s.players[0].deck.length,11);
  }else{
   assert.ok(has(s,0,'battle',target)&&target.sealed&&target.tapped);
   assert.ok(s.players[0].shields.some(x=>x.uid===target.exLifeShieldUid));
   assert.equal(s.players[0].deck.length,9);
  }
 }
});

test('Memotta selects up to two within a shared five-cost limit and both are sealed',()=>{
 const s=field(),small=add(s,0,'grave',FIRE),large=add(s,0,'grave',JASHIN),other=add(s,0,'grave',GREEN);
 cast(s,MEMOTTA);
 pick(s,small.uid);
 assert.ok(!values(s).includes(large.uid));
 pick(s,other.uid);
 assert.ok(small.sealed&&other.sealed);
 assert.ok(has(s,0,'grave',large));
 assert.equal(s.players[0].seals.length,2);
});

test('QA46869: Raid adds an eligible base, then each lost base gives one discard and one optional break',()=>{
 const s=field(),base=add(s,0,'battle',FIRE),jashin=add(s,0,'hand',JASHIN);
 const [raidBase]=s.players[0].deck;
 const enemyHand=[add(s,1,'hand',LIGHT),add(s,1,'hand',LIGHT)];
 const all=physical(s);
 act(s,'play',a=>a.uid===jashin.uid);
 act(s,'evolve',a=>a.baseUid===base.uid);
 pick(s,raidBase.uid);
 drain(s);
 assert.deepEqual(jashin.under.map(x=>x.uid),[base.uid,raidBase.uid]);
 s.active=1;
 s.phase='main';
 const hand=add(s,1,'hand',HAND);
 const before=physical(s);
 act(s,'play',a=>a.uid===hand.uid);
 act(s,'effect',a=>a.targets.some(t=>t.uid===jashin.uid));
 assert.ok(has(s,0,'battle',jashin)&&!jashin.under?.length);
 resolveTrigger(s,JASHIN);
 drain(s);
 assert.ok(enemyHand.every(x=>has(s,1,'grave',x)));
 assert.equal(s.players[1].shields.length,3);
 assert.equal(before.length,all.length+1);
 assert.deepEqual(physical(s),before);
});

test('QA46868: a zero-power Jashin still triggers when the replacement removes its base',()=>{
 const s=field(),base=inst(FIRE),jashin=add(s,0,'battle',JASHIN,{under:[base]});
 const enemyHand=add(s,1,'hand',LIGHT),spell=add(s,1,'hand','dmrp17-043');
 s.active=1;
 act(s,'play',a=>a.uid===spell.uid);
 pick(s,jashin.uid);
 drain(s);
 assert.ok([base,jashin].every(x=>has(s,0,'grave',x)));
 assert.ok(has(s,1,'grave',enemyHand));
 assert.equal(s.players[1].shields.length,5);
});

test('QA46870: a normal evolution leaving with its bases does not trigger Jashin',()=>{
 const s=field(),jashin=add(s,0,'battle',JASHIN),base=inst(FIRE);
 const regular=add(s,0,'battle','dm32-047',{under:[base]});
 const enemyHand=add(s,1,'hand',LIGHT),spell=add(s,1,'hand',HAND);
 s.active=1;
 act(s,'play',a=>a.uid===spell.uid);
 act(s,'effect',a=>a.targets.some(t=>t.uid===regular.uid));
 drain(s);
 assert.ok([base,regular].every(x=>has(s,0,'grave',x)));
 assert.ok(has(s,0,'battle',jashin));
 assert.ok(has(s,1,'hand',enemyHand));
 assert.equal(s.players[1].shields.length,5);
});
