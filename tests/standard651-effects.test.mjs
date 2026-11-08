import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-651.json',import.meta.url)));
const KNIGHT='dm25rp1-038',EL='dm25rp2-009',COOK='dm25rp4-073';
const PLAIN='dm01-108',SPELL='dm01-027',EVO='dmrp01-047';
const EDDI='dm25rp1-006',BLACK='dm22ex2-S07',TRIGGER='dm26rp3-067';
const valueOf=c=>c.value?.uid??c.value;
const pick=(s,v)=>act(s,'extended',a=>valueOf(s.decision.choices[a.choice])===v);
const has=(xs,uid)=>xs.some(x=>x.uid===uid);

test('Phase 651 preserves canonical IDs and records the El alternate prints without creating a second definition',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 assert.equal(cards.length,3);
 for(const row of cards){
  const detail=details.cards.find(d=>d.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:651}));
  assert.throws(()=>standardCardSpec(detail,{phase:650}));
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
 for(const alternate of printAliases){
  assert.equal(alternate.canonicalId,EL);
  assert.ok(alternate.verification.facesMatched);
  assert.ok(!data.cards.some(x=>x.id===alternate.id));
  assert.deepEqual(alternate.spec,cards.find(x=>x.id===EL).spec);
 }
});

test('The knight counts any grave card for its summon and always pays at least one',()=>{
 for(const [count,expected] of [[0,6],[3,3],[8,1]]){
  const s=setup();
  give(s,0,'hand',[KNIGHT]);
  give(s,0,'grave',Array(count).fill(SPELL));
  act(s,'play',a=>a.cardId===KNIGHT&&a.cost===expected);
  assert.equal(s.players[0].mana.filter(x=>x.tapped).length,expected);
  const [knight]=s.players[0].battle;
  assert.equal(e.effectiveCard(knight,s).cost,6);
  assert.equal(e.effectiveCard(knight,s).blocker,true);
  assert.equal(e.effectiveCard(knight,s).breaker,2);
 }
});

test('QA46502 excludes the knight itself when Eddi summons it from the grave',()=>{
 const s=setup();
 give(s,0,'battle',[EDDI]);
 give(s,0,'grave',[KNIGHT,PLAIN,SPELL,PLAIN,SPELL]);
 const [knight]=s.players[0].grave;
 give(s,0,'mana',['dm01-090']);
 assert.ok(!e.getLegalActions(s).some(a=>a.uid===knight.uid));
 s.players[0].mana.push(inst(PLAIN));
 act(s,'play',a=>a.uid===knight.uid&&a.origin==='grave'&&a.cost===2);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,2);
 assert.ok(has(s.players[0].battle,knight.uid));
});

for(const inherited of [false,true])test('The knight can recover a creature on attack '+(inherited?'under another creature':'itself'),()=>{
 const s=setup();
 give(s,0,'battle',[inherited?PLAIN:KNIGHT]);
 give(s,0,'grave',[PLAIN,SPELL]);
 const [host]=s.players[0].battle,[recover]=s.players[0].grave;
 if(inherited){
  host.under=[inst(KNIGHT)];
  const c=e.effectiveCard(host,s);
  assert.ok(!c.blocker&&!c.breaker&&!c.g212CountDiscount);
 }
 attack(s,host.uid);
 assert.deepEqual(s.decision.choices.map(valueOf),[recover.uid,null]);
 pick(s,recover.uid);
 assert.ok(has(s.players[0].hand,recover.uid));
});

test('El recovers a creature when summoned and can attack the same turn',()=>{
 const s=setup();
 give(s,0,'hand',[EL]);
 give(s,0,'grave',[PLAIN,SPELL]);
 const [recover]=s.players[0].grave;
 act(s,'play');
 assert.deepEqual(s.decision.choices.map(valueOf),[recover.uid,null]);
 pick(s,recover.uid);
 assert.ok(has(s.players[0].hand,recover.uid));
 attack(s,s.players[0].battle[0].uid);
 assert.equal(s.decision.type,'block');
});

test('El may decline the stack payment and the opponent keeps their shields',()=>{
 const s=setup();
 give(s,0,'battle',[PLAIN]);
 const [host]=s.players[0].battle,soul=inst(EL);
 host.under=[soul];
 assert.ok(!e.effectiveCard(host,s).speedAttacker);
 attack(s,host.uid);
 assert.equal(s.decision.task.op,'g34_StackShieldGrave651');
 pick(s,null);
 assert.equal(s.players[1].shields.length,5);
 assert.equal(host.under[0].uid,soul.uid);
});

