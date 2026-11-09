import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-682.json',import.meta.url)));

test('Phase 682 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:682}));
  assert.throws(()=>standardCardSpec(detail,{phase:681}));
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
   assert.deepEqual(row.spec,standardCardSpec({...row.currentPrint,status:'complete'},{phase:682}));
   assert.ok(row.currentPrint.verification.facesMatched);
   assert.ok(!data.cards.some(c=>c.id===row.currentPrint.id));
  }
 }
});

const GYM='dmr21-047',SHARK='dmr21-036',CARNIVAL='dmr20-059';
const NAT='dm01-108',LARGE='dmr21-080',BLOCKER='dmr08-022',GENMU='dmrp15-km1';
const LAB='dm23ex2-071',NON_D2='dmrp08-005',SIS='dm23rp2-OR02',SAVER='dm25rp4-057';
const field=(p=0)=>Object.assign(setup(),{active:p});
const play=(s,id)=>act(s,'play',a=>a.cardId===id);
const values=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const unit=(s,p,uid)=>s.players[p].battle.find(x=>x.uid===uid);

test('Gym boosts friendly creatures including later entries until an opponent replaces the field',()=>{
 let s=field();
 give(s,0,'battle',[NAT,NON_D2]);
 give(s,1,'battle',[NAT]);
 give(s,0,'hand',[GYM,NAT]);
 const [ally,otherField]=s.players[0].battle;
 const enemy=s.players[1].battle[0];
 play(s,GYM);
 const gym=s.players[0].battle.find(x=>x.cardId===GYM);
 assert.equal(e.power(ally,false,s),5000);
 assert.equal(e.power(enemy,false,s),2000);
 play(s,NAT);
 const later=s.players[0].battle.at(-1);
 assert.equal(e.power(later,false,s),5000);
 s=JSON.parse(JSON.stringify(s));
 assert.equal(e.power(unit(s,0,later.uid),false,s),5000);
 s.active=1;
 give(s,1,'hand',[SHARK]);
 play(s,SHARK);
 assert.ok(s.players[0].grave.some(x=>x.uid===gym.uid));
 assert.ok(unit(s,0,otherField.uid));
 assert.equal(e.power(unit(s,0,ally.uid),false,s),2000);
 assert.equal(e.power(unit(s,0,later.uid),false,s),2000);
 assert.ok(e.effectiveCard(unit(s,1,enemy.uid),s).unblockable);
});

test('Gym does not preserve infinite power after Sis applies minus infinity (QA 43369)',()=>{
 const s=field();
 give(s,0,'battle',[GENMU]);
 give(s,0,'hand',[GYM]);
 const genmu=s.players[0].battle[0];
 play(s,GYM);
 assert.equal(e.power(genmu,false,s),Infinity);
 s.active=1;
 give(s,1,'hand',[SIS]);
 play(s,SIS);
 pick(s,genmu.uid);
 assert.ok(s.players[0].grave.includes(genmu));
 assert.ok(s.players[0].battle.some(x=>x.cardId===GYM));
});

test('Shark prevents an actual block even if the attacker abilities are ignored',()=>{
 const s=field();
 give(s,0,'battle',[NAT]);
 give(s,1,'battle',[BLOCKER]);
 give(s,0,'hand',[SHARK]);
 const ally=s.players[0].battle[0];
 play(s,SHARK);
 ally.g35Ignored=s.turn;
 attack(s,ally.uid);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'));
 if(s.decision?.type==='block')act(s,'noBlock');
 if(e.getLegalActions(s).some(a=>a.kind==='breakShields'))act(s,'breakShields');
 assert.equal(s.players[1].shields.length,4);
});

test('Shark loses its effect when replaced by another D2 field on the same side',()=>{
 const s=field();
 give(s,0,'battle',[NAT]);
 give(s,1,'battle',[BLOCKER]);
 give(s,0,'hand',[SHARK,GYM]);
 const ally=s.players[0].battle[0],blocker=s.players[1].battle[0];
 play(s,SHARK);
 play(s,GYM);
 assert.ok(s.players[0].grave.some(x=>x.cardId===SHARK));
 attack(s,ally.uid);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===blocker.uid));
});

test('D2 replacement permits Saver once and waits for a new D2 entry to destroy the saved field (QA 47896)',()=>{
 const multicolor={...e.card(LAB),id:'test682-multicolor-d2',civ:'光/水',civilizations:['光','水']};
 e.setCards([...data.cards,multicolor]);
 try{
  let s=field(1);
  give(s,0,'battle',[multicolor.id,SAVER]);
  give(s,1,'hand',[SHARK,GYM]);
  const [prior,saver]=s.players[0].battle;
  play(s,SHARK);
  s=JSON.parse(JSON.stringify(s));
  act(s,'replaceUltra',a=>a.uid===saver.uid);
  assert.ok(unit(s,0,prior.uid));
  assert.ok(s.players[0].grave.some(x=>x.uid===saver.uid));
  assert.ok(s.players[1].battle.some(x=>x.cardId===SHARK));
  play(s,GYM);
  assert.ok(s.players[0].grave.some(x=>x.uid===prior.uid));
  assert.ok(s.players[1].grave.some(x=>x.cardId===SHARK));
  assert.deepEqual(s.players[1].battle.map(x=>x.cardId),[GYM]);
 }finally{
  e.setCards(data.cards);
 }
});

for(const id of [NAT,LARGE])test('Carnival shield trigger reduces a single opponent by 5000 this turn '+id,()=>{
 let s=field(1);
 give(s,0,'shields',[CARNIVAL]);
 give(s,0,'battle',[NAT]);
 give(s,1,'battle',[id,NAT]);
 const [target,other]=s.players[1].battle;
 attack(s,target.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 assert.deepEqual(values(s),[target.uid,other.uid]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,target.uid);
 assert.equal(e.power(unit(s,1,other.uid),false,s),2000);
 assert.equal(e.power(s.players[0].battle[0],false,s),2000);
 if(id===NAT)assert.ok(s.players[1].grave.some(x=>x.uid===target.uid));
 else{
  assert.equal(e.power(unit(s,1,target.uid),false,s),1000);
  act(s,'endTurn');
  assert.equal(e.power(unit(s,1,target.uid),false,s),6000);
 }
});

test('Carnival does not reduce power when Genmu ignores the five-cost spell',()=>{
 const s=field();
 give(s,0,'hand',[CARNIVAL]);
 give(s,1,'battle',[GENMU,NAT]);
 const target=s.players[1].battle[1];
 play(s,CARNIVAL);
 assert.equal(s.decision,null);
 assert.equal(e.power(target,false,s),2000);
});
