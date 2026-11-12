import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const VIVA='promoy24-064', ZINRAI='dm25rp4-022', USHI='dm25rp2-046', GUN='dm25rp2-074';
const LIGHT='dm01-075', WATER='dm01-083', DARK='dm01-090', FIRE='dm01-097', GREEN='dm01-108';
const BATTAN='dm25rp1-043', SEED='dm22ex1-086', BIG='dm10-006', WINNER='dm14-s01';
const STAR='dmrp17-074', GNEO='dm25rp2-017', ONIKAMASU='dmrp01-041', HAND='dm01-027';
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
function end(s){
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
}
function revealTrigger(s,id,attacker,base){
 const p=1-s.active;
 give(s,p,'shields',[id]);
 const shield=s.players[p].shields[0];
 attack(s,attacker.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 act(s,'useTrigger',a=>a.uid===shield.uid);
 act(s,'triggerEvolve',a=>a.baseUid===base?.uid);
 return shield;
}

test('All four official cards and both alternate prints keep their IDs, art, statistics and limits',()=>{
 const m=read('tools/support-phase-1058.json'),cat=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(x=>x.id),[VIVA,ZINRAI,USHI,GUN]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[['dm25rp3-028',VIVA],['dm25ex3-052',USHI]]);
 for(const row of m.cards){
  const f=row.faces[0],c=e.card(row.id);
  assert.equal(cat.get(row.id).id,row.id);
  assert.ok(cat.get(row.id).supported&&row.verification.facesMatched);
  assert.deepEqual([c.cost,c.power,c.race,c.manaValue,e.civilizations(c),c.limit],
   [f.cost,parseInt(f.powerText,10),f.race,1,f.civilizations,m.regulationVerification.limits[row.id]]);
  const baseColors=row.id===VIVA?['光','水','自然']:['光','火','自然'];
  assert.deepEqual(c.neoEvolution.any,baseColors.map(civilization=>({civilization})));
  assert.deepEqual(details.cards.find(x=>x.id===row.id).faces,row.faces);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[row.id,row.image]]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[row.id]);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1058}),row.spec);
  assert.throws(()=>standardCardSpec({...row,status:'complete'},{phase:1057}));
 }
 for(const alt of m.printAliases){
  const canonical=m.cards.find(x=>x.id===alt.canonicalId);
  assert.ok(alt.verification.facesMatched);
  assert.deepEqual(standardCardSpec({...alt,status:'complete'},{phase:1058}),canonical.spec);
  assert.equal(cat.get(alt.id).id,canonical.id);
  assert.equal(m.regulationVerification.limits[alt.id],m.regulationVerification.limits[canonical.id]);
  assert.deepEqual(refs.filter(x=>x.id===alt.id).map(x=>[x.canonicalId,x.image]),[[canonical.id,alt.image]]);
  assert.deepEqual(cat.resolveRows([{id:alt.id,count:2},{id:canonical.id,count:2}]),[{id:canonical.id,count:4}]);
 }
});

test('Viva pays four Light DDD mana on resolution and an evolved attacker wins against higher power',()=>{
 for(const evolved of [false,true]){
  let s=field();
  give(s,0,'mana',[LIGHT,WATER,WATER,WATER]);
  const base=add(s,0,'battle',WATER),enemy=add(s,1,'battle',BIG,{tapped:true});
  const viva=add(s,0,'hand',VIVA),all=physical(s);
  attack(s,base.uid,enemy.uid);
  act(s,'declareDDD',a=>a.uid===viva.uid);
  assert.ok(s.players[0].mana.every(x=>!x.tapped));
  s=restore(s);
  act(s,'summonDDD',a=>a.cost===4&&a.baseUid===(evolved?base.uid:undefined));
  drain(s);
  assert.ok(s.players[0].mana.every(x=>x.tapped));
  assert.equal(!!live(s,1,'grave',enemy),evolved);
  assert.equal(!!e.effectiveCard(live(s,0,'battle',viva),s).g34AlwaysWin,evolved);
  assert.equal(e.effectiveCard(live(s,0,'battle',viva),s).breaker,2);
  assert.deepEqual(physical(s),all);
 }
});

