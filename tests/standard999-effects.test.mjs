import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const DUO='dmr17-012',ROSE='dmr17-058',TRIKERA='dmr17-010',SPANNER='dmr17-051';
const PRINTS=[
 ['dm25ex1-070',DUO],['dmd30-009',DUO],['dmd28-011',DUO],['promoy14-025',DUO],
 ['dm25ex1-071',ROSE],['dmd28-013',ROSE],['promoy14-065',ROSE]
];
const LIGHT='dm01-075',NATURE='dm01-108',WATER='dm01-083',FIRE='dm01-097';
const LIGHT_FOUR='dmr10-051',LIGHT_FIVE='dm10-012',LIGHT_EVO='dm32-073',LIGHT_HIGH='dmr13-001';
const CASTLE='dm26rp1-057',POWER_HIGH='dmr14-v02';
const GENMU='dmrp15-km1';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const ids=rows=>rows.map(x=>x.uid);
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const value=c=>c.value?.uid??c.value;
const choices=s=>s.decision.choices.map(value);
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
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

function chooseRose(s,bonus){
 assert.equal(s.decision.type,'effectOrder');
 const e=s.pendingEffects.find(e=>e.source===ROSE&&e.task?.defs?.[0].op===(bonus?'IfOwn':'Draw'));
 assert.ok(e);
 act(s,'orderEffect',a=>a.effectId===e.effectId);
}

test('Phase 999 registers four verified definitions and resolves seven reprints to original IDs',()=>{
 const m=read('tools/support-phase-999.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[DUO,ROSE,TRIKERA,SPANNER]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),PRINTS);
 assert.deepEqual(catalogue.resolveRows(PRINTS.map(([id])=>({id,count:1}))),[
  {id:DUO,count:4},{id:ROSE,count:3}
 ]);
 for(const row of m.cards){
  const {id,name,faces}=row,[f]=faces,d=details.cards.find(x=>x.id===id),c=e.card(id);
  assert.deepEqual(faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:999}),row.spec);
  const altered=structuredClone(d);
  altered.faces[0].abilityText+='未知の追加能力。';
  assert.throws(()=>standardCardSpec(altered,{phase:999}));
  for(const [key,v] of Object.entries(row.spec))assert.deepEqual(c[key],v);
  if(id===SPANNER)assert.equal(f.powerText,'');
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [name,'creature',f.cost,id===SPANNER?5000:parseInt(f.powerText,10),f.race,f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-999');
  assert.equal(CARD_IMAGES[id],row.image);
  assert.ok(catalogue.get(id).supported);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
 }
 for(const row of [...m.cards,...m.printAliases]){
  assert.ok(row.verification.facesMatched);
  assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[row.canonicalId??row.id,row.image]]);
  if(row.canonicalId)assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:999}),m.cards.find(x=>x.id===row.canonicalId).spec);
 }
});

test('Command Duo draws before offering the newly drawn Light five-cost creature for free deployment',()=>{
 let s=field();give(s,0,'deck',[LIGHT_FIVE,...Array(9).fill(NATURE)]);
 const drawn=s.players[0].deck[0],other=put(s,0,'hand',LIGHT_FOUR);
 const blocked=[LIGHT_EVO,LIGHT_HIGH,WATER,CASTLE].map(id=>put(s,0,'hand',id));
 const before=physical(s),source=play(s,DUO);
 assert.equal(e.effectiveCard(source,s).breaker,2);
 assert.deepEqual(choices(s),[other.uid,drawn.uid,null]);
 s=restore(s);pick(s,drawn.uid);
 assert.ok(has(s,0,'battle',drawn));
 assert.ok(blocked.every(x=>has(s,0,'hand',x)));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,6);
 assert.deepEqual(physical(s).filter(uid=>uid!==source.uid),before);
});

test('Command Duo still draws when the deployment is declined',()=>{
 const s=field();give(s,0,'deck',[LIGHT,...Array(8).fill(NATURE)]);
 const drawn=s.players[0].deck[0];play(s,DUO);pick(s,null);
 assert.ok(has(s,0,'hand',drawn));
 assert.equal(s.players[0].battle.length,1);
});

for(const bonusFirst of [false,true])test('Red Rose can resolve the two entry abilities in either order '+bonusFirst,()=>{
 let s=field();give(s,0,'deck',[LIGHT,...Array(8).fill(NATURE)]);
 const drawn=s.players[0].deck[0],existing=put(s,0,'hand',LIGHT_FOUR),tooExpensive=put(s,0,'hand',LIGHT_FIVE);
 put(s,0,'hand',LIGHT_EVO);
 const source=play(s,ROSE),before=physical(s);
 assert.equal(s.pendingEffects.filter(x=>x.uid===source.uid).length,2);
 s=restore(s);chooseRose(s,bonusFirst);
 assert.deepEqual(choices(s),bonusFirst?[existing.uid,null]:[existing.uid,drawn.uid,null]);
 pick(s,bonusFirst?existing.uid:drawn.uid);
 assert.ok(has(s,0,'battle',bonusFirst?existing:drawn));
 assert.ok(has(s,0,'hand',bonusFirst?drawn:existing));
 assert.ok(has(s,0,'hand',tooExpensive));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,5);
 assert.deepEqual(physical(s),before);
});

