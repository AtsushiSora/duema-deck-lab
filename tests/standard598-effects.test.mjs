import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-598.json',import.meta.url)));
const POKU='dmex02-009', TYPHOON='dm25rp3-059', AZA='dm25rp3-018', SHOVEL='dmr06-039';
const FIRE='dm01-097', NATURE='dm01-105', WATER='dm01-083', ZERO='dmex08-174', RAIYA='dmr13-050';
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const values=s=>s.decision.choices.map(o=>o.value?.uid??o.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
function field(active=0){
 const s=setup();
 s.active=active;
 for(const p of [0,1]){
  give(s,p,'deck',Array(12).fill(FIRE));
  give(s,p,'grave',[]);
 }
 return s;
}
function place(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
function play(s,id){
 const x=place(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&!a.freeSummon&&!a.alternative);
 return x;
}
function deploy(s,p,id){
 const x=place(s,p,'hand',id);
 s.extTasks=[{op:'putCreature',p,source:POKU,uid:x.uid,origin:'hand'}];
 act(s,'toAttack');
 return x;
}

for(const row of cards)test(row.name+' matches the verified official printing and compiled rules',()=>{
 const detail=details.cards.find(c=>c.id===row.id),c=e.card(row.id);
 assert.deepEqual(detail.faces,row.faces);
 assert.deepEqual(standardCardSpec(detail,{phase:598}),row.spec);
 assert.throws(()=>standardCardSpec(detail,{phase:597}));
 for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
 assert.equal(c.limit,regulationVerification.limits[row.id]);
 assert.equal(CARD_IMAGES[row.id],row.image);
 assert.ok(row.verification.facesMatched);
});

test('ポクチン chooses either player and shuffles their whole grave into the existing deck',()=>{
 for(const owner of [0,1]){
  const s=field();
  for(const p of [0,1])give(s,p,'grave',[NATURE,WATER]);
  const pile=s.players[owner].grave.map(x=>x.uid),other=s.players[1-owner].grave.map(x=>x.uid);
  const before=s.rng;
  play(s,POKU);
  pick(s,owner);
  assert.equal(s.players[owner].grave.length,0);
  assert.equal(s.players[owner].deck.length,14);
  assert.ok(pile.every(uid=>s.players[owner].deck.some(x=>x.uid===uid)));
  assert.deepEqual(s.players[1-owner].grave.map(x=>x.uid),other);
  assert.notEqual(s.rng,before);
 }
});

test('ポクチン watches only the opponent’s turn and only entries without mana payment',()=>{
 let s=field(0);
 place(s,1,'battle',POKU);
 const paid=play(s,FIRE),zero=place(s,0,'hand',ZERO);
 zero.powerModifiers=[{amount:6000,expires:'end',who:s.active}];
 act(s,'play',a=>a.uid===zero.uid);
 const free=deploy(s,0,WATER);
 assert.ok(has(s,0,'battle',paid));
 assert.deepEqual(s.players[0].deck.slice(-2).map(x=>x.uid),[zero.uid,free.uid]);

 s=field(1);
 place(s,1,'battle',POKU);
 const offTurn=deploy(s,0,FIRE);
 assert.ok(has(s,0,'battle',offTurn));
});

test('printed zero stays free, while an applied one-mana floor and required civilization still count as payment',()=>{
 const s=field(),fever='dm12-054',robo='dmex10-035';
 const zero=e.card(ZERO);
 assert.equal(e.summonCost(s,0,zero),0);
 const nut=place(s,0,'battle',fever);
 assert.equal(e.summonCost(s,0,zero),1);
 s.players[0].battle=s.players[0].battle.filter(x=>x.uid!==nut.uid);
 place(s,1,'battle',POKU);
 assert.equal(e.summonCost(s,0,e.card(robo)),0);
 const tapped=s.players[0].mana.filter(x=>x.tapped).length;
 const body=play(s,robo);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,tapped+1);
 assert.ok(has(s,0,'battle',body));
});

test('ポクチン does not follow a free entrant that returned itself to hand before resolution',()=>{
 const s=field();
 place(s,1,'battle',POKU);
 const raiya=deploy(s,0,RAIYA);
 assert.ok(values(s).includes(raiya.uid));
 pick(s,raiya.uid);
 assert.ok(has(s,0,'hand',raiya));
 assert.ok(!has(s,0,'deck',raiya));
});

test('タイフン picks from a single grave, keeps the chosen order and can draw again on attack',()=>{
 const s=field();
 give(s,0,'grave',[FIRE]);
 give(s,1,'grave',[WATER,NATURE,FIRE]);
 const [a,b,c]=s.players[1].grave,top=s.players[0].deck[0];
 const typhoon=play(s,TYPHOON);
 pick(s,1);
 assert.deepEqual(values(s),[a.uid,b.uid,c.uid]);
 pick(s,b.uid);
 pick(s,a.uid);
 assert.deepEqual(s.players[1].deck.slice(-2).map(x=>x.uid),[b.uid,a.uid]);
 assert.ok(has(s,0,'hand',top));
 const draw=s.players[0].deck[0];
 typhoon.entered=0;
 attack(s,typhoon.uid);
 pick(s,1);
 pick(s,c.uid);
 assert.equal(s.players[1].grave.length,0);
 assert.ok(has(s,0,'hand',draw));
});

test('タイフン can decline without a draw and can select cards in a locked grave without moving them',()=>{
 for(const locked of [false,true]){
  const s=field();
  if(locked)place(s,1,'battle','dmrp20-020');
  give(s,1,'grave',[FIRE,WATER]);
  const [a,b]=s.players[1].grave,top=s.players[0].deck[0];
  play(s,TYPHOON);
  pick(s,locked?1:null);
  if(locked){pick(s,a.uid);pick(s,b.uid);}
  assert.equal(s.players[1].grave.length,2);
  assert.equal(has(s,0,'hand',top),locked);
 }
});

test('アザファウスト lets the grave owner order selected cards before the summoner chooses removal',()=>{
 let s=field();
 give(s,1,'grave',[WATER,NATURE,FIRE]);
 const [a,b,c]=s.players[1].grave,small=place(s,1,'battle',FIRE),large=place(s,1,'battle',NATURE);
 play(s,AZA);
 pick(s,1);
 pick(s,a.uid);
 pick(s,b.uid);
 pick(s,null);
 assert.equal(s.decision.player,1);
 s=JSON.parse(JSON.stringify(s));
 pick(s,b.uid);
 assert.equal(s.decision.player,0);
 assert.deepEqual(values(s),[small.uid,null]);
 pick(s,small.uid);
 assert.deepEqual(s.players[1].deck.slice(-2).map(x=>x.uid),[b.uid,a.uid]);
 assert.ok(has(s,1,'grave',c)&&has(s,1,'grave',small)&&has(s,1,'battle',large));
});

test('アザファウスト can use S・トリガー and selecting zero permits a zero-cost target',()=>{
 const s=field(1);
 const attacker=place(s,1,'battle',FIRE),zero=place(s,1,'battle',ZERO);
 zero.powerModifiers=[{amount:6000,expires:'end',who:s.active}];
 give(s,0,'shields',[AZA]);
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 pick(s,zero.uid);
 assert.ok(has(s,1,'grave',zero));
 assert.equal(s.metrics[0].triggers,1);
});

test('ショベル only shuffles after selecting a card and cannot attack',()=>{
 let s=field();
 const old=s.rng,shovel=play(s,SHOVEL);
 assert.equal(s.decision,null);
 assert.equal(s.rng,old);
 assert.equal(e.effectiveCard(shovel,s).blocker,true);
 s.phase='attack';
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===shovel.uid));

 s=field();
 give(s,1,'grave',[WATER,NATURE]);
 const [a,b]=s.players[1].grave,seed=s.rng;
 play(s,SHOVEL);
 pick(s,1);
 pick(s,b.uid);
 assert.deepEqual(s.players[1].grave.map(x=>x.uid),[a.uid]);
 assert.ok(has(s,1,'deck',b));
 assert.notEqual(s.rng,seed);
});
