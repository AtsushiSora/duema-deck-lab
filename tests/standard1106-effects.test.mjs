import test from 'node:test';
import assert from 'node:assert/strict';
import {createCatalogue} from '../dist/catalogue.js';
import {act,attack,cast,data,details,e,give,inst,PRESETS,snapshot} from './target-fixture.mjs';

const BLUE_WHITE='dmr02-030', WHITE_GREEN='dmr02-031', BLACK_BLUE='dmr02-032';
const RED_BLACK='dmr02-033', GREEN_RED='dmr02-034';
const JOHN='dm37-033', MARTINI='dm37-024', CHEVAL='dm38-033', APRIL='dm36-053', OFLAME='dm36-059';
const LIGHT='dm01-076', WATER='dm01-083', DARK='dm01-090', FIRE='dm01-097', NATURE='dm01-108';
const SENNO='dmrp01-012', TOKOSHIE='dmrp17-025';
const find=(rows,id)=>rows.find(x=>x.cardId===id);
const values=s=>s.decision?.choices?.map(c=>c.value?.uid??c.value)??[];
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);
const end=s=>{s.phase='attack';act(s,'endTurn');};
const legal=s=>e.getLegalActions(s);
const attacks=(s,x)=>legal(s).filter(a=>a.kind==='attack'&&a.uid===x.uid);

function table(){
 const extraCards=[JOHN,MARTINI,CHEVAL,APRIL,OFLAME].map(id=>({id,count:1}));
 const decks=PRESETS.slice(0,2).map(deck=>({...deck,format:'advance',extraCards}));
 const s=e.createGame(decks,{seed:1106});
 s.turn=3;
 s.phase='main';
 for(const p of [0,1]){
  give(s,p,'hand',[]);
  give(s,p,'mana',[LIGHT,WATER,DARK,FIRE,NATURE].flatMap(id=>Array(3).fill(id)));
  give(s,p,'shields',Array(5).fill(NATURE));
 }
 return s;
}

test('Blue White applies the water bonus to creatures present when it resolves',()=>{
 const s=table(),own=s.players[0],opp=s.players[1],martini=find(own.extra,MARTINI);
 const attacker=inst(NATURE),blocker=inst(LIGHT);
 own.battle.push(attacker);
 opp.battle.push(blocker);
 cast(s,BLUE_WHITE);
 assert.equal(s.decision.choices.filter(c=>c.value.uid===martini.uid).length,1);
 pick(s,martini.uid);
 assert.equal(e.card(martini).civ,'水');
 assert.equal(e.effectiveCard(martini,s).unblockable,true);
 attacker.g35Ignored=s.turn;
 assert.equal(e.effectiveCard(attacker,s).unblockable,true);
 const late=inst(NATURE);
 own.battle.push(late);
 assert.ok(!e.effectiveCard(late,s).unblockable);
 attack(s,attacker.uid);
 assert.ok(!legal(s).some(a=>a.kind==='block'));
 act(s,'noBlock');
 assert.equal(opp.shields.length,4);
 end(s);
 assert.ok(!e.effectiveCard(attacker,s).unblockable);
});

for(const id of [BLUE_WHITE,WHITE_GREEN])test(id+' can add one hand card as a face-down shield or decline',()=>{
 for(const accept of [true,false]){
  const s=table(),own=s.players[0],cheval=find(own.extra,CHEVAL),hand=inst(NATURE);
  own.hand.push(hand);
  const mana=own.mana.slice();
  cast(s,id);
  pick(s,cheval.uid);
  assert.deepEqual(values(s),[hand.uid,null]);
  pick(s,accept?hand.uid:null);
  assert.equal(own.shields.includes(hand),accept);
  assert.equal(own.hand.includes(hand),!accept);
  assert.ok(!hand.faceUp);
  assert.deepEqual(own.mana,mana);
 }
});

test('White Green can recover any mana card for nature, including a tapped card',()=>{
 const s=table(),own=s.players[0],john=find(own.extra,JOHN);
 const tapped=own.mana[0];
 tapped.tapped=true;
 cast(s,WHITE_GREEN);
 pick(s,john.uid);
 assert.deepEqual(values(s),[...own.mana.map(c=>c.uid),null]);
 pick(s,tapped.uid);
 assert.ok(own.hand.includes(tapped));
 assert.ok(!own.mana.includes(tapped));
});

test('Black Blue grants the water bonus only for a water face',()=>{
 const s=table(),own=s.players[0],ally=inst(NATURE),martini=find(own.extra,MARTINI);
 own.battle.push(ally);
 cast(s,BLACK_BLUE);
 pick(s,martini.uid);
 assert.equal(e.effectiveCard(ally,s).unblockable,true);
 assert.equal(s.decision,null);
});

