import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const OGURI='dm24-071',BABY='dm24-108',LIFE='dm09-029',FRAPPE='dm24-047';
const LIGHT='dm01-075',WATER='dm01-083',DARK='dm01-090',FIRE='dm01-097',NATURE='dm01-108';
const MULTI='dm10-068',ZERO='dmsd01-012',EVO='dm10-017',SEED='dmsd20-016',SURFER='dm05-024';
const HAND='dm01-027',ONIKAMASU='dmrp01-041',CADDY='dm22rp1-049';
const find=(s,p,z,x)=>s.players[p][z].find(y=>y.uid===x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const restore=s=>JSON.parse(JSON.stringify(s));
function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(18).fill(NATURE));
 return s;
}
function put(s,p,z,id,attrs){
 const x=Object.assign(inst(id),attrs);s.players[p][z].push(x);return x;
}
function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&!a.alternative);return x;
}
function pick(s,x){
 act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===(x?.uid??null);});
}
const attacks=(s,x)=>e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===x.uid);
function beginAttack(s,x){
 s.phase='attack';act(s,'attack',a=>a.uid===x.uid&&a.target==='player');
}

test('Phase 921 verifies five official prints and preserves the canonical identities of three cards',()=>{
 const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
 const m=read('tools/support-phase-921.json'),refs=read('tools/image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(c=>c.id),[OGURI,BABY,LIFE]);
 assert.deepEqual(m.printAliases.map(c=>[c.id,c.canonicalId]),[['dmx22a-053',BABY],['dmex15-b096',BABY]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),original=m.cards.find(x=>x.id===id),[f]=row.faces;
  assert.equal(cat.get(row.id).id,id);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.ok(row.verification.facesMatched);
  const detail={...details.cards.find(c=>c.id===id),id:row.id,faces:row.faces};
  assert.deepEqual(standardCardSpec(detail,{phase:921}),original.spec);
  const changed=structuredClone(detail);changed.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(changed,{phase:921}));
  for(const [key,value] of Object.entries(original.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,c.civilizations,c.race,c.manaValue,c.limit],
   [id===OGURI?'creature':'spell',f.cost,Number(f.powerText),f.civilizations,f.race,1,4]);
  const ref=refs.find(c=>c.id===row.id);
  assert.deepEqual([ref.canonicalId,ref.image],[id,row.image]);
  if(!row.canonicalId){
   assert.equal(CARD_IMAGES[id],row.image);
   assert.deepEqual(row.faces,details.cards.find(c=>c.id===id).faces);
   for(const source of [data,snapshot,details])
    assert.deepEqual(source.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[id]);
  }
 }
 const deck={id:'phase921',name:'文明と展開',cards:[OGURI,'dmex15-b096',LIFE,FRAPPE,LIGHT,WATER,DARK,FIRE,NATURE,MULTI]
  .map(id=>({id,count:4}))};
 assert.deepEqual(e.validateDeck({...deck,cards:cat.resolveRows(deck.cards)}),[]);
 assert.equal(cat.coverage(deck).unsupported,0);
});

test('Oguri only needs a qualifying own creature for player attacks, and may attack creatures without one',()=>{
 const s=field(),x=put(s,0,'battle',OGURI),enemy=put(s,1,'battle',DARK,{tapped:true});
 put(s,0,'battle',LIGHT);put(s,0,'battle',SEED);put(s,0,'battle',ZERO);
 put(s,0,'mana',NATURE);put(s,0,'grave',WATER);
 s.phase='attack';
 assert.ok(attacks(s,x).some(a=>a.target===enemy.uid));
 assert.ok(!attacks(s,x).some(a=>a.target==='player'));
 const ally=put(s,0,'battle',MULTI);
 assert.ok(attacks(s,x).some(a=>a.target==='player'));
 ally.sealed=true;
 assert.ok(!attacks(s,x).some(a=>a.target==='player'));
});

test('Oguri can count itself after it gains another civilization and loses permission when that color expires',()=>{
 const s=field(),x=put(s,0,'battle',OGURI),ralfas=put(s,0,'battle','dm25-042');
 s.phase='attack';act(s,'tapAbility',a=>a.uid===ralfas.uid);pick(s,x);
 act(s,'extended',a=>s.decision.choices[a.choice].value==='闇');drain(s);
 s.players[0].battle.splice(s.players[0].battle.indexOf(ralfas),1);
 s.players[0].hand.push(ralfas);
 assert.ok(attacks(s,x).some(a=>a.target==='player'));
 act(s,'endTurn');act(s,'skipCharge');act(s,'toAttack');act(s,'endTurn');
 act(s,'skipCharge');act(s,'toAttack');
 assert.ok(!attacks(s,x).some(a=>a.target==='player'));
});

test('Oguri blocks with no qualifying friendly creature',()=>{
 const s=field(1),x=put(s,0,'battle',OGURI),a=put(s,1,'battle',NATURE);
 beginAttack(s,a);
 act(s,'block',r=>r.uid===x.uid);drain(s);
 assert.ok(x.tapped);
 assert.ok(find(s,1,'grave',a));
 assert.equal(s.players[0].shields.length,5);
});

