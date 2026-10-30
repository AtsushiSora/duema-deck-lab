import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain,GEN,GG,PRESETS} from './target-fixture.mjs';import {standardCardSpec} from '../tools/standard-card-spec.mjs';import {createCatalogue} from '../dist/catalogue.js';import {CARD_IMAGES} from '../dist/card-images.js';import {STANDARD185_DECKS} from '../tools/fixtures/standard185.mjs';
const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-185.json',import.meta.url))),N='dm01-108',F='dm01-097',BLOCK='dm01-076',DE='dm01-027',BO='dm01-086',MULTI='dmc44-006',EVO='dmr12-s02',NEO='dmrp18-060',SEED='dmsd20-016',JOKER='dmrp07-079',STAR='dmrp17-078',TWIN='dm22ex1-030',MAP='dmr14-019',ASTRA='dmsd09-018',SPELL='dmrp01-036',PULP='dmrp20-070',CHARGER='dmr15-025',BIRD='dmrp13-016',EVOL='dmd21-004',PIKA='dmrp22-051',RAIN='dmex14-059';
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function pick(s,v){act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===v);}
function play(s,id){s.players[s.active].hand.push(inst(id));const uid=s.players[s.active].hand.at(-1).uid;act(s,'play',a=>a.uid===uid&&!a.alternative);return uid;}
function target(row){const f=row.spec.g34Tasks[0].stages[0].filter;if(!f)return DE;if(f.spell||f.any)return DE;if(f.evolution)return EVO;if(f.seed)return SEED;if(f.multi)return MULTI;if(f.exactCost===1)return BLOCK;if(f.race==='ジョーカーズ')return JOKER;if(f.race==='レクスターズ')return STAR;return N;}
test('seventeen complete official definitions have their exact faces, restrictions and images in two legal decks',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);assert.equal(m.cards.length,17);for(const row of m.cards){assert.deepEqual(row.faces,details.cards.find(x=>x.id===row.id).faces);assert.deepEqual(row.spec,standardCardSpec(details.cards.find(x=>x.id===row.id),{phase:185}));assert.equal(e.card(row.id).supportBatch,'phase-185');assert.ok(row.verification.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(e.card(row.id).limit,m.regulationVerification.limits[row.id]);assert.equal(CARD_IMAGES[row.id],row.image);assert.ok(registry.get(row.id).supported);assert.ok(STANDARD185_DECKS.some(d=>d.cards.some(x=>x.id===row.id)));}for(const d of STANDARD185_DECKS){assert.deepEqual(e.validateDeck(d),[]);assert.equal(d.cards.reduce((n,x)=>n+x.count,0),40);assert.equal(registry.coverage(d).unsupported,0);}
});
for(const row of m.cards)test(row.name+': takes an eligible looked-at physical card, then orders every remaining card at bottom through save/resume',()=>{
 let s=setup();const spec=row.spec.g34Tasks[0],n=spec.n;give(s,0,'deck',[target(row),...Array(n-1).fill(F),...Array(8).fill(N)]);const looked=s.players[0].deck.slice(0,n).map(x=>x.uid),tail=s.players[0].deck.slice(n).map(x=>x.uid);play(s,row.id);assert.equal(s.decision.task.op,'g34_LookPick');assert.ok(s.decision.choices.some(x=>x.value===looked[0]));assert.ok(!s.decision.choices.some(x=>tail.includes(x.value)));assert.equal(s.decision.choices.some(x=>x.value===null),!!spec.stages[0].optional);const ids=physical(s);s=JSON.parse(JSON.stringify(s));pick(s,looked[0]);const order=looked.slice(1).reverse();for(const uid of order.slice(0,-1))pick(s,uid);drain(s);assert.ok(s.players[0].hand.some(x=>x.uid===looked[0]));assert.deepEqual(s.players[0].deck.map(x=>x.uid),[...tail,...order]);assert.deepEqual(s.players[0].g34Protected||[],[]);assert.deepEqual(physical(s),ids);
});
test('unknown filters, multiple retrievals and conditional follow-ups stay unsupported; earlier batches are unchanged',()=>{
 for(const row of m.cards){const d=structuredClone(details.cards.find(x=>x.id===row.id));assert.throws(()=>standardCardSpec(d,{phase:184}));d.faces[0].abilityText+='\n未知の能力';assert.throws(()=>standardCardSpec(d,{phase:185}));}
 const d=structuredClone(details.cards.find(x=>x.id===MAP));for(const text of['自分の山札の上から５枚を見る。その中からドラゴンを２体選び、相手に見せてから手札に加えてもよい。残りを好きな順序で山札の一番下に置く。','自分の山札の上から５枚を見る。その中から自然のクリーチャーを１体選び、相手に見せてから手札に加えてもよい。残りを好きな順序で山札の一番下に置く。そうしたら、相手のクリーチャーを１体破壊する。']){d.faces[0].abilityText=text;assert.throws(()=>standardCardSpec(d,{phase:185}));}
 for(let phase=168;phase<=184;phase++)for(const row of JSON.parse(fs.readFileSync(new URL('../tools/support-phase-'+phase+'.json',import.meta.url))).cards)assert.deepEqual(standardCardSpec(details.cards.find(x=>x.id===row.id),{phase}),row.spec);
});
test('optional retrieval can be declined and a search with no matching cards still lets the owner order all looked cards',()=>{
 for(const match of[false,true]){const s=setup();give(s,0,'deck',[match?DE:N,F,N,...Array(6).fill(F)]);const top=s.players[0].deck.slice(0,3).map(x=>x.uid),tail=s.players[0].deck.slice(3).map(x=>x.uid);play(s,ASTRA);if(match)pick(s,null);assert.equal(s.decision.task.op,'g34_Order');pick(s,top[2]);pick(s,top[0]);drain(s);assert.equal(s.players[0].hand.length,0);assert.deepEqual(s.players[0].deck.map(x=>x.uid),[...tail,top[2],top[0],top[1]]);}
});
test('spell searches accept a twinpact spell face, nature excludes fire, multicolor requires a creature, and seed/evolution are distinct',()=>{
 const cases=[[SPELL,[F,TWIN,N],[1]],[MAP,[F,N,DE],[1]],[RAIN,[N,MULTI,'dmrp20-km5'],[1]],[PIKA,[N,SEED,DE],[1]],[EVOL,[N,EVO,NEO],[1]]];for(const[id,deck,eligible]of cases){const s=setup();give(s,0,'deck',[...deck,...Array(8).fill(F)]);const top=s.players[0].deck.slice(0,3);play(s,id);const offered=s.decision.choices.filter(c=>c.value!==null).map(c=>c.value);for(let i=0;i<3;i++)assert.equal(offered.includes(top[i].uid),eligible.includes(i),id+' '+e.card(top[i]).name);pick(s,top[eligible[0]].uid);drain(s);}
});
test('filtered searches reveal the chosen card only; unfiltered Pulp does not force a reveal or count as a draw',()=>{
 const s=setup();give(s,0,'deck',[DE,F,N,...Array(8).fill(F)]);play(s,SPELL);const before=s.log.filter(x=>x.type==='reveal').length;pick(s,s.players[0].deck.find(x=>x.cardId===DE).uid);drain(s);assert.equal(s.log.filter(x=>x.type==='reveal').length,before+1);
 const t=setup();give(t,0,'battle',['dm32-021']);give(t,0,'deck',[DE,F,N,...Array(8).fill(F)]);play(t,PULP);pick(t,t.players[0].deck[0].uid);drain(t);assert.ok(!t.log.some(x=>x.type==='reveal'));assert.equal(t.players[0].grave.filter(x=>x.cardId===DE).length,0);assert.equal(t.players[0].hand.length,1);
});
test('QX blocks the look; Tsukaze limits it to one public card without exposing later cards',()=>{
 const s=setup();give(s,1,'battle',['dmrp07-m01']);play(s,ASTRA);assert.equal(s.decision,null);assert.equal(s.players[0].deck.length,30);assert.equal(s.players[0].hand.length,0);
 const t=setup();give(t,0,'deck',[DE,BO,N,F,...Array(8).fill(F)]);give(t,1,'battle',['dmrp22-030']);const top=t.players[0].deck[0].uid,next=t.players[0].deck[1].uid;play(t,SPELL);assert.ok(t.decision.choices.some(x=>x.value===top));assert.ok(!t.decision.choices.some(x=>x.value===next));pick(t,top);drain(t);assert.equal(t.players[0].deck[0].uid,next);assert.equal(t.players[0].hand.length,1);
});
test('a short deck is inspected only as far as possible and the final card retrieval loses even with Shako',()=>{
 for(const shako of[false,true]){const s=setup();if(shako)give(s,0,'battle',['dmrp03-s03']);give(s,0,'deck',[N]);play(s,MAP);pick(s,s.players[0].deck[0].uid);drain(s);assert.equal(s.winner,1);assert.equal(s.players[0].hand.length,1);assert.equal(s.players[0].deck.length,0);}
 const t=setup();give(t,0,'deck',[N,F]);play(t,MAP);pick(t,null);drain(t);assert.equal(t.players[0].deck.length,2);assert.equal(t.winner,null);
});
test('CPU declines taking the last optional card but still retrieves when Tsukaze leaves other deck cards',()=>{
 const s=setup();give(s,0,'deck',[N]);play(s,MAP);const a=e.chooseAI(s);assert.equal(s.decision.choices[a.choice].value,null);e.step(s,a);drain(s);assert.equal(s.winner,null);assert.equal(s.players[0].deck.length,1);
 const t=setup();give(t,1,'battle',['dmrp22-030']);give(t,0,'deck',[N,F]);play(t,MAP);assert.notEqual(t.decision.choices[e.chooseAI(t).choice].value,null);drain(t);assert.equal(t.players[0].hand.length,1);assert.equal(t.players[0].deck.length,1);
});
test('Spellbook charger finishes only after all remaining deck cards are put back, preserving one physical spell',()=>{
 const s=setup();give(s,0,'deck',[DE,BO,N,F,N,...Array(8).fill(F)]);const uid=play(s,CHARGER),ids=physical(s);pick(s,s.players[0].deck[0].uid);assert.ok(!s.players[0].mana.some(x=>x.uid===uid));drain(s);assert.equal(s.players[0].mana.filter(x=>x.uid===uid).length,1);assert.equal(s.players[0].hand.length,1);assert.deepEqual(physical(s),ids);
});
test('Bird shield trigger lets the defender choose its nature creature and order its own deck before combat resumes',()=>{
 const s=setup();give(s,0,'battle',[N]);give(s,1,'shields',[BIRD]);give(s,1,'deck',[N,F,...Array(12).fill(F)]);const top=s.players[1].deck[0].uid;s.phase='attack';act(s,'attack',a=>a.target==='player');act(s,'noBlock');act(s,'useTrigger');assert.equal(s.decision.player,1);pick(s,top);drain(s);assert.ok(s.players[1].hand.some(x=>x.uid===top));assert.ok(s.players[1].battle.some(x=>x.cardId===BIRD));
});
test('blocker restrictions, Genmu and GG keep their existing behavior for the new entries',()=>{
 for(const id of[BIRD,'dmr18-014','dmr13-047']){const s=setup();give(s,0,'battle',[id]);s.phase='attack';if(e.card(id).noAttack)assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'));else if(e.card(id).noPlayerAttack)assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.target==='player'));give(s,1,'battle',[N]);s.active=1;act(s,'attack',a=>a.target==='player');assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'));}
 for(const opp of[GEN,GG]){const s=setup();give(s,1,'battle',[opp]);if(opp===GG)s.players[1].battle[0].under=[inst(N)];play(s,'dmrp05-070');assert.equal(s.decision,null);assert.equal(s.players[0].hand.length,0);assert.equal(s.players[0].deck.length,30);}
});
test('two CPU games finish with eighty cards and a save/resume while searches and ordering stay bounded',()=>{
 for(let i=0;i<2;i++){let s=e.createGame([STANDARD185_DECKS[i],PRESETS[i]],{seed:18501+i,first:i%2}),saved=false;const ids=physical(s);while(s.winner===null&&s.actions<1800&&s.turn<160){e.step(s,e.chooseAI(s));assert.deepEqual(physical(s),ids);if(!saved&&s.actions>20){s=JSON.parse(JSON.stringify(s));saved=true;}}assert.ok(saved);assert.notEqual(s.winner,null);assert.equal(ids.length,80);}
});
