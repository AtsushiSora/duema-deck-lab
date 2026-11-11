import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const MEDUSA='dm15-025',GIGAZANDA='dm16-029',MYSTERY='dm06-s10';
const LIGHT='dm01-075',WATER='dm01-083',DARK='dm01-090',FIRE='dm01-097',NATURE='dm01-108';
const GEAR='dm14-110',SUIT='dm14-086',SHAMAN='dm16-033',DEMON='dm01-027',BOUNCE='dm01-086';
const BLOCKER='dm01-076',QX='dmrp07-m01',REDZONE='dm25rp3-DM1';
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

test('Phase 929 supports three complete card definitions with their original IDs and no additional prints',()=>{
 const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
 const m=read('tools/support-phase-929.json'),refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(c=>c.id),[MEDUSA,GIGAZANDA,MYSTERY]);
 assert.deepEqual(m.printAliases,[]);
 const cat=createCatalogue(snapshot,data.cards,details);
 for(const row of m.cards){
  const id=row.id,c=e.card(id),[f]=row.faces;
  const original=details.cards.find(x=>x.id===id),detail={...original,id:row.id,faces:row.faces};
  const spec=m.cards.find(x=>x.id===id).spec;
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(standardCardSpec(detail,{phase:929}),spec);
  const extra=structuredClone(detail);extra.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(extra,{phase:929}));
  for(const [key,value] of Object.entries(spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,e.civilizations(c),c.race,c.manaValue,c.limit],
   ['creature',f.cost,Number(f.powerText),f.civilizations,f.race,1,4]);
  assert.equal(cat.get(row.id).id,id);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  assert.deepEqual(row.faces,original.faces);assert.equal(CARD_IMAGES[id],row.image);
  for(const source of [data,details,snapshot])
   assert.deepEqual(source.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
 }
 const deck={id:'phase929',name:'アクセルとクロスギアの検証',cards:[MEDUSA,GIGAZANDA,MYSTERY,LIGHT,WATER,DARK,FIRE,NATURE,GEAR,SHAMAN].map(id=>({id,count:4}))};
 assert.deepEqual(e.validateDeck({...deck,cards:cat.resolveRows(deck.cards)}),[]);
 assert.equal(cat.coverage(deck).unsupported,0);
});

const attack=(s,x,target='player')=>{s.phase='attack';act(s,'attack',a=>a.uid===x.uid&&a.target===(target.uid??target));};
const cross=(s,g,x)=>act(s,'crossGear',a=>a.uid===g.uid&&a.target===x.uid);

const deckOrder=(s,p)=>s.players[p].deck.map(x=>x.uid);
const remove=(s,id,x)=>{play(s,id);act(s,'effect',a=>a.targets?.some(t=>t.uid===x.uid));};

test('Medusa crosses all of its surviving gears for free to one chosen ally and triggers each cross',()=>{
 let s=field();
 const medusa=put(s,0,'battle',MEDUSA),shaman=put(s,0,'battle',SHAMAN),ally=put(s,0,'battle',FIRE);
 const gears=[put(s,0,'battle',GEAR),put(s,0,'battle',SUIT)];
 for(const gear of gears)cross(s,gear,medusa);
 const loose=put(s,0,'battle',GEAR),enemy=put(s,1,'battle',WATER),enemyGear=put(s,1,'battle',SUIT);
 enemyGear.crossedTo={uid:enemy.uid,incarnation:0};
 const manaBefore=s.players[0].mana.map(x=>[x.uid,x.tapped]),top=s.players[0].deck.slice(0,2);
 s.active=1;remove(s,DEMON,medusa);
 const all=physical(s);
 assert.ok(find(s,0,'grave',medusa));
 assert.deepEqual(picks(s),[shaman.uid,ally.uid,null]);
 for(const gear of gears)assert.equal(find(s,0,'battle',gear).crossedTo,undefined);
 s=restore(s);pick(s,shaman);drain(s);
 for(const gear of gears)assert.equal(find(s,0,'battle',gear).crossedTo.uid,shaman.uid);
 assert.equal(find(s,0,'battle',loose).crossedTo,undefined);
 assert.equal(find(s,1,'battle',enemyGear).crossedTo.uid,enemy.uid);
 assert.deepEqual(s.players[0].mana.slice(0,-2).map(x=>[x.uid,x.tapped]),manaBefore);
 for(const x of top)assert.equal(find(s,0,'mana',x).tapped,true);
 assert.deepEqual(physical(s),all);
});

test('Medusa can decline or lack a destination, and a bounce never offers the death effect',()=>{
 for(const mode of ['decline','no host','no gear','bounce']){
  const s=field(),medusa=put(s,0,'battle',MEDUSA),gear=put(s,0,'battle',GEAR);
  if(mode!=='no host')put(s,0,'battle',FIRE);
  if(mode!=='no gear')cross(s,gear,medusa);
  s.active=1;remove(s,mode==='bounce'?BOUNCE:DEMON,medusa);
  if(mode==='decline'){assert.equal(picks(s).at(-1),null);pick(s,null);}
  assert.equal(s.decision,null,mode);
  assert.ok(find(s,0,mode==='bounce'?'hand':'grave',medusa));
  assert.equal(find(s,0,'battle',gear).crossedTo,undefined);
 }
});

