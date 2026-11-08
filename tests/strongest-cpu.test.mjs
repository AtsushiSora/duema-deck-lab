import test from 'node:test';import assert from 'node:assert/strict';
import {STRONGEST_BUILD_VERSION,strongestDeckKey,analyzeStrongestTarget,buildStrongestCPU,validStrongestBuild,arrangeStrongestCPU,normalizeStrongestLearning,learnStrongestDefeat} from '../dist/strongest-cpu.js';
import {e,PRESETS,data,snapshot} from './target-fixture.mjs';import {createCatalogue} from '../dist/catalogue.js';import {resolveEnvironmentDecks} from '../dist/environment.js';import {resolveStarter25Decks} from '../dist/starter25.js';
const registry=createCatalogue(snapshot,data.cards),seeds=[...PRESETS,...resolveEnvironmentDecks(registry),...resolveStarter25Decks(registry)],signature=d=>JSON.stringify(d.cards.map(r=>[r.id,r.count]).sort());
test('the cache key tracks card counts and rules, not a deck name, tags or row order',()=>{const a=structuredClone(PRESETS[0]),b={...structuredClone(a),name:'別名',tags:['完成']};b.cards.reverse();assert.equal(strongestDeckKey(a),strongestDeckKey(b));b.cards[0].count--;assert.notEqual(strongestDeckKey(a),strongestDeckKey(b));assert.ok(analyzeStrongestTarget(a).priorities.length);});
test('counterbuilding produces a tailored legal forty, changes by matchup and never changes any registered deck',()=>{const before=JSON.stringify([PRESETS,seeds,data]),a=buildStrongestCPU(PRESETS[0],seeds,data.cards),b=buildStrongestCPU(seeds.find(d=>/墓地ソース/.test(d.name)),seeds,data.cards);assert.equal(a.version,STRONGEST_BUILD_VERSION);assert.equal(a.deck.cards.reduce((n,r)=>n+r.count,0),40);assert.deepEqual(e.validateDeck(a.deck),[]);assert.ok(validStrongestBuild(a,PRESETS[0]));assert.ok(!validStrongestBuild(a,PRESETS[1]));assert.ok(!seeds.some(d=>signature(d)===signature(a.deck)),'constructs a new list rather than merely selecting a preset');assert.notEqual(signature(a.deck),signature(b.deck));assert.equal(JSON.stringify([PRESETS,seeds,data]),before);assert.deepEqual(buildStrongestCPU(PRESETS[0],seeds,data.cards).deck,a.deck);});
test('invalid cards, missing seeds and stale or malformed cache entries cannot launch a CPU match',()=>{assert.throws(()=>buildStrongestCPU({cards:[]},seeds,data.cards),/40枚/);assert.throws(()=>buildStrongestCPU(PRESETS[0],[],data.cards),/基になる/);const b=buildStrongestCPU(PRESETS[0],PRESETS,data.cards);assert.ok(!validStrongestBuild({...b,version:999},PRESETS[0]));b.deck.cards[0].count--;assert.ok(!validStrongestBuild(b,PRESETS[0]));});
test('CPU arrangement preserves every physical card, leaves human cards and both shield sets untouched and uses CPU information only',()=>{
 const build=buildStrongestCPU(PRESETS[0],seeds,data.cards),s=e.createGame([PRESETS[0],build.deck],{seed:7}),before=structuredClone(s),other=structuredClone(s),uids=e.physicalCards(s).map(x=>x.uid).sort(),counts=e.physicalCards(s).map(x=>x.cardId).sort();other.players[0].hand.reverse();other.players[0].deck.reverse();other.players[0].shields.reverse();other.players[1].hand.reverse();other.players[1].deck.reverse();const a=arrangeStrongestCPU(s),b=arrangeStrongestCPU(other);assert.deepEqual(a,b);assert.deepEqual(s.players[0],before.players[0]);assert.deepEqual(s.players[1].shields,before.players[1].shields);assert.equal(s.players[1].hand.length,5);assert.equal(s.players[1].deck.length,30);assert.deepEqual(e.physicalCards(s).map(x=>x.uid).sort(),uids);assert.deepEqual(e.physicalCards(s).map(x=>x.cardId).sort(),counts);assert.equal(new Set(uids).size,80);assert.equal(s.rng,before.rng);
});
test('arranged games retain legal choices, card conservation and JSON resume through opening turns for either first player',()=>{
 const build=buildStrongestCPU(PRESETS[0],PRESETS,data.cards);for(const first of[0,1]){let s=e.createGame([PRESETS[0],build.deck],{seed:102,first});arrangeStrongestCPU(s);s.strongestCPU={key:build.key,version:1};for(let n=0;n<65&&s.turn<6&&s.winner===null;n++){const actions=e.getLegalActions(s),a=e.chooseAI(s);assert.ok(actions.some(x=>x.id===a.id));e.step(s,a);assert.equal(new Set(e.physicalCards(s).map(x=>x.uid)).size,80);if(n===10){s=JSON.parse(JSON.stringify(s));assert.ok(e.getLegalActions(s).length||s.winner!==null);}}}
});

