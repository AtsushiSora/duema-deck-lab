import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const DUBER='dmr23-004',TANK='dm22rp1-047',DIABRA='dmrp04s-043';
const SMALL='dm01-108',FISH='dm01-048',SIX='dmrp07-086',EIGHT='dmx22b-008',NINE='dmx22b-009';
const SEED='dm22ex2-050',BIG_SEED='dm24rp4-007',SEED_CREATURE='dm22rp2-S8',FIELD='dmrp08-005';
const FANG='dm03-013',SABURO='dmrp07-046',CADDY='dm22rp1-049',CANDY='dm01-081',DEMON='dm01-027';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const field=()=>Object.assign(setup(),{active:0});
const restore=s=>JSON.parse(JSON.stringify(s));
function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('three official cards preserve canonical IDs, complete printed data, images and limits',()=>{
 const m=read('tools/support-phase-1192.json'),registry=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(c=>c.id),[DUBER,TANK,DIABRA]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),[f]=row.faces;
  assert.deepEqual(registry.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[id]);
  assert.deepEqual([c.type,c.cost,c.power,c.civilizations,c.race,c.manaValue,c.limit],
   ['creature',f.cost,parseInt(f.powerText,10),f.civilizations.filter(x=>x!=='無色'),f.race,1,4]);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1192}),row.spec);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.equal(refs.find(ref=>ref.id===row.id&&ref.canonicalId===id)?.image,row.image);
  assert.equal(m.regulationVerification.limits[row.id],4);
  if(!row.canonicalId){
   assert.equal(CARD_IMAGES[id],row.image);
   assert.deepEqual(details.cards.find(c=>c.id===id).faces,row.faces);
  }
  const changed={...f,abilityText:f.abilityText+'\n未知の能力。'};
  assert.throws(()=>standardCardSpec({...row,status:'complete',faces:[changed]},{phase:1192}));
 }
});

function moveWith(s,...defs){
 s.extTasks=[{op:'g34_Sequence',p:s.active,source:DEMON,defs}];
 act(s,'toAttack');
}
const destroy=(p,x)=>({op:'ExactMove',owner:p,to:'grave',target:x.uid});
const choices=s=>s.decision?.choices.map(c=>c.value?.uid??c.value);
const choose=(s,value)=>act(s,'extended',a=>choices(s)[a.choice]===value);

for(const [victimPlayer,skip] of [[0,false],[1,true]])test('Duber checks last power on either side and offers an optional destruction: '+victimPlayer,()=>{
 let s=field();
 put(s,0,'battle',DUBER);
 const victim=put(s,victimPlayer,'battle',SMALL,{powerModifiers:[{amount:4000}]});
 const fish=put(s,1,'battle',FISH),equal=put(s,1,'battle',SIX);
 put(s,0,'battle',FISH);
 const boosted=put(s,1,'battle',FISH,{powerModifiers:[{amount:2000}]});
 moveWith(s,destroy(victimPlayer,victim));
 assert.ok(has(s,victimPlayer,'grave',victim));
 assert.deepEqual(choices(s),[fish.uid,null]);
 s=restore(s);
 choose(s,skip?null:fish.uid);
 drain(s);
 assert.ok(has(s,1,skip?'battle':'grave',fish)&&has(s,1,'battle',equal)&&has(s,1,'battle',boosted));
});

test('Duber uses its own power and triggers only once when leaving with another creature',()=>{
 const s=field();
 const duber=put(s,0,'battle',DUBER),victim=put(s,0,'battle',SMALL);
 const fish=put(s,1,'battle',FISH),candy=put(s,1,'battle',CANDY),equal=put(s,1,'battle',EIGHT);
 moveWith(s,{op:'Sweep',owner:'self',to:'grave',filter:{creature:true}});
 assert.ok(has(s,0,'grave',duber)&&has(s,0,'grave',victim));
 assert.deepEqual(choices(s),[fish.uid,candy.uid,null]);
 choose(s,fish.uid);
 assert.ok(!s.decision&&has(s,1,'grave',fish)&&has(s,1,'battle',equal)&&has(s,1,'battle',candy));
});

test('Duber snapshots each victim before simultaneous destruction removes its power bonus',()=>{
 const s=field();
 const duber=put(s,0,'battle',DUBER),ring=put(s,0,'battle',DIABRA),fang=put(s,0,'battle',FANG);
 const candy=put(s,1,'battle',CANDY),small=put(s,1,'battle',SMALL);
 assert.equal(e.power(fang,false,s),2000);
 moveWith(s,{op:'Sweep',owner:'self',to:'grave',filter:{color:'闇'}});
 assert.ok(has(s,0,'grave',ring)&&has(s,0,'grave',fang));
 assert.equal(s.pendingEffects.filter(effect=>effect.uid===duber.uid).length,2);
 act(s,'orderEffect');
 assert.ok(choices(s).includes(candy.uid));
 choose(s,null);
 assert.ok(choices(s).includes(candy.uid));
 choose(s,candy.uid);
 assert.ok(has(s,1,'grave',candy)&&has(s,1,'battle',small));
});

