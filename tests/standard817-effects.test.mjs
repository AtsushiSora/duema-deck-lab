import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-817.json',import.meta.url)));
const INABA='dm31-048',GATE='dm35-023',BAGU='dm30-005',TWIN_INABA='dm23ex2-109';
const KNIGHT='dm31-031',NATURE='dm01-108',WHITE='dm33-021',WHITE_SMALL='dm32-074';
const BOUNDARY='dm32-067',ABOVE='dm01-036',GEAR='dm14-110',SPELL='dm06-085';
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 817 definitions preserve their canonical saved deck IDs',()=>{
 assert.equal(cards.length,3);
 assert.deepEqual(printAliases,[]);
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:817}));
  assert.throws(()=>standardCardSpec(detail,{phase:816}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:817}));
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

const targets=s=>s.decision.choices.map(x=>x.value?.uid??x.value);

test('Inaba and the Twinpact sharing its creature name keep separate canonical identities',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.equal(registry.resolveRows([{id:INABA,count:1}])[0].id,INABA);
 assert.equal(registry.resolveRows([{id:TWIN_INABA,count:1}])[0].id,TWIN_INABA);
 assert.ok(!data.cards.some(x=>x.id===TWIN_INABA));
});

test('Inaba grants Speed Attacker to other allied Knights by exact race',()=>{
 const s=setup(),source=put(s,0,'hand',INABA),knight=put(s,0,'hand',KNIGHT);
 const nightmare=put(s,0,'battle','dmr14-044'),enemy=put(s,1,'battle',KNIGHT);
 play(s,source);
 play(s,knight);
 assert.equal(knight.entered,s.turn);
 assert.ok(!e.effectiveCard(source,s).speedAttacker);
 assert.ok(e.effectiveCard(knight,s).speedAttacker);
 assert.ok(!e.effectiveCard(nightmare,s).speedAttacker&&!e.effectiveCard(enemy,s).speedAttacker);
 act(s,'toAttack');
 const canAttack=x=>e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target==='player');
 assert.ok(canAttack(knight)&&!canAttack(source));
 const second=put(s,0,'battle',INABA);
 second.entered=s.turn;
 assert.ok(canAttack(source)&&canAttack(second));
 second.sealed=true;
 source.g35Ignored=s.turn;
 assert.ok(!canAttack(knight)&&!canAttack(source));
});

for(const mode of ['cast','trigger','decline','miss'])test('White Knight Gate selects only creatures with the name fragment: '+mode,()=>{
 let s=setup();
 const p=mode==='trigger'?1:0,source=inst(GATE);
 const white=mode==='miss'?null:put(s,p,'hand',WHITE),other=put(s,p,'hand',KNIGHT);
 const copy=put(s,p,'hand',GATE);
 const small=mode==='miss'?null:put(s,p,'hand',WHITE_SMALL);
 if(mode==='trigger'){
  const attacker=put(s,0,'battle',NATURE);
  s.players[1].shields=[source];
  attack(s,attacker.uid);
  act(s,'noBlock');
  act(s,'useTrigger');
 }else{
  s.players[0].hand.push(source);
  play(s,source);
 }
 const mana=s.players[p].mana.map(x=>x.tapped);
 if(white){
  assert.deepEqual(targets(s),[white.uid,small.uid,null]);
  s=JSON.parse(JSON.stringify(s));
  pick(s,mode==='decline'?null:white.uid);
  assert.equal(has(s,p,'battle',white),mode!=='decline');
  assert.ok(has(s,p,'hand',small));
 }
 assert.equal(s.decision,null);
 assert.ok(has(s,p,'grave',source)&&has(s,p,'hand',other)&&has(s,p,'hand',copy));
 assert.deepEqual(s.players[p].mana.map(x=>x.tapped),mana);
 if(mode==='trigger')assert.ok(mana.every(tapped=>!tapped));
});

for(const use of [true,false])test('Bagunabone may deploy a visible own creature of at most 3000 power before a double break: '+use,()=>{
 let s=setup();
 const source=put(s,0,'battle',BAGU);
 const [boundary,low,high,gear,spell,hidden,evolution]=give(s,0,'mana',[BOUNDARY,NATURE,ABOVE,GEAR,SPELL,NATURE,'dm02-033']);
 boundary.tapped=true;
 hidden.faceDown=true;
 const enemy=put(s,1,'mana',NATURE);
 attack(s,source.uid);
 assert.deepEqual(targets(s),[boundary.uid,low.uid,null]);
 assert.equal(s.players[1].shields.length,5);
 s=JSON.parse(JSON.stringify(s));
 pick(s,use?boundary.uid:null);
 assert.equal(has(s,0,'battle',boundary),use);
 assert.equal(has(s,0,'mana',boundary),!use);
 assert.ok([low,high,gear,spell,hidden,evolution].every(x=>has(s,0,'mana',x)));
 assert.ok(has(s,1,'mana',enemy));
 if(use)assert.equal(s.players[0].battle.find(x=>x.uid===boundary.uid).summonedTurn,undefined);
 act(s,'noBlock');
 const breaks=e.getLegalActions(s).filter(a=>a.kind==='breakShields');
 assert.ok(breaks.length&&breaks.every(a=>a.shields.length===2));
 act(s,'breakShields');
 assert.equal(s.players[1].shields.length,3);
});

test('Bagunabone may put an eligible evolution on a legal battlefield base without summoning it',()=>{
 const s=setup(),source=put(s,0,'battle',BAGU),base=put(s,0,'battle','dm01-097');
 const evo=put(s,0,'mana','dm02-030');
 const blocked=put(s,0,'mana','dm07-s02');
 const high=put(s,0,'mana',ABOVE);
 give(s,0,'mana',[]);
 s.players[0].mana.push(evo,blocked,high);
 attack(s,source.uid);
 assert.deepEqual(targets(s),[evo.uid,null]);
 pick(s,evo.uid);
 if(s.decision?.task?.op==='g34_Put')pick(s,base.uid);
 const evolved=s.players[0].battle.find(x=>x.uid===evo.uid);
 assert.equal(evolved.under[0].uid,base.uid);
 assert.equal(evolved.summonedTurn,undefined);
 assert.ok(has(s,0,'mana',blocked)&&has(s,0,'mana',high));
 assert.equal(s.decision.type,'block');
});
