import test from 'node:test';
import assert from 'node:assert/strict';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue} from '../dist/catalogue.js';

const AMO='dmrp19-s10', BLUES='dmbd17-009', SC='dm23rp1-S4', MEDAL='dm25rp4-024';
const GRIP='dm36-086', TYPHOON='dm11-043', BABYLONIA='dm32-021', SHAKO='dmrp03-s03';
const GREEN='dm01-108', BLUE='dm01-083', QX='dmrp07-m01';
const add=(s,p,z,id)=>{const x=inst(id);s.players[p][z].push(x);return x;};
const field=()=>{
 const s=setup();s.active=0;
 for(const p of [0,1]){give(s,p,'grave',[]);give(s,p,'deck',Array(18).fill(GREEN));}
 return s;
};
const choose=(s,v)=>act(s,'extended',a=>{
 const r=s.decision.choices[a.choice].value;
 return typeof v==='function'?v(r):(r?.uid??r)===v;
});

test('Melnias Medal discards nothing when Amodegoras replaces all five draws (QA47907)',()=>{
 const s=field();add(s,1,'battle',AMO);give(s,1,'hand',Array(5).fill(GREEN));
 cast(s,GRIP); // The turn's first actual draw.
 const {deck,hand,mana,grave}=s.players[0],beforeHand=[...hand],beforeGrave=[...grave],next=deck.slice(0,5),manaCount=mana.length;
 cast(s,MEDAL);
 assert.equal(s.decision,null);
 assert.deepEqual(hand,beforeHand);
 assert.deepEqual(grave,beforeGrave);
 assert.deepEqual(mana.slice(manaCount),next);
 assert.equal(s.players[0].drawsThisTurn,1);
});

test('Amodegoras allows one draw within a single effect and does not put a sideways card into hand (QA40214)',()=>{
 const s=field();add(s,1,'battle',AMO);add(s,1,'battle',QX);give(s,1,'hand',Array(2).fill(GREEN));
 const [first,sideways]=s.players[0].deck;sideways.g11Sideways=true;
 cast(s,MEDAL);
 assert.deepEqual(s.players[0].hand,[first]);
 assert.equal(s.players[0].mana.at(-1),sideways);
 assert.equal(sideways.g11Sideways,undefined);
 assert.equal(s.winner,null);
});

test('Shako does not win when Amodegoras sends the last card to mana (QA44089)',()=>{
 const s=field();add(s,0,'battle',SHAKO);add(s,1,'battle',AMO);
 give(s,0,'deck',Array(5).fill(GREEN));
 const [first,...rest]=s.players[0].deck;
 s.phase='attack';act(s,'endTurn');drain(s);
 assert.deepEqual(s.players[0].hand,[first]);
 assert.deepEqual(s.players[0].mana.slice(-4),rest);
 assert.equal(s.winner,1);
});

test('Amodegoras has EX Life, Blocker and W Breaker and can redirect or decline its own discard',()=>{
 for(const replace of [true,false]){
  const s=field();cast(s,AMO);const amo=s.players[0].battle[0],own=s.players[0];
  assert.equal(own.shields.length,6);
  assert.ok(amo.exLifeShieldUid);
  assert.equal(e.effectiveCard(amo,s).blocker,true);
  assert.equal(e.effectiveCard(amo,s).breaker,2);
  const selected=add(s,0,'hand',AMO);
  cast(s,TYPHOON);choose(s,1);choose(s,selected.uid);
  choose(s,replace?v=>v?.g1090Mana:false);
  assert.equal(own.mana.includes(selected),replace);
  assert.equal(own.grave.includes(selected),!replace);
  assert.equal(!!own.discardedThisTurn,!replace);
  if(replace)assert.equal(selected.tapped,true);
 }
});

test('Babylonia can put its discarded card into mana via Amodegoras (QA40217)',()=>{
 const s=field();add(s,0,'battle',BABYLONIA);add(s,0,'battle',AMO);
 const discard=add(s,0,'hand',GREEN);
 cast(s,GRIP);act(s,'replaceDraw',a=>a.replace);act(s,'discardDraw',a=>a.uid===discard.uid&&a.toMana);
 assert.equal(s.players[0].mana.at(-1),discard);
 assert.equal(s.players[0].grave.includes(discard),false);
 assert.equal(s.players[0].drawsThisTurn,2);
});

test('On the drawing player’s turn Babylonia can replace a later draw before the opposing Amodegoras',()=>{
 const s=field();add(s,0,'battle',BABYLONIA);add(s,1,'battle',AMO);
 const own=s.players[0],n=own.mana.length;
 cast(s,GRIP);act(s,'replaceDraw',a=>!a.replace);
 cast(s,GRIP);act(s,'replaceDraw',a=>a.replace);act(s,'discardDraw');
 assert.equal(own.drawsThisTurn,3);
 assert.equal(own.mana.length,n);
 cast(s,GRIP);act(s,'replaceDraw',a=>!a.replace);
 assert.equal(own.drawsThisTurn,3);
 assert.equal(own.mana.length,n+1);
});

test('On the other player’s turn Amodegoras takes priority over the drawing player’s Babylonia',()=>{
 const s=field(),own=s.players[0];cast(s,GRIP);
 add(s,0,'battle',BABYLONIA);add(s,1,'battle',AMO);
 s.active=1;
 const [top]=own.deck;
 cast(s,BABYLONIA);
 choose(s,own.hand[0].uid);
 assert.equal(s.decision,null);
 assert.equal(own.mana.at(-1),top);
 assert.equal(own.drawsThisTurn,1);
});

