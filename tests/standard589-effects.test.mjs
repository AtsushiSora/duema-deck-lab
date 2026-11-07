import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-589.json',import.meta.url)));
const GIMORO='dmx11-019', BIND='dm24-014', MATADOR='dmrp05-043', BIMNAM='dmrp18-042';
const CURSE='promoy22-014', MERACCHI='dm24ex2-059', TROIS='dmr16g-035';
const LIGHT='dm01-075', FIRE='dm01-097', WATER_SPELL='dm01-086', FIRE_SPELL='dm03-051';

function field(){
  const s=setup();
  s.active=0;
  for(const p of [0,1])give(s,p,'deck',Array(20).fill(FIRE));
  return s;
}
function put(s,p,id,zone='battle'){
  const x=inst(id);
  s.players[p][zone].push(x);
  return x;
}
function play(s,id){
  const x=put(s,s.active,id,'hand');
  act(s,'play',a=>a.uid===x.uid&&!a.alternative);
  return x;
}
const value=o=>o.value?.uid??o.value;
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const canCast=(s,p,id)=>e.canCastSpell(s,p,e.card(id),'hand');
function pick(s,v){act(s,'extended',a=>value(s.decision.choices[a.choice])===v);}
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}
function passBlock(s){if(e.getLegalActions(s).some(a=>a.kind==='noBlock'))act(s,'noBlock');}

for(const row of cards)test(row.name+' matches its complete verified printing',()=>{
  const detail=details.cards.find(c=>c.id===row.id),c=e.card(row.id);
  assert.deepEqual(detail.faces,row.faces);
  assert.deepEqual(standardCardSpec(detail,{phase:589}),row.spec);
  assert.throws(()=>standardCardSpec(detail,{phase:588}));
  for(const [key,val] of Object.entries(row.spec))assert.deepEqual(c[key],val);
  assert.equal(c.limit,regulationVerification.limits[row.id]);
  assert.equal(c.manaValue,1);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.ok(row.verification.facesMatched);
});

for(const id of [MATADOR,BIMNAM,MERACCHI])test(id+' handles a non-summon entry during the opponent turn but allows summons',()=>{
  const s=field();
  put(s,1,id);
  const paid=play(s,LIGHT);
  assert.ok(has(s,0,'battle',paid));
  const deployed=put(s,0,LIGHT,'hand');
  play(s,TROIS);
  pick(s,deployed.uid);
  assert.ok(has(s,0,'grave',deployed));
  assert.equal(s.players[0].enteredThisTurn,id===MERACCHI?1:2);
  assert.equal(s.log.some(x=>x.type==='entryReplace'&&x.cardId===LIGHT),id===MERACCHI);
});

for(const id of [MATADOR,MERACCHI])test(id+' leaves off-turn entries and unpaid summons intact',()=>{
  const s=field(),attacker=put(s,0,FIRE);
  put(s,0,id);
  put(s,1,id);
  const trigger=inst('dm22rp1-055'),entrant=put(s,1,LIGHT,'hand');
  s.players[1].shields=[trigger];
  attack(s,attacker.uid);
  passBlock(s);
  if(e.getLegalActions(s).some(a=>a.kind==='breakShield'))act(s,'breakShield');
  act(s,'useTrigger',a=>a.uid===trigger.uid);
  pick(s,entrant.uid);
  assert.ok(has(s,1,'battle',entrant));
  s.phase='main';
  put(s,0,FIRE);put(s,0,FIRE);
  const free=put(s,0,'dm23ex1-011','hand');
  act(s,'play',a=>a.uid===free.uid&&a.freeSummon==='G・ゼロ');
  assert.ok(has(s,0,'battle',free));
});

test('Gimoro restricts the next opponent turn and leaves that turn’s previous shield window alone',()=>{
  let s=field();
  const attacker=play(s,GIMORO);
  attacker.entered=0;
  s.players[1].shields=[inst(WATER_SPELL)];
  attack(s,attacker.uid);
  passBlock(s);
  if(e.getLegalActions(s).some(a=>a.kind==='breakShield'))act(s,'breakShield');
  assert.ok(canCast(s,1,WATER_SPELL));
  drain(s);
  end(s);
  s=JSON.parse(JSON.stringify(s));
  assert.ok(!canCast(s,1,WATER_SPELL)&&!canCast(s,1,FIRE_SPELL)&&canCast(s,0,WATER_SPELL));
  end(s);
  assert.ok(canCast(s,1,WATER_SPELL));
});

test('Civil Bind blocks the chosen color immediately and expires after the next turn of the affected player',()=>{
  const s=field(),attacker=put(s,0,FIRE);
  const trigger=inst(BIND);
  s.players[1].shields=[trigger];
  attack(s,attacker.uid);
  passBlock(s);
  if(e.getLegalActions(s).some(a=>a.kind==='breakShield'))act(s,'breakShield');
  act(s,'useTrigger',a=>a.uid===trigger.uid);
  pick(s,'水');
  assert.ok(!canCast(s,0,WATER_SPELL)&&canCast(s,0,FIRE_SPELL)&&canCast(s,1,WATER_SPELL));
  end(s);
  assert.ok(!canCast(s,0,WATER_SPELL));
  end(s);
  assert.ok(!canCast(s,0,WATER_SPELL));
  end(s);
  assert.ok(canCast(s,0,WATER_SPELL));
});

test('Keshikasu-Curse recycles only the opposing grave to the bottom or mills its own deck',()=>{
  const s=field();
  give(s,1,'grave',[WATER_SPELL,FIRE_SPELL,LIGHT]);
  const old=s.players[1].deck.map(x=>x.uid),grave=s.players[1].grave.map(x=>x.uid).sort();
  play(s,CURSE);pick(s,0);
  assert.equal(s.players[1].grave.length,0);
  assert.deepEqual(s.players[1].deck.slice(0,old.length).map(x=>x.uid),old);
  assert.deepEqual(s.players[1].deck.slice(old.length).map(x=>x.uid).sort(),grave);
  const next=s.players[0].deck.slice(0,2);
  play(s,CURSE);pick(s,1);
  assert.deepEqual(s.players[0].grave.map(x=>x.uid),next.map(x=>x.uid));
});
