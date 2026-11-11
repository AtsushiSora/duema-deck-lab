import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain,GEN} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const MAGMA='dm01-033',LIONESS='dm17-017',ARMOR='dm14-078',PRINTS=['dm18-043'];
const LIGHT='dm01-075',WATER='dm01-083',DARK='dm01-090',FIRE='dm01-097',NATURE='dm01-108';
const GEAR='dm14-110',SUIT='dm14-086',PETRO='dm15-008',TWIN='dmsd05-002',URANUS='dm15-022';
const BIG='dm15-048',BLAZE='dm16-030',STRONG='dm03-015';
const put=(s,p,z,id,attrs)=>{const x=Object.assign(inst(id),attrs);s.players[p][z].push(x);return x;};
const find=(s,p,z,x)=>s.players[p][z].find(y=>y.uid===x.uid);
const restore=s=>JSON.parse(JSON.stringify(s));
const picks=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===(v?.uid??v));
const play=(s,id)=>{const x=put(s,s.active,'hand',id);act(s,'play',a=>a.uid===x.uid);return x;};
const legal=(s,kind,pred=()=>true)=>e.getLegalActions(s).some(a=>a.kind===kind&&pred(a));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(18).fill(NATURE));
 return s;
}

test('Phase 928 supports three complete card definitions and resolves the Magma reprint to the original ID',()=>{
 const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
 const m=read('tools/support-phase-928.json'),refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(c=>c.id),[MAGMA,LIONESS,ARMOR]);
 assert.deepEqual(m.printAliases.map(c=>[c.id,c.canonicalId]),PRINTS.map(id=>[id,MAGMA]));
 const cat=createCatalogue(snapshot,data.cards,details);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),[f]=row.faces;
  const original=details.cards.find(x=>x.id===id),detail={...original,id:row.id,faces:row.faces};
  const spec=m.cards.find(x=>x.id===id).spec;
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(standardCardSpec(detail,{phase:928}),spec);
  const extra=structuredClone(detail);extra.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(extra,{phase:928}));
  for(const [key,value] of Object.entries(spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,e.civilizations(c),c.race,c.manaValue,c.limit],
   [id===ARMOR?'gear':'spell',f.cost,Number(f.powerText),f.civilizations,f.race,1,4]);
  assert.equal(cat.get(row.id).id,id);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  if(!row.canonicalId){assert.deepEqual(row.faces,original.faces);assert.equal(CARD_IMAGES[id],row.image);}
  for(const source of [data,details,snapshot])
   assert.deepEqual(source.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
 }
 const deck={id:'phase928',name:'ブレイクとクロスギアの検証',cards:[PRINTS[0],LIONESS,ARMOR,LIGHT,WATER,DARK,FIRE,NATURE,GEAR,BIG].map(id=>({id,count:4}))};
 assert.deepEqual(e.validateDeck({...deck,cards:cat.resolveRows(deck.cards)}),[]);
 assert.equal(cat.coverage(deck).unsupported,0);
});

const attack=(s,x,target='player')=>{s.phase='attack';act(s,'attack',a=>a.uid===x.uid&&a.target===(target.uid??target));};
const cross=(s,g,x)=>act(s,'crossGear',a=>a.uid===g.uid&&a.target===x.uid);

test('Magma grants stacking attack-only power and exactly one double breaker to the selected ally',()=>{
 const s=field(),x=put(s,0,'battle',BIG),other=put(s,0,'battle',FIRE),enemy=put(s,1,'battle',STRONG);
 const gear=put(s,0,'battle',GEAR);
 for(let i=0;i<2;i++){
  play(s,MAGMA);
  assert.deepEqual(picks(s),[x.uid,other.uid]);
  assert.ok(!picks(s).includes(enemy.uid)&&!picks(s).includes(gear.uid));
  pick(s,x);
 }
 assert.equal(e.power(x,false,s),3000);
 assert.equal(e.power(x,true,s),13000);
 assert.equal(e.power(other,true,s),2000);
 assert.deepEqual(e.effectiveCard(x,s).g633BreakerChoices,[2]);
 attack(s,x);drain(s);
 assert.equal(s.players[1].shields.length,3);
 act(s,'endTurn');
 assert.equal(e.power(x,true,s),5000);
 assert.equal(e.effectiveCard(x,s).breaker,undefined);
});

test('Magma preserves a triple breaker and lets its controller choose two or three shields',()=>{
 for(const n of [2,3]){
  let s=field();const x=put(s,0,'battle',TWIN);
  play(s,MAGMA);pick(s,x);
  attack(s,x);act(s,'noBlock');
  assert.deepEqual(picks(s),[2,3]);
  s=restore(s);pick(s,n);drain(s);
  assert.equal(s.players[1].shields.length,5-n);
 }
});

