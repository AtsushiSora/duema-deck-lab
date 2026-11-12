import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const KENJI='dm25rp1-009',MARDAN='dm25rp1-S03',TOAMI='dmrp11-040';
const WATER='dm01-083',FIRE='dm01-097',GREEN='dm01-108';
const JOKER='dmsd01-012';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
const ids=(s,p,zone)=>s.players[p][zone].map(x=>x.uid);
const values=s=>(s.decision?.choices??[]).map(x=>x.value?.uid??x.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const restore=s=>decodeBattleData(encodeBattleData(s));

function field(){
 const s=setup();
 for(const p of [0,1]){
  give(s,p,'deck',Array(12).fill(GREEN));
  give(s,p,'grave',[]);
 }
 return s;
}
function add(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
function end(s){
 s.phase='attack';
 act(s,'endTurn');
}
function finishAttack(s){
 if(s.decision?.type==='block')act(s,'noBlock');
 drain(s);
}

test('Three official cards and four reprints preserve card IDs, art and deck limits',()=>{
 const m=read('tools/support-phase-1071.json'),cat=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(r=>r.id),[KENJI,MARDAN,TOAMI]);
 assert.deepEqual(m.printAliases.map(r=>[r.id,r.canonicalId]),[
  ['dm25ex3-rp1009',KENJI],['dm25rp1-Sec04',MARDAN],['dm25ex3-rp1S03',MARDAN],['dm25ex3-rp1Sec04',MARDAN]
 ]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.ok(row.verification.facesMatched&&cat.get(row.id).supported);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1071}),m.cards.find(r=>r.id===id).spec);
  assert.deepEqual([c.type,c.cost,c.race,c.power,c.civ,c.manaValue,c.limit],
   ['creature',f.cost,f.race,Number(f.powerText),f.civilizationText,1,4]);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(cat.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(refs.filter(r=>r.id===row.id).map(r=>[r.canonicalId,r.image]),[[id,row.image]]);
  if(row.id===id)assert.equal(CARD_IMAGES[id],row.image);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[id]);
 }
});

test('Kenji only discounts an eligible NEO summon and can attack a fresh untapped creature with Mach Fighter',()=>{
 for(const evolved of [false,true]){
  const s=field(),base=add(s,0,'battle',FIRE),wrong=add(s,0,'battle',WATER),kenji=add(s,0,'hand',KENJI);
  const enemy=add(s,1,'battle','dm01-s01',{entered:s.turn});
  give(s,0,'mana',Array(evolved?4:6).fill(GREEN));
  act(s,'play',a=>a.uid===kenji.uid&&a.cost===4);
  const bases=e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid);
  assert.deepEqual(new Set(bases),new Set(evolved?[base.uid]:[base.uid,undefined]));
  assert.ok(!bases.includes(wrong.uid));
  act(s,'evolve',a=>a.baseUid===(evolved?base.uid:undefined));
  assert.equal(s.players[0].mana.filter(x=>x.tapped).length,evolved?4:6);
  assert.equal(e.isEvolution(kenji),evolved);
  s.phase='attack';
  assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===kenji.uid&&a.target===enemy.uid));
  assert.equal(e.card(KENJI).breaker,2);
 }
});

test('Tapped Kenji can replace a battle participant, including a battle initiated by an effect',()=>{
 for(const effectBattle of [false,true]){
  let s=field();
  const kenji=add(s,0,'battle',KENJI,{tapped:true}),ally=add(s,0,'battle',GREEN);
  const enemy=add(s,1,'battle','dm01-s01',{tapped:true}),all=physical(s);
  if(effectBattle){
   s.extTasks=[{op:'g34_Fight240',p:0,source:'dmrp19-011'}];
   act(s,'toAttack');
   pick(s,ally.uid);
   pick(s,enemy.uid);
  }else{
   attack(s,ally.uid,enemy.uid);
   act(s,'noBlock');
  }
  assert.equal(s.decision.task.op,'g393SG_Battle');
  assert.deepEqual(values(s),[kenji.uid,null]);
  s=restore(s);
  pick(s,kenji.uid);
  drain(s);
  assert.ok(ids(s,0,'battle').includes(ally.uid));
  assert.ok(s.players[0].battle.find(x=>x.uid===kenji.uid).tapped);
  assert.ok(ids(s,1,'grave').includes(enemy.uid));
  assert.deepEqual(physical(s),all);
 }
});

test('Kenji can decline the replacement, leaving the original combatants',()=>{
 const s=field(),kenji=add(s,0,'battle',KENJI),ally=add(s,0,'battle',GREEN);
 const enemy=add(s,1,'battle','dm01-s01',{tapped:true});
 attack(s,ally.uid,enemy.uid);
 act(s,'noBlock');
 pick(s,null);
 drain(s);
 assert.ok(ids(s,0,'grave').includes(ally.uid));
 assert.ok(ids(s,1,'battle').includes(enemy.uid));
 assert.equal(kenji.tapped,false);
});

