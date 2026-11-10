import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-810.json',import.meta.url)));
const DILGA="dm29-s05",SWORD="dm27-028",PURE="dm28-012";
const FIRE="dm01-097",NATURE="dm01-108",HAND="dm01-027",BOUNCE="dm01-086";
const MUSHA="dm24-s04",NEAR="dm23ex1-005",FIVE="dm01-036",SIX="dm06-048";
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 810 definitions preserve their canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:810}));
  assert.throws(()=>standardCardSpec(detail,{phase:809}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:810}));
  assert.deepEqual(registry.cards.filter(c=>canonicalCardName(c.name)===canonicalCardName(row.name)).map(c=>c.id),[row.id]);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[key],value);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:row.id,count:1});
  deck.cards=registry.resolveRows(deck.cards);
  assert.equal(deck.cards.at(-1).id,row.id);
  assert.deepEqual(e.validateDeck(deck),[]);
 }
});

test('the Dilga reprint resolves to the original card',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 assert.equal(printAliases.length,1);
 for(const print of printAliases){
  assert.equal(print.verification.facesMatched,true);
  assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:810}),cards.find(x=>x.id===print.canonicalId).spec);
  assert.equal(regulationVerification.limits[print.id],e.card(print.canonicalId).limit);
  assert.equal(registry.resolveRows([{id:print.id,count:1}])[0].id,print.canonicalId);
  assert.equal(refs.find(x=>x.id===print.id).image,print.image);
 }
});

const play=(s,x,face=0)=>act(s,'play',a=>a.uid===x.uid&&(a.face||0)===face&&!a.alternative);

const pickNative=(s,x)=>act(s,'effect',a=>a.targets.some(t=>t.uid===x.uid));

test('Dilga summons with 23000 power and breaks exactly four shields',()=>{
 const s=setup(),source=put(s,0,'hand',DILGA);
 play(s,source);
 assert.ok(has(s,0,'battle',source));
 assert.equal(e.power(source,false,s),23000);
 s.players[0].battle.find(x=>x.uid===source.uid).entered=0;
 attack(s,source.uid);
 act(s,'noBlock');
 assert.equal(s.decision?.count,4);
 act(s,'breakShields');
 drain(s);
 assert.equal(s.players[1].shields.length,1);
});

for(const destroy of [true,false]){
 test('Dilga shuffles only when its destruction is attempted '+destroy,()=>{
  const s=setup(),source=put(s,0,'battle',DILGA),rng=s.rng;
  s.active=1;
  play(s,put(s,1,'hand',destroy?HAND:BOUNCE));
  pickNative(s,source);
  assert.equal(s.decision,null);
  assert.equal(has(s,0,'deck',source),destroy);
  assert.equal(has(s,0,'hand',source),!destroy);
  assert.ok(!has(s,0,'grave',source));
  assert.equal(s.rng!==rng,destroy);
 });
}

test('Dilga uses an insertion choice when QX forbids shuffling',()=>{
 let s=setup();
 const source=put(s,0,'battle',DILGA);
 put(s,1,'battle','dm25ex1-049');
 give(s,0,'deck',[FIRE,NATURE,FIVE]);
 const ids=s.players[0].deck.map(x=>x.uid),rng=s.rng;
 s.active=1;
 play(s,put(s,1,'hand',HAND));
 pickNative(s,source);
 assert.equal(s.decision?.task?.op,'g11_Insert');
 s=JSON.parse(JSON.stringify(s));
 pick(s,1);
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),[ids[0],source.uid,...ids.slice(1)]);
 assert.equal(s.rng,rng);
});

test('Dilga can choose between a shuffle and a competing mana replacement',()=>{
 let s=setup();
 const source=put(s,0,'battle',DILGA);
 put(s,0,'battle','dmbd18-003');
 s.active=1;
 play(s,put(s,1,'hand',HAND));
 pickNative(s,source);
 assert.equal(s.decision?.type,'leaveReplace');
 assert.deepEqual(e.getLegalActions(s).map(a=>a.kind).sort(),['replaceShuffle731','replaceYamata']);
 s=JSON.parse(JSON.stringify(s));
 const alternative=structuredClone(s);
 act(s,'replaceShuffle731');
 act(alternative,'replaceYamata');
 assert.ok(has(s,0,'deck',source));
 assert.ok(has(alternative,0,'mana',source));
 assert.ok(!has(s,0,'grave',source)&&!has(alternative,0,'grave',source));
});

