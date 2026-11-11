import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,cast,drain,GEN} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const CAVE='dmrp08-012',BEL='dmr16g-050',GRU='dmrp02-045',REPRINT='dm22ex1-085';
const LIGHT='dm01-075',LIGHT3='dm28-073',WATER='dm01-083',NATURE='dm01-108';
const MULTI='dm10-068',EVOLUTION='dmr16s-005',DRAW='dm06-085',BOUNCE='dm01-086';
const DISCOUNT_SPELL='dm26rp1-060',GANG='dmrp17-078',APUL='dmrp22-042';

const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const choices=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>choices(s)[a.choice]===value);

function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1]){give(s,p,'deck',Array(18).fill(NATURE));give(s,p,'grave',[]);}
 return s;
}

function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}

test('Phase 966 verifies three canonical definitions, including Gru’s reprint alias',()=>{
 const m=read('tools/support-phase-966.json');
 const refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(c=>c.id),[CAVE,BEL,GRU]);
 for(const row of m.cards){
  const {id}=row,f=row.faces[0],d={...row,status:'complete'},c=e.card(id);
  assert.deepEqual(standardCardSpec(d,{phase:966}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:965}));
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'未知の能力。'}]},{phase:966}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.race,c.power,e.civilizations(c),c.manaValue,c.limit],
   ['creature',f.cost,f.race,Number(f.powerText),f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-966');
  assert.equal(CARD_IMAGES[id],row.image);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(r=>nameKey(r.name)===nameKey(row.name)).map(r=>r.id),[id]);
 }
 assert.deepEqual(m.printAliases.map(r=>[r.id,r.canonicalId]),[[REPRINT,GRU]]);
 assert.deepEqual(catalogue.resolveRows([{id:REPRINT,count:1},{id:GRU,count:1}]),[{id:GRU,count:2}]);
 const rows=[...m.cards,...m.printAliases];
 for(const row of rows){
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(refs.filter(r=>r.id===row.id).map(r=>[r.canonicalId,r.image]),[[row.canonicalId??row.id,row.image]]);
 }
 assert.deepEqual(standardCardSpec({...m.printAliases[0],status:'complete'},{phase:966}),m.cards.at(-1).spec);
});

test('Cave offers equal and lower cost light creatures for every friendly spell, with an optional skip',()=>{
 const s=field();
 put(s,0,'battle',CAVE);
 const lower=put(s,0,'hand',LIGHT),equal=put(s,0,'hand',LIGHT3);
 put(s,0,'hand',WATER);put(s,0,'hand',CAVE);put(s,0,'hand',EVOLUTION);
 cast(s,DRAW);
 assert.deepEqual(choices(s).filter(x=>typeof x==='string').sort(),[lower.uid,equal.uid].sort());
 pick(s,equal.uid);
 assert.ok(s.players[0].battle.includes(equal));
 cast(s,DRAW);assert.ok(choices(s).includes(lower.uid));
 act(s,'extended',a=>choices(s)[a.choice]!==lower.uid);
 assert.ok(s.players[0].hand.includes(lower));
 assert.equal(s.decision,null);
});

test('Cave uses the printed cost of a discounted spell and allows legal evolution',()=>{
 let s=field();
 put(s,0,'battle',CAVE);
 const base=put(s,0,'battle',LIGHT),evolution=put(s,0,'hand',EVOLUTION);
 s.players[0].shields[0].faceUp=true;
 const spell=put(s,0,'hand',DISCOUNT_SPELL);
 const before=physical(s);
 act(s,'play',a=>a.uid===spell.uid);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,1);
 s=restore(s);
 pick(s,evolution.uid);
 pick(s,base.uid);
 assert.ok(s.players[0].battle.find(x=>x.uid===evolution.uid)?.under.some(x=>x.uid===base.uid));
 assert.deepEqual(physical(s),before);
});

test('Cave watches its controller’s free S-Trigger spell during the opponent’s turn',()=>{
 const s=field(1);
 put(s,0,'battle',CAVE);
 const attacker=put(s,1,'battle',NATURE),light=put(s,0,'hand',LIGHT);
 give(s,0,'shields',[BOUNCE]);
 cast(s,DRAW);assert.equal(s.decision,null);
 attack(s,attacker.uid);act(s,'noBlock');act(s,'useTrigger');
 act(s,'effect',a=>a.targets?.some(x=>x.uid===attacker.uid));
 pick(s,light.uid);
 assert.ok(s.players[0].battle.includes(light));
 assert.ok(s.players[0].mana.every(x=>!x.tapped));
});

