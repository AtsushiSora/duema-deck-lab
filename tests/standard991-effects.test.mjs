import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const CURTAIN='dmr13-078',EUL='dmr13-039',DENEB='dmr14-021',CHORO='dmr12-029',ZODIAC='dmr13-015';
const PRINTS=[
 ...['dmex06-071','dmbd08-a-009','dmsd05-008','promoy14-051','promoy14-054','promoy16-070'].map(id=>[id,EUL]),
 ...['dmx20-037','promoy14-008'].map(id=>[id,DENEB]),
 ['dmd23-006',ZODIAC]
];
const LIGHT='dm01-075',FIRE='dm01-097',NATURE='dm01-108',WATER='dm01-083';
const BLOCKER='dm01-076',HAND='dm01-027',BOUNCE='dm01-086',UNTAP='dm26rp2-057';
const LARGE_LIGHT='dmr13-041';
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

test('Phase 991 registers five official definitions and maps nine reprints to their canonical IDs',()=>{
 const m=read('tools/support-phase-991.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[CURTAIN,EUL,DENEB,CHORO,ZODIAC]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),PRINTS);
 assert.deepEqual(catalogue.resolveRows(PRINTS.map(([id])=>({id,count:1}))),
  [{id:EUL,count:6},{id:DENEB,count:2},{id:ZODIAC,count:1}]);
 for(const row of m.cards){
  const {id,name,faces}=row,[f]=faces,d=details.cards.find(x=>x.id===id),c=e.card(id);
  assert.deepEqual(faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:991}),row.spec);
  const altered=structuredClone(d);
  altered.faces[0].abilityText+='未知の追加能力。';
  assert.throws(()=>standardCardSpec(altered,{phase:991}));
  for(const [key,v] of Object.entries(row.spec))assert.deepEqual(c[key],v);
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [name,f.typeText==='呪文'?'spell':'creature',f.cost,Number(f.powerText),f.race,f.civilizations,1,id===CHORO?40:4]);
  assert.equal(c.supportBatch,'phase-991');
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
  if(row.canonicalId)assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:991}),m.cards.find(x=>x.id===row.canonicalId).spec);
 }
});

const targets=(s,x)=>e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===x.uid).map(a=>a.target);
function end(s){
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
}
function breakTrigger(s,id){
 give(s,0,'shields',[id]);
 s.active=1;
 const attacker=put(s,1,'battle',FIRE);
 attack(s,attacker.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields');
 act(s,'useTrigger',a=>a.cardId===id);
 return attacker;
}

test('Curtain shields a chosen ally from enemy effects through the turn and still allows combat',()=>{
 let s=field();
 const x=put(s,0,'battle',LIGHT,{tapped:true}),other=put(s,0,'battle',NATURE),foe=put(s,1,'battle',FIRE);
 play(s,CURTAIN);
 assert.deepEqual(new Set(choices(s)),new Set([x.uid,other.uid]));
 pick(s,x.uid);
 end(s);
 s=restore(s);
 s.phase='main';
 play(s,HAND);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='effect'&&a.targets?.some(t=>t.uid===x.uid)));
 act(s,'effect',a=>a.targets?.some(t=>t.uid===other.uid));
 assert.ok(has(s,0,'grave',other));
 s.phase='attack';
 assert.ok(targets(s,foe).includes(x.uid));
 end(s);
 assert.ok(!e.effectiveCard(s.players[0].battle[0],s).untargetable);
});

test('Curtain allows the protected creature to block and allows its owner to choose it',()=>{
 const s=field(),x=put(s,0,'battle',BLOCKER),foe=put(s,1,'battle',FIRE);
 play(s,CURTAIN);pick(s,x.uid);
 play(s,BOUNCE);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='effect'&&a.targets?.some(t=>t.uid===x.uid)));
 act(s,'effect',a=>a.targets?.some(t=>t.uid===foe.uid));
 const attacker=put(s,1,'battle',FIRE);
 end(s);
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===x.uid);
 drain(s);
 assert.ok(has(s,1,'grave',attacker));
});

test('Eul chooses an untapped creature first and checks nature mana for a separate target',()=>{
 for(const n of [4,5]){
  let s=field();
  give(s,0,'mana',[...Array(n).fill(NATURE),...Array(6).fill(LIGHT)]);
  const x=put(s,1,'battle',FIRE),tapped=put(s,1,'battle',WATER,{tapped:true});
  const spell=put(s,0,'hand',EUL);
  const before=physical(s);
  act(s,'play',a=>a.uid===spell.uid);
  assert.deepEqual(choices(s),[x.uid]);
  pick(s,x.uid);
  assert.ok(has(s,1,'mana',x));
  if(n===5){s=restore(s);assert.deepEqual(choices(s),[tapped.uid]);pick(s,tapped.uid);}
  assert.equal(has(s,1,'mana',tapped),n===5);
  assert.ok(has(s,0,'grave',spell));
  assert.deepEqual(physical(s),before);
 }
});

