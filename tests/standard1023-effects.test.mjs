import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {handInspectorHTML} from '../dist/hand-ui.js';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {act,data,details,drain,e,give,inst,setup,snapshot,GEN} from './target-fixture.mjs';

const ART='dm26ex4-045', GUARD='dm26ex4-043', NEIL='dm26ex4-048';
const NATURE='dm01-108', WATER='dm01-083', LIGHT='dm01-075', DARK='dm01-090';
const cases=[[ART,3,2,WATER],[GUARD,5,4,LIGHT],[NEIL,5,4,DARK]];

function playAction(s,x,alternative){
 const a=e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===x.uid&&
  (alternative?a.role==='paidAlt568':!a.alternative));
 assert.ok(a);
 return a;
}

function play(s,id,alternative){
 const x=inst(id);
 s.players[s.active].hand.push(x);
 e.step(s,playAction(s,x,alternative));
 return x;
}

function pick(s,value){
 act(s,'extended',a=>{
  const choice=s.decision.choices[a.choice].value;
  return (choice?.uid??choice)===value;
 });
}

test('all three official cards retain their catalogue IDs, printed costs, artwork and limits',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-1023.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 for(const [id,printed,alternative] of cases){
  const row=m.cards.find(x=>x.id===id);
  const c=registry.get(id);
  assert.equal(c.supported,true);
  assert.equal(c.cost,printed);
  assert.equal(c.g568Alt.cost,alternative);
  assert.equal(c.limit,4);
  assert.equal(CARD_IMAGES[id],row.image);
 }
});

for(const [id,printed,alternative,color] of cases)test(id+' offers distinct payment choices and needs a mana card of its civilization',()=>{
 const s=setup();
 give(s,0,'mana',Array(printed).fill(NATURE));
 give(s,0,'hand',[id]);
 const x=s.players[0].hand[0];
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===x.uid));
 s.players[0].mana[0]=inst(color);
 assert.equal(playAction(s,x,false).cost,printed);
 assert.equal(playAction(s,x,true).cost,alternative);
 s.players[0].mana.pop();
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===x.uid&&!a.alternative));
 assert.equal(playAction(s,x,true).cost,alternative);
});

for(const alternative of [false,true])for(const accepts of alternative?[true,false]:[false])
 test('Art lets the opponent decide first only on alternative payment: '+alternative+' '+accepts,()=>{
  let s=setup();
  const [a,b]=s.players[0].deck,opp=s.players[1].deck[0];
  play(s,ART,alternative);
  if(alternative){
   assert.equal(s.decision.player,1);
   assert.equal(s.players[0].hand.length,0);
   s=decodeBattleData(encodeBattleData(s));
   pick(s,accepts?true:null);
  }
  drain(s);
  assert.deepEqual(s.players[0].hand.map(x=>x.uid),[a.uid,b.uid]);
  assert.deepEqual(s.players[1].hand.map(x=>x.uid),accepts?[opp.uid]:[]);
  assert.equal(s.players[0].mana.filter(x=>x.tapped).length,alternative?2:3);
 });

for(const alternative of [false,true])for(const accepts of alternative?[true,false]:[false])
 test('Guard can offer an opposing shield before placing its own two: '+alternative+' '+accepts,()=>{
  const s=setup(),own=s.players[0],opp=s.players[1];
  const [a,b]=own.deck,enemyTop=opp.deck[0];
  play(s,GUARD,alternative);
  if(alternative){
   assert.equal(s.decision.player,1);
   assert.equal(own.shields.length,5);
   pick(s,accepts?true:null);
  }
  drain(s);
  assert.deepEqual(own.shields.slice(-2).map(x=>x.uid),[a.uid,b.uid]);
  assert.equal(opp.shields.some(x=>x.uid===enemyTop.uid),accepts);
  assert.equal(own.mana.filter(x=>x.tapped).length,alternative?4:5);
 });

