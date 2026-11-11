import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const TRAIN='dmr15-051',GILL='dmx05-003',WIN='dmex15-b018',AKUNO='dmr15-012';
const PRINTS=[['dmsd11-020',TRAIN],['dmd13-016',GILL],['promoy12-019',GILL],['promoy25-128',WIN]];
const NATURE='dm01-108',FIRE='dm01-097',WATER='dm01-083',GENMU='dmrp15-km1';
const HEIKE='dmx05-005',REX='dmr15-018',BIG='dmex15-b005',SMALL='dm34-024',SWORD='dmx16-029';
const FUNKY='dmr14-044',MIXED='dmr19-070',TRIGGER='dm01-027',HOLY='dm01-015';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const value=c=>c.value?.uid??c.value;
const choices=s=>s.decision.choices.map(value);
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);

function field(){
 const s=setup();
 for(const p of [0,1]){give(s,p,'deck',Array(20).fill(NATURE));give(s,p,'grave',[]);}
 return s;
}

function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}

function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}

test('Phase 983 registers four canonical cards and resolves four reprints to their original IDs',()=>{
 const m=read('tools/support-phase-983.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[TRAIN,GILL,WIN,AKUNO]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),PRINTS);
 assert.deepEqual(catalogue.resolveRows(PRINTS.map(([id])=>({id,count:1}))),
  [{id:TRAIN,count:1},{id:GILL,count:2},{id:WIN,count:1}]);
 for(const row of m.cards){
  const {id,name,faces}=row,[f]=faces,d=details.cards.find(x=>x.id===id),c=e.card(id);
  assert.deepEqual(faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:983}),row.spec);
  const altered=structuredClone(d);
  altered.faces[0].abilityText+='未知の追加能力。';
  assert.throws(()=>standardCardSpec(altered,{phase:983}));
  for(const [key,v] of Object.entries(row.spec))assert.deepEqual(c[key],v);
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [name,[TRAIN,WIN].includes(id)?'spell':'creature',f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-983');
  assert.equal(CARD_IMAGES[id],row.image);
  assert.ok(catalogue.get(id).supported);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
 }
 for(const row of [...m.cards,...m.printAliases]){
  assert.ok(row.verification.facesMatched);
  assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[row.canonicalId??row.id,row.image]]);
  if(row.canonicalId)assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:983}),m.cards.find(x=>x.id===row.canonicalId).spec);
 }
});

function directAttack(s,uid){
 attack(s,uid);
 act(s,'noBlock');
 drain(s);
}

test('Training untaps the chosen creature on its first attack, follows JSON, then expires for that creature',()=>{
 let s=field();
 const first=put(s,0,'battle',FIRE),other=put(s,0,'battle',WATER),enemy=put(s,1,'battle',FIRE);
 play(s,TRAIN);
 assert.deepEqual(choices(s),[first.uid,other.uid]);
 assert.ok(!choices(s).includes(enemy.uid));
 pick(s,first.uid);
 s=restore(s);
 const chosen=s.players[0].battle.find(x=>x.uid===first.uid);
 directAttack(s,other.uid);
 assert.ok(s.players[0].battle.find(x=>x.uid===other.uid).tapped);
 directAttack(s,first.uid);
 assert.equal(chosen.tapped,false);
 directAttack(s,first.uid);
 assert.equal(chosen.tapped,true);
 assert.equal(s.players[1].shields.length,2);
});

test('Training cannot react to a second tap when selected after the creature tapped earlier',()=>{
 for(const alreadyTapped of [true,false]){
  const s=field(),unit=put(s,0,'battle',FIRE);
  directAttack(s,unit.uid);
  if(!alreadyTapped)unit.tapped=false;
  s.phase='main';
  play(s,TRAIN);
  pick(s,unit.uid);
  assert.equal(s.extLimits?.some(r=>r.kind==='g885FirstTap')??false,false);
  unit.tapped=false;
  directAttack(s,unit.uid);
  assert.ok(unit.tapped);
 }
});

test('Training responds to a non-attack tap and respects suppression of the delayed spell',()=>{
 for(const suppressed of [false,true]){
  const s=field(),unit=put(s,0,'battle',HEIKE);
  play(s,TRAIN);
  pick(s,unit.uid);
  if(suppressed)put(s,1,'battle',GENMU);
  s.active=1;
  play(s,HOLY);
  drain(s);
  assert.equal(unit.tapped,suppressed);
 }
});

