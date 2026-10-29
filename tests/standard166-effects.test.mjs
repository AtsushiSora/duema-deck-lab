import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,cast,drain,PRESETS,GEN} from './target-fixture.mjs';
import {createCatalogue} from '../dist/catalogue.js';import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';import {STANDARD166_DECKS} from '../tools/fixtures/standard166.mjs';
const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-166.json',import.meta.url))),registry=createCatalogue(snapshot,data.cards,details),N='dm01-108',H='dmr03-020',H2='dmr05-085',BLOCK='dm01-084';
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort(),id=name=>{const c=m.cards.find(c=>c.name===name);assert.ok(c,name);return c.id;};
const diagnostic=t=>{if(process.env.CARD_SUPPORT_DIAGNOSTICS)fs.writeSync(2,t+'\n');};
function pickTarget(s,uid){const a=e.getLegalActions(s).find(a=>a.kind==='extended'&&s.decision.choices[a.choice].value?.uid===uid);assert.ok(a,JSON.stringify(s.decision));e.step(s,a);}
test('142 complete official definitions have supported art, copy limits and fifteen legal forty-card lists',()=>{
 assert.equal(m.cards.length,142);assert.ok(data.cards.length>=2360);const covered=new Set(STANDARD166_DECKS.flatMap(d=>d.cards.map(c=>c.id)));
 for(const row of m.cards){assert.ok(covered.has(row.id));assert.deepEqual(row.faces,details.cards.find(c=>c.id===row.id).faces);assert.deepEqual(row.spec,standardCardSpec(details.cards.find(c=>c.id===row.id),{phase:166}));assert.equal(e.card(row.id).supportBatch,'phase-166');assert.equal(e.card(row.id).limit,m.regulationVerification.limits[row.id]);assert.equal(CARD_IMAGES[row.id],row.image);assert.ok(registry.get(row.id).supported);assert.ok(row.verification.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);}
 for(const d of STANDARD166_DECKS){assert.equal(d.cards.reduce((n,c)=>n+c.count,0),40);assert.deepEqual(e.validateDeck(d),[]);assert.equal(registry.coverage(d).unsupported,0);}
});
for(const row of m.cards)test('new execution conserves cards: '+row.name,()=>{
 let s=setup();give(s,0,'deck',Array(20).fill(N));give(s,0,'grave',[N]);give(s,1,'battle',[N,BLOCK]);const c=e.card(row.id);
 if(c.evolution){const base=data.cards.find(x=>x.type==='creature'&&!x.evolution&&!x.neoEvolution&&(c.evolution.race?x.race.includes(c.evolution.race):(x.civilizations||x.civ.split('/')).includes(c.evolution.civilization)));assert.ok(base,row.name);give(s,0,'battle',[base.id]);}
 const x=inst(row.id);s.players[0].hand.push(x);const before=physical(s);act(s,'play',a=>a.uid===x.uid);s=JSON.parse(JSON.stringify(s));drain(s);assert.equal(s.winner,null);assert.equal(s.decision,null);assert.deepEqual(physical(s),before);assert.ok(s.players[0][c.type==='spell'?(c.normalCharger?'mana':'grave'):'battle'].some(y=>y.uid===x.uid));
});
test('new grammar keeps unknown NEO evolution, extra clauses and optional replacement differences pending',()=>{
 const row=structuredClone(details.cards.find(c=>c.id===id('キバセン・チュリス')));
 for(const text of['NEO進化：自分のハンター1体の上に置いてもよい。','NEO進化：光、水、闇、または火のクリーチャー1体の上に置いてもよい。','NEO進化：自分の火のクリーチャー1体の上に置いてもよい。\n未知の能力','このクリーチャーが破壊される時、墓地に置くかわりに手札に戻してもよい。']){const d=structuredClone(row);d.faces[0].abilityText=text;assert.throws(()=>standardCardSpec(d,{phase:166}));}
});
test('all nineteen NEO creatures permit normal entry and evolution only onto a matching legal body',()=>{
 for(const row of m.cards.filter(c=>c.spec.neoEvolution))for(const evolved of[false,true]){let s=setup();const c=e.card(row.id),condition=c.neoEvolution.any[0],base=data.cards.find(x=>x.type==='creature'&&!x.evolution&&!x.neoEvolution&&(condition.race?x.race.includes(condition.race):condition.civilization?(x.civilizations||x.civ.split('/')).includes(condition.civilization):true));assert.ok(base);give(s,0,'battle',[base.id]);give(s,0,'hand',[row.id]);const uid=s.players[0].hand[0].uid,baseUid=s.players[0].battle[0].uid,before=physical(s);act(s,'play',a=>a.uid===uid);assert.ok(e.getLegalActions(s).some(a=>a.kind==='evolve'&&!a.baseUid));act(s,'evolve',a=>evolved?a.baseUid===baseUid:!a.baseUid);drain(s);s=JSON.parse(JSON.stringify(s));const x=s.players[0].battle.find(x=>x.uid===uid);assert.equal(e.isEvolution(x),evolved);assert.equal(x.under?.length||0,evolved?1:0);s.phase='attack';assert.equal(e.canCreatureAttack(s,0,x),evolved||!!c.speedAttacker||!!c.machFighter);assert.deepEqual(physical(s),before);}
});
test('three-color NEO bases reject the fourth civilization and regain summoning sickness without a base',()=>{
 const c=e.card(id('～聖者たちの沈黙～')),s=setup();give(s,0,'battle',['dm01-075','dm01-083','dm01-090','dm01-097',N]);assert.deepEqual(e.evolutionBases(s,0,c).map(x=>x.cardId),['dm01-075','dm01-083','dm01-090']);give(s,0,'hand',[c.id]);const uid=s.players[0].hand[0].uid;act(s,'play');act(s,'evolve',a=>a.baseUid===s.players[0].battle[0].uid);drain(s);const x=s.players[0].battle.find(x=>x.uid===uid);assert.ok(e.canCreatureAttack(s,0,x));s.players[0].grave.push(...x.under);x.under=[];assert.equal(e.canCreatureAttack(s,0,x),false);
});
test('nature is one civilization in three-color NEO conditions, and PACO can summon from mana onto a legal base',()=>{
 for(const name of['撃機音愛 クルーカ','詩星姫 オクノテルス','聖画帝PACO-85+','魔誕の戦慄ジュマゾール']){const row=details.cards.find(c=>c.id===id(name)),spec=standardCardSpec(row,{phase:166});assert.ok(spec.neoEvolution.any.some(x=>x.civilization==='自然'));assert.equal(spec.neoEvolution.any.length,3);}
 const s=setup(),c=id('聖画帝PACO-85+');give(s,0,'battle',[N]);s.players[0].mana.push(inst(c));const uid=s.players[0].mana.at(-1).uid,baseUid=s.players[0].battle[0].uid,before=physical(s);act(s,'play',a=>a.uid===uid&&a.origin==='mana');act(s,'evolve',a=>a.baseUid===baseUid);drain(s);assert.ok(s.players[0].battle.some(x=>x.uid===uid&&x.under[0].uid===baseUid));assert.deepEqual(physical(s),before);
});
test('hunting counts each current allied Hunter once, including itself, but affects battle power only',()=>{
 const s=setup();give(s,0,'battle',[H,H2,H2,N]);give(s,1,'battle',[H2]);const x=s.players[0].battle[0],y=s.players[1].battle[0];assert.equal(e.power(x,false,s),4000);assert.equal(e.matchupPower(x,y,false,s),7000);assert.equal(e.matchupPower(y,x,false,s),2000);s.players[0].battle[1].sealed=true;assert.equal(e.matchupPower(x,y,false,s),6000);s.players[0].battle[2].g35Ignored=s.turn;assert.equal(e.matchupPower(x,y,false,s),6000);x.g35Ignored=s.turn;assert.equal(e.matchupPower(x,y,false,s),4000);
});
test('hunting changes actual attack and blocking results, while power-based removal uses normal power',()=>{
 for(const defending of[false,true]){const s=setup();give(s,0,'battle',defending?[N]:[H,H2,H2]);give(s,1,'battle',defending?['dmr04-038',H2,H2,H2,H2]:[N]);const a=s.players[0].battle[0],b=s.players[1].battle[0];if(defending){a.powerModifiers=[{amount:5000-e.power(a,false,s)}];}else b.powerModifiers=[{amount:6000-e.power(b,false,s)}];b.tapped=!defending;s.phase='attack';act(s,'attack',a1=>a1.uid===a.uid&&a1.target===(defending?'player':b.uid));if(defending)act(s,'block',a=>a.uid===b.uid);drain(s);assert.ok(s.players[defending?0:1].grave.some(x=>x.uid===(defending?a.uid:b.uid)));assert.ok(s.players[defending?1:0].battle.some(x=>x.uid===(defending?b.uid:a.uid)));}
 const t=setup();give(t,1,'battle',[H,H2,H2]);cast(t,id('フライパン・マウンテン'));assert.ok(t.decision.choices.some(c=>c.value.uid===t.players[1].battle[0].uid));
});
test('mandatory end untaps cannot be declined and coexist with independently optional end untaps',()=>{
 let s=setup();give(s,0,'battle',[id('オレンヴェーラ-D10'),'dm01-043']);for(const x of s.players[0].battle)x.tapped=true;const [mandatory,optional]=s.players[0].battle.map(x=>x.uid);s.phase='attack';act(s,'endTurn');let asked=0;for(let i=0;s.active===0&&i<20;i++){if(s.decision?.type==='untap'){assert.deepEqual(s.decision.uids,[optional]);asked++;act(s,'endUntap',a=>!a.yes);}else{const a=e.getLegalActions(s)[0];assert.ok(a);e.step(s,a);}s=JSON.parse(JSON.stringify(s));}assert.equal(asked,1);assert.equal(s.players[0].battle.find(x=>x.uid===mandatory).tapped,false);assert.equal(s.players[0].battle.find(x=>x.uid===optional).tapped,true);
});
test('ignored and sealed mandatory-untap creatures stay tapped at the end of their turn',()=>{
 for(const mode of['ignore','seal']){const s=setup();give(s,0,'battle',[id('オレンヴェーラ-D10')]);const x=s.players[0].battle[0];x.tapped=true;if(mode==='seal')x.sealed=true;else x.g35Ignored=s.turn;s.phase='attack';act(s,'endTurn');for(let i=0;s.active===0&&i<20;i++)e.step(s,e.chooseAI(s));assert.equal(x.tapped,true);}
});
test('tap selection respects Just Diver, while tapping all affects protected opposing creatures only',()=>{
 const diver='dmrp22-053',s=setup();give(s,1,'battle',[diver,N]);s.players[1].battle[0].justDiverActive=true;const uid=s.players[1].battle[1].uid,n=s.players[0].deck.length;cast(s,id('ジョッキン・グラス'));assert.deepEqual(s.decision.choices.map(c=>c.value.uid),[uid]);pickTarget(s,uid);drain(s);assert.ok(s.players[1].battle[1].tapped);assert.equal(s.players[0].deck.length,n-1);
 const t=setup();give(t,0,'battle',[N]);give(t,1,'battle',[diver,N]);t.players[1].battle[0].justDiverActive=true;cast(t,id('プラスワン・スパーク'));drain(t);assert.ok(t.players[1].battle.every(x=>x.tapped));assert.ok(!t.players[0].battle[0].tapped);
});
test('blocker removal uses current granted abilities, excludes ignored blockers and does not affect other creatures',()=>{
 const s=setup();give(s,1,'battle',[N,BLOCK,BLOCK]);s.players[1].battle[0].g34Grants=[{turn:s.turn,blocker:true}];s.players[1].battle[2].g35Ignored=s.turn;cast(s,id('シリー隊長'));assert.deepEqual(s.decision.choices.map(c=>c.value.uid),s.players[1].battle.slice(0,2).map(c=>c.uid));
});
test('untapped-only removal excludes tapped creatures and still ramps when no legal target remains',()=>{
 for(const tapped of[false,true]){const s=setup();give(s,1,'battle',[N]);s.players[1].battle[0].tapped=tapped;const uid=s.players[1].battle[0].uid,n=s.players[0].mana.length;cast(s,id('ゴールデンデン・トラップ'));drain(s);assert.equal(s.players[1].mana.some(x=>x.uid===uid),!tapped);assert.equal(s.players[0].mana.length,n+1);}
});
test('Death Hands can enter as an actual shield-trigger card and destroy the attacker without mana',()=>{
 const s=setup();give(s,0,'battle',[N]);give(s,1,'mana',[]);give(s,1,'shields',[id('凶殺皇 デス・ハンズ')]);const attacker=s.players[0].battle[0].uid,before=physical(s);s.phase='attack';act(s,'attack',a=>a.target==='player');act(s,'noBlock');act(s,'useTrigger');drain(s);assert.ok(s.players[1].battle.some(x=>x.cardId===id('凶殺皇 デス・ハンズ')));assert.ok(s.players[0].grave.some(x=>x.uid===attacker));assert.deepEqual(physical(s),before);
});
test('CPU completes all fifteen forty-card fixtures with eighty cards conserved through a saved continuation',()=>{
 for(const [i,deck]of STANDARD166_DECKS.entries()){if(process.env.CPU_DECK_FROM&&i+1<Number(process.env.CPU_DECK_FROM))continue;diagnostic('CPU '+deck.name);let s=e.createGame([deck,PRESETS[i%PRESETS.length]],{seed:16600+i,first:i%2}),saved=false;const before=physical(s);while(s.winner===null){assert.ok(s.actions<1600&&s.turn<160,deck.name+' limit');e.step(s,e.chooseAI(s));assert.deepEqual(physical(s),before);if(!saved&&s.actions>=20){const copy=JSON.parse(JSON.stringify(s));assert.deepEqual(e.getLegalActions(copy),e.getLegalActions(s));s=copy;saved=true;}}assert.ok(saved);assert.ok([0,1].includes(s.winner));assert.equal(before.length,80);}
});