function defeat(target,build,id,{game='loss-one',winner=0}={}){
 return {manualGame:game,strongestCPU:build,decks:[target,build.deck],state:{winner,metrics:[{played:{[id]:3},turns:3,breaks:5},{played:{},turns:2}],log:[{player:0,type:'attack',cardId:id},{player:0,type:'draw',cardId:target.cards.at(-1).id}],get players(){throw Error('hidden zones must not be inspected');}}};
}
test('defeat feedback uses actual public plays, ignores hidden draws and other outcomes, and is idempotent and bounded',()=>{
 const target=PRESETS[0],build=buildStrongestCPU(target,seeds,data.cards),id=target.cards[0].id,battle=defeat(target,build,id),before=JSON.stringify([target,build]);
 const learned=learnStrongestDefeat(undefined,battle);assert.equal(learned.revision,1);assert.equal(learned.losses,1);assert.deepEqual(learned.threats.map(x=>x.id),[id]);assert.ok(Object.values(learned.weights).some(n=>n>0));assert.equal(learnStrongestDefeat(learned,battle),learned);assert.equal(learnStrongestDefeat(learned,defeat(target,build,id,{winner:1})),learned);assert.equal(learnStrongestDefeat(learned,{...battle,strongestCPU:null}),learned);assert.equal(JSON.stringify([target,build]),before);
 let feedback=learned;for(let n=0;n<40;n++)feedback=learnStrongestDefeat(feedback,defeat(target,build,id,{game:'loss-'+n}));assert.equal(feedback.losses,41);assert.equal(feedback.games.length,32);assert.ok(feedback.failed.length<=8);assert.ok(feedback.threats.length<=12);assert.ok(feedback.threats.every(x=>x.score<=100));assert.ok(Object.values(feedback.weights).every(n=>Number.isFinite(n)&&n<=2));
 assert.equal(normalizeStrongestLearning(feedback,PRESETS[1]).revision,0);assert.deepEqual(normalizeStrongestLearning({key:strongestDeckKey(target),revision:NaN,weights:{rush:Infinity},threats:[{id:'unknown',score:9}]},target).threats,[]);
});
test('a loss changes the learned matchup and counter list, preserves legal forty and invalidates only older revisions',()=>{
 const target=PRESETS[0],initial=buildStrongestCPU(target,seeds,data.cards),feedback=learnStrongestDefeat(undefined,defeat(target,initial,target.cards[0].id)),before=JSON.stringify([initial,feedback,seeds]);
 const next=buildStrongestCPU(target,seeds,data.cards,{learning:feedback,previousBuild:initial});assert.equal(next.learningRevision,1);assert.notEqual(signature(next.deck),signature(initial.deck));assert.deepEqual(e.validateDeck(next.deck),[]);assert.equal(next.deck.cards.reduce((n,r)=>n+r.count,0),40);assert.ok(validStrongestBuild(next,target,feedback));assert.ok(!validStrongestBuild(initial,target,feedback));assert.ok(validStrongestBuild(initial,target));assert.equal(JSON.stringify([initial,feedback,seeds]),before);assert.notDeepEqual(next.profile.weights,initial.profile.weights);
 const roundTwo=learnStrongestDefeat(feedback,defeat(target,next,target.cards.at(-1).id,{game:'loss-two'})),again=buildStrongestCPU(target,seeds,data.cards,{learning:roundTwo,previousBuild:next});assert.equal(again.learningRevision,2);assert.notEqual(signature(again.deck),signature(next.deck));assert.deepEqual(e.validateDeck(again.deck),[]);assert.ok(!validStrongestBuild(next,target,roundTwo));
});

// Isolate earlier card additions from newer options competing for the same deck slots.
const beforeSmallCreatureResponse=data.cards.filter(c=>c.supportBatch!=='phase-632');
const beforeDarkControl=beforeSmallCreatureResponse.filter(c=>c.supportBatch!=='phase-631');
const beforeHandDeployment=beforeDarkControl.filter(c=>c.supportBatch!=='phase-630');
const beforeDrawTempo=beforeHandDeployment.filter(c=>c.supportBatch!=='phase-629');
const beforeRecoveryDefense=beforeDrawTempo.filter(c=>c.supportBatch!=='phase-628');
const beforeAttackDefense=beforeRecoveryDefense.filter(c=>c.supportBatch!=='phase-627');
const beforeRemovalResponses=beforeAttackDefense.filter(c=>c.supportBatch!=='phase-626');
const beforeDiscardResponses=beforeRemovalResponses.filter(c=>c.supportBatch!=='phase-625');
const beforeEntryResponses=beforeDiscardResponses.filter(c=>c.supportBatch!=='phase-624');
const beforeSpellBoardResponses=beforeEntryResponses.filter(c=>c.supportBatch!=='phase-623');
const beforeCombatResponses=beforeSpellBoardResponses.filter(c=>c.supportBatch!=='phase-622');
const beforeDeploymentResponses=beforeCombatResponses.filter(c=>c.supportBatch!=='phase-621');
const beforeNeoCounters=beforeDeploymentResponses.filter(c=>c.supportBatch!=='phase-620');
const beforeExecutionTax=beforeNeoCounters.filter(c=>c.supportBatch!=='phase-619');
const beforeShieldPressure=beforeExecutionTax.filter(c=>c.supportBatch!=='phase-618');
const beforeElementRemoval=beforeShieldPressure.filter(c=>c.supportBatch!=='phase-617');
const beforeRepeatedDeployment=beforeElementRemoval.filter(c=>c.supportBatch!=='phase-616');
const beforeAttackPressure=beforeRepeatedDeployment.filter(c=>c.supportBatch!=='phase-615');
const beforeGraveNameCounters=beforeAttackPressure.filter(c=>c.supportBatch!=='phase-614');
const beforeNewBlockerCounters=beforeGraveNameCounters.filter(c=>c.supportBatch!=='phase-613');
const beforeSmallBoardCounters=beforeNewBlockerCounters.filter(c=>c.supportBatch!=='phase-612');
const beforeUntappedCounters=beforeSmallBoardCounters.filter(c=>c.supportBatch!=='phase-611');
const beforeResourceCounters=beforeUntappedCounters.filter(c=>c.supportBatch!=='phase-610');
const beforeTempoCounters=beforeResourceCounters.filter(c=>c.supportBatch!=='phase-609');
const beforeLargeRemoval=beforeTempoCounters.filter(c=>c.supportBatch!=='phase-608');
const beforeOffHandCounters=beforeLargeRemoval.filter(c=>c.supportBatch!=='phase-607');
const beforeFastDefense=beforeOffHandCounters.filter(c=>c.supportBatch!=='phase-606');
const beforeSpellHandDisruption=beforeFastDefense.filter(c=>c.supportBatch!=='phase-605');
const beforeHandBoardDisruption=beforeSpellHandDisruption.filter(c=>c.supportBatch!=='phase-604');
const beforeOpeningRamps=beforeHandBoardDisruption.filter(c=>c.supportBatch!=='phase-603');
const beforeDefensiveTriggers=beforeOpeningRamps.filter(c=>c.supportBatch!=='phase-602');
const beforeBlockerCounters=beforeDefensiveTriggers.filter(c=>!['phase-599','phase-601'].includes(c.supportBatch));
const beforeNewGraveCounters=beforeBlockerCounters.filter(c=>c.supportBatch!=='phase-598');
const beforeSwarmResponses=beforeNewGraveCounters.filter(c=>c.supportBatch!=='phase-596');
const beforeSpellResponses=beforeSwarmResponses.filter(c=>c.supportBatch!=='phase-595');
const earlierPool=beforeSpellResponses.filter(c=>!['phase-592','phase-600'].includes(c.supportBatch));
test('the earlier counter pool uses entry and grave counters in compatible matchups',()=>{
 const targets=[
  [seeds.find(d=>d.id==='env-scs9-niigata-rose'),'dmrp18-042'],
  [seeds.find(d=>d.id==='env-barom-practice'),'promoy22-014']
 ];
 for(const [target,id] of targets){
  const build=buildStrongestCPU(target,seeds,earlierPool);
  assert.ok(build.deck.cards.some(r=>r.id===id),e.card(id).name);
  assert.deepEqual(e.validateDeck(build.deck),[]);
 }
});


