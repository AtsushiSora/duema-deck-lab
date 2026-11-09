import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-732.json',import.meta.url)));

test('Phase 732 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:732}));
  assert.throws(()=>standardCardSpec(detail,{phase:731}));
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
  assert.throws(()=>standardCardSpec(incomplete,{phase:732}));
 }
});


const NOCTURNE='dm19-055', ROULETTE='dm11-014', BARRAGE='dm13-018';
const TWIN='dm22ex1-030', SMALL='dm01-108', EQUAL='dm01-048', BIG='dm01-s04';
const HAND='dm01-027', EVO='dm02-s02', QX='dmrp07-m01', GEAR='dm16-026';
const field=()=>Object.assign(setup(),{active:0});
const restore=s=>JSON.parse(JSON.stringify(s));
function put(s,p,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
}
function play(s,id){
 s.players[s.active].hand.push(inst(id));
 act(s,'play',a=>a.cardId===id&&!a.alternative);
}
const pick=(s,v)=>act(s,'extended',a=>s.decision.choices[a.choice].value===v);
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const ids=(s,p,zone)=>s.players[p][zone].map(y=>y.cardId);

test('Barrage reprints resolve to one battle ID and use verified art references',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-732.json',import.meta.url)));
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url)));
 assert.equal(m.printAliases.length,3);
 for(const row of m.printAliases){
  assert.deepEqual(row.faces,cards.find(x=>x.id===BARRAGE).faces);
  assert.equal(row.verification.facesMatched,true);
  assert.equal(catalogue.get(row.id).id,BARRAGE);
  assert.equal(refs.prints.find(x=>x.id===row.id).image,row.image);
  assert.ok(!data.cards.some(c=>c.id===row.id));
 }
 assert.deepEqual(catalogue.resolveRows(m.printAliases.map(row=>({id:row.id,count:1}))),[{id:BARRAGE,count:3}]);
});

for(const name of ['R.S.F.K.','オールイン・チャージャー'])test('Nocturne declares '+name+' before looking and discards all matching copies',()=>{
 let s=field();
 give(s,1,'hand',[TWIN,SMALL,TWIN]);
 play(s,NOCTURNE);
 assert.equal(s.decision.task.op,'g34_Nocturne732');
 assert.ok(!s.decision.task.seen);
 assert.ok(!s.decision.choices.some(c=>c.value==='裏向きのマナ'));
 pick(s,name);
 assert.deepEqual(s.decision.task.seen,[TWIN,SMALL,TWIN]);
 assert.equal(s.decision.task.g223Inspect,true);
 assert.deepEqual(s.decision.task.discardSeen,[true,false,true]);
 assert.ok(!s.log.some(x=>x.type==='reveal'&&x.text.includes('オールイン')));
 s=restore(s);
 pick(s,true);
 assert.deepEqual(ids(s,1,'hand'),[SMALL]);
 assert.deepEqual(ids(s,1,'grave'),[TWIN,TWIN]);
});

test('Nocturne still looks at the hand when the announced name is absent',()=>{
 const s=field();
 give(s,1,'hand',[SMALL]);
 play(s,NOCTURNE);
 pick(s,'デーモン・ハンド');
 assert.deepEqual(s.decision.task.discardSeen,[false]);
 pick(s,true);
 assert.deepEqual(ids(s,1,'hand'),[SMALL]);
});

test('Roulette discards both hands in order and matches either printed cost of a twinpact',()=>{
 for(const number of [3,7]){
  let s=field();
  give(s,0,'hand',[SMALL,TWIN,HAND]);
  give(s,1,'hand',[SMALL,TWIN,HAND]);
  play(s,ROULETTE);
  assert.equal(s.decision.task.op,'g9Number');
  s=restore(s);
  pick(s,number);
  const reveal=s.log.filter(x=>x.type==='reveal');
  assert.deepEqual(reveal.map(x=>x.player),[0,1]);
  assert.ok(s.log.find(x=>x.type==='discard'&&x.player===0).index<reveal[1].index);
  assert.deepEqual(ids(s,0,'hand'),[SMALL,HAND]);
  assert.deepEqual(ids(s,1,'hand'),[SMALL,HAND]);
  assert.deepEqual(ids(s,1,'grave'),[TWIN]);
  assert.equal(s.extLimits?.length||0,0);
 }
});

test('Roulette discards every matching card and accepts a number missing from both hands',()=>{
 for(const number of [2,47]){
  const s=field();
  give(s,0,'hand',[SMALL,HAND,SMALL]);
  give(s,1,'hand',[SMALL,HAND]);
  play(s,ROULETTE);
  const a=e.getLegalActions(s).find(x=>x.kind==='extended');
  e.step(s,{...a,number});
  const reveal=s.log.filter(x=>x.type==='reveal');
  assert.deepEqual(reveal.map(x=>x.player),[0,1]);
  assert.deepEqual(ids(s,0,'hand'),number===2?[HAND]:[SMALL,HAND,SMALL]);
  assert.deepEqual(ids(s,1,'hand'),number===2?[HAND]:[SMALL,HAND]);
  if(number===2)assert.ok(s.log.find(x=>x.type==='discard'&&x.player===0).index<reveal[1].index);
 }
});

