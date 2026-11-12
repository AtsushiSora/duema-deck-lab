import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const COUNT='dm25rp3-033', TOTTORO='dm25rp3-039', TURBO='promoy24-063', BAZAGA='dm25rp2-073';
const LIGHT='dm01-075', WATER='dm01-083', DARK='dm01-090', FIRE='dm01-097', GREEN='dm01-108';
const NINPO='dm25rp1-032', SONG='dm25rp2-058', BATTAN='dm25rp1-043', SIX='dm25rp2-S02';
const BLOCKER='dm01-076', SPELL='dm01-027', TWIN='dmrp05-002', APPLE='dmrp22-042';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
const restore=s=>decodeBattleData(encodeBattleData(s));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const live=(s,p,z,x)=>s.players[p][z].find(y=>y.uid===x.uid);
const order=(s,id)=>act(s,'orderEffect',a=>s.pendingEffects.find(x=>x.effectId===a.effectId)?.source===id);
const tapped=s=>s.players[0].mana.filter(x=>x.tapped);

function add(s,p,z,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][z].push(x);
 return x;
}
function field(){
 const s=setup();
 for(const p of [0,1]){
  give(s,p,'deck',Array(12).fill(GREEN));
  give(s,p,'grave',[]);
 }
 return s;
}
function summon(s,id,base){
 const x=add(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 act(s,'evolve',a=>a.baseUid===base?.uid);
 return x;
}
function end(s){
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
}

test('Four complete official definitions, plus two print IDs sharing canonical deck slots and limits',()=>{
 const m=read('tools/support-phase-1057.json'),cat=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 const bases=[['光','水','闇'],['水','闇','火'],['闇','火','自然'],['光','火','自然']];
 const costs=[{cost:2,civilizations:['水']},{cost:3,civilizations:['闇']},{cost:1,civilizations:['火']},undefined];
 assert.deepEqual(m.cards.map(x=>x.id),[COUNT,TOTTORO,TURBO,BAZAGA]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[['dm25ex3-041',TOTTORO],['dm25rp3-044',TURBO]]);
 for(const [i,row] of m.cards.entries()){
  const f=row.faces[0],c=e.card(row.id);
  assert.equal(cat.get(row.id).id,row.id);
  assert.ok(cat.get(row.id).supported&&row.verification.facesMatched);
  assert.deepEqual([c.cost,c.power,c.race,c.manaValue,e.civilizations(c),c.limit],
   [f.cost,Number(f.powerText),f.race,1,f.civilizations,m.regulationVerification.limits[row.id]]);
  assert.deepEqual(c.neoEvolution.any,bases[i].map(civilization=>({civilization})));
  assert.deepEqual(c.ddd,costs[i]);
  assert.deepEqual(details.cards.find(x=>x.id===row.id).faces,row.faces);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[row.id,row.image]]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[row.id]);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1057}),row.spec);
 }
 for(const alt of m.printAliases){
  const canonical=m.cards.find(x=>x.id===alt.canonicalId);
  assert.equal(cat.get(alt.id).id,canonical.id);
  assert.deepEqual(alt.faces,canonical.faces);
  assert.deepEqual(alt.spec,canonical.spec);
  assert.equal(m.regulationVerification.limits[alt.id],m.regulationVerification.limits[canonical.id]);
  assert.deepEqual(refs.filter(x=>x.id===alt.id).map(x=>[x.canonicalId,x.image]),[[canonical.id,alt.image]]);
  assert.deepEqual(cat.resolveRows([{id:alt.id,count:2},{id:canonical.id,count:2}]),[{id:canonical.id,count:4}]);
 }
});

