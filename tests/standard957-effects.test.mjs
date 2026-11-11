import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const BRIGHT='dm23-008',YURIN='dm23-017',LUPIA='dm27-014',MUSHA='dm24-s04';
const MECHA='dm28-073',HERO='dmrp12-075',DREAM='dm34-052',BEE='dm21-053',BOTH='dm26rp1-022';
const PLAIN='dm01-108',BUI='dm23ex1-005',APUL='dmrp22-042',DRAGON='dm36-087';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const zone=(s,p,z)=>s.players[p][z].map(x=>x.uid);
const legal=(s,kind)=>e.getLegalActions(s).filter(a=>a.kind===kind);
const pick=(s,value)=>act(s,'extended',a=>s.decision.choices[a.choice].value===value);
const choose=(s,x,kind='replaceLGate955')=>act(s,kind,a=>a.uid===x.uid);

function field(){
 const s=setup();
 s.active=0;
 for(const p of [0,1]){
  give(s,p,'deck',Array(12).fill(PLAIN));
  give(s,p,'grave',[]);
 }
 return s;
}

function put(s,p,z,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][z].push(x);
 return x;
}

function destroy(s,x,to='grave'){
 s.extTasks=[{op:'g34_ExactMove',p:1,source:'dm01-046',owner:0,target:x.uid,to}];
 act(s,'toAttack');
}

function sweep(s){
 s.extTasks=[{op:'g34_Sweep',p:0,source:'dm01-046',owner:'self',to:'grave',filter:{creature:true}}];
 act(s,'toAttack');
}

test('Phase 957 verifies three complete names, two alternate prints and original identifiers',()=>{
 const m=read('tools/support-phase-957.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[BRIGHT,YURIN,LUPIA]);
 assert.deepEqual(m.printAliases.map(r=>[r.id,r.canonicalId]),[['dmc53-020',LUPIA],['dmc43-029',LUPIA]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,f=row.faces[0],card=e.card(id),canonical=m.cards.find(c=>c.id===id);
  const d={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(d,{phase:957}),canonical.spec);
  assert.throws(()=>standardCardSpec(d,{phase:956}));
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'不明な能力。'}]},{phase:957}));
  for(const [key,value] of Object.entries(canonical.spec))assert.deepEqual(card[key],value);
  assert.deepEqual([card.type,card.cost,card.power,card.race,e.civilizations(card),card.manaValue,card.limit],
   ['creature',f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  assert.equal(card.supportBatch,'phase-957');
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(refs.filter(r=>r.id===row.id).map(r=>[r.canonicalId,r.image]),[[id,row.image]]);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(r=>nameKey(r.name)===nameKey(row.name)).map(r=>r.id),[id]);
 }
});

for(const [id,raceA,raceB] of [[BRIGHT,MECHA,HERO],[YURIN,DREAM,BEE]]){
 test(id+' returns one from each race after JSON, even when the second race is chosen first',()=>{
  let s=field();
  const x=put(s,0,'battle',id),first=put(s,0,'grave',raceB),second=put(s,0,'grave',raceA);
  const wrong=put(s,0,'grave',PLAIN),same=put(s,0,'grave',raceB);
  put(s,1,'grave',raceA);
  const hidden=put(s,0,'grave',raceA,{faceDown:true});
  const before=physical(s),deck=zone(s,0,'deck');
  destroy(s,x);
  assert.deepEqual(legal(s,'replaceLGate955').map(a=>a.uid),[first.uid,second.uid,same.uid]);
  choose(s,first);
  assert.equal(s.decision.type,'leaveLGate957');
  assert.deepEqual(zone(s,0,'grave'),[first.uid,second.uid,wrong.uid,same.uid,hidden.uid]);
  assert.deepEqual(zone(s,0,'hand'),[]);
  assert.deepEqual(zone(s,0,'deck'),deck);
  s=restore(s);
  assert.deepEqual(legal(s,'replaceLGateSecond957').map(a=>a.uid),[second.uid]);
  assert.equal(e.chooseAI(s).kind,'replaceLGateSecond957');
  choose(s,second,'replaceLGateSecond957');
  assert.deepEqual(zone(s,0,'hand'),[first.uid,second.uid]);
  assert.deepEqual(zone(s,0,'grave'),[wrong.uid,same.uid,hidden.uid]);
  assert.deepEqual(zone(s,0,'deck'),[...deck,x.uid]);
  assert.deepEqual(physical(s),before);
 });

 test(id+' can change its first choice, then use only one race',()=>{
  const s=field(),x=put(s,0,'battle',id);
  const first=put(s,0,'grave',raceA),other=put(s,0,'grave',raceB);
  destroy(s,x);
  choose(s,first);
  act(s,'cancelLGate957');
  assert.deepEqual(zone(s,0,'hand'),[]);
  choose(s,other);
  act(s,'finishLGate957');
  assert.deepEqual(zone(s,0,'grave'),[first.uid]);
  assert.deepEqual(zone(s,0,'hand'),[other.uid]);
  assert.equal(s.players[0].deck.at(-1).uid,x.uid);
 });
}

test('One eligible creature resolves immediately and two of the same race cannot be selected',()=>{
 const s=field(),x=put(s,0,'battle',BRIGHT),first=put(s,0,'grave',MECHA),same=put(s,0,'grave',MECHA);
 destroy(s,x);
 choose(s,first);
 assert.equal(s.decision,null);
 assert.deepEqual(zone(s,0,'hand'),[first.uid]);
 assert.deepEqual(zone(s,0,'grave'),[same.uid]);
});

