import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const ADAM='dmrp21-002',HURRICANE='dmrp20-004',WATER='dm01-083',FIRE='dm01-097';
const SEED='dm22ex1-086',NO_SHINKA='dmrp22-072',SPIRAL='dm01-086';
const add=(s,p,zone,id,props={})=>{const x=Object.assign(inst(id),props);s.players[p][zone].push(x);return x;};
const pick=(s,v)=>act(s,'extended',a=>{
 const {value}=s.decision.choices[a.choice];
 return (value?.uid??value)===v;
});
const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const values=s=>s.decision?.choices?.map(({value})=>value?.uid??value)??[];
const read=name=>JSON.parse(readFileSync(new URL('../tools/'+name,import.meta.url)));

test('the two official Adam prints use the original ID and image',()=>{
 const m=read('support-phase-1341.json'),registry=createCatalogue(snapshot,data.cards,details),c=e.card(ADAM);
 assert.deepEqual([c.cost,c.power,c.blocker,c.starEvolution,c.civ,c.limit],[4,5000,true,true,'水',4]);
 assert.deepEqual(m.printAliases.map(x=>x.id),['dmrp21-9A']);
 for(const row of [...m.cards,...m.printAliases]){
  assert.deepEqual(registry.resolveRows([{id:row.id,count:1}]),[{id:ADAM,count:1}]);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[ADAM]);
  assert.equal(read('image-reference-prints.json').prints.find(r=>r.id===row.id).image,row.image);
 }
 assert.equal(CARD_IMAGES[ADAM],m.cards[0].image);
});

test('the number is declared only when Adam enters by summoning and lasts until the next friendly turn',()=>{
 const s=setup(),base=add(s,0,'battle',WATER),adam=add(s,0,'hand',ADAM);
 const victim=add(s,1,'battle',FIRE),printed=e.card(SPIRAL).cost;
 assert.equal(e.card(victim).cost,printed);
 play(s,adam);
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.equal(s.decision.task.op,'g9Number');pick(s,printed);
 assert.equal(e.canCastSpell(s,1,e.card(SPIRAL)),false);
 assert.equal(e.canCastSpell(s,0,e.card(SPIRAL)),true);
 s.phase='attack';act(s,'endTurn');drain(s);
 assert.equal(e.canCastSpell(s,1,e.card(SPIRAL)),false);
 s.phase='attack';
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===victim.uid));
 act(s,'endTurn');drain(s);
 assert.equal(e.canCastSpell(s,1,e.card(SPIRAL)),true);
});

test('Hurricane destroys the old attacker only when its surviving base is a creature (QA41640)',()=>{
 for(const baseId of [WATER,SEED]){
  let s=setup();
  const old=inst(baseId),x=add(s,0,'battle',ADAM,{under:[old]}),valid=add(s,0,'battle',SEED),
   tapped=add(s,0,'battle',SEED,{tapped:true}),plain=add(s,0,'battle',NO_SHINKA);
  add(s,1,'battle',HURRICANE);
  attack(s,x.uid);act(s,'noBlock');drainUntilReturn(s);
  assert.equal(s.decision.task.op,'g34_AdamReturn1341');
  pick(s,true);
  assert.ok(has(s,0,'hand',x)&&has(s,0,'battle',old));
  assert.ok(values(s).includes(valid.uid));
  assert.ok(!values(s).includes(tapped.uid));
  assert.ok(!values(s).includes(plain.uid)); // QA41642
  s=JSON.parse(JSON.stringify(s));
  pick(s,valid.uid);drain(s);
  const host=s.players[0].battle.find(y=>y.uid===x.uid);
  assert.ok(host);
  assert.deepEqual(host.under.map(y=>y.uid),[valid.uid]);
  assert.equal(host.tapped,false);
  assert.equal(has(s,0,'grave',old),baseId===WATER);
  assert.equal(has(s,0,'battle',old),baseId===SEED);
  assert.equal(s.extLimits?.some(y=>y.kind==='numberCast')??false,false); // QA41179
 }
});

function drainUntilReturn(s){
 for(let i=0;s.decision&&s.decision.task?.op!=='g34_AdamReturn1341'&&i<15;i++)e.step(s,e.chooseAI(s));
}

test('Adam may decline returning or decline rebuilding after the actual return (QA41178)',()=>{
 for(const bounce of [true,false]){
  const s=setup(),base=inst(WATER),x=add(s,0,'battle',ADAM,{under:[base]});
  add(s,0,'battle',SEED);
  attack(s,x.uid);act(s,'noBlock');drainUntilReturn(s);
  pick(s,bounce?true:null);
  if(bounce)pick(s,null);
  drain(s);
  assert.equal(has(s,0,'hand',x),bounce);
  assert.equal(has(s,0,'battle',base),bounce);
  assert.equal(has(s,0,'battle',x),!bounce);
 }
});
