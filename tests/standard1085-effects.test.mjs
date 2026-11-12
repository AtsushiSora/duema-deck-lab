import test from 'node:test';
import assert from 'node:assert/strict';
import {act,attack,cast,drain,e,give,inst,PRESETS} from './target-fixture.mjs';

const BOLSHACK='dm36-s07', HOLE='dm36-101', CURSE='dm36-027', WEAK='dm01-108';
const extraCards=[{id:BOLSHACK,count:1}];
const advance=extra=>({...PRESETS[0],format:'advance',extraCards:extra??[]});
const values=s=>s.decision?.choices?.map(x=>x.value?.uid??x.value)??[];
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const add=(s,p,z,id,extra={})=>{const x=Object.assign(inst(id),extra);s.players[p][z].push(x);return x;};
const ids=s=>s.players.flatMap(p=>['deck','hand','shields','battle','grave','mana','extra'].flatMap(z=>p[z].map(x=>x.uid))).sort();

function table(){
 const s=e.createGame([advance(extraCards),advance()],{seed:141});
 s.phase='main';
 for(const p of [0,1]){
  give(s,p,'mana',Array(6).fill('dm01-097'));
  give(s,p,'hand',[]);
  give(s,p,'shields',Array(5).fill(WEAK));
 }
 return s;
}
function putBolshack(s){
 const x=s.players[0].extra[0];
 cast(s,HOLE);
 assert.equal(s.decision?.task?.op,'g34_Choose');
 pick(s,1);
 pick(s,x.uid);
 assert.equal(s.players[0].battle.at(-1)?.uid,x.uid);
 return x;
}
function awaken(s,x){
 const victim=add(s,1,'battle',WEAK,{tapped:true});
 s.turn++;
 attack(s,x.uid,victim.uid);
 drain(s);
 assert.equal(e.card(x).name,'勝利の覚醒者ボルシャック・メビウス');
 assert.equal(e.card(x).race,'アーマード・ドラゴン');
 assert.ok(x.tapped);
}
function chooseOrders(s){
 for(let i=0;i<20&&['effectOrder','entryOrder'].includes(s.decision?.type);i++){
  const a=e.getLegalActions(s)[0];
  assert.equal(a.kind,'orderEffect');
  e.step(s,a);
 }
}

test('Original and Advance validate independently; old decks start without initial extra cards',()=>{
 assert.deepEqual(e.validateDeck({...PRESETS[0],format:undefined}),[]);
 assert.equal(e.createGame([PRESETS[0],PRESETS[1]]).players[0].extra.length,0);
 assert.match(e.validateDeck({...PRESETS[0],extraCards})[0],/オリジナル/);
 assert.match(e.validateDeck(advance([{id:BOLSHACK,count:5}]))[0],/4枚/);
 assert.match(e.validateDeck(advance([{id:HOLE,count:1}]))[0],/超次元/);
 assert.throws(()=>e.createGame([advance(extraCards),PRESETS[1]]),/同じフォーマット/);
 const s=table();
 assert.equal(s.format,'advance');
 assert.equal(s.players[0].extra[0].cardId,BOLSHACK);
 assert.equal(new Set(ids(s)).size,ids(s).length);
});

test('Bolshack Hole destroys a small opposing creature before putting a fire Psychic into play',()=>{
 const s=table(),victim=add(s,1,'battle',WEAK),x=s.players[0].extra[0];
 cast(s,HOLE);
 pick(s,victim.uid);
 assert.ok(s.players[1].grave.includes(victim));
 pick(s,1);
 pick(s,x.uid);
 assert.ok(s.players[0].battle.includes(x));
 assert.equal(e.card(x).breaker,2);
});

for(const copies of [1,2])test('Curse Guy and Psychic Release, official rulings 36037/36039, '+copies+' Curse Guy',()=>{
 const s=table(),x=putBolshack(s);
 awaken(s,x);
 s.turn++;
 x.tapped=false;
 const defenders=Array.from({length:copies},()=>add(s,1,'battle',CURSE));
 const before=ids(s);
 attack(s,x.uid);
 chooseOrders(s);
 drain(s);
 assert.ok(defenders.every(y=>s.players[1].grave.includes(y)));
 assert.equal(e.card(x).name,'時空の火焔ボルシャック・ドラゴン');
 if(copies===1){
  assert.ok(s.players[0].battle.includes(x));
  assert.equal(s.players[1].shields.length,3);
 }else{
  assert.ok(s.players[0].extra.includes(x));
  assert.equal(s.players[1].shields.length,5);
 }
 assert.deepEqual(ids(s),before);
});

test('Awakened Bolshack can trade one shield for removal and untaps only on the first tap each turn',()=>{
 const s=table(),x=putBolshack(s);
 awaken(s,x);
 s.turn++;
 x.tapped=false;
 const foe=add(s,1,'battle',WEAK);
 attack(s,x.uid);
 chooseOrders(s);
 const shield=s.players[0].shields[0];
 pick(s,shield.uid);
 pick(s,foe.uid);
 drain(s);
 assert.ok(s.players[0].grave.includes(shield));
 assert.ok(s.players[1].grave.includes(foe));
 assert.equal(s.players[1].shields.length,2);
 assert.equal(x.tapped,false);
 attack(s,x.uid);
 if(values(s).includes(null))pick(s,null);
 drain(s);
 assert.equal(x.tapped,true);
});

test('CPU selects the viable Psychic mode in Advance',()=>{
 const s=table(),x=s.players[0].extra[0];
 cast(s,HOLE);
 const choice=e.chooseAI(s);
 assert.equal(values(s)[choice.choice],1);
 e.step(s,choice);
 drain(s);
 assert.ok(s.players[0].battle.includes(x));
});
