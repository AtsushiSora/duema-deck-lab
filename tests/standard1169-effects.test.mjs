import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const LEGEND='dmex14-072',HAKUMEI='dmex14-093',BAKUGEKI='dmrp03-075';
const FIRE='dm01-097',NATURE='dm01-108',WATER='dm01-083',MULTI='dmex12-074';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url)));
function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(NATURE));
 return s;
}
function put(s,p,zone,id,properties={}){
 const x=Object.assign(inst(id),properties);
 s.players[p][zone].push(x);
 return x;
}
function pick(s,value){
 act(s,'extended',a=>{
  const v=s.decision.choices[a.choice].value;
  return (v?.uid??v)===value;
 });
}

test('phase 1169 verifies official definitions and all three reprint IDs',()=>{
 const m=read('tools/support-phase-1169.json'),registry=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(x=>x.id),[LEGEND,HAKUMEI,BAKUGEKI]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[['dmex16-067',HAKUMEI],['dmex07-038',BAKUGEKI],['dm23ex2-096',BAKUGEKI]]);
 for(const row of [...m.cards,...m.printAliases]){
  const canonical=row.canonicalId??row.id,c=e.card(canonical),f=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1169}),row.spec);
  assert.deepEqual([c.type,c.cost,c.civilizations,c.race,c.power,c.manaValue,c.limit],
   [canonical===LEGEND?'spell':'creature',f.cost,f.civilizations,f.race,Number(f.powerText),1,4]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.equal(registry.get(row.id).id,canonical);
  assert.equal(registry.byName.get(nameKey(row.name)).id,canonical);
  assert.ok(refs.some(x=>x.id===row.id&&x.canonicalId===canonical&&x.image===row.image));
  if(!row.canonicalId){
   assert.equal(CARD_IMAGES[row.id],row.image);
   assert.deepEqual(details.cards.find(x=>x.id===row.id).faces,row.faces);
  }
  assert.throws(()=>standardCardSpec({...row,status:'complete',faces:[{...f,abilityText:f.abilityText+'\n未知の能力。'}]},{phase:1169}));
 }
});

test('Legend reveals one multicolor card and untaps only the mana card, with an optional decline',()=>{
 for(const accept of [true,false]){
  const s=field(),own=s.players[0],legend=put(s,0,'hand',LEGEND);
  const mono=put(s,0,'hand',FIRE),multi=put(s,0,'hand',MULTI);
  own.mana[0].tapped=true;
  s.phase='charge';
  act(s,'charge',a=>a.uid===legend.uid);
  assert.equal(legend.tapped,true);
  assert.deepEqual(s.decision.choices.map(x=>x.value),[multi.uid,null]);
  pick(s,accept?multi.uid:null);
  assert.equal(legend.tapped,!accept);
  assert.equal(own.mana[0].tapped,true);
  assert.deepEqual(own.hand,[mono,multi]);
  assert.equal(s.log.filter(l=>l.type==='reveal'&&l.cardId===MULTI).length,Number(accept));
  assert.equal(own.drawsThisTurn||0,0);
 }
});

test('Legend puts all other hand cards on the bottom in chosen order before drawing the original count plus two',()=>{
 let s=field();
 const first=put(s,0,'hand',FIRE),second=put(s,0,'hand',WATER),third=put(s,0,'hand',MULTI);
 const initialDeck=s.players[0].deck.map(x=>x.uid);
 cast(s,LEGEND);
 assert.equal(s.decision.player,0);
 assert.deepEqual(s.decision.choices.map(x=>x.value),[first.uid,second.uid,third.uid]);
 pick(s,second.uid);
 s=JSON.parse(JSON.stringify(s));
 pick(s,third.uid);
 const own=s.players[0];
 assert.equal(s.decision,null);
 assert.deepEqual(own.deck.map(x=>x.uid),[...initialDeck.slice(5),second.uid,third.uid,first.uid]);
 assert.deepEqual(own.hand.map(x=>x.uid),initialDeck.slice(0,5));
 assert.ok(own.grave.some(x=>x.cardId===LEGEND));
 assert.ok(!s.log.some(l=>l.type==='reveal'));
});

test('Legend draws two with no remaining hand and can draw back a card it sent to the bottom',()=>{
 for(const count of [0,1]){
  const s=field(),own=s.players[0];
  give(s,0,'deck',[NATURE,NATURE]);
  const initial=[...own.deck],hand=count?put(s,0,'hand',FIRE):null;
  cast(s,LEGEND);
  assert.equal(s.decision,null);
  assert.deepEqual(own.hand,[...initial,...(hand?[hand]:[])]);
 }
});

test('Hakumei can summon for free from a Fire shield discard and can attack on the turn it is paid for',()=>{
 const s=field(),attacker=put(s,0,'battle',FIRE),hakumei=put(s,1,'hand',HAKUMEI);
 give(s,1,'shields',[FIRE]);
 give(s,1,'mana',[]);
 const shield=s.players[1].shields[0];
 attack(s,attacker.uid);
 act(s,'noBlock');
 assert.equal(s.decision.task.op,'g13_SB');
 act(s,'extended',a=>{
  const v=s.decision.choices[a.choice].value;
  return v?.uid===hakumei.uid&&v.cost===shield.uid;
 });
 drain(s);
 assert.ok(s.players[1].grave.includes(shield));
 assert.ok(s.players[1].battle.includes(hakumei));
 const other=field();
 cast(other,HAKUMEI);
 const [summoned]=other.players[0].battle;
 other.phase='attack';
 assert.ok(e.getLegalActions(other).some(a=>a.kind==='attack'&&a.uid===summoned.uid&&a.target==='player'));
});

