import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain,GEN,PRESETS} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {scanStandardCandidates} from '../tools/scan-standard-candidates.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {STANDARD459_DECKS} from '../tools/fixtures/standard459.mjs';

const rows=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-459.json',import.meta.url))).cards;
const N='dm01-108',W='dm01-083',D='dm01-090',F='dm01-097',MULTI='dmr12-055',SLASH='dmr02-039',DOP='dm23rp2-063',DOLL='dmrp15-053',VOB='dmrp06-074',HANA='dm23bd4-007',SPELL='dm25rp2-067',JACK='dmex09-019';
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const put=(s,p,id)=>{const x=inst(id);s.players[p].battle.push(x);return x;};
const field=(p=0)=>{const s=setup();s.active=p;for(const q of [0,1]){give(s,q,'hand',[]);give(s,q,'deck',Array(30).fill(N));}return s;};
function choose(s,uid){assert.equal(s.decision.type,'extended');act(s,'extended',a=>s.decision.choices[a.choice].value?.uid===uid);}
function play(s,p,id){s.active=p;s.phase='main';const x=inst(id);s.players[p].hand.push(x);act(s,'play',a=>a.uid===x.uid&&!a.alternative);return x;}
function resolveEach(s,wanted){for(let n=0;s.decision&&s.winner===null;n++){assert.ok(n<200);if(s.decision.type==='extended'&&s.decision.task.op==='g34_EachPlayer459'){const p=s.decision.player,uid=wanted[p];assert.ok(s.decision.choices.every(c=>c.value.p===p));assert.ok(!s.decision.choices.some(c=>c.value===null));choose(s,uid);}else e.step(s,e.chooseAI(s));}}
function schedule(s,p,def){s.extTasks=[{...def,op:'g34_'+def.op,p,source:DOP}];s.phase='main';act(s,'toAttack');}

test('ten complete official cards, legal forties, printed stats, restrictions and actual art',()=>{
 assert.equal(rows.length,10);const cat=createCatalogue(snapshot,data.cards,details);
 for(const r of rows){const d=details.cards.find(x=>x.id===r.id);assert.deepEqual(standardCardSpec(d,{phase:459}),r.spec);assert.throws(()=>standardCardSpec(d,{phase:458}));assert.ok(r.verification.facesMatched);assert.equal(CARD_IMAGES[r.id],r.image);assert.equal(e.card(r.id).limit,4);assert.equal(e.card(r.id).manaValue,1);assert.equal(e.card(r.id).cost,r.faces[0].cost);assert.equal(e.card(r.id).power,+r.faces[0].powerText);assert.ok(cat.get(r.id).supported);const bad=structuredClone(d);bad.faces[0].abilityText+='\n未知の能力。';assert.throws(()=>standardCardSpec(bad,{phase:459}));}
 for(const deck of STANDARD459_DECKS){assert.deepEqual(e.validateDeck(deck),[]);assert.equal(cat.coverage(deck).unsupported,0);assert.equal(deck.cards.reduce((n,c)=>n+c.count,0),40);}
});
test('previous pinned definitions remain intact and no partly understood card is enabled',()=>{
 for(const phase of [187,216,244,400,437,440,441,444,450,454,455,456,457,458])for(const r of JSON.parse(fs.readFileSync(new URL('../tools/support-phase-'+phase+'.json',import.meta.url))).cards)assert.deepEqual(standardCardSpec(details.cards.find(c=>c.id===r.id),{phase:459}),standardCardSpec(details.cards.find(c=>c.id===r.id),{phase:458}));
 assert.equal(scanStandardCandidates(details.cards,data.cards,{phase:459}).candidates.length,0);
 for(const id of ['dm23ex1-054','dm25rp1-026','dmr19-s06'])assert.throws(()=>standardCardSpec(details.cards.find(c=>c.id===id),{phase:459}));
});

