import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,cast,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const SCRIPT='dmr08-010',CHRISTINA='dmrp04s-034',FIRE='dmex15-b017';
const REPRINTS=['dm22ex1-045','dm25ex1-041'],TWIN='dm22ex1-059';
const LOW='dm01-083',MEDIUM='dm01-108',HIGH='dm05-s04',EX='dmrp18-s10',DIVER='dm24rp4-S11',SHAKO='dmrp03-s03';
function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(12).fill(MEDIUM));
 return s;
}
function add(s,p,zone,id,props){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const choices=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>choices(s)[a.choice]===(value?.uid??value));
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
function end(s){s.phase='attack';act(s,'endTurn');}

test('Phase 882 verifies three distinct definitions, two Script reprints, and a separate Twinpact identity',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-882.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[SCRIPT,CHRISTINA,FIRE]);
 assert.deepEqual(m.printAliases.map(x=>x.id),REPRINTS);
 assert.deepEqual(registry.resolveRows([{id:SCRIPT,count:2},...REPRINTS.map(id=>({id,count:1}))]),[{id:SCRIPT,count:4}]);
 assert.deepEqual(registry.resolveRows([{id:TWIN,count:1},{id:CHRISTINA,count:1}]),[{id:TWIN,count:1},{id:CHRISTINA,count:1}]);
 for(const print of m.printAliases){
  assert.equal(print.canonicalId,SCRIPT);
  assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:882}),m.cards[0].spec);
  assert.equal(m.regulationVerification.limits[print.id],4);
 }
 for(const row of m.cards){
  const detail=details.cards.find(x=>x.id===row.id),card=e.card(row.id),[face]=row.faces;
  assert.deepEqual(detail.faces,row.faces);
  assert.deepEqual(standardCardSpec(detail,{phase:882}),row.spec);
  assert.throws(()=>standardCardSpec(detail,{phase:880}));
  const changed=structuredClone(detail);
  changed.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(changed,{phase:882}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(card[key],value);
  assert.deepEqual([card.type,card.cost,card.civilizations,card.manaValue,card.limit],
   [row.id===SCRIPT?'creature':'spell',face.cost,face.civilizations,1,4]);
  if(row.id===SCRIPT)assert.deepEqual([card.power,card.race],[Number(face.powerText),face.race]);
  assert.ok(registry.get(row.id).supported);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(card.name)).map(x=>x.id),[row.id]);
 }
});

test('Script can choose either side, returns the selected enemy, and offers strictly cheaper creatures only',()=>{
 let s=field();
 const ally=add(s,0,'battle',LOW),enemy=add(s,1,'battle',EX);
 const cheaper=add(s,0,'hand',LOW),same=add(s,0,'hand',EX);
 const spell=add(s,0,'hand',CHRISTINA);
 cast(s,SCRIPT);
 assert.deepEqual(choices(s),[ally.uid,enemy.uid]);
 pick(s,enemy);
 assert.ok(has(s,1,'hand',enemy));
 assert.deepEqual(choices(s),[cheaper.uid,null]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,cheaper);
 assert.ok(has(s,0,'battle',cheaper));
 assert.ok(has(s,0,'hand',same)&&has(s,0,'hand',spell));
});

test('Script requires a friendly target when it is the only other creature and may decline deployment',()=>{
 const s=field(),ally=add(s,0,'battle',EX),cheaper=add(s,0,'hand',LOW);
 cast(s,SCRIPT);
 assert.deepEqual(choices(s),[ally.uid]);
 pick(s,ally);
 assert.ok(has(s,0,'hand',ally));
 pick(s,null);
 assert.ok(has(s,0,'hand',cheaper));
 assert.equal(s.decision,null);
});

test('Script without another creature does not offer a deployment (QA 36791)',()=>{
 const s=field(),cheaper=add(s,0,'hand',LOW);
 cast(s,SCRIPT);
 assert.equal(s.decision,null);
 assert.ok(has(s,0,'hand',cheaper));
 assert.equal(s.players[0].battle.length,1);
});

