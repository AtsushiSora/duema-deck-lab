import test from 'node:test';
import assert from 'node:assert/strict';
import {createCatalogue} from '../dist/catalogue.js';
import {act,attack,cast,data,details,drain,e,give,inst,PRESETS,snapshot} from './target-fixture.mjs';

const MARTINI='dm37-024', CUTLASS='dm36-047', APRIL='dm36-053', OFLAME='dm36-059';
const ENERGY='dm36-085', TWIN_ENERGY='dm22ex1-127', REVIVE='dm36-093', OFLAME_HOLE='dmpcd03-a12';
const JOHN='dm37-033', BOLSHACK='dm36-s07', NATURE='dm01-108', SHIELD_TRIGGER='dm01-110';
const BLOCKER='dm01-048', SMALL_BLOCKER='dm01-079', WATER='dm01-083';
const values=s=>s.decision?.choices?.map(c=>c.value?.uid??c.value)??[];
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);
const end=s=>{s.phase='attack';act(s,'endTurn');drain(s);};
function table(){
 const extraCards=[MARTINI,CUTLASS,APRIL,OFLAME,JOHN,BOLSHACK].map(id=>({id,count:1}));
 const decks=PRESETS.slice(0,2).map(deck=>({...deck,format:'advance',extraCards}));
 const s=e.createGame(decks,{seed:1102});
 s.phase='main';
 s.turn=3;
 for(const p of [0,1]){
  give(s,p,'hand',[]);
  give(s,p,'mana',['dm01-076',WATER,'dm01-090','dm01-097',NATURE].flatMap(id=>Array(4).fill(id)));
  give(s,p,'shields',Array(5).fill(NATURE));
 }
 return s;
}
function put(s,p,id){
 const own=s.players[p],index=own.extra.findIndex(x=>x.cardId===id);
 const x=index<0?inst(id):own.extra.splice(index,1)[0];
 own.battle.push(x);
 return x;
}

test('Energy, Revive and Oflame Holes deploy the actual matching Psychics',()=>{
 for(const [spell,mode,targetId] of [[ENERGY,1,CUTLASS],[TWIN_ENERGY,1,MARTINI],[REVIVE,1,APRIL],[OFLAME_HOLE,null,OFLAME]]){
  const s=table(),own=s.players[0],target=own.extra.find(x=>x.cardId===targetId);
  cast(s,spell);
  if(mode!==null)pick(s,mode);
  assert.ok(values(s).includes(target.uid));
  if(spell===OFLAME_HOLE)assert.deepEqual(values(s),[target.uid]);
  pick(s,target.uid);
  assert.deepEqual(own.battle,[target]);
  assert.equal(e.card(target).cost,e.card(targetId).cost);
 }
});

test('Martini awakens only when its own cost-four-or-more blocker enters and can shield when blocking',()=>{
 for(const accept of [true,false]){
  const s=table(),own=s.players[0],martini=put(s,0,MARTINI);
  s.phase='attack';
  assert.equal(e.effectiveCard(martini,s).blocker,true);
  assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===martini.uid));
  s.phase='main';
  cast(s,SMALL_BLOCKER);
  cast(s,WATER);
  assert.equal(martini.g1085Awakened,undefined);
  cast(s,BLOCKER);
  assert.equal(martini.g1085Awakened,true);
  assert.equal(e.card(martini).civ,'光');
  assert.equal(e.card(martini).cost,6);
  assert.equal(e.power(martini,false,s),3000);
  end(s);
  const top=own.deck[0],enemy=put(s,1,NATURE);
  attack(s,enemy.uid);
  act(s,'block',a=>a.uid===martini.uid);
  pick(s,accept?true:null);
  assert.equal(own.shields.includes(top),accept);
  if(accept)assert.equal(top.faceUp,undefined);
  assert.equal(own.battle.includes(martini),true);
 }
});

test('a cost-five H Soul creature entering with a granted Blocker awakens Martini (QA 34918)',()=>{
 const s=table(),martini=put(s,0,MARTINI);
 put(s,0,'dm37-006');
 const base=put(s,0,'dm38-020');
 assert.equal(e.card('dm36-011').blocker,undefined);
 s.players[0].hand.push(inst('dm36-011'));
 act(s,'play',a=>a.cardId==='dm36-011');
 if(s.decision?.type==='evolution')act(s,'evolve',a=>a.baseUid===base.uid);
 drain(s);
 assert.equal(martini.g1085Awakened,true);
 assert.equal(e.effectiveCard(s.players[0].battle.find(x=>x.cardId==='dm36-011'),s).blocker,true);
});

