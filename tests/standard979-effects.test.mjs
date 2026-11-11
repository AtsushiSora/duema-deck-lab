import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const AGASION='sp-030',FUKURO='dmex08-102',BATTEN='dmsd01-010';
const REPRINTS=['dmrp01-030','promoy16-088'];
const BODY='dm01-108',DARK='dm01-090',DARK_SEED='dm25ex2-026';
const DARK_CREATURE_FACE='dm24bd4-007',DARK_SPELL_FACE='dmrp09-003',GENMU='dmrp15-km1';
const RAMEN='dmrp01-058',CHARGER='dmrp04m-023',ZERO_RUPIA='dmx13-034',DIAMOND='dmrp22-027';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const paid=(s,p)=>s.players[p].mana.filter(x=>x.tapped).length;
const find=(s,p,zone,x)=>s.players[p][zone].find(y=>y.uid===x.uid);
const choose=(s,value)=>act(s,'extended',a=>s.decision.choices[a.choice].value===value);
function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
function play(s,id,p=s.active){
 const x=put(s,p,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}

test('Phase 979 pins three original IDs and resolves both Batten reprints to the same four-copy name',()=>{
 const m=read('tools/support-phase-979.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[AGASION,FUKURO,BATTEN]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),REPRINTS.map(id=>[id,BATTEN]));
 const deck=structuredClone(PRESETS[0]);
 let remaining=4;
 for(const row of deck.cards){
  const removed=Math.min(remaining,row.count);
  row.count-=removed;
  remaining-=removed;
 }
 deck.cards=catalogue.resolveRows([...deck.cards.filter(row=>row.count>0),{id:BATTEN,count:2},...REPRINTS.map(id=>({id,count:1}))]);
 assert.equal(deck.cards.find(x=>x.id===BATTEN).count,4);
 assert.deepEqual(e.validateDeck(deck),[]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0],canonical=m.cards.find(x=>x.id===id);
  const d={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(d,{phase:979}),canonical.spec);
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'未知の能力。'}]},{phase:979}));
  if(row.printedAbilityText)assert.deepEqual(standardCardSpec({...d,faces:[{...f,abilityText:row.printedAbilityText}]},{phase:979}),canonical.spec);
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [row.name,'creature',f.cost,Number(f.powerText),f.race,f.civilizations.filter(x=>x!=='無色'),1,4]);
  for(const [key,value] of Object.entries(canonical.spec))assert.deepEqual(c[key],value);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.ok(row.verification.facesMatched);
  assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  assert.ok(catalogue.get(id).supported);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
 }
});

test('Agasion may draw one or decline with a Darkness creature face in its own grave',()=>{
 for(const [p,grave,n] of [[0,DARK,1],[1,DARK_CREATURE_FACE,0],[1,DARK_CREATURE_FACE,1]]){
  let s=setup();
  s.active=p;
  const target=put(s,p,'grave',grave);
  const before=s.players[p].deck.length,top=s.players[p].deck[0];
  play(s,AGASION);
  assert.deepEqual(s.decision.choices.map(c=>c.value),[0,1]);
  s=restore(s);
  choose(s,n);
  assert.equal(s.players[p].deck.length,before-n);
  assert.equal(!!find(s,p,'hand',top),!!n);
  assert.ok(find(s,p,'grave',target));
 }
});

test('Agasion excludes the spell face, Darkness seeds, the enemy grave, and facedown cards',()=>{
 const s=setup();
 put(s,0,'grave',DARK_SPELL_FACE);
 put(s,0,'grave',DARK_SEED);
 put(s,0,'grave',DARK,{faceDown:true});
 put(s,1,'grave',DARK);
 const n=s.players[0].deck.length;
 play(s,AGASION);
 assert.equal(s.decision,null);
 assert.equal(s.players[0].deck.length,n);
});

test('Agasion also triggers on direct deployment, respects ignored abilities, and only reads the grave',()=>{
 for(const suppress of [false,true]){
  const s=setup(),x=put(s,0,'hand',AGASION),target=put(s,0,'grave',DARK);
  put(s,1,'battle',suppress?GENMU:'dmrp22-042');
  s.extTasks=[{op:'putCreature',p:0,source:AGASION,origin:'hand',uid:x.uid}];
  act(s,'toAttack');
  assert.ok(find(s,0,'battle',x));
  if(suppress)assert.equal(s.decision,null);
  else choose(s,1);
  assert.equal(s.players[0].hand.length,suppress?0:1);
  assert.ok(find(s,0,'grave',target));
 }
});

test('Fukuro reduces named creature summons and spell casts, including another Fukuro',()=>{
 const s=setup();
 put(s,0,'battle',FUKURO);
 put(s,1,'battle',FUKURO);
 assert.equal(e.summonCost(s,0,e.card(FUKURO)),1);
 assert.equal(e.summonCost(s,0,e.card(BODY)),2);
 play(s,RAMEN);
 assert.equal(paid(s,0),1);
 const spell=play(s,CHARGER);
 drain(s);
 assert.equal(paid(s,0),3);
 assert.ok(find(s,0,'mana',spell));
});

