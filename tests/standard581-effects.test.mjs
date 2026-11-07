import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,attack,PRESETS} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';
import {STANDARD581_DECK} from '../tools/fixtures/standard581.mjs';

const {cards}=JSON.parse(readFileSync(new URL('../tools/support-phase-581.json',import.meta.url)));
const CRISIS='dm06-034', SHADOW='dm19-022', SENJU='dm24-018', MEGA='dmd29-006';
const LUNA='dm10-045', ZENT='dmrp04m-004', ARROW='dmr21-046', ADRAK='dm19-047';
const FIRE='dm01-097', WATER='dm01-083', DARK='dm01-090', SEED='dmsd20-016';
const NEXT='dm24bd3-009', MULTI='dm23rp4-045', DAMAMA='dmr21-050', APUL='dmrp22-042';

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
const choiceValue=o=>o.value?.uid??o.value;
const choices=s=>s.decision?.choices??[];
const targets=s=>choices(s).map(choiceValue);
function pick(s,value){act(s,'extended',a=>choiceValue(choices(s)[a.choice])===value);}
function start(s,p){
  s.active=1-p;
  s.phase='attack';
  act(s,'endTurn');
}
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);

for(const row of cards)test(row.name+' matches the complete verified card and print',()=>{
  const detail=details.cards.find(d=>d.id===row.id),c=e.card(row.id);
  assert.deepEqual(detail.faces,row.faces);
  assert.deepEqual(standardCardSpec(detail,{phase:581}),row.spec);
  assert.throws(()=>standardCardSpec(detail,{phase:580}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.equal(c.limit,4);
  assert.equal(c.manaValue,1);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.ok(row.verification.facesMatched);
});

for(const from of ['battle','mana'])test('Crisis lets the opponent choose their own physical card '+from,()=>{
  let s=field();
  const host=put(s,1,NEXT),buried=inst(SEED),mana=put(s,1,DARK,'mana'),ally=put(s,0,WATER);
  host.under=[buried];
  mana.faceDown=true;
  play(s,CRISIS);
  const before=physical(s);
  assert.equal(s.decision.player,1);
  assert.ok(targets(s).includes(buried.uid)&&!targets(s).includes(ally.uid));
  assert.match(choices(s).find(o=>o.value===mana.uid).label,/裏向き/);
  assert.equal(choices(s).find(o=>o.value===mana.uid).cardId,undefined);
  s=JSON.parse(JSON.stringify(s));
  pick(s,from==='battle'?buried.uid:mana.uid);
  assert.ok(has(s,1,'grave',from==='battle'?buried:mana));
  assert.ok(has(s,1,'battle',host)&&has(s,0,'battle',ally));
  assert.deepEqual(physical(s),before);
});

test('Crisis can be cast via the old shield-trigger wording',()=>{
  const s=field(1),a=put(s,1,FIRE),spell=inst(CRISIS);
  s.players[0].shields=[spell];
  give(s,0,'mana',[]);
  attack(s,a.uid);
  act(s,'noBlock');
  act(s,'useTrigger',a=>a.uid===spell.uid);
  pick(s,a.uid);
  assert.ok(has(s,1,'grave',a)&&has(s,0,'grave',spell));
});

for(const prior of [false,true])test('Shadow returns either mana and its Cyclone checks the preceding summon '+prior,()=>{
  const s=field(),hidden=put(s,1,DARK,'mana');
  hidden.faceDown=true;
  if(prior)play(s,FIRE);
  const spell=play(s,SHADOW),before=physical(s);
  assert.equal(s.decision.player,0);
  assert.ok(targets(s).includes(s.players[0].mana[0].uid));
  const option=choices(s).find(x=>x.value===hidden.uid);
  assert.match(option.label,/相手のマナ.*裏向き/);
  assert.equal(option.cardId,undefined);
  pick(s,hidden.uid);
  assert.ok(has(s,1,'hand',hidden)&&has(s,0,prior?'hand':'grave',spell));
  assert.deepEqual(physical(s),before);
});

test('a mana movement lock does not remove legal battlefield choices',()=>{
  const s=field(),a=put(s,1,SEED),mana=s.players[1].mana[0];
  put(s,0,APUL);
  play(s,SHADOW);
  assert.ok(targets(s).includes(a.uid)&&!targets(s).includes(mana.uid));
  pick(s,a.uid);
  assert.ok(has(s,1,'hand',a));
});

for(const p of [0,1])test('Senju lets the designated player put a card on their own library top '+p,()=>{
  const s=field(),a=put(s,p,SEED),mana=s.players[p].mana[0],foreign=s.players[1-p].mana[0];
  play(s,SENJU);
  pick(s,p);
  assert.equal(s.decision.player,p);
  assert.ok(targets(s).includes(a.uid)&&targets(s).includes(mana.uid)&&!targets(s).includes(foreign.uid));
  const chosen=p===0?mana:a;
  pick(s,chosen.uid);
  assert.equal(s.players[p].deck[0].uid,chosen.uid);
});

test('Mega Kirikiri picks only a face-up creature from its own mana',()=>{
  const s=field(),x=put(s,0,DARK,'mana'),hidden=put(s,0,WATER,'mana'),seed=put(s,0,SEED,'mana');
  hidden.faceDown=true;
  play(s,MEGA);
  assert.ok(targets(s).includes(x.uid)&&targets(s).includes(null));
  assert.ok(!targets(s).includes(hidden.uid)&&!targets(s).includes(seed.uid));
  pick(s,x.uid);
  assert.equal(s.players[0].deck[0].uid,x.uid);
});

for(const yes of [false,true])test('Luna uses Silent Skill in place of untapping '+yes,()=>{
  const s=field(1),x=put(s,0,LUNA),enemy=s.players[1].mana[0];
  x.tapped=true;
  start(s,0);
  assert.equal(s.decision.type,'silent496');
  act(s,'silent496',a=>a.yes===yes);
  if(yes)pick(s,enemy.uid);
  assert.equal(x.tapped,yes);
  assert.equal(has(s,1,'hand',enemy),yes);
  assert.equal(s.phase,'charge');
});

for(const p of [0,1])test('Zent makes the turn player select one own card before drawing '+p,()=>{
  const s=field(1-p),source=put(s,0,ZENT),hand=put(s,p,DARK,'hand'),battle=put(s,p,SEED);
  const enemy=put(s,1-p,FIRE,'hand');
  start(s,p);
  assert.equal(s.decision.player,p);
  assert.ok(targets(s).includes(hand.uid)&&targets(s).includes(battle.uid)&&!targets(s).includes(enemy.uid));
  pick(s,(p?hand:battle).uid);
  assert.ok(has(s,p,'grave',p?hand:battle)&&has(s,0,'battle',source));
  assert.equal(s.players[p].deck.length,25);
});

for(const damama of [false,true])test('Arrow moves an untapped enemy and then checks for Damama '+damama,()=>{
  const s=field(),target=put(s,1,WATER),tapped=put(s,1,FIRE),x=put(s,0,MULTI,'mana');
  tapped.tapped=true;
  if(damama)put(s,0,DAMAMA);
  play(s,ARROW);
  assert.deepEqual(targets(s),[target.uid]);
  pick(s,target.uid);
  if(damama)pick(s,x.uid);
  assert.ok(has(s,1,'mana',target)&&has(s,1,'battle',tapped));
  assert.equal(has(s,0,'hand',x),damama);
});

for(const empty of [false,true])test('Adrak makes both selections before moving either card '+empty,()=>{
  let s=field();
  if(empty)give(s,1,'mana',[]);
  const a=s.players[0].mana[0],b=s.players[1].mana[0];
  play(s,ADRAK);
  const before=physical(s);
  pick(s,a.uid);
  if(!empty){
    assert.ok(has(s,0,'mana',a));
    s=JSON.parse(JSON.stringify(s));
    pick(s,b.uid);
    assert.equal(s.players[1].deck[0].uid,b.uid);
  }
  assert.equal(s.players[0].deck[0].uid,a.uid);
  assert.deepEqual(physical(s),before);
});

test('legal forty CPU match finishes through JSON continuation conserving cards',()=>{
  assert.deepEqual(e.validateDeck(STANDARD581_DECK),[]);
  let s=e.createGame([STANDARD581_DECK,PRESETS[0]],{seed:58101,first:0}),saved=false;
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
