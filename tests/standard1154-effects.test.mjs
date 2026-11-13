import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const ENBU='dm30-050',DEALER='dmr17-038',CYCLONE='dmx20-010',DICE='dmx20-002';
const F='dm01-097',W='dm01-083',N='dm01-108',L='dm01-075',B='dm01-079';
const put=(s,p,id,attrs={})=>{
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
};
const pick=(s,value)=>act(s,'extended',a=>s.decision.choices[a.choice].value===value);
const power=(s,x)=>e.power(x,false,s);
const race=(s,x)=>e.effectiveCard(x,s).race.split('/');
const bottomChoices=s=>s.decision.choices.map(x=>x.value);

test('phase 1154 preserves four official definitions and the Dice Dice print alias',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-1154.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(c=>c.id),[ENBU,DEALER,CYCLONE,DICE]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[['dmx22b-117',DICE]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1154}),row.spec);
  assert.equal(c.cost,f.cost);
  assert.equal(c.power,parseInt(f.powerText,10)||0);
  assert.equal(c.manaValue,1);
  assert.equal(c.limit,m.regulationVerification.limits[row.id]);
  assert.deepEqual(c.civilizations,f.civilizations);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.equal(registry.get(row.id).id,id);
  assert.equal(registry.byName.get(nameKey(row.name)).id,id);
  if(!row.canonicalId){
   assert.deepEqual(details.cards.find(x=>x.id===id).faces,row.faces);
   assert.equal(CARD_IMAGES[id],row.image);
  }
 }
});

for(const copies of [0,1,2])test('Enbu grants power before the blocked battle and expires, copies '+copies,()=>{
 const s=setup(),attacker=put(s,0,F),other=put(s,0,F),blocker=put(s,1,B);
 for(let i=0;i<copies;i++)cast(s,ENBU);
 assert.equal(power(s,attacker),2000);
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===blocker.uid);
 drain(s);
 assert.equal(s.players[0].battle.includes(attacker),copies>0);
 assert.equal(s.players[1].grave.some(x=>x.uid===blocker.uid),copies>0);
 assert.equal(power(s,other),2000);
 if(copies)assert.equal(power(s,attacker),2000+4000*copies);
 act(s,'endTurn');
 drain(s);
 if(copies)assert.equal(power(s,attacker),2000);
});

test('Enbu ignores an unblocked attack and works for an ally entering after the spell',()=>{
 const s=setup(),first=put(s,0,F),blocker=put(s,1,B);
 cast(s,ENBU);
 cast(s,F);
 const late=s.players[0].battle.at(-1);
 late.entered=0;
 attack(s,first.uid);
 act(s,'noBlock');
 drain(s);
 assert.equal(power(s,first),2000);
 attack(s,late.uid);
 act(s,'block',a=>a.uid===blocker.uid);
 drain(s);
 assert.equal(power(s,late),6000);
});

test('Dealer ignores the normal turn draw and stacks on a two-card effect draw',()=>{
 const s=setup(),dealer=put(s,0,DEALER);
 s.active=1;
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
 assert.equal(s.active,0);
 assert.equal(s.players[0].drawsThisTurn,1);
 assert.equal(power(s,dealer),2000);
 assert.ok(!race(s,dealer).includes('マジック・コマンド'));
 act(s,'skipCharge');
 cast(s,'dm01-003');
 drain(s);
 assert.equal(s.players[0].drawsThisTurn,3);
 assert.equal(power(s,dealer),6000);
 assert.equal(race(s,dealer).filter(r=>r==='マジック・コマンド').length,1);
 act(s,'toAttack');
 act(s,'endTurn');
 drain(s);
 assert.equal(power(s,dealer),2000);
 assert.ok(!race(s,dealer).includes('マジック・コマンド'));
});

test('Dealer triggers for the first effect draw on the opponent turn',()=>{
 const s=setup(),dealer=put(s,0,DEALER),attacker=put(s,1,F);
 give(s,0,'shields',['dm18-065',N]);
 give(s,0,'deck',[W,N,F,L]);
 s.active=1;
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 pick(s,2);
 drain(s);
 assert.ok(s.players[0].drawsThisTurn>0);
 assert.equal(power(s,dealer),2000+2000*s.players[0].drawsThisTurn);
 assert.ok(race(s,dealer).includes('マジック・コマンド'));
});

test('Dealer triggers only for cards actually drawn when Amodogoras redirects the rest',()=>{
 const s=setup(),dealer=put(s,0,DEALER);
 put(s,1,'dmrp19-s10');
 give(s,0,'deck',[W,F,N,L]);
 const mana=s.players[0].mana.length;
 cast(s,'dm06-085');
 drain(s);
 assert.equal(s.players[0].drawsThisTurn,1);
 assert.equal(s.players[0].mana.length,mana+1);
 assert.equal(power(s,dealer),4000);
});

