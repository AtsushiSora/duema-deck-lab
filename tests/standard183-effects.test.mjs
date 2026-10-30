import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain,GEN,GG,PRESETS} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {STANDARD183_DECKS} from '../tools/fixtures/standard183.mjs';
const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-183.json',import.meta.url)));
const N='dm01-108',F='dm01-097',L='dm01-075',BASE='dm01-083',JACE='dmx22b-105',JABA='dmr12-s02',NAM='dmr07-025',MEGA='dmrp15-078',WADA='dm25ex2-089',SEED='dmrp17-coro10',ZOO='dmex14-071',ITA='dmex13-082',ALICE='dmrp20-069',DE='dm01-027',BO='dm01-086';
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function pick(s,v){act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===v);}
function play(s,id){s.players[s.active].hand.push(inst(id));act(s,'play',a=>a.cardId===id&&!a.alternative);}
function evolve(s){act(s,'evolve',a=>!!a.baseUid);}
function removeEnemy(s,id,owner,uid){s.active=1-owner;s.phase='main';play(s,id);act(s,'effect',a=>a.targets.some(x=>x.uid===uid));}
test('nine complete definitions have verified official faces, limits and artwork in a legal forty-card deck',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);assert.equal(m.cards.length,9);for(const row of m.cards){assert.deepEqual(row.faces,details.cards.find(x=>x.id===row.id).faces);assert.deepEqual(row.spec,standardCardSpec(details.cards.find(x=>x.id===row.id),{phase:183}));assert.equal(e.card(row.id).supportBatch,'phase-183');assert.ok(row.verification.facesMatched);assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(e.card(row.id).limit,m.regulationVerification.limits[row.id]);assert.equal(CARD_IMAGES[row.id],row.image);assert.ok(registry.get(row.id).supported);assert.ok(STANDARD183_DECKS[0].cards.some(x=>x.id===row.id));}assert.deepEqual(e.validateDeck(STANDARD183_DECKS[0]),[]);assert.equal(STANDARD183_DECKS[0].cards.reduce((n,x)=>n+x.count,0),40);assert.equal(registry.coverage(STANDARD183_DECKS[0]).unsupported,0);
});
test('grammar does not claim conditional, top-or-bottom or unknown effects and preserves earlier batches',()=>{
 for(const row of m.cards){const d=structuredClone(details.cards.find(x=>x.id===row.id));assert.throws(()=>standardCardSpec(d,{phase:182}));d.faces[0].abilityText+='\n未知の能力';assert.throws(()=>standardCardSpec(d,{phase:183}));}
 const d=structuredClone(details.cards.find(x=>x.id===ITA));for(const text of['このクリーチャーが出た時、自分の手札を２枚、好きな順序で山札の上か下に置く。','このクリーチャーが出た時、自分の手札を１枚、山札の上に置いてもよい。そうしたらカードを２枚引く。']){d.faces[0].abilityText=text;assert.throws(()=>standardCardSpec(d,{phase:183}));}
 for(let phase=168;phase<=182;phase++)for(const row of JSON.parse(fs.readFileSync(new URL('../tools/support-phase-'+phase+'.json',import.meta.url))).cards)assert.deepEqual(standardCardSpec(details.cards.find(x=>x.id===row.id),{phase}),row.spec);
});
for(const id of[JACE,WADA])test(e.card(id).name+': draws three before selecting from the complete hand, preserving the top order and saved continuation',()=>{
 let s=setup();give(s,0,'hand',[N,F]);const old=s.players[0].hand.map(x=>x.uid),original=s.players[0].deck.slice(3).map(x=>x.uid);play(s,id);assert.equal(s.players[0].hand.length,5);assert.equal(s.players[0].deck.length,27);assert.ok(!s.decision.choices.some(c=>c.value===null));const n=id===JACE?2:1,chosen=[old[1],s.players[0].hand.at(-1).uid].slice(0,n),ids=physical(s);pick(s,chosen[0]);if(n===2){assert.equal(s.players[0].deck.length,27);assert.ok(s.players[0].hand.some(x=>x.uid===chosen[0]));assert.ok(!s.decision.choices.some(c=>c.value?.uid===chosen[0]));s=JSON.parse(JSON.stringify(s));pick(s,chosen[1]);}drain(s);assert.deepEqual(s.players[0].deck.slice(0,n).map(x=>x.uid),chosen);assert.deepEqual(s.players[0].deck.slice(n).map(x=>x.uid),original);assert.equal(s.players[0].hand.length,5-n);assert.deepEqual(physical(s),ids);
});
test('single top return does as much as possible, never returns the played creature, and is not a discard',()=>{
 const s=setup();give(s,0,'hand',[F]);const uid=s.players[0].hand[0].uid;play(s,ITA);pick(s,uid);assert.equal(s.players[0].deck[0].uid,uid);assert.equal(s.players[0].grave.length,0);assert.ok(s.players[0].battle.some(x=>x.cardId===ITA));
 const t=setup();play(t,ITA);assert.equal(t.decision,null);assert.equal(t.players[0].deck.length,30);assert.equal(t.winner,null);
});
test('Jabajack optional draw and mandatory bottom return stay coupled, with chosen order preserved',()=>{
 for(const accept of[false,true]){let s=setup();give(s,0,'battle',[BASE]);give(s,0,'hand',[N,F]);const old=s.players[0].hand.map(x=>x.uid),base=s.players[0].battle[0].uid;play(s,JABA);assert.equal(s.decision.type,'evolution');evolve(s);assert.equal(s.players[0].deck.length,30);pick(s,accept?true:null);if(accept){assert.equal(s.players[0].deck.length,26);pick(s,old[1]);s=JSON.parse(JSON.stringify(s));pick(s,old[0]);assert.deepEqual(s.players[0].deck.slice(-2).map(x=>x.uid),[old[1],old[0]]);}drain(s);assert.equal(s.players[0].hand.length,accept?4:2);assert.equal(s.players[0].deck.length,accept?28:30);assert.ok(s.players[0].battle.find(x=>x.cardId===JABA).under.some(x=>x.uid===base));}
});
test('Jabajack requires a Liquid People evolution base, and CPU declines lethal optional draws unless Shako wins',()=>{
 const t=setup();give(t,0,'battle',[N]);give(t,0,'hand',[JABA]);assert.ok(!e.getLegalActions(t).some(a=>a.kind==='play'&&a.cardId===JABA));
 for(const shako of[false,true]){const s=setup();give(s,0,'battle',shako?[BASE,'dmrp03-s03']:[BASE]);give(s,0,'deck',[N,F,L,BASE]);play(s,JABA);evolve(s);const a=e.chooseAI(s);assert.equal(s.decision.choices[a.choice].value,shako?true:null);e.step(s,a);drain(s);assert.equal(s.winner,shako?0:null);}
});
test('accepting an optional draw that empties the deck loses before cards can be returned; declining leaves it intact',()=>{
 for(const accept of[false,true]){const s=setup();give(s,0,'deck',[N]);give(s,0,'hand',[F]);play(s,NAM);pick(s,accept?true:null);assert.equal(s.winner,accept?1:null);assert.equal(s.players[0].deck.length,accept?0:1);assert.equal(s.players[0].hand.length,accept?2:1);}
});
test('Namlock can decline the whole loot or put a newly drawn card back, remains a blocker and cannot attack',()=>{
 const s=setup();give(s,0,'hand',[F]);const top=s.players[0].deck[0].uid;play(s,NAM);pick(s,true);assert.equal(s.players[0].hand.length,2);pick(s,top);assert.equal(s.players[0].deck[0].uid,top);assert.equal(s.players[0].hand.length,1);give(s,0,'battle',[NAM]);s.phase='attack';assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'));give(s,1,'battle',[N]);s.active=1;act(s,'attack',a=>a.target==='player');assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'));
});
test('Megahit returns to bottom before drawing and charges the same spell exactly once after resolution',()=>{
 const s=setup();give(s,0,'hand',[N]);const old=s.players[0].hand[0].uid,top=s.players[0].deck[0].uid;play(s,MEGA);const spell=s.extSpells.find(x=>x.inst.cardId===MEGA).inst.uid,ids=physical(s);pick(s,old);drain(s);assert.ok(s.players[0].hand.some(x=>x.uid===top));assert.equal(s.players[0].deck.at(-1).uid,old);assert.equal(s.players[0].mana.filter(x=>x.uid===spell).length,1);assert.ok(!s.players[0].grave.some(x=>x.uid===spell));assert.deepEqual(physical(s),ids);
 const t=setup();play(t,MEGA);drain(t);assert.equal(t.players[0].hand.length,1);assert.equal(t.players[0].deck.length,29);assert.equal(t.players[0].mana.length,51);
});
test('returning a card does not invoke discard-only Baiken, hand-mana or deck-to-mana replacement effects',()=>{
 const s=setup();give(s,0,'hand',['dm29-s02']);give(s,1,'battle',['dm22ex1-086']);const uid=s.players[0].hand[0].uid;play(s,ITA);pick(s,uid);assert.equal(s.players[0].deck[0].uid,uid);assert.equal(s.players[0].grave.length,0);assert.ok(!s.players[0].battle.some(x=>x.uid===uid));assert.equal(s.decision,null);
});
for(const id of[SEED,ZOO])test(e.card(id).name+': attack effect finishes before blocking, including an empty hand',()=>{
 for(const full of[false,true]){const s=setup();give(s,0,'battle',[id]);give(s,0,'hand',full?[F]:[]);const old=s.players[0].hand[0]?.uid;s.phase='attack';act(s,'attack',a=>a.target==='player');if(id===SEED||full){assert.equal(s.decision.task.op,'g34_Select');const chosen=old||s.players[0].hand[0].uid;pick(s,chosen);assert.equal(s.players[0].deck[0].uid,chosen);}assert.equal(s.decision.type,'block');if(id===ZOO){assert.equal(e.power(s.players[0].battle[0],true,s),e.card(ZOO).power+4000);assert.equal(e.card(ZOO).unblockable,true);}}
});
test('Jace returns an opposing creature on attack while having no hand to put on the deck',()=>{
 const s=setup();give(s,0,'battle',[JACE]);give(s,1,'battle',[N]);const uid=s.players[1].battle[0].uid;s.phase='attack';act(s,'attack',a=>a.target==='player');pick(s,uid);drain(s);assert.ok(s.players[1].hand.some(x=>x.uid===uid));
});
test('Alice death draw and ordered top return are controlled by its owner, and bounce does not trigger them',()=>{
 for(const owner of[0,1]){let s=setup();give(s,owner,'battle',[ALICE]);give(s,owner,'hand',[F]);removeEnemy(s,DE,owner,s.players[owner].battle[0].uid);assert.equal(s.decision.player,owner);assert.equal(s.players[owner].hand.length,4);const chosen=s.players[owner].hand.slice(-2).map(x=>x.uid),ids=physical(s);pick(s,chosen[0]);s=JSON.parse(JSON.stringify(s));pick(s,chosen[1]);drain(s);assert.deepEqual(s.players[owner].deck.slice(0,2).map(x=>x.uid),chosen);assert.equal(s.players[owner].hand.length,2);assert.deepEqual(physical(s),ids);}
 const s=setup();give(s,0,'battle',[ALICE]);removeEnemy(s,BO,0,s.players[0].battle[0].uid);assert.equal(s.players[0].deck.length,30);assert.equal(s.decision,null);
});
test('Alice Sasage reduces the Dispector summon while still resolving draw and ordered return',()=>{
 const s=setup();give(s,0,'battle',[ALICE]);give(s,0,'mana',Array(6).fill(L));give(s,0,'hand',['dmrp19-030']);const uid=s.players[0].battle[0].uid;act(s,'play',a=>a.alternative==='sasage'&&a.sasage.includes(uid));assert.equal(s.decision.task.op,'g34_Select');const choices=s.players[0].hand.slice(0,2).map(x=>x.uid);for(const id of choices)pick(s,id);drain(s);assert.ok(s.players[0].battle.some(x=>x.cardId==='dmrp19-030'));assert.ok(s.players[0].grave.some(x=>x.uid===uid));assert.equal(s.players[0].hand.length,1);
});
test('last-card draws stop before top return, while Babylonia replacement finishes before the original return',()=>{
 const s=setup();give(s,0,'deck',[N,F,L]);play(s,JACE);assert.equal(s.winner,1);assert.equal(s.players[0].deck.length,0);assert.equal(s.decision,null);
 const t=setup();give(t,0,'battle',['dm32-021']);give(t,0,'hand',[F]);play(t,ITA);pick(t,t.players[0].hand[0].uid);assert.equal(t.decision,null);assert.equal(t.players[0].grave.length,0);
 const u=setup();give(u,0,'battle',['dm32-021']);play(u,NAM);pick(u,true);assert.equal(u.decision.type,'drawReplacement');act(u,'replaceDraw',a=>a.replace);act(u,'discardDraw',a=>true);assert.equal(u.decision.task.op,'g34_Select');pick(u,u.players[0].hand[0].uid);drain(u);assert.equal(u.players[0].hand.length,0);assert.equal(u.players[0].grave.length,1);
});
test('Genmu and GG suppress applicable entry/attack abilities but GG leaves death return active',()=>{
 for(const id of[ITA,WADA,NAM]){const s=setup();give(s,1,'battle',[GEN]);give(s,0,'hand',[F]);const deck=s.players[0].deck.length;play(s,id);drain(s);assert.equal(s.players[0].deck.length,deck);assert.equal(s.players[0].hand.length,1);}
 const t=setup();give(t,1,'battle',[GG]);t.players[1].battle[0].under=[inst(N)];give(t,0,'battle',[ALICE]);removeEnemy(t,DE,0,t.players[0].battle[0].uid);assert.equal(t.players[0].hand.length,3);assert.equal(t.decision.task.op,'g34_Select');drain(t);assert.equal(t.players[0].hand.length,1);
});
test('CPU keeps expensive finishers and both CPU games conserve eighty physical cards through save/resume',()=>{
 const t=setup();give(t,0,'hand',[N,'dmx22b-012']);play(t,ITA);const a=e.chooseAI(t);assert.equal(t.decision.choices[a.choice].cardId,N);
 for(let i=0;i<2;i++){let s=e.createGame([STANDARD183_DECKS[0],PRESETS[i]],{seed:18301+i,first:i%2}),saved=false;const ids=physical(s);while(s.winner===null&&s.actions<1800&&s.turn<160){e.step(s,e.chooseAI(s));assert.deepEqual(physical(s),ids);if(!saved&&s.actions>20){s=JSON.parse(JSON.stringify(s));saved=true;}}assert.ok(saved);assert.notEqual(s.winner,null);assert.equal(ids.length,80);}
});
