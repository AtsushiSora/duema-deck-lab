import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain,cast} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const AQUA='dm09-s02',DRAG='dm27-017',CLOUD='dm29-053';
const PLAIN='dm01-108',BLOCKER='dm01-076',EVO='dm11-s01',DRAGON='dm01-s08',DRAGON_EVO='dm27-007';
const DEATH='dm01-027',TRIGGER='dm01-015';
const NINJAS=['dm23rp2-054','dmx12b-009','dm23rp4-055','dm25ex1-057'];
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const choices=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>choices(s)[a.choice]===(value?.uid??value));
const legal=(s,kind,pred=()=>true)=>e.getLegalActions(s).some(a=>a.kind===kind&&pred(a));
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);

function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1]){give(s,p,'deck',Array(18).fill(PLAIN));give(s,p,'grave',[]);}
 return s;
}

function put(s,p,z,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][z].push(x);
 return x;
}

test('Phase 950 verifies three complete names and resolves four reprints to the first-print IDs',()=>{
 const m=read('tools/support-phase-950.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[AQUA,DRAG,CLOUD]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[['dmx12b-035',AQUA],['dmc55-047',DRAG],['dmex08-137',DRAG],['dmex12-102',CLOUD]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,f=row.faces[0],c=e.card(id),canonical=m.cards.find(x=>x.id===id);
  const d={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(d,{phase:950}),canonical.spec);
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'不明な能力。'}]},{phase:950}));
  for(const [key,value] of Object.entries(canonical.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   ['creature',f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-950');
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
 }
});

test('Aqua Master requires a rival shield selection before breaking and reveals the entire shield',()=>{
 let s=field(),aqua=put(s,0,'battle',AQUA);
 const shield=s.players[1].shields[1],broken=s.players[1].shields[0],under=inst(TRIGGER);
 shield.shieldStack=[under];
 attack(s,aqua.uid);act(s,'noBlock');
 assert.deepEqual(choices(s),s.players[1].shields.map(x=>x.uid));
 assert.ok(s.decision.choices.every(x=>!x.cardId));
 s=restore(s);pick(s,shield);
 const group=s.players[1].shields.find(x=>x.uid===shield.uid);
 assert.ok(group.faceUp&&group.shieldStack[0].faceUp);
 drain(s);
 assert.ok(group.faceUp&&group.shieldStack[0].faceUp);
 assert.ok(has(s,1,'hand',broken));
 assert.ok(s.players[0].shields.every(x=>!x.faceUp));
});

for(const mode of ['blocked','creature','direct'])test('Aqua Master ends the attack without a reveal choice for '+mode,()=>{
 const s=field(),aqua=put(s,0,'battle',AQUA);
 if(mode==='direct')s.players[1].shields=[];
 const defender=mode==='direct'?null:put(s,1,'battle',BLOCKER,{tapped:mode==='creature'});
 attack(s,aqua.uid,mode==='creature'?defender.uid:'player');
 act(s,mode==='blocked'?'block':'noBlock');drain(s);
 assert.ok(!s.log.some(x=>x.type==='reveal'));
 assert.ok(s.players[1].shields.every(x=>!x.faceUp));
 if(mode==='direct')assert.equal(s.winner,0);
});

test('A shield Aqua Master turns face up still offers its S-Trigger when broken',()=>{
 const s=field(),aqua=put(s,0,'battle',AQUA),shield=inst(TRIGGER);
 s.players[1].shields[0]=shield;
 attack(s,aqua.uid);act(s,'noBlock');pick(s,shield);
 assert.equal(s.decision?.type,'trigger');
 assert.ok(e.getLegalActions(s).some(a=>a.cardId===TRIGGER));
});

test('Draginnocent enters mana tapped and can serve as a different-race evolution base',()=>{
 const s=field(),mana=put(s,0,'hand',DRAG);
 s.phase='charge';act(s,'charge',a=>a.uid===mana.uid);
 assert.ok(has(s,0,'mana',mana)&&mana.tapped);
 cast(s,DRAG);
 const base=s.players[0].battle.find(x=>x.cardId===DRAG);
 assert.ok(e.evolutionBases(s,0,e.card(EVO)).includes(base));
 assert.ok(!e.evolutionBases(s,0,{evolution:{civilization:'水'}}).includes(base));
 assert.ok(!e.evolutionBases(s,0,{evolution:{evolution:true}}).includes(base));
 cast(s,EVO);act(s,'evolve',a=>a.baseUid===base.uid);
 assert.equal(s.players[0].battle[0].under[0].uid,base.uid);
});

