import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const ACADEMY='dmr07-002',GAN='dmd19-003',PRINT='dmx20-011',TIGER='dmd03-004';
const SMALL='dm01-108',DARK='dm01-027',DRAW='dm06-085',TWIN='dm23bd7-003',CHARGER='dm23ex2-098';
const HUNTER='dmd05-003',MIGHTY='dm18-135',LOCK='dmrp08-014',BLUE='dm22-002';
const get=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
function field(active=0){
 const s=Object.assign(setup(),{active});
 for(const p of [0,1])give(s,p,'deck',Array(25).fill(SMALL));
 return s;
}
function add(s,p,z,id,attrs={}){const x=Object.assign(inst(id),attrs);s.players[p][z].push(x);return x;}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const values=s=>s.decision?.choices?.map(o=>o.value?.uid??o.value)??[];
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const paid=(s,p)=>s.players[p].mana.filter(x=>x.tapped).length;
function play(s,id,face=0){
 const x=add(s,s.active,'hand',id);act(s,'play',a=>a.uid===x.uid&&(a.face||0)===face);return x;
}
function direct(s,id,p=0,origin='hand'){
 const x=add(s,p,origin,id);
 s.extTasks=[{op:'g34_Put',p,source:ACADEMY,origin,target:x.uid}];
 act(s,'toAttack');return x;
}
function order(s,source){
 const entry=s.decision.type==='entryOrder',q=entry?s.triggers.entries:s.pendingEffects;
 const r=q.find(x=>x.source===source);
 assert.ok(r);act(s,entry?'orderEntry':'orderEffect',a=>a.effectId===r.effectId);
}

test('The three cards match official faces and Ganaldonal’s reprint resolves to the original ID',()=>{
 const m=get('tools/support-phase-1245.json'),refs=get('tools/image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(r=>r.id),[ACADEMY,GAN,TIGER]);
 assert.deepEqual(m.printAliases.map(r=>[r.id,r.canonicalId]),[[PRINT,GAN]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1245}),row.spec);
  assert.deepEqual(cat.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit,c.breaker],[f.cost,Number(f.powerText),f.race,f.civilizations,1,4,2]);
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===id)?.image,row.image);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
 }
 assert.deepEqual(cat.resolveRows([{id:PRINT,count:1},{id:GAN,count:3}]),[{id:GAN,count:4}]);
});

test('Academy waits for the hand spell to resolve, then optionally casts the same copy without paying',()=>{
 const s=field(),old=add(s,0,'grave',DRAW);
 add(s,0,'battle',ACADEMY);
 const x=play(s,DRAW),mana=paid(s,0);
 assert.equal(s.players[0].hand.length,2);
 assert.deepEqual(values(s),[true,null]);assert.equal(s.decision.task.target,x.uid);
 assert.ok(has(s,0,'grave',x)&&has(s,0,'grave',old));
 const serial=x.zoneSerial;
 pick(s,true);drain(s);
 assert.equal(s.players[0].hand.length,4);
 assert.equal(paid(s,0),mana);
 assert.ok(has(s,0,'grave',x)&&has(s,0,'grave',old));
 assert.equal(x.zoneSerial,serial);assert.equal(s.metrics[0].played[DRAW],2);
});

test('Two Academy copies can each recast the same spell that returns to the same grave zone',()=>{
 const s=field();
 add(s,0,'battle',ACADEMY);add(s,0,'battle',ACADEMY);
 const x=play(s,DRAW);
 if(s.decision.type==='effectOrder')order(s,ACADEMY);
 assert.equal(s.decision.task.target,x.uid);
 pick(s,true);
 if(s.decision?.type==='effectOrder')order(s,ACADEMY);
 assert.equal(s.decision.task.target,x.uid);
 pick(s,true);drain(s);
 assert.equal(s.metrics[0].played[DRAW],3);
 assert.equal(s.players[0].hand.length,6);
});