for(const id of [BLACK_BLUE,RED_BLACK])test(id+' requires the chosen creature to attack on the next opposing turn if it can',()=>{
 for(const canAttack of [true,false]){
  const s=table(),own=s.players[0],opp=s.players[1],april=find(own.extra,APRIL);
  const forced=inst(NATURE),other=inst(NATURE),target=inst(FIRE);
  own.battle.push(target);
  opp.battle.push(forced,other);
  cast(s,id);
  pick(s,april.uid);
  assert.deepEqual(values(s),[forced.uid,other.uid]);
  pick(s,forced.uid);
  assert.ok(!e.effectiveCard(forced,s).mustAttack);
  end(s);
  if(!canAttack)forced.tapped=true;
  target.tapped=true;
  s.phase='attack';
  assert.equal(legal(s).some(a=>a.kind==='endTurn'),!canAttack);
  assert.ok(attacks(s,other).length);
  if(canAttack){
   assert.ok(attacks(s,forced).some(a=>a.target===target.uid));
   attack(s,forced.uid,target.uid);
   act(s,'noBlock');
   assert.ok(legal(s).some(a=>a.kind==='endTurn'));
  }
  act(s,'endTurn');
  assert.ok(!e.effectiveCard(forced,s).mustAttack);
 }
});

test('Black Blue forbids a tap ability that replaces a legal attack (QA 37596)',()=>{
 const s=table(),own=s.players[0],opp=s.players[1],april=find(own.extra,APRIL);
 const forced=inst('dm06-095'),other=inst('dm06-095');
 opp.battle.push(forced,other);
 cast(s,BLACK_BLUE);
 pick(s,april.uid);
 pick(s,forced.uid);
 end(s);
 s.phase='attack';
 const canUseTap=x=>legal(s).some(a=>a.kind==='tapAbility'&&a.uid===x.uid);
 assert.ok(attacks(s,forced).length);
 assert.equal(canUseTap(forced),false);
 assert.equal(canUseTap(other),true);
});

test('Green Red permits declining the nature bonus',()=>{
 const s=table(),own=s.players[0],john=find(own.extra,JOHN),mana=own.mana.slice();
 cast(s,GREEN_RED);
 pick(s,john.uid);
 assert.equal(e.card(john).civ,'自然');
 assert.ok(values(s).includes(null));
 pick(s,null);
 assert.deepEqual(own.mana,mana);
});

for(const id of [GREEN_RED,RED_BLACK])test(id+' uses John’s selected fire face without granting an attack to a fresh creature',()=>{
 for(const chooseFresh of [true,false]){
  let s=table();
  const own=s.players[0],opp=s.players[1],john=find(own.extra,JOHN);
  const ally=inst(NATURE),enemy=inst(WATER);
  own.battle.push(ally);
  opp.battle.push(enemy);
  cast(s,id);
  assert.equal(s.decision.choices.filter(c=>c.value.uid===john.uid).length,2);
  s=JSON.parse(JSON.stringify(s));
  act(s,'extended',a=>{
   const selected=s.decision.choices[a.choice].value;
   return selected?.uid===john.uid&&selected.g1104Back;
  });
  pick(s,chooseFresh?john.uid:ally.uid);
  assert.equal(s.decision,null);
  assert.equal(e.card(s.players[0].battle[1]).civ,'火');
  s.phase='attack';
  s.players[0].battle[0].g35Ignored=s.turn;
  assert.equal(attacks(s,ally).some(a=>a.target===enemy.uid),!chooseFresh);
  assert.deepEqual(attacks(s,john),[]);
 }
});

test('A dual-civilization Psychic can apply both bonuses in their printed order',()=>{
 const s=table(),own=s.players[0],opp=s.players[1],cheval=find(own.extra,CHEVAL),ally=inst(NATURE),enemy=inst(WATER);
 const dual={...e.card(CHEVAL),civ:'水/闇',civilizations:['水','闇']};
 e.setCards(data.cards.map(c=>c.id===CHEVAL?dual:c));
 try{
  own.battle.push(ally);
  opp.battle.push(enemy);
  cast(s,BLACK_BLUE);
  pick(s,cheval.uid);
  assert.equal(e.effectiveCard(ally,s).unblockable,true);
  assert.equal(e.effectiveCard(cheval,s).unblockable,true);
  assert.deepEqual(values(s),[enemy.uid]);
  pick(s,enemy.uid);
  end(s);
  assert.equal(e.effectiveCard(enemy,s).mustAttack,true);
 }finally{
  e.setCards(data.cards);
 }
});

test('A forbidden or replaced deployment does not create the color bonuses',()=>{
 for(const prevent of [SENNO,TOKOSHIE]){
  const s=table(),own=s.players[0],opp=s.players[1],martini=find(own.extra,MARTINI),ally=inst(NATURE);
  own.battle.push(ally);
  opp.battle.push(inst(prevent));
  cast(s,BLUE_WHITE);
  if(prevent===TOKOSHIE)pick(s,martini.uid);
  assert.ok(own.extra.includes(martini));
  assert.deepEqual(own.battle,[ally]);
  assert.ok(!e.effectiveCard(ally,s).unblockable);
  assert.equal(s.decision,null);
 }
});

test('The five spells enter mana tapped and reprints share canonical IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 for(const id of [BLUE_WHITE,WHITE_GREEN,BLACK_BLUE,RED_BLACK,GREEN_RED]){
  const s=table();
  give(s,0,'hand',[id]);
  s.phase='charge';
  act(s,'charge',a=>a.cardId===id);
  assert.equal(s.players[0].mana.at(-1).tapped,true);
  assert.equal(catalogue.get(id).limit,4);
 }
 assert.equal(catalogue.get('dmx25-047'),catalogue.get(BLUE_WHITE));
 assert.equal(catalogue.get('dmx25-018'),catalogue.get(WHITE_GREEN));
 assert.equal(catalogue.get('dmex17-Cho20'),catalogue.get(WHITE_GREEN));
});
