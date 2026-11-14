import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const TAR='dm23rp2-007',HARA='dm24ex1-035',TWIN='dm23rp2-071';
const JENNY='dm23rp2-065',SEED='dmrp21-074',SMALL='dm01-108',GIANT='dm31-052',FAERIE='dm06-108',WATER='dm26ex2-020';
const GHOST='dm01-094',VIOLET='dm26ex1-N015',GOOD='dm25rp3-S06',AMO='dmrp19-s10',APUL='dmrp22-042';
const read=f=>JSON.parse(readFileSync(new URL('../tools/'+f,import.meta.url)));
const put=(s,p,z,id,attrs={})=>{const x=Object.assign(inst(id),attrs);s.players[p][z].push(x);return x;};
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const values=s=>s.decision.choices.map(o=>o.value?.uid??o.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const run=(s,op,p,opts={})=>{s.phase='main';s.extTasks=[{op,p,source:JENNY,...opts}];act(s,'toAttack');};
const move=(s,p,x,to='grave')=>run(s,'g34_ExactMove',1-p,{owner:p,target:x.uid,targetIncarnation:x.incarnation||0,to});
const played=(s,p,id)=>s.metrics[p].played[id]??0;
const field=()=>{const s=setup();for(const p of [0,1])give(s,p,'deck',Array(15).fill(SMALL));return s;};

test('six official prints resolve to three distinct playable names with their verified faces',()=>{
 const m=read('support-phase-1207.json'),refs=read('image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(c=>c.id),[TAR,HARA,TWIN]);
 assert.equal(m.printAliases.length,3);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,live=e.card(id),[face]=row.faces;
  const parsed={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(parsed,{phase:1207}),row.spec);
  const changed=structuredClone(parsed);
  changed.faces.at(-1).abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(changed,{phase:1207}));
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.ok(catalogue.get(id).supported);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[id]);
  assert.deepEqual([live.cost,live.power,live.race,live.civilizations,live.manaValue,live.limit],
   [face.cost,+face.powerText||0,face.race,face.civilizations,1,4]);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.equal(refs.find(c=>c.id===row.id&&c.canonicalId===id)?.image,row.image);
  if(!row.canonicalId){
   assert.equal(CARD_IMAGES[id],row.image);
   assert.deepEqual(details.cards.find(c=>c.id===id).faces,row.faces);
  }
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(live[key],value);
 }
});

test('Tarantula discounts for two own face-up creatures at their current power, including exactly 6000',()=>{
 const s=field(),c=e.card(TAR),edge=put(s,0,'battle',SMALL,{tapped:true}),second=put(s,0,'battle',TWIN,{sealed:true});
 edge.powerModifiers=[{amount:5999-e.card(SMALL).power,expires:'end',who:0}];
 put(s,1,'battle',TWIN);put(s,0,'battle',SEED);put(s,0,'grave',TWIN);
 assert.equal(e.summonCost(s,0,c),9);
 second.sealed=false;
 assert.equal(e.summonCost(s,0,c),9);
 edge.powerModifiers[0].amount++;
 assert.equal(e.summonCost(s,0,c),6);
 give(s,0,'deck',[GIANT,SMALL,SMALL,SMALL,SMALL,SMALL,SMALL]);
 cast(s,TAR);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,6);
 assert.equal(s.decision.task.op,'g34_DoubleRaidPick');
});

test('Tarantula uses the creature and spell Giant faces by choice and ignores cost 9',()=>{
 const s=field();
 give(s,0,'deck',[GIANT,TWIN,TAR,SMALL,SMALL,SMALL,SMALL,SMALL,SMALL]);
 const [giant,twin,expensive,...rest]=s.players[0].deck;
 cast(s,TAR);
 assert.deepEqual(s.decision.task.ids,[giant,twin,expensive,...rest.slice(0,3)].map(x=>x.uid));
 const choices=()=>s.decision.choices.map(x=>x.value&&[x.value.uid,x.value.face]);
 const select=(x,face)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return v?.uid===x.uid&&v?.face===face;});
 assert.deepEqual(choices(),[[giant.uid,0],[twin.uid,0],[twin.uid,1],null]);
 select(twin,1);select(giant,0);
 assert.equal(s.decision.task.op,'g34_DoubleRaidUse');
 select(twin,1);
 if(s.decision?.task?.op==='g34_Select')pick(s,null);
 drain(s);
 assert.ok(has(s,0,'grave',twin));
 assert.ok(has(s,0,'battle',giant));
 assert.ok(has(s,0,'deck',expensive));
 assert.equal(s.players[0].g34Protected.length,0);
});

