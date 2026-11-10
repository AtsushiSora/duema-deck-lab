import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,cast,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const DARKEN='dmrp14-075',TRAIN='dmrp17-087',PHANTOM='dmrp15-003';
const SMALL='dm01-108',WATER='dm01-083',DARK='dm01-090',BIG='dm05-s04',EX='dmrp18-s10';
const CHRISTINA='dmrp04s-034',LANCER='dm02-024',BOUNCE='dm01-086',UNTAP='dmrp05-058';
function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(16).fill(SMALL));
 return s;
}
function add(s,p,zone,id,props){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const choices=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>choices(s)[a.choice]===(value?.uid??value));
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const restore=s=>JSON.parse(JSON.stringify(s));
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}
function train(s,x){cast(s,TRAIN);pick(s,x);}
function sweep(s,p){
 s.extTasks=[{op:'g34_Sweep',p,source:PHANTOM,to:'grave',filter:{creature:true}}];
 act(s,'toAttack');
 drain(s);
}

test('Phase 885 verifies the complete official definitions, art, limits and unique catalogue IDs',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-885.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[DARKEN,TRAIN,PHANTOM]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const detail=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(detail.faces,row.faces);
  assert.deepEqual(standardCardSpec(detail,{phase:885}),row.spec);
  assert.throws(()=>standardCardSpec(detail,{phase:884}));
  const changed=structuredClone(detail);
  changed.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(changed,{phase:885}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.civilizations,c.power,c.race,c.manaValue,c.limit],
   [row.id===TRAIN?'spell':'creature',f.cost,f.civilizations,Number(f.powerText),f.race,1,4]);
  assert.ok(registry.get(row.id).supported);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);
 }
});

test('Kurayami needs a live friendly Darkness creature and is Fire itself',()=>{
 for(const mode of ['missing','opposing','sealed','friendly']){
  const s=field(),target=add(s,1,'battle',SMALL);
  if(mode==='opposing')add(s,1,'battle',DARK);
  if(mode==='sealed'||mode==='friendly'){
   const ally=add(s,0,'battle',DARK,{sealed:mode==='sealed'});
   if(mode==='sealed')add(s,0,'seals',SMALL,{sealOf:ally.uid,faceDown:true});
  }
  cast(s,DARKEN);
  if(mode==='friendly'){
   assert.deepEqual(choices(s),[target.uid]);
   pick(s,target);
  }
  assert.equal(has(s,1,'grave',target),mode==='friendly');
  assert.equal(s.decision,null);
 }
});

test('Kurayami reduces current power by 4000 until the active turn ends',()=>{
 const s=field(),target=add(s,1,'battle',BIG);
 add(s,0,'battle',DARK);
 cast(s,DARKEN);
 pick(s,target);
 assert.equal(e.power(target,false,s),11000);
 end(s);
 assert.equal(e.power(target,false,s),15000);
});

test('Kurayami is playable as a Shield Trigger and can destroy the attacker by zero power',()=>{
 const s=field(),attacker=add(s,1,'battle',SMALL);
 add(s,0,'battle',DARK);
 give(s,0,'mana',[]);
 give(s,0,'shields',[DARKEN]);
 const trigger=s.players[0].shields[0];
 s.active=1;
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.uid===trigger.uid);
 pick(s,attacker);
 assert.ok(has(s,0,'battle',trigger)&&has(s,1,'grave',attacker));
});

test('Training untaps only the selected creature on its first tap, through a saved continuation',()=>{
 let s=field();
 const target=add(s,0,'battle',SMALL),other=add(s,0,'battle',WATER);
 train(s,target);
 s=restore(s);
 attack(s,other.uid);
 drain(s);
 assert.ok(s.players[0].battle.find(x=>x.uid===other.uid).tapped);
 attack(s,target.uid);
 drain(s);
 assert.equal(s.players[0].battle.find(x=>x.uid===target.uid).tapped,false);
 attack(s,target.uid);
 drain(s);
 assert.equal(s.players[0].battle.find(x=>x.uid===target.uid).tapped,true);
});

test('Training does not act retroactively on a tap that happened before its resolution',()=>{
 const s=field(),target=add(s,0,'battle',SMALL);
 cast(s,CHRISTINA);
 pick(s,target);
 train(s,target);
 assert.equal(target.tapped,true);
 cast(s,UNTAP);
 pick(s,target);
 assert.equal(target.tapped,false);
 attack(s,target.uid);
 drain(s);
 assert.equal(target.tapped,false);
});

