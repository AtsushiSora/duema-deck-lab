import test from 'node:test';
import assert from 'node:assert/strict';
import {createCatalogue} from '../dist/catalogue.js';
import {act,cast,data,details,drain,e,give,inst,PRESETS,snapshot} from './target-fixture.mjs';

const ENERGY='dm36-085', KILL='dm37-049', POWERED='dm37-053';
const BOLSHACK='dm36-s07', UNTOUCHABLE='dm37-021', JOHN='dm37-033';
const BEAST='dm01-108', FISH='dm01-079', HUNTER='dm01-082', GUARD='dm01-076';
const extraCards=[BOLSHACK,UNTOUCHABLE,JOHN].map(id=>({id,count:1}));
const values=s=>s.decision?.choices?.map(c=>c.value?.uid??c.value)??[];
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);
function table(){
 const decks=PRESETS.slice(0,2).map(deck=>({...deck,format:'advance',extraCards}));
 const s=e.createGame(decks,{seed:1100});
 s.phase='main';
 for(const p of [0,1]){
  give(s,p,'hand',[]);
  give(s,p,'mana',['dm01-083','dm01-097',BEAST].flatMap(id=>Array(5).fill(id)));
 }
 return s;
}

test('Energy Hole draws before deploying Psychics at a combined cost of five',()=>{
 const s=table(),own=s.players[0],top=own.deck[0],[bolshack,untouchable,john]=own.extra;
 cast(s,ENERGY);
 assert.deepEqual(own.hand,[top]);
 assert.deepEqual(values(s),[0,1]);
 pick(s,0);
 assert.deepEqual(values(s),[untouchable.uid,john.uid,null]);
 pick(s,john.uid);
 pick(s,untouchable.uid);
 assert.deepEqual(own.battle,[john,untouchable]);
 assert.deepEqual(own.extra,[bolshack]);
});

test('Energy Hole requires its draw and filters the other branch by water and cost seven',()=>{
 const water=[7,8].map(cost=>({id:'phase1100-water-'+cost,name:'Water test Psychic '+cost,
  civ:'水',civilizations:['水'],type:'creature',cost,power:1000,psychic:true,manaValue:0}));
 e.setCards([...data.cards,...water]);
 try{
  const s=table(),own=s.players[0],[eligible,tooLarge]=water.map(c=>inst(c.id));
  own.extra.push(eligible,tooLarge);
  cast(s,ENERGY);
  pick(s,1);
  assert.deepEqual(values(s),[eligible.uid]);
  pick(s,eligible.uid);
  assert.deepEqual(own.battle,[eligible]);
  const empty=table();
  give(empty,0,'deck',[BEAST]);
  cast(empty,ENERGY);
  assert.equal(empty.winner,1);
  assert.deepEqual(empty.players[0].battle,[]);
 }finally{
  e.setCards(data.cards);
 }
});

test('Kill Hole destroys an eligible blocker before deploying and continues without a target',()=>{
 for(const eligible of [true,false]){
  const s=table(),own=s.players[0],opp=s.players[1];
  const [small,large,plain]=[FISH,HUNTER,BEAST].map(inst);
  large.powerModifiers=[{amount:2000}];
  opp.battle.push(large,plain);
  if(eligible)opp.battle.push(small);
  cast(s,KILL);
  if(eligible){
   assert.deepEqual(values(s),[small.uid]);
   pick(s,small.uid);
   assert.ok(opp.grave.includes(small));
  }
  assert.deepEqual(opp.battle,[large,plain]);
  pick(s,1);
  const john=own.extra.find(x=>x.cardId===JOHN);
  assert.deepEqual(values(s),[john.uid]);
  pick(s,john.uid);
  assert.deepEqual(own.battle,[john]);
 }
});

test('Powered Hole buffs only creatures already present, and excludes blockers at exactly 3000 (QA 36128)',()=>{
 const s=table(),own=s.players[0],opp=s.players[1],ally=inst(BEAST);
 own.battle.push(ally);
 const [small,large]=[HUNTER,FISH].map(inst);
 opp.battle.push(small,large);
 const starting=e.power(ally,false,s);
 cast(s,POWERED);
 assert.equal(e.power(ally,false,s),starting+1000);
 pick(s,1);
 const john=own.extra.find(x=>x.cardId===JOHN);
 pick(s,john.uid);
 assert.equal(e.power(john,false,s),e.card(JOHN).power);
 assert.ok(!john.g34Grants?.some(grant=>grant.g725NoBlockMaxPower));
 s.phase='attack';
 act(s,'attack',a=>a.uid===ally.uid&&a.target==='player');
 const blocks=e.getLegalActions(s).filter(a=>a.kind==='block').map(a=>a.uid);
 assert.deepEqual(blocks,[large.uid]);
 act(s,'noBlock');
 drain(s);
 act(s,'endTurn');
 drain(s);
 assert.equal(e.power(ally,false,s),starting);
});

test('The verified alternate prints retain their canonical IDs and four-copy limits',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 for(const [id,prints] of [
  [ENERGY,['dmx03-031','dmx08-028','dmex08-298']],
  [KILL,['dmx03-042','dmex17-129','dmpcd03-a14']],
  [POWERED,[]]
 ]){
  const card=registry.get(id);
  assert.equal(card.limit,4);
  for(const print of prints)assert.equal(registry.get(print),card);
 }
});
