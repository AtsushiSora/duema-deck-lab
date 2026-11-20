import test from 'node:test';
import assert from 'node:assert/strict';
import {e,setup,inst,act,drain} from './target-fixture.mjs';
import {verifyTwinBatch,playFace,put,pick} from './target8500-twin-fixture.mjs';
verifyTwinBatch(1397);
test('Kachikachin double breaks and Hotatte draws three then discards exactly one',()=>{
 const s=setup();s.active=0;const x=playFace(s,'dmrp05-036');drain(s);x.entered=0;s.phase='attack';act(s,'attack',a=>a.uid===x.uid&&a.target==='player');act(s,'noBlock');drain(s);assert.equal(s.players[1].shields.length,3);
 const t=setup();t.active=0;const top=Array.from({length:3},()=>inst('dm01-108'));t.players[0].deck.unshift(...top);playFace(t,'dmrp05-036',1);pick(t,top[1].uid);drain(t);assert.equal(t.players[0].hand.length,2);assert.ok(t.players[0].grave.includes(top[1]));assert.ok(t.players[0].hand.includes(top[0]));assert.ok(t.players[0].hand.includes(top[2]));
});
test('Gomaki is unblockable even to a larger blocker',()=>{const s=setup();s.active=0;const x=playFace(s,'dmrp05-066');drain(s);put(s,1,'dm01-048');x.entered=0;s.phase='attack';act(s,'attack',a=>a.uid===x.uid&&a.target==='player');assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'));drain(s);assert.equal(s.players[1].shields.length,4);});
for(const p of[0,1])test('Gocchin spell may bounce either players creature: '+p,()=>{const s=setup();s.active=0;const x=put(s,p,'dm01-108'),other=put(s,1-p,'dm01-108');playFace(s,'dmrp05-066',1);pick(s,x.uid);drain(s);assert.ok(s.players[p].hand.includes(x));assert.ok(s.players[1-p].battle.includes(other));});
for(const accept of[false,true])test('Reino offers exactly one optional mill at its owners turn end: '+accept,()=>{const s=setup();s.active=0;playFace(s,'dmex12-063');drain(s);const top=s.players[0].deck[0],before=s.players[0].deck.length;s.phase='attack';act(s,'endTurn');pick(s,accept?true:null);drain(s);assert.equal(s.players[0].deck.length,before-(accept?1:0));assert.equal(s.players[0].grave.includes(top),accept);});
test('Reino spell gives minus 2000, destroying at zero while a 2001-power target survives',()=>{
 for(const power of[2000,2001]){const s=setup();s.active=0;const x=put(s,1,'dm01-108');x.powerModifiers=[{amount:power-2000}];playFace(s,'dmex12-063',1);pick(s,x.uid);drain(s);assert.equal(s.players[1].grave.includes(x),power===2000);if(power>2000){assert.equal(e.power(x,false,s),1);s.phase='attack';act(s,'endTurn');drain(s);assert.equal(e.power(x,false,s),2001);}}
});
test('Niproha cannot attack players, may attack tapped creatures, and its arrow taps only the chosen enemy',()=>{
 const s=setup();s.active=0;const x=playFace(s,'dmrp05-059');drain(s);x.entered=0;const a=put(s,1,'dm01-108'),b=put(s,1,'dm01-108');a.tapped=true;s.phase='attack';assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target==='player'));assert.ok(e.getLegalActions(s).some(z=>z.kind==='attack'&&z.uid===x.uid&&z.target===a.uid));s.phase='main';playFace(s,'dmrp05-059',1);pick(s,b.uid);drain(s);assert.ok(b.tapped);
});
test('Zabike has immediate speed and Bunbun Burst enforces the 4000-power boundary',()=>{
 const s=setup();s.active=0;const x=playFace(s,'dmrp05-014');drain(s);s.phase='attack';assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target==='player'));s.phase='main';const a=put(s,1,'dm01-108'),b=put(s,1,'dm01-108');a.powerModifiers=[{amount:2000}];b.powerModifiers=[{amount:2001}];playFace(s,'dmrp05-014',1);assert.ok(!s.decision.choices.some(x=>x.value?.uid===b.uid));pick(s,a.uid);drain(s);assert.ok(s.players[1].grave.includes(a));assert.ok(s.players[1].battle.includes(b));
});
test('Reino spell alone is offered as S Trigger with no mana',()=>{
 const s=setup();s.active=0;const a=put(s,0,'dm01-108');s.players[1].shields=[inst('dmex12-063')];s.players[1].mana=[];s.phase='attack';act(s,'attack',x=>x.uid===a.uid&&x.target==='player');act(s,'noBlock');act(s,'useTrigger');drain(s);assert.ok(s.players[0].grave.includes(a));assert.ok(s.players[1].grave.some(x=>x.cardId==='dmex12-063'));assert.ok(!s.players[1].battle.some(x=>x.cardId==='dmex12-063'));
});
