import test from 'node:test';
import assert from 'node:assert/strict';
import {createCatalogue} from '../dist/catalogue.js';
import {act,cast,data,details,e,give,inst,PRESETS,snapshot} from './target-fixture.mjs';

const FAIRY='dm36-109', REVIVE='dm36-093', SHINY='dm36-077', SURPRISE='dm37-039';
const BOLSHACK='dm36-s07', UNTOUCHABLE='dm37-021', JOHN='dm37-033', NATURE='dm01-108';
const extraCards=[BOLSHACK,UNTOUCHABLE,JOHN].map(id=>({id,count:1}));
const values=s=>s.decision?.choices?.map(c=>c.value?.uid??c.value)??[];
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
function table(){
 const decks=PRESETS.slice(0,2).map(deck=>({...deck,format:'advance',extraCards}));
 const s=e.createGame(decks,{seed:1099});
 s.phase='main';
 for(const p of [0,1]){
  give(s,p,'hand',[]);
  give(s,p,'mana',['dm01-076','dm01-090',NATURE].flatMap(id=>Array(5).fill(id)));
 }
 return s;
}

test('Fairy Hole ramps before choosing and puts out two different Psychics at exactly five total cost',()=>{
 const s=table(),own=s.players[0],top=own.deck[0],mana=own.mana.length;
 const [bolshack,untouchable,john]=own.extra;
 cast(s,FAIRY);
 assert.equal(own.mana.length,mana+1);
 assert.ok(own.mana.includes(top));
 assert.deepEqual(values(s),[0,1]);
 pick(s,0);
 assert.deepEqual(values(s),[untouchable.uid,john.uid,null]);
 pick(s,untouchable.uid);
 assert.deepEqual(values(s),[john.uid,null]);
 pick(s,john.uid);
 assert.deepEqual(own.battle,[untouchable,john]);
 assert.deepEqual(own.extra,[bolshack]);
 assert.equal(s.decision,null);
});

test('Fairy and Shiny can use their single-civilization branch after resolving the initial effect',()=>{
 for(const [id,expected] of [[FAIRY,JOHN],[SHINY,UNTOUCHABLE]]){
  const s=table(),own=s.players[0],enemy=inst(NATURE);
  s.players[1].battle.push(enemy);
  cast(s,id);
  if(id===SHINY){
   assert.deepEqual(values(s),[enemy.uid]);
   pick(s,enemy.uid);
   assert.equal(enemy.tapped,true);
  }
  pick(s,1);
  const target=own.extra.find(x=>x.cardId===expected);
  assert.deepEqual(values(s),[target.uid]);
  pick(s,target.uid);
  assert.deepEqual(own.battle,[target]);
  assert.equal(s.players[1].extra.length,3);
 }
});

test('Revive recovers a creature before choosing and still deploys when the graveyard is empty',()=>{
 for(const hasCreature of [true,false]){
  const s=table(),own=s.players[0],creature=inst(NATURE),spell=inst(SURPRISE);
  if(hasCreature)own.grave.push(creature,spell);
  cast(s,REVIVE);
  if(hasCreature){
   assert.deepEqual(values(s),[creature.uid]);
   pick(s,creature.uid);
   assert.ok(own.hand.includes(creature));
   assert.ok(own.grave.includes(spell));
  }
  assert.deepEqual(values(s),[0,1]);
  pick(s,0);
  const target=own.extra.find(x=>x.cardId===UNTOUCHABLE);
  pick(s,target.uid);
  pick(s,null);
  assert.deepEqual(own.battle,[target]);
 }
});

test('Revive only offers darkness Psychics up to cost seven in its single-card branch',()=>{
 const blackPsychics=[7,8].map(cost=>({id:'phase1099-dark-'+cost,name:'Darkness test Psychic '+cost,
  civ:'闇',civilizations:['闇'],type:'creature',cost,power:1000,psychic:true,manaValue:0}));
 e.setCards([...data.cards,...blackPsychics]);
 try{
  const s=table(),own=s.players[0],[eligible,tooLarge]=blackPsychics.map(c=>inst(c.id));
  own.extra.push(eligible,tooLarge);
  cast(s,REVIVE);
  pick(s,1);
  assert.deepEqual(values(s),[eligible.uid]);
  pick(s,eligible.uid);
  assert.deepEqual(own.battle,[eligible]);
  assert.ok(own.extra.includes(tooLarge));
 }finally{
  e.setCards(data.cards);
 }
});

test('Surprise works as a Shield Trigger with no mana and can select either mode',()=>{
 for(const mode of [0,1]){
  const s=table(),own=s.players[0],opp=s.players[1];
  give(s,0,'shields',[SURPRISE]);
  give(s,0,'mana',[]);
  const attacker=inst(NATURE),untouchable=own.extra.find(x=>x.cardId===UNTOUCHABLE);
  opp.battle.push(attacker);
  s.active=1;
  s.phase='attack';
  act(s,'attack',a=>a.uid===attacker.uid&&a.target==='player');
  act(s,'noBlock');
  act(s,'useTrigger');
  assert.deepEqual(values(s),[0,1]);
  pick(s,mode);
  assert.deepEqual(values(s),[untouchable.uid]);
  pick(s,untouchable.uid);
  assert.deepEqual(own.battle,[untouchable]);
  assert.ok(own.grave.some(x=>x.cardId===SURPRISE));
  assert.equal(own.mana.length,0);
 }
});

test('Each verified print resolves to its original canonical ID and four-copy limit',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 for(const [id,prints] of [
  [FAIRY,['dm36-109VC','dmx02-037','dmx08-035','dmx25-020','dmbd13-022','promoy17-014']],
  [REVIVE,['dmx03-037','dmx08-029','dmd04-014','dmx22b-048']],
  [SHINY,['dm36-077VC','dmx02-031','dmx08-026','dmc68-019']],
  [SURPRISE,['dmx02-032','dmex08-167','promoy25-125']]
 ]){
  const card=registry.get(id);
  assert.equal(card.limit,4);
  for(const print of prints)assert.equal(registry.get(print),card);
 }
});
