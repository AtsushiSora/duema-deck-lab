import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-635.json',import.meta.url)));
const KUSHTOR='dm26rp3-056',GUGUPPY='dm26rp3-059',PEACH='dm26rp3-076';
const FIRE='dm01-097',NATURE='dm01-108',TOOTH='dm01-103',SEED='dmsd20-016',DESTROY='dm01-027',BOUNCE='dm01-086';

function pick(s,value){
 act(s,'extended',a=>{
  const selected=s.decision.choices[a.choice].value;
  return (selected?.uid??selected)===value;
 });
}

test('Phase 635 defines each official name once, preserving its card ID in saved decks',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.equal(cards.length,3);
 for(const row of cards){
  const detail=details.cards.find(d=>d.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:635}));
  assert.throws(()=>standardCardSpec(detail,{phase:634}));
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[row.id]);
  assert.ok(row.verification.facesMatched);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].id=row.id;
  assert.deepEqual(catalogue.resolveRows(deck.cards),deck.cards);
  assert.deepEqual(catalogue.validate(deck),[]);
  assert.deepEqual(e.validateDeck(deck),[]);
 }
});

test('Kushtor stops removal as the only creature even with a Tamaseed, and loses protection with an ally',()=>{
 for(const spell of [DESTROY,BOUNCE]){
  for(const ally of [SEED,FIRE]){
   const s=setup();
   give(s,0,'hand',[spell]);
   give(s,1,'battle',[KUSHTOR,ally]);
   const [kushtor]=s.players[1].battle;
   act(s,'play');
   act(s,'effect',a=>a.target===kushtor.uid||a.targets?.[0]?.uid===kushtor.uid);
   assert.equal(s.players[1].battle.some(x=>x.uid===kushtor.uid),ally===SEED);
  }
 }
});

test('Kushtor blocks normally and stays in battle when it loses as the only creature',()=>{
 const s=setup();
 give(s,0,'battle',[TOOTH]);
 give(s,1,'battle',[KUSHTOR]);
 const [kushtor]=s.players[1].battle;
 attack(s);
 act(s,'block',a=>a.uid===kushtor.uid);
 assert.equal(s.players[1].battle[0].uid,kushtor.uid);
 assert.equal(s.players[1].battle[0].tapped,true);
 assert.equal(s.players[1].shields.length,5);
});

test('Guguppy chooses a non-creature enemy element and the opponent selects top or bottom after restore',()=>{
 for(const destination of ['deckTop','deck']){
  let s=setup();
  give(s,0,'hand',[GUGUPPY]);
  give(s,0,'battle',[SEED]);
  give(s,1,'battle',[SEED]);
  const [target]=s.players[1].battle,[own]=s.players[0].battle;
  act(s,'play');
  assert.equal(s.decision.player,0);
  assert.ok(!s.decision.choices.some(x=>x.value===own.uid));
  pick(s,target.uid);
  assert.equal(s.decision.player,1);
  s=JSON.parse(JSON.stringify(s));
  pick(s,destination);
  assert.equal(s.players[1].deck.at(destination==='deckTop'?0:-1).uid,target.uid);
  assert.equal(s.players[1].battle.length,0);
 }
});

test('Peach boosts a chosen creature before fighting and may target either side',()=>{
 for(const boostAlly of [false,true]){
  const s=setup();
  give(s,0,'hand',[PEACH]);
  give(s,0,'battle',[NATURE]);
  give(s,1,'battle',[TOOTH]);
  const [ally]=s.players[0].battle,[enemy]=s.players[1].battle;
  act(s,'play');
  const boosted=boostAlly?ally:enemy,initialPower=e.power(boosted,false,s);
  pick(s,boosted.uid);
  assert.equal(e.power(boosted,false,s),initialPower+2000);
  pick(s,ally.uid);
  pick(s,enemy.uid);
  assert.equal(s.players[0].battle.length,boostAlly?1:0);
  assert.equal(s.players[1].battle.length,boostAlly?0:1);
  act(s,'toAttack');
  act(s,'endTurn');
  assert.equal(e.power(boosted,false,s),initialPower);
 }
});

test('Both S・トリガー cards can be used without mana on the opponent turn',()=>{
 for(const id of [GUGUPPY,PEACH]){
  const s=setup();
  s.active=1;
  give(s,0,'shields',[id]);
  give(s,0,'mana',[]);
  give(s,1,'battle',[FIRE]);
  attack(s);
  act(s,'noBlock');
  act(s,'useTrigger');
  assert.equal(s.decision.player,0);
  const [attacker]=s.players[1].battle;
  pick(s,attacker.uid);
  if(id===GUGUPPY){
   assert.equal(s.decision.player,1);
   pick(s,'deck');
   assert.equal(s.players[1].deck.at(-1).uid,attacker.uid);
  }else assert.equal(e.power(attacker,false,s),4000);
 }
});
