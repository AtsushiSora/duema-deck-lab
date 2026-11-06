import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,GEN,GG,PRESETS} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';import {scanStandardCandidates} from '../tools/scan-standard-candidates.mjs';import {createCatalogue} from '../dist/catalogue.js';import {CARD_IMAGES} from '../dist/card-images.js';import {STANDARD498_DECKS} from '../tools/fixtures/standard498.mjs';
const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-498.json',import.meta.url))),rows=m.cards;
const N='dm01-108',F='dm01-097',W='dm01-083',L='dm01-075',D='dm01-090',HIGH='dmrp03-087',FIREVO='dm02-s04',NATEVO='dm02-s05',NEO='dm25rp4-DM1',TWIN='dmrp06-s09',DIA='dmrp22-027',X='dmr17-029',MERA='dmr17-082',VOY='dm17-022',JANGA='dm24-097',MAMMO='dm24-076';
const pairs=rows.filter(r=>r.spec.g349SummonAuras[0].filter.any),colorIds={'自然':N,'火':F,'水':W,'光':L,'闇':D};
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort(),put=(s,p,id)=>{const x=inst(id);s.players[p].battle.push(x);return x;},cost=(s,p,id)=>e.summonCost(s,p,e.card(id));
function finish(s){for(let n=0;s.decision&&s.winner===null;n++){assert.ok(n<650,JSON.stringify(s.decision));if(s.decision.type==='block')act(s,'noBlock');else e.step(s,e.chooseAI(s));}}
function play(s,id){const x=inst(id);s.players[s.active].hand.push(x);act(s,'play',a=>a.uid===x.uid&&!a.alternative);return x;}
const target=r=>r.id===VOY?FIREVO:r.id===MERA?FIREVO:r.id===X?HIGH:colorIds[r.spec.g349SummonAuras[0].filter.any[0].color];
for(const r of rows)test(r.name+' has complete verified official text, mana, art, limits and a strict compilation boundary',()=>{
 const d=details.cards.find(c=>c.id===r.id),before=JSON.stringify(d),c=e.card(r.id);assert.deepEqual(r.faces,d.faces);assert.deepEqual(standardCardSpec(d,{phase:498}),r.spec);assert.throws(()=>standardCardSpec(d,{phase:497}));assert.equal(JSON.stringify(d),before);for(const[k,v]of Object.entries(r.spec))assert.deepEqual(c[k],v);assert.equal(c.cost,d.faces[0].cost);assert.equal(c.power,parseInt(d.faces[0].powerText));assert.equal(c.manaValue,1);assert.equal(c.limit,m.regulationVerification.limits[r.id]);assert.ok(r.verification.facesMatched);assert.match(r.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(CARD_IMAGES[r.id],r.image);
 const bad=structuredClone(d);bad.faces[0].abilityText+='\n未実装の追加能力。';assert.throws(()=>standardCardSpec(bad,{phase:498}));
});
test('both legal forties cover every new card and compiler discovery has no unverified leftovers',()=>{
 const cat=createCatalogue(snapshot,data.cards,details);assert.equal(rows.length,8);for(const d of STANDARD498_DECKS){assert.deepEqual(e.validateDeck(d),[]);assert.equal(cat.coverage(d).unsupported,0);assert.equal(d.cards.reduce((n,r)=>n+r.count,0),40);}for(const r of rows)assert.ok(STANDARD498_DECKS.some(d=>d.cards.some(c=>c.id===r.id)));const scan=scanStandardCandidates(details.cards,data.cards,{phase:498});assert.deepEqual(scan.candidates,[]);assert.deepEqual(scan.blocked,[]);
});
for(const r of pairs)for(const p of[0,1])test(r.name+' reduces either printed civilization once, not twice for a matching multicolor creature '+p,()=>{
 const s=setup();put(s,p,r.id);const cols=r.spec.g349SummonAuras[0].filter.any.map(f=>f.color);
 for(const[color,id]of Object.entries(colorIds)){assert.equal(cost(s,p,id),e.card(id).cost-(cols.includes(color)?1:0));assert.equal(cost(s,1-p,id),e.card(id).cost);}
 const c={...e.card(N),cost:7,civilizations:cols,civ:cols.join('/')};assert.equal(e.summonCost(s,p,c),6);assert.equal(e.summonCost(s,p,{...c,type:'spell'}),7);
});
for(const p of[0,1])test('X-girls combines nature and printed power 6000 inclusively, excluding combat boosts and noncreature faces '+p,()=>{
 const s=setup();put(s,p,X);for(const power of[5999,6000,6001,'∞']){const c={...e.card(HIGH),power};assert.equal(e.summonCost(s,p,c),9-(power==='∞'||power>=6000?2:0));}
 assert.equal(cost(s,p,N),2);assert.equal(cost(s,p,'dm01-s08'),7);assert.equal(cost(s,1-p,HIGH),9);assert.equal(e.summonCost(s,p,{...e.card(N),attackBonus:12000}),2);assert.equal(cost(s,p,TWIN),5);assert.equal(e.summonCost(s,p,e.card(TWIN).spellFace),6);
});
for(const p of[0,1])test('Meracchi reduces fire evolution summons only; Voyager helps both players with any evolution '+p,()=>{
 const s=setup();put(s,p,MERA);assert.equal(cost(s,p,FIREVO),2);assert.equal(cost(s,p,NATEVO),6);assert.equal(cost(s,p,F),2);assert.equal(cost(s,1-p,FIREVO),4);put(s,1-p,VOY);assert.equal(cost(s,p,FIREVO),1);assert.equal(cost(s,p,NATEVO),4);assert.equal(cost(s,1-p,FIREVO),2);assert.equal(cost(s,p,F),2);
});
for(const id of[MERA,VOY])test(e.card(id).name+' distinguishes NEO evolution on a legal base from unevolved NEO summoning',()=>{
 const s=setup();put(s,0,id);const base=put(s,0,F),c=e.card(NEO);assert.equal(e.summonCost(s,0,{...c,g27BaseUid:null}),8);assert.equal(e.summonCost(s,0,{...c,g27BaseUid:base.uid}),6);assert.equal(cost(s,0,NEO),8);
});
for(const r of rows)test(r.name+' has no continuous effect in hand, grave, mana, beneath an evolution, sealed, ignored or after leaving',()=>{
 for(const mode of['hand','grave','mana','under','sealed','ignored','left']){const s=setup(),id=target(r);if(['hand','grave','mana'].includes(mode))s.players[0][mode].push(inst(r.id));else if(mode==='under')put(s,0,N).under=[inst(r.id)];else{const x=put(s,0,r.id);if(mode==='sealed'){x.sealed=true;s.players[0].seals.push({...inst(N),faceDown:true,sealOf:x.uid});}else if(mode==='ignored')x.g35Ignored=s.turn;else{s.players[0].battle=[];s.players[0].hand.push(x);}}assert.equal(cost(s,0,id),e.card(id).cost);assert.equal(cost(s,1,id),e.card(id).cost);}
});
for(const r of rows)test(r.name+' aura is ignored by Genmu, remains live under GG, and cannot bypass the reduction lock',()=>{
 for(const lock of[GEN,GG,DIA]){const s=setup(),id=target(r);put(s,0,r.id);put(s,1,lock).under=lock===GG?[inst(N)]:undefined;const amount=r.spec.g349SummonAuras[0].amount;assert.equal(cost(s,0,id),Math.max(1,e.card(id).cost-(lock===GG?amount:0)));}
});
for(const r of rows)test(r.name+' is paid before its own aura enters and never activates the continuous ability as an entry trigger',()=>{
 const s=setup(),x=play(s,r.id);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,e.card(r.id).cost);assert.equal(s.decision,null);assert.ok(s.players[0].battle.includes(x));const amount=r.spec.g349SummonAuras[0].amount;assert.equal(cost(s,0,target(r)),Math.max(1,e.card(target(r)).cost-amount));
});
test('multiple matching sources stack while one-mana floors, printed costs and civilization payments remain intact',()=>{
 const s=setup();put(s,0,'dm24-091');put(s,0,'dm24-091');assert.equal(cost(s,0,F),1);assert.equal(e.card(F).cost,2);give(s,0,'hand',[F]);give(s,0,'mana',[N,N,N]);assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'));s.players[0].mana.push(inst(F));const x=s.players[0].hand[0],before=physical(s);act(s,'play',a=>a.uid===x.uid);finish(s);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,1);assert.deepEqual(physical(s),before);
});
test('discounted evolution still requires a legal base and conserves both physical cards through JSON save/resume',()=>{
 let s=setup();put(s,0,MERA);give(s,0,'hand',[FIREVO]);give(s,0,'mana',[F,F]);assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'));const base=put(s,0,F),x=s.players[0].hand[0],before=physical(s);const a=e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===x.uid);assert.equal(a.cost,2);e.step(s,a);s=JSON.parse(JSON.stringify(s));finish(s);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,2);assert.ok(s.players[0].battle.find(y=>y.uid===x.uid).under.some(y=>y.uid===base.uid));assert.deepEqual(physical(s),before);
});
test('Meracchi may be used as its evolution base while still applying its discount before replacement',()=>{
 const s=setup();put(s,0,MERA);give(s,0,'hand',[NEO]);give(s,0,'mana',Array(2).fill(L).concat(Array(2).fill(F),Array(2).fill(N)));const base=s.players[0].battle[0],x=s.players[0].hand[0];act(s,'play',a=>a.uid===x.uid&&!a.alternative);act(s,'evolve',a=>a.baseUid===base.uid);finish(s);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,6);assert.ok(s.players[0].battle.find(y=>y.uid===x.uid).under.some(y=>y.uid===base.uid));assert.equal(cost(s,0,FIREVO),4);
});
test('Mammo retains blocker and its restriction on attacking players while allowing creature attacks',()=>{
 const s=setup(),x=put(s,0,MAMMO),enemy=put(s,1,F);enemy.tapped=true;s.phase='attack';assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target==='player'));assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target===enemy.uid));s.active=1;s.phase='attack';enemy.tapped=false;act(s,'attack',a=>a.uid===enemy.uid&&a.target==='player');assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===x.uid));
});
test('Jangar retains its printed attack bonus and Meracchi survives lethal creature battle',()=>{
 const s=setup(),j=put(s,0,JANGA),mer=put(s,0,MERA),enemy=put(s,1,'dm01-s08');enemy.tapped=true;assert.equal(e.power(j,false,s),e.card(JANGA).power);assert.equal(e.power(j,true,s),e.card(JANGA).power+2000);s.phase='attack';act(s,'attack',a=>a.uid===mer.uid&&a.target===enemy.uid);finish(s);assert.ok(s.players[0].battle.includes(mer));assert.ok(s.players[1].battle.includes(enemy));
});
for(const r of rows)test(r.name+' charges for its verified printed mana and civilization orientation',()=>{const s=setup();s.phase='charge';give(s,0,'hand',[r.id]);const x=s.players[0].hand[0];act(s,'charge',a=>a.uid===x.uid);assert.ok(s.players[0].mana.includes(x));assert.equal(x.tapped,r.faces[0].civilizations.length>1);});
test('CPU sees discounted legal actions, preserves the position, and ignores enemy hidden identities',()=>{
 const s=setup();put(s,0,MERA);put(s,0,F);give(s,0,'hand',[FIREVO]);give(s,0,'mana',[F,F]);const before=JSON.stringify(s),a=e.chooseAI(s),rank=e.analyzeAI(s);assert.equal(a.kind,'play');assert.equal(a.cost,2);assert.equal(JSON.stringify(s),before);for(const z of['hand','deck','shields'])s.players[1][z].forEach(x=>x.cardId=GEN);assert.deepEqual(e.chooseAI(s),a);assert.deepEqual(e.analyzeAI(s),rank);
});
for(const first of[0,1])test('legal forty CPU game finishes and conserves all eighty physical cards through saving '+first,()=>{
 let s=e.createGame([STANDARD498_DECKS[first],PRESETS[first]],{seed:49801+first,first}),saved=false;const before=physical(s);while(s.winner===null&&s.actions<2400&&s.turn<160){e.step(s,e.chooseAI(s));assert.deepEqual(physical(s),before);assert.equal(new Set(physical(s)).size,80);if(!saved&&s.actions>20){s=JSON.parse(JSON.stringify(s));saved=true;}}assert.ok(saved);assert.notEqual(s.winner,null);
});
