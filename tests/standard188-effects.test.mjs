import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain,GEN,GG,PRESETS} from './target-fixture.mjs';import {standardCardSpec} from '../tools/standard-card-spec.mjs';import {createCatalogue} from '../dist/catalogue.js';import {CARD_IMAGES} from '../dist/card-images.js';import {STANDARD188_DECKS} from '../tools/fixtures/standard188.mjs';
const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-188.json',import.meta.url))),N='dm01-108',F='dm01-097',BIG='dmx22b-012',DE='dm01-027',NEKO='dmr19-058',LOOT='dm24rp1-034',ARCH='dm24rp1-038',KARI='dm24rp1-040',MILL='dm24rp1-065',GUARD='dm24rp1-074',BUBBLE='dm24rp2-035',GORILLA='dm24rp2-067',MURK='dm24rp4-076',BLUE='dm24rp1-060',GEMINI='dm24ex4-014',TAK='dmrp04s-069',KOF='dm24rp3-058',DOSH='dmrp04s-073',AKAT='dmrp05-012',LAW='dm23rp3-037',MET='dm24rp1-068',AXE='dm24rp1-073',SHADOW='dm25rp1-028';
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function pick(s,v){act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===v);}
function play(s,id){const x=inst(id);s.players[s.active].hand.push(x);act(s,'play',a=>a.uid===x.uid&&!a.alternative);return x.uid;}
function attack(s,uid=s.players[s.active].battle[0].uid,target='player'){s.phase='attack';act(s,'attack',a=>a.uid===uid&&a.target===target);}
function opponentTap(s,id){give(s,0,'battle',[id]);s.active=1;play(s,NEKO);pick(s,s.players[0].battle[0].uid);}
function block(s,id,attacker=BIG){give(s,0,'battle',[id]);give(s,1,'battle',[attacker]);s.active=1;attack(s);act(s,'block');}
test('eighteen officially verified complete definitions, images and two legal forty-card decks',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);assert.equal(m.cards.length,18);for(const row of m.cards){assert.deepEqual(row.faces,details.cards.find(x=>x.id===row.id).faces);assert.deepEqual(row.spec,standardCardSpec(details.cards.find(x=>x.id===row.id),{phase:188}));assert.equal(e.card(row.id).supportBatch,'phase-188');assert.ok(row.verification.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(e.card(row.id).limit,m.regulationVerification.limits[row.id]);assert.equal(CARD_IMAGES[row.id],row.image);assert.ok(registry.get(row.id).supported);assert.ok(STANDARD188_DECKS.some(d=>d.cards.some(x=>x.id===row.id)));}for(const d of STANDARD188_DECKS){assert.deepEqual(e.validateDeck(d),[]);assert.equal(d.cards.reduce((n,x)=>n+x.count,0),40);assert.equal(registry.coverage(d).unsupported,0);}
});
for(const row of m.cards)test(row.name+': attack or opposing tap resolves its complete ability without losing card identities',()=>{
 const s=setup();give(s,0,'grave',[N,DE,DE]);give(s,1,'hand',[N,F,N]);const uid=play(s,row.id);drain(s);const ids=physical(s);give(s,1,'battle',[]);if(row.spec.noAttack){s.active=1;play(s,NEKO);pick(s,uid);drain(s);assert.equal(physical(s).length,ids.length+1);}else{if(row.spec.noPlayerAttack){s.players[1].battle.push(inst(N));s.players[1].battle[0].tapped=true;}const before=physical(s);s.players[0].battle.find(x=>x.uid===uid).entered=0;attack(s,uid,row.spec.noPlayerAttack?s.players[1].battle[0].uid:'player');drain(s);assert.deepEqual(physical(s),before);}assert.equal(s.winner,null);assert.equal(s.decision,null);
});
test('parser rejects unknown trailing or conditional tap text and preserves every earlier manifest',()=>{
 for(const row of m.cards){const d=structuredClone(details.cards.find(x=>x.id===row.id));assert.throws(()=>standardCardSpec(d,{phase:187}));d.faces[0].abilityText+='\n未知の能力';assert.throws(()=>standardCardSpec(d,{phase:188}));}const d=structuredClone(details.cards.find(x=>x.id===TAK));for(const text of ['このクリーチャーがタップした時、山札が10枚以下ならカードを1枚引く。','このクリーチャーがタップした時、カードを1枚引く。その後、未知の処理。','このクリーチャーが出た時、またはタップした時、カードを1枚引く。\nこのクリーチャーが出た時、カードを2枚引く。']){d.faces[0].abilityText=text;assert.throws(()=>standardCardSpec(d,{phase:188}));}for(let phase=168;phase<=187;phase++)for(const row of JSON.parse(fs.readFileSync(new URL('../tools/support-phase-'+phase+'.json',import.meta.url))).cards)assert.deepEqual(standardCardSpec(details.cards.find(x=>x.id===row.id),{phase}),row.spec);
});
test('entry-or-tap draws three before discarding two, both on entry and later attack exactly once',()=>{
 let s=setup();give(s,0,'deck',Array(15).fill(N));give(s,0,'hand',[F]);const uid=play(s,LOOT);assert.equal(s.players[0].deck.length,12);assert.equal(s.players[0].hand.length,4);assert.equal(s.decision.task.op,'discardSelect');pick(s,s.players[0].hand[0].uid);assert.equal(s.players[0].hand.length,4);s=JSON.parse(JSON.stringify(s));pick(s,s.players[0].hand[1].uid);assert.equal(s.players[0].hand.length,2);assert.equal(s.players[0].grave.length,2);s.players[0].battle[0].entered=0;attack(s,uid);assert.equal(s.players[0].deck.length,9);assert.equal(s.players[0].hand.length,5);drain(s);assert.equal(s.players[0].grave.length,4);assert.equal(s.players[0].hand.length,3);
});
test('tap and block abilities resolve before combat, including power removal of the attacker',()=>{
 const s=setup();block(s,ARCH,N);const attacker=s.players[1].battle[0].uid;assert.equal(s.decision.task.op,'g34_Target');pick(s,attacker);drain(s);assert.ok(s.players[1].grave.some(x=>x.uid===attacker));assert.equal(s.players[0].battle.length,1);assert.equal(s.players[0].shields.length,5);
 const t=setup();block(t,BLUE);assert.equal(t.players[0].battle.length,1);assert.equal(t.players[0].hand.length,0);pick(t,true);drain(t);assert.equal(t.players[0].hand.length,1);assert.ok(t.players[0].grave.some(x=>x.cardId===BLUE));assert.equal(t.players[0].shields.length,5);
});
test('guardman taps trigger ramp or destroy the attacker before the redirected battle',()=>{
 const s=setup();give(s,0,'battle',[GUARD,N]);give(s,1,'battle',[BIG]);s.players[0].battle[1].tapped=true;s.active=1;const target=s.players[0].battle[1].uid,mana=s.players[0].mana.length;attack(s,undefined,target);act(s,'guardman');drain(s);assert.equal(s.players[0].mana.length,mana+1);assert.equal(s.players[0].mana.at(-1).tapped,true);assert.ok(s.players[0].battle.some(x=>x.uid===target));
 const t=setup();give(t,0,'battle',[LAW,N]);give(t,1,'battle',[N]);t.players[0].battle[1].tapped=true;t.active=1;attack(t,undefined,t.players[0].battle[1].uid);act(t,'guardman');assert.equal(t.decision.task.op,'g34_Target');pick(t,t.players[1].battle[0].uid);drain(t);assert.equal(t.players[0].battle.length,2);assert.equal(t.players[1].battle.length,0);
});
test('opponent effect taps an unable-to-attack Bubble Ball and the controller receives the draw',()=>{
 const s=setup();opponentTap(s,BUBBLE);assert.equal(s.active,1);assert.equal(s.players[0].hand.length,1);assert.equal(s.players[1].hand.length,0);assert.equal(s.players[0].battle[0].tapped,true);drain(s);s.active=0;s.phase='attack';s.players[0].battle[0].tapped=false;assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'));
});
test('repeatedly targeting an already tapped creature does not retrigger, but untap then tap does',()=>{
 const s=setup();opponentTap(s,TAK);drain(s);assert.equal(s.players[0].hand.length,1);play(s,'dm01-046');act(s,'effect',a=>a.targets.some(x=>x.uid===s.players[0].battle[0].uid));drain(s);assert.equal(s.players[0].hand.length,1);s.players[0].battle[0].tapped=false;play(s,NEKO);pick(s,s.players[0].battle[0].uid);drain(s);assert.equal(s.players[0].hand.length,2);
});
test('hyper energy payment taps trigger even when the donor cannot attack',()=>{
 const s=setup();give(s,0,'battle',[BUBBLE]);give(s,0,'hand',['dm24rp4-074']);act(s,'play',a=>a.alternative==='hyperEnergy');pick(s,s.players[0].battle[0].uid);assert.equal(s.players[0].hand.length,1);pick(s,false);drain(s);assert.equal(s.players[0].battle[0].tapped,true);assert.equal(s.players[0].hand.length,1);assert.ok(s.players[0].battle.some(x=>x.cardId==='dm24rp4-074'));
});
test('mana or grave recovery is optional and cannot choose a card from another zone',()=>{
 const s=setup();give(s,0,'battle',[MURK]);const uid=s.players[0].mana[0].uid;attack(s);assert.equal(s.decision.task.origin,'mana');pick(s,uid);drain(s);assert.ok(s.players[0].hand.some(x=>x.uid===uid));
 const t=setup();give(t,0,'battle',[KARI]);give(t,0,'grave',[N,DE]);attack(t);assert.deepEqual(t.decision.choices.filter(x=>x.value).map(x=>x.cardId),[N]);pick(t,null);drain(t);assert.equal(t.players[0].grave.length,2);
});
test('tap discard is chosen by the opponent; Gemini random discard is automatic, and its leave ability remains',()=>{
 const s=setup();give(s,0,'battle',[DOSH]);give(s,1,'hand',[N,F]);const uid=s.players[1].hand[1].uid;attack(s);assert.equal(s.decision.player,1);pick(s,uid);drain(s);assert.ok(s.players[1].grave.some(x=>x.uid===uid));
 const t=setup();give(t,0,'battle',[GEMINI]);give(t,0,'grave',[DE,DE,N]);give(t,1,'hand',[N,F,N]);attack(t);assert.equal(t.players[1].hand.length,1);assert.equal(t.players[1].grave.length,2);drain(t);t.active=1;t.phase='main';const x=t.players[0].battle[0];play(t,DE);act(t,'effect',a=>a.targets.some(v=>v.uid===x.uid));assert.equal(t.decision.task.origin,'grave');assert.ok(t.decision.choices.filter(x=>x.value).every(x=>x.cardId===DE));drain(t);assert.equal(t.players[0].hand.length,2);
});
test('discard-before-draw remains ordered; search shows only a creature and preserves the chosen bottom order',()=>{
 const s=setup();give(s,0,'battle',[MET]);give(s,0,'hand',[F,N]);give(s,0,'deck',Array(10).fill(N));const uid=s.players[0].hand[1].uid;attack(s);assert.equal(s.players[0].deck.length,10);pick(s,uid);assert.equal(s.players[0].deck.length,8);assert.ok(s.players[0].grave.some(x=>x.uid===uid));drain(s);
 const t=setup();give(t,0,'battle',[AXE]);give(t,0,'deck',[DE,N,F,N,F]);const [one,two,three]=t.players[0].deck.map(x=>x.uid);attack(t);assert.deepEqual(t.decision.choices.filter(x=>x.value).map(x=>x.cardId),[N,F]);pick(t,two);pick(t,three);drain(t);assert.deepEqual(t.players[0].deck.slice(-2).map(x=>x.uid),[three,one]);assert.ok(t.players[0].hand.some(x=>x.uid===two));
});
test('NEO evolution entry/tap and shield addition work with underlying cards conserved',()=>{
 const s=setup();give(s,0,'battle',[N]);give(s,0,'hand',[SHADOW]);const base=s.players[0].battle[0].uid;act(s,'play');act(s,'evolve',a=>a.baseUid===base);assert.equal(s.players[0].hand.length,1);const uid=s.players[0].battle[0].uid,ids=physical(s);attack(s,uid);assert.equal(s.players[0].hand.length,2);drain(s);assert.deepEqual(physical(s),ids);
 const t=setup();give(t,0,'battle',[AKAT]);attack(t);drain(t);assert.equal(t.players[0].shields.length,6);
});
test('Genmu suppresses tap abilities, GG does not, and sealed units cannot be used to tap',()=>{
 const s=setup();give(s,0,'battle',[TAK]);give(s,1,'battle',[GEN]);attack(s);assert.equal(s.players[0].hand.length,0);drain(s);
 const t=setup();give(t,0,'battle',[TAK]);give(t,1,'battle',[GG]);t.players[1].battle[0].under=[inst(N)];attack(t);assert.equal(t.players[0].hand.length,1);drain(t);
 const u=setup();give(u,0,'battle',[TAK]);const x=u.players[0].battle[0];x.sealed=true;u.players[0].seals=[{...inst(N),faceDown:true,sealOf:x.uid}];u.phase='attack';assert.ok(!e.getLegalActions(u).some(a=>a.kind==='attack'));u.active=1;u.phase='main';play(u,NEKO);assert.equal(u.decision,null);assert.equal(u.players[0].hand.length,0);
});
test('optional draw and mill can be skipped, CPU avoids deck loss; mandatory draw keeps Shako replacement',()=>{
 for(const id of[KOF,BLUE,MILL]){const s=setup();give(s,0,'battle',[id]);give(s,0,'deck',[N]);attack(s);assert.equal(s.decision.choices[e.chooseAI(s).choice].value,null);pick(s,null);drain(s);assert.equal(s.winner,null);assert.equal(s.players[0].deck.length,1);}
 const s=setup();give(s,0,'battle',[TAK,'dmrp03-s03']);give(s,0,'deck',[N]);attack(s);assert.equal(s.winner,0);
 const t=setup();give(t,0,'battle',[TAK]);give(t,0,'deck',[N]);attack(t);assert.equal(t.winner,1);
});
test('both CPU decks finish after a saved continuation with eighty conserved identities',()=>{
 for(let i=0;i<2;i++){let s=e.createGame([STANDARD188_DECKS[i],PRESETS[i]],{seed:18801+i,first:i%2}),saved=false;const ids=physical(s);while(s.winner===null&&s.actions<1800&&s.turn<160){e.step(s,e.chooseAI(s));assert.deepEqual(physical(s),ids);if(!saved&&s.actions>20){s=JSON.parse(JSON.stringify(s));saved=true;}}assert.ok(saved);assert.notEqual(s.winner,null);assert.equal(ids.length,80);}
});
test('Gorilla uses current power for its filter; Genmu suppresses it while a cost six tap ability remains',()=>{
 const s=setup();give(s,0,'battle',[GORILLA]);give(s,1,'battle',[N,N]);s.players[1].battle[0].powerModifiers=[{amount:2000}];const uid=s.players[1].battle[1].uid;attack(s);assert.deepEqual(s.decision.choices.map(x=>x.value.uid),[uid]);pick(s,uid);drain(s);assert.ok(s.players[1].grave.some(x=>x.uid===uid));assert.equal(s.players[1].battle.length,1);
 const t=setup();give(t,0,'battle',[GORILLA]);give(t,1,'battle',[N,GEN]);attack(t);assert.equal(t.decision.type,'block');assert.equal(t.players[1].battle.length,2);
 const u=setup();give(u,0,'battle',[GEMINI]);assert.ok(e.card(GEMINI).cost>5);give(u,1,'battle',[GEN]);give(u,1,'hand',[N,F]);attack(u);assert.equal(u.players[1].hand.length,0);assert.equal(u.players[1].grave.length,2);
});
test('entering tapped does not count as becoming tapped, including the entry-or-tap trigger',()=>{
 const s=setup();give(s,1,'battle',['dmr02-s03']);play(s,TAK);assert.equal(s.players[0].battle[0].tapped,true);assert.equal(s.players[0].hand.length,0);assert.equal(s.decision,null);
 const t=setup();give(t,1,'battle',['dmr02-s03']);give(t,0,'deck',Array(15).fill(N));play(t,LOOT);assert.equal(t.players[0].battle[0].tapped,true);assert.equal(t.players[0].deck.length,12);drain(t);assert.equal(t.players[0].hand.length,1);assert.equal(t.players[0].grave.length,2);
});
test('GG prevents the entry half of a combined trigger but leaves the later tap half available',()=>{
 const s=setup();give(s,1,'battle',[GG]);s.players[1].battle[0].under=[inst(N)];const uid=play(s,LOOT);assert.equal(s.players[0].hand.length,0);assert.equal(s.decision,null);s.players[0].battle[0].entered=0;attack(s,uid);assert.equal(s.players[0].hand.length,3);assert.equal(s.decision.task.op,'discardSelect');drain(s);assert.equal(s.players[0].hand.length,1);
});
