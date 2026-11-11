import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const PANIC='dmr15-019',SAURO='dmr15-s05',SOUL='dmr15-s04',JACKPOT='dmr15-016';
const NATURE='dm01-108',NATURE2='dm01-107',NATURE3='dm01-103',FIRE='dm01-097',WATER='dm01-083';
const BOLSHACK='dm01-008',MULTI='dm25bd3-020',TWIN='dmex04-027',GAI='dmr14-v02';
const EVO='dm27-007',ESPOIR='dmr13-001',DRAGON_SPELL='dm24ex2-038',GEAR='dm23ex1-058';
const NATURE_SPELL_TWIN='dm23rp3-050';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const ids=rows=>rows.map(x=>x.uid);
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const value=c=>c.value?.uid??c.value;
const choices=s=>s.decision.choices.map(value);
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
const bottom=(s,n)=>ids(s.players[0].deck.slice(-n));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();

function field(){
 const s=setup();
 for(const p of [0,1]){give(s,p,'deck',Array(20).fill(NATURE));give(s,p,'grave',[]);}
 return s;
}

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

test('Phase 998 has three verified official definitions with unique original IDs',()=>{
 const m=read('tools/support-phase-998.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[PANIC,SAURO,SOUL]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const {id,name,faces}=row,[f]=faces,d=details.cards.find(x=>x.id===id),c=e.card(id);
  assert.deepEqual(faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:998}),row.spec);
  const altered=structuredClone(d);
  altered.faces[0].abilityText+='未知の追加能力。';
  assert.throws(()=>standardCardSpec(altered,{phase:998}));
  for(const [key,v] of Object.entries(row.spec))assert.deepEqual(c[key],v);
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [name,f.typeText==='呪文'?'spell':'creature',f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-998');
  assert.equal(CARD_IMAGES[id],row.image);
  assert.ok(catalogue.get(id).supported);
  assert.ok(row.verification.facesMatched);
  assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);
  assert.equal(m.regulationVerification.limits[id],4);
  assert.deepEqual(refs.filter(x=>x.id===id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
 }
});

test('Panic privately looks once per face-up Dragon creature in mana and places selected Dragons in mana',()=>{
 let s=field();
 for(const id of [BOLSHACK,TWIN,MULTI,ESPOIR,GAI])put(s,0,'mana',id,{tapped:true});
 put(s,0,'mana',BOLSHACK,{faceDown:true});
 put(s,0,'mana',DRAGON_SPELL);
 put(s,1,'mana',GAI);
 give(s,0,'deck',[BOLSHACK,MULTI,DRAGON_SPELL,WATER,NATURE,ESPOIR,...Array(8).fill(NATURE)]);
 const [mono,multi,dragonSpell,water,nature,outside]=s.players[0].deck;
 const before=physical(s),spell=play(s,PANIC);
 assert.deepEqual(s.decision.task.g585Peek.map(x=>x.id),[BOLSHACK,MULTI,DRAGON_SPELL,WATER,NATURE]);
 assert.deepEqual(choices(s),[mono.uid,multi.uid,dragonSpell.uid,null]);
 assert.ok(!s.log.some(x=>x.type==='reveal'&&x.cardId===PANIC));
 pick(s,multi.uid);s=restore(s);
 pick(s,mono.uid);pick(s,dragonSpell.uid);
 assert.deepEqual(choices(s),[water.uid,nature.uid]);pick(s,nature.uid);
 assert.equal(s.players[0].deck[0].uid,outside.uid);
 assert.deepEqual(bottom(s,2),[nature.uid,water.uid]);
 assert.deepEqual(s.players[0].mana.slice(-3).map(x=>[x.uid,!!x.tapped]),[
  [multi.uid,true],[mono.uid,false],[dragonSpell.uid,true]
 ]);
 assert.deepEqual(physical(s).filter(uid=>uid!==spell.uid),before);
});

test('Panic may move zero cards and orders every looked-at card at the bottom',()=>{
 const s=field();
 for(const id of [BOLSHACK,TWIN])put(s,0,'mana',id);
 give(s,0,'deck',[BOLSHACK,MULTI,NATURE]);
 const [first,second,rest]=s.players[0].deck;
 play(s,PANIC);pick(s,null);pick(s,second.uid);
 assert.deepEqual(ids(s.players[0].deck),[rest.uid,second.uid,first.uid]);
 assert.ok(!has(s,0,'mana',first)&&!has(s,0,'mana',second));
});

test('Panic shows an ineligible lone card privately before putting it on the bottom',()=>{
 const s=field();put(s,0,'mana',BOLSHACK);
 give(s,0,'deck',[WATER,NATURE,FIRE]);
 const [peek,next,last]=s.players[0].deck;
 play(s,PANIC);
 assert.deepEqual(s.decision.task.g585Peek.map(x=>x.id),[WATER]);
 assert.deepEqual(choices(s),[null]);
 pick(s,null);
 assert.equal(s.decision,null);
 assert.deepEqual(ids(s.players[0].deck),[next.uid,last.uid,peek.uid]);
});

test('Panic does nothing when no face-up Dragon creature is in its controller’s mana',()=>{
 const s=field();
 put(s,0,'mana',TWIN,{faceDown:true});put(s,0,'mana',DRAGON_SPELL);
 put(s,1,'mana',BOLSHACK);
 give(s,0,'deck',[BOLSHACK,NATURE,MULTI]);
 const before=ids(s.players[0].deck);
 play(s,PANIC);
 assert.equal(s.decision,null);
 assert.deepEqual(ids(s.players[0].deck),before);
});

