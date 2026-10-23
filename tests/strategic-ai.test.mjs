import test from 'node:test';
import assert from 'node:assert/strict';
import {e,data,details,snapshot,setup,give,inst} from './target-fixture.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {resolveStarter25Decks} from '../dist/starter25.js';
import {resolveEnvironmentDecks} from '../dist/environment.js';
const registry=createCatalogue(snapshot,data.cards,details),decks=[...resolveStarter25Decks(registry),...resolveEnvironmentDecks(registry)].filter(d=>!registry.coverage(d).unsupported);
test('strategic mana keeps the creature that this charge makes summonable',()=>{
 const s=setup();s.phase='charge';give(s,0,'mana',['dm01-108']);give(s,0,'hand',['dm01-106','dm01-108']);
 const a=e.chooseAI(s);assert.equal(a.kind,'charge');assert.equal(a.cardId,'dm01-106');e.step(s,a);assert.equal(e.chooseAI(s).cardId,'dm01-108');
});
test('strategic mana accounts for multicolor cards entering tapped',()=>{
 const s=setup();s.phase='charge';give(s,0,'mana',['dm01-097']);give(s,0,'hand',['dm01-097','dm01-108','dm22ex2-024']);
 const a=e.chooseAI(s);assert.equal(a.kind,'charge');assert.equal(a.cardId,'dm01-108');
});
test('strategic mana can skip rather than charge its sole affordable attacker',()=>{
 const s=setup();s.phase='charge';give(s,0,'mana',['dm01-097','dm01-097']);give(s,0,'hand',['dm01-097']);
 assert.equal(e.chooseAI(s).kind,'skipCharge');
});
test('strategic policy casts newly supported removal instead of passing',()=>{
 const s=setup();give(s,0,'mana',Array(4).fill('dm01-090'));give(s,0,'hand',['dmex12-035']);give(s,1,'battle',['dm01-108']);
 assert.equal(e.chooseHeuristicAI(s).kind,'toAttack');const a=e.chooseAI(s);assert.equal(a.kind,'play');assert.equal(a.cardId,'dmex12-035');
});
test('strategic own-list sampling enables draw spells without reading actual library',()=>{
 const deck=decks.find(d=>d.product?.number===20),s=e.createGame([deck,deck]);s.phase='main';
 give(s,0,'mana',['dm01-108','dm01-108']);give(s,0,'hand',['dmr05-110']);
 assert.equal(e.chooseAI(s).kind,'play');
});
test('strategic looting builds a spell graveyard while preserving its sole Gospel',()=>{
 const s=setup(),burn=data.cards.find(c=>c.effect==='burningLoot'),frozen=data.cards.find(c=>c.effect==='frozenCarnival');
 give(s,0,'mana',Array(2).fill('dm01-097'));give(s,0,'hand',['dm23ex3-S09',burn.id,frozen.id]);
 assert.equal(e.chooseAI(s).cardId,burn.id);e.step(s,e.chooseAI(s));const discard=e.chooseAI(s);assert.equal(discard.cardId,frozen.id);e.step(s,discard);
 assert.ok(s.players[0].hand.some(x=>x.cardId==='dm23ex3-S09'));assert.ok(s.players[0].grave.some(x=>x.cardId===burn.id));
});
test('strategic planning uses a deterministic size bound for large payment positions',()=>{
 const s=setup();give(s,0,'hand',['dm01-097']);const before=structuredClone(s),a=e.analyzeAI(s);assert.equal(a.nodes,0);assert.ok(e.getLegalActions(s).some(x=>JSON.stringify(x)===JSON.stringify(a.action)));assert.deepEqual(s,before);assert.deepEqual(e.analyzeAI(JSON.parse(JSON.stringify(s))),a);
});
test('known deck information belongs only to its owner and is returned as a copy',()=>{
 const s=e.createGame([decks[0],decks[1]]),v=e.observation(s,0);assert.deepEqual(v.players[0].knownDeck,s.players[0].knownDeck);assert.ok(!('knownDeck' in v.players[1]));v.players[0].knownDeck[0].count=99;assert.notEqual(s.players[0].knownDeck[0].count,99);
});
test('strategic attacks prioritize a visible lethal route over a favorable trade',()=>{
 const s=setup();s.phase='attack';give(s,0,'battle',['dm01-097','dm01-108']);give(s,1,'battle',['dm01-098']);s.players[1].battle[0].tapped=true;give(s,1,'shields',['dm01-108']);
 assert.notEqual(e.chooseHeuristicAI(s).target,'player');assert.equal(e.chooseAI(s).target,'player');
});
test('strategic planner never mutates game state or consumes a configured live RNG',()=>{
 const s=e.createGame([decks[12],decks[12]],{seed:6213}),before=structuredClone(s);let calls=0;
 e.setRandomSource(()=>{calls++;return .5;});try{const result=e.analyzeAI(s);assert.ok(result.nodes>0&&result.nodes<=64);assert.ok(e.getLegalActions(s).some(a=>JSON.stringify(a)===JSON.stringify(result.action)));assert.deepEqual(s,before);assert.equal(calls,0);}finally{e.setRandomSource(null);}
});
test('strategic search and shuffle lookahead cannot consume nested live random sources',()=>{
 const s=setup();give(s,0,'mana',Array(3).fill('dm01-108'));const search=data.cards.find(c=>c.effect==='searchCreature');give(s,0,'hand',[search.id]);
 let calls=0;const before=structuredClone(s);e.setRandomSource(()=>{calls++;return .2;});
 try{const plan=e.analyzeAI(s);assert.ok(plan.nodes>0);assert.equal(plan.fallbacks,0);assert.equal(calls,0);assert.deepEqual(s,before);}finally{e.setRandomSource(null);}
});
test('strategic policy is invariant to private identities, hidden order, seed and opponent list',()=>{
 for(const number of [4,5,10,13,20]){
  const deck=decks.find(d=>d.product?.number===number),s=e.createGame([deck,deck],{seed:6223});
  for(let n=0;n<12&&s.winner===null;n++){
   const before=structuredClone(s),first=e.analyzeAI(s),p=first.action.player,t=structuredClone(s);
   t.seed=972;t.rng=12345;t.players[1-p].hand=t.players[1-p].hand.map(x=>({...x,cardId:'dm01-052'}));t.players[1-p].knownDeck=[{id:'dm01-052',count:40}];
   for(const player of t.players){player.deck.reverse();for(const x of player.deck)x.cardId='dm01-052';for(const x of player.shields)x.cardId='dm01-052';}
   assert.deepEqual(e.analyzeAI(t),first);assert.deepEqual(s,before);e.step(s,first.action);
  }
 }
});
test('strategic AI completes every supported configuration legally and conserves all cards',()=>{
 assert.equal(decks.length,28);
 for(const [index,deck] of decks.entries()){
  const s=e.createGame([deck,deck],{seed:6300+index,first:index%2});
  while(s.winner===null&&s.turn<160&&s.actions<2500){const a=e.chooseAI(s);assert.ok(a,deck.name);e.step(s,a);const all=e.physicalCards(s);assert.equal(all.length,80,deck.name);assert.equal(new Set(all.map(x=>x.uid)).size,80,deck.name);}
  assert.notEqual(s.winner,null,deck.name);assert.ok([0,1].includes(s.winner));
 }
});
