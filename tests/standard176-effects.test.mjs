import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain,GEN,GG,PRESETS} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {STANDARD176_DECKS} from '../tools/fixtures/standard176.mjs';
const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-176.json',import.meta.url)));
const N='dm01-108',D='dmrp04m-051',K='dmex14-075',BO='dm01-086';
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function attack(s,uid=s.players[0].battle[0].uid,target='player'){s.phase='attack';act(s,'attack',a=>a.uid===uid&&a.target===target);}
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}
test('six complete definitions have official art, limits and a legal forty-card fixture',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);assert.equal(m.cards.length,6);
 for(const row of m.cards){assert.deepEqual(row.faces,details.cards.find(x=>x.id===row.id).faces);assert.deepEqual(row.spec,standardCardSpec(details.cards.find(x=>x.id===row.id),{phase:176}));assert.equal(e.card(row.id).supportBatch,'phase-176');assert.ok(row.verification.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(e.card(row.id).limit,m.regulationVerification.limits[row.id]);assert.equal(CARD_IMAGES[row.id],row.image);assert.ok(registry.get(row.id).supported);assert.ok(STANDARD176_DECKS[0].cards.some(x=>x.id===row.id));}
 assert.deepEqual(e.validateDeck(STANDARD176_DECKS[0]),[]);assert.equal(registry.coverage(STANDARD176_DECKS[0]).unsupported,0);
});
for(const row of m.cards){test(row.name+': survives through attack declaration, breaks shields then destroys itself once',()=>{
 let s=setup();give(s,0,'battle',[row.id]);const x=s.players[0].battle[0],ids=physical(s);attack(s);assert.equal(s.decision.type,'block');assert.ok(s.players[0].battle.some(y=>y.uid===x.uid));assert.equal(s.players[1].shields.length,5);s=JSON.parse(JSON.stringify(s));act(s,'noBlock');drain(s);assert.ok(s.players[0].grave.some(y=>y.uid===x.uid));assert.equal(s.players[0].battle.length,0);assert.equal(s.players[1].shields.length,5-(row.spec.breaker||1));assert.equal(s.players[0].grave.filter(y=>y.uid===x.uid).length,1);assert.deepEqual(physical(s),ids);
});test(row.name+': can block and survive the battle without triggering attack-only death',()=>{
 const s=setup();give(s,0,'battle',[N]);give(s,1,'battle',[row.id]);const b=s.players[1].battle[0];b.powerModifiers=[{amount:10000-e.power(b,false,s)}];const ids=physical(s);attack(s);act(s,'block',a=>a.uid===b.uid);drain(s);assert.ok(s.players[1].battle.some(y=>y.uid===b.uid));assert.equal(s.players[0].battle.length,0);assert.equal(s.players[1].shields.length,5);assert.deepEqual(physical(s),ids);
});}
test('classifier keeps old definitions stable and rejects block-only, optional and extra clauses',()=>{
 const original=details.cards.find(x=>x.id===D);assert.throws(()=>standardCardSpec(original,{phase:175}));for(const text of['このクリーチャーがブロックした時、その攻撃の後、このクリーチャーを破壊する。','このクリーチャーが攻撃する時、攻撃の後、このクリーチャーを破壊してもよい。','このクリーチャーが攻撃する時、攻撃の後、このクリーチャーを破壊する。その後、カードを１枚引く。']){let d=structuredClone(original);d.faces[0].abilityText=text;assert.throws(()=>standardCardSpec(d,{phase:176}));}
 for(const phase of[168,169,170,171,172,173,174,175])for(const row of JSON.parse(fs.readFileSync(new URL('../tools/support-phase-'+phase+'.json',import.meta.url))).cards)assert.deepEqual(standardCardSpec(details.cards.find(c=>c.id===row.id),{phase}),row.spec);
});
test('all new creatures can be summoned and only the speed attacker may attack immediately',()=>{
 for(const row of m.cards){const s=setup();give(s,0,'hand',[row.id]);act(s,'play',a=>a.cardId===row.id&&!a.alternative);drain(s);const x=s.players[0].battle[0];assert.ok(x);s.phase='attack';assert.equal(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid),!!row.spec.speedAttacker);if(!row.spec.speedAttacker){end(s);end(s);attack(s,x.uid);act(s,'noBlock');drain(s);assert.ok(s.players[0].grave.some(y=>y.uid===x.uid));}}
});
test('winning an attack battle destroys the opponent first and only then the attacker',()=>{
 const s=setup();give(s,0,'battle',[K]);give(s,1,'battle',[N]);const x=s.players[0].battle[0],target=s.players[1].battle[0];target.tapped=true;attack(s,x.uid,target.uid);drain(s);assert.ok(s.players[0].grave.some(y=>y.uid===x.uid));assert.ok(s.players[1].grave.some(y=>y.uid===target.uid));assert.equal(s.players[1].shields.length,5);
});
test('an attacker dying in battle is not destroyed twice and a protected attacker remains',()=>{
 for(const protectedBody of[false,true]){const s=setup();give(s,0,'battle',[D]);give(s,1,'battle',['dm01-076']);const x=s.players[0].battle[0],b=s.players[1].battle[0];if(protectedBody){x.g26Stay=true;x.powerModifiers=[{amount:10000-e.power(x,false,s)}];}else b.powerModifiers=[{amount:20000-e.power(b,false,s)}];const ids=physical(s);attack(s);act(s,'block');drain(s);assert.equal(s.players[0].grave.filter(y=>y.uid===x.uid).length,protectedBody?0:1);assert.equal(s.players[0].battle.some(y=>y.uid===x.uid),protectedBody);assert.deepEqual(physical(s),ids);}
});
test('ignored abilities and GG suppress the attack trigger, but later suppression cannot cancel a resolved delay',()=>{
 for(const mode of['genmu','ignored','gg']){const s=setup();give(s,0,'battle',[D]);const x=s.players[0].battle[0];if(mode==='ignored')x.g35Ignored=s.turn;else give(s,1,'battle',[mode==='genmu'?GEN:GG]);if(mode==='gg')s.players[1].battle[0].under=[inst(N)];attack(s);act(s,'noBlock');drain(s);assert.ok(s.players[0].battle.some(y=>y.uid===x.uid),mode);}
 const t=setup();give(t,0,'battle',[D]);const x=t.players[0].battle[0];attack(t);give(t,1,'battle',[GEN]);act(t,'noBlock');drain(t);assert.ok(t.players[0].grave.some(y=>y.uid===x.uid));
});
test('shield-trigger bounce resolves before destruction and returning the same physical card does not inherit the old delay',()=>{
 const s=setup();give(s,0,'battle',[D]);give(s,1,'shields',[BO]);const x=s.players[0].battle[0],ids=physical(s);attack(s);act(s,'noBlock');assert.ok(s.players[0].battle.some(y=>y.uid===x.uid));act(s,'useTrigger');assert.ok(s.players[0].battle.some(y=>y.uid===x.uid));act(s,'effect',a=>a.targets.some(t=>t.uid===x.uid));drain(s);assert.ok(s.players[0].hand.some(y=>y.uid===x.uid));assert.ok(!s.players[0].grave.some(y=>y.uid===x.uid));s.phase='main';act(s,'play',a=>a.uid===x.uid);drain(s);end(s);assert.ok(s.players[0].battle.some(y=>y.uid===x.uid));assert.deepEqual(physical(s),ids);
});
test('Duglas is usable as a shield trigger and does not self-destruct when it only enters and blocks',()=>{
 const s=setup();give(s,0,'battle',[N]);give(s,1,'shields',[D]);attack(s);act(s,'noBlock');act(s,'useTrigger');drain(s);assert.equal(s.players[1].battle[0].cardId,D);const x=s.players[1].battle[0];x.powerModifiers=[{amount:10000-e.power(x,false,s)}];give(s,0,'battle',[N]);attack(s);act(s,'block',a=>a.uid===x.uid);drain(s);assert.ok(s.players[1].battle.some(y=>y.uid===x.uid));
});
test('CPU completes three saved games while conserving eighty physical cards',()=>{
 for(let i=0;i<3;i++){let s=e.createGame([STANDARD176_DECKS[0],PRESETS[i]],{seed:17601+i,first:i%2}),saved=false;const ids=physical(s);while(s.winner===null&&s.actions<1800&&s.turn<160){e.step(s,e.chooseAI(s));assert.deepEqual(physical(s),ids);if(!saved&&s.actions>20){s=JSON.parse(JSON.stringify(s));saved=true;}}assert.ok(saved);assert.notEqual(s.winner,null);assert.equal(ids.length,80);}
});
