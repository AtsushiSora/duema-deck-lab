import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,cast,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-754.json',import.meta.url)));
const KAGU='dmrp05-068',RYU='dm23-004',IDO='dmrp16-093',BIWA='dm26ex4-099';
const WATER='dm01-083',DARK='dm01-090',FIRE='dm01-097',NATURE='dm01-108',BLOCK='dm01-001';
const DRAW='dm06-085',DESTROY='dm01-027',COURTNEY='dm13-015',APUL='dmrp22-042';

function base(){
 const s=setup();
 s.active=0;
 for(const p of [0,1])give(s,p,'deck',Array(24).fill(NATURE));
 return s;
}
function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
function end(s){s.phase='attack';act(s,'endTurn');}
const pick=(s,value)=>act(s,'extended',a=>s.decision.choices[a.choice].value===value);
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();

test('four verified prints keep their canonical IDs, images and restrictions',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:754}));
  assert.throws(()=>standardCardSpec(detail,{phase:753}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:754}));
  for(const [field,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[field],value);
  assert.deepEqual(data.cards.filter(c=>key(c.name)===key(row.name)).map(c=>c.id),[row.id]);
  assert.ok(row.verification.facesMatched);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:row.id,count:1});
  assert.deepEqual(catalogue.resolveRows(deck.cards),deck.cards);
  assert.deepEqual(e.validateDeck(deck),[]);
 }
});

test('Kagutts gains its own unblocked attack and cannot be attacked until the next own turn',()=>{
 const s=base(),kagu=put(s,0,'battle',KAGU),enemy=put(s,1,'battle',BLOCK);
 s.active=1;
 cast(s,DRAW);
 assert.ok(!e.effectiveCard(kagu,s).cannotBeAttacked);
 s.active=0;
 cast(s,WATER);
 assert.ok(!e.effectiveCard(kagu,s).unblockable);
 cast(s,DRAW);
 assert.ok(e.effectiveCard(kagu,s).cannotBeAttacked);
 assert.ok(!e.effectiveCard(s.players[0].battle.at(-1),s).unblockable);
 attack(s,kagu.uid);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===enemy.uid));
 drain(s);
 assert.equal(s.players[1].shields.length,4);
 end(s);
 s.phase='attack';
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.target===kagu.uid));
 end(s);
 assert.ok(!e.effectiveCard(kagu,s).cannotBeAttacked);
 assert.ok(!e.effectiveCard(kagu,s).unblockable);
});

test('Ryugaraizer returns after an opponent spell, with no trigger from an own spell',()=>{
 const s=base(),ryu=put(s,0,'battle',RYU);
 assert.equal(e.effectiveCard(ryu,s).breaker,2);
 cast(s,DRAW);
 assert.ok(has(s,0,'battle',ryu));
 s.active=1;
 const all=physical(s);
 const spell=put(s,1,'hand',DRAW);
 act(s,'play',a=>a.uid===spell.uid);
 assert.equal(s.players[1].hand.length,2);
 assert.ok(has(s,0,'hand',ryu));
 assert.ok(!has(s,0,'battle',ryu));
 assert.deepEqual(physical(s),[...all,spell.uid].sort());
});

test('Demon Hand resolves before Ryugaraizer and can destroy it before it returns',()=>{
 const s=base(),ryu=put(s,0,'battle',RYU);
 s.active=1;
 cast(s,DESTROY);
 assert.ok(has(s,0,'battle',ryu));
 assert.equal(s.decision.type,'effect');
 act(s,'effect',a=>a.targets?.[0]?.uid===ryu.uid);
 drain(s);
 assert.ok(has(s,0,'grave',ryu));
 assert.ok(!has(s,0,'hand',ryu));
});

test('Idokorogawari snapshots the tapped state before untap and resolves after it',()=>{
 const s=base(),first=put(s,0,'battle',IDO,{tapped:true}),second=put(s,0,'battle',IDO,{tapped:true});
 const idle=put(s,0,'battle',IDO);
 const all=physical(s);
 end(s);
 assert.ok(has(s,0,'battle',first)&&first.tapped);
 end(s);
 assert.equal(s.decision.type,'effectOrder');
 assert.ok(!first.tapped&&!second.tapped);
 act(s,'orderEffect',a=>s.pendingEffects.some(x=>x.effectId===a.effectId&&x.uid===second.uid));
 drain(s);
 assert.ok(has(s,0,'grave',first)&&has(s,0,'grave',second));
 assert.ok(has(s,0,'battle',idle));
 assert.equal(s.players[0].hand.length,5);
 assert.deepEqual(physical(s),all);
});

test('Biwa can decline or recover from tapped multicolor mana after restoring the choice',()=>{
 for(const accept of [false,true]){
  let s=base();
  const biwa=put(s,0,'grave',BIWA);
  give(s,0,'mana',[]);
  put(s,0,'mana',BIWA,{tapped:true,skipUntap:true});
  const all=physical(s);
  end(s);
  assert.ok(has(s,0,'grave',biwa));
  end(s);
  assert.match(s.decision.title,/墓地から手札/);
  s=JSON.parse(JSON.stringify(s));
  pick(s,accept?true:null);
  assert.equal(has(s,0,'hand',biwa),accept);
  assert.equal(has(s,0,'grave',biwa),!accept);
  assert.equal(s.players[0].hand.length,accept?2:1);
  assert.deepEqual(physical(s),all);
 }
});

test('Biwa requires both civilizations, uses Courtney’s continuous effect and respects Apul',()=>{
 for(const [colorCards,courtney,apul,offered] of [
  [[DARK],false,false,false],[[FIRE],false,false,false],[[DARK,FIRE],false,false,true],
  [[NATURE],true,false,true],[[],true,false,false],[[DARK,FIRE],false,true,false]
 ]){
  const s=base(),biwa=put(s,0,'grave',BIWA);
  give(s,0,'mana',colorCards);
  if(courtney)put(s,0,'battle',COURTNEY);
  if(apul)put(s,1,'battle',APUL);
  s.active=1;
  end(s);
  assert.equal(s.decision?.type==='extended',offered);
  if(offered)pick(s,true);
  assert.equal(has(s,0,'hand',biwa),offered);
 }
 const s=base(),biwa=put(s,0,'grave',BIWA);
 give(s,0,'mana',[DARK]);
 put(s,0,'mana',FIRE,{faceDown:true});
 s.active=1;
 end(s);
 assert.equal(s.decision,null);
 assert.ok(has(s,0,'grave',biwa));
});

test('Biwa evaluates the mana condition when its turn-start effect resolves',()=>{
 for(const rampFirst of [true,false]){
  const s=base(),biwa=put(s,0,'grave',BIWA),ramp=put(s,0,'battle','dm28-036');
  give(s,0,'mana',[DARK]);
  give(s,0,'deck',[FIRE,...Array(10).fill(NATURE)]);
  s.active=1;
  end(s);
  const first=rampFirst?ramp:biwa;
  act(s,'orderEffect',a=>s.pendingEffects.some(x=>x.effectId===a.effectId&&x.uid===first.uid));
  pick(s,true);
  if(rampFirst)pick(s,true);
  assert.equal(has(s,0,'hand',biwa),rampFirst);
  assert.ok(s.players[0].mana.some(x=>x.cardId===FIRE));
 }
});

test('a newly summoned Biwa has Speed Attacker',()=>{
 const s=base();
 cast(s,BIWA);
 const x=s.players[0].battle[0];
 assert.equal(x.entered,s.turn);
 s.phase='attack';
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target==='player'));
});
