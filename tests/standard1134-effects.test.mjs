import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const KAISER='dm26ex1-N003',GADGET='dm26ex1-N006',KOONI='dm26ex1-N007';
const HUNTER='dmr02-044',NATURE='dm01-108',FIRE='dm01-097',DEATH='dm01-027';
const TWIN='dmex15-b032',GENMU='dmrp15-km1',BLOCKER='dm26ex1-N009';
const add=(s,p,zone,id,props={})=>{
 const x={...inst(id),...props};
 s.players[p][zone].push(x);
 return x;
};
const values=s=>s.decision?.choices?.map(c=>c.value?.uid??c.value)??[];
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
function play(s,id,face=0){
 const x=add(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&(a.face??0)===face);
 return x;
}
function destroy(s,x){
 play(s,DEATH);
 act(s,'effect',a=>a.targets?.some(y=>y.uid===x.uid));
}

test('all seven official prints share their canonical deck IDs and rules',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-1134.json',import.meta.url)));
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const images=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url)));
 assert.equal(manifest.cards.length,3);
 assert.equal(manifest.printAliases.length,4);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id;
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1134}),row.spec);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[id]);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1},{id,count:2}]),[{id,count:3}]);
  assert.equal(e.card(id).limit,manifest.regulationVerification.limits[row.id]);
  assert.ok(images.prints.some(x=>x.id===row.id&&x.canonicalId===id&&x.image===row.image));
  if(!row.canonicalId){
   assert.deepEqual(details.cards.find(c=>c.id===id).faces,row.faces);
   assert.equal(CARD_IMAGES[id],row.image);
  }
  const faces=structuredClone(row.faces);
  faces.at(-1).abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec({...row,faces,status:'complete'},{phase:1134}));
 }
});

function topDeck(s,p,ids){
 give(s,p,'deck',[...ids,NATURE,NATURE,NATURE,NATURE]);
 return [...s.players[p].deck];
}
function orderBottom(s){
 while(s.decision?.task?.op==='g34_Order')pick(s,values(s).at(-1));
}

test('Kaiser puts two cards into mana tapped, then returns one chosen card',()=>{
 const s=setup(),[first,second]=topDeck(s,0,[NATURE,FIRE]);
 play(s,KAISER);
 assert.equal(s.decision.task.op,'g34_Select');
 assert.ok(first.tapped&&second.tapped&&has(s,0,'mana',first)&&has(s,0,'mana',second));
 pick(s,second.uid);
 assert.ok(has(s,0,'hand',second)&&has(s,0,'mana',first));
});

for(const mode of ['normal spell','last burst','decline burst','trigger'])test('Victory Land can use a Hunter costing up to ten through '+mode,()=>{
 const s=setup(),[wrong,target,other]=topDeck(s,0,[DEATH,HUNTER,NATURE]);
 if(mode==='normal spell')play(s,KAISER,1);
 else if(mode==='trigger'){
  const shield=add(s,0,'shields',KAISER);
  const attacker=add(s,1,'battle',FIRE);
  s.active=1;
  s.players[0].shields=[shield];
  attack(s,attacker.uid);
  if(s.decision?.type==='block')act(s,'noBlock');
  act(s,'useTrigger',a=>a.face===1);
 }else{
  const x=add(s,0,'battle',KAISER);
  s.active=1;
  destroy(s,x);
  assert.equal(s.decision.task.op,'g40_LastBurst');
  pick(s,mode==='last burst'?true:null);
  if(mode==='decline burst'){
   assert.ok(has(s,0,'grave',x)&&has(s,0,'deck',target));
   return;
  }
 }
 assert.equal(s.decision.task.op,'g34_RaidPick');
 assert.deepEqual(values(s),[target.uid,null]);
 pick(s,target.uid);
 orderBottom(s);
 assert.ok(has(s,0,'battle',target));
 assert.deepEqual(s.players[0].deck.slice(-2),[other,wrong]);
});

