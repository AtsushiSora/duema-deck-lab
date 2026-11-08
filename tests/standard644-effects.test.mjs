import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-644.json',import.meta.url)));
const HEMO='dm26rp3-039',MONKID='dm26rp3-055',BENZA='dm26rp3-077',NYANI='dm26rp3-013';
const MANAGER='dm26rp3-067',CHIEF='dm26rp3-S002',FIRE='dm01-097',STRONG='dm01-059',KIRYU='dmrp19-027';
const valueOf=choice=>choice.value?.uid??choice.value;
const pick=(s,value)=>act(s,'extended',a=>valueOf(s.decision.choices[a.choice])===value);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();

test('Phase 644 matches full official text, keeps existing deck IDs and counts each reprint once',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 assert.equal(cards.length,3);
 for(const row of cards){
  const detail=details.cards.find(d=>d.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:644}));
  assert.throws(()=>standardCardSpec({...detail,faces:[{...row.faces[0],abilityText:row.faces[0].abilityText+'\n未対応の能力'}]},{phase:644}));
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
 assert.equal(printAliases.length,2);
 for(const row of printAliases){
  assert.ok(row.verification.facesMatched);
  assert.equal(row.canonicalId,MONKID);
  assert.ok(!data.cards.some(c=>c.id===row.id));
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:644}),cards.find(c=>c.id===MONKID).spec);
 }
});

test('Benzaman can draw exactly one without borrowing another ability',()=>{
 const s=setup();
 give(s,0,'hand',[BENZA]);
 give(s,0,'battle',[NYANI]);
 give(s,1,'battle',[FIRE]);
 const top=s.players[0].deck[0],before=physical(s);
 act(s,'play');
 pick(s,'draw');
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),[top.uid]);
 assert.equal(s.players[1].battle[0].tapped,false);
 assert.deepEqual(physical(s),before);
});

test('Benzaman J Big borrows only the ordinary option of a visible allied Joker',()=>{
 let s=setup();
 give(s,0,'hand',[BENZA]);
 give(s,0,'battle',[NYANI,BENZA,MONKID,MANAGER,FIRE]);
 give(s,1,'battle',[NYANI,FIRE]);
 const sealed=s.players[0].battle[3];
 sealed.sealed=true;
 s.players[0].seals.push({...inst(FIRE),faceDown:true,sealOf:sealed.uid});
 const top=s.players[0].deck[0];
 act(s,'play');
 pick(s,'jbig');
 assert.deepEqual(s.decision.choices.map(c=>c.cardId),[NYANI,BENZA,MONKID]);
 assert.ok(s.decision.choices.every(c=>!c.label.includes('Jビッグ')));
 s=JSON.parse(JSON.stringify(s));
 pick(s,1);
 assert.equal(s.players[0].hand[0].uid,top.uid);
 assert.ok(s.players[1].battle.every(x=>!x.tapped));
});

test('Monkid can tap an opposing creature or untap its own creature, respecting selection protection',()=>{
 for(const tap of [true,false]){
  const s=setup();
  give(s,0,'hand',[MONKID]);
  give(s,0,'battle',[FIRE]);
  give(s,1,'battle',[FIRE,'dm22ex1-018']);
  const [ally]=s.players[0].battle,[enemy,protectedCreature]=s.players[1].battle;
  protectedCreature.justDiverActive=true;
  ally.tapped=true;
  act(s,'play');
  pick(s,'tapState');
  const target=tap?enemy:ally;
  assert.ok(s.decision.choices.some(c=>valueOf(c)===target.uid));
  assert.ok(!s.decision.choices.some(c=>valueOf(c)===protectedCreature.uid));
  pick(s,target.uid);
  pick(s,tap);
  assert.equal(target.tapped,tap);
 }
});

test('Monkid can use S Trigger and copy SMANAGER to battle with its own UID',()=>{
 const s=setup();
 s.active=1;
 give(s,0,'shields',[MONKID]);
 give(s,0,'battle',[MANAGER]);
 give(s,0,'mana',[]);
 give(s,1,'battle',[FIRE]);
 const [monkid]=s.players[0].shields,[attacker]=s.players[1].battle;
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 pick(s,'jbig');
 pick(s,0);
 assert.equal(s.decision.task.fighter.uid,monkid.uid);
 pick(s,attacker.uid);
 assert.ok(s.players[0].battle.some(x=>x.uid===monkid.uid));
 assert.ok(s.players[1].grave.some(x=>x.uid===attacker.uid));
});

test('Chief J Big borrows the draw directly, with no recursive J Big choice',()=>{
 const s=setup();
 give(s,0,'battle',[CHIEF,BENZA]);
 const [chief,benza]=s.players[0].battle,top=s.players[0].deck[0];
 attack(s,chief.uid);
 pick(s,1);
 pick(s,benza.uid);
 assert.ok(s.decision.choices.every(c=>!c.label.includes('Jビッグ')));
 pick(s,0);
 assert.equal(s.players[0].hand[0].uid,top.uid);
});

test('Hemoglo can pay Sasage then return from the grave on the same turn after a saved continuation',()=>{
 let s=setup();
 give(s,0,'hand',[KIRYU]);
 give(s,0,'battle',[HEMO]);
 const [hemo]=s.players[0].battle,before=physical(s);
 act(s,'play',a=>a.alternative==='sasage'&&a.sasage.includes(hemo.uid));
 drain(s);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,e.card(KIRYU).cost-2);
 assert.ok(s.players[0].grave.some(x=>x.uid===hemo.uid));
 assert.ok(s.g537Delays.some(x=>x.uid===hemo.uid));
 s=JSON.parse(JSON.stringify(s));
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
 assert.ok(s.players[0].battle.some(x=>x.uid===hemo.uid));
 assert.deepEqual(physical(s),before);
});

test('Hemoglo does not return if destroyed on the opponent turn or if its graveyard visit ended',()=>{
 for(const ownTurn of [true,false]){
  const s=setup();
  give(s,0,'battle',[HEMO]);
  give(s,1,'battle',[STRONG]);
  const [hemo]=s.players[0].battle,[strong]=s.players[1].battle;
  s.active=ownTurn?0:1;
  (ownTurn?strong:hemo).tapped=true;
  attack(s,ownTurn?hemo.uid:strong.uid,ownTurn?strong.uid:hemo.uid);
  drain(s);
  const inGrave=s.players[0].grave.find(x=>x.uid===hemo.uid);
  assert.ok(inGrave);
  if(ownTurn){
   assert.ok(s.g537Delays.some(x=>x.uid===hemo.uid));
   s.extTasks=[{op:'g34_Select',p:0,source:HEMO,origin:'grave',to:'hand',n:1},{op:'g34_Discard',p:0,source:HEMO,owner:'self',n:1}];
   s.phase='main';
   act(s,'toAttack');
   drain(s);
   assert.ok(s.players[0].grave.some(x=>x.uid===hemo.uid));
  }
  act(s,'endTurn');
  drain(s);
  assert.ok(s.players[0].grave.some(x=>x.uid===hemo.uid));
 }
});

test('Hemoglo destroyed by a turn-end ability does not schedule a return',()=>{
 const s=setup();
 give(s,0,'battle',[HEMO,'dmx15-027']);
 const [hemo]=s.players[0].battle;
 s.phase='attack';
 act(s,'endTurn');
 pick(s,hemo.uid);
 drain(s);
 assert.ok(s.players[0].grave.some(x=>x.uid===hemo.uid));
 assert.ok(!s.g537Delays?.some(x=>x.uid===hemo.uid));
});
