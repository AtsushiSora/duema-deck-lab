import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain,PRESETS} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {STANDARD225_DECK} from '../tools/fixtures/standard225.mjs';
const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-225.json',import.meta.url)));
const OTO='dmrp22-068',GIGA='dm05-045',GOO='dmr16g-025',JEE='promoy23-spd1102',FUKU='dmex14-096',PRE='dm24rp4-061',GO='dm25rp4-046',VASH='dm05-012',KERO='dm23ex3-068';
const N='dm01-108',F='dm01-097',SEED='dmsd20-016',ACE='dm22rp2-S8',SCORP='dm22rp1-8A',BIG='dm10-006',EVO='dm02-s05',SPELL='dm01-086',TWIN='dmex12-074',GEN='dmrp15-km1';
const put=(s,p,id)=>{const x=inst(id);s.players[p].battle.push(x);return x;};
const ids=s=>e.physicalCards(s).map(x=>x.uid).sort();
const attackable=(s,x)=>e.canCreatureAttack(s,s.players.findIndex(p=>p.battle.some(y=>y.uid===x.uid)),x);
const attacks=(s,x)=>e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===x.uid);
function enable(s,id){switch(id){case OTO:put(s,0,SEED);break;case GOO:give(s,0,'grave',Array(5).fill(N));break;case JEE:for(let i=0;i<3;i++)put(s,0,N).tapped=true;break;case PRE:put(s,0,BIG);break;case GO:put(s,0,EVO).under=[inst(N)];break;case KERO:give(s,0,'mana',[N,N,F]);s.players[0].mana.slice(0,2).forEach(x=>x.faceDown=true);break;}}

