import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-632.json',import.meta.url)));
const BEETLE='dm26ex1-N020', HORROR='dm26-050', FIRE='dm01-097';
const CADDY='dm22rp1-049', SEED='dm22rp1-058', HIGH='dm01-s01', THREE='dm01-103';

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
 assert.deepEqual(standardCardSpec(detail,{phase:632}),row.spec);
 assert.throws(()=>standardCardSpec(detail,{phase:631}));
 for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
 assert.equal(c.limit,regulationVerification.limits[row.id]);
 assert.equal(CARD_IMAGES[row.id],row.image);
 assert.ok(row.verification.facesMatched);
});

test('Beetle may battle a cost-three creature on entry but cannot attack',()=>{
 const s=field(),small=put(s,1,'battle',THREE),large=put(s,1,'battle',HIGH),seed=put(s,1,'battle',SEED);
 const beetle=play(s,BEETLE),before=physical(s);
 const choices=s.decision.choices.map(q=>q.value?.uid??q.value);
 assert.deepEqual(choices,[small.uid,null]);
 pick(s,small.uid);
 drain(s);
 assert.ok(s.players[1].grave.includes(small));
 assert.ok(s.players[1].battle.includes(large));
 assert.ok(s.players[1].battle.includes(seed));
 act(s,'toAttack');
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===beetle.uid));
 assert.deepEqual(physical(s),before);
});

test('Beetle protects another creature at 12000 current power and moves itself to mana',()=>{
 const s=field(1),own=s.players[0],beetle=put(s,0,'battle',BEETLE),protectedAlly=put(s,0,'battle',HIGH);
 protectedAlly.powerModifiers=[{amount:2500,expires:"end",who:s.active}];
 assert.equal(e.power(protectedAlly,false,s),12000);
 play(s,'dm25rp4-068');
 const before=physical(s);
 pick(s,protectedAlly.uid);
 const action=e.getLegalActions(s).find(a=>a.kind==='replaceUltra'&&a.uid===beetle.uid);
 assert.equal(action.to,'mana');
 assert.match(action.label,/マナゾーン/);
 act(s,'replaceUltra',a=>a.uid===beetle.uid);
 assert.ok(own.battle.includes(protectedAlly));
 assert.ok(own.mana.includes(beetle));
 assert.equal(beetle.tapped,false);
 assert.equal(own.grave.length,0);
 assert.deepEqual(physical(s),before);
});

test('Beetle does not protect itself, a weaker ally, or a creature moved without destruction',()=>{
 for(const mode of ['self','weak','bounce']){
  const s=field(),own=s.players[0],beetle=put(s,0,'battle',BEETLE);
  const victim=mode==='self'?beetle:put(s,0,'battle',mode==='weak'?FIRE:HIGH);
  if(mode==='bounce')victim.powerModifiers=[{amount:2500,expires:"end",who:s.active}];
  s.extTasks=[{op:'g34_ExactMove',p:1,source:FIRE,owner:0,target:victim.uid,targetIncarnation:0,to:mode==='bounce'?'hand':'grave'}];
  act(s,'toAttack');
  assert.ok(!e.getLegalActions(s).some(a=>a.kind==='replaceUltra'&&a.uid===beetle.uid));
  assert.ok(own[mode==='bounce'?'hand':'grave'].includes(victim));
 }
});

test('Horror uses a legal sacrifice as a Shield Trigger and checks current power on both sides',()=>{
 const s=field(1),own=s.players[0],enemy=s.players[1],ally=put(s,0,'battle',CADDY);
 const tooStrong=put(s,0,'battle',FIRE),attacker=put(s,1,'battle',FIRE),strongEnemy=put(s,1,'battle',FIRE);
 for(const x of [tooStrong,strongEnemy,attacker])x.powerModifiers=[{amount:x===attacker?3000:3001,expires:"end",who:s.active}];
 give(s,0,'shields',[HORROR,FIRE]);
 give(s,0,'mana',[]);
 const [spell]=own.shields,before=physical(s);
 attack(s,attacker.uid);act(s,'noBlock');
 const trigger=e.chooseHeuristicAI(s);
 assert.equal(trigger.kind,'useTrigger');
 e.step(s,trigger);
 assert.deepEqual(s.decision.choices.map(q=>q.value.uid),[ally.uid]);
 pick(s,ally.uid);
 assert.ok(own.mana.includes(ally));
 assert.deepEqual(s.decision.choices.map(q=>q.value.uid),[attacker.uid]);
 pick(s,attacker.uid);
 assert.ok(enemy.grave.includes(attacker));
 assert.ok(own.grave.includes(spell));
 assert.deepEqual(physical(s),before);
});

test('Horror leaves the enemy alone when there is no legal allied sacrifice',()=>{
 const s=field(),enemy=put(s,1,'battle',FIRE);
 put(s,0,'battle',BEETLE);
 play(s,HORROR);
 assert.equal(s.decision,null);
 assert.ok(s.players[1].battle.includes(enemy));
});
