import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-692.json',import.meta.url)));

test('Phase 692 validates four complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:692}));
  assert.throws(()=>standardCardSpec(detail,{phase:691}));
  for(const [field,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[field],value);
  assert.deepEqual(data.cards.filter(c=>key(c.name)===key(row.name)).map(c=>c.id),[row.id]);
  assert.ok(row.verification.facesMatched);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:row.id,count:1});
  assert.deepEqual(catalogue.resolveRows(deck.cards),deck.cards);
  assert.deepEqual(e.validateDeck(deck),[]);
  if(row.currentPrint){
   assert.deepEqual(row.spec,standardCardSpec({...row.currentPrint,status:'complete'},{phase:692}));
   assert.ok(row.currentPrint.verification.facesMatched);
   assert.ok(!data.cards.some(c=>c.id===row.currentPrint.id));
  }
 }
});

const LAGUNA='dm02-007',WARRIOR='dm06-054',FISH='dm14-048',MOBY='dm15-015';
const ONE='dm28-063',TWO='dm01-108',BLOCKER='dm08-027',GUARD='dmrp22-042';
const SPELL='dm01-015',TWIN='dm22ex1-128',WATCHER='dmrp18-s10';
const field=(p=0)=>Object.assign(setup(),{active:p});
const put=(s,p,id,tapped=false)=>{const x=inst(id);x.tapped=tapped;s.players[p].battle.push(x);return x;};
const values=s=>(s.decision?.choices||[]).map(x=>x.value?.uid??x.value);
const pick=(s,uid)=>act(s,'extended',a=>values(s)[a.choice]===uid);
const has=(s,p,z,uid)=>s.players[p][z].some(x=>x.uid===uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const noBlock=s=>{if(s.decision?.type==='block')act(s,'noBlock');};

for(const choice of [SPELL,TWIN,null])test('Laguna searches for a spell, optionally reveals one, and shuffles on resolution '+choice,()=>{
 let s=field(),source=put(s,0,LAGUNA);
 give(s,0,'deck',[ONE,SPELL,TWO,TWIN,TWO]);
 const spell=s.players[0].deck[1],twin=s.players[0].deck[3],all=physical(s),rng=s.rng;
 attack(s,source.uid);
 assert.deepEqual(values(s),[spell.uid,twin.uid,null]);
 s=JSON.parse(JSON.stringify(s));
 const chosen=choice===SPELL?spell:choice===TWIN?twin:null;
 pick(s,chosen?.uid??null);
 noBlock(s);
 if(chosen)assert.ok(has(s,0,'hand',chosen.uid));
 else assert.equal(s.players[0].hand.length,0);
 assert.notEqual(s.rng,rng);
 assert.deepEqual(s.log.filter(x=>x.type==='reveal').map(x=>x.cardId),choice?[choice]:[]);
 assert.deepEqual(physical(s),all);
});

test('Laguna still shuffles an unmatched library before finishing the attack',()=>{
 const s=field(),source=put(s,0,LAGUNA);
 give(s,0,'deck',[ONE,TWO,ONE]);
 const rng=s.rng;
 attack(s,source.uid);
 noBlock(s);
 assert.equal(s.decision,null);
 assert.equal(s.players[1].shields.length,4);
 assert.notEqual(s.rng,rng);
 assert.equal(s.players[0].hand.length,0);
});

for(const p of [0,1])test('Warrior may declare only against a tapped creature with an active blocker ability '+p,()=>{
 const s=field(p),source=put(s,p,WARRIOR),eligible=put(s,1-p,BLOCKER,true);
 put(s,1-p,TWO,true);
 put(s,1-p,BLOCKER);
 const ignored=put(s,1-p,BLOCKER,true);
 ignored.g35Ignored=s.turn;
 s.phase='attack';
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='attack').map(a=>a.target),[eligible.uid]);
 attack(s,source.uid,eligible.uid);
 noBlock(s);
 assert.ok(has(s,1-p,'grave',eligible.uid));
 assert.equal(s.players[1-p].shields.length,5);
});

