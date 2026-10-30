import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain,GEN,GG,PRESETS} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {STANDARD178_DECKS} from '../tools/fixtures/standard178.mjs';
const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-178.json',import.meta.url)));
const N='dm01-108',F='dm01-097',DRAW='dmrp03-068',OPT='dmr13-084',WISH='dm25rp2-037',DISH='dm22rp2-061',TAP='dmr15-034';
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function pick(s,v){act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===v);}
function attack(s,uid=s.players[s.active].battle[0].uid,target='player'){s.phase='attack';act(s,'attack',a=>a.uid===uid&&a.target===target);}
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}
test('nine complete definitions have official faces, images, limits and coverage in a legal forty-card list',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);assert.equal(m.cards.length,9);
 for(const row of m.cards){assert.deepEqual(row.faces,details.cards.find(x=>x.id===row.id).faces);assert.deepEqual(row.spec,standardCardSpec(details.cards.find(x=>x.id===row.id),{phase:178}));assert.equal(e.card(row.id).supportBatch,'phase-178');assert.ok(row.verification.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(e.card(row.id).limit,m.regulationVerification.limits[row.id]);assert.equal(CARD_IMAGES[row.id],row.image);assert.ok(registry.get(row.id).supported);assert.ok(STANDARD178_DECKS[0].cards.some(x=>x.id===row.id));}
 assert.equal(STANDARD178_DECKS[0].cards.reduce((n,x)=>n+x.count,0),40);assert.deepEqual(e.validateDeck(STANDARD178_DECKS[0]),[]);assert.equal(registry.coverage(STANDARD178_DECKS[0]).unsupported,0);
});
for(const row of m.cards)test(row.name+': blocking resolves its ability for the defender and conserves physical identities',()=>{
 let s=setup();give(s,0,'battle',[N,F]);give(s,1,'battle',[row.id]);give(s,1,'grave',[N]);const blocker=s.players[1].battle[0],attacker=s.players[0].battle[0],other=s.players[0].battle[1],op=row.spec.g178Block[0].op,grave=s.players[1].grave[0].uid;if(op==='AfterAttackDestroy')blocker.powerModifiers=[{amount:10000-e.power(blocker,false,s)}];else attacker.powerModifiers=[{amount:20000-e.power(attacker,false,s)}];const ids=physical(s);attack(s);act(s,'block',a=>a.uid===blocker.uid);
 if(op!=='Draw'&&op!=='AfterAttackDestroy'){assert.ok(s.players[0].battle.some(x=>x.uid===attacker.uid));assert.ok(s.players[1].battle.some(x=>x.uid===blocker.uid));s=JSON.parse(JSON.stringify(s));pick(s,op==='Offer'?true:op==='Select'?grave:other.uid);}drain(s);
 assert.equal(s.players[1].hand.length,['Draw','Offer','Select'].includes(op)?1:0);if(op==='Target')assert.equal(s.players[0].battle.find(x=>x.uid===other.uid).tapped,true);assert.ok(s.players[1].grave.some(x=>x.uid===blocker.uid));if(op==='AfterAttackDestroy')assert.ok(s.players[0].grave.some(x=>x.uid===attacker.uid));assert.deepEqual(physical(s),ids);
});
test('classifier rejects incomplete and mixed block clauses and preserves every earlier phase definition',()=>{
 for(const row of m.cards){const d=structuredClone(details.cards.find(x=>x.id===row.id));assert.throws(()=>standardCardSpec(d,{phase:177}));d.faces[0].abilityText+='\n未知の能力';assert.throws(()=>standardCardSpec(d,{phase:178}));}
 const d=structuredClone(details.cards.find(x=>x.id===OPT));for(const text of['このクリーチャーがブロックした時、自分のシールドが２つ以下ならカードを１枚引く。','このクリーチャーがブロックされた時、カードを１枚引く。','このクリーチャーがブロックした時、その攻撃の後、このクリーチャーを破壊してもよい。','このクリーチャーがブロックした時、カードを１枚引く。\nこのクリーチャーがブロックした時、カードを２枚引く。']){d.faces[0].abilityText=text;assert.throws(()=>standardCardSpec(d,{phase:178}));}
 for(const phase of[168,169,170,171,172,173,174,175,176,177])for(const row of JSON.parse(fs.readFileSync(new URL('../tools/support-phase-'+phase+'.json',import.meta.url))).cards)assert.deepEqual(standardCardSpec(details.cards.find(c=>c.id===row.id),{phase}),row.spec);
});
test('every new card can be summoned normally and NEO may enter without evolution',()=>{
 for(const row of m.cards){const s=setup();give(s,0,'hand',[row.id]);act(s,'play',a=>a.cardId===row.id&&!a.alternative);if(s.decision?.type==='evolution')act(s,'evolve',a=>!a.baseUid);drain(s);assert.equal(s.players[0].battle[0].cardId,row.id);assert.ok(!s.players[0].battle[0].under?.length);assert.equal(s.players[0].hand.length,0);end(s);assert.equal(s.winner,null);}
});
test('all optional block draws may be declined; mandatory draw loses to the last-card draw before combat',()=>{
 for(const row of m.cards.filter(c=>c.spec.g178Block[0].op==='Offer')){const s=setup();give(s,0,'battle',[N]);give(s,1,'battle',[row.id]);attack(s);act(s,'block');assert.equal(s.decision.player,1);pick(s,null);drain(s);assert.equal(s.players[1].hand.length,0);}
 const s=setup();give(s,0,'battle',[N]);give(s,1,'battle',[DRAW]);give(s,1,'deck',[F]);attack(s);act(s,'block');assert.equal(s.winner,0);assert.equal(s.players[1].hand.length,1);assert.equal(s.players[0].battle.length,1);assert.equal(s.players[1].battle.length,1);
});
test('CPU declines an optional final draw and takes a safe draw',()=>{
 for(const count of[1,2]){const s=setup();give(s,0,'battle',[N]);give(s,1,'battle',[OPT]);give(s,1,'deck',Array(count).fill(F));attack(s);act(s,'block');assert.equal(s.decision.choices[e.chooseAI(s).choice].value,count===1?null:true);drain(s);assert.equal(s.winner,null);}
});
test('block abilities are not triggered by merely being attacked or by a Guardman redirection',()=>{
 for(const guardman of[false,true]){const s=setup();give(s,0,'battle',[N]);give(s,1,'battle',[DRAW,N]);const x=s.players[1].battle[0],other=s.players[1].battle[1];if(guardman){x.g34Grants=[{turn:s.turn,guardman:true}];other.tapped=true;attack(s,s.players[0].battle[0].uid,other.uid);act(s,'guardman',a=>a.uid===x.uid);}else{x.tapped=true;attack(s,s.players[0].battle[0].uid,x.uid);}drain(s);assert.equal(s.players[1].hand.length,0);}
});
test('GG does not suppress block effects, while Genmu and ignored abilities do',()=>{
 for(const mode of['gg','genmu','ignored']){const s=setup();give(s,0,'battle',[N]);give(s,1,'battle',[DRAW]);if(mode==='ignored')s.players[1].battle[0].g35Ignored=s.turn;else{s.players[0].battle.push(inst(mode==='gg'?GG:GEN));if(mode==='gg')s.players[0].battle.at(-1).under=[inst(N)];}if(mode==='genmu')s.players[1].battle[0].g34Grants=[{turn:s.turn,blocker:true}];attack(s,s.players[0].battle[0].uid);const a=e.getLegalActions(s).find(a=>a.kind==='block');if(mode!=='gg'){assert.ok(!a);continue;}act(s,'block');drain(s);assert.equal(s.players[1].hand.length,1);}
});
test('Wish recovers an actual grave creature before both attacks and blocks, including its NEO evolution option',()=>{
 const s=setup();give(s,0,'battle',[F]);give(s,0,'hand',[WISH]);give(s,0,'grave',[N,'dm01-027']);const base=s.players[0].battle[0].uid,uid=s.players[0].grave[0].uid;act(s,'play',a=>a.cardId===WISH&&!a.alternative);assert.equal(s.decision.type,'evolution');assert.ok(e.getLegalActions(s).some(a=>!a.baseUid));act(s,'evolve',a=>a.baseUid===base);const x=s.players[0].battle[0];assert.ok(e.isEvolution(x));attack(s,x.uid);assert.equal(s.decision.task.origin,'grave');assert.ok(!s.decision.choices.some(c=>c.value?.uid===s.players[0].grave.find(x=>x.cardId==='dm01-027').uid));pick(s,uid);assert.ok(s.players[0].hand.some(x=>x.uid===uid));act(s,'noBlock');drain(s);assert.equal(s.players[0].battle[0].uid,x.uid);
});
test('Dish and Tree self-destruct after their own attack and after a successful block, not before battle',()=>{
 for(const id of[DISH,'dmrp08-077'])for(const block of[false,true]){const s=setup();give(s,block?1:0,'battle',[id]);if(block)give(s,0,'battle',[N]);const x=s.players[block?1:0].battle[0];x.powerModifiers=[{amount:10000-e.power(x,false,s)}];const ids=physical(s);attack(s);if(block)act(s,'block',a=>a.uid===x.uid);else{assert.ok(s.players[0].battle.some(y=>y.uid===x.uid));act(s,'noBlock');}drain(s);assert.ok(s.players[block?1:0].grave.some(y=>y.uid===x.uid));if(block)assert.equal(s.players[0].battle.length,0);else assert.equal(s.players[1].shields.length,4);assert.deepEqual(physical(s),ids);}
});
test('resolved post-block self-destruction respects prevention and does not affect a bounced physical card',()=>{
 const s=setup();give(s,0,'battle',[N]);give(s,1,'battle',[DISH]);const x=s.players[1].battle[0];x.g26Stay=true;x.powerModifiers=[{amount:10000-e.power(x,false,s)}];attack(s);act(s,'block');drain(s);assert.ok(s.players[1].battle.some(y=>y.uid===x.uid));
 const t=setup();give(t,0,'battle',[DISH]);give(t,1,'shields',['dm01-086']);const uid=t.players[0].battle[0].uid;attack(t);act(t,'noBlock');act(t,'useTrigger');act(t,'effect',a=>a.targets.some(x=>x.uid===uid));drain(t);assert.ok(t.players[0].hand.some(x=>x.uid===uid));assert.ok(!t.players[0].grave.some(x=>x.uid===uid));
});
test('tap on block can target an unblocked second enemy and optional tap can be declined',()=>{
 for(const skip of[false,true]){const s=setup();give(s,0,'battle',[N,F]);give(s,1,'battle',[TAP]);const second=s.players[0].battle[1],blocker=s.players[1].battle[0];attack(s);act(s,'block');assert.ok(s.players[1].battle.some(x=>x.uid===blocker.uid));pick(s,skip?null:second.uid);drain(s);assert.equal(second.tapped,!skip);}
});
test('both new shield triggers allow immediate use; NEO shield summon offers ordinary and valid evolution bases',()=>{
 for(const id of[WISH,DISH]){const s=setup();give(s,0,'battle',[N]);give(s,1,'battle',[F]);give(s,1,'shields',[id]);const base=s.players[1].battle[0].uid,ids=physical(s);attack(s);act(s,'noBlock');act(s,'useTrigger');if(id===WISH){assert.equal(s.decision.type,'triggerEvolution');assert.ok(e.getLegalActions(s).some(a=>!a.baseUid));assert.ok(e.getLegalActions(s).some(a=>a.baseUid===base));act(s,'triggerEvolve',a=>a.baseUid===base);}drain(s);assert.ok(s.players[1].battle.some(x=>x.cardId===id));assert.deepEqual(physical(s),ids);}
});
test('three CPU games finish with JSON continuation and eighty conserved physical cards',()=>{
 for(let i=0;i<3;i++){let s=e.createGame([STANDARD178_DECKS[0],PRESETS[i]],{seed:17801+i,first:i%2}),saved=false;const ids=physical(s);while(s.winner===null&&s.actions<1800&&s.turn<160){e.step(s,e.chooseAI(s));assert.deepEqual(physical(s),ids);if(!saved&&s.actions>20){s=JSON.parse(JSON.stringify(s));saved=true;}}assert.ok(saved);assert.notEqual(s.winner,null);assert.equal(ids.length,80);}
});