for(const r of rows)for(const p of [0,1])test(r.name+' lets each player choose only their own card '+p,()=>{
 let s=field(p);for(const q of [0,1]){give(s,q,'hand',[N,W]);put(s,q,N);put(s,q,W);}
 const rule=r.spec.g34Tasks[0],origin=rule.origin,targets=s.players.map(q=>q[origin][0]),before=physical(s),source=play(s,p,r.id);
 assert.equal(s.decision.task.op,'g34_EachPlayer459');assert.equal(s.decision.player,p);choose(s,targets[p].uid);
 assert.equal(s.decision.player,1-p);assert.ok(s.players.every((q,i)=>q[origin].some(x=>x.uid===targets[i].uid)));
 assert.ok(!JSON.stringify(e.observation(s,p).decision).includes(targets[1-p].cardId));
 s=JSON.parse(JSON.stringify(s));choose(s,targets[1-p].uid);drain(s);
 for(const q of [0,1]){assert.ok(!s.players[q][origin].some(x=>x.uid===targets[q].uid));assert.ok(s.players[q][rule.to==='deckTop'?'deck':rule.to].some(x=>x.uid===targets[q].uid));if(rule.to==='deckTop')assert.equal(s.players[q].deck[0].uid,targets[q].uid);}
 assert.deepEqual(physical(s),[...before,source.uid].sort());
});
for(const r of rows)test(r.name+' does as much as possible when the opposing source zone is empty',()=>{
 const s=field(),rule=r.spec.g34Tasks[0],target=rule.origin==='battle'?put(s,0,N):(give(s,0,'hand',[N]),s.players[0].hand[0]);
 const x=play(s,0,r.id);resolveEach(s,[target.uid,null]);assert.equal(s.decision,null);assert.ok(s.players[0][rule.to==='deckTop'?'deck':rule.to].includes(target));if(rule.origin==='battle'&&e.card(r.id).type==='creature')assert.ok(s.players[0].battle.includes(x));
});
for(const r of rows.filter(r=>r.spec.g34Tasks[0].origin==='hand'))test(r.name+' creates no choice when both hands are empty',()=>{const s=field();play(s,0,r.id);assert.equal(s.decision,null);assert.equal(s.players[0].hand.length,0);assert.equal(s.players[1].hand.length,0);});

