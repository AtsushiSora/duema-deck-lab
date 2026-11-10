import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,cast,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-827.json',import.meta.url)));
const AXE='dm32-003',SPARK='dm32-051',LUNAR='dm33-044';
const WATER='dm01-083',LAND='dm01-108',BOUNCE='dm01-086',DESTROY='dm01-027',BLOCKER='dm01-076',DRAGON='dm01-s08';
const WATER_CREATURE_FACE='dmex06-024',WATER_SPELL_FACE='dm24bd4-007';
function put(s,p,z,id){const x=inst(id);s.players[p][z].push(x);return x;}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const aim=(s,x)=>act(s,'effect',a=>a.targets?.some(y=>y.uid===x.uid));
const resume=s=>JSON.parse(JSON.stringify(s));

test('Phase 827 matches full official definitions, images, canonical IDs and both Lunar Chloro reprints',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 assert.deepEqual(cards.map(x=>x.id),[AXE,SPARK,LUNAR]);
 for(const row of cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),f=d.faces[0];
  assert.deepEqual(row.faces,d.faces);
  assert.deepEqual(row.spec,standardCardSpec(d,{phase:827}));
  assert.throws(()=>standardCardSpec(d,{phase:826}));
  const unknown=structuredClone(d);
  unknown.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:827}));
  assert.deepEqual([c.name,c.cost,c.power,c.race,c.manaValue??1,c.limit],[f.name,f.cost,Number(f.powerText),f.race,1,4]);
  assert.equal(regulationVerification.limits[row.id],4);
  for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
  assert.equal(CARD_IMAGES[row.id],row.image);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:row.id,count:1});
  deck.cards=registry.resolveRows(deck.cards);
  assert.deepEqual(e.validateDeck(deck),[]);
 }
 assert.deepEqual(printAliases.map(x=>x.id),['dmx10-051','dmx17-033']);
 for(const print of printAliases){
  assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:827}),cards.at(-1).spec);
  assert.equal(registry.resolveRows([{id:print.id,count:1}])[0].id,LUNAR);
  assert.equal(regulationVerification.limits[print.id],4);
  assert.equal(refs.find(x=>x.id===print.id).image,print.image);
  assert.ok(!data.cards.some(x=>x.id===print.id));
 }
});

test('Crystal Axe selects exactly one water creature in hand and uses the creature half of a Twinpact',()=>{
 let s=setup();
 const [axe]=give(s,0,'hand',[AXE,LAND,BOUNCE,WATER_SPELL_FACE]);
 const fieldBase=put(s,0,'battle',WATER);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===axe.uid));
 const twin=put(s,0,'hand',WATER_CREATURE_FACE),water=put(s,0,'hand',WATER),anotherAxe=put(s,0,'hand',AXE);
 const count=e.physicalCards(s).length;
 act(s,'play',a=>a.uid===axe.uid&&a.cost===7);
 assert.deepEqual(new Set(values(s)),new Set([twin.uid,water.uid,anotherAxe.uid]));
 s=resume(s);
 pick(s,anotherAxe.uid);
 const entered=s.players[0].battle.find(x=>x.uid===axe.uid);
 assert.equal(e.isEvolution(entered),true);
 assert.deepEqual(entered.under.map(x=>x.uid),[anotherAxe.uid]);
 assert.ok(has(s,0,'battle',fieldBase));
 assert.equal(s.players[0].enteredThisTurn,1);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,7);
 assert.equal(e.physicalCards(s).length,count);
});

test('Crystal Axe attacks immediately, ignores a legal blocker, and breaks two shields',()=>{
 const s=setup();
 put(s,0,'hand',WATER);
 cast(s,AXE);
 pick(s,s.players[0].hand.find(x=>x.cardId===WATER).uid);
 const axe=s.players[0].battle[0],blocker=put(s,1,'battle',BLOCKER),n=s.players[1].shields.length;
 assert.equal(e.effectiveCard(blocker,s).blocker,true);
 attack(s,axe.uid);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'));
 drain(s);
 assert.equal(s.players[1].shields.length,n-2);
 assert.ok(has(s,1,'battle',blocker));
});

test('Tsukumo Spark must return one legal opposing creature and does nothing on an empty opposing field',()=>{
 for(const present of [true,false]){
  const s=setup(),ally=put(s,0,'battle',WATER);
  const enemies=present?[put(s,1,'battle',WATER),put(s,1,'battle',LAND)]:[];
  cast(s,SPARK);
  if(present){
   assert.deepEqual(values(s),enemies.map(x=>x.uid));
   pick(s,enemies[1].uid);
   assert.ok(has(s,1,'hand',enemies[1]));
   assert.ok(has(s,1,'battle',enemies[0]));
  }
  assert.ok(has(s,0,'battle',ally));
  assert.equal(s.decision,null);
 }
});

