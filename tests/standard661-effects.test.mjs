import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-661.json',import.meta.url)));
const ELM='dmr12-042',STOP='dmr12-009',FASHION='dmr12-006',STAR='dm26rp1-048',COTTON='dm26rp2-055';
const NATURE='dm01-108',FIRE='dm01-100',HAND='dm01-027',QQ='dmrp07-m01';
const has=(xs,uid)=>xs.some(x=>x.uid===uid);
const valueOf=c=>c.value?.uid??c.value;
const values=s=>s.decision.choices.map(valueOf);
const pick=(s,v)=>act(s,'extended',a=>valueOf(s.decision.choices[a.choice])===v);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const end=s=>{s.phase='attack';act(s,'endTurn');};
function destroy(s,uid){
 s.active=1;
 act(s,'play',a=>a.cardId===HAND);
 act(s,'effect',a=>a.targets[0]?.uid===uid);
}

test('Phase 661 keeps all three original card IDs and compiled complete print specs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:661}));
  assert.throws(()=>standardCardSpec(detail,{phase:660}));
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

test('Elm Street makes the other player choose a card to discard after Shield Go',()=>{
 let s=setup();
 give(s,0,'battle',[ELM]);
 give(s,1,'hand',[HAND,FIRE,NATURE]);
 const [elm]=s.players[0].battle,[,first,chosen]=s.players[1].hand;
 destroy(s,elm.uid);
 assert.ok(s.players[0].shields.some(x=>x.uid===elm.uid&&x.faceUp));
 assert.equal(s.decision.player,1);
 assert.deepEqual(values(s),[first.uid,chosen.uid]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,chosen.uid);
 assert.ok(has(s.players[1].grave,chosen.uid));
 assert.ok(has(s.players[1].hand,first.uid));
});

test('The Stop skips the current turn after destruction without activating tapped turn-end effects',()=>{
 const s=setup();
 give(s,0,'battle',[STOP]);
 give(s,1,'battle',[FASHION]);
 give(s,1,'hand',[HAND]);
 give(s,1,'deck',[COTTON,NATURE,NATURE]);
 const [stop]=s.players[0].battle,[fashion]=s.players[1].battle,[cotton]=s.players[1].deck;
 fashion.tapped=true;
 fashion.buff=1000;
 const turn=s.turn,before=physical(s),rng=s.rng;
 destroy(s,stop.uid);
 assert.equal(s.turn,turn+1);
 assert.equal(s.active,0);
 assert.equal(s.decision,null);
 assert.equal(s.phase,'charge');
 assert.equal(fashion.buff,0);
 assert.equal(s.players[1].deck[0].uid,cotton.uid);
 assert.equal(s.rng,rng);
 assert.ok(s.players[0].shields.some(x=>x.uid===stop.uid&&x.faceUp));
 assert.deepEqual(physical(s),before);
});

for(const up of [true,false])test('The Stop interrupts an attack only if Starman shields it face up: '+up,()=>{
 const s=setup();
 give(s,0,'battle',[STAR]);
 give(s,0,'hand',[STOP]);
 give(s,0,'deck',[FIRE,NATURE,NATURE]);
 const [star]=s.players[0].battle,[stop]=s.players[0].hand;
 const count=s.players[1].shields.length,turn=s.turn,before=physical(s);
 attack(s);
 pick(s,stop.uid);
 pick(s,up);
 assert.equal(s.active,up?1:0);
 assert.equal(s.turn,turn+(up?1:0));
 assert.equal(star.tapped,true);
 assert.equal(s.players[1].shields.length,count);
 assert.equal(s.attack?.attacker,up?undefined:star.uid);
 assert.deepEqual(physical(s),before);
});

for(const accept of [true,false])test('Fashion Monster may deploy one Shield Go creature then shuffles its own deck: '+accept,()=>{
 let s=setup();
 give(s,0,'battle',[FASHION]);
 give(s,0,'deck',[COTTON,HAND,STOP,NATURE]);
 const [fashion]=s.players[0].battle,[cotton,,stop]=s.players[0].deck;
 fashion.tapped=true;
 const before=physical(s),rng=s.rng;
 end(s);
 assert.deepEqual(values(s),[cotton.uid,stop.uid,null]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,accept?cotton.uid:null);
 assert.equal(s.active,1);
 assert.equal(has(s.players[0].battle,cotton.uid),accept);
 assert.equal(has(s.players[0].deck,cotton.uid),!accept);
 assert.notEqual(s.rng,rng);
 assert.deepEqual(physical(s),before);
});

for(const condition of ['untapped','opponent turn','deck locked'])test('Fashion Monster does not search when '+condition,()=>{
 const s=setup();
 give(s,0,'battle',[FASHION]);
 give(s,0,'deck',[COTTON,NATURE,NATURE]);
 s.players[0].battle[0].tapped=condition!=='untapped';
 if(condition==='opponent turn')s.active=1;
 if(condition==='deck locked')give(s,1,'battle',[QQ]);
 const [cotton]=s.players[0].deck,rng=s.rng;
 end(s);
 assert.equal(s.decision,null);
 assert.equal(s.rng,rng);
 assert.ok(!has(s.players[0].battle,cotton.uid));
});
