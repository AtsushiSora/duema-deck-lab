import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const PAKU='dmx11-018',GAN='dmrp07-034',BAHAM='promoy2-014',REPRINT='promoy3-034';
const NATURE='dm01-108',WATER='dm01-083',DRAGONOID='dm01-095',ARMORED='dm10-006';
const BLOCKER='dm01-076',SAVER='dmex14-101',HAND='dm01-027';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url)));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const restore=s=>JSON.parse(JSON.stringify(s));

function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(12).fill(NATURE));
 return s;
}
function add(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
function pick(s,value){
 act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===value);
}
function finishAttack(s){
 if(s.decision?.type==='block')act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields');
 drain(s);
}
function effectBreak(s,source,who='opponent'){
 s.extTasks=[{op:'g34_Sequence',p:0,source:source.cardId,uid:source.uid,incarnation:source.incarnation||0,
  defs:[{op:'Break497',n:1,owner:who,g747CreatureBreak:true}]}];
 act(s,'toAttack');
 const p=who==='self'?0:1;
 const metrics=s.metrics[0].breaks;
 while(s.decision?.task?.op==='g34_Break497'){
  const choice=s.decision.choices[0].value;
  pick(s,choice?.uid??choice);
 }
 assert.equal(s.decision,null);
 return {p,count:s.metrics[0].breaks-metrics};
}

test('Three canonical cards and the Baham reprint match official definitions, images and limits',()=>{
 const m=read('tools/support-phase-1075.json'),cat=createCatalogue(snapshot,data.cards,details);
 const art=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(c=>c.id),[PAKU,GAN,BAHAM]);
 for(const row of m.cards){
  const c=e.card(row.id),f=row.faces[0];
  assert.ok(row.verification.facesMatched&&cat.get(row.id).supported);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1075}),row.spec);
  assert.deepEqual([c.cost,c.race,c.power,c.civ,c.manaValue,c.limit],[f.cost,f.race,+f.powerText,f.civilizationText,1,4]);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[row.id]);
 }
 const row=m.cards.at(-1),[print]=m.printAliases;
 assert.ok(row.currentPrint.useRulesText&&row.currentPrint.verification.facesMatched&&print.verification.facesMatched);
 assert.notEqual(row.faces[0].abilityText,print.faces[0].abilityText);
 assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:1075}),row.spec);
 assert.deepEqual(cat.resolveRows([{id:REPRINT,count:1},{id:BAHAM,count:1}]),[{id:BAHAM,count:2}]);
 assert.deepEqual(art.filter(r=>r.id===REPRINT).map(r=>[r.canonicalId,r.image]),[[BAHAM,print.image]]);
});

test('Pakurupan adds only one face-down shield after breaking twice, including after save and restore',()=>{
 let s=field();
 const source=add(s,0,'battle',PAKU),top=s.players[0].deck[0].uid,before=physical(s);
 source.g34Grants=[{turn:s.turn,breaker:2}];
 attack(s,source.uid);
 finishAttack(s);
 assert.equal(s.metrics[0].breaks,2);
 assert.equal(s.players[0].shields.length,5);
 s=restore(s);
 act(s,'endTurn');
 drain(s);
 assert.equal(s.players[0].shields.length,6);
 assert.equal(s.players[0].shields.at(-1).uid,top);
 assert.ok(!s.players[0].shields.at(-1).faceUp);
 assert.deepEqual(physical(s),before);
});

test('Pakurupan distinguishes the breaker and must survive until its own turn ends',()=>{
 for(const mode of ['ally','ignored','destroyed','new incarnation']){
  const s=field(),source=add(s,0,'battle',PAKU);
  const attacker=mode==='ally'?add(s,0,'battle',NATURE):source;
  if(mode==='destroyed')give(s,1,'shields',[HAND]);
  attack(s,attacker.uid);
  if(s.decision?.type==='block')act(s,'noBlock');
  if(mode==='destroyed'){
   act(s,'useTrigger');
   act(s,'effect',a=>a.targets[0].uid===source.uid);
   assert.ok(s.players[0].grave.some(x=>x.uid===source.uid));
  }else{
   if(mode==='ignored')source.g35Ignored=s.turn;
   if(mode==='new incarnation')source.incarnation=(source.incarnation||0)+1;
  }
  act(s,'endTurn');
  drain(s);
  assert.equal(s.players[0].shields.length,5,mode);
 }
});

