import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-604.json',import.meta.url)));
const PRIEST='dm25rp1-023', RANRAN='dm24rp4-049', MAX='dmrp14-027', KILL='dmrp02-007', TIGER='dmr14-013';
const WATER='dm01-083', DARK='dm01-090', LIGHT='dm01-075', SEED='dmrp22-025';
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const values=s=>s.decision.choices.map(o=>o.value?.uid??o.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);

function field(active=0){
 const s=setup();
 s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(12).fill(WATER));
 return s;
}

function place(s,p,z,id){
 const x=inst(id);
 s.players[p][z].push(x);
 return x;
}

function play(s,id){
 const x=place(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}

for(const row of cards)test(row.name+' matches its official printing and compiled effects',()=>{
 const detail=details.cards.find(c=>c.id===row.id),c=e.card(row.id);
 assert.deepEqual(detail.faces,row.faces);
 assert.deepEqual(standardCardSpec(detail,{phase:604}),row.spec);
 assert.throws(()=>standardCardSpec(detail,{phase:603}));
 for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
 assert.equal(c.limit,regulationVerification.limits[row.id]);
 assert.equal(CARD_IMAGES[row.id],row.image);
 assert.ok(row.verification.facesMatched);
});

test('黄昏司祭 can bounce an element and lock a creature when the returned card is discarded',()=>{
 const s=field(),seed=place(s,1,'battle',SEED),creature=place(s,1,'battle',WATER);
 play(s,PRIEST);
 pick(s,seed.uid);
 assert.ok(has(s,1,'grave',seed));
 pick(s,creature.uid);
 assert.equal(creature.tapped,true);
 act(s,'toAttack');
 act(s,'endTurn');
 assert.equal(s.active,1);
 assert.equal(creature.tapped,true);
});

test('黄昏司祭 still causes a blind discard when the opponent has no element',()=>{
 const s=field(),hand=place(s,1,'hand',WATER);
 play(s,PRIEST);
 assert.ok(has(s,1,'grave',hand));
 assert.equal(s.decision,null);
});

test('ランラン can use its shield trigger to bounce an element or discard from hand',()=>{
 for(const mode of [0,1]){
  const s=field(1),attacker=place(s,1,'battle',WATER),seed=place(s,1,'battle',SEED),hand=place(s,1,'hand',LIGHT);
  give(s,0,'shields',[RANRAN]);
  attack(s,attacker.uid);
  act(s,'noBlock');
  act(s,'useTrigger');
  pick(s,mode);
  if(mode===0)pick(s,seed.uid);
  assert.equal(has(s,1,'hand',seed),mode===0);
  assert.equal(has(s,1,'grave',hand),mode===1);
 }
});

test('鬼札MAX can use both modes with a single Darkness/Fire creature',()=>{
 for(const ally of [DARK,'promoy11-070']){
  const s=field(),small=place(s,1,'battle',WATER),big=place(s,1,'battle','dm02-002'),hand=place(s,1,'hand',LIGHT);
  place(s,0,'battle',ally);
  play(s,MAX);
  const both=ally!==DARK;
  assert.deepEqual(values(s),both?[0,1,2]:[0,1]);
  pick(s,both?2:0);
  assert.ok(values(s).includes(small.uid)&&!values(s).includes(big.uid));
  pick(s,small.uid);
  assert.ok(has(s,1,'grave',small));
  assert.equal(has(s,1,'grave',hand),both);
 }
});

test('キラードン makes the affected player keep their own creature or hand card',()=>{
 const s=field(),keep=place(s,1,'battle','dmrp01-041'),other=place(s,1,'battle',WATER),third=place(s,1,'battle',LIGHT);
 const kill=play(s,KILL);
 assert.equal(s.decision.player,1);
 pick(s,keep.uid);
 assert.ok(has(s,1,'battle',keep)&&has(s,1,'grave',other)&&has(s,1,'grave',third));
 drain(s);
 s.active=1;
 s.phase='main';
 const keepHand=place(s,1,'hand',WATER),drop=place(s,1,'hand',LIGHT);
 play(s,'dm01-027');
 act(s,'effect',a=>a.targets.some(t=>t.uid===kill.uid));
 assert.equal(s.decision.player,1);
 pick(s,keepHand.uid);
 assert.ok(has(s,1,'hand',keepHand)&&has(s,1,'grave',drop));
});

test('タイガニトロ checks the owner’s Darkness mana, including tapped cards, at their turn end',()=>{
 for(const count of [4,5]){
  const s=field();
  place(s,0,'battle',TIGER);
  give(s,0,'mana',Array(count).fill(DARK).concat(LIGHT));
  s.players[0].mana.forEach(x=>x.tapped=true);
  const keep=place(s,1,'hand',LIGHT),other=place(s,1,'hand',WATER);
  act(s,'toAttack');
  act(s,'endTurn');
  if(count===5){
   assert.equal(s.decision.player,1);
   pick(s,keep.uid);
  }
  assert.ok(has(s,1,'hand',keep));
  assert.equal(has(s,1,'grave',other),count===5);
 }
});

test('each タイガニトロ triggers and even a lone card can be chosen as the card to keep',()=>{
 const s=field();
 const first=place(s,0,'battle',TIGER);
 place(s,0,'battle',TIGER);
 const keep=place(s,1,'hand',LIGHT),drop=place(s,1,'hand',WATER);
 act(s,'toAttack');
 act(s,'endTurn');
 assert.equal(s.decision.type,'effectOrder');
 act(s,'orderEffect',a=>s.pendingEffects.some(x=>x.uid===first.uid&&x.effectId===a.effectId));
 pick(s,keep.uid);
 assert.deepEqual(values(s),[keep.uid]);
 pick(s,keep.uid);
 assert.ok(has(s,1,'hand',keep)&&has(s,1,'grave',drop));
 assert.equal(s.active,1);
});
