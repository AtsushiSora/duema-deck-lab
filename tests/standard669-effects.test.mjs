import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-669.json',import.meta.url)));

test('Phase 669 validates two complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:669}));
  assert.throws(()=>standardCardSpec(detail,{phase:668}));
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
  if(row.currentPrint){
   assert.deepEqual(row.spec,standardCardSpec({...row.currentPrint,status:'complete'},{phase:669}));
   assert.ok(row.currentPrint.verification.facesMatched);
   assert.ok(!data.cards.some(c=>c.id===row.currentPrint.id));
   deck.cards[0].count--;
   deck.cards.at(-1).count++;
   assert.deepEqual(e.validateDeck(deck),[row.name+'は1枚までです']);
  }
 }
});

const ZERO='dmr10-016',MILK='dm26rp2-033',NAT='dm01-108',ORION='dm01-s04',BIG='dm01-s06',GEN='dmr09-064';
const HAND='dm01-027',HAMMER='dm01-101';
const has=(xs,uid)=>xs.some(x=>x.uid===uid);
const shield=(s,p,id,faceUp=true)=>{
 const x={...inst(id),faceUp};
 s.players[p].shields.push(x);
 return x;
};
const noBlock=s=>{if(s.decision?.type==='block')act(s,'noBlock');};
const legal=s=>e.getLegalActions(s);
const canAttack=(s,x,target)=>legal(s).some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target===target);
const canEnd=s=>legal(s).some(a=>a.kind==='endTurn');

test('Zeroyon forces a creature attack at 6000 or less without making it the first attacker',()=>{
 let s=setup();
 give(s,0,'battle',[ORION,BIG]);
 give(s,1,'battle',[NAT]);
 const [low,big]=s.players[0].battle,[target]=s.players[1].battle;
 s.phase='attack';
 target.tapped=true;
 const root=shield(s,1,NAT,false),source={...inst(ZERO),faceUp:true};
 root.shieldStack=[source];
 assert.ok(canAttack(s,low,target.uid));
 assert.ok(!canAttack(s,low,'player'));
 assert.ok(!canEnd(s));
 assert.ok(canAttack(s,big,target.uid));
 assert.ok(canAttack(s,big,'player'));
 s=JSON.parse(JSON.stringify(s));
 attack(s,big.uid,target.uid);
 noBlock(s);
 assert.ok(has(s.players[1].grave,target.uid));
 assert.ok(canAttack(s,low,'player'));
 assert.ok(canEnd(s));
});

test('Zeroyon uses pre-attack power, requires a legal target, and works only face up against opponents',()=>{
 const s=setup();
 give(s,0,'battle',[GEN]);
 give(s,1,'battle',[NAT]);
 const [attacker]=s.players[0].battle,[target]=s.players[1].battle;
 attacker.powerModifiers=[{amount:4500,expires:'end',who:0}];
 const opposing=shield(s,1,ZERO,false);
 shield(s,0,ZERO);
 s.phase='attack';
 target.tapped=true;
 assert.equal(e.power(attacker,false,s),5500);
 assert.equal(e.power(attacker,true,s),6500);
 assert.ok(canAttack(s,attacker,'player')&&canEnd(s));
 opposing.faceUp=true;
 assert.ok(canAttack(s,attacker,target.uid));
 assert.ok(!canAttack(s,attacker,'player')&&!canEnd(s));
 target.tapped=false;
 assert.ok(canAttack(s,attacker,'player')&&canEnd(s));
 target.tapped=true;
 attacker.entered=s.turn;
 assert.ok(!canAttack(s,attacker,target.uid)&&canEnd(s));
 attacker.entered=0;
 attacker.tapped=true;
 assert.ok(!canAttack(s,attacker,target.uid)&&canEnd(s));
});

test('Zeroyon keeps Guardman, W-Breaker and Shield Go',()=>{
 const s=setup();
 give(s,0,'battle',[BIG]);
 give(s,1,'battle',[ZERO,NAT]);
 const [attacker]=s.players[0].battle,[source,ally]=s.players[1].battle;
 ally.tapped=true;
 assert.equal(e.effectiveCard(source,s).breaker,2);
 attack(s,attacker.uid,ally.uid);
 act(s,'guardman',a=>a.uid===source.uid);
 assert.ok(has(s.players[1].battle,ally.uid));
 assert.equal(s.players[1].shields.find(x=>x.uid===source.uid)?.faceUp,true);
});

test('Milk is forced only when eligible and becomes a face-up shield after destruction',()=>{
 for(const spell of [HAND,HAMMER]){
  let s=setup();
  give(s,0,'hand',[spell]);
  give(s,1,'battle',[NAT,MILK]);
  const [other,milk]=s.players[1].battle;
  act(s,'play',a=>a.cardId===spell);
  const expected=spell===HAND?milk:other;
  assert.deepEqual(legal(s).filter(a=>a.kind==='effect').map(a=>a.targets[0].uid),[expected.uid]);
  s=JSON.parse(JSON.stringify(s));
  act(s,'effect',a=>a.targets[0]?.uid===expected.uid);
  assert.equal(s.players[1].shields.find(x=>x.uid===milk.uid)?.faceUp,spell===HAND?true:undefined);
  assert.equal(has(s.players[1].grave,other.uid),spell===HAMMER);
 }
});

test('Milk does not redirect attacks and goes to the graveyard when its face-up shield breaks',()=>{
 const s=setup();
 give(s,0,'battle',[BIG]);
 give(s,1,'battle',[MILK,NAT]);
 give(s,1,'shields',[]);
 const [attacker]=s.players[0].battle,[milk,other]=s.players[1].battle;
 const source=shield(s,1,MILK);
 s.phase='attack';
 milk.tapped=other.tapped=true;
 assert.ok(canAttack(s,attacker,other.uid));
 attack(s,attacker.uid);
 noBlock(s);
 assert.ok(has(s.players[1].grave,source.uid));
 assert.ok(!has(s.players[1].hand,source.uid));
});
