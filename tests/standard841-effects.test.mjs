import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const BLUE='dmr03-s02',FISTA='dm38-001',GAIA='dmr02-013',PRINT='dmx16-030';
const LAND='dm01-108',LIGHT='dm06-085',HAND='dm01-027',CHARGER='dm23ex2-098';
const BRINGER1='dm33-037',BRINGER2='dm29-038',BRINGER3='dm10-076',EVOLUTION='dm32-073';
const HUNTER='dmd05-003',HASTE='dmr04-048',HUNTER_EVOLUTION='promoy11-009',GRAVE_LOCK='dmrp08-014';
const field=(active=0)=>Object.assign(setup(),{active});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const values=s=>s.decision.choices.map(o=>o.value?.uid??o.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const restore=s=>JSON.parse(JSON.stringify(s));
const attacks=(s,x)=>e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid);
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}
function startTurn(s){
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
 assert.equal(s.active,0);
}

test('Phase 841 pins the three complete official cards and resolves the Great Blue reprint',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-841.json',import.meta.url)));
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[BLUE,FISTA,GAIA]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id);
  assert.deepEqual(row.faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:841}),row.spec);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  const [face]=row.faces;
  assert.deepEqual([c.cost,c.power,c.race],[face.cost,Number(face.powerText),face.race]);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(c.limit,4);
  assert.deepEqual(data.cards.filter(x=>x.name===c.name).map(x=>x.id),[row.id]);
  const unknown=structuredClone(d);
  unknown.faces[0].abilityText+='未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:841}));
 }
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[[PRINT,BLUE]]);
 assert.deepEqual(catalogue.resolveRows([{id:PRINT,count:1},{id:BLUE,count:3}]),[{id:BLUE,count:4}]);
});

for(const trigger of ['entry','attack'])test('Great Blue can cast only the first spell for free on '+trigger,()=>{
 let s=field();
 give(s,0,'deck',[LIGHT,HAND,LAND,LAND]);
 const [spell,firstDraw,secondDraw]=s.players[0].deck;
 const shields=s.players[1].shields.length;
 if(trigger==='entry')play(s,BLUE);
 else attack(s,put(s,0,'battle',BLUE).uid);
 assert.equal(s.decision.player,0);
 assert.deepEqual(values(s),[spell.uid,null]);
 assert.ok(!s.log.some(x=>x.type==='reveal'&&x.cardId===LIGHT));
 s=restore(s);pick(s,spell.uid);drain(s);
 assert.ok(has(s,0,'grave',spell)&&has(s,0,'hand',firstDraw)&&has(s,0,'hand',secondDraw));
 assert.equal(s.players[1].shields.length,shields-(trigger==='attack'?2:0));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,trigger==='entry'?8:0);
});

test('Great Blue leaves the top card in place on decline, a nonspell or a casting restriction',()=>{
 for(const mode of ['decline','nonspell','locked']){
  const s=field();
  if(mode==='locked')put(s,1,'battle','dm04-001');
  give(s,0,'deck',[mode==='nonspell'?LAND:LIGHT,HAND,LAND]);
  const top=s.players[0].deck[0];
  play(s,BLUE);
  assert.deepEqual(s.decision.task.g585Peek.map(x=>x.id),[top.cardId]);
  if(mode!=='decline')assert.deepEqual(values(s),[null]);
  pick(s,null);
  assert.equal(s.decision,null);
  assert.equal(s.players[0].deck[0].uid,top.uid);
  assert.equal(s.players[0].hand.length,0);
 }
});

test('Great Blue casts the spell face of a twinpact and applies its Charger finish',()=>{
 const s=field(),fighter=put(s,0,'battle',LAND);
 give(s,0,'deck',[CHARGER,LAND,LAND]);
 const twin=s.players[0].deck[0];
 play(s,BLUE);
 assert.equal(s.decision.choices[0].value.face,1);
 pick(s,twin.uid);pick(s,fighter.uid);drain(s);
 assert.ok(has(s,0,'mana',twin)&&!has(s,0,'battle',twin)&&!has(s,0,'grave',twin));
});

test('Great Blue casting the last card loses before the spell can resolve (QA43078)',()=>{
 const s=field(),target=put(s,1,'battle',LAND);
 give(s,0,'deck',[HAND]);
 const spell=s.players[0].deck[0];
 play(s,BLUE);
 assert.equal(s.winner,null);
 pick(s,spell.uid);
 assert.equal(s.winner,1);
 assert.equal(s.decision,null);
 assert.equal(s.players[0].deck.length,0);
 assert.ok(has(s,1,'battle',target));
 assert.ok(s.extSpells.some(x=>x.inst.uid===spell.uid));
});