for(const mode of ['own exact','own near','opposing exact','sealed exact']){
 test('Musha Sword destroys up to the printed power limit and checks the exact allied name '+mode,()=>{
  const s=setup(),source=put(s,0,'hand',SWORD);
  const first=put(s,1,'battle',FIVE),second=put(s,1,'battle',FIRE),high=put(s,1,'battle',SIX);
  const supporter=put(s,mode==='opposing exact'?1:0,'battle',mode==='own near'?NEAR:MUSHA);
  if(mode==='sealed exact')s.players[0].seals.push({...inst(FIRE),sealOf:supporter.uid});
  play(s,source);
  assert.deepEqual(s.decision.choices.map(x=>x.value.uid),[first.uid,second.uid]);
  pick(s,first.uid);
  if(mode==='own exact'){
   assert.ok(has(s,1,'grave',first));
   assert.deepEqual(s.decision.choices.map(x=>x.value.uid),[second.uid]);
   pick(s,second.uid);
  }
  assert.equal(s.decision,null);
  assert.ok(has(s,1,'grave',first));
  assert.equal(has(s,1,'grave',second),mode==='own exact');
  assert.ok(has(s,1,'battle',high));
 });
}

for(const another of [true,false]){
 test('Musha Sword cannot choose the same creature after Unicorn replaces the first destruction '+another,()=>{
  let s=setup();
  put(s,0,'battle',MUSHA);
  const first=put(s,1,'battle',PURE),second=another?put(s,1,'battle',FIRE):null;
  give(s,1,'shields',[HAND]);
  const shield=s.players[1].shields[0];
  play(s,put(s,0,'hand',SWORD));
  pick(s,first.uid);
  assert.equal(s.decision?.type,'leaveReplace');
  s=JSON.parse(JSON.stringify(s));
  act(s,'replaceEscape',a=>a.shield===shield.uid);
  assert.ok(has(s,1,'hand',shield)&&has(s,1,'battle',first));
  if(second){
   assert.deepEqual(s.decision.choices.map(x=>x.value.uid),[second.uid]);
   pick(s,second.uid);
   assert.ok(has(s,1,'grave',second));
  }
  assert.equal(s.decision,null);
  assert.equal(s.metrics[1].triggers,0);
 });
}

test('Musha Sword excludes the reconstructed creature after Star Evolution replaces destruction',()=>{
 const s=setup();
 put(s,0,'battle',MUSHA);
 const first=put(s,1,'battle','dmrp17-074'),other=put(s,1,'battle',FIRE);
 const base=inst('dm01-090');
 first.under=[base];
 play(s,put(s,0,'hand',SWORD));
 pick(s,first.uid);
 assert.ok(has(s,1,'grave',first)&&has(s,1,'battle',base));
 assert.deepEqual(s.decision.choices.map(x=>x.value.uid),[other.uid]);
 pick(s,other.uid);
 assert.ok(has(s,1,'grave',other)&&has(s,1,'battle',base));
});

test('Musha Sword resolves from a shield and destroys its attacking target',()=>{
 const s=setup(),enemy=put(s,1,'battle',FIVE);
 give(s,0,'shields',[SWORD]);
 s.active=1;
 attack(s,enemy.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 pick(s,enemy.uid);
 assert.equal(s.metrics[0].triggers,1);
 assert.ok(has(s,1,'grave',enemy));
});

for(const mode of ['replace','decline','no shield','bounce']){
 test('Unicorn offers its own shield only for destruction and suppresses the shield trigger '+mode,()=>{
  const s=setup(),source=put(s,0,'battle',PURE);
  give(s,0,'shields',mode==='no shield'?[]:[FIRE,HAND]);
  const shield=s.players[0].shields[1];
  s.active=1;
  play(s,put(s,1,'hand',mode==='bounce'?BOUNCE:HAND));
  pickNative(s,source);
  if(['replace','decline'].includes(mode)){
   assert.equal(s.decision?.type,'leaveReplace');
   assert.equal(e.getLegalActions(s).filter(a=>a.kind==='replaceEscape').length,2);
   act(s,mode==='replace'?'replaceEscape':'allowLeave',a=>mode!=='replace'||a.shield===shield.uid);
  }
  assert.equal(s.decision,null);
  assert.equal(has(s,0,'battle',source),mode==='replace');
  assert.equal(has(s,0,'grave',source),['decline','no shield'].includes(mode));
  assert.equal(has(s,0,'hand',source),mode==='bounce');
  if(shield)assert.equal(has(s,0,'hand',shield),mode==='replace');
  assert.equal(s.metrics[0].triggers,0);
 });
}
