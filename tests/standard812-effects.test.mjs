import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-812.json',import.meta.url)));
const YES='dm28-011',BABI='dm29-041',HYOU='dm28-072';
const NATURE='dm01-108',BLOCKER='dm01-076',STRONG='dm01-036';
const DESTROY='dm01-027',BOUNCE='dm01-086',TRIGGER='dm06-110';
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 812 definitions preserve their canonical saved deck IDs',()=>{
 assert.equal(cards.length,3);
 assert.deepEqual(printAliases,[]);
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:812}));
  assert.throws(()=>standardCardSpec(detail,{phase:811}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:812}));
  assert.deepEqual(registry.cards.filter(c=>canonicalCardName(c.name)===canonicalCardName(row.name)).map(c=>c.id),[row.id]);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[key],value);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:row.id,count:1});
  deck.cards=registry.resolveRows(deck.cards);
  assert.equal(deck.cards.at(-1).id,row.id);
  assert.deepEqual(e.validateDeck(deck),[]);
 }
});

const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);
const native=(s,x)=>act(s,'effect',a=>a.targets.some(t=>t.uid===x.uid));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();

function shieldFixture(p=0){
 const s=setup();
 give(s,p,'deck',[TRIGGER,NATURE,NATURE]);
 const own=s.players[p];
 return {s,shield:own.shields[1],top:own.deck[0]};
}
function checkPlus(s,p,shield,top){
 const own=s.players[p],group=own.shields.find(x=>x.uid===shield.uid);
 assert.equal(own.shields.length,5);
 assert.equal(group.shieldStack.at(-1).uid,top.uid);
 assert.equal(group.shieldStack.at(-1).faceUp,false);
 assert.ok(!has(s,p,'deck',top));
 assert.ok(!s.log.some(x=>x.type==='reveal'&&x.cardId===top.cardId));
}

test('Yes adds a hidden layer on attack before the opponent chooses a block',()=>{
 let {s,shield,top}=shieldFixture();
 const source=put(s,0,'hand',YES),blocker=put(s,1,'battle',BLOCKER);
 play(s,source);
 assert.equal(s.decision,null);
 source.entered=0;
 const existing=inst(NATURE);
 shield.shieldStack=[existing];
 const before=physical(s);
 attack(s,source.uid);
 assert.equal(s.decision?.task?.op,'g71_Plus');
 s=JSON.parse(JSON.stringify(s));
 pick(s,shield.uid);
 checkPlus(s,0,shield,top);
 assert.deepEqual(s.players[0].shields[1].shieldStack.map(x=>x.uid),[existing.uid,top.uid]);
 assert.equal(s.decision?.type,'block');
 act(s,'block',a=>a.uid===blocker.uid);
 assert.equal(s.players[1].shields.length,5);
 assert.ok(has(s,1,'grave',blocker));
 assert.deepEqual(physical(s),before);
});

