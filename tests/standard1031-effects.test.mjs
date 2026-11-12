import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const IZA='dmrp07-059', GOHOU='dmrp03-031', JITAKU='dmrp06-059', NOCHES='dmrp06-062';
const RAGE='dmrp06-065', EYE='dmbd04-008', NATURE='dm01-108', GENMU='dmrp15-km1';
const REDIRECT='dm22ex1-086', MYSTERY='dm04-019';

function add(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const choose=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const cast=(s,x)=>act(s,'play',a=>a.uid===x.uid&&!a.alternative);
const inZone=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const restored=s=>decodeBattleData(encodeBattleData(s));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const firstShield=(s,p=0)=>s.players[p].shields[0];
function crest(s,p){
 const spell=add(s,p,'hand',RAGE),root=firstShield(s,p);
 cast(s,spell);
 choose(s,root.shieldGroup||root.uid);
 return spell;
}
function end(s){
 if(s.phase==='charge')act(s,'skipCharge');
 if(s.phase==='main')act(s,'toAttack');
 act(s,'endTurn');
}

test('four official Metallica definitions and the Gohou reprint preserve IDs and art',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-1031.json',import.meta.url)));
 assert.deepEqual(m.cards.map(x=>x.id),[IZA,GOHOU,JITAKU,NOCHES]);
 for(const row of m.cards){
  const c=registry.get(row.id);
  assert.equal(c.supported,true);
  assert.equal(c.limit,4);
  assert.equal(c.manaValue,1);
  assert.equal(c.cost,row.faces[0].cost);
  assert.equal(c.power,Number(row.faces[0].powerText));
  assert.equal(CARD_IMAGES[c.id],row.image);
  assert.equal(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).length,1);
 }
 const [alias]=m.printAliases;
 assert.equal(registry.get(alias.id).id,GOHOU);
 assert.deepEqual(standardCardSpec({...alias,status:'complete'},{phase:1031}),m.cards[1].spec);
});

for(const enter of [true,false])test('Izayack can deploy only its physical hand copy after a face-up shield attachment '+enter,()=>{
 let s=setup();
 const hand=add(s,0,'hand',IZA),grave=add(s,0,'grave',IZA),opponent=add(s,1,'hand',IZA);
 const mana=s.players[0].mana.length,spell=crest(s,0),all=physical(s);
 assert.equal(s.decision.player,0);
 assert.equal(s.decision.task.uid,hand.uid);
 assert.deepEqual(values(s),[true,null]);
 s=restored(s);
 choose(s,enter?true:null);
 assert.equal(inZone(s,0,'battle',hand),enter);
 assert.equal(inZone(s,0,'hand',hand),!enter);
 assert.equal(inZone(s,0,'grave',grave),true);
 assert.equal(inZone(s,1,'hand',opponent),true);
 assert.equal(s.players[0].mana.length,mana);
 assert.equal(firstShield(s).shieldStack[0].uid,spell.uid);
 assert.deepEqual(physical(s),all);
});

test('Izayack deploys after a shield trigger reattaches on the opposing turn',()=>{
 const s=Object.assign(setup(),{active:1});
 give(s,0,'shields',[EYE,NATURE]);
 const [broken,keep]=s.players[0].shields,hand=add(s,0,'hand',IZA),enemy=add(s,1,'battle',NATURE);
 attack(s,enemy.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.uid===broken.uid);
 choose(s,enemy.uid);
 choose(s,keep.uid);
 assert.equal(s.decision.player,0);
 choose(s,true);
 assert.equal(inZone(s,0,'battle',hand),true);
 assert.equal(keep.shieldStack[0].uid,broken.uid);
});

test('Izayack in hand still triggers under Genmu when a six-cost spell adds a shield',()=>{
 const s=setup(),hand=add(s,0,'hand',IZA);
 add(s,1,'battle',GENMU);
 const spell=add(s,0,'hand',MYSTERY);
 cast(s,spell);
 assert.equal(s.decision.task.op,'g34_ShieldHandEntry1031');
 choose(s,true);
 assert.equal(inZone(s,0,'battle',hand),true);
});

