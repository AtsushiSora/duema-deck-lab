import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {shieldCards} from '../dist/shield-state.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const GOD='dm25rp3-S02',MANTA='dmrp02-005',CONTRO='dmrp02-032',TEL='dm25rp2-016';
const LIGHT='dm01-075',WATER='dm01-083',DARK='dm01-090',FIRE='dm01-097',GREEN='dm01-108';
const SMOKE='dm23sd2-007',STRATO='dm22rp2-048',FIELD='dmrp08-005',G_STRIKE='dm25rp2-033',EXPENSIVE='dm01-027',FUJI='dmrp22-037';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
const ids=(s,p,zone)=>s.players[p][zone].map(x=>x.uid);
const values=s=>(s.decision?.choices??[]).map(x=>x.value?.uid??x.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const restore=s=>decodeBattleData(encodeBattleData(s));

function field(active=0){
 const s=setup();
 s.active=active;
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
function play(s,x,base){
 act(s,'play',a=>a.uid===x.uid);
 act(s,'evolve',a=>a.baseUid===base?.uid);
}
function finishAttack(s){
 if(s.decision?.type==='block')act(s,'noBlock');
 drain(s);
}
function move(s,p,x,to='grave'){
 s.extTasks=[{op:'g34_Sequence',p:s.active,source:WATER,defs:[
  {op:'ExactMove',owner:p,to,target:x.uid,targetIncarnation:x.incarnation||0}
 ]}];
 s.phase='main';
 act(s,'toAttack');
}

test('Four cards and five alternate prints resolve to the original IDs with official art and restrictions',()=>{
 const m=read('tools/support-phase-1069.json'),cat=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(r=>r.id),[GOD,MANTA,CONTRO,TEL]);
 assert.deepEqual(m.printAliases.map(r=>[r.id,r.canonicalId]),[
  ['dm25rp3-Sec03',GOD],['dm25ex3-rp3S02',GOD],['dm25ex3-rp3Sec03',GOD],
  ['dm25rp2-Sec17',TEL],['promoy24-040',TEL]
 ]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.ok(row.verification.facesMatched&&cat.get(row.id).supported);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1069}),m.cards.find(r=>r.id===id).spec);
  assert.deepEqual([c.type,c.cost,c.race,c.power,e.civilizations(c),c.manaValue,c.limit],
   ['creature',f.cost,f.race,Number(f.powerText),f.civilizations,1,4]);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(cat.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(refs.filter(r=>r.id===row.id).map(r=>[r.canonicalId,r.image]),[[id,row.image]]);
  if(row.id===id)assert.equal(CARD_IMAGES[id],row.image);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[id]);
 }
});

test('Shintei pays four water DDD mana, inherits the attack and draws before offering the twinpact spell',()=>{
 let s=field();
 const base=add(s,0,'battle',WATER),god=add(s,0,'hand',GOD),enemy=add(s,1,'battle',WATER);
 const creature=add(s,0,'hand',FIRE);
 give(s,0,'deck',[SMOKE,GREEN,GREEN,GREEN]);
 const [drawn,next]=ids(s,0,'deck'),before=physical(s);
 attack(s,base.uid);
 act(s,'declareDDD');
 act(s,'summonDDD',a=>a.baseUid===base.uid);
 assert.equal(s.attack.attacker,god.uid);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,4);
 assert.ok(god.justDiverActive);
 act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields');
 assert.equal(s.players[1].shields.length,3);
 assert.equal(s.decision?.task?.op,'g34_Execute');
 assert.deepEqual(values(s),[drawn,null]);
 assert.equal(s.decision.choices[0].value.face,1);
 s=restore(s);
 pick(s,drawn);
 drain(s);
 assert.ok(ids(s,0,'grave').includes(drawn));
 assert.deepEqual(new Set(ids(s,0,'hand')),new Set([creature.uid,next]));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,4);
 assert.ok(ids(s,1,'battle').includes(enemy.uid));
 assert.deepEqual(physical(s),before);
});

