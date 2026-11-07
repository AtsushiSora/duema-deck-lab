import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const GRIMOIRE='dm26rp3-015', BODY='dm01-097', DRAW='dm06-085';
const CHARGER='dm08-043', APUL='dmrp22-042', NINE='dm26rp3-011', TEN='dmrp05-m01';
const {cards:[row],regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-594.json',import.meta.url)));

function field(){
 const s=setup();
 s.active=0;
 for(const p of [0,1])give(s,p,'deck',Array(22).fill(BODY));
 return s;
}
function place(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
function trigger(s,remaining=0){
 const attacker=place(s,0,'battle',BODY),shield=inst(GRIMOIRE);
 s.players[1].shields=[shield,...Array.from({length:remaining},()=>inst(BODY))];
 attack(s,attacker.uid);
 if(e.getLegalActions(s).some(a=>a.kind==='noBlock'))act(s,'noBlock');
 if(e.getLegalActions(s).some(a=>a.kind==='breakShield'))act(s,'breakShield',a=>a.uid===shield.uid);
 act(s,'useTrigger',a=>a.uid===shield.uid);
 return shield;
}
function pick(s,uid){
 act(s,'extended',a=>{
  const value=s.decision.choices[a.choice].value;
  return (value?.uid??value)===uid;
 });
}

test('裏魔導書グリモア-Ⅰ章 matches the official printing and complete definition',()=>{
 const detail=details.cards.find(c=>c.id===GRIMOIRE),c=e.card(GRIMOIRE);
 assert.equal(row.id,GRIMOIRE);
 assert.deepEqual(detail.faces,row.faces);
 assert.deepEqual(standardCardSpec(detail,{phase:594}),row.spec);
 assert.throws(()=>standardCardSpec(detail,{phase:593}));
 for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
 assert.equal(c.limit,regulationVerification.limits[GRIMOIRE]);
 assert.equal(CARD_IMAGES[GRIMOIRE],row.image);
 assert.ok(row.verification.facesMatched);
});

test('ordinary casting and a trigger with shields remaining draw three and discard one',()=>{
 for(const shield of [false,true]){
  const s=field(),p=shield?1:0,own=s.players[p],grave=place(s,p,'grave',DRAW),top=own.deck.slice(0,3);
  const source=shield?trigger(s,1):place(s,p,'hand',GRIMOIRE);
  if(!shield)act(s,'play',a=>a.uid===source.uid);
  assert.deepEqual(own.hand.map(x=>x.uid),top.map(x=>x.uid));
  pick(s,top[0].uid);
  assert.equal(s.decision,null);
  assert.ok(own.grave.some(x=>x.uid===grave.uid));
  assert.ok(own.grave.some(x=>x.uid===top[0].uid));
  assert.ok(own.grave.some(x=>x.uid===source.uid));
  assert.equal(own.hand.length,2);
 }
});

test('last-shield trigger can cast from either grave, including the card just discarded',()=>{
 for(const owner of [0,1]){
  let s=field();
  const foreign=place(s,0,'grave',DRAW),nine=place(s,1,'grave',NINE);
  place(s,0,'grave',TEN);
  place(s,1,'grave',BODY);
  const discarded=inst(DRAW);
  s.players[1].deck.unshift(discarded);
  const source=trigger(s);
  pick(s,discarded.uid);
  assert.equal(s.decision.task.op,'g34_GraveSpell594');
  assert.deepEqual(new Set(s.decision.choices.map(o=>o.value.uid)),new Set([foreign.uid,nine.uid,discarded.uid]));
  const mana=s.players.map(p=>p.mana.filter(x=>x.tapped).length),total=e.physicalCards(s).length;
  s=JSON.parse(JSON.stringify(s));
  const selected=owner===0?foreign:discarded;
  pick(s,selected.uid);
  assert.equal(s.players[owner].deck.at(-1).uid,selected.uid);
  assert.equal(s.players[1].hand.length,4);
  assert.deepEqual(s.players.map(p=>p.mana.filter(x=>x.tapped).length),mana);
  assert.ok(s.players[1].grave.some(x=>x.uid===source.uid));
  assert.equal(e.physicalCards(s).length,total);
 }
});

test('checks the grave owner’s movement lock and preserves a borrowed Charger’s own replacement',()=>{
 const s=field(),charger=place(s,0,'grave',CHARGER);
 place(s,0,'battle',APUL);
 const locked=place(s,1,'grave',DRAW);
 trigger(s);
 pick(s,s.players[1].hand[0].uid);
 assert.deepEqual(s.decision.choices.map(o=>o.value.uid),[charger.uid]);
 pick(s,charger.uid);
 assert.ok(s.players[0].mana.some(x=>x.uid===charger.uid));
 assert.ok(s.players[1].grave.some(x=>x.uid===locked.uid));
});

test('both grave zones locked leaves the base draw and discard intact',()=>{
 const s=field();
 place(s,0,'battle','dmrp20-020');
 place(s,0,'grave',DRAW);
 place(s,1,'grave',DRAW);
 trigger(s);
 pick(s,s.players[1].hand[0].uid);
 assert.equal(s.decision,null);
 assert.equal(s.players[1].hand.length,2);
 assert.ok(s.players.every(p=>p.grave.some(x=>x.cardId===DRAW)));
});
