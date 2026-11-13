import test from 'node:test';
import assert from 'node:assert/strict';
import {createCatalogue} from '../dist/catalogue.js';
import {act,attack,cast,data,details,drain,e,give,inst,PRESETS,snapshot} from './target-fixture.mjs';

const FLUTE='dm38-046', UNTOUCHABLE='dm37-021', GILCROSS='dmx05-s05', CROSS='promoy13-023';
const BOLSHACK='dm36-s07', HERO='dmr02-011', TWIN='dmbd16-009', HOLE='dm36-101', SMALL='dm01-097', BLOCKER='dm01-048';
function setup(){
 const decks=PRESETS.slice(0,2).map(deck=>({...deck,format:'advance',extraCards:[
  {id:UNTOUCHABLE,count:3},{id:BOLSHACK,count:2}
 ]}));
 const s=e.createGame(decks,{seed:1095});
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
 const x=i===-1?inst(id):own.extra.splice(i,1)[0];
 Object.assign(x,props);
 own.battle.push(x);
 return x;
}
const values=s=>s.decision?.choices?.map(c=>c.value?.uid??c.value)??[];
const choose=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const target=(s,x)=>act(s,'effect',a=>a.targets?.some(y=>y.uid===x.uid));
const end=s=>{s.phase='attack';act(s,'endTurn');drain(s);};

for(const id of [HERO,TWIN])test(id+' completes both sweeps before Cheval Flute puts Untouchable into battle (QA36374)',()=>{
 const s=setup(),flute=put(s,1,FLUTE),onBoard=put(s,1,UNTOUCHABLE);
 const waiting=s.players[1].extra.find(x=>x.cardId===UNTOUCHABLE);
 cast(s,id);
 assert.ok(s.players[1].grave.includes(flute));
 assert.ok(s.players[1].extra.includes(onBoard));
 assert.equal(s.decision.player,1);
 assert.deepEqual(new Set(values(s)),new Set(s.players[1].extra.filter(x=>x.cardId===UNTOUCHABLE).map(x=>x.uid)));
 choose(s,waiting.uid);
 drain(s);
 assert.ok(s.players[1].battle.includes(waiting));
 assert.ok(s.players[1].extra.includes(onBoard));
});

test('Cheval Flute Slayer destroys its battle opponent and destruction deploys a Psychic',()=>{
 const s=setup(),flute=put(s,0,FLUTE),victim=put(s,1,SMALL,{tapped:true});
 attack(s,flute.uid,victim.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 const chosen=s.players[0].extra.find(x=>x.cardId===UNTOUCHABLE);
 choose(s,chosen.uid);
 drain(s);
 assert.ok(s.players[0].grave.includes(flute));
 assert.ok(s.players[1].grave.includes(victim));
 assert.ok(s.players[0].battle.includes(chosen));
});

test('Cheval Flute only deploys after destruction, with available eligible cards',()=>{
 for(const destroy of [false,true]){
  const s=setup(),flute=put(s,1,FLUTE);
  s.players[1].extra=s.players[1].extra.filter(x=>x.cardId===BOLSHACK);
  const spell=destroy?'dm01-027':'dm01-086';
  cast(s,spell);
  target(s,flute);
  assert.equal(s.decision,null);
  assert.ok(s.players[1][destroy?'grave':'hand'].includes(flute));
  assert.equal(s.players[1].battle.length,0);
 }
});

test('Untouchable can be attacked, while only the opponent is barred from choosing it',()=>{
 const s=setup(),unit=put(s,1,UNTOUCHABLE,{tapped:true}),victim=put(s,1,SMALL),attacker=put(s,0,SMALL);
 cast(s,'dm01-027');
 assert.ok(!e.getLegalActions(s).some(a=>a.targets?.some(x=>x.uid===unit.uid)));
 target(s,victim);
 s.phase='attack';
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===attacker.uid&&a.target===unit.uid));
 s.active=1;s.phase='main';
 cast(s,'dm01-086');
 target(s,unit);
 assert.ok(s.players[1].extra.includes(unit));
});

