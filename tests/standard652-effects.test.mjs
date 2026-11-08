import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-652.json',import.meta.url)));
const KATSU='dm26rp2-049',FUNK='dm26rp2-065',MARI='dm26rp2-069';
const PLAIN='dm01-108',SEED='dmsd20-016',THOR='dm01-041';
const valueOf=c=>c.value?.uid??c.value;
const pick=(s,v)=>act(s,'extended',a=>valueOf(s.decision.choices[a.choice])===v);
const has=(xs,uid)=>xs.some(x=>x.uid===uid);

test('Phase 652 preserves canonical IDs for three official prints',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 assert.equal(cards.length,3);
 for(const row of cards){
  const detail=details.cards.find(d=>d.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:652}));
  assert.throws(()=>standardCardSpec(detail,{phase:651}));
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

for(const boosted of [false,true])test('Katsuemon uses current creature count and powered breaker '+boosted,()=>{
 const s=setup();
 give(s,0,'hand',[KATSU]);
 give(s,0,'battle',[PLAIN,SEED]);
 give(s,1,'battle',[PLAIN,PLAIN,PLAIN]);
 act(s,'play',a=>a.cost===4);
 const katsu=s.players[0].battle.find(x=>x.cardId===KATSU);
 assert.equal(e.effectiveCard(katsu,s).blocker,true);
 assert.equal(e.power(katsu,false,s),6000);
 const ally=inst(PLAIN);
 s.players[0].battle.push(ally);
 assert.equal(e.power(katsu,false,s),12000);
 ally.sealed=true;
 assert.equal(e.power(katsu,false,s),6000);
 ally.sealed=false;
 if(!boosted)s.players[0].grave.push(s.players[0].battle.pop());
 katsu.entered=0;
 attack(s,katsu.uid);
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,boosted?2:3);
});

for(const active of [0,1])test('Funk destroys itself only while tapped at either end step '+active,()=>{
 const s=setup();
 give(s,0,'battle',[FUNK,FUNK]);
 const [tapped,ready]=s.players[0].battle;
 assert.equal(e.effectiveCard(tapped,s).blocker,true);
 tapped.tapped=true;
 s.active=active;
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
 assert.ok(has(s.players[0].grave,tapped.uid));
 assert.ok(has(s.players[0].battle,ready.uid));
});

test('Funk checks its tap state after an earlier end step effect untaps it',()=>{
 let s=setup();
 give(s,0,'battle',[FUNK,THOR]);
 const [funk]=s.players[0].battle;
 funk.tapped=true;
 s.phase='attack';
 act(s,'endTurn');
 assert.equal(s.decision.type,'effectOrder');
 const thor=s.pendingEffects.find(x=>x.source===THOR);
 assert.ok(thor);
 e.step(s,e.getLegalActions(s).find(a=>a.effectId===thor.effectId));
 pick(s,true);
 s=JSON.parse(JSON.stringify(s));
 drain(s);
 const current=s.players[0].battle.find(x=>x.uid===funk.uid);
 assert.ok(current&&!current.tapped);
 assert.ok(!has(s.players[0].grave,funk.uid));
});

test('Marinyan needs another attack in the current turn before its double break',()=>{
 const s=setup();
 give(s,0,'battle',[MARI,PLAIN]);
 const [mari,ally]=s.players[0].battle;
 const canAttack=()=>e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===mari.uid);
 s.phase='attack';
 assert.ok(!canAttack());
 attack(s,ally.uid);
 act(s,'noBlock');
 drain(s);
 assert.ok(canAttack());
 attack(s,mari.uid);
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,2);
 act(s,'endTurn');
 drain(s);
 act(s,'skipCharge');
 act(s,'toAttack');
 act(s,'endTurn');
 drain(s);
 act(s,'skipCharge');
 act(s,'toAttack');
 assert.ok(!canAttack());
});

test('Marinyan can guard an ally even while its own attack condition is unmet',()=>{
 const s=setup();
 give(s,0,'battle',[PLAIN,MARI]);
 give(s,1,'battle',[PLAIN]);
 const [ally,mari]=s.players[0].battle,[enemy]=s.players[1].battle;
 ally.tapped=true;
 s.active=1;
 attack(s,enemy.uid,ally.uid);
 act(s,'noBlock');
 assert.equal(s.decision.task.op,'g393SG_Battle');
 pick(s,mari.uid);
 drain(s);
 assert.ok(mari.tapped);
 assert.ok(has(s.players[0].battle,ally.uid));
 assert.ok(has(s.players[0].battle,mari.uid));
 assert.ok(has(s.players[1].grave,enemy.uid));
});