for(const [spell,decline] of [[BOUNCE,false],[DESTROY,false],[DESTROY,true]])test('Tsukumo Spark leave choice belongs to the opposing player: '+spell+' '+decline,()=>{
 let s=setup();
 const spark=put(s,0,'battle',SPARK),[body,spellOnly]=give(s,1,'hand',[DRAGON,BOUNCE]);
 s.active=spell===BOUNCE?0:1;
 cast(s,spell);
 aim(s,spark);
 const paid=s.players[1].mana.filter(x=>x.tapped).length;
 assert.equal(s.decision.player,1);
 assert.deepEqual(values(s),[body.uid,null]);
 assert.ok(!JSON.stringify(e.observation(s,0)).includes(body.uid));
 assert.ok(JSON.stringify(e.observation(s,1)).includes(body.uid));
 s=resume(s);
 pick(s,decline?null:body.uid);
 assert.equal(has(s,1,'battle',body),!decline);
 assert.equal(has(s,1,'hand',body),decline);
 assert.ok(has(s,1,'hand',spellOnly));
 assert.ok(has(s,0,spell===BOUNCE?'hand':'grave',spark));
 assert.equal(s.players[1].mana.filter(x=>x.tapped).length,paid);
});

test('Tsukumo Spark offers Crystal Axe only with a legal water base in that player’s hand',()=>{
 for(const legal of [false,true]){
  let s=setup();
  const spark=put(s,0,'battle',SPARK),[axe,base]=give(s,1,'hand',[AXE,legal?WATER:BOUNCE]);
  put(s,1,'battle',WATER);
  s.active=1;
  cast(s,DESTROY);
  aim(s,spark);
  const paid=s.players[1].mana.filter(x=>x.tapped).length;
  if(!legal){assert.equal(s.decision,null);assert.ok(has(s,1,'hand',axe));continue;}
  assert.equal(s.decision.player,1);
  pick(s,axe.uid);
  assert.deepEqual(values(s),[base.uid]);
  s=resume(s);
  pick(s,base.uid);
  assert.deepEqual(s.players[1].battle.find(x=>x.uid===axe.uid).under.map(x=>x.uid),[base.uid]);
  assert.equal(s.players[1].mana.filter(x=>x.tapped).length,paid);
 }
});

test('Lunar Chloro gives both sides and itself Slayer; a second copy supplies another instance',()=>{
 const s=setup(),lunar=put(s,0,'battle',LUNAR),ally=put(s,0,'battle',WATER),enemy=put(s,1,'battle',LAND);
 const second=put(s,1,'battle',LUNAR);
 for(const x of [lunar,ally,enemy,second]){
  assert.equal(e.effectiveCard(x,s).slayer,true);
  assert.equal(e.effectiveCard(x,s).g208SlayerCount,2);
 }
 second.sealed=true;
 s.players[1].seals=[{...inst(WATER),sealOf:second.uid,faceDown:true}];
 assert.equal(e.effectiveCard(enemy,s).g208SlayerCount,undefined);
 enemy.tapped=true;
 attack(s,ally.uid,enemy.uid);
 drain(s);
 assert.ok(has(s,0,'grave',ally));
 assert.ok(has(s,1,'grave',enemy));
});

for(const mode of ['take','decline','target creature','non-Dragon','opposing Dragon','sealed source'])test('Lunar Chloro optionally recovers one creature on its owner’s Dragon attack: '+mode,()=>{
 let s=setup();
 const lunar=put(s,0,'battle',LUNAR);
 const [body,other,spell]=give(s,0,'grave',[WATER,LAND,BOUNCE]);
 const wrong=put(s,1,'grave',DRAGON);
 const p=mode==='opposing Dragon'?1:0;
 const attacker=put(s,p,'battle',mode==='non-Dragon'?WATER:DRAGON);
 const enemy=put(s,1-p,'battle',LAND);enemy.tapped=true;
 if(mode==='sealed source'){lunar.sealed=true;s.players[0].seals=[{...inst(WATER),sealOf:lunar.uid,faceDown:true}];}
 s.active=p;
 attack(s,attacker.uid,mode==='target creature'?enemy.uid:'player');
 const triggered=['take','decline','target creature'].includes(mode);
 if(triggered){
  assert.equal(s.decision.player,0);
  assert.deepEqual(values(s),[body.uid,other.uid,null]);
  s=resume(s);
  pick(s,mode==='decline'?null:body.uid);
 }else assert.notEqual(s.decision?.task?.op,'g34_Select');
 assert.equal(has(s,0,'hand',body),triggered&&mode!=='decline');
 assert.ok(has(s,0,'grave',other));
 assert.ok(has(s,0,'grave',spell));
 assert.ok(has(s,1,'grave',wrong));
});
