import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const ARTHUR='dmrp02-019',HAM='dm24ex2-078',KIRIN='dm25rp4-074';
const LIGHT='dm01-075',WATER='dm01-083',DARK='dm01-090',FIRE='dm01-097',GREEN='dm01-108';
const LARGE='dmex17-036',CANNOT_CHOOSE='dmrp01-041';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
const restore=s=>decodeBattleData(encodeBattleData(s));
const values=s=>(s.decision?.choices??[]).map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const ids=(s,p,z)=>s.players[p][z].map(x=>x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();

function add(s,p,z,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][z].push(x);
 return x;
}
function field(){
 const s=setup();
 for(const p of [0,1]){
  give(s,p,'deck',Array(12).fill(GREEN));
  give(s,p,'grave',[]);
 }
 return s;
}
function summon(s,id,base){
 const x=add(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 act(s,'evolve',a=>a.baseUid===base?.uid);
 return x;
}
function stripBase(s,p,source,base){
 const foe=1-p;
 s.active=foe;
 s.extTasks=[{op:'g34_BattleCardMove579',p:foe,source,origin:'battle',to:'grave'}];
 s.phase='main';
 act(s,'toAttack');
 pick(s,base.uid);
}

test('Three official cards and two reprints retain exact IDs, original statistics, limits and images',()=>{
 const m=read('tools/support-phase-1065.json'),cat=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(c=>c.id),[ARTHUR,HAM,KIRIN]);
 assert.deepEqual(m.printAliases.map(c=>[c.id,c.canonicalId]),[['dmex02-082',ARTHUR],['promoy24-102',KIRIN]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.equal(cat.get(id).supported,true);
  assert.equal(row.verification.facesMatched,true);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1065}),m.cards.find(r=>r.id===id).spec);
  assert.throws(()=>standardCardSpec({...row,status:'complete'},{phase:1064}),/未実装|未対応/);
  assert.deepEqual([c.type,c.cost,c.race,c.power,e.civilizations(c),c.manaValue,c.limit],
   ['creature',f.cost,f.race,parseInt(f.powerText,10),f.civilizations,1,4]);
  assert.deepEqual(cat.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(refs.filter(r=>r.id===row.id).map(r=>[r.canonicalId,r.image]),[[id,row.image]]);
  if(row.canonicalId)continue;
  assert.equal(CARD_IMAGES[id],row.image);
  assert.deepEqual(details.cards.find(r=>r.id===id).faces,row.faces);
  assert.deepEqual(data.cards.filter(r=>nameKey(r.name)===nameKey(row.name)).map(r=>r.id),[id]);
 }
});

test('Arthur requires a Darkness base and gains the NEO power and Double Breaker only with a base',()=>{
 const s=field(),base=add(s,0,'battle',DARK),x=add(s,0,'hand',ARTHUR);
 add(s,0,'battle',LIGHT);
 add(s,1,'battle',DARK);
 act(s,'play',a=>a.uid===x.uid);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[undefined,base.uid]);
 act(s,'evolve',a=>a.baseUid===base.uid);
 const before=physical(s);
 assert.equal(e.power(x,false,s),6000);
 assert.equal(e.effectiveCard(x,s).breaker,2);
 stripBase(s,0,'dm01-027',base);
 assert.equal(e.power(x,false,s),1000);
 assert.equal(e.effectiveCard(x,s).breaker,undefined);
 assert.ok(e.effectiveCard(x,s).blocker&&e.effectiveCard(x,s).slayer);
 assert.ok(!e.isEvolution(x));
 assert.deepEqual(physical(s),before);
});

test('Arthur can block and use Slayer even when it is an ordinary creature',()=>{
 const s=field(),x=add(s,1,'battle',ARTHUR),enemy=add(s,0,'battle',FIRE);
 const before=physical(s);
 attack(s,enemy.uid);
 act(s,'block',a=>a.uid===x.uid);
 drain(s);
 assert.ok(ids(s,0,'grave').includes(enemy.uid));
 assert.ok(ids(s,1,'grave').includes(x.uid));
 assert.equal(s.players[1].shields.length,5);
 assert.deepEqual(physical(s),before);
});

