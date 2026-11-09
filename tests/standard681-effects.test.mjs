import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-681.json',import.meta.url)));

test('Phase 681 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:681}));
  assert.throws(()=>standardCardSpec(detail,{phase:680}));
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
   assert.deepEqual(row.spec,standardCardSpec({...row.currentPrint,status:'complete'},{phase:681}));
   assert.ok(row.currentPrint.verification.facesMatched);
   assert.ok(!data.cards.some(c=>c.id===row.currentPrint.id));
  }
 }
});

const GUARD='dmr05-078',ALIBI='dmr06-006',BANCHO='dmr01-070';
const NAT='dm01-108',HUNTER='dmx04-013',BLOCKER='dmr08-022',GENMU='dmrp15-km1';
const play=(s,id)=>act(s,'play',a=>a.cardId===id);
const values=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const unit=(s,p,uid)=>s.players[p].battle.find(x=>x.uid===uid);
const field=(p=0)=>Object.assign(setup(),{active:p});

test('Bikkuri Guard can be cast as a shield trigger and grants only current allies Blocker until their next turn',()=>{
 let s=field(1);
 give(s,0,'shields',[GUARD]);
 give(s,0,'battle',[NAT,NAT]);
 give(s,1,'battle',[NAT,NAT]);
 const allyIds=s.players[0].battle.map(x=>x.uid);
 const [first,next]=s.players[1].battle;
 attack(s,first.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 assert.ok(allyIds.every(uid=>e.effectiveCard(unit(s,0,uid),s).blocker));
 assert.ok(!e.effectiveCard(next,s).blocker);
 const later=inst(NAT);
 s.players[0].battle.push(later);
 assert.ok(!e.effectiveCard(later,s).blocker);
 s=JSON.parse(JSON.stringify(s));
 attack(s,next.uid);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='block').map(a=>a.uid),allyIds);
 act(s,'block',a=>a.uid===allyIds[0]);
 act(s,'endTurn');
 assert.equal(s.active,0);
 assert.ok(!e.effectiveCard(unit(s,0,allyIds[1]),s).blocker);
});

test('Bikkuri Guard already granted Blocker is suppressed by Genmu Emperor',()=>{
 const s=field();
 give(s,0,'hand',[GUARD]);
 give(s,0,'battle',[NAT]);
 const ally=s.players[0].battle[0];
 play(s,GUARD);
 assert.ok(e.effectiveCard(ally,s).blocker);
 give(s,1,'battle',[GENMU]);
 assert.ok(!e.effectiveCard(ally,s).blocker);
});

test('Alibi Trick may untap the attacking creature after a block and the battle still resolves',()=>{
 let s=field();
 give(s,0,'battle',[ALIBI]);
 give(s,1,'battle',[BLOCKER]);
 const attacker=s.players[0].battle[0].uid,blocker=s.players[1].battle[0].uid;
 attack(s,attacker);
 act(s,'block',a=>a.uid===blocker);
 assert.equal(s.decision.source,ALIBI);
 assert.deepEqual(values(s),[attacker,null]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,attacker);
 assert.ok(s.players[1].grave.some(x=>x.uid===blocker));
 assert.equal(unit(s,0,attacker).tapped,false);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===attacker));
 assert.equal(s.players[1].shields.length,5);
});

for(const take of [true,false])test('Alibi Trick also reacts on the opponent turn and can decline '+take,()=>{
 const s=field(1);
 give(s,0,'battle',[ALIBI]);
 give(s,1,'battle',[NAT]);
 const ally=s.players[0].battle[0];
 ally.tapped=true;
 attack(s);
 assert.equal(s.decision.player,0);
 pick(s,take?ally.uid:null);
 assert.equal(ally.tapped,!take);
 if(s.decision?.type==='block')act(s,'noBlock');
});

test('Alibi Trick ignores creatures entering tapped and previously tapped units',()=>{
 const s=field(1);
 give(s,0,'battle',[ALIBI]);
 give(s,1,'hand',[NAT]);
 give(s,1,'battle',[NAT]);
 s.players[1].battle[0].tapped=true;
 s.extTasks=[{op:'g34_Select',p:1,source:NAT,origin:'hand',n:1,deploy:true,tapped:true,filter:{creature:true}}];
 act(s,'toAttack');
 pick(s,s.players[1].hand[0].uid);
 assert.ok(s.players[1].battle.every(x=>x.tapped));
 assert.equal(s.decision,null);
 s.extTasks=[{op:'g34_TapAll',p:0,source:GUARD}];
 s.phase='main';
 act(s,'toAttack');
 assert.equal(s.decision,null);
});

for(const take of [true,false])test('Bancho checks only the top five, reveals at most one Hunter and preserves the chosen bottom order '+take,()=>{
 let s=field(1);
 give(s,0,'shields',[BANCHO]);
 give(s,0,'deck',[NAT,HUNTER,NAT,HUNTER,NAT,HUNTER,NAT]);
 give(s,1,'battle',[NAT]);
 const deck=s.players[0].deck.map(x=>x.uid);
 attack(s);
 act(s,'noBlock');
 act(s,'useTrigger');
 assert.equal(s.decision.player,0);
 assert.deepEqual(values(s),[deck[1],deck[3],null]);
 pick(s,take?deck[3]:null);
 const order=deck.slice(0,5).filter(uid=>!take||uid!==deck[3]).reverse();
 assert.equal(s.decision.task.op,'g34_Order');
 pick(s,order[0]);
 s=JSON.parse(JSON.stringify(s));
 for(const uid of order.slice(1,-1))pick(s,uid);
 assert.equal(s.decision,null);
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),[...deck.slice(5),...order]);
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),take?[deck[3]]:[]);
 assert.equal(s.log.filter(x=>x.type==='reveal'&&x.cardId===HUNTER).length,Number(take));
 assert.ok(s.players[0].grave.some(x=>x.cardId===BANCHO));
});
