import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {manualBoardHTML,newManualUI} from '../dist/manual-ui.js';
import {onlineScreenHTML} from '../dist/online-ui.js';
import {projectRoom} from '../server/duel-core.mjs';

const KUNGFU='dmrp15-009',ALICE='dmr11-010',BASIC='dm01-108',SPELL='dm01-027',WATER='dm01-030';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url)));
const ids=rows=>rows.map(x=>x.uid);
const pick=(s,value)=>act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===value);
const play=(s,x,vivid=false)=>act(s,'play',a=>a.uid===x.uid&&!!a.alternative===vivid);
const reveal=(s,yes)=>act(s,'vividReveal',a=>a.reveal===yes);
const vivid=(s,x)=>e.getLegalActions(s).find(a=>a.uid===x.uid&&a.alternative==='vividDraw1335');
function field(active=0){
 const s=Object.assign(setup(),{active});
 for(const p of [0,1])give(s,p,'deck',Array(24).fill(BASIC));
 return s;
}
function add(s,p,zone,id){const x=inst(id);s.players[p][zone].push(x);return x;}
function room(s,p){
 return projectRoom({game:s,phase:'playing',hostUid:'a',guestUid:'b',decks:[],profiles:[{},{}],
  events:[],expiresAt:10000},{uid:p?'b':'a'},1);
}
const art=()=>'',icon=()=>'';

test('Kung Fu’s official print resolves to its only ID with the complete original abilities',()=>{
 const m=read('tools/support-phase-1335.json'),[row]=m.cards,c=e.card(KUNGFU);
 assert.equal(row.id,KUNGFU);
 assert.deepEqual(m.printAliases,[]);
 assert.deepEqual(createCatalogue(snapshot,data.cards,details).resolveRows([{id:KUNGFU,count:1}]),[{id:KUNGFU,count:1}]);
 assert.deepEqual(data.cards.filter(v=>nameKey(v.name)===nameKey(row.name)).map(v=>v.id),[KUNGFU]);
 assert.deepEqual([c.name,c.cost,c.civilizations,c.power,c.manaValue,c.limit,c.breaker,c.text],
  [row.name,5,['水','火'],6000,1,4,2,row.faces[0].abilityText]);
 assert.equal(CARD_IMAGES[KUNGFU],row.image);
 assert.equal(read('tools/image-reference-prints.json').prints.find(x=>x.id===KUNGFU)?.image,row.image);
});

test('Alice pauses the draw for Vivid Draw and can return that same revealed card (QA 40504)',()=>{
 let s=field(1);
 give(s,1,'deck',[BASIC,KUNGFU,SPELL,...Array(8).fill(BASIC)]);
 const privateCard=add(s,1,'hand',WATER),alice=add(s,1,'hand',ALICE);
 const [first,kungFu,third]=s.players[1].deck;
 play(s,alice);pick(s,true);
 assert.equal(s.decision.stage,'vivid');
 assert.equal(s.decision.source,KUNGFU);
 assert.deepEqual(room(s,0).game.actions,[]);
 assert.equal(room(s,0).game.decision,null);
 assert.equal(room(s,0).game.revealedHand,undefined);
 s=JSON.parse(JSON.stringify(s));
 reveal(s,true);
 assert.equal(s.decision.task.op,'g34_Select');
 assert.deepEqual(ids(s.players[1].hand),ids([privateCard,first,kungFu,third]));
 const publicRoom=room(s,0);
 assert.deepEqual(ids(publicRoom.game.revealedHand),[kungFu.uid]);
 assert.equal(publicRoom.game.players[1].handCount,4);
 assert.deepEqual(e.observation(s,0).players[1].hand.map(x=>x.cardId),[undefined,undefined,KUNGFU,undefined]);
 assert.match(manualBoardHTML(s,newManualUI(),{art,icon}),/公開手札/);
 assert.match(onlineScreenHTML({room:publicRoom,connected:true},{user:{},art}),/相手の手札を見る 1/);
 assert.deepEqual(s.log.filter(x=>x.type==='vividDraw').map(x=>x.cardId),[KUNGFU]);
 pick(s,kungFu.uid);pick(s,first.uid);pick(s,1);
 assert.equal(s.players[1].deck[0].uid,kungFu.uid);
 assert.equal(s.players[1].deck.at(-1).uid,first.uid);
 assert.equal(room(s,0).game.revealedHand,undefined);
 assert.equal(vivid(s,kungFu),undefined);
});