test('Gohou adds a new face-down shield on entry and taps one chosen opponent',()=>{
 let s=setup();
 const spell=add(s,0,'hand',GOHOU),other=add(s,1,'battle',NATURE),enemy=add(s,1,'battle',NATURE);
 const ally=add(s,0,'battle',NATURE),top=s.players[0].deck[0],oldShields=s.players[0].shields.length,all=physical(s);
 cast(s,spell);
 assert.deepEqual(values(s),[other.uid,enemy.uid]);
 s=restored(s);
 choose(s,enemy.uid);
 assert.equal(s.players[0].shields.length,oldShields+1);
 assert.deepEqual([s.players[0].shields.at(-1).uid,!!s.players[0].shields.at(-1).faceUp],[top.uid,false]);
 assert.equal(s.players[1].battle.find(x=>x.uid===enemy.uid).tapped,true);
 assert.equal(s.players[1].battle.find(x=>x.uid===other.uid).tapped,false);
 assert.equal(s.players[0].battle.find(x=>x.uid===ally.uid).tapped,false);
 assert.deepEqual(physical(s),all);
});

test('a shield placement replaced with a grave move does not trigger Gohou or Izayack',()=>{
 const s=setup(),gohou=add(s,0,'hand',GOHOU),iza=add(s,0,'hand',IZA);
 const enemy=add(s,1,'battle',NATURE),top=s.players[0].deck[0],n=s.players[0].shields.length;
 add(s,1,'battle',REDIRECT);
 cast(s,gohou);
 assert.equal(s.decision,null);
 assert.equal(s.players[0].shields.length,n);
 assert.equal(inZone(s,0,'grave',top),true);
 assert.equal(inZone(s,0,'hand',iza),true);
 assert.equal(enemy.tapped,false);
});

test('Gohou triggers twice for two shields placed at once',()=>{
 const s=setup(),gohou=add(s,0,'battle',GOHOU);
 const first=add(s,1,'battle',NATURE),second=add(s,1,'battle',NATURE),n=s.players[0].shields.length;
 cast(s,add(s,0,'hand','dm26ex4-043'));
 assert.equal(s.players[0].shields.length,n+2);
 assert.equal(s.decision.type,'effectOrder');
 const pending=s.pendingEffects.filter(x=>x.uid===gohou.uid);
 assert.equal(pending.length,2);
 act(s,'orderEffect',a=>a.effectId===pending[0].effectId);
 choose(s,first.uid);
 assert.deepEqual(values(s),[first.uid,second.uid]);
 choose(s,second.uid);
 assert.equal(first.tapped&&second.tapped,true);
});

test('Jitaku blocks in the following opponent turn and loses the granted keyword at its next start',()=>{
 const s=setup(),jitaku=add(s,0,'battle',JITAKU),enemy=add(s,1,'battle',NATURE);
 assert.equal(e.effectiveCard(jitaku,s).blocker,undefined);
 crest(s,0);
 assert.equal(e.effectiveCard(jitaku,s).blocker,true);
 end(s);
 attack(s,enemy.uid);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===jitaku.uid));
 act(s,'noBlock');
 drain(s);
 end(s);
 assert.equal(s.active,0);
 assert.equal(e.effectiveCard(jitaku,s).blocker,undefined);
});

test('Noches always has Blocker and only its player attack requires a shield placement this turn',()=>{
 let s=setup();
 const noches=add(s,0,'battle',NOCHES),target=add(s,1,'battle',NATURE,{tapped:true});
 const attacks=()=>e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===noches.uid).map(a=>a.target);
 assert.equal(e.effectiveCard(noches,s).blocker,true);
 act(s,'toAttack');
 assert.deepEqual(attacks(),[target.uid]);
 s.phase='main';
 crest(s,0);
 s=restored(s);
 act(s,'toAttack');
 assert.deepEqual(new Set(attacks()),new Set(['player',target.uid]));
 end(s);
 end(s);
 act(s,'skipCharge');
 act(s,'toAttack');
 assert.equal(attacks().includes('player'),false);
});
