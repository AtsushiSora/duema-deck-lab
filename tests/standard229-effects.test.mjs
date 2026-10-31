import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,GEN,PRESETS} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {STANDARD229_DECK} from '../tools/fixtures/standard229.mjs';
import {manualScreenHTML,newManualUI} from '../dist/manual-ui.js';
const manifest=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-229.json',import.meta.url)));
const RAIN='dm06-045',RAINBOW='dmc27-022',N='dm01-108',LIGHT='dm01-015',DARK='dm01-027',WATER='dm01-086',DARKSPELL='dmbd17-007',DARKBODY='dm24bd4-007',LIGHTSPELL='dmex06-024',ZERO='dm24bd2-013',MULTI='dm25rp1-S07',NINJA='dm26rp1-S011';
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const cast=(s,id)=>{const x=inst(id);s.players[s.active].hand.push(x);act(s,'play',a=>a.uid===x.uid&&!a.alternative);return x;};
const confirm=s=>act(s,'extended',a=>s.decision.choices[a.choice].value===true);
const finish=s=>{for(let n=0;s.decision&&s.winner===null;n++){assert.ok(n<100);e.step(s,e.chooseAI(s));}};
const hand=[N,LIGHT,DARK,WATER,DARKSPELL,DARKBODY,LIGHTSPELL,ZERO,MULTI,NINJA,DARK];
const discardFor=id=>id===RAIN?[2,4,8,10]:[2,3,4,5,7,10];
test('official definitions, printed mana, art, restrictions and original fixture are verified',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);assert.equal(manifest.cards.length,2);
 for(const r of manifest.cards){assert.deepEqual(r.faces,details.cards.find(c=>c.id===r.id).faces);assert.deepEqual(r.spec,standardCardSpec(details.cards.find(c=>c.id===r.id),{phase:229}));assert.ok(r.verification.facesMatched);assert.match(r.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(CARD_IMAGES[r.id],r.image);assert.equal(e.card(r.id).manaValue,1);assert.equal(e.card(r.id).limit,manifest.regulationVerification.limits[r.id]);assert.ok(registry.get(r.id).supported);}
 assert.deepEqual(e.validateDeck(STANDARD229_DECK),[]);assert.equal(registry.coverage(STANDARD229_DECK).unsupported,0);assert.equal(STANDARD229_DECK.cards.reduce((n,r)=>n+r.count,0),40);
});
test('whole-clause recognition is phase gated and all previous pinned definitions are stable',()=>{
 for(const r of manifest.cards){const d=structuredClone(details.cards.find(c=>c.id===r.id));assert.throws(()=>standardCardSpec(d,{phase:228}));d.faces[0].abilityText+='\n未実装の能力';assert.throws(()=>standardCardSpec(d,{phase:229}));}
 for(let phase=168;phase<=228;phase++){if([202,213].includes(phase))continue;for(const r of JSON.parse(fs.readFileSync(new URL('../tools/support-phase-'+phase+'.json',import.meta.url))).cards)assert.deepEqual(standardCardSpec(details.cards.find(c=>c.id===r.id),{phase}),r.spec);}
});
for(const id of [RAIN,RAINBOW])for(const p of [0,1])test(e.card(id).name+' paid cast discards exactly the eligible physical cards for player '+p,()=>{
 let s=setup();s.active=p;give(s,1-p,'hand',hand);const original=s.players[1-p].hand.map(x=>x.uid),discard=discardFor(id).map(i=>original[i]);const before=physical(s),x=cast(s,id);
 assert.equal(s.players[p].mana.filter(x=>x.tapped).length,e.card(id).cost);assert.equal(s.decision.player,p);assert.deepEqual(s.decision.task.seen,hand);assert.deepEqual(s.decision.task.discardIds,discard);assert.deepEqual(s.players[1-p].hand.map(x=>x.uid),original);assert.equal(s.players[1-p].grave.length,0);
 s=JSON.parse(JSON.stringify(s));confirm(s);finish(s);assert.deepEqual(s.players[1-p].grave.map(x=>x.uid).sort(),discard.sort());assert.deepEqual(s.players[1-p].hand.map(x=>x.uid),original.filter(x=>!discard.includes(x)));assert.ok(s.players[p].grave.some(y=>y.uid===x.uid));assert.deepEqual(physical(s),[...before,x.uid].sort());assert.equal(s.winner,null);
});
test('dark creature / water spell and water creature / dark spell are distinguished by their spell faces',()=>{
 const s=setup();give(s,1,'hand',[DARKBODY,DARKSPELL]);const [kept,discarded]=s.players[1].hand.map(x=>x.uid);cast(s,RAIN);confirm(s);finish(s);assert.deepEqual(s.players[1].hand.map(x=>x.uid),[kept]);assert.deepEqual(s.players[1].grave.map(x=>x.uid),[discarded]);
});
test('light multicolor spells and light spell twins remain, colorless and non-light spell twins are discarded',()=>{
 const s=setup();give(s,1,'hand',[LIGHT,MULTI,LIGHTSPELL,ZERO,DARKBODY]);const [a,b,c,d,f]=s.players[1].hand.map(x=>x.uid);cast(s,RAINBOW);confirm(s);finish(s);assert.deepEqual(s.players[1].hand.map(x=>x.uid),[a,b,c]);assert.deepEqual(s.players[1].grave.map(x=>x.uid),[d,f]);
});
test('a light creature face does not protect its non-light spell face from Rainbow Arrow',()=>{
 const c=data.cards.find(c=>c.spellFace&&e.civilizations(c).includes('光')&&!e.civilizations(c.spellFace).includes('光'));assert.ok(c);const s=setup();give(s,1,'hand',[c.id]);const uid=s.players[1].hand[0].uid;cast(s,RAINBOW);confirm(s);finish(s);assert.ok(s.players[1].grave.some(x=>x.uid===uid));
});
for(const id of [RAIN,RAINBOW])test(e.card(id).name+' handles no hand and no eligible spells without altering other zones',()=>{
 for(const cards of [[],[N,LIGHT]]){const s=setup();give(s,1,'hand',cards);const before=physical(s),enemy=JSON.stringify(s.players[1]);const x=cast(s,id);if(cards.length){assert.equal(s.decision.task.discardIds.length,0);confirm(s);}else assert.equal(s.decision,null);finish(s);assert.equal(JSON.stringify(s.players[1]),enemy);assert.deepEqual(physical(s),[...before,x.uid].sort());}
});
test('inspection does not publish names of retained private cards or offer an illegal skip',()=>{
 const s=setup();give(s,1,'hand',[N,DARK]);cast(s,RAIN);assert.ok(s.log.filter(l=>l.type==='look').every(l=>!l.text.includes(e.card(N).name)&&!l.text.includes(e.card(DARK).name)));assert.ok(!s.log.some(l=>l.type==='reveal'));assert.equal(e.getLegalActions(s).length,1);assert.equal(s.decision.choices[0].value,true);
});
test('human inspection renders all cards, correct discard badges and details; CPU inspection stays hidden',()=>{
 for(const id of [RAIN,RAINBOW]){const s=setup();give(s,1,'hand',[LIGHT,DARK,ZERO]);cast(s,id);for(const mobile of [false,true]){const html=manualScreenHTML(s,{...newManualUI(),mobile,mobilePanel:'actions'},{art:id=>'<img data-test="'+id+'">',icon:()=>'',displayCard:x=>e.card(x)});assert.match(html,/確認した相手の手札/);assert.ok(html.includes('data-id="'+LIGHT+'"'));assert.match(html,/捨てさせるカード/);assert.match(html,/手札に残るカード/);}const t=setup();t.active=1;give(t,0,'hand',[DARK]);cast(t,id);const html=manualScreenHTML(t,newManualUI(),{art:()=>'',icon:()=>'',displayCard:x=>e.card(x)});assert.ok(!html.includes('hand-inspection'));}
});
test('spell suppression prevents looking and discarding; creature-only discard replacements are not eligible',()=>{
 for(const id of [RAIN,RAINBOW]){const s=setup();s.players[1].battle=[inst(GEN)];give(s,1,'hand',[DARK,NINJA]);cast(s,id);finish(s);assert.equal(s.decision,null);assert.equal(s.players[1].hand.length,2);assert.ok(!s.log.some(l=>['look','reveal'].includes(l.type)));const t=setup();give(t,1,'hand',[NINJA,DARK]);const uid=t.players[1].hand[0].uid;cast(t,id);confirm(t);finish(t);assert.equal(t.players[1].battle.length,0);assert.deepEqual(t.players[1].hand.map(x=>x.uid),[uid]);}
});
test('CPU before casting uses hand size without reading private cards, and completes known inspection',()=>{
 for(const id of [RAIN,RAINBOW]){const s=setup();give(s,0,'hand',[id]);give(s,1,'hand',[N,N]);const ranking=e.rankHeuristicActions(s),analysis=e.analyzeAI(s);s.players[1].hand.forEach(x=>x.cardId=DARK);s.players[1].deck.forEach(x=>x.cardId=GEN);assert.deepEqual(e.rankHeuristicActions(s),ranking);assert.deepEqual(e.analyzeAI(s),analysis);act(s,'play');const action=e.chooseAI(s);assert.ok(e.getLegalActions(s).some(a=>a.id===action.id));e.step(s,action);finish(s);assert.equal(s.players[1].hand.length,0);assert.equal(s.players[1].grave.length,2);}
});
for(const first of [0,1])test('CPU forty-card match completes with eighty identities and JSON continuation '+first,()=>{
 let s=e.createGame([STANDARD229_DECK,PRESETS[first]],{seed:22901+first,first}),saved=false;const before=physical(s);
 while(s.winner===null&&s.actions<2200&&s.turn<160){e.step(s,e.chooseAI(s));assert.deepEqual(physical(s),before);if(!saved&&s.actions>20){s=JSON.parse(JSON.stringify(s));saved=true;}}
 assert.ok(saved);assert.notEqual(s.winner,null);assert.equal(before.length,80);
});
