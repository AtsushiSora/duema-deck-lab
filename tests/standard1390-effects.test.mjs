import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue} from '../dist/catalogue.js';
import {data,details,snapshot,PRESETS,e,setup,inst,cast,drain} from './target-fixture.mjs';
const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-1390.json',import.meta.url))),ids=manifest.cards.map(c=>c.id),NECK='dmsd11-014',WAVE='dmsd11-005';
for(const row of manifest.cards){
 test(row.name+' is summoned from the top of super GR with printed power, paid summon status and ordinary summoning sickness',()=>{
  const s=setup();s.active=0;s.format='advance';const top=inst(row.id);s.players[0].gr=[top,inst(NECK)];s.players[0].battle.push(inst(WAVE));
  cast(s,'dm06-110');drain(s);assert.ok(s.players[0].battle.includes(top));assert.equal(s.players[0].gr.length,1);assert.equal(top.summonedTurn,s.turn);assert.equal(e.power(top,false,s),Number(row.faces[0].powerText));
  s.phase='attack';assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===top.uid));assert.ok(s.log.some(x=>x.type==='grSummon'&&x.cardId===row.id));
 });
 test(row.name+' returns below super GR rather than remaining in the grave when destroyed',()=>{
  const s=setup();s.format='advance';s.active=1;const gr=inst(row.id);gr.cardOwner=0;s.players[0].battle.push(gr);s.players[0].gr=[inst(NECK)];
  cast(s,'dm01-027');drain(s);assert.ok(!s.players[0].battle.includes(gr));assert.ok(!s.players[0].grave.includes(gr));assert.equal(s.players[0].gr.at(-1),gr);
 });
}
test('the five new names use existing IDs and preserve the main forty, super GR and saved-deck snapshots',()=>{
 const registry=createCatalogue(snapshot,data.cards,details),deck={...structuredClone(PRESETS[0]),format:'advance',grCards:[...ids,NECK].map(id=>({id,count:2}))},before=structuredClone(deck);
 assert.deepEqual(e.validateDeck(deck),[]);assert.deepEqual(registry.validate(deck),[]);const game=e.createGame([deck,deck],{seed:1390});assert.equal(game.players[0].gr.length,12);assert.equal(game.players[0].deck.length,30);assert.deepEqual(deck,before);
 assert.ok(e.validateDeck({...deck,grCards:[{id:ids[0],count:3},...ids.slice(1).map(id=>({id,count:2})),{id:NECK,count:1}]}).some(x=>x.includes('2枚まで')));
 assert.ok(e.validateDeck({...deck,format:'original'}).some(x=>x.includes('超GR')));
 for(const id of ids){assert.equal(registry.get(id).id,id);assert.equal(e.card(id).gr,true);assert.equal(e.card(id).manaValue,0);}
});

const put1390=(s,p,id)=>{const x=inst(id);s.players[p].battle.push(x);return x;};
test('K2 gains 2000 for each other own creature, ignores opposing entries, and expires at turn end',()=>{
 const s=setup();s.active=0;const x=put1390(s,0,'dmsd08-003'),base=e.power(x,false,s);
 cast(s,'dm01-108');drain(s);assert.equal(e.power(x,false,s),base+2000);
 cast(s,'dm01-108');drain(s);assert.equal(e.power(x,false,s),base+4000);
 s.active=1;cast(s,'dm01-108');drain(s);assert.equal(e.power(x,false,s),base+4000);
 s.active=0;s.phase='attack';e.step(s,e.getLegalActions(s).find(a=>a.kind==='endTurn'));drain(s);assert.equal(e.power(x,false,s),base);
});
for(const delta of[-1,0,1])test('Anemo uses the blockers current power at boundary '+delta,()=>{
 const s=setup();s.active=0;const x=put1390(s,0,'dmrp09-054'),b=put1390(s,1,'dm01-076');
 b.powerModifiers=[{amount:e.power(x,false,s)+delta-e.power(b,false,s)}];s.phase='attack';
 e.step(s,e.getLegalActions(s).find(a=>a.kind==='attack'&&a.uid===x.uid&&a.target==='player'));drain1390ToBlock(s);
 assert.equal(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===b.uid),delta>=0);
});
function drain1390ToBlock(s){for(let n=0;s.decision&&s.decision.type!=='block'&&n<80;n++)e.step(s,e.chooseAI(s));}
test('Dustin actually enters tapped when GR summoned and is available as a tapped attack target',()=>{
 const s=setup();s.active=0;const x=inst('dmrp09-059');s.players[0].gr=[x];cast(s,'dmsd11-018');drain(s);
 assert.ok(s.players[0].battle.includes(x));assert.equal(x.tapped,true);
 s.active=1;s.phase='attack';const enemy=put1390(s,1,'dm01-108');assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===enemy.uid&&a.target===x.uid));
});
for(const p of[0,1])test('Magical Issa discounts only the first own spell each turn for player '+p,()=>{
 const s=setup();put1390(s,p,'dmbd11-a03');for(const active of[0,1]){s.active=active;for(const n of[0,1,2]){s.players[p].spellsThisTurn=n;assert.equal(e.summonCost(s,p,e.card('dm06-110')),n?2:1);assert.equal(e.summonCost(s,1-p,e.card('dm06-110')),2);}}
});
test('Issa entering from the first spell does not renew the discount, and the next turn does',()=>{
 const s=setup();s.active=0;s.players[0].gr=[inst('dmbd11-a03')];cast(s,'dmsd11-018');drain(s);assert.equal(s.players[0].spellsThisTurn,1);assert.equal(e.summonCost(s,0,e.card('dm06-110')),2);
 s.phase='attack';e.step(s,e.getLegalActions(s).find(a=>a.kind==='endTurn'));drain(s);assert.equal(e.summonCost(s,0,e.card('dm06-110')),1);
});
for(const targetAvailable of[false,true])test('Rokepan forces a creature attack only when a legal creature target exists: '+targetAvailable,()=>{
 const s=setup();s.active=0;s.phase='attack';const x=put1390(s,0,'dmrp10-033'),b=put1390(s,1,'dm01-108');b.tapped=targetAvailable;
 const a=e.getLegalActions(s);assert.equal(a.some(a=>a.kind==='endTurn'),!targetAvailable);assert.equal(a.some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target==='player'),!targetAvailable);assert.equal(a.some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target===b.uid),targetAvailable);
});
