import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const BELL='dmr16g-016',SHARED='dmr16g-045',TAP='dmr14-037',MACALLAN='dmr14-016',SWORD='dmr16g-048';
const PRINTS=[['dmr16s-016',BELL],['dmr16s-016D',BELL],['dmx24-022',BELL],['dmr16s-044',SHARED],
 ['dmx26-042',MACALLAN],['promoy13-044',MACALLAN],['dmr16s-048',SWORD]];
const NATURE='dm01-108',FIRE='dm01-097',WATER='dm01-083',HEIKE='dmx05-005',BIG='dmex15-b005';
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

test('Phase 984 registers five canonical cards and resolves seven reprints to their original IDs',()=>{
 const m=read('tools/support-phase-984.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[BELL,SHARED,TAP,MACALLAN,SWORD]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),PRINTS);
 assert.deepEqual(catalogue.resolveRows(PRINTS.map(([id])=>({id,count:1}))),
  [{id:BELL,count:3},{id:SHARED,count:1},{id:MACALLAN,count:2},{id:SWORD,count:1}]);
 for(const row of m.cards){
  const {id,name,faces}=row,[f]=faces,d=details.cards.find(x=>x.id===id),c=e.card(id);
  assert.deepEqual(faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:984}),row.spec);
  const altered=structuredClone(d);
  altered.faces[0].abilityText+='未知の追加能力。';
  assert.throws(()=>standardCardSpec(altered,{phase:984}));
  for(const [key,v] of Object.entries(row.spec))assert.deepEqual(c[key],v);
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [name,[SHARED,TAP,SWORD].includes(id)?'spell':'creature',f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-984');
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
  if(row.canonicalId)assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:984}),m.cards.find(x=>x.id===row.canonicalId).spec);
 }
});

test('Bell evolves only on a Nature creature, can move the top card to mana, and breaks two shields',()=>{
 for(const accept of [0,1]){
  let s=field();
  const base=put(s,0,'battle',NATURE),wrong=put(s,0,'battle',FIRE),bell=play(s,BELL),all=physical(s);
  assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[base.uid]);
  act(s,'evolve',a=>a.baseUid===base.uid);
  assert.ok(bell.under.some(x=>x.uid===base.uid)&&has(s,0,'battle',wrong));
  const manaCount=s.players[0].mana.length,top=s.players[0].deck[0];
  attack(s,bell.uid);
  assert.deepEqual(choices(s),[0,1]);
  s=restore(s);
  pick(s,accept);
  act(s,'noBlock');
  drain(s);
  assert.equal(s.players[0].mana.length,manaCount+accept);
  assert.equal(has(s,0,'mana',top),!!accept);
  assert.equal(s.players[1].shields.length,3);
  assert.deepEqual(physical(s),all);
 }
});

test('Shared Destruction Blade requires one choice per side before either creature moves',()=>{
 for(const firstOwner of [0,1]){
  let s=field();
  const targets=[put(s,0,'battle',FIRE),put(s,1,'battle',WATER)];
  const others=[put(s,0,'battle',NATURE),put(s,1,'battle',FIRE)];
  const protectedFoe=put(s,1,'battle',HEIKE);
  play(s,SHARED);
  const all=physical(s);
  assert.equal(s.decision.player,0);
  assert.deepEqual(new Set(choices(s)),new Set([...targets,...others].map(x=>x.uid)));
  pick(s,targets[firstOwner].uid);
  assert.equal(s.decision.player,0);
  assert.deepEqual(choices(s),[targets[1-firstOwner].uid,others[1-firstOwner].uid]);
  assert.ok(targets.every((x,p)=>has(s,p,'battle',x)));
  s=restore(s);
  pick(s,targets[1-firstOwner].uid);
  assert.ok(targets.every((x,p)=>has(s,p,'grave',x)));
  assert.ok(others.every((x,p)=>has(s,p,'battle',x))&&has(s,1,'battle',protectedFoe));
  assert.deepEqual(physical(s),all);
 }
});

test('A forced opposing target leaves the mandatory friendly choice available',()=>{
 const s=field(),ally=put(s,0,'battle',NATURE),forced=put(s,1,'battle','dm23rp3-013'),other=put(s,1,'battle',WATER);
 play(s,SHARED);
 assert.deepEqual(new Set(choices(s)),new Set([ally.uid,forced.uid]));
 pick(s,ally.uid);
 assert.deepEqual(choices(s),[forced.uid]);
 pick(s,forced.uid);
 assert.ok(has(s,0,'grave',ally)&&has(s,1,'grave',forced)&&has(s,1,'battle',other));
});

