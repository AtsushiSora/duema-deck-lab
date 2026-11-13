import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {manaSummonModel} from '../dist/manual-ui.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const HIPPO='dm39-034',PIG='dm37-048',TOTEM='dm37-050',GAGA='dm39-018';
const NATURE='dm01-108',FIRE='dm01-097',WATER='dm01-083',SPELL='dm01-086';
const GOEMON='dm36-039',COURTNEY='dm13-015',YADOCK='dmr20-066',APUL='dmrp22-042';
const add=(s,p,z,id,props={})=>{
 const x={...inst(id),...props};
 s.players[p][z].push(x);
 return x;
};
const pick=(s,v)=>act(s,'extended',a=>s.decision.choices[a.choice].value===v);
const power=(s,x)=>e.power(x,false,s);
const play=(s,x,filter)=>e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===x.uid&&filter(a));
const birth=(s,x)=>play(s,x,a=>a.role==='manaBirth296');

function move(s,x,{p=0,origin='battle',to='grave'}={}){
 const step=origin==='battle'?{op:'g34_ExactMove',owner:p,target:x.uid,targetIncarnation:x.incarnation||0,to}:
  {op:'g34_Select',origin,owner:p,filter:{exactUid:x.uid},to,n:1};
 s.extTasks=[{p,source:NATURE,...step}];
 s.phase='main';
 act(s,'toAttack');
 if(origin!=='battle')act(s,'extended',a=>s.decision.choices[a.choice].value?.uid===x.uid);
}

test('all six official prints resolve to three full definitions and the reprints retain the shared limit',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-1124.json',import.meta.url)));
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(c=>c.id),[HIPPO,PIG,TOTEM]);
 assert.equal(m.printAliases.length,3);
 for(const row of [...m.cards,...m.printAliases]){
  const canonical=row.canonicalId??row.id;
  const def={id:row.id,name:row.name,faces:row.faces,status:'complete'};
  assert.deepEqual(standardCardSpec(def,{phase:1124}),row.spec);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[canonical]);
  assert.equal(cat.get(row.id).id,canonical);
  assert.equal(e.card(canonical).limit,canonical===HIPPO?1:4);
  assert.equal(m.regulationVerification.limits[row.id],e.card(canonical).limit);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[row.id],row.image);
  def.faces=structuredClone(def.faces);
  def.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(def,{phase:1124}));
 }
 assert.deepEqual(e.card(HIPPO).g558Souls,['W']);
});

test('Mana Birth 0 stays free under Gagamaru even if all mana is tapped (QA 36277, 36278)',()=>{
 const s=setup();
 add(s,0,'battle',GAGA);
 give(s,0,'mana',[]);
 const hippo=add(s,0,'mana',HIPPO,{tapped:true}),food=add(s,0,'mana',NATURE,{tapped:true});
 add(s,0,'mana',FIRE,{tapped:true});
 const a=birth(s,hippo);
 assert.equal(a.cost,0);
 assert.equal(manaSummonModel(s)[0].cost,0);
 e.step(s,a,{manualMana:true});
 assert.equal(s.decision.source,HIPPO);
 assert.equal(s.decision.task.op,'g34_HippoMana1124');
 assert.deepEqual(s.decision.choices.map(c=>c.value),[food.uid]);
 pick(s,food.uid);
 assert.ok(s.players[0].battle.includes(hippo));
 assert.ok(!hippo.tapped&&s.players[0].grave.includes(food));
});

test('Mana Birth 0 can be used on the first turn and destroys Hippo when no Nature mana is left (QA 36274)',()=>{
 const s=setup();
 give(s,0,'mana',[HIPPO]);
 const hippo=s.players[0].mana[0];
 assert.equal(s.turn,1);
 e.step(s,birth(s,hippo));
 assert.ok(s.players[0].grave.includes(hippo));
 assert.equal(s.players[0].mana.length,0);
});

test('Goemon permits normal mana summoning with Hippo’s mandatory entry, and the printed hand summon leaves mana intact (QA 36276)',()=>{
 const s=setup();
 cast(s,GOEMON);
 const hippo=add(s,0,'mana',HIPPO),a=play(s,hippo,a=>a.manaPermit?.startsWith('g297:')&&!a.alternative);
 assert.equal(a.cost,5);
 e.step(s,a);
 assert.equal(s.decision.task.op,'g34_HippoMana1124');
 const food=s.players[0].mana.find(x=>x.cardId===NATURE);
 pick(s,food.uid);
 assert.ok(s.players[0].grave.includes(food));
 const manaCount=s.players[0].mana.length;
 cast(s,HIPPO);
 assert.equal(s.decision,null);
 assert.equal(s.players[0].mana.length,manaCount);
});

