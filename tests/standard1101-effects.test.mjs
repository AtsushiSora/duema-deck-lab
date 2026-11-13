import test from 'node:test';
import assert from 'node:assert/strict';
import {manualScreenHTML,newManualUI} from '../dist/manual-ui.js';
import {createCatalogue} from '../dist/catalogue.js';
import {act,cast,data,details,e,give,inst,PRESETS,snapshot} from './target-fixture.mjs';

const ENERGY='dm22ex1-127', RED='dm22ex1-112', OFLAME='dmpcd03-a12', SHACHIHOKO='dmx05-016';
const BOLSHACK='dm36-s07', UNTOUCHABLE='dm37-021', JOHN='dm37-033';
const LIGHT='dm01-076', WATER='dm01-083', DARK='dm01-090', FIRE='dm01-097', NATURE='dm01-108';
const ALIEN='dmx11-080', BLOCKER='dm01-079';
const values=s=>s.decision?.choices?.map(c=>c.value?.uid??c.value)??[];
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);
const play=(s,id,face)=>act(s,'play',a=>a.cardId===id&&a.face===face);
const end=s=>{s.phase='attack';act(s,'endTurn');};
function table(){
 const extraCards=[BOLSHACK,UNTOUCHABLE,JOHN].map(id=>({id,count:1}));
 const decks=PRESETS.slice(0,2).map(deck=>({...deck,format:'advance',extraCards}));
 const s=e.createGame(decks,{seed:1101});
 s.phase='main';
 give(s,0,'mana',[LIGHT,WATER,DARK,FIRE,NATURE].flatMap(id=>Array(5).fill(id)));
 give(s,0,'hand',[]);
 give(s,1,'hand',[]);
 return s;
}
function testPsychic(id,civ,cost,race=''){
 return {id,name:id,civ,civilizations:[civ],type:'creature',cost,race,power:1000,psychic:true,manaValue:0};
}

test('the two spell faces use their own names, mana colors and effects',()=>{
 for(const face of [0,1]){
  const s=table(),own=s.players[0],top=own.deck[0],john=own.extra.find(x=>x.cardId===JOHN);
  give(s,0,'hand',[ENERGY]);
  give(s,0,'mana',Array(5).fill(face===0?WATER:LIGHT));
  const plays=e.getLegalActions(s).filter(a=>a.kind==='play'&&a.cardId===ENERGY);
  assert.deepEqual(plays.map(a=>[a.face,a.cost,a.label]),[face===0?[0,5,'超次元エナジー・ホールを使用']:[1,3,'超次元サプライズ・ホールを使用']]);
  play(s,ENERGY,face);
  assert.equal(own.hand.includes(top),face===0);
  pick(s,0);
  if(face===0)pick(s,john.uid);
  const untouchable=own.extra.find(x=>x.cardId===UNTOUCHABLE);
  pick(s,untouchable.uid);
  assert.deepEqual(own.battle.map(x=>x.cardId),face===0?[JOHN,UNTOUCHABLE]:[UNTOUCHABLE]);
  assert.deepEqual(own.grave.map(x=>x.cardId),[ENERGY]);
  assert.equal(own.mana.filter(x=>x.tapped).length,face===0?5:3);
 }
 const s=table(),own=s.players[0];
 give(s,0,'hand',[ENERGY]);
 s.phase='charge';
 act(s,'charge');
 assert.equal(own.mana.at(-1).tapped,true);
 assert.deepEqual(new Set(e.manaColors(e.card(ENERGY))),new Set(['光','水']));
});

test('manual casting labels both spell choices by their printed names',()=>{
 const s=table();
 give(s,0,'hand',[ENERGY]);
 const ui={...newManualUI(),mobile:true,hand:s.players[0].hand[0].uid};
 const html=manualScreenHTML(s,ui,{art:()=>'',icon:()=>''});
 assert.match(html,/呪文を使う · 5マナ（超次元エナジー・ホール）/);
 assert.match(html,/呪文を使う · 3マナ（超次元サプライズ・ホール）/);
});

