import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const VADER='dmr18-020',RAIDEEN='dmr20-020',HARIRUYA='dmr20-002',REPRINT='dmx24-018';
const FIRE='dm01-097',FIVE='dm01-059',NATURE='dm01-108',WATER='dm01-083',HAND='dm01-027';
const TWIN='dm22ex1-030',BELFARRE='dmr21-021',DRAGON='dm01-s08';
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
function power(s,p,n){
 const x=put(s,p,'battle',NATURE);
 x.powerModifiers=[{amount:n-2000,expires:'end',who:s.active}];
 return x;
}

test('Phase 1015 pins all three complete definitions and resolves the Vader reprint',()=>{
 const m=read('tools/support-phase-1015.json'),refs=read('tools/image-reference-prints.json').prints;
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[VADER,RAIDEEN,HARIRUYA]);
 assert.deepEqual(m.printAliases.map(x=>x.id),[REPRINT]);
 for(const row of m.cards){
  const {id,name,faces}=row,[f]=faces,d=details.cards.find(x=>x.id===id),c=e.card(id);
  assert.deepEqual(faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:1015}),row.spec);
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'未知の能力。'}]},{phase:1015}));
  for(const [key,v] of Object.entries(row.spec))assert.deepEqual(c[key],v);
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [name,'creature',f.cost,parseInt(f.powerText,10),f.race,f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-1015');
  assert.equal(CARD_IMAGES[id],row.image);
  assert.ok(registry.get(id).supported&&row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[id],4);
  assert.deepEqual(refs.filter(x=>x.id===id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  for(const source of [data,details,snapshot])
   assert.deepEqual(source.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
 }
 const [row]=m.printAliases;
 assert.equal(row.canonicalId,VADER);
 assert.equal(registry.get(row.id).id,VADER);
 assert.equal(m.regulationVerification.limits[row.id],4);
 assert.ok(row.verification.facesMatched);
 assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1015}),m.cards[0].spec);
 assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[VADER,row.image]]);
 assert.deepEqual(registry.resolveRows([VADER,REPRINT].map(id=>({id,count:1}))),[{id:VADER,count:2}]);
});

for(const [mode,id] of [['creature',NATURE],['spell',HAND],['Twinpact',TWIN],['decline',NATURE]])
 test('Vader optionally mills once at its own end step and draws only for a creature '+mode,()=>{
  const s=field();
  put(s,0,'battle',VADER);
  put(s,1,'battle',VADER);
  give(s,0,'deck',[id,WATER,FIRE,NATURE]);
  const [top,second]=s.players[0].deck,all=physical(s);
  s.phase='attack';
  act(s,'endTurn');
  assert.equal(s.decision.player,0);
  assert.deepEqual(choices(s),[true,null]);
  pick(s,mode==='decline'?null:true);
  drain(s);
  assert.equal(has(s,0,'grave',top),mode!=='decline');
  assert.equal(has(s,0,'hand',second),['creature','Twinpact'].includes(mode));
  assert.equal(s.players[1].grave.length,0);
  assert.deepEqual(physical(s),all);
 });

test('Vader cannot attack a player or tapped creature, and can block normally',()=>{
 const s=field(),vader=put(s,0,'battle',VADER),attacker=put(s,1,'battle',FIRE,{tapped:true});
 s.phase='attack';
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===vader.uid));
 s.active=1;
 attacker.tapped=false;
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===vader.uid);
 drain(s);
 assert.equal(vader.tapped,true);
 assert.ok(has(s,1,'grave',attacker));
});

test('Raideen evolves only on Fire and the normal entry destroys exactly one current-power target',()=>{
 const s=field(),base=put(s,0,'battle',FIRE);
 put(s,0,'battle',WATER);
 const small=power(s,1,5000),other=power(s,1,1000),large=power(s,1,5001);
 const x=play(s,RAIDEEN);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[base.uid]);
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.deepEqual(new Set(choices(s)),new Set([small.uid,other.uid]));
 pick(s,small.uid);
 drain(s);
 assert.ok(has(s,1,'grave',small)&&has(s,1,'battle',large)&&has(s,1,'battle',other));
 assert.equal(s.players[0].battle.find(y=>y.uid===x.uid).under[0].uid,base.uid);
});

for(const n of [2,3])for(const mode of n===2?['normal']:['exact total','decline'])
 test('Raideen uses the alternate destruction only with at least three physical cards underneath '+mode,()=>{
  let s=field();
  const base=put(s,0,'battle',RAIDEEN,{under:Array.from({length:n-1},()=>inst(FIRE))});
  const a=power(s,1,6000),b=power(s,1,2000),c=power(s,1,3000),above=power(s,1,8001);
  const x=play(s,RAIDEEN),all=physical(s);
  act(s,'evolve',a=>a.baseUid===base.uid);
  const evolved=s.players[0].battle.find(y=>y.uid===x.uid);
  assert.equal(evolved.under[0].uid,base.uid);
  assert.equal(evolved.under[0].under.length,n-1);
  if(mode==='normal'){
   assert.deepEqual(new Set(choices(s)),new Set([b.uid,c.uid]));
   pick(s,b.uid);
  }else{
   assert.deepEqual(new Set(choices(s)),new Set([a.uid,b.uid,c.uid,null]));
   if(mode==='decline')pick(s,null);
   else{
    pick(s,a.uid);
    assert.ok(has(s,1,'battle',a));
    assert.deepEqual(new Set(choices(s)),new Set([b.uid,null]));
    s=JSON.parse(JSON.stringify(s));
    pick(s,b.uid);
    if(s.decision?.task?.g506PowerBudget!==undefined)pick(s,null);
   }
  }
  drain(s);
  assert.equal(has(s,1,'grave',a),mode==='exact total');
  assert.equal(has(s,1,'grave',b),mode!=='decline');
  assert.ok(has(s,1,'battle',above)&&has(s,1,'battle',c));
  assert.deepEqual(physical(s),all);
 });

