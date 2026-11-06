import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,GEN,GG,PRESETS} from './target-fixture.mjs';import {standardCardSpec} from '../tools/standard-card-spec.mjs';import {scanStandardCandidates} from '../tools/scan-standard-candidates.mjs';import {createCatalogue} from '../dist/catalogue.js';import {CARD_IMAGES} from '../dist/card-images.js';import {STANDARD499_DECKS} from '../tools/fixtures/standard499.mjs';
const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-499.json',import.meta.url))),rows=m.cards;
const N='dm01-108',F='dm01-097',W='dm01-083',D='dm01-090',ENERGY='dm06-085',TWIN='dm22ex1-030',DARKTWIN='dmrp09-003',SEED='dmsd20-016',LIFE='dm06-110',LOVE='dm02-054',NEN='dm02-020',RAI='dmr19-035',TIGA='dmrp04m-s03',PANDA='dm31-033',ARMA='dmr13-019',BABA='dmrp01-026',DIA='dmrp22-027',GENERIC='dm28-082';
const counters=[RAI,TIGA,PANDA,BABA],physical=s=>e.physicalCards(s).map(x=>x.uid).sort(),put=(s,p,id)=>{const x=inst(id);s.players[p].battle.push(x);return x;},cost=(s,p,id)=>e.summonCost(s,p,e.card(id)),tapped=(s,p)=>s.players[p].mana.filter(x=>x.tapped).length;
const pick=(s,v)=>act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===v),values=s=>s.decision.choices.map(x=>x.value);
function field(p=0){const s=setup();s.active=p;for(const q of[0,1])give(s,q,'deck',Array(30).fill(N));return s;}
function finish(s){for(let n=0;s.decision&&s.winner===null;n++){assert.ok(n<650,JSON.stringify(s.decision));if(s.decision.type==='block')act(s,'noBlock');else e.step(s,e.chooseAI(s));}}
function play(s,id,face=0){const x=inst(id);s.players[s.active].hand.push(x);s.phase='main';act(s,'play',a=>a.uid===x.uid&&!a.alternative&&(a.face||0)===face);return x;}
function draw(s,p,n){const x=put(s,p,N);s.extTasks=[{op:'g34_Sequence',p,source:N,uid:x.uid,incarnation:0,defs:[{op:'Draw',n}]}];s.phase='main';act(s,'toAttack');finish(s);s.phase='main';}
function load(s,p,id,n=3){if(id===TIGA)s.players[p].drawsThisTurn=n;else if(id===RAI)give(s,p,'grave',Array(n).fill(D));else give(s,p,'mana',Array(n).fill(id===PANDA?ENERGY:N).concat(Array(10).fill(id===PANDA?N:LIFE)));}
for(const r of rows)test(r.name+' full official definition, strict compiler boundary, stats, mana, art and restriction',()=>{
 const d=details.cards.find(c=>c.id===r.id),before=JSON.stringify(d),c=e.card(r.id);assert.deepEqual(r.faces,d.faces);assert.deepEqual(standardCardSpec(d,{phase:499}),r.spec);assert.throws(()=>standardCardSpec(d,{phase:498}));assert.equal(JSON.stringify(d),before);for(const[k,v]of Object.entries(r.spec))assert.deepEqual(c[k],v);assert.equal(c.cost,d.faces[0].cost);assert.equal(c.power,parseInt(d.faces[0].powerText));assert.equal(c.manaValue,1);assert.equal(c.limit,m.regulationVerification.limits[r.id]);assert.ok(r.verification.facesMatched);assert.match(r.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(CARD_IMAGES[r.id],r.image);const bad=structuredClone(d);bad.faces[0].abilityText+='\n未対応の追加効果。';assert.throws(()=>standardCardSpec(bad,{phase:499}));
});
test('two legal forties cover all seven cards without unverified candidates',()=>{const cat=createCatalogue(snapshot,data.cards,details);assert.equal(rows.length,7);for(const d of STANDARD499_DECKS){assert.deepEqual(e.validateDeck(d),[]);assert.equal(cat.coverage(d).unsupported,0);assert.equal(d.cards.reduce((n,r)=>n+r.count,0),40);for(const r of rows)assert.ok(d.cards.some(c=>c.id===r.id));}const scan=scanStandardCandidates(details.cards,data.cards,{phase:499});assert.deepEqual(scan.candidates,[]);assert.deepEqual(scan.blocked,[]);});
for(const p of[0,1])test('Raibod counts every dark physical grave card once, including dark spell faces, regardless of type or grave locks '+p,()=>{
 const s=field(p);give(s,p,'grave',[D,ENERGY,DARKTWIN,SEED]);assert.equal(cost(s,p,RAI),4);assert.equal(cost(s,1-p,RAI),6);put(s,1-p,'dmrp22-042');assert.equal(cost(s,p,RAI),4);s.players[p].grave[0].faceDown=true;assert.equal(cost(s,p,RAI),5);give(s,p,'grave',Array(12).fill(D));assert.equal(cost(s,p,RAI),1);assert.equal(e.card(RAI).cost,6);
});
for(const p of[0,1])test('Panda and Babaruga count spell or creature cards in own mana, including a twinpact once '+p,()=>{
 const s=field(p);give(s,1-p,'mana',[]);give(s,p,'mana',[N,ENERGY,TWIN,SEED]);assert.equal(cost(s,p,PANDA),7);assert.equal(cost(s,p,BABA),7);assert.equal(cost(s,1-p,PANDA),9);assert.equal(cost(s,1-p,BABA),9);s.players[p].mana[2].faceDown=true;assert.equal(cost(s,p,PANDA),8);assert.equal(cost(s,p,BABA),8);give(s,p,'grave',Array(10).fill(TWIN));give(s,p,'hand',Array(10).fill(TWIN));put(s,p,N).under=[inst(TWIN)];assert.equal(cost(s,p,PANDA),8);assert.equal(cost(s,p,BABA),8);
});
for(const id of counters)for(const amount of[0,1,3])test(e.card(id).name+' selects an exact optional reduction including zero and pays once '+amount,()=>{
 let s=field();load(s,0,id);if(id===RAI)give(s,0,'mana',Array(10).fill(D));const before=physical(s),x=play(s,id);assert.equal(s.decision.task.op,'g34_PayCount499');assert.equal(s.decision.source,id);assert.ok(values(s).includes(amount));assert.ok(s.players[0].hand.includes(x));assert.equal(tapped(s,0),0);s=JSON.parse(JSON.stringify(s));pick(s,amount);finish(s);assert.equal(tapped(s,0),e.card(id).cost-amount);assert.ok(s.players[0].battle.some(y=>y.uid===x.uid));assert.deepEqual(physical(s),[...before,x.uid].sort());
});
for(const id of counters)test(e.card(id).name+' may cancel optional payment with no mana, zone or card movement',()=>{
 const s=field();load(s,0,id);const x=play(s,id),before=physical(s),mana=s.players[0].mana.map(x=>x.tapped);assert.ok(values(s).includes(false));pick(s,false);finish(s);assert.ok(s.players[0].hand.includes(x));assert.deepEqual(s.players[0].mana.map(x=>x.tapped),mana);assert.deepEqual(physical(s),before);assert.equal(s.metrics[0].played[id]||0,0);
});
test('insufficient mana offers only affordable count reductions, retains civilization requirements and never discounts below one',()=>{
 const s=field();give(s,0,'grave',Array(10).fill(D));give(s,0,'mana',[W]);give(s,0,'hand',[RAI]);assert.equal(cost(s,0,RAI),1);assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'));give(s,0,'mana',[D]);const x=s.players[0].hand[0];act(s,'play',a=>a.uid===x.uid);assert.ok(values(s).filter(x=>typeof x==='number').every(x=>x>=5));pick(s,5);finish(s);assert.equal(tapped(s,0),1);
});
for(const origin of['grave','mana'])test('paid use from '+origin+' excludes the held source from its own count and preserves the physical cards',()=>{
 const provider={id:'test499-origin-provider',name:'使用元検証',type:'creature',civ:'自然',cost:9,power:1000,race:'ビーストフォーク',g450ZoneSummon:{origin,filter:{}}};
 try{e.setCards([...data.cards,provider]);const s=field(),id=origin==='grave'?RAI:BABA;put(s,0,provider.id);give(s,0,'mana',Array(8).fill(origin==='grave'?D:LIFE));give(s,0,origin,[id,origin==='grave'?D:N,...(origin==='mana'?Array(8).fill(LIFE):[])]);const x=s.players[0][origin][0],all=physical(s),a=e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===x.uid&&a.origin===origin);assert.ok(a);assert.equal(a.cost,e.card(id).cost-1);e.step(s,a);assert.deepEqual(values(s),[1,0,false]);pick(s,1);finish(s);assert.ok(s.players[0].battle.some(y=>y.uid===x.uid));assert.deepEqual(physical(s),all);
 }finally{e.setCards(data.cards);}
});
test('Tiga discounts actual draws this turn, not initial hand, shield pickups, searches, or opposing draws',()=>{
 const s=field();assert.equal(cost(s,0,TIGA),7);draw(s,0,2);assert.equal(s.players[0].drawsThisTurn,2);assert.equal(cost(s,0,TIGA),5);draw(s,1,3);assert.equal(cost(s,0,TIGA),5);give(s,0,'hand',Array(10).fill(N));assert.equal(cost(s,0,TIGA),5);
 const attacker=put(s,1,F);s.active=1;s.phase='attack';act(s,'attack',a=>a.uid===attacker.uid&&a.target==='player');act(s,'noBlock');finish(s);assert.equal(s.players[0].drawsThisTurn,2);assert.equal(cost(s,0,TIGA),5);
});
test('ordinary turn drawing counts once and the prior draw history expires at the next turn start for both players',()=>{
 const s=field();draw(s,0,4);draw(s,1,3);s.active=0;s.phase='attack';act(s,'endTurn');finish(s);assert.equal(s.players[0].drawsThisTurn,0);assert.equal(s.players[1].drawsThisTurn,1);assert.equal(cost(s,0,TIGA),7);assert.equal(cost(s,1,TIGA),6);
});
for(const n of[0,1,3])test('Tiga chooses up to three real entry draws and those draws discount the next copy '+n,()=>{
 const s=field(),x=play(s,TIGA);assert.equal(tapped(s,0),7);for(let i=0;i<n;i++){assert.equal(s.decision.task.op,'g34_DrawUpTo');pick(s,true);}if(n<3)pick(s,null);finish(s);assert.equal(s.players[0].hand.length,n);assert.equal(s.players[0].drawsThisTurn||0,n);assert.equal(cost(s,0,TIGA),7-n);assert.ok(s.players[0].battle.includes(x));
});
test('Tiga can stop drawing to avoid decking out',()=>{const s=field();give(s,0,'deck',[N]);const x=play(s,TIGA);pick(s,null);finish(s);assert.equal(s.winner,null);assert.equal(s.players[0].deck.length,1);assert.ok(s.players[0].battle.includes(x));});
for(const amount of[0,1,2])test('Arma Franz reduces only the water spell being executed, with exact optional amounts '+amount,()=>{
 let s=field();put(s,0,ARMA);const x=play(s,ENERGY);assert.equal(s.decision.task.op,'g34_PaySpell485');assert.deepEqual(values(s),[2,1,0,false]);assert.equal(tapped(s,0),0);s=JSON.parse(JSON.stringify(s));pick(s,amount);finish(s);assert.equal(tapped(s,0),3-amount);assert.equal(s.players[0].hand.length,2);assert.equal(s.players[0].drawsThisTurn,2);assert.ok(s.players[0].grave.some(y=>y.uid===x.uid));
});
test('Arma Franz ignores creatures, non-water spells and opposing spells; multiple matching sources and generic reducers stack',()=>{
 const s=field();put(s,0,ARMA);assert.equal(cost(s,0,ENERGY),1);assert.equal(cost(s,1,ENERGY),3);assert.equal(cost(s,0,W),2);assert.equal(cost(s,0,LIFE),2);play(s,LIFE);finish(s);assert.equal(tapped(s,0),2);put(s,0,ARMA);put(s,0,GENERIC);const c={...e.card(ENERGY),cost:8};assert.equal(e.summonCost(s,0,c),3);assert.equal(e.summonCost(s,0,{...c,g485Amount:1}),7);
});
test('Arma Franz checks a twinpact spell face, not the printed creature face',()=>{
 const cs=data.cards,waterSpell=cs.find(c=>c.spellFace&&e.civilizations(c).includes('闇')&&e.civilizations(c.spellFace).includes('水')),darkSpell=e.card(DARKTWIN);assert.ok(waterSpell);const s=field();put(s,0,ARMA);assert.equal(e.summonCost(s,0,darkSpell.spellFace),darkSpell.spellFace.cost);assert.equal(e.summonCost(s,0,waterSpell.spellFace),Math.max(1,waterSpell.spellFace.cost-2));const x=play(s,waterSpell.id,1);assert.equal(s.decision.task.op,'g34_PaySpell485');pick(s,2);finish(s);assert.ok(s.players[0].grave.some(y=>y.uid===x.uid));assert.equal(tapped(s,0),Math.max(1,waterSpell.spellFace.cost-2));
});
test('mandatory Love and Nenbutsu reductions use distinct card types, stack, expire with the source and never reduce their own payment before entry',()=>{
 const s=field(),love=play(s,LOVE);assert.equal(tapped(s,0),2);assert.equal(cost(s,0,ENERGY),2);assert.equal(cost(s,0,F),2);assert.equal(cost(s,1,ENERGY),3);const n=play(s,NEN);assert.equal(tapped(s,0),6);assert.equal(cost(s,0,F),1);assert.equal(cost(s,0,ENERGY),2);put(s,0,NEN);put(s,0,LOVE);assert.equal(cost(s,0,F),1);assert.equal(cost(s,0,ENERGY),1);s.players[0].battle=s.players[0].battle.filter(x=>![LOVE,NEN].includes(x.cardId));assert.equal(cost(s,0,F),2);assert.equal(cost(s,0,ENERGY),3);assert.ok(love&&n);
});
for(const source of[LOVE,NEN,ARMA])test(e.card(source).name+' continuous reduction is disabled by seals, ignored abilities and Genmu, but not GG',()=>{
 for(const mode of['sealed','ignored','genmu','gg','hand','under']){const s=field(),target=source===NEN?F:ENERGY;let x;if(mode==='hand')s.players[0].hand.push(inst(source));else if(mode==='under')put(s,0,N).under=[inst(source)];else{x=put(s,0,source);if(mode==='sealed'){x.sealed=true;s.players[0].seals.push({...inst(N),faceDown:true,sealOf:x.uid});}if(mode==='ignored')x.g35Ignored=s.turn;if(mode==='genmu')put(s,1,GEN);if(mode==='gg')put(s,1,GG).under=[inst(N)];}assert.equal(cost(s,0,target),Math.max(1,e.card(target).cost-(mode==='gg'?(source===ARMA?2:1):0)));}
});
for(const id of counters)test(e.card(id).name+' hand ability is not blanked by Genmu and all reductions obey a live cost-reduction prohibition',()=>{
 const s=field();load(s,0,id);const gen=put(s,1,GEN);assert.equal(cost(s,0,id),e.card(id).cost-3);s.players[1].battle.splice(s.players[1].battle.indexOf(gen),1);const lock=put(s,1,DIA);assert.equal(cost(s,0,id),e.card(id).cost);lock.g35Ignored=s.turn;assert.equal(cost(s,0,id),e.card(id).cost-3);
});
test('optional creature and spell payment is bypassed for free effects and reduction locks',()=>{
 for(const id of[RAI,TIGA,PANDA,BABA]){const s=field();load(s,0,id);put(s,1,DIA);const x=play(s,id);assert.notEqual(s.decision?.task?.op,'g34_PayCount499');finish(s);assert.ok(s.players[0].battle.includes(x));assert.equal(tapped(s,0),e.card(id).cost);}
 const s=field();put(s,0,ARMA);put(s,1,DIA);const x=play(s,ENERGY);finish(s);assert.ok(s.players[0].grave.includes(x));assert.equal(tapped(s,0),3);
});
for(const id of counters)test(e.card(id).name+' free deployment does not open paid reduction choices',()=>{
 const s=field(),source=put(s,0,N);load(s,0,id);give(s,0,'hand',[id]);s.extTasks=[{op:'g34_Sequence',p:0,source:N,uid:source.uid,incarnation:0,defs:[{op:'Select',origin:'hand',n:1,deploy:true,optional:false,filter:{creature:true}}]}];s.phase='main';act(s,'toAttack');pick(s,s.players[0].hand[0].uid);assert.notEqual(s.decision?.task?.op,'g34_PayCount499');finish(s);assert.ok(s.players[0].battle.some(x=>x.cardId===id));assert.equal(tapped(s,0),0);
});
test('Panda and Babaruga retain W and T Breakers, and Tiga is a W Breaker blocker',()=>{
 for(const[id,n]of[[PANDA,2],[BABA,3],[TIGA,2]]){const s=field(),x=put(s,0,id);s.phase='attack';act(s,'attack',a=>a.uid===x.uid&&a.target==='player');finish(s);assert.equal(s.players[1].shields.length,5-n);}const s=field(),x=put(s,0,TIGA),attacker=put(s,1,F);s.active=1;s.phase='attack';act(s,'attack',a=>a.uid===attacker.uid&&a.target==='player');assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===x.uid));
});
for(const r of rows)test(r.name+' charges for its verified printed mana value and orientation',()=>{const s=field();s.phase='charge';give(s,0,'hand',[r.id]);const x=s.players[0].hand[0];act(s,'charge',a=>a.uid===x.uid);assert.ok(s.players[0].mana.includes(x));assert.equal(x.tapped,r.faces[0].civilizations.length>1);});
test('CPU evaluates discounted costs and payment choices without mutating state or reading opposing hidden card identities',()=>{
 const s=field();s.players[0].drawsThisTurn=6;give(s,0,'mana',[W]);give(s,0,'hand',[TIGA]);const before=JSON.stringify(s),a=e.chooseAI(s);assert.equal(JSON.stringify(s),before);assert.equal(a.kind,'play');assert.equal(a.cost,1);e.step(s,a);const choice=e.chooseAI(s),payment=JSON.stringify(s);assert.equal(s.decision.choices[choice.choice].value,6);for(const z of['hand','deck','shields'])s.players[1][z].forEach(x=>x.cardId=GEN);assert.deepEqual(e.chooseAI(s),choice);const t=JSON.parse(payment);assert.equal(JSON.stringify(t),payment);
});
for(const first of[0,1])test('legal forty CPU game finishes with all eighty identities through save and resume '+first,()=>{
 let s=e.createGame([STANDARD499_DECKS[first],PRESETS[first]],{seed:49901+first,first}),saved=false;const all=physical(s);while(s.winner===null&&s.actions<2400&&s.turn<160){e.step(s,e.chooseAI(s));assert.deepEqual(physical(s),all);assert.equal(new Set(physical(s)).size,80);if(!saved&&s.actions>20){s=JSON.parse(JSON.stringify(s));saved=true;}}assert.ok(saved);assert.notEqual(s.winner,null);
});
