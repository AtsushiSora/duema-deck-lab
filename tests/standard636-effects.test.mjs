import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-636.json',import.meta.url)));
const FIGHT='dm25rp1-042',CLOUD='dm25rp1-054',SWORD='dm25rp1-069';
const LIGHT='dm01-075',WATER='dm01-083',DARK='dm01-090',FIRE='dm01-097',NATURE='dm01-108';
const HORNET='dm01-066',TOOTH='dm01-103',SEED='dmsd20-016',SPARTA='dm35-041';

function valueOf(choice){return choice.value?.uid??choice.value;}
function pick(s,value){act(s,'extended',a=>valueOf(s.decision.choices[a.choice])===value);}
function physical(s){return e.physicalCards(s).map(x=>x.uid).sort();}

test('Phase 636 verifies the complete official print and retains its ID through deck resolution',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 assert.equal(cards.length,3);
 for(const row of cards){
  const detail=details.cards.find(d=>d.id===row.id);
  assert.deepEqual(detail.faces,row.faces);
  assert.deepEqual(standardCardSpec(detail,{phase:636}),row.spec);
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

test('Evil God or Snake God makes both creature choices mandatory and battles without tapping',()=>{
 let s=setup();
 give(s,0,'hand',[FIGHT]);
 give(s,0,'battle',[HORNET,SEED]);
 give(s,1,'battle',[TOOTH,SEED]);
 const [ally]=s.players[0].battle,[enemy]=s.players[1].battle;
 const before=physical(s);
 act(s,'play');
 assert.deepEqual(s.decision.choices.map(valueOf),[ally.uid]);
 pick(s,ally.uid);
 s=JSON.parse(JSON.stringify(s));
 assert.deepEqual(s.decision.choices.map(valueOf),[enemy.uid]);
 pick(s,enemy.uid);
 assert.equal(s.players[0].battle[0].tapped,false);
 assert.ok(s.players[1].grave.some(x=>x.uid===enemy.uid));
 assert.ok(s.players[0].grave.some(x=>x.cardId===FIGHT));
 assert.deepEqual(physical(s),before);
});

test('G Strike locks the chosen attacker, keeps the spell in hand and does not start a battle',()=>{
 const s=setup();
 s.active=1;
 give(s,1,'battle',[FIRE,NATURE]);
 give(s,0,'battle',[HORNET]);
 give(s,0,'shields',[FIGHT]);
 const [attacker,later]=s.players[1].battle,[spell]=s.players[0].shields;
 attack(s,attacker.uid);
 act(s,'noBlock');
 pick(s,true);
 pick(s,later.uid);
 assert.ok(e.attackLocked(s,1,later));
 assert.equal(later.tapped,false);
 assert.equal(s.players[0].hand[0].uid,spell.uid);
 assert.equal(s.players[1].battle.length,2);
});

test('Revecloud offers exactly water or nature creatures at cost four or less, can decline and blocks normally',()=>{
 for(const selected of [WATER,HORNET,null]){
  const s=setup();
  give(s,0,'hand',[CLOUD,WATER,HORNET,SPARTA,SEED,LIGHT]);
  give(s,1,'battle',[FIRE]);
  const [cloud,water,nature]=s.players[0].hand;
  const before=physical(s);
  act(s,'play',a=>a.uid===cloud.uid);
  assert.deepEqual(s.decision.choices.map(valueOf),[water.uid,nature.uid,null]);
  pick(s,selected===WATER?water.uid:selected===HORNET?nature.uid:null);
  assert.equal(s.players[0].mana.filter(x=>x.tapped).length,4);
  assert.equal(s.players[0].battle.length,selected?2:1);
  if(selected)assert.equal(s.players[0].battle[1].cardId,selected);
  s.active=1;
  attack(s);
  act(s,'block',a=>a.uid===cloud.uid);
  assert.equal(cloud.tapped,true);
  assert.equal(s.players[0].shields.length,5);
  assert.deepEqual(physical(s),before);
 }
});

test('Double Sword permits only dark, fire or nature NEO bases and offers only its side’s Dragons',()=>{
 for(const base of [DARK,FIRE,NATURE,null]){
  const s=setup();
  give(s,0,'hand',[SWORD]);
  give(s,0,'battle',[LIGHT,WATER,DARK,FIRE,NATURE]);
  give(s,1,'battle',[TOOTH]);
  const [sword]=s.players[0].hand,[enemy]=s.players[1].battle,before=physical(s);
  const bases=s.players[0].battle.slice(2);
  act(s,'play',a=>a.uid===sword.uid);
  const choices=e.getLegalActions(s).filter(a=>a.kind==='evolve');
  assert.deepEqual(choices.map(a=>a.baseUid).filter(Boolean).sort(),bases.map(x=>x.uid).sort());
  act(s,'evolve',a=>base?a.baseUid===bases.find(x=>x.cardId===base).uid:!a.baseUid);
  const placed=s.players[0].battle.find(x=>x.uid===sword.uid);
  assert.equal(e.isEvolution(placed),Boolean(base));
  assert.deepEqual((placed.under||[]).map(x=>x.cardId),base?[base]:[]);
  assert.deepEqual(s.decision.choices.map(valueOf),[sword.uid,null]);
  pick(s,base?sword.uid:null);
  if(base)pick(s,enemy.uid);
  assert.equal(s.players[1].grave.some(x=>x.uid===enemy.uid),Boolean(base));
  assert.deepEqual(physical(s),before);
 }
});
