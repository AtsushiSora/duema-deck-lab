import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain,PRESETS} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {STANDARD227_DECK} from '../tools/fixtures/standard227.mjs';
const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-227.json',import.meta.url)));
const DAI='dmr01-079',CHEN='dm38-048',ELI='dm19-048',MAR='dm19-079',CAR='dm05-038';
const N='dm01-108',F='dm01-097',D='dm01-090',H='dm01-075',W='dm01-083',B='dm01-076',SEED='dmsd20-016',XX='dm24rp4-040',GRAND='dm19-084',GEN='dmrp15-km1';
const put=(s,p,id)=>{const x=inst(id);s.players[p].battle.push(x);return x;};
const ids=s=>e.physicalCards(s).map(x=>x.uid).sort();
const blocked=s=>e.getLegalActions(s).filter(a=>a.kind==='block').map(a=>a.uid);
const unblock=(s,x)=>!!e.effectiveCard(x,s).unblockable;
function start(s,p,x,target='player'){s.active=p;s.phase='attack';act(s,'attack',a=>a.uid===x.uid&&a.target===target);for(let i=0;s.decision&&s.decision.type!=='block'&&i<100;i++)e.step(s,e.chooseAI(s));assert.equal(s.decision?.type,'block');}
const setPower=(x,n)=>x.powerModifiers=[{amount:n-e.card(x).power}];

