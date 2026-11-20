import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue} from '../dist/catalogue.js';
import {data,details,snapshot,PRESETS,e,setup,inst,cast,drain} from './target-fixture.mjs';
const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-1381.json',import.meta.url))),ids=manifest.cards.map(c=>c.id),NECK='dmsd11-014',WAVE='dmsd11-005';
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
 assert.deepEqual(e.validateDeck(deck),[]);assert.deepEqual(registry.validate(deck),[]);const game=e.createGame([deck,deck],{seed:1381});assert.equal(game.players[0].gr.length,12);assert.equal(game.players[0].deck.length,30);assert.deepEqual(deck,before);
 assert.ok(e.validateDeck({...deck,grCards:[{id:ids[0],count:3},...ids.slice(1).map(id=>({id,count:2})),{id:NECK,count:1}]}).some(x=>x.includes('2枚まで')));
 assert.ok(e.validateDeck({...deck,format:'original'}).some(x=>x.includes('超GR')));
 for(const id of ids){assert.equal(registry.get(id).id,id);assert.equal(e.card(id).gr,true);assert.equal(e.card(id).manaValue,0);}
});

test('カブⅫ cannot attack either a player or a tapped creature even after summoning sickness ends',()=>{
 const s=setup();s.active=0;s.phase='attack';const x=inst('dmex05-018'),enemy=inst('dm01-108');enemy.tapped=true;s.players[0].battle=[x];s.players[1].battle=[enemy];
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid));assert.ok(e.getLegalActions(s).some(a=>a.kind==='endTurn'));
});
test('チュップⅡ gains 3000 only while attacking and wins an otherwise losing battle',()=>{
 const s=setup();s.active=0;const x=inst('dmex05-016'),enemy=inst('dm01-108');enemy.tapped=true;enemy.powerModifiers=[{amount:3000-e.power(enemy,false,s)}];s.players[0].battle=[x];s.players[1].battle=[enemy];
 assert.equal(e.power(x,false,s),2000);assert.equal(e.power(x,true,s),5000);s.phase='attack';e.step(s,e.getLegalActions(s).find(a=>a.kind==='attack'&&a.uid===x.uid&&a.target===enemy.uid));drain(s);assert.ok(s.players[0].battle.includes(x));assert.ok(s.players[1].grave.includes(enemy));assert.equal(e.power(x,false,s),2000);
});
test('バッチリ・バッチー keeps normal power 1000 but uses 4000 for battle on attack and defense',()=>{
 for(const defending of [false,true]){const s=setup();s.active=0;const x=inst('dmex05-012'),enemy=inst('dm01-108');enemy.powerModifiers=[{amount:3000-e.power(enemy,false,s)}];s.players[defending?1:0].battle=[x];s.players[defending?0:1].battle=[enemy];s.players[1].battle[0].tapped=true;
  assert.equal(e.power(x,false,s),1000);assert.equal(e.matchupPower(x,enemy,!defending,s),4000);s.phase='attack';e.step(s,e.getLegalActions(s).find(a=>a.kind==='attack'&&a.target===s.players[1].battle[0].uid));drain(s);assert.ok(s.players[defending?1:0].battle.includes(x));assert.ok(s.players[defending?0:1].grave.includes(enemy));}
});
test('浸透 DS-10 passes an untapped blocker without offering a block choice',()=>{
 const s=setup();s.active=0;const x=inst('dmrp09-072'),blocker=inst('dm01-076');s.players[0].battle=[x];s.players[1].battle=[blocker];assert.equal(e.card(blocker).blocker,true);s.phase='attack';e.step(s,e.getLegalActions(s).find(a=>a.kind==='attack'&&a.uid===x.uid&&a.target==='player'));drain(s);assert.equal(blocker.tapped,false);assert.equal(s.players[1].shields.length,4);
});
test('暗黒の騎士ザガーン GR breaks exactly two shields in one attack',()=>{
 const s=setup();s.active=0;const x=inst('dmex18-003');s.players[0].battle=[x];s.phase='attack';e.step(s,e.getLegalActions(s).find(a=>a.kind==='attack'&&a.uid===x.uid&&a.target==='player'));drain(s);assert.equal(s.players[1].shields.length,3);assert.ok(s.players[0].battle.includes(x));
});