test('the turn player chooses first even if the other player controls the effect',()=>{const s=field(0);give(s,0,'hand',[N]);give(s,1,'hand',[W]);const ids=s.players.map(p=>p.hand[0].uid);schedule(s,1,{op:'EachPlayer459',origin:'hand',to:'grave',discard:true});assert.equal(s.decision.player,0);choose(s,ids[0]);assert.equal(s.decision.player,1);assert.ok(s.players[0].hand.some(x=>x.uid===ids[0]));choose(s,ids[1]);drain(s);assert.equal(s.players[0].grave.length,1);assert.equal(s.players[1].grave.length,1);});
test('destruction is a single batch after both choices, including when the source destroys itself',()=>{const s=field(),enemy=put(s,1,N),x=play(s,0,DOP),before=physical(s);choose(s,x.uid);assert.ok(s.players[0].battle.includes(x));assert.ok(s.players[1].battle.includes(enemy));choose(s,enemy.uid);drain(s);assert.ok(s.players[0].grave.includes(x));assert.ok(s.players[1].grave.includes(enemy));assert.deepEqual(physical(s),before);});
test('own choices can select Just Diver creatures and ignore the opponent forced-target restriction',()=>{const s=field(),x=put(s,0,W),y=put(s,1,W);put(s,1,'dm23rp3-013');for(const z of [x,y])z.g34Grants=[{turn:s.turn,untargetable:true}];play(s,0,DOP);resolveEach(s,[x.uid,y.uid]);assert.ok(s.players[0].grave.includes(x));assert.ok(s.players[1].grave.includes(y));});
test('sealed cards are excluded from the creature choices',()=>{const s=field(),x=put(s,0,W),sealed=put(s,0,N),y=put(s,1,W);sealed.sealed=1;s.players[0].seals.push({...inst(N),faceDown:true,sealOf:sealed.uid});play(s,0,DOP);assert.ok(!s.decision.choices.some(c=>c.value.uid===sealed.uid));resolveEach(s,[x.uid,y.uid]);assert.ok(s.players[0].battle.includes(sealed));});
test('destruction protection and return-to-hand replacement keep their native meaning',()=>{const s=field(),x=put(s,0,N),y=put(s,1,DOLL);s.extLimits=[{kind:'g409AttackEffect',player:0,ref:{uid:x.uid,incarnation:0},source:DOP,effect:'destroySafe',expires:'end',who:0}];play(s,0,DOP);resolveEach(s,[x.uid,y.uid]);assert.ok(s.players[0].battle.includes(x));assert.ok(s.players[1].hand.includes(y));assert.ok(!s.players[1].grave.includes(y));});
test('an evolved selected creature moves with every underlying physical card',()=>{const s=field(),x=put(s,0,'dm04-001'),base=inst(N),y=put(s,1,N);x.under=[base];const old=physical(s),source=play(s,0,DOP);resolveEach(s,[x.uid,y.uid]);assert.ok(s.players[0].grave.includes(base));assert.ok(s.players[0].grave.includes(x));assert.deepEqual(physical(s),[...old,source.uid].sort());});
test('mana sending is not destruction and does not apply Dourappa destroy-to-hand',()=>{const s=field(),x=put(s,0,DOLL),y=put(s,1,N);play(s,0,HANA);resolveEach(s,[x.uid,y.uid]);assert.ok(s.players[0].mana.includes(x));assert.ok(!s.players[0].hand.includes(x));assert.ok(s.players[1].mana.includes(y));});
test('each player can put a multicolor hand card into mana tapped',()=>{const s=field();give(s,0,'hand',[MULTI]);give(s,1,'hand',[MULTI]);const xs=s.players.map(p=>p.hand[0]);play(s,0,MULTI);resolveEach(s,xs.map(x=>x.uid));for(const p of [0,1]){assert.ok(s.players[p].mana.includes(xs[p]));assert.equal(xs[p].tapped,true);}});
test('returning a hand card to deck top neither discards it nor shuffles the remaining deck',()=>{const s=field();for(const p of [0,1])give(s,p,'hand',[N]);const xs=s.players.map(p=>p.hand[0]),decks=s.players.map(p=>p.deck.map(x=>x.uid));play(s,0,SLASH);resolveEach(s,xs.map(x=>x.uid));for(const p of [0,1]){assert.deepEqual(s.players[p].deck.map(x=>x.uid),[xs[p].uid,...decks[p]]);assert.equal(s.players[p].discardedThisTurn||false,false);}});
for(const r of rows.filter(r=>r.faces[0].typeText==='クリーチャー'&&r.faces[0].cost<=5))test(r.name+' entry is blanked by Genmu',()=>{const s=field();put(s,1,GEN);give(s,0,'hand',[N]);give(s,1,'hand',[W]);play(s,0,r.id);assert.equal(s.decision,null);assert.equal(s.players[0].hand.length,1);assert.equal(s.players[1].hand.length,1);});

for(const id of [SPELL,HANA])test(id+' uses its real S Trigger and offers both players their own creatures',()=>{
 const s=field(1),x=put(s,0,W),attacker=put(s,1,N);give(s,0,'shields',[id]);s.phase='attack';act(s,'attack',a=>a.uid===attacker.uid&&a.target==='player');act(s,'noBlock');act(s,'useTrigger');if(s.decision?.type==='triggerOrder')act(s,'orderTrigger');assert.equal(s.decision.task.op,'g34_EachPlayer459');assert.equal(s.decision.player,1);resolveEach(s,[x.uid,attacker.uid]);assert.ok(s.players[0][id===SPELL?'grave':'mana'].includes(x));assert.ok(s.players[1][id===SPELL?'grave':'mana'].includes(attacker));assert.equal(s.winner,null);
});
test('Jack retains the printed Nature Kirifudash payment',()=>{assert.equal(e.card(JACK).kirifudaDash,3);assert.deepEqual(e.card(JACK).g402DashColors,['自然']);});

