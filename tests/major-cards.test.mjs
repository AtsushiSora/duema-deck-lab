import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain,PRESETS} from './target-fixture.mjs';
import {createCatalogue} from '../dist/catalogue.js';
const manifest=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-56.json',import.meta.url))),registry=createCatalogue(snapshot,data.cards,details);
const TUNE='dmr22-053',COLLAPSE='dm22-011',SHOWER='dmr11-018',SONG='dmrp16-085',EMERGENCY='dm11-043',TOUCH='dmr21-090',CRISIS='dm02-035',ORIOTIS='dmr15-007',IZANAGI='dmbd18-002',OLIVE='dmr12-023',CHOICE='dmr17-017',WATER='dmex06-015',N='dm01-108',B='dm01-083';
const pick=(s,value)=>{const a=e.getLegalActions(s).find(a=>a.kind==='extended'&&JSON.stringify(s.decision.choices[a.choice].value)===JSON.stringify(value));assert.ok(a,JSON.stringify(s.decision));e.step(s,a);};
const play=(s,id)=>{s.players[s.active].hand.push(inst(id));act(s,'play',a=>a.cardId===id);};
test('twelve major cards use verified faces, effect definitions, real art and current limits',()=>{
 assert.equal(manifest.cards.length,12);assert.equal(data.cards.length,1416);assert.equal(data.supportExpansion.phase,73);
 for(const row of manifest.cards){const c=e.card(row.id);assert.equal(c.name,row.name);assert.deepEqual(details.cards.find(x=>x.id===row.id).faces,row.faces);for(const[k,v]of Object.entries(row.spec))assert.deepEqual(c[k],v);assert.equal(registry.get(row.id).supported,true);assert.match(row.image,/^https:\/\/dm\.takaratomy\.co\.jp\/wp-content\/card\/cardimage\//);assert.equal(c.limit,row.id===CHOICE?1:4);}
 const deck={cards:[{id:CHOICE,count:2},{id:N,count:38}]};assert.ok(registry.validate(deck).some(x=>x.includes('チョイス')));
});
test('Cyber Tune draws three before its two-card self discard',()=>{
 const s=setup();give(s,0,'deck',[N,B,N,B,N,N]);const ids=s.players[0].deck.map(x=>x.uid);play(s,TUNE);assert.equal(s.players[0].hand.length,3);assert.equal(s.decision.task.op,'discardSelect');pick(s,ids[0]);pick(s,ids[1]);assert.equal(s.players[0].hand.length,1);assert.ok(s.players[0].hand.some(x=>x.uid===ids[2]));assert.equal(s.players[0].grave.filter(x=>ids.includes(x.uid)).length,2);
});
test('Emergency Typhoon allows zero, one or two draws, then still discards once',()=>{
 for(const n of[0,1,2]){const s=setup();give(s,0,'hand',[N]);const kept=s.players[0].hand[0],deck=s.players[0].deck.length;play(s,EMERGENCY);assert.equal(s.decision.task.op,'g34_Draw');pick(s,n);assert.equal(s.players[0].deck.length,deck-n);pick(s,kept.uid);assert.ok(s.players[0].grave.some(x=>x.uid===kept.uid));assert.equal(s.players[0].hand.length,n);}
});
test('Brain Touch uses a blind opponent discard and then draws exactly one',()=>{
 const s=setup();give(s,1,'hand',[N,B,N]);const ids=s.players[1].hand.map(x=>x.uid),before=s.players[0].deck.length;play(s,TOUCH);drain(s);assert.equal(s.players[1].hand.length,2);assert.equal(s.players[1].grave.filter(x=>ids.includes(x.uid)).length,1);assert.equal(s.players[0].hand.length,1);assert.equal(s.players[0].deck.length,before-1);
});
test('Fairy Shower privately chooses one of the top two and puts the other into mana',()=>{
 for(const manaCard of[N,TOUCH]){const s=setup();give(s,0,'deck',[B,manaCard,N,N]);const[a,b]=s.players[0].deck;play(s,SHOWER);assert.equal(s.decision.task.op,'g34_LookPick');assert.equal(s.decision.choices.length,2);pick(s,a.uid);drain(s);assert.ok(s.players[0].hand.some(x=>x.uid===a.uid));const ramped=s.players[0].mana.find(x=>x.uid===b.uid);assert.ok(ramped);assert.equal(ramped.tapped,manaCard===TOUCH);assert.ok(!s.log.some(x=>x.type==='reveal'&&x.cardId===B));assert.deepEqual(s.players[0].g34Protected,[]);}
});
test('Fairy Song puts both actual top cards into mana tapped, including monocolor',()=>{
 const s=setup();give(s,0,'deck',[N,B,N,N]);const ids=s.players[0].deck.slice(0,2).map(x=>x.uid),n=s.players[0].mana.length;play(s,SONG);drain(s);assert.equal(s.players[0].mana.length,n+2);for(const id of ids)assert.equal(s.players[0].mana.find(x=>x.uid===id)?.tapped,true);
});
test('Mana Crisis selects only opposing mana and moves the chosen physical card to its owners grave',()=>{
 const s=setup();give(s,1,'mana',[N,B]);const x=s.players[1].mana[1];play(s,CRISIS);assert.equal(s.decision.choices.length,2);assert.ok(s.decision.choices.every(o=>o.value.p===1));pick(s,{uid:x.uid,origin:'mana',p:1});assert.ok(s.players[1].grave.some(y=>y.uid===x.uid));assert.equal(s.players[1].mana.length,1);
});
test('Collapse Wave can put either players mana on that owners library top',()=>{
 for(const p of[0,1]){const s=setup(),x=s.players[p].mana[0];play(s,COLLAPSE);pick(s,{p,uid:x.uid});assert.equal(s.players[p].deck[0].uid,x.uid);assert.ok(!s.players[p].mana.some(y=>y.uid===x.uid));assert.ok(!x.tapped);}
});
test('Collapse Wave does not disclose the identity of face-down mana in choices or scores',()=>{
 const a=setup(),b=structuredClone(a);give(a,1,'mana',[N]);b.players[1].mana=structuredClone(a.players[1].mana);a.players[1].mana[0].faceDown=true;b.players[1].mana[0].faceDown=true;b.players[1].mana[0].cardId=TUNE;play(a,COLLAPSE);play(b,COLLAPSE);const get=s=>s.decision.choices.filter(o=>o.value?.p===1);assert.deepEqual(get(a),get(b));assert.equal(get(a)[0].cardId,undefined);
});
test('Izanagi privately takes a top-five card, orders misses and can cast a small spell just taken',()=>{
 const s=setup();give(s,0,'deck',[TOUCH,N,B,N,B,N,N]);give(s,1,'hand',[N]);const target=s.players[0].deck[0];play(s,IZANAGI);assert.equal(s.decision.choices.length,5);pick(s,target.uid);while(s.decision?.task.op==='g34_Order')pick(s,s.decision.choices[0].value);assert.equal(s.decision.task.op,'g34_Execute');assert.ok(s.decision.choices.some(o=>o.value?.uid===target.uid));pick(s,{uid:target.uid,face:0,origin:'hand'});drain(s);assert.equal(s.players[1].hand.length,0);assert.ok(s.players[0].grave.some(x=>x.uid===target.uid));assert.equal(s.players[0].battle.find(x=>x.cardId===IZANAGI)?.cardId,IZANAGI);
});
test('Q.Q.QX prevents library looking but not subsequent Izanagi casting or Song ramp',()=>{
 const qq=data.cards.find(c=>c.qqLock).id;
 const s=setup();give(s,1,'battle',[qq]);give(s,0,'hand',[TOUCH]);const before=s.players[0].deck.map(x=>x.uid);play(s,IZANAGI);assert.equal(s.decision.task.op,'g34_Execute');assert.deepEqual(s.players[0].deck.map(x=>x.uid),before);pick(s,null);
 const t=setup();give(t,1,'battle',[qq]);give(t,0,'deck',[N,N,N,N]);const n=t.players[0].mana.length;play(t,SONG);drain(t);assert.equal(t.players[0].mana.length,n+2);
});
test('Olive Oil shuffles exactly the chosen players entire grave and cannot attack',()=>{
 for(const p of[0,1]){const s=setup();give(s,p,'grave',[N,B,TOUCH]);const ids=s.players[p].grave.map(x=>x.uid),n=s.players[p].deck.length;play(s,OLIVE);pick(s,p);drain(s);assert.equal(s.players[p].grave.filter(x=>ids.includes(x.uid)).length,0);assert.equal(s.players[p].deck.length,n+3);for(const id of ids)assert.ok(s.players[p].deck.some(x=>x.uid===id));s.phase='attack';assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===s.players[0].battle[0].uid));}
});
test('I Choice can use a creature or the spell face of a twinpact with S Trigger',()=>{
 for(const[id,face]of[[OLIVE,0],['dmex17-111',1]]){const s=setup();give(s,0,'hand',[id,N]);const x=s.players[0].hand[0];play(s,CHOICE);assert.equal(s.decision.task.op,'g34_Execute');assert.ok(s.decision.choices.some(o=>o.value?.uid===x.uid&&o.value.face===face));assert.ok(!s.decision.choices.some(o=>o.value?.uid===s.players[0].hand[1].uid));pick(s,{uid:x.uid,face,origin:'hand'});drain(s);assert.ok(s.players[0][face?'grave':'battle'].some(y=>y.uid===x.uid));}
});
test('Water Now ramps tapped, recovers one creature, then offers only legal opposing bounce targets',()=>{
 const s=setup();give(s,0,'deck',[ORIOTIS,B,N,N]);give(s,1,'battle',[N,CHOICE]);const ramp=s.players[0].deck.slice(0,2),small=s.players[1].battle[0],large=s.players[1].battle[1];play(s,WATER);assert.equal(s.decision.task.op,'g36WaterPick');for(const x of ramp)assert.equal(s.players[0].mana.find(y=>y.uid===x.uid)?.tapped,true);pick(s,ramp[0].uid);assert.ok(s.players[0].hand.some(x=>x.uid===ramp[0].uid));assert.ok(s.decision.choices.some(o=>o.value===small.uid));assert.ok(!s.decision.choices.some(o=>o.value===large.uid));pick(s,small.uid);assert.ok(s.players[1].hand.some(x=>x.uid===small.uid));
});
test('Water Now can decline the bounce; no mana creature means it offers no bounce',()=>{
 const s=setup();play(s,WATER);if(s.decision?.task.op==='g36WaterPick'){pick(s,s.decision.choices[0].value);pick(s,null);}drain(s);
 const t=setup();give(t,0,'mana',[TUNE,...Array(8).fill(SONG)]);give(t,0,'deck',[SHOWER,TOUCH,N,N]);give(t,1,'battle',[N]);play(t,WATER);assert.equal(t.decision,null);assert.equal(t.players[1].battle.length,1);
});
test('Oriotis retains blocker and creature attacks, forbids player attacks and bottoms over-mana entries',()=>{
 const s=setup();give(s,1,'battle',[ORIOTIS]);give(s,0,'mana',[N,N]);const x=inst(IZANAGI);s.players[0].hand.push(x);s.extTasks=[{op:'putCreature',p:0,source:IZANAGI,origin:'hand',uid:x.uid}];act(s,'toAttack');drain(s);assert.ok(!s.players[0].battle.some(y=>y.uid===x.uid));assert.equal(s.players[0].deck.at(-1).uid,x.uid);
 const t=setup();give(t,0,'battle',[ORIOTIS]);give(t,1,'battle',[N]);t.players[1].battle[0].tapped=true;t.phase='attack';const attacks=e.getLegalActions(t).filter(a=>a.kind==='attack');assert.ok(attacks.some(a=>a.target===t.players[1].battle[0].uid));assert.ok(!attacks.some(a=>a.target==='player'));assert.equal(e.card(ORIOTIS).blocker,true);
});
test('new choices survive JSON restore and complete without replacing physical IDs',()=>{
 for(const row of manifest.cards){const s=setup();give(s,0,'deck',[TOUCH,N,B,N,B,N,N,N]);give(s,0,'hand',[TOUCH,OLIVE]);give(s,1,'battle',[N]);give(s,1,'grave',[B]);give(s,1,'hand',[N]);s.players[0].hand.push(inst(row.id));const ids=e.physicalCards(s).map(x=>x.uid).sort();act(s,'play',a=>a.cardId===row.id);const resumed=JSON.parse(JSON.stringify(s));drain(resumed);assert.deepEqual(e.physicalCards(resumed).map(x=>x.uid).sort(),ids,row.name);assert.equal(resumed.decision,null,row.name);}
});
