import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-634.json',import.meta.url)));
const CHARGER='dmbd06-016',JARBELL='dmr17-091',RINGALE='dmd30-004';
const NATURE='dm01-108',FIRE='dm01-097',LIGHT='dm01-075',TRIGGER='dm01-110',SPELL='dm01-027';
const uids=rows=>rows.map(x=>x.uid);
const physical=s=>uids(e.physicalCards(s)).sort();

function pick(s,value){
 act(s,'extended',a=>{
  const selected=s.decision.choices[a.choice].value;
  return (selected?.uid??selected)===value;
 });
}

test('EX5 reprints match the original supported definitions and saved card IDs remain valid',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.equal(cards.length,3);
 for(const row of cards){
  const detail=details.cards.find(d=>d.id===row.id),card=e.card(row.id);
  assert.deepEqual(detail.faces,row.faces);
  assert.deepEqual(standardCardSpec(detail,{phase:634}),row.spec);
  assert.deepEqual(standardCardSpec({...detail,...row.currentPrint},{phase:634}),row.spec);
  assert.throws(()=>standardCardSpec(detail,{phase:633}));
  assert.throws(()=>standardCardSpec({...detail,faces:[{...detail.faces[0],abilityText:detail.faces[0].abilityText+'\n未知の能力。'}]},{phase:634}));
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[row.id]);
  assert.ok(row.verification.facesMatched&&row.currentPrint.verification.facesMatched);
  assert.equal(card.limit,regulationVerification.limits[row.id]);
  assert.equal(CARD_IMAGES[row.id],row.image);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].id=row.id;
  assert.deepEqual(catalogue.resolveRows(deck.cards),deck.cards);
  assert.deepEqual(catalogue.validate(deck),[]);
  assert.deepEqual(e.validateDeck(deck),[]);
 }
});

test('Tryguard takes an entire shield without S・トリガー, then may place that card face down',()=>{
 const s=setup(),own=s.players[0];
 give(s,0,'hand',[CHARGER]);
 give(s,0,'shields',[TRIGGER,FIRE]);
 const charger=own.hand[0].uid,[taken,other]=uids(own.shields),before=physical(s);
 act(s,'play');
 pick(s,true);
 pick(s,taken);
 assert.equal(s.decision.task.op,'g34_Select');
 assert.deepEqual(uids(own.hand),[taken]);
 assert.deepEqual(uids(own.shields),[other]);
 pick(s,taken);
 assert.deepEqual(uids(own.shields),[other,taken]);
 assert.ok(!own.shields[1].faceUp);
 assert.ok(own.mana.some(x=>x.uid===charger&&!x.tapped));
 assert.deepEqual(physical(s),before);
});

test('Tryguard shield actions can be declined independently and Charger still resolves',()=>{
 for(const take of [false,true]){
  const s=setup(),own=s.players[0];
  give(s,0,'hand',[CHARGER,FIRE]);
  const [charger,hand]=uids(own.hand),[shield]=uids(own.shields);
  act(s,'play',a=>a.uid===charger);
  pick(s,take?true:null);
  if(take)pick(s,shield);
  pick(s,take?null:hand);
  assert.equal(own.shields.length,take?4:6);
  assert.equal(s.decision,null);
  assert.ok(own.mana.some(x=>x.uid===charger&&!x.tapped));
 }
});

test('Jarbell needs three nature mana cards and can reveal one eligible card before ordering the rest',()=>{
 for(const natureCount of [2,3]){
  let s=setup(),own=s.players[0];
  give(s,0,'mana',[...Array(natureCount).fill(NATURE),LIGHT]);
  give(s,0,'hand',[JARBELL]);
  give(s,0,'deck',[FIRE,SPELL,NATURE,SPELL,FIRE]);
  const [first,second,third,fourth,fifth]=uids(own.deck);
  act(s,'play');
  if(natureCount===2){
   assert.equal(s.decision,null);
   assert.deepEqual(uids(own.deck),[first,second,third,fourth,fifth]);
   continue;
  }
  assert.deepEqual(s.decision.choices.map(c=>c.value),[first,third,null]);
  s=JSON.parse(JSON.stringify(s));
  own=s.players[0];
  pick(s,third);
  pick(s,fourth);
  pick(s,first);
  assert.deepEqual(uids(own.hand),[third]);
  assert.deepEqual(uids(own.deck),[fifth,fourth,first,second]);
  assert.ok(s.log.some(x=>x.type==='reveal'&&x.text.includes('炎のたてがみ')));
 }
});

test('Ringale optionally shields one hand card face down and can block on the opponent turn',()=>{
 for(const use of [false,true]){
  const s=setup(),own=s.players[0];
  give(s,0,'hand',[RINGALE,TRIGGER]);
  const [ringale,shield]=uids(own.hand),before=physical(s);
  act(s,'play',a=>a.uid===ringale);
  pick(s,use?shield:null);
  assert.equal(own.shields.length,use?6:5);
  if(use){
   assert.equal(own.shields.at(-1).uid,shield);
   assert.ok(!own.shields.at(-1).faceUp);
  }else assert.deepEqual(uids(own.hand),[shield]);
  assert.deepEqual(physical(s),before);
  give(s,1,'battle',[FIRE]);
  s.active=1;
  attack(s);
  assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===ringale));
 }
});
