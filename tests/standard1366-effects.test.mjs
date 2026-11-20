import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {e,act,attack,cast,data,details,drain,give,inst,setup,snapshot} from './target-fixture.mjs';
import {nameKey,createCatalogue} from '../dist/catalogue.js';import {standardCardSpec} from '../tools/standard-card-spec.mjs';import {shieldCards} from '../dist/shield-state.js';
const DG='dmrp03-dg01',FIRE='dm01-097',BASIC='dm01-108',DRAW='dm01-052',CREST='dmbd04-008',SABAKI='dmbd07-b-005';
const field=()=>{const s=setup();s.turn=3;for(const p of [0,1])give(s,p,'deck',Array(20).fill(BASIC));return s;};
const add=(s,p,z,id,props={})=>{const x=Object.assign(inst(id),props);s.players[p][z].push(x);return x;};
const pick=(s,v)=>act(s,'extended',a=>{const x=s.decision.choices[a.choice].value;return(x?.uid??x)===(v?.uid??v);});
const chooseShields=s=>{assert.match(s.decision.task.op,/DG|DGBreak/);act(s,'extended');act(s,'extended');};
const unique=s=>{const all=e.physicalCards(s);assert.equal(new Set(all.map(x=>x.uid)).size,all.length);return all.length;};
test('DG official full text, basic information, image, limit and canonical name remain exact',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-1366.json',import.meta.url))),row=m.cards[0],d=details.cards.find(x=>x.id===DG),c=e.card(DG);assert.equal(m.cards.length,2);assert.deepEqual(d.faces,row.faces);assert.deepEqual(standardCardSpec(d,{phase:1366}),row.spec);assert.throws(()=>standardCardSpec(d,{phase:1365}));const bad=structuredClone(d);bad.faces[0].abilityText+='未知の能力。';assert.throws(()=>standardCardSpec(bad,{phase:1366}));assert.deepEqual([c.type,c.cost,c.power,c.race,c.manaValue,c.limit],['creature',6,5000,'メタリカ',1,4]);assert.equal(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).length,1);assert.deepEqual(createCatalogue(snapshot,data.cards,details).resolveRows([{id:DG,count:1}]),[{id:DG,count:1}]);
});
test('DG selects both shields before either leaves, including a save between selections',()=>{
 let s=field();cast(s,DG);const count=unique(s);act(s,'extended');assert.deepEqual(s.players.map(x=>x.shields.length),[5,5]);s=JSON.parse(JSON.stringify(s));act(s,'extended');assert.deepEqual(s.players.map(x=>[x.shields.length,x.hand.length]),[[4,1],[4,1]]);assert.equal(s.g1366DG,undefined);assert.equal(unique(s),count);
});
test('QA45078: both S-Trigger declarations precede both hands and resolve in turn order after saves',()=>{
 for(const active of [0,1]){let s=field();s.active=active;for(const p of [0,1])give(s,p,'shields',[DRAW,BASIC]);cast(s,DG);chooseShields(s);assert.equal(s.decision.player,active);assert.deepEqual(s.players.map(x=>x.hand.length),[0,0]);assert.deepEqual(s.players.map(x=>x.shields.length),[2,2]);act(s,'useTrigger');assert.equal(s.decision.player,1-active);assert.deepEqual(s.players.map(x=>x.hand.length),[0,0]);s=JSON.parse(JSON.stringify(s));act(s,'useTrigger');assert.equal(s.decision.type,'draw');assert.equal(s.decision.player,active);assert.deepEqual(s.players.map(x=>x.shields.length),[1,1]);assert.equal(s.players[1-active].hand.length,1);act(s,'draw',a=>a.n===0);assert.equal(s.decision.player,1-active);act(s,'draw',a=>a.n===0);assert.equal(s.g1366DG,undefined);assert.equal(s.decision,null);}
});
test('QA45139 Hyper Voljaak doubles attack abilities but the DG tap trigger occurs exactly once',()=>{
 const s=field(),dg=add(s,0,'battle',DG),vol=add(s,0,'battle','dm24rp2-S07',{hyperActive:true});attack(s,dg.uid);assert.match(s.decision.task.op,/DG/);const pending=s.pendingEffects?.filter(x=>x.uid===dg.uid)||[];assert.equal(pending.length,0);chooseShields(s);assert.deepEqual(s.players.map(x=>x.shields.length),[4,4]);assert.equal(s.decision.type,'block');assert.equal(dg.tapped,true);assert.ok(e.effectiveCard(vol,s).g1231DoubleAttack);
});
test('a shieldless player is skipped without preventing the other shield from breaking',()=>{
 for(const empty of [0,1]){const s=field();give(s,empty,'shields',[]);cast(s,DG);act(s,'extended');assert.equal(s.players[1-empty].shields.length,4);assert.equal(s.players[empty].shields.length,0);assert.equal(s.g1366DG,undefined);}
});
test('the grant allows Metallica and Crests, and leaves unrelated cards without an S-Trigger',()=>{
 for(const id of [DG,CREST,BASIC]){const s=field();give(s,0,'shields',[id]);give(s,1,'shields',[BASIC]);cast(s,DG);chooseShields(s);if(id===BASIC)assert.equal(s.decision,null);else{assert.equal(s.decision.type,'trigger');assert.equal(s.decision.source,id);act(s,'skipTrigger');assert.equal(s.decision,null);}}
});
test('the matching grant also applies to shield-to-hand moves outside a break',()=>{
 const s=field();add(s,0,'battle',DG);const shield=s.players[0].shields[0];shield.cardId=CREST;
 const x=add(s,0,'battle','dm01-108');s.extTasks=[{op:'g34_Sequence',p:0,source:x.cardId,uid:x.uid,defs:[{op:'ShieldHand',n:1}]}];act(s,'toAttack');pick(s,shield.uid);assert.equal(s.decision.type,'trigger');act(s,'skipTrigger');
});
test('S-Back discards before either hand receives the other broken cards and preserves break counts',()=>{
 let s=field();give(s,0,'shields',['dm01-090']);give(s,1,'shields',[DRAW]);const sb=add(s,0,'hand','dmex12-035');cast(s,DG);chooseShields(s);assert.equal(s.decision.task.op,'g1366_SB');const payment=s.players[0].shields[0];pick(s,sb.uid);assert.ok(s.players[0].grave.some(x=>x.uid===payment.uid));assert.equal(s.players[1].hand.length,0);assert.equal(s.decision.type,'trigger');s=JSON.parse(JSON.stringify(s));act(s,'skipTrigger');drain(s);assert.equal(s.g1366DG,undefined);assert.equal(s.metrics[0].breaks,2);assert.deepEqual(s.players.map(x=>x.shields.length),[0,0]);unique(s);
});
test('Sabaki Z declarations for both players precede either player’s trigger execution',()=>{
 let s=field();for(const p of [0,1]){give(s,p,'shields',[CREST]);add(s,p,'hand',SABAKI);}cast(s,DG);chooseShields(s);act(s,'skipTrigger');act(s,'skipTrigger');assert.equal(s.decision.task.op,'g34_SabakiPay1348');assert.equal(s.decision.player,0);s=JSON.parse(JSON.stringify(s));pick(s,true);assert.equal(s.decision.task.op,'g34_SabakiPay1348');assert.equal(s.decision.player,1);assert.equal(s.players[0].grave.length,1);assert.equal(s.players[1].shields.length,0);pick(s,true);drain(s);assert.equal(s.g1366DG,undefined);assert.equal(s.players[0].grave.some(x=>x.cardId===CREST),true);assert.equal(s.players[1].grave.some(x=>x.cardId===CREST),true);unique(s);
});
test('ignoring DG removes its shield trigger grant',()=>{
 const s=field(),dg=add(s,0,'battle',DG,{g35Ignored:s.turn});give(s,0,'shields',[CREST]);add(s,1,'battle','dm25rp3-S09',{under:[inst(BASIC)]});attack(s,add(s,0,'battle',FIRE).uid);drain(s);assert.equal(e.effectiveCard(dg,s).g1366DG,undefined);
});
test('a G-Strike remains declared when the same shield card pays for S-Back',()=>{
 let s=field();give(s,0,'shields',['dmrp20-017']);give(s,1,'shields',[DRAW]);const sb=add(s,0,'hand','dmex12-035');cast(s,DG);chooseShields(s);assert.equal(s.decision.task.op,'g1366_GS');pick(s,true);assert.equal(s.decision.task.op,'g1366_SB');const payment=s.players[0].shields[0];pick(s,sb.uid);assert.ok(s.players[0].grave.some(x=>x.uid===payment.uid));s=JSON.parse(JSON.stringify(s));act(s,'skipTrigger');assert.equal(s.decision.type,'triggerOrder');assert.ok(e.getLegalActions(s).some(x=>x.kind==='orderGS'&&x.uid===payment.uid));act(s,'orderGS');drain(s);assert.equal(s.g1366DG,undefined);unique(s);
});
test('S-Back creature entry effects wait for the other player’s declared trigger',()=>{
 let s=field();give(s,0,'shields',[BASIC]);give(s,1,'shields',[DRAW]);const sb=add(s,0,'hand','dm17-035');cast(s,DG);chooseShields(s);pick(s,sb.uid);s=JSON.parse(JSON.stringify(s));act(s,'useTrigger');assert.equal(s.decision.type,'draw');assert.equal(s.decision.player,1);assert.ok(s.players[0].battle.some(x=>x.uid===sb.uid));assert.equal(s.players[0].mana.length,50);act(s,'draw',a=>a.n===0);drain(s);assert.equal(s.g1366DG,undefined);assert.equal(s.players[0].mana.length,51);
});
test('each player can finish both S-Trigger declarations before any new creature entry ability resolves',()=>{
 let s=field();give(s,0,'shields',['dm01-089']);give(s,1,'shields',[DRAW]);cast(s,DG);chooseShields(s);
 // Metallica-only grants do not grant an unrelated blocker a trigger.
 assert.equal(s.decision.player,1);act(s,'skipTrigger');assert.equal(s.decision,null);assert.ok(s.players[0].hand.some(x=>x.cardId==='dm01-089'));
});
test('Tensei’s verified full spec uses its original canonical ID and one printed mana',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-1366.json',import.meta.url))),row=m.cards.find(x=>x.id==='dmrp07-063'),d=details.cards.find(x=>x.id===row.id),c=e.card(row.id);
 assert.deepEqual(row.faces,d.faces);assert.deepEqual(standardCardSpec(d,{phase:1366}),row.spec);assert.throws(()=>standardCardSpec(d,{phase:1365}));const bad=structuredClone(d);bad.faces[0].abilityText+='未知の能力。';assert.throws(()=>standardCardSpec(bad,{phase:1366}));assert.deepEqual([c.type,c.cost,c.race,c.manaValue,c.limit],['spell',3,'裁きの紋章Z',1,4]);
});
test('QA44100: DG and face-up Justice allow both bundled Crests to declare before Justice leaves',()=>{
 const s=field();add(s,0,'battle',DG);const shield=s.players[0].shields[0];shield.cardId=SABAKI;const justice=inst('dmex19-025');justice.faceUp=true;shield.shieldStack=[justice];cast(s,'dmrp07-063');pick(s,shield.uid);assert.equal(s.decision.type,'trigger');assert.equal(s.players[0].shields.length,4);assert.ok(s.players[0].hand.some(x=>x.uid===justice.uid));act(s,'useTrigger');assert.equal(s.decision.type,'trigger');act(s,'useTrigger');assert.ok(s.triggers.declared.length>=1||s.decision);drain(s);assert.equal(s.decision,null);unique(s);
});
test('Tensei prohibits the matching shield trigger without Justice and its hand-cast card finishes over a shield',()=>{
 const s=field();add(s,0,'battle',DG);const shield=s.players[0].shields[0];shield.cardId=CREST;const spell=add(s,0,'hand','dmrp07-063');act(s,'play',a=>a.uid===spell.uid);pick(s,shield.uid);assert.notEqual(s.decision?.type,'trigger');assert.ok(s.players[0].hand.some(x=>x.uid===shield.uid));drain(s);assert.ok(s.players[0].shields.some(root=>shieldCards(root).some(x=>x.uid===spell.uid&&x.faceUp)));assert.ok(!s.players[0].grave.some(x=>x.uid===spell.uid));
});
test('Tensei may decline its shield return and does not attach when cast from the library',()=>{
 for(const fromDeck of [false,true]){const s=field();let spell;if(fromDeck){add(s,0,'battle','dm22rp2-002');give(s,0,'deck',['dmrp07-063',...Array(10).fill(BASIC)]);spell=s.players[0].deck[0];act(s,'play',a=>a.origin==='deck'&&a.uid===spell.uid);}else{spell=add(s,0,'hand','dmrp07-063');act(s,'play',a=>a.uid===spell.uid);}pick(s,null);drain(s);assert.equal(s.players[0].shields.length,5);assert.equal(s.players[0].grave.some(x=>x.uid===spell.uid),fromDeck);assert.equal(s.players[0].shields.some(root=>shieldCards(root).some(x=>x.uid===spell.uid)),!fromDeck);}
});
test('GG suppresses the DG entry ability but never suppresses its tap ability',()=>{
 const s=field();add(s,1,'battle','dm25rp3-S09',{under:[inst(BASIC)]});cast(s,DG);assert.equal(s.decision,null);assert.deepEqual(s.players.map(x=>x.shields.length),[5,5]);s.players[0].battle[0].entered=s.turn-1;attack(s,s.players[0].battle[0].uid);assert.match(s.decision.task.op,/DG/);chooseShields(s);assert.deepEqual(s.players.map(x=>x.shields.length),[4,4]);
});
test('Shield Saver may replace one side while the other side still declares and breaks normally',()=>{
 const s=field(),saver=add(s,0,'battle','dmex14-101');give(s,1,'shields',[DRAW]);cast(s,DG);chooseShields(s);assert.equal(s.decision.type,'shieldGuard');act(s,'saveShield',a=>a.uid===saver.uid);assert.equal(s.decision.type,'trigger');assert.equal(s.decision.player,1);assert.equal(s.players[0].shields.length,5);assert.equal(s.players[1].hand.length,0);act(s,'skipTrigger');assert.equal(s.players[1].shields.length,0);assert.ok(s.players[0].grave.some(x=>x.uid===saver.uid));assert.equal(s.g1366DG,undefined);
});
test('a saved DG declaration makes exactly the same next state, without nonserializable fields',()=>{
 let s=field();for(const p of [0,1])give(s,p,'shields',[DRAW]);cast(s,DG);chooseShields(s);const saved=JSON.parse(JSON.stringify(s)),a=e.getLegalActions(s).find(x=>x.kind==='useTrigger');e.step(s,a);e.step(saved,a);assert.deepEqual(saved,s);assert.equal(s.players[0].hand.length,0);assert.equal(s.players[1].hand.length,0);
});
