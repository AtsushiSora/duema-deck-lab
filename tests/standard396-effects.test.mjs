import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain,GEN} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {scanStandardCandidates} from '../tools/scan-standard-candidates.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {STANDARD396_DECKS} from '../tools/fixtures/standard396.mjs';
const manifest=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-396.json',import.meta.url))),all=manifest.cards.map(r=>r.id),zeros=manifest.cards.filter(r=>r.spec.g396Zero);
const put=(s,p,id)=>{const x=inst(id);s.players[p].battle.push(x);return x;};
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const free=(s,x)=>e.getLegalActions(s).filter(a=>a.kind==='play'&&a.uid===x.uid&&a.freeSummon==='G・ゼロ');
const pick=(s,x)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===(x?.uid??x);});
function prepare(id,p=0){const s=setup();s.active=p;give(s,p,'mana',[]);const x=inst(id);s.players[p].hand.push(x);return{s,x};}
function fulfill(s,p,id,owner=p){
 for(const f of e.card(id).g396Zero.all){
  if(f.g334ZoneCount){while(s.players[p].hand.length<f.g334ZoneCount.min)s.players[p].hand.push(inst('dm01-108'));continue;}
  if(f.g272ManaCount){give(s,p,'mana',Array(f.g272ManaCount).fill('dm01-108'));continue;}
  if(f.g267Mana){give(s,p,'mana',Array(f.g267Mana.n).fill('dm01-075'));continue;}
  const c=f.seed&&e.card(id).evolution?e.card('dmrp21-014'):data.cards.find(c=>c.type!=='spell'&&(!f.race||String(c.race).includes(f.race))&&(!f.color||(c.civilizations||String(c.civ).split('/')).includes(f.color))&&(!f.creature||c.type==='creature')&&(!f.seed||c.type==='seed')&&(!f.min||c.cost>=f.min)&&(!f.g228Face||c.type===f.g228Face.type&&c.d2Field&&(c.civilizations||String(c.civ).split('/')).includes(f.g228Face.color)));
  assert.ok(c,JSON.stringify(f));for(let n=0;n<f.g258Civil;n++)put(s,owner,c.id);
 }
}
test('25 complete official definitions, real art, restrictions, support badges and three legal forties',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);assert.equal(all.length,25);assert.equal([data.supportExpansion,...data.supportExpansion.history].find(r=>r.phase===396).totalCount,4039);
 for(const r of manifest.cards){assert.deepEqual(r.faces,details.cards.find(d=>d.id===r.id).faces);assert.deepEqual(standardCardSpec(details.cards.find(d=>d.id===r.id),{phase:396}),r.spec);assert.ok(r.verification.facesMatched);assert.match(r.verification.sha256,/^[a-f0-9]{64}$/);assert.equal(CARD_IMAGES[r.id],r.image);assert.equal(e.card(r.id).manaValue,1);assert.equal(e.card(r.id).limit,manifest.regulationVerification.limits[r.id]);assert.ok(registry.get(r.id).supported);}
 assert.equal(e.card('dm19-027').limit,0);assert.ok(e.validateDeck({...STANDARD396_DECKS[0],cards:[{id:'dm19-027',count:4},...STANDARD396_DECKS[0].cards.slice(1)]}).length);
 const covered=new Set(STANDARD396_DECKS.flatMap(d=>d.cards.map(r=>r.id)));for(const id of all.filter(id=>id!=='dm19-027'))assert.ok(covered.has(id));
 for(const d of STANDARD396_DECKS){assert.equal(d.cards.reduce((n,c)=>n+c.count,0),40);assert.deepEqual(e.validateDeck(d),[]);assert.equal(registry.coverage(d).unsupported,0);}
});
test('whole-clause discovery rejects unknown text and preserves every older standard manifest',()=>{
 for(const r of manifest.cards){const d=structuredClone(details.cards.find(d=>d.id===r.id));d.faces[0].abilityText+='\n未知の能力';assert.throws(()=>standardCardSpec(d,{phase:396}));}
 for(const r of zeros){const d=structuredClone(details.cards.find(d=>d.id===r.id));assert.throws(()=>standardCardSpec(d,{phase:395}));d.faces[0].abilityText=d.faces[0].abilityText.replace('G・ゼロ','G・ゼロ不明');assert.throws(()=>standardCardSpec(d,{phase:396}));}
 for(let phase=165;phase<=392;phase++){if([167,202,213,320,321,338].includes(phase))continue;for(const r of JSON.parse(fs.readFileSync(new URL('../tools/support-phase-'+phase+'.json',import.meta.url))).cards)assert.deepEqual(standardCardSpec(details.cards.find(d=>d.id===r.id),{phase}),r.spec);}
 assert.deepEqual(scanStandardCandidates(details.cards.filter(c=>all.includes(c.id)),data.cards.filter(c=>c.supportBatch!=='phase-396'),{phase:396}).candidates.map(c=>c.id).sort(),[...all].sort());
});
for(const r of zeros)for(const p of [0,1])test(r.name+' G-Zero threshold, both seats, JSON and physical identities '+p,()=>{
 let{s,x}=prepare(r.id,p);assert.equal(free(s,x).length,0);fulfill(s,p,r.id);assert.ok(free(s,x).length);const before=physical(s),mana=new Set(s.players[p].mana.map(y=>y.uid));s=JSON.parse(JSON.stringify(s));act(s,'play',a=>a.uid===x.uid&&a.freeSummon==='G・ゼロ');if(s.decision?.type==='evolution')act(s,'evolve');drain(s);assert.equal(s.players[p].mana.filter(y=>mana.has(y.uid)&&y.tapped).length,0);assert.equal(s.metrics[p].triggers,0);assert.equal(s.metrics[p].played[r.id],1);assert.deepEqual(physical(s),before);
 if(e.card(r.id).type==='creature')assert.ok(s.players[p].battle.some(y=>y.uid===x.uid));else assert.ok(s.players[p].grave.some(y=>y.uid===x.uid));
});
for(const r of zeros.filter(r=>r.spec.g396Zero.all.some(f=>f.race||f.seed||f.g228Face||f.creature)))test(r.name+' own and both-player scope, sealed and under cards',()=>{
 const{s,x}=prepare(r.id);fulfill(s,0,r.id,1);const f=r.spec.g396Zero.all.find(f=>f.race||f.seed||f.g228Face||f.creature);assert.equal(!!free(s,x).length,!!f.g334Both&&!e.card(r.id).evolution);
 const t=prepare(r.id);fulfill(t.s,0,r.id);const y=t.s.players[0].battle.at(-1);y.sealed=true;t.s.players[0].seals.push({...inst('dm01-108'),faceDown:true,sealOf:y.uid});assert.equal(free(t.s,t.x).length,0);y.sealed=false;assert.ok(free(t.s,t.x).length);t.s.players[0].battle=t.s.players[0].battle.filter(z=>z!==y);put(t.s,0,'dm01-108').under=[y];assert.equal(free(t.s,t.x).length,0);
});
for(const r of manifest.cards)for(const p of [0,1])test(r.name+' can still be used with normal paid execution '+p,()=>{
 const s=setup();s.active=p;const x=inst(r.id);s.players[p].hand.push(x);if(r.spec.evolution||r.spec.neoEvolution){fulfill(s,p,r.id);if(!e.evolutionBases(s,p,e.card(r.id)).length)put(s,p,'dm01-083');}
 if(r.id==='dm19-027')s.players[p].grave.push(inst('dm01-108'));if(r.id==='dm24rp3-029')put(s,1-p,'dm01-108');const before=physical(s);
 act(s,'play',a=>a.uid===x.uid&&!a.freeSummon&&!a.alternative&&!a.g7Payment?.energy?.length);if(s.decision?.type==='evolution')act(s,'evolve',a=>r.spec.neoEvolution?!a.baseUid:true);drain(s);assert.equal(s.metrics[p].played[r.id],1);assert.ok(s.players[p].mana.some(y=>y.tapped));assert.deepEqual(physical(s),before);
});
test('free use never grants access to a different zone',()=>{for(const origin of ['mana','grave']){const{s,x}=prepare('dm16-046');fulfill(s,0,x.cardId);s.players[0].hand=[];s.players[0][origin].push(x);assert.equal(free(s,x).length,0);}});
for(const origin of ['mana','grave'])test('permitted '+origin+' use consumes its once-per-turn authority even when free',()=>{
 const{s,x}=prepare('dm16-046');fulfill(s,0,x.cardId);s.players[0].hand=[];s.players[0][origin].push(x);const source=put(s,0,origin==='mana'?'dmrp18-s09':'dm25rp1-006');const other=inst(x.cardId);s.players[0][origin].push(other);assert.ok(free(s,x).some(a=>a.origin===origin));const before=physical(s);act(s,'play',a=>a.uid===x.uid&&a.freeSummon==='G・ゼロ');drain(s);assert.equal(free(s,other).length,0);assert.ok(s.players[0].battle.some(y=>y.uid===source.uid));assert.deepEqual(physical(s),before);
});
test('G-Zero mana count includes the selected mana card until it is summoned',()=>{
 const{s,x}=prepare('dm24rp3-046');s.players[0].hand=[];give(s,0,'mana',['dm01-108','dm01-108','dm01-108']);s.players[0].mana.push(x);put(s,0,'dmrp18-s09');assert.ok(free(s,x).length);act(s,'play',a=>a.uid===x.uid&&a.freeSummon==='G・ゼロ');drain(s);assert.equal(s.players[0].mana.length,3);
});
test('Star evolution still requires its own eligible base; six opposing seeds are insufficient',()=>{const{s,x}=prepare('dmrp21-012');fulfill(s,0,x.cardId,1);assert.equal(free(s,x).length,0);});
test('NEO can use G-Zero either with a base or as a non-evolution creature',()=>{for(const evolve of [true,false]){const{s,x}=prepare('dm25rp2-068');fulfill(s,0,x.cardId);act(s,'play',a=>a.uid===x.uid&&a.freeSummon==='G・ゼロ');assert.equal(s.decision.type,'evolution');act(s,'evolve',a=>evolve?!!a.baseUid:!a.baseUid);drain(s);assert.equal(!!s.players[0].battle.find(y=>y.uid===x.uid).under?.length,evolve);}});
test('hand-count condition includes the card itself and is lost after hand decreases',()=>{const{s,x}=prepare('dmrp11-042');fulfill(s,0,x.cardId);assert.equal(s.players[0].hand.length,6);assert.ok(free(s,x).length);s.players[0].grave.push(s.players[0].hand.pop());assert.equal(free(s,x).length,0);});
test('race conditions include visible noncreature elements, not their buried or hidden cards',()=>{
 const{s,x}=prepare('dm16-042');const d=data.cards.find(c=>c.type==='seed'&&c.race?.includes('サイバーロード'));assert.ok(d);put(s,1,d.id);assert.ok(free(s,x).length);
});
test('real hand race grants immediately affect G-Zero eligibility on the battlefield',()=>{const{s,x}=prepare('dmex17-138');put(s,0,'dm01-108');assert.equal(free(s,x).length,0);const rapia=put(s,0,'dmx21-058');assert.ok(free(s,x).length);rapia.g35Ignored=s.turn;assert.equal(free(s,x).length,0);});
test('Genmu ignores spell effects without forbidding G-Zero casting; grave locks prevent use',()=>{
 const{s,x}=prepare('dmr10-050');fulfill(s,0,x.cardId);put(s,1,GEN);assert.ok(free(s,x).length);const n=s.players[0].mana.length;act(s,'play',a=>a.uid===x.uid&&a.freeSummon==='G・ゼロ');drain(s);assert.equal(s.players[0].mana.length,n);
 const t=prepare('dm16-046');fulfill(t.s,0,t.x.cardId);t.s.players[0].hand=[];t.s.players[0].grave.push(t.x);put(t.s,0,'dm25rp1-006');const lock=data.cards.find(c=>c.g277GraveLock);assert.ok(lock);put(t.s,1,lock.id);assert.equal(free(t.s,t.x).length,0);
});
test('Dul Golghini optionally shields the chosen opponent and can decline',()=>{for(const choose of [true,false]){const s=setup(),target=put(s,1,'dm01-108'),x=inst('dm24rp3-029');s.players[0].hand.push(x);act(s,'play',a=>a.uid===x.uid&&!a.alternative&&!a.g7Payment?.energy?.length);assert.equal(s.decision.player,0);pick(s,choose?target:null);drain(s);assert.equal(s.players[1].shields.some(y=>y.uid===target.uid),choose);}});
test('Inferno Gate revives a non-evolution creature and excludes evolution cards',()=>{const s=setup(),target=inst('dm01-108'),evo=inst('dmr06-005');s.players[0].grave.push(target,evo);const x=inst('dm19-027');s.players[0].hand.push(x);act(s,'play',a=>a.uid===x.uid);assert.ok(!s.decision.choices.some(c=>c.value?.uid===evo.uid));pick(s,target);drain(s);assert.ok(s.players[0].battle.some(y=>y.uid===target.uid));assert.ok(s.players[0].grave.some(y=>y.uid===evo.uid));});
test('CPU analyses are immutable and ignore opposing hidden identities',()=>{const{s,x}=prepare('dm16-046');fulfill(s,0,x.cardId);const saved=JSON.stringify(s),ranking=e.rankHeuristicActions(s);e.analyzeAI(s);e.chooseAI(s);assert.equal(JSON.stringify(s),saved);for(const z of ['hand','deck','shields'])s.players[1][z].forEach(y=>y.cardId=GEN);assert.deepEqual(e.rankHeuristicActions(s),ranking);});
test('permission to summon creatures from mana never permits casting a G-Zero spell',()=>{for(const source of ['dmrp18-s09','dm22rp2-S8']){const{s,x}=prepare('dmr10-050');fulfill(s,0,x.cardId);s.players[0].hand=[];s.players[0].mana.push(x);put(s,0,source);assert.equal(free(s,x).length,0);}});
test('Dul Golghini HyperEnergy taps distinct costs and pays two remaining light mana',()=>{const s=setup();give(s,0,'battle',['dm23sd1-014','dm23rp3-005']);give(s,0,'mana',['dm01-075','dm01-075']);give(s,0,'hand',['dm24rp3-029']);const [a,b]=s.players[0].battle;act(s,'play',x=>x.alternative==='hyperEnergy');pick(s,a);pick(s,b);pick(s,false);drain(s);assert.ok(a.tapped&&b.tapped);assert.ok(s.players[0].battle.some(x=>x.cardId==='dm24rp3-029'));assert.equal(s.players[0].mana.filter(x=>x.tapped).length,2);});
test('Dul Golghini S-trigger summons without mana and offers its optional shield effect',()=>{const s=setup();s.active=1;give(s,0,'mana',[]);give(s,0,'shields',['dm24rp3-029']);put(s,1,'dm01-108');s.phase='attack';act(s,'attack',a=>a.target==='player');act(s,'noBlock');act(s,'useTrigger');drain(s);assert.ok(s.players[0].battle.some(x=>x.cardId==='dm24rp3-029'));assert.equal(s.metrics[0].triggers,1);});
for(const [i,deck] of STANDARD396_DECKS.entries())test('new legal forty CPU game preserves eighty physical cards and JSON continuation '+i,()=>{
 let s=e.createGame([deck,STANDARD396_DECKS[(i+1)%3]],{seed:39601+i,first:i%2}),restored=false;const before=physical(s);
 while(s.winner===null&&s.actions<1800&&s.turn<160){const action=e.chooseAI(s);assert.ok(action);e.step(s,action);assert.deepEqual(physical(s),before);assert.equal(new Set(physical(s)).size,80);if(!restored&&s.actions>20){s=JSON.parse(JSON.stringify(s));restored=true;}}
 assert.ok(restored);assert.notEqual(s.winner,null);
});