test('Shared Destruction Blade destroys the available creature when either side is empty',()=>{
 for(const owner of [0,1]){
  const s=field(),target=put(s,owner,'battle',WATER);
  play(s,SHARED);
  assert.deepEqual(choices(s),[target.uid]);
  pick(s,target.uid);
  assert.ok(has(s,owner,'grave',target));
  assert.equal(s.decision,null);
 }
 const s=field(),spell=play(s,SHARED);
 assert.ok(has(s,0,'grave',spell));
 assert.equal(s.decision,null);
});

test('Inherited Sword Technique includes 5000 and applies live power on both sides',()=>{
 const s=field(),atLimit=put(s,0,'battle',FIRE,{powerModifiers:[{amount:3000,expires:'end',who:0}]}),
  tooHigh=put(s,0,'battle',FIRE,{powerModifiers:[{amount:3500,expires:'end',who:0}]}),
  weakened=put(s,1,'battle',BIG,{powerModifiers:[{amount:-7000,expires:'end',who:0}]}),
  unchanged=put(s,1,'battle',BIG);
 play(s,SWORD);
 assert.deepEqual(new Set(choices(s)),new Set([atLimit.uid,weakened.uid]));
 pick(s,weakened.uid);
 assert.deepEqual(choices(s),[atLimit.uid]);
 pick(s,atLimit.uid);
 assert.ok(has(s,0,'grave',atLimit)&&has(s,1,'grave',weakened));
 assert.ok(has(s,0,'battle',tooHigh)&&has(s,1,'battle',unchanged));
});

test('Both destruction spells can resolve as Shield Triggers for the defending player',()=>{
 for(const id of [SHARED,SWORD]){
  const s=field(),attacker=put(s,0,'battle',FIRE),defender=put(s,1,'battle',WATER);
  give(s,1,'shields',[id]);
  const mana=s.players[1].mana.filter(x=>!x.tapped).length;
  attack(s,attacker.uid);
  act(s,'noBlock');
  act(s,'useTrigger');
  assert.equal(s.decision.player,1);
  pick(s,attacker.uid);
  pick(s,defender.uid);
  assert.ok(has(s,0,'grave',attacker)&&has(s,1,'grave',defender));
  assert.equal(s.players[1].mana.filter(x=>!x.tapped).length,mana);
 }
});

test('Stigmata of Destiny counts live creatures and requires a different creature for the second tap',()=>{
 for(const advantage of [false,true]){
  let s=field();
  put(s,0,'battle',FIRE);
  put(s,0,'battle',WATER);
  const sealed=put(s,0,'battle',NATURE,{sealed:true});
  put(s,0,'seals',NATURE,{sealOf:sealed.uid,faceDown:true});
  if(advantage)put(s,0,'battle',FIRE);
  const first=put(s,1,'battle',FIRE,{tapped:true}),second=put(s,1,'battle',WATER);
  play(s,TAP);
  assert.deepEqual(choices(s),[first.uid,second.uid]);
  s=restore(s);
  pick(s,first.uid);
  if(advantage){
   assert.deepEqual(choices(s),[second.uid]);
   pick(s,second.uid);
  }
  assert.equal(s.players[1].battle.find(x=>x.uid===second.uid).tapped,advantage);
  assert.equal(s.decision,null);
 }
});

test('Stigmata of Destiny taps once with no second legal target',()=>{
 const s=field(),target=put(s,1,'battle',FIRE),protectedFoe=put(s,1,'battle',HEIKE);
 for(let i=0;i<3;i++)put(s,0,'battle',NATURE);
 play(s,TAP);
 assert.deepEqual(choices(s),[target.uid]);
 pick(s,target.uid);
 assert.ok(target.tapped&&!protectedFoe.tapped);
 assert.equal(s.decision,null);
});

test('Macallan can attack immediately and grants haste only while its controller has five Fire cards in mana',()=>{
 const s=field();
 give(s,0,'mana',[FIRE,FIRE,FIRE,FIRE,WATER,NATURE]);
 const ally=put(s,0,'battle',WATER,{entered:s.turn}),enemy=put(s,1,'battle',FIRE,{entered:s.turn});
 const macallan=play(s,MACALLAN);
 s.phase='attack';
 const canAttack=uid=>e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===uid);
 assert.ok(canAttack(macallan.uid));
 assert.ok(!canAttack(ally.uid));
 const multicolor=data.cards.find(c=>e.civilizations(c).includes('火')&&e.civilizations(c).length===2);
 const fifth=put(s,0,'mana',multicolor.id,{tapped:true});
 assert.ok(canAttack(ally.uid));
 s.active=1;
 assert.ok(!canAttack(enemy.uid));
 s.active=0;
 s.players[0].mana=s.players[0].mana.filter(x=>x.uid!==fifth.uid);
 assert.ok(!canAttack(ally.uid)&&canAttack(macallan.uid));
 s.players[0].mana.push(fifth);
 s.players[0].battle=s.players[0].battle.filter(x=>x.uid!==macallan.uid);
 assert.ok(!canAttack(ally.uid));
});
