import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,cast,drain,GEN} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const RACCOON='dmr05-104',GLASS='dmr05-046',HAMMER='dmr05-094';
const LIGHT='dm01-075',DARK='dm01-090',FIRE='dm01-097',NATURE='dm01-108';
const BIG_CREATURE_TWIN='dm22ex1-030',BIG_SPELL_TWIN='dm22ex1-098';
const BAIKEN='dm29-s02',DEPLOY_ATTACKER='dmr03-s03';
const field=()=>{
 const s=setup();
 for(const p of [0,1]){
  give(s,p,'deck',Array(12).fill(NATURE));
  give(s,p,'grave',[]);
 }
 return s;
};
function add(s,p,zone,id,props){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===(value?.uid??value));
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const ids=xs=>xs.map(x=>x.uid);
const restore=s=>JSON.parse(JSON.stringify(s));
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}

test('Phase 869 registers each whole official card, with its printed stats and original ID',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-869.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[RACCOON,GLASS,HAMMER]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(d.faces,row.faces);
  assert.deepEqual(standardCardSpec(d,{phase:869}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:868}));
  const unknown=structuredClone(d);
  unknown.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:869}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.cost,c.civilizations,c.manaValue,c.limit],[f.cost,f.civilizations,1,4]);
  if(row.id===RACCOON)assert.deepEqual([c.type,c.power,c.race],['creature',2000,f.race]);
  else assert.equal(c.type,'spell');
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);
  assert.deepEqual(registry.resolveRows([{id:row.id,count:4}]),[{id:row.id,count:4}]);
 }
});

test('Raccoon can choose either side and permits creature attacks while blocking player attacks that turn',()=>{
 for(const p of [0,1]){
  const s=field(),target=add(s,p,'battle',FIRE),defender=add(s,1-p,'battle',LIGHT,{tapped:true});
  cast(s,RACCOON);
  assert.ok(values(s).includes(target.uid));
  pick(s,target);
  assert.equal(e.power(target,false,s),e.card(target).power+4000);
  assert.ok(e.effectiveCard(target,s).noPlayerAttack);
  if(p===0){
   s.phase='attack';
   const attacks=e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===target.uid);
   assert.deepEqual(attacks.map(a=>a.target),[defender.uid]);
  }
  end(s);
  assert.equal(e.power(target,false,s),e.card(target).power);
  assert.ok(!e.effectiveCard(target,s).noPlayerAttack);
 }
});

test('Raccoon entering during an attack does not cancel that attack and prevents the attacker from attacking the player again (QA 36624)',()=>{
 const s=field(),attacker=add(s,0,'battle',DEPLOY_ATTACKER),raccoon=add(s,0,'hand',RACCOON);
 attack(s,attacker.uid);
 pick(s,raccoon);
 pick(s,attacker);
 assert.ok(e.effectiveCard(attacker,s).noPlayerAttack);
 if(s.decision?.type==='block')act(s,'noBlock');
 act(s,'breakShields',a=>a.shields.length===3);
 assert.equal(s.players[1].brokenThisTurn,3);
 attacker.tapped=false;
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===attacker.uid&&a.target==='player'));
});

test('Raccoon is a free Shield Trigger and its resolved creature effect persists when Genmu appears',()=>{
 const s=field(),attacker=add(s,1,'battle',FIRE);
 give(s,0,'shields',[RACCOON]);
 s.active=1;
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 pick(s,attacker);
 assert.equal(s.metrics[0].triggers,1);
 assert.ok(s.players[0].mana.every(x=>!x.tapped));
 add(s,1,'battle',GEN);
 assert.equal(e.power(attacker,false,s),e.card(attacker).power+4000);
 assert.ok(e.effectiveCard(attacker,s).noPlayerAttack);
});

test('Glass taps the two chosen creatures before offering a valid creature face to reveal, including already tapped targets',()=>{
 let s=field();
 const first=add(s,1,'battle',FIRE),second=add(s,1,'battle',DARK,{tapped:true}),other=add(s,1,'battle',NATURE,{tapped:true});
 const eligible=add(s,0,'hand',BIG_CREATURE_TWIN),wrongFace=add(s,0,'hand',BIG_SPELL_TWIN);
 cast(s,GLASS);
 pick(s,first);
 assert.ok(!first.tapped);
 pick(s,second);
 assert.ok(first.tapped);
 assert.deepEqual(values(s),[eligible.uid,null]);
 s=restore(s);
 pick(s,eligible);
 assert.ok(has(s,0,'hand',eligible)&&has(s,0,'hand',wrongFace));
 assert.ok(s.log.some(x=>x.type==='reveal'&&x.cardId===eligible.cardId));
 end(s);
 for(const x of [first,second])assert.ok(s.players[1].battle.find(y=>y.uid===x.uid).tapped);
 assert.ok(!s.players[1].battle.find(y=>y.uid===other.uid).tapped);
 end(s);
 end(s);
 assert.ok(s.players[1].battle.every(x=>!x.tapped));
});

test('Glass can decline the reveal, or reveal even when no targets were selected',()=>{
 for(const selectTarget of [false,true]){
  const s=field(),target=add(s,1,'battle',FIRE),revealed=add(s,0,'hand',BIG_CREATURE_TWIN);
  cast(s,GLASS);
  if(selectTarget)pick(s,target);
  if(s.decision.task.op==='g34_Select')pick(s,null);
  assert.deepEqual(values(s),[revealed.uid,null]);
  pick(s,selectTarget?null:revealed);
  assert.equal(target.tapped,selectTarget);
  assert.ok(!e.skipsStartUntap(s,target));
  end(s);
  assert.ok(!target.tapped);
 }
});

test('Hammer returns the physical cast spell only if the opponent actually discards a spell or a twinpact',()=>{
 for(const id of [GLASS,BIG_CREATURE_TWIN,FIRE]){
  let s=field();
  const hammer=add(s,0,'hand',HAMMER),kept=add(s,1,'hand',DARK),selected=add(s,1,'hand',id);
  act(s,'play',a=>a.uid===hammer.uid);
  assert.equal(s.decision.player,1);
  assert.deepEqual(values(s),ids([kept,selected]));
  s=restore(s);
  pick(s,selected);
  assert.ok(has(s,1,'grave',selected)&&has(s,1,'hand',kept));
  assert.ok(has(s,0,id===FIRE?'grave':'hand',hammer));
  assert.equal(e.physicalCards(s).filter(x=>x.uid===hammer.uid).length,1);
 }
});

test('Hammer goes to the grave against an empty hand or when a discard is replaced',()=>{
 for(const id of [null,BAIKEN]){
  const s=field(),hammer=add(s,0,'hand',HAMMER);
  if(id)add(s,1,'hand',id);
  act(s,'play',a=>a.uid===hammer.uid);
  if(id){
   pick(s,s.players[1].hand[0]);
   pick(s,true);
   if(s.decision)pick(s,null);
   assert.ok(s.players[1].battle.some(x=>x.cardId===id));
  }
  assert.ok(has(s,0,'grave',hammer));
 }
});
