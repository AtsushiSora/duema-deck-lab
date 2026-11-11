import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain,cast} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const SALVADOR='dm23-028',FLARE='dm23-s01',SALUD='dm23-006',BAILIFF='dm23-016';
const SMALL='dm01-083',PLAIN='dm01-108',BLOCKER='dm01-082';
const DEVIL='dmr12-041',DRAKE='dm23-051',SERAPHIM='dm19-109';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const choices=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>choices(s)[a.choice]===(value?.uid??value));
const find=(s,p,z,x)=>s.players[p][z].find(y=>y.uid===x.uid);

function field(active=0){
 const s=setup();
 s.active=active;
 for(const p of [0,1]){
  give(s,p,'deck',Array(12).fill(PLAIN));
  give(s,p,'grave',[]);
 }
 return s;
}

function put(s,p,z,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][z].push(x);
 return x;
}

function acceptBio(s,bio){
 assert.equal(s.decision.task.op,'g34_BioKDeclare951');
 assert.deepEqual(choices(s),[bio.uid,null]);
 assert.ok(!JSON.stringify(e.observation(s,1)).includes(bio.cardId));
 pick(s,bio);
 assert.equal(s.decision.task.op,'g34_BioK951');
 pick(s,true);
 assert.ok(find(s,0,'grave',bio));
}

test('Phase 954 verifies four complete and canonical single-print definitions',()=>{
 const m=read('tools/support-phase-954.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(c=>c.id),[SALVADOR,FLARE,SALUD,BAILIFF]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const {id}=row,f=row.faces[0],card=e.card(id),d={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(d,{phase:954}),row.spec);
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'不明な能力。'}]},{phase:954}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(card[key],value);
  assert.deepEqual([card.type,card.cost,card.power,card.race,e.civilizations(card),card.manaValue,card.limit],
   ['creature',f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  assert.equal(card.supportBatch,'phase-954');
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[id],4);
  assert.deepEqual(refs.filter(r=>r.id===id).map(r=>[r.canonicalId,r.image]),[[id,row.image]]);
  assert.equal(CARD_IMAGES[id],row.image);
  assert.deepEqual(catalogue.resolveRows([{id,count:1}]),[{id,count:1}]);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(r=>nameKey(r.name)===nameKey(row.name)).map(r=>r.id),[id]);
 }
});

for(const triple of [false,true])test('Salvador grants a double break on the attack in progress '+triple,()=>{
 let s=field();
 const attacker=put(s,0,'battle',DEVIL),other=put(s,0,'battle',DEVIL),bio=put(s,0,'hand',SALVADOR);
 if(triple)attacker.g34Grants=[{turn:s.turn,g313Breaker:3}];
 const shields=s.players[1].shields.map(x=>x.uid);
 attack(s,attacker.uid);
 act(s,'noBlock');
 s=restore(s);
 acceptBio(s,bio);
 if(triple){
  assert.deepEqual(new Set(choices(s)),new Set([2,3]));
  pick(s,2);
 }
 assert.equal(s.decision.type,'breakChoice');
 assert.equal(s.decision.count,2);
 const picked=shields.slice(-2);
 act(s,'breakShields',a=>a.shields.join()===picked.join());
 assert.deepEqual(s.players[1].shields.map(x=>x.uid),shields.slice(0,-2));
 assert.deepEqual(s.players[1].hand.map(x=>x.uid).sort(),picked.sort());
 assert.equal(e.effectiveCard(find(s,0,'battle',attacker),s).breaker,triple?3:2);
 assert.equal(e.effectiveCard(find(s,0,'battle',other),s).breaker,undefined);
 act(s,'endTurn');
 drain(s);
 assert.equal(e.effectiveCard(find(s,0,'battle',attacker),s).breaker,undefined);
});

for(const mode of ['block','decline','wrongRace'])test('Salvador keeps the ordinary shield break when its Bio-K is unused '+mode,()=>{
 const s=field();
 const attacker=put(s,0,'battle',mode==='wrongRace'?PLAIN:DEVIL),bio=put(s,0,'hand',SALVADOR);
 if(mode==='block')put(s,1,'battle',BLOCKER);
 attack(s,attacker.uid);
 act(s,mode==='block'?'block':'noBlock');
 if(mode==='decline'){
  pick(s,bio);
  pick(s,null);
 }
 assert.equal(s.decision,null);
 assert.ok(find(s,0,'hand',bio));
 assert.equal(s.players[1].shields.length,mode==='block'?5:4);
});