test('Yes offers Plus on a creature attack and keeps W-breaker when declining',()=>{
 const {s,top}=shieldFixture();
 const source=put(s,0,'battle',YES),target=put(s,1,'battle',STRONG);
 target.tapped=true;
 attack(s,source.uid,target.uid);
 assert.equal(s.decision?.task?.op,'g71_Plus');
 pick(s,null);
 act(s,'noBlock');
 assert.ok(has(s,1,'grave',target));
 assert.equal(s.players[0].deck[0].uid,top.uid);
 source.tapped=false;
 attack(s,source.uid);
 pick(s,null);
 act(s,'noBlock');
 assert.equal(s.decision?.count,2);
 act(s,'breakShields');
 drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('Babirodem adds a hidden layer after no block and before the shield breaks',()=>{
 const {s,shield,top}=shieldFixture();
 const source=put(s,0,'battle',BABI);
 attack(s,source.uid);
 assert.equal(s.decision?.type,'block');
 act(s,'noBlock');
 assert.equal(s.decision?.task?.op,'g71_Plus');
 assert.equal(s.players[1].shields.length,5);
 pick(s,shield.uid);
 drain(s);
 checkPlus(s,0,shield,top);
 assert.equal(s.players[1].shields.length,4);
});

for(const mode of ['blocked','blocker disappears','creature target'])test('Babirodem preserves its deck when '+mode,()=>{
 const {s,top}=shieldFixture();
 const source=put(s,0,'battle',BABI),blocker=put(s,1,'battle',BLOCKER);
 if(mode==='blocker disappears')blocker.g34Grants=[{turn:s.turn,g178Block:[{op:'SelfDestroy'}]}];
 if(mode==='creature target'){
  blocker.tapped=true;
  attack(s,source.uid,blocker.uid);
  act(s,'noBlock');
 }else{
  attack(s,source.uid);
  act(s,'block',a=>a.uid===blocker.uid);
 }
 assert.equal(s.decision,null);
 assert.equal(s.players[0].deck[0].uid,top.uid);
 assert.equal(s.players[1].shields.length,5);
});

for(const spell of [DESTROY,BOUNCE])test('Hyou distinguishes destruction from returning to hand: '+spell,()=>{
 const {s,shield,top}=shieldFixture();
 const source=put(s,0,'battle',HYOU);
 s.active=1;
 play(s,put(s,1,'hand',spell));
 native(s,source);
 if(spell===DESTROY){
  assert.ok(has(s,0,'grave',source));
  assert.equal(s.decision?.task?.op,'g71_Plus');
  pick(s,shield.uid);
  checkPlus(s,0,shield,top);
 }else{
  assert.ok(has(s,0,'hand',source));
  assert.equal(s.decision,null);
  assert.equal(s.players[0].deck[0].uid,top.uid);
 }
});

test('Hyou can attack creatures, cannot attack the player, and triggers when destroyed as a blocker',()=>{
 const {s,shield,top}=shieldFixture();
 const source=put(s,0,'battle',HYOU),enemy=put(s,1,'battle',STRONG);
 enemy.tapped=true;
 s.phase='attack';
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===source.uid).map(a=>a.target),[enemy.uid]);
 enemy.tapped=false;
 s.active=1;
 attack(s,enemy.uid);
 act(s,'block',a=>a.uid===source.uid);
 assert.ok(has(s,0,'grave',source));
 assert.equal(s.decision?.player,0);
 pick(s,shield.uid);
 checkPlus(s,0,shield,top);
 assert.equal(s.players[0].shields.length,5);
});

test('Babirodem can decline before a direct attack and cannot add without a shield',()=>{
 for(const haveShield of [true,false]){
  const {s,top}=shieldFixture();
  const source=put(s,0,'battle',BABI);
  give(s,1,'shields',[]);
  if(!haveShield)give(s,0,'shields',[]);
  attack(s,source.uid);
  act(s,'noBlock');
  if(haveShield){
   assert.equal(s.winner,null);
   assert.equal(s.decision?.task?.op,'g71_Plus');
   pick(s,null);
  }
  drain(s);
  assert.equal(s.winner,0);
  assert.equal(s.players[0].deck[0].uid,top.uid);
 }
});

test('Breaking a reinforced shield moves the whole group and offers its hidden S Trigger',()=>{
 const {s,shield,top}=shieldFixture();
 const source=put(s,0,'battle',YES),enemy=put(s,1,'battle',NATURE);
 const before=physical(s);
 attack(s,source.uid);
 pick(s,shield.uid);
 act(s,'noBlock');
 act(s,'breakShields');
 drain(s);
 act(s,'endTurn');
 act(s,'skipCharge');
 act(s,'toAttack');
 act(s,'attack',a=>a.uid===enemy.uid&&a.shield===shield.uid);
 act(s,'noBlock');
 assert.equal(s.players[0].shields.length,4);
 assert.ok(has(s,0,'hand',shield));
 assert.equal(s.decision?.type,'trigger');
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='useTrigger'&&a.cardId===top.cardId));
 act(s,'useTrigger');
 drain(s);
 assert.ok(has(s,0,'grave',top));
 assert.deepEqual(physical(s),before);
});