test('Shintei can execute an eligible field after battle and can decline without losing the draw',()=>{
 for(const accept of [true,false]){
  const s=field(),god=add(s,0,'battle',GOD),target=add(s,1,'battle',WATER,{tapped:true});
  const card=add(s,0,'hand',FIELD),expensive=add(s,0,'hand',EXPENSIVE);
  const top=s.players[0].deck[0];
  attack(s,god.uid,target.uid);
  if(s.decision?.type==='block')act(s,'noBlock');
  assert.deepEqual(values(s),[card.uid,null]);
  pick(s,accept?card.uid:null);
  drain(s);
  assert.ok(ids(s,0,'hand').includes(top.uid));
  assert.ok(ids(s,0,'hand').includes(expensive.uid));
  assert.equal(ids(s,0,'battle').includes(card.uid),accept);
  assert.ok(ids(s,1,'grave').includes(target.uid));
  assert.ok(s.players[0].mana.every(x=>!x.tapped));
 }
});

test('Manta can decline or exchange with its newly placed face-down shield',()=>{
 for(const accept of [true,false]){
  const s=field(),manta=add(s,0,'battle',MANTA),offered=add(s,0,'hand',SMOKE),before=physical(s);
  attack(s,manta.uid);
  pick(s,accept?offered.uid:null);
  if(accept){
   assert.equal(s.decision?.task?.op,'g55_ShieldHand');
   assert.ok(ids(s,0,'shields').includes(offered.uid));
   assert.ok(!offered.faceUp);
   pick(s,offered.uid);
  }
  finishAttack(s);
  assert.deepEqual(ids(s,0,'hand'),[offered.uid]);
  assert.equal(s.players[0].shields.length,5);
  assert.equal(s.players[1].shields.length,3);
  assert.deepEqual(physical(s),before);
 }
});

test('Manta takes an existing shield stack with G Strike available and S Trigger disabled',()=>{
 const s=field(),manta=add(s,0,'battle',MANTA),offered=add(s,0,'hand',WATER);
 const enemy=add(s,1,'battle',FIRE);
 give(s,0,'shields',[SMOKE]);
 const [shield]=s.players[0].shields;
 const gs=inst(G_STRIKE);
 shield.shieldStack=[gs];
 attack(s,manta.uid);
 pick(s,offered.uid);
 pick(s,shield.uid);
 assert.equal(s.decision?.task?.op,'gsTarget');
 pick(s,enemy.uid);
 finishAttack(s);
 assert.deepEqual(new Set(ids(s,0,'hand')),new Set([shield.uid,gs.uid]));
 assert.deepEqual(ids(s,0,'shields'),[offered.uid]);
 assert.ok(!ids(s,0,'grave').includes(shield.uid));
 assert.equal(s.metrics[0].triggers,0);
});

test('Manta still takes a shield if the shield placement attempt is prevented (QA 40275)',()=>{
 const s=field(),manta=add(s,0,'battle',MANTA),offered=add(s,0,'hand',SMOKE);
 add(s,1,'battle',FUJI);
 assert.equal(e.canAddShield(s,0),false);
 const shield=s.players[0].shields[0];
 attack(s,manta.uid);
 pick(s,offered.uid);
 assert.equal(s.decision?.task?.op,'g55_ShieldHand');
 pick(s,shield.uid);
 finishAttack(s);
 assert.deepEqual(ids(s,0,'hand'),[offered.uid,shield.uid]);
 assert.equal(s.players[0].shields.length,4);
});

test('Contro replaces destruction with exactly one shield containing the whole evolution stack',()=>{
 let s=field(1);
 const first=inst(LIGHT),second=inst(SMOKE),third=inst(DARK);
 first.under=[second];
 const contro=add(s,0,'battle',CONTRO,{under:[first,third]});
 const initial=ids(s,0,'shields'),before=physical(s);
 move(s,0,contro);
 drain(s);
 assert.deepEqual(ids(s,0,'shields'),[...initial,contro.uid]);
 assert.deepEqual(ids(s,0,'grave'),[]);
 const shield=s.players[0].shields.at(-1);
 assert.deepEqual(shieldCards(shield).map(c=>c.uid),[contro.uid,first.uid,second.uid,third.uid]);
 assert.ok(shieldCards(shield).every(c=>!c.faceUp&&!c.under));
 assert.ok(!JSON.stringify(e.observation(s,1).players[0].shields).includes(e.card(CONTRO).name));
 s=restore(s);
 assert.deepEqual(physical(s),before);
 assert.equal(shieldCards(s.players[0].shields.at(-1)).length,4);
});

