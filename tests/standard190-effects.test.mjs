import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain,GEN,GG,PRESETS} from './target-fixture.mjs';import {standardCardSpec} from '../tools/standard-card-spec.mjs';import {createCatalogue} from '../dist/catalogue.js';import {CARD_IMAGES} from '../dist/card-images.js';import {STANDARD190_DECKS} from '../tools/fixtures/standard190.mjs';
const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-190.json',import.meta.url))),N='dm01-108',F='dm01-097',BIG='dmx22b-012',BLOCK='dm01-076',BO='dm01-086',DE='dm01-027',BASE='dm01-083',EVO='dmr12-s02',PAGO='dm24rp2-057',FROZEN='dm23rp1-059',MAND='dmrp07-037',MODAL='dmr19-034',OCTO='dmrp04s-071',LEAVE='dm25ex2-090',LUNA='dm24rp2-056',FANTA='dm24rp3-035',SURF='dmrp17-038',GUARD='dm24rp1-074';
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function pick(s,v){act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===v);}
function play(s,id){const x=inst(id);s.players[s.active].hand.push(x);act(s,'play',a=>a.uid===x.uid&&!a.alternative);return x.uid;}
function attack(s,uid=s.players[s.active].battle[0].uid,target='player'){s.phase='attack';act(s,'attack',a=>a.uid===uid&&a.target===target);}
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}
const freezes=s=>(s.extLimits||[]).filter(x=>x.g190Freeze);
function freezeOne(s=setup(),id=PAGO){give(s,1,'battle',[N,BLOCK]);play(s,id);pick(s,s.players[1].battle[0].uid);drain(s);return s;}
test('twenty verified full definitions, correct spell metadata and images cover three legal decks',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);assert.equal(m.cards.length,20);for(const row of m.cards){assert.deepEqual(row.faces,details.cards.find(x=>x.id===row.id).faces);assert.deepEqual(row.spec,standardCardSpec(details.cards.find(x=>x.id===row.id),{phase:190}));assert.equal(e.card(row.id).supportBatch,'phase-190');assert.ok(row.verification.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(CARD_IMAGES[row.id],row.image);assert.equal(e.card(row.id).limit,m.regulationVerification.limits[row.id]);assert.ok(registry.get(row.id).supported);assert.ok(STANDARD190_DECKS.some(d=>d.cards.some(x=>x.id===row.id)));if(row.faces[0].typeText==='呪文'){const visit=defs=>{for(const d of defs||[]){if(d.g190Freeze)assert.equal(d.spell,true);visit(d.defs);for(const m of d.modes||[])visit(m.defs);}};visit(row.spec.g34Tasks);}}
 for(const d of STANDARD190_DECKS){assert.deepEqual(e.validateDeck(d),[]);assert.equal(d.cards.reduce((n,x)=>n+x.count,0),40);assert.equal(registry.coverage(d).unsupported,0);}
});
for(const row of m.cards)test(row.name+': complete entry, attack, tap or leave ability conserves card identities',()=>{
 const s=setup();give(s,1,'battle',[N,BLOCK,F]);let uid;if(row.spec.g188Tapped||row.spec.g34Attack||row.spec.g172Leave){give(s,0,'battle',[row.id]);uid=s.players[0].battle[0].uid;}else uid=play(s,row.id);if(row.spec.g188Tapped||row.spec.g34Attack)attack(s,uid);if(row.spec.g172Leave){s.active=1;play(s,DE);act(s,'effect',a=>a.targets.some(x=>x.uid===uid));}const ids=physical(s);if(row.id===MODAL)pick(s,1);drain(s);assert.deepEqual(physical(s),ids);assert.ok(freezes(s).length>=2);assert.ok(freezes(s).every(x=>x.who===0));assert.equal(s.winner,null);assert.equal(s.decision,null);
});
test('classifier rejects unknown conditions and preserves every earlier phase definition',()=>{
 for(const row of m.cards){const d=structuredClone(details.cards.find(x=>x.id===row.id));assert.throws(()=>standardCardSpec(d,{phase:189}));d.faces[0].abilityText+='\n未知の能力';assert.throws(()=>standardCardSpec(d,{phase:190}));}const d=structuredClone(details.cards.find(x=>x.id===PAGO));for(const text of['このクリーチャーが出た時、相手のクリーチャーを1体選ぶ。次の自分のターンのはじめまで、そのクリーチャーは攻撃できない。','このクリーチャーが出た時、相手のクリーチャーを1体選ぶ。次の自分のターンの終わりまで、そのクリーチャーは攻撃もブロックもできない。','このクリーチャーが出た時、相手のクリーチャーを1体選ぶ。次の自分のターンのはじめまで、そのクリーチャーは攻撃もブロックもできない。その後、未知の処理。']){d.faces[0].abilityText=text;assert.throws(()=>standardCardSpec(d,{phase:190}));}for(let phase=168;phase<=189;phase++)for(const row of JSON.parse(fs.readFileSync(new URL('../tools/support-phase-'+phase+'.json',import.meta.url))).cards)assert.deepEqual(standardCardSpec(details.cards.find(x=>x.id===row.id),{phase}),row.spec);
});
test('chosen creature stays untapped, cannot attack or block, and the other blocker remains usable',()=>{
 const s=setup();give(s,1,'battle',[BLOCK,BLOCK]);const [one,two]=s.players[1].battle.map(x=>x.uid);play(s,PAGO);pick(s,one);assert.equal(s.players[1].battle[0].tapped,false);assert.ok(e.attackLocked(s,1,s.players[1].battle[0]));s.active=1;s.phase='attack';assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===one));s.active=0;give(s,0,'battle',[N]);attack(s);assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===one));assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===two));
});
test('restriction lasts through the opponent turn and expires at the caster next turn start',()=>{
 const s=freezeOne();const x=s.players[1].battle[0];assert.ok(e.attackLocked(s,1,x));end(s);assert.equal(s.active,1);assert.ok(e.attackLocked(s,1,x));assert.equal(freezes(s).length,2);end(s);assert.equal(s.active,0);assert.equal(e.attackLocked(s,1,x),false);assert.equal(freezes(s).length,0);
});
test('S-trigger restrictions end at its owner next turn start and do not retroactively cancel the attack',()=>{
 const s=setup();give(s,0,'battle',[N,F]);give(s,1,'shields',[FROZEN]);const [attacker,next]=s.players[0].battle.map(x=>x.uid);attack(s,attacker);act(s,'noBlock');act(s,'useTrigger');assert.equal(s.decision.player,1);pick(s,next);pick(s,null);drain(s);assert.equal(s.active,0);assert.equal(s.players[1].shields.length,0);assert.ok(e.attackLocked(s,0,s.players[0].battle[1]));assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===next));end(s);assert.equal(s.active,1);assert.equal(freezes(s).length,0);
});
test('optional multi-selection permits zero, commits only after completion, excludes duplicates and resumes after save',()=>{
 const z=setup();give(z,1,'battle',[N,F]);play(z,FROZEN);pick(z,null);assert.equal(freezes(z).length,0);
 let s=setup();give(s,1,'battle',[N,F,BLOCK,N]);const ids=s.players[1].battle.map(x=>x.uid);play(s,FROZEN);pick(s,ids[0]);assert.equal(freezes(s).length,0);assert.ok(!s.decision.choices.some(x=>x.value?.uid===ids[0]));s=JSON.parse(JSON.stringify(s));pick(s,ids[1]);assert.equal(freezes(s).length,0);pick(s,null);assert.equal(freezes(s).length,4);assert.ok(!e.attackLocked(s,1,s.players[1].battle[2]));assert.equal(s.players[1].battle.length,4);
});
test('mandatory two targets has no decline, uses all available targets, and an empty target set does not stop later draw',()=>{
 const s=setup();give(s,1,'battle',[N,F,BLOCK]);play(s,MAND);assert.ok(!s.decision.choices.some(x=>!x.value));pick(s,s.players[1].battle[0].uid);assert.equal(freezes(s).length,0);pick(s,s.players[1].battle[1].uid);assert.equal(freezes(s).length,4);
 const t=setup();give(t,1,'battle',[N]);play(t,MAND);pick(t,t.players[1].battle[0].uid);assert.equal(t.decision,null);assert.equal(freezes(t).length,2);
 const u=setup();play(u,OCTO);assert.equal(u.decision,null);assert.equal(u.players[0].hand.length,1);
});
test('target choice respects untargetability, Just Diver, seals and forced-target creatures',()=>{
 const s=setup();give(s,1,'battle',['dmrp01-041','dm23rp3-013',N,F]);s.players[1].battle[3].sealed=true;s.players[1].seals=[{...inst(N),faceDown:true,sealOf:s.players[1].battle[3].uid}];play(s,FROZEN);assert.deepEqual(s.decision.choices.filter(x=>x.value).map(x=>x.cardId),['dm23rp3-013']);pick(s,s.players[1].battle[1].uid);assert.deepEqual(s.decision.choices.filter(x=>x.value).map(x=>x.cardId),[N]);pick(s,s.players[1].battle[2].uid);assert.equal(freezes(s).length,4);assert.equal(e.attackLocked(s,1,s.players[1].battle[0]),false);
 const t=setup();t.active=1;play(t,'dm24rp1-061');drain(t);t.active=0;play(t,PAGO);assert.equal(t.decision,null);assert.equal(freezes(t).length,0);
});
test('existing restrictions survive the source leaving or its creature abilities later being ignored',()=>{
 const s=freezeOne();const target=s.players[1].battle[0],source=s.players[0].battle[0];s.active=1;s.phase='main';play(s,DE);act(s,'effect',a=>a.targets.some(x=>x.uid===source.uid));drain(s);assert.ok(s.players[0].grave.some(x=>x.uid===source.uid));assert.ok(e.attackLocked(s,1,target));
 const t=freezeOne();t.players[1].battle.push(inst(GEN));assert.ok(e.attackLocked(t,1,t.players[1].battle[0]));
});
test('spell restrictions remember their cost and are suspended by Genmu, while a suppressed new spell creates none',()=>{
 const s=setup();give(s,1,'battle',[N]);play(s,FROZEN);pick(s,s.players[1].battle[0].uid);drain(s);const target=s.players[1].battle[0];assert.ok(e.attackLocked(s,1,target));assert.ok(freezes(s).every(x=>x.spellSource===FROZEN&&x.spellCost===5));s.players[1].battle.push(inst(GEN));assert.equal(e.attackLocked(s,1,target),false);s.players[1].battle.pop();assert.ok(e.attackLocked(s,1,target));
 const t=setup();give(t,1,'battle',[GEN,N]);play(t,FROZEN);assert.equal(t.decision,null);assert.equal(freezes(t).length,0);
});
test('restriction follows evolution but not a creature that leaves and enters again',()=>{
 const s=setup();give(s,1,'battle',[BASE]);play(s,PAGO);const old=s.players[1].battle[0];pick(s,old.uid);s.active=1;s.phase='main';give(s,1,'hand',[EVO]);act(s,'play');act(s,'evolve',a=>a.baseUid===old.uid);drain(s);assert.ok(e.attackLocked(s,1,s.players[1].battle[0]));assert.equal(s.players[1].battle[0].under[0].uid,old.uid);
 const t=freezeOne();const target=t.players[1].battle[0];play(t,BO);act(t,'effect',a=>a.targets.some(x=>x.uid===target.uid));drain(t);assert.ok(t.players[1].hand.some(x=>x.uid===target.uid));t.active=1;t.phase='main';act(t,'play',a=>a.uid===target.uid);drain(t);const again=t.players[1].battle.find(x=>x.uid===target.uid);assert.ok(again);assert.equal(e.attackLocked(t,1,again),false);
});
test('restriction stays with the same creature if its controller changes',()=>{
 const s=freezeOne(),x=s.players[1].battle.shift();s.players[0].battle.push(x);assert.ok(e.attackLocked(s,0,x));s.phase='attack';assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid));end(s);end(s);assert.equal(e.attackLocked(s,0,x),false);
});
test('attack/block restriction leaves Guardman available and does not cancel the current attack when applied by a block tap',()=>{
 const s=setup();give(s,1,'battle',[GUARD,N]);s.players[1].battle[1].tapped=true;play(s,PAGO);pick(s,s.players[1].battle[0].uid);give(s,0,'battle',[BIG]);attack(s,undefined,s.players[1].battle[1].uid);assert.ok(e.getLegalActions(s).some(a=>a.kind==='guardman'&&a.uid===s.players[1].battle[0].uid));act(s,'guardman');drain(s);assert.ok(s.players[1].battle.some(x=>x.cardId===N));
 const t=setup();give(t,0,'battle',[FANTA]);give(t,1,'battle',[BIG]);t.active=1;attack(t);act(t,'block');assert.equal(t.decision.player,0);const attacker=t.players[1].battle[0].uid;pick(t,attacker);drain(t);assert.ok(t.players[0].grave.some(x=>x.cardId===FANTA));assert.ok(t.players[1].battle.some(x=>x.uid===attacker));assert.ok(e.attackLocked(t,1,t.players[1].battle[0]));assert.equal(t.players[0].shields.length,5);
});
test('Genmu suppresses low-cost entry abilities; GG leaves tap abilities active',()=>{
 const s=setup();give(s,1,'battle',[GEN,N]);play(s,PAGO);assert.equal(s.decision,null);assert.equal(freezes(s).length,0);
 const t=setup();give(t,1,'battle',[GG,N]);t.players[1].battle[0].under=[inst(N)];give(t,0,'battle',[LUNA]);attack(t);assert.equal(t.decision.task.op,'g34_Select');pick(t,t.players[1].battle[1].uid);pick(t,null);drain(t);assert.ok(e.attackLocked(t,1,t.players[1].battle.find(x=>x.cardId===N)));
});
test('modal freeze/draw choices retain spell metadata; CPU values legal targets and avoids drawing the last cards',()=>{
 const s=setup();give(s,1,'battle',[BIG,BIG]);play(s,MODAL);assert.equal(s.decision.choices[e.chooseAI(s).choice].value,1);pick(s,1);const ids=s.players[1].battle.map(x=>x.uid);pick(s,ids[0]);pick(s,ids[1]);assert.equal(freezes(s).length,4);assert.ok(freezes(s).every(x=>x.spellSource===MODAL));
 const t=setup();play(t,MODAL);assert.equal(t.decision.choices[e.chooseAI(t).choice].value,0);pick(t,0);assert.equal(t.players[0].hand.length,2);
 const u=setup();give(u,0,'deck',[N,N]);play(u,MODAL);assert.equal(u.decision.choices[e.chooseAI(u).choice].value,1);pick(u,1);assert.equal(u.winner,null);assert.equal(u.decision,null);assert.equal(u.players[0].deck.length,2);
});
test('Surf resolves bounce before choosing the freeze target and optional no-target finishes normally',()=>{
 const s=setup();give(s,1,'battle',[N,F]);const [first,second]=s.players[1].battle.map(x=>x.uid);play(s,SURF);pick(s,first);assert.ok(s.players[1].hand.some(x=>x.uid===first));assert.deepEqual(s.decision.choices.map(x=>x.value.uid),[second]);pick(s,second);assert.ok(freezes(s).every(x=>x.uid===second));
 const t=setup();give(t,1,'battle',[N]);play(t,SURF);pick(t,t.players[1].battle[0].uid);assert.equal(t.decision,null);assert.equal(freezes(t).length,0);
});
test('all three forty-card CPU decks finish with eighty conserved identities and saved continuation',()=>{
 for(let i=0;i<3;i++){let s=e.createGame([STANDARD190_DECKS[i],PRESETS[i]],{seed:19001+i,first:i%2}),saved=false;const ids=physical(s);while(s.winner===null&&s.actions<1800&&s.turn<160){e.step(s,e.chooseAI(s));assert.deepEqual(physical(s),ids);if(!saved&&s.actions>20){s=JSON.parse(JSON.stringify(s));saved=true;}}assert.ok(saved);assert.notEqual(s.winner,null);assert.equal(ids.length,80);}
});
