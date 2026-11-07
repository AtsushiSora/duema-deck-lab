import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-597.json',import.meta.url)));
const SAGRADA='dmr07-022', SHISHI='dm37-035', YAMINO='dm28-025', MESAI='dm27-051', STATUE='dm24-020';
const SPELL='dm01-015', CREATURE='dm04-042', W='dm01-s04', NORMAL='dm01-097', GS='dmrp17-025';
function field(){
 const s=setup();
 s.active=0;
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(NORMAL));
 return s;
}
function body(s,id){
 const x=inst(id);
 s.players[0].battle.push(x);
 return x;
}
function breakAt(s,x,shield){
 s.phase='attack';
 act(s,'attack',a=>a.uid===x.uid&&a.target==='player'&&(!shield||a.shield===shield.uid||e.card(x).breaker>1));
 act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields',a=>!shield||a.shields.includes(shield.uid));
}
function available(s){
 return e.getLegalActions(s).filter(a=>a.kind==='useTrigger');
}

for(const row of cards)test(row.name+' matches the verified official printing and complete rules',()=>{
 const detail=details.cards.find(c=>c.id===row.id),c=e.card(row.id);
 assert.deepEqual(detail.faces,row.faces);
 assert.deepEqual(standardCardSpec(detail,{phase:597}),row.spec);
 assert.throws(()=>standardCardSpec(detail,{phase:596}));
 for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
 assert.equal(c.limit,regulationVerification.limits[row.id]);
 assert.equal(CARD_IMAGES[row.id],row.image);
 assert.ok(row.verification.facesMatched);
});

test('tapping either 2-cost attacker blocks only the matching type of shield trigger',()=>{
 for(const [lock,allowed] of [[SAGRADA,CREATURE],[SHISHI,SPELL]]){
  const s=field(),watcher=body(s,lock),attacker=body(s,W);
  give(s,1,'shields',[NORMAL,SPELL,CREATURE]);
  breakAt(s,watcher,s.players[1].shields[0]);
  assert.equal(watcher.tapped,true);
  breakAt(s,attacker);
  assert.deepEqual(available(s).map(a=>a.cardId),[allowed]);
  act(s,'useTrigger');
  assert.equal(s.metrics[1].triggers,1);
  assert.ok(s.players[1].hand.some(x=>x.cardId===(allowed===SPELL?CREATURE:SPELL)));
 }
});

test('a declared spell trigger can become unusable after a preceding trigger taps サグラダ',()=>{
 const s=field(),watcher=body(s,SAGRADA),attacker=body(s,W);
 const DESTROY='dm01-027';
 assert.equal(e.card(DESTROY).trigger,true);
 give(s,1,'shields',[SPELL,DESTROY]);
 breakAt(s,attacker);
 act(s,'useTrigger',a=>a.cardId===SPELL);
 act(s,'useTrigger',a=>a.cardId===DESTROY);
 act(s,'orderTrigger',a=>a.cardId===SPELL);
 drain(s);
 assert.equal(watcher.tapped,true);
 assert.ok(s.players[1].hand.some(x=>x.cardId===DESTROY));
 assert.equal(s.metrics[1].triggers,1);
});

test('ヤミノリミット counts only shields outside the simultaneous break',()=>{
 for(const [attackerId,expected] of [[NORMAL,false],[W,true]]){
  const s=field(),attacker=body(s,attackerId);
  body(s,YAMINO);
  give(s,1,'shields',[SPELL,NORMAL,NORMAL,NORMAL,NORMAL]);
  const shield=s.players[1].shields[0];
  breakAt(s,attacker,shield);
  assert.equal(available(s).some(a=>a.uid===shield.uid),expected);
  assert.ok(s.players[1].hand.some(x=>x.uid===shield.uid));
 }
});

test('メサイダグラス suppresses S・トリガー only on its own break and leaves G・ストライク available',()=>{
 const s=field(),mesai=body(s,MESAI),other=body(s,NORMAL);
 give(s,1,'shields',[SPELL,SPELL,GS]);
 const [first,second,gs]=s.players[1].shields;
 first.shieldStack=[gs];
 s.players[1].shields.pop();
 breakAt(s,mesai,first);
 assert.deepEqual(available(s),[]);
 assert.equal(s.decision?.task?.op,'gsDeclare');
 act(s,'extended',a=>s.decision.choices[a.choice].value===false);
 breakAt(s,other,second);
 assert.deepEqual(available(s).map(a=>a.uid),[second.uid]);
});

test('石像男 needs all five civilizations among its creatures',()=>{
 for(const complete of [true,false]){
  const s=field(),attacker=body(s,NORMAL);
  for(const id of [STATUE,'dm01-075','dm01-083'])body(s,id);
  if(complete)body(s,'dm01-105');
  give(s,0,'mana',['dm01-105']);
  give(s,1,'shields',[CREATURE]);
  breakAt(s,attacker);
  assert.equal(available(s).length,complete?0:1);
 }
});

test('CPU attacks first with an untapped trigger-locking creature when it can break a shield',()=>{
 const s=field();
 body(s,NORMAL);
 const guard=body(s,SAGRADA);
 s.phase='attack';
 assert.equal(e.chooseAI(s).uid,guard.uid);
});

test('trigger permission is checked separately for each face of a granted Twinpact trigger',()=>{
 const TWIN='dm26rp3-069';
 for(const [lock,allowed] of [[SAGRADA,0],[SHISHI,1]]){
  const s=field(),watcher=body(s,lock),attacker=body(s,NORMAL);
  watcher.tapped=true;
  give(s,1,'shields',[TWIN]);
  s.players[1].shields[0].g19ShieldST=0;
  breakAt(s,attacker);
  assert.deepEqual(available(s).map(a=>a.face),[allowed]);
  act(s,'useTrigger');
  assert.ok(s.players[1][allowed===0?'battle':'grave'].some(x=>x.cardId===TWIN));
 }
});