for(const armed of [false,true])test('Red Rose counts three visible Light mana cards including tapped multicolor '+armed,()=>{
 const s=field();
 give(s,0,'mana',[LIGHT,LIGHT,WATER,WATER,WATER,WATER,WATER]);
 put(s,0,'mana',LIGHT_FOUR,{tapped:true,faceDown:!armed});
 give(s,0,'deck',[LIGHT,...Array(8).fill(NATURE)]);
 const drawn=s.players[0].deck[0];play(s,ROSE);
 chooseRose(s,false);
 if(armed){assert.deepEqual(choices(s),[drawn.uid,null]);pick(s,null);}
 else assert.equal(s.decision,null);
 assert.ok(has(s,0,'hand',drawn));
});

test('Trikera requires a Nature evolution base and its attack mandatorily moves a strictly weaker enemy',()=>{
 let s=field();
 const wrong=put(s,0,'battle',WATER),trikera=put(s,0,'hand',TRIKERA);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===trikera.uid));
 const base=put(s,0,'battle',NATURE),weak=put(s,1,'battle',FIRE);
 const equal=put(s,1,'battle',FIRE,{powerModifiers:[{amount:7000}]}),strong=put(s,1,'battle',POWER_HIGH);
 act(s,'play',a=>a.uid===trikera.uid);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[base.uid]);
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.ok(has(s,0,'battle',wrong));
 assert.deepEqual(ids(trikera.under),[base.uid]);
 assert.equal(e.power(trikera,false,s),9000);
 attack(s,trikera.uid);
 assert.deepEqual(choices(s),[weak.uid]);
 s=restore(s);pick(s,weak.uid);
 assert.ok(has(s,1,'mana',weak)&&has(s,1,'battle',equal)&&has(s,1,'battle',strong));
});

for(const count of [2,4])test('Trikera Revolution 2 counts shield groups and offers W or Q breaker '+count,()=>{
 let s=field();give(s,0,'shields',[NATURE,NATURE]);
 s.players[0].shields[0].shieldStack=[inst(NATURE),inst(NATURE)];
 const trikera=put(s,0,'battle',TRIKERA),high=put(s,1,'battle',POWER_HIGH);
 assert.equal(e.power(trikera,false,s),18000);
 attack(s,trikera.uid);
 assert.deepEqual(choices(s),[high.uid]);pick(s,high.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 assert.equal(s.decision.task.op,'g34_GrantedBreaker633');
 assert.deepEqual(choices(s),[2,4]);
 s=restore(s);pick(s,count);act(s,'breakShields');
 assert.equal(s.players[1].shields.length,5-count);
 assert.ok(has(s,1,'mana',high));
});

test('Spanner uses all physical cards of opposing shields and is destroyed at zero',()=>{
 for(const extra of [0,1]){
  const s=field();give(s,1,'shields',Array(4).fill(NATURE));
  if(extra)s.players[1].shields[0].shieldStack=[inst(FIRE)];
  const before=physical(s),spanner=play(s,SPANNER);
  if(extra)assert.ok(has(s,0,'grave',spanner));
  else {assert.ok(has(s,0,'battle',spanner));assert.equal(e.power(spanner,false,s),1000);}
  assert.deepEqual(physical(s).filter(uid=>uid!==spanner.uid),before);
 }
});

test('An opponent Castle is the fifth shield-zone card and destroys Spanner as ruled',()=>{
 const s=field();give(s,1,'shields',Array(4).fill(NATURE));
 const spanner=play(s,SPANNER);
 assert.equal(e.power(spanner,false,s),1000);
 s.active=1;const castle=play(s,CASTLE);drain(s);
 assert.ok(has(s,0,'grave',spanner));
 assert.ok(s.players[1].shields.flatMap(x=>[x,...(x.shieldStack||[])]).some(x=>x.uid===castle.uid&&x.faceUp));
});

test('Spanner uses the printed 5000 power when its ability is ignored',()=>{
 const s=field();put(s,1,'battle',GENMU);
 const spanner=play(s,SPANNER);
 assert.ok(has(s,0,'battle',spanner));
 assert.equal(e.power(spanner,false,s),5000);
});
