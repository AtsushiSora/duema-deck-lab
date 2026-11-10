import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain,GEN} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-820.json',import.meta.url)));
const DEATH='dm33-027',STERIOS='dm33-022',GOW='dm32-088';
const NATURE='dm01-108',DARK='dm01-090',DEATHPROOF='dm33-047',TWIN='dm24bd4-007';
const KNIGHT_SPELL='dm35-023',BIG='dm01-036',BOUNCE='dm01-086';
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 820 definitions preserve their canonical saved deck IDs',()=>{
 assert.equal(cards.length,3);
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:820}));
  assert.throws(()=>standardCardSpec(detail,{phase:819}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:820}));
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

test('six verified reprint IDs resolve to the three original definitions',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 assert.equal(printAliases.length,6);
 for(const print of printAliases){
  const row=cards.find(x=>x.id===print.canonicalId);
  assert.equal(print.verification.facesMatched,true);
  assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:820}),row.spec);
  assert.equal(regulationVerification.limits[print.id],e.card(row.id).limit);
  assert.equal(registry.resolveRows([{id:print.id,count:1}])[0].id,row.id);
  assert.equal(refs.find(x=>x.id===print.id).image,print.image);
  assert.ok(!data.cards.some(x=>x.id===print.id));
 }
});

for(const mode of ['self','ally','decline','replacement','opponent link','ignored'])test('Deathlaios chooses a friendly Death God before the opponent chooses: '+mode,()=>{
 let s=setup();
 const ally=put(s,0,'battle',TWIN);
 put(s,0,'battle',NATURE);
 const unrelated=put(s,0,'battle','dm25rp2-069');
 put(s,1,'battle',DEATHPROOF);
 const enemy=put(s,1,'battle',mode==='opponent link'?'dmex17-033':BIG);
 enemy.justDiverActive=true;
 if(mode==='opponent link')enemy.godLinks=[inst('dmex17-059')];
 if(mode==='replacement')put(s,1,'battle','dm22rp2-048');
 if(mode==='ignored')put(s,1,'battle',GEN);
 const source=put(s,0,'hand',DEATH);
 play(s,source);
 if(mode==='ignored'){assert.equal(s.decision,null);return;}
 assert.equal(s.decision.task.op,'g34_SacrificeAlly413');
 assert.deepEqual(s.decision.choices.map(c=>c.value?.uid??c.value),[ally.uid,source.uid,null]);
 s=JSON.parse(JSON.stringify(s));
 if(mode==='decline'){pick(s,null);assert.equal(s.decision,null);assert.ok(has(s,1,'battle',enemy));return;}
 const victim=mode==='self'?source:ally;
 pick(s,victim.uid);
 if(mode==='replacement'){
  assert.equal(s.decision.type,'leaveReplace');
  act(s,'g47Replace',a=>a.choice?.replacement==='strato');
  pick(s,ally.uid);
  pick(s,null);
 }
 assert.equal(s.decision.player,1);
 assert.equal(s.decision.task.op,'g34_Select');
 pick(s,enemy.uid);
 drain(s);
 assert.ok(has(s,0,'battle',unrelated));
 assert.equal(has(s,0,'grave',victim),mode!=='replacement');
 if(mode==='replacement')assert.ok(has(s,0,'mana',ally));
 if(mode==='opponent link'){
  assert.equal([enemy,...enemy.godLinks].filter(x=>has(s,1,'grave',x)).length,1);
  assert.equal([enemy,...enemy.godLinks].filter(x=>has(s,1,'battle',x)).length,1);
 }else assert.ok(has(s,1,'grave',enemy));
});

