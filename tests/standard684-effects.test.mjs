import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-684.json',import.meta.url)));

test('Phase 684 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:684}));
  assert.throws(()=>standardCardSpec(detail,{phase:683}));
  for(const [field,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[field],value);
  assert.deepEqual(data.cards.filter(c=>key(c.name)===key(row.name)).map(c=>c.id),[row.id]);
  assert.ok(row.verification.facesMatched);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:row.id,count:1});
  assert.deepEqual(catalogue.resolveRows(deck.cards),deck.cards);
  assert.deepEqual(e.validateDeck(deck),[]);
  if(row.currentPrint){
   assert.deepEqual(row.spec,standardCardSpec({...row.currentPrint,status:'complete'},{phase:684}));
   assert.ok(row.currentPrint.verification.facesMatched);
   assert.ok(!data.cards.some(c=>c.id===row.currentPrint.id));
  }
 }
});

const OVERKILL='dmr21-040',MAMMOTH='dmr04-042',TWIN='dm22ex1-128';
const NAT='dm01-108',NATIVE_SLAYER='dm01-088',LARGE='dmr21-080',GYM='dmr21-047';
const GENMU='dmrp15-km1';
const field=(p=0)=>Object.assign(setup(),{active:p});
const play=(s,id,face=0)=>act(s,'play',a=>a.cardId===id&&(a.face??0)===face);
const values=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const unit=(s,p,uid)=>s.players[p].battle.find(x=>x.uid===uid);

test('Overkill reprints match one definition and Mammoth forms have independent four-card limits',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-684.json',import.meta.url)));
 assert.equal(manifest.printAliases.length,2);
 for(const row of manifest.printAliases){
  assert.equal(row.canonicalId,OVERKILL);
  assert.ok(row.verification.facesMatched);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:684}),manifest.cards.find(c=>c.id===OVERKILL).spec);
  assert.ok(!data.cards.some(c=>c.id===row.id));
 }
 const deck=structuredClone(PRESETS[0]);
 for(let n=0;n<8;n++)deck.cards[n].count--;
 deck.cards=deck.cards.filter(row=>row.count>0);
 deck.cards.push({id:MAMMOTH,count:4},{id:TWIN,count:4});
 assert.deepEqual(e.validateDeck(deck),[]);
});

test('Overkill grants new allies Slayer and destroys the opposing survivor after a losing battle',()=>{
 let s=field();
 give(s,0,'hand',[OVERKILL,NAT]);
 give(s,1,'battle',[LARGE]);
 const defender=s.players[1].battle[0];
 defender.tapped=true;
 play(s,OVERKILL);
 play(s,NAT);
 const ally=s.players[0].battle.find(x=>x.cardId===NAT);
 ally.entered=0;
 assert.ok(e.effectiveCard(ally,s).slayer);
 assert.ok(!e.effectiveCard(defender,s).slayer);
 s=JSON.parse(JSON.stringify(s));
 attack(s,ally.uid,defender.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 assert.ok(s.players[0].grave.some(x=>x.uid===ally.uid));
 assert.ok(s.players[1].grave.some(x=>x.uid===defender.uid));
});

test('Overkill adds a second Slayer and loses its grant if replaced or the recipient is ignored',()=>{
 const s=field();
 give(s,0,'battle',[NATIVE_SLAYER,NAT]);
 give(s,0,'hand',[OVERKILL,GYM]);
 const [slayer,ordinary]=s.players[0].battle;
 play(s,OVERKILL);
 assert.equal(e.effectiveCard(slayer,s).g208SlayerCount,2);
 give(s,1,'battle',[GENMU]);
 assert.ok(!e.effectiveCard(ordinary,s).slayer);
 give(s,1,'battle',[]);
 play(s,GYM);
 assert.ok(e.effectiveCard(slayer,s).slayer);
 assert.ok(!e.effectiveCard(slayer,s).g208SlayerCount);
 assert.ok(!e.effectiveCard(ordinary,s).slayer);
});

for(const id of [MAMMOTH,TWIN])test('Mammoth may discard a multicolor card, untap and finish its original attack '+id,()=>{
 let s=field();
 give(s,0,'battle',[id]);
 give(s,0,'hand',[NAT,TWIN]);
 const attacker=s.players[0].battle[0],discard=s.players[0].hand[1];
 attack(s,attacker.uid);
 assert.equal(attacker.tapped,true);
 assert.deepEqual(values(s),[discard.uid,null]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,discard.uid);
 assert.ok(s.players[0].grave.some(x=>x.uid===discard.uid));
 assert.equal(unit(s,0,attacker.uid).tapped,false);
 if(s.decision?.type==='block')act(s,'noBlock');
 if(e.getLegalActions(s).some(a=>a.kind==='breakShields'))act(s,'breakShields');
 assert.equal(s.players[1].shields.length,4);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===attacker.uid));
 attack(s,attacker.uid);
 assert.notEqual(s.decision?.task?.op,'g34_DiscardFor248');
});

test('Mammoth stays tapped when declining its discard',()=>{
 const s=field();
 give(s,0,'battle',[MAMMOTH]);
 give(s,0,'hand',[TWIN]);
 attack(s);
 pick(s,null);
 assert.ok(s.players[0].battle[0].tapped);
 assert.equal(s.players[0].hand.length,1);
});

for(const count of [0,2,3])test('Brain Typhoon draws up to three then requires one discard '+count,()=>{
 let s=field();
 give(s,0,'hand',[TWIN,NAT]);
 const [spell,discard]=s.players[0].hand,deck=s.players[0].deck.map(x=>x.uid);
 play(s,TWIN,1);
 for(let n=0;n<count;n++)pick(s,true);
 if(count<3)pick(s,null);
 s=JSON.parse(JSON.stringify(s));
 assert.ok(values(s).includes(discard.uid));
 assert.ok(!values(s).includes(null));
 pick(s,discard.uid);
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),deck.slice(0,count));
 assert.ok(s.players[0].grave.some(x=>x.uid===spell.uid));
 assert.ok(s.players[0].grave.some(x=>x.uid===discard.uid));
});
