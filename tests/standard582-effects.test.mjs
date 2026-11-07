import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,attack,PRESETS} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';
import {STANDARD582_DECK} from '../tools/fixtures/standard582.mjs';

const {cards}=JSON.parse(readFileSync(new URL('../tools/support-phase-582.json',import.meta.url)));
const ADMIRAL='dm15-s02', EX='dm16-015', PARLOCK='dm38-023', BOMBER='dm02-016', PIPO='dm02-050';
const SKY='dm07-s04', CUERROS='dm03-031', REVOLVER='dmex16-047', BULL='dmx17-008';
const UKAN='dm01-029', RYUSEI='dmx15-s06', SHADOW='dm19-022';
const FIRE='dm01-097', WATER='dm01-083', DARK='dm01-090', DRAGON='dm24bd3-009';

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
function pickCards(s,rows){for(const x of rows)pick(s,x.uid);}

for(const row of cards)test(row.name+' matches the complete verified card and print',()=>{
  const detail=details.cards.find(d=>d.id===row.id),c=e.card(row.id);
  assert.deepEqual(detail.faces,row.faces);
  assert.deepEqual(standardCardSpec(detail,{phase:582}),row.spec);
  assert.throws(()=>standardCardSpec(detail,{phase:581}));
  for(const [key,expected] of Object.entries(row.spec))assert.deepEqual(c[key],expected);
  assert.equal(c.limit,4);
  assert.equal(c.manaValue,1);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.ok(row.verification.facesMatched);
});

for(const [id,keep] of [[EX,3],[REVOLVER,6],[RYUSEI,6]])test(id+' moves excess mana after each owner has picked their own keepers',()=>{
  let s=field();
  give(s,0,'mana',[DARK,...Array(9).fill(FIRE)]);
  give(s,1,'mana',Array(keep+2).fill(WATER));
  const kept0=s.players[0].mana.slice(-keep),kept1=s.players[1].mana.slice(0,keep),hidden=s.players[0].mana[1];
  hidden.faceDown=true;
  if(id===EX)put(s,0,FIRE,'mana');
  play(s,id);
  const before=physical(s);
  assert.equal(s.decision.player,0);
  const hiddenOption=choices(s).find(x=>value(x)===hidden.uid);
  assert.match(hiddenOption.label,/裏向き/);
  assert.equal(hiddenOption.cardId,undefined);
  const length=s.players[0].mana.length;
  pickCards(s,kept0.slice(0,-1));
  assert.equal(s.players[0].mana.length,length);
  pickCards(s,kept0.slice(-1));
  assert.deepEqual(uids(s.players[0].mana),uids(kept0));
  assert.equal(s.decision.player,1);
  s=JSON.parse(JSON.stringify(s));
  pickCards(s,kept1);
  assert.deepEqual(uids(s.players[1].mana),uids(kept1));
  assert.equal(s.players[1].grave.length,2);
  assert.deepEqual(physical(s),before);
});

for(const id of [REVOLVER,RYUSEI])test(id+' taps only mana placed by its opponent',()=>{
  for(const p of [0,1]){
    const s=field(p),x=put(s,p,WATER,'hand');
    put(s,0,id);
    s.phase='charge';
    act(s,'charge',a=>a.uid===x.uid);
    assert.equal(s.players[p].mana.at(-1).uid,x.uid);
    assert.equal(s.players[p].mana.at(-1).tapped,p===1);
    s.phase='main';
    const summoned=play(s,FIRE);
    assert.equal(s.players[p].battle.find(y=>y.uid===summoned.uid).tapped,false);
  }
});

for(const n of [0,1,2,3,4])test('Parlock assigns mana to hand, bottom and top with '+n+' available',()=>{
  const s=field();
  give(s,0,'mana',[WATER,DARK,FIRE,WATER].slice(0,n));
  const picks=s.players[0].mana.slice(0,3),top=s.players[0].deck[0].uid;
  const before=physical(s);
  s.extTasks=[{op:'g34_Sequence',p:0,source:PARLOCK,defs:e.card(PARLOCK).g34Tasks}];
  act(s,'toAttack');
  for(const [i,x] of picks.entries()){
    assert.equal(s.players[0].mana.length,n);
    assert.deepEqual(targets(s),uids(s.players[0].mana.slice(i)));
    pick(s,x.uid);
  }
  assert.equal(s.decision,null);
  assert.deepEqual(uids(s.players[0].hand),uids(picks.slice(0,1)));
  if(n>=2)assert.equal(s.players[0].deck.at(-1).uid,picks[1].uid);
  assert.equal(s.players[0].deck[0].uid,n>=3?picks[2].uid:top);
  assert.equal(s.players[0].mana.length,Math.max(0,n-3));
  assert.deepEqual(physical(s),before);
});

