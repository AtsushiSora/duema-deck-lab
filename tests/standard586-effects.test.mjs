import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,attack,drain,PRESETS} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';
import {STANDARD586_DECK} from '../tools/fixtures/standard586.mjs';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-586.json',import.meta.url)));
const INABA='dmrp22-067', KAKAN='dmrp05-092', KISANA='dm30-011', GYANO='dmd15-005';
const SPARK='dm24rp3-056', BAD='dmrp05-051', YELL='promoy13-008', FANTASY='dm19-s04';
const FIER='dm22rp2-065', LOVE='promoy14-058', CLASH='dmrp19-085', JINGI='dmr09-034';
const VOGANE='dmrp08-041', FARM='dmr05-070', TYSON='dm39-014', MANITUS='dm20-053', SYLPHY='dm01-005';
const FIRE='dm01-097', WATER='dm01-083', STRONG='dm01-001', EVO='dmx17-008', ARC='dm19-073';
const DRAGON='dm16-015', GIANT='dm36-103', GALACTIC='dm23rp3-S08', FORCE='dm23rp3-013';

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
function pair(s,a,b){pick(s,a.uid);pick(s,b.uid);}
function move(s,p,x,to='grave'){
  s.extTasks=[{op:'g34_ExactMove',p:1-p,source:FIRE,owner:p,target:x.uid,targetIncarnation:0,to}];
  act(s,'toAttack');
}

for(const row of cards)test(row.name+' matches the complete verified card and print',()=>{
  const detail=details.cards.find(d=>d.id===row.id),c=e.card(row.id);
  assert.deepEqual(detail.faces,row.faces);
  assert.deepEqual(standardCardSpec(detail,{phase:586}),row.spec);
  assert.throws(()=>standardCardSpec(detail,{phase:585}));
  for(const [key,expected] of Object.entries(row.spec))assert.deepEqual(c[key],expected);
  assert.equal(c.limit,regulationVerification.limits[row.id]);
  assert.equal(c.manaValue,1);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.ok(row.verification.facesMatched);
});

for(const id of [KISANA,BAD,FANTASY,FIER,CLASH])test(id+' battles two opposing creatures, with tapping only for Kisana',()=>{
  let s=field();
  const a=put(s,1,STRONG),b=put(s,1,FIRE),own=put(s,0,FIRE);
  if(id===FANTASY){
    const source=put(s,0,FANTASY);
    s.phase='attack';
    act(s,'tapAbility',x=>x.uid===source.uid);
    assert.equal(source.tapped,true);
  }else play(s,id);
  const before=physical(s);
  if(id===BAD||id===FANTASY)assert.ok(!targets(s).includes(own.uid));
  pick(s,a.uid);
  assert.equal(s.players[1].battle[0].tapped,false);
  assert.ok(!targets(s).includes(a.uid));
  s=JSON.parse(JSON.stringify(s));
  pick(s,b.uid);
  assert.equal(s.players[1].battle[0].uid,a.uid);
  assert.equal(s.players[1].battle[0].tapped,id===KISANA);
  assert.deepEqual(uids(s.players[1].grave),[b.uid]);
  assert.ok(!s.attack);
  assert.deepEqual(physical(s),before);
});

test('Kisana taps its only available creature without starting a battle',()=>{
  const s=field(),x=put(s,1,FIRE);
  play(s,KISANA);
  pick(s,x.uid);
  assert.equal(x.tapped,true);
  assert.equal(s.players[1].grave.length,0);
  assert.ok(!s.attack);
});

test('An effect battle can select two allies and does not apply Power Attacker',()=>{
  const s=field(),a=put(s,0,'dm01-104'),b=put(s,0,FIRE);
  play(s,CLASH);
  pair(s,a,b);
  assert.ok([a,b].every(x=>uids(s.players[0].grave).includes(x.uid)));
  assert.ok(!s.attack);
});

test('A forced opponent target occupies only one of the two selections',()=>{
  const s=field(),forced=put(s,1,FORCE),second=put(s,1,STRONG);
  play(s,CLASH);
  assert.deepEqual(targets(s),[forced.uid]);
  pick(s,forced.uid);
  assert.deepEqual(targets(s),[second.uid]);
  pick(s,second.uid);
  assert.ok(uids(s.players[1].grave).includes(forced.uid));
});

test('Jingi gives the opponent their own independent selection',()=>{
  let s=field(),own=put(s,0,STRONG),forced=put(s,1,FORCE),chosen=put(s,1,FIRE);
  play(s,JINGI);
  assert.deepEqual(targets(s),[own.uid]);
  pick(s,own.uid);
  assert.equal(s.decision.player,1);
  assert.deepEqual(targets(s),[forced.uid,chosen.uid]);
  s=JSON.parse(JSON.stringify(s));
  pick(s,chosen.uid);
  assert.ok(uids(s.players[1].grave).includes(chosen.uid));
  assert.ok(uids(s.players[1].battle).includes(forced.uid));
});

