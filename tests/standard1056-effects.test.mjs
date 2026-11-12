import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const NINPO='dm25rp1-032', PARNY='dm25rp4-037', BATTAN='dm25rp1-043', ANGO='dm25rp1-036';
const LIGHT='dm01-075', WATER='dm01-083', DARK='dm01-090', FIRE='dm01-097', GREEN='dm01-108';
const SONG='dm25rp2-058', SEEK='dm25rp2-063', STAR='dmrp17-074', GNEO='dm25rp1-S06';
const ONIKAMASU='dmrp01-041', BAIKEN='dm29-s02', MULTI='dmrp13-050';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
const restore=s=>decodeBattleData(encodeBattleData(s));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const live=(s,p,z,x)=>s.players[p][z].find(y=>y.uid===x.uid);
const order=(s,id)=>act(s,'orderEffect',a=>s.pendingEffects.find(x=>x.effectId===a.effectId)?.source===id);

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

test('Official faces, one printing each, use limits, base colors, art and full compiled effects',()=>{
 const manifest=read('tools/support-phase-1056.json'),cat=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 const ids=[NINPO,PARNY,BATTAN,ANGO],bases=[['光','水','闇'],['水','闇','火'],['光','火','自然'],['水','闇','火']];
 assert.deepEqual(manifest.cards.map(x=>x.id),ids);
 assert.deepEqual(manifest.printAliases,[]);
 for(const [i,row] of manifest.cards.entries()){
  const f=row.faces[0],c=e.card(row.id);
  assert.equal(cat.get(row.id).id,row.id);
  assert.ok(cat.get(row.id).supported&&row.verification.facesMatched);
  assert.deepEqual([c.cost,c.power,c.race,c.manaValue,e.civilizations(c),c.limit],
   [f.cost,Number(f.powerText),f.race,1,f.civilizations,manifest.regulationVerification.limits[row.id]]);
  assert.ok(c.trigger&&c.evolvedEntryOnly);
  assert.deepEqual(c.neoEvolution.any,bases[i].map(civilization=>({civilization})));
  assert.deepEqual(details.cards.find(x=>x.id===row.id).faces,row.faces);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[row.id,row.image]]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[row.id]);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1056}),row.spec);
  assert.throws(()=>standardCardSpec({...row,status:'complete'},{phase:1055}));
 }
});

for(const id of [NINPO,PARNY,BATTAN,ANGO])test(id+' can use the Shield Trigger with or without evolving',()=>{
 for(const evolve of [false,true]){
  let s=field();
  const attacker=add(s,0,'battle',FIRE),enemyHand=add(s,0,'hand',LIGHT);
  const base=add(s,1,'battle',id===BATTAN?GREEN:WATER),top=s.players[1].deck[0];
  give(s,1,'shields',[id]);
  const shield=s.players[1].shields[0],all=physical(s);
  attack(s,attacker.uid);
  if(s.decision?.type==='block')act(s,'noBlock');
  if(s.decision?.type==='breakChoice')act(s,'breakShields',a=>a.shields.includes(shield.uid));
  act(s,'useTrigger',a=>a.uid===shield.uid);
  s=restore(s);
  act(s,'triggerEvolve',a=>a.baseUid===(evolve?base.uid:undefined));
  if(evolve){
   assert.equal(s.decision.player,id===PARNY?0:1);
   pick(s,id===ANGO?0:id===BATTAN?1:attacker.uid);
  }
  assert.equal(s.decision,null);
  const body=live(s,1,'battle',shield);
  assert.ok(body);
  assert.equal(e.isEvolution(body),evolve);
  assert.equal(live(s,0,'hand',attacker)?.uid,evolve&&id===NINPO?attacker.uid:undefined);
  assert.equal(live(s,0,'grave',attacker)?.uid,evolve&&id===PARNY?attacker.uid:undefined);
  assert.equal(live(s,1,'mana',top)?.uid,evolve&&id===BATTAN?top.uid:undefined);
  assert.equal(live(s,0,'grave',enemyHand)?.uid,evolve&&id===ANGO?enemyHand.uid:undefined);
  assert.ok(s.players[1].mana.every(x=>!x.tapped));
  assert.deepEqual(physical(s),all);
 }
});

test('Ninpo is optional and respects the target protection of an opposing creature',()=>{
 const s=field(),base=add(s,0,'battle',LIGHT);
 const protectedCard=add(s,1,'battle',ONIKAMASU),other=add(s,1,'battle',FIRE);
 summon(s,NINPO,base);
 assert.deepEqual(values(s),[other.uid,null]);
 pick(s,null);
 assert.ok(live(s,1,'battle',protectedCard)&&live(s,1,'battle',other));
});

