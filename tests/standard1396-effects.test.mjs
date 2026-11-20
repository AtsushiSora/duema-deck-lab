import test from 'node:test';
import assert from 'node:assert/strict';
import {e,setup,inst,act,cast,drain} from './target-fixture.mjs';
import {verifyTwinBatch,playFace,put,pick} from './target8500-twin-fixture.mjs';
verifyTwinBatch(1396);
test('Obladi has immediate creature-only Mach Fighter and goes to mana instead of grave on destruction',()=>{
 const s=setup();s.active=0;const enemy=put(s,1,'dm01-108'),x=playFace(s,'dmrp06-010');drain(s);s.phase='attack';assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target===enemy.uid));assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target==='player'));s.active=1;s.phase='main';cast(s,'dm01-027');drain(s);assert.ok(s.players[0].mana.includes(x));assert.ok(!s.players[0].grave.includes(x));
});
test('Let it Bee draws then allows placing that newly drawn card in mana',()=>{
 const s=setup();s.active=0;const top=inst('dm01-108');s.players[0].deck.unshift(top);const n=s.players[0].mana.length;playFace(s,'dmrp06-010',1);pick(s,top.uid);drain(s);assert.equal(s.players[0].mana.length,n+1);assert.ok(s.players[0].mana.includes(top));
});
test('Cassis blocks without inheriting its spell-side S Trigger and Spark taps every opposing creature',()=>{
 const s=setup();s.active=0;const x=playFace(s,'dm24ex1-036');drain(s);assert.equal(e.effectiveCard(x,s).trigger||false,false);const targets=[put(s,1,'dm01-108'),put(s,1,'dm01-108')];playFace(s,'dm24ex1-036',1);drain(s);assert.ok(targets.every(x=>x.tapped));
});
for(const[id,breaks]of[['dmrp05-080',2],['dmrp05-087',3]])test(e.card(id).name+' creature breaks the printed number of shields',()=>{const s=setup();s.active=0;const x=playFace(s,id);drain(s);x.entered=0;s.phase='attack';act(s,'attack',a=>a.uid===x.uid&&a.target==='player');act(s,'noBlock');drain(s);assert.equal(s.players[1].shields.length,5-breaks);});
test('Kirimomi spell grants fresh creature speed for this turn only',()=>{
 const s=setup();s.active=0;const x=playFace(s,'dm01-108');drain(s);playFace(s,'dmrp05-080',1);pick(s,x.uid);drain(s);s.phase='attack';assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target==='player'));act(s,'endTurn');drain(s);assert.ok(!e.effectiveCard(x,s).speedAttacker);
});
test('Ketanobeer spell boosts one ally 4000 and expires at end of turn',()=>{
 const s=setup();s.active=0;const x=put(s,0,'dm01-108');playFace(s,'dmrp05-087',1);pick(s,x.uid);drain(s);assert.equal(e.power(x,false,s),6000);s.phase='attack';act(s,'endTurn');drain(s);assert.equal(e.power(x,false,s),2000);
});
test('Departure lets the opponent select two own creatures, not the caster',()=>{
 const s=setup();s.active=0;const enemy=[put(s,1,'dm01-108'),put(s,1,'dm01-097'),put(s,1,'dm01-083')],own=put(s,0,'dm01-108');playFace(s,'dmex12-059',1);assert.equal(s.decision.player,1);pick(s,enemy[0].uid);pick(s,enemy[2].uid);drain(s);assert.ok(s.players[1].mana.includes(enemy[0]));assert.ok(s.players[1].mana.includes(enemy[2]));assert.ok(s.players[1].battle.includes(enemy[1]));assert.ok(s.players[0].battle.includes(own));
});
for(const id of['dm24ex1-036','dmex12-059'])test(e.card(id).name+' offers only its spell side as an innate S Trigger without mana',()=>{
 const s=setup();s.active=0;const attacker=put(s,0,'dm01-108');put(s,0,'dm01-097');s.players[1].shields=[inst(id)];s.players[1].mana=[];s.phase='attack';act(s,'attack',a=>a.uid===attacker.uid&&a.target==='player');act(s,'noBlock');assert.ok(e.getLegalActions(s).some(a=>a.kind==='useTrigger'));act(s,'useTrigger');drain(s);assert.ok(s.players[1].grave.some(x=>x.cardId===id));assert.ok(!s.players[1].battle.some(x=>x.cardId===id));assert.equal(s.players[1].mana.length,0);
});