test('Gigazanda privately inspects before breaking a shield, then moves the chosen card and shuffles',()=>{
 let s=field();
 const attacker=put(s,0,'battle',GIGAZANDA),gear=put(s,0,'battle',GEAR);
 cross(s,gear,attacker);
 give(s,1,'deck',[LIGHT,WATER,DARK,FIRE,NATURE,MEDUSA,GIGAZANDA,MYSTERY]);
 const ownDeck=deckOrder(s,0),opposingDeck=deckOrder(s,1),chosen=s.players[1].deck[4],all=physical(s);
 attack(s,attacker);act(s,'noBlock');
 assert.equal(s.decision.player,0);
 assert.equal(s.players[1].shields.length,5);
 assert.deepEqual(picks(s),[...opposingDeck,null]);
 assert.deepEqual(deckOrder(s,1),opposingDeck);
 assert.ok(!s.log.some(row=>row.type==='reveal'));
 s=restore(s);pick(s,chosen);drain(s);
 const remaining=opposingDeck.filter(uid=>uid!==chosen.uid);
 assert.ok(find(s,1,'grave',chosen));
 assert.deepEqual(deckOrder(s,1).sort(),remaining.slice().sort());
 assert.notDeepEqual(deckOrder(s,1),remaining);
 assert.deepEqual(deckOrder(s,0),ownDeck);
 assert.equal(s.players[1].shields.length,4);
 assert.deepEqual(physical(s),all);
});

test('Gigazanda shuffles on decline and applies each QX restriction to the player performing the action',()=>{
 for(const owner of [null,0,1]){
  const s=field(),attacker=put(s,0,'battle',GIGAZANDA),gear=put(s,0,'battle',GEAR);
  cross(s,gear,attacker);
  if(owner!==null)put(s,owner,'battle',QX);
  give(s,1,'deck',[LIGHT,WATER,DARK,FIRE,NATURE,MEDUSA,GIGAZANDA,MYSTERY]);
  const before=deckOrder(s,1),rng=s.rng;
  attack(s,attacker);act(s,'noBlock');
  if(owner===1){
   assert.equal(s.decision,null);
  }else{
   assert.deepEqual(picks(s),[...before,null]);
   pick(s,null);
  }
  drain(s);
  assert.equal(s.players[1].grave.length,0);
  if(owner===0){
   assert.deepEqual(deckOrder(s,1),before);
   assert.equal(s.rng,rng);
  }else{
   assert.notDeepEqual(deckOrder(s,1),before);
  }
 }
});

test('Gigazanda needs a cross and an unblocked attack aimed at the opposing player',()=>{
 for(const mode of ['no gear','blocked','creature']){
  const s=field(),attacker=put(s,0,'battle',GIGAZANDA),gear=put(s,0,'battle',GEAR);
  if(mode!=='no gear')cross(s,gear,attacker);
  const defender=mode==='no gear'?null:put(s,1,'battle',BLOCKER,{tapped:mode==='creature'});
  const before=deckOrder(s,1),rng=s.rng;
  attack(s,attacker,mode==='creature'?defender:'player');
  if(mode==='blocked')act(s,'block');
  if(mode!=='blocked'&&legal(s,'noBlock'))act(s,'noBlock');
  assert.equal(s.decision,null,mode);
  assert.deepEqual(deckOrder(s,1),before);
  assert.equal(s.rng,rng);
  assert.equal(s.players[1].shields.length,mode==='no gear'?4:5);
 }
});

test('Mystery checks other untapped friendly creatures and breaks two shields when it can attack',()=>{
 const s=field(),x=put(s,0,'battle',MYSTERY),canAttack=()=>legal(s,'attack',a=>a.uid===x.uid&&a.target==='player');
 s.phase='attack';assert.ok(canAttack());
 put(s,1,'battle',FIRE);put(s,0,'battle',GEAR);
 const sealed=put(s,0,'battle',FIRE,{sealed:true});put(s,0,'seals',NATURE,{sealOf:sealed.uid,faceDown:true});
 assert.ok(canAttack());
 const ally=put(s,0,'battle',FIRE,{entered:s.turn});
 assert.ok(!canAttack());
 ally.tapped=true;assert.ok(canAttack());
 attack(s,x);drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('Mystery retains its own attack restriction in the presence of Red Zone',()=>{
 const s=field(),x=put(s,0,'battle',MYSTERY),redzone=put(s,0,'battle',REDZONE);
 s.phase='attack';
 const canAttack=()=>legal(s,'attack',a=>a.uid===x.uid&&a.target==='player');
 assert.equal(e.effectiveCard(redzone,s).ignoreAttackLocks,true);
 assert.ok(!canAttack());
 redzone.tapped=true;
 assert.ok(canAttack());
});
