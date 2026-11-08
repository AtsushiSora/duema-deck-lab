import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-642.json',import.meta.url)));
const WORK='dm26rp3-037',DAD='dm26rp3-038',LIFT='dm26rp3-062',BUILD='dm26rp3-065';
const FIRE='dm01-097',DARK='dm01-090',NATURE='dm01-108',SEED='dmsd20-016';
const JOKER='dmsd01-012',JOKER_SPELL='dmsd01-011',JOKER_6='dmrp07-079',DEATH_WATCH='dm24rp3-041';

function valueOf(choice){return choice.value?.uid??choice.value;}
function pick(s,value){act(s,'extended',a=>valueOf(s.decision.choices[a.choice])===value);}
function physical(s){return e.physicalCards(s).map(x=>x.uid).sort();}

test('Phase 642 verifies the original prints, complete effects and saved deck IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 assert.equal(cards.length,4);
 for(const row of cards){
  const detail=details.cards.find(d=>d.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:642}));
  assert.throws(()=>standardCardSpec(detail,{phase:641}));
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

test('Work can skip its mill and still recover a Joker card, or mill and recover a new Joker',()=>{
 for(const mill of [true,false]){
  let s=setup();
  give(s,0,'hand',[WORK]);
  give(s,0,'mana',Array(4).fill(DARK));
  give(s,0,'grave',[SEED,FIRE]);
  give(s,0,'deck',[JOKER_SPELL,FIRE,FIRE,FIRE,NATURE,NATURE]);
  const old=s.players[0].grave[0],fresh=s.players[0].deck[0],before=physical(s);
  act(s,'play');
  pick(s,mill?true:null);
  assert.deepEqual(s.decision.choices.map(valueOf),mill?[old.uid,fresh.uid,null]:[old.uid,null]);
  s=JSON.parse(JSON.stringify(s));
  pick(s,mill?fresh.uid:old.uid);
  assert.equal(s.players[0].deck.length,mill?2:6);
  assert.equal(s.players[0].hand[0].uid,mill?fresh.uid:old.uid);
  assert.deepEqual(physical(s),before);
 }
});

test('Madogiwa Dad can pay its normal cost from grave, then the opponent chooses its own discard',()=>{
 const s=setup();
 give(s,0,'grave',[DAD]);
 give(s,0,'mana',Array(3).fill(DARK));
 give(s,1,'hand',[FIRE,NATURE]);
 const [dad]=s.players[0].grave,[first,discard]=s.players[1].hand,before=physical(s);
 act(s,'play',a=>a.uid===dad.uid&&a.origin==='grave');
 assert.equal(s.decision.player,1);
 pick(s,discard.uid);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,3);
 assert.equal(s.players[0].battle[0].uid,dad.uid);
 assert.equal(s.players[1].grave[0].uid,discard.uid);
 assert.equal(s.players[1].hand[0].uid,first.uid);
 assert.deepEqual(physical(s),before);
});

test('Bainalavator can enter by S Trigger without mana and targets only the opposing creature',()=>{
 const s=setup();
 s.active=1;
 give(s,1,'battle',[FIRE,SEED]);
 give(s,0,'battle',[FIRE]);
 give(s,0,'shields',[LIFT]);
 give(s,0,'mana',[]);
 const [attacker]=s.players[1].battle,[lift]=s.players[0].shields;
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 assert.deepEqual(s.decision.choices.map(valueOf),[attacker.uid]);
 pick(s,attacker.uid);
 assert.equal(s.players[1].deck.at(-1).uid,attacker.uid);
 assert.equal(s.players[0].battle.at(-1).uid,lift.uid);
});

test('Tsumitatencanen mills the physical top two cards when it enters',()=>{
 const s=setup();
 give(s,0,'hand',[BUILD]);
 give(s,0,'mana',Array(2).fill(DARK));
 const top=s.players[0].deck.slice(0,2).map(x=>x.uid),before=physical(s);
 act(s,'play');
 assert.deepEqual(s.players[0].grave.map(x=>x.uid),top);
 assert.deepEqual(physical(s),before);
});

test('Each J Crime enforces its maximum, resumes the exchange, and triggers destruction of the original attacker',()=>{
 for(const id of [WORK,DAD,LIFT,BUILD]){
  let s=setup();
  give(s,0,'battle',[id,DEATH_WATCH]);
  give(s,0,'grave',[JOKER,FIRE,JOKER_6,JOKER_SPELL]);
  give(s,0,'deck',Array(7).fill(NATURE));
  const [outgoing]=s.players[0].battle,[small,,large]=s.players[0].grave,before=physical(s);
  const incoming=id===WORK?large:small;
  attack(s,outgoing.uid);
  assert.equal(s.decision.task.op,'g393C_Swap');
  assert.deepEqual(s.decision.choices.map(valueOf),id===WORK?[small.uid,large.uid,null]:[small.uid,null]);
  s=JSON.parse(JSON.stringify(s));
  pick(s,incoming.uid);
  assert.ok(s.players[0].grave.some(x=>x.uid===outgoing.uid));
  assert.ok(s.players[0].battle.some(x=>x.uid===incoming.uid&&x.tapped));
  assert.equal(s.attack.attacker,incoming.uid);
  assert.equal(s.decision.source,DEATH_WATCH);
  pick(s,true);
  act(s,'noBlock');
  drain(s);
  assert.ok(s.log.some(l=>l.type==='jCrime'));
  assert.equal(s.players[0].hand.length,1);
  assert.equal(s.players[0].deck.length,6);
  assert.equal(s.players[1].shields.length,id===WORK?3:4);
  assert.deepEqual(physical(s),before);
 }
});

test('Declining J Crime preserves the original attacker and grave',()=>{
 const s=setup();
 give(s,0,'battle',[BUILD]);
 give(s,0,'grave',[JOKER]);
 const [outgoing]=s.players[0].battle,[incoming]=s.players[0].grave;
 attack(s,outgoing.uid);
 pick(s,null);
 assert.equal(s.attack.attacker,outgoing.uid);
 assert.equal(s.players[0].grave[0].uid,incoming.uid);
});