for(const [mode,id] of [['Fire cost five non-Command',FIVE],['Fire cost two',FIRE],['non-Fire high cost',HARIRUYA]])
 test('Raideen checks the attack declaration for Fire and current cost five or more '+mode,()=>{
  const s=field(),attacker=put(s,0,'battle',id),evo=put(s,0,'hand',RAIDEEN);
  attack(s,attacker.uid);
  if(id===FIVE){
   assert.equal(s.decision.task.op,'g23_Declare');
   pick(s,true);
   assert.equal(s.decision.task.op,'g23_Invade');
   pick(s,true);
  }else assert.notEqual(s.decision?.task?.op,'g23_Declare');
  if(s.decision?.type==='block')act(s,'noBlock');
  drain(s);
  assert.equal(has(s,0,'battle',evo),id===FIVE);
  assert.equal(s.players[1].shields.length,id===FIRE?4:3);
 });

for(const target of ['player','creature'])
 test('Hariruya can untap and block before combat against '+target+' (QA 37806)',()=>{
  const s=field(1),hariruya=put(s,0,'battle',HARIRUYA,{tapped:true}),attacker=put(s,1,'battle',DRAGON);
  const defender=put(s,0,'battle',FIRE,{tapped:true});
  put(s,0,'battle',BELFARRE,{tapped:true});
  const shield=s.players[0].shields[0],all=physical(s);
  attack(s,attacker.uid,target==='player'?'player':defender.uid);
  assert.equal(s.decision.player,0);
  pick(s,shield.uid);
  assert.equal(hariruya.tapped,false);
  assert.equal(s.decision.type,'block');
  act(s,'block',a=>a.uid===hariruya.uid);
  drain(s);
  assert.ok(has(s,0,'hand',shield)&&has(s,1,'grave',attacker)&&has(s,0,'battle',defender));
  assert.equal(s.metrics[1].breaks+s.metrics[0].breaks,0);
  assert.equal(s.players[0].brokenThisTurn||0,0);
  assert.deepEqual(physical(s),all);
 });

test('Hariruya resumes the interrupted untap after a shield trigger destroys the attacker',()=>{
 let s=field(1);
 const hariruya=put(s,0,'battle',HARIRUYA,{tapped:true}),attacker=put(s,1,'battle',DRAGON);
 give(s,0,'shields',[HAND,NATURE]);
 const shield=s.players[0].shields[0],all=physical(s);
 attack(s,attacker.uid);
 pick(s,shield.uid);
 assert.equal(s.decision.type,'trigger');
 assert.equal(hariruya.tapped,true);
 s=JSON.parse(JSON.stringify(s));
 act(s,'useTrigger',a=>a.uid===shield.uid);
 assert.equal(s.players[0].battle[0].tapped,true);
 act(s,'effect',a=>a.targets.some(t=>t.uid===attacker.uid));
 drain(s);
 assert.ok(has(s,1,'grave',attacker)&&has(s,0,'grave',shield));
 assert.equal(s.players[0].battle[0].tapped,false);
 assert.equal(s.metrics[1].breaks+s.metrics[0].breaks,0);
 assert.deepEqual(physical(s),all);
});

for(const mode of ['decline','no shields','own attack'])
 test('Hariruya does not untap or take shields on '+mode,()=>{
  const s=field(mode==='own attack'?0:1),hariruya=put(s,0,'battle',HARIRUYA,{tapped:true});
  const attacker=put(s,s.active,'battle',DRAGON),defender=put(s,1-s.active,'battle',DRAGON,{tapped:true});
  if(mode==='no shields')give(s,0,'shields',[]);
  attack(s,attacker.uid,defender.uid);
  if(mode==='decline')pick(s,null);
  else assert.notEqual(s.decision?.task?.op,'g34_ShieldTriggerUntap1015');
  if(s.decision?.type==='block')act(s,'noBlock');
  drain(s);
  assert.equal(hariruya.tapped,true);
  assert.equal(s.players[0].hand.length,0);
 });

test('The turn player resolves attack destruction before Hariruya can untap (QA 37807)',()=>{
 const s=field(1),hariruya=put(s,0,'battle',HARIRUYA,{tapped:true});
 const attacker=put(s,1,'battle','dm02-015');
 attack(s,attacker.uid);
 assert.equal(s.decision.player,1);
 pick(s,hariruya.uid);
 assert.ok(has(s,0,'grave',hariruya));
 if(s.decision?.task?.op==='g34_ShieldTriggerUntap1015')pick(s,null);
 drain(s);
 assert.ok(!has(s,0,'battle',hariruya));
});