for(const [id,baseId,manaId,cost] of [[COUNT,WATER,WATER,2],[TOTTORO,FIRE,DARK,3],[TURBO,GREEN,FIRE,1]]){
 test(id+' supports normal and evolved DDD while preserving the chosen attack',()=>{
  for(const evolved of [false,true]){
   let s=field();
   give(s,0,'mana',[manaId,...Array(cost-1).fill(LIGHT)]);
   const x=add(s,0,'hand',id),base=add(s,0,'battle',baseId),wrong=add(s,0,'battle',id===COUNT?FIRE:LIGHT);
   const all=physical(s);
   attack(s,base.uid);
   act(s,'declareDDD',a=>a.uid===x.uid);
   assert.equal(tapped(s).length,0);
   assert.ok(!e.getLegalActions(s).some(a=>a.kind==='summonDDD'&&a.baseUid===wrong.uid));
   s=restore(s);
   act(s,'summonDDD',a=>a.uid===x.uid&&a.baseUid===(evolved?base.uid:undefined)&&a.cost===cost);
   assert.equal(tapped(s).length,cost);
   assert.equal(s.attack.attacker,evolved?x.uid:base.uid);
   const unit=live(s,0,'battle',x);
   assert.equal(e.isEvolution(unit),evolved);
   assert.equal(unit.tapped,evolved);
   drain(s);
   assert.equal(s.players[1].shields.length,4);
   assert.deepEqual(physical(s),all);
  }
 });
}
test('DDD stays unpayable without the printed civilization and can be declined without spending mana',()=>{
 for(const [id,baseId] of [[COUNT,WATER],[TOTTORO,FIRE],[TURBO,GREEN]]){
  const s=field();
  give(s,0,'mana',Array(5).fill(LIGHT));
  const x=add(s,0,'hand',id),base=add(s,0,'battle',baseId);
  attack(s,base.uid);
  act(s,'declareDDD',a=>a.uid===x.uid);
  assert.ok(!e.getLegalActions(s).some(a=>a.kind==='summonDDD'));
  act(s,'skipDDDSummon');
  drain(s);
  assert.equal(tapped(s).length,0);
  assert.ok(live(s,0,'hand',x));
 }
});

test('Count may recover a Twinpact via its spell side and can decline the same effect as the base',()=>{
 let s=field();
 const base=add(s,0,'battle',LIGHT);
 const twin=add(s,0,'grave',TWIN),spell=add(s,0,'grave',SPELL),creature=add(s,0,'grave',DARK);
 const enemySpell=add(s,1,'grave',SPELL);
 const count=summon(s,COUNT,base);
 assert.deepEqual(values(s),[twin.uid,spell.uid,null]);
 s=restore(s);
 pick(s,twin.uid);
 assert.ok(live(s,0,'hand',twin)&&live(s,0,'grave',creature)&&live(s,1,'grave',enemySpell));
 const host=summon(s,SONG,live(s,0,'battle',count));
 order(s,COUNT);
 assert.deepEqual(values(s),[spell.uid,null]);
 pick(s,null);
 pick(s,0);
 assert.ok(live(s,0,'grave',spell)&&host.under.some(y=>y.uid===count.uid));
});

test('Tottoro may put a qualifying creature from its own grave into play without paying its summon cost',()=>{
 const s=field(),base=add(s,0,'battle',FIRE),light=add(s,0,'battle',LIGHT);
 const ninja=add(s,0,'grave',NINPO),big=add(s,0,'grave',BATTAN),spell=add(s,0,'grave',SPELL);
 const enemy=add(s,1,'grave',DARK),victim=add(s,1,'battle',WATER);
 const top=summon(s,TOTTORO,base),all=physical(s);
 assert.deepEqual(values(s),[ninja.uid,null]);
 pick(s,ninja.uid);
 assert.ok(values(s).includes(light.uid));
 pick(s,light.uid);
 pick(s,victim.uid);
 assert.ok(live(s,0,'battle',ninja).under.includes(light));
 assert.ok(live(s,0,'battle',top)&&live(s,0,'grave',big)&&live(s,0,'grave',spell)&&live(s,1,'grave',enemy));
 assert.ok(live(s,1,'hand',victim));
 assert.equal(tapped(s).length,e.card(TOTTORO).cost);
 assert.deepEqual(physical(s),all);
});

