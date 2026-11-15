import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,cast,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';

const WINNY='dm26rp3-028',NEONY='dm26rp3-032',GEONY='dm26rp3-036',SUIDO='dm26rp3-033';
const twins=[WINNY,NEONY,GEONY];
const BASIC='dm01-108',LIGHT='dm01-076',WATER='dm01-083',SEED='dm26rp3-061';
const KAMA='dmrp01-041',BLOCKER='dmr22-033',REMOVAL='dm01-027',POPPY='dm23rp3-011';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
function field(){
 const s=setup();
 s.active=0;
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(BASIC));
 return s;
}
function add(s,p,z,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][z].push(x);
 return x;
}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const value=c=>c.value?.uid??c.value;
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
const choices=s=>s.decision?.choices?.map(value)??[];

test('four verified original IDs resolve with the current limits, image and complete ability',()=>{
 const m=read('tools/support-phase-1320.json'),registry=createCatalogue(snapshot,data.cards,details);
 const {prints}=read('tools/image-reference-prints.json');
 assert.deepEqual(m.cards.map(c=>c.id),[...twins,SUIDO]);
 assert.deepEqual(m.printAliases,[]);
 for(const {id,name,image,source,faces,spec} of m.cards){
  const c=e.card(id),f=faces[0];
  assert.deepEqual(standardCardSpec({id,name,faces,status:'complete'},{phase:1320}),spec);
  assert.deepEqual(prints.find(x=>x.id===id),{id,canonicalId:id,name,image,source});
  assert.deepEqual(registry.resolveRows([{id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.limit,e.manaValue(c)],
   [f.cost,Number(f.powerText)||0,f.race,f.civilizations,4,1]);
  for(const [key,v] of Object.entries(spec))assert.deepEqual(c[key],v);
  assert.equal(CARD_IMAGES[id],image);
  assert.equal(e.playFaces(c).length,faces.length);
  assert.deepEqual(e.playFaces(c).map(f=>[f.name,f.cost]),faces.map(f=>[f.name,f.cost]));
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id,count:1});
  assert.deepEqual(e.validateDeck({...deck,cards:registry.resolveRows(deck.cards)}),[]);
 }
});

const end=s=>{s.phase='attack';act(s,'endTurn');drain(s);};
const play=(s,id,face=0)=>{
 const x=add(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&(a.face||0)===face&&!a.alternative);
 return x;
};
const top=(s,p,ids)=>{
 const xs=ids.map(inst);
 s.players[p].deck.unshift(...xs);
 return xs;
};
const tappedMana=(s,p)=>s.players[p].mana.filter(x=>x.tapped).length;

const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const locks=(s,card)=>s.extLimits?.filter(x=>x.g190Freeze&&x.ref?.uid===card.uid)??[];

for(const id of twins)test('EX Life places the exact top card before entry and replaces the first departure '+id,()=>{
 const s=field(),nextShield=s.players[0].deck[0],normalShield=s.players[0].shields[0],
  c=play(s,id);
 assert.ok(has(s,0,'battle',c));
 assert.deepEqual(e.exLifeShields(s,0,c).map(x=>x.uid),[nextShield.uid]);
 assert.equal(tappedMana(s,0),5);
 s.active=1;
 play(s,REMOVAL);
 act(s,'effect',a=>a.targets[0].uid===c.uid);
 drain(s);
 assert.ok(has(s,0,'grave',nextShield)&&has(s,0,'shields',normalShield)&&has(s,0,'battle',c));
 play(s,REMOVAL);
 act(s,'effect',a=>a.targets[0].uid===c.uid);
 drain(s);
 assert.ok(has(s,0,'grave',c));
});

test('Winny spell draws first, then may deploy the drawn Tamaseed without an extra mana payment',()=>{
 const s=field(),ok=add(s,0,'hand',BASIC),costly=add(s,0,'hand',SUIDO),[drawn]=top(s,0,[SEED]);
 const spell=play(s,WINNY,1);
 assert.ok(has(s,0,'hand',drawn));
 assert.deepEqual(choices(s),[ok.uid,drawn.uid,null]);
 pick(s,drawn.uid);
 drain(s);
 assert.ok(has(s,0,'battle',drawn)&&!e.isCreature(s,drawn)&&has(s,0,'hand',costly));
 assert.ok(has(s,0,'grave',spell));
 assert.equal(tappedMana(s,0),3);
});

for(const id of twins)test('Smash Burst uses the actual spell side while preserving the creature and EX Life '+id,()=>{
 let s=field();
 const c=play(s,id),target=add(s,1,'battle',BLOCKER),shield=e.exLifeShields(s,0,c)[0];
 const card=add(s,0,'hand',BASIC);
 const [a,b]=s.players[0].deck;
 const before=physical(s);
 end(s);
 end(s);
 attack(s,c.uid);
 assert.equal(s.decision.task.op,'g34_Smash320');
 assert.ok(s.decision.choices[0].label.includes(e.playFaces(e.card(id))[1].name));
 s=JSON.parse(JSON.stringify(s));
 pick(s,true);
 if(id===WINNY){
  assert.ok(choices(s).includes(card.uid));
  pick(s,card.uid);
  assert.ok(has(s,0,'battle',card));
 }else{
  pick(s,target.uid);
  if(id===NEONY){
   assert.deepEqual(locks(s,target).map(l=>l.kind).sort(),['attack','block']);
   assert.ok(!e.getLegalActions(s).some(action=>action.kind==='block'&&action.uid===target.uid));
  }else{
   assert.equal(e.power(s.players[1].battle.find(x=>x.uid===target.uid),false,s),1000);
  }
 }
 drain(s);
 assert.ok(has(s,0,'battle',c)&&has(s,0,'shields',shield));
 assert.ok(!has(s,0,'grave',c));
 assert.equal(tappedMana(s,0),0);
 assert.equal(has(s,0,'hand',a),true);
 assert.equal(has(s,0,'hand',b),id!==GEONY);
 assert.deepEqual(physical(s),before);
});