test('Untouchable awakens on the opponent turn even if the other awakened Psychic has left',()=>{
 const s=setup(),unit=put(s,1,UNTOUCHABLE),bolshack=put(s,1,BOLSHACK,{tapped:true});
 const attacker=put(s,0,SMALL);
 attack(s,attacker.uid,bolshack.uid);
 drain(s);
 assert.ok(bolshack.g1085Awakened);
 s.phase='main';
 for(let n=0;n<2;n++){
  cast(s,'dm01-027');
  target(s,bolshack);
  drain(s);
 }
 assert.ok(s.players[1].extra.includes(bolshack));
 end(s);
 assert.equal(e.card(unit).name,'変幻の覚醒者アンタッチャブル・パワード');
 assert.deepEqual(e.card(unit).civilizations,['水']);
 assert.equal(e.card(unit).cost,7);
 assert.equal(e.power(unit,false,s),5000);
 const blocker=put(s,0,BLOCKER);
 assert.ok(e.card(blocker).blocker);
 attack(s,unit.uid);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===blocker.uid));
 drain(s);
 assert.equal(s.players[0].shields.length,4);
});

test('Untouchable ignores the other player awakening a Psychic and remains a front face without a match',()=>{
 const s=setup(),unit=put(s,1,UNTOUCHABLE),bolshack=put(s,0,BOLSHACK);
 const target=put(s,1,SMALL,{tapped:true});
 attack(s,bolshack.uid,target.uid);
 drain(s);
 assert.ok(bolshack.g1085Awakened);
 end(s);
 assert.equal(e.card(unit).cost,2);
 assert.deepEqual(e.card(unit).civilizations,['光']);
});

for(const id of [GILCROSS,CROSS])test(id+' prevents new Psychic entries for either player and keeps existing Psychics in battle',()=>{
 const s=setup(),existing=put(s,1,BOLSHACK,{g1085Awakened:true,tapped:true});
 cast(s,id);
 const source=s.players[0].battle.find(x=>x.cardId===id);
 assert.ok(s.players[1].battle.includes(existing));
 assert.ok(existing.g1085Awakened);
 for(const p of [0,1]){
  assert.equal(e.canEnterCreature(s,p,e.card(UNTOUCHABLE),{origin:'extra',execution:false}),false);
  assert.equal(e.canEnterCreature(s,p,e.card(SMALL)),true);
 }
 assert.equal(e.power(source,false,s),9000);
 assert.equal(e.power(source,true,s),14000);
 attack(s,source.uid);
 drain(s);
 assert.equal(s.players[1].shields.length,2);
 s.phase='main';
 cast(s,HOLE);
 choose(s,1);
 assert.equal(s.decision,null);
 assert.equal(s.players[0].battle.length,1);
 source.g35Ignored=s.turn;
 assert.equal(e.canEnterCreature(s,0,e.card(UNTOUCHABLE),{origin:'extra',execution:false}),true);
});

test('Gilcross prevents reentry after return to the extra zone without preventing Release (QA36414)',()=>{
 const s=setup(),gilcross=put(s,0,GILCROSS),existing=put(s,1,BOLSHACK,{g1085Awakened:true});
 cast(s,'dm01-027');
 target(s,existing);
 drain(s);
 assert.ok(s.players[1].battle.includes(existing));
 assert.equal(e.card(existing).cost,7);
 cast(s,'dm01-027');
 target(s,existing);
 drain(s);
 assert.ok(s.players[1].extra.includes(existing));
 assert.equal(e.canEnterCreature(s,1,e.card(existing),{origin:'extra',execution:false}),false);
 s.players[0].battle.splice(s.players[0].battle.indexOf(gilcross),1);
 assert.equal(e.canEnterCreature(s,1,e.card(existing),{origin:'extra',execution:false}),true);
});

test('ability suppression preserves Psychic identity for a continuing Funk reduction',()=>{
 const s=setup(),unit=put(s,1,UNTOUCHABLE,{powerModifiers:[{amount:4000}]});
 put(s,0,'dmr05-054');
 assert.equal(e.power(unit,false,s),0);
 unit.g35Ignored=s.turn;
 assert.equal(e.effectiveCard(unit,s).untargetable,undefined);
 assert.equal(e.power(unit,false,s),0);
});

test('reprints preserve canonical IDs and similarly named Cosmo remains a separate card',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 for(const id of ['dmx03-014','dmex17-076','dmpcd03-a05'])assert.equal(catalogue.get(id)?.id,UNTOUCHABLE);
 assert.equal(catalogue.get('dmx22a-004')?.id,CROSS);
 assert.equal(catalogue.get('dm25ex4-021')?.id,'dm25ex4-021');
});
