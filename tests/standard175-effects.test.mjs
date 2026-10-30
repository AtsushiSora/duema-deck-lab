import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain,GEN,PRESETS} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {STANDARD175_DECKS} from '../tools/fixtures/standard175.mjs';
const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-175.json',import.meta.url)));
const N='dm01-108',F='dm01-097',BAD='promoy16-024';
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function play(s,id,discounted=false){const x=inst(id);s.players[s.active].hand.push(x);act(s,'play',a=>a.uid===x.uid&&(discounted?a.alternative==='bad':!a.alternative));drain(s);return x;}
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}
test('five complete definitions have official art, limits and a legal forty-card CPU fixture',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);assert.equal(m.cards.length,5);
 for(const row of m.cards){assert.deepEqual(row.faces,details.cards.find(x=>x.id===row.id).faces);assert.deepEqual(row.spec,standardCardSpec(details.cards.find(x=>x.id===row.id),{phase:175}));assert.equal(e.card(row.id).supportBatch,'phase-175');assert.ok(row.verification.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(e.card(row.id).limit,m.regulationVerification.limits[row.id]);assert.equal(CARD_IMAGES[row.id],row.image);assert.ok(registry.get(row.id).supported);assert.ok(STANDARD175_DECKS[0].cards.some(x=>x.id===row.id));}
 assert.deepEqual(e.validateDeck(STANDARD175_DECKS[0]),[]);assert.equal(registry.coverage(STANDARD175_DECKS[0]).unsupported,0);
});
for(const row of m.cards)for(const discounted of[false,true])test(row.name+': '+(discounted?'discounted':'normal')+' summon uses exact cost and destruction obligation',()=>{
 let s=setup();const before=physical(s),x=play(s,row.id,discounted);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,e.card(row.id).cost-(discounted?2:0));assert.ok(s.players[0].battle.some(y=>y.uid===x.uid));assert.equal(s.g29Delays?.length||0,discounted?1:0);const ids=physical(s);assert.equal(ids.length,before.length+1);s=JSON.parse(JSON.stringify(s));end(s);assert.equal(s.players[0].grave.some(y=>y.uid===x.uid),discounted);assert.equal(s.players[0].battle.some(y=>y.uid===x.uid),!discounted);assert.deepEqual(physical(s),ids);
});
test('classifier rejects mismatched discount, unknown clauses and preserves earlier manifests',()=>{
 for(const row of m.cards){let d=structuredClone(details.cards.find(x=>x.id===row.id));assert.throws(()=>standardCardSpec(d,{phase:174}));d.faces[0].abilityText+='\n未知の能力';assert.throws(()=>standardCardSpec(d,{phase:175}));d=structuredClone(details.cards.find(x=>x.id===row.id));d.faces[0].abilityText=d.faces[0].abilityText.replace('コストを２少なく','コストを３少なく');assert.throws(()=>standardCardSpec(d,{phase:175}));}
 for(const phase of[168,169,170,171,172,173,174])for(const row of JSON.parse(fs.readFileSync(new URL('../tools/support-phase-'+phase+'.json',import.meta.url))).cards)assert.deepEqual(standardCardSpec(details.cards.find(c=>c.id===row.id),{phase}),row.spec);
});
test('selected mana pays the two-mana reduction and cancellation does not leave a delayed destruction',()=>{
 const s=setup();give(s,0,'hand',[BAD]);const cost=e.card(BAD).cost-2;give(s,0,'mana',Array(cost).fill(F));let a=e.getLegalActions(s).find(a=>a.alternative==='bad');assert.equal(a.cost,cost);assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&!a.alternative));e.step(s,a,{manualMana:true});assert.equal(s.decision.type,'manaPayment');assert.equal(s.decision.cost,cost);assert.equal(s.g29Delays?.length||0,0);for(const x of s.players[0].mana)act(s,'selectMana',a=>a.uid===x.uid);act(s,'confirmMana');drain(s);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,cost);assert.equal(s.g29Delays.length,1);
 const t=setup();give(t,0,'hand',[BAD]);const uid=t.players[0].hand[0].uid;e.step(t,e.getLegalActions(t).find(a=>a.alternative==='bad'),{manualMana:true});act(t,'cancelMana');assert.equal(t.decision,null);assert.equal(t.g29Delays?.length||0,0);assert.ok(t.players[0].hand.some(x=>x.uid===uid));assert.equal(t.players[0].mana.filter(x=>x.tapped).length,0);
});
test('cost reduction bans disable BAD without hiding ordinary summons and non-hand cards do not offer BAD',()=>{
 const s=setup();give(s,0,'hand',[BAD]);give(s,1,'battle',['dmrp22-027']);assert.ok(!e.getLegalActions(s).some(a=>a.alternative==='bad'));assert.ok(e.getLegalActions(s).some(a=>a.kind==='play'&&!a.alternative));give(s,1,'battle',[]);give(s,0,'hand',[]);give(s,0,'grave',[BAD]);assert.ok(!e.getLegalActions(s).some(a=>a.alternative==='bad'));
});
test('discounted summon may attack immediately and battle-only power remains separate from normal power',()=>{
 const s=setup(),x=play(s,'dmrp03-081',true);const base=e.power(x,false,s);give(s,1,'battle',[N]);s.players[1].battle[0].powerModifiers=[{amount:5000-e.power(s.players[1].battle[0],false,s)}];s.players[1].battle[0].tapped=true;s.phase='attack';const target=s.players[1].battle[0].uid;act(s,'attack',a=>a.uid===x.uid&&a.target===target);drain(s);assert.ok(s.players[0].battle.some(y=>y.uid===x.uid));assert.ok(s.players[1].grave.some(y=>y.uid===target));assert.equal(e.power(x,false,s),base);
});
test('entry removal targets a blocker or a 6000-or-less creature with normal and reduced summons',()=>{
 for(const discounted of[false,true])for(const id of['dmrp02-024','dmsd03-001']){const s=setup();give(s,1,'battle',['dm01-076',N]);const targets=s.players[1].battle;assert.equal(e.card(targets[0]).blocker,true);play(s,id,discounted);assert.equal(s.players[1].battle.length,1);assert.equal(s.players[1].grave.length,1);}
});
test('delayed BAD destruction follows evolution and still happens if Genmu enters later',()=>{
 for(const mode of['evolution','genmu']){const s=setup(),x=play(s,BAD,true);if(mode==='evolution'){give(s,0,'hand',['dmr17-l02']);act(s,'play',a=>a.cardId==='dmr17-l02'&&!a.alternative);act(s,'evolve',a=>a.baseUid===x.uid);drain(s);}else give(s,1,'battle',[GEN]);const ids=physical(s);end(s);assert.ok(s.players[0].grave.some(y=>y.uid===x.uid));assert.ok(!s.players[0].battle.length);assert.deepEqual(physical(s),ids);}
});
test('early bounce and resummon do not carry the old destruction and prevention respects the attempted destruction',()=>{
 const s=setup(),x=play(s,BAD,true);s.active=1;play(s,'dm01-086');s.active=0;s.phase='main';act(s,'play',a=>a.uid===x.uid&&!a.alternative);drain(s);end(s);assert.ok(s.players[0].battle.some(y=>y.uid===x.uid));
 const t=setup(),y=play(t,BAD,true);y.g26Stay=true;end(t);assert.ok(t.players[0].battle.some(x=>x.uid===y.uid));assert.equal(t.g29Delays.length,0);
});
test('existing BAD alternatives do not duplicate and the old BAD3 remains three mana cheaper',()=>{
 const s=setup();for(const id of data.cards.filter(x=>x.bad&&!x.g175Bad).map(x=>x.id)){give(s,0,'hand',[id]);const choices=e.getLegalActions(s).filter(a=>a.kind==='play'&&a.alternative);assert.ok(choices.filter(a=>a.alternative==='bad').length<=1);if(e.card(id).bad===3){const a=choices.find(a=>a.alternative==='bad');assert.ok(a);assert.equal(a.cost,Math.max(1,e.card(id).cost-3));}}
});
test('CPU completes three saved games while conserving eighty physical cards',()=>{
 for(let i=0;i<3;i++){let s=e.createGame([STANDARD175_DECKS[0],PRESETS[i]],{seed:17501+i,first:i%2}),saved=false;const ids=physical(s);while(s.winner===null&&s.actions<1800&&s.turn<160){e.step(s,e.chooseAI(s));assert.deepEqual(physical(s),ids);if(!saved&&s.actions>20){s=JSON.parse(JSON.stringify(s));saved=true;}}assert.ok(saved);assert.notEqual(s.winner,null);assert.equal(ids.length,80);}
});
