import test from 'node:test';
import assert from 'node:assert/strict';
import {createCatalogue} from '../dist/catalogue.js';
import {projectRoom} from '../server/duel-core.mjs';
import {act,cast,data,details,e,give,inst,PRESETS,snapshot} from './target-fixture.mjs';

e.setRandomSource();
const EXTRA='dm37-042', WHITE_BLACK='dmr03-049', KILLER='dmx07-013';
const LIGHT='dm01-076', WATER='dm01-083', DARK='dm01-087', NATURE='dm01-108';
const UNTOUCHABLE='dm37-021', MARTINI='dm37-024', JOHN='dm37-033', CHEVAL='dm38-033';
const AQUA='dm36-047', GAGA='dmx05-004', APRIL='dm36-053';
const QQ='dmrp07-m01', GORGON='dm22-025', SPIRAL='dm01-086', TWIN_TWO='dm23rp3-050';
const find=(rows,id)=>rows.find(x=>x.cardId===id);
const values=s=>s.decision?.choices?.map(c=>c.value)??[];
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);
const pickCard=(s,x,back=false)=>act(s,'extended',a=>{
 const value=values(s)[a.choice];
 return value?.uid===x.uid&&!!value.g1104Back===back;
});
const faces=s=>values(s).filter(Boolean).map(value=>[value.uid,!!value.g1104Back]);
function table(extra=[UNTOUCHABLE,MARTINI,JOHN,CHEVAL,AQUA,GAGA,APRIL]){
 const extraCards=extra.map(id=>({id,count:1}));
 const decks=PRESETS.slice(0,2).map(deck=>({...deck,format:'advance',extraCards}));
 const s=e.createGame(decks,{seed:1109});
 s.phase='main';
 s.turn=3;
 for(const p of [0,1]){
  give(s,p,'hand',[]);
  give(s,p,'mana',[LIGHT,WATER,DARK,NATURE].flatMap(id=>Array(4).fill(id)));
  give(s,p,'shields',Array(5).fill(NATURE));
 }
 return s;
}
function project(s,seat){
 const profiles=[{name:'A'},{name:'B'}];
 const room={hostUid:'one',guestUid:'two',game:s,phase:'playing',expiresAt:1,decks:[{format:'advance'}],profiles,events:[]};
 return projectRoom(room,{uid:seat===0?'one':'two'},0).game;
}

test('Extra Hole selects one graveyard and returns at most two cards before deploying (QA 36096)',()=>{
 const s=table(),own=s.players[0],opp=s.players[1],martini=find(own.extra,MARTINI);
 give(s,0,'grave',[NATURE]);
 give(s,1,'grave',[LIGHT,WATER,DARK]);
 const [a,b,c]=opp.grave,prior=opp.deck.map(x=>x.uid);
 cast(s,EXTRA);
 assert.deepEqual(values(s),[0,1]);
 pick(s,1);
 assert.deepEqual(values(s),[a.uid,b.uid,c.uid,null]);
 pick(s,a.uid);
 pick(s,b.uid);
 assert.deepEqual(opp.grave,[c]);
 assert.ok(opp.deck.includes(a)&&opp.deck.includes(b));
 assert.notDeepEqual(opp.deck.filter(x=>x!==a&&x!==b).map(x=>x.uid),prior);
 pick(s,1);
 assert.deepEqual(faces(s),[[find(own.extra,UNTOUCHABLE).uid,false],[martini.uid,false]]);
 pickCard(s,martini);
 assert.ok(own.battle.includes(martini));
});

test('Extra Hole shuffles the chosen player’s deck with zero cards or an empty graveyard (QA 36097)',()=>{
 for(const empty of [false,true]){
  const s=table(),own=s.players[0],opp=s.players[1],target=find(own.extra,UNTOUCHABLE);
  if(!empty)give(s,0,'grave',[NATURE]);
  const before=own.deck.map(x=>x.uid),opponentBefore=opp.deck.map(x=>x.uid);
  cast(s,EXTRA);
  assert.deepEqual(values(s),[0,1]);
  pick(s,0);
  if(!empty)pick(s,null);
  assert.notDeepEqual(own.deck.map(x=>x.uid),before);
  assert.deepEqual(opp.deck.map(x=>x.uid),opponentBefore);
  assert.equal(own.grave.length,Number(!empty));
  pick(s,0);
  assert.deepEqual(faces(s),[[target.uid,false]]);
  pickCard(s,target);
 }
});

test('Extra Hole adds cards at chosen positions when Q.Q.QX. prevents shuffling (QA 31783)',()=>{
 const s=table(),own=s.players[0],opp=s.players[1];
 own.battle.push(inst(QQ));
 give(s,1,'grave',[LIGHT,WATER]);
 const [a,b]=opp.grave,before=opp.deck.slice();
 cast(s,EXTRA);
 pick(s,1);
 pick(s,a.uid);
 pick(s,b.uid);
 assert.equal(s.decision.player,1);
 pick(s,0);
 pick(s,2);
 assert.deepEqual(opp.deck,[a,before[0],b,...before.slice(1)]);
 assert.equal(s.decision.player,0);
 pick(s,0);
 pickCard(s,find(own.extra,UNTOUCHABLE));
});