function mardan(s,evolved){
 const base=add(s,0,'battle',WATER),source=add(s,0,'hand',MARDAN);
 act(s,'play',a=>a.uid===source.uid);
 act(s,'evolve',a=>a.baseUid===(evolved?base.uid:undefined));
 assert.equal(e.card(source).blocker,true);
 assert.equal(e.card(source).breaker,2);
 return source;
}
function firstEntry(s,bottom){
 assert.equal(s.decision.type,'effectOrder');
 const entry=s.pendingEffects.find(r=>r.source===MARDAN&&(bottom?r.effect==='extended':r.effect==='entry'));
 act(s,'orderEffect',a=>a.effectId===entry.effectId);
}

test('Mardan keeps both entry triggers independent and lets the opponent order cards sent to their deck',()=>{
 let s=field();
 const a=add(s,1,'battle',WATER),b=add(s,1,'battle',FIRE);
 const ordinary=add(s,1,'battle',TOAMI);
 const evolution=add(s,1,'battle',TOAMI,{under:[inst(JOKER)]});
 const seed=add(s,1,'battle','dm25rp4-013');
 const source=mardan(s,true),all=physical(s);
 assert.ok(e.isEvolution(source)&&e.isEvolution(evolution));
 firstEntry(s,true);
 assert.equal(s.decision.task.op,'g78_BottomOrder');
 assert.equal(s.decision.player,1);
 assert.deepEqual(new Set(values(s)),new Set([a.uid,b.uid,ordinary.uid]));
 s=restore(s);
 pick(s,b.uid);
 pick(s,a.uid);
 drain(s);
 assert.deepEqual(ids(s,1,'deck').slice(-3),[b.uid,a.uid,ordinary.uid]);
 assert.deepEqual(ids(s,1,'battle'),[evolution.uid,seed.uid]);
 assert.deepEqual(physical(s),all);
});

test('Mardan destroys only opposing non-evolutions in ordinary form or when destruction resolves first',()=>{
 for(const evolved of [false,true]){
  const s=field(),ally=add(s,0,'battle',WATER),a=add(s,1,'battle',WATER),b=add(s,1,'battle',KENJI);
  const evolution=add(s,1,'battle',TOAMI,{under:[inst(JOKER)]});
  mardan(s,evolved);
  firstEntry(s,evolved?false:true);
  drain(s);
  assert.deepEqual(new Set(ids(s,1,'grave')),new Set([a.uid,b.uid]));
  assert.deepEqual(ids(s,1,'battle'),[evolution.uid]);
  assert.ok(ids(s,0,'battle').includes(ally.uid));
 }
});

function toami(s){
 const base=add(s,0,'battle',JOKER),wrong=add(s,0,'battle',WATER),source=add(s,0,'hand',TOAMI);
 act(s,'play',a=>a.uid===source.uid);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='evolve'&&a.baseUid===wrong.uid));
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.ok(e.isEvolution(source));
 return source;
}
const attackActions=s=>e.getLegalActions(s).filter(a=>a.kind==='attack');

test('Toami can return only another allied Joker and counts one attack for the whole opposing turn',()=>{
 let s=field();
 const source=toami(s),ally=add(s,0,'battle',JOKER);
 add(s,1,'battle',JOKER);
 const a=add(s,1,'battle',WATER),b=add(s,1,'battle',GREEN);
 attack(s,source.uid);
 assert.deepEqual(values(s),[ally.uid,null]);
 pick(s,ally.uid);
 assert.ok(ids(s,0,'hand').includes(ally.uid));
 finishAttack(s);
 end(s);
 assert.equal(s.active,1);
 s=restore(s);
 attack(s,a.uid);
 finishAttack(s);
 assert.ok(!attackActions(s).some(a=>a.uid===b.uid));
 end(s);
 assert.ok(!s.extLimits.some(l=>l.kind==='g627AttackCap'));
 end(s);
 s.phase='attack';
 assert.ok(attackActions(s).some(a=>a.uid===b.uid));
});

test('Toami can decline and an extra turn consumes the immediately following turn',()=>{
 for(const extra of [false,true]){
  const s=field(),source=toami(s),ally=add(s,0,'battle',JOKER);
  const a=add(s,1,'battle',WATER),b=add(s,1,'battle',GREEN);
  if(extra)s.extraTurns=[{player:0,source:'dmex17-016'}];
  attack(s,source.uid);
  pick(s,extra?ally.uid:null);
  finishAttack(s);
  assert.equal(ids(s,0,'hand').includes(ally.uid),extra);
  end(s);
  if(extra){assert.equal(s.active,0);end(s);}
  assert.equal(s.active,1);
  attack(s,a.uid);
  finishAttack(s);
  assert.ok(attackActions(s).some(a=>a.uid===b.uid));
 }
});

test('Toami imposes its attack limit even when Ultra Saver replaces the move',()=>{
 const s=field(),source=toami(s),ally=add(s,0,'battle',JOKER),saver=add(s,0,'battle','dmrp04s-085');
 attack(s,source.uid);
 pick(s,ally.uid);
 act(s,'replaceUltra',a=>a.uid===saver.uid);
 finishAttack(s);
 assert.ok(ids(s,0,'battle').includes(ally.uid));
 assert.ok(ids(s,0,'grave').includes(saver.uid));
 assert.ok(s.extLimits.some(l=>l.kind==='g627AttackCap'&&l.turn===s.turn+1));
});