test('putting Tarantula directly into play does not trigger W Mekraid, and it breaks three shields',()=>{
 const s=field(),x=put(s,0,'hand',TAR),deck=s.players[0].deck.map(y=>y.uid);
 run(s,'g34_Put',0,{target:x.uid,origin:'hand'});
 assert.ok(has(s,0,'battle',x));
 assert.equal(s.decision,null);
 assert.deepEqual(s.players[0].deck.map(y=>y.uid),deck);
 x.entered=0;s.turn=2;
 attack(s,x.uid);drain(s);
 assert.equal(s.players[1].shields.length,2);
});

test('Tarantula optionally redirects own Giant destruction, including itself and a Giant seed',()=>{
 let s=field();
 const tar=put(s,0,'battle',TAR),seed=put(s,0,'battle',SEED),g=put(s,0,'battle',GIANT),enemy=put(s,1,'battle',GIANT),other=put(s,0,'battle',SMALL);
 move(s,0,seed);assert.equal(s.decision.player,0);
 s=JSON.parse(JSON.stringify(s));
 act(s,'replaceYamata');assert.ok(has(s,0,'mana',seed));
 move(s,0,g);act(s,'allowLeave');assert.ok(has(s,0,'grave',g));
 move(s,0,other);assert.ok(has(s,0,'grave',other));
 move(s,1,enemy);assert.ok(has(s,1,'grave',enemy));
 move(s,0,tar);act(s,'replaceYamata');assert.ok(has(s,0,'mana',tar));
});

test('Tarantula cannot replace a Giant returning to hand',()=>{
 const s=field(),x=put(s,0,'battle',GIANT);put(s,0,'battle',TAR);
 move(s,0,x,'hand');
 assert.equal(s.decision,null);assert.ok(has(s,0,'hand',x));
});

test('Jaibaban ramps first and can return the freshly ramped Giant, or decline',()=>{
 for(const take of [true,false]){
  const s=field(),giant=put(s,0,'mana',GIANT),x=put(s,0,'hand',TWIN);
  give(s,0,'deck',[TWIN,SMALL,SMALL]);const top=s.players[0].deck[0];
  act(s,'play',a=>a.uid===x.uid&&a.face===1);
  assert.ok(has(s,0,'mana',top));
  assert.deepEqual(values(s),[giant.uid,top.uid,null]);
  pick(s,take?top.uid:null);
  assert.ok(has(s,0,take?'hand':'mana',top));assert.ok(has(s,0,'grave',x));
  assert.equal(s.players[0].mana.filter(y=>y.tapped).length,3);
 }
});

test('Kankuro Faerie can guard another creature but not the defending player (QA 40102)',()=>{
 const s=field(),enemy=put(s,0,'battle',SMALL),ally=put(s,1,'battle',SMALL,{tapped:true});
 s.active=1;const x=put(s,1,'hand',TWIN);
 act(s,'play',a=>a.uid===x.uid&&!a.face);
 assert.ok(has(s,1,'battle',x));
 assert.equal(s.players[1].mana.filter(y=>y.tapped).length,5);
 s.turn=2;s.active=0;
 attack(s,enemy.uid);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='guardman'));
 act(s,'noBlock');drain(s);
 enemy.tapped=false;
 attack(s,enemy.uid,ally.uid);
 act(s,'guardman',a=>a.uid===x.uid);drain(s);
 assert.ok(has(s,1,'battle',ally));assert.ok(has(s,0,'grave',enemy));assert.equal(x.tapped,true);
 x.tapped=false;s.active=1;
 const before=s.players[0].shields.length;
 attack(s,x.uid);drain(s);
 assert.equal(s.players[0].shields.length,before-2);
});

