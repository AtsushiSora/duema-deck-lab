import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,GEN,GG,PRESETS} from './target-fixture.mjs';import {standardCardSpec} from '../tools/standard-card-spec.mjs';import {scanStandardCandidates} from '../tools/scan-standard-candidates.mjs';import {createCatalogue} from '../dist/catalogue.js';import {CARD_IMAGES} from '../dist/card-images.js';import {STANDARD502_DECKS} from '../tools/fixtures/standard502.mjs';
const m=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-502.json',import.meta.url))),rows=m.cards;
const N='dm01-108',F='dm01-097',W='dm01-083',L='dm01-075',ENERGY='dm06-085',LIFE='dm06-110',GEAR='dm14-110',SUIT='dm14-086',FIELD='dmrp08-005',SEED='dmsd20-016',ACE='dm22rp2-S8',DUCK='dm24rp3-070',HATTARI='dmrp11-095',MAFA='dmrp01-054',LANG='dm13-045',BIA='dmrp08-069',BOGUE='dm35-050',PEPPER='dm26rp2-060',RHAP='dm26rp2-056',UKON='dm31-037',BOSHIN='dm30-054',ZOL='dm24-040',HIGH='dmrp03-087';
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort(),put=(s,p,id)=>{const x=inst(id);s.players[p].battle.push(x);return x;},attacks=(s,x)=>{s.phase='attack';return e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===x.uid);},playerAttack=(s,x)=>attacks(s,x).some(a=>a.target==='player'),equip=(g,x)=>g.crossedTo={uid:x.uid,incarnation:x.incarnation||0};
function field(p=0){const s=setup();s.active=p;for(const q of[0,1])give(s,q,'deck',Array(30).fill(N));return s;}
function finish(s){for(let n=0;s.decision&&s.winner===null;n++){assert.ok(n<750,JSON.stringify(s.decision));if(s.decision.type==='block')act(s,'noBlock');else e.step(s,e.chooseAI(s));}}
function play(s,id){const x=inst(id);s.players[s.active].hand.push(x);s.phase='main';act(s,'play',a=>a.uid===x.uid&&!a.alternative);finish(s);return x;}
function end(s){s.phase='attack';act(s,'endTurn');finish(s);}
function draw(s,p,n){const x=put(s,p,N);s.extTasks=[{op:'g34_Sequence',p,source:N,uid:x.uid,incarnation:0,defs:[{op:'Draw',n}]}];s.phase='main';act(s,'toAttack');finish(s);}
for(const r of rows)test(r.name+' complete official definition, strict compiler boundary, image, mana, limits and stats',()=>{
 const d=details.cards.find(c=>c.id===r.id),before=JSON.stringify(d),c=e.card(r.id);assert.deepEqual(r.faces,d.faces);assert.deepEqual(standardCardSpec(d,{phase:502}),r.spec);assert.throws(()=>standardCardSpec(d,{phase:501}));assert.equal(JSON.stringify(d),before);for(const[k,v]of Object.entries(r.spec))assert.deepEqual(c[k],v);assert.equal(c.cost,d.faces[0].cost);assert.equal(c.power,parseInt(d.faces[0].powerText));assert.equal(c.manaValue,1);assert.equal(c.limit,m.regulationVerification.limits[r.id]);assert.ok(r.verification.facesMatched);assert.match(r.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(CARD_IMAGES[r.id],r.image);const bad=structuredClone(d);bad.faces[0].abilityText+='\n未知の追加能力。';assert.throws(()=>standardCardSpec(bad,{phase:502}));
});
test('two complete legal forty-card decks cover all eleven cards with no unverified discoveries',()=>{const cat=createCatalogue(snapshot,data.cards,details);assert.equal(rows.length,11);for(const d of STANDARD502_DECKS){assert.deepEqual(e.validateDeck(d),[]);assert.equal(cat.coverage(d).unsupported,0);assert.equal(d.cards.reduce((n,r)=>n+r.count,0),40);for(const r of rows)assert.ok(d.cards.some(c=>c.id===r.id));}const scan=scanStandardCandidates(details.cards,data.cards,{phase:502});assert.deepEqual(scan.candidates,[]);assert.deepEqual(scan.blocked,[]);});
for(const r of rows)test(r.name+' pays its printed summon cost and conserves every physical card',()=>{
 const s=field(),all=physical(s),x=play(s,r.id);assert.ok(s.players[0].battle.includes(x));assert.equal(s.players[0].mana.filter(x=>x.tapped).length,e.card(r.id).cost);assert.deepEqual(physical(s),[...all,x.uid].sort());assert.equal(s.players[0].enteredThisTurn,1);
});
for(const p of[0,1])test('Duck counts three distinct printed element costs, not three cards or opposing and non-battle cards '+p,()=>{
 const s=field(p),x=put(s,p,DUCK);assert.ok(!playerAttack(s,x));const n=put(s,p,N);put(s,p,SUIT);put(s,1-p,L);give(s,p,'hand',[L]);assert.ok(!playerAttack(s,x));const third=put(s,p,UKON);assert.ok(playerAttack(s,x));s.players[p].battle.splice(s.players[p].battle.indexOf(third),1);s.players[p].grave.push(third);assert.ok(!playerAttack(s,x));third.sealed=true;s.players[p].battle.push(third);s.players[p].grave=[];s.players[p].seals.push({...inst(N),faceDown:true,sealOf:third.uid});assert.ok(!playerAttack(s,x));assert.ok(n);
});
test('Duck can count a field, cross gear or tamaseed as an element and does not count evolution sources as extra elements',()=>{
 const s=field(),x=put(s,0,DUCK),f=put(s,0,FIELD),seed=put(s,0,SEED);assert.ok(!playerAttack(s,x));const highField=put(s,0,'dm23ex2-009');assert.ok(playerAttack(s,x));s.players[0].battle.splice(s.players[0].battle.indexOf(highField),1);f.under=[highField];assert.ok(!playerAttack(s,x));put(s,0,GEAR);assert.ok(!playerAttack(s,x));put(s,0,UKON);assert.ok(playerAttack(s,x));assert.ok(seed);
});
for(const p of[0,1])test('Langren needs every other actual creature on either side to be tapped '+p,()=>{
 const s=field(p),x=put(s,p,LANG);assert.ok(playerAttack(s,x));const own=put(s,p,N);assert.ok(!playerAttack(s,x));own.tapped=true;assert.ok(playerAttack(s,x));const enemy=put(s,1-p,F);assert.ok(!playerAttack(s,x));enemy.tapped=true;assert.ok(playerAttack(s,x));own.tapped=false;own.g35Ignored=s.turn;assert.ok(!playerAttack(s,x));own.sealed=true;s.players[p].seals.push({...inst(N),faceDown:true,sealOf:own.uid});put(s,1-p,SEED);put(s,1-p,ACE);assert.ok(playerAttack(s,x));
});
for(const p of[0,1])test('Hattari uses actual entries earlier this turn, including free entry, and exposes that public count to projections '+p,()=>{
 const s=field(p),x=put(s,p,HATTARI);assert.ok(!playerAttack(s,x));play(s,N);assert.equal(s.players[p].enteredThisTurn,1);assert.ok(!playerAttack(s,x));s.extTasks=[{op:'g34_Sequence',p,source:N,defs:[{op:'Select',origin:'hand',n:1,deploy:true,optional:false,filter:{creature:true}}]}];give(s,p,'hand',[F]);s.phase='main';act(s,'toAttack');finish(s);assert.equal(s.players[p].enteredThisTurn,2);assert.ok(playerAttack(s,x));const v=e.observation(s,p),copy=v.players[p].battle.find(y=>y.uid===x.uid);assert.equal(v.players[p].enteredThisTurn,2);assert.ok(!e.effectiveCard(copy,v).noAttack);
});
test('Hattari does not confuse summoning sickness, a noncreature execution or an opposing entry with its own entry condition',()=>{
 const s=field(),x=play(s,HATTARI);play(s,F);assert.equal(s.players[0].enteredThisTurn,2);assert.ok(!playerAttack(s,x));(x.g34Grants??=[]).push({turn:s.turn,speedAttacker:true});assert.ok(playerAttack(s,x));const t=field(),old=put(t,0,HATTARI);play(t,GEAR);assert.ok(!playerAttack(t,old));t.active=1;play(t,N);play(t,F);t.active=0;assert.ok(!playerAttack(t,old));
});
for(const p of[0,1])test('Mafarich requires a different allied creature at current power 12000; its own 12000 cannot qualify '+p,()=>{
 const s=field(p),x=put(s,p,MAFA);assert.ok(!playerAttack(s,x));const ally=put(s,p,HIGH);assert.ok(playerAttack(s,x));ally.powerModifiers=[{amount:-1}];assert.ok(!playerAttack(s,x));ally.powerModifiers=[{amount:0}];assert.ok(playerAttack(s,x));s.players[p].battle.splice(s.players[p].battle.indexOf(ally),1);put(s,1-p,HIGH);assert.ok(!playerAttack(s,x));const second=put(s,p,MAFA);assert.ok(playerAttack(s,x));assert.ok(playerAttack(s,second));
});
for(const p of[0,1])test('Biawan requires an actual spell cast this turn, while its blocker is available without that condition '+p,()=>{
 const s=field(p),x=put(s,p,BIA),enemy=put(s,1-p,F);assert.ok(!playerAttack(s,x));assert.ok(e.effectiveCard(x,s).blocker);play(s,ENERGY);assert.ok(playerAttack(s,x));s.active=1-p;s.phase='attack';act(s,'attack',a=>a.uid===enemy.uid&&a.target==='player');assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===x.uid));act(s,'noBlock');finish(s);
});
test('an ignored spell still counts as cast and skipped or merely charged cards do not satisfy cast requirements',()=>{
 const s=field(),x=put(s,0,BIA);put(s,1,GEN);play(s,ENERGY);assert.equal(s.g37Spells[0].n,1);s.players[1].battle=[];assert.ok(playerAttack(s,x));const t=field(),y=put(t,0,BIA);t.phase='charge';give(t,0,'hand',[ENERGY]);act(t,'charge');assert.ok(!playerAttack(t,y));
});
for(const p of[0,1])test('Pepper needs two actual draws this turn, not initial hand, searches or shield pickup '+p,()=>{
 const s=field(p),x=put(s,p,PEPPER);assert.ok(!playerAttack(s,x));draw(s,p,1);assert.ok(!playerAttack(s,x));give(s,p,'hand',Array(8).fill(N));assert.ok(!playerAttack(s,x));draw(s,1-p,3);assert.ok(!playerAttack(s,x));draw(s,p,1);assert.ok(playerAttack(s,x));assert.equal(s.players[p].drawsThisTurn,2);
});
test('Pepper keeps Just Diver after entry and its inability to attack does not make it an illegal attack target forever',()=>{
 const s=field(),x=play(s,PEPPER),enemy=put(s,1,F);assert.ok(e.effectiveCard(x,s).justDiver&&x.justDiverActive);x.tapped=true;s.active=1;s.phase='attack';assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===enemy.uid&&a.target===x.uid));x.justDiverActive=false;assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===enemy.uid&&a.target===x.uid));
});
for(const p of[0,1])test('Rhapsody counts a used gear or spell, not charging or summoning a creature '+p,()=>{
 const s=field(p),x=put(s,p,RHAP);play(s,N);assert.ok(!playerAttack(s,x));play(s,GEAR);assert.ok(playerAttack(s,x));assert.ok(e.effectiveCard(x,s).blocker);const t=field(p),y=put(t,p,RHAP);t.phase='charge';give(t,p,'hand',[GEAR]);act(t,'charge');assert.ok(!playerAttack(t,y));play(t,ENERGY);assert.ok(playerAttack(t,y));
});
for(const p of[0,1])test('Zolbalard needs an actual opposing creature but may attack the player even when that creature is not attackable '+p,()=>{
 const s=field(p),x=put(s,p,ZOL);assert.ok(!playerAttack(s,x));put(s,p,N);put(s,1-p,SEED);put(s,1-p,ACE);assert.ok(!playerAttack(s,x));const enemy=put(s,1-p,F);assert.ok(playerAttack(s,x));enemy.justDiverActive=true;enemy.g35Ignored=s.turn;assert.ok(playerAttack(s,x));enemy.sealed=true;s.players[1-p].seals.push({...inst(N),faceDown:true,sealOf:enemy.uid});assert.ok(!playerAttack(s,x));
});
for(const p of[0,1])test('Bogue must attack a creature if possible, cannot attack the player, and may end when no legal creature attack exists '+p,()=>{
 const s=field(p),x=put(s,p,BOGUE),enemy=put(s,1-p,F);assert.ok(!playerAttack(s,x));assert.ok(e.getLegalActions(s).some(a=>a.kind==='endTurn'));enemy.tapped=true;assert.ok(attacks(s,x).some(a=>a.target===enemy.uid));assert.ok(!e.getLegalActions(s).some(a=>a.kind==='endTurn'));act(s,'attack',a=>a.uid===x.uid&&a.target===enemy.uid);finish(s);assert.ok(s.players[1-p].grave.includes(enemy));assert.ok(e.getLegalActions(s).some(a=>a.kind==='endTurn'));
});
for(const p of[0,1])for(const id of[UKON,BOSHIN])test(e.card(id).name+' restricts only player attacks until a gear is actually generated and crossed '+p,()=>{
 const s=field(p),x=put(s,p,id),enemy=put(s,1-p,F);enemy.tapped=true;assert.ok(!playerAttack(s,x));assert.ok(attacks(s,x).some(a=>a.target===enemy.uid));const before=physical(s),g=play(s,GEAR);assert.ok(!playerAttack(s,x));s.phase='main';act(s,'crossGear',a=>a.uid===g.uid&&a.target===x.uid);finish(s);assert.ok(playerAttack(s,x));assert.deepEqual(physical(s),[...before,g.uid].sort());if(id===UKON)assert.ok(e.effectiveCard(x,s).blocker);
});
for(const id of[UKON,BOSHIN])test(e.card(id).name+' checks the live crossed incarnation, not a gear in another zone or a stale link',()=>{
 for(const mode of['stale','other','grave','sealed','ignored']){const s=field(),x=put(s,0,id),other=put(s,0,N),g=inst(GEAR);equip(g,mode==='other'?other:x);if(mode==='grave')s.players[0].grave.push(g);else s.players[0].battle.push(g);if(mode==='stale')g.crossedTo.incarnation=9;if(mode==='sealed'){g.sealed=true;s.players[0].seals.push({...inst(N),faceDown:true,sealOf:g.uid});}if(mode==='ignored')g.g35Ignored=s.turn;assert.equal(playerAttack(s,x),mode==='ignored');}
});
test('entry, spell, draw and noncreature-use requirements expire at the next turn and do not stop blocking',()=>{
 const s=field(),h=put(s,0,HATTARI),b=put(s,0,BIA),p=put(s,0,PEPPER),r=put(s,0,RHAP);play(s,N);play(s,F);play(s,ENERGY);for(const x of[h,b,p,r])assert.ok(playerAttack(s,x));end(s);s.active=0;s.phase='attack';for(const x of[h,b,p,r])assert.ok(!playerAttack(s,x));assert.ok(e.effectiveCard(b,s).blocker&&e.effectiveCard(r,s).blocker);
});
for(const r of rows)test(r.name+' restriction can be ignored and its physical creature still conserves its basic type',()=>{
 const s=field(),x=put(s,0,r.id);x.g35Ignored=s.turn;assert.ok(playerAttack(s,x));assert.equal(e.effectiveCard(x,s).type,'creature');
});
test('GG does not turn off constant attack restrictions, and Genmu ignores only the eligible printed costs',()=>{
 for(const id of[DUCK,HATTARI,MAFA,LANG,BIA,PEPPER,RHAP,ZOL]){const s=field(),x=put(s,0,id);if(id===LANG)put(s,0,N);put(s,1,GG).under=[inst(N)];if(id===ZOL){assert.ok(playerAttack(s,x));continue;}assert.ok(!playerAttack(s,x));const t=field(),y=put(t,0,id);if(id===LANG)put(t,0,N);put(t,1,GEN);assert.equal(playerAttack(t,y),e.card(id).cost<=5||id===ZOL);}
});
for(const r of rows)test(r.name+' charges with its printed mana and civilization orientation',()=>{const s=field();s.phase='charge';give(s,0,'hand',[r.id]);const x=s.players[0].hand[0];act(s,'charge',a=>a.uid===x.uid);assert.ok(s.players[0].mana.includes(x));assert.equal(x.tapped,r.faces[0].civilizations.length>1);});
test('Mafarich and Zolbalard keep their T Breakers when the attack requirement is met',()=>{
 for(const id of[MAFA,ZOL]){const s=field(),x=put(s,0,id);if(id===MAFA)put(s,0,HIGH);else put(s,1,F);s.phase='attack';act(s,'attack',a=>a.uid===x.uid&&a.target==='player');finish(s);assert.equal(s.players[1].shields.length,2);}
});
test('CPU sees public entry history, evaluates legal conditional attacks, and does not mutate or use enemy hidden identities',()=>{
 const s=field(),x=put(s,0,HATTARI);play(s,N);play(s,F);s.phase='attack';const saved=JSON.stringify(s),rank=e.analyzeAI(s),a=e.chooseAI(s);assert.equal(JSON.stringify(s),saved);assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid));const v=e.observation(s,0);assert.equal(v.players[0].enteredThisTurn,2);assert.ok(!e.effectiveCard(v.players[0].battle.find(y=>y.uid===x.uid),v).noAttack);for(const z of['hand','deck','shields'])s.players[1][z].forEach(x=>x.cardId=GEN);assert.deepEqual(e.analyzeAI(s),rank);assert.deepEqual(e.chooseAI(s),a);
});
for(const first of[0,1])test('legal forty CPU game finishes and conserves eighty physical cards through JSON continuation '+first,()=>{
 let s=e.createGame([STANDARD502_DECKS[first],PRESETS[first]],{seed:50201+first,first}),saved=false;const all=physical(s);while(s.winner===null&&s.actions<2600&&s.turn<160){e.step(s,e.chooseAI(s));assert.deepEqual(physical(s),all);assert.equal(new Set(physical(s)).size,80);if(!saved&&s.actions>20){s=JSON.parse(JSON.stringify(s));saved=true;}}assert.ok(saved);assert.notEqual(s.winner,null);
});
