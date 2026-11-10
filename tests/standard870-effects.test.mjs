import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const YOTSU='dmr01-s07',REPRINT='dmx19-s41',OLDION='dm34-027',LAZES='dmr03-007';
const BEAST='dm01-108',FIRE='dm01-097',DARK='dm01-090',LIGHT='dm01-075';
const WORM='dm06-089',ORIGIN='dm34-024',MULTI='dmr04-046',STRATO='dm22rp2-048';
const RACCOON='dmr05-104';

function field(){
 const s=setup();
 for(const p of [0,1]){
  give(s,p,'deck',Array(12).fill(BEAST));
  give(s,p,'grave',[]);
 }
 return s;
}
function add(s,p,zone,id,props){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===(value?.uid??value));
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const ids=xs=>xs.map(x=>x.uid);
const restore=s=>JSON.parse(JSON.stringify(s));
function evolve(s,id,base){
 const x=add(s,0,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[base.uid]);
 act(s,'evolve',a=>a.baseUid===base.uid);
 return x;
}
function enemy(s,power){
 return add(s,1,'battle',FIRE,{powerModifiers:[{amount:power-e.card(FIRE).power,expires:'end',who:s.active}]});
}

test('Phase 870 registers three official cards and binds the Yotsuba reprint to the original ID',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-870.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[YOTSU,OLDION,LAZES]);
 assert.deepEqual(m.printAliases.map(({id,canonicalId})=>[id,canonicalId]),[[REPRINT,YOTSU]]);
 assert.deepEqual(registry.resolveRows([{id:REPRINT,count:1},{id:YOTSU,count:3}]),[{id:YOTSU,count:4}]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(d.faces,row.faces);
  assert.deepEqual(standardCardSpec(d,{phase:870}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:869}));
  const unknown=structuredClone(d);
  unknown.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:870}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   ['creature',f.cost,Number.parseInt(f.powerText,10),f.race,f.civilizations,1,4]);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);
 }
});

