import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-603.json',import.meta.url)));
const GENESIS='dm25rp4-048', SUISEN='dm24rp4-048', FLEUR='dmrp05-093', ORA='dmrp08-057', GEO='dmr01-110';
const WATER='dm01-083', LIGHT='dm01-075', JOKER='dmrp18-093', SEED='dmrp22-025', HIGH='dm02-002';
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const values=s=>s.decision.choices.map(o=>o.value?.uid??o.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);

function field(active=0){
 const s=setup();
 s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(12).fill(WATER));
 return s;
}

function place(s,p,z,id){
 const x=inst(id);
 s.players[p][z].push(x);
 return x;
}

function play(s,id){
 const x=place(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}

for(const row of cards)test(row.name+' matches its official printing and compiled effects',()=>{
 const detail=details.cards.find(c=>c.id===row.id),c=e.card(row.id);
 assert.deepEqual(detail.faces,row.faces);
 assert.deepEqual(standardCardSpec(detail,{phase:603}),row.spec);
 assert.throws(()=>standardCardSpec(detail,{phase:602}));
 for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
 assert.equal(c.limit,regulationVerification.limits[row.id]);
 assert.equal(CARD_IMAGES[row.id],row.image);
 assert.ok(row.verification.facesMatched);
});

test('ジェネシス ramps before an attack and does not remove an element',()=>{
 const s=field(),target=place(s,1,'battle',SEED),top=s.players[0].deck[0];
 play(s,GENESIS);
 assert.ok(has(s,0,'mana',top)&&has(s,1,'battle',target));
 assert.equal(s.decision,null);
});

test('ジェネシス sees the attack that opened its D・D・D and can target a noncreature element',()=>{
 const s=field(),attacker=place(s,0,'battle',WATER),seed=place(s,1,'battle',SEED),high=place(s,1,'battle',HIGH);
 const top=s.players[0].deck[0],spell=place(s,0,'hand',GENESIS);
 attack(s,attacker.uid);
 act(s,'declareDDD',a=>a.uid===spell.uid);
 act(s,'summonDDD',a=>a.uid===spell.uid&&a.cost===4);
 assert.ok(has(s,0,'mana',top));
 assert.ok(values(s).includes(seed.uid)&&!values(s).includes(high.uid));
 pick(s,seed.uid);
 assert.ok(has(s,1,'mana',seed)&&has(s,1,'battle',high));
});

test('ジェネシス sees the opponent attack when cast as a shield trigger',()=>{
 const s=field(1),attacker=place(s,1,'battle',WATER);
 give(s,0,'shields',[GENESIS]);
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 pick(s,attacker.uid);
 assert.ok(has(s,1,'mana',attacker));
});

test('スイセン can put a six-cost element into mana or add a shield',()=>{
 for(const mode of [0,1]){
  const s=field(),target=place(s,1,'battle',HIGH),top=s.players[0].deck[0];
  play(s,SUISEN);
  pick(s,mode);
  if(mode===0)pick(s,target.uid);
  assert.equal(has(s,1,'mana',target),mode===0);
  assert.equal(has(s,0,'shields',top),mode===1);
 }
});

test('フルール keeps the unselected card on top and cannot look through a deck lock',()=>{
 for(const locked of [false,true]){
  const s=field(),[first,second,third]=s.players[0].deck;
  if(locked)place(s,1,'battle','dmrp07-m01');
  play(s,FLEUR);
  if(!locked){assert.deepEqual(values(s),[first.uid,second.uid]);pick(s,second.uid);}
  assert.equal(s.players[0].deck[0].uid,first.uid);
  assert.equal(s.players[0].deck[locked?2:1].uid,third.uid);
  assert.equal(has(s,0,'mana',second),!locked);
 }
});

test('オラオラ draws only after a Joker actually reaches the mana zone',()=>{
 for(const [topId,redirected] of [[JOKER,false],[WATER,false],[JOKER,true]]){
  const s=field();
  give(s,0,'deck',[topId,LIGHT,WATER,WATER]);
  const [top,next]=s.players[0].deck;
  if(redirected)place(s,1,'battle','dm22ex1-086');
  play(s,ORA);
  assert.ok(has(s,0,redirected?'grave':'mana',top));
  assert.equal(has(s,0,'hand',next),topId===JOKER&&!redirected);
 }
});

test('ジオ・ブロンズ offers the draw for Light or Fire and leaves it optional',()=>{
 for(const [topId,accept] of [[LIGHT,true],['dm01-097',false],[WATER,false]]){
  const s=field();
  give(s,0,'deck',[topId,LIGHT,WATER,WATER]);
  const [top,next]=s.players[0].deck;
  play(s,GEO);
  if(topId!==WATER)pick(s,accept?1:0);
  else assert.equal(s.decision,null);
  assert.ok(has(s,0,'mana',top));
  assert.equal(has(s,0,'hand',next),accept);
 }
});