test('Ninpo can return a mixed-ownership evolution stack to the original hands',()=>{
 let s=field();
 const base=add(s,0,'battle',NINPO),under=inst(WATER);
 const target=add(s,1,'battle',ANGO,{cardOwner:0,under:[under]});
 const host=summon(s,SONG,base),all=physical(s);
 order(s,NINPO);
 s=restore(s);
 pick(s,target.uid);
 pick(s,0);
 assert.ok(live(s,0,'hand',target)&&live(s,1,'hand',under));
 assert.ok(live(s,0,'battle',host).under.some(x=>x.uid===base.uid));
 assert.deepEqual(physical(s),all);
});

test('Ninpo applies Star and G-NEO leave replacements while preserving the departing cards’ owners',()=>{
 for(const [id,kind] of [[STAR,'replaceStar'],[GNEO,'replaceGneo']]){
  const s=field(),base=add(s,0,'battle',WATER);
  const under=Object.assign(inst(DARK),{cardOwner:0});
  const target=add(s,1,'battle',id,{cardOwner:0,under:[under]});
  summon(s,NINPO,base);
  const all=physical(s);
  pick(s,target.uid);
  const replacement=e.getLegalActions(s).find(a=>a.kind===kind);
  if(replacement)act(s,kind);
  const returned=id===STAR?target:under,remaining=id===STAR?under:target;
  assert.ok(live(s,0,'hand',returned)&&live(s,1,'battle',remaining));
  assert.deepEqual(physical(s),all);
 }
});

test('Parny makes the opponent select their own creature even if it has opposing-effect target protection',()=>{
 const s=field(),base=add(s,0,'battle',PARNY),other=add(s,1,'battle',FIRE),protectedCard=add(s,1,'battle',ONIKAMASU);
 const host=summon(s,SEEK,base);
 order(s,PARNY);
 assert.equal(s.decision.player,1);
 assert.deepEqual(values(s),[other.uid,protectedCard.uid]);
 pick(s,protectedCard.uid);
 pick(s,null);
 assert.ok(live(s,1,'grave',protectedCard)&&live(s,1,'battle',other));
 assert.ok(host.under.includes(base));
});

test('Parny respects the opponent’s EX Life replacement for the chosen creature',()=>{
 const s=field(),base=add(s,0,'battle',WATER),shield=s.players[1].shields[0];
 const target=add(s,1,'battle','dm23ex2-016',{exLifeShieldUid:shield.uid});
 summon(s,PARNY,base);
 pick(s,target.uid);
 drain(s);
 assert.ok(live(s,1,'battle',target)&&live(s,1,'grave',shield));
 assert.ok(!live(s,1,'grave',target));
});

test('Battan may decline ramp as the entrant and place multicolor mana tapped as the base',()=>{
 const s=field();
 const land=add(s,0,'battle',GREEN),multicolor=inst(MULTI);
 s.players[0].deck.unshift(multicolor);
 const body=summon(s,BATTAN,land);
 pick(s,0);
 assert.equal(s.players[0].deck[0].uid,multicolor.uid);
 assert.equal(e.effectiveCard(body,s).breaker,2);
 const host=summon(s,BATTAN,body),all=physical(s);
 const entries=s.pendingEffects.filter(x=>x.source===BATTAN);
 act(s,'orderEffect',a=>entries.find(x=>x.effectId===a.effectId)?.uid===body.uid);
 pick(s,1);
 pick(s,0);
 assert.ok(live(s,0,'mana',multicolor).tapped);
 assert.ok(host.under.includes(body));
 assert.deepEqual(physical(s),all);
});

test('An evolved Battan can attack that turn and break two shields',()=>{
 const s=field(),base=add(s,0,'battle',GREEN);
 const body=summon(s,BATTAN,base);
 pick(s,0);
 attack(s,body.uid);
 drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('Angolmore chooses a hidden hand slot without exposing identity and respects discard replacements',()=>{
 let s=field();
 const base=add(s,0,'battle',ANGO),baiken=add(s,1,'hand',BAIKEN),other=add(s,1,'hand',LIGHT);
 summon(s,SEEK,base);
 order(s,ANGO);
 assert.equal(s.decision.player,0);
 assert.deepEqual(values(s),[0,1]);
 assert.ok(s.decision.choices.every(c=>c.cardId==null&&c.score===0));
 s=restore(s);
 pick(s,0);
 assert.equal(s.decision.player,1);
 pick(s,true);
 assert.equal(s.decision.task.op,'bounceAny');
 pick(s,null);
 drain(s);
 assert.ok(live(s,1,'battle',baiken)&&!live(s,1,'grave',baiken));
 assert.ok(live(s,1,'hand',other));
});
