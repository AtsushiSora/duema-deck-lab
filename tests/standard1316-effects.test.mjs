import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,cast,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';

const LONE='dm26ex2-035',AMBITION='dm26ex2-032',JAODIOS='dm26ex2-061';
const BASIC='dm01-108',FIRE='dm01-097',DEMON='dmex14-108',GOD='dm26rp1-009';
const SEED='dmsd20-005',DUAL='dmsd21-003',ABAKU_EVO='dm26ex2-012';
const TWIN='dmrp06-006',DRAGON='dm01-008',TOKOSHIE='dmrp17-025',TERROR='dm01-027';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
function field(){
 const s=setup();
 s.active=0;
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(BASIC));
 return s;
}
function add(s,p,z,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][z].push(x);
 return x;
}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const value=c=>c.value?.uid??c.value;
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
const choices=s=>s.decision?.choices?.map(value)??[];

test('three verified original IDs resolve with the current limits, image and complete ability',()=>{
 const m=read('tools/support-phase-1316.json'),registry=createCatalogue(snapshot,data.cards,details);
 const {prints}=read('tools/image-reference-prints.json');
 assert.deepEqual(m.cards.map(c=>c.id),[LONE,AMBITION,JAODIOS]);
 assert.deepEqual(m.printAliases,[]);
 for(const {id,name,image,source,faces,spec} of m.cards){
  const c=e.card(id),f=faces[0];
  assert.deepEqual(standardCardSpec({id,name,faces,status:'complete'},{phase:1316}),spec);
  assert.deepEqual(prints.find(x=>x.id===id),{id,canonicalId:id,name,image,source});
  assert.deepEqual(registry.resolveRows([{id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.limit,e.manaValue(c)],
   [f.cost,Number(f.powerText),f.race,f.civilizations,4,1]);
  for(const [key,v] of Object.entries(spec))assert.deepEqual(c[key],v);
  assert.equal(CARD_IMAGES[id],image);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id,count:1});
  assert.deepEqual(e.validateDeck({...deck,cards:registry.resolveRows(deck.cards)}),[]);
 }
});

for(const [id,match] of [[LONE,DEMON],[AMBITION,GOD]])for(const accept of [true,false])
 test('hand charge offers the correct race and untaps the same mana card '+id+' '+accept,()=>{
  const s=field(),charged=add(s,0,'hand',id),matching=add(s,0,'hand',match),other=add(s,0,'hand',BASIC);
  s.phase='charge';
  act(s,'charge',a=>a.uid===charged.uid);
  assert.ok(has(s,0,'mana',charged)&&charged.tapped);
  assert.deepEqual(choices(s),[matching.uid,null]);
  pick(s,accept?matching.uid:null);
  assert.equal(charged.tapped,!accept);
  assert.ok(has(s,0,'hand',matching)&&has(s,0,'hand',other));
  assert.equal(s.log.some(l=>l.type==='reveal'&&l.cardId===match),accept);
 });

test('Lone forces a discard, chooses one face cost, and destroys up to that exact cost',()=>{
 const s=field(),discarded=add(s,0,'hand',TWIN);
 const costs=[e.card(TWIN).cost,e.card(TWIN).spellFace.cost];
 const target=add(s,1,'battle',DRAGON),cheap=add(s,1,'battle',BASIC);
 cast(s,LONE);
 assert.deepEqual(choices(s),[discarded.uid]);
 pick(s,discarded.uid);
 assert.deepEqual(choices(s),[...new Set(costs)]);
 pick(s,Math.max(...costs));
 assert.ok(choices(s).includes(target.uid)&&choices(s).includes(cheap.uid));
 pick(s,target.uid);
 assert.ok(has(s,1,'grave',target));
 assert.ok(has(s,0,'grave',discarded));
});

test('the charge ability can reveal even if the card was placed untapped',()=>{
 const s=field(),charged=add(s,0,'hand',LONE),matching=add(s,0,'hand',JAODIOS);
 add(s,0,'battle','dm25-028');
 s.phase='charge';
 act(s,'charge',a=>a.uid===charged.uid);
 assert.ok(has(s,0,'mana',charged));
 assert.equal(charged.tapped,false);
 pick(s,matching.uid);
 assert.ok(s.log.some(l=>l.type==='reveal'&&l.cardId===JAODIOS));
});

test('Lone deploys from both zones with a dual-category card and no second duplicate category',()=>{
 const s=field(),dual=add(s,0,'grave',DUAL),plainSeed=add(s,0,'mana',SEED),demon=add(s,0,'mana',DEMON);
 const hidden=add(s,0,'mana',SEED,{faceDown:true});
 cast(s,LONE);
 assert.ok(!choices(s).includes(hidden.uid));
 pick(s,dual.uid);
 assert.ok(choices(s).includes(plainSeed.uid)&&choices(s).includes(demon.uid));
 pick(s,plainSeed.uid);
 drain(s);
 assert.ok(has(s,0,'battle',dual)&&has(s,0,'battle',plainSeed));
 assert.ok(has(s,0,'mana',demon));
});

