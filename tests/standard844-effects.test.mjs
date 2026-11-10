import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const DRAPI='dmr01-039',SWAN='dmr01-097',EGG='dmr01-032';
const LAND='dm01-108',FIRE='dm01-097',LIGHT='dm06-085',BLOCKER='dm01-079',BUON='dmx16-037';
const DOKKOI='dm26rp1-009',GENMU='dmrp15-km1',REDUCTION_LOCK='dmrp22-027';
const DRAGON='dm01-008',HASTE_DRAGON='dm23rp1-066',EVOLUTION_DRAGON='dm02-s04',LOCK='dmrp08-014';
const field=(active=0)=>Object.assign(setup(),{active});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const values=s=>s.decision.choices.map(o=>o.value?.uid??o.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const restore=s=>JSON.parse(JSON.stringify(s));
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
function end(s){s.phase='attack';act(s,'endTurn');}
const canAttack=(s,x)=>e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid);

test('Phase 844 preserves three original battle IDs and maps six verified reprints',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-844.json',import.meta.url)));
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[DRAPI,SWAN,EGG]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[
  ['dmx16-041',DRAPI],['dmd05-015',SWAN],['dm22rp2-T10',EGG],['dm22rp2-TF10',EGG],['dm23bd4-033',EGG],['dm26ex5-DP013',EGG]
 ]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id);
  assert.deepEqual(row.faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:844}),row.spec);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  const [face]=row.faces;
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations],[face.cost,Number(face.powerText),face.race,face.civilizations]);
  assert.equal(c.limit,4);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>x.name===c.name).map(x=>x.id),[row.id]);
  const unknown=structuredClone(d);unknown.faces[0].abilityText+='未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:844}));
 }
 for(const row of m.printAliases){
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:844}),m.cards.find(x=>x.id===row.canonicalId).spec);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1},{id:row.canonicalId,count:3}]),[{id:row.canonicalId,count:4}]);
  assert.equal(m.regulationVerification.limits[row.id],4);
 }
});

for(const n of [8,9])test('Drapi checks all physical mana on entry at the threshold '+n,()=>{
 const s=field();
 give(s,0,'mana',Array(n).fill(LAND));
 for(const x of s.players[0].mana.slice(1))x.tapped=true;
 s.players[0].mana.at(-1).faceDown=true;
 const x=play(s,DRAPI);
 assert.equal(has(s,0,'battle',x),n===9);
 assert.equal(has(s,0,'grave',x),n===8);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,n);
});

test('Drapi stays if Buon replaces its destruction and the entry check does not repeat (QA37056)',()=>{
 let s=field();
 give(s,0,'mana',[LAND]);
 const saver=put(s,0,'battle',BUON),x=play(s,DRAPI);
 assert.equal(s.decision.type,'leaveReplace');s=restore(s);
 act(s,'replaceUltra',a=>a.uid===saver.uid);drain(s);
 assert.ok(has(s,0,'battle',x)&&has(s,0,'grave',saver));
 end(s);drain(s);
 assert.ok(has(s,0,'battle',x));
});

test('Drapi entry still triggers when deployed and its normal attack breaks three shields',()=>{
 const s=field(1);
 const egg=put(s,0,'battle',EGG);
 give(s,0,'mana',[LAND]);give(s,0,'deck',[DRAPI,LAND,LAND]);
 const drapi=s.players[0].deck[0];
 end(s);pick(s,true);drain(s);
 assert.ok(has(s,0,'grave',egg)&&has(s,0,'grave',drapi));
 const older=put(s,0,'battle',DRAPI);
 attack(s,older.uid);act(s,'noBlock');drain(s);
 assert.equal(s.players[1].shields.length,2);
});

for(const amount of [0,1,2,3])test('Swan can choose exact reduction '+amount+' even with multiple opposing Blockers',()=>{
 let s=field();
 give(s,0,'mana',Array(4).fill(FIRE));
 put(s,1,'battle',BLOCKER,{tapped:true});
 put(s,1,'battle',BLOCKER);
 const x=play(s,SWAN);
 assert.equal(s.decision.task.op,'g34_PayCount499');
 assert.deepEqual(values(s),[3,2,1,0,false]);
 assert.ok(s.players[0].mana.every(m=>!m.tapped));s=restore(s);
 pick(s,amount);drain(s);
 assert.ok(has(s,0,'battle',x));
 assert.equal(s.players[0].mana.filter(m=>m.tapped).length,4-amount);
 s.phase='attack';assert.ok(canAttack(s,x));
});

test('Swan can reduce its summon against a tapped opposing Blocker',()=>{
 const s=field();
 give(s,0,'mana',[FIRE]);put(s,1,'battle',BLOCKER,{tapped:true});
 const x=play(s,SWAN);
 assert.deepEqual(values(s),[3,false]);pick(s,3);
 assert.ok(has(s,0,'battle',x)&&s.players[0].mana[0].tapped);
});

