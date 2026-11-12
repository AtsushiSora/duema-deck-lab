import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const NEO='dmr19-008',BEAR='dmr18-s08',NEX='dmr17-009';
const LIGHT='dm01-001',DARK='dm02-028',FIRE='dm10-098',SMALL_FIRE='dm01-097',NATURE='dm01-108';
const COMMAND='dmr18-067',BIRD='dm04-050',MULTI_BIRD='dm12-034';
const DESTROY='dm01-027',BOUNCE='dm01-086',APOCALYPSE='dm14-015',KING='dmx16-001',QX='dmrp07-m01';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
const value=c=>c.value?.uid??c.value;
const choices=s=>s.decision?.choices?.map(value)??[];
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();

function field(active=0){
 const s=Object.assign(setup(),{active});
 for(const p of [0,1]){give(s,p,'deck',Array(20).fill(NATURE));give(s,p,'grave',[]);}
 return s;
}
function put(s,p,z,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][z].push(x);
 return x;
}
function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}
function finishAttack(s){
 if(s.decision?.type==='block')act(s,'noBlock');
 drain(s);
}
function pass(s){
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
}

function invade(s){
 assert.equal(s.decision?.task?.op,'g23_Declare');
 pick(s,true);
 assert.equal(s.decision?.task?.op,'g23_Invade');
 pick(s,true);
}
function evolve(s,id,base){
 const x=play(s,id);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[base.uid]);
 act(s,'evolve',a=>a.baseUid===base.uid);
 return x;
}

test('Phase 1020 pins three complete definitions and two equivalent print IDs',()=>{
 const m=read('tools/support-phase-1020.json'),refs=read('tools/image-reference-prints.json').prints;
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[NEO,BEAR,NEX]);
 assert.deepEqual(m.printAliases.map(x=>x.id),['dmex12-005','dmex08-284']);
 for(const row of [...m.cards,...m.printAliases]){
  const {id,name,faces}=row,canonical=row.canonicalId??id,c=e.card(canonical),f=faces[0];
  const spec=standardCardSpec({id,name,status:'complete',faces},{phase:1020});
  assert.deepEqual(spec,m.cards.find(x=>x.id===canonical).spec);
  for(const [k,v] of Object.entries(spec))assert.deepEqual(c[k],v);
  assert.deepEqual([c.name,c.type,c.cost,c.race,c.power,e.civilizations(c),c.manaValue,c.limit],
   [name,'creature',f.cost,f.race,Number(f.powerText),f.civilizations,1,4]);
  assert.ok(row.verification.facesMatched&&registry.get(id).supported);
  assert.equal(registry.get(id).id,canonical);
  assert.equal(m.regulationVerification.limits[id],4);
  assert.deepEqual(refs.filter(x=>x.id===id).map(x=>[x.canonicalId,x.image]),[[canonical,row.image]]);
  if(id===canonical)assert.equal(CARD_IMAGES[id],row.image);
  for(const source of [data,details,snapshot])
   assert.deepEqual(source.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[canonical]);
 }
});

test('Neo untaps on the first attack even after invasion and not after another invasion in the same turn (QA 38660)',()=>{
 let s=field();
 const base=put(s,0,'battle',FIRE),first=put(s,0,'hand',NEO),second=put(s,0,'hand',NEO);
 const all=physical(s);
 attack(s,base.uid);
 pick(s,true);
 pick(s,null);
 assert.equal(s.decision?.task?.op,'g23_Invade');
 s=JSON.parse(JSON.stringify(s));
 pick(s,true);
 finishAttack(s);
 assert.equal(s.players[0].battle[0].tapped,false);
 assert.ok(has(s,0,'battle',first));
 attack(s,first.uid);
 invade(s);
 finishAttack(s);
 assert.ok(has(s,0,'battle',second)&&s.players[0].battle[0].tapped);
 pass(s);
 pass(s);
 attack(s,second.uid);
 finishAttack(s);
 assert.equal(s.players[0].battle[0].tapped,false);
 assert.deepEqual(physical(s),all);
});

for(const [baseId,allowed] of [[SMALL_FIRE,false],[NATURE,false],[FIRE,true]])
 test('Neo invasion requires a fire creature costing at least three '+baseId,()=>{
  const s=field(),base=put(s,0,'battle',baseId),card=put(s,0,'hand',NEO);
  attack(s,base.uid);
  if(allowed)invade(s);else assert.notEqual(s.decision?.task?.op,'g23_Declare');
  finishAttack(s);
  assert.equal(has(s,0,'battle',card),allowed);
 });

