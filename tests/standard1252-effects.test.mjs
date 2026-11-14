import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const KID='dmx21-033',Q='dmsd13-006',BIKE='promoy14-012';
const SMALL='dm01-108',SPRING='dm01-086',BLOCK='dm01-045',KING='dm04-001',ANGEL='dm01-001';
const SPARK='dm01-015',TWIN='dm25bd2-011',MIRACLE='dm24ex2-026',OTHER='dm25-007';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url)));
function field(active=0){
 const s=Object.assign(setup(),{active});
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(SMALL));
 return s;
}
function add(s,p,z,id,attrs={}){
 const x=Object.assign(inst(id),attrs);s.players[p][z].push(x);return x;
}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const values=s=>s.decision?.choices?.map(o=>o.value?.uid??o.value)??[];
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);
const play=(s,x,face=0)=>act(s,'play',a=>a.uid===x.uid&&(a.face||0)===face);
const mana=(s,p=0)=>s.players[p].mana.filter(x=>x.tapped).length;
function end(s){
 s.phase='attack';act(s,'endTurn');drain(s);
 if(s.phase==='charge')act(s,'skipCharge');
}
const canAttack=(s,x)=>e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid);
const canBlock=(s,x)=>e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===x.uid);

test('Six official prints match three preserved IDs, official art and the updated Alca Kid text',()=>{
 const m=read('tools/support-phase-1252.json'),refs=read('tools/image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[KID,Q,BIKE]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),['dm24ex2-064','dm25rp2-T05','dm25ex3-TF19'].map(id=>[id,KID]));
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1252}),row.spec);
  assert.deepEqual(cat.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],[f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===id)?.image,row.image);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
 }
 const kid=m.cards[0];
 assert.equal(e.card(KID).text,kid.currentPrint.faces[0].abilityText);
 assert.notEqual(e.card(KID).text,kid.faces[0].abilityText);
});

test('Alca Kid draws first and a matching self spell optionally summons an evolution onto a legal base without mana',()=>{
 for(const [id,face] of [[SPARK,0],[MIRACLE,0],[TWIN,1]]){
  const s=field(),kid=add(s,0,'hand',KID);
  play(s,kid);assert.equal(s.players[0].hand.length,1);
  const king=add(s,0,'hand',KING),nonEvo=add(s,0,'hand',ANGEL),wrong=add(s,0,'hand','dm32-072');
  const enemy=add(s,1,'battle',SMALL);
  play(s,add(s,0,'hand',id),face);
  assert.deepEqual(values(s),[king.uid,null],id);
  if(id===SPARK)assert.equal(enemy.tapped,true,'spell resolves before watcher');
  const paid=mana(s);
  pick(s,king.uid);pick(s,kid.uid);drain(s);
  assert.equal(mana(s),paid);assert.equal(e.card(king).id,KING);
  assert.ok(has(s,0,'battle',king)&&has(s,0,'hand',nonEvo)&&has(s,0,'hand',wrong));
  assert.equal(king.under[0].uid,kid.uid);
  assert.equal(s.metrics[0].played[KING],1);
 }
});

test('Alca Kid can decline and does not respond to an opponent, a different spell or the creature side of a twinpact',()=>{
 for(const scenario of ['decline','opponent','not same spell','creature side','no base']){
  const s=field(scenario==='opponent'?1:0),kid=add(s,0,'battle',KID),king=add(s,0,'hand',KING);
  if(scenario==='no base'){
   // The triggered ability remains pending after its source is removed.
   const spark=add(s,0,'hand',SPARK);
   add(s,0,'battle','dmrp05-s04');
   play(s,spark);assert.equal(s.decision?.type,'effectOrder');
   s.players[0].battle=s.players[0].battle.filter(x=>x!==kid);
   s.players[0].grave.push(kid);
   const royzer=s.pendingEffects.find(x=>x.source==='dmrp05-s04');
   act(s,'orderEffect',a=>a.effectId===royzer.effectId);
   pick(s,null);drain(s);
  }else{
   const id=scenario==='not same spell'?OTHER:scenario==='creature side'?TWIN:SPARK;
   play(s,add(s,s.active,'hand',id),0);
   if(scenario==='decline')pick(s,null);
   assert.notEqual(s.decision?.task?.op,'g34_Execute',scenario);
   drain(s);
  }
  assert.ok(has(s,0,'hand',king),scenario);
 }
});

test('Number Q prevents only existing same-cost opponents from attacking or blocking, without locking spells',()=>{
 const s=field(),own=add(s,0,'battle',SMALL),same=add(s,1,'battle',SMALL);
 const blocker=add(s,1,'battle',BLOCK),otherBlocker=add(s,1,'battle',ANGEL);
 const q=add(s,0,'hand',Q);play(s,q);pick(s,2);
 assert.equal(e.canCastSpell(s,1,e.card(SPRING)),true);
 s.phase='attack';assert.ok(canAttack(s,own));attack(s,own.uid);
 assert.equal(canBlock(s,blocker),false);assert.equal(canBlock(s,otherBlocker),true);
 act(s,'noBlock');drain(s);
 const late=add(s,1,'battle',SMALL);
 end(s);s.phase='attack';
 assert.equal(canAttack(s,same),false);assert.equal(canAttack(s,late),true);
 end(s);end(s);s.phase='attack';
 assert.equal(canAttack(s,same),true);
});

test('A previously locked creature can attack when its evolution changes cost (QA39641 analogy)',()=>{
 const s=field(),base=add(s,1,'battle',BLOCK);
 play(s,add(s,0,'hand',Q));pick(s,2);
 end(s);
 const evolved=add(s,1,'hand','dm32-072');
 play(s,evolved);
 act(s,'evolve',a=>a.baseUid===base.uid);
 drain(s);s.phase='attack';
 assert.ok(has(s,1,'battle',evolved));
 assert.equal(evolved.under[0].uid,base.uid);
 assert.ok(canAttack(s,evolved));
});

test('Bike removes all enemy blockers at two shields, including a protected blocker, and leaves others alone',()=>{
 for(const n of [0,2,3]){
  const s=field(),ally=add(s,0,'battle',BLOCK),plain=add(s,1,'battle',SMALL);
  const blockers=[add(s,1,'battle',BLOCK),add(s,1,'battle','dm23rp3-S02',{justDiverActive:true})];
  give(s,1,'shields',Array(n).fill(SMALL));
  const bike=add(s,0,'hand',BIKE);play(s,bike);drain(s);
  assert.ok(blockers.every(x=>has(s,1,n<=2?'grave':'battle',x)));
  assert.ok(has(s,0,'battle',ally)&&has(s,1,'battle',plain)&&has(s,0,'battle',bike));
  assert.equal(e.card(BIKE).breaker,2);
 }
});