test('Pakurupan also recognizes an effect break on its controller’s own shield',()=>{
 const s=field(),source=add(s,0,'battle',PAKU);
 const before=s.players[0].shields.length;
 assert.deepEqual(effectBreak(s,source,'self'),{p:0,count:1});
 assert.equal(s.players[0].shields.length,before-1);
 act(s,'endTurn');
 drain(s);
 assert.equal(s.players[0].shields.length,before);
});

test('Ganpachi can enter unevolved or on a Water creature and grants the chosen ally unblockability for the turn',()=>{
 for(const evolved of [false,true]){
  const s=field(),source=add(s,0,'hand',GAN),base=add(s,0,'battle',WATER);
  const ally=add(s,0,'battle',NATURE),blocker=add(s,1,'battle',BLOCKER);
  act(s,'play',a=>a.uid===source.uid);
  assert.equal(s.decision.type,'evolution');
  assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve'&&a.baseUid).map(a=>a.baseUid),[base.uid]);
  act(s,'evolve',a=>evolved?a.baseUid===base.uid:!a.baseUid);
  assert.equal(e.isEvolution(source),evolved);
  pick(s,ally.uid);
  assert.equal(e.effectiveCard(ally,s).unblockable,true);
  assert.ok(!e.effectiveCard(source,s).unblockable);
  attack(s,ally.uid);
  assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===blocker.uid));
  finishAttack(s);
  act(s,'endTurn');
  drain(s);
  assert.ok(!e.effectiveCard(ally,s).unblockable);
 }
});

test('Ganpachi draws exactly twice for its attack’s actual break and has no carryover to a later blocked attack',()=>{
 const s=field(),source=add(s,0,'battle',GAN),blocker=add(s,1,'battle',BLOCKER);
 source.g34Grants=[{turn:s.turn,breaker:2}];
 const before=s.players[0].deck.length;
 attack(s,source.uid);
 finishAttack(s);
 assert.equal(s.players[0].hand.length,2);
 assert.equal(s.players[0].deck.length,before-2);
 source.tapped=false;
 attack(s,source.uid);
 act(s,'block',a=>a.uid===blocker.uid);
 drain(s);
 assert.equal(s.metrics[0].breaks,2);
 assert.equal(s.players[0].hand.length,2);
});

test('Ganpachi does not draw when its attack’s only shield is saved or a break is replaced by milling the shield',()=>{
 for(const mode of ['saver','burn']){
  let s=field();
  const source=add(s,0,'battle',GAN);
  if(mode==='saver')add(s,1,'battle',SAVER);
  else source.g34Grants=[{turn:s.turn,shieldBurn:true}];
  attack(s,source.uid);
  if(s.decision?.type==='block')act(s,'noBlock');
  if(mode==='saver'){
   assert.equal(s.decision.type,'shieldGuard');
   s=restore(s);
   act(s,'saveShield');
  }
  drain(s);
  assert.equal(s.metrics[0].breaks,0,mode);
  assert.equal(s.players[0].hand.length,0,mode);
 }
});

test('Baham evolves from an Armored Dragon and adds one break for each own visible Dragonoid',()=>{
 const s=field(),source=add(s,0,'hand',BAHAM),base=add(s,0,'battle',ARMORED);
 const sealed=add(s,0,'battle',DRAGONOID);
 sealed.sealed=1;
 Object.assign(add(s,0,'seals',NATURE),{faceDown:true,sealOf:sealed.uid});
 add(s,1,'battle',DRAGONOID);
 act(s,'play',a=>a.uid===source.uid);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[base.uid]);
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.equal(e.effectiveCard(source,s).extraBreak??0,0);
 add(s,0,'battle',DRAGONOID);
 add(s,0,'battle',DRAGONOID);
 assert.equal(e.effectiveCard(source,s).extraBreak,2);
 attack(s,source.uid);
 finishAttack(s);
 assert.equal(s.metrics[0].breaks,3);
});

test('Baham’s latest printed additional break also applies to an effect break',()=>{
 const s=field(),source=add(s,0,'battle',BAHAM);
 source.under=[inst(ARMORED)];
 add(s,0,'battle',DRAGONOID);
 assert.deepEqual(effectBreak(s,source),{p:1,count:2});
 assert.equal(s.players[1].shields.length,3);
});
