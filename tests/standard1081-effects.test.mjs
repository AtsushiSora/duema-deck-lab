import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot,GEN} from './target-fixture.mjs';

const BREMO='dm23-005',GEKI='dm24-003',METSU='dm24-004';
const GOAT='dm25-011',TAUROS='dm25-018',HEAVY='dmex17-033',METAL='dmex17-059';
const NATURE='dm01-108',FIRE='dm01-095',WATER='dm01-083',BLOCKER='dm01-076';
const DREAM='dm34-052',OTHER_DREAM='dm32-108',BAZOOKA='dm14-022',LARGE='dm01-s04';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url)));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const choices=s=>s.decision.choices.map(c=>c.value?.uid??c.value);

function field(){
 const s=setup();
 for(const p of [0,1]){
  give(s,p,'deck',Array(12).fill(NATURE));
  give(s,p,'grave',[]);
 }
 return s;
}
function pick(s,value){
 act(s,'extended',a=>choices(s)[a.choice]===value);
}
function noBlock(s){
 if(s.decision?.type==='block')act(s,'noBlock');
}
function link(s,root,id){
 const second=inst(id);
 s.players[0].hand.push(second);
 act(s,'play',a=>a.uid===second.uid);
 assert.equal(s.decision.task.op,'g31_Link');
 assert.deepEqual(choices(s),[root.uid,null]);
 pick(s,root.uid);
 assert.equal(root.godLinks[0].uid,second.uid);
 return second;
}
function finishBreak(s,n){
 assert.equal(s.decision?.type,'breakChoice');
 act(s,'breakShields',a=>a.shields.length===n);
 drain(s);
}
function declareBremo(s,bremo){
 assert.equal(s.decision.task.op,'g34_BioKDeclare951');
 pick(s,bremo.uid);
 if(s.decision?.task?.op==='g34_BioKDeclare951')pick(s,null);
}
test('Seven official prints resolve to three existing canonical IDs',()=>{
 const manifest=read('tools/support-phase-1081.json'),cat=createCatalogue(snapshot,data.cards,details);
 const images=read('tools/image-reference-prints.json').prints;
 const ids=[BREMO,GEKI,METSU];
 assert.deepEqual(manifest.cards.map(c=>c.id),ids);
 assert.deepEqual(manifest.printAliases.map(c=>c.id),['dmc44-015','dmc66-030','dmc44-018','dmc66-031']);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0],main=manifest.cards.find(c=>c.id===id);
  assert.ok(row.verification.facesMatched&&cat.get(id).supported);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1081}),main.spec);
  assert.deepEqual([c.type,c.cost,c.race,c.power,c.civ,c.manaValue,c.limit],
   ['creature',f.cost,f.race,+f.powerText,f.civilizationText,1,4]);
  assert.equal(manifest.regulationVerification.limits[row.id],4);
  assert.deepEqual(cat.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(images.filter(r=>r.id===row.id).map(r=>[r.canonicalId,r.image]),[[id,row.image]]);
  if(row.id===id)assert.equal(CARD_IMAGES[id],row.image);
 }
 for(const id of ids)assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(e.card(id).name)).map(c=>c.id),[id]);
});

test('Geki and Metsu link in either order, gaining Q Breaker and retaining both triggered effects',()=>{
 for(const [first,second] of [[GEKI,METSU],[METSU,GEKI]]){
  const s=field(),[root,,tauros]=give(s,0,'battle',[first,GOAT,TAUROS,HEAVY,METAL]);
  const [blocker,eligible,tooBig]=give(s,1,'battle',[BLOCKER,FIRE,LARGE]);
  const [manaA,manaB,manaC]=give(s,1,'mana',[NATURE,FIRE,WATER]);
  assert.equal(e.effectiveCard(root,s).breaker,2);
  const other=link(s,root,second);
  s.players[0].hand.push(s.players[0].battle.splice(s.players[0].battle.indexOf(tauros),1)[0]);
  const all=physical(s);
  assert.equal(e.effectiveCard(root,s).breaker,4);
  assert.equal(e.power(root,false,s),14000);
  assert.ok(!e.effectiveCard(root,s).g31GodHeavy);
  assert.deepEqual(new Set(e.effectiveCard(root,s).race.split('/')),new Set(['ゴッド','ドラゴン・ゾンビ','アーマード・ドラゴン']));
  attack(s,root.uid);
  assert.equal(s.decision.task.source,METSU);
  assert.deepEqual(choices(s),[manaA.uid,manaB.uid,manaC.uid,null]);
  pick(s,manaA.uid);
  pick(s,manaC.uid);
  assert.deepEqual(s.players[1].grave.map(x=>x.uid),[manaA.uid,manaC.uid]);
  assert.deepEqual(s.players[1].mana.map(x=>x.uid),[manaB.uid]);
  noBlock(s);
  assert.equal(s.decision.task.source,METSU);
  assert.deepEqual(choices(s),[blocker.uid,eligible.uid,null]);
  pick(s,eligible.uid);
  finishBreak(s,4);
  assert.ok(has(s,1,'grave',eligible)&&has(s,1,'battle',tooBig));
  assert.equal(s.metrics[0].breaks,4);
  assert.equal(root.godLinks[0].uid,other.uid);
  assert.deepEqual(physical(s),all);
 }
});

