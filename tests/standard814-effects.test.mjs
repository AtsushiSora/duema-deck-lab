import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-814.json',import.meta.url)));
const BA='dm29-021',MIL='dm28-070',RIO='dm29-023',RAL='dm29-001';
const NATURE='dm01-108',GEAR='dm14-110',STRONG='dm01-036',W='dm05-015',INFINITY='dmr10-015';
const NULL='dm25rp3-060';
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 814 definitions preserve their canonical saved deck IDs',()=>{
 assert.equal(cards.length,4);
 assert.deepEqual(printAliases,[]);
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:814}));
  assert.throws(()=>standardCardSpec(detail,{phase:813}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:814}));
  assert.deepEqual(registry.cards.filter(c=>canonicalCardName(c.name)===canonicalCardName(row.name)).map(c=>c.id),[row.id]);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[key],value);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:row.id,count:1});
  deck.cards=registry.resolveRows(deck.cards);
  assert.equal(deck.cards.at(-1).id,row.id);
  assert.deepEqual(e.validateDeck(deck),[]);
 }
});

const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);
const targets=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const canBlock=(s,x)=>e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===x.uid);
const chooseShields=(s,ids)=>act(s,'breakShields',a=>a.shields.every(uid=>ids.includes(uid)));

for(const use of [true,false])test('Ba Keen may select only opposing Cross Gear: '+use,()=>{
 const s=setup(),source=put(s,0,'hand',BA);
 const ally=put(s,0,'battle',GEAR),gear=put(s,1,'battle',GEAR),target=put(s,1,'battle',NATURE);
 play(s,source);
 assert.deepEqual(targets(s),[gear.uid,null]);
 pick(s,use?gear.uid:null);
 assert.equal(has(s,1,'grave',gear),use);
 assert.ok(has(s,0,'battle',ally)&&has(s,1,'battle',target));
 source.entered=0;
 target.tapped=true;
 act(s,'toAttack');
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===source.uid).map(a=>a.target),[target.uid]);
});

