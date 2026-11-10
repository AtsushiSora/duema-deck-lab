import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-807.json',import.meta.url)));
const GLEN="dm24-009",TOBI="dm26-025",MOMO="dm26-055";
const FIRE="dm01-097",NATURE="dm01-108",GUARD="dm01-084",HAND="dm01-027";
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 807 definitions preserve their canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:807}));
  assert.throws(()=>standardCardSpec(detail,{phase:806}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:807}));
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

test('both alternate prints resolve to their original supported deck cards',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 assert.equal(printAliases.length,2);
 for(const print of printAliases){
  assert.equal(print.verification.facesMatched,true);
  assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:807}),cards.find(x=>x.id===print.canonicalId).spec);
  assert.equal(regulationVerification.limits[print.id],e.card(print.canonicalId).limit);
  assert.equal(registry.resolveRows([{id:print.id,count:1}])[0].id,print.canonicalId);
  assert.equal(refs.find(x=>x.id===print.id).image,print.image);
 }
});

const play=(s,x)=>act(s,'play',a=>a.uid===x.uid&&!a.alternative);

for(const [top,multicolor] of [[FIRE,false],['dmrp07-001',false],['dm26-012',true],['dm24bd4-007',true]]){
 test('Glen reveals the top card and only buries a shield for a non-multicolor card '+top,()=>{
  const s=setup(),source=put(s,0,'hand',GLEN),shield=put(s,0,'shields',HAND);
  give(s,0,'deck',[top,NATURE]);
  const before=s.players[0].deck.map(x=>x.uid);
  play(s,source);
  assert.equal(e.effectiveCard(source,s).breaker,2);
  assert.ok(s.log.some(x=>x.type==='reveal'&&x.cardId===GLEN&&x.text.includes(e.card(top).name)));
  if(multicolor)assert.equal(s.decision,null);
  else{
   assert.equal(s.decision?.task?.op,'g34_ShieldGrave');
   pick(s,shield.uid);
  }
  assert.equal(has(s,0,'grave',shield),!multicolor);
  assert.equal(has(s,0,'shields',shield),multicolor);
  assert.equal(s.metrics[0].triggers,0);
  assert.deepEqual(s.players[0].deck.map(x=>x.uid),before);
  assert.deepEqual(s.players[0].g34Protected,[]);
 });
}

test('Glen releases the reveal when no own shield exists',()=>{
 const s=setup(),source=put(s,0,'hand',GLEN);
 give(s,0,'shields',[]);
 give(s,0,'deck',[FIRE,NATURE]);
 play(s,source);
 assert.equal(s.decision,null);
 assert.equal(s.players[0].deck[0].cardId,FIRE);
 assert.deepEqual(s.players[0].g34Protected,[]);
});

for(const accept of [true,false]){
 test('Tobi makes the normal charge tap optional '+accept,()=>{
  const s=setup(),source=put(s,0,'battle',TOBI),charge=put(s,0,'hand',MOMO),enemy=put(s,1,'battle',GUARD);
  s.phase='charge';
  act(s,'charge',a=>a.uid===charge.uid);
  assert.equal(s.decision?.task?.op,'g34_Target');
  assert.equal(s.decision.player,0);
  pick(s,accept?enemy.uid:null);
  assert.ok(has(s,0,'mana',charge)&&charge.tapped);
  assert.equal(enemy.tapped,accept);
  assert.equal(source.tapped,false);
 });
}

test('Tobi triggers for each of two cards put in mana by one spell',()=>{
 const s=setup(),source=put(s,0,'battle',TOBI),ramp=put(s,0,'hand','dmrp16-085');
 const first=put(s,1,'battle',GUARD),second=put(s,1,'battle',FIRE);
 give(s,0,'deck',[FIRE,NATURE,NATURE]);
 const before=s.players[0].mana.length;
 play(s,ramp);
 assert.equal(s.players[0].mana.length,before+2);
 assert.equal(s.decision?.type,'effectOrder');
 const pending=s.pendingEffects.filter(x=>x.source===source.cardId);
 assert.equal(pending.length,2);
 act(s,'orderEffect',a=>a.effectId===pending[0].effectId);
 pick(s,first.uid);
 pick(s,second.uid);
 assert.ok(first.tapped&&second.tapped);
});

