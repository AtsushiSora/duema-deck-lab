import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const JOE='dmex12-022',REPRINT='dmex17-Cho38',LIRIN='dmex12-052',ACID='dmex17-004';
const REPLACE='dm23ex2-071',FAIRY='dm06-108',DARK='dm01-090',FIRE='dm01-097',NATURE='dm01-108';
const MULTI='dmr21-l02',BIRDS='dmex18-029',VERDE='dmbd10-008',DASH='dmrp16-077';
const five=['光','水','闇','火','自然'];
const inZone=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const choices=s=>s.decision?.choices?.map(x=>x.value)??[];
const pick=(s,value)=>act(s,'extended',a=>(choices(s)[a.choice]?.uid??choices(s)[a.choice])===value);
function add(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
function play(s,id){
 const x=add(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&!a.face&&!a.alternative);
 return x;
}

test('Joe Star printed field and reprint preserve the canonical ID and Premium Hall limit',()=>{
 const m=read('tools/support-phase-1363.json'),db=createCatalogue(snapshot,data.cards,details);
 for(const row of [...m.cards,...m.printAliases]){
  const print=[...details.cards,...details.printAliases].find(x=>x.id===row.id);
  assert.deepEqual(print.faces,row.faces);
  assert.deepEqual(standardCardSpec(print,{phase:1363}),row.spec);
  const bad=structuredClone(print);
  bad.faces[0].abilityText+='未知の能力。';
  assert.throws(()=>standardCardSpec(bad,{phase:1363}));
  const art=read('tools/image-reference-prints.json').prints.find(x=>x.id===row.id);
  assert.equal(art.image,row.image);
 }
 const c=e.card(JOE);
 assert.deepEqual([c.type,c.cost,c.race,c.manaValue,c.limit],['field',3,'ジョーカーズ',1,0]);
 assert.equal(CARD_IMAGES[JOE],m.cards[0].image);
 assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[JOE]);
 const cards=db.resolveRows([{id:REPRINT,count:1},{id:JOE,count:1}]);
 assert.deepEqual(cards,[{id:JOE,count:2}]);
 assert.ok(e.validateDeck({cards}).some(error=>error.includes('希望のジョー星は0枚まで')));
});

test('QA 38608 applies Joe Star and Lirin in entry order across players and saved games',()=>{
 for(const starFirst of [false,true]){
  let s=setup();s.turn=3;
  if(starFirst){s.active=1;play(s,JOE);s.active=0;play(s,LIRIN);}
  else{play(s,LIRIN);s.active=1;play(s,JOE);}
  const fairy=add(s,0,'mana',FAIRY),other=add(s,0,'mana',FIRE);
  s=JSON.parse(JSON.stringify(s));
  assert.deepEqual(e.manaColors(e.card(fairy),s,0),starFirst?five:[]);
  assert.deepEqual(e.civilizations(e.zoneCard(s,0,fairy,'mana')),starFirst?five:[]);
  assert.deepEqual(e.manaColors(e.card(other),s,0),[]);
  assert.deepEqual(e.manaColors(e.card(fairy)),['自然']);
  s.active=1;
  play(s,REPLACE);
  assert.ok(s.players[1].grave.some(x=>x.cardId===JOE));
  assert.deepEqual(e.manaColors(e.card(fairy),s,0),five);
  assert.deepEqual(e.manaColors(e.card(other),s,0),['火']);
 }
});

test('QA 38606 and QA 38701 apply to both players and all zones, including Verde and twinpact faces',()=>{
 const s=setup();s.turn=3;
 const zones=['hand','deck','shields','mana','battle','grave','extra'];
 const before=s.players.map((_,p)=>zones.map(zone=>add(s,p,zone,FIRE)));
 const verde=play(s,VERDE),twin=add(s,1,'hand',LIRIN);
 drain(s);
 assert.deepEqual(e.civilizations(e.effectiveCard(verde,s)),five);
 const joe=play(s,JOE);
 for(const [p,instances] of before.entries())
  for(const [i,x] of instances.entries())
   assert.deepEqual(e.civilizations(e.zoneCard(s,p,x,zones[i])),[],zones[i]);
 assert.deepEqual(e.civilizations(e.effectiveCard(verde,s)),[]);
 assert.deepEqual(e.civilizations(e.zoneCard(s,1,twin,'hand').spellFace),[]);
 assert.deepEqual(e.civilizations(e.card(FIRE)),['火']);
 const extraJoe=play(s,REPLACE);
 assert.ok(inZone(s,0,'grave',joe)&&inZone(s,0,'battle',extraJoe));
 for(const [p,instances] of before.entries())
  for(const [i,x] of instances.entries())
   assert.deepEqual(e.civilizations(e.zoneCard(s,p,x,zones[i])),['火'],zones[i]);
 assert.deepEqual(e.civilizations(e.effectiveCard(verde,s)),five);
});

