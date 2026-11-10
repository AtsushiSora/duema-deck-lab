import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const ZUBATTO='dmr02-027',BORDER='dmr03-031',CANOPUS='dm39-009';
const LAND='dm01-108',BIG='dm01-079',HAND='dm01-027',LIGHT='dm06-085',SURFER='dm05-024',CLOCK='dmr09-021';
const DOKKOI='dm26rp1-009',FUUJIN='dmrp22-037',SAVER='dmrp14-062',QX='dmrp07-m01';
const field=(active=0)=>Object.assign(setup(),{active});
const restore=s=>JSON.parse(JSON.stringify(s));
const values=s=>s.decision.choices.map(o=>o.value?.uid??o.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
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
function destroyWithHand(s,x){
 play(s,HAND);
 act(s,'effect',a=>a.targets.some(t=>t.uid===x.uid));
}
function end(s){
 s.phase='attack';
 act(s,'endTurn');
}

test('Phase 842 pins the full official faces, art and original canonical IDs',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-842.json',import.meta.url)));
 assert.deepEqual(m.cards.map(x=>x.id),[ZUBATTO,BORDER,CANOPUS]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id);
  assert.deepEqual(row.faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:842}),row.spec);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  const [face]=row.faces;
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations],[face.cost,parseInt(face.powerText,10),face.race,face.civilizations]);
  assert.equal(c.limit,4);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>x.name===c.name).map(x=>x.id),[row.id]);
  assert.deepEqual(snapshot.cards.filter(x=>x.name===c.name).map(x=>x.id),[row.id]);
  const unknown=structuredClone(d);
  unknown.faces[0].abilityText+='未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:842}));
 }
});

test('Zubatto counts itself and the other tapped creature and moves selected shield stacks together',()=>{
 let s=field(),a=put(s,0,'battle',ZUBATTO);
 put(s,0,'battle',LAND,{tapped:true});
 put(s,0,'battle',LAND);
 put(s,1,'battle',SAVER);
 const target=put(s,1,'battle',BIG,{tapped:true});
 const [first,second,third]=s.players[1].shields;
 const under=inst(LIGHT);first.shieldStack=[under];
 attack(s,a.uid,target.uid);
 assert.equal(s.decision.task.n,2);
 assert.equal(s.decision.player,0);
 pick(s,first.uid);s=restore(s);
 assert.equal(s.players[1].shields.length,5);
 pick(s,second.uid);drain(s);
 assert.ok([first,second,under].every(x=>has(s,1,'hand',x)));
 assert.ok(has(s,1,'shields',third));
 assert.equal(s.players[1].shields.length,3);
 assert.equal(s.metrics[0].breaks,0);
 assert.equal(s.players[1].brokenThisTurn||0,0);
 assert.ok(!s.log.some(x=>x.type==='break'));
});

test('Zubatto may name the same shield for two tapped creatures and moves it once',()=>{
 const s=field(),a=put(s,0,'battle',ZUBATTO);
 put(s,0,'battle',LAND,{tapped:true});
 const target=put(s,1,'battle',BIG,{tapped:true}),shield=s.players[1].shields[0];
 attack(s,a.uid,target.uid);
 pick(s,shield.uid);assert.ok(values(s).includes(shield.uid));
 pick(s,shield.uid);drain(s);
 assert.equal(s.players[1].shields.length,4);
 assert.equal(s.players[1].hand.filter(x=>x.uid===shield.uid).length,1);
});

test('Zubatto allows a spell Shield Trigger before the attack and removal cancels it (QA36388)',()=>{
 let s=field(),a=put(s,0,'battle',ZUBATTO);
 give(s,1,'shields',[HAND,LAND]);
 const trigger=s.players[1].shields[0];
 attack(s,a.uid);
 assert.equal(s.decision.task.n,1);
 pick(s,trigger.uid);s=restore(s);
 act(s,'useTrigger',x=>x.uid===trigger.uid);
 act(s,'effect',x=>x.targets.some(t=>t.uid===a.uid));
 drain(s);
 assert.ok(has(s,0,'grave',a)&&has(s,1,'grave',trigger));
 assert.equal(s.players[1].shields.length,1);
 assert.equal(s.metrics[0].breaks,0);
 assert.equal(s.attack,null);
});

test('Zubatto grants the non-break Shield Trigger to a creature and resumes on decline',()=>{
 const s=field(),a=put(s,0,'battle',ZUBATTO);
 give(s,1,'shields',[SURFER,LAND,LAND]);
 const [trigger,,third]=s.players[1].shields;
 attack(s,a.uid);pick(s,trigger.uid);
 assert.ok(e.getLegalActions(s).some(x=>x.kind==='useTrigger'&&x.uid===trigger.uid));
 act(s,'skipTrigger');
 act(s,'noBlock');drain(s);
 assert.ok(has(s,1,'hand',trigger));
 assert.ok(has(s,1,'shields',third));
 assert.equal(s.metrics[0].breaks,1);
});

test('Zubatto lets the Clock enter through a trigger and end the turn before the original attack',()=>{
 const s=field(),a=put(s,0,'battle',ZUBATTO);
 give(s,1,'shields',[CLOCK,LAND]);
 const trigger=s.players[1].shields[0];
 attack(s,a.uid);pick(s,trigger.uid);
 act(s,'useTrigger',x=>x.uid===trigger.uid);drain(s);
 assert.ok(has(s,1,'battle',trigger));
 assert.equal(s.active,1);
 assert.equal(s.attack,null);
 assert.equal(s.metrics[0].breaks,0);
 assert.equal(s.players[1].shields.length,1);
});

