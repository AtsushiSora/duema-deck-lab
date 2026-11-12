import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const SAX='dm25rp2-029',ULPHEUS='dm25bd1-005',GAUL='dm25rp2-S04';
const LIGHT='dm01-075',WATER='dm01-083',DARK='dm01-090',FIRE='dm01-097',GREEN='dm01-108';
const SEED='dmsd20-015',GENJI='dmex17-036',BOLSHACK='dm24bd1-001';
const RED_SPELL='dm01-102',WHITE_TWIN='dmex06-024',DARK_SPELL='dm01-027',STRATO='dm22rp2-048';
const DEMON='dm01-s05',DEMON_EVO='dmx20-003',GNEO='dm25rp2-017',EXPENSIVE='dm25rp3-S09';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
const restore=s=>decodeBattleData(encodeBattleData(s));
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const ids=(s,p,z)=>s.players[p][z].map(x=>x.uid);
const battle=(s,p,x)=>s.players[p].battle.find(y=>y.uid===x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();

function add(s,p,z,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][z].push(x);
 return x;
}
function summon(s,id,base){
 const x=add(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 act(s,'evolve',a=>a.baseUid===base?.uid);
 return x;
}
function order(s,predicate){
 act(s,'orderEffect',a=>s.pendingEffects.some(q=>q.effectId===a.effectId&&predicate(q)));
}
function end(s){
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
}

test('Three official cards and five print variants keep original IDs, art, stats and deck limits',()=>{
 const m=read('tools/support-phase-1062.json'),cat=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(c=>c.id),[SAX,ULPHEUS,GAUL]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[
  ['promoy24-043',SAX],['dm25bd1-SP3',ULPHEUS],['dm25rp2-Sec05',GAUL],['dm25ex3-rp2S04',GAUL],['dm25ex3-rp2Sec05',GAUL]
 ]);
 for(const row of m.cards){
  const c=e.card(row.id),f=row.faces[0];
  assert.ok(cat.get(row.id).supported&&row.verification.facesMatched);
  assert.equal(cat.get(row.id).id,row.id);
  assert.deepEqual([c.cost,c.power,c.race,c.manaValue,e.civilizations(c),c.limit,c.breaker],
   [f.cost,Number(f.powerText),f.race,1,f.civilizations,4,2]);
  assert.deepEqual(details.cards.find(x=>x.id===row.id).faces,row.faces);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1062}),row.spec);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[row.id]);
 }
 for(const row of m.printAliases){
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1062}),m.cards.find(c=>c.id===row.canonicalId).spec);
  assert.deepEqual(cat.resolveRows([{id:row.id,count:2},{id:row.canonicalId,count:2}]),[{id:row.canonicalId,count:4}]);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[row.canonicalId,row.image]]);
 }
});

test('Sax taps every opposing creature and locks one start untap, including already tapped and protected creatures',()=>{
 const s=setup();
 const targets=[add(s,1,'battle','dmrp01-041'),add(s,1,'battle',DARK,{tapped:true})];
 const seed=add(s,1,'battle',SEED),ally=add(s,0,'battle',LIGHT);
 give(s,0,'deck',[FIRE,GREEN,DARK_SPELL,WATER]);
 const sx=summon(s,SAX,ally);
 order(s,x=>x.source===SAX&&x.effect==='entry');
 assert.ok(targets.every(x=>x.tapped&&x.skipUntap));
 assert.equal(seed.tapped,false);
 assert.equal(seed.skipUntap,undefined);
 const [raid]=s.players[0].deck.filter(x=>x.cardId===GREEN);
 assert.deepEqual(new Set(values(s)),new Set([raid.uid,null]));
 pick(s,raid.uid);
 drain(s);
 assert.deepEqual(battle(s,0,sx).under.map(x=>x.uid),[ally.uid,raid.uid]);
 const newcomer=add(s,1,'battle',WATER,{tapped:true});
 end(s);
 assert.ok(targets.every(x=>x.tapped&&!x.skipUntap));
 assert.equal(newcomer.tapped,false);
 end(s);
 end(s);
 assert.ok(targets.every(x=>!x.tapped));
});

test('Ulpheus can evolve only on Dragons in play and only a revealed Dragon qualifies for Raid',()=>{
 let s=setup();
 const x=add(s,0,'hand',ULPHEUS),dragon=add(s,0,'battle',GENJI),ally=add(s,0,'battle',LIGHT);
 add(s,1,'battle',GENJI);
 give(s,0,'deck',[DARK,BOLSHACK,'dmex12-074',GREEN]);
 const [first,second,third,fourth]=ids(s,0,'deck');
 act(s,'play',a=>a.uid===x.uid);
 assert.deepEqual(new Set(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid)),new Set([dragon.uid,undefined]));
 s=restore(s);
 act(s,'evolve',a=>a.baseUid===dragon.uid);
 assert.deepEqual(new Set(values(s)),new Set([second,null]));
 pick(s,second);
 pick(s,third);
 assert.deepEqual(ids(s,0,'deck'),[fourth,third,first]);
 assert.deepEqual(battle(s,0,x).under.map(y=>y.uid),[dragon.uid,second]);
 assert.ok(battle(s,0,ally));
});

