import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-592.json',import.meta.url)));
const PUMPKIN='dmrp20-020', BURST='dm25rp1-051', RABBIT='dm24ex4-075';
const FIRE='dm01-097', MUGEN='dmrp15-065', MUGEN_SPELL='dmrp16-008';
function field(){
 const s=setup();
 s.active=0;
 for(const p of [0,1])give(s,p,'deck',Array(22).fill(FIRE));
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
function pick(s,value){
 act(s,'extended',a=>s.decision.choices[a.choice].value===value);
}

for(const row of cards)test(row.name+' matches the official printing and complete definition',()=>{
 const detail=details.cards.find(c=>c.id===row.id),c=e.card(row.id);
 assert.deepEqual(detail.faces,row.faces);
 assert.deepEqual(standardCardSpec(detail,{phase:592}),row.spec);
 assert.throws(()=>standardCardSpec(detail,{phase:591}));
 for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
 assert.equal(c.limit,regulationVerification.limits[row.id]);
 assert.equal(CARD_IMAGES[row.id],row.image);
 assert.ok(row.verification.facesMatched);
});

test('型破の兎 ramps first, then shuffles only the chosen grave under its owner’s deck',()=>{
 for(const owner of [0,1,null]){
  let s=field();
  for(const p of [0,1])give(s,p,'grave',[FIRE,BURST,PUMPKIN]);
  const before=s.players.map(p=>({deck:p.deck.map(x=>x.uid),grave:p.grave.map(x=>x.uid),mana:p.mana.length}));
  play(s,RABBIT);
  assert.equal(s.players[0].mana.length,before[0].mana+1);
  assert.equal(s.players[0].mana.at(-1).uid,before[0].deck[0]);
  assert.equal(s.decision.task.op,'g34_GraveBottom589');
  s=JSON.parse(JSON.stringify(s));
  pick(s,owner);
  for(const p of [0,1]){
   const deck=before[p].deck.slice(p===0?1:0);
   assert.deepEqual(s.players[p].deck.slice(0,deck.length).map(x=>x.uid),deck);
   assert.deepEqual(s.players[p].deck.slice(deck.length).map(x=>x.uid).sort(),owner===p?before[p].grave.sort():[]);
   assert.deepEqual(s.players[p].grave.map(x=>x.uid),owner===p?[]:before[p].grave);
  }
 }
});

test('バース＝ターブ uses its shield trigger and retains blocker and slayer',()=>{
 const s=field(),attacker=place(s,0,'battle',FIRE),trigger=inst(BURST);
 s.players[1].shields=[trigger];
 give(s,0,'grave',[FIRE]);
 give(s,1,'grave',[FIRE]);
 const target=s.players[0].grave[0].uid;
 attack(s,attacker.uid);
 if(e.getLegalActions(s).some(a=>a.kind==='noBlock'))act(s,'noBlock');
 if(e.getLegalActions(s).some(a=>a.kind==='breakShield'))act(s,'breakShield');
 act(s,'useTrigger',a=>a.uid===trigger.uid);
 pick(s,0);
 assert.equal(s.players[0].deck.at(-1).uid,target);
 assert.equal(s.players[1].grave.length,1);
 const x=s.players[1].battle.find(x=>x.uid===trigger.uid);
 assert.ok(e.effectiveCard(x,s).blocker);
 assert.ok(e.effectiveCard(x,s).slayer);
});

test('かぼちゃ prevents moving either grave but cards can still enter it',()=>{
 const s=field(),pumpkin=play(s,PUMPKIN);
 assert.ok(e.effectiveCard(pumpkin,s).machFighter);
 for(const p of [0,1])give(s,p,'grave',[FIRE]);
 assert.equal(e.canMoveZone(s,0,'grave'),false);
 assert.equal(e.canMoveZone(s,1,'grave'),false);
 play(s,RABBIT);
 pick(s,1);
 assert.equal(s.players[1].grave.length,1);
 play(s,'dm01-094');
 assert.ok(s.players[0].grave.some(x=>x.cardId==='dm01-094'));
 s.players[0].battle=s.players[0].battle.filter(x=>x.uid!==pumpkin.uid);
 assert.equal(e.canMoveZone(s,0,'grave'),true);
 assert.equal(e.canMoveZone(s,1,'grave'),true);
});

test('かぼちゃ permits paying creature ムゲンクライム but rejects grave spell casting before payment',()=>{
 const s=field(),payer=place(s,0,'battle',FIRE),creature=place(s,0,'grave',MUGEN),spell=place(s,0,'grave',MUGEN_SPELL);
 for(let i=0;i<4;i++)place(s,0,'battle',FIRE);
 place(s,1,'battle',PUMPKIN);
 assert.ok(!e.getLegalActions(s).some(a=>a.uid===spell.uid));
 const before=e.physicalCards(s).length;
 act(s,'mugenStart',a=>a.uid===creature.uid);
 act(s,'mugenTap',a=>a.uid===payer.uid);
 assert.ok(payer.tapped);
 assert.ok(s.players[0].mana.some(x=>x.tapped));
 assert.ok(s.players[0].grave.some(x=>x.uid===creature.uid));
 assert.ok(!s.players[0].battle.some(x=>x.uid===creature.uid));
 assert.equal(e.physicalCards(s).length,before);
});
