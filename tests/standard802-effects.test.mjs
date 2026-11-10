import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-802.json',import.meta.url)));
const GATOR="dm24-049",DRAGON="dm24-023",ULTEMIS="dm25-021";
const FIRE="dm01-097",NATURE="dm01-108",DARK="dm01-090",WATER="dm01-083";
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 802 definitions preserve their canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:802}));
  assert.throws(()=>standardCardSpec(detail,{phase:801}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:802}));
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

test('all six Ultemis reprints resolve to the same supported deck card',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 assert.equal(printAliases.length,6);
 for(const print of printAliases){
  assert.equal(print.verification.facesMatched,true);
  assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:802}),cards.find(x=>x.id===ULTEMIS).spec);
  assert.equal(regulationVerification.limits[print.id],e.card(ULTEMIS).limit);
  assert.equal(registry.resolveRows([{id:print.id,count:1}])[0].id,ULTEMIS);
  assert.equal(refs.find(x=>x.id===print.id).image,print.image);
 }
});

const play=(s,x)=>act(s,'play',a=>a.uid===x.uid&&!a.alternative);
const finish=s=>{if(s.decision?.type==='block')act(s,'noBlock');drain(s);};
const choices=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const end=s=>{s.phase='attack';act(s,'endTurn');finish(s);};

for(const lands of [[DARK,NATURE],[DARK,DARK],[NATURE,NATURE],['dmrp13-090',NATURE]]){
 test('Breakable Dragon accepts two distinct eligible mana cards '+lands.join('/'),()=>{
  const s=setup(),dragon=put(s,0,'battle',DRAGON);
  give(s,0,'mana',[...lands,WATER,NATURE,DARK]);
  const [first,second,wrong,tapped,hidden]=s.players[0].mana;
  tapped.tapped=true;
  hidden.faceDown=true;
  const shields=s.players[1].shields.length;
  attack(s,dragon.uid);
  assert.deepEqual(choices(s),[first.uid,second.uid,null]);
  pick(s,first.uid);
  assert.ok(!first.tapped&&!second.tapped);
  assert.deepEqual(choices(s),[second.uid,null]);
  pick(s,second.uid);
  finish(s);
  assert.ok(first.tapped&&second.tapped&&!wrong.tapped&&!hidden.tapped);
  assert.ok(has(s,0,'battle',dragon));
  assert.equal(s.players[1].shields.length,shields-2);
 });
}

for(const shortage of [false,true]){
 test('Breakable Dragon destroys itself before shield breaks with '+(shortage?'insufficient mana':'declined payment'),()=>{
  const s=setup(),dragon=put(s,0,'battle',DRAGON);
  give(s,0,'mana',[DARK,NATURE,WATER]);
  const [first,second]=s.players[0].mana;
  second.tapped=shortage;
  attack(s,dragon.uid);
  if(!shortage){pick(s,first.uid);pick(s,null);}
  finish(s);
  assert.ok(has(s,0,'grave',dragon));
  assert.ok(!first.tapped);
  assert.equal(second.tapped,shortage);
  assert.equal(s.players[1].shields.length,5);
 });
}

test('Death Gator becomes unblockable for the turn after choosing two water cards',()=>{
 const s=setup(),gator=put(s,0,'battle',GATOR);
 const blocker=put(s,1,'battle','dm01-011');
 give(s,0,'mana',[WATER,'dm12-032',DARK]);
 const [first,second,wrong]=s.players[0].mana;
 attack(s,gator.uid);
 assert.deepEqual(choices(s),[first.uid,second.uid,null]);
 pick(s,first.uid);
 pick(s,second.uid);
 assert.ok(first.tapped&&second.tapped&&!wrong.tapped);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'));
 finish(s);
 assert.ok(has(s,1,'battle',blocker));
 assert.equal(s.players[1].shields.length,4);
 assert.equal(e.effectiveCard(gator,s).unblockable,true);
 end(s);
 assert.equal(!!e.effectiveCard(gator,s).unblockable,false);
});

test('Death Gator can decline payment and its Slayer destroys the stronger blocker',()=>{
 const s=setup(),gator=put(s,0,'battle',GATOR);
 const blocker=put(s,1,'battle','dm01-011');
 give(s,0,'mana',[WATER,WATER,DARK]);
 attack(s,gator.uid);
 pick(s,null);
 act(s,'block',a=>a.uid===blocker.uid);
 finish(s);
 assert.ok(has(s,0,'grave',gator)&&has(s,1,'grave',blocker));
 assert.ok(s.players[0].mana.every(x=>!x.tapped));
 assert.equal(s.players[1].shields.length,5);
});

for(const mode of ['ordinary spell','twinpact spell','decline','no match']){
 test('Ultemis searches its own deck only on destruction and shuffles after '+mode,()=>{
  let s=setup();
  s.active=1;
  const source=put(s,0,'battle',ULTEMIS),kill=put(s,1,'hand','dm01-027');
  const IDs=['dm23sp1-008','dm24-049','dm01-083','dm01-097','dm01-108'];
  if(mode!=='no match')IDs.push('dm26-012','dm23rp3-013');
  give(s,0,'deck',IDs);
  const initialSeed=s.rng;
  play(s,kill);
  act(s,'effect',a=>a.targets?.some(t=>t.uid===source.uid));
  if(mode!=='no match'){
   assert.equal(s.decision.player,0);
   assert.equal(s.decision.task.op,'g34_LookPick');
   const [spell,twin]=s.players[0].deck.slice(-2);
   assert.deepEqual(choices(s),[spell.uid,twin.uid,null]);
   s=JSON.parse(JSON.stringify(s));
   pick(s,mode==='decline'?null:mode==='ordinary spell'?spell.uid:twin.uid);
  }
  finish(s);
  assert.ok(has(s,0,'grave',source));
  const expected=mode==='ordinary spell'?'dm26-012':mode==='twinpact spell'?'dm23rp3-013':null;
  assert.deepEqual(s.players[0].hand.map(x=>x.cardId),expected?[expected]:[]);
  const revealed=s.log.filter(x=>x.type==='reveal'&&x.text.includes('ウルテミス'));
  assert.deepEqual(revealed.map(x=>x.cardId),expected?[expected]:[]);
  assert.notEqual(s.rng,initialSeed);
 });
}

test('Ultemis blocks and attacks creatures, and bouncing it does not start a search',()=>{
 const s=setup(),source=put(s,0,'battle',ULTEMIS),enemy=put(s,1,'battle',FIRE);
 enemy.tapped=true;
 s.phase='attack';
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===source.uid).map(a=>a.target),[enemy.uid]);
 s.active=1;
 enemy.tapped=false;
 attack(s,enemy.uid);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===source.uid));
 finish(s);
 s.phase='main';
 const bounce=put(s,1,'hand','dm01-086');
 play(s,bounce);
 act(s,'effect',a=>a.targets?.some(t=>t.uid===source.uid));
 assert.equal(s.decision,null);
 assert.ok(has(s,0,'hand',source));
});
