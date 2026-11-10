import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const CHARGER='dmr03-013',CHAIN='dmr01-058',INA='dm37-046',PRINT='dmd15-011';
const LAND='dm01-108',WATER='dm01-083',BIG='dm01-079',BROCCOLI='dm10-035',GENMU='dmrp15-km1';
const HEAVY='dmex17-033',METAL='dmex17-059',ENERGY='dm06-085',BURST='dm02-032';
const field=(active=0)=>Object.assign(setup(),{active});
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const values=s=>s.decision.choices.map(o=>o.value?.uid??o.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const restore=s=>JSON.parse(JSON.stringify(s));
const attacks=(s,x)=>e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===x.uid).map(a=>a.target);
const slayers=(s,x)=>e.effectiveCard(x,s).g208SlayerCount??Number(!!e.effectiveCard(x,s).slayer);
function put(s,p,z,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][z].push(x);
 return x;
}
function cast(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}

test('Phase 838 pins three official definitions, one reprint and a distinct twinpact',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-838.json',import.meta.url)));
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[CHARGER,CHAIN,INA]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),f=d.faces[0];
  assert.deepEqual(row.faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:838}),row.spec);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.name,c.cost,c.power,c.race??'',c.manaValue,c.limit],[f.name,f.cost,Number(f.powerText),f.race,1,4]);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.ok(row.verification.facesMatched);
  assert.deepEqual(data.cards.filter(x=>x.name===c.name).map(x=>x.id),[row.id]);
  const unknown=structuredClone(d);
  unknown.faces[0].abilityText+='未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:838}));
 }
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[[PRINT,CHARGER]]);
 assert.deepEqual(catalogue.resolveRows([{id:PRINT,count:1},{id:CHARGER,count:3}]),[{id:CHARGER,count:4}]);
 assert.equal(m.regulationVerification.limits[PRINT],4);
 assert.equal(snapshot.aliases['dm23ex2-098'],undefined);
});

for(const fresh of [false,true])test('Charger adds untapped targets within the permitted attack scope '+fresh,()=>{
 let s=field();
 const fighter=put(s,0,'battle',LAND,{entered:fresh?s.turn:0});
 const other=put(s,0,'battle',WATER,{entered:s.turn});
 const untapped=put(s,1,'battle',WATER),tapped=put(s,1,'battle',WATER,{tapped:true});
 const spell=cast(s,CHARGER);
 assert.deepEqual(values(s),[fighter.uid,other.uid]);
 s=restore(s);
 pick(s,fighter.uid);
 assert.ok(has(s,0,'mana',spell)&&!has(s,0,'grave',spell));
 assert.equal(s.players[0].mana.find(x=>x.uid===spell.uid).tapped,false);
 s.phase='attack';
 const allowed=attacks(s,fighter);
 assert.ok(allowed.includes(untapped.uid));
 assert.equal(allowed.includes(tapped.uid),!fresh);
 assert.equal(allowed.includes('player'),!fresh);
 assert.deepEqual(attacks(s,other),[]);
 attack(s,fighter.uid,untapped.uid);
 drain(s);
 assert.ok(has(s,1,'grave',untapped));
});

test('Charger works without a friendly target and expires across turns',()=>{
 const empty=field(),spell=cast(empty,CHARGER);
 assert.ok(has(empty,0,'mana',spell));assert.equal(empty.decision,null);
 const s=field(),fighter=put(s,0,'battle',LAND),target=put(s,1,'battle',WATER);
 cast(s,CHARGER);pick(s,fighter.uid);
 s.phase='attack';act(s,'endTurn');drain(s);
 s.phase='attack';act(s,'endTurn');drain(s);
 s.phase='attack';assert.ok(!attacks(s,fighter).includes(target.uid));
});

test('Charger changes the attack permission even for a recipient whose own abilities are ignored',()=>{
 const s=field(),fighter=put(s,0,'battle',LAND,{entered:s.turn,g35Ignored:s.turn});
 const target=put(s,1,'battle',WATER);
 cast(s,CHARGER);pick(s,fighter.uid);
 s.phase='attack';assert.deepEqual(attacks(s,fighter),[target.uid]);
});

test('Charger neither grants an attack nor goes to mana when its spell ability is ignored',()=>{
 const s=field(),fighter=put(s,0,'battle',LAND,{entered:s.turn});
 put(s,1,'battle',GENMU);
 const spell=cast(s,CHARGER);
 assert.ok(has(s,0,'grave',spell));
 s.phase='attack';assert.deepEqual(attacks(s,fighter),[]);
});