test('Viva as a base grants the current unit through the opposing turn, even if that base is detached',()=>{
 let s=field();
 const viva=add(s,0,'battle',VIVA),host=summon(s,BATTAN,viva);
 order(s,VIVA);
 pick(s,0);
 assert.ok(e.effectiveCard(host,s).g34AlwaysWin);
 host.under=[];
 s.players[0].grave.push(viva);
 const next=summon(s,USHI,host);
 order(s,BATTAN);
 pick(s,0);
 pick(s,null);
 s=restore(s);
 end(s);
 const unit=live(s,0,'battle',next);
 const rival=add(s,1,'battle',BIG);
 unit.tapped=true;
 attack(s,rival.uid,unit.uid);
 drain(s);
 assert.ok(live(s,0,'battle',next)&&live(s,1,'grave',rival));
 end(s);
 assert.ok(!e.effectiveCard(unit,s).g34AlwaysWin);
});

test('Two guaranteed winners survive the same battle',()=>{
 const s=field(),base=add(s,0,'battle',GREEN),enemy=add(s,1,'battle',WINNER,{tapped:true});
 const viva=summon(s,VIVA,base);
 attack(s,viva.uid,enemy.uid);
 drain(s);
 assert.ok(live(s,0,'battle',viva)&&live(s,1,'battle',enemy));
});

test('Viva’s resolved grant follows a creature through multiple-base Phoenix evolution',()=>{
 const s=field(),base=add(s,0,'battle',GREEN),other=add(s,0,'battle',DARK);
 const viva=summon(s,VIVA,base),phoenix=add(s,0,'hand','dm26ex5-S008');
 act(s,'play',a=>a.uid===phoenix.uid);
 pick(s,viva.uid);
 pick(s,other.uid);
 pick(s,null);
 drain(s);
 const unit=live(s,0,'battle',phoenix);
 assert.ok(unit.under.includes(viva));
 unit.under=unit.under.filter(x=>x.uid!==viva.uid);
 s.players[0].grave.push(viva);
 assert.ok(e.effectiveCard(unit,s).g34AlwaysWin);
});

test('Zinrai’s optional battle on an evolved Shield Trigger counts its entire nested stack',()=>{
 const s=field(),attacker=add(s,0,'battle',FIRE),rival=add(s,0,'battle',BIG,{powerModifiers:[{amount:-1000}]});
 const base=add(s,1,'battle',USHI,{under:[inst(GREEN)]});
 const zinrai=revealTrigger(s,ZINRAI,attacker,base);
 assert.equal(s.decision.player,1);
 assert.equal(e.power(zinrai,false,s),5000);
 assert.equal(e.matchupPower(zinrai,rival,false,s),11000);
 pick(s,rival.uid);
 assert.ok(live(s,1,'battle',zinrai)&&live(s,0,'grave',rival));
 assert.ok(s.players[1].mana.every(x=>!x.tapped));
});

test('Zinrai’s battle bonus applies to its lone card, while a non-evolved Trigger does not initiate a fight',()=>{
 const s=field(),attacker=add(s,0,'battle',FIRE);
 const zinrai=revealTrigger(s,ZINRAI,attacker);
 assert.equal(s.decision,null);
 assert.equal(e.power(zinrai,false,s),5000);
 assert.equal(e.matchupPower(zinrai,attacker,false,s),7000);
 assert.ok(!e.isEvolution(zinrai)&&live(s,0,'battle',attacker));
});

test('Zinrai as a base uses the current unit for battle without lending its printed power bonus',()=>{
 const s=field(),base=add(s,0,'battle',ZINRAI),enemy=add(s,1,'battle',FIRE);
 const host=summon(s,BATTAN,base);
 order(s,ZINRAI);
 assert.equal(e.matchupPower(host,enemy,false,s),6000);
 pick(s,enemy.uid);
 pick(s,0);
 assert.ok(live(s,0,'battle',host)&&live(s,1,'grave',enemy));
});