test('Flare selects a simultaneous group within 3000 current total power before breaking',()=>{
 let s=field();
 const attacker=put(s,0,'battle',DRAKE),bio=put(s,0,'hand',FLARE);
 const small=put(s,1,'battle',SMALL),equal=put(s,1,'battle',PLAIN),spare=put(s,1,'battle',PLAIN);
 const boosted=put(s,1,'battle',PLAIN,{powerModifiers:[{amount:2000,expires:'end',who:s.active}]});
 const immune=put(s,1,'battle',SMALL,{g34Grants:[{turn:s.turn,untargetable:true}]});
 attack(s,attacker.uid);
 act(s,'noBlock');
 acceptBio(s,bio);
 assert.deepEqual(choices(s),[small.uid,equal.uid,spare.uid,null]);
 pick(s,equal);
 assert.ok(find(s,1,'battle',equal));
 assert.deepEqual(choices(s),[small.uid,null]);
 assert.equal(s.players[1].shields.length,5);
 s=restore(s);
 pick(s,small);
 assert.ok(find(s,1,'grave',equal)&&find(s,1,'grave',small));
 for(const y of [spare,boosted,immune])assert.ok(find(s,1,'battle',y));
 assert.equal(s.players[1].shields.length,4);
});

test('Flare can leave all targets alive and has a printed double breaker in battle',()=>{
 const deployed=field();
 cast(deployed,FLARE);
 const creature=deployed.players[0].battle.find(x=>x.cardId===FLARE);
 assert.equal(e.effectiveCard(creature,deployed).breaker,2);
 const s=field();
 const attacker=put(s,0,'battle',DRAKE),bio=put(s,0,'hand',FLARE);
 const target=put(s,1,'battle',SMALL);
 attack(s,attacker.uid);
 act(s,'noBlock');
 acceptBio(s,bio);
 pick(s,null);
 assert.ok(find(s,1,'battle',target));
 assert.equal(s.players[1].shields.length,4);
});

for(const [id,ally] of [[SALUD,SERAPHIM],[BAILIFF,DRAKE]])test(id+' has a free shield trigger and counts only its own live race',()=>{
 let s=field(1);
 const attacker=put(s,1,'battle',PLAIN),small=put(s,1,'battle',SMALL),spare=put(s,1,'battle',SMALL);
 const high=put(s,1,'battle',PLAIN,{powerModifiers:[{amount:1000,expires:'end',who:s.active}]});
 put(s,0,'battle',ally);put(s,0,'battle',ally);put(s,1,'battle',ally);
 put(s,0,'mana',ally);
 const sealed=put(s,0,'battle',ally,{sealed:true});
 s.players[0].seals.push({...inst(PLAIN),faceDown:true,sealOf:sealed.uid});
 const shield=inst(id);
 s.players[0].shields[0]=shield;
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 assert.equal(s.decision.player,0);
 assert.ok(find(s,0,'battle',shield));
 assert.equal(s.players[0].mana.some(x=>x.tapped),false);
 assert.equal(choices(s).includes(high.uid),id===SALUD);
 pick(s,small);
 assert.equal(find(s,1,'battle',small).tapped,false);
 s=restore(s);
 pick(s,id===SALUD?high:attacker);
 assert.equal(s.decision,null);
 assert.ok(find(s,1,'battle',spare)&&!find(s,1,'battle',spare).tapped);
 if(id===SALUD){
  for(const y of [small,high])assert.equal(find(s,1,'battle',y).tapped,true);
 }else{
  for(const y of [small,attacker])assert.ok(find(s,1,'grave',y));
  assert.ok(find(s,1,'battle',high));
 }
});

for(const [id,ally] of [[SALUD,SERAPHIM],[BAILIFF,DRAKE]])test(id+' has no target when only the opponent has the required race',()=>{
 const s=field();
 const target=put(s,1,'battle',ally);
 cast(s,id);
 assert.equal(s.decision,null);
 assert.equal(find(s,1,'battle',target).tapped,false);
});

for(const [id,ally] of [[SALUD,SERAPHIM],[BAILIFF,DRAKE]])test(id+' may leave every eligible enemy in its original state',()=>{
 const s=field();
 put(s,0,'battle',ally);
 const target=put(s,1,'battle',SMALL);
 cast(s,id);
 assert.deepEqual(choices(s),[target.uid,null]);
 pick(s,null);
 assert.equal(s.decision,null);
 assert.equal(find(s,1,'battle',target).tapped,false);
});
