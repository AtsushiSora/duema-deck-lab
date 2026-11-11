import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const ZEUS='dmr20-s01',ULTRA='dmr19-s01',MIRA='dmr18-l01',LOST='dmr18-l02';
const LIGHT='dm01-001',LIGHT9='dmr20-002',DARK='dm02-028',WATER='dm01-083',FIRE='dm01-097',NATURE='dm01-108';
const DESTROY='dm01-027',BOUNCE='dm01-086',SURFER='dm05-024',HEAVENS='dm16-007',PEARLDA='dmr18-013';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
const value=c=>c.value?.uid??c.value;
const choices=s=>s.decision?.choices?.map(value)??[];
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();

function field(active=0){
 const s=Object.assign(setup(),{active});
 for(const p of [0,1]){give(s,p,'deck',Array(20).fill(NATURE));give(s,p,'grave',[]);}
 return s;
}
function put(s,p,z,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][z].push(x);
 return x;
}
function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}
function finishAttack(s){
 if(s.decision?.type==='block')act(s,'noBlock');
 drain(s);
}
function pass(s){
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
}

function evolve(s,id,base){
 const x=play(s,id);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[base.uid]);
 act(s,'evolve',a=>a.baseUid===base.uid);
 return x;
}

test('Phase 1019 pins four official definitions and the seven equivalent print IDs',()=>{
 const m=read('tools/support-phase-1019.json'),refs=read('tools/image-reference-prints.json').prints;
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[ZEUS,ULTRA,MIRA,LOST]);
 assert.equal(m.printAliases.length,7);
 for(const row of [...m.cards,...m.printAliases]){
  const {id,name,faces}=row,canonical=row.canonicalId??id,c=e.card(canonical),f=faces[0];
  const spec=standardCardSpec({id,name,status:'complete',faces},{phase:1019});
  assert.deepEqual(spec,m.cards.find(x=>x.id===canonical).spec);
  for(const [k,v] of Object.entries(spec))assert.deepEqual(c[k],v);
  assert.deepEqual([c.name,c.type,c.cost,c.race,c.power,e.civilizations(c),c.manaValue,c.limit],
   [name,'creature',f.cost,f.race,Number(f.powerText),f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-1019');
  assert.ok(row.verification.facesMatched&&registry.get(id).supported);
  assert.equal(registry.get(id).id,canonical);
  assert.equal(m.regulationVerification.limits[id],4);
  assert.deepEqual(refs.filter(x=>x.id===id).map(x=>[x.canonicalId,x.image]),[[canonical,row.image]]);
  if(id===canonical)assert.equal(CARD_IMAGES[id],row.image);
  for(const source of [data,details,snapshot])
   assert.deepEqual(source.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[canonical]);
 }
});

for(const mode of ['entry accepts','entry declines','entry below threshold','attack accepts'])
 test('Duelzeus compares creatures and shields for optional shield placement '+mode,()=>{
  const s=field();
  give(s,0,'shields',Array(mode==='entry below threshold'?3:2).fill(NATURE));
  put(s,0,'battle',FIRE);
  const top=s.players[0].deck[0];
  const x=mode==='attack accepts'?put(s,0,'battle',ZEUS):play(s,ZEUS);
  const all=physical(s),c=e.effectiveCard(x,s);
  assert.equal(c.blocker,true);
  assert.equal(c.breaker,2);
  if(mode==='attack accepts')attack(s,x.uid);
  if(mode!=='entry below threshold'){
   assert.equal(s.decision?.type,'extended');
   pick(s,mode==='entry declines'?null:true);
  }
  if(mode==='attack accepts')finishAttack(s);
  assert.equal(has(s,0,'shields',top),mode.endsWith('accepts'));
  assert.ok(!top.faceUp);
  assert.deepEqual(physical(s),all);
 });

test('Ultrastar collects shield bundles at once, suppresses S-Trigger, and puts two new shields down',()=>{
 const s=field();
 give(s,0,'shields',[HEAVENS,LIGHT]);
 const [spell,light]=s.players[0].shields,under=inst(BOUNCE);
 spell.shieldStack=[under];
 const top=s.players[0].deck.slice(0,2);
 const x=play(s,ULTRA);
 assert.equal(s.decision,null);
 assert.deepEqual(s.players[0].shields.map(x=>x.uid),top.map(x=>x.uid));
 assert.ok(top.every(x=>!x.faceUp));
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),[spell,under,light].map(x=>x.uid));
 assert.equal(e.effectiveCard(x,s).breaker,2);
 assert.equal(s.metrics[0].triggers,0);
});

