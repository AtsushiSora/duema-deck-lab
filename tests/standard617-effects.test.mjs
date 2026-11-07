import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,inst,give,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-617.json',import.meta.url)));
const EINE='dm23rp3-022', COCCO='dm25rp1-068', TREE='dm25sp1-012';
const REDOUT='dm25ex2-007', FIRE='dm01-097', WATER='dm01-083', SEED='dm22rp2-048';
const BLOCKER='dm01-076', BOUNCE='dm01-086';
function field(){
 const s=setup();
 s.active=0;
 for(const p of [0,1])give(s,p,'deck',Array(12).fill(WATER));
 return s;
}
function place(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
function play(s,id){
 const x=place(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{
 const v=s.decision.choices[a.choice].value;
 return (v?.uid??v)===value;
});
const values=s=>s.decision.choices.map(o=>o.value?.uid??o.value);

for(const row of cards)test(row.name+' matches its official printing and compiled effects',()=>{
 const detail=details.cards.find(c=>c.id===row.id),c=e.card(row.id);
 assert.deepEqual(detail.faces,row.faces);
 assert.deepEqual(standardCardSpec(detail,{phase:617}),row.spec);
 assert.throws(()=>standardCardSpec(detail,{phase:616}));
 for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
 assert.equal(c.limit,regulationVerification.limits[row.id]);
 assert.equal(CARD_IMAGES[row.id],row.image);
 assert.ok(row.verification.facesMatched);
});

test('Cocco destroys a cheap noncreature element when it enters evolved and when it becomes an evolution base',()=>{
 const s=field(),base=place(s,0,'battle',FIRE),first=place(s,1,'battle',SEED),other=place(s,1,'battle',SEED);
 const large=place(s,1,'battle',REDOUT);
 const cocco=play(s,COCCO);
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.deepEqual(new Set(values(s)),new Set([first.uid,other.uid]));
 pick(s,first.uid);
 assert.ok(s.players[1].grave.includes(first));
 const next=play(s,REDOUT);
 act(s,'evolve',a=>a.baseUid===cocco.uid);
 pick(s,other.uid);
 assert.ok(next.under.includes(cocco));
 assert.ok(s.players[1].grave.includes(other)&&s.players[1].battle.includes(large));

 const otherGame=field(),untouched=place(otherGame,1,'battle',SEED);
 play(otherGame,COCCO);
 act(otherGame,'evolve',a=>!a.baseUid);
 assert.equal(otherGame.decision,null);
 assert.ok(otherGame.players[1].battle.includes(untouched));
});

test('Tree puts an enemy element into its owner’s mana and draws even if there is no target',()=>{
 for(const withTarget of [false,true]){
  const s=field(),seed=withTarget?place(s,1,'battle',SEED):null;
  const top=s.players[0].deck[0];
  play(s,TREE);
  if(seed){
   assert.deepEqual(values(s),[seed.uid]);
   pick(s,seed.uid);
   assert.ok(s.players[1].mana.includes(seed));
  }
  assert.ok(s.players[0].hand.includes(top));
 }
});

test('Eine gets a budget-seven destruction choice from a qualifying shield break and can draw for each element removed',()=>{
 const s=field(),attacker=place(s,0,'battle',REDOUT),seed=place(s,0,'battle',SEED);
 const blocker=place(s,0,'battle',BLOCKER),other=place(s,0,'battle',REDOUT);
 give(s,1,'shields',[EINE,WATER]);
 const [eine,handCard]=s.players[1].shields;
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.cardId===EINE);
 assert.equal(s.decision.task.g513CostBudget,7);
 pick(s,attacker.uid);
 assert.ok(!values(s).includes(other.uid));
 pick(s,seed.uid);
 pick(s,blocker.uid);
 drain(s);
 assert.ok(s.players[1].battle.includes(eine));
 assert.ok([attacker,seed,blocker].every(x=>s.players[0].grave.includes(x)));
 assert.equal(s.players[1].hand.length,4);
 assert.ok(s.players[1].hand.includes(handCard));
 assert.ok(s.players[0].battle.includes(other));
});

test('Eine watches opposing returns as well as destruction and never draws for a friendly return',()=>{
 for(const owner of [0,1]){
  const s=field(),eine=place(s,0,'battle',EINE),target=place(s,owner,'battle',WATER);
  play(s,BOUNCE);
  act(s,'effect',a=>a.targets[0].uid===target.uid);
  if(owner===1){
   assert.equal(s.decision.task.op,'g34_Draw');
   pick(s,1);
  }else assert.equal(s.decision,null);
  assert.equal(s.players[0].hand.length,1);
  assert.ok(s.players[owner].hand.includes(target));
  assert.ok(s.players[0].battle.includes(eine));
 }
});

test('Eine enters on a single-shield trigger without the bonus removal',()=>{
 const s=field(),attacker=place(s,0,'battle',WATER);
 give(s,1,'shields',[EINE]);
 const eine=s.players[1].shields[0];
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.cardId===EINE);
 drain(s);
 assert.ok(s.players[1].battle.includes(eine));
 assert.ok(s.players[0].battle.includes(attacker));
 assert.equal(s.players[1].hand.length,0);
});

test('Eine does not watch opposing creatures destroyed simultaneously with it',()=>{
 const s=field(),eine=place(s,0,'battle',EINE);
 for(let i=0;i<2;i++)place(s,0,'battle',WATER);
 for(let i=0;i<3;i++)place(s,1,'battle',WATER);
 const count=s.players[0].deck.length;
 play(s,'dm14-015');
 assert.ok(s.players[0].grave.includes(eine));
 assert.equal(s.players[1].grave.length,3);
 assert.equal(s.decision,null);
 assert.equal(s.players[0].deck.length,count);
});
