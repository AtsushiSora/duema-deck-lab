import test from 'node:test';
import assert from 'node:assert/strict';
import {act,cast,drain,e,give,inst,setup} from './target-fixture.mjs';

const HAM='dm22sd1-004', BRAIN='dm22rp2-014', SCORER='dmrp07-s03', IAM='dmrp02-s04', MARK='dm25rp4-024';
const GREEN='dm01-108', BLUE='dm01-083';
const add=(s,p,z,id)=>{const x=inst(id);s.players[p][z].push(x);return x;};
const play=(s,x,free=false)=>act(s,'play',a=>a.uid===x.uid&&!!a.freeSummon===free);
const choose=(s,v)=>act(s,'extended',a=>{const r=s.decision.choices[a.choice].value;return (r?.uid??r)===v;});
const field=()=>{const s=setup();for(const p of [0,1]){give(s,p,'grave',[]);give(s,p,'deck',Array(14).fill(GREEN));}return s;};

test('Hammer Damma uses the graveyard size after the optional mill, excluding equal-cost targets',()=>{
 for(const mill of [false,true]){
  const s=field(),low=add(s,1,'battle',GREEN),equal=add(s,1,'battle',mill?'dm17-048':'dm01-050');
  give(s,0,'grave',Array(3).fill(GREEN));
  cast(s,HAM);
  choose(s,mill?true:null);
  assert.equal(s.players[0].grave.length,mill?6:3);
  assert.ok(s.decision.choices.some(x=>(x.value?.uid??x.value)===low.uid));
  assert.ok(!s.decision.choices.some(x=>(x.value?.uid??x.value)===equal.uid));
  choose(s,low.uid);
  assert.ok(s.players[1].grave.includes(low));
  assert.ok(s.players[1].battle.includes(equal));
  assert.ok(e.card(HAM).trigger);
 }
});

test('Brain can be cast for free with four water units, draws three and locks further own-turn spells',()=>{
 const s=field();
 give(s,0,'battle',Array(4).fill(BLUE));
 const x=add(s,0,'hand',BRAIN),other=add(s,0,'hand','dm01-093');
 assert.ok(e.getLegalActions(s).some(a=>a.uid===x.uid&&a.cost===0));
 castFromHand(s,x);
 assert.equal(s.players[0].hand.length,4);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,0);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===other.uid));
 s.phase='attack';act(s,'endTurn');drain(s);
 assert.ok(e.canCastSpell(s,0,e.card(other),'hand'));
});

function castFromHand(s,x){act(s,'play',a=>a.uid===x.uid);}

test('Scorer offers G-Zero after five spells, and the first entry counts even without a summon',()=>{
 const s=field(),x=add(s,0,'hand',SCORER);
 s.players[0].spellsThisTurn=4;
 assert.ok(!e.getLegalActions(s).some(a=>a.uid===x.uid&&a.freeSummon));
 s.players[0].spellsThisTurn=5;
 play(s,x,true);
 assert.equal(s.extraTurns?.[0]?.player,0);
 const second=add(s,0,'hand',SCORER);
 play(s,second,true);
 assert.equal(s.extraTurns.length,1);

 const reanimated=field(),first=add(reanimated,0,'grave',SCORER);
 cast(reanimated,'dm19-027');
 choose(reanimated,first.uid);
 assert.ok(reanimated.players[0].battle.includes(first));
 assert.equal(reanimated.extraTurns?.length??0,0);
 reanimated.players[0].spellsThisTurn=5;
 play(reanimated,add(reanimated,0,'hand',SCORER),true);
 assert.equal(reanimated.extraTurns?.length??0,0);
});

test('I am free NEO summon keeps the evolution stack and returns the other non-evolutions',()=>{
 const s=field(),base=add(s,0,'battle',SCORER);
 for(let i=0;i<4;i++)add(s,0,'battle',SCORER);
 const x=add(s,0,'hand',IAM);
 play(s,x,true);
 act(s,'evolve',a=>a.baseUid===base.uid);
 drain(s);
 assert.equal(s.players[0].battle.length,1);
 assert.equal(x.under[0].uid,base.uid);
 assert.equal(e.power(x,false,s),25000);
 assert.equal(e.effectiveCard(x,s).breaker,'∞');
 assert.equal(s.players[0].hand.length,4);
});

test('Melnias Medal draws against opponent hand size, discards one fewer, and lends both keywords',()=>{
 const s=field();
 give(s,1,'hand',Array(3).fill(GREEN));
 cast(s,MARK);
 drain(s);
 assert.equal(s.players[0].hand.length,1);
 assert.equal(s.players[0].grave.length,2);
 const seed=s.players[0].battle[0];
 assert.ok(e.card(seed).shinkalize);
 const x=add(s,0,'hand',IAM);
 castFromHand(s,x);
 act(s,'evolve',a=>a.baseUid===seed.uid);
 assert.equal(e.effectiveCard(x,s).blocker,true);
 assert.equal(e.effectiveCard(x,s).slayer,true);
});

test('Melnias Medal counts both cards of each Babylonia replacement before discarding (QA47908)',()=>{
 const s=field();give(s,0,'deck',Array(16).fill(GREEN));give(s,1,'hand',Array(5).fill(GREEN));
 add(s,0,'battle','dm32-021');cast(s,MARK);
 for(let i=0;i<5;i++){
  act(s,'replaceDraw',a=>a.replace);
  act(s,'discardDraw');
 }
 assert.equal(s.players[0].deck.length,6);
 assert.equal(s.players[0].grave.length,5);
 drain(s);
 assert.equal(s.players[0].grave.length,10); // Five replacements plus all five remaining cards.
 assert.equal(s.players[0].hand.length,0);
});
