import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const GUN='dmrp02-s08',ARK='dmrp02-003',ZEN='dm25rp1-024',TENKUU='promoy16-031';
const LIGHT='dm01-075',WATER='dm01-083',FIRE='dm01-097',GREEN='dm01-108',THREE='dm01-103';
const JOKER='dmsd01-012',ARIZONA='promoy16-064',KAREIKO='dm22ex1-086',MASTIN='dmrp01-s09',QQX='dmrp07-m01',MULTI='dm25rp3-S09';
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
function end(s){
 s.phase='attack';
 act(s,'endTurn');
}
function finishAttack(s){
 if(s.decision?.type==='block')act(s,'noBlock');
 drain(s);
}

test('Four official cards and two equivalent prints retain their canonical IDs, art and limits',()=>{
 const m=read('tools/support-phase-1070.json'),cat=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(r=>r.id),[GUN,ARK,ZEN,TENKUU]);
 assert.deepEqual(m.printAliases.map(r=>[r.id,r.canonicalId]),[['dm25ex3-030',ZEN],['dmsp01-001',TENKUU]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.ok(row.verification.facesMatched&&cat.get(row.id).supported);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1070}),m.cards.find(r=>r.id===id).spec);
  assert.deepEqual([c.type,c.cost,c.race,c.power,c.civ,c.manaValue,c.limit],
   ['creature',f.cost,f.race,Number(f.powerText),f.civilizationText,1,4]);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(cat.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(refs.filter(r=>r.id===row.id).map(r=>[r.canonicalId,r.image]),[[id,row.image]]);
  if(row.id===id)assert.equal(CARD_IMAGES[id],row.image);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[id]);
 }
});

test('Gun costs three only when summoned on an eligible fire base',()=>{
 for(const evolved of [false,true]){
  const s=field(),base=add(s,0,'battle',FIRE),wrong=add(s,0,'battle',WATER),gun=add(s,0,'hand',GUN);
  give(s,0,'mana',Array(evolved?3:6).fill(FIRE));
  act(s,'play',a=>a.uid===gun.uid&&a.cost===3);
  const bases=e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid);
  assert.deepEqual(new Set(bases),new Set(evolved?[base.uid]:[base.uid,undefined]));
  assert.ok(!bases.includes(wrong.uid));
  act(s,'evolve',a=>a.baseUid===(evolved?base.uid:undefined));
  assert.equal(e.card(gun).cost,6);
  assert.equal(s.players[0].mana.filter(x=>x.tapped).length,evolved?3:6);
  assert.equal(e.isEvolution(gun),evolved);
 }
});

test('Gun destroys a current power 3000 enemy when an ordinary allied NEO attacks',()=>{
 const s=field(),gun=add(s,0,'battle',GUN),neo=add(s,0,'battle',ZEN),plain=add(s,0,'battle',LIGHT);
 const atLimit=add(s,1,'battle',THREE),over=add(s,1,'battle',THREE,{powerModifiers:[{amount:1}]});
 attack(s,plain.uid);
 assert.equal(s.decision?.type,'block');
 finishAttack(s);
 attack(s,neo.uid);
 if(s.decision?.type==='effectOrder')act(s,'orderEffect',a=>a.cardId===GUN);
 assert.deepEqual(values(s),[atLimit.uid]);
 pick(s,atLimit.uid);
 if(s.decision?.task?.op==='g34_Offer')pick(s,null);
 finishAttack(s);
 assert.ok(ids(s,1,'grave').includes(atLimit.uid));
 assert.ok(ids(s,1,'battle').includes(over.uid));
 assert.ok(ids(s,0,'battle').includes(gun.uid));
});

test('Ark locks opposing start untaps while tapped, then the opponent chooses one creature when Ark untaps',()=>{
 let s=field(),ark=add(s,0,'battle',ARK,{tapped:true});
 const first=add(s,1,'battle',WATER,{tapped:true}),second=add(s,1,'battle',LIGHT,{tapped:true});
 s.players[1].mana[0].tapped=true;
 end(s);
 drain(s);
 assert.equal(s.active,1);
 assert.ok(first.tapped&&second.tapped);
 assert.equal(s.players[1].mana[0].tapped,false);
 end(s);
 assert.equal(s.active,0);
 assert.equal(ark.tapped,false);
 assert.equal(s.decision?.player,1);
 assert.deepEqual(new Set(values(s)),new Set([first.uid,second.uid]));
 s=restore(s);
 pick(s,second.uid);
 drain(s);
 const enemy=s.players[1].battle;
 assert.equal(enemy.find(c=>c.uid===first.uid).tapped,true);
 assert.equal(enemy.find(c=>c.uid===second.uid).tapped,false);
 end(s);
 drain(s);
 assert.equal(enemy.find(c=>c.uid===first.uid).tapped,false);
});