test('Hippo accepts the real mana civilization from Courtney, including a spell',()=>{
 const s=setup();
 add(s,0,'battle',COURTNEY);
 give(s,0,'mana',[HIPPO,SPELL]);
 const [hippo,food]=s.players[0].mana;
 e.step(s,birth(s,hippo));
 pick(s,food.uid);
 assert.ok(s.players[0].grave.includes(food)&&s.players[0].battle.includes(hippo));
});

test('mana deployment without summoning and Apul’s mana lock behave separately',()=>{
 const s=setup(),hippo=add(s,0,'mana',HIPPO);
 s.extTasks=[{op:'g34_Put',p:0,source:NATURE,origin:'mana',target:hippo.uid}];
 act(s,'toAttack');
 assert.ok(s.players[0].battle.includes(hippo));
 assert.equal(s.decision,null);
 s.phase='main';
 const locked=add(s,0,'mana',HIPPO);
 add(s,1,'battle',APUL);
 assert.equal(birth(s,locked),undefined);
});

test('Yadock keeps a replaced summon tapped in mana and triggers neither Hippo nor Jingi (QA 33279)',()=>{
 const s=setup();
 add(s,1,'battle',YADOCK);
 const pig=add(s,0,'battle',PIG);
 give(s,0,'mana',[HIPPO,NATURE,FIRE,WATER]);
 const hippo=s.players[0].mana[0];
 hippo.tapped=true;
 e.step(s,birth(s,hippo));
 assert.ok(s.players[0].mana.includes(hippo));
 assert.ok(hippo.tapped);
 assert.equal(s.decision,null);
 assert.equal(power(s,pig),1000);
});

test('Jingi triggers on a friendly battlefield departure, and an accepted boost lasts until turn end',()=>{
 const s=setup(),pig=add(s,0,'battle',PIG),other=add(s,0,'battle',NATURE);
 move(s,other,{to:'hand'});
 assert.equal(s.decision.source,PIG);
 pick(s,true);
 assert.equal(power(s,pig),4000);
 act(s,'endTurn');
 drain(s);
 assert.equal(power(s,pig),1000);
});

test('Jingi excludes spells and face-down cards leaving mana, and an opponent’s creature',()=>{
 const s=setup(),pig=add(s,0,'battle',PIG);
 const spell=add(s,0,'mana',SPELL),hidden=add(s,0,'mana',NATURE,{faceDown:true});
 const enemy=add(s,1,'battle',FIRE);
 move(s,spell,{origin:'mana',to:'hand'});
 assert.equal(s.decision,null);
 move(s,hidden,{origin:'mana',to:'hand'});
 assert.equal(s.decision,null);
 move(s,enemy,{p:1});
 assert.equal(s.decision,null);
 assert.equal(power(s,pig),1000);
});

test('Jingi triggers separately for the mana summon and its mana-to-grave movement (QA 37640)',()=>{
 const s=setup(),totem=add(s,0,'battle',TOTEM);
 give(s,0,'mana',[HIPPO,NATURE]);
 const [hippo,food]=s.players[0].mana;
 e.step(s,birth(s,hippo));
 if(s.decision.type==='effectOrder')
  act(s,'orderEffect',a=>s.pendingEffects.some(x=>x.effectId===a.effectId&&x.source===HIPPO));
 pick(s,food.uid);
 if(s.decision.type==='effectOrder')act(s,'orderEffect');
 pick(s,true);
 pick(s,true);
 assert.equal(power(s,totem),10000);
 assert.equal(e.effectiveCard(totem,s).breaker,2);
 const shields=s.players[1].shields.length;
 attack(s,totem.uid);
 drain(s);
 assert.equal(s.players[1].shields.length,shields-2);
});

test('Jingi sees the other simultaneous departure but the destroyed source gains no boost (QA 34963)',()=>{
 const s=setup(),pig=add(s,0,'battle',PIG);
 for(let n=0;n<5;n++)add(s,n===0?0:1,'battle',NATURE);
 cast(s,'dm14-015');
 assert.equal(s.decision.source,PIG);
 pick(s,true);
 assert.ok(s.players[0].grave.includes(pig));
 assert.equal(pig.powerModifiers,undefined);
});

test('Jingi can be declined and does not trigger from its own sole departure',()=>{
 const s=setup(),pig=add(s,0,'battle',PIG),other=add(s,0,'battle',NATURE);
 move(s,other);
 pick(s,null);
 assert.equal(power(s,pig),1000);
 move(s,pig);
 assert.equal(s.decision,null);
 assert.ok(s.players[0].grave.includes(pig));
});
