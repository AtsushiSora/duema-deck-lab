import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-649.json',import.meta.url)));
const GALTEO='dm26rp1-012',KEEN='dm26rp1-028',CASTLE='dm26rp1-047',REV='dm24bd1-001';
const N='dm01-108',STRONG='dm01-s01',SEED='dmsd20-016',DIVER='dm22ex1-018';
const valueOf=c=>c.value?.uid??c.value;
const pick=(s,v)=>act(s,'extended',a=>valueOf(s.decision.choices[a.choice])===v);
const has=(xs,x)=>xs.some(y=>y.uid===x.uid);
function take(s,shield){
 s.phase='main';
 s.extTasks=[{op:'g34_ShieldHand',p:0,source:GALTEO,g238ShieldHand:true}];
 act(s,'toAttack');
 pick(s,shield.uid);
}

test('Phase 649 adds only the two verified original definitions with stable IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 assert.equal(cards.length,2);
 for(const row of cards){
  const detail=details.cards.find(d=>d.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:649}));
  assert.throws(()=>standardCardSpec(detail,{phase:648}));
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

test('Galteo may decline its first shield trigger, cannot trigger again that turn and resets on the next turn',()=>{
 let s=setup();
 give(s,0,'battle',[GALTEO]);
 give(s,0,'shields',[N,N,N]);
 give(s,1,'battle',[N,N]);
 const [first,second,third]=s.players[0].shields,[attacker,target]=s.players[1].battle;
 first.shieldStack=[inst(N)];
 take(s,first);
 assert.equal(s.decision.task.op,'g34_Target');
 pick(s,null);
 assert.equal(s.decision,null);
 s=JSON.parse(JSON.stringify(s));
 take(s,second);
 assert.equal(s.decision,null);
 act(s,'endTurn');
 drain(s);
 attack(s,attacker.uid);
 act(s,'noBlock');
 assert.ok(!has(s.players[0].shields,third));
 assert.equal(s.decision.player,0);
 pick(s,target.uid);
 assert.ok(s.players[1].battle.find(x=>x.uid===target.uid).tapped);
});

test('Galteo Escape sends a face-up G Castle to hand and suppresses Revolution 2 S Trigger',()=>{
 for(const shieldId of [CASTLE,REV]){
  const s=setup();
  give(s,0,'battle',[GALTEO]);
  give(s,0,'shields',[N,shieldId]);
  give(s,1,'battle',[STRONG,N]);
  const [galteo]=s.players[0].battle,[,chosen]=s.players[0].shields,[attacker,target]=s.players[1].battle;
  chosen.faceUp=shieldId===CASTLE;
  s.active=1;
  attacker.powerModifiers=[{amount:20000}];
  attack(s,attacker.uid);
  act(s,'block',a=>a.uid===galteo.uid);
  act(s,'replaceEscape',a=>a.shield===chosen.uid);
  assert.equal(s.decision.task.op,'g34_Target');
  pick(s,target.uid);
  assert.equal(s.decision,null);
  assert.ok(has(s.players[0].battle,galteo));
  assert.ok(has(s.players[0].hand,chosen));
  assert.ok(!has(s.players[0].grave,chosen));
  assert.ok(target.tapped);
 }
});

test('Galteo can be used as S Trigger and observes the next shield departure',()=>{
 const s=setup();
 give(s,0,'shields',[GALTEO,N]);
 give(s,1,'battle',[N,N,N]);
 const [galteo]=s.players[0].shields,[first,second,target]=s.players[1].battle;
 s.active=1;
 attack(s,first.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 assert.equal(s.decision,null);
 assert.ok(has(s.players[0].battle,galteo));
 attack(s,second.uid);
 act(s,'noBlock');
 pick(s,target.uid);
 assert.ok(target.tapped);
});

test('Gar Keen S Trigger can move a Tamaseed to its owners shields and excludes untargetable enemies',()=>{
 const s=setup();
 give(s,0,'shields',[KEEN]);
 give(s,1,'battle',[N,SEED,DIVER]);
 const [keen]=s.players[0].shields,[attacker,seed,diver]=s.players[1].battle;
 diver.justDiverActive=true;
 s.active=1;
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 assert.ok(has(s.players[0].battle,keen));
 assert.deepEqual(s.decision.choices.map(valueOf),[attacker.uid,seed.uid,null]);
 pick(s,seed.uid);
 assert.ok(!has(s.players[1].battle,seed));
 assert.ok(has(s.players[1].shields,seed));
 assert.ok(!seed.faceUp);
});

test('Gar Keen can decline the shield effect when normally summoned',()=>{
 const s=setup();
 give(s,0,'hand',[KEEN]);
 give(s,1,'battle',[SEED]);
 const [seed]=s.players[1].battle;
 act(s,'play');
 pick(s,null);
 assert.ok(has(s.players[1].battle,seed));
 assert.ok(!has(s.players[1].shields,seed));
});
