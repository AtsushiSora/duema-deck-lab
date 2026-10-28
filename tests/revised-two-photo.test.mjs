import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain,PRESETS} from './target-fixture.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {PHOTO_REVISED_TWO} from '../tools/fixtures/photo-revised-two.mjs';
const manifest=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-54.json',import.meta.url))),registry=createCatalogue(snapshot,data.cards,details);
const K='dmrp07-070',L='dm25rp4-004',Z='dmrp20-028',N='dm01-108';
const play=(s,id)=>{s.players[s.active].hand.push(inst(id));act(s,'play',a=>a.cardId===id);};
const pick=(s,value)=>{const a=e.getLegalActions(s).find(a=>a.kind==='extended'&&JSON.stringify(s.decision.choices[a.choice].value)===JSON.stringify(value));assert.ok(a,JSON.stringify(s.decision));e.step(s,a);};
const uids=s=>e.physicalCards(s).map(x=>x.uid).sort();
test('two photos retain their exact forty cards and three new official definitions have usable effects',()=>{
 assert.equal(data.cards.length,1703);assert.equal(data.supportExpansion.phase,122);assert.equal(manifest.cards.length,3);
 for(const row of manifest.cards){const c=e.card(row.id);assert.equal(c.name,row.name);assert.deepEqual(details.cards.find(x=>x.id===row.id).faces,row.faces);assert.equal(registry.get(row.id).supported,true);for(const[k,v]of Object.entries(row.spec))assert.deepEqual(c[k],v);}
 for(const d of PHOTO_REVISED_TWO){assert.equal(d.cards.reduce((n,x)=>n+x.count,0),40);assert.deepEqual(e.validateDeck(d),[]);assert.ok(d.cards.every(x=>registry.get(x.id).supported));}
 assert.equal(e.card(K).race,'魔導具');assert.equal(e.card(K).trigger,true);assert.equal(e.card(L).race,'');
});
test('Kajiguri is mandatory, selects only targetable enemy creatures and returns the full evolution stack',()=>{
 const s=setup();give(s,0,'battle',[N]);give(s,1,'battle',['dmc27-004',N]);const top=s.players[1].battle[0],base=inst(N);top.under=[base];play(s,K);
 assert.equal(s.decision.task.op,'g34_Target');assert.equal(s.decision.choices.length,2);assert.ok(s.decision.choices.every(x=>x.value?.p===1));pick(s,{uid:top.uid,p:1});assert.ok(s.players[1].hand.some(x=>x.uid===top.uid));assert.ok(s.players[1].hand.some(x=>x.uid===base.uid));assert.equal(s.players[0].battle.length,1);
 const t=setup();give(t,0,'battle',[N]);play(t,K);assert.equal(t.decision,null);assert.equal(t.players[0].battle.length,1);
});
test('Dis Zorostar places the actual top three in shield, grave, mana order without drawing',()=>{
 const s=setup();give(s,0,'deck',[N,'dm01-097',Z,N,N]);const ids=s.players[0].deck.map(x=>x.uid),before=s.players[0].shields.length,mana=s.players[0].mana.length;play(s,Z);drain(s);
 assert.equal(s.players[0].shields.length,before+1);assert.ok(s.players[0].shields.some(x=>x.uid===ids[0]));assert.ok(s.players[0].grave.some(x=>x.uid===ids[1]));assert.ok(s.players[0].mana.some(x=>x.uid===ids[2]&&x.tapped));assert.equal(s.players[0].mana.length,mana+1);assert.deepEqual(s.players[0].deck.map(x=>x.uid),ids.slice(3));assert.equal(s.players[0].hand.length,0);
});
test('Dis Zorostar stops on deck exhaustion and its top moves work under Q.Q.QX',()=>{
 for(const n of [1,2,3]){const s=setup();give(s,0,'deck',Array(n).fill(N));play(s,Z);drain(s);assert.equal(s.winner,1);assert.equal(s.players[0].shields.length,6);assert.equal(s.players[0].grave.length,n>=2?1:0);assert.equal(s.players[0].mana.length,50+(n===3?1:0));}
 const s=setup();give(s,1,'battle',[data.cards.find(c=>c.qqLock).id]);give(s,0,'deck',[N,N,N,N]);play(s,Z);drain(s);assert.equal(s.players[0].deck.length,1);assert.ok(!s.log.some(x=>x.type==='libraryLocked'));
});
test('LOVE resets only the selected player, moves evolution bases, preserves mana/shields and resolves itself to grave',()=>{
 const s=setup();give(s,0,'battle',[N]);give(s,1,'battle',['dmc27-004',N]);give(s,1,'hand',[K,N]);give(s,1,'grave',[Z]);const top=s.players[1].battle[0];top.under=[inst(N)];const selected=[...s.players[1].battle,top.under[0],...s.players[1].hand,...s.players[1].grave].map(x=>x.uid),deck=s.players[1].deck.length,mana=structuredClone(s.players[1].mana),shields=structuredClone(s.players[1].shields);
 play(s,L);const before=uids(s);pick(s,1);drain(s);assert.deepEqual(uids(s),before);assert.equal(s.players[1].battle.length,0);assert.equal(s.players[1].hand.length,0);assert.equal(s.players[1].grave.length,0);assert.equal(s.players[1].deck.length,deck+selected.length);assert.ok(selected.every(uid=>s.players[1].deck.some(x=>x.uid===uid)));assert.deepEqual(s.players[1].mana,mana);assert.deepEqual(s.players[1].shields,shields);assert.equal(s.players[0].battle.length,1);assert.ok(s.players[0].grave.some(x=>x.cardId===L));assert.ok(!s.log.some(x=>x.type==='zoneShuffle'&&x.text.includes(e.card(K).name)));
});
test('LOVE permits player zero and excludes the spell currently being cast from the self reset',()=>{
 const s=setup();give(s,0,'battle',[N]);give(s,0,'grave',[Z]);give(s,0,'hand',[K]);play(s,L);const before=uids(s),oldDeck=s.players[0].deck.length;pick(s,0);drain(s);assert.deepEqual(uids(s),before);assert.equal(s.players[0].deck.length,oldDeck+3);assert.deepEqual(s.players[0].grave.map(x=>x.cardId),[L]);assert.equal(s.players[0].hand.length,0);assert.equal(s.players[0].battle.length,0);
});
test('LOVE retains EX-life creatures, leaves the replacement shield in grave and does not lose identities',()=>{
 const s=setup();give(s,1,'battle',['dmrp18-km3']);const x=s.players[1].battle[0],shield=s.players[1].shields[0];x.exLifeShieldUid=shield.uid;give(s,1,'grave',[N]);const old=s.players[1].grave[0];play(s,L);const before=uids(s);pick(s,1);drain(s);assert.deepEqual(uids(s),before);assert.ok(s.players[1].battle.some(y=>y.uid===x.uid));assert.ok(s.players[1].grave.some(y=>y.uid===shield.uid));assert.ok(s.players[1].deck.some(y=>y.uid===old.uid));assert.equal(s.players[1].shields.length,4);
});
test('LOVE preserves Star evolution reconstruction and returns only its top card',()=>{
 const s=setup(),star=e.card('dmrp21-071');give(s,1,'battle',[star.id]);const top=s.players[1].battle[0],base=inst(N);top.under=[base];play(s,L);const before=uids(s);pick(s,1);drain(s);assert.deepEqual(uids(s),before);assert.ok(s.players[1].battle.some(y=>y.uid===base.uid));assert.ok(s.players[1].deck.some(y=>y.uid===top.uid));
});
test('LOVE ignores creature targeting restrictions and leaves sealed bodies alone while returning seals',()=>{
 const s=setup();give(s,1,'battle',[N,N]);const [sealed,diver]=s.players[1].battle;sealed.sealed=true;diver.justDiverActive=true;const seal=inst(N);seal.sealOf=sealed.uid;s.players[1].seals=[seal];play(s,L);const before=uids(s);pick(s,1);drain(s);assert.deepEqual(uids(s),before);assert.ok(s.players[1].battle.some(y=>y.uid===sealed.uid));assert.ok(s.players[1].deck.some(y=>y.uid===seal.uid));assert.ok(s.players[1].deck.some(y=>y.uid===diver.uid));assert.equal(s.players[1].seals.length,0);
});
test('LOVE continuations survive JSON restore; Q.Q.QX still gives insertion order for every returned card',()=>{
 const s=setup();give(s,0,'battle',[data.cards.find(c=>c.qqLock).id]);give(s,1,'battle',[N]);give(s,1,'hand',[K]);give(s,1,'grave',[Z]);const old=s.players[1].deck.map(x=>x.uid);play(s,L);const restored=JSON.parse(JSON.stringify(s));assert.deepEqual(e.getLegalActions(restored),e.getLegalActions(s));pick(s,1);assert.equal(s.decision.task.op,'g11_Insert');const before=uids(s);drain(s);assert.deepEqual(uids(s),before);assert.deepEqual(s.players[1].deck.filter(x=>old.includes(x.uid)).map(x=>x.uid),old);assert.equal(s.players[1].deck.length,old.length+3);
});
test('both exact photographed lists finish games from either side without duplicating or losing physical cards',()=>{
 for(const[i,d]of PHOTO_REVISED_TWO.entries())for(const first of [0,1]){const s=e.createGame([d,PRESETS[i]],{seed:54001+i*101+first,first});const before=uids(s);while(s.winner===null&&s.actions<1800&&s.turn<100){const a=e.chooseAI(s);assert.ok(a);e.step(s,a);assert.deepEqual(uids(s),before);assert.equal(new Set(uids(s)).size,80);}assert.notEqual(s.winner,null,d.name);}
});
test('LOVE does not scoop up hand cards paid to a leave replacement and can resume that choice from JSON',()=>{
 const s=setup();give(s,1,'battle',['dm22rp1-1B']);give(s,1,'hand',[N,N,K]);give(s,1,'grave',[Z]);const victim=s.players[1].battle[0],oldHand=s.players[1].hand.map(x=>x.uid);play(s,L);const before=uids(s);pick(s,1);assert.equal(s.decision.type,'leaveReplace');const restored=JSON.parse(JSON.stringify(s));assert.deepEqual(e.getLegalActions(restored),e.getLegalActions(s));act(s,'replaceJashin');act(s,'leaveHand');act(s,'leaveHand');drain(s);assert.deepEqual(uids(s),before);assert.ok(s.players[1].battle.some(x=>x.uid===victim.uid));assert.equal(s.players[1].grave.filter(x=>oldHand.includes(x.uid)).length,2);assert.equal(s.players[1].deck.filter(x=>oldHand.includes(x.uid)).length,1);
});
test('Dis Zorostar follows deck-to-zone replacement for both the shield and mana moves',()=>{
 const s=setup();give(s,1,'battle',[data.cards.find(c=>c.deckRedirect).id]);give(s,0,'deck',[N,N,Z,N]);const ids=s.players[0].deck.slice(0,3).map(x=>x.uid);play(s,Z);drain(s);assert.equal(s.players[0].shields.length,5);assert.equal(s.players[0].mana.length,50);assert.ok(ids.every(uid=>s.players[0].grave.some(x=>x.uid===uid)));assert.equal(s.players[0].deck.length,1);
});
test('LOVE AI uses visible counts only and analyzing a pending player choice never changes live state',()=>{
 const s=setup();give(s,1,'battle',[N,N]);give(s,1,'hand',[K,Z]);play(s,L);const before=structuredClone(s),a=e.chooseAI(s);assert.deepEqual(s,before);const other=structuredClone(s);other.players[1].hand.forEach(x=>x.cardId=L);assert.deepEqual(e.chooseAI(other),a);assert.equal(s.decision.choices[a.choice].value,1);
});
