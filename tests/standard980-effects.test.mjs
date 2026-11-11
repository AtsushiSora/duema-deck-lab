import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const GUARD='dmx15-009',VICIOUS='dmr16g-002',PARTIA='dmex17-133',DAGRA='dmex15-b033';
const BODY='dm01-108',DARK='dm01-090',FIRE='dm01-097',NEO='dmrp01-087',EVO='dm02-s03';
const SEED='dm25ex2-026',TRIGGER='dm01-027',MULTI='dm24bd1-016',GENMU='dmrp15-km1',APUL='dmrp22-042';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const find=(s,p,zone,x)=>s.players[p][zone].find(y=>y.uid===x.uid);
const choices=s=>s.decision.choices.map(o=>o.value?.uid??o.value);
const pick=(s,value)=>act(s,'extended',a=>choices(s)[a.choice]===value);
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

test('Phase 980 pins four complete official definitions, printed stats, art and deck IDs',()=>{
 const m=read('tools/support-phase-980.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[GUARD,VICIOUS,PARTIA,DAGRA]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const {id,name}=row,detail=details.cards.find(x=>x.id===id),f=row.faces[0],c=e.card(id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(standardCardSpec(detail,{phase:980}),row.spec);
  assert.throws(()=>standardCardSpec({...detail,faces:[{...f,abilityText:f.abilityText+'未知の能力。'}]},{phase:980}));
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [name,id===GUARD?'spell':'creature',f.cost,Number(f.powerText),f.race,f.civilizations.filter(x=>x!=='無色'),1,4]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
  assert.equal(m.regulationVerification.limits[id],4);
  assert.ok(row.verification.facesMatched);
  assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);
  assert.equal(CARD_IMAGES[id],row.image);
  assert.deepEqual(refs.filter(x=>x.id===id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  assert.ok(catalogue.get(id).supported);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards=catalogue.resolveRows([...deck.cards.filter(x=>x.count>0),{id,count:1}]);
  assert.deepEqual(e.validateDeck(deck),[]);
 }
});

test('Romanov Guard requires a choice and creates a new facedown shield for either player',()=>{
 for(const owner of [0,1]){
  let s=setup();
  const target=put(s,owner,'battle',BODY,{tapped:true});
  const other=put(s,1-owner,'battle',DARK);
  const shields=s.players[owner].shields.map(x=>x.uid);
  const spell=put(s,0,'hand',GUARD);
  const before=physical(s);
  act(s,'play',a=>a.uid===spell.uid);
  assert.deepEqual(new Set(choices(s)),new Set([target.uid,other.uid]));
  s=restore(s);
  pick(s,target.uid);
  const newShield=find(s,owner,'shields',target);
  assert.ok(newShield&&!newShield.faceUp);
  assert.deepEqual(s.players[owner].shields.map(x=>x.uid),[...shields,target.uid]);
  assert.ok(find(s,1-owner,'battle',other));
  assert.ok(!find(s,owner,'battle',target));
  assert.ok(find(s,0,'grave',spell));
  assert.deepEqual(physical(s),before);
 }
});

test('Romanov Guard distinguishes an unevolved NEO from an evolution, seed, or sealed card',()=>{
 const s=setup();
 const plain=put(s,0,'battle',NEO);
 put(s,0,'battle',NEO,{under:[inst(BODY)]});
 put(s,0,'battle',SEED);
 put(s,1,'battle',EVO,{under:[inst(DARK)]});
 const sealed=put(s,1,'battle',BODY,{sealed:true});
 (s.players[1].seals??=[]).push({...inst(BODY),faceDown:true,sealOf:sealed.uid});
 play(s,GUARD);
 assert.deepEqual(choices(s),[plain.uid]);
 pick(s,plain.uid);
 assert.ok(find(s,0,'shields',plain));
 const empty=setup();
 put(empty,1,'battle',SEED);
 const spell=play(empty,GUARD);
 assert.equal(empty.decision,null);
 assert.ok(find(empty,0,'grave',spell));
});

test('Vicious requires an allied Darkness base, may attack immediately, and discards one chosen card before blocking',()=>{
 let s=setup();
 const x=put(s,0,'hand',VICIOUS),wrong=put(s,0,'battle',BODY);
 put(s,1,'battle',DARK);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===x.uid));
 const base=put(s,0,'battle',DARK,{entered:s.turn});
 const keep=put(s,1,'hand',BODY),discard=put(s,1,'hand',FIRE);
 act(s,'play',a=>a.uid===x.uid);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[base.uid]);
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.equal(find(s,0,'battle',x).under[0].uid,base.uid);
 assert.ok(find(s,0,'battle',wrong));
 attack(s,x.uid);
 assert.equal(s.decision.task.op,'s6Inspect');
 assert.equal(s.decision.player,0);
 assert.deepEqual(choices(s),[keep.uid,discard.uid]);
 s=restore(s);
 pick(s,discard.uid);
 assert.ok(find(s,1,'grave',discard)&&find(s,1,'hand',keep));
 assert.equal(s.decision.type,'block');
 act(s,'noBlock');
 act(s,'breakShields',a=>a.shields.length===2);
 drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('Vicious continues attacking with an empty opposing hand and loses the trigger under Genmu',()=>{
 for(const ignored of [false,true]){
  const s=setup(),x=put(s,0,'battle',VICIOUS,{under:[inst(DARK)]});
  if(ignored){
   put(s,1,'battle',GENMU);
   put(s,1,'hand',BODY);
  }
  attack(s,x.uid);
  assert.equal(s.decision.type,'block');
 }
});