for(const alternative of [false,true])
 test('Neil handles its own discard before private opposing selections: '+alternative,()=>{
  let s=setup();
  give(s,0,'hand',[NATURE]);
  give(s,1,'hand',[LIGHT,DARK,WATER]);
  const self=s.players[0].hand[0];
  const [light,dark,water]=s.players[1].hand;
  play(s,NEIL,alternative);
  if(alternative){
   assert.equal(s.decision.task.op,'discard');
   assert.equal(s.decision.player,0);
   pick(s,self.uid);
   assert.ok(s.players[0].grave.some(x=>x.uid===self.uid));
  }else assert.ok(s.players[0].hand.some(x=>x.uid===self.uid));
  assert.equal(s.decision.player,0);
  assert.equal(s.decision.task.op,'g34_BlindDiscard773');
  assert.deepEqual(s.decision.choices.map(c=>c.value),[0,1,2]);
  assert.ok(s.decision.choices.every(c=>!c.cardId&&c.label.startsWith('裏向き')));
  pick(s,0);
  s=decodeBattleData(encodeBattleData(s));
  pick(s,2);
  drain(s);
  assert.deepEqual(s.players[1].grave.map(x=>x.uid).sort(),[light.uid,water.uid].sort());
  assert.deepEqual(s.players[1].hand.map(x=>x.uid),[dark.uid]);
  assert.equal(s.players[0].mana.filter(x=>x.tapped).length,alternative?4:5);
 });

test('Neil may pay the alternative cost with no other own hand card (QA49556)',()=>{
 const s=setup();
 give(s,0,'mana',[DARK,NATURE,NATURE,NATURE]);
 give(s,1,'hand',[WATER]);
 const x=play(s,NEIL,true);
 drain(s);
 assert.equal(s.players[0].grave[0].uid,x.uid);
 assert.equal(s.players[1].hand.length,0);
 assert.equal(s.players[1].grave[0].cardId,WATER);
});

test('Art retains the chosen alternative through manual payment and save/restore',()=>{
 let s=setup();
 const x=inst(ART);
 s.players[0].hand.push(x);
 e.step(s,playAction(s,x,true),{manualMana:true});
 assert.equal(s.decision.type,'manaPayment');
 assert.equal(s.decision.cost,2);
 assert.deepEqual(s.decision.colors,['水']);
 s=decodeBattleData(encodeBattleData(s));
 for(const id of [WATER,NATURE]){
  const mana=s.players[0].mana.find(x=>x.cardId===id);
  act(s,'selectMana',a=>a.uid===mana.uid);
 }
 act(s,'confirmMana');
 assert.equal(s.decision.player,1);
 pick(s,null);
 drain(s);
 assert.equal(s.players[0].hand.length,2);
});

test('Genmu ignores both portions of an alternatively paid spell',()=>{
 const s=setup();
 give(s,1,'battle',[GEN]);
 play(s,ART,true);
 drain(s);
 assert.equal(s.decision,null);
 assert.equal(s.players[0].hand.length,0);
 assert.equal(s.players[1].hand.length,0);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,2);
});

test('Art can choose to pay its alternative cost under Akashic, while the ordinary free cast has no offer',()=>{
 for(const alternative of [false,true]){
  const s=setup();
  give(s,0,'battle',['dm23ex2-009']);
  give(s,0,'hand',[ART]);
  const x=s.players[0].hand[0],a=playAction(s,x,alternative);
  assert.equal(a.cost,alternative?2:0);
  e.step(s,a);
  if(alternative){
   assert.equal(s.decision.player,1);
   pick(s,null);
  }else assert.equal(s.decision,null);
  drain(s);
  assert.equal(s.players[0].hand.length,2);
  assert.equal(s.players[0].mana.filter(y=>y.tapped).length,alternative?2:0);
 }
});

test('the hand inspector describes the alternative as casting the spell',()=>{
 const s=setup();
 give(s,0,'hand',[ART]);
 const html=handInspectorHTML(s,{hand:s.players[0].hand[0].uid,handFace:0},{art:()=>''});
 assert.match(html,/別コストで唱える · 2マナ/);
 assert.doesNotMatch(html,/別コストで召喚/);
});
