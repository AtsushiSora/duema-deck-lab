import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot,GG} from './target-fixture.mjs';

const MANTIS='promoy2-023',MISDIRECTION='dmr06-001',ORGIAS='promoy6-022';
const NATURE='dm01-108',INSECT='dm01-066',BOOSTED='dm01-095',DEMON='dm01-s06';
const BLOCKER='dm01-076',DARK='dm01-090',MIXED='dmrp13-090',ANGEL='dm01-s01';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url)));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();

function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(12).fill(NATURE));
 return s;
}
function add(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
function choose(s,value){
 act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===value);
}
function noBlock(s){
 if(s.decision?.type==='block')act(s,'noBlock');
}
function finishAttack(s,count){
 noBlock(s);
 if(s.decision?.type==='breakChoice')act(s,'breakShields',a=>a.shields.length===count);
 drain(s);
}

test('The three battle IDs and their reprints match the six verified official definitions',()=>{
 const manifest=read('tools/support-phase-1076.json'),cat=createCatalogue(snapshot,data.cards,details);
 const images=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(manifest.cards.map(c=>c.id),[MANTIS,MISDIRECTION,ORGIAS]);
 assert.deepEqual(manifest.printAliases.map(c=>c.id),['promoy3-035','dmex08-068','promoy6-024']);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id, card=e.card(id), f=row.faces[0];
  assert.ok(row.verification.facesMatched&&cat.get(id).supported);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1076}),manifest.cards.find(c=>c.id===id).spec);
  assert.deepEqual([card.type,card.cost,card.race,card.power,card.civ,card.breaker,card.limit],
   ['creature',f.cost,f.race,+f.powerText,f.civilizationText,2,4]);
  assert.equal(manifest.regulationVerification.limits[row.id],4);
  assert.deepEqual(cat.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(images.filter(r=>r.id===row.id).map(r=>[r.canonicalId,r.image]),[[id,row.image]]);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[id]);
  if(row.id===id)assert.equal(CARD_IMAGES[id],row.image);
 }
});

test('Mantis evolves on a Giant Insect and uses the attacking power at the no-block window',()=>{
 const s=field(),source=add(s,0,'hand',MANTIS),base=add(s,0,'battle',INSECT);
 const ally=add(s,0,'battle',BOOSTED),all=physical(s);
 act(s,'play',a=>a.uid===source.uid);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[base.uid]);
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.equal(e.power(ally,false,s),3000);
 attack(s,ally.uid);
 assert.equal(e.power(ally,true,s),5000);
 finishAttack(s,2);
 assert.equal(s.metrics[0].breaks,2);
 assert.equal(e.effectiveCard(ally,s).extraBreak??0,0);
 assert.deepEqual(physical(s),all);
});

test('Mantis skips a weaker, blocked, or creature-targeted attacker and its own attack',()=>{
 for(const mode of ['weaker','blocked','creature','self','ignored']){
  const s=field(),source=add(s,0,'battle',MANTIS,{under:[inst(INSECT)]});
  const ally=add(s,0,'battle',mode==='weaker'?NATURE:BOOSTED);
  const defender=add(s,1,'battle',BLOCKER,{tapped:mode==='creature'});
  if(mode==='ignored')source.g35Ignored=s.turn;
  attack(s,mode==='self'?source.uid:ally.uid,mode==='creature'?defender.uid:'player');
  if(mode==='blocked')act(s,'block',a=>a.uid===defender.uid);
  const count=mode==='blocked'||mode==='creature'?0:mode==='self'?2:1;
  finishAttack(s,count);
  assert.equal(s.metrics[0].breaks,count,mode);
 }
});

test('Both Mantis abilities are ordered separately and only add breaks to this attack after restore',()=>{
 let s=field();
 for(let i=0;i<2;i++)add(s,0,'battle',MANTIS,{under:[inst(INSECT)]});
 const attacker=add(s,0,'battle',DEMON),all=physical(s);
 attack(s,attacker.uid);
 noBlock(s);
 assert.equal(s.decision.type,'effectOrder');
 s=JSON.parse(JSON.stringify(s));
 act(s,'orderEffect',a=>a.cardId===MANTIS);
 finishAttack(s,4);
 assert.equal(s.metrics[0].breaks,4);
 assert.equal(e.effectiveCard(s.players[0].battle.find(x=>x.uid===attacker.uid),s).extraBreak??0,0);
 assert.deepEqual(physical(s),all);
});

test('Mantis adds a shield to the attack even when Null Breaker is selected',()=>{
 const s=field(),attacker=add(s,0,'battle','dm25rp3-060');
 add(s,0,'battle',MANTIS,{under:[inst(INSECT)]});
 attacker.powerModifiers=[{amount:3000}];
 attacker.g34Grants=[{turn:s.turn,breaker:2}];
 attack(s,attacker.uid);
 noBlock(s);
 assert.equal(s.decision.task.op,'g34_NullBreaker471');
 assert.match(s.decision.choices.find(o=>o.value==='null').label,/1枚ブレイク/);
 choose(s,'null');
 finishAttack(s,1);
 assert.equal(s.metrics[0].breaks,1);
});

test('Misdirection may shield the top card for its own and another Command’s no-block attack',()=>{
 for(const mode of ['self','ally','decline','non-command','GG']){
  const s=field(),source=add(s,0,'battle',MISDIRECTION);
  const attacker=['self','GG'].includes(mode)?source:add(s,0,'battle',mode==='non-command'?NATURE:DEMON);
  if(mode==='GG')add(s,1,'battle',GG,{under:[inst(NATURE)]});
  const top=s.players[0].deck[0].uid;
  attack(s,attacker.uid);
  noBlock(s);
  if(mode!=='non-command'){
   assert.equal(s.decision.task.source,MISDIRECTION);
   choose(s,mode==='decline'?null:true);
  }
  const placed=!['decline','non-command'].includes(mode);
  assert.equal(s.players[0].shields.some(x=>x.uid===top&&!x.faceUp),placed,mode);
  finishAttack(s,mode==='non-command'?1:2);
 }
});

test('Orgias requires another Demon Command and can destroy only a non-Dark opponent creature',()=>{
 for(const mode of ['other','self','non-demon','blocked']){
  const s=field(),source=add(s,0,'battle',ORGIAS);
  const attacker=mode==='self'?source:add(s,0,'battle',mode==='non-demon'?ANGEL:DEMON);
  const valid=add(s,1,'battle',BLOCKER);
  const dark=add(s,1,'battle',DARK),mixed=add(s,1,'battle',MIXED);
  attack(s,attacker.uid);
  if(mode==='blocked')act(s,'block',a=>a.uid===valid.uid);
  else noBlock(s);
  if(mode==='other'){
   assert.equal(s.decision.task.source,ORGIAS);
   assert.deepEqual(s.decision.choices.map(o=>o.value.uid),[valid.uid]);
   choose(s,valid.uid);
   assert.ok(s.players[1].grave.some(x=>x.uid===valid.uid));
  }else assert.notEqual(s.decision?.task?.source,ORGIAS);
  finishAttack(s,mode==='blocked'?0:2);
  for(const x of [dark,mixed])assert.ok(s.players[1].battle.some(y=>y.uid===x.uid),mode);
 }
});