test('five complete official definitions, mana, art and a legal forty-card fixture',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);assert.equal(m.cards.length,5);
 for(const r of m.cards){assert.deepEqual(r.faces,details.cards.find(c=>c.id===r.id).faces);assert.deepEqual(standardCardSpec(details.cards.find(c=>c.id===r.id),{phase:227}),r.spec);assert.ok(r.verification.facesMatched);assert.match(r.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(e.card(r.id).manaValue,1);assert.equal(e.card(r.id).limit,m.regulationVerification.limits[r.id]);assert.equal(CARD_IMAGES[r.id],r.image);assert.ok(registry.get(r.id).supported);}
 assert.deepEqual(e.validateDeck(STANDARD227_DECK),[]);assert.equal(registry.coverage(STANDARD227_DECK).unsupported,0);assert.equal(STANDARD227_DECK.cards.reduce((n,r)=>n+r.count,0),40);
});
test('complete new clauses are phase gated, reject unknown tails and preserve older pinned specs',()=>{
 for(const r of m.cards){const d=structuredClone(details.cards.find(c=>c.id===r.id));assert.throws(()=>standardCardSpec(d,{phase:226}));d.faces[0].abilityText+='\n未確認の能力';assert.throws(()=>standardCardSpec(d,{phase:227}));}
 for(let phase=168;phase<=226;phase++){if([202,213].includes(phase))continue;for(const r of JSON.parse(fs.readFileSync(new URL('../tools/support-phase-'+phase+'.json',import.meta.url))).cards)assert.deepEqual(standardCardSpec(details.cards.find(c=>c.id===r.id),{phase}),r.spec);}
});
for(const r of m.cards)test(r.name+' paid summon and saved continuation preserve physical identities',()=>{
 let s=setup();give(s,0,'hand',[r.id]);const uid=s.players[0].hand[0].uid,before=ids(s);act(s,'play');drain(s);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,e.card(r.id).cost);assert.ok(s.players[0].battle.some(x=>x.uid===uid));assert.equal(s.decision,null);s=JSON.parse(JSON.stringify(s));assert.deepEqual(ids(s),before);
});
test('Daimos grants light OR dark creatures unblockable, including multi-color bodies but not its own water body',()=>{
 const s=setup(),source=put(s,0,DAI),light=put(s,0,H),dark=put(s,0,D),other=put(s,0,N),dual=put(s,0,'dm24ex2-019'),enemy=put(s,1,D);put(s,0,SEED);assert.ok(unblock(s,light));assert.ok(unblock(s,dark));assert.ok(unblock(s,dual));assert.equal(unblock(s,source),false);assert.equal(unblock(s,other),false);assert.equal(unblock(s,enemy),false);
 source.tapped=true;assert.ok(unblock(s,light));const arrival=put(s,0,H);assert.ok(unblock(s,arrival));light.g35Ignored=s.turn;assert.equal(unblock(s,light),false);assert.ok(unblock(s,dark));
});
test('Daimos permits a dark attacker through a blocker and changes immediately when the source leaves',()=>{
 const s=setup(),source=put(s,0,DAI),x=put(s,0,D);put(s,1,B);start(s,0,x);assert.deepEqual(blocked(s),[]);s.players[0].battle=s.players[0].battle.filter(x=>x.uid!==source.uid);assert.equal(blocked(s).length,1);act(s,'noBlock');drain(s);assert.equal(s.players[1].shields.length,4);
});
test('Grand Devil power and unblockable apply together, stack power and exclude Deep Marines and opponents',()=>{
 const s=setup(),source=put(s,0,ELI),x=put(s,0,GRAND),enemy=put(s,1,GRAND),other=put(s,0,D);assert.equal(e.power(x,false,s),e.card(GRAND).power+2000);assert.ok(unblock(s,x));assert.equal(e.power(source,false,s),2000);assert.equal(unblock(s,source),false);assert.equal(unblock(s,enemy),false);assert.equal(unblock(s,other),false);
 const second=put(s,0,ELI);assert.equal(e.power(x,false,s),e.card(GRAND).power+4000);x.g35Ignored=s.turn;assert.equal(e.power(x,false,s),e.card(GRAND).power+4000);assert.equal(unblock(s,x),false);delete x.g35Ignored;source.g35Ignored=s.turn;assert.equal(e.power(x,false,s),e.card(GRAND).power+2000);assert.ok(unblock(s,x));second.sealed=true;assert.equal(e.power(x,false,s),e.card(GRAND).power);assert.equal(unblock(s,x),false);
});
test('Grand Devil aura follows new entries, removal and JSON saves without accumulating stored modifiers',()=>{
 let s=setup();put(s,0,ELI);const x=put(s,0,GRAND),before=ids(s);s=JSON.parse(JSON.stringify(s));const y=s.players[0].battle.find(y=>y.uid===x.uid);assert.equal(e.power(y,false,s),e.card(GRAND).power+2000);assert.equal(y.powerModifiers,undefined);s.players[0].battle[0].g35Ignored=s.turn;assert.equal(e.power(y,false,s),e.card(GRAND).power);assert.deepEqual(ids(s),before);
});
test('XX protection includes Chen itself and new allies, but excludes opponents and non-XX names',()=>{
 const s=setup(),source=put(s,0,CHEN),x=put(s,0,XX),plain=put(s,0,F),enemy=put(s,1,XX);assert.equal(e.effectiveCard(source,s).cannotBeAttacked,true);assert.equal(e.effectiveCard(x,s).cannotBeAttacked,true);assert.equal(!!e.effectiveCard(plain,s).cannotBeAttacked,false);assert.equal(!!e.effectiveCard(enemy,s).cannotBeAttacked,false);
 const named=put(s,0,e.copySource(F,XX)),renamed=put(s,0,e.copySource(XX,F));assert.equal(e.effectiveCard(named,s).cannotBeAttacked,true);assert.equal(!!e.effectiveCard(renamed,s).cannotBeAttacked,false);
});
test('XX protection prevents attacks on tapped allies, not target selection by removal spells or blocking',()=>{
 const s=setup();put(s,0,CHEN);const x=put(s,0,XX),plain=put(s,0,F),a=put(s,1,N);x.tapped=plain.tapped=true;s.active=1;s.phase='attack';assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.target===x.uid));assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.target===plain.uid));s.phase='main';give(s,1,'hand',['dm01-027']);act(s,'play');assert.ok(e.getLegalActions(s).some(a=>a.kind==='effect'&&a.targets.some(t=>t.uid===x.uid)));act(s,'effect',a=>a.targets.some(t=>t.uid===x.uid));drain(s);assert.ok(s.players[0].grave.some(y=>y.uid===x.uid));assert.ok(a);
 const t=setup();put(t,0,CHEN);put(t,0,'dmrp17-007');const xx=put(t,0,XX),attacker=put(t,1,N);start(t,1,attacker);assert.ok(blocked(t).includes(xx.uid));
});
test('XX protection ends when its source is ignored, sealed, moved or underneath another creature',()=>{
 const s=setup(),source=put(s,0,CHEN),x=put(s,0,XX);source.g35Ignored=s.turn;assert.equal(!!e.effectiveCard(x,s).cannotBeAttacked,false);delete source.g35Ignored;source.sealed=true;assert.equal(!!e.effectiveCard(x,s).cannotBeAttacked,false);source.sealed=false;x.g35Ignored=s.turn;assert.equal(!!e.effectiveCard(x,s).cannotBeAttacked,false);delete x.g35Ignored;s.players[0].battle=s.players[0].battle.filter(y=>y.uid!==source.uid);const top=put(s,0,N);top.under=[source];assert.equal(!!e.effectiveCard(x,s).cannotBeAttacked,false);
});
for(const p of [0,1])test('Marcoshas follows the opposing shield count for player '+p,()=>{
 const s=setup(),x=put(s,p,MAR);assert.equal(unblock(s,x),false);give(s,1-p,'shields',[]);assert.ok(unblock(s,x));x.g35Ignored=s.turn;assert.equal(unblock(s,x),false);delete x.g35Ignored;give(s,1-p,'shields',[N]);assert.equal(unblock(s,x),false);
});
test('Marcoshas can make a direct win through blockers at zero shields',()=>{
 const s=setup(),x=put(s,0,MAR);give(s,1,'shields',[]);put(s,1,B);start(s,0,x);assert.deepEqual(blocked(s),[]);act(s,'noBlock');drain(s);assert.equal(s.winner,0);
});
for(const n of [3999,4000,4001])test('Cargo checks current blocker power at the inclusive 4000 boundary: '+n,()=>{
 const s=setup(),x=put(s,0,CAR),b=put(s,1,B);setPower(b,n);start(s,0,x);assert.equal(blocked(s).includes(b.uid),n<4000);
});
test('Cargo ignores attack-only blocker power and reevaluates actual continuous power before declaration',()=>{
 const s=setup(),x=put(s,0,CAR),b=put(s,1,B);b.buff=10000;setPower(b,3000);start(s,0,x);assert.ok(blocked(s).includes(b.uid));setPower(b,4000);assert.ok(!blocked(s).includes(b.uid));setPower(b,3999);assert.ok(blocked(s).includes(b.uid));x.g35Ignored=s.turn;setPower(b,5000);assert.ok(blocked(s).includes(b.uid));
});
test('Cargo does not prevent ordinary attacks against high-power tapped creatures or guardman redirection',()=>{
 const s=setup(),x=put(s,0,CAR),target=put(s,1,N);setPower(target,9000);target.tapped=true;const guard=put(s,1,'dmrp01-027');start(s,0,x,target.uid);assert.ok(e.getLegalActions(s).some(a=>a.kind==='guardman'&&a.uid===guard.uid));act(s,'noBlock');drain(s);assert.ok(s.players[0].grave.some(y=>y.uid===x.uid));
});
test('CPU chooses the visible Marcoshas win without inspecting opposing hidden cards',()=>{
 const s=setup(),x=put(s,0,MAR);give(s,1,'shields',[]);put(s,1,B);give(s,1,'hand',[N,F]);s.phase='attack';const a=e.analyzeAI(s);assert.equal(a.action.kind,'attack');assert.equal(a.action.uid,x.uid);s.players[1].hand.forEach(y=>y.cardId=GEN);assert.deepEqual(e.analyzeAI(s),a);
});
for(const first of [0,1])test('CPU forty-card match completes with eighty identities and JSON continuation '+first,()=>{
 let s=e.createGame([STANDARD227_DECK,PRESETS[first]],{seed:22701+first,first}),saved=false;const before=ids(s);
 while(s.winner===null&&s.actions<2200&&s.turn<160){e.step(s,e.chooseAI(s));assert.deepEqual(ids(s),before);if(!saved&&s.actions>20){s=JSON.parse(JSON.stringify(s));saved=true;}}
 assert.ok(saved);assert.notEqual(s.winner,null);assert.equal(before.length,80);
});