test('Extra Hole still shuffles when a rule prevents cards leaving the selected graveyard',()=>{
 const s=table(),own=s.players[0],opp=s.players[1];
 opp.battle.push(inst('dmrp20-020'));
 give(s,1,'grave',[LIGHT,WATER]);
 const before=opp.deck.map(x=>x.uid),grave=opp.grave.slice();
 cast(s,EXTRA);
 pick(s,1);
 assert.deepEqual(opp.grave,grave);
 assert.notDeepEqual(opp.deck.map(x=>x.uid),before);
 pick(s,0);
 pickCard(s,find(own.extra,UNTOUCHABLE));
});

test('White Black privately inspects a shield and may replace a different player’s shield (QA 36476)',()=>{
 const s=table(),own=s.players[0],opp=s.players[1],john=find(own.extra,JOHN);
 const shown=own.shields[0],selected=opp.shields[0],top=opp.deck[0];
 shown.shieldStack=[inst(WATER)];
 selected.shieldStack=[inst(DARK)];
 const buried=selected.shieldStack[0];
 cast(s,WHITE_BLACK);
 pickCard(s,shown);
 assert.deepEqual(project(s,0).inspectedCards.map(x=>x.id),[NATURE,WATER]);
 assert.equal(project(s,1).inspectedCards,undefined);
 assert.ok(s.log.every(row=>!row.text?.includes(e.card(WATER).name)));
 pick(s,null);
 pickCard(s,selected);
 assert.ok(opp.grave.includes(selected)&&opp.grave.includes(buried));
 assert.equal(opp.shields.at(-1),top);
 assert.ok(!top.faceUp);
 assert.ok(own.shields.includes(shown));
 assert.equal(own.shields.length,5);
 pickCard(s,john,true);
 assert.equal(e.card(john).civ,'火');
});

test('White Black may replace the same shield and deploys when no shields exist',()=>{
 for(const withShield of [false,true]){
  const s=table(),own=s.players[0],john=find(own.extra,JOHN);
  give(s,0,'shields',withShield?[NATURE]:[]);
  give(s,1,'shields',[]);
  const [target]=own.shields,top=own.deck[0];
  cast(s,WHITE_BLACK);
  if(withShield){
   pickCard(s,target);
   pick(s,null);
   pickCard(s,target);
   assert.deepEqual(own.shields,[top]);
   assert.ok(own.grave.includes(target));
  }
  pickCard(s,john);
  assert.ok(own.battle.includes(john));
 }
});

test('Killer Megane declares before a private hand look, uses printed costs, and counts each Twinpact once',()=>{
 for(const declared of [2,4,21]){
  const s=table(),own=s.players[0],opp=s.players[1];
  opp.battle.push(inst(GORGON));
  give(s,1,'hand',[SPIRAL,TWIN_TWO,LIGHT]);
  const initialDeck=own.deck.length;
  cast(s,KILLER);
  assert.equal(s.decision.task.op,'g9Number');
  assert.equal(project(s,0).inspectedCards,undefined);
  if(declared===21)e.step(s,{...e.getLegalActions(s)[0],number:declared});
  else pick(s,declared);
  assert.deepEqual(project(s,0).inspectedCards.map(x=>x.id),[SPIRAL,TWIN_TWO,LIGHT]);
  assert.equal(project(s,1).inspectedCards,undefined);
  pick(s,true);
  if(declared===2){
   assert.equal(s.decision.task.n,2);
   pick(s,true);
   assert.equal(s.decision.task.n,1);
   pick(s,true);
  }
  assert.equal(own.deck.length,initialDeck-(declared===2?2:0));
  pick(s,null);
  assert.equal(s.decision,null);
 }
});

test('Killer Megane can decline the draw and deploys at most two water faces for total cost seven',()=>{
 for(const oneLarge of [false,true]){
  const s=table([MARTINI,MARTINI,UNTOUCHABLE,JOHN,AQUA,GAGA]),own=s.players[0];
  const [a,b]=own.extra.filter(x=>x.cardId===MARTINI),gaga=find(own.extra,GAGA),aqua=find(own.extra,AQUA);
  give(s,1,'hand',[WATER]);
  cast(s,KILLER);
  pick(s,2);
  pick(s,true);
  pick(s,null);
  assert.equal(own.hand.length,0);
  assert.deepEqual(faces(s),[[a.uid,false],[b.uid,false],[find(own.extra,UNTOUCHABLE).uid,true],[aqua.uid,false],[gaga.uid,true]]);
  if(oneLarge){
   pickCard(s,gaga,true);
   assert.deepEqual(own.battle,[gaga]);
   assert.equal(e.card(gaga).civ,'水');
  }else{
   pickCard(s,a);
   assert.deepEqual(faces(s),[[b.uid,false]]);
   pickCard(s,b);
   assert.deepEqual(own.battle,[a,b]);
  }
  assert.equal(s.decision,null);
 }
});

test('Killer Megane can still deploy against an empty hand',()=>{
 const s=table(),martini=find(s.players[0].extra,MARTINI);
 cast(s,KILLER);
 pick(s,2);
 pickCard(s,martini);
 assert.ok(s.players[0].battle.includes(martini));
 assert.equal(s.decision,null);
});

test('Official reprints resolve to the original card IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 for(const [id,alias] of [[EXTRA,'dmx03-034'],[EXTRA,'dmex08-299'],[EXTRA,'dmex17-116'],[KILLER,'dmex08-282']]){
  assert.equal(catalogue.get(alias),catalogue.get(id));
  assert.equal(catalogue.get(id).limit,4);
 }
});
