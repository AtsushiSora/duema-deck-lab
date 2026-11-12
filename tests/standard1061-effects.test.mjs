import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const TRAIN='dm25rp2-036',DA='dm25rp2-045',DORG='dm25rp2-042';
const LIGHT='dm01-075',WATER='dm01-083',DARK='dm01-090',FIRE='dm01-097',GREEN='dm01-108';
const SEED='dmsd20-015',SPELL='dm01-027',TOTTORO='dm25rp3-039';
const profiles=[
 {id:TRAIN,bases:[WATER,DARK,FIRE],colors:['水','闇','火'],breaker:2,excluded:LIGHT},
 {id:DA,bases:[LIGHT,FIRE,GREEN],colors:['光','火','自然'],breaker:2,excluded:WATER},
 {id:DORG,bases:[DARK,FIRE,GREEN],colors:['闇','火','自然'],breaker:1,excluded:LIGHT}
];
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url)));
const restore=s=>decodeBattleData(encodeBattleData(s));
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);
const ids=(s,p,z)=>s.players[p][z].map(x=>x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const battle=(s,p,x)=>s.players[p].battle.find(y=>y.uid===x.uid);
const available=(s,x,origin)=>e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===x.uid&&(a.origin??'hand')===origin);

function add(s,p,z,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][z].push(x);
 return x;
}
function summon(s,x,origin,base){
 act(s,'play',a=>a.uid===x.uid&&(a.origin??'hand')===origin);
 act(s,'evolve',a=>a.baseUid===base?.uid);
}

test('Three official definitions and two reprints resolve to original IDs with their art and limits',()=>{
 const m=read('tools/support-phase-1061.json'),cat=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(x=>x.id),profiles.map(x=>x.id));
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[['promoy24-031',TRAIN],['dm25ex3-046',DORG]]);
 for(const row of m.cards){
  const {colors,breaker}=profiles.find(x=>x.id===row.id),c=e.card(row.id),f=row.faces[0];
  assert.ok(cat.get(row.id).supported&&row.verification.facesMatched);
  assert.equal(cat.get(row.id).id,row.id);
  assert.deepEqual([c.cost,c.power,c.race,c.manaValue,e.civilizations(c),c.limit],
   [f.cost,Number(f.powerText),f.race,1,f.civilizations,4]);
  assert.equal(c.breaker??1,breaker);
  assert.equal(c.graveSummon??false,row.id===TRAIN);
  assert.deepEqual(c.neoEvolution.any,colors.map(civilization=>({civilization})));
  assert.ok(c.g27Raid);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(details.cards.find(x=>x.id===row.id).faces,row.faces);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1061}),row.spec);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[row.id]);
 }
 for(const row of m.printAliases){
  const original=m.cards.find(x=>x.id===row.canonicalId);
  assert.ok(row.verification.facesMatched);
  assert.deepEqual(row.faces,original.faces);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(cat.resolveRows([{id:row.id,count:2},{id:row.canonicalId,count:2}]),[{id:row.canonicalId,count:4}]);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[row.canonicalId,row.image]]);
 }
});

for(const {id,bases,excluded,breaker} of profiles){
 test(id+' accepts exactly its three battle-zone civilizations and may decline Raid',()=>{
  const s=setup(),x=add(s,0,'hand',id);
  const legal=bases.map(id=>add(s,0,'battle',id));
  add(s,0,'battle',excluded);
  add(s,1,'battle',bases[0]);
  give(s,0,'deck',[bases[0],excluded,SPELL,GREEN]);
  const [first,second,third,rest]=ids(s,0,'deck');
  act(s,'play',a=>a.uid===x.uid);
  assert.deepEqual(new Set(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid)),
   new Set([...legal.map(x=>x.uid),undefined]));
  act(s,'evolve',a=>a.baseUid===legal[1].uid);
  assert.deepEqual(new Set(values(s)),new Set([first,null]));
  pick(s,null);
  pick(s,third);
  pick(s,first);
  assert.deepEqual(ids(s,0,'deck'),[rest,third,first,second]);
  assert.deepEqual(battle(s,0,x).under.map(y=>y.uid),[legal[1].uid]);
 });

 test(id+' becomes an evolution when Raid supplies a base and can attack immediately',()=>{
  let s=setup();
  const x=add(s,0,'hand',id);
  give(s,0,'deck',[bases[0],bases[1],excluded,GREEN]);
  const [first,second,third,rest]=ids(s,0,'deck'),all=physical(s);
  summon(s,x,'hand');
  assert.ok(!e.isEvolution(battle(s,0,x)));
  assert.deepEqual(new Set(values(s)),new Set([first,second,null]));
  s=restore(s);
  pick(s,second);
  pick(s,third);
  assert.deepEqual(battle(s,0,x).under.map(y=>y.uid),[second]);
  assert.deepEqual(ids(s,0,'deck'),[rest,third,first]);
  assert.ok(e.isEvolution(battle(s,0,x)));
  attack(s,x.uid);
  drain(s);
  assert.equal(s.players[1].shields.length,5-breaker);
  assert.deepEqual(physical(s),all);
 });
}

