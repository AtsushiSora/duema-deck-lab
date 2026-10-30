import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain,GEN,GG,PRESETS} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {STANDARD174_DECKS} from '../tools/fixtures/standard174.mjs';
const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-174.json',import.meta.url)));
const N='dm01-108',F='dm01-097',DE='dm01-027',BO='dm01-086',JOE='dmrp03-083',END='dmrp07-043',START='dm28-036';
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function pick(s,v){act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===v);}
function play(s,id,alternative=false){const x=inst(id);s.players[s.active].hand.push(x);const before=physical(s);act(s,'play',a=>a.uid===x.uid&&(alternative?a.alternative===alternative:!a.alternative));if(s.decision?.type==='evolution')act(s,'evolve');if(s.decision?.type==='fight')act(s,'skipFight');return{uid:x.uid,before};}
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}

test('19 complete official definitions have art, current limits and coverage in three legal forty-card lists',()=>{
 const registry=createCatalogue(snapshot,data.cards,details),covered=new Set(STANDARD174_DECKS.flatMap(d=>d.cards.map(c=>c.id)));assert.equal(m.cards.length,19);
 for(const row of m.cards){assert.ok(covered.has(row.id));assert.deepEqual(row.faces,details.cards.find(x=>x.id===row.id).faces);assert.deepEqual(row.spec,standardCardSpec(details.cards.find(x=>x.id===row.id),{phase:174}));assert.equal(e.card(row.id).supportBatch,'phase-174');assert.ok(row.verification.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(e.card(row.id).limit,m.regulationVerification.limits[row.id]);assert.equal(CARD_IMAGES[row.id],row.image);assert.ok(registry.get(row.id).supported);}
 for(const d of STANDARD174_DECKS){assert.equal(d.cards.reduce((n,c)=>n+c.count,0),40);assert.deepEqual(e.validateDeck(d),[]);assert.equal(registry.coverage(d).unsupported,0);}
});
for(const row of m.cards)test('new summon and turn continuation preserve physical cards: '+row.name,()=>{
 let s=setup();give(s,0,'battle',[N]);give(s,1,'battle',[N]);const x=play(s,row.id);s=JSON.parse(JSON.stringify(s));drain(s);assert.ok(s.players[0].battle.some(y=>y.uid===x.uid));end(s);assert.equal(s.winner,null);assert.deepEqual(physical(s),x.before);
});
test('classifier requires exact timing and matching JOE numbers, and preserves earlier batch specs',()=>{
 for(const row of m.cards){const d=structuredClone(details.cards.find(c=>c.id===row.id));assert.throws(()=>standardCardSpec(d,{phase:173}));d.faces[0].abilityText+='\n未知の能力';assert.throws(()=>standardCardSpec(d,{phase:174}));}
 const d=structuredClone(details.cards.find(c=>c.id===JOE));for(const text of['自分のターンのはじめに、相手のシールドを１つブレイクする。','相手のターンの終わりに、カードを１枚引く。','自分のターンのはじめに、このクリーチャーが墓地にあればカードを１枚引く。','このクリーチャーがバトルに勝った時、破壊する。']){d.faces[0].abilityText=text;assert.throws(()=>standardCardSpec(d,{phase:174}));}d.faces[0].abilityText=m.cards.find(c=>c.id===JOE).faces[0].abilityText.replace('コストを１少なく','コストを２少なく');assert.throws(()=>standardCardSpec(d,{phase:174}));
 for(const phase of[165,166,168,169,170,171,172,173])for(const row of JSON.parse(fs.readFileSync(new URL('../tools/support-phase-'+phase+'.json',import.meta.url))).cards)assert.deepEqual(standardCardSpec(details.cards.find(c=>c.id===row.id),{phase}),row.spec);
});
test('every JOE offers normal payment and its exact reduction, then returns only that physical card and draws once',()=>{
 for(const row of m.cards.filter(c=>c.spec.joeDiscount))for(const discounted of[false,true]){let s=setup();const x=play(s,row.id,discounted?'joe':false);drain(s);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,e.card(row.id).cost-(discounted?row.spec.joeDiscount:0));const n=s.players[0].deck.length;s=JSON.parse(JSON.stringify(s));end(s);assert.equal(s.players[0].battle.some(y=>y.uid===x.uid),!discounted);assert.equal(s.players[0].hand.length,discounted?1:0);assert.equal(s.players[0].deck.length,n);if(discounted)assert.equal(s.players[0].deck.at(-1).uid,x.uid);assert.deepEqual(physical(s),x.before);}
});
test('JOE is payable at its reduced cost with selected mana and respects cost-reduction prohibitions',()=>{
 const s=setup();give(s,0,'hand',[JOE]);const cost=e.card(JOE).cost-e.card(JOE).joeDiscount;give(s,0,'mana',Array(cost).fill(F));const a=e.getLegalActions(s).find(a=>a.alternative==='joe');assert.ok(a);assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&!a.alternative));e.step(s,a,{manualMana:true});assert.equal(s.decision.type,'manaPayment');assert.equal(s.decision.cost,cost);for(const x of s.players[0].mana)act(s,'selectMana',a=>a.uid===x.uid);act(s,'confirmMana');drain(s);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,cost);
 const t=setup();give(t,0,'hand',[JOE]);give(t,1,'battle',['dmrp22-027']);assert.ok(!e.getLegalActions(t).some(a=>a.alternative==='joe'));assert.ok(e.getLegalActions(t).some(a=>a.kind==='play'&&!a.alternative));
});
test('JOE follows evolution and draws after bottoming the whole evolved creature',()=>{
 const s=setup(),x=play(s,JOE,'joe');give(s,0,'hand',['dmr17-l02']);act(s,'play',a=>a.cardId==='dmr17-l02'&&!a.alternative);act(s,'evolve',a=>a.baseUid===x.uid);drain(s);const uid=s.players[0].battle[0].uid,before=physical(s);end(s);assert.ok(!s.players[0].battle.length);assert.ok([x.uid,uid].every(id=>s.players[0].deck.some(y=>y.uid===id)));assert.equal(s.players[0].hand.length,1);assert.deepEqual(physical(s),before);
});
test('JOE does nothing after an early bounce and ordinary resummoning does not inherit the old return',()=>{
 const s=setup(),x=play(s,JOE,'joe');s.active=1;s.phase='main';play(s,BO);act(s,'effect',a=>a.targets.some(t=>t.uid===x.uid));s.active=0;s.phase='main';act(s,'play',a=>a.uid===x.uid&&!a.alternative);drain(s);end(s);assert.ok(s.players[0].battle.some(y=>y.uid===x.uid));assert.equal(s.players[0].hand.length,0);
});
test('JOE still draws when its attempted bottom move is prevented, and ignores a Genmu entering afterward',()=>{
 for(const mode of['stay','genmu']){const s=setup(),x=play(s,JOE,'joe'),body=s.players[0].battle.find(y=>y.uid===x.uid);if(mode==='stay')body.g26Stay=true;else s.players[1].battle.push(inst(GEN));const n=s.players[0].deck.length;end(s);assert.equal(s.players[0].hand.length,1);assert.equal(s.players[0].battle.some(y=>y.uid===x.uid),mode==='stay');assert.equal(s.players[0].deck.length,n-(mode==='stay'?1:0));}
});
test('turn-start effects trigger only on the owning turn and resolve before the normal draw',()=>{
 for(const row of m.cards.filter(c=>c.spec.g174Start)){const s=setup();give(s,0,'battle',[row.id]);const n=s.players[0].deck.length;end(s);assert.equal(s.players[0].mana.length,50);assert.equal(s.players[0].grave.length,0);end(s);if(row.spec.g174Start[0].op==='Mill'){assert.equal(s.players[0].grave.length,2);assert.equal(s.players[0].mana.length,50);assert.equal(s.players[0].deck.length,n-3);}else{assert.equal(s.players[0].mana.length,51);assert.equal(s.players[0].deck.length,n-2);}assert.equal(s.players[0].hand.length,1);}
});
test('optional start ramp can be declined before the normal draw and CPU avoids taking the final card as mana',()=>{
 const s=setup();give(s,1,'battle',[START]);give(s,1,'deck',[N,F]);s.phase='attack';act(s,'endTurn');assert.equal(s.phase,'start');assert.equal(s.players[1].hand.length,0);pick(s,null);assert.equal(s.players[1].hand.length,1);assert.equal(s.players[1].mana.length,50);
 const t=setup();give(t,1,'battle',[START]);give(t,1,'deck',[N]);t.phase='attack';act(t,'endTurn');assert.equal(t.decision.choices[e.chooseAI(t).choice].value,null);
});
test('own-end mill and mana-retrieval abilities trigger once, and opponent end does not trigger them',()=>{
 for(const row of m.cards.filter(c=>c.spec.g174End)){const s=setup();give(s,0,'battle',[row.id]);const n=s.players[0].deck.length;end(s);const task=row.spec.g174End[0];if(task.op==='Mill'){assert.equal(s.players[0].grave.length,1);assert.equal(s.players[0].deck.length,n-1);}else{assert.equal(s.players[0].hand.length,1);assert.equal(s.players[0].mana.length,49);}const grave=s.players[0].grave.length;end(s);assert.equal(s.players[0].grave.length,grave);}
});
test('optional end mill can be declined and mandatory end mill cannot, while library loss interrupts the next turn',()=>{
 const s=setup();give(s,0,'battle',[END]);const n=s.players[0].deck.length;s.phase='attack';act(s,'endTurn');assert.equal(s.decision.task.op,'g34_Mill');pick(s,null);assert.equal(s.players[0].deck.length,n);assert.equal(s.active,1);
 const t=setup();give(t,0,'battle',['dm24ex4-068']);give(t,0,'deck',[N]);t.phase='attack';act(t,'endTurn');drain(t);assert.equal(t.winner,1);assert.equal(t.active,0);assert.equal(t.players[0].grave.length,1);
});
test('mana return can select a tapped or facedown card without revealing hidden art or identity before moving',()=>{
 for(const id of['dmx22b-090','dmr08-034']){const s=setup();give(s,0,'battle',[id]);const x=s.players[0].mana[0];x.tapped=true;x.faceDown=true;const name=e.card(x).name;s.phase='attack';act(s,'endTurn');const choice=s.decision.choices.find(c=>c.value?.uid===x.uid);assert.ok(choice);assert.equal(choice.cardId,undefined);assert.ok(!choice.label.includes(name));assert.equal(choice.label,'裏向きのカード');pick(s,x.uid);drain(s);const returned=s.players[0].hand.find(y=>y.uid===x.uid);assert.ok(returned&&!returned.faceDown&&!returned.tapped);}
});
test('multiple own-start and own-end triggers remain independent and survive JSON continuation',()=>{
 let s=setup();give(s,1,'battle',[START,START]);s.phase='attack';act(s,'endTurn');assert.equal(s.decision.type,'effectOrder');s=JSON.parse(JSON.stringify(s));drain(s);assert.equal(s.players[1].mana.length,52);assert.equal(s.players[1].hand.length,1);
 const t=setup();give(t,0,'battle',[END,END,'dm24ex4-068']);t.phase='attack';act(t,'endTurn');assert.equal(t.decision.type,'effectOrder');drain(t);assert.equal(t.players[0].grave.length,3);
});
test('Genmu and ignored abilities suppress turn triggers, but GG does not suppress them',()=>{
 for(const mode of['genmu','ignored','gg','sealed'])for(const id of[END,START]){const s=setup();give(s,0,'battle',[id]);const x=s.players[0].battle[0];if(mode==='ignored')x.g35Ignored=s.turn;else if(mode==='sealed'){s.players[0].seals=[{...inst(N),faceDown:true,sealOf:x.uid}];x.sealed=true;}else give(s,1,'battle',[mode==='genmu'?GEN:GG]);if(mode==='gg')s.players[1].battle[0].under=[inst(N)];end(s);if(id===START){if(mode==='ignored')x.g35Ignored=s.turn+1;end(s);}assert.equal(id===END?s.players[0].grave.length:s.players[0].mana.length-50,mode==='gg'?1:0,mode+' '+id);}
});
test('Abyss Rush end return and the new end-mill ability both resolve even if returning is ordered first',()=>{
 const s=setup();give(s,0,'grave',['promoy22-041']);const uid=s.players[0].grave[0].uid;act(s,'play',a=>a.uid===uid&&a.origin==='grave');drain(s);s.phase='attack';act(s,'endTurn');assert.equal(s.decision.type,'effectOrder');const first=e.getLegalActions(s).find(a=>s.pendingEffects.find(x=>x.effectId===a.effectId)?.task?.op!=='g34_Sequence');assert.ok(first);e.step(s,first);drain(s);assert.ok(!s.players[0].battle.length);assert.equal(s.players[0].grave.length,1);assert.ok(s.players[0].deck.some(x=>x.uid===uid));
});
test('all after-battle self-destructors can win a block first, then destroy only themselves',()=>{
 for(const row of m.cards.filter(c=>c.spec.afterBattleDie)){const s=setup();give(s,0,'battle',[N]);give(s,1,'battle',[row.id]);const a=s.players[0].battle[0],b=s.players[1].battle[0];b.powerModifiers=[{amount:5000-e.power(b,false,s)}];if(!row.spec.blocker)b.g34Grants=[{turn:s.turn,blocker:true}];const before=physical(s);s.phase='attack';act(s,'attack',a=>a.target==='player');act(s,'block',a=>a.uid===b.uid);drain(s);assert.ok(s.players[0].grave.some(x=>x.uid===a.uid));assert.ok(s.players[1].grave.some(x=>x.uid===b.uid));assert.deepEqual(physical(s),before);}
});
test('after-battle destruction respects prevention and does not happen after a direct player attack',()=>{
 const s=setup();give(s,0,'battle',[N]);give(s,1,'battle',['dmx04-012']);const b=s.players[1].battle[0];b.g26Stay=true;s.phase='attack';act(s,'attack',a=>a.target==='player');act(s,'block');drain(s);assert.ok(s.players[1].battle.some(x=>x.uid===b.uid));
 const t=setup();give(t,0,'battle',['dmrp02-044']);t.phase='attack';act(t,'attack',a=>a.target==='player');act(t,'noBlock');drain(t);assert.equal(t.players[0].battle.length,1);
});
test('three CPU forty-card fixtures finish with saved continuation and eighty conserved physical cards',()=>{
 for(const[i,d]of STANDARD174_DECKS.entries()){let s=e.createGame([d,PRESETS[i%PRESETS.length]],{seed:17401+i,first:i%2}),saved=false;const ids=physical(s);while(s.winner===null&&s.actions<1800&&s.turn<160){e.step(s,e.chooseAI(s));assert.deepEqual(physical(s),ids);if(!saved&&s.actions>20){s=JSON.parse(JSON.stringify(s));saved=true;}}assert.ok(saved);assert.notEqual(s.winner,null,d.name);assert.equal(ids.length,80);}
});