test('Training follows an evolution but expires at the end of the casting turn',()=>{
 const s=field(),base=add(s,0,'battle',WATER);
 train(s,base);
 const top=add(s,0,'hand',LANCER);
 act(s,'play',a=>a.uid===top.uid);
 act(s,'evolve',a=>a.baseUid===base.uid);
 attack(s,top.uid);
 drain(s);
 assert.equal(s.players[0].battle[0].tapped,false);

 const t=field(),target=add(t,0,'battle',SMALL);
 train(t,target);
 end(t);
 end(t);
 attack(t,target.uid);
 drain(t);
 assert.equal(target.tapped,true);
});

test('Training does not transfer to the same physical card after it leaves and reenters',()=>{
 const s=field(),target=add(s,0,'battle',SMALL);
 train(s,target);
 cast(s,BOUNCE);
 act(s,'effect',a=>a.targets.some(t=>t.uid===target.uid));
 act(s,'play',a=>a.uid===target.uid);
 cast(s,CHRISTINA);
 pick(s,target);
 assert.equal(target.tapped,true);
 assert.ok(has(s,0,'battle',target));
});

test('Training uses G Strike without casting and prevents another creature from attacking',()=>{
 const s=field(),attacker=add(s,1,'battle',SMALL),later=add(s,1,'battle',WATER);
 give(s,0,'shields',[TRAIN]);
 const shield=s.players[0].shields[0];
 s.active=1;
 attack(s,attacker.uid);
 act(s,'noBlock');
 assert.equal(s.decision.task.op,'gsDeclare');
 pick(s,true);
 pick(s,later);
 assert.ok(has(s,0,'hand',shield));
 assert.equal(later.tapped,false);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===later.uid));
 assert.ok(!s.extLimits?.some(x=>x.kind==='g885FirstTap'));
});

test('Phantom’s Moon requires two opponent-chosen discards for each card in one shield stack (QA 38756)',()=>{
 let s=field();
 add(s,0,'battle',PHANTOM);
 give(s,0,'shields',[SMALL]);
 const root=s.players[0].shields[0],under=inst(WATER);
 root.shieldStack=[under];
 const attacker=add(s,1,'battle',SMALL);
 give(s,1,'hand',[SMALL,WATER,DARK,EX,BIG]);
 const [keep,...discard]=s.players[1].hand;
 s.active=1;
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'orderEffect',a=>a.cardId===PHANTOM);
 s=restore(s);
 for(const card of discard){
  assert.equal(s.decision.player,1);
  pick(s,card);
 }
 assert.deepEqual(s.players[1].hand.map(x=>x.uid),[keep.uid]);
 assert.equal(s.players[1].grave.length,4);
 assert.ok(has(s,0,'hand',root)&&has(s,0,'hand',under));
});

test('Phantom discards as much as possible from its own lost shield, and ignores an enemy shield',()=>{
 const s=field();
 const phantom=add(s,0,'battle',PHANTOM);
 const hand=add(s,1,'hand',WATER);
 attack(s,phantom.uid);
 act(s,'noBlock');
 act(s,'breakShields',a=>a.shields.length===2);
 drain(s);
 assert.ok(has(s,1,'hand',hand));
 const t=field(),attacker=add(t,1,'battle',SMALL),only=add(t,1,'hand',WATER);
 add(t,0,'battle',PHANTOM);
 give(t,0,'shields',[SMALL]);
 t.active=1;
 attack(t,attacker.uid);
 act(t,'noBlock');
 pick(t,only);
 assert.ok(has(t,1,'grave',only));
 assert.equal(t.players[1].hand.length,0);
});

test('Phantom can block, and reacts to EX Life only if it survives the simultaneous move (QA 46566)',()=>{
 const s=field(),phantom=add(s,0,'battle',PHANTOM),attacker=add(s,1,'battle',SMALL);
 s.active=1;
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===phantom.uid);
 drain(s);
 assert.ok(phantom.tapped&&has(s,1,'grave',attacker));

 const survivor=field(),enemyHand=add(survivor,1,'hand',WATER);
 add(survivor,0,'battle',PHANTOM);
 cast(survivor,EX);
 drain(survivor);
 const ex=survivor.players[0].battle.find(x=>x.cardId===EX);
 survivor.active=1;
 cast(survivor,'dm01-027');
 act(survivor,'effect',a=>a.targets.some(t=>t.uid===ex.uid));
 pick(survivor,enemyHand);
 assert.ok(has(survivor,1,'grave',enemyHand));

 for(const reverse of [false,true]){
  const t=field();
  if(!reverse)add(t,0,'battle',PHANTOM);
  cast(t,EX);
  drain(t);
  if(reverse)add(t,0,'battle',PHANTOM);
  const hand=add(t,1,'hand',WATER);
  sweep(t,1);
  assert.ok(has(t,1,'hand',hand));
  assert.equal(t.players[0].shields.length,5);
  assert.deepEqual(t.players[0].battle.map(x=>x.cardId),[EX]);
 }
});
