import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain,GEN,GG,PRESETS} from './target-fixture.mjs';import {standardCardSpec} from '../tools/standard-card-spec.mjs';import {createCatalogue} from '../dist/catalogue.js';import {CARD_IMAGES} from '../dist/card-images.js';import {STANDARD186_DECKS} from '../tools/fixtures/standard186.mjs';
const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-186.json',import.meta.url))),N='dm01-108',F='dm01-097',L='dm01-075',DE='dm01-027',BO='dm01-086',DF='dmrp13-090',TWIN='dmbd17-007',ZERO='dmrp07-001',EVO='dmr12-s02',JOKER='dmrp07-079',HUNTER='dmd05-003',ZOMBIE='dm36-087',ABYSS='dm24rp3-020',ZAL='dm23bd5-005',SEO='dmr23-033',SPELLBEE='dmr16g-008',HIHA='dmr01-027',USU='dmr08-028',GIGA='sp-033',SCREAM='dmex16-037',ZEKKO='dmr07-047',DAM='dmrp19-079',CHU='dmr13-091',DYU='dmrp21-017',FENCE='dm24rp2-017',FORK='dm22sd1-010',KIRI='dmrp04s-077',ASHU='dmrp19-046',GANAL='dmx10-009',DARS='dmd22-003';
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function pick(s,v){act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===v);}
function play(s,id){s.players[s.active].hand.push(inst(id));const uid=s.players[s.active].hand.at(-1).uid;act(s,'play',a=>a.uid===uid&&!a.alternative);if(s.decision?.type==='evolution')act(s,'evolve',a=>!!a.baseUid);return uid;}
function kill(s,p,uid){s.active=1-p;s.phase='main';play(s,DE);act(s,'effect',a=>a.targets.some(x=>x.uid===uid));}
function end(s){s.phase='attack';act(s,'endTurn');}
const graves=[N,F,DE,TWIN,DF,ZERO,EVO,JOKER,HUNTER,ZOMBIE,ABYSS];
test('eighteen complete verified definitions and images are covered by two legal forty-card decks',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);assert.equal(m.cards.length,18);for(const row of m.cards){assert.deepEqual(row.faces,details.cards.find(x=>x.id===row.id).faces);assert.deepEqual(row.spec,standardCardSpec(details.cards.find(x=>x.id===row.id),{phase:186}));assert.equal(e.card(row.id).supportBatch,'phase-186');assert.ok(row.verification.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(e.card(row.id).limit,m.regulationVerification.limits[row.id]);assert.equal(CARD_IMAGES[row.id],row.image);assert.ok(registry.get(row.id).supported);assert.ok(STANDARD186_DECKS.some(d=>d.cards.some(x=>x.id===row.id)));}for(const d of STANDARD186_DECKS){assert.deepEqual(e.validateDeck(d),[]);assert.equal(d.cards.reduce((n,x)=>n+x.count,0),40);assert.equal(registry.coverage(d).unsupported,0);}
});
for(const row of m.cards)test(row.name+': complete effect execution, including attacks or death, preserves physical identities',()=>{
 let s=setup();give(s,0,'grave',graves);give(s,0,'hand',[F]);give(s,0,'deck',Array(24).fill(N));give(s,1,'battle',[N]);if(row.spec.evolution)give(s,0,'battle',[HUNTER]);const uid=play(s,row.id),ids=physical(s);drain(s);assert.deepEqual(physical(s),ids);if(row.spec.g34Attack){s.players[0].battle.find(x=>x.uid===uid).entered=0;s.phase='attack';act(s,'attack',a=>a.uid===uid&&a.target==='player');drain(s);assert.deepEqual(physical(s),ids);}if(row.spec.g172Death){kill(s,0,uid);drain(s);assert.equal(physical(s).length,ids.length+1);}assert.equal(s.winner,null);assert.equal(s.decision,null);
});
test('grammar rejects unsupported races and conditions, preserves the other restriction and keeps previous manifests pinned',()=>{
 for(const row of m.cards){const d=structuredClone(details.cards.find(x=>x.id===row.id));assert.throws(()=>standardCardSpec(d,{phase:185}));d.faces[0].abilityText+='\n未知の能力';assert.throws(()=>standardCardSpec(d,{phase:186}));}
 const d=structuredClone(details.cards.find(x=>x.id===DAM));for(const text of['ジョーカーズ・クリーチャーを１体、自分の墓地から手札に戻してもよい。そうしたらカードを２枚引く。','未知の種族を１体、自分の墓地から手札に戻す。']){d.faces[0].abilityText=text;assert.throws(()=>standardCardSpec(d,{phase:186}));}
 for(let phase=168;phase<=185;phase++)for(const row of JSON.parse(fs.readFileSync(new URL('../tools/support-phase-'+phase+'.json',import.meta.url))).cards)assert.deepEqual(standardCardSpec(details.cards.find(x=>x.id===row.id),{phase}),row.spec);
});
test('Scream mills before its mandatory dark-card recovery, accepts a dark spell face and cannot recover the resolving spell',()=>{
 const s=setup();give(s,0,'grave',[N]);give(s,0,'deck',[TWIN,F,N,F,...Array(8).fill(N)]);const top=s.players[0].deck[0].uid,uid=play(s,SCREAM);assert.equal(s.players[0].deck.length,8);assert.ok(s.decision.choices.some(c=>c.value?.uid===top));assert.ok(!s.decision.choices.some(c=>c.cardId===N));assert.ok(!s.decision.choices.some(c=>c.value?.uid===uid));assert.ok(!s.decision.choices.some(c=>c.value===null));pick(s,top);drain(s);assert.ok(s.players[0].hand.some(x=>x.uid===top));assert.ok(s.players[0].mana.some(x=>x.uid===uid));
});
test('mandatory all-color recovery requires both colors on the creature and cannot select a partial subset',()=>{
 const s=setup();give(s,0,'grave',[DF,F,DE,'dm25ex2-077',DF]);give(s,0,'deck',Array(12).fill(N));const both=s.players[0].grave.filter(x=>x.cardId===DF).map(x=>x.uid);play(s,SEO);assert.ok(!s.decision.choices.some(c=>c.value===null));assert.deepEqual(s.decision.choices.map(c=>c.value.uid).sort(),[...both].sort());pick(s,both[1]);assert.equal(s.players[0].hand.length,0);pick(s,both[0]);drain(s);assert.equal(s.players[0].hand.length,2);assert.ok(s.players[0].grave.some(x=>x.cardId==='dm25ex2-077'));
});
test('Usuwarai chooses at most two colorless creatures, never a colored creature or colorless spell',()=>{
 for(const n of[0,1,2]){let s=setup();give(s,0,'grave',[ZERO,N,ZERO]);const ids=s.players[0].grave.filter(x=>x.cardId===ZERO).map(x=>x.uid);play(s,USU);assert.equal(s.decision.choices.filter(x=>x.value).length,2);for(let i=0;i<n;i++){pick(s,ids[i]);if(i===0)s=JSON.parse(JSON.stringify(s));}if(n<2)pick(s,null);drain(s);assert.equal(s.players[0].hand.length,n);}
});
test('other-creature death recovery excludes the dying physical card but may recover another copy of the same name',()=>{
 for(const id of[HIHA,CHU,KIRI,'dmr11-029',ASHU]){const s=setup();give(s,0,'battle',[id]);give(s,0,'grave',[id,DE]);const other=s.players[0].grave[0].uid,source=s.players[0].battle[0].uid;kill(s,0,source);assert.ok(!s.decision.choices.some(c=>c.value?.uid===source));assert.ok(s.decision.choices.some(c=>c.value?.uid===other));pick(s,other);drain(s);assert.ok(s.players[0].grave.some(x=>x.uid===source));assert.ok(s.players[0].hand.some(x=>x.uid===other));}
 const t=setup();give(t,0,'battle',[KIRI]);kill(t,0,t.players[0].battle[0].uid);assert.equal(t.decision,null);assert.equal(t.players[0].hand.length,0);
});
test('specific race recovery permits the matching creature but excludes spells and other races',()=>{
 for(const[id,target]of[[DAM,JOKER],[ZEKKO,ZOMBIE]]){const s=setup();give(s,0,'grave',[target,DE,N]);if(id===DAM){give(s,0,'deck',Array(12).fill(F));play(s,id);}else{give(s,0,'battle',[id]);kill(s,0,s.players[0].battle[0].uid);}const uid=s.players[0].grave.find(x=>x.cardId===target).uid;assert.ok(s.decision.choices.some(c=>c.value?.uid===uid));assert.ok(!s.decision.choices.some(c=>c.cardId===DE||c.cardId===N));pick(s,uid);drain(s);assert.ok(s.players[0].hand.some(x=>x.uid===uid));}
});
test('Duzame mills four before selecting up to two evolution creatures, including just milled ones',()=>{
 let s=setup();give(s,0,'grave',[N]);give(s,0,'deck',[EVO,N,EVO,F,...Array(8).fill(N)]);const ids=s.players[0].deck.filter(x=>x.cardId===EVO).map(x=>x.uid);play(s,DYU);assert.equal(s.players[0].deck.length,8);assert.equal(s.decision.choices.filter(x=>x.value).length,2);pick(s,ids[1]);s=JSON.parse(JSON.stringify(s));pick(s,ids[0]);drain(s);assert.ok(ids.every(uid=>s.players[0].hand.some(x=>x.uid===uid)));assert.ok(s.players[0].battle.some(x=>x.cardId===DYU));
});
for(const id of[SPELLBEE,FORK,GANAL,DARS])test(e.card(id).name+': optional mill and subsequent recovery remain coupled, with lethal milling declined by CPU',()=>{
 for(const accept of[false,true]){const s=setup();give(s,0,'grave',[id===SPELLBEE?DE:id===FORK?ABYSS:N]);if(id===DARS)give(s,0,'battle',[HUNTER]);play(s,id);const n=s.decision.task.defs[0].n;pick(s,accept?true:null);if(accept){assert.equal(s.players[0].deck.length,30-n);drain(s);assert.equal(s.players[0].hand.length,1);}else{assert.equal(s.players[0].deck.length,30);assert.equal(s.players[0].hand.length,0);assert.equal(s.decision,null);}}
 const t=setup();if(id===DARS)give(t,0,'battle',[HUNTER]);give(t,0,'deck',[N,F]);play(t,id);assert.equal(t.decision.choices[e.chooseAI(t).choice].value,null);pick(t,null);assert.equal(t.winner,null);
});
test('milling the final card loses before recovery and is not a Shako draw',()=>{
 for(const shako of[false,true]){const s=setup();if(shako)give(s,0,'battle',['dmrp03-s03']);give(s,0,'deck',[DE,N,F]);play(s,SPELLBEE);pick(s,true);assert.equal(s.winner,1);assert.equal(s.players[0].deck.length,0);assert.equal(s.decision,null);assert.equal(s.players[0].hand.length,0);}
});
test('Fence can be summoned from grave, cannot recover itself on entry, and permits choosing any subset of all grave cards',()=>{
 for(const n of[0,2]){let s=setup();give(s,0,'grave',[FENCE,N,DE,F]);const uid=s.players[0].grave[0].uid,chosen=s.players[0].grave.slice(1,3).map(x=>x.uid);act(s,'play',a=>a.uid===uid&&a.origin==='grave');assert.ok(s.players[0].battle.some(x=>x.uid===uid));assert.ok(!s.decision.choices.some(c=>c.value?.uid===uid));assert.ok(!s.decision.title.includes('Infinity'));const ids=physical(s);for(const id of chosen.slice(0,n))pick(s,id);s=JSON.parse(JSON.stringify(s));pick(s,null);drain(s);assert.equal(s.players[0].hand.length,n);assert.deepEqual(physical(s),ids);}
});
test('Zalfer optional removal checks the cost limit; its end effect mills before mandatory any-card recovery',()=>{
 const s=setup();give(s,1,'battle',[N,'dmx22b-012']);const uid=play(s,ZAL);assert.ok(!s.decision.choices.some(c=>c.cardId==='dmx22b-012'));pick(s,null);give(s,0,'deck',[DE,...Array(12).fill(N)]);const top=s.players[0].deck[0].uid;end(s);assert.equal(s.decision.player,0);assert.ok(s.players[0].grave.some(x=>x.uid===top));pick(s,top);drain(s);assert.ok(s.players[0].hand.some(x=>x.uid===top));assert.ok(s.players[0].battle.some(x=>x.uid===uid));
});
test('Apul prevents grave retrieval, Genmu suppresses appropriate entries, and GG leaves death effects active',()=>{
 const s=setup();give(s,1,'battle',['dmrp22-042']);give(s,0,'grave',[N]);play(s,FENCE);assert.equal(s.players[0].grave.length,1);assert.equal(s.players[0].hand.length,0);assert.equal(s.decision,null);
 const t=setup();give(t,1,'battle',[GEN]);give(t,0,'grave',[ZERO]);play(t,USU);assert.equal(t.decision,null);assert.equal(t.players[0].hand.length,0);
 const u=setup();give(u,1,'battle',[GG]);u.players[1].battle[0].under=[inst(N)];give(u,0,'battle',[KIRI]);give(u,0,'grave',[N]);kill(u,0,u.players[0].battle[0].uid);assert.equal(u.decision.task.op,'g34_Select');drain(u);assert.equal(u.players[0].hand.length,1);
});
test('two CPU games preserve eighty cards and finish after saved continuation',()=>{
 for(let i=0;i<2;i++){let s=e.createGame([STANDARD186_DECKS[i],PRESETS[i]],{seed:18601+i,first:i%2}),saved=false;const ids=physical(s);while(s.winner===null&&s.actions<1800&&s.turn<160){e.step(s,e.chooseAI(s));assert.deepEqual(physical(s),ids);if(!saved&&s.actions>20){s=JSON.parse(JSON.stringify(s));saved=true;}}assert.ok(saved);assert.notEqual(s.winner,null);assert.equal(ids.length,80);}
});