test('Zen looks privately and assigns distinct cards to mana, hand and a new face-down shield',()=>{
 let s=field();
 const zen=add(s,0,'battle',ZEN);
 give(s,0,'deck',[MULTI,WATER,ARK,GREEN,GREEN]);
 const [mana,hand,shield,...rest]=ids(s,0,'deck'),before=physical(s);
 attack(s,zen.uid);
 assert.equal(s.decision?.task?.op,'g34_Offer');
 assert.equal(s.decision.task.g585Peek,undefined);
 pick(s,true);
 assert.deepEqual(s.decision.task.g585Peek.map(c=>c.id),[MULTI,WATER,ARK]);
 assert.ok(!JSON.stringify(e.observation(s,1)).includes(e.card(ARK).name));
 assert.deepEqual(new Set(values(s)),new Set([mana,hand,shield]));
 pick(s,mana);
 s=restore(s);
 assert.deepEqual(new Set(values(s)),new Set([hand,shield]));
 pick(s,hand);
 pick(s,shield);
 finishAttack(s);
 assert.equal(s.players[0].mana.find(c=>c.uid===mana).tapped,true);
 assert.deepEqual(ids(s,0,'hand'),[hand]);
 const newShield=s.players[0].shields.at(-1);
 assert.equal(newShield.uid,shield);
 assert.ok(!newShield.faceUp);
 assert.deepEqual(ids(s,0,'deck'),rest);
 assert.deepEqual(physical(s),before);
});

test('Zen can decline or respect replacement of deck-to-mana and deck-to-shield moves',()=>{
 for(const accept of [false,true]){
  const s=field(),zen=add(s,0,'battle',ZEN);
  add(s,1,'battle',KAREIKO);
  give(s,0,'deck',[WATER,LIGHT,FIRE,GREEN,GREEN]);
  const [mana,hand,shield,...rest]=ids(s,0,'deck');
  attack(s,zen.uid);
  pick(s,accept?true:null);
  if(accept){
   pick(s,mana);
   pick(s,hand);
   pick(s,shield);
  }
  finishAttack(s);
  assert.deepEqual(ids(s,0,'deck'),accept?rest:[mana,hand,shield,...rest]);
  assert.deepEqual(ids(s,0,'hand'),accept?[hand]:[]);
  assert.deepEqual(ids(s,0,'grave'),accept?[mana,shield]:[]);
  assert.equal(s.players[0].shields.length,5);
 }
});

test('Zen leaves all destinations untouched when looking at the deck is prohibited',()=>{
 const s=field(),zen=add(s,0,'battle',ZEN);
 add(s,1,'battle',QQX);
 give(s,0,'deck',[WATER,LIGHT,FIRE,GREEN,GREEN]);
 const library=ids(s,0,'deck');
 attack(s,zen.uid);
 assert.equal(s.decision?.type,'block');
 finishAttack(s);
 assert.deepEqual(ids(s,0,'deck'),library);
 assert.deepEqual(ids(s,0,'hand'),[]);
 assert.equal(s.players[0].shields.length,5);
});

test('Tenkuu accepts a Jokers spell and creature, discards them together, then untaps',()=>{
 let s=field();
 const tenkuu=add(s,0,'battle',TENKUU);
 const creature=add(s,0,'hand',JOKER),spell=add(s,0,'hand',ARIZONA),other=add(s,0,'hand',MASTIN);
 const before=physical(s);
 attack(s,tenkuu.uid);
 assert.deepEqual(new Set(values(s)),new Set([creature.uid,spell.uid,null]));
 pick(s,spell.uid);
 assert.deepEqual(ids(s,0,'hand'),[creature.uid,spell.uid,other.uid]);
 assert.equal(tenkuu.tapped,true);
 s=restore(s);
 pick(s,creature.uid);
 assert.deepEqual(new Set(ids(s,0,'grave')),new Set([spell.uid,creature.uid]));
 assert.deepEqual(ids(s,0,'hand'),[other.uid]);
 assert.equal(s.players[0].battle[0].tapped,false);
 finishAttack(s);
 assert.equal(s.players[1].shields.length,3);
 assert.deepEqual(physical(s),before);
});

test('Tenkuu can decline after picking one card, and one eligible card alone cannot pay',()=>{
 for(const count of [1,2]){
  const s=field(),tenkuu=add(s,0,'battle',TENKUU),joker=add(s,0,'hand',JOKER);
  if(count===2)add(s,0,'hand',ARIZONA);
  const hand=ids(s,0,'hand');
  attack(s,tenkuu.uid);
  if(count===2){
   pick(s,joker.uid);
   pick(s,null);
  }
  assert.equal(s.decision?.type,'block');
  assert.deepEqual(ids(s,0,'hand'),hand);
  assert.deepEqual(ids(s,0,'grave'),[]);
  assert.equal(tenkuu.tapped,true);
  finishAttack(s);
 }
});
