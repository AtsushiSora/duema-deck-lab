import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,cast} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const CORE='dm23-036',SKYLAB='dm23-032',YAP='dm23-047',GIL='dm23-013';
const PLAIN='dm01-108',GUARDIAN='dm02-038',HUMANOID='dm03-048',PUPPET='dm06-092';
const DRAGON='dm36-087',DRAGON_TWIN='dmex06-024',DRAKE='dm23-051';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const find=(s,p,z,x)=>s.players[p][z].find(y=>y.uid===x.uid);
const values=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const pick=(s,x)=>act(s,'extended',a=>values(s)[a.choice]===x.uid);
const legal=(s,kind)=>e.getLegalActions(s).filter(a=>a.kind===kind);
const recover=(s,x)=>act(s,'replaceLGate955',a=>a.uid===x.uid);

function field(active=0){
 const s=setup();
 s.active=active;
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

function end(s){
 s.phase='attack';
 act(s,'endTurn');
}

test('Phase 956 verifies four complete names and retains Skylabs first-print ID',()=>{
 const m=read('tools/support-phase-956.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(c=>c.id),[CORE,SKYLAB,YAP,GIL]);
 assert.deepEqual(m.printAliases.map(r=>[r.id,r.canonicalId]),[['dmx09-035',SKYLAB]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,f=row.faces[0],card=e.card(id),canonical=m.cards.find(c=>c.id===id);
  const d={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(d,{phase:956}),canonical.spec);
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'不明な能力。'}]},{phase:956}));
  for(const [key,value] of Object.entries(canonical.spec))assert.deepEqual(card[key],value);
  assert.deepEqual([card.type,card.cost,card.power,card.race,e.civilizations(card),card.manaValue,card.limit],
   ['creature',f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  assert.equal(card.supportBatch,'phase-956');
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(refs.filter(r=>r.id===row.id).map(r=>[r.canonicalId,r.image]),[[id,row.image]]);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(r=>nameKey(r.name)===nameKey(row.name)).map(r=>r.id),[id]);
 }
});

test('Core Pulsar can attack a tapped creature and cannot attack the opposing player',()=>{
 const s=field(),core=put(s,0,'battle',CORE),target=put(s,1,'battle',PLAIN,{tapped:true});
 s.phase='attack';
 const attacks=legal(s,'attack').filter(a=>a.uid===core.uid);
 assert.deepEqual(attacks.map(a=>a.target),[target.uid]);
 attack(s,core.uid,target.uid);
 act(s,'noBlock');
 assert.ok(find(s,1,'grave',target)&&find(s,0,'battle',core));
});

test('Core Pulsar blocks a player attack and recovers a Guardian when it loses',()=>{
 let s=field(1);
 const core=put(s,0,'battle',CORE),attacker=put(s,1,'battle',DRAKE);
 const target=put(s,0,'grave',GUARDIAN),wrong=put(s,0,'grave',PLAIN);
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===core.uid);
 assert.deepEqual(legal(s,'replaceLGate955').map(a=>a.uid),[target.uid]);
 s=restore(s);
 recover(s,target);
 assert.equal(s.players[0].shields.length,5);
 assert.equal(s.players[0].deck.at(-1).uid,core.uid);
 assert.ok(find(s,0,'hand',target)&&find(s,0,'grave',wrong));
});

for(const accept of [true,false])test('Skylab attacks the turn it is summoned and destroys itself at its own end '+accept,()=>{
 let s=field();
 cast(s,SKYLAB);
 const source=s.players[0].battle.find(x=>x.cardId===SKYLAB),target=put(s,0,'grave',HUMANOID);
 assert.equal(source.entered,s.turn);
 attack(s,source.uid);
 act(s,'noBlock');
 assert.equal(s.players[1].shields.length,4);
 end(s);
 assert.equal(s.decision.uid,source.uid);
 s=restore(s);
 if(accept)recover(s,target);
 else act(s,'allowLeave');
 assert.ok(find(s,0,accept?'deck':'grave',source));
 assert.ok(find(s,0,accept?'hand':'grave',target));
 assert.equal(s.active,1);
});

test('Skylab survives the opponents end and self-destructs even without attacking',()=>{
 const s=field(1),source=put(s,0,'battle',SKYLAB);
 end(s);
 assert.equal(s.active,0);
 assert.ok(find(s,0,'battle',source));
 end(s);
 assert.ok(find(s,0,'grave',source));
 assert.equal(s.active,1);
});

for(const useGate of [true,false])test('Yappupp must choose itself when it enters alone '+useGate,()=>{
 const s=field(),target=put(s,0,'grave',PUPPET);
 cast(s,YAP);
 const source=s.players[0].battle.find(x=>x.cardId===YAP);
 assert.deepEqual(values(s),[source.uid]);
 pick(s,source);
 if(useGate)recover(s,target);
 else act(s,'allowLeave');
 assert.ok(find(s,0,useGate?'deck':'grave',source));
 assert.ok(find(s,0,useGate?'hand':'grave',target));
});

test('Yappupp can choose a different allied creature and keep its own L-Gate unused',()=>{
 const s=field(),ally=put(s,0,'battle',PLAIN),enemy=put(s,1,'battle',PLAIN),target=put(s,0,'grave',PUPPET);
 cast(s,YAP);
 const source=s.players[0].battle.find(x=>x.cardId===YAP);
 assert.deepEqual(values(s),[ally.uid,source.uid]);
 pick(s,ally);
 assert.equal(s.decision,null);
 assert.ok(find(s,0,'battle',source)&&find(s,0,'grave',ally)&&find(s,1,'battle',enemy));
 assert.ok(find(s,0,'grave',target));
});

test('Gilgamesh discards a chosen card, has a double breaker, and can recover a Dragon from a different tribe',()=>{
 let s=field();
 const target=put(s,0,'hand',DRAGON_TWIN),keep=put(s,0,'hand',PLAIN);
 const other=put(s,0,'grave',DRAGON),wrong=put(s,0,'grave',DRAKE);
 cast(s,GIL);
 const source=s.players[0].battle.find(x=>x.cardId===GIL);
 assert.deepEqual(values(s),[target.uid,keep.uid]);
 assert.equal(s.decision.player,0);
 pick(s,target);
 assert.ok(find(s,0,'grave',target)&&find(s,0,'hand',keep));
 assert.equal(e.effectiveCard(source,s).breaker,2);
 s.phase='main';
 s.extTasks=[{op:'g34_ExactMove',p:1,source:PLAIN,owner:0,target:source.uid,to:'grave'}];
 act(s,'toAttack');
 assert.deepEqual(legal(s,'replaceLGate955').map(a=>a.uid),[other.uid,target.uid]);
 s=restore(s);
 recover(s,target);
 assert.ok(find(s,0,'hand',target)&&find(s,0,'grave',other)&&find(s,0,'grave',wrong));
 assert.equal(s.players[0].deck.at(-1).uid,source.uid);
});

test('Gilgamesh remains in play with no other hand card to discard',()=>{
 const s=field();
 cast(s,GIL);
 assert.equal(s.decision,null);
 assert.equal(s.players[0].hand.length,0);
 assert.equal(s.players[0].battle.some(x=>x.cardId===GIL),true);
});
