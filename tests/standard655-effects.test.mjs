import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-655.json',import.meta.url)));
const SAKU='dm26rp2-021',GENERAL='dm26rp1-022',METAL='dm26rp1-018';
const PLAIN='dm01-108',HIGH='dmbd16-009',SEED='dmsd20-016',BLAZE='dm01-100',NIBAIKEN='dm26rp1-S011';
const valueOf=c=>c.value?.uid??c.value;
const pick=(s,v)=>act(s,'extended',a=>valueOf(s.decision.choices[a.choice])===v);
const has=(xs,uid)=>xs.some(x=>x.uid===uid);

test('Phase 655 preserves canonical IDs for three official prints',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 assert.equal(cards.length,3);
 for(const row of cards){
  const detail=details.cards.find(d=>d.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:655}));
  assert.throws(()=>standardCardSpec(detail,{phase:654}));
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
const TOO_EXPENSIVE='dm01-s01';

for(const variant of ['accept','decline','low','locked'])test('Saku ramps tapped and checks the card actually returned from mana '+variant,()=>{
 const s=setup();
 give(s,0,'hand',[SAKU]);
 give(s,0,'deck',[HIGH,PLAIN,PLAIN]);
 give(s,1,'battle',[SEED,variant==='locked'?'dmrp22-042':PLAIN,TOO_EXPENSIVE]);
 const [high,low]=s.players[0].deck,[seed,enemy]=s.players[1].battle;
 act(s,'play');
 assert.equal(s.players[0].mana.find(x=>x.uid===high.uid).tapped,true);
 assert.equal(s.players[0].mana.find(x=>x.uid===low.uid).tapped,true);
 if(variant==='locked'){
  assert.equal(s.decision,null);
  assert.equal(s.players[0].hand.length,0);
  return;
 }
 pick(s,(variant==='low'?low:high).uid);
 if(variant==='low')assert.equal(s.decision,null);
 else{
  assert.deepEqual(choices(s),[seed.uid,enemy.uid,null]);
  pick(s,variant==='accept'?seed.uid:null);
 }
 assert.equal(has(s.players[1].mana,seed.uid),variant==='accept');
 assert.ok(has(s.players[0].hand,(variant==='low'?low:high).uid));
});

for(const deploy of [false,true])test('General uses the live creature count after its optional deployment '+deploy,()=>{
 const s=setup();
 give(s,0,'hand',[GENERAL]);
 give(s,0,'battle',[SEED]);
 give(s,1,'battle',[BLAZE,PLAIN,SEED]);
 const recruit=inst(PLAIN);
 s.players[0].mana.push(recruit);
 const [one,two,enemySeed]=s.players[1].battle;
 act(s,'play');
 assert.ok(choices(s).includes(recruit.uid));
 pick(s,deploy?recruit.uid:null);
 assert.deepEqual(choices(s),deploy?[one.uid,two.uid,null]:[one.uid,null]);
 pick(s,deploy?two.uid:one.uid);
 assert.ok(has(s.players[1].mana,(deploy?two:one).uid));
 assert.ok(has(s.players[1].battle,enemySeed.uid));
 assert.equal(has(s.players[0].battle,recruit.uid),deploy);
});

test('General can use its second effect after being summoned as a Shield Trigger',()=>{
 const s=setup();
 give(s,0,'shields',[GENERAL]);
 give(s,0,'mana',[]);
 give(s,1,'battle',[BLAZE]);
 const [general]=s.players[0].shields,[enemy]=s.players[1].battle;
 s.active=1;
 attack(s);
 act(s,'noBlock');
 act(s,'useTrigger');
 assert.ok(has(s.players[0].battle,general.uid));
 pick(s,enemy.uid);
 assert.ok(has(s.players[1].mana,enemy.uid));
});

for(const reference of [2,6])test('Metal uses the chosen Twinpact cost as an exclusive bound '+reference,()=>{
 let s=setup();
 give(s,0,'hand',[METAL,HIGH]);
 give(s,1,'battle',[SEED,PLAIN,'dm01-042','dm26rp1-044',HIGH]);
 const [,discard]=s.players[0].hand,[seed,two,four,anotherFour,six]=s.players[1].battle;
 act(s,'play');
 pick(s,discard.uid);
 assert.deepEqual(choices(s),[6,2]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,reference);
 assert.deepEqual(choices(s),reference===2?[seed.uid]:[seed.uid,two.uid,four.uid,anotherFour.uid]);
 pick(s,reference===2?seed.uid:four.uid);
 assert.ok(has(s.players[1].grave,(reference===2?seed:four).uid));
 assert.ok(has(s.players[1].battle,six.uid));
});

test('Metal may decline to discard',()=>{
 const s=setup();
 give(s,0,'hand',[METAL,HIGH]);
 give(s,1,'battle',[PLAIN]);
 const [,discard]=s.players[0].hand;
 act(s,'play');
 pick(s,null);
 assert.equal(s.decision,null);
 assert.ok(has(s.players[0].hand,discard.uid));
});

test('QA48497 Metal cannot destroy when Nibaiken replaces the discard',()=>{
 const s=setup();
 give(s,0,'shields',[METAL]);
 give(s,0,'hand',[NIBAIKEN]);
 give(s,1,'battle',[PLAIN,SEED]);
 const [nibaiken]=s.players[0].hand,[enemy]=s.players[1].battle;
 s.active=1;
 attack(s,enemy.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 pick(s,nibaiken.uid);
 pick(s,true);
 assert.ok(has(s.players[0].battle,nibaiken.uid));
 assert.ok(!has(s.players[0].grave,nibaiken.uid));
 assert.equal(s.decision?.source,NIBAIKEN);
 act(s,'skipFight');
 assert.equal(s.decision,null);
 assert.ok(!has(s.players[1].grave,enemy.uid));
});

test('Metal can destroy exactly 5000 total power before blocking',()=>{
 const s=setup();
 give(s,0,'battle',[METAL]);
 give(s,1,'battle',[PLAIN,'dm01-082',PLAIN,SEED,TOO_EXPENSIVE]);
 const [attacker]=s.players[0].battle,[two,three,anotherTwo]=s.players[1].battle;
 attack(s,attacker.uid);
 assert.deepEqual(choices(s),[two.uid,three.uid,anotherTwo.uid,null]);
 pick(s,two.uid);
 pick(s,three.uid);
 assert.equal(s.decision.type,'block');
 assert.ok(has(s.players[1].grave,two.uid));
 assert.ok(has(s.players[1].grave,three.uid));
 assert.ok(has(s.players[1].battle,anotherTwo.uid));
});
