import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const FEX='dm25rp2-056',GEAR='dm25rp2-060',HORSE='dm25rp2-065',RAVEN='dm25rp2-071',ON5='dm25rp2-075';
const NATURE='dm01-108',WATER='dm01-083',FIRE='dm01-097',TEL='dm25rp2-016',GENMU='dmrp15-km1';
const DEMON='dm01-027',FIELD='dm25ex2-067';
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);
const inZone=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);

function add(s,p,zone,id,props={}){
 const x={...inst(id),...props};
 s.players[p][zone].push(x);
 return x;
}
function play(s,p,id){
 const x=add(s,p,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}
function run(s,op,defs,p=0){
 s.extTasks=[{op:'g34_'+op,p,source:NATURE,...defs}];
 s.phase='main';
 act(s,'toAttack');
}
function move(s,p,x,to='grave'){
 run(s,'ExactMove',{owner:p,to,target:x.uid,targetIncarnation:x.incarnation||0},s.active);
}
function acceptShield(s){
 assert.equal(s.decision?.source,FEX);
 pick(s,true);
 drain(s);
}

test('all five canonical cards match the complete official definitions, images and limits',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-1122.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.equal(manifest.cards.length,5);
 for(const row of manifest.cards){
  const detail=details.cards.find(d=>d.id===row.id);
  assert.deepEqual(detail.faces,row.faces);
  assert.deepEqual(standardCardSpec(detail,{phase:1122}),row.spec);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[row.id]);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(e.card(row.id).limit,manifest.regulationVerification.limits[row.id]);
  assert.ok(registry.get(row.id).supported);
  const changed=structuredClone(detail);
  changed.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(changed,{phase:1122}));
 }
});

test('Fex can use the grave ability after Genmu ignored it on the battlefield (QA 46838)',()=>{
 const s=setup();
 add(s,0,'battle',GENMU);
 const fex=add(s,1,'battle',FEX),top=s.players[1].deck[0];
 assert.equal(!!e.effectiveCard(fex,s).blocker,false);
 play(s,0,DEMON);
 act(s,'effect',a=>a.targets.some(x=>x.uid===fex.uid));
 assert.ok(inZone(s,1,'grave',fex));
 assert.equal(s.decision.player,1);
 acceptShield(s);
 assert.ok(inZone(s,1,'shields',top));
});

test('Fex offers its shield when a whole evolution stack goes to grave (QA 46839)',()=>{
 const s=setup(),base=inst(FEX),host=add(s,1,'battle',TEL,{under:[base]}),top=s.players[1].deck[0];
 play(s,0,DEMON);
 act(s,'effect',a=>a.targets.some(x=>x.uid===host.uid));
 assert.ok(inZone(s,1,'grave',base)&&inZone(s,1,'grave',host));
 act(s,'orderEffect',a=>a.uid===base.uid);
 acceptShield(s);
 assert.ok(inZone(s,1,'shields',top));
});

test('Fex triggers after Teles pays Meteorburn from its evolution layer (QA 46840)',()=>{
 const s=setup(),base=inst(FEX),host=add(s,0,'battle',TEL,{under:[base]}),top=s.players[0].deck[0];
 s.phase='attack';
 act(s,'attack',a=>a.uid===host.uid&&a.target==='player');
 assert.equal(s.decision.task.op,'g31_Meteor');
 pick(s,base.uid);
 assert.ok(inZone(s,0,'grave',base));
 acceptShield(s);
 assert.ok(inZone(s,0,'shields',top)&&inZone(s,0,'battle',host));
});

test('Fex triggers after a seal is removed by summoning a Command (QA 46841)',()=>{
 const s=setup(),host=add(s,0,'battle',FIRE,{sealed:true});
 const seal=add(s,0,'seals',FEX,{faceDown:true,sealOf:host.uid}),top=s.players[0].deck[0];
 play(s,0,'dmr17-081');
 assert.equal(s.decision?.task?.op,'g23_Unseal');
 pick(s,seal.uid);
 assert.ok(!host.sealed&&inZone(s,0,'grave',seal));
 acceptShield(s);
 assert.ok(inZone(s,0,'shields',top));
});

test('Fex ignores grave arrivals from deck, hand, mana and shields, and its shield is optional',()=>{
 for(const origin of ['deck','hand','mana','shields','battle']){
  const s=setup(),top=s.players[0].deck[0],before=s.players[0].shields.length;
  let x;
  if(origin==='deck'){
   x=inst(FEX);
   s.players[0].deck.unshift(x);
   run(s,'Mill',{n:1});
  }else if(origin==='battle'){
   x=add(s,0,'battle',FEX);
   move(s,0,x);
   assert.equal(s.decision.source,FEX);
   pick(s,null);
  }else{
   x=add(s,0,origin,FEX);
   run(s,'Select',{origin,to:'grave',n:1});
   pick(s,x.uid);
  }
  assert.ok(inZone(s,0,'grave',x),origin);
  assert.equal(s.decision,null,origin);
  assert.equal(s.players[0].shields.length,before,origin);
  assert.ok(!inZone(s,0,'shields',top),origin);
 }
});

