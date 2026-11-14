import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const BOL='dm23rp3-020',ARCHER='dm23rp3-023',RECORD='dm22rp1-026';
const GREEN='dm01-108',FIRE='dm01-097',WATER='dm01-083',LIGHT='dm01-075',DARK='dm01-090';
const SEED='dmrp22-049',DENY='dmrp19-s10',BOLT='dm01-086',STOP='dm01-027';
const field=(active=0)=>{
 const s=Object.assign(setup(),{active});
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(GREEN));
 return s;
};
const add=(s,p,id,zone='battle',props={})=>{
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
};
const play=(s,id,face=0)=>{
 const x=add(s,s.active,id,'hand');
 act(s,'play',a=>a.uid===x.uid&&(a.face??0)===face);
 return x;
};
const values=s=>s.decision?.choices?.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>s.decision?.type==='effect'?
 act(s,'effect',a=>a.targets?.some(t=>t.uid===value)):
 act(s,'extended',a=>values(s)[a.choice]===value);
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const end=s=>{s.phase='attack';act(s,'endTurn');if(s.phase==='charge')act(s,'skipCharge');};
const noBlock=s=>{if(s.decision?.type==='block')act(s,'noBlock');};
const recordChoice=(s,uid)=>{assert.equal(s.decision.task.source,RECORD);assert.equal(s.decision.task.op,'g34_Offer');if(uid)assert.equal(s.decision.task.uid,uid);};
const burst=(s,x,from)=>{assert.equal(s.decision?.task?.op,'g21Mega');assert.equal(s.decision.task.uid,x.uid);assert.equal(s.decision.task.origin,from);pick(s,true);};

test('three complete official card definitions keep existing IDs and face metadata',()=>{
 const read=f=>JSON.parse(readFileSync(new URL('../tools/'+f,import.meta.url)));
 const m=read('support-phase-1220.json'),refs=read('image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(r=>r.id),[BOL,ARCHER,RECORD]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const c=e.card(row.id);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1220}),row.spec);
  assert.deepEqual(cat.resolveRows([{id:row.id,count:1}]),[{id:row.id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[row.id]);
  assert.equal(cat.get(row.id).supported,true);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===row.id)?.image,row.image);
  assert.equal(c.limit,m.regulationVerification.limits[row.id]);
  assert.equal(c.manaValue,1);
  for(const [index,face] of e.playFaces(c).entries()){
   const printed=row.faces[index];
   assert.deepEqual([face.cost,face.race,face.civilizations],[printed.cost,printed.race,printed.civilizations]);
  }
 }
});

test('Bolzeras untaps after its own first attack finishes, even if a different creature attacked first',()=>{
 const s=field(),other=add(s,0,FIRE),dragon=add(s,0,BOL);
 attack(s,other.uid);noBlock(s);drain(s);
 for(const untapped of [true,false]){
  attack(s,dragon.uid);
  assert.ok(dragon.tapped);
  noBlock(s);drain(s);
  assert.equal(dragon.tapped,!untapped);
 }
 end(s);end(s);
 attack(s,dragon.uid);noBlock(s);drain(s);
 assert.equal(dragon.tapped,false);
});

test('Bolzeras does not untap if the first attack is cut short by Clock',()=>{
 const s=field(),dragon=add(s,0,BOL);
 give(s,1,'shields',['dmr09-021']);
 attack(s,dragon.uid);noBlock(s);
 act(s,'useTrigger');drain(s);
 assert.equal(s.active,1);
 assert.ok(dragon.tapped);
});

test('the Bolzeras spell selects only opposing selectable blockers, and draws if none exist',()=>{
 for(const target of [false,true]){
  const s=field(),ally=add(s,0,'dm23rp3-034'),regular=add(s,1,FIRE);
  const immune=add(s,1,'dm23rp3-034','battle',{justDiverActive:true});
  const blocker=target?add(s,1,'dm23rp3-034'):null,top=s.players[0].deck[0];
  play(s,BOL,1);
  if(blocker){
   assert.deepEqual(values(s),[blocker.uid]);
   pick(s,blocker.uid);
   pick(s,null);
   assert.ok(has(s,1,'grave',blocker));
  }
  assert.ok(has(s,0,'hand',top)&&has(s,0,'battle',ally)&&has(s,1,'battle',immune)&&has(s,1,'battle',regular));
 }
});

test('Bolzeras uses Mega Last Burst from hand after bouncing and can still draw without blockers',()=>{
 const s=field(1),x=add(s,0,BOL),top=s.players[0].deck[0];
 play(s,BOLT);pick(s,x.uid);
 burst(s,x,'hand');
 assert.ok(has(s,0,'grave',x)&&has(s,0,'hand',top));
});

