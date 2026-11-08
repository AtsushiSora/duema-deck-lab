import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-653.json',import.meta.url)));
const KIRI='dm26rp1-066',GYAKU='dm26rp1-071',GIANT='dm26rp1-044';
const PLAIN='dm01-108',GS='dmrp17-025',TRIGGER='dm26rp3-067',EDDI='dm25rp1-006';
const valueOf=c=>c.value?.uid??c.value;
const pick=(s,v)=>act(s,'extended',a=>valueOf(s.decision.choices[a.choice])===v);
const has=(xs,uid)=>xs.some(x=>x.uid===uid);

test('Phase 653 preserves canonical IDs for three official prints',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 assert.equal(cards.length,3);
 for(const row of cards){
  const detail=details.cards.find(d=>d.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:653}));
  assert.throws(()=>standardCardSpec(detail,{phase:652}));
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

for(const [spell,owner] of [[KIRI,0],[GYAKU,1]])test(e.card(spell)?.name+' lets the shield owner choose a non-first shield and resolves the S Trigger',()=>{
 let s=setup();
 give(s,0,'hand',[spell]);
 give(s,owner,'shields',[PLAIN,TRIGGER,PLAIN]);
 const [first,chosen,last]=s.players[owner].shields,layer=inst(PLAIN);
 chosen.shieldStack=[layer];
 act(s,'play');
 assert.equal(s.decision.player,owner);
 assert.equal(s.decision.task.p,0);
 assert.deepEqual(s.decision.choices.map(valueOf),[first.uid,chosen.uid,last.uid]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,chosen.uid);
 assert.deepEqual(s.players[owner].shields.map(x=>x.uid),[first.uid,last.uid]);
 assert.ok(has(s.players[owner].hand,layer.uid));
 act(s,'useTrigger');
 assert.ok(has(s.players[owner].battle,chosen.uid));
 drain(s);
 assert.ok(s.players[0].grave.some(x=>x.cardId===spell));
 assert.equal(s.active,0);
});

test('A shieldless target makes the spell resolve without direct damage',()=>{
 for(const [spell,owner] of [[KIRI,0],[GYAKU,1]]){
  const s=setup();
  give(s,0,'hand',[spell]);
  give(s,owner,'shields',[]);
  act(s,'play');
  assert.equal(s.decision,null);
  assert.equal(s.winner,null);
  assert.ok(s.players[0].grave.some(x=>x.cardId===spell));
 }
});

test('A spell breaking its own shield can still produce G Strike',()=>{
 const s=setup();
 give(s,0,'hand',[KIRI]);
 give(s,0,'shields',[PLAIN,GS]);
 give(s,1,'battle',[PLAIN]);
 const [,shield]=s.players[0].shields,[enemy]=s.players[1].battle;
 act(s,'play');
 pick(s,shield.uid);
 assert.equal(s.decision.task.op,'gsDeclare');
 pick(s,true);
 pick(s,enemy.uid);
 assert.ok(e.attackLocked(s,1,enemy));
});

for(const spell of [KIRI,GYAKU])test(e.card(spell)?.name+' has G Strike when an attacker breaks its shield',()=>{
 const s=setup();
 give(s,0,'shields',[spell]);
 give(s,1,'battle',[PLAIN,PLAIN]);
 const [shield]=s.players[0].shields,[first,later]=s.players[1].battle;
 s.active=1;
 attack(s,first.uid);
 act(s,'noBlock');
 assert.equal(s.decision.task.op,'gsDeclare');
 pick(s,true);
 pick(s,later.uid);
 assert.ok(e.attackLocked(s,1,later));
 assert.ok(has(s.players[0].hand,shield.uid));
});

test('The Giant pays seven from hand and can Mach Fight an untapped creature immediately',()=>{
 const s=setup();
 give(s,0,'hand',[GIANT]);
 give(s,0,'mana',Array(6).fill(PLAIN));
 give(s,1,'battle',[PLAIN]);
 const [giant]=s.players[0].hand,[target]=s.players[1].battle;
 assert.ok(!e.getLegalActions(s).some(a=>a.uid===giant.uid));
 s.players[0].mana.push(inst(PLAIN));
 act(s,'play',a=>a.uid===giant.uid&&a.cost===7);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,7);
 assert.equal(e.effectiveCard(giant,s).cost,4);
 s.phase='attack';
 assert.ok(!e.getLegalActions(s).some(a=>a.uid===giant.uid&&a.target==='player'));
 attack(s,giant.uid,target.uid);
 act(s,'noBlock');
 drain(s);
 assert.ok(has(s.players[1].grave,target.uid));
});

test('The Giant pays four from the grave and later breaks four shields',()=>{
 const s=setup();
 give(s,0,'battle',[EDDI]);
 give(s,0,'grave',[GIANT]);
 give(s,0,'mana',Array(4).fill(PLAIN));
 const [giant]=s.players[0].grave;
 act(s,'play',a=>a.uid===giant.uid&&a.origin==='grave'&&a.cost===4);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,4);
 assert.ok(has(s.players[0].battle,giant.uid));
 giant.entered=0;
 attack(s,giant.uid);
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,1);
});