test('the strongest CPU adopts the new counters against spell chains and expensive deployment',()=>{
 const matchups=[
  ['env-gospel-practice',['promoy16-063']],
  ['practice-rg',['dmrp12-017']],
  ['practice-wu',['dmrp20-048']],
  ['env-gp2026-grimoire',['dm24rp4-S09','dmrp06-024']]
 ];
 for(const [targetId,expected] of matchups){
  const target=seeds.find(d=>d.id===targetId);
  const build=buildStrongestCPU(target,seeds,targetId==='env-gospel-practice'?beforeSpellResponses:beforeSwarmResponses);
  assert.deepEqual(e.validateDeck(build.deck),[]);
  for(const id of expected)assert.ok(build.deck.cards.some(r=>r.id===id),e.card(id).name);
 }
});

test('the earlier counter pool uses 防鎧 and ハチ公 against discard-heavy decks',()=>{
 const target=seeds.find(d=>d.id==='starter25-06');
 const build=buildStrongestCPU(target,seeds,earlierPool);
 assert.ok(build.profile.counts.discard>=12);
 assert.deepEqual(e.validateDeck(build.deck),[]);
 for(const id of ['dmbd04-003','dmr03-027'])assert.ok(build.deck.cards.some(r=>r.id===id),e.card(id).name);
 const idle={cards:[{id:'dm11-043',count:4},{id:'dmx18-032',count:4},{id:'dmbd04-003',count:4}]};
 assert.equal(analyzeStrongestTarget(idle).counts.discard,0);
 const threat=target.cards.find(r=>analyzeStrongestTarget({cards:[r]}).counts.discard)?.id;
 assert.ok(threat);
 assert.ok(learnStrongestDefeat(undefined,defeat(target,build,threat)).weights.discard>0);
});

test('the earlier pool selects all three grave counters across compatible matchups',()=>{
 const cases=[
  ['env-scs9-niigata-rose','dmrp20-020'],
  ['starter25-13','dm25rp1-051'],
  ['env-abyss-practice','dm24ex4-075']
 ];
 for(const [targetId,id] of cases){
  const target=seeds.find(d=>d.id===targetId);
  const build=buildStrongestCPU(target,seeds,beforeNewGraveCounters);
  assert.ok(build.profile.weights.grave>=.5);
  assert.deepEqual(e.validateDeck(build.deck),[]);
  assert.ok(build.deck.cards.some(r=>r.id===id),e.card(id).name);
 }
});

test('the earlier attack counters are selected against aggressive matchups',()=>{
 const cases=[
  ['starter25-23',['dm25rp2-023']],
  ['env-viride-practice',['dmrp10-103','dmr21-084']]
 ];
 for(const [targetId,ids] of cases){
  const target=seeds.find(d=>d.id===targetId);
  const build=buildStrongestCPU(target,seeds,beforeSwarmResponses);
  assert.ok(build.profile.weights.rush>=.6);
  assert.deepEqual(e.validateDeck(build.deck),[]);
  for(const id of ids)assert.ok(build.deck.cards.some(r=>r.id===id),e.card(id).name);
 }
});

test('フィオナ remains an available counter against spell-heavy マジック and 水魔導具',()=>{
 for(const targetId of ['env-magic-practice','env-water-mado-practice']){
  const target=seeds.find(d=>d.id===targetId);
  const build=buildStrongestCPU(target,seeds,targetId==='env-water-mado-practice'?beforeSpellHandDisruption:beforeUntappedCounters);
  assert.ok(build.profile.weights.spells>=.5);
  assert.deepEqual(e.validateDeck(build.deck),[]);
  assert.ok(build.deck.cards.some(r=>r.id==='dm25ex4-S01'));
 }
});

test('the pool before blocker counters selects sweep counters suited to the opposing deck',()=>{
 const matchups=[
  ['starter25-11','dm26rp3-069'],
  ['starter25-14','dm26rp3-069'],
  ['practice-wu','dm23rp2-019'],
  ['env-viride-practice','dmrp14-043']
 ];
 for(const [targetId,id] of matchups){
  const target=seeds.find(d=>d.id===targetId);
  const build=buildStrongestCPU(target,seeds,beforeBlockerCounters);
  assert.deepEqual(e.validateDeck(build.deck),[]);
  assert.ok(build.deck.cards.some(r=>r.id===id),e.card(id).name);
 }
});

test('the pool before blocker counters adopts creature-trigger counters against Dragon Girls',()=>{
 const target=seeds.find(d=>d.id==='starter25-08');
 const build=buildStrongestCPU(target,seeds,beforeBlockerCounters);
 assert.deepEqual(build.profile.shieldTriggers,{all:14,spell:0,creature:14});
 assert.deepEqual(e.validateDeck(build.deck),[]);
 for(const id of ['dm37-035','dm27-051'])assert.ok(build.deck.cards.some(r=>r.id===id),e.card(id).name);
 assert.ok(!build.deck.cards.some(r=>r.id==='dmr07-022'));
});

test('the earlier pool selects grave counters against 墓地ソース and アビス',()=>{
 const matchups=[
  ['env-scs9-niigata-rose',['dm25rp3-018','dmex02-009']],
  ['env-abyss-practice',['dmex02-009']]
 ];
 for(const [targetId,ids] of matchups){
  const target=seeds.find(d=>d.id===targetId);
  const build=buildStrongestCPU(target,seeds,beforeOffHandCounters);
  assert.deepEqual(e.validateDeck(build.deck),[]);
  for(const id of ids)assert.ok(build.deck.cards.some(r=>r.id===id),e.card(id).name);
 }
});

