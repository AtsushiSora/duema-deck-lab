import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,cast,GEN} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const LASER='dm32-016',SHIBA='dm32-065',GENERAL='dm19-s09';
const PLAIN='dm01-108',DREAM='dm34-052',OTHER_DREAM='dm32-106',TWIN='dmex12-045';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const values=s=>(s.decision?.choices??[]).map(x=>x.value?.uid??x.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);
const restore=s=>JSON.parse(JSON.stringify(s));
const zone=(s,p,z)=>s.players[p][z].map(x=>x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();

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

function invoke(s,p,source,defs){
 s.extTasks=[{op:'g34_Sequence',p,source:source.cardId,uid:source.uid,incarnation:source.incarnation||0,defs}];
 s.phase='main';
 act(s,'toAttack');
}

function move(s,p,x,to='grave'){
 invoke(s,s.active,x,[{op:'ExactMove',owner:p,to,target:x.uid,targetIncarnation:x.incarnation||0}]);
}

function end(s){
 s.phase='attack';
 act(s,'endTurn');
}

test('Phase 960 preserves three verified single-print IDs, rules text, art and limits',()=>{
 const m=read('tools/support-phase-960.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(r=>r.id),[LASER,SHIBA,GENERAL]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const {id}=row,c=e.card(id),d=details.cards.find(x=>x.id===id),f=d.faces[0];
  assert.deepEqual(d.faces,row.faces);
  assert.deepEqual(standardCardSpec(d,{phase:960}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:959}));
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'未知の能力。'}]},{phase:960}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.race,e.civilizations(c),c.manaValue,c.limit],
   [id===LASER?'spell':'creature',f.cost,f.race,f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-960');
  assert.equal(row.verification.facesMatched,true);
  assert.equal(m.regulationVerification.limits[id],4);
  assert.deepEqual(refs.filter(r=>r.id===id).map(r=>[r.canonicalId,r.image]),[[id,row.image]]);
  assert.equal(CARD_IMAGES[id],row.image);
  assert.deepEqual(catalogue.resolveRows([{id,count:1}]),[{id,count:1}]);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(r=>nameKey(r.name)===nameKey(row.name)).map(r=>r.id),[id]);
 }
});

test('Laser grants unblockable to at most two selected allies until turn end',()=>{
 const s=field(),a=put(s,0,'battle',PLAIN),b=put(s,0,'battle',DREAM),c=put(s,0,'battle',OTHER_DREAM);
 const rival=put(s,1,'battle',SHIBA,{under:[inst(DREAM)]});
 cast(s,LASER);
 assert.deepEqual(values(s),[0,1]);
 pick(s,0);
 assert.deepEqual(values(s),[a.uid,b.uid,c.uid,null]);
 pick(s,a.uid);
 assert.deepEqual(values(s),[b.uid,c.uid,null]);
 pick(s,b.uid);
 assert.equal(s.decision,null);
 assert.ok(e.effectiveCard(a,s).unblockable&&e.effectiveCard(b,s).unblockable);
 assert.ok(!e.effectiveCard(c,s).unblockable&&!e.effectiveCard(rival,s).unblockable);
 end(s);
 assert.ok(!e.effectiveCard(a,s).unblockable&&!e.effectiveCard(b,s).unblockable);
});

test('Laser chooses untap recipients during resolution, before any are untapped',()=>{
 let s=field(1);
 const a=put(s,1,'battle',PLAIN,{tapped:true}),b=put(s,1,'battle',DREAM),c=put(s,1,'battle',OTHER_DREAM,{tapped:true});
 cast(s,LASER);
 pick(s,1);
 assert.equal(s.decision.task.op,'g34_ChooseUntap562');
 assert.deepEqual(values(s),[a.uid,b.uid,c.uid,null]);
 pick(s,a.uid);
 assert.deepEqual(values(s),[b.uid,c.uid,null]);
 pick(s,b.uid);
 assert.ok(a.tapped&&c.tapped);
 b.tapped=true;
 const later=put(s,1,'battle',PLAIN,{tapped:true});
 const before=physical(s);
 s=restore(s);
 end(s);
 assert.equal(s.decision,null);
 assert.deepEqual(s.players[1].battle.filter(x=>x.tapped).map(x=>x.uid),[c.uid,later.uid]);
 assert.deepEqual(physical(s).filter(uid=>before.includes(uid)),before);
});

