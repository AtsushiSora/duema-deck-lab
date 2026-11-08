import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,act} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-664.json',import.meta.url)));

test('Phase 664 validates five complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:664}));
  assert.throws(()=>standardCardSpec(detail,{phase:663}));
  for(const [field,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[field],value);
  assert.deepEqual(data.cards.filter(c=>key(c.name)===key(row.name)).map(c=>c.id),[row.id]);
  assert.ok(row.verification.facesMatched);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].id=row.id;
  assert.deepEqual(catalogue.resolveRows(deck.cards),deck.cards);
  assert.deepEqual(e.validateDeck(deck),[]);
 }
});

const TAP='dmr11-022',DRAW='dmr11-024',DISCARD='dmr11-025',BOMB='dmr11-027',RAMP='dmr11-028';
const NATURE='dm01-108',SMALL='dm01-079',BIG='dm01-s04';
const has=(xs,uid)=>xs.some(x=>x.uid===uid);
const pick=(s,value)=>act(s,'extended',a=>{
 const choice=s.decision.choices[a.choice].value;
 return (choice?.uid??choice)===value;
});

function ready(id){
 const s=setup();
 give(s,0,'hand',[id]);
 give(s,0,'battle',[NATURE]);
 give(s,0,'deck',[NATURE,NATURE,NATURE]);
 give(s,1,'hand',[NATURE,NATURE]);
 give(s,1,'battle',[SMALL,BIG]);
 const uid=s.players[0].hand[0].uid;
 act(s,'play',a=>a.cardId===id);
 assert.equal(s.decision?.task?.op,'g34_SelfSacrifice407');
 return {s,uid};
}

for(const {id,name} of cards)test(name+' resolves its printed payoff and puts the same card face up',()=>{
 const {s:original,uid}=ready(id);
 const s=JSON.parse(JSON.stringify(original));
 const [own,opponent]=s.players;
 const [small,big]=opponent.battle;
 const [top]=own.deck;
 const mana=own.mana.length;
 pick(s,true);
 if(id===BOMB){
  assert.equal(s.decision?.task?.op,'g34_Target');
  assert.ok(has(own.grave,uid));
  assert.deepEqual(s.decision.choices.map(choice=>choice.value?.uid),[small.uid]);
  pick(s,small.uid);
  assert.ok(has(opponent.grave,small.uid));
  assert.ok(has(opponent.battle,big.uid));
 }
 assert.equal(s.decision,null);
 assert.equal(own.shields.length,6);
 assert.equal(own.shields.find(card=>card.uid===uid)?.faceUp,true);
 assert.ok(!has(own.grave,uid)&&!has(own.battle,uid));
 assert.equal(own.battle[0].tapped,false);
 if(id===TAP)assert.ok(opponent.battle.every(card=>card.tapped));
 if(id===DRAW)assert.ok(has(own.hand,top.uid));
 if(id===DISCARD)assert.equal(opponent.hand.length,1);
 if(id===RAMP){
  assert.equal(own.mana.length,mana+1);
  assert.ok(has(own.mana,top.uid));
 }
});

test('Declining the sacrifice leaves every creature in battle and skips the payoff',()=>{
 for(const {id} of cards){
  const {s,uid}=ready(id);
  pick(s,null);
  assert.equal(s.decision,null);
  assert.ok(has(s.players[0].battle,uid));
  assert.equal(s.players[0].shields.length,5);
  assert.equal(s.players[0].deck.length,3);
  assert.equal(s.players[1].hand.length,2);
  assert.equal(s.players[1].battle.length,2);
  assert.ok(s.players[1].battle.every(card=>!card.tapped));
 }
});

test('Preventing destruction preserves the payoff without triggering Shield Go',()=>{
 const {s,uid}=ready(DRAW);
 const own=s.players[0];
 own.battle.find(card=>card.uid===uid).g26Stay=0;
 pick(s,true);
 assert.equal(s.decision,null);
 assert.ok(has(own.battle,uid));
 assert.equal(own.shields.length,5);
 assert.equal(own.hand.length,1);
});

test('Graveyard movement prevention leaves the destroyed card in the graveyard',()=>{
 const {s,uid}=ready(DRAW);
 const own=s.players[0];
 give(s,1,'battle',['dmrp22-042']);
 pick(s,true);
 assert.equal(s.decision,null);
 assert.ok(has(own.grave,uid));
 assert.equal(own.shields.length,5);
 assert.equal(own.hand.length,1);
});
