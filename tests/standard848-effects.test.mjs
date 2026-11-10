import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const HEL='dmr17-042',DOR='dm13-006',GAR='dm19-023',PRINT='promoy5-004';
const LAND='dm01-108',FIRE='dm01-097',GRAND='dm30-040',BAIKEN='dm29-s02',TYPHOON='dm11-043';
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const pick=(s,v)=>act(s,'extended',a=>{
 const value=s.decision.choices[a.choice].value;
 return (value?.uid??value)===v;
});
function field(active=0){
 const s=setup();
 s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(10).fill(LAND));
 return s;
}
function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
function discard(s,n,options={}){
 s.extTasks=[{op:'discard',p:0,source:TYPHOON,n,selfDiscard:true,causedBy:0,...options}];
 act(s,'toAttack');
}
function order(s,x){
 act(s,'orderEffect',a=>s.pendingEffects.some(q=>q.effectId===a.effectId&&q.uid===x.uid));
}

test('Phase 848 preserves the initial printing IDs and resolves the Garplus promo to the same card',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-848.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[HEL,DOR,GAR]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[[PRINT,GAR]]);
 assert.deepEqual(registry.resolveRows([{id:PRINT,count:1},{id:GAR,count:3}]),[{id:GAR,count:4}]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(row.faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:848}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:847}));
  const unknown=structuredClone(d);
  unknown.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:848}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,c.civilizations,c.limit],[f.name,'creature',f.cost,Number(f.powerText),f.race,f.civilizations,4]);
  assert.equal(CARD_IMAGES[row.id],row.image);
 }
 assert.deepEqual(standardCardSpec({...m.printAliases[0],status:'complete'},{phase:848}),m.cards[2].spec);
 assert.ok(Object.values(m.regulationVerification.limits).every(n=>n===4));
});

test('Helclaw makes the opponent choose one card per actual discard in a batch',()=>{
 const s=field(),watcher=put(s,0,'battle',HEL);
 give(s,0,'hand',[FIRE,LAND]);
 give(s,1,'hand',[FIRE,LAND,GRAND]);
 const [a,b]=s.players[0].hand,[x,y,z]=s.players[1].hand;
 discard(s,2);
 pick(s,a.uid);
 assert.equal(s.players[0].hand.length,2);
 pick(s,b.uid);
 assert.equal(s.decision.type,'effectOrder');
 order(s,watcher);
 assert.equal(s.decision.player,1);
 pick(s,y.uid);
 assert.equal(s.decision.player,1);
 pick(s,z.uid);
 assert.deepEqual(s.players[0].grave,[a,b]);
 assert.deepEqual(s.players[1].grave,[y,z]);
 assert.deepEqual(s.players[1].hand,[x]);
 assert.equal(s.decision,null);
});

test('Helclaws on both sides trigger on the resulting discards until a hand is empty',()=>{
 const s=field();
 put(s,0,'battle',HEL);
 put(s,1,'battle',HEL);
 give(s,0,'hand',[FIRE,LAND]);
 give(s,1,'hand',[LAND,FIRE,GRAND]);
 discard(s,1);
 drain(s);
 assert.equal(s.players[0].grave.length,2);
 assert.equal(s.players[1].grave.length,2);
 assert.equal(s.players[1].hand.length,1);
});

test('Helclaw and Dorocia count the actual discard when Baiken replaces another card in the batch',()=>{
 let s=field(1);
 put(s,0,'battle',HEL);
 const watcher=put(s,0,'battle',DOR);
 const bait=put(s,0,'hand',BAIKEN),discarded=put(s,0,'hand',FIRE);
 const [drawn]=s.players[0].deck;
 give(s,1,'hand',[FIRE,LAND]);
 const [kept,lost]=s.players[1].hand;
 discard(s,2);
 pick(s,discarded.uid);
 pick(s,bait.uid);
 assert.equal(s.decision.task.op,'discardChosen');
 s=structuredClone(s);
 pick(s,true);
 assert.equal(s.decision.task.op,'bounceAny');
 pick(s,watcher.uid);
 order(s,watcher);
 assert.equal(s.decision.player,1);
 pick(s,lost.uid);
 drain(s);
 assert.ok(has(s,0,'battle',bait));
 assert.ok(has(s,0,'grave',discarded));
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),[watcher.uid,drawn.uid]);
 assert.deepEqual(s.players[1].hand.map(x=>x.uid),[kept.uid]);
});

