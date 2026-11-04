import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,cast,drain,attack,GEN} from './target-fixture.mjs';import {createCatalogue} from '../dist/catalogue.js';import {REQUESTED395_DECK} from '../tools/fixtures/requested395.mjs';
const RAP='dmx21-058',U='dm22-s01',SM='dm01-108',SPELL='dm01-027',GATE='dm22-017',POP='dmx21-027',KERO='dm22-054',REC='dm25ex1-060';
const phoenix=c=>String(c.race).includes('フェニックス');
const pick=(s,v)=>{const i=s.decision?.choices?.findIndex(x=>x.value===v);assert.ok(i>=0,JSON.stringify(s.decision));act(s,'extended',a=>a.choice===i);};
test('official transcription, image, catalogue and legal forty expose Universe Rapia as supported',()=>{
 const row=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-395.json',import.meta.url))).cards[0];assert.equal(row.id,RAP);assert.ok(row.verification.facesMatched);assert.equal(row.faces[0].cost,7);assert.equal(row.faces[0].powerText,'5000');assert.deepEqual(row.faces,details.cards.find(x=>x.id===RAP).faces);assert.equal(e.card(RAP).g395Rapia,true);assert.equal(e.card(RAP).manaValue,1);assert.equal(e.card(RAP).limit,4);assert.deepEqual(e.validateDeck(REQUESTED395_DECK),[]);assert.equal(createCatalogue(snapshot,data.cards,details).coverage(REQUESTED395_DECK).supported,40);
});
test('continuous Phoenix race covers own four zones and noncreatures, never hand/shields/opponent or printed definitions',()=>{
 const s=setup();give(s,0,'battle',[RAP,SM]);for(const z of ['mana','deck','grave','hand','shields','extra'])give(s,0,z,[SM,SPELL,REC]);give(s,1,'battle',[SM]);give(s,1,'mana',[SPELL]);const before=JSON.stringify(s);assert.equal(e.card(SPELL).type,'spell');
 for(const z of ['battle','mana','deck','grave'])for(const x of s.players[0][z]){assert.ok(phoenix(e.zoneCard(s,0,x)),z);assert.ok(phoenix(e.effectiveCard(x,s)),z);assert.ok(e.playFaces(e.zoneCard(s,0,x)).every(phoenix),z);}
 for(const z of ['hand','shields','extra'])for(const x of s.players[0][z])assert.ok(!phoenix(e.zoneCard(s,0,x)),z);
 assert.ok(!phoenix(e.effectiveCard(s.players[1].battle[0],s)));assert.ok(!phoenix(e.zoneCard(s,1,s.players[1].mana[0])));assert.ok(!phoenix(e.card(SM)));assert.ok(!phoenix(e.card(SPELL)));assert.equal(JSON.stringify(s),before);const restored=JSON.parse(before);assert.ok(phoenix(e.zoneCard(restored,0,restored.players[0].grave[0])));
});
test('race additions disappear immediately when the source leaves, is ignored or sealed, but survive muting only the recipient',()=>{
 const s=setup();give(s,0,'battle',[RAP,SM]);give(s,0,'grave',[SPELL]);const source=s.players[0].battle[0],body=s.players[0].battle[1];body.g35Ignored=s.turn;assert.ok(phoenix(e.effectiveCard(body,s)));source.g35Ignored=s.turn;assert.ok(!phoenix(e.effectiveCard(body,s)));delete source.g35Ignored;source.sealed=true;assert.ok(!phoenix(e.zoneCard(s,0,s.players[0].grave[0])));delete source.sealed;s.players[0].grave.push(s.players[0].battle.shift());assert.ok(!phoenix(e.effectiveCard(body,s)));s.players[0].battle.unshift(source);assert.ok(phoenix(e.zoneCard(s,0,s.players[0].grave[0])));
});
test('normal casting pays seven mana and makes an ordinary body a legal Universe evolution base',()=>{
 const s=setup();give(s,0,'battle',[SM]);const base=s.players[0].battle[0];give(s,0,'hand',[U]);assert.equal(e.evolutionBases(s,0,e.card(U)).length,0);const before=s.players[0].mana.filter(x=>x.tapped).length;cast(s,RAP);assert.equal(s.players[0].mana.filter(x=>x.tapped).length-before,7);assert.ok(e.evolutionBases(s,0,e.card(U)).some(x=>x.uid===base.uid));act(s,'play',a=>a.cardId===U);act(s,'evolve',a=>a.baseUid===base.uid);assert.equal(s.players[0].battle.find(x=>x.cardId===U).under[0].uid,base.uid);
});
test('Universe meteor burn wins with a formerly non-Phoenix last source, while multiple bases or Rapia as the only source do not',()=>{
 for(const extra of [false,true]){const s=setup();give(s,0,'battle',[RAP,U]);const x=s.players[0].battle[1],base=inst(SM);x.under=[base,...(extra?[inst(SM)]:[])];assert.ok(phoenix(e.effectiveCard(base,s)));attack(s,x.uid);pick(s,base.uid);drain(s);assert.equal(s.winner===0,!extra);assert.ok(s.players[0].grave.some(y=>y.uid===base.uid));}
 const s=setup();give(s,0,'battle',[RAP]);const source=s.players[0].battle[0];give(s,0,'hand',[U]);act(s,'play',a=>a.cardId===U);act(s,'evolve',a=>a.baseUid===source.uid);const x=s.players[0].battle[0];assert.ok(!phoenix(e.effectiveCard(source,s)));attack(s,x.uid);pick(s,source.uid);drain(s);assert.notEqual(s.winner,0);
});
test('Universe Gate counts ordinary creatures and spells in the deck as Phoenix cards without moving the top three',()=>{
 const s=setup();give(s,0,'battle',[RAP]);give(s,0,'deck',[SM,SPELL,REC,...Array(8).fill(SM)]);const order=s.players[0].deck.map(x=>x.uid);cast(s,GATE);assert.equal(s.extraTurns.length,3);assert.deepEqual(s.players[0].deck.map(x=>x.uid),order);
});
test('Kerodinance untaps every eligible mana card including a spell, leaving face-down mana tapped',()=>{
 const s=setup();give(s,0,'battle',[RAP]);s.players[0].mana.forEach(x=>x.tapped=true);const spell=inst(SPELL),hidden=inst(SM);spell.tapped=true;hidden.tapped=true;hidden.faceDown=true;s.players[0].mana.push(spell,hidden);give(s,0,'hand',[KERO]);s.players[0].mana.filter(x=>e.civilizations(e.card(x)).includes('自然')).slice(0,2).forEach(x=>x.tapped=false);act(s,'play',a=>a.cardId===KERO);drain(s);assert.ok(s.players[0].mana.filter(x=>!x.faceDown).every(x=>!x.tapped));assert.ok(hidden.tapped);
});
test('Phoenix recovery selects a pure spell from the grave and the added race disappears in hand',()=>{
 const s=setup();give(s,0,'battle',[RAP]);give(s,0,'grave',[SPELL]);const spell=s.players[0].grave[0];give(s,0,'deck',Array(8).fill(SM));give(s,0,'hand',[REC]);act(s,'play',a=>a.face===1);assert.ok(s.decision.choices.some(c=>c.value===spell.uid));pick(s,spell.uid);drain(s);assert.ok(s.players[0].hand.some(x=>x.uid===spell.uid));assert.ok(!phoenix(e.zoneCard(s,0,spell)));
});
test('Poppo can use a non-Phoenix grave creature for Universe while Rapia remains active',()=>{
 const s=setup();give(s,0,'battle',[RAP,POP]);give(s,0,'grave',[SM]);const base=s.players[0].grave[0];give(s,0,'hand',[U]);act(s,'play',a=>a.cardId===U);assert.equal(s.decision.task.op,'g31_Bases');pick(s,base.uid);drain(s);const x=s.players[0].battle.find(x=>x.cardId===U);assert.equal(x.under[0].uid,base.uid);attack(s,x.uid);pick(s,base.uid);drain(s);assert.equal(s.winner,0);
});

test('Phoenix-count alternate costs use the added races in mana and the battlefield',()=>{
 const s=setup();give(s,0,'battle',[SM]);give(s,0,'grave',[SM,SM,SM]);give(s,0,'hand',['dm25ex1-010','dm25ex1-044','dm25ex1-023',SM]);const ids=['phoenixMars','phoenixPluto','g48Mercury'];assert.ok(!e.getLegalActions(s).some(a=>ids.includes(a.alternative)));s.players[0].battle.push(inst(RAP));const actions=e.getLegalActions(s);for(const alternative of ids)assert.ok(actions.some(a=>a.alternative===alternative),alternative);
});