test('Baby Birth privately offers only matching cost-two or cheaper creatures and shuffles after one deployment',()=>{
 let s=field();
 give(s,0,'deck',[LIGHT,WATER,DARK,FIRE,MULTI,NATURE,ZERO,SURFER,HAND,EVO]);
 const all=physical(s),rng=s.rng,[light,water,dark,fire,multi,native,zero,large,spell,evo]=s.players[0].deck;
 const source=play(s,BABY);
 assert.deepEqual(new Set(s.decision.choices.map(o=>o.value?.uid??o.value)),new Set([light.uid,water.uid,dark.uid,fire.uid,multi.uid,null]));
 assert.deepEqual(s.decision.task.g585Peek.map(o=>o.id),s.players[0].deck.map(x=>x.cardId));
 assert.ok(!JSON.stringify(e.observation(s,1)).includes(multi.cardId));
 s=restore(s);pick(s,multi);drain(s);
 assert.ok(find(s,0,'battle',multi)&&find(s,0,'grave',source));
 assert.ok([native,zero,large,spell,evo].every(x=>find(s,0,'deck',x)));
 assert.equal(s.players[0].battle.length,1);
 assert.notEqual(s.rng,rng);
 assert.deepEqual(s.players[0].g34Protected,[]);
 assert.deepEqual(physical(s),[...all,source.uid].sort());
});

test('Baby Birth may decline or find no matching card, and shuffles in both cases',()=>{
 for(const deck of [[NATURE,LIGHT,WATER],[NATURE,NATURE,NATURE]]){
  const s=field();give(s,0,'deck',deck);
  const rng=s.rng,before=s.players[0].deck.map(x=>x.uid).sort();
  play(s,BABY);assert.equal(s.decision.player,0);
  pick(s,null);
  assert.equal(s.decision,null);
  assert.equal(s.players[0].battle.length,0);
  assert.notEqual(s.rng,rng);
  assert.deepEqual(s.players[0].deck.map(x=>x.uid).sort(),before);
  assert.deepEqual(s.players[0].g34Protected,[]);
 }
});

test('Baby Birth can be cast as a shield trigger and deploy a low-cost evolution with a legal base',()=>{
 const s=field(),a=put(s,0,'battle',NATURE),base=put(s,1,'battle',WATER);
 give(s,1,'deck',[EVO,NATURE,NATURE]);give(s,1,'shields',[BABY]);
 const target=s.players[1].deck[0],source=s.players[1].shields[0],rng=s.rng;
 beginAttack(s,a);act(s,'noBlock');act(s,'useTrigger',r=>r.uid===source.uid);
 assert.equal(s.decision.player,1);
 pick(s,target);
 if(s.decision?.type==='extended')pick(s,base);
 drain(s);
 const placed=find(s,1,'battle',target);
 assert.equal(placed?.under[0]?.uid,base.uid);
 assert.ok(find(s,1,'grave',source));
 assert.ok(s.players[1].mana.every(x=>!x.tapped));
 assert.notEqual(s.rng,rng);
});

test('Life Deprivation gives the opponent one choice across both zones and buries an entire shield stack',()=>{
 let s=field(),own=put(s,0,'battle',NATURE),enemy=put(s,1,'battle',ONIKAMASU);
 const root=s.players[1].shields[0],a=inst(HAND),b=inst(BABY);
 root.shieldStack=[a,b];
 const source=play(s,LIFE),all=physical(s),breaks=s.metrics[0].breaks;
 assert.equal(s.decision.player,1);
 assert.ok(s.decision.choices.some(o=>o.value.origin==='battle'&&o.value.uid===enemy.uid));
 assert.ok(!s.decision.choices.some(o=>o.value.uid===own.uid||o.value===null));
 const shield=s.decision.choices.find(o=>o.value.uid===root.uid);
 assert.equal(shield.value.origin,'shields');
 assert.equal(shield.cardId,undefined);
 assert.ok(!JSON.stringify(e.observation(s,0)).includes(a.cardId));
 s=restore(s);pick(s,root);drain(s);
 assert.ok([root,a,b].every(x=>find(s,1,'grave',x)));
 assert.ok(find(s,0,'grave',source)&&find(s,1,'battle',enemy));
 assert.equal(s.metrics[0].breaks,breaks);
 assert.equal(s.metrics[1].triggers,0);
 assert.equal(s.players[1].shields.length,4);
 assert.deepEqual(physical(s),all);
});

test('Life Deprivation counts the selected creature move as destruction, including replacements',()=>{
 const s=field(1),target=put(s,0,'battle',CADDY);
 give(s,0,'shields',[]);
 const mana=s.players[0].mana.length;
 const source=play(s,LIFE);
 assert.equal(s.decision.player,0);
 assert.deepEqual(s.decision.choices.map(o=>o.value),[{origin:'battle',uid:target.uid}]);
 pick(s,target);drain(s);
 assert.ok(find(s,0,'mana',target)&&find(s,1,'grave',source));
 assert.equal(s.players[0].mana.length,mana+1);
 assert.ok(!find(s,0,'grave',target));
});

test('Life Deprivation resolves a shield-only choice and does nothing when the opponent has neither eligible zone',()=>{
 for(const n of [0,1]){
  const s=field();give(s,1,'shields',Array(n).fill(HAND));put(s,1,'battle',SEED);
  const target=s.players[1].shields[0],source=play(s,LIFE);
  if(n){
   assert.deepEqual(s.decision.choices.map(o=>o.value),[{origin:'shields',uid:target.uid}]);
   pick(s,target);
   assert.ok(find(s,1,'grave',target));
  }
  assert.ok(find(s,0,'grave',source));
  assert.equal(s.decision,null);
  assert.equal(s.players[1].shields.length,0);
 }
});
