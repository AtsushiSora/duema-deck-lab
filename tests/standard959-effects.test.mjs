import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,cast} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const GABRA='dm32-028',MEGA='dm32-034',DEATH='dmc58-006',WILL='dm06-070';
const PLAIN='dm01-108',FIRE='dm01-097',EVO='dm32-007',STAR='dmrp21-1A';
const LIQUID='dm01-080',PALADIN='dm02-s02',BLADE='dm10-017',NEO='dm25rp1-S06';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const uids=xs=>xs.map(x=>x.uid);
const physical=s=>uids(e.physicalCards(s)).sort();
const zone=(s,p,z)=>uids(s.players[p][z]);
const values=s=>(s.decision?.choices??[]).map(x=>x.value?.uid??x.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);

function field(active=0){
 const s=setup();
 s.active=active;
 for(const p of [0,1]){
  give(s,p,'deck',Array(16).fill(PLAIN));
  give(s,p,'grave',[]);
 }
 return s;
}

function put(s,p,z,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][z].push(x);
 return x;
}

test('Phase 959 adds four complete official single-print spells at their original IDs',()=>{
 const m=read('tools/support-phase-959.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[GABRA,MEGA,DEATH,WILL]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const {id}=row,f=row.faces[0],c=e.card(id),d={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(d,{phase:959}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:958}));
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'不明な能力。'}]},{phase:959}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.race,e.civilizations(c),c.manaValue,c.limit],
   ['spell',f.cost,f.race,f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-959');
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[id],4);
  assert.deepEqual(refs.filter(r=>r.id===id).map(r=>[r.canonicalId,r.image]),[[id,row.image]]);
  assert.equal(CARD_IMAGES[id],row.image);
  assert.deepEqual(catalogue.resolveRows([{id,count:1}]),[{id,count:1}]);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(r=>nameKey(r.name)===nameKey(row.name)).map(r=>r.id),[id]);
 }
});

for(const id of [GABRA,MEGA,DEATH])test(id+' offers both only with an allied creature currently evolved',()=>{
 for(const [own,under,both] of [[PLAIN,false,false],[NEO,false,false],[NEO,true,true],[EVO,true,true]]){
  const s=field();
  put(s,0,'battle',own,under?{under:[inst(FIRE)]}:{});
  put(s,1,'battle',EVO,{under:[inst(FIRE)]});
  cast(s,id);
  assert.deepEqual(values(s),both?[0,1,2]:[0,1]);
 }
});

for(const mode of [0,1,2])test('Gabra resolves the chosen modes with the opponent making both selections '+mode,()=>{
 let s=field();
 put(s,0,'battle',EVO);
 const first=put(s,1,'battle',FIRE),second=put(s,1,'battle',PLAIN);
 const discard=put(s,1,'hand',PLAIN),keep=put(s,1,'hand',LIQUID);
 cast(s,GABRA);
 pick(s,mode);
 if(mode!==1){
  assert.equal(s.decision.player,1);
  assert.deepEqual(values(s),[first.uid,second.uid]);
  assert.deepEqual(zone(s,1,'hand'),[discard.uid,keep.uid]);
  pick(s,second.uid);
  assert.ok(zone(s,1,'grave').includes(second.uid));
 }
 if(mode!==0){
  assert.equal(s.decision.player,1);
  assert.deepEqual(values(s),[discard.uid,keep.uid]);
  s=restore(s);
  pick(s,discard.uid);
 }
 assert.deepEqual(zone(s,1,'hand'),mode===0?[discard.uid,keep.uid]:[keep.uid]);
 assert.deepEqual(zone(s,1,'battle'),mode===1?[first.uid,second.uid]:[first.uid]);
 assert.deepEqual(zone(s,1,'grave'),[...(mode!==1?[second.uid]:[]),...(mode!==0?[discard.uid]:[])]);
});

test('Gabra performs the second mode even if there is no creature for the first',()=>{
 const s=field();
 put(s,0,'battle',EVO);
 const discard=put(s,1,'hand',PLAIN);
 cast(s,GABRA);
 pick(s,2);
 assert.equal(s.decision.task.op,'discard');
 assert.equal(s.decision.player,1);
 pick(s,discard.uid);
 assert.deepEqual(zone(s,1,'grave'),[discard.uid]);
});

test('Mega Burst resolves a mandatory 6000 removal before selecting up to three current 2000s',()=>{
 let s=field();
 put(s,0,'battle',EVO);
 const big=put(s,1,'battle','dm24-s04');
 const high=put(s,1,'battle',PLAIN,{powerModifiers:[{amount:1000}]});
 const small=Array.from({length:4},()=>put(s,1,'battle',PLAIN));
 cast(s,MEGA);
 pick(s,2);
 assert.ok(values(s).includes(big.uid)&&!values(s).includes(null));
 pick(s,big.uid);
 assert.deepEqual(zone(s,1,'grave'),[big.uid]);
 assert.deepEqual(values(s),[...uids(small),null]);
 const before=physical(s);
 pick(s,small[0].uid);
 assert.deepEqual(zone(s,1,'grave'),[big.uid]);
 s=restore(s);
 pick(s,small[1].uid);
 pick(s,small[2].uid);
 assert.deepEqual(zone(s,1,'grave'),[big.uid,...uids(small.slice(0,3))]);
 assert.deepEqual(zone(s,1,'battle'),[high.uid,small[3].uid]);
 assert.deepEqual(physical(s),before);
});

