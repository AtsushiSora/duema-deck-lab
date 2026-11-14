import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const KOI='dmrp06-004',SNAKE='dm03-047',LEGEND='dm08-017';
const NATURE='dm01-108',FIRE='dm01-097',BLAZE='dm01-100',BLOCKER='dm01-089';
const GATE='dm01-086',SPARK='dm01-015',REPRINT='dmex10-032';
const BAJURA='dm08-s04',ARMORED_EVOLUTION='dmc62-002';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));

function field(){
 const s=setup();s.active=0;
 for(const p of [0,1])give(s,p,'deck',Array(24).fill(NATURE));
 return s;
}
function add(s,p,z,id,fields={}){
 const x=Object.assign(inst(id),fields);
 s.players[p][z].push(x);return x;
}
function end(s){
 if(s.phase==='charge')act(s,'skipCharge');
 if(s.phase==='main')act(s,'toAttack');
 act(s,'endTurn');
}
const has=(s,p,z,x)=>s.players[p][z].some(y=>x.uid===y.uid);
const options=s=>s.decision?.choices.map(x=>x.value?.uid??x.value)??[];
const pick=(s,value)=>act(s,'extended',a=>options(s)[a.choice]===value);
const target=(s,x)=>act(s,'effect',a=>a.targets?.some(t=>t.uid===x.uid));

test('the four official prints resolve to three cards with verified stats, abilities, limits and art',()=>{
 const m=read('tools/support-phase-1260.json'),refs=read('tools/image-reference-prints.json').prints;
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[KOI,SNAKE,LEGEND]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[[REPRINT,SNAKE]]);
 for(const row of [...m.cards,...m.printAliases]){
  const {id,canonicalId=id,name,faces:[f],image}=row,c=e.card(canonicalId);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1260}),row.spec);
  const unknown=structuredClone({...row,status:'complete'});
  unknown.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:1260}));
  assert.deepEqual(registry.resolveRows([{id,count:1}]),[{id:canonicalId,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[canonicalId]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,m.regulationVerification.limits[id]]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  if(id===canonicalId){
   assert.equal(CARD_IMAGES[id],image);
   assert.equal(c.text,f.abilityText);
  }
  assert.ok(refs.some(x=>x.id===id&&x.canonicalId===canonicalId&&x.image===image));
 }
});

const breaker=(s,x)=>e.effectiveCard(x,s).breaker??1;
const legalAttack=(s,x)=>e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid);
function playKoi(s,target){
 const koi=add(s,0,'hand',KOI);
 act(s,'play',a=>a.uid===koi.uid);
 if(target)pick(s,target.uid);
 return koi;
}

test('Koi restricts only the pair, persists across turns, and offers an optional draw at its own start',()=>{
 const s=field(),enemy=add(s,1,'battle',BLOCKER),other=add(s,1,'battle',BLOCKER);
 const attacker=add(s,0,'battle',NATURE),koi=playKoi(s,enemy);
 assert.ok(e.attackLocked(s,0,koi)&&e.attackLocked(s,1,enemy)&&!e.attackLocked(s,1,other));
 attack(s,attacker.uid);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===enemy.uid));
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===other.uid));
 act(s,'noBlock');drain(s);end(s);
 assert.equal(s.decision,null);
 end(s);
 assert.equal(s.decision?.task?.op,'g34_Draw');
 const next=s.players[0].deck[0];
 pick(s,1);assert.ok(has(s,0,'hand',next));
 assert.ok(e.attackLocked(s,0,koi)&&e.attackLocked(s,1,enemy));
 act(s,'skipCharge');act(s,'toAttack');assert.ok(!legalAttack(s,koi));
 end(s);end(s);pick(s,0);
 assert.ok(e.attackLocked(s,1,enemy));
});

test('Koi releases the other creature when either member leaves, and re-entry uses a new pair',()=>{
 for(const sourceLeaves of [true,false]){
  const s=field(),enemy=add(s,1,'battle',NATURE),koi=playKoi(s,enemy);
  const leaving=sourceLeaves?koi:enemy,remaining=sourceLeaves?enemy:koi;
  cast(s,GATE);target(s,leaving);
  assert.ok(has(s,sourceLeaves?0:1,'hand',leaving));
  assert.equal(e.attackLocked(s,sourceLeaves?1:0,remaining),false);
  if(!sourceLeaves){end(s);act(s,'skipCharge');act(s,'play',a=>a.uid===enemy.uid);}
  else{
   act(s,'play',a=>a.uid===koi.uid);pick(s,enemy.uid);
   assert.ok(e.attackLocked(s,1,enemy));
  }
  if(!sourceLeaves)assert.equal(e.attackLocked(s,0,koi),false);
 }
});