for(const mode of ['add','decline','different name','shield lock','redirect','ignored'])test('Sterios reveals first and only optionally shields a matching card: '+mode,()=>{
 let s=setup();
 const sterios=put(s,0,'battle',STERIOS);
 if(mode==='shield lock')put(s,1,'battle','dmrp22-037');
 if(mode==='redirect')put(s,1,'battle','dm22ex1-086');
 if(mode==='ignored')put(s,1,'battle',GEN);
 const [top,second]=give(s,0,'deck',[mode==='different name'?NATURE:KNIGHT_SPELL,DARK,NATURE]);
 const shields=s.players[0].shields.length;
 attack(s,sterios.uid);
 const reveals=s.log.filter(x=>x.type==='reveal');
 assert.equal(reveals.length,mode==='ignored'?0:1);
 if(reveals.length)assert.ok(reveals[0].text.includes(e.card(top.cardId).name));
 if(['add','decline','redirect'].includes(mode)){
  assert.equal(s.decision.task.op,'g34_Offer');
  s=JSON.parse(JSON.stringify(s));
  pick(s,mode==='decline'?null:true);
 }else assert.equal(s.decision.type,'block');
 if(mode==='add'){
  assert.equal(s.players[0].shields.length,shields+1);
  assert.equal(s.players[0].deck[0].uid,second.uid);
  assert.ok(has(s,0,'shields',top));
  assert.deepEqual(e.observation(s,1).players[0].publicShields,[]);
 }else{
  assert.equal(s.players[0].shields.length,shields);
  assert.equal(s.players[0].deck[0].uid,mode==='redirect'?second.uid:top.uid);
  if(mode==='redirect')assert.ok(has(s,0,'grave',top));
 }
 assert.ok(!s.players[0].g34Protected?.length);
});

for(const baseId of [DARK,TWIN])test('Gowalski evolves from one dark creature in the grave and discards a blind choice on destruction: '+baseId,()=>{
 let s=setup();
 const base=put(s,0,'grave',baseId);
 put(s,0,'grave',NATURE);
 put(s,0,'grave','dm01-103');
 const opponent=put(s,1,'battle',BIG);
 opponent.tapped=true;
 const [first,second]=give(s,1,'hand',[NATURE,DARK]);
 const source=put(s,0,'hand',GOW);
 play(s,source);
 assert.equal(s.decision.task.op,'g31_Bases');
 assert.deepEqual(s.decision.choices.filter(c=>c.cardId).map(c=>c.value),[base.uid]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,base.uid);
 const live=s.players[0].battle.find(x=>x.uid===source.uid);
 assert.deepEqual(live.under.map(x=>x.uid),[base.uid]);
 assert.ok(!has(s,0,'grave',base));
 assert.deepEqual(s.players[1].hand.map(x=>x.uid),[first.uid,second.uid]);
 attack(s,live.uid,opponent.uid);
 act(s,'noBlock');
 assert.equal(s.decision.task.op,'g34_BlindDiscard773');
 assert.equal(s.decision.player,0);
 assert.deepEqual(s.decision.choices.map(c=>[c.value,c.cardId]),[[0,undefined],[1,undefined]]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,1);
 assert.ok(has(s,0,'grave',source)&&has(s,0,'grave',base));
 assert.ok(has(s,1,'hand',first)&&has(s,1,'grave',second));
});

test('Gowalski cannot use a non-dark creature or any creature outside the accessible grave',()=>{
 const s=setup();
 const source=put(s,0,'hand',GOW);
 put(s,0,'battle',DARK);
 put(s,1,'grave',DARK);
 put(s,0,'grave',NATURE);
 assert.ok(!e.getLegalActions(s).some(x=>x.uid===source.uid));
 put(s,0,'grave',DARK);
 assert.ok(e.getLegalActions(s).some(x=>x.uid===source.uid));
 put(s,1,'battle','dmrp22-042');
 assert.ok(!e.getLegalActions(s).some(x=>x.uid===source.uid));
});

test('Gowalski does not discard on a return to hand or when its death ability is ignored',()=>{
 for(const mode of ['bounce','ignored']){
  const s=setup();
  const source=put(s,0,'battle',GOW);
  source.under=[inst(DARK)];
  const held=put(s,1,'hand',NATURE);
  if(mode==='bounce'){
   play(s,put(s,0,'hand',BOUNCE));
   act(s,'effect',a=>a.targets?.some(x=>x.uid===source.uid));
   assert.ok(has(s,0,'hand',source));
  }else{
   put(s,1,'battle',GEN);
   const target=put(s,1,'battle',BIG);
   target.tapped=true;
   attack(s,source.uid,target.uid);
   act(s,'noBlock');
   assert.ok(has(s,0,'grave',source));
  }
  assert.equal(s.decision,null);
  assert.ok(has(s,1,'hand',held));
 }
});