test('the earlier blocker counters provide removal and unblockable attacks against defensive decks',()=>{
 const matchups=[
  ['env-heavens-practice',['dm23ex3-021','dm23rp4-063']],
  ['starter25-20',['dm23ex3-021','dmrp19-024']]
 ];
 for(const [targetId,ids] of matchups){
  const target=seeds.find(d=>d.id===targetId);
  const build=buildStrongestCPU(target,seeds,beforeNewBlockerCounters);
  assert.ok(build.profile.counts.blocks>=10);
  assert.deepEqual(e.validateDeck(build.deck),[]);
  for(const id of ids)assert.ok(build.deck.cards.some(r=>r.id===id),e.card(id).name);
 }
});

test('the strongest CPU counters expensive creatures that can come out early',()=>{
 const cases=[
  ['env-gp2026-pinky',['dm25rp1-034']],
  ['starter25-17',['dm25rp1-034','dm25rp4-056']]
 ];
 for(const [targetId,ids] of cases){
  const target=seeds.find(d=>d.id===targetId);
  const build=buildStrongestCPU(target,seeds,targetId==='env-gp2026-pinky'?beforeOpeningRamps:beforeUntappedCounters);
  assert.ok(build.profile.counts.earlyDeployment>=15);
  assert.deepEqual(e.validateDeck(build.deck),[]);
  for(const id of ids)assert.ok(build.deck.cards.some(r=>r.id===id),e.card(id).name);
 }
 const cheap=seeds.find(d=>d.id==='practice-rg');
 const build=buildStrongestCPU(cheap,seeds,data.cards);
 assert.ok(build.profile.counts.earlyDeployment<9);
 assert.ok(!build.deck.cards.some(r=>r.id==='dm25rp1-034'||r.id==='dm25rp4-056'));
});

test('the strongest CPU favors non-multicolored removal when most enemy creatures are eligible',()=>{
 const galaxy=seeds.find(d=>d.id==='starter25-22');
 const build=buildStrongestCPU(galaxy,seeds,beforeDefensiveTriggers);
 assert.equal(build.profile.counts.nonMultiBody,40);
 assert.deepEqual(e.validateDeck(build.deck),[]);
 for(const id of ['dmr21-025','dmr04-023'])assert.ok(build.deck.cards.some(r=>r.id===id),e.card(id).name);
 const zard=seeds.find(d=>d.id==='env-zard-practice');
 const other=buildStrongestCPU(zard,seeds,data.cards);
 assert.ok(other.profile.counts.nonMultiBody<26);
 assert.ok(!other.deck.cards.some(r=>['dmr21-025','dmr04-023'].includes(r.id)));
});

test('the strongest CPU uses R・R・R against fast decks and keeps the deck legal',()=>{
 for(const id of ['practice-rg','starter25-22']){
  const target=seeds.find(d=>d.id===id);
  const build=buildStrongestCPU(target,seeds,beforeHandBoardDisruption);
  assert.equal(build.profile.weights.rush,1);
  assert.ok(build.deck.cards.some(r=>r.id==='dm25rp1-011'));
  assert.deepEqual(e.validateDeck(build.deck),[]);
 }
});

test('the strongest CPU chooses ジェネシス against decks with low-cost support elements',()=>{
 for(const id of ['starter25-18','env-lionel-practice']){
  const target=seeds.find(d=>d.id===id);
  const build=buildStrongestCPU(target,seeds,beforeHandBoardDisruption);
  assert.ok(build.profile.counts.cheapSupport>=10);
  assert.ok(build.deck.cards.some(r=>r.id==='dm25rp4-048'));
  assert.deepEqual(e.validateDeck(build.deck),[]);
 }
 const target=seeds.find(d=>d.id==='practice-rg');
 const build=buildStrongestCPU(target,seeds,beforeHandBoardDisruption);
 assert.equal(build.profile.counts.cheapSupport,0);
 assert.ok(!build.deck.cards.some(r=>r.id==='dm25rp4-048'));
});

test('the strongest CPU selects hand and board disruption for appropriate matchups',()=>{
 const matchups=[
  ['starter25-18','dm25rp1-023'],
  ['starter25-15','dm24rp4-049'],
  ['env-bande-practice','dmrp14-027']
 ];
 for(const [targetId,id] of matchups){
  const target=seeds.find(d=>d.id===targetId);
  // Keep the disruption checks separate from the later entry cap and removal strategies.
  const pool=targetId==='env-bande-practice'?beforeRepeatedDeployment:beforeElementRemoval;
  const build=buildStrongestCPU(target,seeds,pool);
  assert.deepEqual(e.validateDeck(build.deck),[]);
  assert.ok(build.deck.cards.some(r=>r.id===id),e.card(id).name);
 }
});

test('the strongest CPU takes ドゥモグラ against spell-rich ゴスペル and 水魔導具',()=>{
 for(const id of ['env-gospel-practice','env-water-mado-practice']){
  const target=seeds.find(d=>d.id===id);
  const build=buildStrongestCPU(target,seeds,data.cards);
  assert.deepEqual(e.validateDeck(build.deck),[]);
  assert.ok(build.deck.cards.some(r=>r.id==='dmex14-050'));
 }
});

test('the strongest CPU selects クリスタント・バーナミア against aggressive decks',()=>{
 for(const id of ['practice-rg','env-magic-practice']){
  const target=seeds.find(d=>d.id===id);
  const build=buildStrongestCPU(target,seeds,id==='practice-rg'?beforeUntappedCounters:beforeAttackDefense);
  assert.deepEqual(e.validateDeck(build.deck),[]);
  assert.ok(build.deck.cards.some(r=>r.id==='dmrp12-038'));
 }
});

test('the strongest CPU targets off-hand entries and noncreature support in the relevant matchups',()=>{
 const cases=[
  ['env-complex-practice','dm25rp2-022'],
  ['env-abyss-practice','dm25rp2-022'],
  ['env-lionel-practice','dm25rp4-072']
 ];
 for(const [targetId,id] of cases){
  const build=buildStrongestCPU(seeds.find(d=>d.id===targetId),seeds,targetId==='env-abyss-practice'?beforeEntryResponses:targetId==='env-complex-practice'?beforeDiscardResponses:data.cards);
  assert.deepEqual(e.validateDeck(build.deck),[]);
  assert.ok(build.deck.cards.some(r=>r.id===id),e.card(id).name);
 }
 const fast=buildStrongestCPU(seeds.find(d=>d.id==='practice-rg'),seeds,data.cards);
 assert.ok(fast.profile.counts.offHandEntry<10);
 assert.ok(!fast.deck.cards.some(r=>r.id==='dm25rp2-022'));
});

