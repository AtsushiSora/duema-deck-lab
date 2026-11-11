import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const EMERALD='dmr21-011',MAGRA='dmr22-s08',ABARRE='dmr21-s05';
const PRINTS=['dm22rp2-TR5','dm22rp2x-TR5'];
const NATURE='dm01-108',WATER='dm01-083',HAND='dm01-027',GHOST='dm01-094';
const LIGHT='dm06-085',TYPHOON='dm11-043',MILL='dmd04-005',MAR='dmr22-008';
const FIELD='dmr21-036',LOCK='dmrp08-014',TSU='dmrp22-030',QX='dmrp07-m01',KALEIKO='dm22ex1-086';
const DARK_DRAGON='dmr15-042',FIRE_DRAGON='dmr20-061',LIGHT_WATER_DRAGON='dmr21-021',BIG='dm05-s04';
const MULTI='dm24ex2-019',TWIN='dmex17-105',COLORLESS='dmsd01-012';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
const value=c=>c.value?.uid??c.value;
const choices=s=>s.decision?.choices?.map(value)??[];
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function field(active=0){
 const s=Object.assign(setup(),{active});
 for(const p of [0,1]){give(s,p,'deck',Array(22).fill(NATURE));give(s,p,'grave',[]);}
 return s;
}
function put(s,p,z,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][z].push(x);
 return x;
}
function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}
test('Phase 1013 pins three official definitions and both Abaremax reprints',()=>{
 const m=read('tools/support-phase-1013.json'),refs=read('tools/image-reference-prints.json').prints;
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[EMERALD,MAGRA,ABARRE]);
 assert.deepEqual(m.printAliases.map(x=>x.id),PRINTS);
 for(const row of m.cards){
  const {id,name,faces}=row,[f]=faces,d=details.cards.find(x=>x.id===id),c=e.card(id);
  assert.deepEqual(faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:1013}),row.spec);
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'未知の能力。'}]},{phase:1013}));
  for(const [key,v] of Object.entries(row.spec))assert.deepEqual(c[key],v);
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [name,'creature',f.cost,parseInt(f.powerText,10),f.race,f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-1013');
  assert.equal(CARD_IMAGES[id],row.image);
  assert.ok(registry.get(id).supported&&row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[id],4);
  assert.deepEqual(refs.filter(x=>x.id===id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  for(const source of [data,details,snapshot])
   assert.deepEqual(source.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
 }
 for(const row of m.printAliases){
  assert.equal(row.canonicalId,ABARRE);
  assert.equal(registry.get(row.id).id,ABARRE);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.ok(row.verification.facesMatched);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1013}),m.cards.at(-1).spec);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[ABARRE,row.image]]);
 }
 assert.deepEqual(registry.resolveRows([ABARRE,...PRINTS].map(id=>({id,count:1}))),[{id:ABARRE,count:3}]);
});


for(const id of [EMERALD,MAGRA])test('Multicolor dragon enters mana tapped '+id,()=>{
 const s=field(),x=put(s,0,'hand',id);
 s.phase='charge';
 act(s,'charge',a=>a.uid===x.uid);
 assert.ok(has(s,0,'mana',x)&&x.tapped);
});

test('Emerald can immediately attack and double break',()=>{
 const s=field(),x=play(s,EMERALD);
 assert.equal(x.entered,s.turn);
 attack(s,x.uid);
 drain(s);
 assert.equal(s.metrics[0].breaks,2);
});

test('Emerald forces legal attacks against it while tapped',()=>{
 const s=field(1),x=put(s,0,'battle',EMERALD),other=put(s,0,'battle',NATURE,{tapped:true});
 const a=put(s,1,'battle',WATER);
 s.phase='attack';
 const targets=()=>new Set(e.getLegalActions(s).filter(z=>z.kind==='attack'&&z.uid===a.uid).map(z=>z.target));
 assert.deepEqual(targets(),new Set(['player',other.uid]));
 x.tapped=true;
 assert.deepEqual(targets(),new Set([x.uid]));
 assert.ok(e.getLegalActions(s).some(z=>z.kind==='endTurn'));
});

for(const replace of [false,true])test('Emerald may replace enemy spell discard with deployment '+replace,()=>{
 let s=field(1);
 const x=put(s,0,'hand',EMERALD);
 const before=physical(s);
 play(s,GHOST);
 assert.equal(s.decision.player,0);
 assert.match(s.decision.title,/かわりに/);
 s=JSON.parse(JSON.stringify(s));
 pick(s,replace);
 drain(s);
 assert.ok(has(s,0,replace?'battle':'grave',x));
 assert.deepEqual(physical(s).filter(uid=>before.includes(uid)),before);
});

test('Emerald can replace a discard caused by an opposing creature on its own turn',()=>{
 const s=field(),x=put(s,0,'hand',EMERALD);
 put(s,1,'battle',MAR);
 play(s,LIGHT);
 act(s,'orderEffect');
 pick(s,x.uid);
 assert.equal(s.decision.player,0);
 pick(s,true);
 assert.ok(has(s,0,'battle',x));
 pick(s,null);
 pick(s,null);
 pick(s,null);
 assert.equal(s.decision,null);
});

