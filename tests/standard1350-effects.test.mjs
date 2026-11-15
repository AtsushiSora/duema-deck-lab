import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {act,attack,cast,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';

const GAMMA='dmrp09-m01',JOKER='dmex03-037',JOKER_SPELL='dmsd01-011',WAVE='dmsd11-005';
const BASIC='dm01-108',LOW_GR='dmsd11-014',FAIRY='dm06-110',VOL='dmex18-s10';
const add=(s,p,zone,id,properties={})=>{
 const card=Object.assign(inst(id),properties);
 s.players[p][zone].push(card);
 return card;
};
const choices=s=>s.decision?.choices?.map(({value})=>value?.uid??value)??[];
const pick=(s,value)=>act(s,'extended',a=>choices(s)[a.choice]===value);
const has=(s,p,zone,x)=>s.players[p][zone].some(card=>card.uid===x.uid);
function field(mana=0){
 const s=Object.assign(setup(),{active:0,format:'advance'});
 for(const p of [0,1])give(s,p,'deck',Array(25).fill(BASIC));
 give(s,0,'mana',Array(mana).fill(JOKER).concat(Array(10).fill(BASIC)));
 add(s,0,'battle',WAVE);
 give(s,0,'gr',[GAMMA,LOW_GR]);
 const [gamma]=s.players[0].gr;
 return {s,gamma};
}

test('all official Gamma Master printings identify one legal GR card',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-1350.json',import.meta.url)));
 const [row]=manifest.cards,registry=createCatalogue(snapshot,data.cards,details),c=e.card(GAMMA);
 assert.deepEqual([c.cost,c.power,c.manaValue,c.gr],[5,3000,0,true]);
 assert.equal(CARD_IMAGES[GAMMA],row.image);
 assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[GAMMA]);
 assert.equal(manifest.printAliases.length,3);
 for(const {id} of [row,...manifest.printAliases]){
  assert.deepEqual(registry.resolveRows([{id,count:2}]),[{id:GAMMA,count:2}]);
 }
 const deck={...PRESETS[0],format:'advance',grCards:[
  {id:GAMMA,count:2},{id:LOW_GR,count:2},{id:'dmex08-251',count:8}
 ]};
 assert.deepEqual(e.validateDeck(deck),[]);
 assert.ok(e.validateDeck({...deck,grCards:[{id:GAMMA,count:3},{id:'dmex08-251',count:9}]}).some(x=>/2枚まで/.test(x)));
});

test('five Jokers permit only a fresh player attack, while ten change the current power and shield count (QA32435)',()=>{
 const {s,gamma}=field(3),enemy=add(s,1,'battle',BASIC,{tapped:true});
 const under=add(s,0,'battle',BASIC,{under:[inst(JOKER),inst(JOKER)]});
 cast(s,FAIRY);drain(s);
 assert.ok(has(s,0,'battle',gamma));
 assert.equal(gamma.summonedTurn,s.turn);
 s.phase='attack';
 const targets=()=>[...new Set(e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===gamma.uid).map(a=>a.target))];
 assert.deepEqual(targets(),[]);
 add(s,0,'mana',JOKER_SPELL);
 assert.deepEqual(targets(),['player']);
 for(let i=0;i<4;i++)add(s,0,'mana',JOKER);
 assert.equal(e.power(gamma,false,s),3000);
 assert.equal(e.effectiveCard(gamma,s).breaker,undefined);
 const tenth=add(s,0,'battle',JOKER);
 assert.equal(e.power(gamma,false,s),11000);
 assert.equal(e.effectiveCard(gamma,s).breaker,2);
 assert.ok(!targets().includes(enemy.uid));
 assert.equal(under.under.length,2);
 tenth.faceDown=true;
 assert.equal(e.power(gamma,false,s),3000);
});

test('Fever discards any number of own Joker creatures and destroys that many eligible enemies together',()=>{
 let {s,gamma}=field(9);
 cast(s,FAIRY);drain(s);
 const payment=[add(s,0,'hand',JOKER),add(s,0,'hand',JOKER)];
 const other=[add(s,0,'hand',JOKER_SPELL),add(s,0,'hand',BASIC)];
 const victims=[add(s,1,'battle',BASIC),add(s,1,'battle','dmx22b-010')];
 const big=add(s,1,'battle','dmx22b-011'),unused=add(s,1,'battle',BASIC);
 attack(s,gamma.uid);
 assert.equal(s.decision.task.op,'g34_HandCycle460');
 assert.deepEqual(choices(s),[...payment.map(x=>x.uid),null]);
 pick(s,payment[0].uid);
 s=JSON.parse(JSON.stringify(s));
 pick(s,payment[1].uid);
 assert.ok(payment.every(x=>has(s,0,'grave',x)));
 assert.ok(other.every(x=>has(s,0,'hand',x)));
 assert.equal(s.decision.task.n,2);
 assert.ok(!choices(s).includes(big.uid));
 pick(s,victims[0].uid);
 assert.ok(victims.every(x=>has(s,1,'battle',x)));
 pick(s,victims[1].uid);drain(s);
 assert.ok(victims.every(x=>has(s,1,'grave',x)));
 assert.ok([big,unused].every(x=>has(s,1,'battle',x)));
 assert.equal(s.players[1].shields.length,3);
});

test('Fever can decline the discard and never triggers below ten Jokers',()=>{
 for(const count of [8,9]){
  const {s,gamma}=field(count);
  cast(s,FAIRY);drain(s);
  const payment=add(s,0,'hand',JOKER),enemy=add(s,1,'battle',BASIC);
  attack(s,gamma.uid);
  if(count===9)pick(s,null);
  else assert.notEqual(s.decision?.task?.op,'g34_HandCycle460');
  drain(s);
  assert.ok(has(s,0,'hand',payment)&&has(s,1,'battle',enemy));
  assert.equal(s.players[1].shields.length,count===9?3:4);
 }
});

test('a real Gamma Master GR summon gives Voljaaku its current power, including Fever',()=>{
 for(const [count,power] of [[0,3000],[9,11000]]){
  const {s,gamma}=field(count);
  add(s,0,'battle',VOL);
  const enemy=add(s,1,'battle',BASIC),exact=add(s,1,'battle',power===3000?'dmx22b-003':'dmx22b-011');
  assert.equal(e.power(exact,false,s),power);
  cast(s,FAIRY);
  assert.ok(has(s,0,'battle',gamma));
  assert.equal(s.decision.task.g506PowerBudget,power);
  assert.ok(choices(s).includes(enemy.uid));
  assert.ok(!choices(s).includes(exact.uid));
  pick(s,enemy.uid);drain(s);
  assert.ok(has(s,1,'grave',enemy)&&has(s,1,'battle',exact));
 }
});
