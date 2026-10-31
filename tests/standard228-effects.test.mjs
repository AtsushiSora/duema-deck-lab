import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,PRESETS,GEN} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {STANDARD228_DECK} from '../tools/fixtures/standard228.mjs';
const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-228.json',import.meta.url)));
const KING='dm03-024',MEET='dmr13-094',GEARREC='dm16-037',GAMIL='dm03-012',NOIR='dmr15-035',LAVUE='dm03-021';
const N='dm01-108',D='dm01-090',H='dm01-075',F='dm01-097',W='dm01-083',SEED='dmsd20-016',GEAR='dm28-033',LIGHTSPELL='dm01-015',LIGHTTWIN='dmex06-024',DARKSPELLTWIN='dmbd17-007',DARKCREATURETWIN='dm24bd4-007',SMALLLIGHTTWIN='dmrp05-011',BIGLIGHTTWIN='dm23ex2-016',APUL='dmrp22-042';
const put=(s,p,id)=>{const x=inst(id);s.players[p].battle.push(x);return x;};
const ids=s=>e.physicalCards(s).map(x=>x.uid).sort();
const finish=s=>{for(let i=0;s.decision&&s.decision.type!=='block'&&s.winner===null;i++){assert.ok(i<250);e.step(s,e.chooseAI(s));}};
function pick(s,v){act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===v);}
function play(s,id){const x=inst(id);s.players[s.active].hand.push(x);act(s,'play',a=>a.uid===x.uid&&!a.alternative);return x;}
function trigger(s,id){if(e.card(id).g34Attack){const x=put(s,s.active,id);s.phase='attack';act(s,'attack',a=>a.uid===x.uid&&a.target==='player');return x;}return play(s,id);}
const eligible=s=>s.decision?.choices?.filter(c=>c.cardId).map(c=>c.value?.uid??c.value)||[];

