import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const POINT='dmr14-024',Q='dmr13-003',GAI='dmr14-v02',YOMI='dmr12-s01';
const PRINTS=['dmr14-V2SEC1','dmr14-V2SEC2','dmart13-005'].map(id=>[id,GAI]);
const FIRE='dm01-097',NATURE='dm01-108',WATER='dm01-083',BLOCKER='dm01-076';
const DRAGNER='dm25bd3-020',BOUNCE='dm01-086',DESTROY='dm01-027',SWEEP='dm14-015';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const value=c=>c.value?.uid??c.value;
const choices=s=>s.decision.choices.map(value);
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);

function field(){
 const s=setup();
 for(const p of [0,1]){give(s,p,'deck',Array(20).fill(NATURE));give(s,p,'grave',[]);}
 return s;
}

function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}

function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}

test('Phase 993 registers four official definitions and maps three reprints to their canonical IDs',()=>{
 const m=read('tools/support-phase-993.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[POINT,Q,GAI,YOMI]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),PRINTS);
 assert.deepEqual(catalogue.resolveRows(PRINTS.map(([id])=>({id,count:1}))),
  [{id:GAI,count:3}]);
 for(const row of m.cards){
  const {id,name,faces}=row,[f]=faces,d=details.cards.find(x=>x.id===id),c=e.card(id);
  assert.deepEqual(faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:993}),row.spec);
  const altered=structuredClone(d);
  altered.faces[0].abilityText+='未知の追加能力。';
  assert.throws(()=>standardCardSpec(altered,{phase:993}));
  for(const [key,v] of Object.entries(row.spec))assert.deepEqual(c[key],v);
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [name,f.typeText==='呪文'?'spell':'creature',f.cost,Number(f.powerText),f.race,f.civilizations.filter(color=>color!=='無色'),1,4]);
  assert.equal(c.supportBatch,'phase-993');
  assert.equal(CARD_IMAGES[id],row.image);
  assert.ok(catalogue.get(id).supported);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
 }
 for(const row of [...m.cards,...m.printAliases]){
  assert.ok(row.verification.facesMatched);
  assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[row.canonicalId??row.id,row.image]]);
  if(row.canonicalId)assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:993}),m.cards.find(x=>x.id===row.canonicalId).spec);
 }
});

const targetCard=(s,x)=>act(s,'effect',a=>a.targets.some(t=>t.uid===x.uid));
const startTurn=(s,p)=>{s.active=p;s.phase='main';};
const withPower=(s,p,n)=>put(s,p,'battle',FIRE,{powerModifiers:[{amount:n-e.card(FIRE).power}]});

for(const destination of ['deckTop','deck'])test('Singularity draws twice and returns one chosen card to '+destination,()=>{
 let s=field();
 const previous=put(s,0,'hand',WATER),top=s.players[0].deck[0];
 const all=physical(s),spell=play(s,POINT);
 assert.equal(s.players[0].deck.length,18);
 assert.ok(choices(s).includes(top.uid)&&choices(s).includes(previous.uid));
 assert.ok(!choices(s).includes(null));
 pick(s,top.uid);s=restore(s);
 assert.deepEqual(choices(s),['deckTop','deck']);
 pick(s,destination);
 assert.equal(s.decision,null);
 assert.equal(s.players[0].deck.at(destination==='deckTop'?0:-1).uid,top.uid);
 assert.deepEqual(physical(s).filter(uid=>uid!==spell.uid),all);
});

test('Singularity G Zero requires an own unsealed Water Dragner and pays no mana',()=>{
 for(const mode of ['own','enemy','sealed','mana','other']){
  const s=field(),spell=put(s,0,'hand',POINT);
  give(s,0,'mana',[]);
  const host=put(s,mode==='enemy'?1:0,mode==='mana'?'mana':'battle',mode==='other'?WATER:DRAGNER,{sealed:mode==='sealed'});
  if(host.sealed)put(s,0,'seals',NATURE,{faceDown:true,sealOf:host.uid});
  const a=e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===spell.uid);
  assert.equal(a?.freeSpell,mode==='own'?'G・ゼロ':undefined,mode);
  if(a){e.step(s,a);drain(s);assert.ok(has(s,0,'grave',spell));assert.equal(s.players[0].mana.length,0);}
 }
});

function chooseEntry(s,label){
 const a=e.getLegalActions(s).find(a=>a.label.includes(label));
 assert.ok(a,JSON.stringify(e.getLegalActions(s)));
 e.step(s,a);
}

for(const drawFirst of [true,false])test('Descartes has independently ordered entry triggers, draw first '+drawFirst,()=>{
 const s=field(),offered=put(s,0,'hand',FIRE);
 give(s,0,'shields',[DESTROY]);const trigger=s.players[0].shields[0];
 give(s,0,'mana',[...Array(6).fill(WATER),DRAGNER]);
 const q=play(s,Q);
 assert.equal(e.effectiveCard(q,s).blocker,true);
 assert.equal(e.effectiveCard(q,s).breaker,2);
 assert.equal(s.decision.type,'effectOrder');
 if(drawFirst){
  chooseEntry(s,'マナ武装7');
  assert.deepEqual(choices(s),[0,1,2,3,4,5]);
  pick(s,5);
 }
 else chooseEntry(s,'手札とシールド');
 assert.ok(choices(s).includes(null));
 pick(s,offered.uid);
 assert.ok(has(s,0,'shields',offered));
 assert.ok(!s.players[0].shields.find(x=>x.uid===offered.uid).faceUp);
 assert.ok(choices(s).includes(offered.uid));
 pick(s,trigger.uid);
 assert.ok(has(s,0,'hand',trigger));
 if(!drawFirst)pick(s,0);
 assert.equal(s.decision,null);
 assert.equal(s.players[0].deck.length,drawFirst?15:20);
});

