import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain,GEN,GG,PRESETS} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {STANDARD173_DECKS} from '../tools/fixtures/standard173.mjs';
const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-173.json',import.meta.url)));
const N='dm01-108',F='dm01-097',W='dm01-083',DE='dm01-027',BO='dm01-086',MULTI='dm25rp1-035',NORON='dmbd10-017',APUL='dmrp22-042',SYN='dm23rp3-013',TWIN=data.cards.find(c=>c.spellFace&&c.type==='creature').id;
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function pick(s,v){act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===v);}
function play(s,id){const x=inst(id);s.players[s.active].hand.push(x);const before=physical(s);act(s,'play',a=>a.uid===x.uid&&!a.alternative);if(s.decision?.type==='evolution')act(s,'evolve',a=>!a.baseUid);return{uid:x.uid,before};}
function recover(s,row){if(row.spec.g172Death){s.active=1;play(s,DE);act(s,'effect',a=>a.targets.some(x=>x.uid===s.players[0].battle[0].uid));}else if(row.spec.g34Attack){s.phase='attack';act(s,'attack',a=>a.target==='player');}else play(s,row.id);}
const recoverers=m.cards.filter(c=>[...(c.spec.g34Tasks||[]),...(c.spec.g172Death||[]),...(c.spec.g34Attack||[])].some(t=>t.op==='Select'&&t.filter?.spell));