test('Train pays five mana from the graveyard and can evolve on a battle-zone base',()=>{
 let s=setup();
 const x=add(s,0,'grave',TRAIN),base=add(s,0,'battle',WATER);
 add(s,0,'grave',FIRE);
 add(s,0,'battle',LIGHT);
 give(s,0,'mana',[DARK,GREEN,GREEN,GREEN,GREEN]);
 give(s,0,'deck',[FIRE,GREEN,LIGHT,WATER]);
 const raidBase=s.players[0].deck[0],all=physical(s);
 assert.equal(available(s,x,'grave').cost,5);
 act(s,'play',a=>a.uid===x.uid&&a.origin==='grave');
 assert.deepEqual(new Set(e.getLegalActions(s).map(a=>a.baseUid)),new Set([base.uid,undefined]));
 s=restore(s);
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.equal(s.players[0].mana.filter(y=>y.tapped).length,5);
 assert.ok(!ids(s,0,'grave').includes(x.uid));
 assert.deepEqual(new Set(values(s)),new Set([raidBase.uid,null]));
 pick(s,raidBase.uid);
 drain(s);
 assert.deepEqual(battle(s,0,x).under.map(y=>y.uid),[base.uid,raidBase.uid]);
 assert.deepEqual(physical(s),all);
});

test('Train can pay its ordinary cost from the grave without evolving',()=>{
 const s=setup(),x=add(s,0,'grave',TRAIN);
 give(s,0,'deck',[GREEN,LIGHT,SPELL,GREEN]);
 summon(s,x,'grave');
 drain(s);
 assert.ok(!e.isEvolution(battle(s,0,x)));
 s.phase='attack';
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid));
 assert.equal(s.players[0].mana.filter(y=>y.tapped).length,5);
});

test('Train grave summons require enough dark mana and permission to move from the grave',()=>{
 const s=setup(),train=add(s,0,'grave',TRAIN);
 const da=add(s,0,'grave',DA),dorg=add(s,0,'grave',DORG);
 give(s,0,'mana',[DARK,GREEN,GREEN,GREEN]);
 assert.equal(available(s,train,'grave'),undefined);
 give(s,0,'mana',[GREEN,GREEN,GREEN,GREEN,GREEN]);
 assert.equal(available(s,train,'grave'),undefined);
 give(s,0,'mana',[DARK,FIRE,GREEN,GREEN,GREEN]);
 assert.ok(available(s,train,'grave'));
 assert.equal(available(s,da,'grave'),undefined);
 assert.equal(available(s,dorg,'grave'),undefined);
 add(s,1,'battle','dmrp22-042');
 assert.equal(available(s,train,'grave'),undefined);
});

test('Raid accepts a matching Shinkarize seed and places cards without firing their entry or base triggers',()=>{
 for(const id of [SEED,TOTTORO]){
  const s=setup(),x=add(s,0,'hand',DORG);
  give(s,0,'deck',[id,WATER,SPELL,GREEN]);
  const [base]=ids(s,0,'deck');
  const grave=add(s,0,'grave',WATER);
  summon(s,x,'hand');
  assert.deepEqual(new Set(values(s)),new Set([base,null]));
  pick(s,base);
  drain(s);
  assert.deepEqual(battle(s,0,x).under.map(y=>y.uid),[base]);
  assert.deepEqual(ids(s,0,'grave'),[grave.uid]);
  assert.equal(s.players[0].mana.length,50);
  assert.equal(s.players[0].battle.length,1);
 }
});

test('Gaia sends each Raid creature to mana before it can reveal cards',()=>{
 for(const {id,bases} of profiles){
  const s=setup(),x=add(s,0,'hand',id);
  add(s,1,'battle','dmrp16-s05');
  give(s,0,'deck',[bases[0],bases[1],bases[2],GREEN]);
  const before=ids(s,0,'deck');
  summon(s,x,'hand');
  drain(s);
  assert.ok(ids(s,0,'mana').includes(x.uid));
  assert.equal(battle(s,0,x),undefined);
  assert.deepEqual(ids(s,0,'deck'),before);
 }
});
