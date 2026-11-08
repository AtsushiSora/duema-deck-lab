import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-647.json',import.meta.url)));
const HAMI='dm26rp3-023',Q='dm26rp3-047',WATAN='dm26rp3-073';
const SMALL='dm01-108',STRONG='dm01-s01',FIRE='dm01-097';
const JOKER_6='dmrp07-079',JOKER_7='dm26rp3-S002',JOKER_SPELL='dmsd01-011';
const valueOf=c=>c.value?.uid??c.value;
const pick=(s,v)=>act(s,'extended',a=>valueOf(s.decision.choices[a.choice])===v);
const contains=(xs,x)=>xs.some(y=>y.uid===x.uid);

test('Phase 647 verifies complete official definitions, legal decks and stable IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 assert.equal(cards.length,3);
 for(const row of cards){
  const detail=details.cards.find(d=>d.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:647}));
  assert.throws(()=>standardCardSpec(detail,{phase:646}));
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

test('Hami can add one shield on attack or decline and still break two',()=>{
 for(const add of [true,false]){
  const s=setup();
  give(s,0,'hand',[HAMI]);
  const [hami]=s.players[0].hand,[life,top]=s.players[0].deck;
  act(s,'play');
  assert.equal(s.players[0].shields.length,6);
  assert.ok(e.exLifeShields(s,0,hami).some(x=>x.uid===life.uid));
  hami.entered=0;
  attack(s,hami.uid);
  pick(s,add?true:null);
  assert.equal(contains(s.players[0].shields,top),add);
  act(s,'noBlock');
  drain(s);
  assert.equal(s.players[1].shields.length,3);
 }
});

test('Hami EX Life destruction prompts the opponent to choose one of their own untapped creatures',()=>{
 let s=setup();
 give(s,0,'hand',[HAMI]);
 give(s,1,'battle',[STRONG,FIRE,'dm22ex1-018',SMALL]);
 const [hami]=s.players[0].hand,[attacker,untapped,protectedCreature,alreadyTapped]=s.players[1].battle;
 attacker.powerModifiers=[{amount:20000}];
 act(s,'play');
 const [life]=e.exLifeShields(s,0,hami);
 hami.tapped=true;
 alreadyTapped.tapped=true;
 protectedCreature.justDiverActive=true;
 s.active=1;
 attack(s,attacker.uid,hami.uid);
 act(s,'noBlock');
 assert.equal(s.decision.player,1);
 assert.deepEqual(s.decision.choices.map(valueOf),[untapped.uid,protectedCreature.uid]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,protectedCreature.uid);
 assert.ok(contains(s.players[0].battle,hami));
 assert.ok(contains(s.players[0].grave,life));
 assert.ok(contains(s.players[1].grave,protectedCreature));
 assert.ok(contains(s.players[1].battle,alreadyTapped));
});

test('Hami applies Moon once for every physical card in a departing stacked shield',()=>{
 const s=setup();
 give(s,0,'battle',[HAMI]);
 give(s,0,'shields',[SMALL]);
 s.players[0].shields[0].shieldStack=[inst(SMALL)];
 give(s,1,'battle',[FIRE,SMALL]);
 const [first,second]=s.players[1].battle;
 s.extTasks=[{op:'g34_ShieldHand',p:0,source:HAMI,g238ShieldHand:true}];
 act(s,'toAttack');
 pick(s,s.players[0].shields[0].uid);
 for(const y of [first,second]){
  if(s.decision?.type==='effectOrder')e.step(s,e.chooseAI(s));
  assert.equal(s.decision.player,1);
  pick(s,y.uid);
  assert.ok(contains(s.players[1].grave,y));
 }
 assert.equal(s.players[0].hand.length,2);
});

test('Q can super-guard for an ally and is put into mana when the replacement battle destroys it',()=>{
 const s=setup();
 give(s,0,'battle',[SMALL,Q]);
 give(s,1,'battle',[STRONG]);
 const [ally,q]=s.players[0].battle,[enemy]=s.players[1].battle;
 enemy.powerModifiers=[{amount:15000}];
 enemy.tapped=true;
 attack(s,ally.uid,enemy.uid);
 act(s,'noBlock');
 assert.equal(s.decision.task.op,'g393SG_Battle');
 pick(s,q.uid);
 drain(s);
 assert.ok(contains(s.players[0].battle,ally));
 assert.ok(!contains(s.players[0].grave,q));
 assert.equal(s.players[0].mana.find(x=>x.uid===q.uid)?.tapped,false);
});

test('Q J Change selects a cost-six Joker from mana and resumes the attack',()=>{
 const s=setup();
 give(s,0,'battle',[Q]);
 give(s,0,'mana',[JOKER_6,JOKER_7,JOKER_SPELL,FIRE]);
 const [q]=s.players[0].battle,[incoming]=s.players[0].mana;
 incoming.tapped=true;
 attack(s,q.uid);
 assert.deepEqual(s.decision.choices.map(valueOf),[incoming.uid,null]);
 pick(s,incoming.uid);
 assert.equal(s.attack.attacker,incoming.uid);
 assert.ok(contains(s.players[0].mana,q));
 assert.ok(!contains(s.players[0].grave,q));
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('Watan can use its printed Mach Fighter immediately',()=>{
 const s=setup();
 give(s,0,'hand',[WATAN]);
 give(s,1,'battle',[FIRE]);
 const [watan]=s.players[0].hand,[enemy]=s.players[1].battle;
 act(s,'play');
 attack(s,watan.uid,enemy.uid);
 act(s,'noBlock');
 drain(s);
 assert.ok(contains(s.players[1].grave,enemy));
});

test('Watan grants Mach Fighter for one turn when sacrificed to discount a Dispector',()=>{
 const s=setup();
 give(s,0,'battle',[WATAN,FIRE]);
 give(s,0,'hand',[HAMI]);
 give(s,1,'battle',[STRONG]);
 const [watan,recipient]=s.players[0].battle,[enemy]=s.players[1].battle;
 recipient.entered=s.turn;
 act(s,'play',a=>a.alternative==='sasage'&&a.sasage.includes(watan.uid));
 pick(s,recipient.uid);
 drain(s);
 assert.ok(contains(s.players[0].grave,watan));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,e.card(HAMI).cost-2);
 assert.equal(e.effectiveCard(recipient,s).machFighter,true);
 s.phase='attack';
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===recipient.uid&&a.target===enemy.uid));
 act(s,'endTurn');
 drain(s);
 assert.ok(!e.effectiveCard(recipient,s).machFighter);
});