test('both blockers can block and Gear can return an opponent’s creature to its owner',()=>{
 for(const id of [FEX,GEAR]){
  const s=setup(),blocker=add(s,1,'battle',id),attacker=add(s,0,'battle','dm01-007',{cardOwner:1});
  s.phase='attack';
  act(s,'attack',a=>a.uid===attacker.uid&&a.target==='player');
  act(s,'block',a=>a.uid===blocker.uid);
  assert.ok(inZone(s,1,'grave',blocker));
  if(id===FEX)acceptShield(s);
  else{
   assert.deepEqual(values(s),[attacker.uid,null]);
   pick(s,attacker.uid);
   assert.ok(inZone(s,1,'hand',attacker)&&!inZone(s,0,'battle',attacker));
  }
 }
});

test('Horse makes a blind hand choice, and Raven destroys only a target at current power 4000 or less',()=>{
 const s=setup();
 const first=add(s,1,'hand',NATURE),second=add(s,1,'hand',WATER);
 move(s,0,add(s,0,'battle',HORSE));
 assert.deepEqual(values(s),[0,1]);
 assert.ok(s.decision.choices.every(x=>!x.cardId));
 pick(s,1);
 assert.ok(inZone(s,1,'hand',first)&&inZone(s,1,'grave',second));

 const edge=add(s,1,'battle',WATER,{powerModifiers:[{amount:3000}]}),
  high=add(s,1,'battle',WATER,{powerModifiers:[{amount:3100}]});
 move(s,0,add(s,0,'battle',RAVEN));
 assert.deepEqual(values(s),[edge.uid]);
 const restored=JSON.parse(JSON.stringify(s));
 pick(restored,edge.uid);
 assert.ok(inZone(restored,1,'grave',edge)&&inZone(restored,1,'battle',high));
});

test('Horse and Raven can declare G Strike from a shield',()=>{
 for(const id of [HORSE,RAVEN]){
  const s=setup(),attacker=add(s,1,'battle',NATURE),later=add(s,1,'battle',WATER);
  s.active=1;
  s.phase='attack';
  give(s,0,'shields',[id]);
  act(s,'attack',a=>a.uid===attacker.uid&&a.target==='player');
  act(s,'noBlock');
  assert.equal(s.decision.task.op,'gsDeclare');
  pick(s,true);
  pick(s,later.uid);
  drain(s);
  assert.ok(e.attackLocked(s,1,later));
  assert.equal(later.tapped,false);
  assert.equal(s.players[0].hand[0].cardId,id);
 }
});

test('ON5 has Guardman and can optionally put an eligible element in its owner’s mana',()=>{
 const s=setup(),guard=add(s,1,'battle',ON5),ally=add(s,1,'battle',WATER,{tapped:true});
 const attacker=add(s,0,'battle','dm01-007'),field=add(s,0,'battle',FIELD,{cardOwner:1});
 s.phase='attack';
 act(s,'attack',a=>a.uid===attacker.uid&&a.target===ally.uid);
 act(s,'guardman',a=>a.uid===guard.uid);
 assert.ok(inZone(s,1,'grave',guard)&&inZone(s,1,'battle',ally));
 assert.deepEqual(values(s),[field.uid,null]);
 pick(s,field.uid);
 assert.ok(inZone(s,1,'mana',field)&&!inZone(s,0,'battle',field));
});

test('a redirect away from the grave does not consume or leave a stale trigger',()=>{
 const s=setup(),fex=add(s,0,'battle',FEX);
 move(s,0,fex,'mana');
 assert.ok(inZone(s,0,'mana',fex));
 assert.equal(s.decision,null);
 run(s,'Select',{origin:'mana',to:'grave',n:1});
 pick(s,fex.uid);
 assert.ok(inZone(s,0,'grave',fex));
 assert.equal(s.decision,null);
});

test('Teles’s replacement can send the evolution layer to mana without triggering Fex',()=>{
 const s=setup(),base=inst(FEX),host=add(s,0,'battle',TEL,{under:[base]});
 const strato=add(s,1,'battle','dm22rp2-048');
 s.phase='attack';
 act(s,'attack',a=>a.uid===host.uid&&a.target==='player');
 pick(s,base.uid);
 assert.equal(s.decision.task.op,'g31_Meteor825Dest');
 pick(s,strato.uid);
 drain(s);
 assert.ok(inZone(s,0,'mana',base)&&!inZone(s,0,'grave',base));
 assert.equal(s.players[0].shields.length,5);
});

test('a face-down layer put into the grave by Frozen Carnival still has its grave ability',()=>{
 const s=setup(),base={...inst(FEX),faceDown:true};
 const host=add(s,1,'battle',TEL,{under:[base]}),top=s.players[1].deck[0];
 play(s,0,'dmex12-020');
 assert.ok(inZone(s,1,'battle',host)&&inZone(s,1,'grave',base));
 acceptShield(s);
 assert.ok(inZone(s,1,'shields',top));
});
