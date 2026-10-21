import test from 'node:test';import assert from 'node:assert/strict';
import {e,DOGI,VEG,GEN,DREAM,ROD,KIRA,Y,inst,give,act,setup,cast,attack,drain} from './target-fixture.mjs';

test('Vegeta can summon from mana, use itself as the sole nature mana in the payment, and enter untapped',()=>{
 const s=setup();give(s,0,'mana',[VEG,...Array(8).fill('dm01-097')]);const self=s.players[0].mana[0];act(s,'play',a=>a.origin==='mana');assert.equal(s.players[0].mana.length,8);assert.ok(s.players[0].mana.every(x=>x.tapped));assert.ok(s.players[0].battle.includes(self));assert.equal(self.tapped,false);assert.equal(self.entered,s.turn);assert.equal(e.card(self).cost,9);
});
test('Vegeta Mach Fighter attacks an untapped creature on the entry turn but cannot attack the player until a later turn',()=>{
 const s=setup();give(s,1,'battle',['dm01-075']);cast(s,VEG);const c=s.players[0].battle[0];s.phase='attack';assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.target===s.players[1].battle[0].uid));assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.target==='player'));c.entered=0;assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.target==='player'));assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.target===s.players[1].battle[0].uid));
});
test('Vegeta denies opponent hand effect deployment, mana deployment and mana execution, while allowing hand summons',()=>{
 const s=setup();give(s,1,'battle',[VEG]);give(s,0,'hand',[ROD]);give(s,0,'mana',[VEG,...s.players[0].mana.map(x=>x.cardId)]);cast(s,DOGI);act(s,'evolve',a=>!a.baseUid);assert.deepEqual(e.getLegalActions(s).map(a=>a.kind),['skipDeploy']);act(s,'skipDeploy');assert.ok(!e.getLegalActions(s).some(a=>a.origin==='mana'));act(s,'play',a=>a.cardId===ROD);drain(s);assert.ok(s.players[0].battle.some(x=>x.cardId===ROD));
});
test('Vegeta prohibits grave Mugen Crime but allows hand Mugen Crime and hand DDD summons',()=>{
 const s=setup();give(s,1,'battle',[VEG]);give(s,0,'battle',Array(4).fill('dm01-108'));give(s,0,'grave',[GEN]);give(s,0,'hand',[GEN,DOGI]);assert.ok(!e.getLegalActions(s).some(a=>a.kind==='mugenStart'&&a.origin==='grave'));assert.ok(e.getLegalActions(s).some(a=>a.kind==='mugenStart'&&a.origin==='hand'));attack(s);act(s,'declareDDD');assert.ok(e.getLegalActions(s).some(a=>a.kind==='summonDDD'));act(s,'summonDDD',a=>!!a.baseUid);act(s,'skipDeploy');assert.ok(s.players[0].battle.some(x=>x.cardId===DOGI));
});
test('Vegeta leaves a revealed dragon on the library top without library loss, while a non-dragon still goes to grave',()=>{
 for(const id of [ROD,'dm01-108']){const s=setup();give(s,1,'battle',[VEG]);give(s,0,'battle',[DREAM]);give(s,0,'deck',[id]);const uid=s.players[0].deck[0].uid;attack(s);if(id===ROD){assert.equal(s.players[0].deck[0].uid,uid);assert.equal(s.winner,null);assert.ok(!s.players[0].battle.some(x=>x.cardId===ROD));}else{assert.equal(s.players[0].deck.length,0);assert.equal(s.winner,1);assert.equal(s.players[0].grave.at(-1).uid,uid);}}
});
test('Vegeta does not restrict its own controller; two opposing Vegetas restrict each player symmetrically',()=>{
 const s=setup();give(s,0,'battle',[VEG,DREAM]);give(s,0,'deck',[ROD,'dm01-108','dm01-108']);attack(s,s.players[0].battle[1].uid);drain(s);assert.ok(s.players[0].battle.some(x=>x.cardId===ROD));const t=setup();give(t,0,'battle',[VEG]);give(t,1,'battle',[VEG]);for(const p of [0,1]){assert.equal(e.canEnterCreature(t,p,e.card(ROD),{origin:'mana',execution:false}),false);assert.equal(e.canEnterCreature(t,p,e.card(ROD),{origin:'hand',execution:true}),true);}
});
test('Vegeta protection is optional and can replace any own creature leave, including its own bounce',()=>{
 for(const protect of [false,true]){const s=setup();give(s,0,'battle',[VEG]);const c=s.players[0].battle[0],before=s.players[0].mana.length;s.active=1;cast(s,'dm01-086');act(s,'effect');assert.equal(s.decision.type,'leaveReplace');if(protect){act(s,'replaceMana');assert.equal(s.players[0].mana.length,before);for(let n=0;n<3;n++)act(s,'leaveMana');assert.ok(s.players[0].battle.includes(c));assert.equal(s.players[0].mana.length,before-3);assert.equal(s.players[0].grave.length,3);}else{act(s,'allowLeave');assert.ok(s.players[0].hand.includes(c));assert.equal(s.players[0].mana.length,before);}}
});
test('simultaneous removals reserve distinct mana before any moves and cannot spend the same card twice',()=>{
 const s=setup();give(s,0,'battle',[VEG,'dm25sp2-014','dm25sp2-014']);give(s,0,'mana',Array(6).fill('dm01-108'));const protectedUids=s.players[0].battle.slice(1).map(x=>x.uid);give(s,1,'battle',['dm01-080']);s.active=1;cast(s,'dm02-s02');act(s,'evolve');assert.equal(s.decision.type,'leaveReplace');act(s,'replaceMana');for(let n=0;n<3;n++)act(s,'leaveMana');assert.equal(s.players[0].mana.length,6);assert.equal(s.players[0].battle.length,3);assert.equal(s.decision.type,'leaveReplace');act(s,'replaceMana');assert.equal(e.getLegalActions(s).filter(a=>a.kind==='leaveMana').length,3);for(let n=0;n<3;n++)act(s,'leaveMana');assert.equal(s.players[0].mana.length,0);assert.ok(protectedUids.every(uid=>s.players[0].battle.some(x=>x.uid===uid)));assert.equal(s.players[0].grave.length,6);
});
test('fewer than three unreserved mana cannot protect, and cancelling mana choices changes no physical cards',()=>{
 const s=setup();give(s,0,'battle',[VEG]);give(s,0,'mana',Array(2).fill('dm01-108'));s.active=1;cast(s,'dm01-086');act(s,'effect');assert.equal(s.decision,null);assert.equal(s.players[0].hand[0].cardId,VEG);
 const t=setup();give(t,0,'battle',[VEG]);t.active=1;cast(t,'dm01-086');act(t,'effect');const before=e.physicalCards(t).map(x=>x.uid).sort();act(t,'replaceMana');act(t,'leaveMana');act(t,'cancelLeaveMana');assert.deepEqual(e.physicalCards(t).map(x=>x.uid).sort(),before);act(t,'allowLeave');
});
