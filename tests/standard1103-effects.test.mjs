import test from 'node:test';
import assert from 'node:assert/strict';
import {createCatalogue} from '../dist/catalogue.js';
import {act,attack,cast,data,details,drain,e,give,inst,PRESETS,snapshot} from './target-fixture.mjs';

const DIANA='dm36-041', KOSHIRO='dm38-030', CHEVAL='dm38-033', FIVE='dm39-001';
const LIGHT='dm01-076', WATER='dm01-083', DARK='dm01-090', FIRE='dm01-097', NATURE='dm01-108';
const values=s=>s.decision?.choices?.map(c=>c.value?.uid??c.value)??[];
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);
const end=s=>{s.phase='attack';act(s,'endTurn');};
function table(active=0){
 const extraCards=[DIANA,KOSHIRO,CHEVAL,FIVE].map(id=>({id,count:1}));
 const decks=PRESETS.slice(0,2).map(deck=>({...deck,format:'advance',extraCards}));
 const s=e.createGame(decks,{seed:1103});
 s.active=active;
 s.turn=3;
 s.phase='main';
 for(const p of [0,1]){
  give(s,p,'hand',[]);
  give(s,p,'mana',[LIGHT,WATER,DARK,FIRE,NATURE].flatMap(id=>Array(4).fill(id)));
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

test('registered Holes can deploy each of the new Psychics on its front face',()=>{
 for(const [spell,id] of [['dm36-077',DIANA],['dm36-109',KOSHIRO],['dm36-093',CHEVAL],['dm36-077',FIVE]]){
  const s=table(),own=s.players[0],target=own.extra.find(x=>x.cardId===id);
  cast(s,spell);
  pick(s,1);
  assert.ok(values(s).includes(target.uid));
  pick(s,target.uid);
  assert.ok(own.battle.includes(target));
  assert.ok(!own.extra.includes(target));
  assert.equal(e.card(target).name,e.card(id).name);
 }
});

test('Diana can tap an opponent after blockers, or awaken with no eligible target (QA 36001)',()=>{
 for(const hasTarget of [true,false]){
  const s=table(),diana=put(s,0,DIANA),enemy=hasTarget?put(s,1,WATER):null;
  attack(s,diana.uid);
  act(s,'noBlock');
  if(enemy){
   assert.equal(diana.g1085Awakened,undefined);
   assert.deepEqual(values(s),[enemy.uid]);
   pick(s,enemy.uid);
   assert.equal(enemy.tapped,true);
  }
  assert.equal(diana.g1085Awakened,true);
  assert.equal(e.card(diana).race,'アーク・セラフィム');
  assert.equal(e.card(diana).breaker,2);
 }
});

test('awakened Diana chooses its attack target before tapping a blocker (QA 34913)',()=>{
 const s=table(),diana=put(s,0,DIANA);
 diana.g1085Awakened=true;
 const blocker=put(s,1,LIGHT);
 attack(s,diana.uid);
 assert.deepEqual(values(s),[blocker.uid]);
 assert.equal(s.attack.target,'player');
 pick(s,blocker.uid);
 assert.equal(blocker.tapped,true);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'));
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('Koshiro awakens at eight mana and the other face may put an eligible creature from mana',()=>{
 const seven=table(1),waiting=put(seven,0,KOSHIRO);
 give(seven,0,'mana',Array(7).fill(NATURE));
 end(seven);
 assert.equal(waiting.g1085Awakened,undefined);

 for(const use of [true,false]){
  const s=table(1),own=s.players[0],koshiro=put(s,0,KOSHIRO);
  give(s,0,'mana',['dm03-s03','dm10-006','dm36-011','dm01-052',...Array(4).fill(NATURE)]);
  const [eligible,tooExpensive,evolution,spell]=own.mana;
  end(s);
  assert.equal(koshiro.g1085Awakened,true);
  assert.equal(e.card(koshiro).cost,12);
  assert.equal(e.card(koshiro).breaker,2);
  attack(s,koshiro.uid);
  assert.ok(values(s).includes(eligible.uid));
  for(const x of [tooExpensive,evolution,spell])assert.ok(!values(s).includes(x.uid));
  pick(s,use?eligible.uid:null);
  assert.equal(own.battle.includes(eligible),use);
  assert.equal(own.mana.includes(eligible),!use);
 }
});

test('Cheval counts two separate qualifying Commands at the start of either turn',()=>{
 for(const active of [0,1]){
  const s=table(active),cheval=put(s,0,CHEVAL);
  put(s,0,'dm37-006');
  put(s,0,'dm03-s03');
  end(s);
  assert.equal(cheval.g1085Awakened,true);
  assert.equal(e.card(cheval).cost,12);
  assert.equal(e.card(cheval).breaker,2);
 }
 const s=table(),cheval=put(s,0,CHEVAL),dual=put(s,0,CHEVAL);
 dual.g1085Awakened=true;
 end(s);
 assert.equal(cheval.g1085Awakened,undefined);
});

test('awakened Cheval may shield on opposing entry and breaks after the opposing spell resolves',()=>{
 const s=table(1),own=s.players[0],opp=s.players[1],cheval=put(s,0,CHEVAL);
 cheval.g1085Awakened=true;
 const top=own.deck[0];
 cast(s,NATURE);
 pick(s,true);
 assert.ok(own.shields.includes(top));
 assert.equal(top.faceUp,undefined);
 const shields=opp.shields.length;
 cast(s,'dm01-052');
 assert.equal(s.decision.player,1);
 assert.equal(opp.shields.length,shields);
 drain(s);
 assert.equal(opp.shields.length,shields-1);
});

test('Cheval cannot break a shield after the opposing spell removes it (QA 34923)',()=>{
 const s=table(1),opp=s.players[1],cheval=put(s,0,CHEVAL),shields=opp.shields.length;
 cheval.g1085Awakened=true;
 cast(s,'dm01-027');
 act(s,'effect',a=>a.targets?.some(target=>target.uid===cheval.uid));
 drain(s);
 assert.equal(opp.shields.length,shields);
 assert.ok(s.players[0].extra.includes(cheval));
});

test('Five Star counts current power including itself and grants only its allies all battle wins',()=>{
 const s=table(1),five=put(s,0,FIVE),ally=put(s,0,WATER);
 put(s,0,'dm10-076');
 const fire=put(s,1,FIRE),water=put(s,1,WATER);
 five.tapped=true;
 s.phase='attack';
 const targets=x=>e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===x.uid).map(a=>a.target);
 assert.ok(!targets(fire).includes(five.uid));
 assert.ok(targets(water).includes(five.uid));
 ally.powerModifiers=[{amount:500}];
 end(s);
 assert.equal(five.g1085Awakened,true);
 assert.equal(e.effectiveCard(five,s).g466BattleAura.other,true);
 ally.g35Ignored=s.turn;
 water.powerModifiers=[{amount:6000}];
 water.tapped=true;
 attack(s,ally.uid,water.uid);
 act(s,'noBlock');
 drain(s);
 assert.ok(s.players[1].grave.includes(water));
 assert.ok(s.players[0].battle.includes(ally));
});

test('Two Five Stars let both allies survive their battle (QA 36219)',()=>{
 const s=table(),left=put(s,0,FIVE),right=put(s,1,FIVE);
 const ally=put(s,0,WATER),enemy=put(s,1,FIRE);
 left.g1085Awakened=right.g1085Awakened=true;
 enemy.tapped=true;
 attack(s,ally.uid,enemy.uid);
 act(s,'noBlock');
 drain(s);
 assert.ok(s.players[0].battle.includes(ally));
 assert.ok(s.players[1].battle.includes(enemy));
});

test('Slayer still destroys the winning ally after the battle (QA 36220)',()=>{
 const s=table(),five=put(s,0,FIVE),ally=put(s,0,WATER),slayer=put(s,1,'dm01-088');
 five.g1085Awakened=true;
 slayer.tapped=true;
 attack(s,ally.uid,slayer.uid);
 act(s,'noBlock');
 drain(s);
 assert.ok(s.players[0].grave.includes(ally));
 assert.ok(s.players[1].grave.includes(slayer));
});

test('official Psychic prints resolve to four new identities and a shared reprint',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 for(const id of [DIANA,KOSHIRO,CHEVAL,FIVE]){
  const row=registry.get(id);
  assert.equal(row.id,id);
  assert.equal(e.card(id).manaValue,0);
  assert.equal(row.limit,4);
 }
 assert.equal(registry.get('dmbd21-011'),registry.get(CHEVAL));
});