test('the strongest CPU brings MAX triggers against decks with many large creatures',()=>{
 const pinky=seeds.find(d=>d.id==='env-gp2026-pinky'),hachiko=seeds.find(d=>d.id==='starter25-11');
 const older=buildStrongestCPU(pinky,seeds,beforeTempoCounters);
 assert.deepEqual(e.validateDeck(older.deck),[]);
 for(const id of ['dmrp15-022','dmrp15-023'])assert.ok(older.deck.cards.some(r=>r.id===id),e.card(id).name);
 for(const [target,id] of [[pinky,'dmrp15-022'],[hachiko,'dmrp15-023']]){
  const build=buildStrongestCPU(target,seeds,target===hachiko?beforeAttackDefense:data.cards);
  assert.deepEqual(e.validateDeck(build.deck),[]);
  assert.ok(build.deck.cards.some(r=>r.id===id),e.card(id).name);
 }
});

test('the strongest CPU uses tempo counters against fast evolutions, Mach Fighters and cheap support',()=>{
 const matchups=[
  ['env-nationals2025-dotto','dmr08s-004'],
  ['env-kenji-gp2024-maiken','dmex08-046'],
  ['starter25-15','dm23sd3-012']
 ];
 for(const [targetId,id] of matchups){
  const target=seeds.find(d=>d.id===targetId);
  const build=buildStrongestCPU(target,seeds,targetId==='starter25-15'?beforeElementRemoval:targetId==='env-kenji-gp2024-maiken'?beforeRemovalResponses:data.cards);
  assert.deepEqual(e.validateDeck(build.deck),[]);
  assert.ok(build.deck.cards.some(r=>r.id===id),e.card(id).name);
 }
 const slow=buildStrongestCPU(seeds.find(d=>d.id==='env-water-mado-practice'),seeds,data.cards);
 assert.ok(slow.profile.counts.fastEntry+slow.profile.counts.machEntry<=7);
 assert.ok(!slow.deck.cards.some(r=>e.card(r.id).g609TapEntry));
});

test('the strongest CPU selects the new spell and resource counters for compatible decks',()=>{
 const matchups=[
  ['env-gospel-practice','dm09-013'],
  ['env-dark-mado-practice','dmr13-014'],
  ['starter25-06','dm24rp4-054'],
  ['env-barom-practice','dmr17-014']
 ];
 for(const [targetId,id] of matchups){
  const target=seeds.find(d=>d.id===targetId);
  const build=buildStrongestCPU(target,seeds,targetId==='starter25-06'?beforeDiscardResponses:data.cards);
  assert.deepEqual(e.validateDeck(build.deck),[]);
  assert.ok(build.deck.cards.some(r=>r.id===id),e.card(id).name);
 }
});

test('the strongest CPU picks untapped removal and shield defense for compatible matchups',()=>{
 const matchups=[
  ['starter25-07','dmrp05-035'],
  ['env-magic-practice','dmr17-044'],
  ['env-giant-practice','dmrp06-020'],
  ['env-gp2026-sara','dmrp12-006']
 ];
 for(const [targetId,id] of matchups){
  const target=seeds.find(d=>d.id===targetId);
  const pool=targetId==='env-magic-practice'?beforeNeoCounters:targetId==='starter25-07'?beforeCombatResponses:targetId==='env-gp2026-sara'?beforeDiscardResponses:data.cards;
  const build=buildStrongestCPU(target,seeds,pool);
  assert.deepEqual(e.validateDeck(build.deck),[]);
  assert.ok(build.deck.cards.some(r=>r.id===id),e.card(id).name);
 }
});

test('the strongest CPU selects the new sweepers against low-power or low-cost creatures',()=>{
 const matchups=[
  ['practice-rg','dm22sd1-007'],
  ['env-kenji-gp2024-maiken','dm24rp3-018'],
  ['starter25-11','dmrp06-028']
 ];
 for(const [targetId,id] of matchups){
  const target=seeds.find(d=>d.id===targetId);
  const build=buildStrongestCPU(target,seeds,targetId==='practice-rg'?beforeSmallCreatureResponse:data.cards);
  assert.deepEqual(e.validateDeck(build.deck),[]);
  assert.ok(build.deck.cards.some(r=>r.id===id),e.card(id).name);
 }
 const spellDeck=seeds.find(d=>d.id==='env-gospel-practice');
 const build=buildStrongestCPU(spellDeck,seeds,data.cards);
 assert.ok(!build.deck.cards.some(r=>e.card(r.id).supportBatch==='phase-612'));
});

test('the strongest CPU selects the new blocker answers against appropriate decks',()=>{
 const matchups=[
  ['env-heavens-practice','dmr01-064'],
  ['starter25-20','dmrp05-023'],
  ['env-nationals2025-denne','dm23rp1-036'],
  ['env-complex-practice','dm25rp2-069']
 ];
 for(const [targetId,id] of matchups){
  const target=seeds.find(d=>d.id===targetId);
  const build=buildStrongestCPU(target,seeds,targetId==='env-heavens-practice'?beforeExecutionTax:beforeSpellBoardResponses);
  assert.ok(build.profile.counts.blocks>=10);
  assert.deepEqual(e.validateDeck(build.deck),[]);
  assert.ok(build.deck.cards.some(r=>r.id===id),e.card(id).name);
 }
 const target=seeds.find(d=>d.id==='practice-rg');
 const build=buildStrongestCPU(target,seeds,data.cards);
 assert.ok(!build.deck.cards.some(r=>e.card(r.id).supportBatch==='phase-613'));
});

test('the strongest CPU chooses grave and matching-name counters for compatible decks',()=>{
 const matchups=[
  ['starter25-24',['dm38-018','dm30-013']],
  ['starter25-16',['dm14-025']]
 ];
 for(const [targetId,ids] of matchups){
  const target=seeds.find(d=>d.id===targetId);
  const build=buildStrongestCPU(target,seeds,data.cards);
  assert.deepEqual(e.validateDeck(build.deck),[]);
  for(const id of ids)assert.ok(build.deck.cards.some(r=>r.id===id),e.card(id).name);
 }
 const target=seeds.find(d=>d.id==='practice-rg');
 const build=buildStrongestCPU(target,seeds,data.cards);
 assert.ok(!build.deck.cards.some(r=>e.card(r.id).supportBatch==='phase-614'));
});

