import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,cast,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-830.json',import.meta.url)));
const BISHA='dm35-s05',SOLEIL='dm33-001',MOON='dm34-s01';
const LAND='dm01-108',WATER='dm01-083',LIGHT='dm01-075',BLOCK='dm01-076',DRAGON='dm01-s08';
const LIGHT_EVO='dm02-021',NATURE_EVO='dm02-033',LIGHT_NEO='dmrp02-031';
const ON_BLOCKED='dm06-009',BOUNCE='dm01-086',SPELL='dm01-110',SMALL='dm03-054';
function put(s,p,z,id){const x=inst(id);s.players[p][z].push(x);return x;}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const resume=s=>JSON.parse(JSON.stringify(s));

test('Phase 830 matches each official definition and aliases the DMX-19 Eternal Moon',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 assert.deepEqual(cards.map(x=>x.id),[BISHA,SOLEIL,MOON]);
 for(const row of cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),f=d.faces[0];
  assert.deepEqual(row.faces,d.faces);
  assert.deepEqual(row.spec,standardCardSpec(d,{phase:830}));
  assert.throws(()=>standardCardSpec(d,{phase:829}));
  const unknown=structuredClone(d);unknown.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:830}));
  assert.deepEqual([c.name,c.cost,c.power,c.race,c.manaValue??1,c.limit],[f.name,f.cost,Number(f.powerText),f.race,1,4]);
  assert.equal(CARD_IMAGES[row.id],row.image);
  for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:row.id,count:1});
  deck.cards=registry.resolveRows(deck.cards);
  assert.deepEqual(e.validateDeck(deck),[]);
 }
 assert.deepEqual(printAliases.map(x=>x.id),['dmx19-s03']);
 const [print]=printAliases;
 assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:830}),cards.at(-1).spec);
 assert.equal(registry.resolveRows([{id:print.id,count:1}])[0].id,MOON);
 assert.equal(refs.find(x=>x.id===print.id).image,print.image);
 assert.ok(!data.cards.some(x=>x.id===print.id));
 for(const row of [...cards,...printAliases])assert.equal(regulationVerification.limits[row.id],4);
});

test('Bishamon mana-evolves from a visible Nature creature and pays its full own cost',()=>{
 const s=setup();
 const [base,hidden]=give(s,0,'mana',[LAND,LAND,WATER,SPELL,WATER,WATER,WATER]);
 hidden.faceDown=true;
 put(s,0,'battle',LAND);
 cast(s,BISHA);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[base.uid]);
 act(s,'evolve',a=>a.baseUid===base.uid);
 const b=s.players[0].battle.find(x=>x.cardId===BISHA);
 assert.deepEqual(b.under.map(x=>x.uid),[base.uid]);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,e.card(BISHA).cost-1);
 assert.equal(s.decision,null);
});

for(const amount of [0,1,2])test('Bishamon allows a new reduction choice on each Nature summon: '+amount,()=>{
 let s=setup();
 put(s,0,'battle',BISHA);
 const big='dm01-106';
 assert.equal(e.card(big).type,'creature');
 assert.equal(e.summonCost(s,0,e.card(WATER)),e.card(WATER).cost);
 assert.equal(e.summonCost(s,0,e.card(SPELL)),e.card(SPELL).cost);
 cast(s,big);
 assert.deepEqual(new Set(values(s)),new Set([0,1,2,false]));
 s=resume(s);
 pick(s,amount);
 drain(s);
 const n=s.players[0].mana.filter(x=>x.tapped).length;
 assert.equal(n,e.card(big).cost-amount);
 cast(s,SMALL);
 pick(s,2);
 drain(s);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,n+1);
});

test('Soleil evolves from a granted blocker and keeps its own printed Blocker',()=>{
 const s=setup(),ordinary=put(s,0,'battle',LAND),blocker=put(s,0,'battle',BLOCK),sealed=put(s,0,'battle',BLOCK);
 ordinary.g34Grants=[{turn:s.turn,blocker:true}];sealed.sealed=true;
 s.players[0].seals=[{...inst(WATER),sealOf:sealed.uid,faceDown:true}];
 put(s,0,'battle',LAND);
 cast(s,SOLEIL);
 assert.deepEqual(new Set(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid)),new Set([ordinary.uid,blocker.uid]));
 act(s,'evolve',a=>a.baseUid===ordinary.uid);
 const x=s.players[0].battle.find(x=>x.cardId===SOLEIL);
 assert.equal(e.card(x).blocker,true);
 assert.deepEqual(x.under.map(y=>y.uid),[ordinary.uid]);
});