test('Rule bulletin 31641 lets Acid Techno deploy originally colored options from hand and library',()=>{
 for(const colorless of [false,true]){
  const s=setup();s.turn=3;
  if(colorless)play(s,JOE);
  play(s,ACID);
  const first=add(s,0,'battle',FIRE),second=add(s,0,'battle',NATURE);
  const hand=add(s,0,'hand',DARK);
  give(s,0,'deck',[FIRE,DARK,NATURE,FIRE,DARK,NATURE]);
  const library=s.players[0].deck[0];
  act(s,'toAttack');act(s,'endTurn');
  pick(s,first.uid);pick(s,second.uid);
  assert.ok(inZone(s,0,'grave',first)&&inZone(s,0,'grave',second));
  if(colorless){
   assert.ok(choices(s).some(x=>x?.uid===hand.uid));
   pick(s,hand.uid);pick(s,library.uid);
   assert.ok(inZone(s,0,'battle',hand)&&inZone(s,0,'battle',library));
   assert.ok(s.log.some(x=>x.type==='look'&&x.cardId===ACID));
   assert.ok(!s.log.some(x=>x.type==='reveal'&&x.cardId===ACID));
  }else{
   assert.ok(!choices(s).some(x=>x?.uid===hand.uid||x?.uid===library.uid));
   drain(s);
   assert.ok(inZone(s,0,'hand',hand)&&inZone(s,0,'deck',library));
  }
 }
});

test('QA 38699 places a printed multicolored card untapped without changing its mana value',()=>{
 for(const joe of [false,true]){
  const s=setup();s.turn=3;
  if(joe)play(s,JOE);
  s.phase='charge';
  const x=add(s,0,'hand',MULTI);
  act(s,'charge',a=>a.uid===x.uid);
  assert.equal(x.tapped,!joe);
  assert.equal(e.manaValue(e.zoneCard(s,0,x,'mana')),1);
 }
});

test('QA 38697 removes civilizations from a printed Kirifuda Dash cost',()=>{
 const s=setup();s.turn=3;
 play(s,JOE);
 give(s,0,'mana',[DARK,DARK]);
 const hand=add(s,0,'hand',DASH),attacker=add(s,0,'battle',NATURE);
 act(s,'toAttack');
 act(s,'attack',a=>a.uid===attacker.uid&&a.target==='player');
 if(s.decision?.type==='block')act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields');
 assert.equal(s.decision?.task?.op,'g14_DashDeclare');
 pick(s,true);
 assert.equal(s.decision?.task?.op,'g14_DashResolve');
 act(s,'extended',a=>choices(s)[a.choice]!==null);
 drain(s);
 assert.ok(inZone(s,0,'battle',hand));
 assert.ok(s.players[0].mana.every(x=>x.tapped));
});

test('QA 40872 allows Birds to pay with any color regardless of Joe Star entry order',()=>{
 for(const birdsFirst of [false,true]){
  const s=setup();s.turn=3;
  let birds;
  if(birdsFirst)birds=play(s,BIRDS);
  play(s,JOE);
  if(!birdsFirst)birds=play(s,BIRDS);
  birds.summonedTurn=1;
  const pool=e.paymentPool(s,0,[],e.card(FIRE));
  assert.ok(pool.find(x=>x.uid===birds.uid)?.paymentBird);
  assert.deepEqual(e.manaPayment(pool.filter(x=>x.uid===birds.uid),{cost:1,civilizations:['火']}),[birds.uid]);
  give(s,0,'mana',[DARK]);
  const hand=play(s,FIRE);
  assert.ok(inZone(s,0,'battle',hand));
  assert.ok(birds.tapped&&s.players[0].mana[0].tapped);
 }
});

test('QA 38698 prevents a command from removing a same-civilization seal',()=>{
 for(const joe of [false,true]){
  const s=setup();s.turn=3;
  if(joe)play(s,JOE);
  const sealed=add(s,0,'battle',DARK),seal=add(s,0,'seals',NATURE);
  seal.faceDown=true;seal.sealOf=sealed.uid;sealed.sealed=true;
  play(s,'dm01-s06');
  drain(s);
  assert.equal(inZone(s,0,'seals',seal),joe);
  assert.equal(inZone(s,0,'grave',seal),!joe);
 }
});

test('a creature copying Lirin gains its own timestamp and recovers printed color when Joe Star leaves',()=>{
 const s=setup();s.turn=3;s.active=1;
 const lirin=play(s,LIRIN);
 s.active=0;
 play(s,JOE);
 const fairy=add(s,0,'mana',FAIRY);
 assert.deepEqual(e.manaColors(e.card(fairy),s,0),[]);
 play(s,'dmex18-022');
 pick(s,lirin.uid);
 assert.deepEqual(e.manaColors(e.card(fairy),s,0),five);
 const colored=add(s,1,'battle',FIRE);
 const otherCopy=play(s,'dmex18-022');
 pick(s,colored.uid);
 assert.deepEqual(e.civilizations(e.effectiveCard(otherCopy,s)),[]);
 play(s,REPLACE);
 assert.deepEqual(e.civilizations(e.effectiveCard(otherCopy,s)),['火']);
 assert.deepEqual(e.manaColors(e.card(fairy),s,0),five);
});