test('Cyclone draws first, offers anonymous positions to the opponent, then its controller orders the selected cards',()=>{
 let s=setup();
 give(s,0,'hand',[F,L,W]);
 give(s,0,'deck',[N,N,B,F]);
 const physical=e.physicalCards(s).map(x=>x.uid);
 cast(s,CYCLONE);
 assert.equal(s.players[0].drawsThisTurn,2);
 assert.equal(s.players[0].hand.length,5);
 assert.equal(s.decision.player,1);
 assert.ok(s.decision.choices.every(c=>Number.isInteger(c.value)&&!c.cardId&&c.label.startsWith('裏向きの手札')));
 const selected=[s.decision.task.slots[1],s.decision.task.slots[3]];
 const top=s.players[0].deck.map(x=>x.uid);
 pick(s,1);
 assert.ok(!bottomChoices(s).includes(1));
 assert.equal(s.players[0].hand.length,5);
 s=JSON.parse(JSON.stringify(s));
 pick(s,3);
 assert.equal(s.decision.player,0);
 assert.deepEqual(bottomChoices(s),selected);
 pick(s,selected[1]);
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),[...top,selected[1],selected[0]]);
 assert.ok(selected.every(uid=>!s.players[0].hand.some(x=>x.uid===uid)));
 assert.equal(s.log.some(x=>x.type==='reveal'),false);
 assert.deepEqual(e.physicalCards(s).map(x=>x.uid).sort(),[...physical,s.players[0].battle[0].uid].sort());
});

test('Cyclone with only two hand cards lets its owner decide their order',()=>{
 const s=setup();
 give(s,0,'deck',[N,F,L]);
 const [a,b,top]=s.players[0].deck;
 cast(s,CYCLONE);
 assert.equal(s.decision.player,0);
 pick(s,b.uid);
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),[top.uid,b.uid,a.uid]);
 assert.equal(s.players[0].hand.length,0);
});

test('Cyclone still puts its only hand card on the bottom when a draw is replaced',()=>{
 const s=setup();
 put(s,1,'dmrp19-s10');
 give(s,0,'deck',[W,F,N,L]);
 const [first,second,third,last]=s.players[0].deck;
 cast(s,CYCLONE);
 assert.equal(s.decision,null);
 assert.equal(s.players[0].hand.length,0);
 assert.ok(s.players[0].mana.some(x=>x.uid===second.uid));
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),[third.uid,last.uid,first.uid]);
});

test('Dice Dice can summon on a water creature and draws four before the blind choice',()=>{
 const s=setup(),base=put(s,0,W);
 put(s,0,F);
 give(s,0,'hand',[DICE]);
 act(s,'play',a=>a.cardId===DICE);
 assert.deepEqual(e.getLegalActions(s).map(a=>a.baseUid).filter(Boolean),[base.uid]);
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.equal(s.players[0].drawsThisTurn,4);
 assert.equal(s.decision.player,1);
 assert.equal(s.decision.choices.length,4);
 assert.equal(s.players[0].battle.find(x=>x.cardId===DICE).under[0].uid,base.uid);
 drain(s);
 assert.equal(s.players[0].hand.length,2);
});

test('Dealer can become a water Command and Dice Dice then invades and resolves before blocking',()=>{
 const s=setup(),base=put(s,0,DEALER);
 give(s,0,'hand',[DICE]);
 cast(s,'dm01-003');
 drain(s);
 assert.ok(race(s,base).includes('マジック・コマンド'));
 attack(s,base.uid);
 assert.equal(s.decision.task.op,'g23_Declare');
 pick(s,true);
 assert.equal(s.decision.task.op,'g23_Invade');
 pick(s,true);
 const dice=s.players[0].battle.find(x=>x.cardId===DICE);
 assert.equal(dice.under[0].uid,base.uid);
 assert.equal(s.attack.attacker,dice.uid);
 assert.equal(s.players[0].drawsThisTurn,6);
 assert.equal(s.decision.player,1);
 pick(s,bottomChoices(s)[0]);
 pick(s,bottomChoices(s)[0]);
 pick(s,bottomChoices(s)[0]);
 assert.equal(s.decision.type,'block');
 assert.equal(e.effectiveCard(dice,s).breaker,2);
});

test('Dice Dice can resolve its entry before a second declared invasion and return that card to the deck',()=>{
 const s=setup(),base=put(s,0,CYCLONE);
 give(s,0,'hand',[DICE,DICE,F]);
 const [first,second]=s.players[0].hand;
 attack(s,base.uid);
 pick(s,true);
 pick(s,true);
 act(s,'orderEffect',a=>s.pendingEffects.some(x=>x.effectId===a.effectId&&x.uid===first.uid));
 pick(s,true);
 act(s,'orderEffect',a=>s.pendingEffects.some(x=>x.effectId===a.effectId&&x.uid===first.uid));
 const slot=s.decision.task.slots.indexOf(second.uid);
 assert.ok(slot>=0);
 pick(s,slot);
 pick(s,bottomChoices(s)[0]);
 pick(s,second.uid);
 assert.equal(s.players[0].deck.at(-2).uid,second.uid);
 assert.deepEqual(s.players[0].battle.map(x=>x.uid),[first.uid]);
 assert.equal(s.decision.type,'block');
});