test('Tottoro’s base trigger can revive a creature and respects grave-zone restrictions',()=>{
 for(const blocked of [false,true]){
  const s=field(),base=add(s,0,'battle',TOTTORO),victim=add(s,0,'grave',FIRE);
  if(blocked)add(s,1,'battle',APPLE);
  const host=summon(s,SONG,base);
  order(s,TOTTORO);
  if(!blocked)pick(s,victim.uid);
  pick(s,0);
  assert.equal(!!live(s,0,'battle',victim),!blocked);
  assert.equal(!!live(s,0,'grave',victim),blocked);
  assert.ok(host.under.includes(base));
 }
});

test('Turbo can decline destruction, then destroy only an opposing blocker as an evolution base',()=>{
 const s=field(),base=add(s,0,'battle',FIRE),ally=add(s,0,'battle',BLOCKER);
 const enemy=add(s,1,'battle',BLOCKER),ordinary=add(s,1,'battle',WATER);
 const turbo=summon(s,TURBO,base);
 assert.deepEqual(values(s),[enemy.uid,null]);
 pick(s,null);
 const host=summon(s,BATTAN,turbo);
 order(s,TURBO);
 assert.deepEqual(values(s),[enemy.uid,null]);
 pick(s,enemy.uid);
 pick(s,0);
 assert.ok(host.under.includes(turbo)&&live(s,1,'grave',enemy));
 assert.ok(live(s,0,'battle',ally)&&live(s,1,'battle',ordinary));
});

test('Sixfall under a normal creature or a NEO creature observes the two Turbo rulings',()=>{
 for(const hostId of [WATER,TURBO]){
  const s=field(),base=add(s,0,'battle',TURBO),host=add(s,0,'battle',hostId),target=add(s,1,'battle',BLOCKER);
  s.active=1;
  const six=add(s,1,'hand',SIX),all=physical(s);
  act(s,'play',a=>a.uid===six.uid);
  assert.equal(s.decision.player,0);
  pick(s,host.uid);
  pick(s,base.uid);
  assert.equal(s.decision.player,1);
  pick(s,null);
  if(hostId===TURBO){
   assert.equal(s.decision.player,0);
   assert.deepEqual(values(s),[target.uid,null]);
   pick(s,target.uid);
  }
  drain(s);
  assert.ok(host.under.includes(base));
  assert.equal(!!live(s,1,'grave',target),hostId===TURBO);
  assert.deepEqual(physical(s),all);
 }
});

test('Bazaga permits untapped targets when evolved and grants its later evolution the same ability for the turn',()=>{
 const s=field(),base=add(s,0,'battle',GREEN),enemy=add(s,1,'battle',WATER);
 const bazaga=summon(s,BAZAGA,base);
 assert.equal(e.effectiveCard(bazaga,s).breaker,2);
 s.phase='attack';
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===bazaga.uid&&a.target===enemy.uid));
 s.phase='main';
 const next=summon(s,BATTAN,bazaga);
 order(s,BAZAGA);
 pick(s,0);
 s.phase='attack';
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===next.uid&&a.target===enemy.uid));
 end(s);
 end(s);
 s.phase='attack';
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===next.uid&&a.target===enemy.uid));
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===next.uid&&a.target==='player'));
});

test('An ordinary Bazaga does not gain the untapped-target ability',()=>{
 const s=field(),enemy=add(s,1,'battle',WATER),body=summon(s,BAZAGA);
 assert.equal(s.decision,null);
 end(s);
 end(s);
 s.phase='attack';
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===body.uid&&a.target==='player'));
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===body.uid&&a.target===enemy.uid));
 attack(s,body.uid);
 drain(s);
 assert.equal(s.players[1].shields.length,3);
});