for(const mode of ['dragon','evolution','decline'])test('Draginnocent can deploy a Dragon from hand after destruction '+mode,()=>{
 let s=field(1),drag=put(s,0,'battle',DRAG);
 const dragon=put(s,0,'hand',DRAGON),evolution=put(s,0,'hand',DRAGON_EVO),other=put(s,0,'hand',PLAIN);
 const base=mode==='evolution'?put(s,0,'battle',DRAGON):null;
 cast(s,DEATH);act(s,'effect',a=>a.targets?.some(x=>x.uid===drag.uid));
 assert.ok(has(s,0,'grave',drag));
 assert.equal(s.decision.player,0);
 assert.deepEqual(choices(s),base?[dragon.uid,evolution.uid,null]:[dragon.uid,null]);
 assert.ok(!choices(s).includes(other.uid));
 s=restore(s);pick(s,mode==='decline'?null:base?evolution:dragon);
 if(base){
  pick(s,base);
  assert.equal(s.players[0].battle.find(x=>x.uid===evolution.uid).under[0].uid,base.uid);
 }else assert.equal(has(s,0,'battle',dragon),mode==='dragon');
 assert.ok(s.players[0].mana.every(x=>!x.tapped));
});

test('Draginnocent under a destroyed evolution does not deploy a Dragon',()=>{
 const s=field(1),drag=inst(DRAG),target=put(s,0,'battle',DRAGON_EVO,{under:[drag]});
 const dragon=put(s,0,'hand',DRAGON);
 cast(s,DEATH);act(s,'effect',a=>a.targets?.some(x=>x.uid===target.uid));drain(s);
 assert.ok(has(s,0,'grave',target)&&has(s,0,'grave',drag)&&has(s,0,'hand',dragon));
 assert.equal(s.players[0].battle.length,0);
});

for(const n of [0,1,2,3])test('Cloud reveals '+n+' selected Shinobi and adds at most one without a public selection log',()=>{
 let s=field();
 give(s,0,'deck',[PLAIN,...NINJAS,PLAIN,PLAIN]);
 const original=s.players[0].deck.slice(),ninja=original.slice(1,5);
 cast(s,CLOUD);
 assert.equal(s.decision.player,0);
 assert.deepEqual(choices(s),[...ninja.map(x=>x.uid),null]);
 assert.ok(ninja.every(x=>!JSON.stringify(e.observation(s,1)).includes(x.cardId)));
 for(const x of ninja.slice(0,n)){pick(s,x);s=restore(s);}
 if(n<3)pick(s,null);
 assert.deepEqual(s.log.filter(x=>x.type==='reveal').map(x=>x.cardId),NINJAS.slice(0,n));
 if(n>0){
  assert.deepEqual(choices(s),ninja.slice(0,n).map(x=>x.uid));
  const before=s.log.length;
  pick(s,ninja[n-1]);
  assert.deepEqual(s.players[0].hand.map(x=>x.uid),[ninja[n-1].uid]);
  assert.ok(s.log.slice(before).every(x=>!x.text.includes(e.card(ninja[n-1]).name)));
  assert.ok(!JSON.stringify(e.observation(s,1)).includes(ninja[n-1].cardId));
 }
 const kept=n?ninja[n-1].uid:null;
 assert.deepEqual(s.players[0].deck.map(x=>x.uid).sort(),original.filter(x=>x.uid!==kept).map(x=>x.uid).sort());
 assert.notDeepEqual(s.players[0].deck.map(x=>x.uid),original.filter(x=>x.uid!==kept).map(x=>x.uid));
 assert.ok(!s.players[0].g34Protected?.length);
 assert.equal(s.decision,null);
});

test('Cloud shuffles an eligible-card-free deck without showing unrelated cards',()=>{
 const s=field(),before=s.players[0].deck.map(x=>x.uid);
 cast(s,CLOUD);
 assert.equal(s.decision,null);
 assert.notDeepEqual(s.players[0].deck.map(x=>x.uid),before);
 assert.ok(!s.log.some(x=>x.type==='reveal'));
 assert.equal(s.players[0].hand.length,0);
});