test('Mega Burst may select zero creatures with its second mode',()=>{
 const s=field(),x=put(s,1,'battle',PLAIN);
 cast(s,MEGA);
 pick(s,1);
 assert.deepEqual(values(s),[x.uid,null]);
 pick(s,null);
 assert.deepEqual(zone(s,1,'battle'),[x.uid]);
 assert.deepEqual(zone(s,1,'grave'),[]);
});

test('Death and Rebirth charges tapped with one mana and both printed civilizations',()=>{
 const s=field(),x=put(s,0,'hand',DEATH);
 s.phase='charge';
 act(s,'charge',a=>a.uid===x.uid);
 assert.ok(s.players[0].mana.find(y=>y.uid===x.uid).tapped);
 assert.deepEqual(e.civilizations(e.card(x)),['闇','火']);
 assert.equal(e.manaValue(e.card(x)),1);
});

test('Death and Rebirth destroys first and may then put an affordable evolution on its base',()=>{
 let s=field();
 put(s,0,'battle',EVO);
 const base=put(s,0,'battle',LIQUID);
 const kill=put(s,1,'battle',PLAIN,{powerModifiers:[{amount:3000}]});
 put(s,1,'battle','dm24-s04');
 const revive=put(s,0,'grave',BLADE);
 const plain=put(s,0,'grave',PLAIN);
 put(s,0,'grave',PALADIN);
 put(s,0,'grave',WILL);
 put(s,1,'grave',PLAIN);
 cast(s,DEATH);
 pick(s,2);
 assert.deepEqual(values(s),[kill.uid]);
 pick(s,kill.uid);
 assert.deepEqual(zone(s,1,'grave').slice(-1),[kill.uid]);
 assert.deepEqual(values(s),[revive.uid,plain.uid]);
 const paid=s.players[0].mana.filter(x=>x.tapped).length;
 s=restore(s);
 pick(s,revive.uid);
 pick(s,base.uid);
 assert.deepEqual(uids(s.players[0].battle.find(x=>x.uid===revive.uid).under),[base.uid]);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,paid);
});

test('Death and Rebirth does not offer a grave deployment without a required base',()=>{
 const s=field(),revive=put(s,0,'grave',BLADE);
 cast(s,DEATH);
 pick(s,1);
 assert.equal(s.decision,null);
 assert.ok(zone(s,0,'grave').includes(revive.uid));
});

for(const tapped of [false,true])test('Will moves only an opposing evolution top and preserves the base orientation '+tapped,()=>{
 let s=field();
 s.turn=4;
 const base=inst(LIQUID),evolution=put(s,1,'battle',PALADIN,{under:[base],entered:1,tapped});
 const other=put(s,1,'battle',PLAIN);
 put(s,0,'battle',EVO);
 cast(s,WILL);
 assert.deepEqual(values(s),[evolution.uid]);
 const before=physical(s),deck=zone(s,1,'deck');
 s=restore(s);
 pick(s,evolution.uid);
 assert.equal(s.decision,null);
 assert.deepEqual(zone(s,1,'battle'),[base.uid,other.uid]);
 assert.deepEqual(zone(s,1,'deck'),deck);
 assert.equal(s.players[1].battle[0].tapped,tapped);
 assert.ok(s.players[1].battle[0].entered<s.turn);
 assert.equal(s.players[1].mana.at(-1).uid,evolution.uid);
 assert.equal(s.players[1].mana.at(-1).tapped,false);
 assert.deepEqual(physical(s),before);
});

test('Will may use S Trigger with no mana, and a Star Evolution still reconstructs',()=>{
 const s=field(1),base=inst(PLAIN),evolution=put(s,1,'battle',STAR,{under:[base]});
 give(s,0,'mana',[]);
 give(s,0,'shields',[WILL]);
 attack(s,evolution.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 assert.equal(s.decision.player,0);
 pick(s,evolution.uid);
 if(s.decision?.type==='leaveReplace')act(s,'replaceStar');
 assert.equal(s.decision,null);
 assert.deepEqual(zone(s,1,'battle'),[base.uid]);
 assert.equal(s.players[1].battle[0].tapped,true);
 assert.ok(zone(s,1,'mana').includes(evolution.uid));
 assert.equal(s.players[0].mana.length,0);
});

test('Will uses the existing G-NEO departure replacement for the selected top card',()=>{
 const s=field(),base=inst(LIQUID),evolution=put(s,1,'battle',NEO,{under:[base]});
 cast(s,WILL);
 pick(s,evolution.uid);
 if(s.decision?.type==='leaveReplace')act(s,'replaceGneo');
 assert.equal(s.decision,null);
 assert.deepEqual(zone(s,1,'battle'),[evolution.uid]);
 assert.equal(s.players[1].mana.at(-1).uid,base.uid);
 assert.ok(!e.isEvolution(s.players[1].battle[0]));
});
