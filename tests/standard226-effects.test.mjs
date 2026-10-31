import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain,PRESETS} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {STANDARD226_DECK} from '../tools/fixtures/standard226.mjs';
const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-226.json',import.meta.url)));
const N='dm01-108',F='dm01-097',H='dm01-075',D='dm01-090',W='dm01-083',B='dm01-076',SEED='dmsd20-016',GEN='dmrp15-km1',COURT='dm13-015',CASA='dm24bd5-010';
const basic={'光':H,'水':W,'闇':D,'火':F,'自然':N};
const bases={'キマイラ':'dm12-047','ロック・ビースト':'dm10-098','イニシエート':'dm01-072','ツリーフォーク':'dm06-104'};
const put=(s,p,id)=>{const x=inst(id);s.players[p].battle.push(x);return x;};
const body=(s,p,id)=>{const x=put(s,p,id),race=e.card(id).evolution?.race;if(race)x.under=[inst(bases[race])];return x;};
const ids=s=>e.physicalCards(s).map(x=>x.uid).sort();
const blocks=s=>e.getLegalActions(s).filter(a=>a.kind==='block');
function start(s,p,x,target='player'){s.active=p;s.phase='attack';act(s,'attack',a=>a.uid===x.uid&&a.target===target);for(let n=0;s.decision?.type!=='block'&&s.decision&&n<100;n++)e.step(s,e.chooseAI(s));assert.equal(s.decision?.type,'block');}