test('nine fully verified cards, official images, original forty-card fixture and no GR enablement',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);assert.equal(m.cards.length,9);
 for(const r of m.cards){assert.deepEqual(r.faces,details.cards.find(c=>c.id===r.id).faces);assert.deepEqual(standardCardSpec(details.cards.find(c=>c.id===r.id),{phase:225}),r.spec);assert.ok(r.verification.facesMatched);assert.match(r.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(e.card(r.id).manaValue,1);assert.equal(e.card(r.id).limit,m.regulationVerification.limits[r.id]);assert.ok(registry.get(r.id).supported);assert.equal(CARD_IMAGES[r.id],r.image);}
 assert.deepEqual(e.validateDeck(STANDARD225_DECK),[]);assert.equal(registry.coverage(STANDARD225_DECK).unsupported,0);assert.equal(STANDARD225_DECK.cards.reduce((n,r)=>n+r.count,0),40);assert.equal(registry.get('dmrp12-018').supported,false);
});
test('complete conditions are phase gated, reject extra clauses and preserve pinned earlier manifests',()=>{
 for(const r of m.cards){const d=structuredClone(details.cards.find(c=>c.id===r.id));assert.throws(()=>standardCardSpec(d,{phase:224}));d.faces[0].abilityText+='\n未確認の能力';assert.throws(()=>standardCardSpec(d,{phase:225}));}
 for(let phase=168;phase<=224;phase++){if([202,213].includes(phase))continue;for(const r of JSON.parse(fs.readFileSync(new URL('../tools/support-phase-'+phase+'.json',import.meta.url))).cards)assert.deepEqual(standardCardSpec(details.cards.find(c=>c.id===r.id),{phase}),r.spec);}
});
for(const r of m.cards)test(r.name+' paid execution preserves identities and saved continuation',()=>{
 let s=setup();give(s,0,'hand',[r.id]);const uid=s.players[0].hand[0].uid,before=ids(s);act(s,'play');drain(s);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,e.card(r.id).cost);assert.equal(s.players[0].battle[0].uid,uid);assert.equal(s.decision,null);s=JSON.parse(JSON.stringify(s));assert.deepEqual(ids(s),before);assert.equal(e.power(s.players[0].battle[0],false,s),Number(r.faces[0].powerText));
});
test('Otodoke requires an owned battle seed; dual seed creatures count in dormant, active and ignored forms',()=>{
 const s=setup(),x=put(s,0,OTO);assert.equal(attackable(s,x),false);put(s,1,SEED);assert.equal(attackable(s,x),false);give(s,0,'hand',[SEED]);assert.equal(attackable(s,x),false);
 const seed=put(s,0,SEED);assert.equal(attackable(s,x),true);seed.sealed=true;assert.equal(attackable(s,x),false);s.players[0].battle.pop();
 for(const id of [ACE,SCORP]){const t=setup(),o=put(t,0,OTO),a=put(t,0,id);give(t,0,'mana',[]);assert.equal(attackable(t,o),true);a.g35Ignored=t.turn;assert.equal(attackable(t,o),true);delete a.g35Ignored;give(t,0,'battle',[OTO,id,N,N,N]);assert.equal(attackable(t,t.players[0].battle[0]),true);}
});
test('five grave creatures counts twin creature faces once and excludes spells, seeds and opponent grave',()=>{
 const s=setup(),x=put(s,0,GOO);give(s,1,'grave',Array(8).fill(N));give(s,0,'grave',[N,N,N,TWIN,SPELL,SEED]);assert.equal(attackable(s,x),false);s.players[0].grave.push(inst(TWIN));assert.equal(attackable(s,x),true);s.players[0].hand.push(s.players[0].grave.pop());assert.equal(attackable(s,x),false);
});
test('Plaisir requires an unsealed current creature of cost six or more, not a high-cost seed or buried body',()=>{
 const s=setup(),x=put(s,0,PRE);put(s,1,BIG);give(s,0,'hand',[BIG]);assert.equal(attackable(s,x),false);const a=put(s,0,ACE);give(s,0,'mana',[]);assert.equal(attackable(s,x),false);s.players[0].battle.pop();const y=put(s,0,F);y.under=[inst(BIG)];assert.equal(attackable(s,x),false);const big=put(s,0,BIG);assert.equal(attackable(s,x),true);big.sealed=true;assert.equal(attackable(s,x),false);big.sealed=false;big.g35Ignored=s.turn;assert.equal(attackable(s,x),true);assert.ok(a);
});
test('tapped-creature threshold is two versus three, excludes seeds, seals and underlying cards',()=>{
 const s=setup(),x=put(s,0,JEE),a=put(s,0,N),b=put(s,0,N);a.tapped=b.tapped=true;a.under=[inst(N),inst(N)];put(s,0,SEED).tapped=true;put(s,1,N).tapped=true;assert.equal(attackable(s,x),false);const c=put(s,0,N);c.tapped=true;assert.equal(attackable(s,x),true);c.sealed=true;assert.equal(attackable(s,x),false);c.sealed=false;c.tapped=false;assert.equal(attackable(s,x),false);
});
test('Fuku reacts to any tapped mana including facedown mana; casting itself can make the condition fail',()=>{
 const s=setup(),x=put(s,0,FUKU);give(s,0,'mana',[]);assert.equal(attackable(s,x),true);give(s,0,'mana',[N]);const mana=s.players[0].mana[0];mana.tapped=true;assert.equal(attackable(s,x),false);mana.faceDown=true;assert.equal(attackable(s,x),false);mana.tapped=false;assert.equal(attackable(s,x),true);
 const t=setup();give(t,0,'mana',[F]);give(t,0,'hand',[FUKU]);act(t,'play');assert.equal(t.players[0].mana[0].tapped,true);t.players[0].battle[0].entered=0;assert.equal(attackable(t,t.players[0].battle[0]),false);
});
for(const id of [GIGA,VASH])test(e.card(id).name+' can attack with one enemy shield but never attack any target after the last shield is gone',()=>{
 const s=setup(),x=put(s,0,id),enemy=put(s,1,N);enemy.tapped=true;s.phase='attack';give(s,1,'shields',[N]);assert.ok(attacks(s,x).some(a=>a.target===enemy.uid));give(s,1,'shields',[]);assert.equal(attackable(s,x),false);assert.equal(attacks(s,x).length,0);
});
test('GO-GEKI recognizes normal, NEO and ignored evolution bodies but not another zone or an unevolved NEO',()=>{
 const s=setup(),x=put(s,0,GO);give(s,0,'hand',[EVO]);put(s,1,EVO).under=[inst(N)];assert.equal(attackable(s,x),false);const evo=put(s,0,EVO);evo.under=[inst(N)];evo.g35Ignored=s.turn;assert.equal(attackable(s,x),true);evo.sealed=true;assert.equal(attackable(s,x),false);
 const neo=data.cards.find(c=>c.neoEvolution&&!c.evolution&&!c.g31Evolution);assert.ok(neo);s.players[0].battle.pop();const y=put(s,0,neo.id);assert.equal(attackable(s,x),false);y.under=[inst(N)];assert.equal(attackable(s,x),true);
});
test('Kero needs two owned facedown mana; tapping does not affect the count and speed bypasses only sickness',()=>{
 const s=setup();give(s,0,'mana',[F,N,N]);s.players[0].mana[1].faceDown=true;s.players[0].mana[2].faceDown=true;give(s,0,'hand',[KERO]);act(s,'play');const x=s.players[0].battle[0];assert.equal(x.entered,s.turn);assert.equal(attackable(s,x),true);s.players[0].mana[1].tapped=true;assert.equal(attackable(s,x),true);s.players[0].mana[1].faceDown=false;assert.equal(attackable(s,x),false);give(s,1,'mana',[N,N]);s.players[1].mana.forEach(y=>y.faceDown=true);assert.equal(attackable(s,x),false);
});
test('ability ignore removes the attack restriction, while summon sickness, taps and G-strike remain',()=>{
 const s=setup(),x=put(s,0,OTO);s.phase='attack';assert.equal(attackable(s,x),false);x.g35Ignored=s.turn;assert.equal(attackable(s,x),true);x.tapped=true;assert.equal(attackable(s,x),false);x.tapped=false;x.entered=s.turn;assert.equal(attackable(s,x),false);x.entered=0;s.extLimits=[{kind:'attack',reason:'gStrike',player:0,uid:x.uid,incarnation:x.incarnation||0,expires:'end',who:0}];assert.equal(attackable(s,x),false);
 const t=setup(),o=put(t,0,OTO);put(t,1,GEN);assert.equal(attackable(t,o),true);
});
test('conditions do not become attack requirements for blocking and do not force attacks when global obligation is impossible',()=>{
 const s=setup(),x=put(s,0,OTO);put(s,1,'dmrp13-039');s.phase='attack';assert.equal(attacks(s,x).length,0);assert.ok(e.getLegalActions(s).some(a=>a.kind==='endTurn'));
 const t=setup(),y=put(t,0,OTO);put(t,0,'dmrp17-007');t.active=1;t.phase='attack';const a=put(t,1,N);act(t,'attack',a=>a.uid===t.players[1].battle[0].uid&&a.target==='player');assert.ok(e.getLegalActions(t).some(a=>a.kind==='block'&&a.uid===y.uid));assert.ok(a);
});
test('dropping below a condition after attack declaration does not cancel an already declared attack',()=>{
 const s=setup(),x=put(s,0,GOO);give(s,0,'grave',Array(5).fill(N));s.phase='attack';act(s,'attack',a=>a.uid===x.uid&&a.target==='player');s.players[0].hand.push(s.players[0].grave.pop());act(s,'noBlock');drain(s);assert.equal(s.players[1].shields.length,4);
});
for(const [id,count] of [[JEE,2],[GO,3],[VASH,2]])test(e.card(id).name+' retains its printed shield-break count',()=>{
 const s=setup(),x=put(s,0,id);enable(s,id);s.phase='attack';act(s,'attack',a=>a.uid===x.uid&&a.target==='player');act(s,'noBlock');drain(s);assert.equal(s.players[1].shields.length,5-count);
});
test('CPU sees only legal conditional attacks and never inspects opposing hand identities',()=>{
 const s=setup(),x=put(s,0,OTO);s.phase='attack';assert.equal(e.analyzeAI(s).action.kind,'endTurn');put(s,0,SEED);give(s,1,'hand',[N,F]);const a=e.analyzeAI(s);assert.equal(a.action.kind,'attack');s.players[1].hand.forEach(x=>x.cardId=GEN);assert.deepEqual(e.analyzeAI(s),a);assert.ok(attacks(s,x).length);
});
for(const first of [0,1])test('CPU forty-card match completes with eighty identities and JSON continuation '+first,()=>{
 let s=e.createGame([STANDARD225_DECK,PRESETS[first]],{seed:22501+first,first}),saved=false;const before=ids(s);
 while(s.winner===null&&s.actions<2200&&s.turn<160){e.step(s,e.chooseAI(s));assert.deepEqual(ids(s),before);if(!saved&&s.actions>20){s=JSON.parse(JSON.stringify(s));saved=true;}}
 assert.ok(saved);assert.notEqual(s.winner,null);assert.equal(before.length,80);
});
