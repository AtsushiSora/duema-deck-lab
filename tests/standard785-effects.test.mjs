import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-785.json',import.meta.url)));
const HIDO="dm24rp2-018",PANE="dm24rp2-009",HAIKU="dm24rp1-017";
const BODY="dm01-108",FIRE="dm01-097",SPELL="dm01-110";
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 785 definitions and alternate prints preserve the canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:785}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:785}));
  assert.deepEqual(registry.cards.filter(c=>canonicalCardName(c.name)===canonicalCardName(row.name)).map(c=>c.id),[row.id]);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[key],value);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
  const prints=printAliases.filter(x=>x.canonicalId===row.id);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:prints[0]?.id??row.id,count:1});
  deck.cards=registry.resolveRows(deck.cards);
  assert.equal(deck.cards.at(-1).id,row.id);
  assert.deepEqual(e.validateDeck(deck),[]);
  for(const print of prints){
   assert.equal(regulationVerification.limits[print.id],regulationVerification.limits[row.id]);
   assert.equal(print.verification.facesMatched,true);
   assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:785}),row.spec);
   assert.equal(registry.get(print.id).id,row.id);
   assert.equal(registry.get(print.id.toLowerCase()).id,row.id);
   assert.equal(refs.find(x=>x.id===print.id.toLowerCase()).image,print.image);
  }
 }
});
const HEAVY='dm01-001',BOUNCE='dm01-086',EINE='dm24rp2-015',NEO='dm25rp2-012';
const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);
const activate=(s,x,donor)=>{act(s,'hyper',a=>a.uid===x.uid);pick(s,donor.uid);};
const end=s=>{s.phase='attack';act(s,'endTurn');};
const choices=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const finishAttack=s=>{
 if(s.decision?.type==='block')act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields');
};
function trigger(s,id,attacker){
 s.active=1;
 give(s,0,'shields',[id]);
 attack(s,attacker.uid);
 finishAttack(s);
 act(s,'useTrigger');
}

test('Hidoanokka’s S-Trigger destroys the chosen enemy for no mana',()=>{
 const s=setup(),attacker=put(s,1,'battle',FIRE),victim=put(s,1,'battle',BODY);
 trigger(s,HIDO,attacker);
 assert.deepEqual(choices(s),[attacker.uid,victim.uid]);
 pick(s,victim.uid);
 assert.ok(has(s,1,'grave',victim)&&has(s,1,'battle',attacker));
 assert.ok(s.players[0].mana.every(x=>!x.tapped));
});

test('Hidoanokka gains W-Breaker and destroys the battle winner with Slayer only while released',()=>{
 for(const hyper of [false,true]){
  const s=setup(),hido=put(s,0,'battle',HIDO),donor=put(s,0,'battle',BODY),enemy=put(s,1,'battle',HEAVY);
  if(hyper)activate(s,hido,donor);
  enemy.tapped=true;
  assert.equal(e.power(hido,false,s),hyper?6000:2000);
  assert.equal(e.effectiveCard(hido,s).breaker,hyper?2:undefined);
  attack(s,hido.uid,enemy.uid);
  finishAttack(s);
  assert.ok(has(s,0,'grave',hido));
  assert.equal(has(s,1,'grave',enemy),hyper);
 }
});

test('Panesco can replace a return to hand with the destruction of a different creature after restoring a pending choice',()=>{
 let s=setup();
 const pane=put(s,0,'battle',PANE),cost=put(s,0,'battle',BODY),sealed=put(s,0,'battle',BODY);
 sealed.sealed=true;
 s.players[0].seals=[{...inst(BODY),faceDown:true,sealOf:sealed.uid}];
 const bounce=put(s,1,'hand',BOUNCE);
 s.active=1;
 play(s,bounce);
 act(s,'effect',a=>a.targets[0].uid===pane.uid);
 assert.equal(s.decision.type,'leaveReplace');
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='replaceAter').map(a=>a.uid),[cost.uid]);
 s=restore(s);
 act(s,'replaceAter',a=>a.uid===cost.uid);
 assert.ok(has(s,0,'battle',pane)&&has(s,0,'battle',sealed)&&has(s,0,'grave',cost));
});

test('Panesco keeps Speed Attacker and W-Breaker in both modes',()=>{
 const s=setup(),pane=put(s,0,'hand',PANE),donor=put(s,0,'battle',BODY);
 play(s,pane);
 for(const hyper of [false,true]){
  if(hyper)activate(s,pane,donor);
  assert.equal(e.power(pane,false,s),hyper?11000:7000);
  assert.equal(e.effectiveCard(pane,s).breaker,2);
  s.phase='attack';
  assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===pane.uid&&a.target==='player'));
  s.phase='main';
 }
});