test('Sauro reveals four and can recover one creature per distinct printed Nature creature cost',()=>{
 let s=field();
 give(s,0,'deck',[NATURE,NATURE2,NATURE3,NATURE_SPELL_TWIN,MULTI,...Array(8).fill(FIRE)]);
 const [two,alsoTwo,three,wrongFace,outside]=s.players[0].deck;
 const sauro=play(s,SAURO);
 assert.equal(e.effectiveCard(sauro,s).breaker,2);
 assert.deepEqual(choices(s),[two.uid,alsoTwo.uid,three.uid,null]);
 assert.ok(s.log.some(x=>x.type==='reveal'&&x.cardId===SAURO&&
  [NATURE,NATURE2,NATURE3,NATURE_SPELL_TWIN].every(id=>x.text.includes(e.card(id).name))));
 pick(s,alsoTwo.uid);s=restore(s);
 assert.deepEqual(choices(s),[three.uid,null]);
 pick(s,three.uid);
 assert.deepEqual(choices(s),[two.uid,wrongFace.uid]);pick(s,wrongFace.uid);
 assert.deepEqual(ids(s.players[0].hand),[alsoTwo.uid,three.uid]);
 assert.equal(s.players[0].deck[0].uid,outside.uid);
 assert.deepEqual(bottom(s,2),[wrongFace.uid,two.uid]);
});

test('Sauro can recover exactly one Nature creature and leave another distinct cost behind',()=>{
 const s=field();give(s,0,'deck',[NATURE,NATURE3,WATER,FIRE,NATURE]);
 const [two,three]=s.players[0].deck;
 play(s,SAURO);pick(s,two.uid);pick(s,null);drain(s);
 assert.ok(has(s,0,'hand',two)&&has(s,0,'deck',three));
});

test('Sauro attack checks seven visible Nature mana and may deploy a non-evolution creature of any color',()=>{
 for(const armed of [false,true]){
  const s=field();give(s,0,'mana',Array(6).fill(NATURE));
  put(s,0,'mana',MULTI,{faceDown:!armed,tapped:true});
  const sauro=put(s,0,'battle',SAURO),fire=put(s,0,'hand',GAI),evo=put(s,0,'hand',EVO);
  put(s,0,'hand',PANIC);
  attack(s,sauro.uid);
  if(armed){assert.deepEqual(choices(s),[fire.uid,null]);pick(s,fire.uid);}
  else assert.notEqual(s.decision?.task?.source,SAURO);
  assert.equal(has(s,0,'battle',fire),armed);
  assert.ok(has(s,0,'hand',evo));
 }
});

test('Soul Triple Sympathy counts allied Fire Dragons and stops at one mana',()=>{
 const s=field(),definition=e.card(SOUL);
 assert.equal(e.summonCost(s,0,definition),12);
 put(s,1,'battle',BOLSHACK);
 put(s,0,'battle',FIRE);
 put(s,0,'battle',ESPOIR);
 put(s,0,'battle',GEAR);
 assert.equal(e.summonCost(s,0,definition),12);
 for(const [index,id] of [BOLSHACK,MULTI,TWIN,GAI].entries()){
  put(s,0,'battle',id,{tapped:true});
  assert.equal(e.summonCost(s,0,definition),[9,6,3,1][index]);
 }
 const foe=put(s,1,'battle',ESPOIR),soul=play(s,SOUL);
 assert.equal(e.effectiveCard(soul,s).breaker,3);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,1);
 assert.ok(choices(s).includes(null));
 pick(s,foe.uid);
 assert.ok(has(s,0,'battle',soul)&&has(s,1,'grave',foe));
});

test('Soul triggers for a Dragon deployed by an effect and uses that entrant as the fighter',()=>{
 let s=field();
 put(s,0,'battle',SOUL);put(s,0,'mana',BOLSHACK);
 const foe=put(s,1,'battle',ESPOIR);
 give(s,0,'deck',[BOLSHACK,...Array(9).fill(NATURE)]);
 const dragon=s.players[0].deck[0];
 play(s,JACKPOT);pick(s,dragon.uid);s=restore(s);
 assert.deepEqual(choices(s),[foe.uid,null]);
 pick(s,foe.uid);
 assert.ok(has(s,0,'grave',dragon)&&has(s,1,'battle',foe));
});

test('Soul does not watch either an opponent Dragon or an allied non-Dragon',()=>{
 const s=field();put(s,0,'battle',SOUL);put(s,1,'battle',FIRE);
 play(s,NATURE);assert.equal(s.decision,null);
 s.active=1;play(s,BOLSHACK);assert.equal(s.decision,null);
});

test('Soul allows declining a fight and a Dragon gear cannot participate in one',()=>{
 const s=field();put(s,0,'battle',SOUL);const foe=put(s,1,'battle',FIRE);
 const dragon=play(s,BOLSHACK);
 assert.deepEqual(choices(s),[foe.uid,null]);
 pick(s,null);assert.ok(has(s,0,'battle',dragon)&&has(s,1,'battle',foe));
 const gear=play(s,GEAR);
 assert.deepEqual(choices(s),[foe.uid,null]);
 pick(s,foe.uid);
 assert.ok(has(s,0,'battle',gear)&&has(s,1,'battle',foe));
});