test('Yotsuba evolves on an allied Beast Folk, may ramp two together, then one on attack and breaks two shields',()=>{
 let s=field(),base=add(s,0,'battle',BEAST);
 add(s,0,'battle',DARK);
 add(s,1,'battle',BEAST);
 give(s,0,'deck',[MULTI,BEAST,FIRE,LIGHT,DARK]);
 const [first,second,third,fourth]=s.players[0].deck;
 const yotsu=evolve(s,YOTSU,base);
 assert.deepEqual(ids(yotsu.under),[base.uid]);
 assert.deepEqual(values(s),[true,null]);
 s=restore(s);
 pick(s,true);
 const mana=()=>s.players[0].mana.slice(-2);
 assert.deepEqual(ids(mana()),ids([first,second]));
 assert.deepEqual(mana().map(x=>x.tapped),[true,false]);
 attack(s,yotsu.uid);
 assert.deepEqual(values(s),[true,null]);
 pick(s,true);
 assert.equal(s.players[0].mana.at(-1).uid,third.uid);
 assert.equal(s.players[0].deck[0].uid,fourth.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 act(s,'breakShields',a=>a.shields.length===2);
 assert.equal(s.players[1].brokenThisTurn,2);
});

test('Yotsuba can decline each ramp independently and moves the only available card when accepting on entry',()=>{
 for(const accept of [false,true]){
  const s=field(),base=add(s,0,'battle',BEAST);
  give(s,0,'deck',[MULTI]);
  const [last]=s.players[0].deck,yotsu=evolve(s,YOTSU,base);
  pick(s,accept?true:null);
  if(accept){
   assert.ok(has(s,0,'mana',last)&&last.tapped);
   assert.equal(s.winner,1);
  }else{
   assert.equal(s.players[0].deck[0].uid,last.uid);
   attack(s,yotsu.uid);
   pick(s,null);
   assert.equal(s.players[0].deck[0].uid,last.uid);
   assert.equal(s.winner,null);
  }
 }
});

test('Oldion can evolve from either race and destroy only an opponent blocker before blockers are declared (QA 35911)',()=>{
 for(const id of [WORM,ORIGIN]){
  const s=field(),base=add(s,0,'battle',id);
  add(s,0,'battle',LAZES);
  const tapped=add(s,1,'battle',LAZES,{tapped:true}),blocker=add(s,1,'battle',LAZES),other=add(s,1,'battle',FIRE);
  const oldion=evolve(s,OLDION,base);
  attack(s,oldion.uid);
  assert.deepEqual(values(s),[base.uid,null]);
  pick(s,base);
  assert.ok(has(s,0,'grave',base));
  assert.deepEqual(values(s),ids([tapped,blocker]));
  pick(s,blocker);
  assert.ok(has(s,1,'grave',blocker)&&has(s,1,'battle',other));
  assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'));
 }
});

test('Oldion can decline; redirecting its chosen base to mana still resolves blocker destruction (QA 42937)',()=>{
 for(const replace of [false,true]){
  let s=field();
  const base=inst(WORM),oldion=add(s,0,'battle',OLDION,{under:[base]});
  const blocker=add(s,1,'battle',LAZES),replacement=replace?add(s,1,'battle',STRATO):null;
  attack(s,oldion.uid);
  pick(s,replace?base:null);
  if(replace){
   assert.equal(s.decision.player,1);
   s=restore(s);
   pick(s,replacement);
   assert.ok(has(s,0,'mana',base)&&!has(s,0,'grave',base));
   pick(s,blocker);
   assert.ok(has(s,1,'grave',blocker));
  }else{
   assert.equal(s.decision.type,'block');
   assert.deepEqual(ids(oldion.under),[base.uid]);
   assert.ok(has(s,1,'battle',blocker));
  }
 }
});

test('Lazes waits until the unblocked attack and its Shield Trigger finish before it untaps (QA 36452)',()=>{
 let s=field();
 s.active=1;
 const lazes=add(s,0,'battle',LAZES,{tapped:true}),attacker=enemy(s,6000);
 give(s,0,'shields',[RACCOON]);
 attack(s,attacker.uid);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'));
 act(s,'noBlock');
 act(s,'useTrigger');
 assert.equal(lazes.tapped,true);
 s=restore(s);
 pick(s,lazes);
 assert.ok(!s.players[0].battle.find(x=>x.uid===lazes.uid).tapped);
});

test('Lazes also untaps after an unblocked attack against a creature, but never after a blocked attack',()=>{
 for(const blocked of [false,true]){
  const s=field();
  s.active=1;
  const lazes=add(s,0,'battle',LAZES,{tapped:true}),attacker=enemy(s,4000);
  const target=add(s,0,'battle',BEAST,{tapped:true});
  const blocker=add(s,0,'battle',LAZES);
  attack(s,attacker.uid,target.uid);
  if(blocked)act(s,'block',a=>a.uid===blocker.uid);
  else act(s,'noBlock');
  drain(s);
  assert.equal(lazes.tapped,blocked);
  if(blocked)assert.ok(blocker.tapped&&has(s,1,'grave',attacker)&&has(s,0,'battle',target));
  else assert.ok(has(s,0,'grave',target));
 }
});

test('Lazes has its additional 2000 power only when blocking',()=>{
 for(const blocks of [false,true]){
  const s=field();
  s.active=1;
  const lazes=add(s,0,'battle',LAZES,{tapped:!blocks}),attacker=enemy(s,6500);
  assert.equal(e.power(lazes,false,s),5500);
  attack(s,attacker.uid,blocks?'player':lazes.uid);
  if(blocks)act(s,'block',a=>a.uid===lazes.uid);
  else act(s,'noBlock');
  drain(s);
  assert.ok(has(s,blocks?1:0,'grave',blocks?attacker:lazes));
  assert.ok(has(s,blocks?0:1,'battle',blocks?lazes:attacker));
 }
});