test('Roulette can use its S-Trigger in the opponent turn',()=>{
 const s=field(),attacker=put(s,1,SMALL);
 give(s,0,'shields',[ROULETTE]);
 give(s,1,'hand',[SMALL,HAND]);
 s.active=1;
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 assert.equal(s.decision.player,0);
 pick(s,2);
 assert.deepEqual(ids(s,1,'hand'),[HAND]);
 assert.equal(s.metrics[0].triggers,1);
});

for(const reveal of [EVO,TWIN])test('Barrage stops at the first creature face '+reveal+' and destroys only lower power',()=>{
 const s=field(),own=put(s,0,SMALL),weak=put(s,1,SMALL);
 const equal=put(s,1,EQUAL),strong=put(s,0,BIG),gear=put(s,1,GEAR);
 const sealed=put(s,0,SMALL,{sealed:true});
 s.players[0].seals.push({...inst(HAND),faceDown:true,sealOf:sealed.uid});
 give(s,0,'deck',[HAND,reveal,BIG,SMALL]);
 play(s,BARRAGE);
 assert.deepEqual(s.log.filter(x=>x.type==='reveal').map(x=>x.cardId),[HAND,reveal]);
 assert.ok(has(s,0,'grave',own)&&has(s,1,'grave',weak));
 assert.ok(has(s,1,'battle',equal)&&has(s,0,'battle',strong)&&has(s,1,'battle',gear)&&has(s,0,'battle',sealed));
 assert.deepEqual(ids(s,0,'deck'),[BIG,SMALL]);
 assert.ok(ids(s,0,'grave').includes(reveal)&&ids(s,0,'grave').includes(HAND));
 assert.deepEqual(s.players[0].g34Protected,[]);
});

test('Barrage leaves the battlefield intact when no creature is revealed and checks deck-out',()=>{
 const s=field(),small=put(s,1,SMALL);
 give(s,0,'deck',[HAND,ROULETTE]);
 play(s,BARRAGE);
 assert.ok(has(s,1,'battle',small));
 assert.deepEqual(ids(s,0,'deck'),[]);
 assert.equal(s.winner,1);
 assert.ok(ids(s,0,'grave').includes(HAND)&&ids(s,0,'grave').includes(ROULETTE));
});

test('Barrage respects QX and charges tapped as a water/fire card',()=>{
 const s=field();
 put(s,1,QX);
 give(s,0,'deck',[HAND,BIG,SMALL]);
 play(s,BARRAGE);
 assert.deepEqual(ids(s,0,'deck'),[HAND,BIG,SMALL]);
 assert.ok(!s.log.some(x=>x.type==='reveal'));
 s.phase='charge';
 give(s,0,'hand',[BARRAGE]);
 act(s,'charge');
 assert.equal(s.players[0].mana.at(-1).cardId,BARRAGE);
 assert.equal(s.players[0].mana.at(-1).tapped,true);
});

test('Barrage moves the revealed cards after the saved destruction replacement choice',()=>{
 let s=field();
 const lud=put(s,0,'dm10-002');
 put(s,0,'dm25ex2-025',{tapped:true});
 give(s,0,'deck',[HAND,BIG,SMALL]);
 const protectedIds=s.players[0].deck.slice(0,2).map(x=>x.uid);
 play(s,BARRAGE);
 assert.equal(s.decision.type,'leaveReplace');
 assert.deepEqual(s.players[0].g34Protected,protectedIds);
 s=restore(s);
 act(s,'replaceShuffle731');
 assert.ok(has(s,0,'deck',lud));
 assert.deepEqual(s.players[0].g34Protected,[]);
 assert.ok(protectedIds.every(uid=>s.players[0].grave.some(x=>x.uid===uid)));
});

test('Barrage reveals only one card under 曲通風, even if the top card is a spell',()=>{
 const s=field(),wind=put(s,1,'dmrp22-030');
 assert.ok(e.card(wind).g44Tsu);
 give(s,0,'deck',[HAND,EVO,SMALL]);
 play(s,BARRAGE);
 assert.deepEqual(s.log.filter(x=>x.type==='reveal').map(x=>x.cardId),[HAND]);
 assert.deepEqual(ids(s,0,'deck'),[EVO,SMALL]);
 assert.ok(ids(s,0,'grave').includes(HAND)&&has(s,1,'battle',wind));
});

test('Roulette accepts infinity and matches a printed infinite cost',()=>{
 const s=field(),infinite='dmrp15-km1';
 give(s,0,'hand',[infinite,HAND]);
 give(s,1,'hand',[infinite,SMALL]);
 play(s,ROULETTE);
 pick(s,'∞');
 assert.deepEqual(ids(s,0,'hand'),[HAND]);
 assert.deepEqual(ids(s,1,'hand'),[SMALL]);
});

test('Barrage uses the revealed creature printed power outside the battle zone',()=>{
 const s=field(),equal=put(s,1,'dm01-083'),strong=put(s,0,SMALL);
 s.players[1].mana[0].tapped=true;
 give(s,0,'deck',['dm10-046',BIG,SMALL]);
 play(s,BARRAGE);
 assert.ok(has(s,1,'battle',equal)&&has(s,0,'battle',strong));
 assert.deepEqual(ids(s,0,'deck'),[BIG,SMALL]);
});
