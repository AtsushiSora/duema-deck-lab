import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const MAGAND='dmr18-006',JAYLY='dmr20-046',PEARLDA='dmr18-013',GUERRILLA='dmr19-018',REPRINT='dmex13-008';
const NATURE='dm01-108',WATER='dm01-083',DARK='dm01-088',FIRE='dm01-097',HAND='dm01-027';
const COMMAND='dm01-s06',DRAGON='dm01-s08',GIANT='dm05-s04',GO='dmr09-054';
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

test('Phase 1017 pins four complete official definitions and resolves the Magand reprint',()=>{
 const m=read('tools/support-phase-1017.json'),refs=read('tools/image-reference-prints.json').prints;
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[MAGAND,JAYLY,PEARLDA,GUERRILLA]);
 assert.deepEqual(m.printAliases.map(x=>x.id),[REPRINT]);
 for(const row of m.cards){
  const {id,name,faces}=row,[f]=faces,d=details.cards.find(x=>x.id===id),c=e.card(id);
  assert.deepEqual(faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:1017}),row.spec);
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'未知の能力。'}]},{phase:1017}));
  for(const [key,v] of Object.entries(row.spec))assert.deepEqual(c[key],v);
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [name,'creature',f.cost,parseInt(f.powerText,10),f.race,f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-1017');
  assert.equal(CARD_IMAGES[id],row.image);
  assert.ok(registry.get(id).supported&&row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[id],4);
  assert.deepEqual(refs.filter(x=>x.id===id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  for(const source of [data,details,snapshot])
   assert.deepEqual(source.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
 }
 const [row]=m.printAliases;
 assert.equal(row.canonicalId,MAGAND);
 assert.equal(registry.get(row.id).id,MAGAND);
 assert.equal(m.regulationVerification.limits[row.id],4);
 assert.ok(row.verification.facesMatched);
 assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1017}),m.cards[0].spec);
 assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[MAGAND,row.image]]);
 assert.deepEqual(registry.resolveRows([MAGAND,REPRINT].map(id=>({id,count:1}))),[{id:MAGAND,count:2}]);
});

test('Magand takes a whole stacked shield, suppresses S-Trigger and cannot declare a newly recovered invasion',()=>{
 const s=field(),magand=put(s,0,'battle',MAGAND);
 give(s,0,'shields',[HAND,NATURE]);
 const [root,keep]=s.players[0].shields,extra=inst(GUERRILLA);
 root.shieldStack=[extra];
 const all=physical(s);
 attack(s,magand.uid);
 assert.deepEqual(choices(s),[root.uid,keep.uid]);
 pick(s,root.uid);
 assert.notEqual(s.decision?.type,'trigger');
 assert.notEqual(s.decision?.task?.op,'g23_Declare');
 finishAttack(s);
 assert.ok(has(s,0,'hand',root)&&has(s,0,'hand',extra)&&has(s,0,'shields',keep));
 assert.equal(e.power(magand,false,s),7000);
 assert.equal(s.metrics[0].breaks,2);
 assert.equal(s.players[0].brokenThisTurn||0,0);
 assert.deepEqual(physical(s),all);
 pass(s);
 assert.equal(e.power(magand,false,s),4000);
 assert.equal(e.effectiveCard(magand,s).breaker||1,1);
});

for(const mode of ['no shields','Shield Go'])
 test('Magand gains no attack bonus if no shield card actually reaches the hand '+mode,()=>{
  const s=field(),magand=put(s,0,'battle',MAGAND);
  give(s,0,'shields',mode==='Shield Go'?[GO]:[]);
  const root=s.players[0].shields[0];
  if(root)root.faceUp=true;
  attack(s,magand.uid);
  if(root){
   assert.deepEqual(choices(s),[root.uid]);
   pick(s,root.uid);
   assert.ok(has(s,0,'grave',root));
  }
  finishAttack(s);
  assert.equal(s.players[0].hand.length,0);
  assert.equal(e.power(magand,false,s),4000);
  assert.equal(s.metrics[0].breaks,1);
 });

