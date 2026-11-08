import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,act,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-641.json',import.meta.url)));
const RETURN='dm22ex2-008',STICK='dmr04-039',COIN='dm22rp1-074',BIG_SEED='dm24rp4-007';
const FIRE='dm01-097',WATER='dm01-083',DARK='dm01-090',NATURE='dm01-108',MULTI='dmrp19-056',FIELD='dm23ex2-071';

function valueOf(choice){return choice.value?.uid??choice.value;}
function pick(s,value){act(s,'extended',a=>valueOf(s.decision.choices[a.choice])===value);}
function physical(s){return e.physicalCards(s).map(x=>x.uid).sort();}

test('Phase 641 registers the complete official prints under their original deck IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 assert.equal(cards.length,2);
 for(const row of cards){
  const detail=details.cards.find(d=>d.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:641}));
  assert.throws(()=>standardCardSpec(detail,{phase:640}));
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

test('Soul returns all eligible seeds in the chosen order and two Coins ramp exactly three cards',()=>{
 let s=setup();
 give(s,0,'hand',[RETURN]);
 give(s,0,'mana',[DARK,WATER,WATER,WATER,WATER,WATER]);
 give(s,0,'grave',[COIN,BIG_SEED,COIN,FIRE]);
 give(s,1,'grave',[COIN]);
 give(s,0,'deck',Array(9).fill(NATURE));
 const [first,big,second,creature]=s.players[0].grave,enemy=s.players[1].grave[0],before=physical(s);
 const top=s.players[0].deck.slice(0,3).map(x=>x.uid);
 act(s,'play');
 assert.deepEqual(s.decision.choices.map(valueOf),[first.uid,second.uid]);
 pick(s,second.uid);
 assert.deepEqual(s.decision.choices.map(valueOf),[first.uid]);
 assert.equal(s.players[0].battle.length,0);
 s=JSON.parse(JSON.stringify(s));
 pick(s,first.uid);
 drain(s);
 assert.deepEqual(s.players[0].battle.map(x=>x.uid),[second.uid,first.uid]);
 assert.deepEqual(s.players[0].mana.slice(-3).map(x=>x.uid),top);
 assert.ok(s.players[0].grave.some(x=>x.uid===big.uid));
 assert.ok(s.players[0].grave.some(x=>x.uid===creature.uid));
 assert.equal(s.players[1].grave[0].uid,enemy.uid);
 assert.deepEqual(physical(s),before);
});

test('Soul finishes without deployment when its grave has no eligible seed',()=>{
 const s=setup();
 give(s,0,'hand',[RETURN]);
 give(s,0,'mana',[DARK,WATER,WATER,WATER,WATER,WATER]);
 give(s,0,'grave',[BIG_SEED,FIRE]);
 act(s,'play');
 assert.equal(s.decision,null);
 assert.equal(s.players[0].battle.length,0);
 assert.equal(s.players[0].grave.length,3);
});

test('Energy Stick counts distinct civilizations of own battle cards, including fields and multicolor',()=>{
 for(const nonempty of [true,false]){
  const s=setup();
  give(s,0,'hand',[STICK]);
  give(s,0,'mana',Array(6).fill(WATER));
  give(s,0,'deck',Array(9).fill(NATURE));
  give(s,1,'battle',[FIRE]);
  if(nonempty)give(s,0,'battle',[MULTI,NATURE,FIELD]);
  const expected=s.players[0].deck.slice(0,nonempty?4:0).map(x=>x.uid),before=physical(s);
  act(s,'play');
  assert.equal(s.decision,null);
  assert.deepEqual(s.players[0].hand.map(x=>x.uid),expected);
  assert.deepEqual(physical(s),before);
 }
});
