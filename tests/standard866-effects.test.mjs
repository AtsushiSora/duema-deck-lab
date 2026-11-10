import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,cast} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const BELLA='dmr04-046',REPRINT='dmex12-109',ARES='dm36-090',PILLAR='dmr02-045';
const NATURE='dm01-108',DARK='dm01-090',FIRE='dm01-097',WATER='dm01-083';
const QX='dmrp07-m01',TSUBASA='dmrp22-030';
const field=()=>{
 const s=setup();
 for(const p of [0,1]){
  give(s,p,'deck',Array(12).fill(NATURE));
  give(s,p,'grave',[]);
 }
 return s;
};
function add(s,p,zone,id,props){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,x)=>act(s,'extended',a=>values(s)[a.choice]===x.uid);
const skip=s=>act(s,'extended',a=>values(s)[a.choice]===null);
const ids=xs=>xs.map(x=>x.uid);
const has=(s,p,zone,x)=>ids(s.players[p][zone]).includes(x.uid);
function enemy(s,power,id=FIRE){
 return add(s,1,'battle',id,{powerModifiers:[{amount:power-e.card(id).power,expires:'end',who:s.active}]});
}

test('Phase 866 registers three whole cards and resolves Bella’s reprint to the existing ID',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-866.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[BELLA,ARES,PILLAR]);
 assert.deepEqual(m.printAliases.map(({id,canonicalId})=>[id,canonicalId]),[[REPRINT,BELLA]]);
 assert.deepEqual(registry.resolveRows([{id:REPRINT,count:1},{id:BELLA,count:3}]),[{id:BELLA,count:4}]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(d.faces,row.faces);
  assert.deepEqual(standardCardSpec(d,{phase:866}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:865}));
  const unknown=structuredClone(d);
  unknown.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:866}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.cost,c.civilizations,c.manaValue,c.limit],[f.cost,f.civilizations,1,4]);
  if(c.type==='creature')assert.deepEqual([c.power,c.race],[Number(f.powerText),f.race]);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);
 }
 assert.deepEqual(e.card(ARES).g558Souls,['E']);
});

test('Bella publicly reveals the opponent’s top two, lets its controller choose either, and leaves the other on top (QA 36540)',()=>{
 for(const index of [0,1]){
  let s=field();
  give(s,1,'deck',[DARK,FIRE,WATER]);
  const before=s.players[1].deck.slice();
  cast(s,BELLA);
  assert.equal(s.decision.player,0);
  assert.deepEqual(values(s),ids(before.slice(0,2)));
  assert.ok(s.log.some(x=>x.type==='reveal'&&x.cardId===BELLA&&before.slice(0,2).every(y=>x.text.includes(e.card(y).name))));
  s=JSON.parse(JSON.stringify(s));
  pick(s,before[index]);
  assert.deepEqual(ids(s.players[1].deck),ids(before.filter((_,i)=>i!==index)));
  assert.deepEqual(ids(s.players[1].grave),[before[index].uid]);
  assert.deepEqual(s.players[1].g34Protected,[]);
  assert.equal(s.winner,null);
 }
 const s=field(),copy=add(s,0,'hand',BELLA);
 s.phase='charge';
 act(s,'charge',a=>a.uid===copy.uid);
 assert.ok(copy.tapped&&has(s,0,'mana',copy));
});

test('Bella sends the only remaining card to the grave and wins immediately (QA 36541)',()=>{
 const s=field();
 give(s,1,'deck',[DARK]);
 const [last]=s.players[1].deck;
 cast(s,BELLA);
 assert.deepEqual(values(s),[last.uid]);
 pick(s,last);
 assert.deepEqual(s.players[1].deck,[]);
 assert.ok(has(s,1,'grave',last));
 assert.equal(s.winner,0);
});

test('Bella observes reveal restrictions on the library owner',()=>{
 for(const lock of [QX,TSUBASA]){
  const s=field();
  add(s,0,'battle',lock);
  give(s,1,'deck',[DARK,FIRE,WATER]);
  const [first,second,third]=s.players[1].deck;
  cast(s,BELLA);
  if(lock===QX){
   assert.equal(s.decision,null);
   assert.deepEqual(ids(s.players[1].deck),ids([first,second,third]));
  }else{
   assert.deepEqual(values(s),[first.uid]);
   pick(s,first);
   assert.deepEqual(ids(s.players[1].deck),ids([second,third]));
  }
 }
});

test('Ares returns exactly three grave cards in the chosen order and then reduces one enemy by 3000',()=>{
 for(const power of [3000,5000]){
  const s=field(),ares=add(s,0,'battle',ARES),target=enemy(s,power);
  const ally=add(s,0,'battle',FIRE),other=enemy(s,6000);
  const payment=[DARK,FIRE,WATER,NATURE].map(id=>add(s,0,'grave',id));
  attack(s,ares.uid);
  for(const i of [2,0,1])pick(s,payment[i]);
  assert.deepEqual(ids(s.players[0].deck.slice(-3)),ids([payment[2],payment[0],payment[1]]));
  assert.deepEqual(ids(s.players[0].grave),[payment[3].uid]);
  assert.deepEqual(values(s),[target.uid,other.uid]);
  pick(s,target);
  if(power===3000)assert.ok(has(s,1,'grave',target));
  else assert.equal(e.power(target,false,s),2000);
  assert.ok(has(s,0,'battle',ally)&&has(s,1,'battle',other));
 }
});

test('Ares leaves the grave unchanged when declined after two selections or when fewer than three cards are available',()=>{
 for(const n of [2,3]){
  const s=field(),ares=add(s,0,'battle',ARES),target=enemy(s,3000);
  const payment=[DARK,FIRE,WATER].slice(0,n).map(id=>add(s,0,'grave',id));
  const before=ids(s.players[0].deck);
  attack(s,ares.uid);
  if(n===3){pick(s,payment[0]);pick(s,payment[1]);skip(s);}
  assert.notEqual(s.decision?.type,'extended');
  assert.deepEqual(ids(s.players[0].grave),ids(payment));
  assert.deepEqual(ids(s.players[0].deck),before);
  assert.ok(has(s,1,'battle',target));
 }
});

test('Pillar checks allied darkness or nature and uses current power with an inclusive threshold',()=>{
 for(const allyId of [FIRE,DARK,NATURE]){
  const s=field(),ally=add(s,0,'battle',allyId);
  const low=enemy(s,4000,DARK),medium=enemy(s,4001),high=enemy(s,7000),above=enemy(s,7001);
  cast(s,PILLAR);
  const boosted=allyId!==FIRE;
  assert.deepEqual(values(s),boosted?ids([low,medium,high]):[low.uid]);
  pick(s,boosted?high:low);
  assert.ok(has(s,1,'grave',boosted?high:low));
  assert.ok(has(s,0,'battle',ally)&&has(s,1,'battle',above));
 }
});

test('Pillar can be cast for free as a Shield Trigger on the opponent’s turn',()=>{
 const s=field(),attacker=enemy(s,7000);
 add(s,0,'battle',NATURE);
 give(s,0,'shields',[PILLAR]);
 s.active=1;
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 assert.deepEqual(values(s),[attacker.uid]);
 pick(s,attacker);
 assert.ok(has(s,1,'grave',attacker));
 assert.equal(s.metrics[0].triggers,1);
 assert.ok(s.players[0].mana.every(x=>!x.tapped));
});