test('Archer may use itself for its mana payment and breaks two shields; its spell cannot normally be cast from mana',()=>{
 const s=field();
 give(s,0,'mana',Array(4).fill(GREEN));
 const x=add(s,0,ARCHER,'mana');
 const legal=e.getLegalActions(s).filter(a=>a.uid===x.uid);
 assert.deepEqual(legal.map(a=>[a.kind,a.origin,a.cost,a.face??0]),[['play','mana',5,0]]);
 act(s,'play',a=>a.uid===x.uid);
 assert.ok(has(s,0,'battle',x)&&!x.tapped);
 assert.ok(s.players[0].mana.every(y=>y.tapped));
 end(s);end(s);
 attack(s,x.uid);noBlock(s);drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('the Archer spell draws after its optional battle and also draws when that battle is declined or unavailable',()=>{
 for(const situation of ['choose','decline','no ally']){
  let s=field();
  const a=situation==='no ally'?null:add(s,0,ARCHER),b=add(s,1,FIRE),top=s.players[0].deck[0];
  play(s,ARCHER,1);
  if(a){
   const [own]=values(s);
   assert.equal(own,a.uid);
   if(situation==='decline')pick(s,null);
   else{
    pick(s,a.uid);
    assert.ok(!has(s,0,'hand',top));
    s=JSON.parse(JSON.stringify(s));
    pick(s,b.uid);
   }
  }
  assert.equal(has(s,1,'grave',b),situation==='choose');
  assert.ok(has(s,0,'hand',top));
 }
});

test('Archer can use its spell from mana through Mega Last Burst and its effect does not consume mana',()=>{
 const s=field(1),x=add(s,0,ARCHER),enemy=add(s,1,WATER),ally=add(s,0,GREEN);
 play(s,'dmc27-055');pick(s,x.uid);
 burst(s,x,'mana');
 pick(s,ally.uid);pick(s,enemy.uid);
 assert.ok(has(s,0,'grave',x)&&has(s,1,'grave',enemy));
 assert.ok(s.players[0].mana.every(y=>!y.tapped));
});

test('Record watches only actual own use and excludes itself; two copies track separate uses',()=>{
 const s=field(),record=play(s,RECORD);
 assert.equal(s.decision,null);
 play(s,RECORD);
 recordChoice(s,record.uid);pick(s,null);
 assert.equal(s.decision,null);
 play(s,SEED);
 assert.equal(s.decision?.type,'effectOrder');
 act(s,'orderEffect');recordChoice(s);pick(s,null);
 recordChoice(s);pick(s,null);
 s.active=1;
 play(s,SEED);
 play(s,STOP);
 assert.equal(s.decision,null);
 const t=field();
 play(t,RECORD);
 const host=add(t,0,'dmsd20-001'),seed=add(t,0,SEED,'hand');
 attack(t,host.uid);pick(t,seed.uid);
 assert.ok(has(t,0,'battle',seed));
 assert.equal(t.decision?.task?.source===RECORD,false);
});

test('Record independently offers the draw and a tapped hand-to-mana move',()=>{
 for(const how of ['skip draw','skip mana','move']){
  const s=field();
  play(s,RECORD);
  const top=s.players[0].deck[0],spare=add(s,0,FIRE,'hand');
  const mana=s.players[0].mana.length;
  play(s,STOP);
  recordChoice(s);
  pick(s,how==='skip draw'?null:true);
  if(how!=='skip draw'){
   assert.ok(values(s).includes(top.uid)&&values(s).includes(spare.uid));
   pick(s,how==='move'?spare.uid:null);
  }
  assert.equal(has(s,0,'hand',top),how!=='skip draw');
  assert.equal(s.players[0].mana.length,mana+Number(how==='move'));
  if(how==='move')assert.ok(spare.tapped&&has(s,0,'mana',spare));
 }
});

test('Record uses the same optional continuation after an attempted draw and recognizes a used dual-type Tamaseed',()=>{
 const s=field();
 play(s,RECORD);
 add(s,1,DENY);
 s.players[0].drawsThisTurn=1;
 const top=s.players[0].deck[0],spare=add(s,0,DARK,'hand');
 play(s,'dm22rp1-069');
 recordChoice(s);pick(s,true);
 assert.ok(has(s,0,'mana',top)&&!has(s,0,'hand',top));
 pick(s,spare.uid);
 assert.ok(has(s,0,'mana',spare)&&spare.tapped);
 play(s,'dm22rp1-8A');
 if(s.decision?.type==='effectOrder')act(s,'orderEffect',a=>s.pendingEffects.find(x=>x.effectId===a.effectId)?.source===RECORD);
 recordChoice(s);pick(s,null);
});

test('Record may enter for free through its own S-Trigger on the opposing turn and see later S-Trigger use',()=>{
 const s=field(1);
 give(s,0,'mana',[]);
 give(s,0,'shields',[RECORD,STOP]);
 for(const id of [RECORD,STOP]){
  const a=add(s,1,FIRE);
  attack(s,a.uid);noBlock(s);
  act(s,'useTrigger',a=>a.cardId===id);
  if(id===STOP){
   pick(s,a.uid);
   recordChoice(s);pick(s,true);
   pick(s,null);
  }
 }
 assert.ok(s.players[0].battle.some(x=>x.cardId===RECORD));
 assert.equal(s.players[0].mana.length,0);
 assert.equal(s.metrics[0].triggers,2);
});