for(const [source,shieldCount,expected] of [[ZEUS,5,true],[ZEUS,6,false],[ULTRA,3,false],[ULTRA,2,true]])
 test('Revolution 2 checks the appropriate shield count on a simultaneous break '+source+' '+shieldCount,()=>{
  let s=field(1);
  const attacker=put(s,1,'battle',MIRA);
  put(s,0,'battle',source);
  give(s,0,'shields',[source===ZEUS?LIGHT9:LIGHT,...Array(shieldCount-1).fill(NATURE)]);
  const [target]=s.players[0].shields,all=physical(s);
  attack(s,attacker.uid);
  act(s,'noBlock');
  if(s.decision?.type==='breakChoice')act(s,'breakShields',a=>a.shields.includes(target.uid));
  if(expected){
   assert.equal(s.decision?.type,'trigger');
   s=JSON.parse(JSON.stringify(s));
   act(s,'useTrigger',a=>a.uid===target.uid);
   assert.ok(has(s,0,'battle',target));
  }else assert.ok(has(s,0,'hand',target));
  drain(s);
  assert.equal(s.metrics[0].triggers,expected?1:0);
  assert.equal(s.metrics[1].breaks,Math.min(3,shieldCount));
  assert.deepEqual(physical(s),all);
 });

for(const [source,shield] of [[ZEUS,LIGHT],[ZEUS,HEAVENS],[ULTRA,NATURE]])
 test('The Light grant does not apply to the wrong type, cost or civilization '+source+' '+shield,()=>{
  const s=field(1),attacker=put(s,1,'battle',FIRE);
  put(s,0,'battle',source);
  give(s,0,'shields',[shield]);
  const [target]=s.players[0].shields;
  attack(s,attacker.uid);
  act(s,'noBlock');
  if(shield===HEAVENS)act(s,'skipTrigger');
  assert.ok(has(s,0,'hand',target));
  assert.equal(s.metrics[0].triggers,0);
 });

for(const source of [ZEUS,ULTRA])
 test('Pearlda hand recovery uses the same timing and does not count as a break '+source,()=>{
  const s=field(),attacker=put(s,0,'battle',PEARLDA);
  put(s,0,'battle',source);
  give(s,0,'shields',[LIGHT9,NATURE,NATURE]);
  const [shield]=s.players[0].shields;
  attack(s,attacker.uid);
  pick(s,shield.uid);
  if(source===ZEUS)act(s,'useTrigger',a=>a.uid===shield.uid);
  assert.equal(has(s,0,'battle',shield),source===ZEUS);
  assert.equal(has(s,0,'hand',shield),source===ULTRA);
  assert.equal(s.metrics[0].breaks,0);
  drain(s);
 });

test('Miradante taps all opposing creatures and freezes them for just their next start',()=>{
 const s=field(),base=put(s,0,'battle',LIGHT),own=put(s,0,'battle',FIRE);
 const a=put(s,1,'battle',FIRE),b=put(s,1,'battle',WATER,{tapped:true});
 const x=evolve(s,MIRA,base);
 assert.equal(e.effectiveCard(x,s).breaker,3);
 assert.ok(a.tapped&&b.tapped&&!own.tapped);
 pass(s);
 assert.equal(s.active,1);
 assert.ok(a.tapped&&b.tapped);
 pass(s);
 pass(s);
 assert.equal(s.active,1);
 assert.ok(!a.tapped&&!b.tapped);
});