test('Lone can deploy a seed first as the evolution base for the other card',()=>{
 const s=field(),seed=add(s,0,'grave',DUAL),evo=add(s,0,'mana',ABAKU_EVO);
 cast(s,LONE);
 pick(s,seed.uid);
 assert.ok(choices(s).includes(evo.uid));
 pick(s,evo.uid);
 pick(s,seed.uid);
 drain(s);
 assert.ok(s.players[0].battle.find(x=>x.uid===evo.uid)?.under.some(x=>x.uid===seed.uid));
});

for(const kind of ['enter','decline','redirect','noTarget'])test('Ambition checks actual grave deployment for its optional draw '+kind,()=>{
 const s=field(),god=add(s,0,'grave',GOD),equal=add(s,0,'grave','dm25rp3-S06');
 const target=kind==='noTarget'?null:add(s,1,'battle','dmrp15-003');
 if(kind==='redirect')add(s,1,'battle',TOKOSHIE);
 cast(s,AMBITION);
 if(target){
  pick(s,target.uid);
  assert.ok(has(s,1,'grave',target));
  assert.ok(choices(s).includes(god.uid));
  assert.ok(!choices(s).includes(equal.uid));
  pick(s,kind==='decline'?null:god.uid);
 }
 if(kind==='enter'){
  assert.ok(has(s,0,'battle',god));
  assert.equal(s.decision,null);
  assert.equal(s.players[0].hand.length,0);
 }else{
  assert.ok(has(s,0,kind==='redirect'?'mana':'grave',god));
  assert.equal(s.decision?.task?.op,'g34_Offer');
  pick(s,true);
  assert.equal(s.players[0].hand.length,2);
 }
});

function breakForSB(shieldId,priorDemon=false){
 const s=field();
 s.active=1;
 give(s,0,'shields',[shieldId]);
 give(s,0,'mana',[]);
 const base=add(s,0,'battle',FIRE),source=add(s,0,'hand',JAODIOS),attacker=add(s,1,'battle',DRAGON);
 if(priorDemon)add(s,0,'hand',DEMON);
 const shield=s.players[0].shields[0];
 attack(s,attacker.uid);
 act(s,'noBlock');
 return {s,base,source,attacker,shield};
}

test('Jaodios uses a Demonio Word shield as S Back payment and evolves over a fire base',()=>{
 const {s,base,source,attacker,shield}=breakForSB(LONE);
 assert.equal(s.decision?.task?.op,'g13_SB');
 act(s,'extended',a=>s.decision.choices[a.choice].value?.uid===source.uid&&
  s.decision.choices[a.choice].value.cost===shield.uid);
 act(s,'triggerEvolve',a=>a.baseUid===base.uid);
 assert.ok(has(s,0,'grave',shield));
 assert.equal(s.players[0].mana.length,0);
 assert.ok(source.under.some(x=>x.uid===base.uid));
 assert.deepEqual(choices(s),[attacker.uid]);
 pick(s,attacker.uid);
 assert.ok(has(s,1,'grave',attacker));
});

test('Jaodios declines a non-Demonio shield and cannot pay with a prior hand card',()=>{
 const {s,source,shield}=breakForSB(FIRE,true);
 assert.notEqual(s.decision?.task?.op,'g13_SB');
 assert.ok(has(s,0,'hand',source)&&has(s,0,'hand',shield));
});

test('Jaodios evolves over a non-fire Demonio, removes targets on entry and attack, and keeps its base on destruction',()=>{
 const s=field(),base=add(s,0,'battle','dm26rp3-068'),source=add(s,0,'hand',JAODIOS);
 const exact=add(s,1,'battle',DRAGON),small=add(s,1,'battle',BASIC);
 const high=add(s,1,'battle',DRAGON,{powerModifiers:[{amount:1}]});
 act(s,'play',a=>a.uid===source.uid);
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.equal(e.effectiveCard(source,s).breaker,2);
 assert.ok(!choices(s).includes(high.uid));
 pick(s,exact.uid);
 attack(s,source.uid);
 pick(s,small.uid);
 drain(s);
 assert.ok(has(s,1,'grave',exact)&&has(s,1,'grave',small));
 s.active=1;
 s.phase='main';
 cast(s,TERROR);
 act(s,'effect',a=>a.targets[0].uid===source.uid);
 drain(s);
 assert.ok(has(s,0,'grave',source)&&has(s,0,'battle',base));
});