for(const mode of ['below','equal','sealed ally','stacked shield'])
 test('Jayly continuously compares its own creature and shield-group counts '+mode,()=>{
  const s=field(1),jayly=put(s,0,'battle',JAYLY);
  give(s,0,'shields',[NATURE,NATURE]);
  if(mode!=='below'){
   const ally=put(s,0,'battle',NATURE);
   if(mode==='sealed ally'){
    ally.sealed=true;
    s.players[0].seals.push({...inst(WATER),faceDown:true,sealOf:ally.uid});
   }
  }
  if(mode==='stacked shield')s.players[0].shields[0].shieldStack=[inst(WATER)];
  const [keep,other]=s.players[0].shields,all=physical(s),attacker=put(s,1,'battle',DRAGON);
  attack(s,attacker.uid);
  act(s,'noBlock');
  const canSave=mode==='equal'||mode==='stacked shield';
  assert.equal(e.getLegalActions(s).some(a=>a.kind==='saveShield'&&a.uid===jayly.uid),canSave);
  if(canSave)act(s,'saveShield',a=>a.uid===jayly.uid&&a.shield===keep.uid);
  drain(s);
  assert.equal(has(s,0,'shields',keep),canSave);
  assert.equal(has(s,0,'grave',jayly),canSave);
  assert.ok(has(s,0,'hand',other));
  assert.deepEqual(physical(s),[...all,attacker.uid].sort());
 });

test('Jayly can attack a tapped creature and can block, with player attacks excluded',()=>{
 const s=field(),jayly=put(s,0,'battle',JAYLY),enemy=put(s,1,'battle',WATER,{tapped:true});
 s.phase='attack';
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===jayly.uid).map(a=>a.target),[enemy.uid]);
 s.active=1;
 enemy.tapped=false;
 attack(s,enemy.uid);
 act(s,'block',a=>a.uid===jayly.uid);
 drain(s);
 assert.ok(has(s,1,'grave',enemy));
});

test('Pearlda resolves the taken shield trigger before choosing a new face-down shield across save',()=>{
 let s=field();
 const pearlda=put(s,0,'battle',PEARLDA),target=put(s,1,'battle',FIRE),hand=put(s,0,'hand',WATER);
 give(s,0,'shields',[HAND,NATURE]);
 const [trigger,keep]=s.players[0].shields,all=physical(s);
 attack(s,pearlda.uid);
 pick(s,trigger.uid);
 assert.equal(s.decision.type,'trigger');
 s=JSON.parse(JSON.stringify(s));
 act(s,'useTrigger',a=>a.uid===trigger.uid);
 act(s,'effect',a=>a.targets.some(t=>t.uid===target.uid));
 assert.ok(has(s,1,'grave',target));
 assert.deepEqual(choices(s),[hand.uid,null]);
 pick(s,hand.uid);
 finishAttack(s);
 assert.ok(has(s,0,'grave',trigger)&&has(s,0,'shields',keep)&&has(s,0,'shields',hand));
 assert.ok(!s.players[0].shields.find(x=>x.uid===hand.uid).faceUp);
 assert.equal(s.metrics[0].breaks,2);
 assert.equal(s.players[0].brokenThisTurn||0,0);
 assert.deepEqual(physical(s),all);
});

for(const mode of ['decline recovery','no shields','re-shield recovered card','decline addition'])
 test('Pearlda can resolve either optional action independently '+mode,()=>{
  const s=field(),pearlda=put(s,0,'battle',PEARLDA),hand=put(s,0,'hand',WATER);
  give(s,0,'shields',mode==='no shields'?[]:[NATURE]);
  const original=s.players[0].shields[0];
  attack(s,pearlda.uid);
  if(original)pick(s,mode==='decline recovery'?null:original.uid);
  const next=mode==='re-shield recovered card'?original:hand;
  assert.ok(choices(s).includes(next.uid));
  pick(s,mode==='decline addition'?null:next.uid);
  finishAttack(s);
  assert.equal(has(s,0,'shields',next),mode!=='decline addition');
  if(mode==='decline addition')assert.ok(has(s,0,'hand',original));
 });

