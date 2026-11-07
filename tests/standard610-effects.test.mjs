import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,inst,give,act} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-610.json',import.meta.url)));
const TAGIA='dm09-013', LIBRA='dmr13-014', MIME='dm24rp4-054', CRUSTA='dmr17-014';
const VEHICLE='dm01-083', DRAW='dm06-085', HAND='dm01-027';
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

for(const row of cards)test(row.name+' matches its official printing and compiled effects',()=>{
 const detail=details.cards.find(c=>c.id===row.id),c=e.card(row.id);
 assert.deepEqual(detail.faces,row.faces);
 assert.deepEqual(standardCardSpec(detail,{phase:610}),row.spec);
 assert.throws(()=>standardCardSpec(detail,{phase:609}));
 for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
 assert.equal(c.limit,regulationVerification.limits[row.id]);
 assert.equal(CARD_IMAGES[row.id],row.image);
 assert.ok(row.verification.facesMatched);
});

test('Tagia makes the caster choose a hand card and then a mana card after the spell resolves',()=>{
 const s=setup();
 give(s,0,'deck',Array(6).fill(VEHICLE));
 place(s,1,'battle',TAGIA);
 const drawn=s.players[0].deck[0],mana=s.players[0].mana[0];
 play(s,DRAW);
 assert.equal(s.players[0].hand.length,2);
 assert.equal(s.decision.player,0);
 assert.equal(s.decision.task.op,'discard');
 pick(s,drawn.uid);
 assert.equal(s.decision.player,0);
 assert.equal(s.decision.task.op,'g34_ManaPick582');
 pick(s,mana.uid);
 assert.ok(s.players[0].grave.includes(drawn)&&s.players[0].grave.includes(mana));
 assert.equal(s.players[0].hand.length,1);
});

test('Tagia still takes mana if the casting player has no hand after destroying it',()=>{
 const s=setup(),tagia=place(s,1,'battle',TAGIA);
 play(s,HAND);
 act(s,'effect',a=>a.targets.some(t=>t.uid===tagia.uid));
 assert.ok(s.players[1].grave.includes(tagia));
 assert.equal(s.decision.task.op,'g34_ManaPick582');
 const mana=s.players[0].mana[0];
 pick(s,mana.uid);
 assert.ok(s.players[0].grave.includes(mana));
});

test('Libra can deploy one named card from its deck and shuffles even if the choice is skipped',()=>{
 for(const use of [true,false]){
  const s=setup();
  give(s,0,'deck',Array(6).fill(VEHICLE));
  give(s,1,'deck',[VEHICLE,LIBRA,LIBRA,VEHICLE]);
  place(s,1,'battle',LIBRA);
  const copy=s.players[1].deck[1];
  play(s,DRAW);
  assert.equal(s.decision.player,1);
  assert.deepEqual(s.decision.choices.filter(o=>o.value).map(o=>o.cardId),[LIBRA,LIBRA]);
  const rng=s.rng;
  pick(s,use?copy.uid:null);
  assert.notEqual(s.rng,rng);
  assert.equal(s.players[1].battle.includes(copy),use);
  assert.equal(s.players[1].battle.length,use?2:1);
  assert.equal(s.players[1].deck.length,use?3:4);
 }
});

test('Libra ignores its owner’s spells and the opponent’s spells outside the opponent’s turn',()=>{
 const s=setup();
 give(s,0,'deck',Array(6).fill(VEHICLE));
 give(s,1,'deck',[LIBRA,VEHICLE,VEHICLE]);
 const libra=place(s,0,'battle',LIBRA);
 place(s,0,'deck',LIBRA);
 const attacker=place(s,0,'battle',VEHICLE);
 play(s,DRAW);
 assert.equal(s.decision,null);
 give(s,1,'shields',[HAND]);
 s.phase='attack';
 act(s,'attack',a=>a.uid===attacker.uid&&a.target==='player');
 if(s.decision?.type==='block')act(s,'noBlock');
 act(s,'useTrigger');
 act(s,'effect',a=>a.targets.some(t=>t.uid===attacker.uid));
 assert.equal(s.decision,null);
 assert.ok(s.players[0].battle.includes(libra));
 assert.equal(s.players[0].battle.filter(x=>x.cardId===LIBRA).length,1);
});

test('Mime only offers an optional draw on its own end step with fewer cards in hand',()=>{
 for(const handSize of [0,1]){
  const s=setup();
  give(s,0,'deck',Array(6).fill(VEHICLE));
  give(s,1,'hand',[VEHICLE]);
  give(s,0,'hand',Array(handSize).fill(VEHICLE));
  place(s,0,'battle',MIME);
  s.phase='attack';
  act(s,'endTurn');
  if(handSize===0){
   assert.equal(s.decision.task.op,'g34_Draw');
   pick(s,1);
  }else assert.equal(s.decision,null);
  assert.equal(s.players[0].hand.length,1);
 }
});

test('Crusta gains two mana if behind on entry and gains none if tied',()=>{
 for(const behind of [true,false]){
  const s=setup();
  give(s,0,'deck',Array(6).fill(VEHICLE));
  if(behind)s.players[0].mana.pop();
  const start=s.players[0].mana.length,top=s.players[0].deck.slice(0,2);
  const crusta=play(s,CRUSTA);
  assert.equal(s.players[0].mana.length,start+(behind?2:0));
  assert.equal(top.every(x=>s.players[0].mana.includes(x)),behind);
  assert.equal(e.effectiveCard(crusta,s).blocker,true);
  crusta.entered=-1;
  s.phase='attack';
  assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===crusta.uid&&a.target==='player'));
 }
});
