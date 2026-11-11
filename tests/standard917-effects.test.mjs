import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain,GEN} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const SHELL='dm03-034',HURRICANE='dm06-051',ASYLUM='dm13-s03';
const BODY='dm01-108',FIRE='dm01-097',ANGEL='dm01-s01',DRAGON='dm01-s08',BOTH='dmrp20-027';
const EVOLUTION='dm24bd3-009',STAR='dmrp17-044',G_NEO='dm25rp2-017',ONIKAMASU='dmrp01-041';
const EX_LIFE='dmrp17-s07',HAND='dm01-027',FUUJIN='dmrp22-037',SURFER='dm05-024',DOKKOI='dm26rp1-009';
const restore=s=>JSON.parse(JSON.stringify(s));
const options=s=>s.decision?.choices.map(o=>o.value?.uid??o.value)??[];
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();

function field(active=0){
 const s=setup();
 s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(16).fill(BODY));
 return s;
}
function put(s,p,id,zone='battle',attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
function play(s,id){
 const x=put(s,s.active,id,'hand');
 act(s,'play',a=>a.uid===x.uid);
 return x;
}
function pick(s,value){
 act(s,'extended',a=>options(s)[a.choice]===value);
}

test('Phase 917 registers complete canonical definitions and resolves both official reprint IDs',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-917.json',import.meta.url)));
 const cat=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 assert.deepEqual(manifest.cards.map(c=>c.id),[SHELL,HURRICANE,ASYLUM]);
 assert.deepEqual(manifest.printAliases.map(c=>[c.id,c.canonicalId]),[['dm18-064',HURRICANE],['dmc43-012',ASYLUM]]);
 for(const row of manifest.cards){
  const detail=details.cards.find(c=>c.id===row.id),card=e.card(row.id),[face]=row.faces;
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(standardCardSpec(detail,{phase:917}),row.spec);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(card[key],value);
  const altered=structuredClone(detail);
  altered.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(altered,{phase:917}));
  assert.deepEqual([card.type,card.cost,card.power,card.civilizations,card.race,card.manaValue,card.limit],
   [row.id===HURRICANE?'spell':'creature',face.cost,Number(face.powerText),face.civilizations,face.race,1,4]);
  for(const source of [data,snapshot,details])
   assert.deepEqual(source.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[row.id]);
 }
 for(const row of [...manifest.cards,...manifest.printAliases]){
  assert.ok(row.verification.facesMatched);
  assert.equal(manifest.regulationVerification.limits[row.id],4);
  const reference=refs.find(c=>c.id===row.id);
  assert.deepEqual([reference.canonicalId,reference.image],[row.canonicalId??row.id,row.image]);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(cat.get(row.id).id,row.canonicalId??row.id);
 }
 const deck={id:'phase917',name:'再構築とシンパシー',cards:[
  SHELL,'dm18-064','dmc43-012',BODY,FIRE,ANGEL,DRAGON,ONIKAMASU,HAND,SURFER
 ].map(id=>({id,count:4}))};
 const normalized={...deck,cards:cat.resolveRows(deck.cards)};
 assert.equal(cat.coverage(deck).unsupported,0);
 assert.deepEqual(e.validateDeck(normalized),[]);
});

test('Shell Pouch optionally removes the opposing evolution top and preserves the underlying stack and state',()=>{
 let s=field();
 const top=put(s,1,EVOLUTION,'battle',{tapped:true}),base=inst(FIRE),below=inst(BODY);
 top.under=[base,below];
 put(s,1,ONIKAMASU);
 put(s,1,G_NEO);
 put(s,0,EVOLUTION,'battle',{under:[inst(FIRE)]});
 play(s,SHELL);
 assert.deepEqual(options(s),[top.uid,null]);
 const before=physical(s);
 s=restore(s);
 pick(s,top.uid);
 assert.ok(has(s,1,'grave',top));
 const rebuilt=s.players[1].battle.find(x=>x.uid===base.uid);
 assert.ok(rebuilt?.tapped);
 assert.deepEqual(rebuilt.under.map(x=>x.uid),[below.uid]);
 assert.deepEqual(physical(s),before);
});

test('Shell Pouch can decline and does not offer sealed evolutions or act under Genmu',()=>{
 const s=field();
 const top=put(s,1,EVOLUTION,'battle',{under:[inst(FIRE)]});
 play(s,SHELL);
 pick(s,null);
 assert.ok(has(s,1,'battle',top));
 top.sealed=true;
 put(s,1,EVOLUTION,'seals',{faceDown:true,sealOf:top.uid});
 put(s,1,BODY);
 play(s,SHELL);
 assert.equal(s.decision,null);
 assert.ok(has(s,1,'battle',top));
 const muted=field();
 put(muted,1,EVOLUTION,'battle',{under:[inst(FIRE)]});
 put(muted,1,GEN);
 play(muted,SHELL);
 assert.equal(muted.decision,null);
});

test('Shell Pouch respects Star and G-NEO when removing the exposed evolution card',()=>{
 for(const [id,topStays] of [[STAR,false],[G_NEO,true]]){
  const s=field(),base=inst(FIRE),top=put(s,1,id,'battle',{under:[base]});
  play(s,SHELL);
  assert.deepEqual(options(s),[top.uid,null]);
  pick(s,top.uid);
  assert.ok(has(s,1,topStays?'battle':'grave',top));
  assert.ok(has(s,1,topStays?'grave':'battle',base));
 }
});