test('Haraguro can be paid or triggered from a shield and selects Snow Fairies up to cost five',()=>{
 for(const trigger of [false,true]){
  const s=field(),p=trigger?1:0;
  give(s,p,'deck',[TWIN,FAERIE,SMALL,HARA,TAR,SMALL,SMALL,SMALL,SMALL,SMALL]);
  const [twin,fairy]=s.players[p].deck;
  if(trigger){
   const a=put(s,0,'battle',SMALL);give(s,p,'shields',[HARA]);
   attack(s,a.uid);act(s,'noBlock');act(s,'useTrigger');
  }else cast(s,HARA);
  assert.equal(s.decision.task.op,'g34_DoubleRaidPick');
  assert.deepEqual(values(s),[twin.uid,fairy.uid,null]);
  pick(s,fairy.uid);pick(s,twin.uid);drain(s);
  assert.ok(has(s,p,'battle',fairy));assert.ok(has(s,p,'battle',twin));
  assert.equal(played(s,p,HARA),1);
  assert.equal(s.players[p].mana.filter(y=>y.tapped).length,trigger?0:e.card(HARA).cost);
 }
});

test('when Jenny enters the victim chooses their own card, then may cast Haraguro for free',()=>{
 for(const accept of [false,true]){
  let s=field();
  const h=put(s,1,'hand',HARA),keep=put(s,1,'hand',SMALL);
  cast(s,JENNY);
  assert.equal(s.decision.player,1);
  assert.deepEqual(values(s),[h.uid,keep.uid]);
  pick(s,h.uid);
  assert.equal(s.decision.task.op,'discardedSpell1207');
  assert.equal(s.decision.player,1);assert.ok(has(s,1,'grave',h));
  s=JSON.parse(JSON.stringify(s));
  pick(s,accept?true:null);drain(s);
  assert.equal(played(s,1,HARA),Number(accept));
  assert.ok(has(s,1,'grave',h));assert.ok(has(s,1,'hand',keep));
  assert.equal(s.players[1].mana.filter(y=>y.tapped).length,0);
 }
 const s=field();cast(s,JENNY);assert.equal(s.decision,null);
});

test('only a true opponent-caused discard from which the spell can leave the grave permits Haraguro',()=>{
 for(const mode of ['spell','self','replacement','locked']){
  const s=field(),h=put(s,1,'hand',HARA);
  if(mode==='self'){
   s.active=1;
   run(s,'discard',1,{source:GHOST,n:1,causedBy:1,selfDiscard:true});
  }else{
   if(mode==='replacement')put(s,1,'battle',AMO);
   if(mode==='locked')put(s,0,'battle',APUL);
   cast(s,GHOST);
  }
  if(mode==='replacement'){
   assert.equal(s.decision.task.op,'discardChosen');
   act(s,'extended',a=>!!s.decision.choices[a.choice].value?.g1090Mana);
  }
  if(mode==='spell'){
   assert.equal(s.decision.task.op,'discardedSpell1207');pick(s,true);
  }
  assert.notEqual(s.decision?.task?.op,'discardedSpell1207');
  drain(s);
  assert.equal(played(s,1,HARA),Number(mode==='spell'));
  assert.ok(has(s,1,mode==='replacement'?'mana':'grave',h));
 }
});

test('Violet casts Haraguro before the discard trigger can resolve (QA 48750)',()=>{
 const s=field(),h=put(s,1,'hand',HARA);
 put(s,0,'battle',WATER);
 cast(s,VIOLET);act(s,'evolve');
 assert.equal(s.decision.task.name,'violetSpell');
 pick(s,true);
 assert.notEqual(s.decision?.task?.op,'discardedSpell1207');
 drain(s);
 assert.ok(has(s,1,'grave',h));
 assert.equal(played(s,0,HARA),1);assert.equal(played(s,1,HARA),0);
});

for(const active of [0,1])test('Good/Evil and Haraguro obey turn player priority (QA 48755), active '+active,()=>{
 const s=field(),h=put(s,1,'hand',HARA),cost=put(s,0,'hand',SMALL);
 s.active=active;put(s,0,'battle',GOOD);
 run(s,'discard',0,{source:GOOD,causedBy:0,n:2,optional:true,randomDiscardAfter:true});
 pick(s,cost.uid);
 assert.equal(s.decision.player,active);
 assert.equal(s.decision.task.op,active===0?'stealSpell':'discardedSpell1207');
 pick(s,true);
 if(active===1){
  assert.equal(s.decision.task.op,'g34_DoubleRaidPick');pick(s,null);
  while(s.decision?.task?.op==='g34_Order')pick(s,values(s)[0]);
  assert.equal(s.decision.task.op,'stealSpell');pick(s,true);
 }
 assert.notEqual(s.decision?.task?.op,'discardedSpell1207');
 drain(s);
 assert.ok(has(s,1,'grave',h));
 assert.equal(played(s,0,HARA),1);assert.equal(played(s,1,HARA),active);
});
