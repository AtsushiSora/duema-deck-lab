import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,cast,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const SAKURA='dm22ex1-096',DOGOL='dm22rp1-050',GATE='dm25bd2-013';
const NATURE='dm01-108',LIGHT='dm01-075',FIRE='dm01-097',SEED='dmsd20-016',DUAL='dm22rp2-S8';
const GUARD='dmrp05-090',GIANT='dmrp01-027',TANK='dm22ex1-056';
const ANGEL4='dmr14-034',ANGEL5='dm12-021',ANGEL6='dm38-019',PERFECT='dm23ex2-005';
const read=name=>JSON.parse(readFileSync(new URL('../tools/'+name,import.meta.url)));
function field(active=0){
 const s=Object.assign(setup(),{active});
 for(const p of [0,1])give(s,p,'deck',Array(15).fill(NATURE));
 return s;
}
function add(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,x)=>act(s,'extended',a=>values(s)[a.choice]===(x?.uid??x));
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function breakShield(s,id){
 give(s,0,'shields',[id]);
 const [shield]=s.players[0].shields;
 const attacker=add(s,1,'battle',FIRE);
 attack(s,attacker.uid);
 act(s,'noBlock');
 return {attacker,shield};
}

test('three official spell names and five print IDs resolve to three supported definitions',()=>{
 const manifest=read('support-phase-1185.json'),refs=read('image-reference-prints.json').prints;
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(manifest.cards.map(x=>x.id),[SAKURA,DOGOL,GATE]);
 assert.deepEqual(manifest.printAliases.map(x=>[x.id,x.canonicalId]),[['dm25bd2-SP6',GATE],['promoy25-063',GATE]]);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),[face]=row.faces;
  assert.deepEqual(registry.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.deepEqual([c.type,c.cost,c.civilizations,c.manaValue,c.limit],['spell',face.cost,face.civilizations,1,4]);
  assert.equal(manifest.regulationVerification.limits[row.id],4);
  assert.equal(refs.find(x=>x.id===row.id)?.image,row.image);
  const parsed={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(parsed,{phase:1185}),row.spec);
  const changed=structuredClone(parsed);
  changed.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(changed,{phase:1185}));
  if(!row.canonicalId){
   assert.equal(CARD_IMAGES[id],row.image);
   assert.deepEqual(details.cards.find(x=>x.id===id).faces,row.faces);
  }
 }
});

test('Sakura offers only face-up non-evolution Nature Guardman creatures and allows zero, one or two picks',()=>{
 for(const count of [0,1,2]){
  let s=field();
  const a=add(s,0,'mana',GUARD,{tapped:true}),b=add(s,0,'mana',GIANT),c=add(s,0,'mana',TANK);
  add(s,0,'mana','dmr05-008');
  add(s,0,'mana','dmr08-050');
  add(s,0,'mana',GUARD,{faceDown:true});
  add(s,0,'hand',GUARD);
  add(s,1,'mana',GUARD);
  cast(s,SAKURA);
  const all=physical(s);
  assert.deepEqual(values(s),[a.uid,b.uid,c.uid,null]);
  if(count){
   pick(s,a);
   assert.deepEqual(values(s),[b.uid,c.uid,null]);
   assert.ok(has(s,0,'mana',a));
   s=JSON.parse(JSON.stringify(s));
  }
  pick(s,count===2?b:null);
  drain(s);
  assert.equal(has(s,0,'battle',a),count>0);
  assert.equal(has(s,0,'battle',b),count===2);
  assert.ok(has(s,0,'mana',c));
  assert.deepEqual(physical(s),all);
 }
});

test('Sakura can be cast from a broken shield with no available mana',()=>{
 const s=field(1);
 give(s,0,'mana',[]);
 const guard=add(s,0,'mana',GUARD,{tapped:true});
 const {shield}=breakShield(s,SAKURA);
 act(s,'useTrigger',a=>a.uid===shield.uid);
 pick(s,guard);
 drain(s);
 assert.ok(has(s,0,'battle',guard)&&has(s,0,'grave',shield));
});

test('Dogol checks civil count only on a real shield and counts each eligible element once',()=>{
 for(const [allies,allowed] of [
  [[NATURE,SEED],true],
  [[DUAL,SEED],true],
  [[DUAL],false],
  [[SEED,FIRE],false],
  [[SEED],false]
 ]){
  const s=field(1);
  for(const id of allies)add(s,0,'battle',id);
  const sealed=add(s,0,'battle',NATURE,{sealed:true});
  add(s,0,'seals',NATURE,{sealOf:sealed.uid,faceDown:true});
  add(s,0,'battle',FIRE,{under:[inst(NATURE)]});
  add(s,1,'battle',NATURE);
  const {attacker,shield}=breakShield(s,DOGOL);
  assert.equal(e.getLegalActions(s).some(a=>a.kind==='useTrigger'&&a.uid===shield.uid),allowed);
  if(allowed){
   act(s,'useTrigger',a=>a.uid===shield.uid);
   assert.equal(s.decision.player,0);
   pick(s,attacker);
   drain(s);
   assert.ok(has(s,1,'mana',attacker));
  }else assert.ok(has(s,0,'hand',shield)&&has(s,1,'battle',attacker));
 }
});

