import test from 'node:test';
import assert from 'node:assert/strict';
import {createCatalogue} from '../dist/catalogue.js';
import {act,cast,data,details,drain,e,give,inst,PRESETS,snapshot} from './target-fixture.mjs';

const BARIBARI='dmex17-134', SHOOTING='dmc62-006', GAIARL='dmr01-034';
const BOLSHACK='dm36-s07', UNTOUCHABLE='dm37-021', JOHN='dm37-033';
const BLOCKER='dm01-076', EX_LIFE_BLOCKER='dmex16-072', NONBLOCKER='dm01-108';
const values=s=>s.decision?.choices?.map(c=>c.value?.uid??c.value)??[];
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);

function table(format='advance'){
 const decks=PRESETS.slice(0,2).map(deck=>({...deck,format,...(format==='advance'?{
  extraCards:[{id:BOLSHACK,count:2},{id:UNTOUCHABLE,count:1},{id:JOHN,count:1}]
 }:{})}));
 const s=e.createGame(decks,{seed:1098});
 s.phase='main';
 for(const p of [0,1]){
  give(s,p,'hand',[]);
  give(s,p,'mana',['dm01-097','dm01-108'].flatMap(id=>Array(6).fill(id)));
 }
 return s;
}

test('Baribari Hole deploys one Psychic of any civilization at cost three or less',()=>{
 for(const id of [UNTOUCHABLE,JOHN]){
  const s=table(),own=s.players[0],extra=own.extra.slice(),target=extra.find(c=>c.cardId===id);
  cast(s,BARIBARI);
  assert.deepEqual(values(s),extra.filter(c=>c.cardId!==BOLSHACK).map(c=>c.uid));
  pick(s,target.uid);
  assert.deepEqual(own.battle,[target]);
  assert.deepEqual(own.extra,extra.filter(c=>c!==target));
  assert.equal(own.mana.filter(c=>c.tapped).length,2);
  assert.equal(s.players[1].extra.length,4);
 }
});

test('Shooting Hole uses current blocker abilities and resolves destruction before deployment',()=>{
 const s=table(),own=s.players[0],opp=s.players[1];
 const blocker=inst(BLOCKER),plain=inst(NONBLOCKER),granted={...inst(NONBLOCKER),g34Grants:[{turn:s.turn,blocker:true}]};
 opp.battle.push(blocker,plain,granted);
 cast(s,SHOOTING);
 assert.deepEqual(values(s),[blocker.uid,granted.uid]);
 pick(s,granted.uid);
 assert.ok(opp.grave.includes(granted));
 assert.deepEqual(opp.battle,[blocker,plain]);
 const targets=own.extra.filter(x=>x.cardId===BOLSHACK);
 assert.deepEqual(values(s),targets.map(x=>x.uid));
 pick(s,targets[0].uid);
 assert.deepEqual(own.battle,[targets[0]]);
 assert.equal(own.mana.filter(c=>c.tapped).length,5);
});

test('Shooting Hole can still deploy without a destruction target or when destruction is replaced',()=>{
 for(const protectedBlocker of [false,true]){
  const s=table(),own=s.players[0],opp=s.players[1];
  const shield=opp.shields[0],blocker={...inst(EX_LIFE_BLOCKER),exLifeShieldUid:shield.uid};
  if(protectedBlocker)opp.battle.push(blocker);
  cast(s,SHOOTING);
  if(protectedBlocker){
   assert.deepEqual(values(s),[blocker.uid]);
   pick(s,blocker.uid);
   assert.ok(opp.battle.includes(blocker));
   assert.ok(opp.grave.includes(shield));
  }
  assert.equal(s.decision.task.op,'g34_Select');
  const target=own.extra.find(c=>c.cardId===BOLSHACK);
  pick(s,target.uid);
  drain(s);
  assert.deepEqual(own.battle,[target]);
 }
});

test('Gaiarl Hole allows zero and excludes a second cost-seven Psychic',()=>{
 const s=table(),own=s.players[0],targets=own.extra.filter(c=>c.cardId===BOLSHACK);
 cast(s,GAIARL);
 assert.deepEqual(values(s),[...targets.map(x=>x.uid),null]);
 pick(s,null);
 assert.deepEqual(own.battle,[]);
 for(const mana of own.mana)mana.tapped=false;
 cast(s,GAIARL);
 pick(s,targets[0].uid);
 assert.deepEqual(own.battle,[targets[0]]);
 assert.ok(own.extra.includes(targets[1]));
 assert.equal(s.decision,null);
});

test('Gaiarl Hole can select two fire Psychics at exactly eight total cost and restore a pending choice',()=>{
 const testPsychics=[3,5,6].map(cost=>({id:'phase1098-fire-'+cost,name:'Fire test Psychic '+cost,
  civ:'火',civilizations:['火'],type:'creature',cost,power:1000,psychic:true,manaValue:0}));
 e.setCards([...data.cards,...testPsychics]);
 try{
  const s=table(),own=s.players[0];
  const [three,five,six]=testPsychics.map(c=>inst(c.id));
  own.extra.push(three,five,six);
  cast(s,GAIARL);
  pick(s,three.uid);
  assert.deepEqual(own.battle,[]);
  assert.deepEqual(values(s),[five.uid,null]);
  const resumed=JSON.parse(JSON.stringify(s));
  pick(resumed,five.uid);
  assert.deepEqual(resumed.players[0].battle.map(c=>c.uid),[three.uid,five.uid]);
  assert.ok(resumed.players[0].extra.some(c=>c.uid===six.uid));
  assert.equal(resumed.decision,null);
 }finally{
  e.setCards(data.cards);
 }
});

test('All three spells can finish with no eligible Psychic, including in Original',()=>{
 for(const id of [BARIBARI,SHOOTING,GAIARL]){
  const s=table('original');
  cast(s,id);
  assert.equal(s.decision,null);
  assert.deepEqual(s.players[0].battle,[]);
  assert.equal(s.players[0].grave.at(-1)?.cardId,id);
 }
});

test('Verified print aliases preserve the three canonical IDs and share their four-copy limits',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 for(const [id,prints] of [
  [BARIBARI,['dm22ex1-126']],
  [SHOOTING,['dmc67-014','dmx02-025','dmd03-011','dmd18-009','dmx25-043','dmpcd03-a11','dm25ex4-T15']],
  [GAIARL,['dmr01-034M','promoy10-012','dmx25-015','dmpcd03-a08']]
 ]){
  const card=catalogue.get(id);
  assert.equal(card.limit,4);
  for(const print of prints)assert.equal(catalogue.get(print),card);
 }
});
