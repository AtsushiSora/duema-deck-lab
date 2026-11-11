import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,cast,GEN} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const TACHI='dmrp02-070',SAICHO='dmx13-012',REPRINT='dmd10-008',IRO='dmr13-108';
const NATURE='dm01-108',LIGHT='dm01-075',BIG='dmrp08-012',ZERO='dmrp01-012',SEED='dm24rp4-007';
const MARS='dm14-s01',LAIRA='dmrp21-061',DISCARD='dm02-029',DESTROY='dm01-027';

const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const inZone=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const choiceUid=c=>c.value?.uid??c.value;
const pick=(s,uid)=>act(s,'extended',a=>choiceUid(s.decision.choices[a.choice])===uid);

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

test('Phase 968 verifies three canonical cards and the Saicho print alias',()=>{
 const m=read('tools/support-phase-968.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[TACHI,SAICHO,IRO]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[[REPRINT,SAICHO]]);
 for(const row of m.cards){
  const {id}=row,f=row.faces[0],d={...row,status:'complete'},c=e.card(id);
  assert.deepEqual(standardCardSpec(d,{phase:968}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:967}));
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'未知の能力。'}]},{phase:968}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   ['creature',f.cost,Number.parseInt(f.powerText,10),f.race,f.civilizations.filter(x=>x!=='無色'),1,4]);
  assert.equal(c.supportBatch,'phase-968');
  assert.equal(CARD_IMAGES[id],row.image);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(r=>nameKey(r.name)===nameKey(row.name)).map(r=>r.id),[id]);
 }
 assert.deepEqual(catalogue.resolveRows([{id:REPRINT,count:1},{id:SAICHO,count:1}]),[{id:SAICHO,count:2}]);
 const rows=[...m.cards,...m.printAliases];
 for(const row of rows){
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(refs.filter(r=>r.id===row.id).map(r=>[r.canonicalId,r.image]),[[row.canonicalId??row.id,row.image]]);
 }
});

test('Tachi-War can decline a bounce after discard and filters by the actual enemy power',()=>{
 let s=field(1);
 const x=put(s,0,'hand',TACHI),eligible=put(s,1,'battle',BIG,{powerModifiers:[{amount:-2000}]});
 put(s,1,'battle',LIGHT,{powerModifiers:[{amount:500}]});put(s,0,'battle',NATURE);
 cast(s,DISCARD);s=restore(s);
 assert.equal(s.decision.source,TACHI);
 assert.deepEqual(s.decision.choices.filter(c=>c.value).map(choiceUid),[eligible.uid]);
 pick(s,null);
 assert.ok(inZone(s,0,'grave',x)&&inZone(s,1,'battle',eligible));
});

test('Tachi-War milled from the deck can bounce an enemy of exactly 2000 power',()=>{
 const s=field(),x=inst(TACHI),target=put(s,1,'battle',LIGHT);
 s.players[0].deck.unshift(x);
 cast(s,LAIRA);
 assert.equal(s.decision.source,TACHI);
 pick(s,target.uid);
 assert.ok(inZone(s,0,'grave',x)&&inZone(s,1,'hand',target));
});

test('Tachi-War triggers when buried under a destroyed evolution, including against Genmu',()=>{
 const s=field(1),x=inst(TACHI),evo=put(s,0,'battle','dmr16g-021',{under:[x]});
 const target=put(s,1,'battle',LIGHT);put(s,1,'battle',GEN);
 cast(s,DESTROY);act(s,'effect',a=>a.targets?.some(t=>t.uid===evo.uid));
 assert.equal(s.decision.source,TACHI);
 pick(s,target.uid);
 assert.ok(inZone(s,0,'grave',x)&&inZone(s,0,'grave',evo)&&inZone(s,1,'hand',target));
});