test('Miradante prevents paid and free summons on either turn, but not ability placement',()=>{
 const s=field(1);
 put(s,0,'battle',MIRA);
 give(s,0,'shields',[]);
 const unit=put(s,1,'hand',FIRE);
 const spell=put(s,1,'hand',BOUNCE);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===unit.uid));
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===spell.uid));
 assert.equal(e.canEnterCreature(s,1,e.card(FIRE),{execution:false}),true);
 assert.equal(e.canEnterCreature(s,1,e.card(FIRE)),false);
 s.active=0;
 assert.equal(e.canEnterCreature(s,1,e.card(FIRE)),false);
 give(s,0,'shields',[NATURE]);
 assert.equal(e.canEnterCreature(s,1,e.card(FIRE)),true);
});

test('Miradante blocks creature Shield Trigger declarations and allows spell triggers',()=>{
 const s=field(),attacker=put(s,0,'battle',MIRA);
 give(s,0,'shields',[]);
 give(s,1,'shields',[SURFER,BOUNCE]);
 const [creature,spell]=s.players[1].shields;
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.uid===spell.uid);
 act(s,'effect',a=>a.targets.some(x=>x.uid===attacker.uid));
 drain(s);
 assert.ok(has(s,1,'hand',creature)&&has(s,1,'grave',spell)&&has(s,0,'hand',attacker));
 assert.equal(s.metrics[1].triggers,1);
});

for(const mode of ['with a shield','direct victory','trigger removes attacker','attacks a creature'])
 test('Death the Lost discards all and resolves its attack before ordinary combat '+mode,()=>{
  const s=field(),base=put(s,0,'battle',DARK);
  give(s,0,'shields',mode==='with a shield'?[NATURE]:[]);
  give(s,1,'hand',[FIRE,WATER,NATURE]);
  give(s,1,'shields',[mode==='trigger removes attacker'?DESTROY:NATURE,NATURE,NATURE,NATURE,NATURE]);
  const discarded=[...s.players[1].hand],defender=mode==='attacks a creature'?put(s,1,'battle',FIRE,{tapped:true}):null;
  const x=evolve(s,LOST,base),all=physical(s);
  drain(s);
  assert.ok(discarded.every(y=>has(s,1,'grave',y)));
  assert.equal(s.players[1].hand.length,0);
  assert.equal(e.effectiveCard(x,s).breaker,3);
  attack(s,x.uid,defender?.uid??'player');
  if(mode==='trigger removes attacker'){
   act(s,'useTrigger');
   act(s,'effect',a=>a.targets.some(y=>y.uid===x.uid));
  }
  finishAttack(s);
  assert.equal(s.metrics[0].breaks,mode==='with a shield'?3:5);
  assert.equal(s.winner,mode==='direct victory'?0:null);
  if(defender)assert.ok(has(s,1,'grave',defender));
  if(mode==='trigger removes attacker')assert.ok(has(s,0,'grave',x));
  assert.deepEqual(physical(s),all);
 });

test('Duelzeus grants triggers to both eligible cards in one shield bundle',()=>{
 const s=field(1),attacker=put(s,1,'battle',FIRE);
 put(s,0,'battle',ZEUS);
 give(s,0,'shields',[LIGHT9,NATURE,NATURE]);
 const [root]=s.players[0].shields,second=inst(LIGHT9);
 root.shieldStack=[second];
 const all=physical(s);
 attack(s,attacker.uid);
 act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields',a=>a.shields.includes(root.uid));
 act(s,'useTrigger',a=>a.uid===root.uid);
 act(s,'useTrigger',a=>a.uid===second.uid);
 drain(s);
 assert.ok(has(s,0,'battle',root)&&has(s,0,'battle',second));
 assert.equal(s.metrics[1].breaks,1);
 assert.deepEqual(physical(s),all);
});

test('Ultrastar grants Shield Trigger to a Light spell without a printed trigger',()=>{
 const s=field(1),attacker=put(s,1,'battle',FIRE);
 put(s,0,'battle',ULTRA);
 const spell='dm01-046';
 const definition=e.card(spell);
 assert.ok(definition.type==='spell'&&!definition.trigger&&definition.civ==='光');
 give(s,0,'shields',[spell]);
 const [x]=s.players[0].shields;
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.uid===x.uid);
 drain(s);
 assert.ok(has(s,0,'grave',x));
 assert.equal(s.metrics[0].triggers,1);
});