test('Dogol can be paid for without civil count and returns a borrowed creature to its owner',()=>{
 const s=field();
 const enemy=add(s,1,'battle',LIGHT,{cardOwner:0});
 const seed=add(s,1,'battle',SEED);
 const own=add(s,0,'battle',NATURE);
 cast(s,DOGOL);
 assert.deepEqual(values(s),[enemy.uid]);
 pick(s,enemy);
 assert.ok(has(s,0,'mana',enemy)&&has(s,0,'battle',own)&&has(s,1,'battle',seed));
});

test('Dogol leaves target selection to the caster and has the opposing player perform the move',()=>{
 const s=field(),enemy=add(s,1,'battle',LIGHT);
 const protectedEnemy=add(s,1,'battle','dm23ex1-003',{justDiverActive:true});
 s.g26Extreme=[false,true];
 cast(s,DOGOL);
 assert.equal(s.decision.player,0);
 assert.deepEqual(values(s),[enemy.uid]);
 pick(s,enemy);
 assert.ok(has(s,1,'mana',enemy)&&has(s,1,'battle',protectedEnemy));
});

test('Gate puts the chosen creature into mana tapped and uses the new mana count',()=>{
 const s=field();
 give(s,0,'mana',[NATURE,ANGEL5,ANGEL6,'dm25rp4-013']);
 const [,,,angelSeed]=s.players[0].mana;
 const paying=add(s,0,'battle',NATURE),seed=add(s,0,'battle',SEED);
 const angel=s.players[0].mana[1];
 const enemy=add(s,1,'battle',ANGEL4);
 const spell=add(s,0,'hand',GATE),before=physical(s);
 act(s,'play',a=>a.uid===spell.uid);
 assert.deepEqual(values(s),[paying.uid]);
 pick(s,paying);
 assert.equal(s.players[0].mana.find(x=>x.uid===paying.uid)?.tapped,true);
 assert.equal(s.players[0].mana.length,5);
 assert.deepEqual(values(s),[angel.uid]);
 pick(s,angel);
 drain(s);
 assert.ok(has(s,0,'battle',angel)&&has(s,0,'battle',seed)&&has(s,1,'battle',enemy));
 assert.ok(has(s,0,'mana',angelSeed));
 assert.deepEqual(physical(s),before);
});

test('Gate’s first instruction can move an ally with choice protection',()=>{
 const s=field(),ally=add(s,0,'battle','dm24ex1-009');
 s.extLimits=[{kind:'g521Grant',g565External:true,ref:{uid:ally.uid,incarnation:0},
  grant:{g1082ChoiceProtected:true},expires:'start',who:0}];
 assert.equal(e.effectiveCard(ally,s).g1082ChoiceProtected,true);
 cast(s,GATE);
 assert.deepEqual(values(s),[ally.uid]);
 pick(s,ally);
 assert.ok(has(s,0,'mana',ally));
 assert.equal(s.decision,null);
});

test('Gate can redeploy the creature it just placed into mana',()=>{
 const s=field();
 give(s,0,'mana',[NATURE,NATURE,NATURE,LIGHT]);
 const angel=add(s,0,'battle',ANGEL4);
 cast(s,GATE);
 pick(s,angel);
 assert.deepEqual(values(s),[angel.uid]);
 pick(s,angel);
 drain(s);
 assert.ok(has(s,0,'battle',angel)&&!has(s,0,'mana',angel));
});

test('Gate still deploys when there is no creature to move or Perfect stays',()=>{
 for(const hasPerfect of [false,true]){
  const s=field();
  give(s,0,'mana',[NATURE,NATURE,ANGEL4,ANGEL5]);
  const angel=s.players[0].mana[2];
  const perfect=hasPerfect?add(s,0,'battle',PERFECT):null;
  cast(s,GATE);
  if(perfect)pick(s,perfect);
  assert.equal(s.players[0].mana.length,4);
  assert.deepEqual(values(s),[angel.uid]);
  pick(s,angel);
  drain(s);
  assert.ok(has(s,0,'battle',angel));
  if(perfect)assert.ok(has(s,0,'battle',perfect));
 }
});

test('Gate’s G Strike stops an attacker from a broken shield without casting the spell',()=>{
 const s=field(1),later=add(s,1,'battle',FIRE),own=add(s,0,'battle',NATURE);
 give(s,0,'mana',[]);
 const {shield}=breakShield(s,GATE);
 assert.equal(s.decision.task.op,'gsDeclare');
 pick(s,true);
 assert.equal(s.decision.task.op,'gsTarget');
 pick(s,later);
 drain(s);
 assert.ok(e.attackLocked(s,1,later));
 assert.ok(!later.tapped&&has(s,0,'hand',shield)&&has(s,0,'battle',own));
 assert.equal(s.players[0].mana.length,0);
});
