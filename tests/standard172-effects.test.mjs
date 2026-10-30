import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain,PRESETS,GEN,GG} from './target-fixture.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {STANDARD172_DECKS} from '../tools/fixtures/standard172.mjs';
const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-172.json',import.meta.url)));
const N='dm01-108',F='dm01-097',DE='dm01-027',BO='dm01-086',MA='dm01-039',AP='dm14-015',BUG='dmr21-092',DRAW='dmrp05-076',LEAVE='dmr23-050',DIS='dmrp19-057';
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function play(s,id){s.players[s.active].hand.push(inst(id));act(s,'play',a=>a.cardId===id&&!a.alternative);}
function pick(s,v){act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===v);}
function remove(s,id,uid){play(s,id);act(s,'effect',a=>a.targets?.some(x=>x.uid===uid));}
function flatten(ts=[]){return ts.flatMap(t=>t.op==='Offer'?flatten(t.defs):[t]);}

test('38 verified whole definitions have official art, current limits and five legal forty-card fixtures',()=>{
 const registry=createCatalogue(snapshot,data.cards,details),covered=new Set(STANDARD172_DECKS.flatMap(d=>d.cards.map(x=>x.id)));assert.equal(m.cards.length,38);
 for(const c of m.cards){assert.ok(covered.has(c.id));assert.deepEqual(c.faces,details.cards.find(x=>x.id===c.id).faces);assert.deepEqual(c.spec,standardCardSpec(details.cards.find(x=>x.id===c.id),{phase:172}));assert.equal(e.card(c.id).supportBatch,'phase-172');assert.equal(e.card(c.id).limit,m.regulationVerification.limits[c.id]);assert.ok(c.verification.facesMatched);assert.match(c.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(CARD_IMAGES[c.id],c.image);assert.ok(registry.get(c.id).supported);}
 for(const d of STANDARD172_DECKS){assert.equal(d.cards.reduce((n,c)=>n+c.count,0),40);assert.deepEqual(e.validateDeck(d),[]);assert.equal(registry.coverage(d).unsupported,0);}
});
for(const row of m.cards)test('summoning and destruction use separate triggers and preserve physical cards: '+row.name,()=>{
 let s=setup();give(s,1,'battle',[N,F]);give(s,1,'hand',[N,F]);play(s,row.id);if(row.spec.effect==='fightOptional')act(s,'skipFight');assert.equal(s.players[0].hand.length,0);assert.equal(s.decision,null);const uid=s.players[0].battle[0].uid;s.active=1;s.phase='main';s.players[1].hand.push(inst(DE));const before=physical(s);act(s,'play',a=>a.cardId===DE);act(s,'effect',a=>a.targets.some(x=>x.uid===uid));s=JSON.parse(JSON.stringify(s));drain(s);assert.equal(s.winner,null);assert.equal(s.decision,null);assert.ok(s.players[0].grave.some(x=>x.uid===uid));assert.deepEqual(physical(s),before);
 const tasks=flatten(row.spec.g172Death||row.spec.g172Leave),draw=tasks.filter(t=>t.op==='Draw').reduce((n,t)=>n+t.n,0),ramp=tasks.filter(t=>t.op==='Ramp').reduce((n,t)=>n+t.n,0);assert.equal(s.players[0].hand.length,draw);assert.equal(s.players[0].mana.length,50+ramp);
});
test('bounce and mana removal fire leave abilities but never destruction-only abilities',()=>{
 for(const row of m.cards)for(const spell of[BO,MA]){const s=setup();give(s,1,'battle',[N,F]);give(s,0,'battle',[row.id]);give(s,1,'hand',[N,F]);s.active=1;const uid=s.players[0].battle[0].uid;remove(s,spell,uid);drain(s);const tasks=flatten(row.spec.g172Leave),draw=tasks.filter(t=>t.op==='Draw').reduce((n,t)=>n+t.n,0),ramp=tasks.filter(t=>t.op==='Ramp').reduce((n,t)=>n+t.n,0);assert.equal(s.players[0].hand.length,draw+(spell===BO?1:0),row.name);assert.equal(s.players[0].mana.length,50+ramp+(spell===MA?1:0),row.name);assert.ok(s.players[0][spell===BO?'hand':'mana'].some(x=>x.uid===uid));}
});
test('new triggers reject unsupported conditions and keep earlier manifests unchanged',()=>{
 for(const row of m.cards){const d=structuredClone(details.cards.find(c=>c.id===row.id));assert.throws(()=>standardCardSpec(d,{phase:171}));d.faces[0].abilityText+='\n未知の能力';assert.throws(()=>standardCardSpec(d,{phase:172}));}
 const d=structuredClone(details.cards.find(c=>c.id===DRAW));for(const text of['このクリーチャーがバトルに負けた時、カードを１枚引く。','このクリーチャーがどこからでも墓地に置かれた時、カードを１枚引く。','自分の他のクリーチャーが破壊された時、カードを１枚引く。','このクリーチャーがバトルゾーンを離れる時、カードを１枚引く。']){d.faces[0].abilityText=text;assert.throws(()=>standardCardSpec(d,{phase:172}));}
 for(const phase of[165,166,168,169,170,171])for(const row of JSON.parse(fs.readFileSync(new URL('../tools/support-phase-'+phase+'.json',import.meta.url))).cards)assert.deepEqual(standardCardSpec(details.cards.find(c=>c.id===row.id),{phase}),row.spec);
});
test('Bug Marukun can decline its entry battle or die in it and draw exactly once before leaving the battle continuation',()=>{
 for(const fight of[false,true]){let s=setup();give(s,1,'battle',[N]);give(s,0,'hand',[BUG]);const ids=physical(s),n=s.players[0].deck.length;act(s,'play',a=>a.cardId===BUG);s=JSON.parse(JSON.stringify(s));act(s,fight?'fight':'skipFight');drain(s);assert.equal(s.players[0].hand.length,fight?1:0);assert.equal(s.players[0].deck.length,n-(fight?1:0));assert.equal(s.players[0].grave.some(x=>x.cardId===BUG),fight);assert.equal(s.players[1].grave.some(x=>x.cardId===N),fight);assert.deepEqual(physical(s),ids);}
});
test('death draws may be declined, and CPU declines an optional last card instead of losing',()=>{
 for(const choose of[false,true]){const s=setup();give(s,1,'battle',['dm24rp1-062']);give(s,1,'deck',[N]);const uid=s.players[1].battle[0].uid;remove(s,DE,uid);assert.equal(s.decision.task.op,'g34_Offer');assert.equal(s.decision.player,1);if(!choose)assert.equal(s.decision.choices[e.chooseHeuristicAI(s).choice].value,null);pick(s,choose?true:null);drain(s);assert.equal(s.winner,choose?0:null);assert.equal(s.players[1].hand.length,choose?1:0);}
});
test('Adam draws before the opponent chooses its own discard, and that sequence resumes after saving',()=>{
 let s=setup();give(s,1,'battle',['dmrp02-077']);give(s,0,'hand',[N,F]);const uid=s.players[1].battle[0].uid;remove(s,DE,uid);assert.equal(s.players[1].hand.length,1);assert.equal(s.decision.player,0);const chosen=s.players[0].hand.find(x=>x.cardId===F).uid;s=JSON.parse(JSON.stringify(s));pick(s,chosen);drain(s);assert.ok(s.players[0].grave.some(x=>x.uid===chosen));assert.equal(s.players[0].hand.length,1);
});
test('pre-event suppression stays effective when Genmu leaves in the same simultaneous destruction, in either zone order',()=>{
 for(const row of m.cards.filter(c=>c.faces[0].cost<=5))for(const first of[false,true]){const s=setup();give(s,0,'battle',first?[GEN,row.id,N]:[row.id,GEN,N]);give(s,1,'battle',[N,F,N]);play(s,AP);drain(s);assert.equal(s.players[0].hand.length,0,row.name);assert.equal(s.players[0].mana.length,50,row.name);assert.equal(s.players[0].battle.length,0);assert.equal(s.players[1].battle.length,0);}
});
test('ignored abilities do not trigger, but GG entry suppression does not suppress death or leave abilities',()=>{
 for(const id of[DRAW,LEAVE])for(const ignored of[false,true]){const s=setup();give(s,1,'battle',[id,GG]);s.players[1].battle[1].under=[inst(N)];if(ignored)s.players[1].battle[0].g35Ignored=s.turn;const uid=s.players[1].battle[0].uid;remove(s,DE,uid);drain(s);assert.equal(s.players[1].hand.length,ignored?0:1);}
});
test('evolution bases neither trigger when the top dies nor when an individual base returns to hand',()=>{
 for(const row of m.cards){const s=setup();give(s,1,'battle',['dm02-024']);const top=s.players[1].battle[0];top.under=[inst(row.id)];remove(s,DE,top.uid);drain(s);assert.equal(s.players[1].hand.length,0,row.name);assert.equal(s.players[1].mana.length,50,row.name);assert.equal(s.players[1].grave.length,2);}
 const s=setup();give(s,1,'battle',['dm02-024']);const top=s.players[1].battle[0];top.under=[inst(LEAVE)];const uid=top.under[0].uid,airvo=data.cards.find(c=>c.effect==='madoAirvo');play(s,airvo.id);pick(s,uid);drain(s);assert.equal(s.players[1].hand.length,1);assert.equal(s.players[1].hand[0].uid,uid);assert.equal(top.under.length,0);
});
test('a destruction-to-mana replacement fires leave abilities only, not death abilities',()=>{
 for(const id of[DRAW,LEAVE]){const s=setup();give(s,1,'battle',[id]);const x=s.players[1].battle[0];x.g34Grants=[{turn:s.turn,destroyToMana:true}];remove(s,DE,x.uid);drain(s);assert.ok(s.players[1].mana.some(y=>y.uid===x.uid));assert.equal(s.players[1].hand.length,id===LEAVE?1:0);}
});
test('Sasage sacrifices trigger each donors death ability before finishing the discounted summon',()=>{
 for(const row of m.cards.filter(c=>c.spec.sasage)){const s=setup();give(s,0,'battle',[row.id,F]);give(s,0,'hand',[DIS]);give(s,1,'hand',[N,F]);give(s,1,'battle',[N,F]);const uid=s.players[0].battle[0].uid,before=physical(s),a=e.getLegalActions(s).find(a=>a.kind==='play'&&a.alternative==='sasage'&&a.sasage.includes(uid));assert.ok(a,row.name);e.step(s,a);s.decision&&drain(s);assert.ok(s.players[0].grave.some(x=>x.uid===uid));assert.ok(s.players[0].battle.some(x=>x.cardId===DIS));assert.deepEqual(physical(s),before);}
});
test('discard from these death effects keeps the defending hand-owner replacement choice',()=>{
 const s=setup();give(s,1,'battle',['dmr08-045']);give(s,0,'hand',['dmr02-s03']);remove(s,DE,s.players[1].battle[0].uid);assert.equal(s.decision.player,0);assert.equal(s.decision.task.op,'discardChosen');const uid=s.players[0].hand[0].uid;pick(s,true);drain(s);assert.ok(s.players[0].battle.some(x=>x.uid===uid));assert.ok(!s.players[0].grave.some(x=>x.uid===uid));
});
test('shield-trigger blockers keep their death ability for a later block',()=>{
 for(const row of m.cards.filter(c=>c.spec.trigger)){const s=setup();give(s,0,'battle',[N]);give(s,0,'hand',[N,F]);give(s,1,'shields',[row.id]);give(s,1,'mana',[]);s.phase='attack';act(s,'attack',a=>a.target==='player');act(s,'noBlock');act(s,'useTrigger');drain(s);const blocker=s.players[1].battle.find(x=>x.cardId===row.id);assert.ok(blocker);assert.equal(s.players[1].hand.length,0);s.players[0].battle.push(inst(N));const attacker=s.players[0].battle.at(-1);attacker.powerModifiers=[{amount:12000}];act(s,'attack',a=>a.uid===attacker.uid&&a.target==='player');act(s,'block',a=>a.uid===blocker.uid);drain(s);assert.ok(s.players[1].grave.some(x=>x.uid===blocker.uid));assert.equal(s.players[1].mana.length,0);}
});
test('all five CPU forty-card fixtures finish with conserved identities and resume from a saved state',()=>{
 for(const[i,d]of STANDARD172_DECKS.entries()){let s=e.createGame([d,PRESETS[i%PRESETS.length]],{seed:17201+i,first:i%2}),saved=false;const ids=physical(s);while(s.winner===null&&s.actions<1800&&s.turn<160){e.step(s,e.chooseAI(s));assert.deepEqual(physical(s),ids);if(!saved&&s.actions>20){s=JSON.parse(JSON.stringify(s));saved=true;}}assert.ok(saved);assert.notEqual(s.winner,null,d.name);assert.equal(ids.length,80);}
});
test('optional death draw seeks Shako victory, while optional last-card ramp is declined even beside Shako',()=>{
 const SH='dmrp03-s03';for(const id of['dm24rp1-062','dm25rp1-027']){const s=setup();give(s,1,'battle',[id,SH]);give(s,1,'deck',[N]);remove(s,DE,s.players[1].battle[0].uid);const a=e.chooseAI(s),yes=s.decision.choices[a.choice].value;assert.equal(!!yes,id==='dm24rp1-062');e.step(s,a);drain(s);assert.equal(s.winner,id==='dm24rp1-062'?1:null);}
});
test('mandatory death draw cannot be declined and the last draw uses the normal Shako replacement',()=>{
 for(const shako of[false,true]){const s=setup();give(s,1,'battle',shako?[DRAW,'dmrp03-s03']:[DRAW]);give(s,1,'deck',[N]);remove(s,DE,s.players[1].battle[0].uid);drain(s);assert.equal(s.winner,shako?1:0);assert.equal(s.players[1].hand.length,1);}
});
test('milling these cards from a library does not create death or battlefield leave triggers',()=>{
 for(const row of m.cards){const s=setup();give(s,0,'deck',[row.id,N,...Array(20).fill(F)]);give(s,1,'hand',[N,F]);play(s,'dm36-094');drain(s);assert.equal(s.players[0].hand.length,0,row.name);assert.equal(s.players[0].mana.length,50,row.name);assert.equal(s.players[1].hand.length,2,row.name);assert.ok(s.players[0].grave.some(x=>x.cardId===row.id));}
});
test('simultaneously destroyed bodies offer independent ordered abilities with the original player and source',()=>{
 let s=setup();give(s,0,'battle',[DRAW,DRAW,N]);give(s,1,'battle',[N,F,N]);play(s,AP);assert.equal(s.decision.type,'effectOrder');assert.equal(s.decision.player,0);const xs=e.getLegalActions(s).filter(a=>a.kind==='orderEffect');assert.equal(xs.length,2);s=JSON.parse(JSON.stringify(s));e.step(s,e.getLegalActions(s).find(a=>a.effectId===xs[1].effectId));drain(s);assert.equal(s.players[0].hand.length,2);assert.equal(s.players[0].grave.filter(x=>x.cardId===DRAW).length,2);assert.equal(s.players[1].hand.length,0);
});
test('Tech optional mill and subsequent optional draw remain independent decisions after leaving',()=>{
 for(const mill of[false,true]){const s=setup();give(s,1,'battle',['dmr21-089']);const top=s.players[1].deck[0].uid;remove(s,BO,s.players[1].battle[0].uid);assert.equal(s.decision.task.op,'g34_Mill');pick(s,mill?true:null);assert.equal(s.decision.task.op,'g34_Offer');pick(s,true);drain(s);assert.equal(s.players[1].hand.length,2);assert.equal(s.players[1].grave.some(x=>x.uid===top),mill);}
});
