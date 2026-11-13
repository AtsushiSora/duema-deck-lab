import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const PURE='dm25rp2-031',DAN='dm25rp2-026',BAL='dm25rp2-027';
const NATURE='dm01-108',FIRE='dm01-097',TATE='dm25rp2-049';
const add=(s,p,zone,id,props={})=>{
 const x={...inst(id),...props};
 s.players[p][zone].push(x);
 return x;
};
const values=s=>s.decision?.choices?.map(c=>c.value?.uid??c.value)??[];
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const inZone=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const play=(s,id)=>{
 const x=add(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
};
function evolve(s,base){
 if(s.decision?.type==='evolution')act(s,'evolve',a=>(a.baseUid||null)===(base?.uid??null));
}

test('four official prints resolve to their canonical cards, with complete text and usage limits',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-1130.json',import.meta.url)));
 const images=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(manifest.cards.map(c=>c.id),[PURE,DAN,BAL]);
 assert.equal(manifest.printAliases.length,1);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,detail={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(detail,{phase:1130}),row.spec);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[id]);
  assert.equal(registry.get(row.id).id,id);
  assert.equal(registry.get(row.id).supported,true);
  assert.equal(e.card(id).limit,manifest.regulationVerification.limits[row.id]);
  assert.ok(images.prints.some(p=>p.id===row.id&&p.canonicalId===id&&p.image===row.image));
  if(!row.canonicalId){
   assert.deepEqual(details.cards.find(c=>c.id===id).faces,row.faces);
   assert.equal(CARD_IMAGES[id],row.image);
  }
  detail.faces=detail.faces.map(f=>({...f,abilityText:f.abilityText+'\n未知の能力'}));
  assert.throws(()=>standardCardSpec(detail,{phase:1130}));
 }
});

for(const mode of ['printed','inherited','two layers','one target'])test('PURE1 applies opponent-selected tap and the next untap step: '+mode,()=>{
 const s=setup(), inherited=mode==='inherited'||mode==='two layers';
 const x=add(s,0,'battle',inherited?BAL:PURE,{
  under:[inst(inherited?PURE:NATURE),...(mode==='two layers'?[]:[{...inst(FIRE),faceDown:true}])]
 });
 const defender=add(s,1,'battle',TATE,{tapped:true});
 const targets=Array.from({length:mode==='one target'?1:3},()=>add(s,1,'battle',NATURE));
 s.phase='attack';
 assert.equal(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target==='player'),inherited);
 assert.equal(!!e.effectiveCard(x,s).blocker,!inherited);
 attack(s,x.uid,defender.uid);
 if(s.decision?.type==='effectOrder')act(s,'orderEffect',a=>s.pendingEffects.find(q=>q.effectId===a.effectId)?.source===PURE);
 if(mode==='two layers')assert.notEqual(s.decision?.source,PURE);
 else{
  assert.equal(s.decision.source,PURE);
  assert.equal(s.decision.player,1);
  assert.deepEqual(values(s),targets.map(y=>y.uid));
  pick(s,targets[0].uid);
  if(targets.length>1){
   assert.equal(targets[0].tapped,false);
   assert.deepEqual(values(s),targets.slice(1).map(y=>y.uid));
   pick(s,targets[1].uid);
  }
 }
 drain(s);
 if(mode==='two layers')assert.ok(targets.every(y=>!y.tapped));
 else{
  assert.ok(targets[0].tapped&&e.skipsStartUntap(s,targets[0]));
  if(targets[1])assert.ok(targets[1].tapped&&e.skipsStartUntap(s,targets[1])&&!targets[2].tapped);
  act(s,'endTurn');
  drain(s);
  assert.equal(s.active,1);
  assert.ok(targets[0].tapped&&!e.skipsStartUntap(s,targets[0]));
  if(targets[1])assert.ok(targets[1].tapped&&!targets[2].tapped);
 }
});

