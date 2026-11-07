import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,attack,PRESETS} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';
import {STANDARD584_DECK} from '../tools/fixtures/standard584.mjs';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-584.json',import.meta.url)));
const SHOGI='dmrp18-082', CLUTCH='dm25-025', ZABABAN='dmsd13-008', SHINKAI='dmrp04s-017';
const SOUL='dm28-027', POKA='dmr11-043', CORE='dm24rp3-069', DYSON='dmr18-003';
const GLIDE='dmc27-003', TESTA='dmbd17-010', GINGER='dmr10-026', ATSUTO='dmx07-019';
const FIRE='dm01-097', DARK='dm01-090', WATER='dm01-083', JOKER='dmsd01-011', NEO='dm25rp3-S09';
const EVO='dmx17-008', MULTI='dm23rp4-045', SPLIT='dm24ex2-096', TWIN='dmrp06-006';
const DRAGON='dm16-015', RYUSEI='dmr02-s03', BABYLONIA='dm32-021';

function field(active=0){
  const s=setup();
  s.active=active;
  for(const p of [0,1])give(s,p,'deck',Array(26).fill(FIRE));
  return s;
}
function put(s,p,id,zone='battle'){
  const x=inst(id);
  s.players[p][zone].push(x);
  return x;
}
function play(s,id){
  const x=put(s,s.active,id,'hand');
  act(s,'play',a=>a.uid===x.uid);
  return x;
}
const choices=s=>s.decision?.choices??[];
const value=o=>o.value?.uid??o.value;
const targets=s=>choices(s).map(value);
const uids=rows=>rows.map(x=>x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function pick(s,v){act(s,'extended',a=>value(choices(s)[a.choice])===v);}
function move(s,p,x,to='grave'){
  s.extTasks=[{op:'g34_ExactMove',p:1-p,source:FIRE,owner:p,target:x.uid,targetIncarnation:0,to}];
  act(s,'toAttack');
}
function discardResult(s,p,x){
  assert.ok(uids(s.players[p].grave).includes(x.uid));
  assert.ok(!uids(s.players[p].hand).includes(x.uid));
}

for(const row of cards)test(row.name+' matches the complete verified card and print',()=>{
  const detail=details.cards.find(d=>d.id===row.id),c=e.card(row.id);
  assert.deepEqual(detail.faces,row.faces);
  assert.deepEqual(standardCardSpec(detail,{phase:584}),row.spec);
  assert.throws(()=>standardCardSpec(detail,{phase:583}));
  for(const [key,expected] of Object.entries(row.spec))assert.deepEqual(c[key],expected);
  assert.equal(c.limit,regulationVerification.limits[row.id]);
  assert.equal(c.manaValue,1);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.ok(row.verification.facesMatched);
});

for(const [id,n] of [[null,1],[EVO,2],[NEO,1]])test('Shogi draws even without a discard and checks actual evolution '+id,()=>{
  const s=field(),x=id&&put(s,0,id,'hand'),drawn=uids(s.players[0].deck.slice(0,n));
  play(s,SHOGI);
  if(x){pick(s,x.uid);discardResult(s,0,x);}
  assert.deepEqual(uids(s.players[0].hand),drawn);
});

for(const [id,n] of [[null,0],[FIRE,1],[DRAGON,2],[TWIN,2]])test('Core draws only if the optional discard is made '+id,()=>{
  const s=field(),x=put(s,0,id||FIRE,'hand'),drawn=uids(s.players[0].deck.slice(0,n));
  play(s,CORE);
  pick(s,id?x.uid:null);
  if(id)discardResult(s,0,x);
  assert.deepEqual(uids(s.players[0].hand),id?drawn:[x.uid]);
});

for(const [id,wanted] of [[ZABABAN,JOKER],[SHINKAI,TWIN]])for(const hit of [false,true])test(id+' discards after drawing and checks the discarded card '+hit,()=>{
  const s=field(),x=put(s,0,hit?wanted:FIRE,'hand'),drawn=uids(s.players[0].deck.slice(0,id===ZABABAN&&hit?2:1));
  const source=id===SHINKAI?put(s,0,id):null;
  if(source)attack(s,source.uid);
  else play(s,id);
  assert.equal(s.players[0].hand.length,2);
  pick(s,x.uid);
  discardResult(s,0,x);
  assert.deepEqual(uids(s.players[0].hand),drawn);
  if(source)assert.equal(source.tapped,!hit);
});

for(const id of [POKA,CLUTCH])for(const discarded of ['match','miss','empty','replacement'])test(id+' checks its blind discard '+discarded,()=>{
  const s=field(),grave=put(s,0,MULTI,'grave'),split=put(s,0,SPLIT,'grave');
  const match=id===POKA?TWIN:FIRE,miss=id===POKA?DARK:SPLIT;
  const enemy=discarded!=='empty'&&put(s,1,discarded==='replacement'?RYUSEI:discarded==='match'?match:miss,'hand');
  const top=s.players[0].deck[0];
  play(s,id);
  if(discarded==='replacement'){
    assert.equal(s.decision.player,1);
    pick(s,true);
    assert.ok(uids(s.players[1].battle).includes(enemy.uid));
  }else if(enemy)discardResult(s,1,enemy);
  if(discarded==='match'){
    if(id===POKA)pick(s,true);
    else{assert.deepEqual(targets(s),[grave.uid,null]);pick(s,grave.uid);}
    assert.ok(uids(s.players[0].hand).includes(id===POKA?top.uid:grave.uid));
  }
  assert.equal(s.decision,null);
  assert.ok(uids(s.players[0].grave).includes(split.uid));
});

for(const n of [0,1,2])test('Testa discards the chosen actual draw count '+n,()=>{
  let s=field();
  const old=put(s,0,DARK,'hand');
  const drawn=s.players[0].deck.slice(0,n);
  play(s,TESTA);
  const before=physical(s);
  pick(s,n);
  if(n){
    s=JSON.parse(JSON.stringify(s));
    const chosen=[old,...drawn].slice(0,n);
    for(const x of chosen)pick(s,x.uid);
    for(const x of chosen)discardResult(s,0,x);
  }
  assert.equal(s.players[0].hand.length,1);
  assert.deepEqual(physical(s),before);
});

test('Testa counts both actual cards from Babylonia replacing a single draw',()=>{
  const s=field(),old=put(s,0,DARK,'hand');
  put(s,0,BABYLONIA);
  play(s,TESTA);
  pick(s,1);
  act(s,'replaceDraw',a=>a.replace);
  act(s,'discardDraw',a=>a.uid===old.uid);
  assert.equal(s.players[0].hand.length,2);
  const drawn=[...s.players[0].hand];
  for(const x of drawn)pick(s,x.uid);
  assert.deepEqual(uids(s.players[0].grave),uids([old,...drawn]));
});

for(const accept of [true,false])test('Atsuto only discards after accepting the two draws '+accept,()=>{
  const s=field(),old=put(s,0,DARK,'hand');
  play(s,ATSUTO);
  pick(s,accept?true:null);
  if(accept){
    for(const x of s.players[0].hand.slice(0,2))pick(s,x.uid);
    discardResult(s,0,old);
  }
  assert.equal(s.players[0].hand.length,1);
  assert.equal(s.players[0].deck.length,accept?24:26);
});

for(const n of [0,3])test('Dyson draws five before counting opposing shield groups '+n,()=>{
  const s=field();
  give(s,1,'shields',Array(n).fill(WATER));
  if(n)s.players[1].shields[0].under=[inst(WATER)];
  play(s,DYSON);
  assert.equal(s.players[0].hand.length,5);
  for(const x of s.players[0].hand.slice(0,n))pick(s,x.uid);
  assert.equal(s.players[0].hand.length,5-n);
  assert.equal(s.players[0].grave.length,n);
});

for(const n of [0,2])test('Soul uses the number of own shields and samples distinct hidden cards '+n,()=>{
  const s=field();
  give(s,0,'shields',Array(n).fill(WATER));
  give(s,1,'hand',[DARK,FIRE,WATER]);
  play(s,SOUL);
  assert.equal(s.decision,null);
  assert.equal(s.players[1].grave.length,n);
  assert.equal(new Set(uids(s.players[1].grave)).size,n);
});

test('Glide lets its owner inspect and choose when destroyed on the opponent turn',()=>{
  const s=field(1),x=put(s,0,GLIDE),a=put(s,1,RYUSEI,'hand'),b=put(s,1,FIRE,'hand');
  move(s,0,x);
  assert.equal(s.decision.player,0);
  assert.deepEqual(targets(s),[a.uid,b.uid]);
  pick(s,a.uid);
  assert.equal(s.decision.player,1);
  pick(s,true);
  assert.ok(uids(s.players[1].battle).includes(a.uid));
  assert.deepEqual(uids(s.players[1].hand),[b.uid]);
});

for(const [victim,to,discard] of [[1,'grave',true],[0,'grave',false],[1,'hand',false]])test('Ginger triggers only from the opponent losing a creature to destruction '+[victim,to],()=>{
  const s=field(1),x=put(s,victim,FIRE),a=put(s,1,DARK,'hand'),b=put(s,0,WATER,'hand');
  put(s,0,GINGER);
  move(s,victim,x,to);
  assert.equal(uids(s.players[1].grave).includes(a.uid),discard);
  assert.ok(uids(s.players[0].hand).includes(b.uid));
});

test('Soul stays unavailable in a regulated deck',()=>{
  const deck=structuredClone(STANDARD584_DECK);
  deck.cards[0].id=SOUL;
  assert.equal(e.card(SOUL).limit,0);
  assert.ok(e.validateDeck(deck).length);
});

test('legal forty CPU match finishes through JSON continuation conserving cards',()=>{
  assert.deepEqual(e.validateDeck(STANDARD584_DECK),[]);
  let s=e.createGame([STANDARD584_DECK,PRESETS[0]],{seed:58401,first:0}),saved=false;
  const before=physical(s);
  while(s.winner===null&&s.actions<3000&&s.turn<160){
    e.step(s,e.chooseAI(s));
    assert.deepEqual(physical(s),before);
    if(!saved&&s.actions>20){s=JSON.parse(JSON.stringify(s));saved=true;}
  }
  assert.ok(saved);
  assert.notEqual(s.winner,null);
  assert.equal(new Set(physical(s)).size,80);
});