test('A legal Warrior attack may be redirected by a Guardman without blocker',()=>{
 const s=field(),source=put(s,0,WARRIOR),target=put(s,1,BLOCKER,true),guard=put(s,1,GUARD);
 attack(s,source.uid,target.uid);
 act(s,'guardman',a=>a.uid===guard.uid);
 assert.ok(has(s,1,'battle',target.uid));
 assert.ok(has(s,1,'grave',guard.uid));
});

for(const [id,zone] of [[FISH,'hand'],[MOBY,'grave']])test('Relative power attack uses current power, excludes equal and stronger foes and preserves the selected UID '+id,()=>{
 let s=field(),source=put(s,0,id),weaker=put(s,1,TWO),equal=put(s,1,TWO),stronger=put(s,1,TWO),protectedTarget=put(s,1,ONE),ally=put(s,0,ONE);
 source.powerModifiers=[{amount:1000,attackOnly:true,expires:'end',who:0}];
 const equalBonus=e.card(id).power+1000-e.card(TWO).power;
 equal.powerModifiers=[{amount:equalBonus}];
 stronger.powerModifiers=[{amount:equalBonus+1000}];
 s.players[1].seals=[{...inst(ONE),faceDown:true,sealOf:protectedTarget.uid}];
 protectedTarget.sealed=true;
 const all=physical(s);
 attack(s,source.uid);
 assert.deepEqual(values(s),id===FISH?[weaker.uid,null]:[weaker.uid]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,weaker.uid);
 noBlock(s);
 assert.ok(has(s,1,zone,weaker.uid));
 for(const x of [equal,stronger,protectedTarget])assert.ok(has(s,1,'battle',x.uid));
 assert.ok(has(s,0,'battle',ally.uid));
 assert.deepEqual(physical(s),all);
});

test('Fish can decline and Moby without a weaker target proceeds without a choice',()=>{
 for(const id of [FISH,MOBY]){
  const s=field(),source=put(s,0,id),target=put(s,1,id===FISH?ONE:TWO);
  attack(s,source.uid);
  if(id===FISH)pick(s,null);
  noBlock(s);
  assert.equal(s.decision,null);
  assert.ok(has(s,1,'battle',target.uid));
  assert.equal(s.players[1].shields.length,4);
 }
});

for(const mode of ['destroy','seal'])test('Moby retains its pre-move or pre-seal power across JSON '+mode,()=>{
 let s=field(),source=put(s,0,MOBY),watcher=put(s,0,WATCHER),valid=put(s,1,TWO),equal=put(s,1,TWO);
 put(s,0,WATCHER);
 source.buff=2000;
 valid.powerModifiers=[{amount:1000}];
 equal.powerModifiers=[{amount:2000}];
 attack(s,source.uid);
 assert.equal(s.decision.type,'effectOrder');
 const comparison=s.pendingEffects.find(x=>x.uid===source.uid);
 const first=s.pendingEffects.find(x=>x.uid===watcher.uid);
 // Arrange for another waiting effect to move or seal the attacker first.
 if(mode==='destroy')first.task.defs=[{op:'ExactMove',owner:0,to:'grave',target:source.uid}];
 else first.task={op:'g35_Custom',p:0,source:WATCHER,uid:source.uid,name:'sealSelf',n:1};
 act(s,'orderEffect',a=>a.effectId===first.effectId);
 if(mode==='destroy')assert.ok(has(s,0,'grave',source.uid));
 else assert.ok(source.sealed);
 assert.equal(comparison.task.g692LastPower,4000);
 assert.equal(s.decision.type,'effectOrder');
 s=JSON.parse(JSON.stringify(s));
 act(s,'orderEffect',a=>a.effectId===comparison.effectId);
 assert.deepEqual(values(s),[valid.uid]);
 pick(s,valid.uid);
 assert.ok(has(s,1,'grave',valid.uid));
 assert.ok(has(s,1,'battle',equal.uid));
 assert.equal(s.players[1].shields.length,5);
});