test('Contro leaves normally when bounced and can shield itself as a non-evolved creature',()=>{
 for(const to of ['hand','grave']){
  const s=field(1),contro=add(s,0,'battle',CONTRO);
  move(s,0,contro,to);
  drain(s);
  assert.ok(ids(s,0,to==='grave'?'shields':'hand').includes(contro.uid));
  assert.equal(s.players[0].shields.length,to==='grave'?6:5);
 }
});

test('Contro is destroyed when new shields are prohibited',()=>{
 const s=field(),contro=add(s,0,'battle',CONTRO,{under:[inst(LIGHT)]});
 add(s,1,'battle',FUJI);
 assert.equal(e.canAddShield(s,0),false);
 const base=contro.under[0],before=physical(s);
 move(s,0,contro);
 drain(s);
 assert.deepEqual(ids(s,0,'grave'),[contro.uid,base.uid]);
 assert.equal(s.players[0].shields.length,5);
 assert.deepEqual(physical(s),before);
});

test('Tel Meteorburn discards the opponent hand even when Stratobag redirects the selected base',()=>{
 for(const mode of ['decline','grave','mana']){
  const s=field(),base=inst(DARK),tel=add(s,0,'battle',TEL,{under:[base]});
  const opponentHand=[add(s,1,'hand',WATER),add(s,1,'hand',LIGHT)];
  const saved=add(s,0,'hand',FIRE);
  const strato=mode==='mana'?add(s,1,'battle',STRATO):null,before=physical(s);
  attack(s,tel.uid);
  assert.equal(s.decision?.task?.op,'g31_Meteor');
  pick(s,mode==='decline'?null:base.uid);
  if(strato){
   assert.equal(s.decision?.task?.op,'g31_Meteor825Dest');
   pick(s,strato.uid);
  }
  if(mode==='decline'){
   assert.deepEqual(ids(s,1,'hand'),opponentHand.map(c=>c.uid));
   assert.ok(e.isEvolution(tel));
  }else{
   assert.deepEqual(ids(s,1,'hand'),[]);
   assert.deepEqual(new Set(ids(s,1,'grave')),new Set(opponentHand.map(c=>c.uid)));
   assert.ok(ids(s,0,mode).includes(base.uid));
   assert.ok(!e.isEvolution(tel));
  }
  assert.deepEqual(ids(s,0,'hand'),[saved.uid]);
  finishAttack(s);
  assert.equal(s.players[1].shields.length,3);
  assert.deepEqual(physical(s),before);
 }
});

test('Tel returns the destroyed physical copy and may reenter as an evolution or ordinary NEO',()=>{
 for(const evolved of [false,true]){
  let s=field(1);
  const tel=add(s,0,'battle',TEL),base=add(s,0,'battle',DARK),other=add(s,0,'grave',TEL),before=physical(s);
  move(s,0,tel);
  assert.equal(s.decision?.task?.op,'g34_Offer');
  s=restore(s);
  pick(s,true);
  assert.deepEqual(new Set(values(s)),new Set([base.uid,null]));
  pick(s,evolved?base.uid:null);
  drain(s);
  const returned=s.players[0].battle.find(c=>c.uid===tel.uid);
  assert.ok(returned);
  assert.equal(e.isEvolution(returned),evolved);
  assert.deepEqual(ids(s,0,'grave'),[other.uid]);
  assert.deepEqual(physical(s),before);
 }
});

test('Tel can decline and does not return after a bounce or while the opponent has a card in hand',()=>{
 for(const mode of ['decline','bounce','hand']){
  const s=field(1),tel=add(s,0,'battle',TEL);
  if(mode==='hand')add(s,1,'hand',FIRE);
  move(s,0,tel,mode==='bounce'?'hand':'grave');
  if(mode==='decline'){
   assert.equal(s.decision?.task?.op,'g34_Offer');
   pick(s,null);
  }
  assert.equal(s.decision,null);
  assert.ok(ids(s,0,mode==='bounce'?'hand':'grave').includes(tel.uid));
 }
});