test('eight official complete definitions, mana, art, four evolution bases and a legal forty-card fixture',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);assert.equal(m.cards.length,8);
 for(const r of m.cards){assert.deepEqual(r.faces,details.cards.find(c=>c.id===r.id).faces);assert.deepEqual(standardCardSpec(details.cards.find(c=>c.id===r.id),{phase:226}),r.spec);assert.ok(r.verification.facesMatched);assert.match(r.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(e.card(r.id).manaValue,1);assert.equal(e.card(r.id).limit,m.regulationVerification.limits[r.id]);assert.equal(CARD_IMAGES[r.id],r.image);assert.ok(registry.get(r.id).supported);if(r.spec.evolution)assert.ok(registry.get(bases[r.spec.evolution.race]).supported);}
 assert.deepEqual(e.validateDeck(STANDARD226_DECK),[]);assert.equal(registry.coverage(STANDARD226_DECK).unsupported,0);assert.equal(STANDARD226_DECK.cards.reduce((n,r)=>n+r.count,0),40);
});
test('stealth is strict, reminder colors must agree, and pinned earlier phases are unchanged',()=>{
 for(const r of m.cards){const d=structuredClone(details.cards.find(c=>c.id===r.id));assert.throws(()=>standardCardSpec(d,{phase:225}));d.faces[0].abilityText+='\n未確認の能力';assert.throws(()=>standardCardSpec(d,{phase:226}));}
 const d=structuredClone(details.cards.find(c=>c.id==='dm07-036'));d.faces[0].abilityText=d.faces[0].abilityText.replace('闇のカード','火のカード');assert.throws(()=>standardCardSpec(d,{phase:226}));
 for(let phase=168;phase<=225;phase++){if([202,213].includes(phase))continue;for(const r of JSON.parse(fs.readFileSync(new URL('../tools/support-phase-'+phase+'.json',import.meta.url))).cards)assert.deepEqual(standardCardSpec(details.cards.find(c=>c.id===r.id),{phase}),r.spec);}
});
for(const r of m.cards)test(r.name+' paid summon/evolution preserves every physical card and survives JSON continuation',()=>{
 let s=setup();const race=r.spec.evolution?.race,base=race?put(s,0,bases[race]):null;give(s,0,'hand',[r.id]);const uid=s.players[0].hand[0].uid,before=ids(s);act(s,'play',a=>a.uid===uid&&!a.alternative);if(base)act(s,'evolve',a=>a.baseUid===base.uid);drain(s);const x=s.players[0].battle.find(x=>x.uid===uid);assert.ok(x);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,e.card(r.id).cost);assert.equal(e.isEvolution(x),!!base);if(base)assert.equal(x.under[0].uid,base.uid);s=JSON.parse(JSON.stringify(s));assert.deepEqual(ids(s),before);assert.equal(new Set(before).size,before.length);
});
for(const r of m.cards)test(r.name+' removes all blockers only while the opponent has its matching mana civilization',()=>{
 for(const active of [false,true]){const s=setup(),x=body(s,0,r.id);give(s,1,'mana',[active?basic[r.spec.g226Stealth]:basic[r.spec.g226Stealth==='火'?'水':'火']]);const b=put(s,1,B);assert.equal(!!e.effectiveCard(x,s).unblockable,active);start(s,0,x);assert.equal(blocks(s).some(a=>a.uid===b.uid),!active);}
});
test('stealth sees opposing mana only; tapping, zero mana points and twin faces do not remove its civilization',()=>{
 const s=setup(),x=body(s,0,'dm07-036');give(s,1,'mana',[]);give(s,1,'grave',[D]);assert.equal(!!e.effectiveCard(x,s).unblockable,false);
 give(s,1,'mana',['dm27-055']);s.players[1].mana[0].tapped=true;assert.equal(e.manaValue(e.card('dm27-055')),0);assert.equal(e.effectiveCard(x,s).unblockable,true);
 const t=setup(),y=body(t,0,'dm07-045');give(t,1,'mana',['dmex12-074']);assert.equal(e.effectiveCard(y,t).unblockable,true);give(t,1,'mana',[]);assert.equal(!!e.effectiveCard(y,t).unblockable,false);
});
test('facedown mana identities remain irrelevant and both sides can have stealth without recursive decoration',()=>{
 const s=setup(),a=body(s,0,'dm07-036'),b=body(s,1,'dm07-045');give(s,0,'mana',[N]);give(s,1,'mana',[D]);assert.equal(e.effectiveCard(a,s).unblockable,true);assert.equal(e.effectiveCard(b,s).unblockable,true);
 s.players[1].mana[0].faceDown=true;assert.equal(!!e.effectiveCard(a,s).unblockable,false);s.players[1].mana[0].cardId=N;assert.equal(!!e.effectiveCard(a,s).unblockable,false);
});
for(const grant of [COURT,CASA])test(e.card(grant).name+' changes the actual opposing mana civilizations and stops when ignored, sealed or removed',()=>{
 const s=setup(),a=body(s,0,'dm07-036'),b=body(s,1,'dm07-045');give(s,0,'mana',[W]);give(s,1,'mana',[W]);const source=put(s,1,grant);assert.equal(e.effectiveCard(a,s).unblockable,true);assert.equal(!!e.effectiveCard(b,s).unblockable,false);assert.deepEqual(e.manaColors(e.card(W),s,1),['光','水','闇','火','自然']);assert.deepEqual(e.manaColors(e.card(W),s,1,true),['光','水','闇','火','自然']);
 source.g35Ignored=s.turn;assert.equal(!!e.effectiveCard(a,s).unblockable,false);delete source.g35Ignored;source.sealed=true;assert.equal(!!e.effectiveCard(a,s).unblockable,false);source.sealed=false;assert.equal(e.effectiveCard(a,s).unblockable,true);s.players[1].battle=s.players[1].battle.filter(x=>x.uid!==source.uid);assert.equal(!!e.effectiveCard(a,s).unblockable,false);
});
test('ability ignore removes stealth; removing matching mana before blocking immediately restores legal blockers',()=>{
 const s=setup(),x=body(s,0,'dm07-036');give(s,1,'mana',[D]);const b=put(s,1,B);x.g35Ignored=s.turn;assert.equal(!!e.effectiveCard(x,s).unblockable,false);delete x.g35Ignored;start(s,0,x);assert.equal(blocks(s).length,0);s.players[1].mana=[];assert.ok(blocks(s).some(a=>a.uid===b.uid));act(s,'block',a=>a.uid===b.uid);drain(s);assert.equal(s.winner,null);
 const t=setup(),y=body(t,0,'dm07-036');give(t,1,'mana',[D]);put(t,1,GEN);assert.equal(!!e.effectiveCard(y,t).unblockable,false);
});
test('stealth is symmetric for the second player and never permits attacks on untapped creatures',()=>{
 const s=setup(),x=body(s,1,'dm07-036'),enemy=put(s,0,N);give(s,0,'mana',[D]);put(s,0,B);s.active=1;s.phase='attack';assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.target===enemy.uid));start(s,1,x);assert.equal(blocks(s).length,0);
});
test('guardman can redirect a creature attack even when it cannot be blocked',()=>{
 const guard=data.cards.find(c=>c.guardman&&c.type==='creature'&&!c.evolution);assert.ok(guard);const s=setup(),x=body(s,0,'dm07-036'),target=put(s,1,N),g=put(s,1,guard.id);target.tapped=true;give(s,1,'mana',[D]);start(s,0,x,target.uid);assert.equal(blocks(s).length,0);assert.ok(e.getLegalActions(s).some(a=>a.kind==='guardman'&&a.uid===g.uid));act(s,'guardman',a=>a.uid===g.uid);drain(s);assert.equal(s.winner,null);
});
test('the Tree Folk legacy punctuation aliases to its printed race, without allowing Starlight Trees',()=>{
 const s=setup();give(s,0,'battle',['dm06-104','dmrp14-061']);const c=e.card('dm07-018');assert.equal(c.evolution.race,'ツリーフォーク');assert.deepEqual(e.evolutionBases(s,0,c).map(x=>x.uid),[s.players[0].battle[0].uid]);
});
test('evolution does not inherit the stealth of its source card',()=>{
 const evo=data.cards.find(c=>c.evolution?.civilization==='闇'&&!c.g226Stealth&&!c.exLife&&!c.neoEvolution);assert.ok(evo);const s=setup(),base=body(s,0,'dm07-045');give(s,1,'mana',[N]);give(s,0,'hand',[evo.id]);act(s,'play',a=>a.cardId===evo.id&&!a.alternative);act(s,'evolve',a=>a.baseUid===base.uid);drain(s);assert.equal(e.effectiveCard(s.players[0].battle[0],s).g226Stealth,undefined);
});
test('four evolution bodies retain double breaks and printed attack-only power, while Kaisar still blocks',()=>{
 for(const r of m.cards.filter(r=>r.spec.evolution)){const s=setup(),x=body(s,0,r.id);give(s,1,'mana',[basic[r.spec.g226Stealth]]);start(s,0,x);assert.equal(e.power(x,true,s),e.card(r.id).power+(r.spec.attackBonus||0));act(s,'noBlock');drain(s);assert.equal(s.players[1].shields.length,3);}
 const s=setup(),x=body(s,0,'dm07-006');put(s,1,N);start(s,1,s.players[1].battle[0]);assert.ok(blocks(s).some(a=>a.uid===x.uid));
});
test('CPU recognizes a stealth direct win through a blocker without reading hidden hand or mana identities',()=>{
 const s=setup(),x=body(s,0,'dm07-036');give(s,1,'shields',[]);give(s,1,'mana',[D,W]);s.players[1].mana[1].faceDown=true;put(s,1,B);give(s,1,'hand',[N,F]);s.phase='attack';const a=e.analyzeAI(s);assert.equal(a.action.kind,'attack');assert.equal(a.action.uid,x.uid);assert.equal(a.action.target,'player');s.players[1].hand.forEach(x=>x.cardId=GEN);s.players[1].mana[1].cardId=GEN;assert.deepEqual(e.analyzeAI(s),a);
});
for(const first of [0,1])test('CPU forty-card match completes with eighty identities and JSON continuation '+first,()=>{
 let s=e.createGame([STANDARD226_DECK,PRESETS[first]],{seed:22601+first,first}),saved=false;const before=ids(s);
 while(s.winner===null&&s.actions<2200&&s.turn<160){e.step(s,e.chooseAI(s));assert.deepEqual(ids(s),before);if(!saved&&s.actions>20){s=JSON.parse(JSON.stringify(s));saved=true;}}
 assert.ok(saved);assert.notEqual(s.winner,null);assert.equal(before.length,80);
});
