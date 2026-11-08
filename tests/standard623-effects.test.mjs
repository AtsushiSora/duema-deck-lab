import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-623.json',import.meta.url)));
const MIKEL='dmrp20-001', ROBIN='dmrp20-002', ENERGY='dm06-085', NATURE='dm01-108';

function field(){
 const s=setup();
 s.active=0;
 for(const p of [0,1])give(s,p,'deck',Array(16).fill(NATURE));
 return s;
}
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
function play(s,p,id){
 const x=put(s,p,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{
 const v=s.decision.choices[a.choice].value;
 return (v?.uid??v)===value;
});

for(const row of cards)test(row.name+' matches the verified card and previous phase boundary',()=>{
 const detail=details.cards.find(c=>c.id===row.id),c=e.card(row.id);
 assert.deepEqual(detail.faces,row.faces);
 assert.deepEqual(standardCardSpec(detail,{phase:623}),row.spec);
 assert.throws(()=>standardCardSpec(detail,{phase:622}));
 for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
 assert.equal(c.limit,regulationVerification.limits[row.id]);
 assert.equal(CARD_IMAGES[row.id],row.image);
 assert.ok(row.verification.facesMatched);
});

test('Mikelatres adds EX Life and can freeze an already tapped enemy on entry and after a spell',()=>{
 const s=field(),enemy=put(s,1,'battle',NATURE),another=put(s,1,'battle',NATURE);
 enemy.tapped=true;
 another.tapped=true;
 play(s,0,MIKEL);
 assert.equal(s.players[0].shields.length,6);
 pick(s,enemy.uid);
 play(s,0,ENERGY);
 assert.equal(s.decision.task.op,'g34_PaySpell485');
 assert.deepEqual(s.decision.choices.map(x=>x.value),[3,2,1,0,false]);
 pick(s,1);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,9);
 assert.equal(s.decision.source,MIKEL);
 pick(s,another.uid);
 assert.equal(s.players[0].hand.length,2);
 act(s,'toAttack');act(s,'endTurn');drain(s);
 assert.equal(s.active,1);
 assert.ok(enemy.tapped&&another.tapped);
 assert.ok(!s.decision);
 act(s,'skipCharge');act(s,'toAttack');act(s,'endTurn');drain(s);
 act(s,'skipCharge');act(s,'toAttack');act(s,'endTurn');drain(s);
 assert.equal(s.active,1);
 assert.ok(!enemy.tapped&&!another.tapped);
});

test('Power Robin chooses after its own entry, another allied creature and each allied spell',()=>{
 const s=field(),enemy=put(s,1,'battle',NATURE);
 play(s,0,ROBIN);
 assert.equal(s.players[0].shields.length,6);
 assert.equal(s.decision.task.op,'g34_Choose');
 pick(s,0);
 pick(s,enemy.uid);
 drain(s);
 assert.ok(s.players[1].hand.includes(enemy));
 assert.equal(s.players[0].hand.length,0);
 const first=s.players[0].deck[0];
 play(s,0,NATURE);
 assert.equal(s.decision.source,ROBIN);
 pick(s,1);
 assert.ok(s.players[0].hand.includes(first));
 const before=s.players[0].hand.length;
 play(s,0,ENERGY);
 assert.equal(s.decision.source,ROBIN);
 pick(s,1);
 drain(s);
 assert.equal(s.players[0].hand.length,before+3);
 s.active=1;
 play(s,1,NATURE);
 play(s,1,ENERGY);
 drain(s);
 assert.equal(s.players[0].hand.length,before+3);
});

test('CPU chooses Power Robin’s draw on an empty enemy board and bounce against a threat',()=>{
 for(const enemy of [false,true]){
  const s=field();
  if(enemy)put(s,1,'battle','dm23ex2-016');
  play(s,0,ROBIN);
  const action=e.chooseHeuristicAI(s);
  assert.equal(s.decision.choices[action.choice].value,enemy?0:1);
 }
});

test('CPU keeps its last response in hand if it can charge another card of the needed color',()=>{
 for(const id of [MIKEL,ROBIN]){
  const s=field();
  s.phase='charge';
  give(s,0,'mana',[]);
  const color=e.civilizations(e.card(id))[0];
  const response=put(s,0,'hand',id),charge=put(s,0,'hand',color==='光'?'dm01-075':'dm01-083');
  const action=e.chooseHeuristicAI(s);
  assert.equal(action.kind,'charge');
  assert.equal(action.uid,charge.uid);
  e.step(s,action);
  assert.ok(s.players[0].hand.includes(response));
 }
});
