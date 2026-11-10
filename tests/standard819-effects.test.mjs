import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,inst,act,attack,drain,GEN} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-819.json',import.meta.url)));
const DEATH='dm33-047',PEDONA='dm35-035',KIBI='dm31-038';
const NATURE='dm01-108',EVO='dm02-033',NEO='dmrp01-087';
const SAMURAI='dm31-045',GEAR='dm14-110',HEAVY='dmex17-033',METAL='dmex17-059';
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 819 definitions preserve their canonical saved deck IDs',()=>{
 assert.equal(cards.length,3);
 assert.deepEqual(printAliases,[]);
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:819}));
  assert.throws(()=>standardCardSpec(detail,{phase:818}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:819}));
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

test('Deathproof grants Slayer only to other friendly creatures with the right name',()=>{
 const s=setup();
 const source=put(s,0,'hand',DEATH);
 const twin=put(s,0,'battle','dm24bd4-007');
 const similarlyNamed=put(s,0,'battle','dm25rp2-069');
 const enemy=put(s,1,'battle','dm32-057');
 play(s,source);
 assert.ok(e.effectiveCard(twin,s).slayer);
 for(const x of [source,similarlyNamed,enemy])assert.ok(!e.effectiveCard(x,s).slayer);
 const second=put(s,0,'battle',DEATH);
 assert.ok(e.effectiveCard(source,s).slayer);
 assert.equal(e.effectiveCard(twin,s).g208SlayerCount,2);
 second.sealed=true;
 assert.ok(!e.effectiveCard(source,s).slayer);
 source.g35Ignored=s.turn;
 assert.ok(!e.effectiveCard(twin,s).slayer);
});

test('Deathproof Slayer destroys the opposing battle winner',()=>{
 const s=setup();
 put(s,0,'battle',DEATH);
 const attacker=put(s,0,'battle','dm33-045');
 const target=put(s,1,'battle','dm01-036');
 target.tapped=true;
 attack(s,attacker.uid,target.uid);
 if(s.attack&&e.getLegalActions(s).some(a=>a.kind==='noBlock'))act(s,'noBlock');
 drain(s);
 assert.ok(has(s,0,'grave',attacker));
 assert.ok(has(s,1,'grave',target));
});

for(const [mode,stays] of [
 ['empty',false],['own evolution',true],['opposing evolution',false],
 ['NEO without a base',false],['NEO with a base',true],
 ['unlinked God',false],['linked God',true],['sealed evolution',false],['ignored entry',true]
])test('Pedona Nature checks the actual friendly field: '+mode,()=>{
 const s=setup();
 if(['own evolution','opposing evolution','sealed evolution'].includes(mode)){
  const evo=put(s,mode==='opposing evolution'?1:0,'battle',EVO);
  evo.under=[inst(NATURE)];
  if(mode==='sealed evolution'){
   evo.sealed=true;
   const seal=put(s,0,'seals',NATURE);
   seal.sealOf=evo.uid;
   seal.faceDown=true;
  }
 }
 if(mode.startsWith('NEO')){
  const neo=put(s,0,'battle',NEO);
  if(mode==='NEO with a base')neo.under=[inst(NATURE)];
 }
 if(mode.endsWith('linked God')){
  const god=put(s,0,'battle',HEAVY);
  if(mode==='linked God')god.godLinks=[inst(METAL)];
 }
 if(mode==='ignored entry')put(s,1,'battle',GEN);
 const source=put(s,0,'hand',PEDONA);
 play(s,source);
 assert.equal(has(s,0,'battle',source),stays);
 assert.equal(has(s,0,'grave',source),!stays);
});

for(const id of [SAMURAI,GEAR])test('Kibidambowler reveals exactly one eligible card without moving either: '+id,()=>{
 let s=setup();
 const samurai=put(s,0,'hand',SAMURAI);
 const gear=put(s,0,'hand',GEAR);
 const hidden=put(s,0,'hand',NATURE);
 const source=put(s,0,'hand',KIBI);
 play(s,source);
 assert.equal(s.decision.task.op,'g34_HandReveal462');
 assert.deepEqual(s.decision.choices.map(c=>c.value),[samurai.uid,gear.uid,null]);
 assert.deepEqual(e.observation(s,1).players[0].hand,Array.from({length:3},()=>({hidden:true})));
 assert.ok(!('choices' in e.observation(s,1).decision));
 s=JSON.parse(JSON.stringify(s));
 pick(s,id===SAMURAI?samurai.uid:gear.uid);
 assert.equal(s.decision,null);
 assert.deepEqual(s.log.filter(x=>x.type==='reveal').map(x=>x.cardId),[id]);
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),[samurai.uid,gear.uid,hidden.uid]);
 assert.ok(has(s,0,'battle',source));
});

for(const mode of ['empty','only ineligible cards','decline','ignored entry'])test('Kibidambowler resolves without revealing: '+mode,()=>{
 const s=setup();
 if(mode==='only ineligible cards')put(s,0,'hand',NATURE);
 if(mode==='decline')put(s,0,'hand',GEAR);
 if(mode==='ignored entry')put(s,1,'battle',GEN);
 const hand=s.players[0].hand.map(x=>x.uid);
 const source=put(s,0,'hand',KIBI);
 play(s,source);
 if(mode==='decline')pick(s,null);
 assert.equal(s.decision,null);
 assert.ok(!s.log.some(x=>x.type==='reveal'));
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),hand);
 assert.equal(has(s,0,'battle',source),mode==='ignored entry');
 assert.equal(has(s,0,'grave',source),mode!=='ignored entry');
});
