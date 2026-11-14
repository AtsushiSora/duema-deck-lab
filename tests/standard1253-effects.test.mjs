import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const ANDRO='dm36-004',STAFF='dmex10-014',ANT='dmr21-045';
const SMALL='dm01-108',BLOCK='dm01-045',AMO='dmrp19-s10',TWIN='dm23bd7-003';
const SAVER='dmr20-065',DRAGON='dm06-s08',GIANT='dm08-019',CHEAP='dm23rp2-024',REVIVE='dmc44-001';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url)));
function field(active=0){
 const s=Object.assign(setup(),{active});
 for(const p of [0,1])give(s,p,'deck',Array(22).fill(SMALL));
 return s;
}
function add(s,p,z,id,fields={}){
 const x=Object.assign(inst(id),fields);
 s.players[p][z].push(x);return x;
}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const values=s=>s.decision?.choices?.map(o=>o.value?.uid??o.value)??[];
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);
const play=(s,x,face=0)=>act(s,'play',a=>a.uid===x.uid&&(a.face||0)===face);
const spent=(s,p=0)=>s.players[p].mana.filter(x=>x.tapped).length;

test('three official prints resolve to distinct existing catalogue IDs with verified text, stats and art',()=>{
 const m=read('tools/support-phase-1253.json'),refs=read('tools/image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[ANDRO,STAFF,ANT]);
 assert.deepEqual(m.printAliases,[]);
 for(const {id,name,faces:[f],image} of m.cards){
  const c=e.card(id);
  assert.deepEqual(cat.resolveRows([{id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
  assert.deepEqual([c.text,c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [f.abilityText,f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  assert.equal(refs.find(x=>x.id===id&&x.canonicalId===id)?.image,image);
  assert.equal(CARD_IMAGES[id],image);
 }
});

test('Androlius makes one required bounce per discard and can choose blockers on either side',()=>{
 const s=field(),andro=add(s,0,'battle',ANDRO);
 const own=add(s,0,'battle',BLOCK),enemy=add(s,1,'battle',BLOCK,{cardOwner:0}),remaining=add(s,1,'battle',BLOCK);
 const nonblocker=add(s,1,'battle',SMALL);
 const chips=[add(s,0,'hand',SMALL),add(s,0,'hand',SMALL)],kept=add(s,0,'hand',SMALL);
 attack(s,andro.uid);
 for(const x of chips)pick(s,x.uid);
 pick(s,null);
 assert.deepEqual(new Set(values(s)),new Set([own.uid,enemy.uid,remaining.uid]));
 pick(s,own.uid);
 assert.ok(has(s,0,'battle',own),'no movement before the second choice');
 assert.deepEqual(new Set(values(s)),new Set([enemy.uid,remaining.uid]));
 pick(s,enemy.uid);
 assert.ok(chips.every(x=>has(s,0,'grave',x)));
 assert.ok([kept,own,enemy].every(x=>has(s,0,'hand',x)));
 assert.ok([nonblocker,remaining].every(x=>has(s,1,'battle',x)));
});

test('Androlius chooses a blocker that stays only once and still returns the other blocker',()=>{
 const s=field(),andro=add(s,0,'battle',ANDRO);
 const stays=add(s,1,'battle','dmr21-001'),enemy=add(s,1,'battle',BLOCK);
 const chips=[add(s,0,'hand',SMALL),add(s,0,'hand',SMALL)];
 attack(s,andro.uid);
 for(const x of chips)pick(s,x.uid);
 pick(s,stays.uid);
 assert.deepEqual(values(s),[enemy.uid]);
 pick(s,enemy.uid);
 assert.ok(has(s,1,'battle',stays)&&has(s,1,'hand',enemy));
});

test('Androlius can discard zero and a discard replaced by Amodegoras does not pay for a bounce',()=>{
 for(const replace of [false,true]){
  const s=field(),andro=add(s,0,'battle',ANDRO),x=add(s,0,'hand',SMALL),enemy=add(s,1,'battle',BLOCK);
  if(replace)add(s,0,'battle',AMO);
  attack(s,andro.uid);
  if(replace){
   pick(s,x.uid);
   act(s,'extended',a=>s.decision.choices[a.choice].value?.g1090Mana);
  }else pick(s,null);
  assert.ok(has(s,0,replace?'mana':'hand',x)&&has(s,1,'battle',enemy));
  assert.notEqual(s.decision?.task?.op,'g34_Target');
 }
});

test('Deathtrap Staff moves a Twinpact to the owner’s mana and mills its creature-face cost',()=>{
 const s=field(),f=add(s,0,'hand',STAFF),own=add(s,0,'battle',SMALL);
 const x=add(s,1,'battle',TWIN,{cardOwner:0}),top=s.players[0].deck.slice(0,10);
 play(s,f);
 assert.deepEqual(values(s),[x.uid]);
 pick(s,x.uid);
 assert.ok(has(s,0,'mana',x)&&has(s,0,'battle',own));
 assert.deepEqual(s.players[0].grave.map(y=>y.uid),top.map(y=>y.uid));
 assert.equal(s.players[1].deck.length,22);
});

test('Deathtrap Staff waits for a Dragon Saver, still mills the chosen cost, and does not mill without a target',()=>{
 const s=field(),f=add(s,0,'hand',STAFF),x=add(s,1,'battle',DRAGON),saver=add(s,1,'battle',SAVER);
 play(s,f);pick(s,x.uid);
 assert.equal(s.players[0].deck.length,22);
 act(s,'replaceUltra',a=>a.uid===saver.uid);drain(s);
 assert.ok(has(s,1,'battle',x)&&has(s,1,'grave',saver));
 assert.equal(s.players[0].deck.length,22-e.card(DRAGON).cost);
 const empty=field();play(empty,add(empty,0,'hand',STAFF));
 assert.equal(empty.players[0].deck.length,22);
 assert.equal(empty.decision,null);
});

test('Antoinette discounts only allied Giant summons by up to three, floors the cost, then moves itself to mana',()=>{
 for(const [id,reduction,payment] of [[GIANT,1,3],[GIANT,3,1],[CHEAP,3,1]]){
  const s=field(),ant=add(s,0,'hand',ANT);
  play(s,ant);
  assert.ok(has(s,0,'battle',ant));
  assert.equal(e.summonCost(s,0,e.card(SMALL)),e.card(SMALL).cost);
  assert.equal(e.summonCost(s,1,e.card(GIANT)),e.card(GIANT).cost);
  const before=spent(s),giant=add(s,0,'hand',id);
  play(s,giant);
  assert.ok(values(s).includes(0)&&values(s).includes(3));
  pick(s,reduction);drain(s);
  assert.equal(spent(s)-before,payment);
  assert.ok(has(s,0,'battle',giant)&&has(s,0,'mana',ant));
  assert.equal(ant.tapped,false);
  assert.equal(e.summonCost(s,0,e.card(GIANT)),4);
 }
});

test('Antoinette ignores an opposing Giant and responds to an allied Giant put into play without summoning',()=>{
 const enemy=field(1),w=add(enemy,0,'battle',ANT);
 play(enemy,add(enemy,1,'hand',GIANT));drain(enemy);
 assert.ok(has(enemy,0,'battle',w));
 const s=field(),ant=add(s,0,'battle',ANT),giant=add(s,0,'grave',GIANT);
 play(s,add(s,0,'hand',REVIVE));pick(s,giant.uid);drain(s);
 assert.ok(has(s,0,'battle',giant)&&has(s,0,'mana',ant));
 assert.equal(spent(s),5);
});
