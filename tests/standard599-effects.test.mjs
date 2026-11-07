import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-599.json',import.meta.url)));
const YUKIME='dm23ex3-021', HAIKU='dm23rp4-063', JAGA='dmrp19-024', TURBO='dmr21-075', KNUCKLE='dmr17-084';
const FIRE='dm01-097', NATURE='dm01-105', WATER='dm01-083', BLOCKER='dm01-076', ONI='dmrp01-041', TRIGGER='dm04-042';
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const values=s=>s.decision.choices.map(o=>o.value?.uid??o.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
function field(active=0){
 const s=setup();
 s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(12).fill(FIRE));
 return s;
}
function place(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
function play(s,id,face){
 const x=place(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&(face===undefined||a.face===face));
 return x;
}
function deploy(s,p,id){
 const x=place(s,p,'hand',id);
 s.extTasks=[{op:'putCreature',p,source:YUKIME,uid:x.uid,origin:'hand'}];
 act(s,'toAttack');
 return x;
}

for(const row of cards)test(row.name+' matches its verified official printing and compiled rules',()=>{
 const detail=details.cards.find(c=>c.id===row.id),c=e.card(row.id);
 assert.deepEqual(detail.faces,row.faces);
 assert.deepEqual(standardCardSpec(detail,{phase:599}),row.spec);
 assert.throws(()=>standardCardSpec(detail,{phase:598}));
 for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
 assert.equal(c.limit,regulationVerification.limits[row.id]);
 assert.equal(CARD_IMAGES[row.id],row.image);
 assert.ok(row.verification.facesMatched);
});

test('ユキメ destroys non-summoned entrants on either turn without choosing them',()=>{
 for(const active of [0,1]){
  const s=field(active);
  place(s,1,'battle',YUKIME);
  const oni=deploy(s,0,ONI);
  assert.ok(has(s,0,'grave',oni));
  assert.equal(s.decision,null);
 }
 const s=field();
 place(s,1,'battle',YUKIME);
 const summoned=play(s,FIRE);
 assert.ok(has(s,0,'battle',summoned));
});

test('a creature summoned through S・トリガー survives ユキメ',()=>{
 const s=field(1),attacker=place(s,1,'battle',FIRE);
 place(s,1,'battle',YUKIME);
 give(s,0,'shields',[TRIGGER]);
 const shield=s.players[0].shields[0];
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 assert.ok(has(s,0,'battle',shield));
});

test('both Charger faces remove only blockers and finish in mana on the correct side',()=>{
 for(const [id,faceDown] of [[YUKIME,true],[HAIKU,false]]){
  const s=field(),enemy=place(s,1,'battle',BLOCKER),other=place(s,1,'battle',FIRE);
  const own=place(s,0,'battle',BLOCKER);
  const spell=play(s,id,1);
  assert.deepEqual(values(s),[enemy.uid]);
  pick(s,enemy.uid);
  assert.ok(has(s,1,'grave',enemy)&&has(s,1,'battle',other)&&has(s,0,'battle',own));
  assert.ok(has(s,0,'mana',spell));
  assert.equal(!!spell.faceDown,faceDown);
  assert.equal(spell.tapped,false);
 }
});

test('CPU can cast the Charger against a blocker with three mana',()=>{
 const s=field(),enemy=place(s,1,'battle',BLOCKER);
 give(s,0,'mana',[FIRE,FIRE,FIRE]);
 const charger=place(s,0,'hand',HAIKU);
 const action=e.chooseAI(s);
 assert.equal(action.kind,'play');
 assert.equal(action.uid,charger.uid);
 assert.equal(action.face,1);
 e.step(s,action);
 pick(s,enemy.uid);
 assert.ok(has(s,1,'grave',enemy));
});


test('ジャガ gives unblockable to creatures present at resolution until the end of the turn',()=>{
 const s=field(),first=place(s,0,'battle',FIRE);
 place(s,1,'battle',BLOCKER);
 const count=s.players[0].shields.length;
 const jaga=play(s,JAGA);
 const late=play(s,HAIKU,0);
 assert.equal(s.players[0].shields.length,count+1);
 assert.equal(e.effectiveCard(jaga,s).breaker,2);
 assert.equal(e.effectiveCard(jaga,s).unblockable,true);
 assert.equal(e.effectiveCard(first,s).unblockable,true);
 assert.ok(!e.effectiveCard(late,s).unblockable);
 attack(s,first.uid);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'));
 if(e.getLegalActions(s).some(a=>a.kind==='noBlock'))act(s,'noBlock');
 drain(s);
 act(s,'endTurn');
 assert.ok(!e.effectiveCard(first,s).unblockable);
});

test('ツインターボ checks for a nature creature after the first blocker is destroyed',()=>{
 for(const nature of [true,false]){
  const s=field(),a=place(s,1,'battle',BLOCKER),b=place(s,1,'battle',BLOCKER),other=place(s,1,'battle',FIRE);
  if(nature)place(s,0,'battle',NATURE);
  play(s,TURBO);
  assert.deepEqual(values(s),[a.uid,b.uid]);
  pick(s,a.uid);
  if(nature){
   assert.deepEqual(values(s),[b.uid]);
   pick(s,b.uid);
  }
  assert.equal(s.decision,null);
  assert.ok(has(s,1,'grave',a)&&has(s,1,'battle',other));
  assert.equal(has(s,1,'grave',b),nature);
 }
});

test('ナックルショット destroys the blocker before block declaration only at two or fewer shields',()=>{
 for(const count of [2,3]){
  const s=field(),attacker=place(s,0,'battle',KNUCKLE),target=place(s,1,'battle',BLOCKER);
  give(s,1,'shields',Array(count).fill(WATER));
  attack(s,attacker.uid);
  if(count===2)pick(s,target.uid);
  assert.equal(has(s,1,'grave',target),count===2);
  assert.equal(e.getLegalActions(s).some(a=>a.kind==='block'),count===3);
 }
});