test('the strongest CPU attacks before 8-axis Gacharobo can establish its large creatures',()=>{
 const target=seeds.find(d=>d.id==='starter25-10');
 const build=buildStrongestCPU(target,seeds,data.cards);
 assert.deepEqual(e.validateDeck(build.deck),[]);
 const picks=Object.fromEntries(build.deck.cards.map(r=>[r.id,r.count]));
 for(const id of ['dm25ex2-007','dmr17-024','dmrp14-044'])assert.ok(picks[id]>0,e.card(id).name);
 assert.ok(picks['dmrp14-044']<=2);
 const rush=buildStrongestCPU(seeds.find(d=>d.id==='practice-rg'),seeds,data.cards);
 assert.ok(!rush.deck.cards.some(r=>e.card(r.id).supportBatch==='phase-615'));
});

test('the strongest CPU picks a two-entry cap for batch, invasion and creature trigger decks',()=>{
 const matchups=[
  ['env-bande-practice','dm26ex2-019'],
  ['starter25-23','dm23rp1-027'],
  ['starter25-08','dmrp14-013']
 ];
 for(const [targetId,id] of matchups){
  const target=seeds.find(d=>d.id===targetId);
  const pool=targetId==='starter25-23'?beforeNeoCounters:targetId==='env-bande-practice'?beforeEntryResponses:data.cards;
  const build=buildStrongestCPU(target,seeds,pool);
  assert.deepEqual(e.validateDeck(build.deck),[]);
  assert.ok(build.deck.cards.some(r=>r.id===id),e.card(id).name);
 }
 const target=seeds.find(d=>d.id==='practice-rg');
 const build=buildStrongestCPU(target,seeds,data.cards);
 assert.ok(!build.deck.cards.some(r=>e.card(r.id).g616EntryLimit));
});

test('the strongest CPU picks element removal for Mecha, Samurai and Lionel decks',()=>{
 const matchups=[
  ['starter25-19','dm23rp3-022'],
  ['starter25-18','dm25rp1-068'],
  ['starter25-15','dm25sp1-012']
 ];
 for(const [targetId,id] of matchups){
  const target=seeds.find(d=>d.id===targetId);
  const build=buildStrongestCPU(target,seeds,targetId==='starter25-15'?beforeExecutionTax:targetId==='starter25-18'?beforeRemovalResponses:targetId==='starter25-19'?beforeRecoveryDefense:data.cards);
  assert.deepEqual(e.validateDeck(build.deck),[]);
  assert.ok(build.deck.cards.some(r=>r.id===id),e.card(id).name);
 }
 const target=seeds.find(d=>d.id==='practice-rg');
 const build=buildStrongestCPU(target,seeds,data.cards);
 assert.ok(!build.deck.cards.some(r=>e.card(r.id).supportBatch==='phase-617'));
});

test('the strongest CPU picks shield pressure suited to each opposing deck',()=>{
 const matchups=[
  ['starter25-21','dmrp18-s07'],
  ['starter25-08','dmsp02-002'],
  ['starter25-02','dm33-033']
 ];
 for(const [targetId,id] of matchups){
  const target=seeds.find(d=>d.id===targetId);
  const build=buildStrongestCPU(target,seeds,targetId==='starter25-02'?beforeHandDeployment:data.cards);
  assert.deepEqual(e.validateDeck(build.deck),[]);
  assert.ok(build.deck.cards.some(r=>r.id===id),e.card(id).name);
 }
 const target=seeds.find(d=>d.id==='practice-rg');
 const build=buildStrongestCPU(target,seeds,data.cards);
 assert.ok(!build.deck.cards.some(r=>e.card(r.id).supportBatch==='phase-618'));
});

test('the strongest CPU counters early multicolor cards, Tamaseeds and spell-heavy decks',()=>{
 const matchups=[
  ['starter25-03','dmrp22-009','earlyMultiExecution',12],
  ['starter25-15','dm22rp2-009','seedOnly',10],
  ['starter25-05','dm25rp2-017','spellOnly',28]
 ];
 for(const [targetId,id,signal,min] of matchups){
  const target=seeds.find(d=>d.id===targetId);
  const build=buildStrongestCPU(target,seeds,targetId==='starter25-15'?beforeRemovalResponses:data.cards);
  assert.deepEqual(e.validateDeck(build.deck),[]);
  assert.ok(build.profile.counts[signal]>=min);
  assert.ok(build.deck.cards.some(r=>r.id===id),e.card(id).name);
  const colors=e.civilizations(e.card(id));
  for(const color of colors)assert.ok(build.deck.cards.reduce((n,row)=>n+(e.civilizations(e.card(row.id)).includes(color)?row.count:0),0)>=8);
  const game=e.createGame([target,build.deck],{seed:619,first:0});
  assert.ok(arrangeStrongestCPU(game).opening.includes(id),e.card(id).name);
 }
 const target=seeds.find(d=>d.id==='practice-rg');
 const build=buildStrongestCPU(target,seeds,data.cards);
 assert.ok(!build.deck.cards.some(r=>e.card(r.id).g619Tax));
});

test('the strongest CPU chooses the new G-NEO cards for their matchups',()=>{
 const matchups=[
  ['env-viride-practice','promoy24-062'],
  ['env-magic-practice','dm25rp2-028'],
  ['starter25-12','promoy24-005'],
  ['starter25-23','dm25rp1-019']
 ];
 for(const [targetId,id] of matchups){
  const target=seeds.find(d=>d.id===targetId);
  const build=buildStrongestCPU(target,seeds,data.cards);
  assert.deepEqual(e.validateDeck(build.deck),[]);
  assert.ok(build.deck.cards.some(r=>r.id===id),e.card(id).name);
  const [color]=e.civilizations(e.card(id));
  assert.ok(build.deck.cards.reduce((n,row)=>n+(e.civilizations(e.card(row.id)).includes(color)?row.count:0),0)>=8);
 }
 const target=seeds.find(d=>d.id==='practice-rg');
 assert.ok(!buildStrongestCPU(target,seeds,data.cards).deck.cards.some(r=>e.card(r.id).supportBatch==='phase-620'));
});

