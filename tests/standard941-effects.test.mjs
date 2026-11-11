import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const BOMB='dm22-032',REPRINT='dmc41-008',GELROOM='dm22-027',RICE='dmx09-008';
const SMALL='dm01-108',MEDIUM='dm01-003',GIANT='dm36-103',HORNET='dm01-066',MULTI='dmr02-054';
const DEVIL='dm19-084',MARINE='dm21-043',ZOMBIE='dm36-087',DUAL='dmr09-057';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
const ids=cards=>cards.map(x=>x.uid);
const find=(s,p,zone,x)=>s.players[p][zone].find(y=>y.uid===x.uid);
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===(value?.uid??value));
const restore=s=>JSON.parse(JSON.stringify(s));

function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}

function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}

function assertDoubleBreak(s,creature){
 const opponent=1-s.active,before=s.players[opponent].shields.length;
 attack(s,creature.uid);
 act(s,'noBlock');
 act(s,'breakShields');
 drain(s);
 assert.equal(s.players[opponent].shields.length,before-2);
}

test('Phase 941 matches full official definitions and resolves the reprint to one battle identity',()=>{
 const m=read('tools/support-phase-941.json'),refs=read('tools/image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[BOMB,GELROOM,RICE]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[[REPRINT,BOMB]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,d={...row,status:'complete'},f=row.faces[0],c=e.card(id);
  const expected=m.cards.find(x=>x.id===id);
  if(!row.canonicalId){
   assert.deepEqual(row.faces,details.cards.find(x=>x.id===id).faces);
   assert.equal(CARD_IMAGES[id],row.image);
  }
  assert.deepEqual(standardCardSpec(d,{phase:941}),expected.spec);
  d.faces=[{...f,abilityText:f.abilityText+'\n未知の能力。'}];
  assert.throws(()=>standardCardSpec(d,{phase:941}));
  for(const [key,value] of Object.entries(expected.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.cost,c.race,e.civilizations(c),c.manaValue,c.limit],[f.cost,f.race,f.civilizations,1,4]);
  if(c.type==='creature')assert.equal(c.power,Number(f.powerText));
  assert.equal(c.supportBatch,'phase-941');
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  assert.equal(cat.resolveRows([{id:row.id,count:1}])[0].id,id);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
 }
 const cards=[REPRINT,GELROOM,RICE,SMALL,MEDIUM,GIANT,MULTI,DEVIL,MARINE,ZOMBIE].map(id=>({id,count:4}));
 assert.deepEqual(e.validateDeck({name:'進化Vとマナ追加',cards:cat.resolveRows(cards)}),[]);
 assert.equal(cat.coverage({cards}).unsupported,0);
});

for(const mode of [0,1])test('Bomber Doll selects one mode and filters by current power and tap state '+mode,()=>{
 let s=setup();
 const small=put(s,1,'battle',SMALL),tapped=put(s,1,'battle',MEDIUM,{tapped:true});
 put(s,1,'battle',MEDIUM);
 put(s,1,'battle',MEDIUM,{tapped:true,powerModifiers:[{amount:1000}]});
 const buffed=put(s,1,'battle',SMALL,{tapped:true,powerModifiers:[{amount:1000}]});
 put(s,1,'battle',SMALL,{tapped:true,justDiverActive:true,entered:s.turn});
 put(s,0,'battle',SMALL,{tapped:true});
 const spell=play(s,BOMB);
 assert.equal(s.decision.task.op,'g34_Choose');
 assert.deepEqual(values(s),[0,1]);
 s=restore(s);
 pick(s,mode);
 assert.deepEqual(new Set(values(s)),new Set(mode?[tapped.uid,buffed.uid]:[small.uid]));
 const target=mode?tapped:small;
 pick(s,target);
 assert.deepEqual(ids(s.players[1].grave),[target.uid]);
 assert.ok(find(s,0,'grave',spell));
 assert.equal(s.decision,null);
});

test('Bomber Doll can choose a mode with zero targets, including as a shield trigger',()=>{
 const s=setup();
 const [shield]=give(s,1,'shields',[BOMB]),attacker=put(s,0,'battle',MEDIUM);
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.uid===shield.uid);
 assert.equal(s.decision.player,1);
 assert.deepEqual(values(s),[0,1]);
 pick(s,0);
 drain(s);
 assert.ok(find(s,0,'battle',attacker)&&find(s,1,'grave',shield));
 assert.equal(s.metrics[1].triggers,1);
});

