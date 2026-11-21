import test from 'node:test';
import assert from 'node:assert/strict';
import {e,data,setup,inst,act,drain} from './target-fixture.mjs';
import {verifyTwinBatch,put,pick,playFace} from './target8500-twin-fixture.mjs';
verifyTwinBatch(1589);
const C='dmex12-090',O='dmbd13-014',K='dmex08-156',N='dm01-108';
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
test('Cassis paid spell bounces own creature first, then enemy, even when own target is absent',()=>{
 for(const ownTarget of [false,true]){
  const s=setup(),own=ownTarget?put(s,0,N):null,enemy=put(s,1,N);
  playFace(s,C,1);
  if(own)pick(s,own.uid);
  assert.equal(s.players[1].battle.length,1);
  pick(s,enemy.uid);
  drain(s);
  assert.ok(s.players[1].hand.some(x=>x.uid===enemy.uid));
  if(own)assert.ok(s.players[0].hand.some(x=>x.uid===own.uid));
  assert.equal(s.players[0].mana.filter(x=>x.tapped).length,4);
 }
});
test('Cassis is a blocker that cannot attack and Last Burst bounces in controller order for free',()=>{
 const s=setup(),source=put(s,0,C),ally=put(s,0,N),enemy=put(s,1,'dm01-s05');
 s.phase='attack';
 assert.ok(e.effectiveCard(source,s).blocker);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===source.uid));
 source.tapped=true;
 s.active=1;
 act(s,'attack',a=>a.uid===enemy.uid&&a.target===source.uid);
 act(s,'noBlock');
 pick(s,true);
 pick(s,ally.uid);
 pick(s,enemy.uid);
 drain(s);
 assert.ok(s.players[0].grave.some(x=>x.uid===source.uid));
 assert.ok(s.players[0].hand.some(x=>x.uid===ally.uid));
 assert.ok(s.players[1].hand.some(x=>x.uid===enemy.uid));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,0);
});
test('Cassis spell side is usable from an actual shield break',()=>{
 const s=setup(),shield=inst(C),enemy=put(s,1,N);
 s.players[0].shields=[shield];s.active=1;s.phase='attack';
 act(s,'attack',a=>a.uid===enemy.uid&&a.target==='player');act(s,'noBlock');
 act(s,'useTrigger',a=>a.uid===shield.uid&&a.face===1);pick(s,enemy.uid);drain(s);
 assert.ok(s.players[0].grave.some(x=>x.uid===shield.uid));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,0);
});
for(const match of [false,true])test('Oyabun spell adds only one extra ramp for an actual hyperdimensional spell '+match,()=>{
 const s=setup(),spell=data.cards.find(x=>x.type==='spell'&&x.name.includes('超次元')),top=inst(match?spell.id:N),next=inst(N);
 s.players[0].deck.unshift(top,next);
 playFace(s,O,1);
 drain(s);
 assert.ok(s.players[0].mana.some(x=>x.uid===top.uid));
 assert.equal(s.players[0].mana.some(x=>x.uid===next.uid),match);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,3);
});
test('Oyabun Mach Fighter battle win mandatorily deploys only a green Psychic costing at most7',()=>{
 let s=setup();s.format='advance';
 const eligible=data.cards.find(x=>x.psychic&&x.type==='creature'&&x.civilizations?.includes('自然')&&x.cost<=7);
 assert.ok(eligible);
 const target=inst(eligible.id),wrong=inst('dm37-021'),enemy=put(s,1,N);
 s.players[0].extra=[target,wrong];
 const source=playFace(s,O);drain(s);s.phase='attack';
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===source.uid&&a.target==='player'));
 act(s,'attack',a=>a.uid===source.uid&&a.target===enemy.uid);act(s,'noBlock');
 assert.ok(s.decision.choices.some(c=>c.value?.uid===target.uid));
 assert.ok(!s.decision.choices.some(c=>c.value?.uid===wrong.uid));
 const before=physical(s);s=JSON.parse(JSON.stringify(s));pick(s,target.uid);drain(s);
 assert.ok(s.players[0].battle.some(x=>x.uid===target.uid));assert.deepEqual(physical(s),before);
});
test('Kingdom battle victory breaks9 shields and keeps normal triple breaker',()=>{
 const s=setup(),enemy=put(s,1,N);
 s.players[1].shields=Array.from({length:10},()=>inst(N));
 const source=playFace(s,K);drain(s);s.phase='attack';
 act(s,'attack',a=>a.uid===source.uid&&a.target===enemy.uid);act(s,'noBlock');drain(s);
 assert.equal(s.players[1].shields.length,1);
 assert.equal(e.card(K).breaker,3);
});
for(const active of [0,1])test('Free Entry ramps both decks3 then caster deploys before opponent, each chooses their own mana '+active,()=>{
 let s=setup();s.active=active;
 const beforeMana=s.players.map(p=>p.mana.length),targets=s.players.map(p=>p.mana[0]),tops=s.players.map(p=>p.deck.slice(0,3).map(x=>x.uid));
 const source=playFace(s,K,1),physicalBefore=physical(s);
 assert.ok(s.players.every((p,i)=>p.mana.length===beforeMana[i]+3));
 assert.ok(tops.every((ids,p)=>ids.every(uid=>s.players[p].mana.some(x=>x.uid===uid))));
 assert.equal(s.decision.player,active);
 pick(s,targets[active].uid);
 assert.ok(s.players[active].battle.some(x=>x.uid===targets[active].uid));
 assert.equal(s.decision.player,1-active);
 s=JSON.parse(JSON.stringify(s));pick(s,targets[1-active].uid);drain(s);
 assert.ok(s.players[1-active].battle.some(x=>x.uid===targets[1-active].uid));
 assert.equal(s.players[active].mana.filter(x=>x.tapped).length,9);
 assert.ok(s.players[active].grave.some(x=>x.uid===source.uid));
 assert.deepEqual(physical(s),physicalBefore);
});