test('Geki forces all discards after a block even when the host is Metsu',()=>{
 for(const rootId of [GEKI,METSU]){
  const s=field(),[root]=give(s,0,'battle',[rootId]);
  const [blocker]=give(s,1,'battle',[BLOCKER]);
  const hand=[...give(s,1,'hand',[WATER,FIRE,NATURE])],all=physical(s);
  if(rootId===METSU)link(s,root,GEKI);
  attack(s,root.uid);
  if(rootId===METSU){
   assert.equal(s.decision.task.source,METSU);
   pick(s,null);
  }
  act(s,'block',a=>a.uid===blocker.uid);
  drain(s);
  assert.ok(hand.every(x=>has(s,1,'grave',x)));
  assert.equal(s.players[1].hand.length,0);
  assert.equal(s.metrics[0].breaks,0);
  assert.ok(has(s,1,'grave',blocker));
  if(rootId===GEKI)assert.deepEqual(physical(s),all);
 }
});

test('Unlinked Metsu has only the optional unblocked player-attack effect',()=>{
 for(const mode of ['decline','blocked','creature']){
  const s=field(),[metsu]=give(s,0,'battle',[METSU]);
  const [blocker,eligible,target]=give(s,1,'battle',[BLOCKER,FIRE,NATURE]);
  target.tapped=true;
  const mana=s.players[1].mana.length;
  attack(s,metsu.uid,mode==='creature'?target.uid:'player');
  if(mode==='blocked')act(s,'block',a=>a.uid===blocker.uid);
  else noBlock(s);
  if(mode==='decline'){
   assert.equal(s.decision.task.source,METSU);
   assert.ok(choices(s).includes(eligible.uid));
   pick(s,null);
   finishBreak(s,2);
  }else drain(s);
  assert.ok(has(s,1,'battle',eligible));
  assert.equal(s.players[1].mana.length,mana);
  assert.equal(s.metrics[0].breaks,mode==='decline'?2:0);
 }
});

test('A God with its link ability ignored cannot be selected as the partner',()=>{
 const s=field(),[heavy]=give(s,0,'battle',[HEAVY]);
 give(s,1,'battle',[GEN]);
 const [metal]=give(s,0,'hand',[METAL]);
 act(s,'play',a=>a.uid===metal.uid);
 assert.equal(s.decision.task.op,'g31_Metal');
 pick(s,null);
 assert.ok(has(s,0,'battle',metal));
 assert.ok(!heavy.godLinks);
});

test('Bremo inspects the full deck privately, takes one matching creature, reveals it and shuffles before shields',()=>{
 let s=field();
 const [dream]=give(s,0,'battle',[DREAM]),[bremo]=give(s,0,'hand',[BREMO]);
 const [hidden,match,other,copy]=give(s,0,'deck',[OTHER_DREAM,DREAM,NATURE,DREAM]);
 const all=physical(s),seed=s.rng;
 attack(s,dream.uid);
 noBlock(s);
 declareBremo(s,bremo);
 pick(s,true);
 assert.ok(has(s,0,'grave',bremo));
 assert.equal(s.decision.task.op,'g34_LookPick');
 assert.deepEqual(choices(s),[match.uid,copy.uid]);
 assert.deepEqual(s.decision.task.g585Peek.map(x=>x.id),[OTHER_DREAM,DREAM,NATURE,DREAM]);
 assert.ok(!JSON.stringify(e.observation(s,1)).includes(OTHER_DREAM));
 assert.equal(s.players[1].shields.length,5);
 s=JSON.parse(JSON.stringify(s));
 pick(s,copy.uid);
 drain(s);
 assert.ok(has(s,0,'hand',copy)&&has(s,0,'deck',hidden)&&has(s,0,'deck',other)&&has(s,0,'deck',match));
 assert.ok(s.log.some(x=>x.type==='reveal'&&x.cardId===DREAM));
 assert.ok(!s.log.some(x=>x.type==='reveal'&&x.cardId===OTHER_DREAM));
 assert.notEqual(s.rng,seed);
 assert.equal(s.players[1].shields.length,4);
 assert.deepEqual(physical(s),all);
});

test('Bremo can decline and still shuffles after a paid search with no matching name',()=>{
 for(const use of [true,false]){
  const s=field(),[dream]=give(s,0,'battle',[DREAM]),[bremo]=give(s,0,'hand',[BREMO]);
  const seed=s.rng;
  attack(s,dream.uid);
  noBlock(s);
  declareBremo(s,bremo);
  pick(s,use?true:null);
  if(use){
   assert.equal(s.decision.task.op,'g34_LookPick');
   assert.deepEqual(choices(s),[null]);
   pick(s,null);
  }
  drain(s);
  assert.equal(has(s,0,use?'grave':'hand',bremo),true);
  assert.equal(s.rng!==seed,use);
  assert.equal(s.players[0].deck.length,12);
  assert.equal(s.players[1].shields.length,4);
 }
});

test('Bremo uses the departing attacker’s last name when another effect returns it before resolution',()=>{
 const s=field(),[dream,gear]=give(s,0,'battle',[DREAM,BAZOOKA]);
 const [bremo]=give(s,0,'hand',[BREMO]),[match]=give(s,0,'deck',[DREAM,NATURE,NATURE]);
 const all=physical(s);
 act(s,'crossGear',a=>a.uid===gear.uid&&a.target===dream.uid);
 attack(s,dream.uid);
 noBlock(s);
 declareBremo(s,bremo);
 act(s,'orderEffect',a=>a.cardId===BAZOOKA);
 pick(s,dream.uid);
 assert.ok(has(s,0,'hand',dream));
 assert.equal(s.decision.task.source,BREMO);
 pick(s,true);
 assert.deepEqual(choices(s),[match.uid]);
 pick(s,match.uid);
 drain(s);
 assert.ok(has(s,0,'hand',match));
 assert.equal(s.players[1].shields.length,5);
 assert.deepEqual(physical(s),all);
});
