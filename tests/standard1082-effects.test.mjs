import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue} from '../dist/catalogue.js';

const BEETLE='dm08-019',DIRGE='dm13-025',KACHUA='dm08-005',PRINCESS='dm24ex1-009';
const GEKI='dm24-003',METSU='dm24-004',YAP='dm24ex1-040',PLAIN='dm01-108',BLOCKER='dm01-076';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const pick=(s,v)=>act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===v);
function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(12).fill(PLAIN));
 return s;
}
function play(s,id){
 const x=inst(id);
 s.players[s.active].hand.push(x);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}

test('All official alternate prints resolve to the canonical playable cards',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details), manifest=read('tools/support-phase-1082.json');
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id;
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.ok(catalogue.get(id).supported&&row.verification.facesMatched);
  assert.equal(e.card(id).limit,manifest.regulationVerification.limits[row.id]);
 }
});

test('Carbonite Beetle and Dirge break two shields separately before battle after an ally broke a shield',()=>{
 const s=field(),[ally,beetle]=give(s,0,'battle',[PLAIN,BEETLE]),[blocker]=give(s,1,'battle',[BLOCKER]);
 play(s,DIRGE);
 attack(s,ally.uid);
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,4);
 attack(s,beetle.uid);
 act(s,'block',a=>a.uid===blocker.uid);
 assert.equal(s.decision.type,'effectOrder');
 act(s,'orderEffect',a=>a.uid===beetle.uid);
 for(const count of [4,3]){
  assert.equal(s.decision.task.op,'g34_Break497');
  assert.equal(s.players[1].shields.length,count);
  assert.ok(!s.log.some(x=>x.type==='battle'));
  pick(s,s.players[1].shields[0].uid);
 }
 assert.equal(s.players[1].shields.length,2);
 assert.ok(s.log.some(x=>x.type==='battle'));
});

test('Carbonite Beetle does not gain Turbo Rush from its own break',()=>{
 const s=field(),[beetle]=give(s,0,'battle',[BEETLE]),[blocker]=give(s,1,'battle',[BLOCKER]);
 attack(s,beetle.uid);
 act(s,'noBlock');
 drain(s);
 beetle.tapped=false;
 attack(s,beetle.uid);
 act(s,'block',a=>a.uid===blocker.uid);
 drain(s);
 assert.equal(s.players[1].shields.length,4);
});

test('Kachua grants speed and schedules both destructions after Geki and Metsu link',()=>{
 for(const [first,second] of [[GEKI,METSU],[METSU,GEKI]]){
  let s=field();
  const [a,b]=give(s,0,'battle',[KACHUA,KACHUA]);
  const [root,partner]=give(s,0,'deck',[first,second,PLAIN,PLAIN,PLAIN,PLAIN]);
  const all=physical(s);
  s.phase='attack';
  act(s,'tapAbility',x=>x.uid===a.uid);
  assert.ok(!s.decision.choices.some(x=>x.cardId===PLAIN));
  pick(s,root.uid);
  assert.equal(e.effectiveCard(root,s).speedAttacker,true);
  act(s,'tapAbility',x=>x.uid===b.uid);
  pick(s,partner.uid);
  assert.equal(s.decision.task.op,'g31_Link');
  pick(s,root.uid);
  assert.deepEqual(root.godLinks.map(x=>x.uid),[partner.uid]);
  s=JSON.parse(JSON.stringify(s));
  act(s,'endTurn');
  assert.equal(s.decision.type,'effectOrder');
  act(s,'orderEffect');
  assert.equal(s.decision.type,'godLeave');
  act(s,'godLeave',x=>x.uid===partner.uid);
  drain(s);
  assert.deepEqual(s.players[0].grave.map(x=>x.uid).sort(),[root.uid,partner.uid].sort());
  assert.deepEqual(physical(s),all);
 }
});

test('Kachua can decline a search and cannot use its tap ability while summoning sick',()=>{
 const s=field(),[kachua]=give(s,0,'battle',[KACHUA]);
 give(s,0,'deck',[GEKI,PLAIN,PLAIN]);
 s.phase='attack';
 kachua.entered=s.turn;
 assert.ok(!e.getLegalActions(s).some(x=>x.kind==='tapAbility'));
 kachua.entered=s.turn-1;
 const original=[...s.players[0].deck].map(x=>x.uid).sort();
 act(s,'tapAbility',x=>x.uid===kachua.uid);
 pick(s,null);
 assert.ok(kachua.tapped);
 assert.deepEqual(s.players[0].deck.map(x=>x.uid).sort(),original);
 assert.equal(s.players[0].battle.length,1);
});

test('Marshall Princess adds two shields, breaks one, and its own player cannot choose it with Yappupp',()=>{
 const s=field(),[first,second]=give(s,0,'battle',[PLAIN,PLAIN]);
 const top=s.players[0].deck.slice(0,2).map(x=>x.uid);
 const old=s.players[0].shields[0];
 const princess=play(s,PRINCESS);
 if(s.decision.type==='effectOrder')act(s,'orderEffect',a=>
  s.pendingEffects.find(x=>x.effectId===a.effectId)?.effect==='entry');
 assert.equal(s.decision.task.op,'g34_Break497');
 assert.equal(s.players[0].shields.length,7);
 assert.ok(top.every(uid=>s.players[0].shields.some(x=>x.uid===uid)));
 pick(s,old.uid);
 drain(s);
 assert.equal(s.players[0].shields.length,6);
 assert.equal(e.effectiveCard(princess,s).g1082ChoiceProtected,true);
 const [enemy]=give(s,1,'battle',[PLAIN]);
 play(s,YAP);
 assert.ok(!s.decision.choices.some(x=>x.value===princess.uid));
 pick(s,first.uid);
 assert.ok(!s.decision.choices.some(x=>x.value===princess.uid));
 pick(s,second.uid);
 pick(s,enemy.uid);
 assert.ok(s.players[0].battle.includes(princess));
 for(let i=0;i<2;i++){
  s.phase='attack';
  act(s,'endTurn');
  drain(s);
 }
 assert.equal(e.effectiveCard(princess,s).g1082ChoiceProtected,undefined);
});
