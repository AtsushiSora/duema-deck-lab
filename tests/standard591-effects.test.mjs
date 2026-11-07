import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-591.json',import.meta.url)));
const SHIELD='dmbd04-003', THUNDER='dmx18-032', HANZO='dmx04-006', DOG='dmr03-027';
const BINGO='dm12-036', ARK='dm12-s01', METEOR='dm23sd1-003', GATOR='dmx18-047';
const LOST='dmrp20-017', GHOST='dm01-094', JENNY='dmr01-056', TYPHOON='dm11-043';
const SEGARE='dmrp19-044', FIRE='dm01-097', CROSSFIRE='dm23ex1-011', BLOCKER='dm01-076';
const JAOU='dm24rp4-DM1';

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
function play(s,id,filter=()=>true){
 const x=place(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&filter(a));
 return x;
}
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const pick=(s,value)=>act(s,'extended',a=>{
 const v=s.decision.choices[a.choice].value;
 return (v?.uid??v)===value;
});

for(const row of cards)test(row.name+' matches the official printing and complete definition',()=>{
 const detail=details.cards.find(c=>c.id===row.id),c=e.card(row.id);
 assert.deepEqual(detail.faces,row.faces);
 assert.deepEqual(standardCardSpec(detail,{phase:591}),row.spec);
 assert.throws(()=>standardCardSpec(detail,{phase:590}));
 for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
 assert.equal(c.limit,regulationVerification.limits[row.id]);
 assert.equal(CARD_IMAGES[row.id],row.image);
 assert.ok(row.verification.facesMatched);
});

test('防鎧 prevents both full-hand spell discard and creature discard',()=>{
 for(const source of [LOST,JENNY]){
  const s=field(),guard=place(s,1,'battle',SHIELD);
  const protectedHand=[place(s,1,'hand',THUNDER),place(s,1,'hand',FIRE)];
  play(s,source);
  if(source===JENNY)drain(s);
  assert.deepEqual(s.players[1].hand,protectedHand);
  assert.equal(s.players[1].grave.length,0);
  assert.ok(has(s,1,'battle',guard));
  assert.equal(s.decision,null);
  if(source===JENNY)assert.ok(s.players[0].grave.some(x=>x.cardId===JENNY));
 }
});

test('防鎧 protects the hand even when ジャオウガ removes it in the same effect',()=>{
 const s=field(),guard=place(s,1,'battle',SHIELD),kept=place(s,1,'battle',FIRE);
 give(s,1,'hand',[BINGO,THUNDER,FIRE]);
 give(s,1,'shields',[]);
 play(s,JAOU);
 assert.equal(s.decision.task.op,'g394_Keep');
 assert.equal(s.decision.task.stage,2);
 pick(s,kept.uid);
 assert.equal(s.players[1].hand.length,3);
 assert.ok(has(s,1,'grave',guard));
});

test('防鎧 permits self-discard and can return an oversized free summon after entry',()=>{
 const s=field();
 place(s,0,'battle',SHIELD);
 const x=place(s,0,'hand',FIRE);
 play(s,TYPHOON);
 drain(s);
 assert.ok(has(s,0,'grave',x));
 for(const count of [6,7]){
  const game=field();
  place(game,1,'battle',SHIELD);
  give(game,0,'mana',Array(count).fill(FIRE));
  give(game,0,'battle',Array(4).fill(FIRE));
  const entrant=play(game,CROSSFIRE,a=>a.freeSummon==='G・ゼロ');
  drain(game);
  assert.equal(has(game,0,'battle',entrant),count===7);
  assert.equal(game.players[0].deck.at(-1)?.uid===entrant.uid,count===6);
 }
});

test('mandatory replacements deploy through an all-discard spell without an optional choice',()=>{
 const s=field(),blocker=place(s,0,'battle',BLOCKER);
 const xs=[BINGO,ARK,METEOR].map(id=>place(s,1,'hand',id));
 const normal=place(s,1,'hand',FIRE);
 play(s,LOST);
 assert.equal(s.decision.task.op,'g34_Target');
 pick(s,blocker.uid);
 for(const x of xs)assert.ok(has(s,1,'battle',x));
 assert.ok(has(s,1,'grave',normal));
 assert.ok(has(s,0,'grave',blocker));
});