test('Vivid Draw can be declined and the discount requires both water and fire',()=>{
 for(const accepted of [false,true]){
  const s=field();
  give(s,0,'deck',[KUNGFU,BASIC,BASIC,...Array(8).fill(BASIC)]);
  const [kungFu]=s.players[0].deck;
  play(s,add(s,0,'hand',ALICE));pick(s,true);reveal(s,accepted);
  const [,first,second]=s.players[0].hand;
  pick(s,first.uid);pick(s,second.uid);pick(s,0);
  assert.equal(vivid(s,kungFu)?.cost,accepted?3:undefined);
  if(!accepted){
   assert.equal(room(s,1).game.revealedHand,undefined);
   assert.ok(e.getLegalActions(s).some(a=>a.uid===kungFu.uid&&a.cost===5));
   continue;
  }
  give(s,0,'mana',['dm01-083','dm01-083',BASIC]);
  assert.equal(vivid(s,kungFu),undefined);
  give(s,0,'mana',['dm01-083','dm01-097',BASIC]);
  assert.equal(vivid(s,kungFu)?.cost,3);
  play(s,kungFu,true);
  const entered=s.players[0].battle.find(x=>x.uid===kungFu.uid);
  assert.ok(entered);
  assert.equal(entered.g1335Vivid,undefined);
  assert.equal(s.players[0].mana.filter(x=>x.tapped).length,3);
 }
});

test('Kung Fu discards the whole hand at the opposing turn end and draws two before the normal draw',()=>{
 const s=field(1);
 const kungFu=add(s,0,'battle',KUNGFU);
 give(s,0,'hand',[WATER,SPELL]);
 const oldHand=ids(s.players[0].hand);
 const top=ids(s.players[0].deck.slice(0,3));
 s.phase='attack';act(s,'endTurn');drain(s);
 assert.deepEqual(ids(s.players[0].grave),oldHand);
 assert.deepEqual(ids(s.players[0].hand),top);
 assert.equal(s.phase,'charge');
 assert.ok(s.players[0].battle.some(x=>x.uid===kungFu.uid));
 act(s,'skipCharge');
 attack(s,kungFu.uid);act(s,'noBlock');drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('Entering the attack step prevents a new Vivid Draw declaration and the turn end expires the previous reveal',()=>{
 const s=field();
 give(s,0,'deck',[KUNGFU,BASIC,BASIC,KUNGFU,...Array(8).fill(BASIC)]);
 const [first,,,second]=s.players[0].deck;
 play(s,add(s,0,'hand',ALICE));pick(s,true);reveal(s,true);
 pick(s,s.players[0].hand[1].uid);pick(s,s.players[0].hand[2].uid);pick(s,0);
 assert.equal(vivid(s,first)?.cost,3);
 act(s,'toAttack');
 assert.equal(vivid(s,first),undefined);
 s.extTasks=[{op:'draw',p:0,n:1,source:ALICE}];
 act(s,'endTurn');drain(s);
 assert.ok(s.players[0].hand.some(x=>x.uid===second.uid));
 assert.deepEqual(s.log.filter(x=>x.type==='vividDraw').map(x=>x.cardId),[KUNGFU]);
 assert.equal(room(s,1).game.revealedHand,undefined);
});

test('Vivid Draw combines with an optional ordinary summon reduction (QA 34197)',()=>{
 for(const cost of [2,3]){
  const s=field(1);
  give(s,0,'deck',[KUNGFU,...Array(8).fill(BASIC)]);
  const [kungFu]=s.players[0].deck;
  add(s,0,'battle','dmr09-084');
  s.phase='attack';act(s,'endTurn');reveal(s,true);act(s,'skipCharge');
  give(s,0,'mana',['dm01-083','dm01-097',BASIC]);
  assert.deepEqual(e.getLegalActions(s).filter(a=>a.uid===kungFu.uid&&a.alternative==='vividDraw1335').map(a=>a.cost),[2,3]);
  act(s,'play',a=>a.uid===kungFu.uid&&a.alternative==='vividDraw1335'&&a.cost===cost);
  assert.equal(s.players[0].mana.filter(x=>x.tapped).length,cost);
 }
});
