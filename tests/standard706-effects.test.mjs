import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-706.json',import.meta.url)));

test('Phase 706 validates four complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:706}));
  assert.throws(()=>standardCardSpec(detail,{phase:705}));
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
  const incomplete=structuredClone(detail);
  incomplete.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(incomplete,{phase:706}));
 }
});

const ANIMO='dm13-055',IRIS='dm07-s01',MAGIN='dm02-003',HALO='dm09-045';
const BODY='dm01-108',LIGHT='dm01-075',DARK='dm01-090',BLOCKER='dm01-076';
const put=(s,p,id,attrs={})=>{
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
};
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,value)=>act(s,'extended',a=>{
 const chosen=s.decision.choices[a.choice].value;
 return (chosen?.uid??chosen)===value;
});
const attacks=(s,x)=>[...new Set(e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===x.uid).map(a=>a.target))];
const blocks=(s,x)=>e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===x.uid);

test('Animotrain compares live shield counts and disables both types of attack only when ahead',()=>{
 const s=setup(),animo=put(s,0,ANIMO),enemy=put(s,1,BODY,{tapped:true});
 s.phase='attack';
 assert.deepEqual(attacks(s,animo),['player',enemy.uid]);
 s.players[1].shields.pop();
 assert.deepEqual(attacks(s,animo),[]);
 s.players[0].shields.pop();
 s.players[0].shields.pop();
 assert.deepEqual(attacks(s,animo),['player',enemy.uid]);
});

test('Animotrain charges tapped as one multicolor mana and normally summons using both civilizations',()=>{
 const s=setup();
 give(s,0,'hand',[ANIMO]);
 give(s,0,'mana',[]);
 const charged=s.players[0].hand[0];
 s.phase='charge';
 act(s,'charge',a=>a.uid===charged.uid);
 assert.ok(s.players[0].mana[0].tapped);
 assert.equal(e.card(charged.cardId).manaValue,1);
 assert.deepEqual(e.card(charged.cardId).civilizations,['闇','自然']);
 give(s,0,'hand',[ANIMO]);
 give(s,0,'mana',[BODY,BODY]);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&a.cardId===ANIMO));
 give(s,0,'mana',[BODY,DARK]);
 act(s,'play',a=>a.cardId===ANIMO);
 assert.ok(s.players[0].mana.every(x=>x.tapped));
 assert.equal(s.players[0].battle[0].cardId,ANIMO);
});

test('Iris gains Blocker immediately after the last shield breaks and can block the next attack',()=>{
 const s=setup(),iris=put(s,1,IRIS),one=put(s,0,BODY),two=put(s,0,BODY);
 give(s,1,'shields',[LIGHT]);
 attack(s,one.uid);
 assert.ok(!blocks(s,iris));
 act(s,'noBlock');
 assert.equal(s.players[1].shields.length,0);
 attack(s,two.uid);
 assert.ok(blocks(s,iris));
 act(s,'block',a=>a.uid===iris.uid);
 assert.ok(has(s,0,'grave',two));
 assert.ok(iris.tapped);
});

for(const accept of [false,true])test('Iris breaks two and can optionally untap with zero shields at own turn end '+accept,()=>{
 let s=setup();
 const iris=put(s,0,IRIS);
 give(s,0,'shields',[]);
 attack(s,iris.uid);
 act(s,'noBlock');
 act(s,'breakShields');
 assert.equal(s.players[1].shields.length,3);
 act(s,'endTurn');
 assert.equal(s.decision.task.op,'g34_Offer');
 s=restore(s);
 pick(s,accept?true:null);
 assert.equal(s.players[0].battle.find(x=>x.uid===iris.uid).tapped,!accept);
 assert.equal(s.active,1);
});

test('Iris cannot untap from its end ability with a shield and cannot use it on the other turn',()=>{
 for(const p of [0,1]){
  const s=setup(),iris=put(s,0,IRIS,{tapped:true});
  if(p)give(s,0,'shields',[]);
  s.active=p;
  s.phase='attack';
  act(s,'endTurn');
  assert.equal(s.decision,null);
  assert.equal(s.active,1-p);
  if(!p)assert.ok(iris.tapped);
 }
});

for(const target of ['player','creature'])test('Magin makes one blind discard before the block step when attacking a '+target,()=>{
 const s=setup(),magin=put(s,0,MAGIN),enemy=put(s,1,BODY,{tapped:true});
 give(s,1,'hand',[DARK,BODY,LIGHT]);
 const hand=s.players[1].hand.map(x=>x.uid);
 const saved=restore(s),attacked=target==='player'?target:enemy.uid;
 for(const game of [s,saved]){
  attack(game,magin.uid,attacked);
  assert.equal(game.players[1].hand.length,2);
  assert.equal(game.players[1].grave.length,1);
  assert.ok(hand.includes(game.players[1].grave[0].uid));
  assert.equal(game.decision.type,'block');
  assert.equal(game.players[1].shields.length,5);
 }
 assert.deepEqual(s.players[1].grave,saved.players[1].grave);
});

test('Magin proceeds to combat when there is no hand to discard',()=>{
 const s=setup(),magin=put(s,0,MAGIN);
 attack(s,magin.uid);
 act(s,'noBlock');
 assert.equal(s.players[1].grave.length,0);
 assert.equal(s.players[1].shields.length,4);
});

test('Halo reprint has the same behavior and no duplicate battle definition',()=>{
 const [print]=printAliases;
 assert.equal(print.canonicalId,HALO);
 assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:706}),cards.find(x=>x.id===HALO).spec);
 assert.equal(regulationVerification.limits[print.id],regulationVerification.limits[HALO]);
 assert.ok(print.verification.facesMatched);
 assert.ok(!data.cards.some(x=>x.id===print.id));
});

test('Halo lets the opponent select and destroy their own creature before the shield breaks',()=>{
 let s=setup();
 const halo=put(s,0,HALO),one=put(s,1,BODY),two=put(s,1,BODY,{justDiverActive:true});
 attack(s,halo.uid);
 act(s,'noBlock');
 assert.equal(s.decision.player,1);
 assert.equal(s.players[1].shields.length,5);
 assert.deepEqual(s.decision.choices.map(c=>c.value?.uid??c.value),[one.uid,two.uid]);
 s=restore(s);
 pick(s,two.uid);
 assert.ok(has(s,1,'grave',two)&&has(s,1,'battle',one));
 assert.equal(s.players[1].shields.length,4);
});

for(const target of ['block','creature','none'])test('Halo skips its sacrifice when blocked or attacking a creature, and can continue if no target exists '+target,()=>{
 const s=setup(),halo=put(s,0,HALO);
 const enemy=target==='none'?null:put(s,1,target==='block'?BLOCKER:BODY,{tapped:target==='creature'});
 const other=target==='none'?null:put(s,1,BODY);
 attack(s,halo.uid,target==='creature'?enemy.uid:'player');
 if(target==='block')act(s,'block',a=>a.uid===enemy.uid);
 else act(s,'noBlock');
 assert.equal(s.decision,null);
 if(other)assert.ok(has(s,1,'battle',other));
 assert.equal(s.players[1].shields.length,target==='none'?4:5);
});