test('Partia shuffles only the selected player’s chosen cards, up to three, after all picks',()=>{
 for(const [owner,n] of [[0,1],[1,2],[1,3]]){
  let s=setup();
  give(s,0,'grave',[BODY,DARK,FIRE,TRIGGER]);
  give(s,1,'grave',[TRIGGER,FIRE,DARK,BODY]);
  const rng=s.rng,unchanged=s.players[1-owner].deck.map(x=>x.uid);
  const otherGrave=s.players[1-owner].grave.map(x=>x.uid);
  const selected=s.players[owner].grave.slice(0,n);
  const spell=put(s,0,'hand',PARTIA),before=physical(s);
  act(s,'play',a=>a.uid===spell.uid);
  pick(s,owner);
  assert.deepEqual(new Set(choices(s)),new Set([...s.players[owner].grave.map(x=>x.uid),null]));
  for(const [i,x] of selected.entries()){
   pick(s,x.uid);
   if(i===0&&n>1){
    assert.equal(s.rng,rng);
    assert.ok(find(s,owner,'grave',x));
    s=restore(s);
   }
  }
  if(n<3)pick(s,null);
  assert.equal(s.decision,null);
  assert.notEqual(s.rng,rng);
  assert.deepEqual(s.players[1-owner].deck.map(x=>x.uid),unchanged);
  assert.deepEqual(s.players[1-owner].grave.map(x=>x.uid),otherGrave);
  for(const x of selected)assert.ok(find(s,owner,'deck',x)&&!find(s,owner,'grave',x));
  assert.deepEqual(physical(s),before);
 }
});

test('Partia with zero cards selected does not shuffle, and a movement lock leaves the grave alone',()=>{
 for(const mode of ['decline','zero','locked','empty']){
  const s=setup();
  if(mode!=='empty')put(s,0,'grave',DARK);
  if(mode==='locked')put(s,1,'battle',APUL);
  const rng=s.rng,deck=s.players[0].deck.map(x=>x.uid);
  play(s,PARTIA);
  if(mode==='zero')pick(s,0);
  if(mode==='zero'||mode==='decline')pick(s,null);
  assert.equal(s.decision,null);
  assert.equal(s.rng,rng);
  assert.deepEqual(s.players[0].deck.map(x=>x.uid),deck);
 }
});

test('Dagra optionally sends either player’s whole shield group to its own mana without shield triggers',()=>{
 for(const owner of [0,1]){
  let s=setup();
  const x=put(s,0,'battle',DAGRA),target=put(s,1,'battle',BODY,{tapped:true});
  const root=s.players[owner].shields[0],multi=inst(MULTI);
  root.cardId=TRIGGER;
  root.shieldStack=[multi];
  const before=physical(s);
  attack(s,x.uid,target.uid);
  assert.equal(s.decision.task.op,'g34_ShieldToMana980');
  assert.deepEqual(new Set(choices(s)),new Set([...s.players.flatMap(p=>p.shields.map(y=>y.uid)),null]));
  assert.ok(s.decision.choices.every(o=>!o.label.includes(e.card(TRIGGER).name)));
  s=restore(s);
  pick(s,root.uid);
  assert.equal(find(s,owner,'mana',root).tapped,false);
  assert.equal(find(s,owner,'mana',multi).tapped,true);
  assert.equal(s.players[owner].shields.length,4);
  assert.equal(s.players[owner].hand.length,0);
  assert.equal(s.decision.type,'block');
  act(s,'noBlock');
  assert.ok(find(s,1,'grave',target));
  assert.deepEqual(physical(s),before);
 }
});

test('Dagra can decline and still breaks two shields with its normal attack',()=>{
 const s=setup(),x=put(s,0,'battle',DAGRA);
 attack(s,x.uid);
 pick(s,null);
 assert.equal(s.players[1].shields.length,5);
 act(s,'noBlock');
 act(s,'breakShields',a=>a.shields.length===2);
 drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('Dagra may remove the last opposing shield before the direct attack resolves',()=>{
 const s=setup(),x=put(s,0,'battle',DAGRA);
 give(s,1,'shields',[TRIGGER]);
 const shield=s.players[1].shields[0];
 attack(s,x.uid);
 pick(s,shield.uid);
 act(s,'noBlock');
 assert.ok(find(s,1,'mana',shield));
 assert.equal(s.winner,0);
});