test('Zubatto can attack directly after moving the only shield without breaking it',()=>{
 const s=field(),a=put(s,0,'battle',ZUBATTO);
 give(s,1,'shields',[LAND]);
 attack(s,a.uid);pick(s,s.players[1].shields[0].uid);
 act(s,'noBlock');
 assert.equal(s.winner,0);
 assert.equal(s.metrics[0].breaks,0);
});

test('Overborder enters mana tapped both on charge and from battle',()=>{
 const s=field(),x=put(s,0,'hand',BORDER);
 s.phase='charge';
 act(s,'charge',a=>a.uid===x.uid);
 assert.ok(has(s,0,'mana',x)&&x.tapped);
 const target=put(s,1,'battle',BORDER);
 play(s,'dm01-039');
 act(s,'effect',a=>a.targets.some(t=>t.uid===target.uid));
 drain(s);
 assert.ok(has(s,1,'mana',target)&&target.tapped);
});

test('Overborder has 5000 attack power and shields itself face down when destroyed in battle',()=>{
 const s=field(),x=put(s,0,'battle',BORDER);
 const target=put(s,1,'battle',ZUBATTO,{tapped:true});
 assert.equal(e.power(x,false,s),3000);
 assert.equal(e.power(x,true,s),5000);
 attack(s,x.uid,target.uid);drain(s);
 assert.ok(has(s,0,'battle',x)&&has(s,1,'grave',target));
 s.active=1;
 const attacker=put(s,1,'battle',ZUBATTO);
 attack(s,attacker.uid,x.uid);drain(s);
 const shield=s.players[0].shields.find(y=>y.uid===x.uid);
 assert.ok(shield&&!shield.faceUp);
 assert.ok(!has(s,0,'grave',x));
});

test('Overborder replaces destruction by a spell and leaves normally if shields cannot be added',()=>{
 for(const locked of [false,true]){
  const s=field(locked?0:1),x=put(s,0,'battle',BORDER);
  if(locked)put(s,1,'battle',FUUJIN);
  if(locked){
   const target=put(s,1,'battle','dm10-006',{tapped:true});
   attack(s,x.uid,target.uid);drain(s);
  }else destroyWithHand(s,x);
  assert.equal(has(s,0,'shields',x),!locked);
  assert.equal(has(s,0,'grave',x),locked);
 }
});

for(const toShield of [false,true])test('Overborder can choose between competing mandatory replacements '+toShield,()=>{
 let s=field(1),x=put(s,0,'battle',BORDER);
 put(s,0,'battle',DOKKOI);
 destroyWithHand(s,x);s=restore(s);
 assert.equal(s.decision.type,'leaveReplace');
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='allowLeave'));
 if(toShield)act(s,'replaceShield842');
 else act(s,'g47Replace',a=>a.choice.to==='hand');
 assert.equal(has(s,0,'shields',x),toShield);
 assert.equal(has(s,0,'hand',x),!toShield);
 assert.ok(!has(s,0,'grave',x));
});

test('Canopus may discard a creature face only, then picks hand, bottom and remaining top',()=>{
 let s=field();
 put(s,0,'battle',CANOPUS);
 const twin=put(s,0,'hand','dm23ex2-098'),spell=put(s,0,'hand',HAND);
 give(s,0,'deck',[LAND,LIGHT,BORDER,BIG]);
 const [a,b,c,d]=s.players[0].deck;
 end(s);assert.deepEqual(values(s),[twin.uid,null]);pick(s,twin.uid);
 assert.deepEqual(values(s),[a.uid,b.uid,c.uid]);
 s=restore(s);pick(s,b.uid);assert.deepEqual(values(s),[a.uid,c.uid]);
 pick(s,a.uid);drain(s);
 assert.ok(has(s,0,'grave',twin)&&has(s,0,'hand',b)&&has(s,0,'hand',spell));
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),[c.uid,d.uid,a.uid]);
 assert.deepEqual(s.players[0].g34Protected,[]);
 assert.equal(s.players[0].drawsThisTurn||0,0);
 assert.ok(!s.log.some(x=>x.type==='reveal'&&x.cardId===CANOPUS));
});

test('Canopus may decline, does not trigger on the opponent turn, and is a double breaker',()=>{
 for(const active of [0,1]){
  const s=field(active),x=put(s,0,'battle',CANOPUS),cost=put(s,0,'hand',LAND);
  end(s);
  if(active===0){assert.deepEqual(values(s),[cost.uid,null]);pick(s,null);}
  assert.equal(s.decision,null);
  assert.ok(has(s,0,'hand',cost));
  assert.equal(e.effectiveCard(x,s).breaker,2);
 }
});

for(const n of [1,2])test('Canopus resolves a library with '+n+' cards (QA36235/36236)',()=>{
 const s=field(),cost=put(s,0,'hand',LAND);
 put(s,0,'battle',CANOPUS);
 give(s,0,'deck',[LIGHT,BORDER].slice(0,n));
 const [first,second]=s.players[0].deck;
 end(s);pick(s,cost.uid);pick(s,first.uid);
 assert.ok(has(s,0,'hand',first));
 assert.equal(s.winner,n===1?1:null);
 if(second){assert.equal(s.players[0].deck[0].uid,second.uid);assert.equal(s.decision,null);}
});

test('Canopus can pay the optional discard without looking when the library is locked',()=>{
 const s=field(),cost=put(s,0,'hand',LAND);
 put(s,0,'battle',CANOPUS);
 put(s,1,'battle',QX);
 give(s,0,'deck',[LIGHT,BORDER,LAND]);
 const original=s.players[0].deck.map(x=>x.uid);
 end(s);pick(s,cost.uid);
 assert.equal(s.decision,null);
 assert.ok(has(s,0,'grave',cost));
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),original);
});
