import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-637.json',import.meta.url)));
const GREEN='dm25ex2-101',CHARGER='dm25rp3-003',REPRINT='dm25ex3-rp3003',SAGA='dm26ex2-043';
const FIRE='dm01-097',NATURE='dm01-108',SEED='dmsd20-016',BOUNCE='dm01-086';
const HEAVY='dmex17-033',METAL='dmex17-059',GOOD='dm25rp3-S06';

function valueOf(choice){return choice.value?.uid??choice.value;}
function pick(s,value){act(s,'extended',a=>valueOf(s.decision.choices[a.choice])===value);}
function physical(s){return e.physicalCards(s).map(x=>x.uid).sort();}

test('Phase 637 verifies the original prints and the Charger reprint without duplicating deck IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 assert.equal(cards.length,3);
 for(const row of cards){
  const detail=details.cards.find(d=>d.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:637}));
  for(const [field,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[field],value);
  assert.ok(row.verification.facesMatched);
  assert.deepEqual(data.cards.filter(c=>key(c.name)===key(row.name)).map(c=>c.id),[row.id]);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].id=row.id;
  assert.deepEqual(catalogue.resolveRows(deck.cards),deck.cards);
  assert.deepEqual(e.validateDeck(deck),[]);
 }
 const {currentPrint}=cards.find(c=>c.id===CHARGER);
 assert.equal(currentPrint.id,REPRINT);
 assert.ok(currentPrint.verification.facesMatched);
 assert.ok(!data.cards.some(c=>c.id===REPRINT));
});

test('Trap Green targets opposing elements on ordinary entry and by S Trigger',()=>{
 for(const triggered of [false,true]){
  const s=setup();
  give(s,1,'battle',[FIRE,SEED]);
  give(s,0,'battle',[SEED]);
  const [attacker,enemySeed]=s.players[1].battle;
  if(triggered){
   s.active=1;
   give(s,0,'shields',[GREEN]);
   give(s,0,'mana',[]);
   attack(s,attacker.uid);
   act(s,'noBlock');
   act(s,'useTrigger');
  }else{
   give(s,0,'hand',[GREEN]);
   act(s,'play');
  }
  assert.deepEqual(s.decision.choices.map(valueOf),[attacker.uid,enemySeed.uid]);
  pick(s,enemySeed.uid);
  assert.ok(s.players[1].mana.some(x=>x.uid===enemySeed.uid&&!x.tapped));
  assert.ok(s.players[1].battle.some(x=>x.uid===attacker.uid));
  assert.ok(s.players[0].battle.some(x=>x.cardId===GREEN));
 }
});

test('Reality Charger returns all opposing elements, charges mana, and locks spells through the opposing turn',()=>{
 let s=setup();
 give(s,0,'battle',[SEED]);
 give(s,1,'battle',[FIRE,SEED]);
 give(s,0,'hand',[CHARGER]);
 const [spell]=s.players[0].hand,enemy=s.players[1].battle.map(x=>x.uid),before=physical(s);
 act(s,'play');
 assert.deepEqual(s.players[1].hand.map(x=>x.uid).sort(),enemy.sort());
 assert.equal(s.players[0].battle.length,1);
 assert.ok(s.players[0].mana.some(x=>x.uid===spell.uid&&!x.tapped));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,9);
 assert.equal(e.canCastSpell(s,0,e.card(BOUNCE),'hand'),true);
 assert.equal(e.canCastSpell(s,1,e.card(BOUNCE),'hand'),false);
 act(s,'toAttack');
 act(s,'endTurn');
 drain(s);
 assert.equal(e.canCastSpell(s,1,e.card(BOUNCE),'hand'),false);
 s=JSON.parse(JSON.stringify(s));
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
 assert.equal(e.canCastSpell(s,1,e.card(BOUNCE),'hand'),true);
 assert.deepEqual(physical(s),before);
});

test('Reality Charger played by Good Evil uses the caster’s perspective and charges the original owner’s mana',()=>{
 const s=setup();
 s.active=1;
 give(s,1,'battle',[GOOD,SEED]);
 give(s,0,'battle',[FIRE]);
 give(s,0,'hand',[CHARGER]);
 const [spell]=s.players[0].hand,before=physical(s);
 s.extTasks=[{op:'discard',p:0,source:GOOD,n:1}];
 act(s,'toAttack');
 pick(s,spell.uid);
 assert.equal(s.decision.task.op,'stealSpell');
 pick(s,true);
 assert.ok(s.players[0].mana.some(x=>x.uid===spell.uid));
 assert.ok(!s.players[1].mana.some(x=>x.uid===spell.uid));
 assert.ok(s.players[0].hand.some(x=>x.cardId===FIRE));
 assert.equal(s.players[1].battle.length,2);
 assert.equal(e.canCastSpell(s,0,e.card(BOUNCE),'hand'),false);
 assert.deepEqual(physical(s),before);
});

test('Reality Charger offers G Strike without casting or charging',()=>{
 const s=setup();
 s.active=1;
 give(s,1,'battle',[FIRE,NATURE]);
 give(s,0,'shields',[CHARGER]);
 const [spell]=s.players[0].shields,[attacker,later]=s.players[1].battle;
 attack(s,attacker.uid);
 act(s,'noBlock');
 pick(s,true);
 pick(s,later.uid);
 assert.ok(e.attackLocked(s,1,later));
 assert.ok(s.players[0].hand.some(x=>x.uid===spell.uid));
 assert.equal(e.canCastSpell(s,1,e.card(BOUNCE),'hand'),true);
});

test('Primal Saga mills before mandatory selection of an eligible God and can be used by S Trigger',()=>{
 for(const triggered of [false,true]){
  let s=setup();
  give(s,0,'deck',[HEAVY,FIRE,METAL,SAGA,...Array(10).fill(NATURE)]);
  give(s,0,'grave',[GOOD]);
  const [heavy,fire,metal,godSpell]=s.players[0].deck,[oldGod]=s.players[0].grave;
  if(triggered){
   s.active=1;
   give(s,0,'shields',[SAGA]);
   give(s,0,'mana',[]);
   give(s,1,'battle',[FIRE]);
   attack(s);
   act(s,'noBlock');
   act(s,'useTrigger');
  }else{
   give(s,0,'hand',[SAGA]);
   act(s,'play');
  }
  assert.deepEqual(s.players[0].grave.map(x=>x.uid),[oldGod.uid,heavy.uid,fire.uid,metal.uid,godSpell.uid]);
  assert.deepEqual(s.decision.choices.map(valueOf),[oldGod.uid,heavy.uid]);
  s=JSON.parse(JSON.stringify(s));
  pick(s,heavy.uid);
  if(s.decision?.choices?.some(x=>x.value===null))pick(s,null);
  drain(s);
  assert.ok(s.players[0].battle.some(x=>x.uid===heavy.uid));
  assert.ok(s.players[0].grave.some(x=>x.uid===oldGod.uid));
 }
});