test('Laser can apply both modes to the same creature and choose fewer than two for each',()=>{
 const s=field(),base=put(s,0,'battle',DREAM),a=put(s,0,'battle',PLAIN),b=put(s,0,'battle',OTHER_DREAM,{tapped:true});
 put(s,1,'battle','dm01-076');
 cast(s,SHIBA);
 act(s,'evolve',x=>x.baseUid===base.uid);
 const shiba=s.players[0].battle.find(x=>x.cardId===SHIBA);
 assert.equal(shiba.under[0].uid,base.uid);
 cast(s,LASER);
 assert.deepEqual(values(s),[0,1,2]);
 pick(s,2);
 pick(s,a.uid);
 pick(s,null);
 assert.equal(s.decision.task.op,'g34_ChooseUntap562');
 pick(s,a.uid);
 pick(s,null);
 assert.ok(e.effectiveCard(a,s).unblockable&&!e.effectiveCard(b,s).unblockable);
 attack(s,a.uid);
 assert.ok(a.tapped);
 assert.ok(e.getLegalActions(s).every(action=>action.kind!=='block'));
 act(s,'noBlock');
 end(s);
 assert.ok(!a.tapped&&b.tapped&&!e.effectiveCard(a,s).unblockable);
});

test('Laser allows both target selections to be empty',()=>{
 const s=field();
 put(s,0,'battle',SHIBA,{under:[inst(DREAM)]});
 cast(s,LASER);
 pick(s,2);
 pick(s,null);
 pick(s,null);
 assert.equal(s.decision,null);
 assert.equal(s.g501EndDelays?.length??0,0);
});

test('Laser does not untap a newly entered incarnation or resolve under Genmu',()=>{
 for(const mute of [false,true]){
  const s=field(),a=put(s,0,'battle',PLAIN,{tapped:true}),b=put(s,0,'battle',DREAM,{tapped:true});
  cast(s,LASER);
  pick(s,1);
  pick(s,a.uid);
  pick(s,b.uid);
  move(s,0,a,'hand');
  s.phase='main';
  act(s,'play',x=>x.uid===a.uid);
  const returned=s.players[0].battle.find(x=>x.uid===a.uid);
  returned.tapped=true;
  if(mute)put(s,1,'battle',GEN);
  end(s);
  assert.equal(returned.tapped,true);
  assert.equal(b.tapped,mute);
 }
});

test('Shiba uses Dream Mate evolution and can recover one exact base including a noncreature',()=>{
 const s=field(),dream=put(s,0,'battle',DREAM),plain=put(s,0,'battle',PLAIN);
 const duplicate=put(s,0,'grave',DREAM),seed=inst('dmrp21-040');
 const shiba=put(s,0,'hand',SHIBA);
 act(s,'play',a=>a.uid===shiba.uid);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[dream.uid]);
 act(s,'evolve',a=>a.baseUid===dream.uid);
 assert.equal(s.players[0].battle.find(x=>x.uid===shiba.uid).under[0].uid,dream.uid);
 assert.ok(zone(s,0,'battle').includes(plain.uid));
 assert.equal(e.effectiveCard(shiba,s).breaker,2);
 shiba.under.push(seed,inst(LASER),inst('dm26rp1-043'));
 const before=physical(s);
 move(s,0,shiba);
 assert.deepEqual(values(s),[dream.uid,seed.uid,null]);
 pick(s,seed.uid);
 assert.ok(zone(s,0,'battle').includes(seed.uid));
 assert.ok(zone(s,0,'grave').includes(dream.uid)&&zone(s,0,'grave').includes(duplicate.uid));
 assert.deepEqual(physical(s),before);
});

test('Shiba follows a grave visit through JSON and ignores a later visit by the same card',()=>{
 for(const laterVisit of [false,true]){
  let s=field(1);
  const dream=inst(DREAM),shiba=put(s,0,'battle',SHIBA,{under:[dream]});
  move(s,0,shiba);
  assert.equal(s.decision.player,0);
  s=restore(s);
  if(laterVisit){
   const grave=s.players[0].grave.find(x=>x.uid===dream.uid);
   grave.zoneSerial++;
   pick(s,dream.uid);
   assert.ok(zone(s,0,'grave').includes(dream.uid));
  }else{
   pick(s,dream.uid);
   assert.ok(zone(s,0,'battle').includes(dream.uid));
  }
 }
});

test('Shiba ignores bounce, a prevented destruction and an ability-ignored departure',()=>{
 for(const outcome of ['hand','prevent','ignored']){
  const s=field(),dream=inst(DREAM),shiba=put(s,0,'battle',SHIBA,{under:[dream]});
  if(outcome==='prevent')shiba.g26Stay=true;
  if(outcome==='ignored')shiba.g35Ignored=s.turn;
  move(s,0,shiba,outcome==='hand'?'hand':'grave');
  assert.equal(s.decision,null);
  assert.equal(zone(s,0,'battle').includes(shiba.uid),outcome==='prevent');
  assert.ok(!zone(s,0,'battle').includes(dream.uid));
 }
});