test('Ba Keen uses S Trigger, destroys an opposing Cross Gear and can block a later attack',()=>{
 const s=setup(),first=put(s,0,'battle',NATURE),second=put(s,0,'battle',NATURE);
 const gear=put(s,0,'battle',GEAR);
 give(s,1,'shields',[BA,NATURE]);
 const source=s.players[1].shields[0];
 attack(s,first.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 pick(s,gear.uid);
 assert.ok(has(s,1,'battle',source)&&has(s,0,'grave',gear));
 assert.ok(s.players[1].mana.every(x=>!x.tapped));
 attack(s,second.uid);
 assert.ok(canBlock(s,source));
});

for(const use of [true,false])test('Milous may tap one opposing creature on entry: '+use,()=>{
 const s=setup(),ally=put(s,0,'battle',NATURE),target=put(s,1,'battle',NATURE);
 const gear=put(s,1,'battle',GEAR);
 play(s,put(s,0,'hand',MIL));
 assert.ok(targets(s).includes(target.uid));
 assert.ok(!targets(s).includes(ally.uid)&&!targets(s).includes(gear.uid));
 pick(s,use?target.uid:null);
 assert.equal(target.tapped,use);
});

for(const block of [true,false])test('Milous is a blocker only through the attack on its ally: '+block,()=>{
 let s=setup();
 const first=put(s,0,'battle',NATURE),second=put(s,0,'battle',NATURE);
 const target=put(s,1,'battle',STRONG),mil=put(s,1,'battle',MIL);
 target.tapped=true;
 assert.ok(!e.effectiveCard(mil,s).blocker);
 attack(s,first.uid,target.uid);
 assert.ok(canBlock(s,mil));
 const view=e.observation(s,1);
 assert.ok(e.effectiveCard(view.players[1].battle[1],view).blocker);
 s=JSON.parse(JSON.stringify(s));
 if(block)act(s,'block',a=>a.uid===mil.uid);
 else act(s,'noBlock');
 assert.ok(has(s,0,'grave',first));
 assert.equal(s.players[1].battle.find(x=>x.uid===mil.uid).tapped,block);
 assert.ok(!e.effectiveCard(s.players[1].battle.find(x=>x.uid===mil.uid),s).blocker);
 attack(s,second.uid);
 assert.ok(!canBlock(s,mil));
});

test('Rio triggers after a shield break, stacks on each later attack, and expires at turn end',()=>{
 const s=setup();
 const [first,second,third]=Array.from({length:3},()=>put(s,0,'battle',NATURE));
 const rio=put(s,1,'battle',RIO);
 rio.tapped=true;
 attack(s,first.uid);
 assert.ok(!canBlock(s,rio));
 act(s,'noBlock');
 assert.equal(s.players[1].brokenThisTurn,1);
 assert.equal(e.power(rio,false,s),2000);
 for(const [i,x] of [second,third].entries()){
  attack(s,x.uid);
  assert.ok(canBlock(s,rio));
  assert.equal(e.power(rio,false,s),7000+5000*i);
  act(s,'block',a=>a.uid===rio.uid);
  assert.ok(has(s,0,'grave',x));
 }
 act(s,'endTurn');
 assert.equal(e.power(rio,false,s),2000);
 assert.ok(!e.effectiveCard(rio,s).blocker);
});

test('Rio uses earlier effect breaks, while an earlier shield sent to the grave does not count',()=>{
 for(const broken of [true,false]){
  const s=setup();
  const source=put(s,0,'battle','dmrp14-004'),enemy=put(s,1,'battle',NATURE);
  const rio=put(s,1,'battle',RIO),later=put(s,0,'battle',NATURE);
  rio.tapped=true;
  if(broken){
   enemy.tapped=true;
   attack(s,source.uid,enemy.uid);
   act(s,'noBlock');
   pick(s,s.players[1].shields[0].uid);
  }else{
   const shield=s.players[1].shields[0];
   play(s,put(s,0,'hand','dm06-008'));
   pick(s,shield.uid);
   pick(s,null);
   assert.ok(has(s,1,'grave',shield));
  }
  attack(s,later.uid);
  assert.equal(canBlock(s,rio),broken);
 }
});

test('Ral caps a W breaker plus an extra break and lets the attacker select the shield',()=>{
 let s=setup();
 const source=put(s,0,'battle',W),ral=put(s,1,'battle',RAL);
 put(s,0,'battle','dm28-030');
 const shield=s.players[1].shields[3];
 attack(s,source.uid);
 assert.ok(canBlock(s,ral));
 act(s,'noBlock');
 assert.equal(s.decision.count,1);
 s=JSON.parse(JSON.stringify(s));
 chooseShields(s,[shield.uid]);
 assert.ok(has(s,1,'hand',shield));
 assert.equal(s.players[1].shields.length,4);
});

for(const n of [0,1])test('Ral leaves the infinity breaker choice from zero to one: '+n,()=>{
 const s=setup(),source=put(s,0,'battle',INFINITY);
 put(s,1,'battle',RAL);
 attack(s,source.uid);
 act(s,'noBlock');
 assert.deepEqual(e.getLegalActions(s).map(a=>a.n),[0,1]);
 act(s,'infinityCount',a=>a.n===n);
 if(n){
  const shield=s.players[1].shields[3];
  act(s,'infinityShield',a=>a.shield===shield.uid);
  assert.ok(has(s,1,'hand',shield));
 }
 assert.equal(s.players[1].shields.length,5-n);
});

test('Ral does not turn a Null breaker into a shield break',()=>{
 const s=setup(),source=put(s,0,'battle',NULL);
 put(s,1,'battle',RAL);
 attack(s,source.uid);
 act(s,'noBlock');
 assert.equal(s.decision,null);
 assert.equal(s.players[1].shields.length,5);
});

test('Ral does not limit an effect break caused during an attack',()=>{
 const s=setup(),source=put(s,0,'battle','dmrp14-004'),enemy=put(s,1,'battle',NATURE);
 put(s,0,'battle','dm28-030');
 put(s,1,'battle',RAL);
 enemy.tapped=true;
 const [first,second]=s.players[1].shields;
 attack(s,source.uid,enemy.uid);
 act(s,'noBlock');
 pick(s,first.uid);
 assert.equal(s.decision?.task?.op,'g34_Break497');
 pick(s,second.uid);
 assert.equal(s.players[1].shields.length,3);
});

test('Ral loses its cap while ignored and cannot itself attack the opponent',()=>{
 const s=setup(),source=put(s,0,'battle',W),ral=put(s,1,'battle',RAL);
 s.active=1;
 s.phase='attack';
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===ral.uid&&a.target==='player'));
 s.active=0;
 ral.g35Ignored=s.turn;
 attack(s,source.uid);
 act(s,'noBlock');
 assert.equal(s.decision.count,2);
});

for(const id of ['dmr04-011','promoy17-057'])test('Ral limits the defending shields even against an all-shields breaker: '+id,()=>{
 const s=setup(),source=put(s,0,'battle',id);
 put(s,1,'battle',RAL);
 const shield=s.players[1].shields[2];
 attack(s,source.uid);
 act(s,'noBlock');
 assert.equal(s.decision?.count,1);
 chooseShields(s,[shield.uid]);
 drain(s);
 assert.equal(s.players[1].shields.length,4);
 assert.equal(s.players[0].shields.length,id==='promoy17-057'?0:5);
});

test('A shield trigger that returns Ral does not reopen the same break but restores the next one',()=>{
 const s=setup(),first=put(s,0,'battle',W),second=put(s,0,'battle',W),ral=put(s,1,'battle',RAL);
 give(s,1,'shields',['dm01-086',NATURE,NATURE,NATURE,NATURE]);
 const shield=s.players[1].shields[0];
 attack(s,first.uid);
 act(s,'noBlock');
 chooseShields(s,[shield.uid]);
 act(s,'useTrigger');
 act(s,'effect',a=>a.targets.some(t=>t.uid===ral.uid));
 assert.ok(has(s,1,'hand',ral));
 assert.equal(s.players[1].shields.length,4);
 attack(s,second.uid);
 act(s,'noBlock');
 assert.equal(s.decision.count,2);
});