test('Cave suppressed by Genmu leaves the spell effect intact',()=>{
 const s=field();put(s,0,'battle',CAVE);put(s,1,'battle',GEN);
 // Genmu also suppresses low-cost spells, so use a cast above its spell threshold.
 const spell='dmex07-m11',light=put(s,0,'hand',LIGHT);
 cast(s,spell);assert.equal(s.decision,null);
 assert.ok(s.players[0].grave.some(x=>x.cardId===spell));
 assert.ok(s.players[0].hand.includes(light));
});

test('Bellebelle counts face-up nature mana including a tapped multicolor card and spends three mana',()=>{
 const s=field(),c=e.card(BEL),x=put(s,0,'hand',BEL);
 give(s,0,'mana',[NATURE,NATURE,LIGHT,WATER]);
 give(s,1,'mana',[NATURE,NATURE,NATURE]);
 assert.equal(e.summonCost(s,0,c),8);
 assert.ok(!e.getLegalActions(s).some(a=>a.uid===x.uid&&a.kind==='play'));
 const rainbow=put(s,0,'mana',MULTI,{tapped:true,faceDown:true});
 assert.equal(e.summonCost(s,0,c),8);
 rainbow.faceDown=false;
 assert.equal(e.summonCost(s,0,c),3);
 const extra=put(s,0,'mana',NATURE,{tapped:true});
 assert.equal(e.summonCost(s,0,c),3);
 const before=physical(s);
 act(s,'play',a=>a.uid===x.uid);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,5);
 assert.ok(rainbow.tapped&&extra.tapped&&s.players[0].battle.includes(x));
 assert.deepEqual(physical(s),before);
});

test('Bellebelle uses ordinary summon cost restrictions',()=>{
 const s=field(),c=e.card(BEL);
 assert.equal(e.summonCost(s,0,c),3);
 put(s,1,'battle','dmrp22-027');
 assert.equal(e.summonCost(s,0,c),8);
});

test('Gru can return either grave copy after a friendly Mafy Gang enters, and the other may decline',()=>{
 let s=field();
 const yes=put(s,0,'grave',GRU,{zoneSerial:4}),no=put(s,0,'grave',GRU,{zoneSerial:2});
 const opposing=put(s,1,'grave',GRU);
 const gang=put(s,0,'hand',GANG);
 const before=physical(s);
 act(s,'play',a=>a.uid===gang.uid);
 s=restore(s);
 assert.equal(s.decision.type,'effectOrder');
 act(s,'orderEffect',a=>s.pendingEffects.some(effect=>effect.effectId===a.effectId&&effect.uid===yes.uid));
 pick(s,true);
 assert.equal(s.decision.source,GRU);
 act(s,'extended',a=>choices(s)[a.choice]!==true);
 assert.ok(s.players[0].hand.some(x=>x.uid===yes.uid));
 assert.ok(s.players[0].grave.some(x=>x.uid===no.uid));
 assert.ok(s.players[1].grave.some(x=>x.uid===opposing.uid));
 assert.deepEqual(physical(s),before);
});

test('Gru ignores an opponent’s entry and an ally of another race',()=>{
 const s=field(1),x=put(s,0,'grave',GRU);
 cast(s,GANG);assert.equal(s.decision,null);
 s.active=0;cast(s,NATURE);assert.equal(s.decision,null);
 assert.deepEqual(s.players[0].grave,[x]);
});

test('Gru watches an unpaid entry and honors an opposing graveyard lock',()=>{
 for(const locked of [false,true]){
  const s=field(),x=put(s,0,'grave',GRU);
  if(locked)put(s,1,'battle',APUL);
  put(s,0,'hand',GRU);
  s.extTasks=[{op:'g34_Sequence',p:0,source:CAVE,defs:[
   {op:'Select',origin:'hand',n:1,deploy:true,optional:false,filter:{exactId:GRU}}
  ]}];
  act(s,'toAttack');drain(s);
  assert.equal(s.players[0].battle[0]?.cardId,GRU);
  assert.ok(s.players[0].mana.every(x=>!x.tapped));
  assert.ok(s.players[0][locked?'grave':'hand'].includes(x));
 }
});
