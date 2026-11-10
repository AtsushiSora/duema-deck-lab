import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const GANJI='dm36-089',DON='dm23-031',MIRANDA='dmr21-012';
const WATER='dm01-083',TROLL='dm38-047',SEA='dm36-082',APUL='dmrp22-042';
const HEAD='dm21-054',MARINE='dm21-025',SPIRIT='dm21-046',HERO='dm21-036',HIGH='dm19-048';
const MULTI='dmrp13-084',DEMON='dm01-027',SPARK='dm01-015',GENMU='dmrp15-km1';
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const values=s=>s.decision.choices.map(({value})=>value?.uid??value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const targets=s=>e.getLegalActions(s).filter(a=>a.kind==='effect').flatMap(a=>a.targets.map(x=>x.uid));
function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(12).fill(WATER));
 return s;
}
function add(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
function play(s,id){
 const x=add(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&!a.alternative);
 return x;
}

test('Phase 854 registers the full official cards with stable IDs',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-854.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(row=>row.id),[GANJI,DON,MIRANDA]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(d.faces,row.faces);
  assert.deepEqual(standardCardSpec(d,{phase:854}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:853}));
  const unknown=structuredClone(d);
  unknown.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:854}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   ['creature',f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);
  assert.deepEqual(registry.resolveRows([{id:row.id,count:4}]),[{id:row.id,count:4}]);
 }
});

for(const accept of [false,true])test('Ganji can recover one of its own grave creatures with E Soul: '+accept,()=>{
 let s=field();
 const troll=add(s,0,'grave',TROLL),copy=add(s,0,'grave',GANJI),sea=add(s,0,'grave',SEA);
 const enemy=add(s,1,'grave',TROLL),plain=add(s,0,'grave',WATER);
 const source=play(s,GANJI);
 assert.deepEqual(values(s),[troll.uid,copy.uid,null]);
 s=structuredClone(s);
 pick(s,accept?copy.uid:null);
 assert.equal(has(s,0,'hand',copy),accept);
 assert.ok([troll,sea,plain].every(x=>has(s,0,'grave',x)));
 assert.ok(has(s,1,'grave',enemy)&&has(s,0,'battle',source));
 assert.equal(s.decision,null);
});

test('Ganji cannot move a card from the graveyard through Apul',()=>{
 const s=field(),troll=add(s,0,'grave',TROLL);
 add(s,1,'battle',APUL);
 play(s,GANJI);
 assert.equal(s.decision,null);
 assert.ok(has(s,0,'grave',troll));
});

for(const side of [0,1,null])test('Don Bat may destroy a matching creature on either side, or decline: '+side,()=>{
 let s=field();
 const head=add(s,0,'battle',HEAD),marine=add(s,0,'battle',MARINE);
 const spirit=add(s,1,'battle',SPIRIT),hero=add(s,1,'battle',HERO);
 const costly=add(s,1,'battle',HIGH),plain=add(s,1,'battle',WATER);
 const source=play(s,DON);
 assert.deepEqual(new Set(values(s)),new Set([head.uid,marine.uid,spirit.uid,hero.uid,null]));
 s=structuredClone(s);
 pick(s,side===0?head.uid:side===1?hero.uid:null);
 assert.equal(has(s,0,'grave',head),side===0);
 assert.equal(has(s,1,'grave',hero),side===1);
 assert.ok(has(s,0,'battle',source)&&has(s,1,'battle',costly)&&has(s,1,'battle',plain));
});

test('Miranda protects multicolor allies from enemy spells and creature abilities',()=>{
 const s=field(),miranda=add(s,1,'battle',MIRANDA);
 const ally=add(s,1,'battle','dmr02-049'),other=add(s,1,'battle',SPIRIT);
 play(s,DON);
 assert.deepEqual(values(s),[other.uid,null]);
 pick(s,null);
 play(s,DEMON);
 assert.deepEqual(new Set(targets(s)),new Set([miranda.uid,other.uid]));
 act(s,'effect',a=>a.targets.some(x=>x.uid===other.uid));
 assert.ok(has(s,1,'battle',ally));
 play(s,SPARK);
 assert.ok(ally.tapped&&miranda.tapped);
});

test('Miranda leaves the multicolor creature eligible to block and to be attacked',()=>{
 const s=field(),attacker=add(s,0,'battle',WATER);
 const blocker=add(s,1,'battle',MULTI);
 add(s,1,'battle',MIRANDA);
 s.phase='attack';
 blocker.tapped=true;
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===attacker.uid&&a.target===blocker.uid));
 blocker.tapped=false;
 attack(s,attacker.uid);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===blocker.uid));
});

test('Miranda does not restrict its owner, and protection ends when the aura is ignored',()=>{
 const own=field(),ally=add(own,0,'battle','dmr02-049');
 play(own,MIRANDA);
 play(own,DON);
 assert.ok(values(own).includes(ally.uid));
 pick(own,ally.uid);
 assert.ok(has(own,0,'grave',ally));

 const s=field(),miranda=add(s,1,'battle',MIRANDA),multicolor=add(s,1,'battle',MULTI);
 add(s,0,'battle',GENMU);
 assert.equal(e.abilitiesIgnored(s,miranda),true);
 play(s,DEMON);
 assert.ok(targets(s).includes(multicolor.uid));
 act(s,'effect',a=>a.targets.some(x=>x.uid===multicolor.uid));
 assert.ok(has(s,1,'grave',multicolor));
});
