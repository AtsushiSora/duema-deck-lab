import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,GEN,GG,PRESETS} from './target-fixture.mjs';import {standardCardSpec} from '../tools/standard-card-spec.mjs';import {scanStandardCandidates} from '../tools/scan-standard-candidates.mjs';import {createCatalogue} from '../dist/catalogue.js';import {CARD_IMAGES} from '../dist/card-images.js';import {STANDARD500_DECKS} from '../tools/fixtures/standard500.mjs';
const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-500.json',import.meta.url))),rows=m.cards;
const N='dm01-108',F='dm01-097',W='dm01-083',D='dm01-090',L='dm01-075',DRAGON='dm08-049',ANGEL='dmr14-034',DEMON='dmrp08-059',TWIN='dm22ex1-030',SEED='dmsd20-016',ENERGY='dm06-085',COCCO='dmx23-009',RAIMER='dmrp14-093',AUZES='dm13-s02',OX='dm26ex1-N024',NIJI='dmr23-063',MULTI='dmrp13-084',NEN='dm02-020',RAI='dmr19-035',DIA='dmrp22-027';
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort(),put=(s,p,id)=>{const x=inst(id);s.players[p].battle.push(x);return x;},cost=(s,p,id)=>e.summonCost(s,p,e.card(id)),values=s=>s.decision.choices.map(x=>x.value),pick=(s,v)=>act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===v),tapped=(s,p)=>s.players[p].mana.filter(x=>x.tapped).length;
function field(p=0){const s=setup();s.active=p;for(const q of[0,1])give(s,q,'deck',Array(30).fill(N));return s;}
function finish(s){for(let n=0;s.decision&&s.winner===null;n++){assert.ok(n<700,JSON.stringify(s.decision));if(s.decision.type==='block')act(s,'noBlock');else e.step(s,e.chooseAI(s));}}
function play(s,id){const x=inst(id);s.players[s.active].hand.push(x);s.phase='main';act(s,'play',a=>a.uid===x.uid&&!a.alternative);return x;}
function attack(s,p,x,target='player'){s.active=p;s.phase='attack';act(s,'attack',a=>a.uid===x.uid&&a.target===target);}
function draw(s,p,n){const x=put(s,p,N);s.extTasks=[{op:'g34_Sequence',p,source:N,uid:x.uid,incarnation:0,defs:[{op:'Draw',n}]}];s.phase='main';act(s,'toAttack');finish(s);s.phase='main';}
for(const r of rows)test(r.name+' full verified official text, stats, mana, image, limits and strict phase boundary',()=>{
 const d=details.cards.find(c=>c.id===r.id),before=JSON.stringify(d),c=e.card(r.id);assert.deepEqual(r.faces,d.faces);assert.deepEqual(standardCardSpec(d,{phase:500}),r.spec);assert.throws(()=>standardCardSpec(d,{phase:499}));assert.equal(JSON.stringify(d),before);for(const[k,v]of Object.entries(r.spec))assert.deepEqual(c[k],v);assert.equal(c.cost,d.faces[0].cost);assert.equal(c.power,parseInt(d.faces[0].powerText));assert.equal(c.manaValue,1);assert.equal(c.limit,m.regulationVerification.limits[r.id]);assert.ok(r.verification.facesMatched);assert.match(r.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(CARD_IMAGES[r.id],r.image);const bad=structuredClone(d);bad.faces[0].abilityText+='\n未知の追加能力。';assert.throws(()=>standardCardSpec(bad,{phase:500}));
});
test('two legal forties cover all five complete cards and discovery has no unverified leftovers',()=>{const cat=createCatalogue(snapshot,data.cards,details);assert.equal(rows.length,5);for(const d of STANDARD500_DECKS){assert.deepEqual(e.validateDeck(d),[]);assert.equal(cat.coverage(d).unsupported,0);assert.equal(d.cards.reduce((n,r)=>n+r.count,0),40);for(const r of rows)assert.ok(d.cards.some(c=>c.id===r.id));}const scan=scanStandardCandidates(details.cards,data.cards,{phase:500});assert.deepEqual(scan.candidates,[]);assert.deepEqual(scan.blocked,[]);});
for(const p of[0,1])for(const id of[COCCO,NIJI])test(e.card(id).name+' reduces only matching friendly creature summons, keeps floor two, and does not increase a printed one cost '+p,()=>{
 const s=field(p);put(s,p,id);const target=id===COCCO?DRAGON:RAIMER;assert.equal(cost(s,p,target),e.card(target).cost-2);assert.equal(cost(s,1-p,target),e.card(target).cost);assert.equal(cost(s,p,N),2);assert.equal(cost(s,p,ENERGY),3);const c=e.card(target);for(const n of[1,2,3,4])assert.equal(e.summonCost(s,p,{...c,cost:n}),Math.min(n,Math.max(2,n-2)));put(s,p,id);put(s,p,id);assert.equal(cost(s,p,target),2);
});
for(const p of[0,1])test('Raimer counts physical grave creatures including twins once, not pure spells or tamaseeds, and retains floor two '+p,()=>{
 const s=field(p);give(s,p,'grave',[N,TWIN,ENERGY,SEED]);assert.equal(cost(s,p,RAIMER),4);assert.equal(cost(s,1-p,RAIMER),6);s.players[p].grave[0].faceDown=true;assert.equal(cost(s,p,RAIMER),5);give(s,p,'grave',Array(12).fill(N));put(s,1-p,'dmrp22-042');assert.equal(cost(s,p,RAIMER),2);assert.equal(e.card(RAIMER).cost,6);
});
for(const p of[0,1])test('Auzes counts either allied command race, including a hybrid only once, and ignores sealed or noncreature cards '+p,()=>{
 const s=field(p);put(s,p,ANGEL);put(s,p,DEMON);const dual=put(s,p,AUZES);assert.equal(cost(s,p,AUZES),3);assert.equal(cost(s,1-p,AUZES),6);dual.sealed=true;s.players[p].seals.push({...inst(N),faceDown:true,sealOf:dual.uid});assert.equal(cost(s,p,AUZES),4);put(s,p,SEED);put(s,p,N);put(s,1-p,ANGEL);assert.equal(cost(s,p,AUZES),4);put(s,p,ANGEL);put(s,p,ANGEL);assert.equal(cost(s,p,AUZES),2);
});
for(const id of[RAIMER,OX,AUZES])test(e.card(id).name+' floor-two self discount combines with a separate floor-one reduction in the beneficial order',()=>{
 const s=field();if(id===RAIMER)give(s,0,'grave',Array(12).fill(N));if(id===OX)s.players[0].drawsThisTurn=10;if(id===AUZES)for(let i=0;i<10;i++)put(s,0,ANGEL);assert.equal(cost(s,0,id),2);put(s,0,NEN);assert.equal(cost(s,0,id),1);
});
test('floor-two aura is applied before one-floor legacy and modern reductions, without changing printed cost',()=>{
 const s=field();put(s,0,COCCO);put(s,0,NEN);assert.equal(cost(s,0,DRAGON),1);assert.equal(e.card(DRAGON).cost,4);const oldBird=data.cards.find(c=>c.g29Bird);assert.ok(oldBird);const t=field();put(t,0,COCCO);put(t,0,oldBird.id);assert.equal(cost(t,0,DRAGON),1);
});
for(const id of[COCCO,NIJI])test(e.card(id).name+' is paid at printed cost before its own aura enters',()=>{const s=field(),x=play(s,id);assert.ok(s.players[0].battle.includes(x));assert.equal(tapped(s,0),e.card(id).cost);assert.equal(s.decision,null);});
for(const amount of[0,2])test('Cocco chooses exactly two or zero, then pays once through JSON continuation '+amount,()=>{
 let s=field();put(s,0,COCCO);const x=play(s,DRAGON),all=physical(s);assert.equal(s.decision.task.op,'g34_PayFloor500');assert.deepEqual(values(s),[2,0,false]);assert.equal(tapped(s,0),0);s=JSON.parse(JSON.stringify(s));pick(s,amount);finish(s);assert.equal(tapped(s,0),4-amount);assert.ok(s.players[0].battle.some(y=>y.uid===x.uid));assert.deepEqual(physical(s),all);
});
for(const amount of[0,1,2])test('Nijielphin chooses any amount up to two, keeps floor two and printed colors '+amount,()=>{
 const s=field();put(s,0,NIJI);const x=play(s,RAIMER);assert.deepEqual(values(s),[2,1,0,false]);pick(s,amount);finish(s);assert.equal(tapped(s,0),6-amount);assert.ok(s.players[0].battle.includes(x));
});
test('reachable amounts preserve each exact-two or up-to-two source rather than allowing an illegal half reduction',()=>{
 const s=field();put(s,0,COCCO);put(s,0,COCCO);play(s,DRAGON);assert.deepEqual(values(s),[4,2,0,false]);pick(s,false);finish(s);put(s,0,NIJI);const multiDragon=data.cards.find(c=>c.type==='creature'&&e.civilizations(c).length>1&&String(c.race).includes('ドラゴン')&&!c.evolution&&!c.neoEvolution&&c.cost>=8);assert.ok(e.civilizations(multiDragon).length>1);play(s,multiDragon.id);assert.deepEqual(values(s),[6,5,4,3,2,1,0,false]);pick(s,false);finish(s);
});
for(const id of[COCCO,NIJI])test(e.card(id).name+' cancellation leaves mana and physical zones untouched',()=>{
 const s=field();put(s,0,id);const x=play(s,id===COCCO?DRAGON:RAIMER),all=physical(s);assert.ok(s.players[0].hand.includes(x));pick(s,false);finish(s);assert.equal(tapped(s,0),0);assert.ok(s.players[0].hand.includes(x));assert.deepEqual(physical(s),all);assert.equal(s.metrics[0].played[x.cardId]||0,0);
});
test('floor-two aura and optional self discount can both be chosen without reopening payment or paying twice',()=>{
 const s=field();put(s,0,COCCO);give(s,0,'grave',[D,D,D]);const x=play(s,RAI),all=physical(s);assert.equal(s.decision.task.op,'g34_PayFloor500');pick(s,2);assert.equal(s.decision.task.op,'g34_PayCount499');assert.ok(values(s).includes(3));pick(s,3);finish(s);assert.equal(tapped(s,0),1);assert.ok(s.players[0].battle.includes(x));assert.deepEqual(physical(s),all);
});
for(const p of[0,1])test('Raimer can be paid and summoned from mana, respecting both printed civilizations '+p,()=>{
 const s=field(p);give(s,p,'grave',Array(6).fill(N));give(s,p,'mana',[RAIMER,D,N]);const x=s.players[p].mana[0],all=physical(s),a=e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===x.uid&&a.origin==='mana');assert.ok(a);assert.equal(a.cost,2);e.step(s,a);finish(s);assert.ok(s.players[p].battle.includes(x));assert.deepEqual(physical(s),all);s.phase='attack';assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid));
 const t=field(p);give(t,p,'grave',Array(6).fill(N));give(t,p,'mana',[F,F]);give(t,p,'hand',[RAIMER]);assert.ok(!e.getLegalActions(t).some(a=>a.kind==='play'));
});
test('Ox counts actual draws and resets per turn, not shield pickups or opposing draws',()=>{
 const s=field();assert.equal(cost(s,0,OX),5);draw(s,0,2);assert.equal(cost(s,0,OX),3);draw(s,1,4);assert.equal(cost(s,0,OX),3);const attacker=put(s,1,F);attack(s,1,attacker);act(s,'noBlock');finish(s);assert.equal(cost(s,0,OX),3);s.phase='attack';act(s,'endTurn');finish(s);assert.equal(s.players[0].drawsThisTurn,1);assert.equal(cost(s,0,OX),4);assert.equal(cost(s,1,OX),5);
});
for(const p of[0,1])test('Ox has speed attacker and draws two then discards one on attack through save and resume '+p,()=>{
 let s=field(p);draw(s,p,2);const x=play(s,OX);assert.equal(tapped(s,p),3);const beforeHand=s.players[p].hand.length,all=physical(s);attack(s,p,x);assert.equal(s.players[p].drawsThisTurn,4);assert.equal(s.players[p].hand.length,beforeHand+2);assert.ok(s.decision);s=JSON.parse(JSON.stringify(s));finish(s);assert.equal(s.players[p].hand.length,beforeHand+1);assert.equal(s.players[p].grave.length,1);assert.equal(cost(s,p,OX),2);assert.equal(s.players[1-p].shields.length,4);assert.deepEqual(physical(s),all);
});
for(const p of[0,1])for(const attacker of[AUZES,DEMON])test('Auzes triggers once for either command race and destroys a tapped opposing creature before blocks '+p+' '+attacker,()=>{
 const s=field(p),source=put(s,p,AUZES),a=attacker===AUZES?source:put(s,p,attacker),target=put(s,1-p,F),untapped=put(s,1-p,N);target.tapped=true;const all=physical(s);attack(s,p,a);assert.equal(s.decision.task.op,'g34_Target');assert.equal(s.decision.choices.length,1);assert.equal(s.decision.choices[0].value.uid,target.uid);pick(s,target.uid);finish(s);assert.ok(s.players[1-p].grave.includes(target));assert.ok(s.players[1-p].battle.includes(untapped));assert.deepEqual(physical(s),all);
});
test('Auzes ability already waiting survives source departure and JSON continuation',()=>{
 let s=field(),source=put(s,0,AUZES),attacker=put(s,0,DEMON),target=put(s,1,F);target.tapped=true;attack(s,0,attacker);s.players[0].battle.splice(s.players[0].battle.indexOf(source),1);s.players[0].grave.push(source);const all=physical(s);s=JSON.parse(JSON.stringify(s));pick(s,target.uid);finish(s);assert.ok(s.players[1].grave.some(x=>x.uid===target.uid));assert.deepEqual(physical(s),all);
});
test('Auzes does not watch ordinary or opposing attacks and cannot select a protected target',()=>{
 for(const mode of['ordinary','opponent','protected']){const s=field(),source=put(s,0,AUZES),a=put(s,mode==='opponent'?1:0,mode==='ordinary'?N:DEMON),target=put(s,1,mode==='protected'?data.cards.find(c=>c.justDiver).id:F);target.tapped=true;if(mode==='protected')target.justDiverActive=true;attack(s,mode==='opponent'?1:0,a);assert.notEqual(s.decision?.task?.op,'g34_Target');finish(s);assert.ok(s.players[1].battle.includes(target));}
});
for(const id of[COCCO,NIJI])test(e.card(id).name+' aura is absent outside battle, beneath an evolution, sealed or ignored; GG does not stop a continuous effect',()=>{
 for(const mode of['hand','grave','mana','under','sealed','ignored','gg']){const s=field();if(['hand','grave','mana'].includes(mode))s.players[0][mode].push(inst(id));else if(mode==='under')put(s,0,N).under=[inst(id)];else{const x=put(s,0,id);if(mode==='sealed'){x.sealed=true;s.players[0].seals.push({...inst(N),faceDown:true,sealOf:x.uid});}if(mode==='ignored')x.g35Ignored=s.turn;if(mode==='gg')put(s,1,GG).under=[inst(N)];}const target=id===COCCO?e.card(DRAGON):{...e.card(MULTI),cost:6};assert.equal(e.summonCost(s,0,target),target.cost-(mode==='gg'?2:0));}
});
test('Genmu ignores four-cost Nijielphin but not six-cost Cocco or Auzes; reduction prohibition blocks every floor',()=>{
 const s=field();put(s,0,NIJI);put(s,0,COCCO);const g=put(s,1,GEN);assert.equal(cost(s,0,RAIMER),6);assert.equal(cost(s,0,DRAGON),2);put(s,0,AUZES);put(s,0,DEMON);assert.equal(cost(s,0,AUZES),4);s.players[1].battle=[];const lock=put(s,1,DIA);give(s,0,'grave',Array(10).fill(N));s.players[0].drawsThisTurn=10;for(const id of[DRAGON,AUZES,RAIMER,OX])assert.equal(cost(s,0,id),e.card(id).cost);lock.g35Ignored=s.turn;assert.equal(cost(s,0,RAIMER),2);assert.ok(g);
});
for(const r of rows)test(r.name+' charges with its printed mana and multicolor orientation',()=>{const s=field();s.phase='charge';give(s,0,'hand',[r.id]);const x=s.players[0].hand[0];act(s,'charge',a=>a.uid===x.uid);assert.ok(s.players[0].mana.includes(x));assert.equal(x.tapped,r.faces[0].civilizations.length>1);});
test('Cocco and Auzes keep their W Breaker for ordinary attacks',()=>{for(const id of[COCCO,AUZES]){const s=field(),x=put(s,0,id);attack(s,0,x);finish(s);assert.equal(s.players[1].shields.length,3);}});
test('CPU quotes legal discounted payments and is pure and independent of hidden opposing identities',()=>{
 const s=field();put(s,0,COCCO);give(s,0,'hand',[DRAGON]);give(s,0,'mana',[F,F]);const before=JSON.stringify(s),a=e.chooseAI(s);assert.equal(a.kind,'play');assert.equal(a.cost,2);assert.equal(JSON.stringify(s),before);e.step(s,a);const pending=JSON.stringify(s),choice=e.chooseAI(s);assert.equal(s.decision.choices[choice.choice].value,2);assert.equal(JSON.stringify(s),pending);for(const z of['hand','deck','shields'])s.players[1][z].forEach(x=>x.cardId=GEN);assert.deepEqual(e.chooseAI(s),choice);
});
for(const first of[0,1])test('legal forty CPU game finishes and conserves eighty physical cards through saving '+first,()=>{
 let s=e.createGame([STANDARD500_DECKS[first],PRESETS[first]],{seed:50001+first,first}),saved=false;const all=physical(s);while(s.winner===null&&s.actions<2400&&s.turn<160){e.step(s,e.chooseAI(s));assert.deepEqual(physical(s),all);assert.equal(new Set(physical(s)).size,80);if(!saved&&s.actions>20){s=JSON.parse(JSON.stringify(s));saved=true;}}assert.ok(saved);assert.notEqual(s.winner,null);
});
