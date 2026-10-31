import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain,PRESETS} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {STANDARD224_DECK} from '../tools/fixtures/standard224.mjs';
const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-224.json',import.meta.url)));
const N='dm01-108',F='dm01-097',BLOCK='dm01-076',HIGH='dm10-006',GEN='dmrp15-km1';
const global=m.cards.filter(r=>r.spec.g224ForceAttack.owner==='both').map(r=>r.id);
const conditional=m.cards.filter(r=>r.spec.g224ForceAttack.owner==='opponent').map(r=>r.id);
const put=(s,p,id)=>{const x=inst(id);s.players[p].battle.push(x);return x;};
const ids=s=>e.physicalCards(s).map(x=>x.uid).sort();
const forced=(s,x)=>!!e.effectiveCard(x,s).mustAttack;
const canEnd=s=>e.getLegalActions(s).some(a=>a.kind==='endTurn');
const end=(s)=>{s.phase='attack';act(s,'endTurn');drain(s);};

test('seven official complete definitions, printed mana, art and a legal forty-card list',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);assert.equal(m.cards.length,7);
 for(const r of m.cards){assert.deepEqual(r.faces,details.cards.find(c=>c.id===r.id).faces);assert.deepEqual(standardCardSpec(details.cards.find(c=>c.id===r.id),{phase:224}),r.spec);assert.ok(r.verification.facesMatched);assert.match(r.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(e.card(r.id).manaValue,1);assert.equal(e.card(r.id).limit,m.regulationVerification.limits[r.id]);assert.ok(registry.get(r.id).supported);assert.equal(CARD_IMAGES[r.id],r.image);}
 assert.deepEqual(e.validateDeck(STANDARD224_DECK),[]);assert.equal(registry.coverage(STANDARD224_DECK).unsupported,0);assert.equal(STANDARD224_DECK.cards.reduce((n,r)=>n+r.count,0),40);
});
test('new full clauses reject unknown additions and remain gated from older pinned phases',()=>{
 for(const r of m.cards){const d=structuredClone(details.cards.find(c=>c.id===r.id));assert.throws(()=>standardCardSpec(d,{phase:223}));d.faces[0].abilityText+='\n未確認の能力';assert.throws(()=>standardCardSpec(d,{phase:224}));}
 for(let phase=168;phase<=223;phase++){if([202,213].includes(phase))continue;for(const r of JSON.parse(fs.readFileSync(new URL('../tools/support-phase-'+phase+'.json',import.meta.url))).cards)assert.deepEqual(standardCardSpec(details.cards.find(c=>c.id===r.id),{phase}),r.spec);}
});
for(const r of m.cards)test(r.name+' is paid, enters once, preserves printed power and survives JSON continuation',()=>{
 let s=setup();give(s,0,'hand',[r.id]);const uid=s.players[0].hand[0].uid,before=ids(s);act(s,'play');drain(s);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,e.card(r.id).cost);assert.equal(s.players[0].battle[0].uid,uid);assert.equal(e.power(s.players[0].battle[0],false,s),Number(r.faces[0].powerText));assert.equal(s.decision,null);s=JSON.parse(JSON.stringify(s));assert.deepEqual(ids(s),before);assert.ok(e.getLegalActions(s).length);
});
for(const id of global)test(e.card(id).name+' continuously obliges both players and itself, regardless of source tap state',()=>{
 for(const p of [0,1]){const s=setup(),source=put(s,0,id),own=put(s,p,N),enemy=put(s,1-p,F);s.active=p;s.phase='attack';assert.ok(forced(s,source));assert.ok(forced(s,own));assert.ok(forced(s,enemy));assert.equal(canEnd(s),false);source.tapped=true;assert.ok(forced(s,own));for(const x of s.players[p].battle)x.tapped=true;assert.equal(canEnd(s),true);}
});
for(const id of conditional)test(e.card(id).name+' only obliges its opponents while tapped during their turn',()=>{
 const s=setup(),source=put(s,0,id),own=put(s,0,N),enemy=put(s,1,F);s.phase='attack';source.tapped=true;
 assert.equal(forced(s,own),false);assert.equal(forced(s,enemy),false);assert.equal(forced(s,source),false);
 s.active=1;assert.ok(forced(s,enemy));assert.equal(forced(s,own),false);assert.equal(canEnd(s),false);
 source.tapped=false;assert.equal(forced(s,enemy),false);assert.equal(canEnd(s),true);source.tapped=true;enemy.tapped=true;assert.equal(canEnd(s),true);
});
test('having an obligation never creates an illegal attack through summoning sickness, attack locks or no-attack text',()=>{
 const s=setup(),source=put(s,1,global[0]),x=put(s,0,N);s.phase='attack';x.entered=s.turn;assert.ok(forced(s,x));assert.equal(canEnd(s),true);
 x.entered=0;x.g35Ignored=s.turn;assert.equal(forced(s,x),false);delete x.g35Ignored;
 s.extLimits=[{kind:'attack',reason:'gStrike',player:0,uid:x.uid,incarnation:x.incarnation||0,expires:'end',who:0}];assert.equal(canEnd(s),true);assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'));assert.ok(source);
 const t=setup();put(t,1,global[0]);const guard=put(t,0,BLOCK);t.phase='attack';assert.ok(forced(t,guard));assert.ok(!e.getLegalActions(t).some(a=>a.kind==='attack'));assert.equal(canEnd(t),true);
});
test('only top, active battle creatures supply the obligation; other zones and buried cards do not',()=>{
 for(const zone of ['hand','mana','grave']){const s=setup(),x=put(s,0,N);give(s,1,zone,[global[0]]);assert.equal(forced(s,x),false);}
 const s=setup(),x=put(s,0,N),source=put(s,1,F);source.under=[inst(global[0])];assert.equal(forced(s,x),false);
 source.under=[];source.cardId=global[0];assert.ok(forced(s,x));source.sealed=true;assert.equal(forced(s,x),false);source.sealed=false;source.g35Ignored=s.turn;assert.equal(forced(s,x),false);delete source.g35Ignored;s.players[1].battle=[];assert.equal(forced(s,x),false);
});
test('ignored recipients ignore granted obligations while other creatures remain obliged',()=>{
 const s=setup();put(s,1,'dmr13-029');const x=put(s,0,HIGH),y=put(s,0,F);x.g35Ignored=s.turn;assert.equal(forced(s,x),false);assert.ok(forced(s,y));delete x.g35Ignored;assert.ok(forced(s,x));
 put(s,1,GEN);assert.equal(forced(s,y),false);assert.ok(forced(s,x));
});
test('multiple sources do not expire together; actual source destruction immediately releases the obligation',()=>{
 const s=setup(),source=put(s,1,global[0]);put(s,0,N);give(s,0,'hand',['dm01-027']);act(s,'play');act(s,'effect',a=>a.targets.some(t=>t.uid===source.uid));drain(s);s.phase='attack';assert.equal(forced(s,s.players[0].battle[0]),false);assert.equal(canEnd(s),true);
 const t=setup(),x=put(t,0,N),a=put(t,1,global[0]),b=put(t,1,global[1]);a.g35Ignored=t.turn;assert.ok(forced(t,x));b.g35Ignored=t.turn;assert.equal(forced(t,x),false);
});
test('conditional sources follow actual untapping and controller turn changes rather than leaving a timed flag',()=>{
 const s=setup(),source=put(s,0,conditional[0]),enemy=put(s,1,N);source.tapped=true;s.active=1;s.phase='attack';enemy.tapped=true;assert.ok(forced(s,enemy));end(s);assert.equal(s.active,0);assert.equal(source.tapped,false);assert.equal(forced(s,enemy),false);
});
test('obliged creatures still choose any legal target and normal blocks resolve',()=>{
 const s=setup();put(s,1,global[0]);const x=put(s,0,N),enemy=put(s,1,F);enemy.tapped=true;put(s,1,BLOCK);s.phase='attack';const options=e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===x.uid);assert.ok(options.some(a=>a.target==='player'));assert.ok(options.some(a=>a.target===enemy.uid));act(s,'attack',a=>a.uid===x.uid&&a.target==='player');assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'));act(s,'block');drain(s);assert.equal(s.winner,null);
});
test('Igarus, Bagyaan and Tyrant keep printed attack bonuses and double breaks',()=>{
 for(const [id,bonus,shields] of [['dm19-060',2000,2],['dm19-099',1000,1],['dmr13-029',0,2]]){const s=setup(),x=put(s,0,id);s.phase='attack';act(s,'attack',a=>a.uid===x.uid&&a.target==='player');assert.equal(e.power(x,true,s),e.card(id).power+bonus);act(s,'noBlock');drain(s);assert.equal(s.players[1].shields.length,5-shields);}
});
test('CPU planning is legal under obligations and never reads hidden opposing hand identities',()=>{
 const s=setup();put(s,1,global[0]);put(s,0,N);s.phase='attack';give(s,1,'hand',[N,F]);const before=e.analyzeAI(s);assert.equal(before.action.kind,'attack');s.players[1].hand.forEach(x=>x.cardId=GEN);assert.deepEqual(e.analyzeAI(s),before);assert.ok(e.getLegalActions(s).some(a=>a.id===before.action.id));
});
for(const first of [0,1])test('CPU forty-card match finishes, conserves eighty identities and resumes JSON '+first,()=>{
 let s=e.createGame([STANDARD224_DECK,PRESETS[first]],{seed:22401+first,first}),saved=false;const before=ids(s);
 while(s.winner===null&&s.actions<2200&&s.turn<160){e.step(s,e.chooseAI(s));assert.deepEqual(ids(s),before);if(!saved&&s.actions>20){s=JSON.parse(JSON.stringify(s));saved=true;}}
 assert.ok(saved);assert.notEqual(s.winner,null);assert.equal(before.length,80);
});
