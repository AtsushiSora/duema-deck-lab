import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const SHIELD='dm25rp2-064',COASTER='dm25rp2-066',BONE='dm25rp2-052',TELES='dm25rp2-016';
const SUZAKU='dm22ex1-008',ORDER='dmex12-035',COMMAND='dmr17-081';
const FIRE='dm01-097',NATURE='dm01-108',WATER='dm01-083',DEMON='dm01-027',BLOCKER='dm01-076';
const add=(s,p,zone,id,props={})=>{
 const x={...inst(id),...props};
 s.players[p][zone].push(x);
 return x;
};
const play=(s,p,id)=>{
 const x=add(s,p,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
};
const pick=(s,value)=>act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===value);
const inZone=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
function playRemoval(s,uid){
 play(s,0,DEMON);
 act(s,'effect',a=>a.targets.some(x=>x.uid===uid));
}

test('the three canonical cards and the Coaster reprint match official data',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-1126.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(manifest.cards.map(c=>c.id),[SHIELD,COASTER,BONE]);
 assert.equal(manifest.printAliases.length,1);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id;
  const detail={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(detail,{phase:1126}),row.spec);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[id]);
  assert.equal(registry.get(row.id).id,id);
  assert.ok(registry.get(row.id).supported);
  assert.equal(e.card(id).limit,4);
  if(!row.canonicalId){
   assert.deepEqual(details.cards.find(c=>c.id===id).faces,row.faces);
   assert.equal(CARD_IMAGES[id],row.image);
  }
  const changed=structuredClone(detail);
  changed.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(changed,{phase:1126}));
 }
});

test('the Shield can attach to an unstacked NEO entrant and is optional for each copy',()=>{
 const s=setup(),yes=add(s,0,'grave',SHIELD),no=add(s,0,'grave',SHIELD),enemy=add(s,1,'grave',SHIELD);
 const neo=play(s,0,TELES);
 if(s.decision?.type==='evolve')act(s,'evolve',a=>!a.baseUid);
 for(let n=0;n<15&&s.decision;n++){
  if(s.decision.task?.op==='g34_GraveBase1126')pick(s,s.decision.task.uid===yes.uid?true:null);
  else e.step(s,e.chooseAI(s));
 }
 assert.deepEqual(neo.under?.map(x=>x.uid),[yes.uid]);
 assert.ok(e.isEvolution(neo));
 assert.ok(inZone(s,0,'grave',no)&&inZone(s,1,'grave',enemy));
});

test('the Shield ignores a normal creature entering and can block from the battlefield',()=>{
 const s=setup(),grave=add(s,0,'grave',SHIELD),attacker=play(s,0,NATURE);
 assert.equal(s.decision,null);
 assert.ok(inZone(s,0,'grave',grave));
 attacker.entered=0;
 const blocker=add(s,1,'battle',SHIELD);
 attack(s,attacker.uid);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===blocker.uid));
});

test('Coaster attacks, draws one and destroys itself at the end of the attack',()=>{
 const s=setup(),x=add(s,0,'battle',COASTER);
 attack(s,x.uid);
 drain(s);
 assert.equal(s.players[0].hand.length,1);
 assert.ok(inZone(s,0,'grave',x));
 assert.equal(s.players[1].shields.length,4);
});

test('two inherited Coaster abilities draw once each from the same stack, including last known size',()=>{
 const s=setup(),layer=inst(COASTER),nested=inst(COASTER),faceDown={...inst(COASTER),faceDown:true};
 layer.under=[nested];
 const host=add(s,0,'battle',NATURE,{under:[layer,faceDown]});
 attack(s,host.uid);
 drain(s);
 assert.equal(s.players[0].hand.length,8);
 assert.ok(inZone(s,0,'grave',host)&&inZone(s,0,'grave',nested));
});

test('Coaster never triggers when the attacker is destroyed in the battle before attack end',()=>{
 const s=setup(),x=add(s,0,'battle',COASTER),blocker=add(s,1,'battle',BLOCKER);
 attack(s,x.uid);
 act(s,'block',a=>a.uid===blocker.uid);
 drain(s);
 assert.ok(inZone(s,0,'grave',x));
 assert.equal(s.players[0].hand.length,0);
});