test('GILL destroys creatures within a shared power budget before sending a whole shield to grave',()=>{
 let s=field();
 const first=put(s,1,'battle',SMALL),second=put(s,1,'battle',REX);
 const high=put(s,1,'battle',BIG),untargetable=put(s,1,'battle',HEIKE);
 const shield=s.players[1].shields[0],stacked=inst(TRIGGER);
 shield.shieldStack=[stacked];
 const gill=play(s,GILL),all=physical(s);
 assert.deepEqual(choices(s),[first.uid,second.uid,null]);
 pick(s,first.uid);
 assert.deepEqual(choices(s),[second.uid,null]);
 s=restore(s);
 pick(s,second.uid);
 if(choices(s).includes(null))pick(s,null);
 assert.ok(has(s,1,'grave',first)&&has(s,1,'grave',second));
 assert.ok(has(s,1,'battle',high)&&has(s,1,'battle',untargetable));
 assert.ok(choices(s).includes(shield.uid)&&!choices(s).includes(null));
 pick(s,shield.uid);
 assert.ok(has(s,1,'grave',shield)&&has(s,1,'grave',stacked));
 assert.ok(!s.triggers);
 assert.deepEqual(physical(s),all);
 const live=s.players[0].battle.find(x=>x.uid===gill.uid);
 live.entered=0;
 directAttack(s,gill.uid);
 assert.equal(s.players[1].shields.length,2);
});

test('GILL must move an opposing shield even when zero creatures were chosen',()=>{
 for(const available of [false,true]){
  const s=field(),shield=s.players[1].shields[0];
  if(available)put(s,1,'battle',FIRE);
  play(s,GILL);
  if(available)pick(s,null);
  assert.ok(!choices(s).includes(null));
  pick(s,shield.uid);
  assert.ok(has(s,1,'grave',shield));
 }
});

for(const shields of [0,1,2])test('Fighting Edge checks the opposing shield count after the grave move '+shields,()=>{
 const s=field();
 give(s,1,'shields',Array(shields).fill(TRIGGER));
 const [shield]=s.players[1].shields;
 const source=play(s,WIN);
 if(shields){
  assert.ok(!choices(s).includes(null));
  pick(s,shield.uid);
  assert.ok(has(s,1,'grave',shield));
 }
 assert.equal(s.winner,shields<2?0:null);
 assert.equal(s.players[1].shields.length,Math.max(0,shields-1));
 assert.equal(s.players[1].hand.length,0);
 assert.ok(!s.triggers);
 assert.ok(e.physicalCards(s).some(x=>x.uid===source.uid));
});

test('Akunohana counts visible allied Funky Nightmares, selects face-down hand positions and discards together',()=>{
 let s=field();
 put(s,0,'battle',FUNKY);put(s,0,'battle',MIXED);put(s,0,'battle',FIRE);
 put(s,0,'grave',FUNKY);put(s,1,'battle',FUNKY);
 give(s,1,'hand',[FIRE,NATURE,WATER,HEIKE]);
 const [first,second,third,fourth]=s.players[1].hand;
 const akuno=play(s,AKUNO),all=physical(s);
 assert.deepEqual(choices(s),[0,1,2,3]);
 assert.ok(s.decision.choices.every(c=>!c.cardId));
 pick(s,1);
 assert.deepEqual(choices(s),[0,2,3]);
 assert.equal(s.players[1].hand.length,4);
 s=restore(s);
 pick(s,3);
 assert.ok(has(s,1,'grave',second)&&has(s,1,'grave',fourth));
 assert.ok(has(s,1,'hand',first)&&has(s,1,'hand',third));
 assert.deepEqual(physical(s),all);
 s.players[0].battle.find(x=>x.uid===akuno.uid).entered=0;
 directAttack(s,akuno.uid);
 assert.equal(s.players[1].shields.length,3);
});

test('Akunohana skips with no qualifying ally and discards only as many cards as the opponent has',()=>{
 for(const count of [0,3]){
  const s=field();
  give(s,1,'hand',[FIRE]);
  for(let i=0;i<count;i++)put(s,0,'battle',FUNKY);
  const [card]=s.players[1].hand;
  play(s,AKUNO);
  drain(s);
  assert.ok(has(s,1,count?'grave':'hand',card));
 }
});
