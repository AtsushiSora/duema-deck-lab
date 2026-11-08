import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-630.json',import.meta.url)));
const ADVENT='dm26rp1-056', NOVAL='dm26rp3-014', FIRE='dm01-097';
const SEED='dm22rp1-058', BLOCKER='dm01-076', THREE='dm01-103', HIGH='dm01-s01';

function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(16).fill(FIRE));
 return s;
}
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&!a.alternative);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{
 const v=s.decision.choices[a.choice].value;
 return (v?.uid??v)===value;
});
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();

for(const row of cards)test(row.name+' matches the verified print and compiler',()=>{
 const detail=details.cards.find(c=>c.id===row.id),c=e.card(row.id);
 assert.deepEqual(detail.faces,row.faces);
 assert.deepEqual(standardCardSpec(detail,{phase:630}),row.spec);
 if(row.id===NOVAL)assert.throws(()=>standardCardSpec(detail,{phase:629}));
 for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
 assert.equal(c.limit,regulationVerification.limits[row.id]);
 assert.equal(CARD_IMAGES[row.id],row.image);
 assert.ok(row.verification.facesMatched);
});

test('Advent executes a cheap non-creature for free before moving itself to mana',()=>{
 const s=field(),own=s.players[0],seed=put(s,0,'hand',SEED),body=put(s,0,'hand',FIRE);
 const expensive=put(s,0,'hand','dm01-040');
 give(s,0,'mana',Array(4).fill('dm01-075'));
 const spell=put(s,0,'hand',ADVENT),before=physical(s);
 const cast=e.chooseHeuristicAI(s);
 assert.equal(cast.uid,spell.uid);
 e.step(s,cast);
 assert.ok(!own.mana.includes(spell));
 assert.ok(!s.decision.choices.some(q=>[body.uid,expensive.uid].includes(q.value?.uid)));
 const action=e.chooseHeuristicAI(s);
 assert.equal(s.decision.choices[action.choice].value.uid,seed.uid);
 e.step(s,action);
 assert.ok(own.battle.includes(seed));
 assert.ok(own.mana.includes(spell));
 assert.equal(spell.tapped,false);
 assert.equal(own.mana.filter(x=>x.tapped).length,4);
 assert.deepEqual(physical(s),before);
});

test('Advent can decline the free execution and still becomes mana',()=>{
 const s=field(),own=s.players[0],seed=put(s,0,'hand',SEED);
 const spell=play(s,ADVENT);
 pick(s,null);
 assert.ok(own.hand.includes(seed));
 assert.ok(own.mana.includes(spell));
});

test('Noval draws before letting the player select multiple creatures within the total cost',()=>{
 const s=field(),own=s.players[0];
 const three=put(s,0,'hand',THREE),two=put(s,0,'hand',FIRE);
 const seed=put(s,0,'hand',SEED),high=put(s,0,'hand',HIGH);
 give(s,0,'shields',[]);
 give(s,0,'deck',[BLOCKER,FIRE,FIRE,FIRE]);
 const drawn=own.deck[0],spell=play(s,NOVAL),before=physical(s);
 assert.ok(own.hand.includes(drawn));
 assert.ok(!s.decision.choices.some(q=>[seed.uid,high.uid].includes(q.value?.uid??q.value)));
 pick(s,three.uid);
 assert.ok(!s.decision.choices.some(q=>(q.value?.uid??q.value)===two.uid));
 pick(s,drawn.uid);
 drain(s);
 assert.deepEqual(own.battle.map(x=>x.uid),[three.uid,drawn.uid]);
 assert.ok(own.grave.includes(spell));
 assert.equal(own.mana.filter(x=>x.tapped).length,4);
 assert.equal(own.shields.length,0);
 assert.deepEqual(physical(s),before);
});

for(const remaining of [0,1])test('Noval offers extra shields only on a last-shield trigger, remaining '+remaining,()=>{
 const s=field(1),own=s.players[0],attacker=put(s,1,'battle',FIRE);
 give(s,0,'mana',[]);
 give(s,0,'shields',[NOVAL,...Array(remaining).fill(FIRE)]);
 const [spell]=own.shields,[drawn,first,second]=own.deck;
 const before=physical(s);
 attack(s,attacker.uid);act(s,'noBlock');
 assert.equal(e.chooseHeuristicAI(s).kind,'useTrigger');
 act(s,'useTrigger',a=>a.uid===spell.uid);
 pick(s,null);
 if(remaining===0){
  assert.equal(s.decision.task.op,'g34_Offer');
  pick(s,true);
  assert.deepEqual(own.shields,[first,second]);
 }else{
  assert.equal(s.decision,null);
  assert.equal(own.shields.length,remaining);
 }
 assert.ok(own.hand.includes(drawn));
 assert.ok(own.grave.includes(spell));
 assert.deepEqual(physical(s),before);
});