test('Fukuro uses the executing name of a twinpact and does not reduce cross payments',()=>{
 const s=setup(),creature=e.card(BODY),spell=e.card(CHARGER);
 put(s,0,'battle',FUKURO);
 const onlySpellHasName={...creature,name:creature.name+' / '+spell.name,spellFace:spell};
 const onlyCreatureHasName={...onlySpellHasName,name:e.card(RAMEN).name+' / 無名の呪文',spellFace:{...spell,name:'無名の呪文'}};
 assert.deepEqual(e.playFaces(onlySpellHasName).map(c=>e.summonCost(s,0,c)),[2,2]);
 assert.deepEqual(e.playFaces(onlyCreatureHasName).map(c=>e.summonCost(s,0,c)),[1,3]);
 const gear={...e.card('dm28-033'),name:'漢のクロスギア'};
 assert.equal(e.summonCost(s,0,gear),3);
 assert.equal(e.summonCost(s,0,{...gear,crossing:true}),4);
});

test('Fukuro stacks with a one-mana floor and obeys suppression and control',()=>{
 for(const mode of ['stack','ignored','sealed','opponent','reductionBan']){
  const s=setup();
  const p=mode==='opponent'?1:0;
  put(s,p,'battle',FUKURO,{sealed:mode==='sealed'});
  if(mode==='stack'){
   put(s,p,'battle',FUKURO,{tapped:true});
   put(s,p,'battle',ZERO_RUPIA);
   assert.equal(e.summonCost(s,0,e.card(RAMEN)),1);
  }
  if(mode==='ignored')put(s,1,'battle',GENMU);
  if(mode==='reductionBan')put(s,1,'battle',DIAMOND);
  assert.equal(e.summonCost(s,0,e.card(CHARGER)),mode==='stack'?1:3,mode);
 }
});

test('Batten is optional, resolves after the attacker’s ability, and stops before blocker declaration',()=>{
 let s=setup();
 const attacker=put(s,0,'battle','dm02-011'),second=put(s,0,'battle',BODY);
 const batten=put(s,1,'battle',BATTEN,{entered:s.turn});
 put(s,1,'battle','dm01-075');
 attack(s,attacker.uid);
 assert.equal(s.decision.player,0);
 assert.equal(s.decision.task.op,'g34_Draw');
 choose(s,1);
 assert.equal(s.players[0].hand.length,1);
 assert.equal(s.decision.player,1);
 assert.equal(s.decision.task.uid,batten.uid);
 s=restore(s);
 choose(s,true);
 assert.ok(find(s,1,'battle',batten).tapped);
 assert.ok(find(s,0,'battle',attacker).tapped);
 assert.equal(s.players[1].shields.length,5);
 assert.equal(s.decision,null);
 assert.equal(s.attack,null);
 attack(s,second.uid);
 assert.equal(s.decision.type,'block');
});

test('Batten can decline and does not trigger for a creature attack or while already tapped or ignored',()=>{
 for(const mode of ['decline','creature','tapped','ignored']){
  const s=setup(),attacker=put(s,0,'battle',BODY);
  const batten=put(s,1,'battle',BATTEN,{tapped:mode==='tapped'});
  const target=put(s,1,'battle',BODY,{tapped:true});
  if(mode==='ignored')put(s,0,'battle',GENMU);
  attack(s,attacker.uid,mode==='creature'?target.uid:'player');
  if(mode==='decline'){
   assert.equal(s.decision.task.uid,batten.uid);
   choose(s,null);
   assert.equal(batten.tapped,false);
  }
  assert.equal(s.decision.type,'block',mode);
 }
});

test('each Batten resolves separately and an already used copy cannot stop another attack',()=>{
 const s=setup(),attacker=put(s,0,'battle',BODY),next=put(s,0,'battle',BODY);
 const first=put(s,1,'battle',BATTEN),second=put(s,1,'battle',BATTEN);
 attack(s,attacker.uid);
 assert.equal(s.decision.type,'effectOrder');
 const effect=s.pendingEffects.find(x=>x.uid===first.uid);
 act(s,'orderEffect',a=>a.effectId===effect.effectId);
 choose(s,true);
 assert.equal(s.decision.task.uid,second.uid);
 choose(s,null);
 assert.equal(first.tapped,true);
 assert.equal(second.tapped,false);
 attack(s,next.uid);
 assert.equal(s.decision.type,'effectOrder');
 act(s,'orderEffect',a=>a.effectId===s.pendingEffects.find(x=>x.uid===first.uid).effectId);
 assert.equal(s.decision.task.uid,second.uid);
 choose(s,true);
 assert.equal(s.players[1].shields.length,5);
});

test('a Batten that changed incarnation cannot pay for a pending cancellation',()=>{
 let s=setup();
 const attacker=put(s,0,'battle',BODY),batten=put(s,1,'battle',BATTEN,{incarnation:2});
 attack(s,attacker.uid);
 s=restore(s);
 find(s,1,'battle',batten).incarnation++;
 choose(s,true);
 assert.equal(find(s,1,'battle',batten).tapped,false);
 assert.equal(s.decision.type,'block');
});