test('Shiba can decline a valid former base and skips a departed base',()=>{
 const s=field(),dream=inst(DREAM),shiba=put(s,0,'battle',SHIBA,{under:[dream]});
 const departed=put(s,0,'grave',OTHER_DREAM);
 move(s,0,shiba);
 assert.deepEqual(values(s),[dream.uid,null]);
 pick(s,null);
 assert.deepEqual(zone(s,0,'battle'),[]);
 assert.deepEqual(zone(s,0,'grave'),[departed.uid,shiba.uid,dream.uid]);
});

test('Kwagatan matches the exact creature face in its controller’s mana zone',()=>{
 let s=field(0);
 const general=put(s,1,'battle',GENERAL),victim=put(s,1,'battle',TWIN);
 const twin=put(s,1,'mana',TWIN,{tapped:true}),hidden=put(s,1,'mana',TWIN,{faceDown:true});
 const other=put(s,1,'mana',OTHER_DREAM),opponent=put(s,0,'mana',TWIN),before=physical(s);
 move(s,1,victim);
 assert.equal(s.decision.player,1);
 assert.deepEqual(values(s),[twin.uid,null]);
 s=restore(s);
 pick(s,twin.uid);
 assert.equal(s.players[1].battle.find(x=>x.uid===twin.uid).tapped,false);
 assert.ok(zone(s,1,'battle').includes(general.uid));
 assert.ok(zone(s,1,'mana').includes(hidden.uid)&&zone(s,1,'mana').includes(other.uid));
 assert.ok(zone(s,0,'mana').includes(opponent.uid));
 assert.deepEqual(physical(s),before);
});

test('Kwagatan produces one optional trigger per matching simultaneous death',()=>{
 const s=field(),general=put(s,0,'battle',GENERAL),first=put(s,0,'battle',DREAM),second=put(s,0,'battle',OTHER_DREAM);
 const firstCopy=put(s,0,'mana',DREAM),secondCopy=put(s,0,'mana',OTHER_DREAM),before=physical(s);
 invoke(s,0,general,[{op:'Sweep',to:'grave',owner:'self',filter:{creature:true,race:'ドリームメイト'}}]);
 assert.equal(s.decision.type,'effectOrder');
 const firstTrigger=s.pendingEffects.find(x=>x.task.defs[0].g960DeathNames.includes(nameKey(e.card(DREAM).name)));
 act(s,'orderEffect',a=>a.effectId===firstTrigger.effectId);
 assert.deepEqual(values(s),[firstCopy.uid,null]);
 pick(s,firstCopy.uid);
 assert.deepEqual(values(s),[secondCopy.uid,null]);
 pick(s,null);
 assert.ok(zone(s,0,'grave').includes(first.uid)&&zone(s,0,'grave').includes(second.uid));
 assert.ok(zone(s,0,'battle').includes(firstCopy.uid)&&zone(s,0,'mana').includes(secondCopy.uid));
 assert.deepEqual(physical(s),before);
});

test('Kwagatan does not watch opponent deaths or other deaths in its own simultaneous departure',()=>{
 const s=field(),general=put(s,0,'battle',GENERAL),victim=put(s,0,'battle',DREAM);
 const opponent=put(s,1,'battle',DREAM),candidate=put(s,0,'mana',DREAM);
 move(s,1,opponent);
 assert.equal(s.decision,null);
 invoke(s,0,general,[{op:'Sweep',to:'grave',both:true,filter:{creature:true}}]);
 assert.equal(s.decision,null);
 assert.ok(zone(s,0,'grave').includes(general.uid)&&zone(s,0,'grave').includes(victim.uid));
 assert.ok(zone(s,0,'mana').includes(candidate.uid));
});

test('Kwagatan respects blocked deployments and does not substitute a different Dream Mate name',()=>{
 for(const blocked of [false,true]){
  const s=field(),general=put(s,0,'battle',GENERAL),victim=put(s,0,'battle',SHIBA);
  const candidate=put(s,0,'mana',blocked?SHIBA:OTHER_DREAM);
  move(s,0,victim);
  assert.equal(s.decision,null);
  assert.ok(zone(s,0,'battle').includes(general.uid)&&zone(s,0,'mana').includes(candidate.uid));
 }
});