test('the strongest CPU uses G-NEO deployment responses suited to the opposing deck',()=>{
 const matchups=[
  ['env-bande-practice','dm25rp2-002'],
  ['env-heavens-practice','dm25rp1-012'],
  ['env-giant-practice','dm25rp1-014']
 ];
 for(const [targetId,id] of matchups){
  const target=seeds.find(d=>d.id===targetId);
  const build=buildStrongestCPU(target,seeds,data.cards);
  assert.deepEqual(e.validateDeck(build.deck),[]);
  assert.ok(build.deck.cards.some(r=>r.id===id),e.card(id).name);
  const [color]=e.civilizations(e.card(id));
  assert.ok(build.deck.cards.reduce((n,r)=>n+(e.civilizations(e.card(r.id)).includes(color)?r.count:0),0)>=8);
 }
 const target=seeds.find(d=>d.id==='practice-rg');
 assert.ok(!buildStrongestCPU(target,seeds,data.cards).deck.cards.some(r=>e.card(r.id).supportBatch==='phase-621'));
});

test('the strongest CPU selects the new combat cards for compatible opposing decks',()=>{
 const matchups=[
  ['starter25-03','dm25rp3-008'],
  ['starter25-07','dm23rp1-031'],
  ['starter25-22','dm30-037']
 ];
 for(const [targetId,id] of matchups){
  const target=seeds.find(d=>d.id===targetId);
  const build=buildStrongestCPU(target,seeds,beforeSpellBoardResponses);
  assert.deepEqual(e.validateDeck(build.deck),[]);
  assert.ok(build.deck.cards.some(r=>r.id===id),e.card(id).name);
  for(const color of e.civilizations(e.card(id))){
   const sources=build.deck.cards.reduce((n,r)=>n+(e.civilizations(e.card(r.id)).includes(color)?r.count:0),0);
   assert.ok(sources>=8,e.card(id).name+' '+color);
  }
 }
 const target=seeds.find(d=>d.id==='env-gospel-practice');
 assert.ok(!buildStrongestCPU(target,seeds,beforeSpellBoardResponses).deck.cards.some(r=>e.card(r.id).supportBatch==='phase-622'));
});


test('the strongest CPU drafts the new spell-linked creatures for distinct matchups',()=>{
 for(const [targetId,id] of [['env-gp2026-yoshikawa','dmrp20-001'],['starter25-16','dmrp20-002']]){
  const target=seeds.find(d=>d.id===targetId);
  const build=buildStrongestCPU(target,seeds,data.cards);
  assert.deepEqual(e.validateDeck(build.deck),[]);
  assert.ok(build.deck.cards.some(r=>r.id===id),e.card(id).name);
  const [color]=e.civilizations(e.card(id));
  assert.ok(build.deck.cards.reduce((n,r)=>n+(e.manaCivilizations(e.card(r.id)).includes(color)?r.count:0),0)>=8);
  assert.ok(build.deck.cards.reduce((n,r)=>n+(e.playFaces(e.card(r.id)).some(f=>f.type==='spell')?r.count:0),0)>=8);
 }
 const target=seeds.find(d=>d.id==='env-magic-practice');
 assert.ok(!buildStrongestCPU(target,seeds,data.cards).deck.cards.some(r=>e.card(r.id).supportBatch==='phase-623'));
});


test('the strongest CPU drafts and prepares the new entry responses for distinct matchups',()=>{
 for(const [targetId,id] of [['env-bande-practice','dm22rp1-044'],['env-abyss-practice','dm26ex4-083']]){
  const target=seeds.find(d=>d.id===targetId),build=buildStrongestCPU(target,seeds,data.cards);
  assert.deepEqual(e.validateDeck(build.deck),[]);
  assert.ok(build.deck.cards.some(r=>r.id===id),e.card(id).name);
  const [color]=e.civilizations(e.card(id));
  assert.ok(build.deck.cards.reduce((n,r)=>n+(e.manaCivilizations(e.card(r.id)).includes(color)?r.count:0),0)>=8);
  const game=e.createGame([target,build.deck],{seed:624,first:0});
  assert.ok(arrangeStrongestCPU(game).opening.includes(id),e.card(id).name);
 }
 const target=seeds.find(d=>d.id==='practice-rg');
 assert.ok(!buildStrongestCPU(target,seeds,data.cards).deck.cards.some(r=>e.card(r.id).supportBatch==='phase-624'));
});


test('the strongest CPU adds the new hand protection in appropriate matchups',()=>{
 for(const [targetId,id] of [['starter25-06','dm24rp2-031'],['env-gp2026-sara','dm23rp2-029']]){
  const target=seeds.find(d=>d.id===targetId),build=buildStrongestCPU(target,seeds,data.cards);
  assert.deepEqual(e.validateDeck(build.deck),[]);
  assert.ok(build.deck.cards.some(r=>r.id===id),e.card(id).name);
  assert.ok(build.deck.cards.reduce((n,r)=>n+(e.manaCivilizations(e.card(r.id)).includes('光')?r.count:0),0)>=8);
 }
 const target=seeds.find(d=>d.id==='practice-rg');
 assert.ok(!buildStrongestCPU(target,seeds,data.cards).deck.cards.some(r=>e.card(r.id).supportBatch==='phase-625'));
});


test('the strongest CPU drafts the new removal triggers for different opposing boards',()=>{
 for(const [targetId,id] of [['starter25-18','dm22rp2-042'],['starter25-25','dm24ex4-058']]){
  const target=seeds.find(d=>d.id===targetId),build=buildStrongestCPU(target,seeds,data.cards);
  assert.deepEqual(e.validateDeck(build.deck),[]);
  assert.ok(build.deck.cards.some(r=>r.id===id),e.card(id).name);
  for(const color of e.civilizations(e.card(id))){
   const sources=build.deck.cards.reduce((n,r)=>n+(e.manaCivilizations(e.card(r.id)).includes(color)?r.count:0),0);
   assert.ok(sources>=8,e.card(id).name+' '+color);
  }
 }
 const target=seeds.find(d=>d.id==='env-gospel-practice');
 assert.ok(!buildStrongestCPU(target,seeds,data.cards).deck.cards.some(r=>e.card(r.id).supportBatch==='phase-626'));
});


test('the strongest CPU chooses attack defense for fast and heavy opposing decks',()=>{
 for(const [targetId,id] of [['starter25-23','dm24rp3-061'],['starter25-11','dm23rp1-S1']]){
  const target=seeds.find(d=>d.id===targetId),build=buildStrongestCPU(target,seeds,data.cards);
  assert.deepEqual(e.validateDeck(build.deck),[]);
  assert.ok(build.deck.cards.some(r=>r.id===id),e.card(id).name);
  const [color]=e.civilizations(e.card(id));
  const sources=build.deck.cards.reduce((n,r)=>n+(e.manaCivilizations(e.card(r.id)).includes(color)?r.count:0),0);
  assert.ok(sources>=8);
 }
 const target=seeds.find(d=>d.id==='env-gospel-practice');
 assert.ok(!buildStrongestCPU(target,seeds,data.cards).deck.cards.some(r=>e.card(r.id).supportBatch==='phase-627'));
});


