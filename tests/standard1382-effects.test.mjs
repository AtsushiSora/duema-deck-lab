import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue} from '../dist/catalogue.js';
import {data,details,snapshot,PRESETS,e,setup,inst,cast,drain} from './target-fixture.mjs';
const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-1382.json',import.meta.url))),ids=manifest.cards.map(c=>c.id),NECK='dmsd11-014',WAVE='dmsd11-005';
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
 assert.deepEqual(e.validateDeck(deck),[]);assert.deepEqual(registry.validate(deck),[]);const game=e.createGame([deck,deck],{seed:1382});assert.equal(game.players[0].gr.length,12);assert.equal(game.players[0].deck.length,30);assert.deepEqual(deck,before);
 assert.ok(e.validateDeck({...deck,grCards:[{id:ids[0],count:3},...ids.slice(1).map(id=>({id,count:2})),{id:NECK,count:1}]}).some(x=>x.includes('2枚まで')));
 assert.ok(e.validateDeck({...deck,format:'original'}).some(x=>x.includes('超GR')));
 for(const id of ids){assert.equal(registry.get(id).id,id);assert.equal(e.card(id).gr,true);assert.equal(e.card(id).manaValue,0);}
});

test('愛魂憎男 remains a mana-zero GR creature with all five printed civilizations',()=>{const c=e.card('dmex08-275');assert.equal(c.manaValue,0);assert.deepEqual(c.civilizations,['光','水','闇','火','自然']);});
test('メタルトッQ must attack when able but permits ending the turn when tapped or its native abilities are ignored',()=>{
 const s=setup();s.active=0;s.phase='attack';const x=inst('dmex05-001');s.players[0].battle=[x];assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid));assert.ok(!e.getLegalActions(s).some(a=>a.kind==='endTurn'));x.tapped=true;assert.ok(e.getLegalActions(s).some(a=>a.kind==='endTurn'));x.tapped=false;x.g35Ignored=s.turn;assert.ok(e.getLegalActions(s).some(a=>a.kind==='endTurn'));
});
test('奇跡の長男 おそ松 gains precisely one power while attacking, not one thousand',()=>{
 const s=setup();s.active=0;const x=inst('dmex08-213'),enemy=inst('dm01-108');s.players[0].battle=[x];s.players[1].battle=[enemy];const base=e.power(x,false,s);enemy.powerModifiers=[{amount:base-e.power(enemy,false,s)}];enemy.tapped=true;assert.equal(e.power(x,true,s),base+1);s.phase='attack';e.step(s,e.getLegalActions(s).find(a=>a.kind==='attack'&&a.uid===x.uid&&a.target===enemy.uid));drain(s);assert.ok(s.players[0].battle.includes(x));assert.ok(s.players[1].grave.includes(enemy));
});
test('発起の意志 ラパエロ untaps at the end of its controller turn before the opponent starts',()=>{
 const s=setup();s.active=0;s.phase='attack';const x=inst('dmrp09-031');x.tapped=true;s.players[0].battle=[x];e.step(s,e.getLegalActions(s).find(a=>a.kind==='endTurn'));drain(s);assert.equal(s.active,1);assert.equal(x.tapped,false);
});
test('防護の意志 ランジェス cannot attack players but can attack tapped creatures and block opponents',()=>{
 const s=setup();s.active=0;s.phase='attack';const x=inst('dmrp09-064'),enemy=inst('dm01-108');enemy.tapped=true;s.players[0].battle=[x];s.players[1].battle=[enemy];let actions=e.getLegalActions(s);assert.ok(!actions.some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target==='player'));assert.ok(actions.some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target===enemy.uid));
 s.active=1;enemy.tapped=false;actions=e.getLegalActions(s);e.step(s,actions.find(a=>a.kind==='attack'&&a.uid===enemy.uid&&a.target==='player'));assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===x.uid));
});
