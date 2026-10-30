import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain,GEN,GG,PRESETS} from './target-fixture.mjs';import {standardCardSpec} from '../tools/standard-card-spec.mjs';import {createCatalogue} from '../dist/catalogue.js';import {CARD_IMAGES} from '../dist/card-images.js';import {STANDARD192_DECKS} from '../tools/fixtures/standard192.mjs';
const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-192.json',import.meta.url))),N='dm01-108',F='dm01-097',DE='dm01-027',SLAYER='dm01-088',GIGA='dmrp07-075',BASA='dmrp21-059',PORK='dmr13-056',KHOOK='dmr21-071',CLAN='dmrp18-075',DOL='dmr23-051',DUJI='dmrp07-042',KID='dmrp02-043',MATO='dmr20-033',DORU='dmr08-046',SAVAK='dmrp04s-m02',ONI='dm23ex3-S07';
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function pick(s,v){act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===v);}
function play(s,id){const x=inst(id);s.players[s.active].hand.push(x);act(s,'play',a=>a.uid===x.uid&&!a.alternative);return x.uid;}
function attack(s,uid=s.players[s.active].battle[0].uid,target='player'){s.phase='attack';act(s,'attack',a=>a.uid===uid&&a.target===target);}
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}
function blocked(s,id,enemy=N){give(s,0,'battle',[id,N]);give(s,1,'battle',[enemy]);const uid=s.players[0].battle[0].uid;s.active=1;attack(s);act(s,'block',a=>a.uid===uid);return uid;}
test('thirteen verified complete definitions and images cover two legal forty-card decks',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);assert.equal(m.cards.length,13);for(const row of m.cards){assert.deepEqual(row.faces,details.cards.find(x=>x.id===row.id).faces);assert.deepEqual(row.spec,standardCardSpec(details.cards.find(x=>x.id===row.id),{phase:192}));assert.equal(e.card(row.id).supportBatch,'phase-192');assert.ok(row.verification.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(CARD_IMAGES[row.id],row.image);assert.equal(e.card(row.id).limit,m.regulationVerification.limits[row.id]);assert.ok(registry.get(row.id).supported);assert.ok(STANDARD192_DECKS.some(d=>d.cards.some(x=>x.id===row.id)));}for(const d of STANDARD192_DECKS){assert.deepEqual(e.validateDeck(d),[]);assert.equal(d.cards.reduce((n,x)=>n+x.count,0),40);assert.equal(registry.coverage(d).unsupported,0);}
});
for(const row of m.cards)test(row.name+': its complete win/start and death abilities preserve physical cards',()=>{
 const s=setup();give(s,0,'battle',[row.id,N]);const uid=s.players[0].battle[0].uid;give(s,1,'battle',[F]);const ids=physical(s);if(row.spec.g189BattleWin){s.active=1;attack(s);act(s,'block',a=>a.uid===uid);drain(s);}else{end(s);assert.ok(s.players[0].battle.some(x=>x.uid===uid));end(s);}assert.ok(s.players[0].grave.some(x=>x.uid===uid));assert.ok(s.players[0].battle.some(x=>x.cardId===N));assert.deepEqual(physical(s),ids);assert.equal(s.winner,null);assert.equal(s.decision,null);
});
test('only explicit self destruction and the historical self-win shorthand are accepted; all earlier manifests stay pinned',()=>{
 for(const row of m.cards){const d=structuredClone(details.cards.find(x=>x.id===row.id));assert.throws(()=>standardCardSpec(d,{phase:191}));d.faces[0].abilityText+='\n未知の能力';assert.throws(()=>standardCardSpec(d,{phase:192}));}const d=structuredClone(details.cards.find(x=>x.id===GIGA));for(const text of['このクリーチャーがバトルに勝った時、相手のクリーチャーを破壊する。','このクリーチャーがバトルに勝った時、このクリーチャーを破壊してもよい。','自分のターンのはじめに、自分のシールドが２つ以下ならこのクリーチャーを破壊する。']){d.faces[0].abilityText=text;assert.throws(()=>standardCardSpec(d,{phase:192}));}for(let phase=168;phase<=191;phase++)for(const row of JSON.parse(fs.readFileSync(new URL('../tools/support-phase-'+phase+'.json',import.meta.url))).cards)assert.deepEqual(standardCardSpec(details.cards.find(x=>x.id===row.id),{phase}),row.spec);
});
test('self destruction does not offer another allied creature as a substitute or target',()=>{
 for(const id of[GIGA,KHOOK,DOL]){const s=setup(),uid=blocked(s,id);drain(s);assert.equal(s.decision,null);assert.ok(s.players[0].grave.some(x=>x.uid===uid));assert.equal(s.players[0].battle.length,1);assert.equal(s.players[0].battle[0].cardId,N);}
});
test('the no-attack restriction remains; K Hook can attack and destroys itself when it wins',()=>{
 const s=setup();give(s,0,'battle',[GIGA]);s.phase='attack';assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'));
 const t=setup();give(t,0,'battle',[KHOOK,N]);give(t,1,'battle',[F]);t.players[1].battle[0].tapped=true;const uid=t.players[0].battle[0].uid;attack(t,uid,t.players[1].battle[0].uid);act(t,'noBlock');drain(t);assert.ok(t.players[0].grave.some(x=>x.uid===uid));assert.equal(t.attack,null);assert.equal(t.players[0].battle.length,1);
});
test('mandatory and optional death draws remain different and occur once after a winning sacrifice',()=>{
 const s=setup();blocked(s,BASA);drain(s);assert.equal(s.players[0].hand.length,1);assert.equal(s.players[0].grave.filter(x=>x.cardId===BASA).length,1);
 let t=setup();blocked(t,PORK);assert.equal(t.decision.task.op,'g34_Offer');assert.ok(t.players[0].grave.some(x=>x.cardId===PORK));const ids=physical(t);t=JSON.parse(JSON.stringify(t));pick(t,null);drain(t);assert.equal(t.players[0].hand.length,0);assert.deepEqual(physical(t),ids);
 const u=setup();blocked(u,PORK);pick(u,true);drain(u);assert.equal(u.players[0].hand.length,1);
});
test('normal losing and tied battles cause only the ordinary destruction and one death draw',()=>{
 for(const power of[5000,12000]){const s=setup();give(s,0,'battle',[BASA,N]);give(s,1,'battle',[F]);s.players[1].battle[0].powerModifiers=[{amount:power-2000}];const uid=s.players[0].battle[0].uid;s.active=1;attack(s);act(s,'block',a=>a.uid===uid);drain(s);assert.equal(s.players[0].hand.length,1);assert.equal(s.players[0].grave.filter(x=>x.cardId===BASA).length,1);}
});
test('winning self destruction resolves before Slayer and the destroyed source is not processed twice',()=>{
 const s=setup();blocked(s,BASA,SLAYER);drain(s);assert.equal(s.players[0].hand.length,1);assert.equal(s.players[0].grave.filter(x=>x.cardId===BASA).length,1);assert.equal(s.players[1].grave.filter(x=>x.cardId===SLAYER).length,1);
});
test('death milling places exactly six or five cards in the grave, including a death from an ordinary spell',()=>{
 for(const[id,n]of[[MATO,6],[DORU,5]]){const s=setup();give(s,0,'deck',Array(15).fill(N));blocked(s,id);drain(s);assert.equal(s.players[0].deck.length,15-n);assert.equal(s.players[0].grave.length,n+1);}
 const t=setup();give(t,0,'battle',[MATO]);give(t,0,'deck',Array(15).fill(N));const uid=t.players[0].battle[0].uid;t.active=1;play(t,DE);act(t,'effect',a=>a.targets.some(x=>x.uid===uid));drain(t);assert.equal(t.players[0].deck.length,9);assert.equal(t.players[0].grave.length,7);
});
test('the last-card draw may win with Shako, but exhausting the deck by death milling still loses',()=>{
 const s=setup();give(s,0,'battle',[BASA,'dmrp03-s03']);give(s,0,'deck',[N]);give(s,1,'battle',[F]);const uid=s.players[0].battle[0].uid;s.active=1;attack(s);act(s,'block',a=>a.uid===uid);drain(s);assert.equal(s.winner,0);
 const t=setup();give(t,0,'battle',[MATO,'dmrp03-s03']);give(t,0,'deck',Array(6).fill(N));give(t,1,'battle',[F]);const mato=t.players[0].battle[0].uid;t.active=1;attack(t);act(t,'block',a=>a.uid===mato);drain(t);assert.equal(t.winner,1);
});
test('start-of-own-turn destruction waits through the opponent turn and persists until its own turn begins',()=>{
 for(const id of[CLAN,DUJI,KID]){const s=setup();play(s,id);drain(s);const uid=s.players[0].battle[0].uid;end(s);assert.equal(s.active,1);assert.ok(s.players[0].battle.some(x=>x.uid===uid));end(s);assert.equal(s.active,0);assert.ok(s.players[0].grave.some(x=>x.uid===uid));}
});
test('an S-trigger blocker can block the next attack and dies at its next own turn start',()=>{
 const s=setup();give(s,1,'battle',[F,F]);give(s,0,'shields',[CLAN]);s.active=1;attack(s);act(s,'noBlock');act(s,'useTrigger');drain(s);const uid=s.players[0].battle[0].uid;attack(s,s.players[1].battle[1].uid);act(s,'block',a=>a.uid===uid);drain(s);assert.ok(s.players[0].battle.some(x=>x.uid===uid));end(s);assert.ok(s.players[0].grave.some(x=>x.uid===uid));
});
test('ignored start abilities do not destroy their source late; GG does not suppress win abilities',()=>{
 const s=setup();give(s,0,'battle',[DUJI]);give(s,1,'battle',[GEN]);const uid=s.players[0].battle[0].uid;end(s);end(s);assert.ok(s.players[0].battle.some(x=>x.uid===uid));act(s,'skipCharge');play(s,DE);act(s,'effect',a=>a.targets.some(x=>x.uid===s.players[1].battle[0].uid));drain(s);assert.ok(s.players[0].battle.some(x=>x.uid===uid));end(s);end(s);assert.ok(s.players[0].grave.some(x=>x.uid===uid));
 const t=setup();give(t,0,'battle',[GIGA]);give(t,1,'battle',[F,GG]);t.players[1].battle[1].under=[inst(N)];t.active=1;attack(t,t.players[1].battle[0].uid);act(t,'block');drain(t);assert.ok(t.players[0].grave.some(x=>x.cardId===GIGA));
});
test('Savak can replace the self destruction; a replaced destruction does not trigger the death draw',()=>{
 const s=setup();give(s,0,'battle',[BASA,SAVAK]);give(s,0,'shields',[N]);s.players[0].shields[0].faceUp=true;give(s,1,'battle',[F]);const uid=s.players[0].battle[0].uid,shield=s.players[0].shields[0].uid,ids=physical(s);s.active=1;attack(s);act(s,'block',a=>a.uid===uid);assert.equal(s.decision.type,'leaveReplace');act(s,'replaceSavak',a=>a.shieldCard===shield);drain(s);assert.ok(s.players[0].battle.some(x=>x.uid===uid));assert.ok(s.players[0].grave.some(x=>x.uid===shield));assert.equal(s.players[0].hand.length,0);assert.deepEqual(physical(s),ids);
});
test('a queued self-reference follows its creature after controller change and does not choose another creature',()=>{
 const s=setup();give(s,0,'battle',[GIGA,ONI,N]);give(s,1,'battle',[F]);s.active=1;attack(s);act(s,'block',a=>a.uid===s.players[0].battle[0].uid);assert.equal(s.decision.type,'battleWinOrder');const source=s.players[0].battle.shift();s.players[1].battle.push(source);const ids=physical(s);act(s,'battleWinOrder',a=>a.cardId===GIGA);drain(s);assert.ok(s.players[1].grave.some(x=>x.uid===source.uid));assert.ok(s.players[0].battle.some(x=>x.cardId===N));assert.deepEqual(physical(s),ids);
});
test('a queued self-reference does nothing after its source has already left the battle zone',()=>{
 let s=setup();give(s,0,'battle',[GIGA,ONI,N]);give(s,1,'battle',[F]);s.active=1;attack(s);act(s,'block',a=>a.uid===s.players[0].battle[0].uid);assert.equal(s.decision.type,'battleWinOrder');const source=s.players[0].battle.shift();s.players[0].hand.push(source);const ids=physical(s);s=JSON.parse(JSON.stringify(s));act(s,'battleWinOrder',a=>a.cardId===GIGA);drain(s);assert.ok(s.players[0].hand.some(x=>x.uid===source.uid));assert.equal(s.players[0].battle.length,2);assert.deepEqual(physical(s),ids);
});
test('two CPU decks finish after saved continuation with eighty conserved physical card identities',()=>{
 for(let i=0;i<2;i++){let s=e.createGame([STANDARD192_DECKS[i],PRESETS[i]],{seed:19201+i,first:i%2}),saved=false;const ids=physical(s);while(s.winner===null&&s.actions<1800&&s.turn<160){e.step(s,e.chooseAI(s));assert.deepEqual(physical(s),ids);if(!saved&&s.actions>20){s=JSON.parse(JSON.stringify(s));saved=true;}}assert.ok(saved);assert.notEqual(s.winner,null);assert.equal(ids.length,80);}
});