test('Saicho counts other living colorless allies, including another copy, and the effect is continuous',()=>{
 const s=field(),x=put(s,0,'battle',SAICHO),other=put(s,0,'battle',SAICHO),zero=put(s,0,'battle',ZERO);
 const sealed=put(s,0,'battle',ZERO,{sealed:true});
 s.players[0].seals=[{...inst(LIGHT),sealOf:sealed.uid,faceDown:true}];
 put(s,0,'battle',NATURE,{under:[inst(ZERO)]});put(s,0,'battle',SEED);put(s,1,'battle',ZERO);
 assert.equal(e.power(x,false,s),15000);
 assert.equal(e.effectiveCard(x,s).extraBreak,2);
 assert.equal(e.power(other,false,s),15000);
 zero.g35Ignored=s.turn;
 assert.equal(e.power(x,false,s),15000);
 x.g35Ignored=s.turn;
 assert.equal(e.power(x,false,s),5000);
 assert.equal(e.effectiveCard(x,s).extraBreak??0,0);
});

test('Saicho breaks one shield plus one for each other colorless creature',()=>{
 const s=field(),x=put(s,0,'battle',SAICHO);
 put(s,0,'battle',ZERO);put(s,0,'battle',ZERO);
 const before=physical(s);
 attack(s,x.uid);act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields');
 assert.equal(s.players[1].shields.length,2);
 assert.equal(s.players[1].hand.length,3);
 assert.deepEqual(physical(s),before);
});

for(const active of [0,1])test('Irokero sends the larger opponent to mana after an actual loss on either turn '+active,()=>{
 const s=field(active),x=put(s,0,'battle',IRO,{tapped:active===1}),enemy=put(s,1,'battle',BIG,{tapped:active===0});
 const before=physical(s);
 attack(s,active===0?x.uid:enemy.uid,active===0?enemy.uid:x.uid);
 act(s,'noBlock');
 assert.ok(inZone(s,0,'grave',x)&&inZone(s,1,'mana',enemy));
 assert.deepEqual(physical(s),before);
});

for(const [card,modifier] of [[LIGHT,0],[MARS,1000]])test('Irokero ignores a tied battle or defeat by a smaller automatic winner '+card,()=>{
 const s=field(),x=put(s,0,'battle',IRO,{buff:modifier}),enemy=put(s,1,'battle',card,{tapped:true});
 attack(s,x.uid,enemy.uid);act(s,'noBlock');
 assert.ok(inZone(s,0,'grave',x));
 assert.ok(inZone(s,1,card===LIGHT?'grave':'battle',enemy));
 assert.ok(!inZone(s,1,'mana',enemy));
});

test('Irokero can lose in an effect battle and only its opponent is moved',()=>{
 let s=field(),x=put(s,0,'battle',IRO),enemy=put(s,1,'battle',BIG),other=put(s,1,'battle',BIG);
 s.extTasks=[{op:'g34_Fight240',p:0,source:IRO,uid:x.uid,incarnation:0,self:true}];
 act(s,'toAttack');s=restore(s);pick(s,enemy.uid);
 assert.ok(inZone(s,0,'grave',x)&&inZone(s,1,'mana',enemy)&&inZone(s,1,'battle',other));
});

test('Irokero loses normally when its ability is ignored',()=>{
 const s=field(),x=put(s,0,'battle',IRO,{g35Ignored:s.turn}),enemy=put(s,1,'battle',BIG,{tapped:true});
 attack(s,x.uid,enemy.uid);act(s,'noBlock');
 assert.ok(inZone(s,0,'grave',x)&&inZone(s,1,'battle',enemy));
});

test('Irokero follows its actual battle opponent when an effect pits two allies against each other',()=>{
 const s=field(),x=put(s,0,'battle',IRO),other=put(s,0,'battle',BIG);
 const spell=put(s,0,'hand','dmrp19-085');
 const before=physical(s);
 act(s,'play',a=>a.uid===spell.uid);pick(s,x.uid);pick(s,other.uid);
 assert.ok(inZone(s,0,'grave',x)&&inZone(s,0,'mana',other));
 assert.deepEqual(physical(s),before);
});