test('Dis Pylon checks its Mana Armament after Amodegoras puts the fourth multicolor card into mana (QA40636)',()=>{
 const s=field(),own=s.players[0],discard=add(s,0,'hand',AMO);
 add(s,0,'battle',AMO);
 for(let i=0;i<3;i++)add(s,0,'mana',AMO);
 cast(s,'dmrp20-082');
 act(s,'orderEffect',a=>s.pendingEffects.find(x=>x.effectId===a.effectId)?.effect==='entry');
 choose(s,discard.uid);choose(s,v=>v?.g1090Mana);drain(s);
 assert.equal(own.mana.at(-1),discard);
 assert.equal(own.hand.length,2);
 assert.equal(own.discardedThisTurn||false,false);
});

test('Amodegoras can replace a hand discard simultaneous with its own removal',()=>{
 const s=field(),own=s.players[1],amo=add(s,1,'battle',AMO),ally=add(s,1,'battle',GREEN);
 give(s,1,'shields',Array(3).fill(GREEN));
 give(s,1,'hand',[GREEN,GREEN,AMO]);const [keep1,keep2,discard]=own.hand;
 cast(s,'dm24rp4-DM1');
 choose(s,keep1.uid);choose(s,keep2.uid);choose(s,ally.uid);
 choose(s,v=>v?.g1090Mana);drain(s);
 assert.equal(own.mana.at(-1),discard);
 assert.deepEqual(own.grave,[amo]);
 assert.deepEqual(own.battle,[ally]);
});

test('Amodegoras does not replace Reverse Dragon’s shield replacement draws (QA48470)',()=>{
 const s=field(),dragon=add(s,0,'battle','dm26rp1-DM001');
 dragon.hyperActive=true;dragon.hyperResolved=true;
 add(s,1,'battle',AMO);
 const n=s.players[0].mana.length;
 attack(s,dragon.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 drain(s);
 assert.equal(s.players[0].hand.length,3);
 assert.equal(s.players[1].hand.length,3);
 assert.equal(s.players[0].mana.length,n);
 assert.equal(s.players[1].shields.length,2);
});

test('Amodegoras does not replace the draw from storing a spell under New World (QA42954)',()=>{
 const s=field(),own=s.players[0];add(s,1,'battle',AMO);
 cast(s,GRIP);cast(s,'dmrp08-005');
 const magic=add(s,0,'hand','dmex08-293'),[top]=own.deck;
 act(s,'play',a=>a.uid===magic.uid);
 assert.equal(s.decision?.task?.op,'g4_Store');
 act(s,'extended',a=>!!s.decision.choices[a.choice].value);
 assert.equal(own.battle[0].under[0],magic);
 assert.equal(own.hand.at(-1),top);
 assert.equal(own.drawsThisTurn,2);
});

test('Blues spell revives SC, which puts the resolving twinpact into battle (QA43075)',()=>{
 const s=field(),sc=add(s,0,'grave',SC),blues=add(s,0,'hand',BLUES);
 const high=add(s,0,'grave',AMO),spell=add(s,0,'grave',GRIP);
 act(s,'play',a=>a.uid===blues.uid&&a.face===1);
 assert.deepEqual(s.decision.choices.map(x=>x.value?.uid??x.value),[sc.uid]);
 choose(s,sc.uid);
 assert.deepEqual(s.players[0].battle,[sc,blues]);
 assert.deepEqual(s.players[0].grave,[high,spell]);
 assert.equal(blues.summonedTurn,undefined);
});

test('Blues spell cast from hand via S-Trigger can also be placed into battle by SC',()=>{
 const s=field(),attacker=add(s,0,'battle',BLUE),sc=add(s,1,'grave',SC);
 give(s,1,'shields',[BLUES]);const [blues]=s.players[1].shields;
 attack(s,attacker.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 act(s,'useTrigger',a=>a.cardId===BLUES);
 choose(s,sc.uid);drain(s);
 assert.deepEqual(s.players[1].battle,[sc,blues]);
 assert.deepEqual(s.players[1].grave,[]);
});

test('Blues may mill at its own turn end and attacks with T Breaker at thirteen grave cards',()=>{
 for(const mill of [false,true]){
  const s=field(),blues=add(s,0,'battle',BLUES),own=s.players[0];
  give(s,0,'grave',Array(12).fill(GREEN));s.phase='attack';
  assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===blues.uid));
  assert.equal(e.effectiveCard(blues,s).breaker,3);
  const [top]=own.deck;
  act(s,'endTurn');choose(s,mill?true:null);drain(s);
  assert.equal(own.grave.includes(top),mill);
  s.phase='attack';act(s,'endTurn');drain(s);act(s,'skipCharge');act(s,'toAttack');
  assert.equal(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===blues.uid),mill);
 }
});

test('All four verified Blues reprints use its existing ID and share the four-copy limit',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const reprints=['dm22rp1-T1','dm22rp2-T1','dm22rp2-TF1','dm22rp2x-TF1'];
 const cards=[BLUES,...reprints].map(id=>({id,count:1}));
 assert.ok(cards.every(({id})=>registry.get(id)?.supported&&registry.get(id).id===BLUES));
 assert.deepEqual(registry.resolveRows(cards),[{id:BLUES,count:5}]);
 assert.ok(registry.validate({cards:[...cards,{id:GREEN,count:35}]}).some(x=>x.includes('ブルース')&&x.endsWith('4枚までです')));
});