test('Fistacio chooses two individual cost-three Light Bringers, then shuffles (QA36161)',()=>{
 let s=field();
 give(s,0,'deck',[LAND,BRINGER1,GAIA,BRINGER2,FISTA,BRINGER3,EVOLUTION,LAND]);
 const [,one,,two,large,third,evolution]=s.players[0].deck,rng=s.rng;
 attack(s,put(s,0,'battle',FISTA).uid);
 assert.deepEqual(new Set(values(s)),new Set([one.uid,two.uid,third.uid,null]));
 assert.deepEqual(s.decision.task.g585Peek.map(x=>x.id),s.players[0].deck.map(x=>x.cardId));
 pick(s,one.uid);s=restore(s);pick(s,two.uid);drain(s);
 assert.ok(has(s,0,'battle',one)&&has(s,0,'battle',two));
 assert.ok([large,third,evolution].every(x=>has(s,0,'deck',x)));
 assert.equal(s.players[1].shields.length,3);
 assert.notEqual(s.rng,rng);
 assert.deepEqual(s.players[0].g34Protected,[]);
});

for(const chosen of [0,1])test('Fistacio may deploy '+chosen+' and still shuffles',()=>{
 const s=field();
 give(s,0,'deck',[BRINGER1,BRINGER2,LAND,LAND]);
 const [one,two]=s.players[0].deck,rng=s.rng;
 attack(s,put(s,0,'battle',FISTA).uid);
 if(chosen)pick(s,one.uid);
 pick(s,null);drain(s);
 assert.equal(has(s,0,'battle',one),!!chosen);
 assert.ok(has(s,0,'deck',two));
 assert.notEqual(s.rng,rng);
 assert.deepEqual(s.players[0].g34Protected,[]);
});

for(const [id,haste] of [[HUNTER,false],[HASTE,true]])test('Gaia Egg hatches the top Hunter at turn start with haste '+haste+' (QA36375)',()=>{
 const s=field(1),egg=put(s,0,'battle',GAIA);
 give(s,0,'deck',[id,LAND,LAND,LAND]);
 const hunter=s.players[0].deck[0];
 startTurn(s);
 assert.ok(has(s,0,'grave',egg)&&has(s,0,'battle',hunter)&&!has(s,0,'grave',hunter));
 s.phase='attack';
 assert.equal(attacks(s,hunter),haste);
});

for(const id of [LAND,HUNTER_EVOLUTION,LIGHT])test('Gaia Egg mills but does not hatch '+id,()=>{
 const s=field(1),egg=put(s,0,'battle',GAIA);
 give(s,0,'deck',[id,LAND,LAND,LAND]);
 const top=s.players[0].deck[0];
 startTurn(s);
 assert.ok(has(s,0,'battle',egg)&&has(s,0,'grave',top));
 s.phase='attack';
 assert.equal(attacks(s,egg),false);
});

test('Gaia Egg still destroys itself when the Hunter cannot leave the graveyard',()=>{
 const s=field(1),egg=put(s,0,'battle',GAIA);
 put(s,1,'battle',GRAVE_LOCK);
 give(s,0,'deck',[HUNTER,LAND,LAND,LAND]);
 const hunter=s.players[0].deck[0];
 startTurn(s);
 assert.ok(has(s,0,'grave',egg)&&has(s,0,'grave',hunter));
 assert.ok(!has(s,0,'battle',hunter));
});

test('Great Blue resolves the last spell under a continuous deck-loss prevention effect',()=>{
 const s=field(),target=put(s,1,'battle',LAND);
 put(s,0,'battle','dmrp20-s10');
 give(s,0,'deck',[HAND]);
 const spell=s.players[0].deck[0];
 play(s,BLUE);
 pick(s,spell.uid);
 act(s,'effect',a=>a.targets.some(t=>t.uid===target.uid));
 drain(s);
 assert.equal(s.winner,null);
 assert.ok(has(s,1,'grave',target)&&has(s,0,'grave',spell));
});

test('Gaia Egg loses after milling the last card before destroying itself or deploying the Hunter',()=>{
 const s=field(1),egg=put(s,0,'battle',GAIA);
 give(s,0,'deck',[HUNTER]);
 const hunter=s.players[0].deck[0];
 startTurn(s);
 assert.equal(s.winner,1);
 assert.ok(has(s,0,'battle',egg)&&has(s,0,'grave',hunter));
});

test('Private library inspection is projected only for the viewer even without any selectable card',async()=>{
 const {projectRoom}=await import('../server/duel-core.mjs');
 for(const id of [BLUE,FISTA]){
  const s=field(),secret='dm01-079';
  give(s,0,'deck',[secret,LAND]);
  if(id===BLUE)play(s,BLUE);
  else attack(s,put(s,0,'battle',FISTA).uid);
  assert.deepEqual(values(s),[null]);
  const room={game:s,phase:'playing',hostUid:'a',guestUid:'b',profiles:[{name:'A'},{name:'B'}],events:[],expiresAt:10000};
  assert.deepEqual(projectRoom(room,{uid:'a'},1).game.inspectedCards.map(x=>x.id),id===BLUE?[secret]:[secret,LAND]);
  const hidden=projectRoom(room,{uid:'b'},1);
  assert.equal(hidden.game.inspectedCards,undefined);
  assert.ok(!JSON.stringify(hidden).includes(secret));
  pick(s,null);drain(s);
  assert.equal(projectRoom(room,{uid:'a'},1).game.inspectedCards,undefined);
 }
});
