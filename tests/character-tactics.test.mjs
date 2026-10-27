import test from 'node:test';import assert from 'node:assert/strict';
import {e,setup,give,act} from './target-fixture.mjs';
import {visibleFinishRoutes} from '../dist/attack-plan.js';
const W='dmrp09-s03',C='dm24rp1-012',L='dmc52-003',SH='dm23rp4-011',SM='dm01-097',B='dm01-075';
const position=id=>{const s=setup();s.active=1;s.phase='attack';s.challenge={heroId:id,seat:1,signature:[]};give(s,1,'hand',[]);return s;};
test('finish routes include a blocker and preserve the large shield-breaking hit',()=>{
 const a=[{uid:'small',damage:1,blockers:['b']},{uid:'big1',damage:3,blockers:['b']},{uid:'big2',damage:3,blockers:['b']}],r=visibleFinishRoutes(a,['b'],3);
 assert.deepEqual([...r.winning].sort(),['big1','big2']);assert.ok(r.nodes<=1800);
});
test('unblockable hits, no-break hits and protected players retain their actual roles',()=>{
 assert.deepEqual([...visibleFinishRoutes([{uid:'unblockable',damage:1,blockers:[]}],['b'],0).winning],['unblockable']);
 assert.equal(visibleFinishRoutes([{uid:'noBreak',damage:0,blockers:[]},{uid:'hit',damage:1,blockers:[]}],[],1).winning.has('noBreak'),false);
 assert.equal(visibleFinishRoutes([{uid:'hit',damage:3,blockers:[]}],[],0,{protectedPlayer:true}).winning.size,0);
});
test('oversized attack plans and exhausted budgets never claim a forced finish',()=>{
 assert.equal(visibleFinishRoutes(Array.from({length:9},(_,i)=>({uid:''+i,damage:1,blockers:[]})),[],1).winning.size,0);
 const r=visibleFinishRoutes(Array.from({length:8},(_,i)=>({uid:''+i,damage:1,blockers:['b','c']})),['b','c'],7,{maxNodes:2});assert.equal(r.winning.size,0);assert.ok(r.nodes<=2);
});
test('White attacks through a visible finish instead of trading with a tapped creature',()=>{
 const s=position('hakuoh');give(s,1,'battle',[W,W,SM]);give(s,0,'battle',[B,'dmc27-004']);s.players[0].battle[1].tapped=true;give(s,0,'shields',Array(2).fill(SM));
 const a=e.chooseAI(s);assert.equal(a.kind,'attack');assert.equal(a.target,'player');assert.equal(a.cardId,undefined);assert.equal(e.card(s.players[1].battle.find(x=>x.uid===a.uid)).breaker,2);
});
test('White keeps its only necessary blocker when the visible counterattack would win',()=>{
 const s=position('hakuoh');give(s,1,'battle',[W]);give(s,0,'battle',[SM]);give(s,1,'shields',[]);assert.equal(e.chooseAI(s).kind,'endTurn');
});
test('White may attack with a spare blocker rather than stopping both at zero shields',()=>{
 const s=position('hakuoh');give(s,1,'battle',[W,W]);give(s,0,'battle',[SM]);give(s,1,'shields',[]);const a=e.chooseAI(s);assert.equal(a.kind,'attack');
 e.step(s,a);for(let n=0;s.decision&&n<20;n++)e.step(s,e.chooseAI(s));assert.equal(e.chooseAI(s).kind,'endTurn');
});
test('Kira attacks with Shiropheshi because it untaps at its own turn end',()=>{
 const s=position('kira');give(s,1,'battle',[SH]);give(s,0,'battle',[SM]);give(s,1,'shields',[]);assert.equal(e.chooseAI(s).kind,'attack');
});
test('White evolves on a plain Angel instead of consuming its sole draw engine',()=>{
 const s=position('hakuoh');s.phase='main';give(s,1,'mana',Array(6).fill('dm01-075'));give(s,1,'battle',[L,C]);give(s,1,'hand',['dm04-001']);act(s,'play');const a=e.chooseAI(s);assert.equal(a.baseUid,s.players[1].battle[1].uid);
});
test('Kira keeps its end-of-turn blocker instead of revolving into an unprotected single breaker',()=>{
 const s=position('kira');give(s,1,'battle',[SH]);give(s,0,'battle',[SM]);give(s,1,'shields',[]);give(s,1,'hand',['dm24ex4-032']);const x=s.players[1].battle[0],y=s.players[1].hand[0];s.attack={attacker:x.uid,target:'player',player:1};
 s.decision={type:'extended',player:1,source:y.cardId,task:{op:'revResolve',p:1,source:y.cardId,uid:y.uid,attacker:x.uid},choices:[{label:'交換する',value:true,score:20,cardId:y.cardId},{label:'使わない',value:null,score:0}]};assert.equal(s.decision.choices[e.chooseAI(s).choice].value,null);
});
test('new attack planning ignores private identities, hidden order and random state',()=>{
 const s=position('kira');give(s,1,'battle',[SH,SH,SM]);give(s,0,'battle',[B]);give(s,0,'shields',Array(2).fill(SM));const before=structuredClone(s),a=e.chooseAI(s),t=structuredClone(s);t.seed=8;t.rng=913;
 t.players[0].hand.forEach(x=>x.cardId=W);for(const p of t.players){p.deck.reverse();p.deck.forEach(x=>x.cardId=W);p.shields.forEach(x=>x.cardId=W);}assert.deepEqual(e.chooseAI(t),a);assert.deepEqual(s,before);
});
