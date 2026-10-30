import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain,GEN,GG,PRESETS} from './target-fixture.mjs';import {standardCardSpec} from '../tools/standard-card-spec.mjs';import {createCatalogue} from '../dist/catalogue.js';import {CARD_IMAGES} from '../dist/card-images.js';import {STANDARD193_DECKS} from '../tools/fixtures/standard193.mjs';
const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-193.json',import.meta.url))),N='dm01-108',F='dm01-097',BLOCK='dm01-076',BIG='dmx22b-012',THUNDER='dmr12-036',PRISM='dmr22-029',BUKU='dmrp08-049',WOLF='dmr06-003',KASA='dm23rp3-051',MESS='dm26rp3-054',LAT='dm29-038',SYNC='dm23rp3-013',TITAN='dm28-s04',TAK='dmrp04s-069',ROMA='dmc58-003',BASA='dmrp21-059',PORK='dmr13-056',NINGYO='dmrp22-033';
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function pick(s,v){act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===v);}
function play(s,id){const x=inst(id);s.players[s.active].hand.push(x);act(s,'play',a=>a.uid===x.uid&&!a.alternative);return x.uid;}
function attack(s,uid=s.players[s.active].battle[0].uid,target='player'){s.phase='attack';act(s,'attack',a=>a.uid===uid&&a.target===target);}
function wolf(s,ids){give(s,0,'battle',[WOLF]);give(s,1,'battle',ids);attack(s);}
test('seven official full definitions, images and limits are covered by a legal forty-card deck',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);assert.equal(m.cards.length,7);for(const row of m.cards){assert.deepEqual(row.faces,details.cards.find(x=>x.id===row.id).faces);assert.deepEqual(row.spec,standardCardSpec(details.cards.find(x=>x.id===row.id),{phase:193}));assert.equal(e.card(row.id).supportBatch,'phase-193');assert.ok(row.verification.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(CARD_IMAGES[row.id],row.image);assert.equal(e.card(row.id).limit,m.regulationVerification.limits[row.id]);assert.ok(registry.get(row.id).supported);assert.ok(STANDARD193_DECKS[0].cards.some(x=>x.id===row.id));}assert.deepEqual(e.validateDeck(STANDARD193_DECKS[0]),[]);assert.equal(STANDARD193_DECKS[0].cards.reduce((n,x)=>n+x.count,0),40);assert.equal(registry.coverage(STANDARD193_DECKS[0]).unsupported,0);
});
for(const row of m.cards)test(row.name+': complete entry, attack or block effect preserves card identities',()=>{
 const s=setup();give(s,1,'battle',[N,F,BLOCK]);if(row.spec.g34Attack){give(s,0,'battle',[row.id]);attack(s);}else if(row.spec.g178Block){give(s,0,'battle',[row.id]);s.active=1;attack(s);act(s,'block');}else play(s,row.id);const ids=physical(s);assert.equal(s.decision.task.op,'g34_Select');drain(s);assert.deepEqual(physical(s),ids);assert.equal(s.decision,null);assert.equal(s.winner,null);
});
test('classifier rejects unknown trailing clauses or conditional destruction and preserves every prior phase',()=>{
 for(const row of m.cards){const d=structuredClone(details.cards.find(x=>x.id===row.id));assert.throws(()=>standardCardSpec(d,{phase:192}));d.faces[0].abilityText+='\n未知の能力';assert.throws(()=>standardCardSpec(d,{phase:193}));}const d=structuredClone(details.cards.find(x=>x.id===THUNDER));for(const text of['相手のクリーチャーを2体まで選び、タップする。そうしたらカードを2枚引く。','相手のコストが一番大きいクリーチャーを2体破壊する。','相手のクリーチャーを2体選ぶ。それらをタップしてもよい。']){d.faces[0].abilityText=text;assert.throws(()=>standardCardSpec(d,{phase:193}));}for(let phase=168;phase<=192;phase++)for(const row of JSON.parse(fs.readFileSync(new URL('../tools/support-phase-'+phase+'.json',import.meta.url))).cards)assert.deepEqual(standardCardSpec(details.cards.find(x=>x.id===row.id),{phase}),row.spec);
});
test('multiple taps commit together, omit duplicate choices and survive saving between selections',()=>{
 let s=setup();give(s,1,'battle',[N,F,BLOCK]);const uids=s.players[1].battle.map(x=>x.uid);play(s,THUNDER);const ids=physical(s);assert.match(s.decision.title,/2体まで/);pick(s,uids[0]);assert.ok(s.players[1].battle.every(x=>!x.tapped));assert.ok(!s.decision.choices.some(x=>x.value?.uid===uids[0]));s=JSON.parse(JSON.stringify(s));pick(s,uids[1]);assert.ok(s.players[1].battle[0].tapped);assert.ok(s.players[1].battle[1].tapped);assert.equal(s.players[1].battle[2].tapped,false);assert.deepEqual(physical(s),ids);
});
test('up-to choices permit none, one, two or all three, and finish with an empty battlefield',()=>{
 for(let n=0;n<=3;n++){const s=setup();give(s,1,'battle',[N,F,BLOCK,N]);const uids=s.players[1].battle.map(x=>x.uid);play(s,MESS);for(let i=0;i<n;i++)pick(s,uids[i]);if(n<3)pick(s,null);assert.equal(s.players[1].battle.filter(x=>x.tapped).length,n);assert.equal(s.decision,null);}const t=setup();play(t,THUNDER);assert.equal(t.decision,null);
});
test('already-tapped targets remain legal but do not trigger another tap ability',()=>{
 const s=setup();give(s,1,'battle',[TAK,N]);s.players[1].battle[0].tapped=true;const uid=s.players[1].battle[0].uid;play(s,THUNDER);assert.ok(s.decision.choices.some(x=>x.value?.uid===uid));pick(s,uid);pick(s,null);drain(s);assert.equal(s.players[1].hand.length,0);assert.equal(s.players[1].battle[0].tapped,true);
});
test('tapping several creatures invokes their actual owners abilities and separate first-tap histories',()=>{
 const s=setup();give(s,1,'battle',[TITAN,TAK]);const uids=s.players[1].battle.map(x=>x.uid);play(s,THUNDER);pick(s,uids[0]);pick(s,uids[1]);drain(s);assert.equal(s.players[1].battle[0].tapped,false);assert.equal(s.players[1].battle[1].tapped,true);assert.equal(s.players[1].hand.length,1);assert.equal(s.players[0].hand.length,0);
 const t=setup();give(t,1,'battle',[TITAN,TITAN]);for(let round=0;round<2;round++){play(t,THUNDER);for(const x of t.players[1].battle)pick(t,x.uid);drain(t);assert.ok(t.players[1].battle.every(x=>x.tapped===(round===1)));}
});
test('target selection respects untargetability, seals, Just Diver and forced targets',()=>{
 const s=setup();give(s,1,'battle',['dmrp01-041',SYNC,N,F]);s.players[1].battle[3].sealed=true;s.players[1].seals=[{...inst(N),faceDown:true,sealOf:s.players[1].battle[3].uid}];play(s,THUNDER);assert.deepEqual(s.decision.choices.filter(x=>x.value).map(x=>x.cardId),[SYNC]);pick(s,s.players[1].battle[1].uid);assert.deepEqual(s.decision.choices.filter(x=>x.value).map(x=>x.cardId),[N]);pick(s,s.players[1].battle[2].uid);assert.equal(s.players[1].battle[0].tapped,false);assert.equal(s.players[1].battle[1].tapped,true);assert.equal(s.players[1].battle[2].tapped,true);
 const t=setup();t.active=1;play(t,'dm24rp1-061');drain(t);t.active=0;play(t,THUNDER);assert.equal(t.decision,null);assert.equal(t.players[1].battle[0].tapped,false);
});
test('CPU prioritizes untapped targets and finishes without wasting optional taps on an entirely tapped field',()=>{
 const s=setup();give(s,1,'battle',[BIG,N,F]);s.players[1].battle[0].tapped=true;play(s,THUNDER);let a=e.chooseAI(s);assert.notEqual(s.decision.choices[a.choice].value?.uid,s.players[1].battle[0].uid);e.step(s,a);drain(s);assert.ok(s.players[1].battle.every(x=>x.tapped));
 const t=setup();give(t,1,'battle',[N,F]);t.players[1].battle.forEach(x=>x.tapped=true);play(t,THUNDER);assert.equal(t.decision.choices[e.chooseAI(t).choice].value,null);drain(t);assert.equal(t.decision,null);
});
test('CPU can spend one forced already-tapped choice to reach an untapped second target',()=>{
 const s=setup();give(s,1,'battle',[SYNC,N]);s.players[1].battle[0].tapped=true;play(s,THUNDER);const a=e.chooseAI(s);assert.equal(s.decision.choices[a.choice].value?.uid,s.players[1].battle[0].uid);e.step(s,a);drain(s);assert.ok(s.players[1].battle.every(x=>x.tapped));
});
test('the mandatory block tap resolves before battle and may select the already-attacking creature',()=>{
 const s=setup();give(s,0,'battle',[LAT]);give(s,1,'battle',[N,F]);const first=s.players[1].battle[0].uid,next=s.players[1].battle[1].uid;s.active=1;attack(s,first);act(s,'block');assert.equal(s.players[1].battle.length,2);assert.ok(!s.decision.choices.some(x=>!x.value));pick(s,next);drain(s);assert.equal(s.players[1].battle[0].uid,next);assert.equal(s.players[1].battle[0].tapped,true);assert.equal(s.players[0].battle.length,1);
 const t=setup();give(t,0,'battle',[LAT]);give(t,1,'battle',[N]);t.active=1;attack(t);act(t,'block');pick(t,t.players[1].battle[0].uid);drain(t);assert.equal(t.players[1].battle.length,0);
});
test('S-trigger multi-tap prevents a later attack while leaving the completed shield break intact',()=>{
 const s=setup();give(s,0,'battle',[N,F,N]);give(s,1,'shields',[THUNDER]);const [attacker,next,third]=s.players[0].battle.map(x=>x.uid);attack(s,attacker);act(s,'noBlock');act(s,'useTrigger');assert.equal(s.decision.player,1);pick(s,attacker);pick(s,next);drain(s);assert.equal(s.active,0);assert.equal(s.players[1].shields.length,0);assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===next));assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===third));
});
test('mana placement filters by current power and moves evolution stacks completely',()=>{
 const s=setup();give(s,1,'battle',[N,F,ROMA]);s.players[1].battle[0].powerModifiers=[{amount:2000}];s.players[1].battle[2].under=[inst(N)];const first=s.players[1].battle[1].uid,top=s.players[1].battle[2].uid,base=s.players[1].battle[2].under[0].uid;play(s,BUKU);assert.deepEqual(s.decision.choices.filter(x=>x.value).map(x=>x.cardId),[F,ROMA]);const ids=physical(s);pick(s,top);assert.equal(s.players[1].battle.length,3);pick(s,first);drain(s);assert.ok([first,top,base].every(uid=>s.players[1].mana.some(x=>x.uid===uid)));assert.equal(s.players[1].battle.length,1);assert.deepEqual(physical(s),ids);
});
test('Wolf removes up to three eligible creatures atomically, evaluates current power and CPU prefers expensive threats',()=>{
 const s=setup();give(s,0,'battle',[WOLF]);give(s,1,'battle',[N,BASA,BIG,F]);s.players[1].battle[3].powerModifiers=[{amount:5000}];attack(s);const expensive=s.players[1].battle[1].uid;assert.equal(s.decision.choices[e.chooseAI(s).choice].value?.uid,expensive);assert.ok(!s.decision.choices.some(x=>[BIG,F].includes(x.cardId)));pick(s,expensive);assert.equal(s.players[1].battle.length,4);const small=s.players[1].battle[0].uid;pick(s,small);assert.equal(s.decision.type,'block');drain(s);assert.ok(s.players[1].grave.some(x=>x.uid===expensive));assert.ok(s.players[1].grave.some(x=>x.uid===small));
});
test('simultaneous destruction runs both death draws only after the selected creatures leave together',()=>{
 const s=setup();wolf(s,[BASA,PORK]);const uids=s.players[1].battle.map(x=>x.uid),ids=physical(s);pick(s,uids[0]);assert.equal(s.players[1].battle.length,2);assert.equal(s.players[1].hand.length,0);pick(s,uids[1]);assert.equal(s.players[1].battle.length,0);drain(s);assert.equal(s.players[1].hand.length,4);assert.ok(uids.every(uid=>s.players[1].grave.some(x=>x.uid===uid)));assert.deepEqual(physical(s),ids);
});
test('mana redirection to the grave does not turn a non-destruction move into a death trigger',()=>{
 const s=setup();give(s,0,'battle',[NINGYO]);give(s,1,'battle',[F,BASA]);give(s,0,'shields',[BUKU]);s.players[1].battle[1].powerModifiers=[{amount:-2000}];const uid=s.players[1].battle[1].uid;s.active=1;attack(s);act(s,'noBlock');act(s,'useTrigger');pick(s,uid);pick(s,null);drain(s);assert.ok(s.players[1].grave.some(x=>x.uid===uid));assert.equal(s.players[1].hand.length,0);
});
test('Genmu ignores the spell, a cost-six entry remains active, and GG does not suppress a block trigger',()=>{
 const s=setup();give(s,1,'battle',[GEN,N]);play(s,THUNDER);assert.equal(s.decision,null);assert.ok(s.players[1].battle.every(x=>!x.tapped));
 const t=setup();give(t,1,'battle',[GEN,N]);play(t,PRISM);pick(t,t.players[1].battle[1].uid);pick(t,null);assert.equal(t.players[1].battle[1].tapped,true);
 const u=setup();give(u,0,'battle',[LAT]);give(u,1,'battle',[N,GG]);u.players[1].battle[1].under=[inst(N)];u.active=1;attack(u,u.players[1].battle[0].uid);act(u,'block');pick(u,u.players[1].battle[1].uid);drain(u);assert.equal(u.players[1].battle[0].cardId,GG);assert.equal(u.players[1].battle[0].tapped,true);
});
test('the new forty-card CPU deck finishes with eighty conserved identities and saved continuation',()=>{
 let s=e.createGame([STANDARD193_DECKS[0],PRESETS[0]],{seed:19301,first:0}),saved=false;const ids=physical(s);while(s.winner===null&&s.actions<1800&&s.turn<160){e.step(s,e.chooseAI(s));assert.deepEqual(physical(s),ids);if(!saved&&s.actions>20){s=JSON.parse(JSON.stringify(s));saved=true;}}assert.ok(saved);assert.notEqual(s.winner,null);assert.equal(ids.length,80);
});
