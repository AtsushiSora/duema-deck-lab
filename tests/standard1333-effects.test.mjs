import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {manualBoardHTML,newManualUI} from '../dist/manual-ui.js';
import {onlineScreenHTML} from '../dist/online-ui.js';
import {projectRoom} from '../server/duel-core.mjs';

const DELFIN='dm22-001',ALICE='dmr11-010',MOJITO='dmr01-004',CREATURE='dm01-083';
const BASIC='dm01-108',SPELL='dm01-027',TWIN='dmrp08-029',BLOCKER='dm01-001';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url)));
const ids=rows=>rows.map(x=>x.uid);
const pick=(s,value)=>act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===value);
const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);
function field(active=0){
 const s=setup();
 s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(24).fill(BASIC));
 return s;
}
function add(s,p,zone,id){const x=inst(id);s.players[p][zone].push(x);return x;}
function room(s,p){
 return projectRoom({game:s,phase:'playing',hostUid:'a',guestUid:'b',decks:[],profiles:[{name:'A'},{name:'B'}],
  events:[],expiresAt:10000},{uid:p?'b':'a'},1);
}
const art=()=>'',icon=()=>'';

test('Six official prints resolve to the original Delfin ID and only one duel entry',()=>{
 const manifest=read('tools/support-phase-1333.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const [delfin]=manifest.cards;
 assert.equal(delfin.id,DELFIN);
 assert.equal(manifest.printAliases.length,5);
 assert.equal(CARD_IMAGES[DELFIN],delfin.image);
 for(const {id,name,source,image} of [delfin,...manifest.printAliases]){
  assert.deepEqual(catalogue.resolveRows([{id,count:1}]),[{id:DELFIN,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[DELFIN]);
  assert.deepEqual(refs.find(x=>x.id===id),{id,canonicalId:DELFIN,name,source,image});
 }
 assert.deepEqual([e.card(DELFIN).cost,e.card(DELFIN).power,e.card(DELFIN).breaker,e.card(DELFIN).limit],[9,6000,2,4]);
});

test('Delfin immediately exposes the opposing hand, counts spells including twinpacts and ends its restrictions when ignored or removed',()=>{
 const s=field(1);
 give(s,0,'hand',[CREATURE,SPELL,TWIN]);
 give(s,1,'hand',[BLOCKER,DELFIN]);
 const actual=s.players[1].hand[1];
 assert.ok(!room(s,1).game.revealedHand);
 play(s,actual);
 assert.equal(e.power(actual,false,s),10000);
 for(const origin of ['hand','deck','grave','mana','extra','battle','shields']){
  assert.equal(e.canCastSpell(s,0,e.card(SPELL),origin),false);
  assert.equal(e.canCastSpell(s,1,e.card(SPELL),origin),true);
 }
 assert.equal(e.canCastSpell(s,0,e.card(CREATURE),'hand'),true);
 assert.deepEqual(ids(room(s,1).game.revealedHand),ids(s.players[0].hand));
 assert.equal(room(s,0).game.revealedHand,undefined);
 assert.ok(!JSON.stringify(room(s,0)).includes(s.players[1].hand[0].uid));
 assert.equal(e.observation(s,1).players[0].hand[1].cardId,SPELL);
 const online=onlineScreenHTML({room:room(s,1),connected:true},{user:{},art});
 assert.match(online,/相手の手札を見る/);
 actual.g35Ignored=s.turn;
 assert.equal(e.power(actual,false,s),6000);
 assert.equal(room(s,1).game.revealedHand,undefined);
 assert.equal(e.canCastSpell(s,0,e.card(SPELL),'hand'),true);
 delete actual.g35Ignored;
 s.players[1].battle=[];
 assert.equal(room(s,1).game.revealedHand,undefined);
});

test('Delfin permits a creature S Trigger but prevents a spell S Trigger and breaks two shields',()=>{
 const s=field(),delfin=add(s,0,'battle',DELFIN);
 const triggerCreature='dmrp18-066';
 give(s,1,'shields',[SPELL,triggerCreature]);
 const [spell,creature]=s.players[1].shields;
 attack(s,delfin.uid);act(s,'noBlock');
 const actions=e.getLegalActions(s);
 assert.ok(!actions.some(a=>a.cardId===SPELL));
 assert.ok(actions.some(a=>a.cardId===triggerCreature));
 drain(s);
 assert.equal(s.players[1].shields.length,0);
 assert.ok(s.players[1].hand.some(x=>x.uid===spell.uid));
 assert.ok(!s.players[1].grave.some(x=>x.uid===spell.uid));
 assert.ok(e.physicalCards(s).some(x=>x.uid===creature.uid));
});

test('Alice shows the selected two cards without revealing their order or which goes on top (QA 34329)',()=>{
 for(const reverse of [false,true]){
  let s=field(),delfin=add(s,1,'battle',DELFIN),alice=add(s,0,'hand',ALICE);
  give(s,0,'deck',[BASIC,BLOCKER,SPELL,BASIC,BASIC]);
  const [first,second,third]=s.players[0].deck;
  play(s,alice);pick(s,true);
  const toReturn=reverse?[third,second]:[second,third];
  for(const x of toReturn)pick(s,x.uid);
  assert.deepEqual(ids(room(s,1).game.revealedHand),ids([first,second,third]));
  assert.deepEqual(room(s,1).game.actions,[]);
  assert.equal(room(s,1).game.decision,null);
  assert.ok(!JSON.stringify(room(s,1)).includes('g34_SplitDeck1247'));
  s=JSON.parse(JSON.stringify(s));
  pick(s,1);
  assert.equal(s.players[0].deck[0].uid,toReturn[0].uid);
  assert.equal(s.players[0].deck.at(-1).uid,toReturn[1].uid);
  assert.deepEqual(ids(room(s,1).game.revealedHand),[first.uid]);
  assert.deepEqual(s.log.find(x=>x.type==='g1333PublicHandReturn')?.cardIds,[BLOCKER,SPELL]);
  assert.equal(e.power(delfin,false,s),6000);
 }
});

test('Mojito hides the revealed hand and presents unmapped numbered slots during the opponent choice (QA 36354)',()=>{
 let s=field(0),delfin=add(s,0,'battle',DELFIN);
 give(s,1,'hand',[CREATURE,SPELL]);
 const [revealed,other]=s.players[1].hand;
 const ally=add(s,1,'battle',BASIC);
 add(s,1,'battle',MOJITO);
 assert.deepEqual(ids(room(s,0).game.revealedHand),[revealed.uid,other.uid]);
 assert.match(manualBoardHTML(s,newManualUI(),{art,icon}),/公開手札/);
 s.phase='attack';act(s,'endTurn');
 assert.equal(s.decision.task.op,'g34_BlindReveal803');
 assert.equal(s.decision.player,0);
 const projected=room(s,0);
 assert.equal(projected.game.revealedHand,undefined);
 assert.deepEqual(projected.game.actions.map(x=>x.label),['裏向きの手札 1','裏向きの手札 2']);
 assert.ok(!JSON.stringify(projected).includes(revealed.uid));
 assert.doesNotMatch(manualBoardHTML(s,newManualUI(),{art,icon}),/公開手札/);
 assert.doesNotMatch(onlineScreenHTML({room:projected,connected:true},{user:{},art}),/相手の手札を見る/);
 const slot=s.decision.task.slots.indexOf(revealed.uid);
 s=JSON.parse(JSON.stringify(s));
 pick(s,slot);pick(s,ally.uid);drain(s);
 assert.ok(s.players[1].battle.some(x=>x.uid===revealed.uid));
 assert.ok(s.players[1].hand.some(x=>x.uid===ally.uid));
 assert.deepEqual(ids(room(s,0).game.revealedHand),ids(s.players[1].hand));
 assert.ok(e.handIsPublic(s,1));
 assert.ok(s.players[0].battle.some(x=>x.uid===delfin.uid));
});