for(const declared of [6,13,'∞',77])test('Gadget Charger declares a number before showing the library: '+declared,()=>{
 const s=setup(),[six,twin,infinity]=topDeck(s,0,[DEATH,TWIN,GENMU]);
 const x=play(s,GADGET,1);
 assert.equal(s.decision.task.op,'g9Number');
 assert.equal(s.decision.task.minNumber,6);
 const actions=e.getLegalActions(s);
 assert.ok(actions.every(a=>a.number==='∞'||a.number>=6));
 assert.ok(!s.log.some(x=>x.type==='reveal'&&x.cardId===TWIN));
 assert.throws(()=>e.step(s,{...actions[0],number:5}),/選択できない/);
 const resumed=JSON.parse(JSON.stringify(s));
 const legal=e.getLegalActions(resumed);
 e.step(resumed,legal.find(a=>a.number===declared)??{...legal[0],number:declared});
 const target=declared===6?six:declared===13?twin:declared==='∞'?infinity:null;
 if(target){
  assert.equal(resumed.decision.task.op,'g34_LookPick');
  assert.deepEqual(values(resumed),[target.uid]);
  pick(resumed,target.uid);
  assert.ok(has(resumed,0,'hand',target));
 }
 orderBottom(resumed);
 assert.ok(has(resumed,0,'mana',x));
 assert.ok([six,twin,infinity].filter(y=>y!==target).every(y=>has(resumed,0,'deck',y)));
});

for(const alliedCount of [2,3])test('Gadget locks the whole opposing team only at the three-creature threshold: '+alliedCount,()=>{
 const s=setup();
 add(s,0,'battle',GADGET);
 add(s,0,'battle',NATURE);
 if(alliedCount===3)add(s,0,'battle',NATURE);
 const existing=add(s,1,'battle',BLOCKER);
 s.active=1;
 const entrant=play(s,FIRE);
 assert.equal(e.attackLocked(s,1,existing),alliedCount===3);
 assert.equal(e.attackLocked(s,1,entrant),alliedCount===3);
 const limits=(s.extLimits||[]).filter(l=>l.kind==='block');
 assert.deepEqual(limits.map(l=>l.uid).sort(),alliedCount===3?[existing.uid,entrant.uid].sort():[]);
 act(s,'toAttack');
 act(s,'endTurn');
 drain(s);
 assert.equal(e.attackLocked(s,1,existing),false);
});

for(const summonAsSecond of [false,true])test('Kooni can mill three when itself or its Yobinion creature is the second entry: '+summonAsSecond,()=>{
 const s=setup();
 if(summonAsSecond)play(s,FIRE);
 const [small,...rest]=topDeck(s,0,[NATURE,DEATH,FIRE,NATURE]);
 const x=play(s,KOONI);
 if(summonAsSecond)act(s,'orderEffect',a=>
  s.pendingEffects.find(row=>row.effectId===a.effectId)?.task?.op==='g19Yobi');
 assert.equal(s.decision?.task?.op,'g19Yobi');
 pick(s,true);
 assert.ok(has(s,0,'battle',x)&&has(s,0,'battle',small));
 assert.equal(s.decision.task.op,'g34_Mill');
 pick(s,true);
 assert.ok(rest.slice(0,3).every(y=>has(s,0,'grave',y)));
 assert.equal(s.players[0].grave.length,3);
});

test('Kooni recovers a qualifying creature after leaving, excluding spells and cheaper creatures',()=>{
 const s=setup(),x=add(s,0,'battle',KOONI),candidate=add(s,0,'grave',BLOCKER);
 add(s,0,'grave',TWIN);
 add(s,0,'grave',DEATH);
 s.active=1;
 destroy(s,x);
 assert.deepEqual(values(s),[candidate.uid,null]);
 pick(s,candidate.uid);
 assert.ok(has(s,0,'hand',candidate)&&has(s,0,'grave',x));
});