test('only Surprise can be cast as the twinpact Shield Trigger, and pays no mana',()=>{
 const s=table(),own=s.players[0],attacker=inst(NATURE);
 give(s,0,'shields',[ENERGY]);
 give(s,0,'mana',[]);
 s.players[1].battle.push(attacker);
 s.active=1;
 s.phase='attack';
 act(s,'attack',a=>a.uid===attacker.uid&&a.target==='player');
 act(s,'noBlock');
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='useTrigger').map(a=>a.face),[1]);
 act(s,'useTrigger',a=>a.face===1);
 pick(s,1);
 const untouchable=own.extra.find(x=>x.cardId===UNTOUCHABLE);
 pick(s,untouchable.uid);
 assert.deepEqual(own.battle,[untouchable]);
 assert.deepEqual(own.grave.map(x=>x.cardId),[ENERGY]);
 assert.equal(own.mana.length,0);
});

test('the Red can attack immediately, or its spell face destroys a blocker and deploys John',()=>{
 const summon=table();
 give(summon,0,'hand',[RED]);
 play(summon,RED,0);
 const creature=summon.players[0].battle[0];
 assert.equal(creature.cardId,RED);
 summon.phase='attack';
 assert.ok(e.getLegalActions(summon).some(a=>a.kind==='attack'&&a.uid===creature.uid&&a.target==='player'));

 const s=table(),own=s.players[0],opp=s.players[1],blocker=inst(BLOCKER),other=inst(NATURE);
 opp.battle.push(blocker,other);
 give(s,0,'hand',[RED]);
 play(s,RED,1);
 assert.deepEqual(values(s),[blocker.uid]);
 pick(s,blocker.uid);
 assert.ok(opp.grave.includes(blocker));
 pick(s,1);
 const john=own.extra.find(x=>x.cardId===JOHN);
 assert.deepEqual(values(s),[john.uid]);
 pick(s,john.uid);
 assert.deepEqual(own.battle,[john]);
 assert.deepEqual(own.grave.map(x=>x.cardId),[RED]);
});

test('Oflame only deploys Fire Psychics costing at most five',()=>{
 const example=testPsychic('phase1101-fire-five','火',5);
 e.setCards([...data.cards,example]);
 try{
  const s=table(),own=s.players[0],target=inst(example.id);
  own.extra.push(target);
  cast(s,OFLAME);
  assert.deepEqual(values(s),[target.uid]);
  pick(s,target.uid);
  assert.deepEqual(own.battle,[target]);
  assert.equal(own.extra.length,3);
 }finally{
  e.setCards(data.cards);
 }
});

test('Shachihoko protects existing Aliens only during the next opposing turn (QA 36423)',()=>{
 const alien=testPsychic('phase1101-alien-seven','火',7,'エイリアン');
 const larger=testPsychic('phase1101-alien-eight','火',8,'エイリアン');
 e.setCards([...data.cards,alien,larger]);
 try{
  const s=table(),own=s.players[0],opp=s.players[1];
  const ally=inst(ALIEN),target=inst(alien.id),tooLarge=inst(larger.id),other=inst(NATURE);
  own.battle.push(ally,other);
  own.extra.push(target,tooLarge);
  cast(s,SHACHIHOKO);
  assert.deepEqual(values(s),[target.uid]);
  pick(s,target.uid);
  assert.ok(own.battle.includes(target));
  assert.equal(!!e.effectiveCard(ally,s).cannotBeAttacked,false);

  const enemy=inst(NATURE);
  opp.battle.push(enemy);
  end(s);
  for(const x of [ally,target,other])x.tapped=true;
  s.phase='attack';
  const canAttack=x=>e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===enemy.uid&&a.target===x.uid);
  assert.equal(s.active,1);
  assert.equal(canAttack(ally),false);
  ally.g35Ignored=s.turn;
  assert.equal(canAttack(ally),false);
  delete ally.g35Ignored;
  assert.equal(canAttack(target),true);
  assert.equal(canAttack(other),true);
  const restored=JSON.parse(JSON.stringify(s));
  assert.equal(!!e.effectiveCard(restored.players[0].battle[0],restored).cannotBeAttacked,true);
  end(s);
  assert.equal(!!e.effectiveCard(ally,s).cannotBeAttacked,false);
 }finally{
  e.setCards(data.cards);
 }
});

test('new definitions keep distinct canonical IDs and do not replace the single-face cards',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 for(const id of [ENERGY,RED,OFLAME,SHACHIHOKO,'dm36-085','dm37-039','dm37-049']){
  assert.equal(registry.get(id).id,id);
  assert.equal(e.card(id).limit,4);
 }
 assert.equal(registry.get('dm25ex4-T28'),registry.get(ENERGY));
 assert.equal(registry.get('dm25ex4-T23'),registry.get(RED));
 assert.equal(e.card(ENERGY).name,'超次元エナジー・ホール / 超次元サプライズ・ホール');
});