for(const self of [false,true])test('Soleil breaks on an allied or its own block before battle: '+self,()=>{
 let s=setup();
 const attacker=put(s,0,'battle',DRAGON),source=put(s,1,'battle',SOLEIL),blocker=self?source:put(s,1,'battle',BLOCK);
 const target=put(s,1,'battle',LAND);target.tapped=true;
 const [shield]=give(s,0,'shields',[WATER]);
 attack(s,attacker.uid,target.uid);
 act(s,'block',a=>a.uid===blocker.uid);
 assert.equal(s.decision.player,1);
 assert.deepEqual(values(s),[shield.uid]);
 assert.ok(!s.log.some(l=>l.type==='battle'));
 s=resume(s);
 pick(s,shield.uid);
 assert.ok(has(s,0,'hand',shield));
 assert.ok(s.log.some(l=>l.type==='battle'));
});

test('Soleil waits for the active player’s blocked ability and still resolves once if the blocker leaves',()=>{
 let s=setup();
 const attacker=put(s,0,'battle',ON_BLOCKED),source=put(s,1,'battle',SOLEIL),blocker=put(s,1,'battle',BLOCK);
 const [ourShield]=give(s,0,'shields',[WATER]),[theirShield]=give(s,1,'shields',[BOUNCE]);
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===blocker.uid);
 assert.equal(s.decision.player,0);
 pick(s,theirShield.uid);
 act(s,'useTrigger');
 act(s,'effect',a=>a.targets?.[0]?.uid===blocker.uid);
 assert.ok(has(s,1,'hand',blocker));
 assert.equal(s.decision.player,1);
 s=resume(s);
 pick(s,ourShield.uid);
 assert.ok(has(s,0,'hand',ourShield));
 assert.ok(has(s,1,'battle',source));
 assert.ok(!s.log.some(l=>l.type==='battle'));
});

test('Eternal Moon requires a Light evolution, including an evolved Light NEO',()=>{
 const s=setup(),light=put(s,0,'battle',LIGHT_EVO),nature=put(s,0,'battle',NATURE_EVO);
 const neo=put(s,0,'battle',LIGHT_NEO);
 neo.under=[inst(LIGHT)];
 light.under=[inst(LIGHT)];nature.under=[inst(LAND)];
 put(s,0,'battle',LIGHT);
 put(s,0,'battle',LIGHT_NEO);
 put(s,1,'battle',LIGHT_EVO);
 cast(s,MOON);
 assert.deepEqual(new Set(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid)),new Set([light.uid,neo.uid]));
 act(s,'evolve',a=>a.baseUid===neo.uid);
 const moon=s.players[0].battle.find(x=>x.cardId===MOON);
 assert.equal(e.effectiveCard(moon,s).breaker,2);
 assert.equal(moon.under[0].uid,neo.uid);
 assert.equal(moon.under[0].under.length,1);
});

for(const mode of ['tapped no shields','untapped','shield remains','ignored'])test('Eternal Moon restricts only new attacks on the player under its printed conditions: '+mode,()=>{
 const s=setup(),a=put(s,0,'battle',DRAGON),m=put(s,1,'battle',MOON),b=put(s,1,'battle',LAND);
 m.tapped=mode!=='untapped';b.tapped=true;
 if(mode!=='shield remains')give(s,1,'shields',[]);
 if(mode==='ignored')m.g35Ignored=s.turn;
 s.phase='attack';
 const moves=e.getLegalActions(s).filter(x=>x.kind==='attack'&&x.uid===a.uid);
 assert.equal(moves.some(x=>x.target==='player'),mode!=='tapped no shields');
 assert.ok(moves.some(x=>x.target===b.uid));
});

test('Eternal Moon gaining its guard by blocking does not cancel the declared attack',()=>{
 const s=setup(),a=put(s,0,'battle',DRAGON),m=put(s,1,'battle',MOON);
 give(s,1,'shields',[]);
 m.g34Grants=[{turn:s.turn,blocker:true}];
 attack(s,a.uid);
 act(s,'block',x=>x.uid===m.uid);
 assert.ok(m.tapped&&has(s,0,'grave',a));
 assert.ok(s.log.some(l=>l.type==='battle'));
 assert.equal(s.winner,null);
});