test('Hakumei does not use a non-Fire shield or a Fire card already in hand',()=>{
 const s=field(),attacker=put(s,0,'battle',FIRE),hakumei=put(s,1,'hand',HAKUMEI);
 const inHand=put(s,1,'hand',FIRE);
 give(s,1,'shields',[NATURE]);
 const shield=s.players[1].shields[0];
 attack(s,attacker.uid);
 act(s,'noBlock');
 assert.equal(s.decision,null);
 assert.deepEqual(s.players[1].hand,[hakumei,inHand,shield]);
});

for(const first of ['orderGS','orderTrigger'])test('Hakumei and Bolshack Dragon GS resolve in either order (QA40692): '+first,()=>{
 let s=field();
 const hakumei=put(s,1,'hand',HAKUMEI),attacker=put(s,0,'battle',FIRE),later=put(s,0,'battle',FIRE);
 give(s,1,'shields',['dmsp02-001']);
 const shield=s.players[1].shields[0];
 attack(s,attacker.uid);
 act(s,'noBlock');
 pick(s,hakumei.uid);
 assert.equal(s.decision.task.op,'gsDeclare');
 s=JSON.parse(JSON.stringify(s));
 pick(s,true);
 assert.deepEqual(e.getLegalActions(s).map(a=>a.kind),['orderTrigger','orderGS']);
 act(s,first);
 if(first==='orderTrigger')assert.ok(s.players[1].battle.some(x=>x.uid===hakumei.uid));
 assert.equal(s.decision.task.op,'gsTarget');
 pick(s,later.uid);
 assert.ok(e.attackLocked(s,0,s.players[0].battle.find(x=>x.uid===later.uid)));
 assert.ok(s.players[1].grave.some(x=>x.uid===shield.uid));
 assert.ok(s.players[1].battle.some(x=>x.uid===hakumei.uid));
});

test('Hakumei used during Oniyose leaves the discount for the next summon (QA39945)',()=>{
 const s=field(),hakumei=put(s,0,'hand',HAKUMEI),next=put(s,0,'hand','dm01-095');
 give(s,0,'shields',[FIRE]);
 cast(s,'dmex10-012');
 pick(s,s.players[0].shields[0].uid);
 assert.equal(s.decision.task.op,'g13_SB');
 pick(s,hakumei.uid);
 drain(s);
 assert.ok(s.players[0].battle.includes(hakumei));
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===next.uid&&a.cost===1));
});

test('Orochi Ryusei cannot use Hakumei from the top of the deck as Strike Back (QA39650)',()=>{
 const s=field(),own=s.players[0];
 put(s,0,'battle','dmrp17-s11');
 const hakumei=inst(HAKUMEI);
 own.deck.unshift(hakumei);
 give(s,0,'shields',[FIRE]);
 const [shield]=own.shields;
 cast(s,'dmx05-013');
 pick(s,shield.uid);
 assert.equal(s.decision,null);
 assert.equal(own.deck[0],hakumei);
 assert.deepEqual(own.hand,[shield]);
});

for(const origin of ['deck','hand','mana','battle','shields','seals'])test('Bakugeki triggers only from the grave after leaving '+origin,()=>{
 const s=field(),own=s.players[0];
 const x=put(s,0,origin,BAKUGEKI);
 if(origin==='deck'){own.deck.pop();own.deck.unshift(x);}
 if(origin==='battle')x.g35Ignored=s.turn;
 if(origin==='seals'){
  const host=put(s,0,'battle',FIRE,{sealed:true});
  Object.assign(x,{sealOf:host.uid,faceDown:true});
 }
 const weakened=put(s,1,'battle','dm01-074'),low=put(s,1,'battle',FIRE);
 const before=e.power(weakened,false,s);
 assert.ok(before>2000&&e.power(low,false,s)<=2000);
 const effects={
  deck:{op:'g34_Mill',n:1},
  hand:{op:'g34_Discard',n:1,owner:'self'},
  mana:{op:'g34_Select',origin,n:1,to:'grave'},
  battle:{op:'g34_ExactMove',owner:0,target:x.uid,to:'grave'},
  shields:{op:'g34_Select',origin,n:1,to:'grave'},
  seals:{op:'g34_OwnSealGrave1156',n:1}
 };
 s.extTasks=[{p:0,source:NATURE,...effects[origin]}];
 act(s,'toAttack');
 if(['hand','mana','shields'].includes(origin))pick(s,x.uid);
 assert.ok(own.grave.includes(x));
 assert.equal(s.decision.task.op,'g34_Target');
 assert.deepEqual(s.decision.choices.map(c=>c.value.uid),[weakened.uid,low.uid]);
 pick(s,origin==='deck'?low.uid:weakened.uid);
 assert.equal(s.decision,null);
 if(origin==='deck')assert.ok(s.players[1].grave.includes(low));
 else{
  assert.equal(e.power(weakened,false,s),before-2000);
  act(s,'endTurn');
  assert.equal(e.power(weakened,false,s),before);
 }
});
