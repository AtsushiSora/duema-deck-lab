import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain,GG,PRESETS} from './target-fixture.mjs';import {standardCardSpec} from '../tools/standard-card-spec.mjs';import {createCatalogue} from '../dist/catalogue.js';import {CARD_IMAGES} from '../dist/card-images.js';import {STANDARD191_DECKS} from '../tools/fixtures/standard191.mjs';
const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-191.json',import.meta.url))),N='dm01-108',F='dm01-097',BIG='dmx22b-012',BLOCK='dm01-076',DE='dm01-027',BO='dm01-086',TITAN='dm28-s04',MUSHA='dmx21-008',NIDO='dmr08-017',BLUE='dm34+1s-001',HUNT='dmx04-002',NEKO='dmr19-058',BROS='dmrp05-058',ENERGY='dm24rp4-074',EMO='dmex12-s04',STAR='dmsd21-012';
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function pick(s,v){act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===v);}
function play(s,id){const x=inst(id);s.players[s.active].hand.push(x);act(s,'play',a=>a.uid===x.uid&&!a.alternative);return x.uid;}
function attack(s,uid=s.players[s.active].battle[0].uid,target='player'){s.phase='attack';act(s,'attack',a=>a.uid===uid&&a.target===target);}
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}
function firstPayment(s,uid){give(s,0,'hand',[ENERGY]);act(s,'play',a=>a.alternative==='hyperEnergy');pick(s,uid);pick(s,false);drain(s);}
function order(s,op){act(s,'orderEffect',a=>s.pendingEffects.find(x=>x.effectId===a.effectId)?.task?.defs?.[0]?.op===op);}
test('five complete official definitions, images and limits are covered by a legal forty-card deck',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);assert.equal(m.cards.length,5);for(const row of m.cards){assert.deepEqual(row.faces,details.cards.find(x=>x.id===row.id).faces);assert.deepEqual(row.spec,standardCardSpec(details.cards.find(x=>x.id===row.id),{phase:191}));assert.equal(e.card(row.id).supportBatch,'phase-191');assert.ok(row.verification.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(CARD_IMAGES[row.id],row.image);assert.equal(e.card(row.id).limit,m.regulationVerification.limits[row.id]);assert.ok(registry.get(row.id).supported);assert.ok(STANDARD191_DECKS[0].cards.some(x=>x.id===row.id));}assert.deepEqual(e.validateDeck(STANDARD191_DECKS[0]),[]);assert.equal(STANDARD191_DECKS[0].cards.reduce((n,x)=>n+x.count,0),40);assert.equal(registry.coverage(STANDARD191_DECKS[0]).unsupported,0);
});
for(const row of m.cards)test(row.name+': first attack untaps, second attack stays tapped and every physical identity is conserved',()=>{
 const s=setup();give(s,0,'battle',[row.id]);const uid=s.players[0].battle[0].uid,ids=physical(s);attack(s,uid);drain(s);assert.equal(s.players[0].battle[0].tapped,false);assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===uid));attack(s,uid);drain(s);assert.equal(s.players[0].battle[0].tapped,true);assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===uid));assert.deepEqual(physical(s),ids);assert.equal(s.winner,null);
});
test('classifier rejects unknown timing, optional text and duplicate abilities and preserves all previous phases',()=>{
 for(const row of m.cards){const d=structuredClone(details.cards.find(x=>x.id===row.id));assert.throws(()=>standardCardSpec(d,{phase:190}));d.faces[0].abilityText+='\n未知の能力';assert.throws(()=>standardCardSpec(d,{phase:191}));}const d=structuredClone(details.cards.find(x=>x.id===TITAN));for(const text of['各ターン、このクリーチャーがはじめてタップした時、アンタップしてもよい。','自分のターン、このクリーチャーがはじめてタップした時、アンタップする。','各ターン、このクリーチャーがはじめてタップした時、アンタップする。\n各ターン、このクリーチャーがはじめてタップした時、アンタップする。']){d.faces[0].abilityText=text;assert.throws(()=>standardCardSpec(d,{phase:191}));}for(let phase=168;phase<=190;phase++)for(const row of JSON.parse(fs.readFileSync(new URL('../tools/support-phase-'+phase+'.json',import.meta.url))).cards)assert.deepEqual(standardCardSpec(details.cards.find(x=>x.id===row.id),{phase}),row.spec);
});
test('normal summons remain sick even after a first Hyper Energy payment untaps them',()=>{
 for(const id of m.cards.map(x=>x.id)){const s=setup(),uid=play(s,id);drain(s);s.phase='main';firstPayment(s,uid);assert.equal(s.players[0].battle.find(x=>x.uid===uid).tapped,false);s.phase='attack';assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===uid));}
});
test('a blocker may block twice in the opponent turn, but cannot block a third time',()=>{
 const s=setup();give(s,0,'battle',[TITAN]);give(s,1,'battle',[N,F,N]);s.active=1;const uid=s.players[0].battle[0].uid,ids=physical(s);for(let i=0;i<2;i++){attack(s,s.players[1].battle[0].uid);act(s,'block',a=>a.uid===uid);drain(s);assert.equal(s.players[0].battle[0].tapped,i===1);assert.deepEqual(physical(s),ids);}attack(s,s.players[1].battle[0].uid);assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===uid));act(s,'noBlock');drain(s);assert.equal(s.players[0].shields.length,4);
});
test('Guardman untaps after the first redirect, then stays tapped after its second redirect',()=>{
 const s=setup();give(s,0,'battle',[NIDO,N]);give(s,1,'battle',[F,F]);const uid=s.players[0].battle[0].uid,target=s.players[0].battle[1].uid;s.players[0].battle[1].tapped=true;s.active=1;for(let i=0;i<2;i++){attack(s,s.players[1].battle[0].uid,target);act(s,'guardman',a=>a.uid===uid);drain(s);assert.equal(s.players[0].battle[0].tapped,i===1);assert.ok(s.players[0].battle.some(x=>x.uid===target));}assert.equal(s.players[1].battle.length,0);
});
test('enemy tap effects count and repeated tap attempts cannot reset or retrigger the first-tap ability',()=>{
 const s=setup();give(s,0,'battle',[TITAN]);const uid=s.players[0].battle[0].uid;s.active=1;play(s,NEKO);pick(s,uid);drain(s);assert.equal(s.players[0].battle[0].tapped,false);play(s,NEKO);pick(s,uid);drain(s);assert.equal(s.players[0].battle[0].tapped,true);play(s,NEKO);assert.equal(s.decision,null);assert.equal(s.players[0].battle[0].tapped,true);
});
test('each player turn resets eligibility, even when the next turn belongs to the opponent',()=>{
 const s=setup();give(s,0,'battle',[TITAN]);const uid=s.players[0].battle[0].uid;attack(s);drain(s);attack(s);drain(s);assert.equal(s.players[0].battle[0].tapped,true);end(s);assert.equal(s.active,1);assert.equal(s.players[0].battle[0].tapped,true);act(s,'skipCharge');play(s,BROS);pick(s,uid);drain(s);give(s,1,'battle',[N,F]);attack(s);act(s,'block',a=>a.uid===uid);drain(s);assert.equal(s.players[0].battle[0].tapped,false);attack(s);act(s,'block',a=>a.uid===uid);drain(s);assert.equal(s.players[0].battle[0].tapped,true);
});
test('cannot-untap effects prevent the first untap and still consume the first occurrence',()=>{
 const s=setup();give(s,0,'battle',[TITAN]);const x=s.players[0].battle[0];x.tapLocks=[{who:1,afterTurns:999}];firstPayment(s,x.uid);assert.equal(x.tapped,true);x.tapLocks=[];play(s,BROS);pick(s,x.uid);drain(s);attack(s,x.uid);drain(s);assert.equal(x.tapped,true);
});
test('an ignored first tap still counts after Emotional leaves and the creature is manually untapped',()=>{
 const s=setup();give(s,0,'battle',[MUSHA]);give(s,1,'battle',[EMO]);s.players[1].battle[0].g34ChosenName=e.card(MUSHA).name;const x=s.players[0].battle[0];assert.equal(e.effectiveCard(x,s).g191FirstTapUntap,undefined);firstPayment(s,x.uid);assert.equal(x.tapped,true);play(s,DE);act(s,'effect',a=>a.targets.some(y=>y.uid===s.players[1].battle[0].uid));drain(s);assert.equal(e.effectiveCard(x,s).g191FirstTapUntap,true);play(s,BROS);pick(s,x.uid);drain(s);attack(s,x.uid);drain(s);assert.equal(x.tapped,true);
});
test('entering tapped does not consume the first actual tap, while GG does not suppress a tap trigger',()=>{
 const s=setup();give(s,1,'battle',['dmr02-s03']);const uid=play(s,TITAN);assert.equal(s.players[0].battle[0].tapped,true);assert.equal(s.decision,null);play(s,BROS);pick(s,uid);drain(s);firstPayment(s,uid);assert.equal(s.players[0].battle.find(x=>x.uid===uid).tapped,false);
 const t=setup();give(t,0,'battle',[TITAN]);give(t,1,'battle',[GG]);t.players[1].battle[0].under=[inst(N)];attack(t);drain(t);assert.equal(t.players[0].battle[0].tapped,false);
});
test('incarnation tracking gives a bounced and resummoned creature a fresh first tap',()=>{
 const s=setup();give(s,0,'battle',[TITAN]);const uid=s.players[0].battle[0].uid;firstPayment(s,uid);play(s,BO);act(s,'effect',a=>a.targets.some(x=>x.uid===uid));drain(s);act(s,'play',a=>a.uid===uid);drain(s);firstPayment(s,uid);assert.equal(s.players[0].battle.find(x=>x.uid===uid).tapped,false);
});
test('evolution and devolution retain the first-tap history of the same creature',()=>{
 const s=setup();give(s,0,'battle',[MUSHA]);const uid=s.players[0].battle[0].uid;firstPayment(s,uid);give(s,0,'hand',[STAR]);act(s,'play');act(s,'evolve',a=>a.baseUid===uid);drain(s);const top=s.players[0].battle.find(x=>x.under?.some(y=>y.uid===uid));assert.ok(top);play(s,BO);act(s,'effect',a=>a.targets.some(x=>x.uid===top.uid));if(s.decision?.type==='leaveReplace')act(s,'replaceStar');drain(s);assert.ok(s.players[0].battle.some(x=>x.uid===uid));firstPayment(s,uid);assert.equal(s.players[0].battle.find(x=>x.uid===uid).tapped,true);
});
test('Musha attack destruction and first untap can be ordered either way and resume after save',()=>{
 for(const first of ['Untap','Target']){let s=setup();give(s,0,'battle',[MUSHA]);give(s,1,'battle',[N,N]);const x=s.players[0].battle[0],uid=x.uid,target=s.players[1].battle[0].uid;attack(s);assert.equal(s.decision.type,'effectOrder');const ids=physical(s);s=JSON.parse(JSON.stringify(s));order(s,first);if(s.decision?.type==='extended')pick(s,target);drain(s);assert.equal(s.players[0].battle.find(x=>x.uid===uid).tapped,false);assert.ok(s.players[1].grave.some(x=>x.uid===target));assert.deepEqual(physical(s),ids);}
});
test('Hunting changes battle power and Blue remains unblockable while retaining the tap ability',()=>{
 const s=setup();give(s,0,'battle',[HUNT,HUNT,HUNT]);give(s,1,'battle',[N]);const target=s.players[1].battle[0];target.tapped=true;target.powerModifiers=[{amount:7000}];attack(s,undefined,target.uid);act(s,'noBlock');drain(s);assert.ok(s.players[1].grave.some(x=>x.uid===target.uid));assert.equal(s.players[0].battle.length,3);assert.equal(s.players[0].battle[0].tapped,false);
 const t=setup();give(t,0,'battle',[BLUE]);give(t,1,'battle',[BLOCK]);attack(t);assert.ok(!e.getLegalActions(t).some(a=>a.kind==='block'));act(t,'noBlock');drain(t);assert.equal(t.players[0].battle[0].tapped,false);assert.equal(t.players[1].shields.length,4);
});
test('CPU deck finishes with eighty conserved identities and a saved continuation',()=>{
 let s=e.createGame([STANDARD191_DECKS[0],PRESETS[0]],{seed:19101,first:0}),saved=false;const ids=physical(s);while(s.winner===null&&s.actions<1800&&s.turn<160){e.step(s,e.chooseAI(s));assert.deepEqual(physical(s),ids);if(!saved&&s.actions>20){s=JSON.parse(JSON.stringify(s));saved=true;}}assert.ok(saved);assert.notEqual(s.winner,null);assert.equal(ids.length,80);
});