test('Hamukatsu can choose its entry battle as a Shield Trigger in either NEO form',()=>{
 for(const evolved of [false,true]){
  let s=field();
  const attacker=add(s,0,'battle',FIRE),rival=add(s,0,'battle',LARGE),protectedCreature=add(s,0,'battle',CANNOT_CHOOSE);
  const base=add(s,1,'battle',GREEN),other=add(s,1,'battle',WATER);
  give(s,1,'shields',[HAM]);
  const x=s.players[1].shields[0],before=physical(s);
  attack(s,attacker.uid);
  if(s.decision?.type==='block')act(s,'noBlock');
  act(s,'useTrigger',a=>a.uid===x.uid);
  assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='triggerEvolve').map(a=>a.baseUid),[undefined,base.uid]);
  act(s,'triggerEvolve',a=>a.baseUid===(evolved?base.uid:undefined));
  assert.ok(!values(s).includes(protectedCreature.uid)&&!values(s).includes(other.uid));
  assert.deepEqual(new Set(values(s)),new Set([attacker.uid,rival.uid,null]));
  const y=s.players[1].battle.find(y=>y.uid===x.uid);
  assert.equal(e.power(y,false,s),evolved?9000:4000);
  assert.equal(e.effectiveCard(y,s).breaker,evolved?2:undefined);
  s=restore(s);
  pick(s,rival.uid);
  drain(s);
  assert.equal(ids(s,1,'battle').includes(x.uid),evolved);
  assert.equal(ids(s,0,'grave').includes(rival.uid),evolved);
  assert.ok(s.players[1].mana.every(y=>!y.tapped));
  assert.deepEqual(physical(s),before);
 }
});

test('Hamukatsu can decline the battle when normally summoned, and keeps the 4000 base power',()=>{
 const s=field(),enemy=add(s,1,'battle',DARK);
 const x=summon(s,HAM);
 assert.deepEqual(new Set(values(s)),new Set([enemy.uid,null]));
 pick(s,null);
 assert.equal(e.power(x,false,s),4000);
 assert.ok(ids(s,1,'battle').includes(enemy.uid));
});

test('KIRIN can attack an untapped creature on entry in either form, with Powered Breaker only while evolved',()=>{
 for(const evolved of [false,true]){
  const s=field(),enemy=add(s,1,'battle',WATER);
  const base=add(s,0,'battle',LIGHT);
  const x=summon(s,KIRIN,evolved?base:undefined);
  assert.equal(e.power(x,false,s),evolved?9000:5000);
  assert.equal(!!e.effectiveCard(x,s).poweredBreaker,evolved);
  assert.equal(e.effectiveCard(x,s).breaker,evolved?2:undefined);
  s.phase='attack';
  const options=e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===x.uid);
  assert.ok(options.some(a=>a.target===enemy.uid));
  assert.equal(options.some(a=>a.target==='player'),evolved);
  attack(s,x.uid,evolved?'player':enemy.uid);
  drain(s);
  assert.equal(ids(s,1,'grave').includes(enemy.uid),!evolved);
  assert.equal(s.players[1].shields.length,evolved?3:5);
 }
});

test('KIRIN immediately loses the conditional power and breaker when its base leaves',()=>{
 const s=field(),base=add(s,0,'battle',FIRE);
 const x=summon(s,KIRIN,base);
 x.powerModifiers=[{amount:3000,expires:'end',who:0}];
 assert.equal(e.power(x,false,s),12000);
 assert.equal(e.effectiveCard(x,s).breaker,3);
 stripBase(s,0,'dm01-027',base);
 assert.equal(e.power(x,false,s),8000);
 assert.equal(e.effectiveCard(x,s).poweredBreaker,undefined);
 assert.equal(e.effectiveCard(x,s).breaker,undefined);
 assert.equal(e.effectiveCard(x,s).machFighter,true);
});
