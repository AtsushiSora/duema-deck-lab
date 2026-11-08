import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-656.json',import.meta.url)));
const NAGA='dm26rp1-050',DEATH='dm26rp1-051',SOUL='dm26rp1-052';
const PLAIN='dm01-108',SEED='dmsd20-016',BOUNCE='dm01-086',STRONG='dm01-s01';
const valueOf=c=>c.value?.uid??c.value;
const pick=(s,v)=>act(s,'extended',a=>valueOf(s.decision.choices[a.choice])===v);
const has=(xs,uid)=>xs.some(x=>x.uid===uid);

test('Phase 656 preserves canonical IDs for three official prints',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 assert.equal(cards.length,3);
 for(const row of cards){
  const detail=details.cards.find(d=>d.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:656}));
  assert.throws(()=>standardCardSpec(detail,{phase:655}));
  for(const [field,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[field],value);
  assert.deepEqual(data.cards.filter(c=>key(c.name)===key(row.name)).map(c=>c.id),[row.id]);
  assert.ok(row.verification.facesMatched);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].id=row.id;
  assert.deepEqual(catalogue.resolveRows(deck.cards),deck.cards);
  assert.deepEqual(e.validateDeck(deck),[]);
 }
});

const choices=s=>s.decision.choices.map(valueOf);
const WATER='dm01-083',DARK='dm01-090',FIRE='dm01-097',LIGHT='dm01-075';
const DESTROY='dm01-027';

for(const [id,legal,breaker] of [[NAGA,[WATER,DARK],2],[DEATH,[DARK,FIRE],2],[SOUL,[FIRE,PLAIN,SEED],3]])
test(e.card(id)?.name+' evolves from either printed civilization, including a matching Shinkalize base',()=>{
 const s=setup();
 give(s,0,'hand',[id]);
 give(s,0,'battle',[LIGHT,WATER,DARK,FIRE,PLAIN,SEED]);
 const before=s.players[0].battle.slice();
 act(s,'play');
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),before.filter(x=>legal.includes(x.cardId)).map(x=>x.uid));
 const base=before.find(x=>x.cardId===legal.at(-1));
 act(s,'evolve',a=>a.baseUid===base.uid);
 const top=s.players[0].battle.find(x=>x.cardId===id);
 assert.equal(top.under[0].uid,base.uid);
 assert.equal(e.effectiveCard(top,s).breaker,breaker);
 assert.equal(s.decision,null);
});

for(const [leaves,to] of [[false,'deckTop'],[true,'grave']])test('Naga lets the opponent choose the destination after targeting '+to,()=>{
 let s=setup();
 give(s,0,'battle',[NAGA]);
 give(s,1,'battle',[SEED,PLAIN,PLAIN]);
 const [naga]=s.players[0].battle,[,target]=s.players[1].battle;
 naga.under=[inst(WATER)];
 const [base]=naga.under;
 if(leaves){
  s.active=1;
  give(s,1,'hand',[BOUNCE]);
  act(s,'play');
  act(s,'effect',a=>a.targets[0].uid===naga.uid);
  assert.ok(has(s.players[0].hand,naga.uid));
  assert.ok(has(s.players[0].hand,base.uid));
 }else attack(s,naga.uid);
 assert.equal(s.decision.player,0);
 assert.ok(!choices(s).includes(s.players[1].battle[0].uid));
 pick(s,target.uid);
 assert.equal(s.decision.player,1);
 assert.deepEqual(choices(s),['grave','deckTop']);
 s=JSON.parse(JSON.stringify(s));
 pick(s,to);
 if(to==='deckTop')assert.equal(s.players[1].deck[0].uid,target.uid);
 else assert.ok(has(s.players[1].grave,target.uid));
 assert.ok(!has(s.players[1].battle,target.uid));
});

for(const leave of [false,true])test('Death Phoenix waits for both hand choices, then its owner draws '+leave,()=>{
 let s=setup();
 give(s,0,'battle',[DEATH]);
 give(s,0,'hand',[PLAIN]);
 give(s,1,'hand',[PLAIN]);
 const [death]=s.players[0].battle,[discard0]=s.players[0].hand,[discard1]=s.players[1].hand;
 death.under=[inst(DARK)];
 const [base]=death.under,deck=s.players[0].deck.length;
 if(leave){
  s.active=1;
  s.players[1].hand.push(inst(DESTROY));
  act(s,'play',a=>a.cardId===DESTROY);
  act(s,'effect',a=>a.targets[0].uid===death.uid);
  assert.ok(has(s.players[0].grave,base.uid));
 }else attack(s,death.uid);
 assert.equal(s.decision.player,s.active);
 pick(s,(leave?discard1:discard0).uid);
 assert.ok(has(s.players[0].hand,discard0.uid)&&has(s.players[1].hand,discard1.uid));
 assert.equal(s.players[0].deck.length,deck);
 assert.equal(s.decision.player,1-s.active);
 s=JSON.parse(JSON.stringify(s));
 pick(s,(leave?discard0:discard1).uid);
 assert.ok(has(s.players[0].grave,discard0.uid)&&has(s.players[1].grave,discard1.uid));
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(s.players[0].hand.length,1);
});

test('Death Phoenix still draws if both hands are empty',()=>{
 const s=setup();
 give(s,0,'battle',[DEATH]);
 attack(s);
 assert.equal(s.players[0].hand.length,1);
 assert.equal(s.players[1].hand.length,0);
 assert.equal(s.decision.type,'block');
});

for(const leave of [false,true])test('Soul Phoenix chooses one ally and one enemy for an effect battle '+leave,()=>{
 let s=setup();
 give(s,0,'battle',[SOUL,STRONG,SEED]);
 give(s,1,'battle',[PLAIN,SEED]);
 const [soul,ally]=s.players[0].battle,[enemy]=s.players[1].battle;
 soul.under=[inst(FIRE)];
 if(leave){
  s.active=1;
  give(s,1,'hand',[BOUNCE]);
  act(s,'play');
  act(s,'effect',a=>a.targets[0].uid===soul.uid);
  assert.ok(has(s.players[0].hand,soul.uid));
 }else attack(s,soul.uid);
 assert.deepEqual(choices(s),leave?[ally.uid]:[soul.uid,ally.uid]);
 pick(s,ally.uid);
 assert.deepEqual(choices(s),[enemy.uid]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,enemy.uid);
 assert.ok(has(s.players[1].grave,enemy.uid));
 assert.ok(has(s.players[0].battle,ally.uid));
 if(!leave)assert.equal(s.decision.type,'block');
});
