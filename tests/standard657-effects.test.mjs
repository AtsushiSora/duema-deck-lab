import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-657.json',import.meta.url)));
const STAR='dm26rp1-048',CASTLE='dm26rp1-062',DRIFT='dm26rp1-059';
const PLAIN='dm01-108',SEED='dmsd20-016',BOUNCE='dm01-086',BLOCKER='dm01-076';
const valueOf=c=>c.value?.uid??c.value;
const pick=(s,v)=>act(s,'extended',a=>valueOf(s.decision.choices[a.choice])===v);
const has=(xs,uid)=>xs.some(x=>x.uid===uid);

test('Phase 657 preserves canonical IDs for three official prints',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 assert.equal(cards.length,3);
 for(const row of cards){
  const detail=details.cards.find(d=>d.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:657}));
  assert.throws(()=>standardCardSpec(detail,{phase:656}));
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
const LIGHT='dm01-075',WATER='dm01-083';

test('Starman evolves on light or water and retains its double breaker',()=>{
 const s=setup();
 give(s,0,'hand',[STAR]);
 give(s,0,'battle',[LIGHT,WATER,PLAIN]);
 const [light,water]=s.players[0].battle;
 act(s,'play');
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[light.uid,water.uid]);
 act(s,'evolve',a=>a.baseUid===water.uid);
 const star=s.players[0].battle.find(x=>x.cardId===STAR);
 assert.equal(e.effectiveCard(star,s).breaker,2);
 assert.equal(star.under[0].uid,water.uid);
});

for(const up of [true,false])test('Starman draws first and can place a G Castle from hand in either orientation '+up,()=>{
 let s=setup();
 give(s,0,'battle',[STAR]);
 give(s,0,'deck',[CASTLE,PLAIN,PLAIN]);
 give(s,1,'battle',[PLAIN,PLAIN,SEED]);
 const [castle]=s.players[0].deck,[target,keep,seed]=s.players[1].battle;
 attack(s);
 assert.ok(has(s.players[0].hand,castle.uid));
 assert.deepEqual(choices(s),[castle.uid,null]);
 pick(s,castle.uid);
 s=JSON.parse(JSON.stringify(s));
 assert.deepEqual(choices(s),[true,false]);
 pick(s,up);
 assert.equal(!!s.players[0].shields.find(x=>x.uid===castle.uid).faceUp,up);
 if(up){
  assert.deepEqual(choices(s),[target.uid,keep.uid,null]);
  pick(s,target.uid);
  pick(s,null);
  assert.ok(has(s.players[1].hand,target.uid));
 }else assert.ok(has(s.players[1].battle,target.uid));
 assert.ok(has(s.players[1].battle,keep.uid));
 assert.ok(has(s.players[1].battle,seed.uid));
 assert.equal(s.decision.type,'block');
});

test('Starman draws and can decline shielding when bounced with its base',()=>{
 const s=setup();
 give(s,0,'battle',[STAR]);
 give(s,0,'deck',[PLAIN,PLAIN]);
 give(s,1,'hand',[BOUNCE]);
 const [star]=s.players[0].battle,base=inst(WATER),[drawn]=s.players[0].deck;
 star.under=[base];
 s.active=1;
 act(s,'play');
 act(s,'effect',a=>a.targets[0].uid===star.uid);
 for(const x of [star,base,drawn])assert.ok(has(s.players[0].hand,x.uid));
 assert.ok(choices(s).includes(drawn.uid));
 pick(s,null);
 assert.equal(s.players[0].shields.length,5);
 assert.equal(s.decision,null);
});

test('Executing the G Castle adds one shield and bounces up to two creatures',()=>{
 const s=setup();
 give(s,0,'hand',[CASTLE]);
 give(s,1,'battle',[PLAIN,PLAIN,PLAIN,SEED]);
 const [castle]=s.players[0].hand,[first,second,third,seed]=s.players[1].battle;
 act(s,'play',a=>a.cardId===CASTLE&&a.cost===4);
 assert.equal(s.players[0].shields.length,6);
 assert.equal(castle.faceUp,true);
 assert.deepEqual(choices(s),[first.uid,second.uid,third.uid,null]);
 pick(s,second.uid);
 assert.ok(has(s.players[1].battle,second.uid));
 pick(s,third.uid);
 assert.ok(has(s.players[1].hand,second.uid)&&has(s.players[1].hand,third.uid));
 assert.deepEqual(s.players[1].battle.map(x=>x.uid),[first.uid,seed.uid]);
 assert.equal(s.decision,null);
});

test('A face-up G Castle moves to grave when its shield is broken',()=>{
 const s=setup();
 give(s,0,'hand',[CASTLE]);
 give(s,0,'shields',[]);
 give(s,1,'battle',[PLAIN]);
 const [castle]=s.players[0].hand,[attacker]=s.players[1].battle;
 act(s,'play');
 pick(s,null);
 s.active=1;
 attack(s,attacker.uid);
 act(s,'noBlock');
 drain(s);
 assert.ok(has(s.players[0].grave,castle.uid));
 assert.ok(!has(s.players[0].hand,castle.uid));
});

test('Drift protects the existing creatures against attacks and blocks until the next own start',()=>{
 let s=setup();
 give(s,0,'battle',[PLAIN,SEED]);
 give(s,0,'hand',[DRIFT,PLAIN]);
 give(s,1,'battle',[BLOCKER,PLAIN]);
 const [protectedCard,seed]=s.players[0].battle,[,later]=s.players[0].hand,[blocker,enemy]=s.players[1].battle;
 act(s,'play',a=>a.cardId===DRIFT);
 act(s,'play',a=>a.uid===later.uid);
 assert.ok(e.effectiveCard(protectedCard,s).cannotBeAttacked&&e.effectiveCard(protectedCard,s).unblockable);
 for(const x of [seed,later,blocker])assert.ok(!e.effectiveCard(x,s).cannotBeAttacked);
 attack(s,protectedCard.uid);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===blocker.uid));
 if(s.decision?.type==='block')act(s,'noBlock');
 drain(s);
 act(s,'endTurn');
 drain(s);
 s=JSON.parse(JSON.stringify(s));
 act(s,'skipCharge');
 act(s,'toAttack');
 s.players[0].battle.find(x=>x.uid===later.uid).tapped=true;
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===enemy.uid&&a.target===later.uid));
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===enemy.uid&&a.target===protectedCard.uid));
 act(s,'endTurn');
 drain(s);
 const current=s.players[0].battle.find(x=>x.uid===protectedCard.uid);
 assert.ok(!e.effectiveCard(current,s).cannotBeAttacked&&!e.effectiveCard(current,s).unblockable);
});
