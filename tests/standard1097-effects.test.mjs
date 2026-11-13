import test from 'node:test';
import assert from 'node:assert/strict';
import {createCatalogue} from '../dist/catalogue.js';
import {act,cast,data,details,drain,e,give,inst,PRESETS,snapshot} from './target-fixture.mjs';

const APACHE='dmr01-095', CARINA='dmr01-072', MIRANDA='dmr01-104';
const JOHN='dm37-033', BOLSHACK='dm36-s07', UNTOUCHABLE='dm37-021', GILCROSS='dmx05-s05';
const mana=['dm01-075','dm01-097','dm01-108'];
const extraCards=[JOHN,BOLSHACK,UNTOUCHABLE].map(id=>({id,count:1}));
function setup(format='advance'){
 const decks=PRESETS.slice(0,2).map(deck=>({...deck,format,...(format==='advance'?{extraCards}:{})}));
 const s=e.createGame(decks,{seed:1097});
 s.phase='main';
 for(const p of [0,1]){
  give(s,p,'hand',[]);
  give(s,p,'mana',mana.flatMap(id=>Array(8).fill(id)));
 }
 return s;
}
const values=s=>s.decision?.choices?.map(c=>c.value?.uid??c.value)??[];
const pick=(s,uid)=>act(s,'extended',a=>values(s)[a.choice]===uid);

for(const [id,eligible,chosen] of [
 [APACHE,[JOHN,BOLSHACK],BOLSHACK],
 [CARINA,[UNTOUCHABLE],UNTOUCHABLE],
 [MIRANDA,[JOHN,UNTOUCHABLE],JOHN]
])test(id+' deploys exactly one eligible Psychic from the controller’s own extra zone',()=>{
 const s=setup(),own=s.players[0],opposing=s.players[1],before=own.extra.slice();
 const target=before.find(x=>x.cardId===chosen);
 cast(s,id);
 assert.equal(s.decision.player,0);
 assert.equal(s.decision.source,id);
 assert.deepEqual(new Set(values(s)),new Set(before.filter(x=>eligible.includes(x.cardId)).map(x=>x.uid)));
 pick(s,target.uid);
 drain(s);
 assert.ok(own.battle.includes(target));
 assert.equal(target.entered,s.turn);
 s.phase='attack';
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='endTurn'));
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===target.uid));
 assert.deepEqual(own.extra,before.filter(x=>x!==target));
 assert.equal(own.mana.filter(x=>x.tapped).length,e.card(id).cost);
 assert.equal(opposing.extra.length,3);
 assert.equal(s.decision,null);
});

test('Each entry ability resolves with no eligible card or while a Psychic entry prohibition applies',()=>{
 for(const id of [APACHE,CARINA,MIRANDA])for(const format of ['original','advance']){
  const s=setup(format);
  if(format==='advance')s.players[1].battle.push(inst(GILCROSS));
  const extra=s.players[0].extra.slice();
  cast(s,id);
  assert.equal(s.decision,null);
  assert.deepEqual(s.players[0].battle.map(x=>x.cardId),[id]);
  assert.deepEqual(s.players[0].extra,extra);
 }
});

test('Apache Lizard’s entry ability also works when it is put into battle by an effect',()=>{
 const s=setup(),own=s.players[0],creature=inst(APACHE);
 const john=own.extra.find(x=>x.cardId===JOHN);
 own.grave.push(creature);
 give(s,0,'mana',Array(8).fill('dm01-090'));
 cast(s,'dmc44-001');
 pick(s,creature.uid);
 assert.equal(s.decision.source,APACHE);
 assert.ok(values(s).includes(john.uid));
 pick(s,john.uid);
 drain(s);
 assert.ok(own.battle.includes(creature));
 assert.ok(own.battle.includes(john));
 assert.equal(own.mana.filter(x=>x.tapped).length,5);
});

test('Verified alternate prints resolve to the canonical IDs and share the current four-copy limit',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 for(const [id,prints] of [
  [APACHE,['dmr01-095M','dmx06-016','promoy10-004']],
  [CARINA,[]],
  [MIRANDA,['dmx06-018','dm22ex1-123','dm25ex4-T27']]
 ]){
  const canonical=catalogue.get(id);
  assert.equal(canonical.limit,4);
  for(const print of prints)assert.equal(catalogue.get(print),canonical);
  const deck=PRESETS[0].cards.flatMap(row=>Array(row.count).fill(row.id)).slice(4);
  const counts=new Map();
  for(const cardId of [...deck,id,id,id,id])counts.set(cardId,(counts.get(cardId)||0)+1);
  assert.deepEqual(e.validateDeck({cards:[...counts].map(([id,count])=>({id,count}))}),[]);
 }
});
