import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,inst,give,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-614.json',import.meta.url)));
const SCORPION='dm38-018', CHAIN='dm30-013', LANGLE='dm14-025';
const BLOCKER='dm01-076', WATER='dm01-083', NATURE='dm01-105';
const DEMON_HAND='dm01-027', DENKA='dmrp06-020', WAKUM='dm24ex2-096', LIFE='dm06-110';
function field(active=0){
 const s=setup();
 s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(12).fill(WATER));
 return s;
}
function place(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
function play(s,id){
 const x=place(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{
 const v=s.decision.choices[a.choice].value;
 return (v?.uid??v)===value;
});
const choices=s=>s.decision.choices.map(o=>o.value?.uid??o.value);

for(const row of cards)test(row.name+' matches its official printing and compiled effects',()=>{
 const detail=details.cards.find(c=>c.id===row.id),c=e.card(row.id);
 assert.deepEqual(detail.faces,row.faces);
 assert.deepEqual(standardCardSpec(detail,{phase:614}),row.spec);
 assert.throws(()=>standardCardSpec(detail,{phase:613}));
 for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
 assert.equal(c.limit,regulationVerification.limits[row.id]);
 assert.equal(CARD_IMAGES[row.id],row.image);
 assert.ok(row.verification.facesMatched);
});

test('Red Scorpion picks an opposing blocker and two grave cards before the opponent orders them together',()=>{
 const s=field(),ownBlocker=place(s,0,'battle',BLOCKER),normal=place(s,1,'battle',WATER),blocker=place(s,1,'battle',BLOCKER);
 const first=place(s,1,'grave',DENKA),second=place(s,1,'grave',NATURE),rest=place(s,1,'grave',WATER);
 play(s,SCORPION);
 assert.equal(s.decision.player,0);
 assert.deepEqual(choices(s),[blocker.uid]);
 pick(s,blocker.uid);
 assert.deepEqual(choices(s),[first.uid,second.uid,rest.uid]);
 pick(s,first.uid);
 assert.ok(s.players[1].battle.includes(blocker));
 assert.ok(s.players[1].grave.includes(first));
 assert.deepEqual(choices(s),[second.uid,rest.uid]);
 pick(s,second.uid);
 assert.equal(s.decision.player,1);
 assert.deepEqual(new Set(choices(s)),new Set([blocker.uid,first.uid,second.uid]));
 pick(s,second.uid);
 pick(s,blocker.uid);
 assert.deepEqual(s.players[1].deck.slice(-3),[second,blocker,first]);
 assert.deepEqual(s.players[1].grave,[rest]);
 assert.ok(s.players[1].battle.includes(normal)&&s.players[0].battle.includes(ownBlocker));
});

test('Red Scorpion works when it leaves and only one grave card is available, or on entry without grave cards',()=>{
 const s=field(1),scorpion=place(s,0,'battle',SCORPION);
 const grave=play(s,DEMON_HAND);
 act(s,'effect',a=>a.targets[0].uid===scorpion.uid);
 assert.equal(s.decision.player,0);
 assert.deepEqual(choices(s),[grave.uid]);
 pick(s,grave.uid);
 assert.equal(s.players[1].deck.at(-1),grave);
 assert.ok(s.players[0].grave.includes(scorpion));

 const empty=field(),blocker=place(empty,1,'battle',BLOCKER);
 play(empty,SCORPION);
 pick(empty,blocker.uid);
 assert.equal(empty.players[1].deck.at(-1),blocker);
 assert.equal(empty.decision,null);
});

test('Chain checks the opposing grave and the creature half of a twinpact, both from hand and as a shield trigger',()=>{
 for(const trigger of [false,true]){
  const s=field(trigger?1:0),denka=place(s,1,'battle',DENKA),wrong=place(s,1,'battle',NATURE);
  place(s,0,'grave',NATURE);
  place(s,1,'grave',DENKA);
  place(s,1,'grave',DEMON_HAND);
  if(trigger){
   give(s,0,'shields',[CHAIN]);
   const attacker=place(s,1,'battle',WATER);
   attack(s,attacker.uid);
   act(s,'noBlock');
   act(s,'useTrigger',a=>a.cardId===CHAIN);
  }else play(s,CHAIN);
  assert.deepEqual(choices(s),[denka.uid]);
  pick(s,denka.uid);
  assert.ok(s.players[1].grave.includes(denka));
  assert.ok(s.players[1].battle.includes(wrong));
 }
});

test('Langle locks only matching Light or Nature spell names in the caster’s own grave and stops when muted',()=>{
 const s=field(1),langle=place(s,0,'battle',LANGLE);
 const wakum=place(s,1,'hand',WAKUM),life=place(s,1,'hand',LIFE),dark=place(s,1,'hand',DEMON_HAND);
 place(s,1,'grave',WAKUM);
 place(s,1,'grave',DEMON_HAND);
 place(s,0,'grave',LIFE);
 const playable=(x,face)=>e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===x.uid&&(a.face??0)===face);
 const [,originalLife]=e.playFaces(e.card(WAKUM));
 assert.equal(e.canCastSpell(s,1,originalLife,'grave'),false);
 assert.equal(e.canCastSpell(s,0,originalLife),true);
 assert.equal(playable(wakum,1),false);
 assert.equal(playable(wakum,0),true);
 assert.equal(playable(life,0),true);
 assert.equal(playable(dark,0),true);
 langle.g35Ignored=s.turn;
 assert.equal(playable(wakum,1),true);
});