for(const [firstId,secondId] of [[DUAL,MARINE],[DEVIL,DEVIL],[ZOMBIE,DEVIL]])
 test('Gelroom evolves from two distinct physical creatures and destroys one enemy '+firstId+'/'+secondId,()=>{
  let s=setup();
  const first=put(s,0,'battle',firstId);
  const invalid=put(s,0,'battle',SMALL,{under:[inst(MARINE)]});
  const sealed=put(s,0,'battle',DEVIL,{sealed:true});
  s.players[0].seals.push({...inst(SMALL),faceDown:true,sealOf:sealed.uid});
  const target=put(s,1,'battle',DEVIL),other=put(s,1,'battle',SMALL);
  const evo=put(s,0,'hand',GELROOM);
  assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===evo.uid));
  const second=put(s,0,'battle',secondId);
  act(s,'play',a=>a.uid===evo.uid);
  assert.equal(s.decision.task.op,'g31_Bases');
  assert.deepEqual(new Set(values(s)),new Set([first.uid,second.uid]));
  pick(s,second);
  s=restore(s);
  assert.deepEqual(values(s),[first.uid]);
  pick(s,first);
  const live=find(s,0,'battle',evo);
  assert.deepEqual(ids(live.under),[second.uid,first.uid]);
  assert.ok(find(s,0,'battle',invalid)&&find(s,0,'battle',sealed));
  assert.deepEqual(new Set(values(s)),new Set([target.uid,other.uid]));
  pick(s,target);
  assert.ok(find(s,1,'grave',target)&&find(s,1,'battle',other));
  assertDoubleBreak(s,live);
 });

test('Gelroom retains a tapped base’s state when the opponent has no target',()=>{
 const s=setup(),first=put(s,0,'battle',DEVIL,{tapped:true}),second=put(s,0,'battle',MARINE);
 const evo=play(s,GELROOM);
 pick(s,second);
 pick(s,first);
 assert.equal(find(s,0,'battle',evo).tapped,true);
 assert.equal(s.decision,null);
});

for(const amount of [0,1,2])test('Rice Giant counts itself and Giant Insect when offering optional mana ramp '+amount,()=>{
 let s=setup();
 put(s,0,'battle',HORNET);
 const sealed=put(s,0,'battle',GIANT,{sealed:true});
 s.players[0].seals.push({...inst(SMALL),faceDown:true,sealOf:sealed.uid});
 put(s,1,'battle',GIANT);
 put(s,0,'battle',SMALL,{under:[inst(GIANT)]});
 const top=give(s,0,'deck',[MULTI,SMALL,DEVIL,SMALL]).slice(),before=s.players[0].mana.length;
 const rice=play(s,RICE);
 assert.equal(s.decision.task.op,'g34_Ramp');
 assert.deepEqual(values(s),[0,1,2]);
 assert.ok(s.decision.choices.every(c=>!c.cardId));
 s=restore(s);
 pick(s,amount);
 assert.ok(find(s,0,'battle',rice));
 assert.deepEqual(ids(s.players[0].mana.slice(before)),ids(top.slice(0,amount)));
 assert.deepEqual(ids(s.players[0].deck),ids(top.slice(amount)));
 if(amount)assert.equal(find(s,0,'mana',top[0]).tapped,true);
 if(amount===2)assert.equal(find(s,0,'mana',top[1]).tapped,false);
});

test('Rice Giant respects deck-to-mana replacement and has W-Breaker',()=>{
 const s=setup(),[first,second]=give(s,0,'deck',[MULTI,SMALL,DEVIL]);
 put(s,0,'battle',GIANT);
 put(s,1,'battle','dm22ex1-086');
 const rice=play(s,RICE);
 pick(s,2);
 assert.deepEqual(ids(s.players[0].grave),[first.uid,second.uid]);
 assert.ok(!find(s,0,'mana',first)&&!find(s,0,'mana',second));
 s.turn++;
 assertDoubleBreak(s,rice);
});
