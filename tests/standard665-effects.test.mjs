import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-665.json',import.meta.url)));

test('Phase 665 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:665}));
  assert.throws(()=>standardCardSpec(detail,{phase:664}));
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

const VERNE='dmr09-049',LEATHER='dmr09-060',GEN='dmr09-064';
const NATURE='dm01-108',HAND='dm01-027',SMALL='dm01-080',LARGE='dm01-001';
const has=(xs,uid)=>xs.some(x=>x.uid===uid);
const faceUp=(s,uid)=>s.players[0].shields.some(x=>x.uid===uid&&x.faceUp);
const value=choice=>choice.value?.uid??choice.value;

for(const accept of [true,false])test('Vernelite may tap one opposing creature on entry: '+accept,()=>{
 let s=setup();
 give(s,0,'hand',[VERNE]);
 give(s,0,'battle',[NATURE]);
 give(s,1,'battle',[NATURE,NATURE]);
 act(s,'play',a=>a.cardId===VERNE);
 const [first,second]=s.players[1].battle;
 assert.deepEqual(s.decision.choices.map(value),[first.uid,second.uid,null]);
 s=JSON.parse(JSON.stringify(s));
 act(s,'extended',a=>value(s.decision.choices[a.choice])===(accept?second.uid:null));
 assert.equal(s.players[1].battle[0].tapped,false);
 assert.equal(s.players[1].battle[1].tapped,accept);
 assert.ok(s.players[0].battle.every(x=>!x.tapped));
});

test('Leatherface loses the battle, destroys the winner by Slayer, then becomes a face-up shield',()=>{
 const s=setup();
 give(s,0,'battle',[LEATHER]);
 give(s,1,'battle',[LARGE]);
 const [source]=s.players[0].battle,[enemy]=s.players[1].battle;
 enemy.tapped=true;
 attack(s,source.uid,enemy.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 assert.ok(faceUp(s,source.uid));
 assert.ok(has(s.players[1].grave,enemy.uid));
 assert.ok(!has(s.players[0].grave,source.uid));
});

test('Gentsuki gains power only on attack and trades with a 2000-power creature',()=>{
 const s=setup();
 give(s,0,'battle',[GEN]);
 give(s,1,'battle',[SMALL]);
 const [source]=s.players[0].battle,[enemy]=s.players[1].battle;
 assert.equal(e.power(source,false,s),1000);
 assert.equal(e.power(source,true,s),2000);
 enemy.tapped=true;
 attack(s,source.uid,enemy.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 assert.ok(faceUp(s,source.uid));
 assert.ok(has(s.players[1].grave,enemy.uid));
});

test('A face-up Shield Go card goes to the graveyard when its shield is broken',()=>{
 const s=setup();
 give(s,0,'battle',[VERNE]);
 give(s,0,'shields',[]);
 give(s,1,'hand',[HAND]);
 give(s,1,'battle',[SMALL]);
 const [source]=s.players[0].battle,[attacker]=s.players[1].battle;
 s.active=1;
 act(s,'play',a=>a.cardId===HAND);
 act(s,'effect',a=>a.targets[0]?.uid===source.uid);
 assert.ok(faceUp(s,source.uid));
 assert.equal(s.decision,null);
 attack(s,attacker.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 assert.equal(s.players[0].shields.length,0);
 assert.ok(has(s.players[0].grave,source.uid));
 assert.ok(!has(s.players[0].hand,source.uid));
});
