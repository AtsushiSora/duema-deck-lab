import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,act} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-640.json',import.meta.url)));
const MELA='dmbd03-009',PANDORA='dm23ex2-093',ROYAL='dmex18-s13',JOKER_SPELL='dmsd01-011';
const JOKER_SEED='dmsd20-016',FIRE='dm01-097',WATER='dm01-083',NATURE='dm01-108';

function valueOf(choice){return choice.value?.uid??choice.value;}
function pick(s,value){act(s,'extended',a=>valueOf(s.decision.choices[a.choice])===value);}
function physical(s){return e.physicalCards(s).map(x=>x.uid).sort();}

test('Phase 640 verifies two canonical cards and five reprints with stable deck IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 assert.equal(cards.length,2);
 assert.equal(printAliases.length,5);
 for(const row of cards){
  const detail=details.cards.find(d=>d.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:640}));
  assert.throws(()=>standardCardSpec(detail,{phase:639}));
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
 for(const row of printAliases){
  assert.ok(row.verification.facesMatched);
  assert.ok(!data.cards.some(c=>c.id===row.id));
  assert.equal(regulationVerification.limits[row.id],4);
 }
});

test('Melamela accepts Joker spells and Tamaseeds, declines cleanly, and draws only after discarding',()=>{
 for(const selected of [JOKER_SPELL,JOKER_SEED,null]){
  let s=setup();
  give(s,0,'hand',[MELA,JOKER_SPELL,JOKER_SEED,NATURE]);
  give(s,0,'mana',[FIRE]);
  give(s,0,'deck',Array(6).fill(NATURE));
  const hand=s.players[0].hand.slice(1),top=s.players[0].deck.slice(0,2).map(x=>x.uid),before=physical(s);
  act(s,'play',a=>a.cardId===MELA);
  assert.deepEqual(s.decision.choices.map(valueOf),[hand[0].uid,hand[1].uid,null]);
  assert.equal(s.players[0].deck.length,6);
  s=JSON.parse(JSON.stringify(s));
  const chosen=hand.find(x=>x.cardId===selected);
  pick(s,chosen?.uid??null);
  assert.equal(s.players[0].deck.length,selected?4:6);
  assert.deepEqual(s.players[0].hand.map(x=>x.uid),[
   ...hand.filter(x=>x.uid!==chosen?.uid).map(x=>x.uid),...(selected?top:[])
  ]);
  if(chosen)assert.ok(s.players[0].grave.some(x=>x.uid===chosen.uid));
  assert.deepEqual(physical(s),before);
 }
});

test('Melamela has no payoff when the player holds only non-Joker cards',()=>{
 const s=setup();
 give(s,0,'mana',[FIRE]);
 give(s,0,'hand',[MELA,NATURE]);
 const deck=s.players[0].deck.length;
 act(s,'play',a=>a.cardId===MELA);
 assert.equal(s.decision,null);
 assert.equal(s.players[0].deck.length,deck);
 assert.equal(s.players[0].hand[0].cardId,NATURE);
});

test('Pandora draws first and then requires moving one old or newly drawn card to the extra zone',()=>{
 for(const moveNew of [true,false]){
  let s=setup();
  give(s,0,'mana',Array(3).fill(WATER));
  give(s,0,'hand',[PANDORA,FIRE]);
  give(s,0,'deck',[WATER,NATURE,NATURE,FIRE,FIRE]);
  const [spell,original]=s.players[0].hand,top=s.players[0].deck.slice(0,3),before=physical(s);
  act(s,'play',a=>a.uid===spell.uid);
  const candidates=[original,...top];
  assert.deepEqual(s.decision.choices.map(valueOf),candidates.map(x=>x.uid));
  const chosen=moveNew?top[1]:original;
  s=JSON.parse(JSON.stringify(s));
  pick(s,chosen.uid);
  assert.ok(s.players[0].extra.some(x=>x.uid===chosen.uid&&!x.faceDown));
  assert.ok(s.players[0].grave.some(x=>x.uid===spell.uid));
  assert.deepEqual(s.players[0].hand.map(x=>x.uid),candidates.filter(x=>x.uid!==chosen.uid).map(x=>x.uid));
  assert.deepEqual(physical(s),before);
 }
});

test('Pandora placing Royal triggers its extra-zone draw and discard without paying for Pandora Shift',()=>{
 const s=setup();
 give(s,0,'hand',[PANDORA,ROYAL]);
 give(s,0,'mana',Array(3).fill(WATER));
 give(s,0,'deck',Array(8).fill(NATURE));
 const royal=s.players[0].hand[1],before=physical(s);
 act(s,'play',a=>a.cardId===PANDORA);
 pick(s,royal.uid);
 assert.ok(s.players[0].extra.some(x=>x.uid===royal.uid));
 assert.equal(s.players[0].deck.length,3);
 assert.equal(s.players[0].hand.length,5);
 assert.equal(s.decision.task.op,'discard');
 pick(s,s.players[0].hand[0].uid);
 assert.equal(s.players[0].hand.length,4);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,3);
 assert.deepEqual(physical(s),before);
});