for(const owner of [0,1])for(const active of [0,1])test('discard replacement keeps effect ownership and turn ownership '+owner+' '+active,()=>{const s=field(active);give(s,0,'hand',['dmr02-s03']);give(s,1,'hand',['dmr02-s03']);const xs=s.players.map(p=>p.hand[0]);schedule(s,owner,{op:'EachPlayer459',origin:'hand',to:'grave',discard:true});choose(s,xs[active].uid);choose(s,xs[1-active].uid);assert.equal(s.decision.task.op,'discardChosen');assert.equal(s.decision.player,1-owner);act(s,'extended',a=>s.decision.choices[a.choice].value===true);drain(s);assert.ok(s.players[owner].grave.includes(xs[owner]));assert.ok(s.players[1-owner].battle.includes(xs[1-owner]));});
for(const active of [0,1])test('Baiken may replace a self-chosen discard only on the opponent turn '+active,()=>{const s=field(active);give(s,0,'hand',['dm29-s02']);give(s,1,'hand',['dm29-s02']);const xs=s.players.map(p=>p.hand[0]);schedule(s,active,{op:'EachPlayer459',origin:'hand',to:'grave',discard:true});choose(s,xs[active].uid);choose(s,xs[1-active].uid);assert.equal(s.decision.task.op,'discardChosen');assert.equal(s.decision.player,1-active);act(s,'extended',a=>s.decision.choices[a.choice].value===true);for(let n=0;s.decision;n++){assert.ok(n<100);const skip=e.getLegalActions(s).find(a=>a.kind==='extended'&&s.decision.choices[a.choice].value===null);e.step(s,skip||e.chooseAI(s));}assert.ok(s.players[active].grave.includes(xs[active]));assert.ok(s.players[1-active].battle.includes(xs[1-active]));});
test('hand-to-deck does not allow a Baiken discard replacement',()=>{const s=field(1);give(s,0,'hand',['dm29-s02']);give(s,1,'hand',[N]);const xs=s.players.map(p=>p.hand[0]);play(s,1,SLASH);resolveEach(s,xs.map(x=>x.uid));assert.equal(s.players[0].deck[0].uid,xs[0].uid);assert.ok(!s.players[0].battle.includes(xs[0]));});
for(const p of [0,1])test('Jack is actually summoned using Nature Kirifudash before its joint mana choice '+p,()=>{const s=field(p),source=inst(JACK),attacker=put(s,p,N),enemy=put(s,1-p,W);s.players[p].hand.push(source);s.phase='attack';act(s,'attack',a=>a.uid===attacker.uid&&a.target==='player');act(s,'noBlock');assert.equal(s.decision.task.op,'g14_DashDeclare');act(s,'extended',a=>s.decision.choices[a.choice].value===true);assert.equal(s.decision.task.op,'g14_DashResolve');act(s,'extended',a=>s.decision.choices[a.choice].value!==null);resolveEach(s,p===0?[attacker.uid,enemy.uid]:[enemy.uid,attacker.uid]);assert.ok(s.players[p].battle.includes(source));assert.ok(s.players[p].mana.includes(attacker));assert.ok(s.players[1-p].mana.includes(enemy));assert.equal(s.players[p].mana.filter(x=>x.tapped).length,3);});
test('AI inspection is pure and does not use unseen opposing hand and deck identities',()=>{for(const r of rows){const s=field(),x=put(s,0,r.id);give(s,1,'hand',[W,D]);s.phase='attack';const before=JSON.stringify(s),action=e.chooseAI(s);e.rankHeuristicActions(s);e.analyzeAI(s);assert.equal(JSON.stringify(s),before);const copy=JSON.parse(before);for(const zone of ['hand','deck','shields'])copy.players[1][zone].forEach(y=>y.cardId=GEN);assert.deepEqual(e.chooseAI(copy),action);assert.ok(x);}});
for(const [i,deck]of STANDARD459_DECKS.entries())test('legal forty CPU game, saved continuation and 80 conserved physical cards '+i,()=>{let s=e.createGame([deck,PRESETS[i]],{seed:45901+i,first:i}),saved=false;const old=physical(s);while(s.winner===null&&s.actions<1800&&s.turn<160){e.step(s,e.chooseAI(s));assert.deepEqual(physical(s),old);if(!saved&&s.actions>20){s=JSON.parse(JSON.stringify(s));saved=true;}}assert.ok(saved);assert.notEqual(s.winner,null);});
