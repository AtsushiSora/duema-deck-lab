import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const FINAL='dmrp22-4A',GOO='dmrp21-5A',SEED='dm22ex1-086',WATER='dm01-083',FIRE='dm01-097',DARK='dm01-090';
const add=(s,p,z,id,props={})=>{const x=Object.assign(inst(id),props);s.players[p][z].push(x);return x;};
const read=name=>JSON.parse(readFileSync(new URL('../tools/'+name,import.meta.url)));
const pick=(s,v)=>act(s,'extended',a=>{
 const {value}=s.decision.choices[a.choice];
 return (value?.uid??value)===v;
});
const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);

test('the three official Final Star prints resolve to the original ID and images',()=>{
 const m=read('support-phase-1340.json'),cat=createCatalogue(snapshot,data.cards,details),c=e.card(FINAL);
 assert.deepEqual([c.cost,c.power,c.race,c.civ,c.limit,c.manaValue],[6,6000,'トリックス/フェニックス/レクスターズ','水',4,1]);
 assert.deepEqual(m.printAliases.map(x=>x.id),['dmrp22-S4','dmrp22-6B']);
 for(const row of [...m.cards,...m.printAliases]){
  assert.deepEqual(cat.resolveRows([{id:row.id,count:1}]),[{id:FINAL,count:1}]);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[FINAL]);
  assert.equal(read('image-reference-prints.json').prints.find(r=>r.id===row.id).image,row.image);
 }
 assert.equal(CARD_IMAGES[FINAL],m.cards[0].image);
});

test('Final Star can choose multiple qualifying evolution bases, including Shinkalize',()=>{
 const s=setup(),x=add(s,0,'hand',FINAL),w=add(s,0,'battle',WATER),seed=add(s,0,'battle',SEED);
 const fire=add(s,0,'battle',FIRE);
 assert.deepEqual(e.evolutionBases(s,0,e.card(FINAL)).map(x=>x.uid),[w.uid,seed.uid]);
 play(s,x);
 pick(s,w.uid);pick(s,seed.uid);
 if(s.decision?.task?.op==='g31_Bases')pick(s,null);
 drain(s);
 assert.ok(has(s,0,'battle',x)&&has(s,0,'battle',fire));
 assert.deepEqual(new Set(x.under.map(x=>x.uid)),new Set([w.uid,seed.uid]));
 assert.equal(e.power(x,false,s),10000);
 assert.equal(e.effectiveCard(x,s).breaker,2);
});

test('a tapped Tamaseed placed under Final Star does not tap its host (QA41451)',()=>{
 for(const take of [true,false]){
  let s=setup();
  const host=add(s,0,'battle',FINAL,{under:[inst(WATER)]});
  add(s,1,'battle',GOO,{under:[inst(DARK)]});
  const seed=add(s,0,'hand',SEED);
  play(s,seed);
  assert.ok(seed.tapped);
  assert.equal(s.decision.task.op,'g34_FinalSeed1340');
  s=JSON.parse(JSON.stringify(s));
  pick(s,take?true:null);drain(s);
  const stack=s.players[0].battle.find(x=>x.uid===host.uid);
  assert.equal(stack.tapped,false);
  assert.equal(e.power(stack,false,s),take?10000:8000);
  assert.equal(stack.under.some(x=>x.uid===seed.uid),take);
  assert.equal(has(s,0,'battle',seed),!take);
 }
});

test('Star Evolution returns only the top card when a removal spell resolves',()=>{
 const s=setup(),base=inst(WATER),x=add(s,0,'battle',FINAL,{under:[base]});
 s.active=1;const spiral=add(s,1,'hand','dm01-086');
 play(s,spiral);act(s,'effect',a=>a.targets?.some(t=>t.uid===x.uid));
 drain(s);
 assert.ok(has(s,0,'hand',x));
 assert.ok(has(s,0,'battle',base));
 assert.equal(e.physicalCards(s).filter(y=>y.uid===base.uid).length,1);
});

test('six chosen cards go to the bottom as one shuffled group for the extra turn, with decline allowed',()=>{
 for(const take of [true,false]){
  const s=setup(),own=s.players[0],bases=Array.from({length:7},()=>inst(WATER));
  const host=add(s,0,'battle',FINAL,{under:[...bases]}),victim=add(s,1,'battle',FIRE,{tapped:true});
  const deck=own.deck.map(x=>x.uid);
  attack(s,host.uid,victim.uid);act(s,'noBlock');
  assert.equal(s.decision.task.op,'g34_FinalTurn1340');
  if(take)for(const x of bases.slice(0,6))pick(s,x.uid);else pick(s,null);
  assert.deepEqual(host.under.map(x=>x.uid),take?[bases[6].uid]:bases.map(x=>x.uid));
  assert.deepEqual(own.deck.slice(0,deck.length).map(x=>x.uid),deck);
  assert.deepEqual(new Set(own.deck.slice(deck.length).map(x=>x.uid)),new Set(take?bases.slice(0,6).map(x=>x.uid):[]));
  assert.equal(s.extraTurns?.[0]?.player,take?0:undefined);
  act(s,'endTurn');drain(s);
  assert.equal(s.active,take?0:1);
 }
});