test('Swan only offers affordable reductions, pays at least one fire mana, and may cancel',()=>{
 const s=field();
 give(s,0,'mana',[FIRE]);put(s,1,'battle',BLOCKER);
 const x=play(s,SWAN);
 assert.deepEqual(values(s),[3,false]);
 pick(s,false);
 assert.ok(has(s,0,'hand',x)&&!s.players[0].mana[0].tapped);
 give(s,0,'mana',[LAND]);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===x.uid));
});

test('Swan sees only opposing creatures with an active Blocker ability and obeys reduction locks',()=>{
 for(const mode of ['own','sealed','ignored','reduction lock']){
  const s=field(),p=mode==='own'?0:1;
  const blocker=put(s,p,'battle',BLOCKER);
  if(mode==='sealed'){
   blocker.sealed=true;
   s.players[p].seals.push({...inst(LAND),sealOf:blocker.uid,faceDown:true});
  }
  if(mode==='ignored')put(s,0,'battle',GENMU);
  if(mode==='reduction lock')put(s,1,'battle',REDUCTION_LOCK);
  const x=play(s,SWAN);
  assert.equal(s.decision,null);
  assert.ok(has(s,0,'battle',x));
  assert.equal(s.players[0].mana.filter(m=>m.tapped).length,4);
 }
});

for(const id of [DRAGON,HASTE_DRAGON])test('Flare Egg may destroy itself to deploy the exact milled Dragon '+id,()=>{
 let s=field(1),egg=put(s,0,'battle',EGG);
 give(s,0,'deck',[id,LAND,LAND,LAND]);
 const dragon=s.players[0].deck[0],prior=put(s,0,'grave',id);
 end(s);
 assert.equal(s.decision.task.op,'g34_SelfSacrifice407');
 assert.ok(has(s,0,'grave',dragon)&&has(s,0,'battle',egg));s=restore(s);
 pick(s,true);drain(s);
 assert.ok(has(s,0,'battle',dragon)&&has(s,0,'grave',egg)&&has(s,0,'grave',prior));
 s.phase='attack';assert.equal(canAttack(s,dragon),id===HASTE_DRAGON);
});

test('Flare Egg may decline after milling, does not attack, and ignores an opposing turn start',()=>{
 const s=field(),egg=put(s,0,'battle',EGG);
 give(s,0,'deck',[DRAGON,LAND,LAND]);const dragon=s.players[0].deck[0];
 s.phase='attack';assert.ok(!canAttack(s,egg));
 end(s);drain(s);assert.equal(s.players[0].deck[0].uid,dragon.uid);
 end(s);pick(s,null);drain(s);
 assert.ok(has(s,0,'battle',egg)&&has(s,0,'grave',dragon));
});

for(const id of [EVOLUTION_DRAGON,LAND,LIGHT])test('Flare Egg mills an ineligible card without offering to hatch '+id,()=>{
 const s=field(1),egg=put(s,0,'battle',EGG);
 give(s,0,'deck',[id,LAND,LAND]);const top=s.players[0].deck[0];
 end(s);
 assert.equal(s.decision,null);
 assert.ok(has(s,0,'battle',egg)&&has(s,0,'grave',top));
});

test('Flare Egg hatches after an attempted self-destruction is replaced (rule 101.3a)',()=>{
 const s=field(1),egg=put(s,0,'battle',EGG);
 put(s,0,'battle',DOKKOI);
 give(s,0,'deck',[DRAGON,LAND,LAND]);const dragon=s.players[0].deck[0];
 end(s);pick(s,true);
 act(s,'g47Replace',a=>a.choice.to==='hand');drain(s);
 assert.ok(has(s,0,'battle',dragon)&&has(s,0,'hand',egg));
});

test('Flare Egg cannot move a Dragon through an opposing graveyard lock',()=>{
 const s=field(1),egg=put(s,0,'battle',EGG);
 put(s,1,'battle',LOCK);
 give(s,0,'deck',[DRAGON,LAND,LAND]);const dragon=s.players[0].deck[0];
 end(s);pick(s,true);drain(s);
 assert.ok(has(s,0,'grave',egg)&&has(s,0,'grave',dragon));
 assert.ok(!has(s,0,'battle',dragon));
});

test('Flare Egg milling the last card loses before the hatching choice',()=>{
 const s=field(1),egg=put(s,0,'battle',EGG);
 give(s,0,'deck',[DRAGON]);const dragon=s.players[0].deck[0];
 end(s);
 assert.equal(s.winner,1);
 assert.equal(s.decision,null);
 assert.ok(has(s,0,'battle',egg)&&has(s,0,'grave',dragon));
});
