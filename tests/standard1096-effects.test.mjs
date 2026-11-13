import test from 'node:test';
import assert from 'node:assert/strict';
import {createCatalogue} from '../dist/catalogue.js';
import {act,attack,cast,data,details,drain,e,give,inst,PRESETS,snapshot} from './target-fixture.mjs';

const JOHN='dm37-033', GRAVE='dmd19-004', STORM='dm38-051';
const UNTOUCHABLE='dm37-021', BOLSHACK='dm36-s07', SMALL='dm01-097', LARGE='dm01-048';
function setup(){
 const decks=PRESETS.slice(0,2).map(deck=>({...deck,format:'advance',extraCards:[
  {id:JOHN,count:1},{id:UNTOUCHABLE,count:2},{id:BOLSHACK,count:1}
 ]}));
 const s=e.createGame(decks,{seed:1096});
 s.phase='main';
 for(const p of [0,1]){
  give(s,p,'hand',[]);
  give(s,p,'mana',['dm01-083','dm01-090',SMALL].flatMap(id=>Array(10).fill(id)));
  give(s,p,'shields',Array(5).fill(SMALL));
 }
 return s;
}
function put(s,p,id,props={}){
 const own=s.players[p],i=own.extra.findIndex(x=>x.cardId===id);
 const x=i<0?inst(id):own.extra.splice(i,1)[0];
 Object.assign(x,props);
 own.battle.push(x);
 return x;
}
const values=s=>s.decision?.choices?.map(c=>c.value?.uid??c.value)??[];
const choose=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const target=(s,x)=>act(s,'effect',a=>a.targets?.some(y=>y.uid===x.uid));
const end=s=>{s.phase='attack';act(s,'endTurn');};
function deployJohn(s){
 const john=s.players[0].extra.find(x=>x.cardId===JOHN);
 cast(s,'dm36-101');
 choose(s,0);
 choose(s,john.uid);
 if(values(s).includes(null))choose(s,null);
 assert.ok(s.players[0].battle.includes(john));
 return john;
}

test('John awakens after two earlier creature entries, including a departed creature, then Untouchable can awaken that end step',()=>{
 const s=setup(),untouchable=put(s,0,UNTOUCHABLE);
 cast(s,SMALL);
 const first=s.players[0].battle.at(-1);
 cast(s,SMALL);
 cast(s,'dm01-086');
 target(s,first);
 const john=deployJohn(s);
 end(s);
 assert.equal(s.decision.type,'effectOrder');
 act(s,'orderEffect',a=>a.uid===john.uid);
 drain(s);
 assert.ok(s.players[0].hand.includes(first));
 assert.equal(e.card(john).name,'冒険の覚醒者ジョンジョ・ジョン');
 assert.deepEqual(e.card(john).civilizations,['火']);
 assert.equal(e.card(untouchable).cost,7);
});

test('Untouchable stays on its front face if its end-step ability resolves before John awakens',()=>{
 const s=setup(),untouchable=put(s,0,UNTOUCHABLE);
 cast(s,SMALL);
 cast(s,SMALL);
 const john=deployJohn(s);
 end(s);
 act(s,'orderEffect',a=>a.uid===untouchable.uid);
 drain(s);
 assert.equal(e.card(john).cost,5);
 assert.equal(e.card(untouchable).cost,2);
});

test('John excludes its own entry and only awakens at the end of its controller’s turn',()=>{
 const s=setup();
 cast(s,SMALL);
 const john=deployJohn(s);
 end(s);
 drain(s);
 assert.equal(e.card(john).cost,3);
 s.players[0].enteredThisTurn=2;
 end(s);
 drain(s);
 assert.equal(e.card(john).cost,3);
});

test('John untaps on the third allied attack, including its own, without ending that attack (QA36124–36125)',()=>{
 for(const johnAttacks of [true,false]){
  const s=setup(),john=put(s,0,JOHN,{g1085Awakened:true,tapped:!johnAttacks});
  const others=[0,1,2].map(()=>put(s,0,SMALL));
  for(const unit of others.slice(0,2)){attack(s,unit.uid);drain(s);}
  assert.equal(john.tapped,!johnAttacks);
  attack(s,johnAttacks?john.uid:others[2].uid);
  drain(s);
  assert.equal(john.tapped,false);
  assert.equal(s.players[1].shields.length,2);
  attack(s,john.uid);
  drain(s);
  assert.equal(john.tapped,true);
  assert.equal(s.players[1].shields.length,1);
 }
});

test('Grave Mott weakens only opposing Psychics, destroys them before its optional mill, and cannot attack',()=>{
 for(const mill of [true,false]){
  const s=setup(),ally=put(s,0,JOHN),enemy=put(s,1,JOHN),bolshack=put(s,1,BOLSHACK),ordinary=put(s,1,SMALL);
  const top=s.players[0].deck.slice(0,2);
  cast(s,GRAVE);
  assert.ok(s.players[1].extra.includes(enemy));
  assert.equal(e.power(bolshack,false,s),1000);
  assert.equal(e.power(ally,false,s),2000);
  assert.equal(e.power(ordinary,false,s),2000);
  choose(s,mill?true:null);
  drain(s);
  assert.deepEqual(s.players[0].grave,mill?top:[]);
  const mott=s.players[0].battle.find(x=>x.cardId===GRAVE);
  s.turn++;
  s.phase='attack';
  assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===mott.uid));
  s.active=1;
  attack(s,ordinary.uid);
  act(s,'block',a=>a.uid===mott.uid);
  drain(s);
  assert.ok(s.players[1].grave.includes(ordinary));
 }
});

test('Storm Hole destroys one opposing creature at current power 5000, then deploys a Fire Psychic',()=>{
 const s=setup(),boundary=put(s,1,LARGE),above=put(s,1,LARGE,{powerModifiers:[{amount:1000}]});
 put(s,0,SMALL);
 const fire=s.players[0].extra.find(x=>x.cardId===BOLSHACK);
 cast(s,STORM);
 assert.deepEqual(values(s),[boundary.uid]);
 choose(s,boundary.uid);
 assert.ok(s.players[1].grave.includes(boundary));
 assert.ok(s.players[1].battle.includes(above));
 assert.deepEqual(values(s),[fire.uid]);
 choose(s,fire.uid);
 drain(s);
 assert.ok(s.players[0].battle.includes(fire));
});

test('Storm Hole resolves either available clause independently',()=>{
 const s=setup(),fire=s.players[0].extra.find(x=>x.cardId===BOLSHACK);
 cast(s,STORM);
 assert.deepEqual(values(s),[fire.uid]);
 choose(s,fire.uid);
 s.phase='main';
 const victim=put(s,1,SMALL);
 cast(s,STORM);
 choose(s,victim.uid);
 drain(s);
 assert.ok(s.players[1].grave.includes(victim));
 assert.ok(s.players[0].battle.includes(fire));
});

test('John and Storm Hole retain their canonical ID across the verified reprints',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.equal(catalogue.get('dmx03-023')?.id,JOHN);
 for(const id of ['dm38-051VC','dmex01-044'])assert.equal(catalogue.get(id)?.id,STORM);
});