test('Script uses the selected cost when EX Life replaces the return',()=>{
 const s=field();
 s.active=1;
 cast(s,EX);
 drain(s);
 const enemy=s.players[1].battle[0],shield=e.exLifeShields(s,1,enemy)[0];
 assert.ok(shield);
 s.active=0;
 const cheaper=add(s,0,'hand',LOW);
 cast(s,SCRIPT);
 pick(s,enemy);
 assert.ok(has(s,1,'battle',enemy));
 assert.ok(has(s,1,'grave',shield));
 pick(s,cheaper);
 assert.ok(has(s,0,'battle',cheaper));
});

test('Christina can use an already-tapped friendly creature and taps only enemies below its current power',()=>{
 for(const tapped of [false,true]){
  const s=field(),ally=add(s,0,'battle',LOW,{tapped,powerModifiers:[{amount:2000}]});
  const other=add(s,0,'battle',LOW),low=add(s,1,'battle',MEDIUM,{justDiverActive:true});
  const equal=add(s,1,'battle',MEDIUM,{powerModifiers:[{amount:1000}]});
  const higher=add(s,1,'battle',HIGH);
  cast(s,CHRISTINA);
  assert.deepEqual(choices(s),[ally.uid,other.uid]);
  pick(s,ally);
  assert.ok(ally.tapped&&low.tapped);
  assert.ok(!other.tapped&&!equal.tapped&&!higher.tapped);
 }
});

test('Christina has no comparison or tap without a friendly creature',()=>{
 const s=field(),enemy=add(s,1,'battle',LOW);
 cast(s,CHRISTINA);
 assert.equal(s.decision,null);
 assert.equal(enemy.tapped,false);
});

test('Dogiragon Fire destroys enemies at or below 14000 without choosing, and uses current power',()=>{
 const s=field(),own=add(s,0,'battle',LOW),high=add(s,1,'battle',HIGH);
 const equal=add(s,1,'battle',HIGH,{powerModifiers:[{amount:-1000}]});
 const diver=add(s,1,'battle',DIVER,{justDiverActive:true});
 cast(s,FIRE);
 assert.ok(has(s,1,'grave',equal)&&has(s,1,'grave',diver));
 assert.ok(has(s,0,'battle',own)&&has(s,1,'battle',high));
});

test('Dogiragon Fire prevents direct defeat through the opposing turn and expires at the next own start',()=>{
 let s=field(),enemy=add(s,1,'battle',HIGH);
 give(s,0,'shields',[]);
 cast(s,FIRE);
 assert.ok(s.extLimits.some(x=>x.kind==='g34NoLose'&&x.player===0&&x.who===0));
 s=JSON.parse(JSON.stringify(s));
 end(s);
 attack(s,enemy.uid);
 drain(s);
 assert.equal(s.winner,null);
 assert.ok(s.log.some(x=>x.type==='lossPrevented'&&x.player===0));
 end(s);
 assert.equal(s.active,0);
 assert.ok(!s.extLimits.some(x=>x.kind==='g34NoLose'));
 end(s);
 attack(s,enemy.uid);
 drain(s);
 assert.equal(s.winner,1);
});

test('Dogiragon Fire stops an alternate win but cannot protect against an empty deck on the next own turn',()=>{
 const s=field();
 cast(s,FIRE);
 end(s);
 add(s,1,'battle',SHAKO);
 give(s,1,'deck',[LOW]);
 s.phase='main';
 s.extTasks=[{op:'g34_Draw',p:1,source:SHAKO,n:1}];
 act(s,'toAttack');
 drain(s);
 assert.equal(s.winner,0);
 assert.match(s.reason,/山札/);

 // QA 48935: the opposing turn-start draw takes place after the immunity expires.
 const next=field();
 cast(next,FIRE);
 end(next);
 add(next,1,'battle',SHAKO);
 give(next,1,'deck',[LOW]);
 end(next);
 drain(next);
 assert.equal(next.winner,1);

 const empty=field();
 cast(empty,FIRE);
 end(empty);
 give(empty,0,'deck',[LOW]);
 empty.phase='main';
 empty.extTasks=[{op:'g34_Mill',p:0,source:FIRE,n:1}];
 act(empty,'toAttack');
 drain(empty);
 assert.equal(empty.players[0].deck.length,0);
 assert.equal(empty.winner,null);
 end(empty);
 assert.equal(empty.winner,1);
});
