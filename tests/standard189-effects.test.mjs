import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain,GEN,GG,PRESETS} from './target-fixture.mjs';import {standardCardSpec} from '../tools/standard-card-spec.mjs';import {createCatalogue} from '../dist/catalogue.js';import {CARD_IMAGES} from '../dist/card-images.js';import {STANDARD189_DECKS} from '../tools/fixtures/standard189.mjs';
const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-189.json',import.meta.url))),N='dm01-108',F='dm01-097',BIG='dmx22b-012',SLAYER='dm01-088',EAGLE='promoy14-044',VERTE='dmrp04s-042',DOGI='dmd21-001',MEAL='dm13-017',URA='dmr13-089',ONI='dm23ex3-S07',SHIELD='dm01-076';
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function pick(s,v){act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===v);}
function attack(s,uid=s.players[s.active].battle[0].uid,target='player'){s.phase='attack';act(s,'attack',a=>a.uid===uid&&a.target===target);}
function win(s,id,enemy=N){give(s,0,'battle',[id]);if(id===DOGI)s.players[0].battle[0].under=[inst(F)];give(s,1,'battle',[enemy]);s.players[1].battle[0].tapped=true;attack(s,undefined,s.players[1].battle[0].uid);act(s,'noBlock');return s.players[0].battle[0]?.uid;}
test('five fully verified definitions and images are covered by a legal forty-card deck',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);assert.equal(m.cards.length,5);for(const row of m.cards){assert.deepEqual(row.faces,details.cards.find(x=>x.id===row.id).faces);assert.deepEqual(row.spec,standardCardSpec(details.cards.find(x=>x.id===row.id),{phase:189}));assert.equal(e.card(row.id).supportBatch,'phase-189');assert.ok(row.verification.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(e.card(row.id).limit,m.regulationVerification.limits[row.id]);assert.equal(CARD_IMAGES[row.id],row.image);assert.ok(registry.get(row.id).supported);assert.ok(STANDARD189_DECKS[0].cards.some(x=>x.id===row.id));}assert.deepEqual(e.validateDeck(STANDARD189_DECKS[0]),[]);assert.equal(STANDARD189_DECKS[0].cards.reduce((n,x)=>n+x.count,0),40);assert.equal(registry.coverage(STANDARD189_DECKS[0]).unsupported,0);
});
for(const row of m.cards)test(row.name+': wins against the opposing creature and preserves physical identities',()=>{
 const s=setup();give(s,0,'battle',[row.id,N]);if(row.id===DOGI)s.players[0].battle[0].under=[inst(F)];give(s,1,'battle',[N]);s.players[1].battle[0].tapped=true;const uid=s.players[0].battle[0].uid,ids=physical(s);attack(s,uid,s.players[1].battle[0].uid);act(s,'noBlock');drain(s);assert.deepEqual(physical(s),ids);assert.equal(s.winner,null);if(row.id===EAGLE)assert.equal(s.players[0].hand.length,1);else if([DOGI,MEAL].includes(row.id))assert.equal(s.players[0].battle[0].tapped,false);else assert.equal(s.players[0].grave.length,1);
});
test('unknown win conditions are rejected and all previous manifests remain identical',()=>{
 for(const row of m.cards){const d=structuredClone(details.cards.find(x=>x.id===row.id));assert.throws(()=>standardCardSpec(d,{phase:188}));d.faces[0].abilityText+='\n未知の能力';assert.throws(()=>standardCardSpec(d,{phase:189}));}const d=structuredClone(details.cards.find(x=>x.id===EAGLE));for(const text of['このクリーチャーがバトルに勝った時、自分のシールドが２つ以下ならカードを１枚引く。','このクリーチャーがバトルに勝った時、カードを１枚引く。\nこのクリーチャーがバトルに勝った時、カードを２枚引く。','このクリーチャーがバトルに勝った時、カードを１枚引く。その後、未知の処理。','このクリーチャーがバトルに勝った時、このクリーチャーをアンタップする。そうしたら未知の処理。']){d.faces[0].abilityText=text;assert.throws(()=>standardCardSpec(d,{phase:189}));}for(let phase=168;phase<=188;phase++)for(const row of JSON.parse(fs.readFileSync(new URL('../tools/support-phase-'+phase+'.json',import.meta.url))).cards)assert.deepEqual(standardCardSpec(details.cards.find(x=>x.id===row.id),{phase}),row.spec);
});
test('only the winner triggers: losing, tying, ally wins and direct shield attacks draw nothing',()=>{
 for(const enemy of[BIG,EAGLE]){const s=setup();win(s,EAGLE,enemy);drain(s);assert.equal(s.players[0].hand.length,0);assert.ok(s.players[0].grave.some(x=>x.cardId===EAGLE));}
 const s=setup();give(s,0,'battle',[EAGLE,BIG]);give(s,1,'battle',[N]);s.players[1].battle[0].tapped=true;attack(s,s.players[0].battle[1].uid,s.players[1].battle[0].uid);act(s,'noBlock');drain(s);assert.equal(s.players[0].hand.length,0);
 const t=setup();give(t,0,'battle',[EAGLE]);attack(t);act(t,'noBlock');drain(t);assert.equal(t.players[0].hand.length,0);assert.equal(t.players[1].shields.length,4);
});
test('winning while being attacked gives the defending owner its mandatory draw',()=>{
 const s=setup();give(s,0,'battle',[EAGLE]);s.players[0].battle[0].tapped=true;give(s,1,'battle',[F]);s.active=1;attack(s,undefined,s.players[0].battle[0].uid);act(s,'noBlock');drain(s);assert.equal(s.active,1);assert.equal(s.players[0].hand.length,1);assert.equal(s.players[1].hand.length,0);assert.equal(s.players[0].battle.length,1);
});
test('entry fight and S-trigger fight both produce a win trigger, while skipping the fight does not',()=>{
 for(const fromShield of[false,true]){const s=setup();give(s,1,'battle',[N]);if(fromShield){give(s,0,'shields',[EAGLE]);s.active=1;attack(s);act(s,'noBlock');act(s,'useTrigger');}else{give(s,0,'hand',[EAGLE]);act(s,'play');}assert.equal(s.decision.type,'fight');assert.equal(s.decision.player,0);act(s,'fight');drain(s);assert.equal(s.players[0].hand.length,1);assert.equal(s.players[1].battle.length,0);assert.equal(s.players[0].battle.length,1);}
 const t=setup();give(t,1,'battle',[N]);give(t,0,'hand',[EAGLE]);act(t,'play');act(t,'skipFight');assert.equal(t.players[0].hand.length,0);assert.equal(t.players[1].battle.length,1);
});
test('mandatory winning draw resolves before Slayer and may replace the final-card loss with Shako victory',()=>{
 const s=setup();give(s,0,'hand',[EAGLE]);give(s,1,'battle',[SLAYER]);act(s,'play');act(s,'fight');drain(s);assert.equal(s.players[0].hand.length,1);assert.ok(s.players[0].grave.some(x=>x.cardId===EAGLE));assert.ok(s.players[1].grave.some(x=>x.cardId===SLAYER));
 const t=setup();give(t,0,'battle',[EAGLE,'dmrp03-s03']);give(t,0,'deck',[N]);give(t,1,'battle',[SLAYER]);t.players[1].battle[0].tapped=true;attack(t,undefined,t.players[1].battle[0].uid);act(t,'noBlock');assert.equal(t.winner,0);assert.ok(t.players[0].battle.some(x=>x.cardId===EAGLE));
 const u=setup();give(u,0,'deck',[N]);win(u,EAGLE);assert.equal(u.winner,1);
});
test('evolution bases are required; each win untaps Evol for another attack without moving its base',()=>{
 const s=setup();give(s,0,'hand',[DOGI]);assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&a.cardId===DOGI));give(s,0,'battle',[F]);const base=s.players[0].battle[0].uid;act(s,'play');act(s,'evolve',a=>a.baseUid===base);const uid=s.players[0].battle[0].uid;give(s,1,'battle',[N,F]);s.players[1].battle.forEach(x=>x.tapped=true);const ids=physical(s);for(let i=0;i<2;i++){attack(s,uid,s.players[1].battle[0].uid);act(s,'noBlock');drain(s);assert.equal(s.players[0].battle[0].tapped,false);assert.equal(s.players[0].battle[0].under[0].uid,base);assert.deepEqual(physical(s),ids);}assert.equal(s.players[1].battle.length,0);
});
test('optional untap is saved and can be declined; Meal attacks untapped creatures but never the player',()=>{
 let s=setup();give(s,0,'battle',[MEAL]);give(s,1,'battle',[N,F]);const uid=s.players[0].battle[0].uid;s.phase='attack';assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.target==='player'));attack(s,uid,s.players[1].battle[0].uid);act(s,'noBlock');assert.equal(s.decision.player,0);s=JSON.parse(JSON.stringify(s));pick(s,null);assert.equal(s.players[0].battle[0].tapped,true);
 const t=setup();win(t,MEAL);assert.equal(t.decision.task.op,'g34_Offer');pick(t,true);assert.equal(t.players[0].battle[0].tapped,false);assert.ok(e.getLegalActions(t).every(a=>a.kind!=='attack'||a.target!=='player'));
});
test('neither mandatory nor optional untap overrides a continuous no-untap restriction',()=>{
 for(const id of[DOGI,MEAL]){const s=setup();give(s,0,'battle',[id]);if(id===DOGI)s.players[0].battle[0].under=[inst(F)];s.players[0].battle[0].tapLocks=[{who:1,afterTurns:999}];give(s,1,'battle',[N]);s.players[1].battle[0].tapped=true;attack(s,undefined,s.players[1].battle[0].uid);act(s,'noBlock');if(id===MEAL)pick(s,true);drain(s);assert.equal(s.players[0].battle[0].tapped,true);}
});
test('self sacrifice is mandatory and may choose the winning source itself or another allied creature',()=>{
 for(const id of[VERTE,URA]){let s=setup();give(s,0,'battle',[id,N]);give(s,1,'battle',[N]);s.players[1].battle[0].tapped=true;const self=s.players[0].battle[0].uid;attack(s,self,s.players[1].battle[0].uid);act(s,'noBlock');assert.equal(s.decision.player,0);assert.ok(!s.decision.choices.some(x=>!x.value));assert.ok(s.decision.choices.some(x=>x.value.uid===self));s=JSON.parse(JSON.stringify(s));pick(s,self);drain(s);assert.ok(s.players[0].grave.some(x=>x.uid===self));assert.equal(s.players[0].battle.length,1);assert.equal(s.attack,null);}
});
test('Genmu ignores a cost-four win ability, GG leaves win triggers active, and cost-six survives Genmu',()=>{
 const s=setup();give(s,0,'battle',[VERTE]);give(s,1,'battle',[N,GEN]);s.players[1].battle[0].tapped=true;attack(s,undefined,s.players[1].battle[0].uid);act(s,'noBlock');drain(s);assert.equal(s.players[0].grave.length,0);assert.equal(s.players[0].battle.length,1);
 const t=setup();give(t,0,'battle',[EAGLE]);give(t,1,'battle',[N,GG]);t.players[1].battle[1].under=[inst(N)];t.players[1].battle[0].tapped=true;attack(t,undefined,t.players[1].battle[0].uid);act(t,'noBlock');drain(t);assert.equal(t.players[0].hand.length,1);
 const u=setup();give(u,0,'battle',[DOGI]);u.players[0].battle[0].under=[inst(F)];give(u,1,'battle',[N,GEN]);u.players[1].battle[0].tapped=true;attack(u,undefined,u.players[1].battle[0].uid);act(u,'noBlock');drain(u);assert.equal(u.players[0].battle[0].tapped,false);
});
test('a battle win alongside Onimaru remains separately ordered and both effects resolve once',()=>{
 const s=setup();give(s,0,'battle',[EAGLE,ONI]);give(s,1,'battle',[N]);s.players[1].battle[0].tapped=true;attack(s,undefined,s.players[1].battle[0].uid);act(s,'noBlock');assert.equal(s.decision.type,'battleWinOrder');assert.equal(e.getLegalActions(s).length,2);const ids=physical(s);s.decision=structuredClone(s.decision);act(s,'battleWinOrder',a=>a.cardId===EAGLE);assert.equal(s.players[0].hand.length,1);drain(s);assert.equal(s.players[0].hand.length,2);assert.deepEqual(physical(s),ids);
});
test('CPU finishes the new forty-card deck with saved continuation and eighty card identities',()=>{
 let s=e.createGame([STANDARD189_DECKS[0],PRESETS[0]],{seed:18901,first:0}),saved=false;const ids=physical(s);while(s.winner===null&&s.actions<1800&&s.turn<160){e.step(s,e.chooseAI(s));assert.deepEqual(physical(s),ids);if(!saved&&s.actions>20){s=JSON.parse(JSON.stringify(s));saved=true;}}assert.ok(saved);assert.notEqual(s.winner,null);assert.equal(ids.length,80);
});
test('winning still triggers when the losing creature survives by replacing destruction with EX life',()=>{
 const s=setup();s.active=1;give(s,1,'hand',['dmrp19-030']);act(s,'play');drain(s);const loser=s.players[1].battle[0],shield=s.players[1].shields.length;loser.tapped=true;s.active=0;give(s,0,'battle',[EAGLE]);s.players[0].battle[0].powerModifiers=[{amount:30000}];const ids=physical(s);attack(s,undefined,loser.uid);act(s,'noBlock');if(s.decision?.type==='leaveReplace')act(s,'replaceEx');drain(s);assert.ok(s.players[1].battle.some(x=>x.uid===loser.uid));assert.equal(s.players[1].shields.length,shield-1);assert.equal(s.players[0].hand.length,1);assert.deepEqual(physical(s),ids);
});