test('El pays only the chosen card and sends the selected shield group to grave across save and restore',()=>{
 let s=setup();
 give(s,0,'battle',[PLAIN]);
 give(s,1,'shields',[PLAIN,TRIGGER,PLAIN]);
 const [host]=s.players[0].battle,soul=inst(EL),pay=inst(PLAIN),keep=inst(PLAIN);
 host.under=[soul];
 soul.under=[pay,keep];
 const [first,chosen,last]=s.players[1].shields,layer=inst(TRIGGER);
 chosen.shieldStack=[layer];
 attack(s,host.uid);
 assert.deepEqual(s.decision.choices.map(valueOf),[soul.uid,pay.uid,keep.uid,null]);
 pick(s,pay.uid);
 assert.deepEqual(s.decision.choices.map(valueOf),[first.uid,chosen.uid,last.uid]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,chosen.uid);
 assert.ok(has(s.players[0].grave,pay.uid));
 assert.equal(s.players[0].battle[0].under[0].under[0].uid,keep.uid);
 assert.deepEqual(s.players[1].shields.map(x=>x.uid),[first.uid,last.uid]);
 for(const x of [chosen,layer])assert.ok(has(s.players[1].grave,x.uid));
 assert.equal(s.decision.type,'block');
});

test('QA46860 El can pay itself as a new base after Black Zone invades',()=>{
 const s=setup();
 give(s,0,'battle',[EL]);
 give(s,0,'hand',[BLACK]);
 give(s,1,'shields',[PLAIN,TRIGGER]);
 const [el]=s.players[0].battle,[,chosen]=s.players[1].shields;
 attack(s,el.uid);
 assert.equal(s.decision.task.op,'g23_Declare');
 pick(s,true);
 const invasion=s.pendingEffects.find(x=>x.task?.op==='g23_Invade');
 if(invasion)e.step(s,e.getLegalActions(s).find(a=>a.effectId===invasion.effectId));
 assert.equal(s.decision.task.op,'g23_Invade');
 pick(s,true);
 const host=s.players[0].battle.find(x=>x.cardId===BLACK);
 assert.equal(host.under[0].uid,el.uid);
 const pending=s.pendingEffects.find(x=>x.source===EL);
 assert.ok(pending);
 e.step(s,e.getLegalActions(s).find(a=>a.effectId===pending.effectId));
 assert.equal(s.decision.task.op,'g34_StackShieldGrave651');
 pick(s,el.uid);
 pick(s,chosen.uid);
 assert.ok(has(s.players[0].grave,el.uid));
 assert.ok(has(s.players[1].grave,chosen.uid));
 assert.ok(!host.under.length);
});

test('Cook plays as a Tamaseed and Shinkalize lets a creature inherit only attack protection',()=>{
 const s=setup();
 give(s,0,'hand',[COOK,EVO]);
 give(s,1,'battle',[PLAIN]);
 const [cook]=s.players[0].hand;
 act(s,'play',a=>a.cardId===COOK&&a.cost===1);
 assert.equal(e.effectiveCard(cook,s).type,'seed');
 act(s,'play',a=>a.cardId===EVO);
 act(s,'evolve',a=>a.baseUid===cook.uid);
 const [host]=s.players[0].battle;
 assert.equal(host.under[0].uid,cook.uid);
 assert.equal(e.effectiveCard(host,s).cannotBeAttacked,true);
 assert.ok(!e.effectiveCard(host,s).gStrike);
 s.active=1;s.phase='attack';host.tapped=true;
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.target===host.uid));
 host.under[0].faceDown=true;
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.target===host.uid));
});

test('Cook can G Strike from shields and returns to hand',()=>{
 const s=setup();
 give(s,0,'shields',[COOK]);
 give(s,1,'battle',[PLAIN,PLAIN]);
 const [cook]=s.players[0].shields,[attacker,later]=s.players[1].battle;
 s.active=1;
 attack(s,attacker.uid);
 act(s,'noBlock');
 assert.equal(s.decision.task.op,'gsDeclare');
 pick(s,true);
 pick(s,later.uid);
 assert.ok(e.attackLocked(s,1,later));
 assert.ok(has(s.players[0].hand,cook.uid));
});
