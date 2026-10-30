import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain,GEN,GG,PRESETS} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {STANDARD181_DECKS} from '../tools/fixtures/standard181.mjs';
const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-181.json',import.meta.url)));
const N='dm01-108',F='dm01-097',L='dm01-075',FATE='dm26rp1-032',DOO='dmsd16-014',ZIR='dmc44-006',EMA='dmrp18-069',GRI='dmrp04m-050',EMI='dm36-092',TOTE='dm25ex1-085',DE='dm01-027',BA='dm29-s02';
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function pick(s,v){act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===v);}
function play(s,id){s.players[s.active].hand.push(inst(id));act(s,'play',a=>a.cardId===id&&!a.alternative);}
function destroy(s,p,uid){s.active=1-p;s.phase='main';play(s,DE);act(s,'effect',a=>a.targets.some(x=>x.uid===uid));}
const loots=m.cards.filter(c=>c.spec.g34Tasks?.[0].op==='Draw');
test('eight complete definitions have official images, faces, limits and coverage in a legal forty-card fixture',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);assert.equal(m.cards.length,8);
 for(const row of m.cards){assert.deepEqual(row.faces,details.cards.find(x=>x.id===row.id).faces);assert.deepEqual(row.spec,standardCardSpec(details.cards.find(x=>x.id===row.id),{phase:181}));assert.equal(e.card(row.id).supportBatch,'phase-181');assert.ok(row.verification.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(e.card(row.id).limit,m.regulationVerification.limits[row.id]);assert.equal(CARD_IMAGES[row.id],row.image);assert.ok(registry.get(row.id).supported);assert.ok(STANDARD181_DECKS[0].cards.some(x=>x.id===row.id));}
 assert.equal(STANDARD181_DECKS[0].cards.reduce((n,x)=>n+x.count,0),40);assert.deepEqual(e.validateDeck(STANDARD181_DECKS[0]),[]);assert.equal(registry.coverage(STANDARD181_DECKS[0]).unsupported,0);
});
for(const row of loots)test(row.name+': draws all cards first and allows mandatory discards from both new and old hand cards',()=>{
 let s=setup();give(s,0,'hand',[N,'dmx22b-012']);const old=s.players[0].hand.map(x=>x.uid),n=row.spec.g34Tasks[0].n,discard=row.spec.g34Tasks[1].n,drawn=s.players[0].deck.slice(0,n).map(x=>x.uid),deck=s.players[0].deck.length;play(s,row.id);assert.equal(s.decision.player,0);assert.equal(s.players[0].deck.length,deck-n);assert.equal(s.players[0].hand.length,old.length+n);assert.ok([...old,...drawn].every(uid=>s.decision.choices.some(c=>c.value===uid)));assert.ok(!s.decision.choices.some(c=>c.value===null));assert.notEqual(s.decision.choices[e.chooseAI(s).choice].cardId,'dmx22b-012');const ids=physical(s);s=JSON.parse(JSON.stringify(s));const chosen=[old[0],...drawn].slice(0,discard);for(const uid of chosen)pick(s,uid);drain(s);assert.equal(s.players[0].hand.length,old.length+n-discard);assert.ok(chosen.every(uid=>s.players[0].grave.some(x=>x.uid===uid)));assert.ok(s.players[0].battle.some(x=>x.cardId===row.id));assert.deepEqual(physical(s),ids);
});
test('classifier rejects optional, conditional or incorrectly ordered looting, while earlier manifests remain unchanged',()=>{
 for(const row of m.cards){const d=structuredClone(details.cards.find(x=>x.id===row.id));assert.throws(()=>standardCardSpec(d,{phase:180}));d.faces[0].abilityText+='\n未知の能力';assert.throws(()=>standardCardSpec(d,{phase:181}));}
 const d=structuredClone(details.cards.find(x=>x.id===FATE));for(const line of['このクリーチャーが出た時、カードを３枚引いてもよい。そうしたら、自分の手札を３枚捨てる。','このクリーチャーが出た時、カードを３枚引き、自分の手札が５枚以上なら、自分の手札を３枚捨てる。','このクリーチャーが出た時、自分の山札の上から２枚を表向きでマナゾーンに置く。']){d.faces[0].abilityText=line;assert.throws(()=>standardCardSpec(d,{phase:181}));}
 for(const phase of[168,169,170,171,172,173,174,175,176,177,178,179,180])for(const row of JSON.parse(fs.readFileSync(new URL('../tools/support-phase-'+phase+'.json',import.meta.url))).cards)assert.deepEqual(standardCardSpec(details.cards.find(c=>c.id===row.id),{phase}),row.spec);
});
test('empty starting hands still draw before discarding and the last-card loss interrupts the discard stage',()=>{
 for(const row of loots){const s=setup();play(s,row.id);drain(s);assert.equal(s.players[0].hand.length,0);assert.equal(s.players[0].grave.length,row.spec.g34Tasks[1].n);}
 const s=setup();give(s,0,'deck',[N,F,L]);play(s,FATE);assert.equal(s.winner,1);assert.equal(s.players[0].hand.length,3);assert.equal(s.players[0].grave.length,0);assert.equal(s.decision,null);
});
test('Ema death loot draws two then discards one for the owner, not the killer',()=>{
 for(const owner of[0,1]){let s=setup();give(s,owner,'battle',[EMA]);const uid=s.players[owner].battle[0].uid,deck=s.players[owner].deck.length;destroy(s,owner,uid);assert.equal(s.decision.player,owner);assert.equal(s.players[owner].deck.length,deck-2);assert.equal(s.players[owner].hand.length,2);assert.ok(s.players[owner].grave.some(x=>x.uid===uid));const chosen=s.players[owner].hand[0].uid,ids=physical(s);s=JSON.parse(JSON.stringify(s));pick(s,chosen);drain(s);assert.equal(s.players[owner].hand.length,1);assert.ok(s.players[owner].grave.some(x=>x.uid===chosen));assert.deepEqual(physical(s),ids);}
});
test('Sasage destroys Ema, reduces a Dispector summon by one and still resolves its death loot',()=>{
 const s=setup();give(s,0,'battle',[EMA]);give(s,0,'mana',Array(6).fill(L));give(s,0,'hand',['dmrp19-030']);const uid=s.players[0].battle[0].uid,ids=physical(s),a=e.getLegalActions(s).find(a=>a.alternative==='sasage'&&a.sasage.includes(uid));assert.ok(a);assert.equal(a.cost,6);assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&!a.alternative));act(s,'play',a=>a.alternative==='sasage');drain(s);assert.ok(s.players[0].battle.some(x=>x.cardId==='dmrp19-030'));assert.ok(s.players[0].grave.some(x=>x.uid===uid));assert.equal(s.players[0].hand.length,1);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,6);assert.deepEqual(physical(s),ids);
});
test('Grippage blind discard does not expose a target choice and does not prefer expensive hidden cards',()=>{
 const indices=[];for(const ids of[[N,'dmx22b-012'],['dmx22b-012',N]]){const s=setup();give(s,1,'hand',ids);const order=s.players[1].hand.map(x=>x.uid);play(s,GRI);assert.equal(s.decision,null);assert.equal(s.players[1].hand.length,1);assert.equal(s.players[1].grave.length,1);indices.push(order.indexOf(s.players[1].grave[0].uid));}assert.equal(indices[0],indices[1]);
 const t=setup();play(t,GRI);assert.equal(t.decision,null);assert.equal(t.winner,null);
});
test('Emily discards the opposing hand only when actually destroyed, and its blind discard preserves Baiken replacement',()=>{
 const s=setup();give(s,0,'battle',[EMI]);give(s,1,'hand',[N,F]);destroy(s,0,s.players[0].battle[0].uid);drain(s);assert.equal(s.players[1].hand.length,1);assert.equal(s.players[1].grave.filter(x=>[N,F].includes(x.cardId)).length,1);
 const t=setup();give(t,1,'hand',[BA]);const uid=t.players[1].hand[0].uid;play(t,GRI);assert.equal(t.decision.task.op,'discardChosen');pick(t,true);assert.equal(t.decision.task.op,'bounceAny');pick(t,null);drain(t);assert.ok(t.players[1].battle.some(x=>x.uid===uid));assert.ok(!t.players[1].grave.some(x=>x.uid===uid));
});
test('Fate shield trigger can discard Baiken during the opponent turn without counting it as a grave card',()=>{
 const s=setup();give(s,0,'battle',[N]);give(s,1,'shields',[FATE]);give(s,1,'hand',[BA]);give(s,1,'deck',Array(20).fill(F));const baiken=s.players[1].hand[0].uid,ids=physical(s);s.phase='attack';act(s,'attack',a=>a.target==='player');act(s,'noBlock');act(s,'useTrigger');const rest=s.players[1].hand.filter(x=>x.uid!==baiken).slice(0,2).map(x=>x.uid);pick(s,baiken);for(const uid of rest)pick(s,uid);assert.equal(s.decision.task.op,'discardChosen');pick(s,true);assert.equal(s.decision.task.op,'bounceAny');pick(s,null);drain(s);assert.ok(s.players[1].battle.some(x=>x.uid===baiken));assert.ok(!s.players[1].grave.some(x=>x.uid===baiken));assert.equal(s.players[1].grave.filter(x=>rest.includes(x.uid)).length,2);assert.deepEqual(physical(s),ids);
});
test('Babylonia replacement can pause and resume new loot before the mandatory original discard',()=>{
 let s=setup();give(s,0,'battle',['dm32-021']);give(s,0,'deck',[N,F,L,...Array(20).fill(N)]);play(s,'dmrp08-070');assert.equal(s.decision.type,'drawReplacement');act(s,'replaceDraw',a=>a.replace);assert.equal(s.decision.stage,'discard');s=JSON.parse(JSON.stringify(s));act(s,'discardDraw',a=>a.cardId===N);assert.equal(s.decision.task.op,'discard');assert.equal(s.players[0].hand.length,1);pick(s,s.players[0].hand[0].uid);drain(s);assert.equal(s.players[0].hand.length,0);assert.equal(s.players[0].grave.length,2);assert.equal(s.players[0].deck.length,21);
});
test('Totenton ramps two actual top cards tapped before mandatory mana retrieval, including a new card',()=>{
 for(const returnNew of[false,true]){let s=setup();const top=s.players[0].deck.slice(0,2).map(x=>x.uid),old=s.players[0].mana[0].uid,deck=s.players[0].deck.length;play(s,TOTE);assert.equal(s.players[0].mana.length,52);assert.equal(s.players[0].deck.length,deck-2);assert.ok(top.every(uid=>s.players[0].mana.some(x=>x.uid===uid&&x.tapped)));assert.ok(top.every(uid=>s.decision.choices.some(c=>c.value?.uid===uid)));const ids=physical(s);s=JSON.parse(JSON.stringify(s));const uid=returnNew?top[1]:old;pick(s,uid);drain(s);assert.ok(s.players[0].hand.some(x=>x.uid===uid));assert.equal(s.players[0].mana.length,51);assert.ok(top.filter(x=>x!==uid).every(uid=>s.players[0].mana.some(x=>x.uid===uid&&x.tapped)));assert.deepEqual(physical(s),ids);}
});
test('Totenton redirections do not lose cards and a facedown mana choice remains anonymous until retrieval',()=>{
 for(const redirect of['dm22ex1-086','dmrp22-033']){const s=setup();give(s,1,'battle',[redirect]);const top=s.players[0].deck.slice(0,2).map(x=>x.uid);play(s,TOTE);assert.ok(top.every(uid=>s.players[0].grave.some(x=>x.uid===uid)));drain(s);assert.equal(s.winner,null);}
 const s=setup();const x=s.players[0].mana[0];x.faceDown=true;x.tapped=true;play(s,TOTE);const choice=s.decision.choices.find(c=>c.value?.uid===x.uid);assert.equal(choice.label,'裏向きのカード');assert.equal(choice.cardId,undefined);pick(s,x.uid);drain(s);assert.ok(s.players[0].hand.some(y=>y.uid===x.uid&&!y.faceDown));
});
test('loot, blind discards and tapped ramp are suppressed by Genmu; GG does not suppress death effects',()=>{
 for(const id of[FATE,GRI,TOTE]){const s=setup();give(s,1,'battle',[GEN]);give(s,1,'hand',[F]);const deck=s.players[0].deck.length;play(s,id);drain(s);assert.equal(s.players[0].deck.length,deck);assert.equal(s.players[1].hand.length,1);assert.equal(s.players[0].mana.length,50);}
 const s=setup();give(s,0,'battle',[EMA]);give(s,1,'battle',[GG]);s.players[1].battle[0].under=[inst(N)];destroy(s,0,s.players[0].battle[0].uid);drain(s);assert.equal(s.players[0].hand.length,1);
});
test('multicolor Zircon charges tapped, blocks normally and cannot attack',()=>{
 const s=setup();give(s,0,'hand',[ZIR]);s.phase='charge';act(s,'charge');assert.equal(s.players[0].mana.at(-1).cardId,ZIR);assert.equal(s.players[0].mana.at(-1).tapped,true);give(s,0,'battle',[ZIR]);s.phase='attack';assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'));give(s,1,'battle',[N]);s.active=1;act(s,'attack',a=>a.target==='player');assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'));
});
test('three CPU games finish with JSON continuation and eighty conserved physical cards',()=>{
 for(let i=0;i<3;i++){let s=e.createGame([STANDARD181_DECKS[0],PRESETS[i]],{seed:18101+i,first:i%2}),saved=false;const ids=physical(s);while(s.winner===null&&s.actions<1800&&s.turn<160){e.step(s,e.chooseAI(s));assert.deepEqual(physical(s),ids);if(!saved&&s.actions>20){s=JSON.parse(JSON.stringify(s));saved=true;}}assert.ok(saved);assert.notEqual(s.winner,null);assert.equal(ids.length,80);}
});
