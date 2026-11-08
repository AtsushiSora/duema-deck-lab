import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-648.json',import.meta.url)));
const MARU='dm26rp3-031',KOONI='dm26rp3-051',KETSU='dm26rp3-041',WATAN='dm26rp3-073',HAMI='dm26rp3-023';
const TRIGGER='dm26rp3-067',GS='dmrp17-025',PLAIN='dm01-108',STRONG='dm01-s01',SEED='dmsd20-016';
const valueOf=c=>c.value?.uid??c.value;
const pick=(s,v)=>act(s,'extended',a=>valueOf(s.decision.choices[a.choice])===v);
const has=(xs,x)=>xs.some(y=>y.uid===x.uid);
const end=s=>{s.phase='attack';act(s,'endTurn');};

test('Phase 648 retains official definitions, images, limits and saved deck IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(d=>d.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:648}));
  assert.throws(()=>standardCardSpec(detail,{phase:647}));
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

test('Maruhavu grants Escape to itself and allied Distas only on the opponent turn',()=>{
 for(const chosen of [0,1]){
  const s=setup();
  give(s,0,'battle',[MARU,WATAN,PLAIN,SEED]);
  give(s,0,'shields',[PLAIN,TRIGGER]);
  give(s,1,'battle',[STRONG,WATAN]);
  const [maru,ally,other,seed]=s.players[0].battle;
  const [attacker,enemyDistas]=s.players[1].battle,[,shield]=s.players[0].shields;
  assert.ok(!e.effectiveCard(maru,s).escape&&!e.effectiveCard(ally,s).escape);
  s.active=1;
  assert.ok(e.effectiveCard(maru,s).escape&&e.effectiveCard(ally,s).escape);
  for(const unit of [other,seed,enemyDistas])assert.ok(!e.effectiveCard(unit,s).escape);
  const target=s.players[0].battle[chosen];
  target.tapped=true;
  attacker.powerModifiers=[{amount:10000}];
  attack(s,attacker.uid,target.uid);
  act(s,'noBlock');
  act(s,'replaceEscape',a=>a.shield===shield.uid);
  drain(s);
  assert.ok(has(s.players[0].battle,target));
  assert.ok(has(s.players[0].hand,shield));
  assert.ok(!has(s.players[0].battle,shield));
 }
});

test('Maruhavu pays Sasage 2 on its own turn without granting itself Escape',()=>{
 const s=setup();
 give(s,0,'battle',[MARU]);
 give(s,0,'hand',[HAMI]);
 const [maru]=s.players[0].battle;
 act(s,'play',a=>a.alternative==='sasage'&&a.sasage.includes(maru.uid));
 assert.ok(has(s.players[0].grave,maru));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,4);
});

test('Kooni counts shield groups at the six-shield threshold and pays Sasage 4',()=>{
 const s=setup();
 give(s,0,'battle',[KOONI]);
 give(s,0,'hand',[HAMI]);
 give(s,0,'shields',[PLAIN,PLAIN,PLAIN,PLAIN]);
 give(s,1,'shields',[PLAIN,PLAIN,PLAIN]);
 const [kooni]=s.players[0].battle;
 const action=()=>e.getLegalActions(s).find(a=>a.alternative==='sasage'&&a.sasage.includes(kooni.uid));
 assert.equal(action(),undefined);
 s.players[1].shields.pop();
 s.players[0].shields[0].shieldStack=[inst(PLAIN)];
 assert.equal(action()?.cost,2);
 act(s,'play',a=>a.id===action()?.id);
 assert.ok(has(s.players[0].grave,kooni));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,2);
});

test('Kooni takes the chosen shield at own end with S Trigger suppressed and G Strike available',()=>{
 const s=setup();
 give(s,0,'battle',[KOONI]);
 give(s,0,'shields',[PLAIN,TRIGGER]);
 give(s,1,'battle',[STRONG]);
 const [,trigger]=s.players[0].shields;
 trigger.shieldStack=[inst(GS)];
 const [strike]=trigger.shieldStack;
 end(s);
 pick(s,trigger.uid);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='useTrigger'||a.cardId===TRIGGER));
 assert.match(s.decision?.title??'',/G・ストライク/);
 drain(s);
 for(const x of [trigger,strike])assert.ok(has(s.players[0].hand,x));
 assert.equal(s.players[0].shields.length,1);
});

test('Kooni retains Slayer and does not take a shield at the end of the opponent turn',()=>{
 const s=setup();
 give(s,0,'battle',[KOONI,KOONI]);
 give(s,1,'battle',[STRONG]);
 const [target,survivor]=s.players[0].battle,[attacker]=s.players[1].battle;
 attacker.powerModifiers=[{amount:10000}];
 target.tapped=true;
 s.active=1;
 attack(s,attacker.uid,target.uid);
 act(s,'noBlock');
 drain(s);
 assert.ok(has(s.players[1].grave,attacker));
 assert.ok(has(s.players[0].grave,target));
 end(s);
 drain(s);
 assert.ok(has(s.players[0].battle,survivor));
 assert.equal(s.players[0].shields.length,5);
});

test('Ketsu selects a non-first shield on entry and preserves JOE through save and restore',()=>{
 for(const discounted of [false,true]){
  let s=setup();
  give(s,0,'hand',[KETSU]);
  give(s,1,'shields',[PLAIN,TRIGGER,PLAIN]);
  const [ketsu]=s.players[0].hand,[,shield]=s.players[1].shields;
  act(s,'play',a=>discounted?a.alternative==='joe':!a.alternative);
  assert.equal(s.players[0].mana.filter(x=>x.tapped).length,discounted?4:6);
  assert.ok(!s.attack);
  assert.equal(s.decision.choices.length,3);
  s=JSON.parse(JSON.stringify(s));
  pick(s,shield.uid);
  act(s,'useTrigger');
  drain(s);
  assert.equal(s.players[1].shields.length,2);
  assert.ok(has(s.players[1].battle,shield));
  assert.ok(s.log.some(x=>x.type==='break'));
  if(discounted){
   end(s);
   drain(s);
   assert.equal(s.players[0].deck.at(-1).uid,ketsu.uid);
   assert.equal(s.players[0].hand.length,1);
  }else assert.ok(has(s.players[0].battle,ketsu));
 }
});

test('Ketsu entry with no opposing shield neither attacks nor wins, and its W Breaker is separate',()=>{
 const s=setup();
 give(s,0,'hand',[KETSU]);
 give(s,1,'shields',[]);
 const [ketsu]=s.players[0].hand;
 act(s,'play',a=>!a.alternative);
 assert.equal(s.decision,null);
 assert.equal(s.winner,null);
 give(s,1,'shields',[PLAIN,PLAIN,PLAIN]);
 ketsu.entered=0;
 attack(s,ketsu.uid);
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,1);
});