test('Hurricane returns the chosen own creatures first and requires exactly the same number if accepted',()=>{
 let s=field();
 const own=[put(s,0,BODY),put(s,0,ONIKAMASU)],remaining=put(s,0,FIRE);
 const enemy=[put(s,1,BODY),put(s,1,FIRE),put(s,1,ANGEL)];
 const immune=put(s,1,ONIKAMASU);
 play(s,HURRICANE);
 const before=physical(s);
 assert.deepEqual(options(s),[...own.map(x=>x.uid),remaining.uid,null]);
 for(const x of own)pick(s,x.uid);
 assert.ok(own.every(x=>has(s,0,'battle',x)));
 pick(s,null);
 assert.ok(own.every(x=>has(s,0,'hand',x)));
 assert.ok(enemy.every(x=>has(s,1,'battle',x)));
 assert.deepEqual(options(s),[true,null]);
 s=restore(s);
 pick(s,true);
 assert.deepEqual(options(s),enemy.map(x=>x.uid));
 pick(s,enemy[1].uid);
 assert.deepEqual(options(s),[enemy[0].uid,enemy[2].uid]);
 assert.ok(enemy.every(x=>has(s,1,'battle',x)));
 pick(s,enemy[2].uid);
 assert.ok(enemy.slice(1).every(x=>has(s,1,'hand',x)));
 assert.ok(has(s,1,'battle',enemy[0])&&has(s,1,'battle',immune)&&has(s,0,'battle',remaining));
 assert.deepEqual(physical(s),before);
});

test('Hurricane offers no partial return when too few opposing targets are selectable',()=>{
 for(const locked of [false,true]){
  const s=field(),own=[put(s,0,BODY),put(s,0,FIRE)],enemy=put(s,1,BODY);
  if(locked)put(s,1,ONIKAMASU);
  play(s,HURRICANE);
  for(const x of own)pick(s,x.uid);
  assert.equal(s.decision,null);
  assert.ok(own.every(x=>has(s,0,'hand',x)));
  assert.ok(has(s,1,'battle',enemy));
 }
});

test('Hurricane may choose zero own creatures or decline the matching return',()=>{
 for(const useOwn of [false,true]){
  const s=field(),own=put(s,0,BODY),enemy=put(s,1,FIRE);
  play(s,HURRICANE);
  if(useOwn){pick(s,own.uid);pick(s,null);}
  else pick(s,null);
  assert.equal(s.decision,null);
  assert.ok(has(s,0,useOwn?'hand':'battle',own));
  assert.ok(has(s,1,'battle',enemy));
 }
});

test('Hurricane still counts the selected creature when EX Life replaces its return',()=>{
 const s=field(),own=put(s,0,EX_LIFE),enemy=put(s,1,BODY);
 own.exLifeShieldUid=s.players[0].shields[0].uid;
 play(s,HURRICANE);
 pick(s,own.uid);
 assert.ok(has(s,0,'battle',own));
 assert.equal(s.players[0].shields.length,4);
 assert.deepEqual(options(s),[true,null]);
 pick(s,true);
 pick(s,enemy.uid);
 assert.ok(has(s,1,'hand',enemy));
});

test('Asylum discounts each qualifying own creature once and pays at least two mana',()=>{
 const s=field(),card=e.card(ASYLUM);
 assert.equal(e.summonCost(s,0,card),6);
 put(s,0,BOTH);
 put(s,1,ANGEL);
 assert.equal(e.summonCost(s,0,card),5);
 put(s,0,ANGEL);
 put(s,0,DRAGON);
 assert.equal(e.summonCost(s,0,card),3);
 put(s,0,ANGEL);
 put(s,0,DRAGON);
 assert.equal(e.summonCost(s,0,card),2);
 give(s,0,'mana',['dm01-075',FIRE]);
 const x=play(s,ASYLUM);
 assert.ok(has(s,0,'battle',x));
 assert.equal(s.players[0].mana.filter(y=>y.tapped).length,2);
});

test('Asylum enters mana tapped and its W Breaker chooses two distinct shields',()=>{
 const s=field(),mana=put(s,0,ASYLUM,'hand');
 s.phase='charge';
 act(s,'charge',a=>a.uid===mana.uid);
 assert.ok(has(s,0,'mana',mana)&&mana.tapped);
 const x=put(s,0,ASYLUM);
 attack(s,x.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 assert.equal(s.decision.type,'breakChoice');
 assert.ok(e.getLegalActions(s).every(a=>new Set(a.shields).size===2));
 act(s,'breakShields');
 assert.equal(s.players[1].shields.length,3);
});

test('Asylum replaces destruction with a new face-down shield and can choose among replacements',()=>{
 for(const competing of [false,true]){
  let s=field(1);
  const x=put(s,0,ASYLUM);
  if(competing)put(s,0,DOKKOI);
  play(s,HAND);
  act(s,'effect',a=>a.targets.some(t=>t.uid===x.uid));
  if(competing){
   s=restore(s);
   assert.ok(e.getLegalActions(s).some(a=>a.kind==='g47Replace'));
   act(s,'replaceShield842');
  }
  const shield=s.players[0].shields.find(y=>y.uid===x.uid);
  assert.ok(shield&&!shield.faceUp);
  assert.ok(!has(s,0,'grave',x));
 }
});

test('Asylum moves normally when bounced or when a shield addition is prohibited',()=>{
 for(const blocked of [false,true]){
  const s=field(blocked?0:1),x=put(s,0,ASYLUM);
  if(blocked){
   put(s,1,FUUJIN,'battle',{tapped:true});
   const stronger=put(s,1,ANGEL,'battle',{tapped:true});
   attack(s,x.uid,stronger.uid);
   drain(s);
  }else{
   play(s,SURFER);
   act(s,'effect',a=>a.targets.some(t=>t.uid===x.uid));
  }
  assert.ok(has(s,0,blocked?'grave':'hand',x));
  assert.ok(!has(s,0,'shields',x));
 }
});
