import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const VAL='dm36-029',AMP='dm36-017',ROSE='dm36-088',VC='dm36-088VC';
const BODY='dm01-108',PON='dm36-099',AIN='dm36-100',MIND='dm36-082';
const DEMON='dm01-027',LOCK='dmrp08-014';
function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(12).fill(BODY));
 return s;
}
function add(s,p,zone,id,props){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const play=(s,id)=>{const x=add(s,s.active,'hand',id);act(s,'play',a=>a.uid===x.uid);return x;};
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,x)=>act(s,'extended',a=>values(s)[a.choice]===x.uid);
function destroy(s,x){
 play(s,DEMON);
 act(s,'effect',a=>a.targets.some(t=>t.uid===x.uid));
}

test('Phase 862 registers the whole official cards with their original IDs',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-862.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(row=>row.id),[VAL,AMP,ROSE]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[[VC,ROSE]]);
 assert.deepEqual(registry.resolveRows([{id:VC,count:2},{id:ROSE,count:2}]),[{id:ROSE,count:4}]);
 const ref=m.printAliases[0];
 assert.deepEqual(standardCardSpec({...ref,status:'complete'},{phase:862}),m.cards.find(x=>x.id===ROSE).spec);
 assert.equal(m.regulationVerification.limits[VC],4);
 assert.notEqual(ref.image,CARD_IMAGES[ROSE]);
 assert.ok(!data.cards.some(c=>c.id===VC));
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(d.faces,row.faces);
  assert.deepEqual(standardCardSpec(d,{phase:862}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:861}));
  const unknown=structuredClone(d);
  unknown.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:862}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   ['creature',f.cost,Number.parseInt(f.powerText,10),f.race,f.civilizations,1,4]);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);
  assert.deepEqual(registry.resolveRows([{id:row.id,count:4}]),[{id:row.id,count:4}]);
 }
});

const restore=s=>JSON.parse(JSON.stringify(s));
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const end=s=>{s.phase='attack';act(s,'endTurn');};
function task(s,op,p,options){
 s.phase='main';
 s.extTasks=[{op,p,source:BODY,...options}];
 act(s,'toAttack');
}

function evolve(s,id,base){
 const unit=play(s,id);
 act(s,'evolve',a=>a.uid===unit.uid&&a.baseUid===base.uid);
 return unit;
}
function breakAtPlayer(s,unit,n){
 attack(s,unit.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 act(s,'breakShields',a=>a.shields.length===n);
 assert.equal(s.players[1-s.active].brokenThisTurn,n);
}

test('Valtyson can select itself, gains power and W-Breaker, and expires at turn end (QA 36062)',()=>{
 const s=field(),host=add(s,0,'battle',PON),ally=add(s,0,'battle',AIN);
 add(s,0,'battle',MIND);
 add(s,1,'battle',PON);
 const val=evolve(s,VAL,host);
 assert.deepEqual(new Set(values(s)),new Set([ally.uid,val.uid]));
 pick(s,val);
 assert.equal(e.power(val,false,s),7000);
 assert.equal(e.effectiveCard(val,s).breaker,2);
 breakAtPlayer(s,val,2);
 end(s);
 assert.equal(e.power(val,false,s),4000);
 assert.equal(e.effectiveCard(val,s).breaker,undefined);
});

test('Valtyson only evolves from an allied K Soul and can buff a different K Soul',()=>{
 let s=field();
 const host=add(s,0,'battle',PON),ally=add(s,0,'battle',AIN);
 add(s,0,'battle',MIND);
 add(s,1,'battle',PON);
 const val=play(s,VAL);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[host.uid,ally.uid]);
 act(s,'evolve',a=>a.baseUid===host.uid);
 const before=e.power(ally,false,s);
 s=restore(s);
 pick(s,ally);
 assert.equal(e.power(s.players[0].battle.find(x=>x.uid===ally.uid),false,s),before+3000);
 assert.equal(e.power(s.players[0].battle.find(x=>x.uid===val.uid),false,s),4000);
 breakAtPlayer(s,ally,2);
});