test('Zinrai still permits an optional choice after its evolved unit leaves, without starting a phantom battle',()=>{
 const s=field(),base=add(s,0,'battle',ZINRAI),enemy=add(s,1,'battle',FIRE);
 const host=summon(s,USHI,base);
 order(s,USHI);
 pick(s,host.uid);
 assert.deepEqual(values(s),[enemy.uid,null]);
 pick(s,enemy.uid);
 assert.ok(live(s,1,'battle',enemy)&&live(s,0,'mana',host));
 assert.ok(!s.log.some(x=>x.type==='battle'));
});

test('Ushi’s unevolved Shield Trigger can move an own noncreature element and excludes protected or expensive enemies',()=>{
 const s=field(),attacker=add(s,0,'battle',FIRE),seed=add(s,1,'battle',SEED);
 const big=add(s,0,'battle',BIG),protectedCard=add(s,0,'battle',ONIKAMASU);
 const ushi=revealTrigger(s,USHI,attacker);
 assert.deepEqual(values(s),[seed.uid,ushi.uid,attacker.uid,null]);
 pick(s,seed.uid);
 assert.ok(live(s,1,'mana',seed)&&live(s,1,'battle',ushi));
 assert.ok(live(s,0,'battle',big)&&live(s,0,'battle',protectedCard));
});

test('Ushi sends a mixed-ownership stack to the owners’ mana and can decline its evolved entry',()=>{
 let s=field();
 const base=add(s,0,'battle',GREEN),under=inst(WATER);
 const target=add(s,1,'battle',USHI,{cardOwner:0,under:[under]});
 const ushi=summon(s,USHI,base),all=physical(s);
 s=restore(s);
 pick(s,target.uid);
 assert.ok(live(s,0,'mana',target)&&live(s,1,'mana',under)&&live(s,0,'battle',ushi));
 assert.deepEqual(physical(s),all);
 const second=summon(s,USHI,live(s,0,'battle',ushi));
 pick(s,null);
 assert.ok(live(s,0,'battle',second));
});

test('Ushi preserves owners through Star and G-NEO mana-move replacements',()=>{
 for(const [id,kind] of [[STAR,'replaceStar'],[GNEO,'replaceGneo']]){
  const s=field();
  const under=Object.assign(inst(DARK),{cardOwner:0});
  const target=add(s,1,'battle',id,{cardOwner:0,under:[under]});
  summon(s,USHI);
  const all=physical(s);
  pick(s,target.uid);
  if(e.getLegalActions(s).some(a=>a.kind===kind))act(s,kind);
  const moved=id===STAR?target:under,remaining=id===STAR?under:target;
  assert.ok(live(s,0,'mana',moved)&&live(s,1,'battle',remaining));
  assert.deepEqual(physical(s),all);
 }
});

test('Gun cannot attack with one or two cards and can break three shields with a nested three-card stack',()=>{
 for(const count of [1,2,3]){
  const s=field();
  const base=count>1?add(s,0,'battle',USHI,count===3?{under:[inst(GREEN)]}:{}):undefined;
  const body=summon(s,GUN,base);
  if(count===1)body.entered=0;
  s.phase='attack';
  assert.equal(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===body.uid),count===3);
  if(count===3){
   attack(s,body.uid);
   drain(s);
   assert.equal(s.players[1].shields.length,2);
  }
 }
});

test('Gun’s attack restriction still permits an effect battle from its Zinrai base',()=>{
 const s=field(),zinrai=add(s,0,'battle',ZINRAI),enemy=add(s,1,'battle',FIRE);
 const body=summon(s,GUN,zinrai);
 pick(s,enemy.uid);
 assert.ok(live(s,0,'battle',body)&&live(s,1,'grave',enemy));
 s.phase='attack';
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===body.uid));
});