for(const mode of ['draw','minus','both','evolved single'])test('Danmadann resolves its available entry modes: '+mode,()=>{
 const s=setup(),base=add(s,0,'battle',FIRE);
 const target=add(s,1,'battle',TATE),before=e.power(target,false,s);
 const grave=add(s,0,'grave',NATURE);
 give(s,0,'deck',Array(6).fill(NATURE));
 const top=s.players[0].deck.slice(0,3);
 const evolved=mode==='both'||mode==='evolved single';
 play(s,DAN);
 evolve(s,evolved?base:null);
 assert.deepEqual(values(s),evolved?[0,1,2]:[0,1]);
 pick(s,mode==='both'?2:mode==='minus'||mode==='evolved single'?1:0);
 if(mode==='draw'||mode==='both'){
  assert.equal(s.decision.task.op,'discardSelect');
  pick(s,top[0].uid);
  pick(s,top[1].uid);
  assert.deepEqual(s.players[0].grave.map(x=>x.uid),[grave.uid,top[0].uid,top[1].uid]);
  assert.ok(inZone(s,0,'hand',top[2]));
 }
 if(mode!=='draw'){
  pick(s,target.uid);
  assert.equal(e.power(target,false,s),before-(mode==='both'?3000:1000));
 }else assert.equal(e.power(target,false,s),before);
});

test('Danmadann may evolve via S-Trigger and select both effects',()=>{
 const s=setup(),attacker=add(s,0,'battle',NATURE),base=add(s,1,'battle',FIRE,{tapped:true});
 give(s,1,'shields',[DAN,NATURE,NATURE,NATURE,NATURE]);
 const shield=s.players[1].shields[0];
 attack(s,attacker.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 act(s,'useTrigger',a=>a.uid===shield.uid);
 act(s,'triggerEvolve',a=>a.baseUid===base.uid);
 assert.deepEqual(values(s),[0,1,2]);
 pick(s,2);
 drain(s);
 assert.ok(inZone(s,1,'battle',shield)&&s.players[1].grave.length>=2);
});

for(const mode of ['accept','decline','evolved victim','bounce','grave lock'])test('Bal only stacks the destroyed creature itself from the grave: '+mode,()=>{
 const s=setup();s.active=1;
 const host=add(s,0,'battle',BAL),material=inst(FIRE);
 const victim=add(s,0,'battle',TATE,{under:mode==='evolved victim'?[material]:[]});
 if(mode==='grave lock')add(s,1,'battle','dmrp22-042');
 play(s,mode==='bounce'?'dm01-086':'dm01-027');
 act(s,'effect',a=>a.targets?.some(x=>x.uid===victim.uid));
 if(['accept','decline','evolved victim'].includes(mode)){
  assert.equal(s.decision.task.op,'g34_StackDestroyed1130');
  pick(s,mode==='decline'?null:true);
 }
 drain(s);
 if(mode==='accept'||mode==='evolved victim'){
  assert.deepEqual(host.under.map(x=>x.uid),[victim.uid]);
  assert.ok(e.isEvolution(host));
  if(mode==='evolved victim')assert.ok(inZone(s,0,'grave',material));
 }else{
  assert.ok(!host.under?.length);
  assert.ok(inZone(s,0,mode==='bounce'?'hand':'grave',victim));
 }
});

for(const mode of ['pay','decline','replaced'])test('Bal Meteorburn is optional and does not treat a detached base as destruction: '+mode,()=>{
 const s=setup(),material=inst(FIRE),host=add(s,0,'battle',BAL,{under:[material]});
 const enemy=add(s,1,'battle',NATURE);
 if(mode==='replaced')add(s,1,'battle',data.cards.find(c=>c.g47Strato).id);
 attack(s,host.uid);
 assert.equal(s.decision.task.op,'g31_Meteor');
 pick(s,mode==='decline'?null:material.uid);
 if(mode!=='decline'){
  if(mode==='replaced')pick(s,values(s).find(Boolean));
  assert.equal(s.decision.task.op,'g34_FightEnemy240');
  pick(s,enemy.uid);
  assert.ok(inZone(s,1,'grave',enemy));
  assert.ok(inZone(s,0,mode==='replaced'?'mana':'grave',material));
  assert.ok(!host.under.length);
 }else assert.ok(host.under.includes(material)&&inZone(s,1,'battle',enemy));
 drain(s);
});

test('Removing a creature-card seal never triggers Bal (QA46849)',()=>{
 const s=setup(),host=add(s,0,'battle',FIRE,{sealed:true});
 const seal=add(s,0,'seals',NATURE,{faceDown:true,sealOf:host.uid});
 s.format='advance';
 const bal=play(s,BAL);
 evolve(s,null);
 drain(s);
 assert.ok(inZone(s,0,'grave',seal));
 assert.ok(!bal.under?.length);
});