test('22 distinct whole definitions match official faces, limits and images in three legal forty-card decks',()=>{
 const registry=createCatalogue(snapshot,data.cards,details),covered=new Set(STANDARD173_DECKS.flatMap(d=>d.cards.map(c=>c.id)));assert.equal(m.cards.length,22);assert.equal(new Set(m.cards.map(c=>c.name)).size,22);assert.ok(!m.cards.some(c=>c.name.includes('&#x')));
 for(const row of m.cards){assert.ok(covered.has(row.id));assert.equal(e.card(row.id).supportBatch,'phase-173');assert.deepEqual(row.faces,details.cards.find(c=>c.id===row.id).faces);assert.deepEqual(row.spec,standardCardSpec(details.cards.find(c=>c.id===row.id),{phase:173}));assert.equal(CARD_IMAGES[row.id],row.image);assert.ok(row.verification.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(e.card(row.id).limit,m.regulationVerification.limits[row.id]);assert.ok(registry.get(row.id).supported);}
 for(const d of STANDARD173_DECKS){assert.equal(d.cards.reduce((n,c)=>n+c.count,0),40);assert.deepEqual(e.validateDeck(d),[]);assert.equal(registry.coverage(d).unsupported,0);}
});
for(const row of m.cards)test('full summon or cast completes after JSON continuation without losing a physical card: '+row.name,()=>{
 let s=setup();give(s,0,'hand',[N,F]);give(s,0,'grave',[DE,BO,TWIN,N]);give(s,1,'battle',[N,F]);const x=play(s,row.id);s=JSON.parse(JSON.stringify(s));drain(s);assert.equal(s.winner,null);assert.equal(s.decision,null);assert.ok(s.players[0][e.card(row.id).type==='spell'?'grave':'battle'].some(y=>y.uid===x.uid));assert.deepEqual(physical(s),x.before);
});
test('classifier rejects conditional, enemy-hand and unsupported selection variants and preserves every previous manifest',()=>{
 for(const row of m.cards){const d=structuredClone(details.cards.find(c=>c.id===row.id));assert.throws(()=>standardCardSpec(d,{phase:172}));d.faces[0].abilityText+='\n未知の能力';assert.throws(()=>standardCardSpec(d,{phase:173}));}
 const d=structuredClone(details.cards.find(c=>c.id===MULTI));for(const text of['相手のクリーチャーを２体選び、持ち主の手札に戻す。','相手のクリーチャーを２体まで選び、タップする。','相手の手札を１枚選び、捨てる。','自分の墓地から呪文を１枚、コストを支払わずに唱える。','呪文を２枚、自分の墓地から手札に戻してもよい。']){d.faces[0].abilityText=text;assert.throws(()=>standardCardSpec(d,{phase:173}));}
 for(const phase of[165,166,168,169,170,171,172])for(const row of JSON.parse(fs.readFileSync(new URL('../tools/support-phase-'+phase+'.json',import.meta.url))).cards)assert.deepEqual(standardCardSpec(details.cards.find(c=>c.id===row.id),{phase}),row.spec);
});
test('two-target bounce permits zero, one or two different enemies and moves them only after selection is complete',()=>{
 for(const n of[0,1,2]){let s=setup();give(s,0,'battle',[N]);give(s,1,'battle',[N,F,W,'dmsd20-016']);const ids=s.players[1].battle.slice(0,n).map(x=>x.uid),x=play(s,MULTI);assert.ok(!s.decision.choices.some(c=>c.value?.uid===s.players[0].battle[0].uid||c.value?.uid===s.players[1].battle.at(-1).uid));
  for(let i=0;i<n;i++){pick(s,ids[i]);if(i===0&&n===2){assert.equal(s.players[1].hand.length,0);assert.ok(s.players[1].battle.some(x=>x.uid===ids[0]));assert.ok(!s.decision.choices.some(c=>c.value?.uid===ids[0]));s=JSON.parse(JSON.stringify(s));}}
  if(n<2)pick(s,null);drain(s);assert.equal(s.players[1].hand.length,n);assert.ok(ids.every(uid=>s.players[1].hand.some(x=>x.uid===uid)));assert.deepEqual(physical(s),x.before);
 }
});
test('two-target bounce respects Just Diver and one or two forced targets without selecting a card twice',()=>{
 for(const count of[1,2]){const s=setup();give(s,1,'battle',[...Array(count).fill(SYN),N,'dmrp22-053']);s.players[1].battle.at(-1).justDiverActive=true;const forced=s.players[1].battle.slice(0,count).map(x=>x.uid),normal=s.players[1].battle[count].uid;play(s,MULTI);assert.deepEqual(s.decision.choices.filter(c=>c.value).map(c=>c.value.uid),forced);pick(s,forced[0]);assert.ok(!s.decision.choices.some(c=>c.value?.uid===forced[0]));if(count===2){assert.deepEqual(s.decision.choices.filter(c=>c.value).map(c=>c.value.uid),[forced[1]]);pick(s,forced[1]);}else{assert.ok(s.decision.choices.some(c=>c.value?.uid===normal));pick(s,normal);}drain(s);assert.equal(s.players[1].hand.length,2);}
});
test('simultaneous bounce preserves evolution stacks and independent leave effects happen afterward',()=>{
 const s=setup();give(s,1,'battle',['dm02-024','dmr23-050']);const top=s.players[1].battle[0];top.under=[inst(N),inst(F)];const ids=[top.uid,s.players[1].battle[1].uid],all=physical(s),n=s.players[1].deck.length;const x=play(s,MULTI);pick(s,ids[0]);assert.equal(s.players[1].hand.length,0);pick(s,ids[1]);drain(s);assert.equal(s.players[1].battle.length,0);assert.equal(s.players[1].hand.length,5);assert.equal(s.players[1].deck.length,n-1);assert.deepEqual(physical(s),x.before);assert.equal(x.before.length,all.length+1);
});
test('every spell-retrieval entry, attack and death ability may recover the actual lower-face twinpact and excludes pure creatures',()=>{
 for(const row of recoverers){const s=setup();give(s,0,'grave',[DE,BO,TWIN,N]);if(row.spec.g172Death||row.spec.g34Attack)give(s,0,'battle',[row.id]);const uid=s.players[0].grave[2].uid;recover(s,row);assert.equal(s.decision.player,0);assert.ok(s.decision.choices.some(c=>c.value?.uid===uid));assert.ok(!s.decision.choices.some(c=>c.value?.uid===s.players[0].grave.find(c=>c.cardId===N).uid));pick(s,uid);if(s.decision?.task?.op==='g34_Select')pick(s,null);drain(s);assert.ok(s.players[0].hand.some(x=>x.uid===uid));assert.ok(!s.players[0].grave.some(x=>x.uid===uid));}
});
test('up-to-two spell retrieval allows every count and never duplicates one physical spell',()=>{
 for(const id of['dm23rp1-057','dmd08-002'])for(const n of[0,1,2]){let s=setup();give(s,0,'grave',[DE,BO,TWIN,N]);const ids=s.players[0].grave.slice(0,n).map(x=>x.uid),x=play(s,id);for(const uid of ids){pick(s,uid);if(s.decision?.task?.op==='g34_Select')assert.ok(!s.decision.choices.some(c=>c.value?.uid===uid));s=JSON.parse(JSON.stringify(s));}if(n<2)pick(s,null);drain(s);assert.equal(s.players[0].hand.length,n);assert.ok(ids.every(uid=>s.players[0].hand.some(x=>x.uid===uid)));assert.deepEqual(physical(s),x.before);}
});
test('grave restrictions block retrieval while mandatory and optional effects both finish with no eligible spell',()=>{
 for(const row of recoverers)for(const apul of[false,true]){const s=setup();give(s,0,'grave',apul?[DE,TWIN]:[N]);if(apul)give(s,1,'battle',[APUL]);if(row.spec.g172Death||row.spec.g34Attack)give(s,0,'battle',[row.id]);const ids=s.players[0].grave.map(x=>x.uid);recover(s,row);drain(s);assert.equal(s.players[0].hand.length,0,row.name);assert.ok(ids.every(uid=>s.players[0].grave.some(x=>x.uid===uid)));}
});
test('Genmu ignores the new cheap abilities while the eight-cost Baura Lion still retrieves two spells',()=>{
 for(const row of m.cards.filter(c=>c.faces[0].cost<=5)){const s=setup();give(s,1,'battle',[GEN,N]);give(s,0,'grave',[DE,BO]);give(s,0,'hand',[N,F]);const before=s.players[0].deck.length;play(s,row.id);drain(s);assert.equal(s.players[0].hand.length,2,row.name);assert.equal(s.players[0].deck.length,before,row.name);assert.equal(s.players[0].grave.length,e.card(row.id).type==='spell'?3:2,row.name);}
 const s=setup();give(s,1,'battle',[GEN]);give(s,0,'grave',[DE,BO]);play(s,'dmd08-002');pick(s,s.players[0].grave[0].uid);pick(s,s.players[0].grave[1].uid);drain(s);assert.equal(s.players[0].hand.length,2);
});
test('Noron and Ahoya draw two before forcing two chosen self-discards, even from an initially empty hand',()=>{
 for(const id of[NORON,'dmrp02-069']){let s=setup();give(s,0,'deck',[N,F,...Array(10).fill(W)]);const ids=s.players[0].deck.slice(0,2).map(x=>x.uid),x=play(s,id);assert.equal(s.players[0].hand.length,2);assert.equal(s.decision.player,0);assert.ok(!s.decision.choices.some(c=>c.value===null));pick(s,ids[1]);s=JSON.parse(JSON.stringify(s));pick(s,ids[0]);drain(s);assert.equal(s.players[0].hand.length,0);assert.ok(ids.every(uid=>s.players[0].grave.some(x=>x.uid===uid)));assert.deepEqual(physical(s),x.before);}
});
test('self-discards resolve as far as possible, cannot discard the played creature, and do not trigger opponent-only replacements',()=>{
 for(const id of['dmrp06-049','dmrp02-037']){const s=setup();const x=play(s,id);drain(s);assert.ok(s.players[0].battle.some(y=>y.uid===x.uid));assert.equal(s.players[0].hand.length,0);}
 const s=setup();give(s,0,'hand',['dmr02-s03',N]);play(s,'dmrp06-049');const uid=s.players[0].hand.find(x=>x.cardId==='dmr02-s03').uid;pick(s,uid);drain(s);assert.ok(s.players[0].grave.some(x=>x.uid===uid));assert.ok(!s.players[0].battle.some(x=>x.uid===uid));
});
test('removal-plus-discard finishes the destruction first and requires a self-discard even without any enemy',()=>{
 for(const id of['dmrp06-086','dmd09-006'])for(const enemy of[false,true]){const s=setup();give(s,0,'hand',[N,F]);if(enemy)give(s,1,'battle',[N]);play(s,id);if(enemy){pick(s,s.players[1].battle[0].uid);assert.equal(s.players[1].battle.length,0);}assert.equal(s.decision.player,0);const uid=s.players[0].hand[1].uid;pick(s,uid);drain(s);assert.ok(s.players[0].grave.some(x=>x.uid===uid));assert.equal(s.players[0].hand.length,1);}
});
test('last-card draw finishes the game before a later discard, with Shako replacing that loss',()=>{
 for(const shako of[false,true]){const s=setup();give(s,0,'deck',[N,F]);if(shako)give(s,0,'battle',['dmrp03-s03']);play(s,NORON);assert.equal(s.winner,shako?0:1);assert.equal(s.players[0].hand.length,2);assert.notEqual(s.decision?.task?.op,'discard');}
});
test('Bavere discards on entry and draws two on a later bounce instead of merging both abilities',()=>{
 const s=setup();give(s,0,'hand',[N,F]);const x=play(s,'dmrp02-037');pick(s,s.players[0].hand[0].uid);assert.equal(s.players[0].hand.length,1);s.active=1;s.phase='main';play(s,BO);act(s,'effect',a=>a.targets.some(t=>t.uid===x.uid));drain(s);assert.equal(s.players[0].hand.length,4);assert.ok(s.players[0].hand.some(y=>y.uid===x.uid));
});
test('new shield triggers resolve for their defender without mana and conserve physical identities',()=>{
 for(const row of m.cards.filter(c=>c.spec.trigger)){const s=setup();give(s,0,'battle',[N]);give(s,1,'hand',[F]);give(s,1,'grave',[DE]);give(s,1,'mana',[]);give(s,1,'shields',[row.id]);const before=physical(s);s.phase='attack';act(s,'attack',a=>a.target==='player');act(s,'noBlock');act(s,'useTrigger');drain(s);assert.equal(s.metrics[1].triggers,1);assert.equal(s.players[1].mana.length,0);assert.deepEqual(physical(s),before);}
});
test('CPU chooses two valuable bounce targets, two recoverable spells, and a cheap self-discard',()=>{
 const s=setup();give(s,1,'battle',[N,F]);play(s,MULTI);drain(s);assert.equal(s.players[1].hand.length,2);
 const t=setup();give(t,0,'grave',[DE,BO,N]);play(t,'dmd08-002');drain(t);assert.equal(t.players[0].hand.length,2);
 const u=setup();give(u,0,'hand',[DE,N]);play(u,'dmrp06-049');const a=e.chooseAI(u);assert.equal(u.decision.choices[a.choice].value,u.players[0].hand.find(x=>x.cardId===N).uid);e.step(u,a);assert.equal(u.players[0].hand[0].cardId,DE);
});
test('three forty-card CPU fixtures finish with eighty cards conserved through save and resume',()=>{
 for(const[i,d]of STANDARD173_DECKS.entries()){let s=e.createGame([d,PRESETS[i%PRESETS.length]],{seed:17301+i,first:i%2}),saved=false;const ids=physical(s);while(s.winner===null&&s.actions<1800&&s.turn<160){e.step(s,e.chooseAI(s));assert.deepEqual(physical(s),ids);if(!saved&&s.actions>20){s=JSON.parse(JSON.stringify(s));saved=true;}}assert.ok(saved);assert.notEqual(s.winner,null,d.name);assert.equal(ids.length,80);}
});
test('the new bounce spell also declares G Strike from a broken shield and locks a chosen ready attacker',()=>{
 const s=setup();give(s,0,'battle',[N,F]);give(s,1,'shields',[MULTI]);const ready=s.players[0].battle[1].uid;s.phase='attack';act(s,'attack',a=>a.uid===s.players[0].battle[0].uid&&a.target==='player');act(s,'noBlock');assert.equal(s.decision.task.op,'gsDeclare');pick(s,true);assert.equal(s.decision.task.op,'gsTarget');pick(s,ready);drain(s);assert.ok(s.players[1].hand.some(x=>x.cardId===MULTI));assert.ok(!s.players[0].battle[1].tapped);assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===ready));
});