test('Duber uses the power of a creature lost during battle, including its battle bonus',()=>{
 const s=field();
 put(s,0,'battle',DUBER);
 const attacker=put(s,0,'battle',SABURO),defender=put(s,1,'battle',NINE,{tapped:true});
 const fish=put(s,1,'battle',FISH),equal=put(s,1,'battle',SIX);
 attack(s,attacker.uid,defender.uid);
 act(s,'noBlock');
 assert.ok(has(s,0,'grave',attacker));
 assert.deepEqual(choices(s),[fish.uid,null]);
 choose(s,fish.uid);
 assert.ok(has(s,1,'battle',equal)&&has(s,1,'grave',fish));
});

test('Duber does not watch a replaced destruction, a non-creature departure, or while ignored',()=>{
 for(const mode of ['replaced','seed','ignored']){
  const s=field();
  const duber=put(s,0,'battle',DUBER),candy=put(s,1,'battle',CANDY);
  const victim=put(s,1,'battle',mode==='replaced'?CADDY:mode==='seed'?SEED:FISH,
   {powerModifiers:[{amount:3000}]});
  if(mode==='ignored')duber.g35Ignored=s.turn;
  moveWith(s,{op:'Sweep',to:'grave',element:true,filter:{exactUid:victim.uid}});
  assert.ok(!s.decision&&has(s,1,'battle',candy)&&has(s,1,mode==='replaced'?'mana':'grave',victim),mode);
 }
});

for(const target of [FISH,SEED,SEED_CREATURE])test('Tank must choose before blocking and moves an eligible opponent card to mana: '+target,()=>{
 let s=field();
 const tank=put(s,0,'battle',TANK),fish=put(s,1,'battle',FISH),seed=put(s,1,'battle',SEED);
 const seedCreature=put(s,1,'battle',SEED_CREATURE);
 put(s,1,'battle',BIG_SEED);
 put(s,1,'battle',SIX);
 put(s,1,'battle',FIELD);
 put(s,1,'battle',FISH,{g34Grants:[{turn:s.turn,untargetable:true}]});
 put(s,0,'battle',SEED);
 assert.equal(e.isCreature(s,seedCreature),false);
 attack(s,tank.uid);
 assert.equal(s.decision?.player,0);
 assert.deepEqual(choices(s),[fish.uid,seed.uid,seedCreature.uid]);
 const selected=[fish,seed,seedCreature].find(x=>x.cardId===target);
 s=restore(s);
 choose(s,selected.uid);
 assert.ok(has(s,1,'mana',selected));
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('Duber and Tank still break two shields when there is no eligible creature or seed',()=>{
 for(const id of [DUBER,TANK]){
  const s=field();
  attack(s,put(s,0,'battle',id).uid);
  act(s,'noBlock');
  drain(s);
  assert.equal(s.players[1].shields.length,3);
 }
});

test('Diabra must block if able and is destroyed after winning its battle',()=>{
 const s=field(),attacker=put(s,0,'battle',SMALL),ring=put(s,1,'battle',DIABRA);
 attack(s,attacker.uid);
 assert.deepEqual(e.getLegalActions(s).map(a=>a.kind),['block']);
 act(s,'block',a=>a.uid===ring.uid);
 drain(s);
 assert.ok(has(s,0,'grave',attacker)&&has(s,1,'grave',ring));
 assert.ok(s.log.findIndex(x=>x.type==='battle')<s.log.findIndex(x=>x.type==='leave'&&x.cardId===DIABRA));
 assert.equal(s.players[1].shields.length,5);
});

test('Both required Diabra blockers tap and only the last to redirect battles',()=>{
 const s=field(),attacker=put(s,0,'battle',SMALL);
 const first=put(s,1,'battle',DIABRA),last=put(s,1,'battle',DIABRA);
 attack(s,attacker.uid);
 assert.deepEqual(e.getLegalActions(s).map(a=>a.kind),['defendMany']);
 act(s,'defendMany');
 choose(s,first.uid);
 assert.ok(!choices(s).includes(null));
 choose(s,last.uid);
 choose(s,null);
 drain(s);
 assert.ok(has(s,1,'battle',first)&&first.tapped&&has(s,1,'grave',last));
});

test('Diabra cannot block an unblockable attack and can attack a player without self-destructing',()=>{
 const s=field(),attacker=put(s,0,'battle',CANDY),ring=put(s,1,'battle',DIABRA);
 attack(s,attacker.uid);
 act(s,'noBlock');
 drain(s);
 assert.ok(has(s,1,'battle',ring)&&!ring.tapped);
 s.active=1;
 attack(s,ring.uid);
 act(s,'noBlock');
 drain(s);
 assert.ok(has(s,1,'battle',ring));
 assert.equal(s.players[0].shields.length,4);
});

test('Diabra self-destructs in an effect battle it wins, but an ignored Diabra survives',()=>{
 for(const ignored of [false,true]){
  const s=field(),ring=put(s,0,'battle',DIABRA),opponent=put(s,1,'battle',SMALL);
  if(ignored)ring.g35Ignored=s.turn;
  moveWith(s,{op:'Fight240',g419FightFilter:{exactUid:ring.uid},enemyFilter:{exactUid:opponent.uid}});
  drain(s);
  assert.ok(has(s,1,'grave',opponent)&&has(s,0,ignored?'battle':'grave',ring));
 }
});
