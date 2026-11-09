import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-683.json',import.meta.url)));

test('Phase 683 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:683}));
  assert.throws(()=>standardCardSpec(detail,{phase:682}));
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
   assert.deepEqual(row.spec,standardCardSpec({...row.currentPrint,status:'complete'},{phase:683}));
   assert.ok(row.currentPrint.verification.facesMatched);
   assert.ok(!data.cards.some(c=>c.id===row.currentPrint.id));
  }
 }
});

const CITY='dmr21-033',TEA='dmr18-061',RESCUE='dmr21-068';
const NAT='dm01-108',LARGE='dmr21-080',GYM='dmr21-047';
const field=(p=0)=>Object.assign(setup(),{active:p});
const play=(s,id)=>act(s,'play',a=>a.cardId===id);
const values=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const unit=(s,p,uid)=>s.players[p].battle.find(x=>x.uid===uid);

test('City reprints match the existing ID and never create new battle definitions',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-683.json',import.meta.url)));
 assert.equal(manifest.printAliases.length,2);
 for(const row of manifest.printAliases){
  assert.equal(row.canonicalId,CITY);
  assert.ok(row.verification.facesMatched);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:683}),manifest.cards.find(c=>c.id===CITY).spec);
  assert.ok(!data.cards.some(c=>c.id===row.id));
 }
});

test('City untaps all eligible friendly creatures at the end of its controllers turn',()=>{
 let s=field();
 give(s,0,'battle',[NAT,NAT,NAT]);
 give(s,0,'hand',[CITY]);
 const [first,second,locked]=s.players[0].battle;
 for(const x of [first,second,locked])x.tapped=true;
 locked.tapLocks=[{who:0,afterTurns:s.players[0].turns+1}];
 play(s,CITY);
 assert.ok(s.players[0].battle.slice(0,3).every(x=>x.tapped));
 assert.equal(e.canUntap(locked),false);
 s=JSON.parse(JSON.stringify(s));
 s.phase='attack';
 act(s,'endTurn');
 assert.equal(s.active,1);
 assert.equal(unit(s,0,first.uid).tapped,false);
 assert.equal(unit(s,0,second.uid).tapped,false);
 assert.equal(unit(s,0,locked.uid).tapped,true);
});

test('City cannot trigger once another D2 field has replaced it',()=>{
 const s=field();
 give(s,0,'battle',[NAT]);
 give(s,0,'hand',[CITY,GYM]);
 const ally=s.players[0].battle[0];
 ally.tapped=true;
 play(s,CITY);
 play(s,GYM);
 assert.ok(s.players[0].grave.some(x=>x.cardId===CITY));
 s.phase='attack';
 act(s,'endTurn');
 assert.equal(ally.tapped,true);
});

for(const id of [NAT,LARGE])test('Poison Tea shield trigger gives one enemy minus 4000 until the end of the turn '+id,()=>{
 let s=field(1);
 give(s,0,'shields',[TEA]);
 give(s,0,'battle',[NAT]);
 give(s,1,'battle',[id,NAT]);
 const [attacker,other]=s.players[1].battle;
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 assert.deepEqual(values(s),[attacker.uid,other.uid]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,attacker.uid);
 assert.equal(e.power(unit(s,1,other.uid),false,s),2000);
 if(id===NAT)assert.ok(s.players[1].grave.some(x=>x.uid===attacker.uid));
 else{
  assert.equal(e.power(unit(s,1,attacker.uid),false,s),2000);
  act(s,'endTurn');
  assert.equal(e.power(unit(s,1,attacker.uid),false,s),6000);
 }
});

test('Rescue Time returns an enemy and then an ally with a save between choices',()=>{
 let s=field(1);
 give(s,0,'shields',[RESCUE]);
 give(s,0,'battle',[NAT,NAT]);
 give(s,1,'battle',[NAT,NAT]);
 const [ally,keptAlly]=s.players[0].battle,[attacker,enemy]=s.players[1].battle;
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 assert.deepEqual(values(s),[attacker.uid,enemy.uid]);
 pick(s,attacker.uid);
 assert.ok(s.players[1].hand.some(x=>x.uid===attacker.uid));
 assert.deepEqual(values(s),[ally.uid,keptAlly.uid]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,ally.uid);
 assert.ok(s.players[0].hand.some(x=>x.uid===ally.uid));
 assert.ok(unit(s,0,keptAlly.uid));
 assert.ok(unit(s,1,enemy.uid));
});

for(const owner of [0,1])test('Rescue Time returns a creature even if the other side has none '+owner,()=>{
 const s=field();
 give(s,owner,'battle',[NAT]);
 give(s,0,'hand',[RESCUE]);
 const uid=s.players[owner].battle[0].uid;
 play(s,RESCUE);
 assert.deepEqual(values(s),[uid]);
 pick(s,uid);
 assert.equal(s.decision,null);
 assert.ok(s.players[owner].hand.some(x=>x.uid===uid));
});