test('Galactic battle substitution is not offered when two allied creatures fight',()=>{
  const s=field(),a=put(s,1,GIANT),b=put(s,1,FIRE),galactic=put(s,1,GALACTIC);
  play(s,CLASH);
  pair(s,a,b);
  assert.equal(s.decision,null);
  assert.ok(uids(s.players[1].battle).includes(galactic.uid));
  assert.ok(uids(s.players[1].grave).includes(b.uid));
});

test('A shield-triggered effect battle finishes before the attack continues',()=>{
  const s=field(1),a=put(s,1,FIRE),b=put(s,1,STRONG),spell=inst(CLASH);
  s.players[0].shields=[spell];
  attack(s,a.uid);
  act(s,'noBlock');
  act(s,'useTrigger',x=>x.uid===spell.uid);
  pair(s,a,b);
  drain(s);
  assert.ok(uids(s.players[1].grave).includes(a.uid));
  assert.equal(s.metrics[0].triggers,1);
});

test('Love Batlatch filters the allied choice by tribe',()=>{
  const s=field(),a=put(s,0,DRAGON),wrong=put(s,0,STRONG),b=put(s,1,FIRE);
  play(s,LOVE);
  assert.ok(targets(s).includes(a.uid));
  assert.ok(!targets(s).includes(wrong.uid));
  pair(s,a,b);
  assert.ok(uids(s.players[1].grave).includes(b.uid));
});

test('Inaba starts a battle with the actual attacking evolution',()=>{
  const s=field(),source=put(s,0,EVO),b=put(s,1,FIRE);
  source.under=[inst(DRAGON)];
  put(s,0,INABA);
  attack(s,source.uid);
  assert.deepEqual(targets(s),[b.uid,null]);
  pick(s,b.uid);
  assert.ok(uids(s.players[1].grave).includes(b.uid));
  assert.equal(s.attack.attacker,source.uid);
});

for(const [id,fighter,target] of [[GYANO,FIRE,ARC],[YELL,DRAGON,STRONG]])test(id+' adds power only during an applicable battle',()=>{
  const s=field(),a=put(s,0,fighter),b=put(s,1,target);
  const source=put(s,0,id),base=e.power(a,false,s);
  play(s,CLASH);
  pair(s,a,b);
  assert.ok(uids(s.players[1].grave).includes(b.uid));
  assert.ok(uids(s.players[0].battle).includes(source.uid));
  assert.equal(e.power(a,false,s),base);
});

test('Battle winners trigger Manitus and the other-creature bonus on Kakan',()=>{
  const s=field(),a=put(s,0,ARC),b=put(s,1,FIRE),kakan=put(s,0,KAKAN);
  const n=s.players[0].mana.length,base=e.power(kakan,false,s);
  put(s,0,MANITUS);
  play(s,CLASH);
  pair(s,a,b);
  drain(s);
  assert.equal(e.power(kakan,false,s),base+4000);
  assert.equal(s.players[0].mana.length,n+2);
});

test('Kakan does not trigger from its own victory',()=>{
  const s=field(),a=put(s,0,KAKAN),b=put(s,1,WATER);
  b.buff=-500;
  play(s,CLASH);
  pair(s,a,b);
  assert.equal(e.power(a,false,s),1000);
});

test('Tyson breaks three shields by winning a battle',()=>{
  const s=field(),a=put(s,0,TYSON),b=put(s,1,FIRE),shields=s.players[1].shields.slice(0,3);
  play(s,CLASH);
  pair(s,a,b);
  for(const x of shields)pick(s,x.uid);
  assert.equal(s.players[1].shields.length,2);
  assert.equal(s.metrics[0].breaks,3);
});

for(const id of [SPARK,FARM,SYLPHY])test(id+' affects both players’ applicable creatures',()=>{
  const s=field(),a=put(s,0,FIRE),b=put(s,1,WATER),large=put(s,1,STRONG);
  play(s,id);
  if(id===SPARK)assert.ok([a,b,large].every(x=>x.tapped));
  else{
    const zone=id===FARM?'mana':'grave';
    assert.ok(uids(s.players[0][zone]).includes(a.uid));
    assert.ok(uids(s.players[1][zone]).includes(b.uid));
    assert.ok(uids(s.players[1].battle).includes(large.uid));
  }
});

for(const [p,to,n] of [[1,'grave',1],[0,'grave',0],[1,'hand',0]])test('Vogane draws only on enemy creature destruction '+[p,to],()=>{
  const s=field(),x=put(s,p,FIRE);
  put(s,0,VOGANE);
  move(s,p,x,to);
  assert.equal(s.players[0].hand.length,n);
});

test('legal forty CPU match finishes through JSON continuation conserving cards',()=>{
  assert.deepEqual(e.validateDeck(STANDARD586_DECK),[]);
  let s=e.createGame([STANDARD586_DECK,PRESETS[0]],{seed:58601,first:0}),saved=false;
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