test('Amphibious evolves from M Soul and breaks two shields',()=>{
 const s=field(),base=add(s,0,'battle',MIND);
 add(s,0,'battle',PON);
 add(s,1,'battle',MIND);
 const unit=play(s,AMP);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[base.uid]);
 act(s,'evolve',a=>a.baseUid===base.uid);
 breakAtPlayer(s,unit,2);
});

test('Amphibious triggers for itself or an allied M Soul and the opponent chooses',()=>{
 for(const id of [AMP,MIND]){
  let s=field();
  const choices=[add(s,0,'battle',BODY),add(s,0,'battle',BODY)];
  const amp=add(s,1,'battle',AMP),victim=id===AMP?amp:add(s,1,'battle',MIND);
  destroy(s,victim);
  assert.equal(s.decision.player,0);
  assert.deepEqual(values(s),choices.map(x=>x.uid));
  s=restore(s);
  pick(s,choices[1]);
  assert.ok(has(s,0,'hand',choices[1]));
  assert.ok(has(s,0,'battle',choices[0]));
  assert.equal(s.decision,null);
 }
});

test('Amphibious sees only itself when also destroyed, and both allies when it remains (rule 603.5d)',()=>{
 for(const includeSource of [true,false]){
  const s=field();
  for(let i=0;i<3;i++)add(s,0,'battle',BODY);
  const amp=add(s,1,'battle',AMP);
  for(let i=0;i<2;i++)add(s,1,'battle',MIND);
  task(s,'g34_Sweep',0,{to:'grave',filter:{creature:true},excludeUid:includeSource?undefined:amp.uid});
  assert.equal(has(s,1,'grave',amp),includeSource);
  drain(s);
  assert.equal(s.players[0].hand.length,includeSource?1:2);
 }
});

test('Amphibious ignores opponents, non-M allies and moves that are not destruction',()=>{
 for(const [owner,id,to] of [[0,MIND,'grave'],[1,PON,'grave'],[1,MIND,'hand'],[1,MIND,'graveWithoutDestroy']]){
  const s=field(),amp=add(s,1,'battle',AMP);
  add(s,0,'battle',BODY);
  const victim=add(s,owner,'battle',id);
  task(s,'g34_Sweep',1-owner,{to:to==='graveWithoutDestroy'?'grave':to,
   g815PutInGrave:to==='graveWithoutDestroy',excludeUid:amp.uid,filter:{g201ExactName:e.card(victim).name,creature:true}});
  assert.ok(!has(s,owner,'battle',victim));
  assert.equal(s.decision,null);
  assert.equal(s.players[0].hand.length,0);
 }
});

test('Labyrinth Rose mills exactly four cards on entry and pays Reikon in selected order',()=>{
 let s=field();
 const cards=s.players[0].deck.slice(0,5);
 const rose=play(s,ROSE);
 assert.deepEqual(s.players[0].grave.map(x=>x.uid),cards.slice(0,4).map(x=>x.uid));
 end(s);
 end(s);
 const top=s.players[0].deck[0];
 const selected=[cards[2],cards[0],cards[3]];
 attack(s,rose.uid);
 pick(s,selected[0]);
 s=restore(s);
 pick(s,selected[1]);
 pick(s,selected[2]);
 assert.deepEqual(s.players[0].deck.slice(-3).map(x=>x.uid),selected.map(x=>x.uid));
 assert.ok(has(s,0,'hand',top));
 assert.deepEqual(s.players[0].grave.map(x=>x.uid),[cards[1].uid]);
});

test('Labyrinth Rose handles declining, too few cards, and a graveyard movement lock',()=>{
 for(const mode of ['decline','short','locked']){
  const s=field(),rose=add(s,0,'battle',ROSE);
  const count=mode==='short'?2:3;
  const rows=Array.from({length:count},()=>add(s,0,'grave',BODY));
  if(mode==='locked')add(s,1,'battle',LOCK);
  const top=s.players[0].deck[0];
  attack(s,rose.uid);
  if(mode==='decline')act(s,'extended',a=>values(s)[a.choice]===null);
  if(mode==='locked')for(const row of rows)pick(s,row);
  assert.notEqual(s.decision?.task?.op,'g34_Select');
  assert.deepEqual(s.players[0].grave.map(x=>x.uid),rows.map(x=>x.uid));
  assert.equal(has(s,0,'hand',top),mode==='locked');
 }
});