test('Koi can enter without an opposing target and still offers the next-start draw',()=>{
 const s=field(),koi=playKoi(s,null);
 assert.equal(s.decision,null);
 end(s);end(s);assert.equal(s.decision?.task?.op,'g34_Draw');
 pick(s,0);act(s,'skipCharge');act(s,'toAttack');assert.ok(legalAttack(s,koi));
});

test('Koi follows an evolved creature, and a seal ends the restriction even after unsealing',()=>{
 const s=field(),enemy=add(s,1,'battle',BLAZE),koi=playKoi(s,enemy);
 const evolution=add(s,0,'hand','dmr23-002');
 act(s,'play',a=>a.uid===evolution.uid);
 act(s,'evolve',a=>a.baseUid===koi.uid);
 drain(s);
 assert.ok(e.attackLocked(s,0,evolution)&&e.attackLocked(s,1,enemy));
 cast(s,'dm25ex4-058');pick(s,enemy.uid);drain(s);
 assert.ok(enemy.sealed);
 assert.equal(e.attackLocked(s,0,evolution),false);
 end(s);act(s,'skipCharge');
 const command=add(s,1,'hand','dmr23-072');
 act(s,'play',a=>a.uid===command.uid);drain(s);
 assert.equal(enemy.sealed,undefined);
 assert.equal(e.attackLocked(s,1,enemy),false);
});

test('Snake Attack grants existing allies W Breaker without reducing T Breaker and sends a whole shield to grave',()=>{
 const s=field(),ally=add(s,0,'battle',NATURE),triple=add(s,0,'battle','dm05-s04'),enemy=add(s,1,'battle',FIRE);
 const shield=s.players[0].shields[0],extra=inst(SPARK);
 shield.shieldStack=[extra];
 cast(s,SNAKE);
 assert.equal(s.decision?.task?.op,'g34_ShieldGrave588');
 assert.ok(s.decision.choices.every(o=>!o.cardId));
 pick(s,shield.uid);
 assert.ok(has(s,0,'grave',shield)&&has(s,0,'grave',extra));
 assert.equal(s.decision,null);
 assert.equal(breaker(s,ally),2);assert.equal(breaker(s,triple),3);assert.equal(breaker(s,enemy),1);
 const late=add(s,0,'hand',FIRE);act(s,'play',a=>a.uid===late.uid);assert.equal(breaker(s,late),1);
 attack(s,ally.uid);act(s,'noBlock');drain(s);assert.equal(s.players[1].shields.length,3);
 end(s);assert.equal(breaker(s,ally),1);
});

test('Snake Attack can be cast with no shields or no creatures (QA 35037)',()=>{
 const s=field(),ally=add(s,0,'battle',NATURE);
 give(s,0,'shields',[]);cast(s,SNAKE);
 assert.equal(s.decision,null);assert.equal(breaker(s,ally),2);
 const empty=field(),shield=empty.players[0].shields[0];
 cast(empty,SNAKE);pick(empty,shield.uid);
 assert.ok(has(empty,0,'grave',shield));
});

test('Legend Attacker adds the Dragon category and keeps Dragonoid, grants power and breakers, and expires',()=>{
 const s=field(),blaze=add(s,0,'battle',BLAZE),a=add(s,0,'battle',BLAZE),nature=add(s,0,'battle',NATURE);
 const enemy=add(s,1,'battle',BLAZE),bajura=add(s,0,'hand',BAJURA),armored=add(s,0,'hand',ARMORED_EVOLUTION);
 assert.equal(e.card(BLAZE).name,'凶戦士ブレイズ・クロー');
 assert.ok(!e.getLegalActions(s).some(x=>x.kind==='play'&&x.uid===bajura.uid));
 cast(s,LEGEND);
 assert.equal(e.effectiveCard(blaze,s).race,'ドラゴノイド/ドラゴン');
 assert.equal(e.power(blaze,false,s),e.card(BLAZE).power+4000);
 assert.equal(breaker(s,blaze),2);assert.equal(breaker(s,nature),1);assert.equal(breaker(s,enemy),1);
 assert.ok(e.getLegalActions(s).some(x=>x.kind==='play'&&x.uid===bajura.uid));
 assert.ok(e.evolutionBases(s,0,e.card(BAJURA)).some(x=>x.uid===blaze.uid));
 assert.ok(!e.getLegalActions(s).some(x=>x.kind==='play'&&x.uid===armored.uid));
 const late=add(s,0,'hand',BLAZE);act(s,'play',x=>x.uid===late.uid);
 assert.equal(e.effectiveCard(late,s).race,'ドラゴノイド');
 attack(s,a.uid);act(s,'noBlock');drain(s);assert.equal(s.players[1].shields.length,3);
 attack(s,blaze.uid);act(s,'noBlock');drain(s);
 end(s);
 assert.equal(e.effectiveCard(blaze,s).race,'ドラゴノイド');
 assert.equal(e.power(blaze,false,s),e.card(BLAZE).power);
 assert.equal(breaker(s,blaze),1);
});