test('Chain destroys every opposing exact match, including a secondary creature that cannot be chosen',()=>{
 const s=field(),ally=put(s,0,'battle',LAND),chosen=put(s,1,'battle',LAND);
 const hidden=put(s,1,'battle',LAND,{justDiverActive:true});
 hidden.g34Grants=[{turn:s.turn,untargetable:true}];
 const other=put(s,1,'battle',WATER);
 cast(s,CHAIN);assert.deepEqual(values(s),[chosen.uid,other.uid]);
 pick(s,chosen.uid);drain(s);
 assert.ok([chosen,hidden].every(x=>has(s,1,'grave',x)));
 assert.ok(has(s,0,'battle',ally)&&has(s,1,'battle',other));
});

test('Chain groups all matching replacements into one destruction event',()=>{
 const s=field(),a=put(s,1,'battle',BROCCOLI),b=put(s,1,'battle',BROCCOLI);
 cast(s,CHAIN);pick(s,a.uid);drain(s);
 assert.ok([a,b].every(x=>has(s,1,'mana',x)&&!has(s,1,'grave',x)));
});

test('Chain takes both linked God names and attempts each matching body once',()=>{
 let s=field();
 const chosen=put(s,1,'battle',HEAVY),a=put(s,1,'battle',HEAVY),b=put(s,1,'battle',METAL);
 const link=inst(METAL);
 chosen.godLinks=[link];
 cast(s,CHAIN);s=restore(s);pick(s,chosen.uid);
 assert.equal(s.decision?.type,'godLeave');
 act(s,'godLeave',a=>Object.values(a).includes(link.uid));
 drain(s);
 assert.ok([a,b,link].every(x=>has(s,1,'grave',x)));
 assert.deepEqual(s.players[1].battle.map(x=>x.uid),[chosen.uid]);
});

test('Chain can resolve with no opposing creatures',()=>{
 const s=field(),spell=cast(s,CHAIN);
 assert.ok(has(s,0,'grave',spell));assert.equal(s.decision,null);
});

for(const active of [0,1])test('Ina watches either grave, grants at resolution and expires at end '+active,()=>{
 const s=field(active),watch=put(s,0,'battle',INA),small=put(s,0,'battle',WATER);
 const high=put(s,0,'battle',BIG),opp=put(s,1,'battle',LAND);
 put(s,active,'grave',LAND);
 assert.equal(slayers(s,small),0);
 const spell=cast(s,ENERGY);drain(s);
 assert.ok(has(s,active,'grave',spell));
 assert.deepEqual([watch,small,high,opp].map(x=>slayers(s,x)),[1,1,0,0]);
 const later=put(s,0,'battle',LAND);assert.equal(slayers(s,later),0);
 s.phase='attack';act(s,'endTurn');drain(s);
 assert.equal(slayers(s,small),0);
});

test('Ina watches both simultaneous grave entries and the cast spell',()=>{
 const s=field(),watch=put(s,0,'battle',INA,{powerModifiers:[{amount:5000,expires:'end',who:0}]}),small=put(s,0,'battle',WATER,{powerModifiers:[{amount:5000,expires:'end',who:0}]});
 put(s,1,'battle',WATER);put(s,1,'battle',WATER);
 cast(s,BURST);drain(s);
 assert.equal(s.players[1].grave.length,2);
 assert.deepEqual([watch,small].map(x=>slayers(s,x)),[3,3]);
});

test('Ina only sees its own move when it leaves in the same destruction batch',()=>{
 const s=field(),small=put(s,0,'battle',WATER,{powerModifiers:[{amount:5000,expires:'end',who:0}]});
 put(s,1,'battle',WATER);put(s,0,'battle',INA);put(s,0,'battle',WATER);
 cast(s,BURST);drain(s);
 assert.deepEqual(s.players[0].battle.map(x=>x.uid),[small.uid]);
 assert.equal(slayers(s,small),1);
});

test('Ina reacts to opposing cards discarded together as well as the resolved spell',()=>{
 const s=field(),watch=put(s,0,'battle',INA);
 const a=put(s,1,'hand',WATER),b=put(s,1,'hand',ENERGY);
 cast(s,'dm02-029');drain(s);
 assert.ok([a,b].every(x=>has(s,1,'grave',x)));
 assert.equal(slayers(s,watch),3);
});

test('Ina ignores a replaced grave placement and a muted watcher does not trigger',()=>{
 const s=field(),watch=put(s,0,'battle',INA);
 cast(s,CHARGER);pick(s,watch.uid);assert.equal(slayers(s,watch),0);
 watch.g35Ignored=s.turn;
 cast(s,ENERGY);drain(s);
 assert.ok(!watch.g34Grants?.some(g=>g.slayer));
});

test('Ina gives working Slayer to the losing creature in battle',()=>{
 const s=field(),weak=put(s,0,'battle',WATER),victim=put(s,1,'battle',BIG,{tapped:true});
 put(s,0,'battle',INA);
 cast(s,ENERGY);drain(s);
 attack(s,weak.uid,victim.uid);drain(s);
 assert.ok(has(s,0,'grave',weak)&&has(s,1,'grave',victim));
});
