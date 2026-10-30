import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain,GEN,GG,PRESETS} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {STANDARD179_DECKS} from '../tools/fixtures/standard179.mjs';
const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-179.json',import.meta.url)));
const N='dm01-108',F='dm01-097',NATE='dm25rp4-066',END='dmrp01-039',START='dmrp19-030',ARISA='dmrp03-070',WINTER='dmrp20-036',DE='dm01-027';
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function pick(s,v){act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===v);}
function play(s,id){s.players[s.active].hand.push(inst(id));act(s,'play',a=>a.cardId===id&&!a.alternative);}
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}
function destroy(s,owner,uid){s.active=1-owner;s.phase='main';play(s,DE);act(s,'effect',a=>a.targets.some(x=>x.uid===uid));drain(s);}
test('five complete definitions match official art, faces and limits and form a legal forty-card fixture',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);assert.equal(m.cards.length,5);
 for(const row of m.cards){assert.deepEqual(row.faces,details.cards.find(x=>x.id===row.id).faces);assert.deepEqual(row.spec,standardCardSpec(details.cards.find(x=>x.id===row.id),{phase:179}));assert.equal(e.card(row.id).supportBatch,'phase-179');assert.ok(row.verification.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(e.card(row.id).limit,m.regulationVerification.limits[row.id]);assert.equal(CARD_IMAGES[row.id],row.image);assert.ok(registry.get(row.id).supported);assert.ok(STANDARD179_DECKS[0].cards.some(x=>x.id===row.id));}
 assert.equal(STANDARD179_DECKS[0].cards.reduce((n,x)=>n+x.count,0),40);assert.deepEqual(e.validateDeck(STANDARD179_DECKS[0]),[]);assert.equal(registry.coverage(STANDARD179_DECKS[0]).unsupported,0);
});
test('new clauses reject unsupported conditions and preserve all earlier phase definitions',()=>{
 for(const row of m.cards){const d=structuredClone(details.cards.find(x=>x.id===row.id));assert.throws(()=>standardCardSpec(d,{phase:178}));d.faces[0].abilityText+='\n未知の能力';assert.throws(()=>standardCardSpec(d,{phase:179}));}
 const d=structuredClone(details.cards.find(x=>x.id===ARISA));for(const line of['自分の他のクリーチャーを２体、手札に戻してもよい。','このクリーチャーが出た時、自分のクリーチャーを１体手札に戻してもよい。そうしたらカードを１枚引く。','各ターンのはじめに、カードを１枚引く。','相手のターンのはじめに、自分のシールドが２つ以下ならカードを１枚引く。']){d.faces[0].abilityText=line;assert.throws(()=>standardCardSpec(d,{phase:179}));}
 for(const phase of[168,169,170,171,172,173,174,175,176,177,178])for(const row of JSON.parse(fs.readFileSync(new URL('../tools/support-phase-'+phase+'.json',import.meta.url))).cards)assert.deepEqual(standardCardSpec(details.cards.find(c=>c.id===row.id),{phase}),row.spec);
});
test('Arisa can return another own creature, excludes itself and all enemy creatures, and survives saving',()=>{
 let s=setup();give(s,0,'battle',[N,ARISA]);give(s,1,'battle',[F]);const [own,other]=s.players[0].battle;play(s,ARISA);const source=s.players[0].battle.at(-1),ids=physical(s);assert.ok(s.decision.choices.some(c=>c.value?.uid===own.uid));assert.ok(s.decision.choices.some(c=>c.value?.uid===other.uid));assert.ok(!s.decision.choices.some(c=>c.value?.uid===source.uid));assert.ok(!s.decision.choices.some(c=>c.value?.uid===s.players[1].battle[0].uid));assert.equal(s.decision.choices[e.chooseAI(s).choice].value,null);s=JSON.parse(JSON.stringify(s));pick(s,other.uid);drain(s);assert.ok(s.players[0].hand.some(x=>x.uid===other.uid));assert.ok(s.players[0].battle.some(x=>x.uid===source.uid));assert.deepEqual(physical(s),ids);
});
test('Arisa can decline with no other creature and can return a friendly untargetable creature',()=>{
 const s=setup();play(s,ARISA);assert.equal(s.decision.choices.length,1);pick(s,null);drain(s);assert.equal(s.players[0].battle.length,1);
 const t=setup();give(t,0,'battle',['dm11-007']);const x=t.players[0].battle[0];play(t,ARISA);pick(t,x.uid);drain(t);assert.ok(t.players[0].hand.some(y=>y.uid===x.uid));
});
test('Ilkaile own-end return may select itself, another ally or nothing, and cannot select the opponent',()=>{
 for(const mode of['self','other','none']){const s=setup();give(s,0,'battle',[END,N]);give(s,1,'battle',[F]);const [source,other]=s.players[0].battle,ids=physical(s);s.phase='attack';act(s,'endTurn');assert.ok(!s.decision.choices.some(c=>c.value?.uid===s.players[1].battle[0].uid));pick(s,mode==='self'?source.uid:mode==='other'?other.uid:null);drain(s);assert.equal(s.players[0].hand.length,mode==='none'?0:1);assert.equal(s.players[0].battle.length,mode==='none'?2:1);assert.deepEqual(physical(s),ids);}
});
test('Winter returns the opponent first and then optionally an ally, preserving an evolution stack',()=>{
 let s=setup();const base=inst(N),top=inst('dmr17-l02');top.under=[base];s.players[0].battle=[top];give(s,1,'battle',[F]);const enemy=s.players[1].battle[0];play(s,WINTER);assert.ok(!s.decision.choices.some(c=>c.value?.uid===top.uid));const ids=physical(s);pick(s,enemy.uid);assert.ok(s.players[1].hand.some(x=>x.uid===enemy.uid));assert.ok(s.players[0].battle.some(x=>x.uid===top.uid));s=JSON.parse(JSON.stringify(s));pick(s,top.uid);drain(s);assert.ok([top.uid,base.uid].every(uid=>s.players[0].hand.some(x=>x.uid===uid)));assert.equal(s.players[0].battle.length,0);assert.deepEqual(physical(s),ids);
});
test('Winter continues with either side empty and its own return is genuinely optional',()=>{
 for(const enemy of[false,true]){const s=setup();give(s,0,'battle',[N]);if(enemy)give(s,1,'battle',[F]);play(s,WINTER);if(enemy)pick(s,s.players[1].battle[0].uid);assert.equal(s.decision.task.owner,'self');pick(s,null);drain(s);assert.equal(s.players[0].battle.length,1);assert.equal(s.players[1].battle.length,0);}
 const s=setup();give(s,1,'battle',[F]);play(s,WINTER);pick(s,s.players[1].battle[0].uid);drain(s);assert.equal(s.decision,null);assert.equal(s.winner,null);
});
test('Nate randomly discards an opponent hand card on entry, then only the opponent draws when destroyed',()=>{
 for(const owner of[0,1]){const s=setup();s.active=owner;give(s,1-owner,'hand',[N,F]);const deck=s.players[1-owner].deck.length;play(s,NATE);drain(s);assert.equal(s.players[1-owner].hand.length,1);assert.equal(s.players[1-owner].grave.length,1);const x=s.players[owner].battle[0],ids=physical(s);destroy(s,owner,x.uid);assert.equal(s.players[1-owner].deck.length,deck-1);assert.equal(s.players[owner].hand.length,0);assert.equal(s.players[1-owner].hand.length,2);assert.ok(s.players[owner].grave.some(y=>y.uid===x.uid));assert.equal(physical(s).length,ids.length+1);}
});
test('bouncing Nate does not draw for the opponent, and a last-card opponent draw uses that opponent loss or Shako win',()=>{
 const s=setup();give(s,1,'battle',[NATE]);const uid=s.players[1].battle[0].uid,deck=s.players[0].deck.length;play(s,WINTER);pick(s,uid);drain(s);assert.equal(s.players[0].deck.length,deck);assert.ok(s.players[1].hand.some(x=>x.uid===uid));
 for(const shako of[false,true]){const t=setup();give(t,0,'battle',[NATE]);if(shako)give(t,1,'battle',['dmrp03-s03']);give(t,1,'deck',[N]);const uid=t.players[0].battle[0].uid;destroy(t,0,uid);assert.equal(t.winner,shako?1:0);assert.equal(t.players[1].hand.length,1);assert.equal(t.players[0].hand.length,0);}
});
test('Gauss opponent-start tap resolves after untap and before normal draw, controlled by its owner',()=>{
 let s=setup();give(s,0,'battle',[START]);give(s,1,'battle',[N]);const uid=s.players[1].battle[0].uid;s.players[1].battle[0].tapped=true;const deck=s.players[1].deck.length,ids=physical(s);s.phase='attack';act(s,'endTurn');assert.equal(s.active,1);assert.equal(s.phase,'start');assert.equal(s.decision.player,0);assert.equal(s.players[1].hand.length,0);assert.equal(s.players[1].battle[0].tapped,false);assert.ok(s.decision.choices.every(c=>c.value.p===1));s=JSON.parse(JSON.stringify(s));pick(s,uid);drain(s);assert.equal(s.players[1].battle[0].tapped,true);assert.equal(s.players[1].hand.length,1);assert.equal(s.players[1].deck.length,deck-1);assert.equal(s.players[0].hand.length,0);assert.equal(s.phase,'charge');assert.deepEqual(physical(s),ids);end(s);assert.equal(s.decision,null);assert.equal(s.active,0);assert.equal(s.players[0].hand.length,1);
});
test('Gauss does not fire during an extra own turn but fires when the opponent actually starts, even if its last draw loses',()=>{
 const s=setup();give(s,0,'battle',[START]);give(s,1,'battle',[N]);give(s,1,'deck',[F]);s.extraTurns=[{player:0,source:START}];end(s);assert.equal(s.active,0);assert.equal(s.decision,null);s.phase='attack';act(s,'endTurn');assert.equal(s.decision.player,0);assert.equal(s.players[1].hand.length,0);pick(s,s.players[1].battle[0].uid);drain(s);assert.equal(s.winner,0);assert.equal(s.players[1].hand.length,1);
});
test('multiple Gauss abilities remain separate and no eligible target does not stall the start phase',()=>{
 let s=setup();give(s,0,'battle',[START,START]);give(s,1,'battle',[N,F]);s.phase='attack';act(s,'endTurn');assert.equal(s.decision.type,'effectOrder');s=JSON.parse(JSON.stringify(s));drain(s);assert.equal(s.players[1].hand.length,1);assert.equal(s.phase,'charge');
 const t=setup();give(t,0,'battle',[START]);end(t);assert.equal(t.active,1);assert.equal(t.phase,'charge');assert.equal(t.players[1].hand.length,1);assert.equal(t.decision,null);
});
test('Gauss retains EX Life and its real shield can replace a departure without losing the start ability',()=>{
 const s=setup();play(s,START);drain(s);const x=s.players[0].battle[0];assert.equal(s.players[0].shields.length,6);assert.equal(e.exLifeShields(s,0,x).length,1);s.active=1;s.phase='main';play(s,DE);act(s,'effect',a=>a.targets.some(y=>y.uid===x.uid));drain(s);assert.ok(s.players[0].battle.some(y=>y.uid===x.uid));assert.equal(s.players[0].shields.length,5);give(s,1,'battle',[N]);s.active=0;s.phase='attack';act(s,'endTurn');assert.equal(s.decision.player,0);pick(s,s.players[1].battle[0].uid);drain(s);assert.equal(s.players[1].battle[0].tapped,true);
});
test('GG and Genmu leave Gauss seven-cost start ability active; sealed or ignored Gauss does not trigger',()=>{
 for(const mode of['gg','genmu','ignored','sealed']){const s=setup();give(s,0,'battle',[START]);const x=s.players[0].battle[0];give(s,1,'battle',[N]);if(mode==='gg'||mode==='genmu'){s.players[1].battle.push(inst(mode==='gg'?GG:GEN));if(mode==='gg')s.players[1].battle.at(-1).under=[inst(N)];}if(mode==='ignored')x.g35Ignored=s.turn+1;if(mode==='sealed'){x.sealed=true;s.players[0].seals=[{...inst(F),faceDown:true,sealOf:x.uid}];}s.phase='attack';act(s,'endTurn');if(mode==='gg'||mode==='genmu'){assert.equal(s.decision.player,0);pick(s,s.players[1].battle[0].uid);drain(s);assert.equal(s.players[1].battle[0].tapped,true);}else{assert.equal(s.decision,null);assert.equal(s.players[1].battle[0].tapped,false);}}
});
test('Winter works as a shield trigger with the correct defender owning each choice',()=>{
 const s=setup();give(s,0,'battle',[N]);give(s,1,'battle',[F]);give(s,1,'shields',[WINTER]);const own=s.players[1].battle[0].uid,enemy=s.players[0].battle[0].uid,ids=physical(s);s.phase='attack';act(s,'attack',a=>a.target==='player');act(s,'noBlock');act(s,'useTrigger');assert.equal(s.decision.player,1);pick(s,enemy);assert.ok(s.players[0].hand.some(x=>x.uid===enemy));pick(s,own);drain(s);assert.ok(s.players[1].hand.some(x=>x.uid===own));assert.deepEqual(physical(s),ids);
});
test('three CPU games finish with JSON continuation and eighty conserved physical cards',()=>{
 for(let i=0;i<3;i++){let s=e.createGame([STANDARD179_DECKS[0],PRESETS[i]],{seed:17901+i,first:i%2}),saved=false;const ids=physical(s);while(s.winner===null&&s.actions<1800&&s.turn<160){e.step(s,e.chooseAI(s));assert.deepEqual(physical(s),ids);if(!saved&&s.actions>20){s=JSON.parse(JSON.stringify(s));saved=true;}}assert.ok(saved);assert.notEqual(s.winner,null);assert.equal(ids.length,80);}
});