test('Cutlass draws before breaking a shield and awakens after its trigger window',()=>{
 const s=table(),own=s.players[0],opp=s.players[1],unit=put(s,0,CUTLASS),top=own.deck[0];
 give(s,1,'shields',[SHIELD_TRIGGER,...Array(4).fill(NATURE)]);
 attack(s,unit.uid);
 act(s,'noBlock');
 assert.ok(own.hand.includes(top));
 assert.equal(unit.g1085Awakened,undefined);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='useTrigger'));
 act(s,'skipTrigger');
 assert.equal(unit.g1085Awakened,true);
 assert.equal(e.card(unit).race,'リキッド・ピープル');
 assert.equal(e.card(unit).breaker,2);

 unit.tapped=false;
 const newTop=own.deck[0],shieldCount=opp.shields.length;
 attack(s,unit.uid);
 assert.ok(own.hand.includes(newTop));
 act(s,'noBlock');
 drain(s);
 assert.equal(opp.shields.length,shieldCount-2);
 assert.equal(own.hand.length,2);
});

test('Cutlass that leaves during a shield trigger stays in the extra zone without awakening',()=>{
 const s=table(),own=s.players[0],unit=put(s,0,CUTLASS);
 give(s,1,'shields',['dm01-027',...Array(4).fill(NATURE)]);
 attack(s,unit.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 act(s,'effect',a=>a.targets?.some(target=>target.uid===unit.uid));
 assert.equal(own.battle.includes(unit),false);
 assert.ok(own.extra.includes(unit));
 assert.equal(unit.g1085Awakened,undefined);
 assert.ok(!s.log.some(event=>event.type==='awaken'&&event.uid===unit.uid));
});

test('a blocked Cutlass does not draw or awaken, and a creature-target attack does not awaken it',()=>{
 for(const blocked of [true,false]){
  const s=table(),own=s.players[0],unit=put(s,0,CUTLASS),enemy=put(s,1,SMALL_BLOCKER);
  enemy.tapped=!blocked;
  attack(s,unit.uid,blocked?'player':enemy.uid);
  act(s,blocked?'block':'noBlock',a=>!blocked||a.uid===enemy.uid);
  drain(s);
  assert.equal(unit.g1085Awakened,undefined);
  assert.equal(own.hand.length,0);
 }
});

test('April lets the opponent choose the discard and still awakens against an empty hand (QA 36032)',()=>{
 for(const hasHand of [true,false]){
  const s=table(),opp=s.players[1],unit=put(s,0,APRIL);
  if(hasHand)give(s,1,'hand',[NATURE,WATER]);
  const discarded=opp.hand.at(-1);
  attack(s,unit.uid);
  act(s,'noBlock');
  if(hasHand){
   assert.equal(unit.g1085Awakened,undefined);
   assert.equal(s.decision.player,1);
   pick(s,discarded.uid);
   assert.ok(opp.grave.includes(discarded));
  }
  assert.equal(unit.g1085Awakened,true);
  assert.equal(e.card(unit).race,'ダークロード');
  unit.tapped=false;
  give(s,1,'hand',[WATER,NATURE]);
  const next=opp.hand[0];
  attack(s,unit.uid);
  assert.equal(s.decision.player,1);
  pick(s,next.uid);
  assert.ok(opp.grave.includes(next));
 }
});

test('Oflame boosts other small Psychics on both faces and the bonuses add',()=>{
 const s=table(),own=s.players[0],opp=s.players[1];
 const source=put(s,0,OFLAME),john=put(s,0,JOHN),large=put(s,0,BOLSHACK),plain=put(s,0,NATURE);
 const base=e.power(john,true,s);
 attack(s,source.uid);
 act(s,'noBlock');
 drain(s);
 assert.equal(source.g1085Awakened,true);
 assert.equal(e.power(john,true,s),base+2000);
 assert.equal(e.effectiveCard(john,s).extraBreak,1);
 for(const x of [source,large,plain])assert.equal(e.effectiveCard(x,s).extraBreak,undefined);
 source.tapped=false;
 attack(s,source.uid);
 assert.equal(e.power(john,true,s),base+4000);
 assert.equal(e.effectiveCard(john,s).extraBreak,2);
 act(s,'noBlock');
 drain(s);
 assert.equal(opp.shields.length,2);
 attack(s,john.uid);
 act(s,'noBlock');
 drain(s);
 assert.equal(opp.shields.length,0);
 end(s);
 assert.equal(e.power(john,true,s),base);
 assert.equal(e.effectiveCard(john,s).extraBreak,undefined);
 assert.equal(own.extra.some(x=>x.uid===source.uid),false);
});

test('both faces and official reprints keep the same canonical IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 for(const [id,alias] of [[MARTINI,'dmx02-020'],[CUTLASS,'dmx03-015'],[APRIL,'dmx03-017'],[OFLAME,null]]){
  const row=e.card(id);
  assert.equal(row.psychic,true);
  assert.equal(row.limit,4);
  assert.equal(row.manaValue,0);
  assert.match(row.g1085Back.image,/b\.jpg$/);
  if(alias)assert.equal(registry.get(alias),registry.get(id));
 }
});
