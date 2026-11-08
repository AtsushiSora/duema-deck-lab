import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-643.json',import.meta.url)));
const Q="dm26rp3-064",MANAGER="dm26rp3-067",HOTT="dm26rp3-074",NYANI="dm26rp3-013";
const FIRE='dm01-097',SEED='dmsd20-016';
const JOKER='dmsd01-012',JOKER_SPELL='dmsd01-011',JOKER_6='dmrp07-079';

function valueOf(choice){return choice.value?.uid??choice.value;}
function pick(s,value){act(s,'extended',a=>valueOf(s.decision.choices[a.choice])===value);}
function physical(s){return e.physicalCards(s).map(x=>x.uid).sort();}

test('Phase 643 verifies the original prints, complete effects and saved deck IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 assert.equal(cards.length,3);
 for(const row of cards){
  const detail=details.cards.find(d=>d.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:643}));
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

test('Q leaves by J Crime, lowers a chosen opposing creature to zero and passes the attack to the incoming Joker',()=>{
 let s=setup();
 give(s,0,'battle',[Q,FIRE]);
 give(s,0,'grave',[JOKER_6,JOKER_SPELL]);
 give(s,1,'battle',['dm01-103',SEED]);
 const [outgoing]=s.players[0].battle,[incoming]=s.players[0].grave,[victim]=s.players[1].battle,before=physical(s);
 attack(s,outgoing.uid);
 assert.deepEqual(s.decision.choices.map(valueOf),[incoming.uid,null]);
 pick(s,incoming.uid);
 assert.equal(s.attack.attacker,incoming.uid);
 assert.deepEqual(s.decision.choices.map(valueOf),[victim.uid]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,victim.uid);
 assert.ok(s.players[0].grave.some(x=>x.uid===outgoing.uid));
 assert.ok(s.players[1].grave.some(x=>x.uid===victim.uid));
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,3);
 assert.deepEqual(physical(s),before);
});

test('SMANAGER filters optional battle targets and can attack immediately',()=>{
 for(const fight of [true,false]){
  const s=setup();
  give(s,0,'hand',[MANAGER]);
  give(s,1,'battle',[FIRE,'dm22ex1-018',SEED]);
  const [victim,protectedCreature]=s.players[1].battle;
  protectedCreature.justDiverActive=true;
  act(s,'play');
  const [manager]=s.players[0].battle;
  assert.deepEqual(s.decision.choices.map(valueOf),[victim.uid,null]);
  pick(s,fight?victim.uid:null);
  assert.equal(s.players[1].grave.some(x=>x.uid===victim.uid),fight);
  attack(s,manager.uid);
  assert.equal(s.attack.attacker,manager.uid);
 }
});

test('SMANAGER counts itself, Joker Tamaseeds and mana spells but excludes face-down and opposing Jokers',()=>{
 const s=setup();
 give(s,0,'battle',[MANAGER,SEED,JOKER]);
 give(s,0,'mana',[JOKER_SPELL,JOKER_SPELL,JOKER,JOKER,JOKER]);
 give(s,1,'battle',[JOKER]);
 const [manager]=s.players[0].battle;
 s.players[0].mana[0].faceDown=true;
 assert.equal(e.power(manager,false,s),5000);
 assert.equal(e.effectiveCard(manager,s).breaker??1,1);
 s.players[0].mana[0].faceDown=false;
 assert.equal(e.power(manager,false,s),10000);
 assert.equal(e.effectiveCard(manager,s).breaker,2);
 attack(s,manager.uid);
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('SMANAGER can use its S Trigger on the opposing turn without paying mana',()=>{
 const s=setup();
 s.active=1;
 give(s,0,'shields',[MANAGER]);
 give(s,0,'mana',[]);
 give(s,1,'battle',[FIRE]);
 const [attacker]=s.players[1].battle,[manager]=s.players[0].shields;
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 pick(s,attacker.uid);
 assert.ok(s.players[0].battle.some(x=>x.uid===manager.uid));
 assert.ok(s.players[1].grave.some(x=>x.uid===attacker.uid));
});

test('J Big uses the creature that copied SMANAGER as the fighter',()=>{
 const s=setup();
 give(s,0,'battle',[MANAGER]);
 give(s,0,'hand',[NYANI]);
 give(s,1,'battle',['dm01-059']);
 const [nyani]=s.players[0].hand,[target]=s.players[1].battle;
 act(s,'play');
 pick(s,'jbig');
 const option=s.decision.choices.find(o=>o.cardId===MANAGER);
 assert.ok(option);
 pick(s,valueOf(option));
 assert.equal(s.decision.task.fighter.uid,nyani.uid);
 pick(s,target.uid);
 assert.ok(s.players[0].grave.some(x=>x.uid===nyani.uid));
 assert.ok(s.players[1].battle.some(x=>x.uid===target.uid));
});

test('Hottareman needs five Jokers to attack and J Change keeps the incoming attack',()=>{
 const s=setup();
 give(s,0,'battle',[HOTT,SEED]);
 give(s,0,'mana',[JOKER,JOKER_SPELL,JOKER_6,JOKER]);
 const [outgoing]=s.players[0].battle,[incoming,,,hidden]=s.players[0].mana;
 incoming.tapped=true;
 hidden.faceDown=true;
 s.players[0].mana[1].faceDown=true;
 s.phase='attack';
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===outgoing.uid));
 s.players[0].mana[1].faceDown=false;
 attack(s,outgoing.uid);
 assert.deepEqual(s.decision.choices.map(valueOf),[incoming.uid,null]);
 pick(s,incoming.uid);
 assert.equal(s.attack.attacker,incoming.uid);
 assert.equal(s.players[0].mana.find(x=>x.uid===outgoing.uid)?.tapped,false);
 assert.ok(s.players[0].battle.some(x=>x.uid===incoming.uid&&x.tapped));
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,4);
});
