import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';
import{e,data,details,snapshot,setup,give,inst,act,drain,GEN,PRESETS}from'./target-fixture.mjs';
import{createCatalogue}from'../dist/catalogue.js';import{CARD_IMAGES}from'../dist/card-images.js';import{attachShield}from'../dist/shield-state.js';import{UTILITY164_DECKS}from'../tools/fixtures/utility164.mjs';
const G='dmr03-051',B='dmex06-042',R='dmr22-039',K='dmr18-036',D='dm13-s04',P='dmx21-060',N='dm01-108',W='dm01-083',ALLY='dmrp17-025';
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function cast(s,id){const x=inst(id);s.players[s.active].hand.push(x);const before=physical(s);act(s,'play',a=>a.cardId===id);return{uid:x.uid,before};}
function pick(s,value){const a=e.getLegalActions(s).find(a=>a.kind==='extended'&&s.decision.choices[a.choice].value===value);assert.ok(a,JSON.stringify(s.decision));e.step(s,a);}
test('six official card definitions, images and restrictions resolve into two legal forty-card decks',()=>{
 const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-164.json',import.meta.url))),r=createCatalogue(snapshot,data.cards,details);assert.equal(m.cards.length,6);assert.ok(data.cards.length>=1975);
 for(const c of m.cards){assert.ok(r.get(c.id).supported);assert.deepEqual(c.faces,details.cards.find(d=>d.id===c.id).faces);assert.ok(c.verification.facesMatched);assert.match(c.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(CARD_IMAGES[c.id],c.image);assert.equal(e.card(c.id).limit,m.regulationVerification.limits[c.id]);assert.equal(e.card(c.id).supportBatch,'phase-164');}
 for(const d of UTILITY164_DECKS){assert.equal(d.cards.reduce((n,x)=>n+x.count,0),40);assert.deepEqual(e.validateDeck(d),[]);assert.equal(r.coverage(d).unsupported,0);}
});
test('Glenya permits either zero or one draw and enters multicolor mana tapped',()=>{
 for(const n of[0,1]){const s=setup(),before=s.players[0].deck.length;cast(s,G);assert.equal(s.decision.type,'draw');act(s,'draw',a=>a.n===n);assert.equal(s.players[0].deck.length,before-n);assert.ok(s.players[0].battle.some(x=>x.cardId===G));}
 const s=e.createGame([UTILITY164_DECKS[0],UTILITY164_DECKS[1]],{seed:164});give(s,0,'hand',[G]);const uid=s.players[0].hand[0].uid;act(s,'charge');assert.ok(s.players[0].mana.find(x=>x.uid===uid).tapped);
});
test('Bloody Typhoon takes one of exactly three viewed cards and puts the other two in grave',()=>{
 let s=setup();give(s,0,'deck',[N,G,W,N]);const [a,b,c,tail]=s.players[0].deck.map(x=>x.uid),play=cast(s,B);assert.equal(s.decision.task.op,'g34_LookPick');assert.deepEqual(s.decision.choices.map(c=>c.value),[a,b,c]);s=JSON.parse(JSON.stringify(s));pick(s,b);drain(s);
 assert.ok(s.players[0].hand.some(x=>x.uid===b));assert.ok(s.players[0].grave.some(x=>x.uid===a));assert.ok(s.players[0].grave.some(x=>x.uid===c));assert.deepEqual(s.players[0].deck.map(x=>x.uid),[tail]);assert.deepEqual(physical(s),play.before);assert.equal(s.players[0].g34Protected.length,0);
});
test('Bloody Typhoon never offers an unseen fourth card or a voluntary decline',()=>{
 const s=setup();give(s,0,'deck',[N,G,W,R]);cast(s,B);const fourth=s.players[0].deck[3].uid;assert.ok(!s.decision.choices.some(x=>x.value===fourth||x.value===null));
 for(const n of[1,2]){const t=setup();give(t,0,'deck',Array(n).fill(N));const play=cast(t,B);drain(t);assert.equal(t.decision,null);assert.deepEqual(physical(t),play.before);assert.ok([null,0,1].includes(t.winner));}
});
test('Ruins checks multicolor mana after the first card, and counts a dual-color card once',()=>{
 for(const [multi,top,extra]of[[3,G,3],[2,G,1],[4,N,3],[3,N,1]]){const s=setup();give(s,0,'mana',[...Array(multi).fill(G),...Array(5).fill(N)]);give(s,0,'deck',[top,...Array(8).fill(N)]);const start=s.players[0].mana.length,first=s.players[0].deck[0].uid,play=cast(s,R);drain(s);assert.equal(s.players[0].mana.length,start+extra);assert.equal(s.players[0].mana.find(x=>x.uid===first).tapped,top===G);assert.deepEqual(physical(s),play.before);}
});
test('Ruins uses current mana civilizations and does not count face-down printed multicolor cards',()=>{
 const s=setup();give(s,0,'battle',['dm13-015']);give(s,0,'mana',Array(5).fill(N));give(s,0,'deck',Array(8).fill(N));cast(s,R);drain(s);assert.equal(s.players[0].mana.length,8);
 const t=setup();give(t,0,'mana',[...Array(4).fill(G),...Array(5).fill(N)]);for(const x of t.players[0].mana.slice(0,4))x.faceDown=true;give(t,0,'deck',Array(8).fill(N));cast(t,R);drain(t);assert.equal(t.players[0].mana.length,10);
});
test('Ruins does not count the fourth multicolor card if entry into mana is replaced',()=>{
 const s=setup();give(s,1,'battle',['dm22ex1-086']);give(s,0,'mana',[G,G,G,...Array(5).fill(N)]);give(s,0,'deck',[G,...Array(8).fill(N)]);const start=s.players[0].deck.length;cast(s,R);drain(s);assert.equal(s.players[0].mana.length,8);assert.equal(s.players[0].deck.length,start-1);assert.ok(s.players[0].grave.some(x=>x.cardId===G));
});
test('Ruins can resolve as a shield trigger without mana',()=>{
 const s=setup();give(s,0,'battle',[N]);give(s,1,'shields',[R]);give(s,1,'mana',[]);give(s,1,'deck',Array(8).fill(N));s.phase='attack';act(s,'attack',a=>a.target==='player');act(s,'noBlock');act(s,'useTrigger');drain(s);assert.equal(s.players[1].mana.length,1);assert.ok(s.players[1].grave.some(x=>x.cardId===R));
});
test('Kodama moves a chosen complete shield group without using its triggers and charges its actual spell',()=>{
 let s=setup();give(s,0,'shields',['dm01-089',N]);const root=s.players[0].shields[0],extra=inst('dm01-089');assert.ok(attachShield(s.players[0],root.uid,extra));const play=cast(s,K);assert.ok(!s.decision.choices.some(c=>c.cardId));s=JSON.parse(JSON.stringify(s));pick(s,root.uid);drain(s);assert.equal(s.players[0].shields.length,1);for(const uid of[root.uid,extra.uid])assert.ok(s.players[0].hand.some(x=>x.uid===uid));assert.ok(s.players[0].mana.some(x=>x.uid===play.uid&&!x.tapped));assert.ok(!s.log.some(x=>x.type==='trigger'));assert.deepEqual(physical(s),play.before);
});
test('Kodama charges even without a shield, while Genmu ignores its ability and charger',()=>{
 const s=setup();give(s,0,'shields',[]);const play=cast(s,K);drain(s);assert.ok(s.players[0].mana.some(x=>x.uid===play.uid));
 const t=setup();give(t,1,'battle',[GEN]);const before=t.players[0].shields.length,ignored=cast(t,K);drain(t);assert.equal(t.players[0].shields.length,before);assert.ok(t.players[0].grave.some(x=>x.uid===ignored.uid));assert.ok(!t.players[0].mana.some(x=>x.uid===ignored.uid));
});
test('Dolge sympathy counts each eligible body once, excludes seals and has a floor of two',()=>{
 for(const n of[0,1,3,6,9]){const s=setup();give(s,0,'battle',Array(n).fill(ALLY));assert.equal(e.summonCost(s,0,e.card(D)),Math.max(2,8-n));}
 const s=setup();give(s,0,'battle',[D,ALLY]);assert.equal(e.summonCost(s,0,e.card(D)),6);s.players[0].battle[1].sealed=true;assert.equal(e.summonCost(s,0,e.card(D)),7);
 give(s,1,'battle',['dmrp22-027']);assert.equal(e.summonCost(s,0,e.card(D)),8);
});
test('Dolge counts its own two races as one body and allows any draw amount from zero to the allied count',()=>{
 for(const n of[0,2,4]){const s=setup();give(s,0,'battle',[ALLY,D,ALLY]);const before=s.players[0].deck.length,play=cast(s,D);assert.equal(s.decision.task.n,4);assert.deepEqual(s.decision.choices.map(x=>x.value),[0,1,2,3,4]);pick(s,n);drain(s);assert.equal(s.players[0].deck.length,before-n);assert.deepEqual(physical(s),play.before);}
});
test('Phoenix Life assigns either viewed card to a hidden shield and the other to mana',()=>{
 for(const index of[0,1]){let s=setup();give(s,0,'deck',[N,G,W]);const ids=s.players[0].deck.map(x=>x.uid),start=s.players[0].shields.length,play=cast(s,P);s=JSON.parse(JSON.stringify(s));pick(s,ids[index]);drain(s);const shield=s.players[0].shields.find(x=>x.uid===ids[index]),mana=s.players[0].mana.find(x=>x.uid===ids[1-index]);assert.ok(shield);assert.ok(!shield.faceUp);assert.ok(mana);assert.equal(mana.tapped,index===0);assert.equal(s.players[0].shields.length,start+1);assert.deepEqual(s.players[0].deck.map(x=>x.uid),[ids[2]]);assert.deepEqual(physical(s),play.before);}
});
test('Genmu ignores the new low-cost spells and Glenya draw without losing their physical cards',()=>{
 for(const id of[G,B,R,P]){const s=setup();give(s,1,'battle',[GEN]);const n=s.players[0].deck.length,shields=s.players[0].shields.length,play=cast(s,id);drain(s);assert.equal(s.players[0].deck.length,n);assert.equal(s.players[0].shields.length,shields);assert.ok(s.players[0][id===G?'battle':'grave'].some(x=>x.uid===play.uid));assert.deepEqual(physical(s),play.before);}
});
test('CPU plays both supported forty-card fixtures and conserves eighty physical cards across a saved continuation',()=>{
 for(const [i,deck]of UTILITY164_DECKS.entries()){let s=e.createGame([deck,PRESETS[0]],{seed:164501+i,first:i,maxTurns:70,maxActions:1800}),saved=false;const ids=physical(s);while(s.winner===null){e.step(s,e.chooseAI(s));assert.deepEqual(physical(s),ids);if(!saved&&s.actions>=20){const t=JSON.parse(JSON.stringify(s));assert.deepEqual(e.getLegalActions(t),e.getLegalActions(s));s=t;saved=true;}}assert.equal(ids.length,80);assert.ok(saved);assert.ok([0,1].includes(s.winner));}
});