for(const redirected of [false,true]){
 test('Tobi observes face-down mana entry but not a move replaced by burial '+redirected,()=>{
  const s=setup(),source=put(s,0,'battle',TOBI),enemy=put(s,1,'battle',GUARD);
  if(redirected)put(s,1,'battle','dm22ex1-086');
  give(s,0,'deck',[FIRE,NATURE]);
  const top=s.players[0].deck[0];
  s.extTasks=[{op:'g34_Ramp',p:0,source:source.cardId,n:1,faceDown:true,tapped:true}];
  e.step(s,e.getLegalActions(s).find(a=>a.kind==='toAttack'));
  if(redirected){
   assert.equal(s.decision,null);
   assert.ok(has(s,0,'grave',top));
   assert.equal(enemy.tapped,false);
  }else{
   assert.equal(s.decision?.task?.op,'g34_Target');
   pick(s,enemy.uid);
   assert.ok(has(s,0,'mana',top)&&top.faceDown);
   assert.equal(enemy.tapped,true);
  }
 });
}

test('Tobi can block and can attack creatures but cannot attack a player',()=>{
 const s=setup(),source=put(s,0,'battle',TOBI),enemy=put(s,1,'battle',FIRE);
 enemy.tapped=true;
 s.phase='attack';
 const attacks=e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===source.uid);
 assert.ok(attacks.some(a=>a.target===enemy.uid));
 assert.ok(attacks.every(a=>a.target!=='player'));
 enemy.tapped=false;
 s.active=1;
 attack(s,enemy.uid);
 act(s,'block',a=>a.uid===source.uid);
 drain(s);
 assert.ok(has(s,0,'battle',source)&&source.tapped);
 assert.ok(has(s,1,'grave',enemy));
});

for(const accept of [true,false]){
 test('Momotaro chooses the temporary breaker before the blocker step '+accept,()=>{
  let s=setup();
  const source=put(s,0,'battle',MOMO);
  put(s,1,'battle',GUARD);
  attack(s,source.uid);
  assert.equal(s.decision?.task?.op,'g34_Offer');
  assert.equal(s.decision.player,0);
  pick(s,accept?true:null);
  assert.equal(s.decision?.type,'block');
  assert.equal(e.effectiveCard(source,s).breaker,accept?2:undefined);
  s=JSON.parse(JSON.stringify(s));
  act(s,'noBlock');
  if(accept){
   assert.equal(s.decision?.count,2);
   act(s,'breakShields');
  }
  drain(s);
  assert.equal(s.players[1].shields.length,accept?3:4);
  assert.equal(has(s,0,'grave',source),accept);
  assert.equal(has(s,0,'battle',source),!accept);
 });
}

for(const blocked of [true,false]){
 test('Momotaro can take the breaker and is destroyed after a creature battle '+blocked,()=>{
  const s=setup(),source=put(s,0,'battle',MOMO),enemy=put(s,1,'battle',GUARD);
  enemy.tapped=!blocked;
  attack(s,source.uid,blocked?'player':enemy.uid);
  pick(s,true);
  act(s,blocked?'block':'noBlock');
  drain(s);
  assert.ok(has(s,1,'grave',enemy));
  assert.ok(has(s,0,'grave',source));
  assert.equal(s.players[1].shields.length,5);
 });
}

test('Momotaro keeps its attack grant through shield triggers and does not die twice',()=>{
 const s=setup(),source=put(s,0,'battle',MOMO);
 give(s,1,'shields',[HAND,NATURE]);
 attack(s,source.uid);
 pick(s,true);
 act(s,'noBlock');
 assert.equal(e.effectiveCard(source,s).breaker,2);
 act(s,'useTrigger');
 drain(s);
 assert.equal(s.players[0].grave.filter(x=>x.uid===source.uid).length,1);
 assert.equal(s.metrics[1].triggers,1);
 assert.ok(!s.attackLifecycle);
});
