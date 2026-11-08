import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-620.json',import.meta.url)));
const ADMIRAL='promoy24-062', ISHIKAWA='dm25rp2-028', RAGILUPP='promoy24-005', SKULLET='dm25rp1-019';
const LIGHT='dm01-075', WATER='dm01-083', DARK='dm01-090', FIRE='dm01-097', NATURE='dm01-108';
const CLOCK='dmr09-021', ONI='dmrp01-041', LARGE='dm23ex2-016';
function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(15).fill(WATER));
 return s;
}
function put(s,p,zone,id){
 const x=inst(id);s.players[p][zone].push(x);return x;
}
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const pick=(s,uid)=>act(s,'extended',a=>s.decision.choices[a.choice].value?.uid===uid);
function play(s,id,base){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&!a.alternative);
 act(s,'evolve',a=>a.baseUid===base?.uid);
 return x;
}

for(const row of cards)test(row.name+' matches its official printing and compiled rules',()=>{
 const detail=details.cards.find(c=>c.id===row.id),c=e.card(row.id);
 assert.deepEqual(detail.faces,row.faces);
 assert.deepEqual(standardCardSpec(detail,{phase:620}),row.spec);
 for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
 assert.equal(c.limit,regulationVerification.limits[row.id]);
 assert.equal(CARD_IMAGES[row.id],row.image);
 assert.ok(row.verification.facesMatched);
});

test('Admiral can use DDD to evolve on the attacker and can bounce again when untapped',()=>{
 const s=field(),base=put(s,0,'battle',WATER),ineligible=put(s,0,'battle',FIRE);
 const first=put(s,1,'battle',FIRE),second=put(s,1,'battle',FIRE);
 const admiral=put(s,0,'hand',ADMIRAL),before=physical(s);
 attack(s,base.uid);act(s,'declareDDD');
 const legal=e.getLegalActions(s).filter(a=>a.kind==='summonDDD');
 assert.deepEqual(legal.map(a=>[a.cost,a.baseUid]),[[2,undefined],[2,base.uid]]);
 assert.ok(!legal.some(a=>a.baseUid===ineligible.uid));
 act(s,'summonDDD',a=>a.baseUid===base.uid);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,2);
 pick(s,first.uid);
 assert.ok(s.players[1].hand.includes(first));
 assert.equal(s.attack.attacker,admiral.uid);
 act(s,'noBlock');drain(s);
 assert.ok(e.isEvolution(admiral));
 assert.equal(s.players[1].shields.length,4);
 act(s,'endTurn');drain(s);
 s.phase='attack';act(s,'endTurn');
 pick(s,second.uid);drain(s);
 assert.ok(!admiral.tapped&&s.players[1].hand.includes(second));
 assert.deepEqual(physical(s),before);
});

test('Ishikawa evolves through Shield Trigger and can block two attacks on the same turn',()=>{
 const s=field(1),base=put(s,0,'battle',NATURE);
 const attackers=[0,1,2].map(()=>put(s,1,'battle',FIRE));
 give(s,0,'shields',[ISHIKAWA]);
 const ishikawa=s.players[0].shields[0],before=physical(s);
 attack(s,attackers[0].uid);act(s,'noBlock');act(s,'useTrigger');
 act(s,'triggerEvolve',a=>a.baseUid===base.uid);
 drain(s);
 assert.ok(e.isEvolution(ishikawa));
 for(const attacker of attackers.slice(1)){
  attack(s,attacker.uid);
  act(s,'block',a=>a.uid===ishikawa.uid);drain(s);
  assert.ok(!ishikawa.tapped);
  assert.ok(s.players[1].grave.includes(attacker));
  assert.equal(s.winner,null);
 }
 assert.deepEqual(physical(s),before);
});

test('Ragilupp trades up with Slayer and stays by losing its entire evolution stack',()=>{
 const s=field(),base=put(s,0,'battle',DARK);
 const under=inst(WATER);base.under=[under];
 const enemy=put(s,1,'battle',LARGE);enemy.tapped=true;
 const ragilupp=play(s,RAGILUPP,base),before=physical(s);
 attack(s,ragilupp.uid,enemy.uid);act(s,'noBlock');drain(s);
 assert.ok(s.players[0].battle.includes(ragilupp));
 assert.ok(!e.isEvolution(ragilupp));
 assert.ok(s.players[0].grave.includes(base)&&s.players[0].grave.includes(under));
 assert.ok(s.players[1].grave.includes(enemy));
 assert.deepEqual(physical(s),before);
});

test('Skullet destroys a non-summoned creature on either turn without choosing it',()=>{
 for(const active of [0,1]){
  const s=field(active);
  const skullet=put(s,1,'battle',SKULLET),oni=put(s,0,'hand',ONI),before=physical(s);
  s.extTasks=[{op:'putCreature',p:0,source:SKULLET,uid:oni.uid,origin:'hand'}];
  act(s,'toAttack');drain(s);
  assert.ok(s.players[0].grave.includes(oni));
  assert.ok(s.players[1].battle.includes(skullet));
  assert.deepEqual(physical(s),before);
 }
});

test('Skullet does not destroy a free Shield Trigger summon',()=>{
 const s=field(1),attacker=put(s,1,'battle',FIRE);
 put(s,1,'battle',SKULLET);
 give(s,0,'shields',[CLOCK]);
 const clock=s.players[0].shields[0],before=physical(s);
 attack(s,attacker.uid);act(s,'noBlock');act(s,'useTrigger');drain(s);
 assert.ok(s.players[0].battle.includes(clock));
 assert.deepEqual(physical(s),before);
});

test('the CPU uses Ragilupp’s stack to trade with a larger tapped threat',()=>{
 const s=field(),base=put(s,0,'battle',DARK),enemy=put(s,1,'battle','dmr06-v01');
 enemy.tapped=true;
 const ragilupp=play(s,RAGILUPP,base);
 s.phase='attack';
 const action=e.chooseHeuristicAI(s);
 assert.equal(action.kind,'attack');
 assert.equal(action.uid,ragilupp.uid);
 assert.equal(action.target,enemy.uid);
});