test('Parlock schedules the selections on a normal summon',()=>{
  const s=field();
  const x=play(s,PARLOCK);
  assert.ok(uids(s.players[0].battle).includes(x.uid));
  assert.equal(s.decision.player,0);
  assert.match(s.decision.title,/手札に戻す/);
});

for(const [id,n] of [[BOMBER,2],[PIPO,1]])test(id+' waits for both players to select before moving mana on destruction',()=>{
  const s=field(1),source=put(s,0,id);
  give(s,0,'mana',[DARK]);
  give(s,1,'mana',[WATER,FIRE,DARK]);
  const first=s.players[1].mana.slice(-n),second=s.players[0].mana[0],before=physical(s);
  s.extTasks=[{op:'g34_ExactMove',p:1,source:FIRE,owner:0,target:source.uid,targetIncarnation:0,to:'grave'}];
  act(s,'toAttack');
  assert.equal(s.decision.player,1);
  pickCards(s,first);
  assert.equal(s.players[1].mana.length,3);
  assert.equal(s.decision.player,0);
  pick(s,second.uid);
  assert.deepEqual(uids(s.players[0].grave),[source.uid,second.uid]);
  assert.deepEqual(uids(s.players[1].grave),uids(first));
  assert.deepEqual(physical(s),before);
});

test('Cuerros only offers non-fire and face-down mana on attack',()=>{
  const s=field(),source=put(s,0,CUERROS);
  give(s,0,'mana',[FIRE,RYUSEI,DARK]);
  give(s,1,'mana',[FIRE,WATER]);
  const dark=s.players[0].mana[2],hidden=s.players[1].mana[0];
  hidden.faceDown=true;
  attack(s,source.uid);
  assert.deepEqual(targets(s),[dark.uid]);
  pick(s,dark.uid);
  assert.deepEqual(targets(s),uids(s.players[1].mana));
  pick(s,hidden.uid);
  assert.deepEqual(uids(s.players[0].grave),[dark.uid]);
  assert.deepEqual(uids(s.players[1].grave),[hidden.uid]);
});

test('Admiral and Sky Crusher both act instead of attacking',()=>{
  const s=field(),admiral=put(s,0,ADMIRAL),sky=put(s,0,SKY);
  s.phase='attack';
  const a=s.players[0].mana[0],selected=s.players[1].mana.slice(0,2),b=s.players[1].mana[2];
  act(s,'tapAbility',x=>x.uid===admiral.uid);
  assert.equal(admiral.tapped,true);
  pick(s,1);
  assert.equal(s.decision.player,1);
  pickCards(s,selected);
  assert.deepEqual(uids(s.players[1].hand),uids(selected));
  act(s,'tapAbility',x=>x.uid===sky.uid);
  assert.equal(sky.tapped,true);
  pick(s,a.uid);
  assert.ok(uids(s.players[0].mana).includes(a.uid));
  pick(s,b.uid);
  assert.deepEqual(uids(s.players[0].grave),[a.uid]);
  assert.deepEqual(uids(s.players[1].grave),[b.uid]);
  assert.ok(!s.attack);
});

test('Ukan requires two different own mana cards',()=>{
  const s=field(),a=s.players[0].mana[0],b=s.players[0].mana[1];
  play(s,UKAN);
  assert.deepEqual(targets(s),uids(s.players[0].mana));
  pick(s,a.uid);
  assert.ok(!targets(s).includes(a.uid));
  pick(s,b.uid);
  assert.deepEqual(uids(s.players[0].grave),[a.uid,b.uid]);
});

test('Red Bull makes its opponent keep three mana even after being moved by the effect',()=>{
  const s=field(),bull=put(s,1,BULL);
  bull.under=[inst(DRAGON)];
  give(s,0,'mana',Array(7).fill(WATER));
  const keep=s.players[0].mana.slice(-3);
  play(s,SHADOW);
  pick(s,bull.uid);
  assert.equal(s.decision.player,0);
  pickCards(s,keep);
  assert.deepEqual(uids(s.players[0].mana),uids(keep));
  assert.equal(s.players[0].grave.filter(x=>x.cardId===WATER).length,4);
  assert.ok(uids(s.players[1].hand).includes(bull.uid));
});

test('legal forty CPU match finishes through JSON continuation conserving cards',()=>{
  assert.deepEqual(e.validateDeck(STANDARD582_DECK),[]);
  let s=e.createGame([STANDARD582_DECK,PRESETS[0]],{seed:58201,first:0}),saved=false;
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