test('Neo may evolve normally on a Fire creature below the invasion cost',()=>{
 const s=field(),base=put(s,0,'battle',SMALL_FIRE);
 put(s,0,'battle',LIGHT);
 const neo=evolve(s,NEO,base);
 assert.ok(has(s,0,'battle',neo));
 attack(s,neo.uid);
 finishAttack(s);
 assert.equal(neo.tapped,false);
});

for(const [baseId,allowed] of [[NATURE,false],['dmr17-008',false],[COMMAND,true]])
 test('Bearfugan invades only over a nature evolution Command '+baseId,()=>{
  const s=field(),base=put(s,0,'battle',baseId),bear=put(s,0,'hand',BEAR);
  if(allowed)base.under=[inst(NATURE)];
  attack(s,base.uid);
  if(allowed)invade(s);else assert.notEqual(s.decision?.task?.op,'g23_Declare');
  finishAttack(s);
  assert.equal(has(s,0,'battle',bear),allowed);
  if(allowed)assert.equal(s.metrics[0].breaks,4);
 });

test('Bearfugan can normally evolve and moves its full stack to mana when destroyed',()=>{
 const s=field(),base=put(s,0,'battle',NATURE);
 put(s,0,'battle',DARK);
 const bear=evolve(s,BEAR,base),all=physical(s);
 pass(s);
 act(s,'skipCharge');
 const destroy=play(s,DESTROY);
 act(s,'effect',a=>a.targets.some(x=>x.uid===bear.uid));
 drain(s);
 assert.ok(has(s,0,'mana',bear)&&has(s,0,'mana',base)&&has(s,1,'grave',destroy));
 assert.ok(!bear.tapped&&!base.tapped);
 assert.deepEqual(physical(s),[...all,destroy.uid].sort());
});

test('Bearfugan replaces its and its allies’ simultaneous destruction, leaving other owners and colors alone',()=>{
 const s=field(1);
 const bear=put(s,0,'battle',BEAR),a=put(s,0,'battle',NATURE),b=put(s,0,'battle',MULTI_BIRD),dark=put(s,0,'battle',DARK);
 const other=put(s,1,'battle',NATURE);
 put(s,1,'battle',DARK);
 play(s,APOCALYPSE);
 drain(s);
 assert.ok([bear,a,b].every(x=>has(s,0,'mana',x)));
 assert.ok(!a.tapped&&b.tapped);
 assert.ok(has(s,0,'grave',dark)&&has(s,1,'grave',other));
});

test('Bearfugan’s replacement does not affect a bounce',()=>{
 const s=field(1);
 put(s,0,'battle',BEAR);
 const x=put(s,0,'battle',NATURE);
 play(s,BOUNCE);
 act(s,'effect',a=>a.targets.some(t=>t.uid===x.uid));
 assert.ok(has(s,0,'hand',x));
});

for(const mode of ['entry bird','entry miss','attack bird','entry prevented','deck locked'])
 test('Blast Dragon NEX reveals and resolves the proper deck destination '+mode,()=>{
  const s=field();
  const id=mode==='entry miss'?FIRE:BIRD;
  give(s,0,'deck',[id,NATURE,DARK,FIRE]);
  if(mode==='deck locked')put(s,1,'battle',QX);
  if(mode==='entry prevented')put(s,1,'battle',KING);
  const top=s.players[0].deck[0];
  const nex=mode==='attack bird'?put(s,0,'battle',NEX):play(s,NEX);
  if(mode==='attack bird'){attack(s,nex.uid);finishAttack(s);}
  assert.equal(e.effectiveCard(nex,s).breaker,2);
  if(mode.endsWith('bird')){
   assert.ok(has(s,0,'battle',top)&&e.effectiveCard(top,s).speedAttacker);
  }else if(mode==='entry miss')assert.equal(s.players[0].deck.at(-1).uid,top.uid);
  else if(mode==='entry prevented')assert.ok(has(s,0,'grave',top));
  else assert.equal(s.players[0].deck[0].uid,top.uid);
  assert.equal(s.log.some(x=>x.type==='reveal'&&x.cardId===NEX),mode!=='deck locked');
 });

test('NEX grants Speed Attacker to friendly Fire Birds only while present',()=>{
 const s=field();
 const nex=put(s,0,'battle',NEX),a=put(s,0,'battle',BIRD,{entered:s.turn}),b=put(s,1,'battle',BIRD);
 const c=put(s,0,'battle',FIRE,{entered:s.turn});
 assert.equal(e.effectiveCard(a,s).speedAttacker,true);
 assert.ok(!e.effectiveCard(b,s).speedAttacker&&!e.effectiveCard(c,s).speedAttacker);
 s.active=1;
 play(s,BOUNCE);
 act(s,'effect',a=>a.targets.some(x=>x.uid===nex.uid));
 assert.ok(!e.effectiveCard(a,s).speedAttacker);
});