for(const castSpell of [RED_SPELL,WHITE_TWIN,null])test('Ulpheus pays one base and can cast only the eligible Light or Fire spell face '+castSpell,()=>{
 let s=setup();
 const first=Object.assign(inst(GENJI),{cardOwner:1}),second=inst(DARK);
 const x=add(s,0,'battle',ULPHEUS,{under:[first,second]});
 const red=add(s,0,'hand',RED_SPELL),white=add(s,0,'hand',WHITE_TWIN),dark=add(s,0,'hand',DARK_SPELL);
 attack(s,x.uid);
 assert.deepEqual(new Set(values(s)),new Set([first.uid,second.uid,null]));
 s=restore(s);
 pick(s,first.uid);
 assert.ok(ids(s,1,'grave').includes(first.uid));
 assert.deepEqual(new Set(values(s)),new Set([red.uid,white.uid,null]));
 if(castSpell===WHITE_TWIN)assert.equal(s.decision.choices.find(x=>x.value?.uid===white.uid).value.face,1);
 const chosen=castSpell===RED_SPELL?red:castSpell===WHITE_TWIN?white:null;
 pick(s,chosen?.uid??null);
 drain(s);
 assert.ok(ids(s,0,'hand').includes(dark.uid));
 if(chosen)assert.ok(!ids(s,0,'hand').includes(chosen.uid));
 assert.ok(s.players[0].mana.every(y=>!y.tapped));
 assert.deepEqual(battle(s,0,x).under.map(y=>y.uid),[second.uid]);
 assert.equal(s.players[1].shields.length,3);
});

test('Ulpheus may keep its base and cannot cast for free when it pays nothing',()=>{
 for(const hasBase of [false,true]){
  const s=setup(),base=inst(GENJI);
  const x=add(s,0,'battle',ULPHEUS,hasBase?{under:[base]}:{});
  const spell=add(s,0,'hand',RED_SPELL);
  attack(s,x.uid);
  if(hasBase)pick(s,null);
  assert.notEqual(s.decision?.task?.op,'g34_Execute');
  drain(s);
  assert.ok(ids(s,0,'hand').includes(spell.uid));
  assert.equal(battle(s,0,x).under?.[0]?.uid,hasBase?base.uid:undefined);
 }
});

test('Ulpheus can cast after Strato Bag replaces the grave move and the declared attack continues',()=>{
 const s=setup(),base=inst(GENJI),x=add(s,0,'battle',ULPHEUS,{under:[base],entered:s.turn});
 const strato=add(s,1,'battle',STRATO),spell=add(s,0,'hand',RED_SPELL);
 attack(s,x.uid);
 pick(s,base.uid);
 assert.equal(s.decision.player,1);
 pick(s,strato.uid);
 assert.ok(ids(s,0,'mana').includes(base.uid));
 assert.ok(!e.isEvolution(battle(s,0,x)));
 pick(s,spell.uid);
 drain(s);
 assert.ok(ids(s,0,'grave').includes(spell.uid));
 assert.equal(s.players[1].shields.length,3);
});

test('Gaul resolves its mandatory cost-three removal separately from its Soul Raid',()=>{
 const s=setup(),base=add(s,0,'battle',DARK);
 const small=add(s,1,'battle',FIRE),large=add(s,1,'battle',DEMON),ally=add(s,0,'battle',WATER);
 add(s,1,'battle','dmrp01-041');
 give(s,0,'deck',[LIGHT,GREEN,DARK_SPELL,WATER]);
 const x=summon(s,GAUL,base);
 order(s,q=>q.effect==='entry');
 assert.deepEqual(values(s),[small.uid]);
 pick(s,small.uid);
 const raid=s.players[0].deck[1];
 pick(s,raid.uid);
 drain(s);
 assert.ok(ids(s,1,'grave').includes(small.uid));
 assert.ok(battle(s,1,large)&&battle(s,0,ally));
 assert.deepEqual(battle(s,0,x).under.map(y=>y.uid),[base.uid,raid.uid]);
});

for(const [card,dest] of [[DEMON,'battle'],[GNEO,'battle'],[EXPENSIVE,'grave'],[FIRE,'grave'],[DARK_SPELL,'grave'],[DEMON_EVO,'deck']]){
 test('Gaul uses printed cost and creature qualification before any deployment checks '+card,()=>{
  let s=setup();
  const x=add(s,0,'battle',GAUL);
  give(s,0,'deck',[card,WATER,LIGHT,GREEN]);
  const top=s.players[0].deck[0],all=physical(s);
  attack(s,x.uid);
  if(card===GNEO){
   assert.deepEqual(new Set(values(s)),new Set([x.uid,null]));
   s=restore(s);
   pick(s,x.uid);
  }
  drain(s);
  assert.ok(ids(s,0,dest).includes(top.uid));
  if(card===DEMON_EVO)assert.equal(s.players[0].deck[0].uid,top.uid);
  if(card===GNEO)assert.equal(battle(s,0,top).under[0].uid,x.uid);
  assert.equal(s.players[0].mana.filter(y=>y.tapped).length,0);
  assert.deepEqual(physical(s),all);
 });
}