test('six complete official definitions, mana, images and an original forty-card fixture',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);assert.equal(m.cards.length,6);
 for(const r of m.cards){assert.deepEqual(r.faces,details.cards.find(c=>c.id===r.id).faces);assert.deepEqual(standardCardSpec(details.cards.find(c=>c.id===r.id),{phase:228}),r.spec);assert.ok(r.verification.facesMatched);assert.match(r.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(e.card(r.id).manaValue,1);assert.equal(e.card(r.id).limit,m.regulationVerification.limits[r.id]);assert.equal(CARD_IMAGES[r.id],r.image);assert.ok(registry.get(r.id).supported);}
 assert.deepEqual(e.validateDeck(STANDARD228_DECK),[]);assert.equal(registry.coverage(STANDARD228_DECK).unsupported,0);assert.equal(STANDARD228_DECK.cards.reduce((n,r)=>n+r.count,0),40);
});
test('new complete clauses reject unknown text and leave prior pinned specs unchanged',()=>{
 for(const r of m.cards){const d=structuredClone(details.cards.find(c=>c.id===r.id));assert.throws(()=>standardCardSpec(d,{phase:227}));d.faces[0].abilityText+='\n未確認の能力';assert.throws(()=>standardCardSpec(d,{phase:228}));}
 for(let phase=168;phase<=227;phase++){if([202,213].includes(phase))continue;for(const r of JSON.parse(fs.readFileSync(new URL('../tools/support-phase-'+phase+'.json',import.meta.url))).cards)assert.deepEqual(standardCardSpec(details.cards.find(c=>c.id===r.id),{phase}),r.spec);}
});
for(const r of m.cards)test(r.name+' paid execution and all subsequent choices preserve identities and JSON continuation',()=>{
 let s=setup();give(s,0,'grave',[D,DARKCREATURETWIN,GEAR,H,LIGHTSPELL,LIGHTTWIN]);give(s,0,'hand',[r.id]);const uid=s.players[0].hand[0].uid,before=ids(s);act(s,'play');assert.equal(s.players[0].mana.filter(x=>x.tapped).length,e.card(r.id).cost);finish(s);if(e.card(r.id).g34Attack){s.phase='attack';assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===uid),'freshly summoned creature is sick');s.turn+=2;act(s,'attack',a=>a.uid===uid&&a.target==='player');finish(s);}s=JSON.parse(JSON.stringify(s));assert.deepEqual(ids(s),before);assert.equal(new Set(before).size,before.length);assert.ok(e.getLegalActions(s).length);
});
test('Gamil and Encounter recover dark creature faces, not a dark spell on a non-dark body',()=>{
 for(const id of [GAMIL,MEET]){const s=setup();give(s,0,'grave',[D,DARKCREATURETWIN,DARKSPELLTWIN,H,GEAR,SEED]);const yes=s.players[0].grave.slice(0,2).map(x=>x.uid);trigger(s,id);assert.deepEqual(eligible(s),yes);pick(s,yes[0]);if(id===MEET)pick(s,null);finish(s);assert.ok(s.players[0].hand.some(x=>x.uid===yes[0]));assert.ok(s.players[0].grave.some(x=>x.cardId===DARKSPELLTWIN));}
});
test('Noir uses the creature face color and printed cost, including cheap creatures with expensive spells',()=>{
 const s=setup();give(s,0,'grave',[H,SMALLLIGHTTWIN,BIGLIGHTTWIN,LIGHTTWIN,LIGHTSPELL,SEED]);const yes=s.players[0].grave.slice(0,2).map(x=>x.uid);trigger(s,NOIR);assert.deepEqual(eligible(s),yes);pick(s,yes[1]);finish(s);assert.ok(s.players[0].hand.some(x=>x.uid===yes[1]));assert.ok(s.players[0].grave.some(x=>x.cardId===BIGLIGHTTWIN));
});
test('La Vue checks the actual spell face, not a light creature with a differently colored spell',()=>{
 const s=setup(),wrong=data.cards.find(c=>c.spellFace&&e.civilizations(c).includes('光')&&!e.civilizations(c.spellFace).includes('光'));assert.ok(wrong);give(s,0,'grave',[LIGHTSPELL,LIGHTTWIN,H,wrong.id,N]);const yes=s.players[0].grave.slice(0,2).map(x=>x.uid);trigger(s,LAVUE);assert.deepEqual(eligible(s),yes);pick(s,yes[1]);finish(s);assert.ok(s.players[0].hand.some(x=>x.uid===yes[1]));
});
test('Reencarnel recovers cross gear only and the same physical card can subsequently be generated',()=>{
 const s=setup();give(s,0,'grave',[GEAR,N,LIGHTSPELL,SEED]);const gear=s.players[0].grave[0].uid;trigger(s,GEARREC);assert.deepEqual(eligible(s),[gear]);pick(s,gear);finish(s);assert.ok(s.players[0].hand.some(x=>x.uid===gear));act(s,'play',a=>a.uid===gear);finish(s);assert.ok(s.players[0].battle.some(x=>x.uid===gear&&e.card(x).type==='gear'));
});
test('up-to-two retrieval supports zero, one or two cards, never selecting a duplicate UID twice',()=>{
 for(const n of [0,1,2]){let s=setup();give(s,0,'grave',[D,D,DARKCREATURETWIN]);const chosen=s.players[0].grave.slice(0,n).map(x=>x.uid);trigger(s,MEET);const before=ids(s);for(const uid of chosen){pick(s,uid);if(s.decision?.task?.op==='g34_Select')assert.ok(!eligible(s).includes(uid));s=JSON.parse(JSON.stringify(s));}if(n<2)pick(s,null);finish(s);assert.ok(chosen.every(uid=>s.players[0].hand.some(x=>x.uid===uid)));assert.equal(s.players[0].hand.length,n);assert.deepEqual(ids(s),before);assert.equal(s.players[0].grave.filter(x=>x.cardId===D).length,2-Math.min(n,2));}
});
test('optional single-card retrieval can be declined and no eligible cards creates no fake choice',()=>{
 for(const id of [GEARREC,NOIR,LAVUE,GAMIL]){const s=setup(),cardId=id===GEARREC?GEAR:id===NOIR?H:id===LAVUE?LIGHTSPELL:D;give(s,0,'grave',[cardId]);const uid=s.players[0].grave[0].uid;trigger(s,id);pick(s,null);finish(s);assert.ok(s.players[0].grave.some(x=>x.uid===uid));const t=setup();give(t,0,'grave',[]);trigger(t,id);assert.ok(!t.decision||t.decision.type==='block');}
});
test('opponent Apul keeps typed recovery cards in the grave, including the S-trigger spell',()=>{
 for(const id of [GEARREC,NOIR,LAVUE,GAMIL,MEET]){const s=setup();put(s,1,APUL);give(s,0,'grave',[D,H,GEAR,LIGHTSPELL]);const old=s.players[0].grave.map(x=>x.uid);trigger(s,id);finish(s);assert.ok(old.every(uid=>s.players[0].grave.some(x=>x.uid===uid)));assert.equal(s.players[0].hand.length,0);}
});
test('suppressed entries and attacks never recover or search',()=>{
 for(const id of [GEARREC,NOIR]){const s=setup();give(s,0,'grave',[GEAR,H]);put(s,1,'dm25rp3-S09').under=[inst(N)];play(s,id);finish(s);assert.equal(s.players[0].hand.length,0);assert.equal(s.players[0].grave.length,2);}
 for(const id of [LAVUE,GAMIL,KING]){const s=setup(),x=put(s,0,id);x.g35Ignored=s.turn;give(s,0,'grave',[D,LIGHTSPELL]);s.phase='attack';act(s,'attack',a=>a.uid===x.uid&&a.target==='player');assert.equal(s.decision.type,'block');assert.equal(s.players[0].hand.length,0);}
});
test('Encounter S-trigger is owned by the defending player and returns two of that player dark creatures',()=>{
 let s=setup();give(s,0,'grave',[D,D]);give(s,1,'grave',[D]);give(s,0,'shields',[MEET,N]);const choice=s.players[0].grave.map(x=>x.uid),attacker=put(s,1,N);s.active=1;s.phase='attack';act(s,'attack',a=>a.uid===attacker.uid&&a.target==='player');act(s,'noBlock');act(s,'useTrigger');assert.equal(s.decision.player,0);assert.deepEqual(eligible(s),choice);s=JSON.parse(JSON.stringify(s));pick(s,choice[0]);pick(s,choice[1]);finish(s);assert.ok(choice.every(uid=>s.players[0].hand.some(x=>x.uid===uid)));assert.equal(s.players[1].grave.length,1);assert.equal(s.metrics[0].triggers,1);assert.ok(s.players[0].grave.some(x=>x.cardId===MEET));
});
test('King Bonitas searches the whole deck for water cards, including water spell faces, reveals and shuffles',()=>{
 const s=setup();give(s,0,'deck',[N,DARKCREATURETWIN,W,F]);const yes=s.players[0].deck.slice(1,3).map(x=>x.uid),picked=yes[0];trigger(s,KING);assert.deepEqual(eligible(s),yes);const before=ids(s),rng=s.rng;pick(s,picked);finish(s);assert.ok(s.players[0].hand.some(x=>x.uid===picked));assert.equal(s.players[0].deck.length,3);assert.notEqual(s.rng,rng);assert.ok(s.log.some(x=>x.type==='reveal'&&x.cardId===DARKCREATURETWIN));assert.deepEqual(ids(s),before);
});
test('King can decline, respects deck search lock, and does not expose private library order to the AI',()=>{
 const s=setup();give(s,0,'deck',[W,N,F]);const uid=s.players[0].deck[0].uid;trigger(s,KING);pick(s,null);finish(s);assert.equal(s.players[0].hand.length,0);assert.ok(s.players[0].deck.some(x=>x.uid===uid));
 const lock=data.cards.find(c=>c.qqLock||c.g42QX);assert.ok(lock);const t=setup();put(t,1,lock.id);give(t,0,'deck',[W,N,F]);const before=t.players[0].deck.map(x=>x.uid);trigger(t,KING);finish(t);assert.equal(t.players[0].hand.length,0);assert.deepEqual(t.players[0].deck.map(x=>x.uid),before);
 const u=setup();put(u,0,KING);u.phase='attack';give(u,1,'hand',[N,F]);const a=e.analyzeAI(u);u.players[1].hand.forEach(x=>x.cardId=GEN);u.players[1].deck.forEach(x=>x.cardId=GEN);assert.deepEqual(e.analyzeAI(u),a);
});
for(const first of [0,1])test('CPU forty-card match completes with eighty identities and JSON continuation '+first,()=>{
 let s=e.createGame([STANDARD228_DECK,PRESETS[first]],{seed:22801+first,first}),saved=false;const before=ids(s);
 while(s.winner===null&&s.actions<2200&&s.turn<160){e.step(s,e.chooseAI(s));assert.deepEqual(ids(s),before);if(!saved&&s.actions>20){s=JSON.parse(JSON.stringify(s));saved=true;}}
 assert.ok(saved);assert.notEqual(s.winner,null);assert.equal(before.length,80);
});