for(const active of [0,1])test('Dorocia draws the full discard count only on the opponent turn '+active,()=>{
 const s=field(active);
 put(s,0,'battle',DOR);
 give(s,0,'hand',[FIRE,LAND]);
 const discarded=[...s.players[0].hand],drawn=s.players[0].deck.slice(0,2);
 discard(s,2,{all:true,causedBy:1,selfDiscard:false});
 assert.deepEqual(s.players[0].grave,discarded);
 assert.deepEqual(s.players[0].hand,active===1?drawn:[]);
 assert.equal(s.decision,null);
});

test('Dorocia draws after its own Typhoon shield trigger discards on the opponent turn',()=>{
 const s=field(1),attacker=put(s,1,'battle',LAND);
 put(s,0,'battle',DOR);
 const discarded=put(s,0,'hand',FIRE),[drawn]=s.players[0].deck;
 give(s,0,'shields',[TYPHOON]);
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.cardId===TYPHOON);
 pick(s,0);
 pick(s,discarded.uid);
 assert.ok(has(s,0,'grave',discarded));
 assert.ok(has(s,0,'hand',drawn));
 assert.equal(s.players[0].hand.length,1);
});

test('Dorocia draws after Johnny discards a card to replace defeat',()=>{
 const s=field(1),attacker=put(s,1,'battle',LAND),johnny='dmrp21-1B';
 put(s,0,'battle',DOR);
 put(s,0,'battle',johnny);
 const discarded=put(s,0,'hand',johnny),[drawn]=s.players[0].deck;
 give(s,0,'shields',[]);
 attack(s,attacker.uid);
 act(s,'noBlock');
 assert.equal(s.decision.task.op,'g12Loss');
 act(s,'extended',a=>s.decision.choices[a.choice].value?.kind==='johnnyHand');
 assert.equal(s.winner,null);
 assert.ok(has(s,0,'grave',discarded));
 assert.deepEqual(s.players[0].hand,[drawn]);
});

test('An ignored Helclaw or Dorocia does not trigger',()=>{
 const s=field(1);
 put(s,0,'battle',HEL,{g35Ignored:s.turn});
 put(s,0,'battle',DOR,{g35Ignored:s.turn});
 const x=put(s,0,'hand',FIRE),other=put(s,1,'hand',LAND);
 discard(s,1);
 pick(s,x.uid);
 assert.deepEqual(s.players[0].hand,[]);
 assert.deepEqual(s.players[1].hand,[other]);
 assert.equal(s.decision,null);
});

for(const [label,active,attackerId] of [['itself',0,GAR],['ally',0,GRAND],['opponent',1,GRAND]])test('Garplus triggers on '+label+' and discards after both choices',()=>{
 let s=field(active);
 const watcher=put(s,0,'battle',GAR);
 const attacker=attackerId===GAR?watcher:put(s,active,'battle',attackerId);
 give(s,0,'hand',[LAND,FIRE]);
 give(s,1,'hand',[FIRE,LAND]);
 const [turnCard]=s.players[active].hand,[otherCard]=s.players[1-active].hand;
 attack(s,attacker.uid);
 assert.equal(s.decision.player,active);
 pick(s,turnCard.uid);
 assert.ok(has(s,active,'hand',turnCard));
 assert.ok(has(s,1-active,'hand',otherCard));
 assert.equal(s.decision.player,1-active);
 s=structuredClone(s);
 pick(s,otherCard.uid);
 assert.ok(has(s,active,'grave',turnCard));
 assert.ok(has(s,1-active,'grave',otherCard));
 assert.equal(s.decision.type,'block');
});

test('Garplus skips an empty hand and ignores attacks by creatures of other races',()=>{
 const s=field(),watcher=put(s,0,'battle',GAR),ordinary=put(s,0,'battle',LAND);
 const discard=put(s,1,'hand',FIRE);
 attack(s,ordinary.uid);
 assert.equal(s.decision.type,'block');
 act(s,'noBlock');
 assert.ok(has(s,1,'hand',discard));
 attack(s,watcher.uid);
 assert.equal(s.decision.player,1);
 pick(s,discard.uid);
 assert.ok(has(s,1,'grave',discard));
 assert.equal(s.decision.type,'block');
});
