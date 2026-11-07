import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,inst,give,act} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-612.json',import.meta.url)));
const KNIFE='dm22sd1-007', SNAIL='dmrp06-028', BLUES='dm24rp3-018';
const SMALL='dm01-083', MEDIUM='dmx12b-004', SIX_K='dmr08-036', DEATH='dm01-027';
function place(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{
 const v=s.decision.choices[a.choice].value;
 return (v?.uid??v)===value;
});
function play(s,id,face=0){
 const x=place(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&(a.face??0)===face);
 return x;
}
function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(8).fill(SMALL));
 return s;
}

for(const row of cards)test(row.name+' matches its official printing and compiled effects',()=>{
 const detail=details.cards.find(c=>c.id===row.id),c=e.card(row.id);
 assert.deepEqual(detail.faces,row.faces);
 assert.deepEqual(standardCardSpec(detail,{phase:612}),row.spec);
 assert.throws(()=>standardCardSpec(detail,{phase:611}));
 for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
 assert.equal(c.limit,regulationVerification.limits[row.id]);
 assert.equal(CARD_IMAGES[row.id],row.image);
 assert.ok(row.verification.facesMatched);
});

test('Knife weakens only opponents and offers one draw for multiple simultaneous deaths',()=>{
 const s=field(),ally=place(s,0,'battle',SMALL),big=place(s,1,'battle',MEDIUM);
 const small=[place(s,1,'battle',SMALL),place(s,1,'battle','dm01-076')];
 play(s,KNIFE);
 assert.equal(e.power(big,false,s),2000);
 assert.equal(e.power(ally,false,s),1000);
 assert.ok(small.every(x=>s.players[1].grave.includes(x)));
 assert.equal(s.decision.task.op,'g34_Draw');
 pick(s,1);
 assert.equal(s.players[0].hand.length,1);
 assert.equal(s.decision,null);
});

test('Knife cannot draw after an earlier death and can draw on the next turn',()=>{
 const s=field(),first=place(s,1,'battle',MEDIUM),second=place(s,1,'battle',SMALL);
 play(s,DEATH);
 act(s,'effect',a=>a.targets.some(t=>t.uid===first.uid));
 const knife=play(s,KNIFE);
 assert.ok(s.players[1].grave.includes(second));
 assert.equal(s.decision,null);
 s.phase='attack';
 act(s,'endTurn');
 assert.equal(s.active,1);
 s.phase='main';
 play(s,DEATH);
 act(s,'effect',a=>a.targets.some(t=>t.uid===knife.uid));
 assert.equal(s.decision.player,0);
 pick(s,1);
 assert.equal(s.players[0].hand.length,1);
});

test('Blues chooses between bouncing one unrestricted creature and bouncing all creatures costing two or less',()=>{
 for(const sweep of [false,true]){
  const s=field(),big=place(s,1,'battle',MEDIUM);
  const small=[place(s,1,'battle',SMALL),place(s,1,'battle',SMALL)];
  const ally=place(s,0,'battle',SMALL);
  play(s,BLUES);
  assert.deepEqual(s.decision.choices.map(o=>o.value),[0,1]);
  if(sweep){
   e.step(s,e.chooseAI(s));
   assert.ok(small.every(x=>s.players[1].hand.includes(x)));
   assert.ok(s.players[1].battle.includes(big));
  }else{
   pick(s,0);
   pick(s,big.uid);
   assert.ok(s.players[1].hand.includes(big));
   assert.ok(small.every(x=>s.players[1].battle.includes(x)));
  }
  assert.ok(s.players[0].battle.includes(ally));
 }
});

test('Snail reduces its owner’s qualifying summons without changing printed cost or affecting the other player',()=>{
 const s=field(),target=e.card(SIX_K),snail=play(s,SNAIL);
 assert.equal(target.power,6000);
 assert.equal(e.summonCost(s,0,target),target.cost-1);
 assert.equal(e.summonCost(s,1,target),target.cost);
 assert.equal(e.summonCost(s,0,e.card(SMALL)),2);
 snail.g35Ignored=s.turn;
 assert.equal(e.summonCost(s,0,target),target.cost);
});

test('Golchop’s spell face triggers from shields and moves enemy creatures at current power 4000 or lower',()=>{
 const s=field(),attacker=place(s,0,'battle',MEDIUM),buffed=place(s,0,'battle',MEDIUM),ally=place(s,1,'battle',SMALL);
 buffed.powerModifiers=[{amount:500}];
 give(s,1,'shields',[SNAIL]);
 const spell=s.players[1].shields[0];
 s.phase='attack';
 act(s,'attack',a=>a.uid===attacker.uid&&a.target==='player');
 if(s.decision?.type==='block')act(s,'noBlock');
 const use=e.chooseAI(s);
 assert.equal(use.kind,'useTrigger');
 assert.equal(use.face,1);
 e.step(s,use);
 assert.ok(s.players[0].mana.includes(attacker));
 assert.ok(s.players[0].battle.includes(buffed));
 assert.ok(s.players[1].battle.includes(ally));
 assert.ok(s.players[1].grave.includes(spell));
});
