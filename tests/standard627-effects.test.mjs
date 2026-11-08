import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,attack,drain,GEN} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-627.json',import.meta.url)));
const LIMIT='dm24rp3-061', WILLIDE='dm23rp1-S1', FIRE='dm01-097', DEMON='dm01-027';

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
const attacks=s=>e.getLegalActions(s).filter(a=>a.kind==='attack');
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function toAttack(s){
 if(s.phase==='charge')act(s,'skipCharge');
 if(s.phase==='main')act(s,'toAttack');
}
function finishAttack(s,x){
 attack(s,x.uid);act(s,'noBlock');drain(s);
}

for(const row of cards)test(row.name+' matches the verified print and compiler',()=>{
 const detail=details.cards.find(c=>c.id===row.id),c=e.card(row.id);
 assert.deepEqual(detail.faces,row.faces);
 assert.deepEqual(standardCardSpec(detail,{phase:627}),row.spec);
 assert.throws(()=>standardCardSpec(detail,{phase:626}));
 for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
 assert.equal(c.limit,regulationVerification.limits[row.id]);
 assert.equal(CARD_IMAGES[row.id],row.image);
 assert.ok(row.verification.facesMatched);
});

test('the spell limits the next opponent turn to one attack even after untapping and JSON resume',()=>{
 let s=field();
 const own=put(s,0,'battle',FIRE),otherOwn=put(s,0,'battle',FIRE);
 const first=put(s,1,'battle',FIRE),second=put(s,1,'battle',FIRE);
 play(s,LIMIT);
 toAttack(s);
 finishAttack(s,own);
 assert.ok(attacks(s).some(a=>a.uid===otherOwn.uid));
 act(s,'endTurn');toAttack(s);
 finishAttack(s,first);
 first.tapped=false;
 s=JSON.parse(JSON.stringify(s));
 assert.equal(attacks(s).length,0);
 act(s,'endTurn');toAttack(s);act(s,'endTurn');toAttack(s);
 assert.ok(attacks(s).some(a=>a.uid===second.uid));
});

test('Genmu suppresses the active spell restriction even when it entered after the spell resolved',()=>{
 const s=field();
 const first=put(s,1,'battle',FIRE),second=put(s,1,'battle',FIRE);
 play(s,LIMIT);
 put(s,1,'battle',GEN);
 toAttack(s);act(s,'endTurn');toAttack(s);
 finishAttack(s,first);
 assert.ok(attacks(s).some(a=>a.uid===second.uid));
});

test('Willide can add a shield on entry and protect itself until its next turn when attacking',()=>{
 const s=field(),top=s.players[0].deck[0];
 const willide=play(s,WILLIDE),before=physical(s);
 pick(s,0);
 assert.ok(s.players[0].shields.includes(top));
 willide.entered=0;
 attack(s,willide.uid);
 pick(s,1);
 act(s,'noBlock');drain(s);
 act(s,'endTurn');
 act(s,'skipCharge');
 play(s,DEMON);drain(s);
 assert.ok(s.players[0].battle.includes(willide));
 toAttack(s);act(s,'endTurn');toAttack(s);act(s,'endTurn');act(s,'skipCharge');
 play(s,DEMON);drain(s);
 assert.ok(s.players[0].grave.includes(willide));
 assert.ok(before.every(uid=>physical(s).includes(uid)));
});

test('Willide untaps when a card leaves its own shield zone',()=>{
 const s=field(1),willide=put(s,0,'battle',WILLIDE),attacker=put(s,1,'battle',FIRE);
 willide.tapped=true;
 const before=physical(s);
 finishAttack(s,attacker);
 assert.equal(willide.tapped,false);
 assert.equal(s.players[0].shields.length,4);
 assert.deepEqual(physical(s),before);
});

test('CPU chooses a shield when safe and protection with one card left',()=>{
 for(const n of [1,6]){
  const s=field();give(s,0,'deck',Array(n).fill(FIRE));
  const willide=put(s,0,'hand',WILLIDE),summon=e.chooseHeuristicAI(s);
  assert.equal(summon.kind,'play');
  assert.equal(summon.uid,willide.uid);
  e.step(s,summon);
  const a=e.chooseHeuristicAI(s);
  assert.equal(s.decision.choices[a.choice].value,n===1?1:0);
 }
});


test('the restriction waits through a caster extra turn and ends before an opponent extra turn',()=>{
 const s=field(),first=put(s,1,'battle',FIRE),second=put(s,1,'battle',FIRE);
 play(s,LIMIT);
 s.extraTurns=[{player:0}];
 toAttack(s);act(s,'endTurn');toAttack(s);
 assert.equal(s.active,0);
 assert.ok(s.extLimits.some(l=>l.kind==='g627AttackCap'&&!l.active));
 act(s,'endTurn');toAttack(s);
 assert.equal(s.active,1);
 finishAttack(s,first);
 assert.equal(attacks(s).length,0);
 s.extraTurns=[{player:1}];
 act(s,'endTurn');toAttack(s);
 assert.equal(s.active,1);
 assert.ok(attacks(s).some(a=>a.uid===second.uid));
});

test('CPU casts its attack restriction against a board that threatens its shields',()=>{
 const s=field(),spell=put(s,0,'hand',LIMIT);
 for(let i=0;i<3;i++)put(s,1,'battle',FIRE);
 give(s,0,'shields',[FIRE]);
 const action=e.chooseHeuristicAI(s);
 assert.equal(action.kind,'play');
 assert.equal(action.uid,spell.uid);
 e.step(s,action);
 assert.ok(s.extLimits.some(l=>l.kind==='g627AttackCap'));
});
