import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,cast,attack,drain,GEN} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const LUBELS='dm13-036',GUITAR='dm22rp1-036',KAISER='dmx04-001';
const CREATURE='dm01-108',SUN='dm01-075',TRIGGER='dm01-027',SEED='dmrp22-048';
const ENERGY='dm06-085',STOP='dmr23-040',JOHNNY='dmrp21-1B';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(16).fill(CREATURE));
 return s;
}
function put(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const pick=(s,v)=>act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===v);
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const revealed=s=>s.log.filter(x=>x.type==='reveal'&&x.text.includes(e.card(LUBELS).name));
const restore=s=>JSON.parse(JSON.stringify(s));
const hasGuitarOffer=s=>s.decision?.task?.source===GUITAR&&s.decision.task.op==='g34_Offer';

test('three official cards and the Kaiser reprint retain their canonical IDs and exact specs',()=>{
 const m=read('tools/support-phase-1189.json'),registry=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(c=>c.id),[LUBELS,GUITAR,KAISER]);
 assert.deepEqual(m.printAliases.map(c=>[c.id,c.canonicalId]),[['dmx17-014',KAISER]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),[f]=row.faces;
  assert.deepEqual(registry.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[id]);
  assert.deepEqual([c.type,c.cost,c.power,c.civilizations,c.race,c.manaValue,c.limit],
   [id===GUITAR?'seed':'creature',f.cost,Number(f.powerText),f.civilizations,f.race,1,4]);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1189}),row.spec);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.equal(refs.find(ref=>ref.id===row.id&&ref.canonicalId===id)?.image,row.image);
  assert.equal(m.regulationVerification.limits[row.id],4);
  if(!row.canonicalId){
   assert.equal(CARD_IMAGES[id],row.image);
   assert.deepEqual(details.cards.find(c=>c.id===id).faces,row.faces);
  }
  const changed={...f,abilityText:f.abilityText+'\n未知の能力。'};
  assert.throws(()=>standardCardSpec({...row,status:'complete',faces:[changed]},{phase:1189}));
 }
});

test('Lubels reveals the shield stack before the S Trigger window and the trigger remains usable',()=>{
 let s=field();
 cast(s,LUBELS);
 const lubels=s.players[0].battle[0];
 lubels.entered=0;
 give(s,1,'shields',[CREATURE]);
 const root=s.players[1].shields[0],trigger=inst(TRIGGER);
 root.shieldStack=[trigger];
 attack(s,lubels.uid);
 assert.equal(revealed(s).length,0);
 act(s,'noBlock');
 assert.deepEqual(revealed(s).map(x=>x.cardId),[CREATURE,TRIGGER]);
 assert.ok(revealed(s).every(x=>x.index<s.log.find(x=>x.type==='break').index));
 assert.ok(has(s,1,'hand',root));
 s=restore(s);
 act(s,'useTrigger',a=>a.uid===trigger.uid);
 act(s,'effect',a=>a.targets.some(x=>x.uid===lubels.uid));
 assert.ok(has(s,0,'grave',lubels));
 assert.ok(has(s,1,'grave',trigger));
});

for(const mode of ['opponent','ignored','replaced'])test('Lubels does not reveal shields outside an allied creature break: '+mode,()=>{
 const s=field();
 put(s,mode==='opponent'?1:0,'battle',LUBELS,mode==='ignored'?{g35Ignored:s.turn}:{});
 const attacker=put(s,0,'battle',mode==='replaced'?'dmc27-004':CREATURE);
 give(s,1,'shields',[SUN]);
 const shield=s.players[1].shields[0];
 attack(s,attacker.uid);
 act(s,'noBlock');
 assert.deepEqual(revealed(s),[]);
 assert.ok(has(s,1,mode==='replaced'?'grave':'hand',shield));
});

test('Lubels reveals an allied creature ability break and leaves a spell break private',()=>{
 const s=field();
 put(s,0,'battle',LUBELS);
 const [first,second]=s.players[1].shields;
 cast(s,'dmr23-s06');
 pick(s,first.uid);
 assert.deepEqual(revealed(s).map(x=>x.cardId),[first.cardId]);
 cast(s,'dm24rp4-020');
 pick(s,null);
 pick(s,0);
 pick(s,second.uid);
 assert.equal(revealed(s).length,1);
 assert.ok(has(s,1,'hand',first)&&has(s,1,'hand',second));
});

