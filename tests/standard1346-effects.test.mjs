import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const PRINCESS='dmr08s-007',WORLD='dmex12-011',BURST='dmrp20-043';
const NATURE='dm01-108',FIRE='dm01-097',APUL='dmrp20-020';
const FLAME='dm24rp3-071',BAIKEN='dm29-s02',SURFER='dm05-024';
const read=path=>JSON.parse(readFileSync(new URL('../tools/'+path,import.meta.url)));
const has=(s,p,zone,x)=>s.players[p][zone].some(row=>row.uid===x.uid);
const values=s=>s.decision?.choices?.map(c=>c.value?.uid??c.value)??[];
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===(v?.uid??v));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();

function field(active=0){
 const s=Object.assign(setup(),{active});
 for(const p of [0,1])give(s,p,'deck',Array(18).fill(NATURE));
 return s;
}
function add(s,p,z,id,attributes={}){
 const x=Object.assign(inst(id),attributes);
 s.players[p][z].push(x);
 return x;
}
function run(s,op,p,source,params){
 (s.extTasks??=[]).push({op,p,source,...params});
 act(s,'toAttack');
}

test('official primary and seven reprints resolve to one legal battle definition',()=>{
 const manifest=read('support-phase-1346.json'),refs=read('image-reference-prints.json').prints;
 const registry=createCatalogue(snapshot,data.cards,details),[primary]=manifest.cards;
 assert.equal(primary.id,PRINCESS);
 assert.equal(manifest.printAliases.length,7);
 assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(primary.name)).map(c=>c.id),[PRINCESS]);
 const def=e.card(PRINCESS);
 assert.deepEqual([def.cost,def.power,def.civilizations,def.race,def.speedAttacker,def.breaker,def.limit],
  [8,8000,['火','自然'],'レッド・コマンド・ドラゴン/ハンター/エイリアン',true,2,4]);
 for(const row of [primary,...manifest.printAliases]){
  assert.deepEqual(registry.resolveRows([{id:row.id,count:1}]),[{id:PRINCESS,count:1}]);
  assert.equal(manifest.regulationVerification.limits[row.id],4);
  assert.equal(refs.find(x=>x.id===row.id)?.image,row.image);
 }
});

test('Burst uses the attempted Princess cost after the card replaces its own move',()=>{
 const s=field(),old=add(s,0,'grave',FIRE);
 give(s,0,'deck',[PRINCESS,NATURE,NATURE]);
 const top=s.players[0].deck[0],victim=add(s,1,'battle',PRINCESS),cost9=add(s,1,'battle','dm10-006');
 assert.equal(e.card(cost9).cost,9);
 cast(s,BURST);
 assert.ok(has(s,0,'deck',top)&&has(s,0,'deck',old));
 assert.deepEqual(values(s),[victim.uid]);
 pick(s,victim);
 assert.ok(has(s,1,'deck',victim)&&has(s,1,'battle',cost9));
 assert.equal(s.players[1].grave.length,0);
});

test('Dragon World may be destroyed even when the milled Princess returned to the deck (QA38632)',()=>{
 for(const accept of [true,null]){
  const s=field(1),world=add(s,0,'battle',WORLD),old=add(s,0,'grave',FIRE);
  give(s,0,'deck',[PRINCESS,NATURE,NATURE,NATURE]);
  const top=s.players[0].deck[0];
  s.phase='attack';
  act(s,'endTurn');
  assert.deepEqual(values(s),[true,null]);
  assert.ok(has(s,0,'deck',top)&&has(s,0,'deck',old));
  pick(s,accept);
  assert.equal(has(s,0,'grave',world),!!accept);
  assert.equal(has(s,0,'battle',world),!accept);
  assert.ok(has(s,0,'deck',top));
 }
});

test('Princess returns alone if existing grave cards cannot leave (QA40654)',()=>{
 const s=field(),old=add(s,0,'grave',FIRE),watcher=add(s,1,'battle',APUL);
 give(s,0,'deck',[PRINCESS,NATURE,NATURE]);
 const top=s.players[0].deck[0];
 cast(s,BURST);
 assert.ok(has(s,0,'deck',top)&&has(s,0,'grave',old));
 pick(s,watcher);
 assert.ok(has(s,1,'grave',watcher));
});

test('a simultaneous mill retains the other incoming cards in the graveyard (QA41288)',()=>{
 const s=field(),old=add(s,0,'grave',FIRE),source=add(s,0,'hand','dm36-s06');
 give(s,0,'deck',[PRINCESS,FIRE,NATURE,NATURE,NATURE]);
 const [princess,other,...keep]=s.players[0].deck,all=physical(s);
 act(s,'play',a=>a.uid===source.uid);
 for(const x of keep)pick(s,x);
 assert.ok(has(s,0,'deck',princess)&&has(s,0,'deck',old)&&has(s,0,'grave',other));
 assert.ok(keep.every(x=>has(s,0,'deck',x)));
 assert.equal(s.decision,null);
 assert.deepEqual(physical(s),all);
});

test('Last Flame cannot use Princess as a successfully discarded card (QA45440)',()=>{
 const s=field(),victim=add(s,1,'battle',NATURE),princess=add(s,0,'hand',PRINCESS);
 const old=add(s,0,'grave',FIRE);
 cast(s,FLAME);pick(s,princess);
 assert.ok(has(s,0,'deck',princess)&&has(s,0,'deck',old)&&has(s,1,'battle',victim));
 assert.equal(s.decision,null);
});

test('Princess sends an unpaid entrant to its owner, on either turn, but leaves a paid summon',()=>{
 for(const active of [0,1]){
  const s=field(active);
  add(s,0,'battle',PRINCESS);
  if(active===0){
   give(s,1,'shields',[SURFER]);
   const surfer=s.players[1].shields[0];
   attack(s,add(s,0,'battle',NATURE).uid);act(s,'noBlock');
   act(s,'useTrigger',a=>a.uid===surfer.uid);
   if(s.decision?.type==='effectOrder'){
    const own=s.pendingEffects.find(x=>x.player===1&&x.source===SURFER);
    if(own)act(s,'orderEffect',a=>a.effectId===own.effectId);
   }
   if(values(s).includes(null))pick(s,null);
   drain(s);
   assert.ok(has(s,1,'mana',surfer));
  }else{
   const paid=add(s,1,'hand',NATURE);
   act(s,'play',a=>a.uid===paid.uid);
   assert.ok(has(s,1,'battle',paid));
   const entrant=add(s,1,'grave',NATURE,{cardOwner:0});
   run(s,'revive',1,WORLD,{max:6,optional:true});
   pick(s,entrant);drain(s);
   assert.ok(has(s,0,'mana',entrant));
  }
 }
});

test('Baiken can bounce itself before the opposing unpaid-entry trigger resolves (QA32395)',()=>{
 const s=field(),baiken=add(s,1,'hand',BAIKEN);
 add(s,0,'battle',PRINCESS);
 run(s,'discard',1,FLAME,{n:1});
 pick(s,baiken);
 pick(s,true);
 assert.equal(s.decision.task.op,'bounceAny');
 pick(s,baiken);
 drain(s);
 assert.ok(has(s,1,'hand',baiken));
 assert.ok(!has(s,1,'mana',baiken));
});