test('Academy skips a spell that never reaches the grave, an opponent spell, and a deck cast',()=>{
 for(const mode of ['charger','lockedGrave','opponent','deck','decline']){
  const s=field(mode==='opponent'?1:0),academy=add(s,0,'battle',ACADEMY);
  if(mode==='lockedGrave')add(s,1,'battle',LOCK);
  if(mode==='deck'){
   give(s,0,'deck',[DRAW,SMALL,SMALL,SMALL,SMALL,SMALL]);
   const top=s.players[0].deck[0];
   attack(s,add(s,0,'battle',BLUE).uid);pick(s,top.uid);
   assert.notEqual(s.decision?.task?.op,'g34_RecastHandSpell1245');
   drain(s);assert.equal(s.metrics[0].played[DRAW],1);
  }else{
   const charger=mode==='charger',x=play(s,charger?CHARGER:DRAW,charger?1:0);
   if(charger)pick(s,academy.uid);
   if(mode==='decline')pick(s,null);
   assert.notEqual(s.decision?.task?.op,'g34_RecastHandSpell1245',mode);
   drain(s);assert.ok(has(s,s.active,charger?'mana':'grave',x),mode);
  }
 }
});

test('Academy can recast the spell side of a twinpact originally cast as a shield trigger',()=>{
 const s=field(1);add(s,0,'battle',ACADEMY);
 give(s,0,'shields',[TWIN]);const twin=s.players[0].shields[0];
 attack(s,add(s,1,'battle',SMALL).uid);act(s,'noBlock');act(s,'useTrigger',a=>a.cardId===TWIN&&a.face===1);
 pick(s,null);
 assert.equal(s.decision.task.target,twin.uid);assert.equal(s.decision.task.face,1);
 pick(s,true);pick(s,null);drain(s);
 assert.ok(has(s,0,'grave',twin));
 assert.equal(s.metrics[0].played[TWIN],2);assert.equal(s.metrics[0].triggers,1);
});

test('Ganaldonal destroys only tapped creatures on both sides without choosing targets',()=>{
 const s=field(),own=add(s,0,'battle',SMALL,{tapped:true}),ready=add(s,0,'battle',SMALL);
 const enemy=add(s,1,'battle',SMALL,{tapped:true,justDiverActive:true});
 const stayed=add(s,1,'battle',SMALL),seed=add(s,1,'battle','dmsd20-016',{tapped:true});
 const gan=play(s,GAN);drain(s);
 assert.ok(has(s,0,'grave',own)&&has(s,1,'grave',enemy));
 assert.ok(has(s,0,'battle',ready)&&has(s,1,'battle',stayed)&&has(s,0,'battle',gan));
 assert.ok(has(s,1,'battle',seed));
});

test('Ganaldonal can sweep itself if it enters tapped and honors a destruction replacement',()=>{
 const s=field(),m=add(s,0,'battle',MIGHTY,{tapped:true});
 add(s,1,'battle','dm24bd6-006');
 const x=play(s,GAN);drain(s);
 assert.ok(has(s,0,'grave',x)&&has(s,0,'mana',m)&&!has(s,0,'grave',m));
});

test('Takeru’s other allied Hunter entry optionally returns one face-up Hunter from mana',()=>{
 for(const [mode,where] of [['summon','hand'],['direct','grave'],['self','hand'],['nonHunter','hand'],['opponent','hand'],['decline','hand']]){
  const s=field(mode==='opponent'?1:0),hit=add(s,0,'mana',HUNTER);
  add(s,0,'mana',HUNTER,{faceDown:true});add(s,0,'mana',SMALL);
  if(mode!=='self')add(s,0,'battle',TIGER);
  if(mode==='direct')direct(s,HUNTER,0,where);
  else play(s,mode==='nonHunter'?SMALL:mode==='self'?TIGER:HUNTER);
  if(['summon','direct','decline'].includes(mode)){
   assert.deepEqual(values(s),[hit.uid,null],mode);
   pick(s,mode==='decline'?null:hit.uid);
  }
  assert.equal(s.decision,null,mode);assert.equal(has(s,0,'hand',hit),['summon','direct'].includes(mode),mode);
 }
});