test('Eul resolves the mana armed Shield Trigger even when every enemy is already tapped',()=>{
 const s=field();
 const attacker=breakTrigger(s,EUL);
 assert.deepEqual(choices(s),[attacker.uid]);
 pick(s,attacker.uid);drain(s);
 assert.ok(has(s,1,'mana',attacker));
});

test('Deneb Mongo offers draw and independent optional deployment of a small Light creature',()=>{
 for(const take of [0,1]){
  const s=field();
  give(s,0,'deck',[LIGHT,NATURE,FIRE]);
  const top=s.players[0].deck[0],small=put(s,0,'hand',BLOCKER);
  put(s,0,'hand',WATER);put(s,0,'hand',LARGE_LIGHT);put(s,0,'hand',CURTAIN);
  play(s,DENEB);
  pick(s,take);
  assert.deepEqual(new Set(choices(s)),new Set([small.uid,...(take?[top.uid]:[]),null]));
  pick(s,take?top.uid:small.uid);
  assert.ok(has(s,0,'battle',take?top:small));
  assert.equal(has(s,0,'deck',top),!take);
 }
});

test('Deneb Mongo may decline deployment, block and attack an enemy creature',()=>{
 const s=field(),foe=put(s,1,'battle',FIRE,{tapped:true});
 put(s,0,'hand',LIGHT);
 const x=play(s,DENEB);
 pick(s,0);pick(s,null);
 s.phase='attack';
 x.entered=0;
 assert.deepEqual(targets(s,x),[foe.uid]);
 end(s);
 attack(s,foe.uid);
 act(s,'block',a=>a.uid===x.uid);
 drain(s);
 assert.ok(has(s,1,'grave',foe));
});

test('Chorochu counts other live allied copies during its own attack and can fill a deck',()=>{
 for(const n of [1,2]){
  const s=field(),x=put(s,0,'battle',CHORO);
  for(let i=0;i<n;i++)put(s,0,'battle',CHORO);
  const sealed=put(s,0,'battle',CHORO,{sealed:true});
  put(s,0,'seals',FIRE,{faceDown:true,sealOf:sealed.uid});
  put(s,1,'battle',CHORO);
  assert.deepEqual(e.validateDeck({format:'original',cards:[{id:CHORO,count:40}]}),[]);
  assert.equal(e.power(x,false,s),2000);
  assert.equal(e.power(x,true,s),2000+2000*n);
  assert.equal(e.effectiveCard(x,s).breaker,1);
  attack(s,x.uid);drain(s);
  assert.equal(s.players[1].shields.length,n===2?3:4);
 }
});

test('Chorochu gains the breaker from external power while outside an attack',()=>{
 const s=field(),x=put(s,0,'battle',CHORO);
 play(s,UNTAP);
 pick(s,x.uid);
 assert.equal(e.power(x,false,s),6000);
 assert.equal(e.effectiveCard(x,s).breaker,2);
});

test('Zodiac taps up to three and freezes the chosen set only with five Light cards',()=>{
 for(const n of [4,5]){
  let s=field();
  give(s,0,'mana',[...Array(n).fill(LIGHT),...Array(8).fill(NATURE)]);
  const x=put(s,1,'battle',FIRE),y=put(s,1,'battle',WATER,{tapped:true}),other=put(s,1,'battle',NATURE);
  play(s,ZODIAC);
  pick(s,x.uid);
  s=restore(s);
  pick(s,y.uid);pick(s,null);
  const byId=uid=>s.players[1].battle.find(x=>x.uid===uid);
  assert.ok(byId(x.uid).tapped&&byId(y.uid).tapped&&!byId(other.uid).tapped);
  end(s);
  assert.equal(byId(x.uid).tapped,n===5);
  assert.equal(byId(y.uid).tapped,n===5);
  if(n===5){
   s.phase='main';
   play(s,UNTAP);
   pick(s,x.uid);
   assert.equal(byId(x.uid).tapped,false);
  }
  end(s);end(s);
  assert.equal(byId(y.uid).tapped,false);
 }
});

test('Zodiac can select zero and also work as a Shield Trigger',()=>{
 const s=field(),foe=put(s,1,'battle',WATER);
 play(s,ZODIAC);
 pick(s,null);
 assert.equal(foe.tapped,false);
 const attacker=breakTrigger(s,ZODIAC);
 pick(s,foe.uid);pick(s,null);drain(s);
 assert.ok(foe.tapped&&attacker.tapped);
});