test('the strongest CPU drafts new recovery triggers for distinct opposing boards',()=>{
 for(const [targetId,id] of [['starter25-19','dm25rp3-036'],['starter25-17','dm26rp2-057']]){
  const target=seeds.find(d=>d.id===targetId),build=buildStrongestCPU(target,seeds,data.cards);
  assert.deepEqual(e.validateDeck(build.deck),[]);
  assert.ok(build.deck.cards.some(r=>r.id===id),e.card(id).name);
  const [color]=e.civilizations(e.card(id));
  assert.ok(build.deck.cards.reduce((n,r)=>n+(e.manaCivilizations(e.card(r.id)).includes(color)?r.count:0),0)>=8);
 }
 const target=seeds.find(d=>d.id==='env-gospel-practice');
 assert.ok(!buildStrongestCPU(target,seeds,data.cards).deck.cards.some(r=>e.card(r.id).supportBatch==='phase-628'));
});

test('the strongest CPU drafts Magician against small attackers and Echo with playable follow-ups',()=>{
 const matchup=[['starter25-09','dm25rp2-015'],['practice-rg','dm25rp3-037']];
 for(const [targetId,id] of matchup){
  const target=seeds.find(d=>d.id===targetId),build=buildStrongestCPU(target,seeds,data.cards);
  assert.deepEqual(e.validateDeck(build.deck),[]);
  assert.ok(build.deck.cards.some(r=>r.id===id),e.card(id).name);
  assert.ok(build.deck.cards.reduce((n,r)=>n+(e.manaCivilizations(e.card(r.id)).includes('水')?r.count:0),0)>=8);
  if(id==='dm25rp3-037'){
   const targets=build.deck.cards.filter(r=>e.playFaces(e.card(r.id)).some(f=>f.type!=='creature'&&Number(f.cost)<=3));
   assert.ok(targets.reduce((n,r)=>n+r.count,0)>=6);
  }
 }
 const target=seeds.find(d=>d.id==='env-gospel-practice');
 assert.ok(!buildStrongestCPU(target,seeds,data.cards).deck.cards.some(r=>e.card(r.id).supportBatch==='phase-629'));
});

test('the strongest CPU drafts Advent and Noval with usable follow-ups for distinct matchups',()=>{
 for(const [targetId,id] of [['env-gp2026-pinky','dm26rp1-056'],['starter25-02','dm26rp3-014']]){
  const target=seeds.find(d=>d.id===targetId),build=buildStrongestCPU(target,seeds,data.cards);
  assert.deepEqual(e.validateDeck(build.deck),[]);
  assert.ok(build.deck.cards.some(r=>r.id===id),e.card(id).name);
  assert.ok(build.deck.cards.reduce((n,r)=>n+(e.manaCivilizations(e.card(r.id)).includes('光')?r.count:0),0)>=8);
  const advent=id==='dm26rp1-056';
  const eligible=build.deck.cards.filter(r=>e.playFaces(e.card(r.id)).some(f=>
   Number(f.cost)<=3&&(advent?f.type!=='creature':f.type==='creature'&&!f.evolution)));
  assert.ok(eligible.reduce((n,r)=>n+r.count,0)>=(advent?6:10));
 }
 const target=seeds.find(d=>d.id==='env-gospel-practice');
 assert.ok(!buildStrongestCPU(target,seeds,data.cards).deck.cards.some(r=>e.card(r.id).supportBatch==='phase-630'));
});

test('the strongest CPU drafts sealing against few Commands and destruction for a graveyard deck',()=>{
 for(const [targetId,id] of [['starter25-16','dm25ex4-058'],['env-complex-practice','dm25rp4-068']]){
  const target=seeds.find(d=>d.id===targetId),build=buildStrongestCPU(target,seeds,data.cards);
  assert.deepEqual(e.validateDeck(build.deck),[]);
  assert.ok(build.deck.cards.some(r=>r.id===id),e.card(id).name);
  assert.ok(build.deck.cards.reduce((n,r)=>n+(e.manaCivilizations(e.card(r.id)).includes('闇')?r.count:0),0)>=8);
  if(id==='dm25rp4-068'){
   const graveSupport=build.deck.cards.filter(r=>e.playFaces(e.card(r.id)).some(f=>
    /自分の墓地から/.test(f.text||'')||f.graveCast||f.graveSummon||f.mugenCrime||f.abyssRush||f.fushigibirth));
   assert.ok(graveSupport.reduce((n,r)=>n+r.count,0)>=6);
  }
 }
 const target=seeds.find(d=>d.id==='env-gospel-practice');
 assert.ok(!buildStrongestCPU(target,seeds,data.cards).deck.cards.some(r=>e.card(r.id).supportBatch==='phase-631'));
});

test('the strongest CPU drafts the new small-creature answers with suitable allies',()=>{
 for(const [targetId,id] of [['practice-rg','dm26ex1-N020'],['starter25-22','dm26-050']]){
  const target=seeds.find(d=>d.id===targetId),build=buildStrongestCPU(target,seeds,data.cards);
  assert.deepEqual(e.validateDeck(build.deck),[]);
  assert.ok(build.deck.cards.some(r=>r.id===id),e.card(id).name);
  const beetle=id==='dm26ex1-N020';
  const allies=build.deck.cards.filter(r=>r.id!==id&&e.playFaces(e.card(r.id)).some(f=>f.type==='creature'&&
   (beetle?Number(f.power)>=12000:Number(f.cost)<=3&&Number(f.power)<=5000)));
  assert.ok(allies.reduce((n,r)=>n+r.count,0)>=(beetle?6:10));
  for(const color of e.civilizations(e.card(id)))
   assert.ok(build.deck.cards.reduce((n,r)=>n+(e.manaCivilizations(e.card(r.id)).includes(color)?r.count:0),0)>=8);
 }
 const target=seeds.find(d=>d.id==='env-gospel-practice');
 assert.ok(!buildStrongestCPU(target,seeds,data.cards).deck.cards.some(r=>e.card(r.id).supportBatch==='phase-632'));
});
