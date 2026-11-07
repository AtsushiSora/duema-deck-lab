import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,inst,give,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-616.json',import.meta.url)));
const WADA='dm26ex2-019', MARI='dm23rp1-027', DASENZE='dmrp14-013';
const WATER='dm01-083', LIGHT='dm01-076', GATE='dm16-007', BOUNCE='dm01-086';
const CLOCK='dmr09-021', REDOUT='dm25ex2-007', SEED='dmsd20-015', ACE='dm22rp2-S8';
function field(active=0){
 const s=setup();
 s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(12).fill(WATER));
 return s;
}
function place(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
function play(s,id,face=0){
 const x=place(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&(a.face??0)===face);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{
 const v=s.decision.choices[a.choice].value;
 return (v?.uid??v)===value;
});

for(const row of cards)test(row.name+' matches its official printing and compiled effects',()=>{
 const detail=details.cards.find(c=>c.id===row.id),c=e.card(row.id);
 assert.deepEqual(detail.faces,row.faces);
 assert.deepEqual(standardCardSpec(detail,{phase:616}),row.spec);
 assert.throws(()=>standardCardSpec(detail,{phase:615}));
 for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
 assert.equal(c.limit,regulationVerification.limits[row.id]);
 assert.equal(CARD_IMAGES[row.id],row.image);
 assert.ok(row.verification.facesMatched);
});

test('two actual entries use the quota, spells and noncreature entries do not, and a new turn resets it',()=>{
 const s=field(),dasenze=place(s,1,'battle',DASENZE);
 play(s,WATER);
 play(s,SEED);
 play(s,WATER);
 assert.equal(s.players[0].enteredThisTurn,2);
 const third=place(s,0,'hand',WATER);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===third.uid));
 assert.equal(e.canEnterCreature(s,0,e.card(WATER),{origin:'grave',execution:false}),false);
 assert.equal(e.canEnterCreature(s,0,e.card(ACE)),true);
 play(s,BOUNCE);
 act(s,'effect',a=>a.targets[0].uid===dasenze.uid);
 act(s,'play',a=>a.uid===third.uid);
 assert.equal(s.players[0].enteredThisTurn,3);
 s.players[1].battle.push(dasenze);
 s.players[1].hand=s.players[1].hand.filter(x=>x!==dasenze);
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
 assert.equal(s.players[0].enteredThisTurn,0);
 assert.equal(e.canEnterCreature(s,0,e.card(WATER)),true);
});

test('Wada and Dasenze limit the opponent on either turn, while Mari limits only the opponent’s own turn',()=>{
 for(const id of [WADA,MARI,DASENZE]){
  const s=field(1),cap=place(s,0,'battle',id);
  s.players[1].enteredThisTurn=2;
  assert.equal(e.canEnterCreature(s,1,e.card(WATER)),false);
  assert.equal(e.canEnterCreature(s,0,e.card(WATER)),true);
  s.active=0;
  assert.equal(e.canEnterCreature(s,1,e.card(WATER)),id===MARI);
  s.active=1;
  cap.g35Ignored=s.turn;
  assert.equal(e.canEnterCreature(s,1,e.card(WATER)),true);
 }
});

test('Heaven’s Gate can choose only one blocker with one entry remaining',()=>{
 const s=field();
 place(s,1,'battle',DASENZE);
 play(s,WATER);
 const a=place(s,0,'hand',LIGHT),b=place(s,0,'hand',LIGHT);
 play(s,GATE);
 assert.equal(s.decision.task.op,'g20Select');
 pick(s,b.uid);
 assert.equal(s.decision,null);
 assert.ok(s.players[0].battle.includes(b));
 assert.ok(s.players[0].hand.includes(a));
 assert.equal(s.players[0].enteredThisTurn,2);
});

test('a declared creature trigger can resolve after a spell trigger removes the cap',()=>{
 const s=field(),dasenze=place(s,0,'battle',DASENZE),attacker=place(s,0,'battle',REDOUT);
 s.players[1].enteredThisTurn=2;
 give(s,1,'shields',[CLOCK,BOUNCE]);
 const clock=s.players[1].shields[0];
 attack(s,attacker.uid);
 act(s,'noBlock');
 for(let i=0;i<2;i++)act(s,'useTrigger');
 act(s,'effect',a=>a.targets[0].uid===dasenze.uid);
 drain(s);
 assert.ok(s.players[0].hand.includes(dasenze));
 assert.ok(s.players[1].battle.includes(clock));
});

test('Replica Auction shields one of the top three privately and lets the player order the rest on the bottom',()=>{
 const s=field();
 give(s,0,'deck',[WATER,LIGHT,DASENZE,MARI,ACE]);
 const [a,b,c,d,f]=s.players[0].deck;
 play(s,MARI,1);
 assert.deepEqual(s.decision.choices.map(o=>o.value),[a.uid,b.uid,c.uid]);
 pick(s,b.uid);
 assert.ok(s.players[0].shields.includes(b));
 assert.equal(e.observation(s,1).players[0].shields,6);
 pick(s,c.uid);
 assert.deepEqual(s.players[0].deck,[d,f,c,a]);
});

test('Gacharobo chooses one of three equal-cost creatures and leaves the others on top when the quota is reached',()=>{
 const s=field();
 place(s,1,'battle',DASENZE);
 const [a,b,c]=s.players[0].deck;
 play(s,'dmr17-s04');
 assert.equal(s.decision.task.op,'g10_Next');
 pick(s,b.uid);
 assert.equal(s.decision,null);
 assert.ok(s.players[0].battle.includes(b));
 assert.deepEqual(s.players[0].deck.slice(0,2),[a,c]);
 assert.equal(s.players[0].enteredThisTurn,2);
});
