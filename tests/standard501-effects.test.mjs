import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,GEN,GG,PRESETS} from './target-fixture.mjs';import {standardCardSpec} from '../tools/standard-card-spec.mjs';import {scanStandardCandidates} from '../tools/scan-standard-candidates.mjs';import {createCatalogue} from '../dist/catalogue.js';import {CARD_IMAGES} from '../dist/card-images.js';import {STANDARD501_DECKS} from '../tools/fixtures/standard501.mjs';
const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-501.json',import.meta.url))),rows=m.cards;
const N='dm01-108',F='dm01-097',W='dm01-083',L='dm01-075',CLOCK='dm32-078',SERRA='dmex08-244',TRULIO='dmr19-050',KABUS='dmr17-034',BET='dm09-022',MERIA='dm19-075',ARC='dm19-109',GUARD='dm01-076',EVO='dm02-s05',NEO='dm25rp4-DM1',STEEL='dm24rp2-058',SEED='dmsd20-016',ACE='dm22rp2-S8';
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort(),put=(s,p,id)=>{const x=inst(id);s.players[p].battle.push(x);return x;},pick=(s,v)=>act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===v);
function field(p=0){const s=setup();s.active=p;for(const q of[0,1])give(s,q,'deck',Array(30).fill(N));return s;}
function finish(s){for(let n=0;s.decision&&s.winner===null;n++){assert.ok(n<750,JSON.stringify(s.decision));if(s.decision.type==='block')act(s,'noBlock');else e.step(s,e.chooseAI(s));}}
function play(s,id){const x=inst(id);s.players[s.active].hand.push(x);s.phase='main';act(s,'play',a=>a.uid===x.uid&&!a.alternative);return x;}
function end(s,p=s.active){s.active=p;s.phase='attack';act(s,'endTurn');}
function attack(s,p,x,target='player'){s.active=p;s.phase='attack';act(s,'attack',a=>a.uid===x.uid&&a.target===target);}
function order(s,id){act(s,'orderEffect',a=>a.cardId===id);}
function clock(s,x,draw=false){const card=play(s,CLOCK);assert.equal(s.decision.task.op,'g34_ChooseEndUntap501');pick(s,x.uid);if(e.isEvolution(x))pick(s,draw?true:null);return card;}
for(const r of rows)test(r.name+' has full verified official text, mana, stats, art, restrictions and a strict phase boundary',()=>{
 const d=details.cards.find(c=>c.id===r.id),before=JSON.stringify(d),c=e.card(r.id);assert.deepEqual(r.faces,d.faces);assert.deepEqual(standardCardSpec(d,{phase:501}),r.spec);assert.throws(()=>standardCardSpec(d,{phase:500}));assert.equal(JSON.stringify(d),before);for(const[k,v]of Object.entries(r.spec))assert.deepEqual(c[k],v);assert.equal(c.cost,d.faces[0].cost);assert.equal(c.power,parseInt(d.faces[0].powerText)||0);assert.equal(c.manaValue,1);assert.equal(c.limit,m.regulationVerification.limits[r.id]);assert.ok(r.verification.facesMatched);assert.match(r.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(CARD_IMAGES[r.id],r.image);const bad=structuredClone(d);bad.faces[0].abilityText+='\n未知の追加効果。';assert.throws(()=>standardCardSpec(bad,{phase:501}));
});
test('official Clock-specific rulings are pinned alongside the two complete legal forty-card fixtures',()=>{
 assert.equal(rows.length,6);assert.equal(m.rulingVerifications.length,2);for(const r of m.rulingVerifications){assert.match(r.sha256,/^[a-f0-9]{64}$/);assert.ok(m.rules.includes(r.source));assert.match(r.verifiedText,/唱えた時/);}const cat=createCatalogue(snapshot,data.cards,details);for(const d of STANDARD501_DECKS){assert.deepEqual(e.validateDeck(d),[]);assert.equal(cat.coverage(d).unsupported,0);assert.equal(d.cards.reduce((n,r)=>n+r.count,0),40);for(const r of rows)assert.ok(d.cards.some(c=>c.id===r.id));}const scan=scanStandardCandidates(details.cards,data.cards,{phase:501});assert.deepEqual(scan.candidates,[]);assert.deepEqual(scan.blocked,[]);
});
for(const r of rows.filter(r=>r.id!==CLOCK))test(r.name+' pays once and does not resolve an end ability on entry',()=>{const s=field(),x=play(s,r.id);finish(s);assert.ok(s.players[0].battle.includes(x));assert.equal(s.players[0].hand.length,0);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,e.card(r.id).cost);assert.equal(s.decision,null);});
for(const p of[0,1])for(const total of[1,3,4])test('Trulio counts total actual creatures on both sides at resolution '+p+' '+total,()=>{
 const s=field(p);put(s,p,TRULIO);for(let i=1;i<total;i++)put(s,i%2?p:1-p,N);end(s,p);if(total<=3){assert.equal(s.decision.task.op,'g34_Offer');pick(s,true);}finish(s);assert.equal(s.players[p].hand.length,total<=3?1:0);assert.equal(s.active,1-p);
});
test('Trulio counts ignored creatures but excludes seals, pure tamaseeds and dormant tamaseed creatures',()=>{
 const s=field();put(s,0,TRULIO);put(s,0,SEED);put(s,1,ACE);const sealed=put(s,1,N);sealed.sealed=true;s.players[1].seals.push({...inst(N),faceDown:true,sealOf:sealed.uid});const x=put(s,1,F);x.g35Ignored=s.turn;end(s);pick(s,true);finish(s);assert.equal(s.players[0].hand.length,1);
});
for(const becomesTrue of[false,true])test('Trulio tests its condition when resolved, even if another pending end effect changed the count '+becomesTrue,()=>{
 const s=field();put(s,0,TRULIO);put(s,0,MERIA);put(s,1,N);if(becomesTrue)put(s,1,F);end(s);assert.equal(s.decision.type,'effectOrder');if(becomesTrue){const x=s.players[1].battle.pop();s.players[1].hand.push(x);}else put(s,1,F);order(s,TRULIO);if(becomesTrue){assert.equal(s.decision.task.op,'g34_Offer');pick(s,true);}finish(s);assert.equal(s.players[0].hand.length,becomesTrue?1:0);
});
test('Trulio may decline a draw with one card left to avoid losing',()=>{const s=field();put(s,0,TRULIO);give(s,0,'deck',[N]);end(s);pick(s,null);finish(s);assert.equal(s.winner,null);assert.equal(s.players[0].deck.length,1);});
for(const p of[0,1])test('Kabus untaps only friendly light creatures when the opposing shield count is at most two '+p,()=>{
 for(const n of[1,2,3]){const s=field(p),source=put(s,p,KABUS),light=put(s,p,L),other=put(s,p,F),enemy=put(s,1-p,L);for(const x of[source,light,other,enemy])x.tapped=true;give(s,1-p,'shields',Array(n).fill(N));end(s,p);finish(s);assert.equal(source.tapped,n>2);assert.equal(light.tapped,n>2);assert.ok(other.tapped);/* The next player's ordinary untap is independent of the effect. */assert.equal(s.active,1-p);}
});
for(const becomesTrue of[false,true])test('Kabus shield condition is also evaluated at resolution after pending effects '+becomesTrue,()=>{
 const s=field(),source=put(s,0,KABUS);put(s,0,MERIA);source.tapped=true;give(s,1,'shields',Array(becomesTrue?3:2).fill(N));end(s);assert.equal(s.decision.type,'effectOrder');if(becomesTrue)s.players[1].hand.push(s.players[1].shields.pop());else s.players[1].shields.push(s.players[1].deck.pop());order(s,KABUS);finish(s);assert.equal(source.tapped,!becomesTrue);
});
for(const p of[0,1])for(const id of[GUARD,ARC])test('Meria may untap a Guardian or Arc Seraphim once, without moving any physical card '+p+' '+id,()=>{
 const s=field(p),source=put(s,p,MERIA),target=put(s,p,id),other=put(s,p,F);target.tapped=other.tapped=true;const all=physical(s);end(s,p);assert.equal(s.decision.task.op,'g34_Target');assert.ok(s.decision.choices.some(o=>o.value?.uid===target.uid));assert.ok(!s.decision.choices.some(o=>o.value?.uid===other.uid));pick(s,target.uid);finish(s);assert.ok(!target.tapped&&other.tapped);assert.deepEqual(physical(s),all);assert.ok(source);
});
test('Meria may decline, may select itself, and cannot select a sealed source as another target',()=>{
 for(const chooseSelf of[false,true]){const s=field(),x=put(s,0,MERIA),sealed=put(s,0,GUARD);x.tapped=sealed.tapped=true;sealed.sealed=true;s.players[0].seals.push({...inst(N),faceDown:true,sealOf:sealed.uid});end(s);assert.ok(!s.decision.choices.some(o=>o.value?.uid===sealed.uid));pick(s,chooseSelf?x.uid:null);finish(s);assert.equal(x.tapped,!chooseSelf);}
});
for(const yes of[false,true])for(const p of[0,1])test('Betrare may accept or decline its own end untap '+p+' '+yes,()=>{
 const s=field(p),x=put(s,p,BET);x.tapped=true;end(s,p);assert.equal(s.decision.type,'untap');act(s,'endUntap',a=>a.yes===yes);finish(s);assert.equal(x.tapped,!yes);
});
test('Betrare keeps blocker and cannot attack a player, while Serra untaps compulsorily',()=>{
 const s=field(),b=put(s,0,BET),serra=put(s,0,SERRA),enemy=put(s,1,F);s.phase='attack';assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===b.uid&&a.target==='player'));attack(s,1,enemy);assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===b.uid));act(s,'noBlock');finish(s);serra.tapped=true;end(s,0);finish(s);assert.ok(!serra.tapped);
});
for(const p of[0,1])test('Serra flight prevents nonflying attacks and blocks but permits another flying creature '+p,()=>{
 const s=field(p),serra=put(s,p,SERRA),enemy=put(s,1-p,F),flying=put(s,1-p,SERRA);serra.tapped=true;s.active=1-p;s.phase='attack';assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===enemy.uid&&a.target===serra.uid));assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===flying.uid&&a.target===serra.uid));serra.tapped=false;flying.tapped=true;const groundBlocker=put(s,1-p,'dm01-084');attack(s,p,serra);assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===groundBlocker.uid));finish(s);
});
test('flying blockers can block flying attacks, and Genmu removes Serra flight and native end untap',()=>{
 const s=field(),serra=put(s,0,SERRA),fly=put(s,1,SERRA);attack(s,0,serra);assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===fly.uid));act(s,'noBlock');finish(s);put(s,1,GEN);assert.ok(!e.effectiveCard(serra,s).flying);serra.tapped=true;end(s,0);finish(s);assert.ok(serra.tapped);
});
for(const p of[0,1])for(const yes of[false,true])test('Clock chooses a creature and offers the evolution draw at cast time; untap waits for own turn end '+p+' '+yes,()=>{
 let s=field(p),target=put(s,p,EVO);target.under=[inst(N)];target.tapped=true;const before=s.players[p].deck.length,all=physical(s),spell=clock(s,target,yes);assert.equal(s.players[p].deck.length,before-(yes?1:0));assert.ok(target.tapped);assert.ok(s.players[p].grave.includes(spell));assert.equal(s.g501EndDelays.length,1);s=JSON.parse(JSON.stringify(s));end(s,p);finish(s);assert.ok(!s.players[p].battle.find(y=>y.uid===target.uid).tapped);assert.deepEqual(physical(s),[...all,spell.uid].sort());assert.equal(s.g501EndDelays.length,0);
});
test('Clock chooses its target at cast time, does not draw for an ordinary creature, and does not retarget new creatures at end',()=>{
 const s=field(),target=put(s,0,N),later=inst(F);clock(s,target);assert.equal(s.players[0].hand.length,0);assert.ok(!target.tapped);s.players[0].battle.push(later);target.tapped=later.tapped=true;end(s);finish(s);assert.ok(!target.tapped&&later.tapped);assert.equal(s.players[0].hand.length,0);
});
test('Clock can be cast with no eligible creature, creating neither a delayed untap nor a draw',()=>{const s=field();play(s,CLOCK);finish(s);assert.equal(s.decision,null);assert.equal(s.g501EndDelays?.length||0,0);assert.equal(s.players[0].hand.length,0);});
test('Clock treats unevolved NEO as non-evolution at cast time and keeps that draw decision after later evolution',()=>{
 const s=field(),neo=put(s,0,NEO);clock(s,neo);assert.equal(s.players[0].hand.length,0);neo.under=[inst(N)];neo.tapped=true;end(s);finish(s);assert.ok(!neo.tapped);assert.equal(s.players[0].hand.length,0);
});
test('Clock follows the same creature through later evolution but not a new incarnation or a departed creature',()=>{
 for(const mode of['evolution','new','left']){let s=field(),base=put(s,0,N);clock(s,base);base.tapped=true;if(mode==='evolution'){s.players[0].battle=[];const top=put(s,0,EVO);top.under=[base];top.tapped=true;}else if(mode==='new')base.incarnation=(base.incarnation||0)+1;else{s.players[0].battle=[];s.players[0].hand.push(base);}s=JSON.parse(JSON.stringify(s));end(s);finish(s);if(mode==='evolution')assert.ok(!s.players[0].battle[0].tapped);if(mode==='new')assert.ok(s.players[0].battle[0].tapped);if(mode==='left')assert.equal(s.players[0].hand.length,1);}
});
test('Clock follows an evolution performed through actual paid legal actions and its later attack',()=>{
 const s=field(),base=put(s,0,N);clock(s,base);const evo=play(s,EVO);act(s,'evolve',a=>a.baseUid===base.uid);finish(s);const all=physical(s);assert.ok(evo.under.some(x=>x.uid===base.uid));attack(s,0,evo);finish(s);assert.ok(evo.tapped);end(s);finish(s);assert.ok(!evo.tapped);assert.deepEqual(physical(s),all);
});
test('Clock generated during the other player turn waits for the controller own end and remains serializable',()=>{
 let s=field(),target=put(s,1,N);target.tapped=true;s.extTasks=[{op:'g34_ChooseEndUntap501',p:1,source:CLOCK,evolutionDraw:true}];act(s,'toAttack');pick(s,target.uid);assert.equal(s.g501EndDelays[0].p,1);s=JSON.parse(JSON.stringify(s));end(s,0);finish(s);assert.equal(s.g501EndDelays.length,1);const x=s.players[1].battle.find(y=>y.uid===target.uid);x.tapped=true;end(s,1);finish(s);assert.ok(!x.tapped);assert.equal(s.g501EndDelays.length,0);
});
test('Clock draws even for an untapped evolution and can decline to avoid decking out',()=>{
 const s=field(),target=put(s,0,EVO);target.under=[inst(N)];give(s,0,'deck',[N]);clock(s,target,false);assert.equal(s.winner,null);assert.equal(s.players[0].deck.length,1);end(s);finish(s);assert.equal(s.winner,null);
});
test('Clock delayed untap respects an untap prohibition and fires the normal untap trigger when allowed',()=>{
 for(const locked of[false,true]){const s=field(),x=put(s,0,STEEL);clock(s,x);x.tapped=true;if(locked)x.tapLocks=[0];end(s);finish(s);assert.equal(x.tapped,locked);assert.equal(s.players[0].hand.length,locked?0:1);assert.equal(s.g501EndDelays.length,0);}
});
test('Genmu ignores Clock both before casting and after its delayed effect was created',()=>{
 for(const before of[false,true]){const s=field(),x=put(s,0,N);x.tapped=true;if(before)put(s,1,GEN);play(s,CLOCK);if(!before){pick(s,x.uid);put(s,1,GEN);}finish(s);end(s);finish(s);assert.ok(x.tapped);assert.equal(s.g501EndDelays?.length||0,0);}
});
test('multiple delayed Clocks keep their identity and can resolve after Genmu leaves before their resolution',()=>{
 let s=field(),a=put(s,0,N),b=put(s,0,F);clock(s,a);clock(s,b);const gen=put(s,1,GEN);a.tapped=b.tapped=true;end(s);assert.equal(s.decision.type,'effectOrder');s.players[1].battle.splice(s.players[1].battle.indexOf(gen),1);s.players[1].hand.push(gen);s=JSON.parse(JSON.stringify(s));finish(s);assert.ok(s.players[0].battle.every(x=>!x.tapped));assert.equal(s.g501EndDelays.length,0);
});
for(const id of[TRULIO,KABUS,MERIA,BET])test(e.card(id).name+' end ability does not activate when sealed or ignored, but GG does not suppress an end ability',()=>{
 for(const mode of['sealed','ignored','genmu','gg']){const s=field(),x=put(s,0,id);x.tapped=true;give(s,1,'shields',[N]);if(mode==='sealed'){x.sealed=true;s.players[0].seals.push({...inst(N),faceDown:true,sealOf:x.uid});}else if(mode==='ignored')x.g35Ignored=s.turn;else put(s,1,mode==='genmu'?GEN:GG).under=mode==='gg'?[inst(N)]:undefined;end(s);finish(s);if(mode==='gg'){if(id===TRULIO)assert.equal(s.players[0].hand.length,1);else assert.ok(!x.tapped);}else{assert.equal(s.players[0].hand.length,0);assert.ok(x.tapped);}}
});
for(const r of rows)test(r.name+' charges with its verified mana value and printed civilization orientation',()=>{const s=field();s.phase='charge';give(s,0,'hand',[r.id]);const x=s.players[0].hand[0];act(s,'charge',a=>a.uid===x.uid);assert.ok(s.players[0].mana.includes(x));assert.equal(x.tapped,r.faces[0].civilizations.length>1);});
test('AI selection and deferred public state are pure and independent of hidden opposing card identities',()=>{
 const s=field(),evo=put(s,0,EVO),ordinary=put(s,0,N);evo.under=[inst(N)];play(s,CLOCK);const before=JSON.stringify(s),a=e.chooseAI(s);assert.equal(s.decision.choices[a.choice].value.uid,evo.uid);assert.equal(JSON.stringify(s),before);for(const z of['hand','deck','shields'])s.players[1][z].forEach(x=>x.cardId=GEN);assert.deepEqual(e.chooseAI(s),a);e.step(s,a);pick(s,null);assert.deepEqual(e.observation(s,0).g501EndDelays,s.g501EndDelays);assert.ok(ordinary);
});
test('Clock target scores remain finite and serializable for a creature with infinite printed cost',()=>{
 const s=field(),x=put(s,0,'dm25bd2-007');play(s,CLOCK);assert.ok(s.decision.choices.every(c=>Number.isFinite(c.score)));assert.deepEqual(JSON.parse(JSON.stringify(s.decision.choices)),s.decision.choices);pick(s,x.uid);finish(s);assert.equal(s.g501EndDelays.length,1);
});
for(const first of[0,1])test('legal forty CPU game finishes with eighty physical cards and JSON continuation '+first,()=>{
 let s=e.createGame([STANDARD501_DECKS[first],PRESETS[first]],{seed:50101+first,first}),saved=false;const all=physical(s);while(s.winner===null&&s.actions<2600&&s.turn<160){e.step(s,e.chooseAI(s));assert.deepEqual(physical(s),all);assert.equal(new Set(physical(s)).size,80);if(!saved&&s.actions>20){s=JSON.parse(JSON.stringify(s));saved=true;}}assert.ok(saved);assert.notEqual(s.winner,null);
});