test('Guitar watches own spells, and accepting offers exactly one draw followed by a mandatory discard',()=>{
 const s=field();
 cast(s,GUITAR);
 const guitar=s.players[0].battle[0];
 assert.equal(s.decision,null);
 const spare=put(s,0,'hand',SUN);
 cast(s,STOP);
 assert.ok(hasGuitarOffer(s));
 const [top]=s.players[0].deck;
 pick(s,true);
 assert.ok(has(s,0,'hand',top));
 pick(s,spare.uid);
 assert.ok(has(s,0,'grave',spare));
 assert.ok(has(s,0,'battle',guitar));
});

test('Guitar triggers for a different used tamaseed, including a second copy of itself',()=>{
 const s=field();
 cast(s,GUITAR);
 const [first]=s.players[0].battle;
 const deck=s.players[0].deck.length;
 cast(s,GUITAR);
 assert.ok(hasGuitarOffer(s));
 assert.equal(s.decision.task.uid,first.uid);
 pick(s,null);
 assert.equal(s.players[0].deck.length,deck);
 assert.equal(s.decision,null);
 cast(s,SEED);
 if(s.decision?.type==='effectOrder')act(s,'orderEffect',a=>s.pendingEffects.find(x=>x.effectId===a.effectId)?.source===GUITAR);
 assert.ok(hasGuitarOffer(s));
 drain(s);
 assert.ok(s.players[0].battle.some(x=>x.cardId===SEED));
});

test('Guitar ignores opponent use and a tamaseed put directly into battle',()=>{
 const s=field();
 cast(s,GUITAR);
 const momo=put(s,0,'battle','dmsd20-001'),seed=put(s,0,'hand',SEED);
 attack(s,momo.uid);
 pick(s,seed.uid);
 assert.ok(!hasGuitarOffer(s));
 drain(s);
 assert.ok(has(s,0,'battle',seed));
 s.active=1;
 s.phase='main';
 cast(s,ENERGY);
 assert.equal(s.decision,null);
 cast(s,SEED);
 assert.ok(!hasGuitarOffer(s));
 drain(s);
});

test('Guitar still discards if the optional draw was attempted from an empty protected deck (QA42531)',()=>{
 const s=field();
 cast(s,GUITAR);
 give(s,0,'deck',[]);
 s.players[0].g38LibrarySafe=true;
 const spare=put(s,0,'hand',SUN);
 cast(s,STOP);
 assert.ok(hasGuitarOffer(s));
 pick(s,true);
 pick(s,spare.uid);
 assert.ok(has(s,0,'grave',spare));
 assert.equal(s.winner,null);
});

test('Guitar sees its own spell being cast even when Genmu ignores the spell effect',()=>{
 const s=field();
 cast(s,GUITAR);
 put(s,1,'battle',GEN);
 const n=s.players[0].deck.length;
 cast(s,ENERGY);
 assert.ok(hasGuitarOffer(s));
 assert.equal(s.players[0].deck.length,n);
 pick(s,null);
 assert.equal(s.decision,null);
});

test('Kaiser breaks the other shields first and still breaks its own after being removed by a trigger',()=>{
 let s=field();
 cast(s,KAISER);
 const kaiser=s.players[0].battle[0];
 kaiser.entered=0;
 give(s,1,'shields',[CREATURE,TRIGGER]);
 const trigger=s.players[1].shields[1];
 attack(s,kaiser.uid);
 act(s,'noBlock');
 assert.equal(s.players[1].shields.length,0);
 assert.equal(s.players[0].shields.length,5);
 s=restore(s);
 act(s,'useTrigger',a=>a.uid===trigger.uid);
 act(s,'effect',a=>a.targets.some(x=>x.uid===kaiser.uid));
 assert.ok(has(s,0,'grave',kaiser));
 assert.equal(s.players[0].shields.length,0);
 assert.equal(s.players[0].hand.length,5);
});

test('Blocking Kaiser keeps both sides shields intact',()=>{
 const s=field(),kaiser=put(s,0,'battle',KAISER),blocker=put(s,1,'battle','dm01-076');
 attack(s,kaiser.uid);
 act(s,'block',a=>a.uid===blocker.uid);
 assert.equal(s.players[0].shields.length,5);
 assert.equal(s.players[1].shields.length,5);
 assert.ok(has(s,1,'grave',blocker));
});

test('Kaiser breaks its own shields after a direct attack with a loss replacement (QA43043)',()=>{
 const s=field(),kaiser=put(s,0,'battle',KAISER);
 put(s,1,'battle',JOHNNY);
 give(s,1,'shields',[]);
 attack(s,kaiser.uid);
 act(s,'noBlock');
 act(s,'extended',a=>s.decision.choices[a.choice].value?.kind==='johnny');
 assert.equal(s.winner,null);
 assert.equal(s.players[0].shields.length,0);
});