test('Panesco destroys opposing non-summoned entrants only in Hyper Mode and leaves summons alone',()=>{
 for(const hyper of [false,true]){
  const s=setup(),pane=put(s,0,'battle',PANE),donor=put(s,0,'battle',BODY);
  if(hyper)activate(s,pane,donor);
  end(s);
  act(s,'skipCharge');
  const regular=put(s,1,'hand',FIRE),special=put(s,1,'hand',BODY),spell=put(s,1,'hand',HAIKU);
  play(s,regular);
  play(s,spell);
  pick(s,special.uid);
  pick(s,null);
  assert.ok(has(s,1,'battle',regular));
  assert.equal(has(s,1,'battle',special),!hyper);
  assert.equal(has(s,1,'grave',special),hyper);
 }
});

test('Panesco does not destroy an opposing S-Trigger summon when its Hyper Mode is released',()=>{
 const s=setup(),pane=put(s,0,'battle',PANE),donor=put(s,0,'battle',BODY);
 activate(s,pane,donor);
 give(s,1,'shields',[EINE]);
 const [triggered]=s.players[1].shields;
 attack(s,pane.uid);
 finishAttack(s);
 act(s,'useTrigger');
 assert.ok(has(s,1,'battle',triggered));
});

test('the haiku can deploy the drawn creature and one other eligible creature, then returns both on this turn’s end',()=>{
 let s=setup();
 const spell=put(s,0,'hand',HAIKU),other=put(s,0,'hand',BODY),big=put(s,0,'hand',HEAVY);
 const irrelevant=put(s,0,'battle',BODY);
 give(s,0,'deck',[FIRE,BODY]);
 const drawn=s.players[0].deck[0];
 play(s,spell);
 assert.deepEqual(choices(s),[other.uid,drawn.uid,null]);
 pick(s,drawn.uid);
 s=restore(s);
 pick(s,other.uid);
 assert.ok(has(s,0,'battle',other)&&has(s,0,'battle',drawn));
 assert.ok(has(s,0,'hand',big)&&has(s,0,'grave',spell));
 assert.deepEqual(s.g537Delays[0].defs[0].refs.map(x=>x.uid),[drawn.uid,other.uid]);
 end(s);
 assert.ok(has(s,0,'hand',other)&&has(s,0,'hand',drawn)&&has(s,0,'battle',irrelevant));
 assert.equal(s.active,1);
});

test('the haiku resolves on the enemy turn as a trigger and can choose zero',()=>{
 for(const amount of [0,1]){
  const s=setup(),attacker=put(s,1,'battle',FIRE),ally=put(s,0,'hand',BODY);
  give(s,0,'deck',[HEAVY,BODY,BODY]);
  trigger(s,HAIKU,attacker);
  if(amount)pick(s,ally.uid);
  if(s.decision?.task?.op==='g34_Select')pick(s,null);
  assert.equal(has(s,0,'battle',ally),amount===1);
  end(s);
  assert.ok(has(s,0,'hand',ally));
  assert.equal(s.active,0);
 }
});

test('the haiku can deploy an eligible NEO creature with or without a base and returns the resulting stack',()=>{
 for(const evolve of [false,true]){
  const s=setup(),spell=put(s,0,'hand',HAIKU),neo=put(s,0,'hand',NEO),base=put(s,0,'battle',BODY);
  give(s,0,'deck',[HEAVY,BODY]);
  play(s,spell);
  pick(s,neo.uid);
  if(s.decision?.task?.op==='g34_Select')pick(s,null);
  assert.equal(s.decision.task.op,'g34_Put');
  pick(s,evolve?base.uid:null);
  assert.ok(has(s,0,'battle',neo));
  assert.equal(e.isEvolution(neo),evolve);
  end(s);
  assert.ok(has(s,0,'hand',neo));
  assert.equal(has(s,0,'hand',base),evolve);
 }
});

test('a haiku creature that left and reentered is a different incarnation at turn end',()=>{
 const s=setup(),spell=put(s,0,'hand',HAIKU),ally=put(s,0,'hand',BODY),bounce=put(s,0,'hand',BOUNCE);
 give(s,0,'deck',[HEAVY,BODY]);
 play(s,spell);
 pick(s,ally.uid);
 if(s.decision?.task?.op==='g34_Select')pick(s,null);
 const incarnation=ally.incarnation;
 play(s,bounce);
 act(s,'effect',a=>a.targets[0].uid===ally.uid);
 play(s,ally);
 assert.equal(ally.incarnation,incarnation+1);
 end(s);
 assert.ok(has(s,0,'battle',ally));
});