test('Emerald is discarded normally by its owner’s spell',()=>{
 const s=field(),x=put(s,0,'hand',EMERALD);
 play(s,TYPHOON);
 pick(s,0);
 pick(s,x.uid);
 assert.equal(s.decision,null);
 assert.ok(has(s,0,'grave',x));
});

for(const [id,eligible] of [[DARK_DRAGON,true],[FIRE_DRAGON,true],[LIGHT_WATER_DRAGON,false]])test('Magra changes from a Dark or Fire Dragon '+id,()=>{
 const s=field(),a=put(s,0,'battle',id),x=put(s,0,'hand',MAGRA);
 attack(s,a.uid);
 if(eligible){
  assert.equal(s.decision.task.op,'revDeclare');
  pick(s,true);
  pick(s,a.uid);
 }
 drain(s);
 assert.ok(has(s,0,eligible?'battle':'hand',x));
 assert.ok(has(s,0,eligible?'hand':'battle',a));
 assert.equal(s.metrics[0].breaks,eligible?2:(e.card(id).breaker||1));
});

test('Magra destroys the winning attacker with Slayer and returns if its owner controls a D2 field',()=>{
 const s=field(1),x=put(s,0,'battle',MAGRA,{tapped:true}),a=put(s,1,'battle',BIG);
 put(s,0,'battle',FIELD);
 const before=physical(s);
 attack(s,a.uid,x.uid);
 act(s,'noBlock');
 drain(s);
 assert.ok(has(s,1,'grave',a)&&has(s,0,'hand',x));
 assert.deepEqual(physical(s),before);
});

for(const mode of ['self','opponent','none','locked'])test('Magra resolves when put in grave from deck '+mode,()=>{
 const s=field(),x=inst(MAGRA);
 s.players[0].deck.unshift(x);
 if(mode!=='none')put(s,mode==='opponent'?1:0,'battle',FIELD);
 if(mode==='locked')put(s,1,'battle',LOCK);
 play(s,MILL);
 drain(s);
 assert.ok(has(s,0,mode==='self'?'hand':'grave',x));
});

test('Magra returns from hand discard only while a friendly D2 field is present',()=>{
 for(const ownField of [false,true]){
  const s=field(1),x=put(s,0,'hand',MAGRA);
  if(ownField)put(s,0,'battle',FIELD);
  play(s,GHOST);
  drain(s);
  assert.ok(has(s,0,ownField?'hand':'grave',x));
 }
});

test('Abaremax reveals and moves the full prefix through a monocolor card',()=>{
 const s=field();
 give(s,0,'deck',[MULTI,TWIN,NATURE,WATER]);
 const [a,b,stop,remaining]=s.players[0].deck;
 const x=play(s,ABARRE);
 drain(s);
 assert.deepEqual(s.players[0].deck.map(y=>y.uid),[remaining.uid]);
 assert.deepEqual(s.players[0].mana.slice(-3).map(y=>[y.uid,y.tapped]),[[a.uid,true],[b.uid,true],[stop.uid,false]]);
 const reveal=s.log.find(y=>y.type==='reveal'&&y.cardId===ABARRE);
 for(const y of [a,b,stop])assert.ok(JSON.stringify(reveal).includes(e.card(y).name));
 assert.ok(!JSON.stringify(reveal).includes(e.card(remaining).name));
 x.entered=0;
 attack(s,x.uid);
 drain(s);
 assert.equal(s.metrics[0].breaks,2);
});

test('Abaremax also stops at a colorless card',()=>{
 const s=field();
 give(s,0,'deck',[COLORLESS,MULTI,NATURE]);
 const [first,...remaining]=s.players[0].deck;
 play(s,ABARRE);
 assert.deepEqual(s.players[0].deck,remaining);
 assert.equal(s.players[0].mana.at(-1).uid,first.uid);
 assert.equal(first.tapped,false);
});

test('Abaremax moves the entire library of multicolor cards and can lose by deckout',()=>{
 const s=field();
 give(s,0,'deck',[MULTI,TWIN]);
 const deck=s.players[0].deck.slice();
 play(s,ABARRE);
 assert.equal(s.winner,1);
 assert.deepEqual(s.players[0].deck,[]);
 assert.deepEqual(s.players[0].mana.slice(-2),deck);
});

for(const mode of ['first only','no reveal','grave redirect'])test('Abaremax observes '+mode,()=>{
 const s=field();
 give(s,0,'deck',[MULTI,NATURE,WATER]);
 const [a,b,tail]=s.players[0].deck;
 put(s,1,'battle',{'first only':TSU,'no reveal':QX,'grave redirect':KALEIKO}[mode]);
 play(s,ABARRE);
 drain(s);
 if(mode==='first only'){
  assert.ok(has(s,0,'mana',a)&&has(s,0,'deck',b));
  assert.ok(a.tapped);
 }else if(mode==='no reveal'){
  assert.deepEqual(s.players[0].deck,[a,b,tail]);
  assert.ok(!s.log.some(y=>y.type==='reveal'&&y.cardId===ABARRE));
 }else{
  assert.deepEqual(s.players[0].grave,[a,b]);
  assert.deepEqual(s.players[0].deck,[tail]);
 }
});
