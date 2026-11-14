import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const ABYSS='dmrp20-004',DIA='dm14-s06',REPRINT='dmc55-020',ESCO='dm38-002';
const WEAK='dm01-100',BLOCK='dmrp20-025',THRESHOLD='dmx22b-128',STAR='dmrp21-019';
const GENKA='dmrp08-014',DRAGON='dmrp20-009',CHANGE='dmr21-l02',NATURE='dm01-108';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1]){give(s,p,'deck',Array(24).fill(NATURE));give(s,p,'grave',[]);}
 return s;
}
function add(s,p,zone,id,fields={}){
 const x=Object.assign(inst(id),fields);s.players[p][zone].push(x);return x;
}
function play(s,id){
 const x=add(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&!a.alternative);
 drain(s);return x;
}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const options=s=>s.decision?.choices.map(x=>x.value?.uid??x.value)??[];
const pick=(s,v)=>act(s,'extended',a=>options(s)[a.choice]===v);
function finish(s){if(s.decision?.type==='block')act(s,'noBlock');drain(s);}

test('official prints preserve one supported ID per name and resolve the DMC-55 reprint',()=>{
 const m=read('tools/support-phase-1270.json'),refs=read('tools/image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[ABYSS,DIA,ESCO]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[[REPRINT,DIA]]);
 for(const row of [...m.cards,...m.printAliases]){
  const {id,canonicalId=id,name,faces:[f],image}=row;
  const def={id,status:'complete',faces:row.faces},c=e.card(canonicalId);
  if(id===canonicalId)assert.deepEqual(row.faces,details.cards.find(x=>x.id===id).faces);
  assert.deepEqual(standardCardSpec(def,{phase:1270}),row.spec);
  assert.throws(()=>standardCardSpec(def,{phase:1269}));
  def.faces=structuredClone(def.faces);def.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(def,{phase:1270}));
  assert.deepEqual(cat.resolveRows([{id,count:1}]),[{id:canonicalId,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[canonicalId]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,m.regulationVerification.limits[id]]);
  for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
  if(id===canonicalId)assert.equal(CARD_IMAGES[id],image);
  assert.ok(refs.some(x=>x.id===id&&x.canonicalId===canonicalId&&x.image===image));
 }
});

test('Diablost gives Blocker only to its opponent and that player can use it',()=>{
 const s=field(),x=play(s,DIA);
 const ally=add(s,0,'battle',WEAK),opp=add(s,1,'battle',WEAK);
 assert.equal(e.effectiveCard(opp,s).blocker,true);
 assert.ok(!e.effectiveCard(x,s).blocker&&!e.effectiveCard(ally,s).blocker);
 assert.equal(e.effectiveCard(x,s).breaker,2);
 attack(s,ally.uid);act(s,'block',a=>a.uid===opp.uid);drain(s);
 assert.ok(has(s,0,'grave',ally)&&has(s,1,'grave',opp));
});

test('Hurricane gives both sides haste and forces attacks; its prohibition leaves Blocker intact',()=>{
 for(const p of [0,1]){
  const s=field(p),fresh=add(s,p,'battle',WEAK,{entered:s.turn});
  add(s,1-p,'battle',ABYSS);
  const blocker=add(s,1-p,'battle',BLOCK);
  act(s,'toAttack');
  assert.ok(!e.getLegalActions(s).some(a=>a.kind==='endTurn'));
  assert.equal(e.effectiveCard(blocker,s).blocker,true);
  attack(s,fresh.uid);
  assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'));
  finish(s);
  assert.equal(s.players[1-p].shields.length,4);
  assert.ok(has(s,p,'grave',fresh));
  assert.ok(has(s,1-p,'battle',blocker));
 }
});

test('Hurricane consumes its EX Life at attack end then becomes an 18000 four-shield breaker',()=>{
 const s=field(),x=play(s,ABYSS);
 assert.deepEqual([e.power(x,false,s),e.effectiveCard(x,s).breaker],[6000,2]);
 assert.equal(e.exLifeShields(s,0,x).length,1);
 attack(s,x.uid);finish(s);
 assert.ok(has(s,0,'battle',x));
 assert.equal(e.exLifeShields(s,0,x).length,0);
 assert.deepEqual([e.power(x,false,s),e.effectiveCard(x,s).breaker],[18000,4]);
 assert.equal(s.players[1].shields.length,3);
});

test('two Hurricanes trigger independently and destroy the attacker after EX Life (QA40679)',()=>{
 const s=field(),x=play(s,ABYSS),other=play(s,ABYSS);
 attack(s,x.uid);finish(s);
 assert.ok(has(s,0,'grave',x));
 assert.equal(e.exLifeShields(s,0,other).length,1);
});

test('an attacker is safe if the Hurricane left during the attack (QA40677)',()=>{
 const s=field(),x=add(s,0,'battle',THRESHOLD),y=add(s,1,'battle',ABYSS);
 attack(s,x.uid);finish(s);
 assert.ok(has(s,1,'grave',y)&&has(s,0,'battle',x));
});

test('Hurricane targets the Revolution Change creature at attack end (QA40680)',()=>{
 const s=field(),dragon=add(s,0,'battle',DRAGON),change=add(s,0,'hand',CHANGE);
 add(s,1,'battle',ABYSS);
 attack(s,dragon.uid);pick(s,true);finish(s);
 assert.ok(has(s,0,'hand',dragon)&&has(s,0,'grave',change));
});

test('Hurricane tracks the creature through Star evolution reconstruction',()=>{
 for(const id of [WEAK,'dm25rp4-013']){
  const s=field(),base=inst(id),x=add(s,0,'battle',STAR,{under:[base]});
  add(s,0,'battle',ABYSS);
  attack(s,x.uid);
  if(s.decision?.type==='block')act(s,'noBlock');
  if(s.decision?.type==='breakChoice')act(s,'breakShields');
  act(s,'orderEffect',a=>s.pendingEffects.some(y=>y.effectId===a.effectId&&y.source===STAR));
  finish(s);
  assert.ok(has(s,0,'grave',x));
  assert.equal(has(s,0,'grave',base),id===WEAK);
  assert.equal(has(s,0,'battle',base),id!==WEAK);
 }
});

test('Escobaldo can decline or needs seven grave cards; a full payment sweeps both sides, without choosing',()=>{
 for(const n of [6,7,8]){
  const s=field(),x=add(s,0,'battle',ESCO);
  const own=add(s,0,'battle',WEAK),foe=add(s,1,'battle','dm24rp4-S11',{justDiverActive:true}),large=add(s,1,'battle',THRESHOLD);
  const grave=Array.from({length:n},()=>add(s,0,'grave',NATURE));
  attack(s,x.uid);
  if(n===7)pick(s,null);
  if(n===8)for(const y of grave.slice(0,7).reverse())pick(s,y.uid);
  finish(s);
  assert.ok(has(s,0,'battle',x)&&has(s,1,'battle',large));
  assert.equal(has(s,0,'grave',own),n===8);
  assert.equal(has(s,1,'grave',foe),n===8);
  if(n===8){
   assert.deepEqual(s.players[0].deck.slice(-7).map(y=>y.uid),grave.slice(0,7).reverse().map(y=>y.uid));
   assert.ok(has(s,0,'grave',grave[7]));
  }
 }
});

test('Escobaldo still sweeps when its graveyard cannot move (QA40371)',()=>{
 const s=field(),x=add(s,0,'battle',ESCO),y=add(s,1,'battle',GENKA);
 const grave=Array.from({length:7},()=>add(s,0,'grave',NATURE)),last=s.players[0].deck.at(-1).uid;
 attack(s,x.uid);
 for(const g of grave)pick(s,g.uid);
 finish(s);
 assert.ok(has(s,1,'grave',y));
 assert.ok(grave.every(g=>has(s,0,'grave',g)));
 assert.equal(s.players[0].deck.at(-1).uid,last);
});
