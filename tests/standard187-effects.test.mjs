import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain,GEN,GG,PRESETS} from './target-fixture.mjs';import {standardCardSpec} from '../tools/standard-card-spec.mjs';import {createCatalogue} from '../dist/catalogue.js';import {CARD_IMAGES} from '../dist/card-images.js';import {STANDARD187_DECKS} from '../tools/fixtures/standard187.mjs';
const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-187.json',import.meta.url))),N='dm01-108',F='dm01-097',L='dm01-075',BIG='dmx22b-012',EVO='dmr12-s02',DE='dm01-027',HAND='dm25ex2-093',CHASER='dmr05-093',NEKO='dmr19-058',SUMMER='dmr08-027',MOON='dmr10-012',WATER='dmrp22-058',LAF='dmrp15-085',GOME='dm24ex1-064',CARN='dmrp02-079',SIX='dmrp05-072',FARM='dm24rp2-075',DELO='dmx15-027',GAL='dmrp10-049';
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function pick(s,v){act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===v);}
function play(s,id){s.players[s.active].hand.push(inst(id));const uid=s.players[s.active].hand.at(-1).uid;act(s,'play',a=>a.uid===uid&&!a.alternative);return uid;}
function kill(s,p,uid){s.active=1-p;s.phase='main';play(s,DE);act(s,'effect',a=>a.targets.some(x=>x.uid===uid));}
function end(s){s.phase='attack';act(s,'endTurn');}
test('forty complete verified definitions and images are covered by five legal forty-card decks',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);assert.equal(m.cards.length,40);for(const row of m.cards){assert.deepEqual(row.faces,details.cards.find(x=>x.id===row.id).faces);assert.deepEqual(row.spec,standardCardSpec(details.cards.find(x=>x.id===row.id),{phase:187}));assert.equal(e.card(row.id).supportBatch,'phase-187');assert.ok(row.verification.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(e.card(row.id).limit,m.regulationVerification.limits[row.id]);assert.equal(CARD_IMAGES[row.id],row.image);assert.ok(registry.get(row.id).supported);assert.ok(STANDARD187_DECKS.some(d=>d.cards.some(x=>x.id===row.id)));}for(const d of STANDARD187_DECKS){assert.deepEqual(e.validateDeck(d),[]);assert.equal(d.cards.reduce((n,x)=>n+x.count,0),40);assert.equal(registry.coverage(d).unsupported,0);}
});
for(const row of m.cards)test(row.name+': complete execution preserves physical cards across the applicable event',()=>{
 let s=setup();give(s,0,'battle',[N,F]);give(s,1,'battle',[N,F,EVO]);s.players[1].battle[2].under=[inst(N)];const uid=play(s,row.id),ids=physical(s);drain(s);assert.deepEqual(physical(s),ids);if(row.spec.g34Attack){s.players[0].battle.find(x=>x.uid===uid).entered=0;s.phase='attack';act(s,'attack',a=>a.uid===uid&&a.target==='player');drain(s);assert.deepEqual(physical(s),ids);}if(row.spec.g174End){end(s);drain(s);assert.deepEqual(physical(s),ids);}if(row.spec.g172Death){kill(s,0,uid);drain(s);assert.equal(physical(s).length,ids.length+1);}assert.equal(s.winner,null);assert.equal(s.decision,null);
});
test('parser distinguishes the choosing player, rejects unknown conditions and preserves all previous phases',()=>{
 for(const row of m.cards){const d=structuredClone(details.cards.find(x=>x.id===row.id));assert.throws(()=>standardCardSpec(d,{phase:186}));d.faces[0].abilityText+='\n未知の能力';assert.throws(()=>standardCardSpec(d,{phase:187}));}
 const d=structuredClone(details.cards.find(x=>x.id===HAND));for(const text of['相手は自身のクリーチャーを１体選び、破壊してもよい。そうしたらカードを２枚引く。','相手は自身のコストが一番大きいクリーチャーを１体選び、破壊する。']){d.faces[0].abilityText=text;assert.throws(()=>standardCardSpec(d,{phase:187}));}
 for(let phase=168;phase<=186;phase++)for(const row of JSON.parse(fs.readFileSync(new URL('../tools/support-phase-'+phase+'.json',import.meta.url))).cards)assert.deepEqual(standardCardSpec(details.cards.find(x=>x.id===row.id),{phase}),row.spec);
});
test('the affected opponent chooses its own creature and CPU preserves expensive creatures',()=>{
 const s=setup();give(s,1,'battle',[N,BIG]);const uid=s.players[1].battle[0].uid;play(s,HAND);assert.equal(s.active,0);assert.equal(s.decision.player,1);assert.equal(s.decision.task.controller,0);assert.ok(e.getLegalActions(s).every(a=>a.player===1));const a=e.chooseAI(s);assert.equal(s.decision.choices[a.choice].value.uid,uid);pick(s,uid);drain(s);assert.ok(s.players[1].grave.some(x=>x.uid===uid));assert.ok(s.players[1].battle.some(x=>x.cardId===BIG));
});
test('own selection can choose an untargetable creature without being forced to pick Synchro',()=>{
 const s=setup();give(s,1,'battle',['dmrp01-041','dm23rp3-013',N]);play(s,HAND);const uid=s.players[1].battle[0].uid;assert.ok(s.decision.choices.some(x=>x.value?.uid===uid));assert.equal(s.decision.choices.filter(x=>x.value).length,3);pick(s,uid);drain(s);assert.ok(s.players[1].grave.some(x=>x.uid===uid));
});
test('untapped-only choices exclude tapped, sealed and noncreature cards and an empty legal set is a no-op',()=>{
 const s=setup();give(s,1,'battle',[N,F,N,'dmsd20-016']);s.players[1].battle[0].tapped=true;const sealed=s.players[1].battle[2],seal={...inst(N),faceDown:true,sealOf:sealed.uid};s.players[1].seals=[seal];sealed.sealed=true;const uid=s.players[1].battle[1].uid;play(s,CHASER);assert.deepEqual(s.decision.choices.map(x=>x.value.uid),[uid]);pick(s,uid);drain(s);assert.ok(s.players[1].grave.some(x=>x.uid===uid));assert.ok(s.players[1].battle.some(x=>x.uid===sealed.uid));
 const t=setup();give(t,1,'battle',[N]);t.players[1].battle[0].tapped=true;play(t,CHASER);assert.equal(t.decision,null);assert.equal(t.players[1].grave.length,0);
});
test('Moon Lobby holds both choices until complete, prevents duplicate choices, then moves both evolution stacks together',()=>{
 let s=setup();give(s,1,'battle',[N,EVO,F]);s.players[1].battle[1].under=[inst(N)];const first=s.players[1].battle[0].uid,second=s.players[1].battle[1].uid,base=s.players[1].battle[1].under[0].uid;play(s,MOON);assert.match(s.decision.title,/2体/);const ids=physical(s);pick(s,second);assert.equal(s.players[1].battle.length,3);assert.ok(!s.decision.choices.some(x=>x.value?.uid===second));s=JSON.parse(JSON.stringify(s));pick(s,first);drain(s);assert.ok([first,second,base].every(uid=>s.players[1].hand.some(x=>x.uid===uid)));assert.equal(s.players[1].battle.length,1);assert.deepEqual(physical(s),ids);
 const t=setup();give(t,1,'battle',[N]);play(t,MOON);pick(t,t.players[1].battle[0].uid);assert.equal(t.decision,null);assert.equal(t.players[1].hand.length,1);
});
test('evolution-only and civilization choices apply their own filters',()=>{
 const s=setup();give(s,1,'battle',[N,EVO]);s.players[1].battle[1].under=[inst(N)];play(s,WATER);assert.deepEqual(s.decision.choices.map(x=>x.cardId),[EVO]);pick(s,s.players[1].battle[1].uid);drain(s);assert.equal(s.players[1].hand.length,2);
 const t=setup();give(t,1,'battle',[N,L,F]);play(t,'dm19-024');assert.deepEqual(safecards(t).sort(),[N,L].sort());drain(t);
});
function safecards(s){return s.decision.choices.map(x=>x.cardId);}
test('tap effect changes only the chosen opponent creature and completes without moving any card',()=>{
 const s=setup();give(s,1,'battle',[N,F]);const uid=s.players[1].battle[1].uid;play(s,NEKO);const ids=physical(s);assert.equal(s.decision.player,1);pick(s,uid);drain(s);assert.equal(s.players[1].battle[0].tapped,false);assert.equal(s.players[1].battle[1].tapped,true);assert.deepEqual(physical(s),ids);
});
test('self payment is an effect: lack of a self target does not skip the later opposing instruction or draw',()=>{
 const s=setup();give(s,1,'battle',[N]);play(s,CARN);assert.equal(s.decision.player,1);pick(s,s.players[1].battle[0].uid);drain(s);assert.equal(s.players[1].battle.length,0);
 const t=setup();give(t,1,'battle',[]);play(t,SIX);assert.equal(t.decision,null);assert.equal(t.players[0].hand.length,1);
 const u=setup();give(u,0,'battle',[N]);give(u,1,'battle',[N]);const own=u.players[0].battle[0].uid,enemy=u.players[1].battle[0].uid;play(u,CARN);assert.equal(u.decision.player,0);pick(u,own);assert.equal(u.decision.player,1);pick(u,enemy);drain(u);assert.ok(u.players[0].grave.some(x=>x.uid===own));assert.ok(u.players[1].grave.some(x=>x.uid===enemy));
});
test('Gomes performs own mana movement first; Farmer returns control for its optional own mana choice',()=>{
 const s=setup();give(s,0,'battle',[N]);give(s,1,'battle',[F]);const own=s.players[0].battle[0].uid,enemy=s.players[1].battle[0].uid;play(s,GOME);pick(s,own);assert.ok(s.players[0].mana.some(x=>x.uid===own));assert.equal(s.decision.player,1);pick(s,enemy);drain(s);assert.ok(s.players[1].mana.some(x=>x.uid===enemy));
 const t=setup();give(t,0,'battle',[N]);give(t,1,'battle',[F]);const uid=t.players[1].battle[0].uid;play(t,FARM);assert.equal(t.decision.player,1);pick(t,uid);assert.equal(t.decision.player,0);pick(t,null);drain(t);assert.equal(t.players[0].battle.length,1);
});
test('S-trigger controller and affected chooser are reversed correctly, without switching the active turn',()=>{
 const s=setup();give(s,0,'battle',[N,F]);give(s,1,'shields',[HAND]);s.phase='attack';act(s,'attack',a=>a.target==='player');act(s,'noBlock');act(s,'useTrigger');assert.equal(s.active,0);assert.equal(s.decision.player,0);assert.equal(s.decision.task.controller,1);const uid=s.players[0].battle[1].uid;pick(s,uid);drain(s);assert.ok(s.players[0].grave.some(x=>x.uid===uid));
});
test('own-selected destruction retains enemy-effect control for EX life and does not bypass native replacement',()=>{
 const s=setup();give(s,1,'hand',['dmrp19-030']);s.active=1;act(s,'play');drain(s);const x=s.players[1].battle[0],shield=s.players[1].shields.length;s.active=0;play(s,HAND);assert.equal(s.decision.task.controller,0);pick(s,x.uid);drain(s);assert.ok(s.players[1].battle.some(y=>y.uid===x.uid));assert.equal(s.players[1].shields.length,shield-1);
});
test('a death ability makes the other player choose, while end and attack self-sacrifice may select the source itself',()=>{
 const s=setup();give(s,0,'battle',[GAL]);give(s,1,'battle',[N]);kill(s,0,s.players[0].battle[0].uid);assert.equal(s.decision.player,1);pick(s,s.players[1].battle[0].uid);drain(s);assert.equal(s.players[1].battle.length,0);
 const t=setup();give(t,0,'battle',[DELO]);const uid=t.players[0].battle[0].uid;end(t);pick(t,uid);drain(t);assert.ok(t.players[0].grave.some(x=>x.uid===uid));
 const u=setup();give(u,0,'battle',['dmrp01-043']);const attacker=u.players[0].battle[0].uid;u.phase='attack';act(u,'attack',a=>a.target==='player');pick(u,attacker);drain(u);assert.ok(u.players[0].grave.some(x=>x.uid===attacker));assert.equal(u.players[1].shields.length,5);
});
test('Genmu suppresses appropriate spells and GG leaves death abilities active',()=>{
 const s=setup();give(s,1,'battle',[GEN,N]);play(s,CHASER);assert.equal(s.decision,null);assert.equal(s.players[1].battle.length,2);
 const t=setup();give(t,1,'battle',[GG,N]);t.players[1].battle[0].under=[inst(N)];give(t,0,'battle',[GAL]);kill(t,0,t.players[0].battle[0].uid);assert.equal(t.decision.player,1);drain(t);assert.equal(t.players[1].battle.length,1);
});
test('all five CPU decks finish with eighty conserved cards and saved continuation',()=>{
 for(let i=0;i<5;i++){let s=e.createGame([STANDARD187_DECKS[i],PRESETS[i%PRESETS.length]],{seed:18701+i,first:i%2}),saved=false;const ids=physical(s);while(s.winner===null&&s.actions<1800&&s.turn<160){e.step(s,e.chooseAI(s));assert.deepEqual(physical(s),ids);if(!saved&&s.actions>20){s=JSON.parse(JSON.stringify(s));saved=true;}}assert.ok(saved);assert.notEqual(s.winner,null);assert.equal(ids.length,80);}
});