test('A two-race card fills either slot but cannot occupy both',()=>{
 const s=field(),x=put(s,0,'battle',YURIN);
 const both=put(s,0,'grave',BOTH),dream=put(s,0,'grave',DREAM),bee=put(s,0,'grave',BEE);
 destroy(s,x);
 choose(s,both);
 assert.deepEqual(legal(s,'replaceLGateSecond957').map(a=>a.uid),[dream.uid,bee.uid]);
 choose(s,dream,'replaceLGateSecond957');
 assert.deepEqual(zone(s,0,'hand'),[both.uid,dream.uid]);
 assert.deepEqual(zone(s,0,'grave'),[bee.uid]);
});

test('Simultaneous L-Gates reserve both chosen grave cards and place both sources at the bottom',()=>{
 let s=field();
 const one=put(s,0,'battle',BRIGHT),two=put(s,0,'battle',BRIGHT);
 const first=put(s,0,'grave',MECHA),second=put(s,0,'grave',HERO),spare=put(s,0,'grave',HERO);
 const before=physical(s),deck=zone(s,0,'deck');
 sweep(s);
 assert.equal(s.decision.uid,one.uid);
 choose(s,first);
 choose(s,second,'replaceLGateSecond957');
 assert.equal(s.decision.uid,two.uid);
 assert.deepEqual(zone(s,0,'hand'),[]);
 s=restore(s);
 assert.deepEqual(legal(s,'replaceLGate955').map(a=>a.uid),[spare.uid]);
 choose(s,spare);
 while(s.decision)e.step(s,e.chooseAI(s));
 assert.deepEqual(zone(s,0,'hand'),[first.uid,second.uid,spare.uid]);
 assert.deepEqual(zone(s,0,'grave'),[]);
 assert.deepEqual(zone(s,0,'deck').slice(0,-2),deck);
 assert.deepEqual(zone(s,0,'deck').slice(-2).sort(),[one.uid,two.uid].sort());
 assert.deepEqual(physical(s),before);
});

for(const mode of ['decline','locked','bounce'])test('Dual L-Gate leaves the grave unchanged for '+mode,()=>{
 const s=field(),x=put(s,0,'battle',BRIGHT),eligible=put(s,0,'grave',HERO);
 if(mode==='locked')put(s,1,'battle',APUL);
 destroy(s,x,mode==='bounce'?'hand':'grave');
 if(mode==='decline')act(s,'allowLeave');
 assert.equal(s.decision,null);
 assert.deepEqual(zone(s,0,'grave'),mode==='bounce'?[eligible.uid]:[eligible.uid,x.uid]);
 assert.deepEqual(zone(s,0,'hand'),mode==='bounce'?[x.uid]:[]);
});

test('Musha Lupia enters mana tapped and contributes one mana',()=>{
 const s=field(),x=put(s,0,'hand',LUPIA);
 s.phase='charge';
 act(s,'charge',a=>a.uid===x.uid);
 assert.ok(s.players[0].mana.find(y=>y.uid===x.uid).tapped);
 assert.equal(e.manaValue(e.card(x)),1);
});

for(const reduction of [0,1])test('Musha Lupia optionally reduces a dragon summon by '+reduction,()=>{
 let s=field();
 put(s,0,'battle',LUPIA);
 const dragon=put(s,0,'hand',DRAGON);
 act(s,'play',a=>a.uid===dragon.uid);
 assert.equal(s.decision.task.op,'g34_PayAura560');
 s=restore(s);
 pick(s,reduction);
 assert.ok(zone(s,0,'battle').includes(dragon.uid));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,e.card(DRAGON).cost-reduction);
 assert.equal(e.summonCost(s,0,e.card(PLAIN)),e.card(PLAIN).cost);
 assert.equal(e.summonCost(s,0,{...e.card(DRAGON),cost:1}),1);
 assert.equal(e.summonCost(s,1,e.card(DRAGON)),e.card(DRAGON).cost);
});

function resolveAttackChoices(s,accept){
 for(let i=0;s.decision;i++){
  assert.ok(i<12,JSON.stringify(s.decision));
  if(s.decision.task?.op==='g34_Offer'&&s.decision.task.source===LUPIA){
   pick(s,accept?true:null);
  }else if(s.decision.type==='block')act(s,'noBlock');
  else e.step(s,e.getLegalActions(s).at(-1));
 }
}

for(const accept of [true,false])test('Only the exact allied Musha attack offers a face-down shield '+accept,()=>{
 let s=field();
 put(s,0,'battle',LUPIA);
 put(s,1,'battle',LUPIA);
 const musha=put(s,0,'battle',MUSHA),top=s.players[0].deck[0],before=physical(s);
 attack(s,musha.uid);
 assert.ok(s.pendingEffects.some(x=>x.source===LUPIA&&x.player===0));
 assert.ok(!s.pendingEffects.some(x=>x.source===LUPIA&&x.player===1));
 s=restore(s);
 resolveAttackChoices(s,accept);
 assert.equal(zone(s,0,'shields').includes(top.uid),accept);
 if(accept)assert.ok(!s.players[0].shields.find(x=>x.uid===top.uid).faceUp);
 else assert.equal(s.players[0].deck[0].uid,top.uid);
 assert.deepEqual(physical(s),before);
});

test('Musha Bui does not match the original card name',()=>{
 const s=field();
 put(s,0,'battle',LUPIA);
 const bui=put(s,0,'battle',BUI),top=s.players[0].deck[0];
 attack(s,bui.uid);
 assert.ok(!s.pendingEffects.some(x=>x.source===LUPIA));
 resolveAttackChoices(s,false);
 assert.equal(s.players[0].deck[0].uid,top.uid);
});
