import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const FAMILY='dmrp08-015', QUIET='dmrp08-033', POWER='dmrp08-065';
const NATURE='dm01-108', LIGHT='dm01-012', HIGH_LIGHT='dm01-001', GENMU='dmrp15-km1';
const MANHATTAN='dmrp22-024';

function add(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
function attach(s,p,id,faceUp=true){
 const root=s.players[p].shields[0],x={...inst(id),faceUp,shieldCardOnly:faceUp};
 root.shieldGroup??=root.uid;
 (root.shieldStack??=[]).push(x);
 return x;
}
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const choose=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const cast=(s,x)=>act(s,'play',a=>a.uid===x.uid&&!a.alternative);
const inZone=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const restored=s=>decodeBattleData(encodeBattleData(s));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function end(s){
 if(s.phase==='charge')act(s,'skipCharge');
 if(s.phase==='main')act(s,'toAttack');
 act(s,'endTurn');
}

test('three official shield Crests and the three Familiere reprints keep their IDs and image links',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-1030.json',import.meta.url)));
 assert.deepEqual(m.cards.map(x=>x.id),[FAMILY,QUIET,POWER]);
 for(const row of m.cards){
  const c=registry.get(row.id);
  assert.equal(c.supported,true);
  assert.equal(c.limit,4);
  assert.equal(c.cost,row.faces[0].cost);
  assert.equal(c.manaValue,1);
  assert.equal(CARD_IMAGES[c.id],row.image);
  assert.equal(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).length,1);
 }
 assert.equal(m.printAliases.length,3);
 for(const row of m.printAliases){
  assert.equal(registry.get(row.id).id,FAMILY);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1030}),m.cards[0].spec);
 }
});

for(const id of [FAMILY,QUIET,POWER])test(id+' attaches after casting from hand',()=>{
 const s=setup(),root=s.players[0].shields[0],spell=add(s,0,'hand',id),all=physical(s);
 cast(s,spell);
 choose(s,root.uid);
 assert.deepEqual(root.shieldStack.map(x=>[x.uid,x.faceUp]),[[spell.uid,true]]);
 assert.equal(inZone(s,0,'grave',spell),false);
 assert.deepEqual(physical(s),all);
});

for(const result of ['enter','decline','replaced','empty'])test('Familiere deploys a valid Light creature or draws once '+result,()=>{
 let s=setup();
 give(s,0,'deck',[NATURE,NATURE,NATURE,NATURE]);
 const attacker=add(s,0,'battle',NATURE),top=s.players[0].deck[0];
 attach(s,0,FAMILY);
 const light=result==='empty'?null:add(s,0,'hand',LIGHT);
 add(s,0,'hand',NATURE);
 add(s,0,'hand',HIGH_LIGHT);
 if(result==='replaced'){
  add(s,1,'battle',MANHATTAN);
  s.players[0].enteredThisTurn=2;
 }
 const all=physical(s);
 attack(s,attacker.uid);
 if(light){
  assert.deepEqual(values(s),[light.uid,null]);
  s=restored(s);
  choose(s,result==='decline'?null:light.uid);
  assert.equal(inZone(s,0,'battle',light),result==='enter');
  assert.equal(inZone(s,0,'mana',light),result==='replaced');
 }
 assert.equal(inZone(s,0,'hand',top),result!=='enter');
 assert.deepEqual(physical(s),all);
});

test('Familiere does not trigger while face down or while its spell effects are ignored',()=>{
 for(const ignored of [true,false]){
  const s=setup(),attacker=add(s,0,'battle',NATURE);
  attach(s,0,FAMILY,ignored);
  if(ignored)add(s,1,'battle',GENMU);
  attack(s,attacker.uid);
  assert.equal(s.decision.type,'block');
  assert.equal(s.players[0].hand.length,0);
 }
});

for(const take of [true,false])test('Cassaut optionally puts a new face-down shield down at a quiet opponent end '+take,()=>{
 let s=Object.assign(setup(),{active:1});
 give(s,0,'deck',[NATURE,NATURE,NATURE,NATURE]);
 attach(s,0,QUIET);
 const top=s.players[0].deck[0],shieldCount=s.players[0].shields.length,all=physical(s);
 end(s);
 assert.equal(s.decision.player,0);
 assert.deepEqual(values(s),[true,null]);
 s=restored(s);
 choose(s,take?true:null);
 assert.equal(s.active,0);
 assert.equal(s.players[0].shields.length,shieldCount+Number(take));
 if(take){
  const placed=s.players[0].shields.at(-1);
  assert.equal(placed.uid,top.uid);
  assert.equal(!!placed.faceUp,false);
 }else assert.equal(inZone(s,0,'hand',top),true);
 assert.deepEqual(physical(s),all);
});

test('Cassaut does not trigger after a creature attacks or at its owners end',()=>{
 const s=Object.assign(setup(),{active:1});
 attach(s,0,QUIET);
 const enemy=add(s,1,'battle','dm01-s08'),target=add(s,0,'battle',NATURE,{tapped:true});
 attack(s,enemy.uid,target.uid);
 act(s,'noBlock');
 drain(s);
 end(s);
 assert.equal(s.active,0);
 assert.equal(s.decision,null);
 end(s);
 assert.equal(s.active,1);
 assert.equal(s.decision,null);
});

test('Ryokaku bonuses stack for face-up physical copies and stop immediately when hidden or ignored',()=>{
 const s=setup(),ally=add(s,0,'battle',NATURE),enemy=add(s,1,'battle',NATURE);
 const one=attach(s,0,POWER),two=attach(s,0,POWER);
 attach(s,0,POWER,false);
 assert.equal(e.power(ally,false,s),8000);
 assert.equal(e.power(enemy,false,s),2000);
 two.faceUp=false;
 assert.equal(e.power(ally,false,s),5000);
 add(s,1,'battle',GENMU);
 assert.equal(e.power(ally,false,s),2000);
 s.players[1].battle.pop();
 assert.equal(e.power(ally,false,s),5000);
 one.faceUp=false;
 assert.equal(e.power(ally,false,s),2000);
});

test('Familiere rechecks its own face-up shield when its queued attack ability resolves',()=>{
 const s=setup(),attacker=add(s,0,'battle','dmrp16-038');
 const root=s.players[0].shields[0],crest=attach(s,0,FAMILY);
 give(s,0,'deck',[NATURE,NATURE,NATURE]);
 const top=s.players[0].deck[0],all=physical(s);
 attack(s,attacker.uid);
 assert.equal(s.decision.type,'effectOrder');
 const recovery=s.pendingEffects.find(entry=>entry.source===attacker.cardId);
 act(s,'orderEffect',action=>action.effectId===recovery.effectId);
 choose(s,root.uid);
 assert.equal(inZone(s,0,'hand',crest),true);
 assert.equal(inZone(s,0,'deck',top),true);
 assert.equal(s.decision.type,'block');
 assert.deepEqual(physical(s),all);
});
