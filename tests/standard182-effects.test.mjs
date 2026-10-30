import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain,GEN,GG,PRESETS} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {STANDARD182_DECKS} from '../tools/fixtures/standard182.mjs';
const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-182.json',import.meta.url)));
const N='dm01-108',F='dm01-097',MULTI='dmc44-006',POT='dm10-060',DAI='dmrp04s-010',HOUSE='dmrp02-059',SNF='dm16-053',RAK='dm23rp1-049',BOU='dmex14-104',DAMA='promoy15-029',SNIPE='dm14-035',ROYAL='dm25rp1-048',CRACK='promoy21-084',DE='dm01-027',BO='dm01-086';
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function pick(s,v){act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===v);}
function play(s,id){s.players[s.active].hand.push(inst(id));act(s,'play',a=>a.cardId===id&&!a.alternative);}
function removeEnemy(s,id,owner,uid){s.active=1-owner;s.phase='main';play(s,id);act(s,'effect',a=>a.targets.some(x=>x.uid===uid));}
test('eleven whole official definitions, images and limits are present and covered by two legal decks',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);assert.equal(m.cards.length,11);
 for(const row of m.cards){assert.deepEqual(row.faces,details.cards.find(x=>x.id===row.id).faces);assert.deepEqual(row.spec,standardCardSpec(details.cards.find(x=>x.id===row.id),{phase:182}));assert.equal(e.card(row.id).supportBatch,'phase-182');assert.ok(row.verification.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(e.card(row.id).limit,m.regulationVerification.limits[row.id]);assert.equal(CARD_IMAGES[row.id],row.image);assert.ok(registry.get(row.id).supported);assert.ok(STANDARD182_DECKS.some(d=>d.cards.some(x=>x.id===row.id)));}
 for(const d of STANDARD182_DECKS){assert.deepEqual(e.validateDeck(d),[]);assert.equal(d.cards.reduce((n,x)=>n+x.count,0),40);assert.equal(registry.coverage(d).unsupported,0);}
});
test('new syntax is phase gated, unknown trailing and conditional abilities are rejected, and prior manifests remain unchanged',()=>{
 for(const row of m.cards){const d=structuredClone(details.cards.find(x=>x.id===row.id));assert.throws(()=>standardCardSpec(d,{phase:181}));d.faces[0].abilityText+='\n未知の能力';assert.throws(()=>standardCardSpec(d,{phase:182}));}
 const d=structuredClone(details.cards.find(x=>x.id===BOU));for(const text of['このクリーチャーが出た時、自分の手札を２枚、マナゾーンに置いてもよい。そうしたらカードを３枚引く。','このクリーチャーが出た時、自分の手札から自然のカードを１枚、マナゾーンに置く。']){d.faces[0].abilityText=text;assert.throws(()=>standardCardSpec(d,{phase:182}));}
 for(let phase=168;phase<=181;phase++)for(const row of JSON.parse(fs.readFileSync(new URL('../tools/support-phase-'+phase+'.json',import.meta.url))).cards)assert.deepEqual(standardCardSpec(details.cards.find(x=>x.id===row.id),{phase}),row.spec);
});
for(const id of[BOU,'dmrp19-093',RAK])test(e.card(id).name+': mandatory/optional hand mana, original card identity, correct mono/multicolor tapping and no extra charge',()=>{
 for(const cid of[N,MULTI]){const s=setup();give(s,0,'hand',[cid]);const uid=s.players[0].hand[0].uid;play(s,id);const ids=physical(s);assert.equal(s.decision.task.op,'g34_Select');assert.equal(s.decision.choices.some(x=>x.value===null),id!==BOU);pick(s,uid);drain(s);const x=s.players[0].mana.find(x=>x.uid===uid);assert.ok(x);assert.equal(x.tapped,cid===MULTI);assert.equal(s.players[0].hand.length,0);assert.equal(s.metrics[0].charges,0);assert.equal(s.phase,'main');assert.deepEqual(physical(s),ids);}
 const s=setup();play(s,id);assert.equal(s.decision,null);assert.equal(s.winner,null);
});
test('Potato permits zero, one or two distinct choices, moves only after selection, and survives saved continuation',()=>{
 for(const n of[0,1,2]){let s=setup();give(s,0,'hand',[N,MULTI,F]);const hand=s.players[0].hand.map(x=>x.uid);play(s,POT);const ids=physical(s);assert.equal(s.players[0].mana.length,50);for(let i=0;i<n;i++){pick(s,hand[i]);if(i===0){assert.equal(s.players[0].mana.length,50);assert.ok(!s.decision.choices.some(x=>x.value?.uid===hand[0]));s=JSON.parse(JSON.stringify(s));}}if(n<2)pick(s,null);drain(s);assert.equal(s.players[0].mana.length,50+n);assert.equal(s.players[0].hand.length,3-n);assert.ok(hand.slice(0,n).every(uid=>s.players[0].mana.some(x=>x.uid===uid)));assert.deepEqual(physical(s),ids);}
});
test('Daikong puts selected hand cards tapped first, then retrieves only creatures including a just placed one',()=>{
 let s=setup();give(s,0,'hand',[N,F,DE]);const selected=s.players[0].hand.slice(0,2).map(x=>x.uid);play(s,DAI);const ids=physical(s);assert.ok(!s.decision.title.includes('Infinity'));for(const uid of selected)pick(s,uid);pick(s,null);assert.equal(s.players[0].mana.length,52);assert.ok(selected.every(uid=>s.players[0].mana.some(x=>x.uid===uid&&x.tapped)));assert.ok(!s.decision.title.includes('Infinity'));assert.ok(s.decision.choices.filter(x=>x.cardId).every(x=>e.card(x.cardId).type==='creature'));s=JSON.parse(JSON.stringify(s));pick(s,selected[1]);pick(s,null);drain(s);assert.equal(s.players[0].mana.length,51);assert.ok(s.players[0].hand.some(x=>x.uid===selected[1]&&!x.tapped));assert.deepEqual(physical(s),ids);
 const t=setup();play(t,DAI);assert.equal(t.decision.task.origin,'mana');pick(t,null);assert.equal(t.winner,null);
});
test('hand-mana movement notifies Casablanca and King Cell untap even when the effect says tapped',()=>{
 for(const cardId of[MULTI,'dmex18-012']){const s=setup();if(cardId===MULTI)give(s,0,'battle',['dm24bd5-010']);give(s,0,'hand',[cardId]);const uid=s.players[0].hand[0].uid;play(s,DAI);pick(s,uid);if(s.decision?.task?.origin==='mana')pick(s,null);drain(s);assert.ok(s.players[0].mana.some(x=>x.uid===uid&&!x.tapped));}
});
test('Choco House triggers only on attacking, places a hand card before blocking, and an empty hand does not stop combat',()=>{
 for(const full of[true,false]){const s=setup();give(s,0,'battle',[HOUSE]);give(s,0,'hand',full?[N]:[]);const uid=s.players[0].hand[0]?.uid;s.phase='attack';act(s,'attack',a=>a.target==='player');if(full){assert.equal(s.decision.task.op,'g34_Select');assert.ok(!s.decision.choices.some(c=>c.value===null));pick(s,uid);assert.ok(s.players[0].mana.some(x=>x.uid===uid));}assert.equal(s.decision.type,'block');}
});
test('Damama taps an opponent first then offers hand mana even when there was no eligible opponent',()=>{
 for(const enemy of[false,true]){const s=setup();if(enemy)give(s,1,'battle',[N]);give(s,0,'hand',[F]);const uid=s.players[0].hand[0].uid;play(s,DAMA);if(enemy){pick(s,s.players[1].battle[0].uid);assert.ok(s.players[1].battle[0].tapped);}assert.equal(s.decision.task.origin,'hand');pick(s,uid);drain(s);assert.ok(s.players[0].mana.some(x=>x.uid===uid));}
});
test('Snuff death mana is controlled by its owner and does not trigger on a return to hand',()=>{
 for(const owner of[0,1]){const s=setup();give(s,owner,'battle',[SNF]);give(s,owner,'hand',[N,F]);const hand=s.players[owner].hand.map(x=>x.uid),body=s.players[owner].battle[0].uid;removeEnemy(s,DE,owner,body);assert.equal(s.decision.player,owner);pick(s,hand[0]);pick(s,null);drain(s);assert.ok(s.players[owner].mana.some(x=>x.uid===hand[0]));assert.ok(s.players[owner].grave.some(x=>x.uid===body));}
 const s=setup();give(s,0,'battle',[SNF]);give(s,0,'hand',[N]);removeEnemy(s,BO,0,s.players[0].battle[0].uid);assert.equal(s.players[0].mana.length,50);assert.equal(s.decision,null);
});
test('Rakkyu recovers a facedown mana anonymously on either death or bounce, with choosing no card allowed',()=>{
 for(const spell of[DE,BO]){const s=setup();give(s,0,'battle',[RAK]);const x=s.players[0].mana[0];x.faceDown=true;const uid=s.players[0].battle[0].uid;removeEnemy(s,spell,0,uid);assert.equal(s.decision.player,0);const choice=s.decision.choices.find(c=>c.value?.uid===x.uid);assert.equal(choice.label,'裏向きのカード');assert.equal(choice.cardId,undefined);pick(s,x.uid);assert.ok(s.players[0].hand.some(y=>y.uid===x.uid&&!y.faceDown));}
 const s=setup();give(s,0,'battle',[RAK]);removeEnemy(s,DE,0,s.players[0].battle[0].uid);pick(s,null);assert.equal(s.players[0].mana.length,50);
});
test('Snipe retrieves before ramping, so it cannot retrieve the new top card; all redirected cards remain physical',()=>{
 const s=setup();give(s,0,'battle',[SNIPE]);give(s,0,'mana',[N]);const top=s.players[0].deck[0].uid,old=s.players[0].mana[0].uid;removeEnemy(s,DE,0,s.players[0].battle[0].uid);assert.equal(s.players[0].deck.length,30);assert.ok(!s.decision.choices.some(x=>x.value?.uid===top));pick(s,old);drain(s);assert.ok(s.players[0].hand.some(x=>x.uid===old));assert.ok(s.players[0].mana.some(x=>x.uid===top));
});
test('Ningyo allows hand-to-mana while Karei only redirects deck-to-mana',()=>{
 for(const redirect of['dmrp22-033','dm22ex1-086']){const s=setup();give(s,1,'battle',[redirect]);give(s,0,'hand',[N]);const uid=s.players[0].hand[0].uid;play(s,BOU);pick(s,uid);assert.ok(s.players[0].mana.some(x=>x.uid===uid));}
 const s=setup();give(s,0,'battle',[SNIPE]);give(s,1,'battle',['dm22ex1-086']);const top=s.players[0].deck[0].uid;removeEnemy(s,DE,0,s.players[0].battle[0].uid);pick(s,s.players[0].mana[0].uid);drain(s);assert.ok(s.players[0].grave.some(x=>x.uid===top));
});
test('modern leave wording supports Royal Scion optional draw and Black Crack mandatory draw after entry discard',()=>{
 for(const accept of[false,true]){const s=setup();give(s,0,'battle',[ROYAL]);const deck=s.players[0].deck.length;removeEnemy(s,BO,0,s.players[0].battle[0].uid);pick(s,accept?true:null);drain(s);assert.equal(s.players[0].deck.length,deck-(accept?1:0));}
 const s=setup();give(s,0,'hand',[N]);play(s,CRACK);pick(s,s.players[0].hand[0].uid);drain(s);const deck=s.players[0].deck.length,uid=s.players[0].battle.find(x=>x.cardId===CRACK).uid;removeEnemy(s,BO,0,uid);drain(s);assert.equal(s.players[0].deck.length,deck-2);assert.ok(s.players[0].hand.some(x=>x.uid===uid));
});
test('Genmu suppresses low-cost entry and leave abilities; GG suppresses attacks and entries but not death mana',()=>{
 const s=setup();give(s,1,'battle',[GEN]);give(s,0,'hand',[N]);play(s,BOU);assert.equal(s.decision,null);assert.equal(s.players[0].hand.length,1);give(s,0,'battle',[RAK]);removeEnemy(s,DE,0,s.players[0].battle[0].uid);assert.equal(s.decision,null);
 const t=setup();give(t,1,'battle',[GG]);t.players[1].battle[0].under=[inst(N)];give(t,0,'battle',[SNF]);give(t,0,'hand',[F]);const uid=t.players[0].hand[0].uid;removeEnemy(t,DE,0,t.players[0].battle[0].uid);pick(t,uid);drain(t);assert.ok(t.players[0].mana.some(x=>x.uid===uid));
});
test('CPU prefers cheap hand mana to a high cost finisher and can finish a finite unlimited selection',()=>{
 const s=setup();give(s,0,'hand',[N,'dmx22b-012']);play(s,POT);const a=e.chooseAI(s);assert.equal(s.decision.choices[a.choice].cardId,N);drain(s);assert.equal(s.decision,null);
});
test('two CPU games preserve eighty cards and complete after saved continuation',()=>{
 for(let i=0;i<2;i++){let s=e.createGame([STANDARD182_DECKS[i],PRESETS[i]],{seed:18201+i,first:i%2}),saved=false;const ids=physical(s);while(s.winner===null&&s.actions<1800&&s.turn<160){e.step(s,e.chooseAI(s));assert.deepEqual(physical(s),ids);if(!saved&&s.actions>20){s=JSON.parse(JSON.stringify(s));saved=true;}}assert.ok(saved);assert.notEqual(s.winner,null);assert.equal(ids.length,80);}
});
test('Royal Scion resolves its live power reduction on entry and remains an ordinary blocker',()=>{
 const s=setup();give(s,1,'battle',[N]);const uid=s.players[1].battle[0].uid;play(s,ROYAL);pick(s,uid);drain(s);assert.ok(s.players[1].grave.some(x=>x.uid===uid));assert.ok(s.players[0].battle.some(x=>x.cardId===ROYAL));give(s,1,'battle',[N]);s.active=1;s.phase='attack';act(s,'attack',a=>a.target==='player');assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'));
});
test('Potato shield trigger may decline all hand mana without blocking the rest of combat',()=>{
 const s=setup();give(s,0,'battle',[N]);give(s,1,'shields',[POT]);give(s,1,'hand',[F]);s.phase='attack';act(s,'attack',a=>a.target==='player');act(s,'noBlock');act(s,'useTrigger');assert.equal(s.decision.player,1);pick(s,null);drain(s);assert.ok(s.players[1].battle.some(x=>x.cardId===POT));assert.equal(s.players[1].hand.length,1);assert.equal(s.players[1].mana.length,50);
});
test('Black Crack abyss rush attacks immediately, returns to bottom and draws two from its leave ability',()=>{
 let s=setup();give(s,0,'grave',[CRACK]);give(s,0,'hand',[F]);const uid=s.players[0].grave[0].uid;act(s,'play',a=>a.uid===uid&&a.manaPermit==='abyssRush');pick(s,s.players[0].hand[0].uid);s.phase='attack';assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===uid&&a.target==='player'));const ids=physical(s),deck=s.players[0].deck.length;s=JSON.parse(JSON.stringify(s));act(s,'endTurn');drain(s);assert.ok(!s.players[0].battle.some(x=>x.uid===uid));assert.equal(s.players[0].deck.at(-1).uid,uid);assert.equal(s.players[0].hand.length,2);assert.equal(s.players[0].deck.length,deck-1);assert.deepEqual(physical(s),ids);
});