test('Bone Amigo can NEO evolve and charges one chosen grave card tapped',()=>{
 const s=setup(),base=add(s,0,'battle',FIRE),grave=add(s,0,'grave',WATER);
 const bone=play(s,0,BONE);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='evolve'&&!a.baseUid));
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.equal(s.decision.source,BONE);
 pick(s,grave.uid);
 assert.ok(inZone(s,0,'mana',grave)&&grave.tapped);
 assert.deepEqual(bone.under.map(x=>x.uid),[base.uid]);
});

test('Bone Amigo triggers seven times for an allied Suzaku stack (QA 46843)',()=>{
 const s=setup(),owner=1;
 add(s,owner,'battle',BONE);
 const stack=add(s,owner,'battle',SUZAKU,{under:Array.from({length:6},()=>inst(FIRE))});
 playRemoval(s,stack.uid);
 for(let i=0;i<7;i++){
  if(s.decision?.type==='effectOrder')act(s,'orderEffect',a=>a.cardId===BONE);
  assert.equal(s.decision?.source,BONE);
  const value=s.decision.choices.find(c=>c.value)?.value;
  pick(s,value.uid??value);
 }
 assert.equal(s.players[owner].grave.length,0);
 assert.equal(s.players[owner].mana.filter(x=>x.tapped).length,7);
});

test('Bone Amigo triggers when Teles discards its evolution base by Meteorburn (QA 46844)',()=>{
 const s=setup(),base=inst(FIRE),host=add(s,0,'battle',TELES,{under:[base]});
 add(s,0,'battle',BONE);
 attack(s,host.uid);
 assert.equal(s.decision.task.op,'g31_Meteor');
 pick(s,base.uid);
 assert.equal(s.decision.source,BONE);
 pick(s,base.uid);
 assert.ok(inZone(s,0,'mana',base)&&base.tapped);
 drain(s);
});

test('Bone Amigo only observes an allied seal if it was active before removal (QA 46845–46846)',()=>{
 for(const sealBone of [true,false]){
  const s=setup(),bone=add(s,0,'battle',BONE),other=add(s,0,'battle',FIRE);
  const host=sealBone?bone:other;
  s.active=1;
  play(s,1,ORDER);
  assert.equal(s.decision.source,ORDER);
  pick(s,host.uid);
  assert.ok(host.sealed);
  const seal=s.players[0].seals.find(x=>x.sealOf===host.uid);
  s.active=0;
  play(s,0,COMMAND);
  assert.equal(s.decision?.task?.op,'g23_Unseal');
  pick(s,seal.uid);
  assert.equal(s.decision?.source===BONE,!sealBone);
  if(!sealBone)pick(s,seal.uid);
  assert.ok(inZone(s,0,sealBone?'grave':'mana',seal));
 }
});

test('Bone Amigo only sees itself when destroyed with other creatures (rule 603.5d)',()=>{
 const s=setup(),bone=add(s,0,'battle',BONE),base=inst(FIRE);
 bone.under=[base];
 for(const p of [0,1])for(let i=0;i<3;i++)add(s,p,'battle',NATURE);
 play(s,0,'dm14-015');
 assert.equal(s.decision?.source,BONE);
 pick(s,base.uid);
 assert.equal(s.decision,null);
 assert.ok(inZone(s,0,'grave',bone)&&inZone(s,0,'mana',base));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,7);
});

test('Bone Amigo ignores non-grave departures and grave arrivals from the hand',()=>{
 const s=setup(),watcher=add(s,1,'battle',BONE),ally=add(s,1,'battle',NATURE);
 play(s,0,'dm01-086');
 if(s.decision?.type==='effect')act(s,'effect',a=>a.targets.some(x=>x.uid===ally.uid));
 else pick(s,ally.uid);
 assert.ok(inZone(s,1,'hand',ally));
 assert.equal(s.decision,null);
 play(s,0,'dm01-094');
 drain(s);
 assert.ok(inZone(s,1,'grave',ally)&&inZone(s,1,'battle',watcher));
 assert.equal(s.players[1].mana.filter(x=>x.tapped).length,0);
});