test('optional replacements distinguish accepting and declining and preserve saved choices',()=>{
 for(const accept of [true,false]){
  let s=field();
  const x=place(s,1,'hand',THUNDER);
  play(s,GHOST);
  assert.equal(s.decision.player,1);
  assert.equal(s.decision.task.op,'discardChosen');
  s=JSON.parse(JSON.stringify(s));
  pick(s,accept);
  assert.equal(has(s,1,'battle',x),accept);
  assert.equal(has(s,1,'grave',x),!accept);
  assert.equal(s.players[1].hand.length,accept?2:0);
  if(accept){
   const entrant=s.players[1].battle.find(y=>y.uid===x.uid);
   assert.equal(e.effectiveCard(entrant,s).breaker??1,1);
   for(let i=0;i<3;i++)place(s,1,'hand',FIRE);
   assert.equal(e.effectiveCard(entrant,s).breaker,2);
   assert.equal(e.effectiveCard(entrant,s).power,e.card(THUNDER).power+4000);
  }
 }
});

test('an opponent-turn replacement is not replaced again by セガーレ',()=>{
 const s=field(),watcher=place(s,0,'battle',SEGARE),x=place(s,1,'hand',ARK);
 give(s,1,'mana',[]);
 play(s,GHOST);
 assert.ok(has(s,1,'battle',x));
 assert.ok(has(s,0,'battle',watcher));
});

test('ハンゾウ weakens, ドクゲーター moves to mana, and ハチ公 searches by exact name',()=>{
 for(const id of [HANZO,GATOR,DOG]){
  const s=field(),x=place(s,1,'hand',id),target=place(s,0,'battle',BLOCKER),another=place(s,1,'deck',DOG);
  play(s,GHOST);
  pick(s,true);
  pick(s,id===DOG?another.uid:target.uid);
  assert.ok(has(s,1,'battle',x));
  if(id===DOG)assert.ok(has(s,1,'hand',another));
  else assert.ok(has(s,0,id===HANZO?'grave':'mana',target));
 }
});

test('self-discard replaces only the opponent-turn condition during a shield trigger',()=>{
 const s=field(),attacker=place(s,0,'battle',FIRE),trigger=inst(TYPHOON);
 const mandatory=place(s,1,'hand',BINGO),optional=place(s,1,'hand',THUNDER);
 s.players[1].shields=[trigger];
 attack(s,attacker.uid);
 if(e.getLegalActions(s).some(a=>a.kind==='noBlock'))act(s,'noBlock');
 if(e.getLegalActions(s).some(a=>a.kind==='breakShield'))act(s,'breakShield');
 act(s,'useTrigger',a=>a.uid===trigger.uid);
 pick(s,0);
 pick(s,mandatory.uid);
 assert.ok(has(s,1,'battle',mandatory));
 assert.ok(has(s,1,'hand',optional));
 const ownTurn=field(),ownCard=place(ownTurn,0,'hand',BINGO);
 play(ownTurn,TYPHOON);
 pick(ownTurn,0);
 pick(ownTurn,ownCard.uid);
 assert.ok(has(ownTurn,0,'grave',ownCard));
});

test('S・バック treats the shield used as payment as a discard from hand',()=>{
 const s=field(),attacker=place(s,0,'battle',FIRE),gedo=place(s,1,'hand','dm24rp4-S09');
 const payment=inst(METEOR);
 s.players[1].shields=[payment];
 attack(s,attacker.uid);
 if(e.getLegalActions(s).some(a=>a.kind==='noBlock'))act(s,'noBlock');
 if(e.getLegalActions(s).some(a=>a.kind==='breakShield'))act(s,'breakShield');
 pick(s,gedo.uid);
 assert.ok(has(s,1,'battle',payment));
 assert.ok(has(s,1,'battle',gedo));
});

test('discard after a replaced draw can still deploy ビンゴレ on the opponent’s turn',()=>{
 const s=field(),attacker=place(s,0,'battle',FIRE),trigger=inst(TYPHOON);
 const bingo=place(s,1,'hand',BINGO);
 place(s,1,'battle','dm32-021');
 s.players[1].shields=[trigger];
 attack(s,attacker.uid);
 if(e.getLegalActions(s).some(a=>a.kind==='noBlock'))act(s,'noBlock');
 if(e.getLegalActions(s).some(a=>a.kind==='breakShield'))act(s,'breakShield');
 act(s,'useTrigger',a=>a.uid===trigger.uid);
 pick(s,1);
 act(s,'replaceDraw',a=>a.replace);
 act(s,'discardDraw',a=>a.uid===bingo.uid);
 assert.ok(has(s,1,'battle',bingo));
});
