import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,inst,give,act} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-613.json',import.meta.url)));
const BEAM='dmr01-064', OLLIE='dmrp05-023', UTSUSEMI='dm23rp1-036', DEATHPROOF='dm25rp2-069';
const BLOCKER='dm01-076', WATER='dm01-083', NATURE='dm01-105', SPEED='dm05-049', EVOLUTION='dm25rp3-S09';
function field(){
 const s=setup();
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
const choices=s=>s.decision.choices.map(o=>o.value?.uid??o.value);
function attack(s,x){
 s.phase='attack';
 act(s,'attack',a=>a.uid===x.uid&&a.target==='player');
}

for(const row of cards)test(row.name+' matches its official printing and compiled effects',()=>{
 const detail=details.cards.find(c=>c.id===row.id),c=e.card(row.id);
 assert.deepEqual(detail.faces,row.faces);
 assert.deepEqual(standardCardSpec(detail,{phase:613}),row.spec);
 assert.throws(()=>standardCardSpec(detail,{phase:612}));
 for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
 assert.equal(c.limit,regulationVerification.limits[row.id]);
 assert.equal(CARD_IMAGES[row.id],row.image);
 assert.ok(row.verification.facesMatched);
});

test('Powerful Beam destroys only a blocker and buffs a Nature or Darkness ally even with no blockers',()=>{
 for(const remove of [true,false]){
  const s=field(),ally=place(s,0,'battle',NATURE),other=place(s,0,'battle',WATER),normal=place(s,1,'battle',WATER);
  const enemy=remove?place(s,1,'battle',BLOCKER):null;
  play(s,BEAM);
  if(enemy){
   assert.deepEqual(choices(s),[enemy.uid]);
   pick(s,enemy.uid);
   assert.ok(s.players[1].grave.includes(enemy));
  }
  assert.deepEqual(choices(s),[ally.uid]);
  pick(s,ally.uid);
  assert.ok(s.players[1].battle.includes(normal));
  assert.equal(e.power(ally,false,s),e.card(ally).power+2000);
  assert.equal(e.effectiveCard(ally,s).breaker,2);
  assert.equal(e.power(other,false,s),e.card(other).power);
 }
});

test('Ollie can grant speed on entry and when attacking, without selecting itself',()=>{
 const s=field(),ally=place(s,0,'battle',WATER),later=place(s,0,'battle',WATER);
 ally.entered=later.entered=s.turn;
 const ollie=play(s,OLLIE);
 assert.deepEqual(choices(s),[ally.uid,later.uid]);
 pick(s,ally.uid);
 assert.ok(e.effectiveCard(ally,s).speedAttacker);
 assert.ok(!e.effectiveCard(later,s).speedAttacker);
 ollie.entered=s.turn-1;
 attack(s,ollie);
 assert.deepEqual(choices(s),[ally.uid,later.uid]);
 pick(s,later.uid);
 assert.ok(e.effectiveCard(later,s).speedAttacker);
});

test('Cannonball sweeps all opposing blockers without choosing them or hitting friendly blockers',()=>{
 const s=field(),ally=place(s,0,'battle',BLOCKER),ordinary=place(s,1,'battle',WATER);
 const enemies=[place(s,1,'battle',BLOCKER),place(s,1,'battle',BLOCKER)];
 enemies[1].tapped=true;
 play(s,OLLIE,1);
 assert.equal(s.decision,null);
 assert.ok(enemies.every(x=>s.players[1].grave.includes(x)));
 assert.ok(s.players[0].battle.includes(ally));
 assert.ok(s.players[1].battle.includes(ordinary));
});

test('Utsusemi grants unblockable to one ally and draws for each attacker, including a creature played later',()=>{
 const s=field(),ally=place(s,0,'battle',WATER);
 const blocker=place(s,1,'battle',BLOCKER);
 play(s,UTSUSEMI);
 pick(s,ally.uid);
 assert.ok(e.effectiveCard(ally,s).unblockable);
 const newcomer=play(s,SPEED),before=s.players[0].deck.length;
 attack(s,ally);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'));
 if(s.decision?.type==='block')act(s,'noBlock');
 assert.equal(s.players[0].deck.length,before-1);
 attack(s,newcomer);
 assert.equal(s.decision.type,'block');
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===blocker.uid));
 assert.equal(s.players[0].deck.length,before-2);
 act(s,'noBlock');
 act(s,'endTurn');
 assert.ok(!e.effectiveCard(ally,s).unblockable);
 assert.ok(!s.extLimits.some(l=>l.kind==='g613AttackDraw'));
});

test('CPU avoids attacking into its own mandatory draw from an emptying deck',()=>{
 const s=field(),ally=place(s,0,'battle',WATER);
 play(s,UTSUSEMI);
 pick(s,ally.uid);
 give(s,0,'deck',[WATER]);
 s.phase='attack';
 assert.equal(e.chooseAI(s).kind,'endTurn');
});

test('Deathproof destroys a blocker when evolving and when used as an evolution base, with no effect when played alone',()=>{
 for(const evolve of [true,false]){
  const s=field(),base=place(s,0,'battle',SPEED),blockers=[place(s,1,'battle',BLOCKER),place(s,1,'battle',BLOCKER)];
  const deathproof=play(s,DEATHPROOF);
  act(s,'evolve',a=>a.baseUid===(evolve?base.uid:undefined));
  if(evolve){
   pick(s,blockers[0].uid);
   assert.ok(s.players[1].grave.includes(blockers[0]));
  }else assert.equal(s.decision,null);
  const top=play(s,EVOLUTION);
  act(s,'evolve',a=>a.baseUid===deathproof.uid);
  pick(s,blockers[1].uid);
  assert.ok(s.players[1].grave.includes(blockers[1]));
  assert.ok(top.under.includes(deathproof));
 }
});
