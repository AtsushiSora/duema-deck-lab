import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-811.json',import.meta.url)));
const RAG='dm28-014',KAORUN='dm28-038',GIANT='dm28-s10';
const FU='dmr21-081',CRISIS='dm02-035',TERRA='sp-020',DRAGON='dm24-s04',NATURE='dm01-108';
const power=(s,x)=>e.power(x,false,s);
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 811 definitions preserve their canonical saved deck IDs',()=>{
 assert.equal(cards.length,3);
 assert.deepEqual(printAliases,[]);
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:811}));
  assert.throws(()=>standardCardSpec(detail,{phase:810}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:811}));
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
const endTurn=s=>{act(s,'toAttack');act(s,'endTurn');};

test('Mana payment alone never enables the three abilities',()=>{
 const s=setup(),rag=put(s,0,'battle',RAG),giant=put(s,0,'battle',GIANT);
 play(s,put(s,0,'hand',KAORUN));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,3);
 assert.equal(power(s,rag),2000);
 assert.equal(power(s,giant),6000);
 endTurn(s);
 assert.equal(s.decision,null);
 assert.equal(s.active,1);
});

test('Simultaneous departures create one Rag trigger per card and a single Giant bonus',()=>{
 let s=setup();
 const rag=put(s,0,'battle',RAG),ignored=put(s,0,'battle',RAG),giant=put(s,0,'battle',GIANT);
 ignored.g35Ignored=s.turn;
 give(s,0,'mana',[NATURE,NATURE,DRAGON]);
 const removed=s.players[0].mana.slice(0,2);
 put(s,1,'battle',DRAGON);
 s.active=1;
 play(s,put(s,1,'hand',TERRA));
 act(s,'evolve');
 assert.ok(removed.every(x=>has(s,0,'grave',x)));
 assert.equal(s.decision?.type,'effectOrder');
 assert.deepEqual(s.pendingEffects.map(x=>x.uid),[rag.uid,rag.uid]);
 assert.equal(power(s,rag),2000);
 assert.equal(power(s,giant),13000);
 s=JSON.parse(JSON.stringify(s));
 drain(s);
 assert.equal(power(s,s.players[0].battle[0]),10000);
 assert.equal(power(s,s.players[0].battle[1]),2000);
 endTurn(s);
 assert.equal(power(s,s.players[0].battle[0]),2000);
 assert.equal(power(s,s.players[0].battle[2]),6000);
});

test('Rag reacts to each later mana summon, with no retroactive boost',()=>{
 const s=setup();
 play(s,put(s,0,'mana',FU));
 const rag=put(s,0,'hand',RAG);
 play(s,rag);
 assert.equal(power(s,rag),2000);
 play(s,put(s,0,'mana',FU));
 assert.equal(power(s,rag),6000);
 play(s,put(s,0,'mana',FU));
 assert.equal(power(s,rag),10000);
});

for(const take of [0,1])test('Late Kaorun offers exactly one top card after multiple departures: '+take,()=>{
 let s=setup();
 play(s,put(s,0,'mana',FU));
 play(s,put(s,0,'mana',FU));
 play(s,put(s,0,'hand',KAORUN));
 const before=s.players[0].mana.length,top=s.players[0].deck[0];
 endTurn(s);
 assert.equal(s.decision?.task?.op,'g34_Ramp');
 assert.deepEqual(s.decision.choices.map(x=>x.value),[0,1]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,take);
 assert.equal(s.players[0].mana.length,before+take);
 assert.equal(has(s,0,'mana',top),!!take);
 assert.equal(s.active,1);
 assert.equal(s.decision,null);
});

test('Kaorun and Giant look at their controller’s mana during the opponent turn',()=>{
 const s=setup(),source=put(s,0,'battle',KAORUN),opponent=put(s,1,'battle',KAORUN);
 const giant=put(s,0,'battle',GIANT),other=put(s,1,'battle',GIANT),mana=s.players[0].mana[0];
 s.active=1;
 play(s,put(s,1,'hand',CRISIS));
 pick(s,mana.uid);
 assert.ok(has(s,0,'grave',mana));
 assert.equal(power(s,giant),13000);
 assert.equal(power(s,other),6000);
 endTurn(s);
 assert.equal(s.decision?.player,0);
 assert.equal(s.decision.task.uid,source.uid);
 pick(s,0);
 assert.equal(s.active,0);
 assert.equal(s.decision,null);
 assert.ok(has(s,1,'battle',opponent));
 assert.equal(power(s,giant),6000);
});

for(const count of [2,3])test('Late Giant can choose its printed W-breaker or its granted T-breaker: '+count,()=>{
 const s=setup();
 play(s,put(s,0,'mana',FU));
 const giant=put(s,0,'hand',GIANT);
 play(s,giant);
 const body=s.players[0].battle.find(x=>x.uid===giant.uid);
 assert.equal(power(s,body),13000);
 const view=e.observation(s,0);
 assert.equal(view.g47ManaLeft[0],s.turn);
 assert.equal(power(view,view.players[0].battle.find(x=>x.uid===giant.uid)),13000);
 body.entered=0;
 attack(s,body.uid);
 act(s,'noBlock');
 assert.equal(s.decision?.task?.op,'g34_GrantedBreaker633');
 assert.deepEqual(s.decision.choices.map(x=>x.value),[2,3]);
 pick(s,count);
 assert.equal(s.decision.count,count);
 act(s,'breakShields');
 drain(s);
 assert.equal(s.players[1].shields.length,5-count);
});

test('A mana evolution base leaving for battle triggers Rag',()=>{
 const s=setup(),rag=put(s,0,'battle',RAG),ida=put(s,0,'hand','dm35-033');
 const base=put(s,0,'mana',NATURE);
 play(s,ida);
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.ok(!has(s,0,'mana',base));
 assert.ok(s.players[0].battle.find(x=>x.uid===ida.uid).under.some(x=>x.uid===base.uid));
 assert.equal(power(s,rag),6000);
});

test('An Apple-protected mana zone never enables any of the abilities',()=>{
 const s=setup(),rag=put(s,0,'battle',RAG),giant=put(s,0,'battle',GIANT);
 put(s,0,'battle',KAORUN);
 put(s,1,'battle','dmrp22-042');
 put(s,1,'battle',DRAGON);
 const mana=s.players[0].mana.map(x=>x.uid);
 s.active=1;
 play(s,put(s,1,'hand',TERRA));
 act(s,'evolve');
 assert.deepEqual(s.players[0].mana.map(x=>x.uid),mana);
 assert.notEqual(s.g47ManaLeft?.[0],s.turn);
 assert.equal(power(s,rag),2000);
 assert.equal(power(s,giant),6000);
 endTurn(s);
 assert.equal(s.decision,null);
 assert.equal(s.active,0);
});