test('Lioness mills before moving all strictly cheaper gears, including a protected one on either side',()=>{
 const s=field();const x=put(s,0,'battle',FIRE),uranus=put(s,1,'battle',URANUS);
 const first=play(s,GEAR);cross(s,first,x);
 const second=put(s,1,'battle',GEAR,{crossedTo:{uid:uranus.uid,incarnation:0}});
 const equal=put(s,0,'battle',SUIT),dearer=put(s,1,'battle',PETRO);
 const top=inst(FIRE);s.players[0].deck.unshift(top);
 const sealed=put(s,1,'battle',GEAR,{sealed:true});put(s,1,'seals',NATURE,{sealOf:sealed.uid,faceDown:true});
 const spell=put(s,0,'hand',LIONESS),all=physical(s);
 act(s,'play',a=>a.uid===spell.uid);drain(s);
 assert.ok(find(s,0,'grave',top)&&find(s,0,'grave',first)&&find(s,1,'grave',second));
 assert.ok(find(s,0,'battle',equal)&&find(s,1,'battle',dearer)&&find(s,1,'battle',sealed));
 assert.ok(find(s,0,'battle',x)&&find(s,1,'battle',uranus));
 assert.deepEqual(physical(s),all);
});

test('Lioness chooses one twinpact cost before moving any gears, and can resume from JSON',()=>{
 for(const cap of [2,7]){
  let s=field();const top=inst(TWIN);s.players[0].deck.unshift(top);
  const cheap=put(s,0,'battle',GEAR),other=put(s,1,'battle',PETRO);
  play(s,LIONESS);
  assert.ok(find(s,0,'grave',top)&&find(s,0,'battle',cheap)&&find(s,1,'battle',other));
  assert.deepEqual(picks(s),[7,2]);
  s=restore(s);pick(s,cap);drain(s);
  assert.ok(find(s,0,'grave',cheap));
  assert.ok(find(s,1,cap===7?'grave':'battle',other));
 }
});

test('Lioness does not sweep if milling the final card ends the game',()=>{
 const s=field(),gear=put(s,1,'battle',GEAR);
 give(s,0,'deck',[TWIN]);const [top]=s.players[0].deck;
 play(s,LIONESS);
 assert.equal(s.winner,1);
 assert.ok(find(s,0,'grave',top)&&find(s,1,'battle',gear));
});

test('Reverse Armor offers the untap at its own turn end and follows the host through evolution',()=>{
 for(const yes of [false,true]){
  let s=field();const base=put(s,0,'battle',BIG,{tapped:true}),armor=play(s,ARMOR);
  cross(s,armor,base);
  const evo=play(s,BLAZE);act(s,'evolve',a=>a.baseUid===base.uid);
  assert.equal(find(s,0,'battle',armor).crossedTo.uid,evo.uid);
  s.phase='attack';act(s,'endTurn');
  assert.equal(s.decision.source,ARMOR);
  assert.deepEqual(picks(s),[true,null]);
  s=restore(s);pick(s,yes?true:null);drain(s);
  assert.equal(s.active,1);
  assert.equal(find(s,0,'battle',evo).tapped,!yes);
 }
});

test('Reverse Armor neither detaches when its host is sealed nor untaps a sealed host',()=>{
 const s=field(),x=put(s,0,'battle',FIRE,{tapped:true}),armor=play(s,ARMOR);
 cross(s,armor,x);
 x.sealed=true;put(s,0,'seals',NATURE,{sealOf:x.uid,faceDown:true});
 s.phase='attack';act(s,'endTurn');drain(s);
 assert.equal(s.active,1);
 assert.equal(find(s,0,'battle',armor).crossedTo.uid,x.uid);
 assert.ok(find(s,0,'battle',x).tapped);
});

test('Reverse Armor stays in battle and loses its host after that creature leaves',()=>{
 const s=field(),x=put(s,0,'battle',FIRE),enemy=put(s,1,'battle',STRONG,{tapped:true}),armor=play(s,ARMOR);
 cross(s,armor,x);attack(s,x,enemy);drain(s);
 assert.ok(find(s,0,'grave',x));
 assert.equal(find(s,0,'battle',armor).crossedTo,undefined);
 act(s,'endTurn');
 assert.equal(s.active,1);
 assert.equal(s.decision,null);
});

test('Reverse Armor does not trigger for the other player’s end step or bypass an untap lock',()=>{
 for(const active of [0,1]){
  const s=field(),x=put(s,0,'battle',FIRE,{tapped:true}),armor=play(s,ARMOR);
  cross(s,armor,x);
  if(!active)x.tapLocks=[0];
  s.active=active;s.phase='attack';
  act(s,'endTurn');
  assert.equal(s.active,1-active);
  assert.equal(s.decision,null);
  assert.ok(find(s,0,'battle',x).tapped===!active);
 }
});