test('Descartes can decline its shield exchange and six Water mana do not enable its draw',()=>{
 const s=field(),offered=put(s,0,'hand',FIRE);
 give(s,0,'mana',[...Array(6).fill(WATER),NATURE]);
 play(s,Q);
 chooseEntry(s,'マナ武装7');
 assert.deepEqual(choices(s),[offered.uid,null]);
 pick(s,null);
 assert.equal(s.decision,null);
 assert.equal(s.players[0].deck.length,20);
 assert.equal(s.players[0].shields.length,5);
 assert.ok(has(s,0,'hand',offered));
});

for(const armed of [true,false])test('Gaiglen is a speed attacker and counts Fire mana when attacking, armed '+armed,()=>{
 const s=field();
 give(s,0,'mana',[...Array(8).fill(FIRE),armed?DRAGNER:NATURE]);
 const x=play(s,GAI);
 assert.equal(e.effectiveCard(x,s).breaker,2);
 attack(s,x.uid);drain(s);
 assert.equal(x.tapped,!armed);
 assert.equal(e.power(x,false,s),armed?14000:11000);
 if(armed){
  attack(s,x.uid);drain(s);
  assert.equal(x.tapped,false);
  assert.equal(e.power(x,false,s),17000);
 }
 s.phase='attack';act(s,'endTurn');drain(s);
 assert.equal(e.power(x,false,s),11000);
});

test('Gaiglen retaliates after enemy bounce using its last power, including equal and untargetable creatures',()=>{
 let s=field();startTurn(s,1);
 const x=put(s,0,'battle',GAI,{powerModifiers:[{amount:3000,expires:'end',who:1}]});
 const own=withPower(s,0,5000),weak=withPower(s,1,5000),equal=withPower(s,1,14000),strong=withPower(s,1,14001);
 equal.g34Grants=[{turn:s.turn,untargetable:true}];
 play(s,BOUNCE);
 s=restore(s);targetCard(s,x);drain(s);
 assert.ok(has(s,0,'hand',x)&&has(s,0,'battle',own)&&has(s,1,'battle',strong));
 assert.ok(has(s,1,'grave',weak)&&has(s,1,'grave',equal));
});

test('Gaiglen does not retaliate on an attack or when its controller chooses it',()=>{
 for(const via of ['attack','own']){
  const s=field(),x=put(s,0,'battle',GAI,{tapped:true});
  const bystander=withPower(s,1,5000);
  if(via==='own'){play(s,BOUNCE);targetCard(s,x);}
  else{
   startTurn(s,1);
   const attacker=withPower(s,1,15000);
   attack(s,attacker.uid,x.uid);
  }
  drain(s);
  assert.ok(has(s,1,'battle',bystander),via);
  assert.ok(has(s,0,via==='own'?'hand':'grave',x),via);
 }
});

test('Yomi alone cannot be blocked, can block, breaks three and untaps mandatorily at its own end',()=>{
 const s=field(),x=put(s,0,'battle',YOMI),defender=put(s,1,'battle',BLOCKER);
 assert.equal(e.effectiveCard(x,s).blocker,true);
 assert.equal(e.effectiveCard(x,s).unblockable,true);
 const companion=put(s,0,'battle',FIRE);
 assert.ok(!e.effectiveCard(x,s).unblockable);
 companion.sealed=true;put(s,0,'seals',NATURE,{faceDown:true,sealOf:companion.uid});
 attack(s,x.uid);drain(s);
 assert.equal(defender.tapped,false);
 assert.equal(s.players[1].shields.length,2);
 assert.ok(x.tapped);
 s.phase='attack';act(s,'endTurn');drain(s);
 assert.equal(x.tapped,false);
});

test('Yomi replaces any departure while alone, but both creatures leave in a simultaneous sweep',()=>{
 for(const removal of [BOUNCE,DESTROY]){
  const s=field();startTurn(s,1);
  const x=put(s,0,'battle',YOMI);
  play(s,removal);
  targetCard(s,x);
  drain(s);
  assert.ok(has(s,0,'battle',x),removal);
 }
 const s=field();startTurn(s,1);
 const x=put(s,0,'battle',YOMI),ally=put(s,0,'battle',FIRE);
 for(let i=0;i<4;i++)put(s,1,'battle',FIRE);
 play(s,SWEEP);drain(s);
 assert.ok(has(s,0,'grave',x)&&has(s,0,'grave',ally));
});

test('Yomi at zero power stays alone and is destroyed when another creature enters',()=>{
 const s=field(),x=put(s,0,'battle',YOMI,{powerModifiers:[{amount:-12000}]});
 play(s,POINT);drain(s);
 assert.equal(e.power(x,false,s),0);
 assert.ok(has(s,0,'battle',x));
 const ally=play(s,FIRE);drain(s);
 assert.ok(has(s,0,'grave',x)&&has(s,0,'battle',ally));
});