test('Dead Guerrilla normal evolution accepts a dark non-Command and forces only the next opponent turn',()=>{
 const s=field(),base=put(s,0,'battle',DARK);
 put(s,0,'battle',WATER);
 const one=put(s,1,'battle',WATER),two=put(s,1,'battle',FIRE);
 const evo=play(s,GUERRILLA);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[base.uid]);
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.equal(s.players[0].battle.find(x=>x.uid===evo.uid).under[0].uid,base.uid);
 pass(s);
 assert.equal(s.active,1);
 s.phase='attack';
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='endTurn'));
 for(const x of [one,two]){
  attack(s,x.uid);
  finishAttack(s);
 }
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='endTurn'));
 pass(s);
 pass(s);
 s.phase='attack';
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'));
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='endTurn'));
});

for(const [origin,id] of [['hand',COMMAND],['grave',COMMAND],['hand',DARK],['grave',DRAGON]])
 test('Dead Guerrilla invades from the printed zones only over a dark Command '+origin+' '+id,()=>{
  let s=field();
  const attacker=put(s,0,'battle',id),evo=put(s,0,origin,GUERRILLA);
  attack(s,attacker.uid);
  if(id===COMMAND){
   assert.equal(s.decision.task.op,'g23_Declare');
   pick(s,true);
   s=JSON.parse(JSON.stringify(s));
   assert.equal(s.decision.task.op,'g23_Invade');
   pick(s,true);
  }else assert.notEqual(s.decision?.task?.op,'g23_Declare');
  finishAttack(s);
  assert.equal(has(s,0,'battle',evo),id===COMMAND);
  assert.equal(has(s,0,origin,evo),id!==COMMAND);
  assert.equal(s.metrics[0].breaks,id===COMMAND||id===DRAGON?2:1);
 });

test('Dead Guerrilla keeps Slayer when it invades and loses a battle',()=>{
 const s=field(),attacker=put(s,0,'battle',COMMAND),evo=put(s,0,'grave',GUERRILLA);
 const giant=put(s,1,'battle',GIANT,{tapped:true}),all=physical(s);
 attack(s,attacker.uid,giant.uid);
 pick(s,true);
 pick(s,true);
 finishAttack(s);
 assert.ok(has(s,0,'grave',evo)&&has(s,0,'grave',attacker)&&has(s,1,'grave',giant));
 assert.deepEqual(physical(s),all);
});

test('Magand still permits G-Strike on its own turn when S-Trigger is suppressed (QA 39638)',()=>{
 const s=field(),magand=put(s,0,'battle',MAGAND),enemy=put(s,1,'battle',FIRE);
 give(s,0,'shields',['dmrp17-025']);
 const [strike]=s.players[0].shields;
 attack(s,magand.uid);
 pick(s,strike.uid);
 assert.equal(s.decision.task.op,'gsDeclare');
 pick(s,true);
 assert.equal(s.decision.task.op,'gsTarget');
 pick(s,enemy.uid);
 finishAttack(s);
 assert.equal(e.power(magand,false,s),7000);
 assert.equal(s.metrics[0].breaks,2);
});

test('Magand still gains its bonus if a recovered shield pays for S-Back',()=>{
 const s=field(),magand=put(s,0,'battle',MAGAND),back=put(s,0,'hand','dm17-035');
 give(s,0,'shields',[NATURE]);
 const [paid]=s.players[0].shields;
 attack(s,magand.uid);
 pick(s,paid.uid);
 assert.equal(s.decision.task.op,'g13_SB');
 pick(s,back.uid);
 assert.equal(s.decision.source,back.cardId);
 pick(s,null);
 drain(s);
 assert.ok(has(s,0,'grave',paid)&&has(s,0,'battle',back));
 assert.equal(e.power(magand,false,s),7000);
 assert.equal(s.metrics[0].breaks,2);
});