test('Winny can decline Smash Burst and respects the restriction on casting from battle',()=>{
 for(const blocked of [false,true]){
  const s=field(),c=add(s,0,'battle',WINNY),deck=s.players[0].deck.map(x=>x.uid);
  if(blocked)add(s,1,'battle',POPPY);
  attack(s,c.uid);
  assert.equal(s.decision?.task?.op==='g34_Smash320',!blocked);
  if(!blocked)pick(s,null);
  drain(s);
  assert.deepEqual(s.players[0].deck.map(x=>x.uid),deck);
  assert.ok(has(s,0,'battle',c));
 }
});

test('Neony spell draws two then locks just the chosen creature until the next own start',()=>{
 const s=field(),target=add(s,1,'battle',BLOCKER),other=add(s,1,'battle',BASIC),
  protectedUnit=add(s,1,'battle',KAMA),[a,b]=top(s,0,[BASIC,LIGHT]);
 const spell=play(s,NEONY,1);
 assert.ok(has(s,0,'hand',a)&&has(s,0,'hand',b));
 assert.deepEqual(choices(s),[target.uid,other.uid]);
 pick(s,target.uid);
 assert.equal(locks(s,target).length,2);
 assert.equal(locks(s,other).length,0);
 assert.ok(has(s,1,'battle',protectedUnit)&&has(s,0,'grave',spell));
 assert.equal(tappedMana(s,0),4);
 end(s);
 assert.equal(locks(s,target).length,2);
 end(s);
 assert.equal(locks(s,target).length,0);
});

test('Geony spell removes a zero-power creature after consuming its remaining EX Life under QA 46568',()=>{
 const s=field(),c=play(s,WINNY),shield=e.exLifeShields(s,0,c)[0];
 c.powerModifiers=[{amount:-2500}];
 s.active=1;
 const spell=play(s,GEONY,1);
 assert.deepEqual(choices(s),[c.uid]);
 pick(s,c.uid);
 drain(s);
 assert.ok(has(s,0,'grave',c)&&has(s,0,'grave',shield)&&has(s,1,'grave',spell));
 assert.ok(s.players[0].grave.findIndex(x=>x.uid===shield.uid)<s.players[0].grave.findIndex(x=>x.uid===c.uid));
 assert.equal(tappedMana(s,1),1);
});

test('Suido can shield trigger and stop at most two opposing creatures until its next own start',()=>{
 const s=field();
 s.active=1;
 give(s,0,'shields',[SUIDO,BASIC,BASIC]);
 give(s,0,'mana',[]);
 const c=s.players[0].shields[0],attacker=add(s,1,'battle',BASIC),
  second=add(s,1,'battle',BLOCKER),third=add(s,1,'battle',LIGHT);
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 assert.ok(has(s,0,'battle',c)&&tappedMana(s,0)===0);
 assert.deepEqual(choices(s),[attacker.uid,second.uid,third.uid,null]);
 pick(s,attacker.uid);
 assert.ok(!choices(s).includes(attacker.uid));
 pick(s,second.uid);
 assert.equal(locks(s,attacker).length,2);
 assert.equal(locks(s,second).length,2);
 assert.equal(locks(s,third).length,0);
 end(s);
 assert.equal(locks(s,attacker).length,0);
 assert.equal(locks(s,second).length,0);
});

for(const mode of ['return','replace','decline'])test('Suido J Tornado resolves the attempted payment and the draw-before-discard order '+mode,()=>{
 const s=field(),c=add(s,0,'battle',SUIDO),nonJoker=add(s,0,'battle',BASIC),seed=add(s,0,'battle',SEED);
 const joker=mode==='replace'?play(s,WINNY):add(s,0,'battle',WINNY),shield=e.exLifeShields(s,0,joker)[0];
 const draws=top(s,0,[BASIC,WATER,LIGHT]);
 attack(s,c.uid);
 assert.deepEqual(choices(s),[joker.uid,null]);
 assert.ok(!choices(s).includes(nonJoker.uid)&&!choices(s).includes(seed.uid));
 pick(s,mode==='decline'?null:joker.uid);
 if(mode==='decline'){
  drain(s);
  assert.ok(draws.every(x=>has(s,0,'deck',x)));
  return;
 }
 assert.ok(draws.every(x=>has(s,0,'hand',x)));
 assert.equal(s.decision.task.op,'discard');
 pick(s,draws[1].uid);
 drain(s);
 assert.ok(has(s,0,'grave',draws[1]));
 if(mode==='replace')assert.ok(has(s,0,'battle',joker)&&has(s,0,'grave',shield));
 else assert.ok(has(s,0,'hand',joker));
});
