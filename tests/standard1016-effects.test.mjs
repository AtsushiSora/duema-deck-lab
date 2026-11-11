import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const JURAN='dmr20-004',KILBILLY='dmr18-005',SONIC='dmr19-s07';
const NATURE='dm01-108',WATER='dm01-083',HAND='dm01-027',UNTAPPER='dmex09-005';
const APLE='dmrp22-042',MIXEL='dmrp05-011',ASH='dm24rp3-S08';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
const choices=s=>s.decision?.choices?.map(c=>c.value)??[];
const pick=(s,v)=>act(s,'extended',a=>s.decision.choices[a.choice].value===v);
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const shuffled=(s,cardId)=>s.log.filter(x=>x.type==='shuffleGrave'&&x.cardId===cardId).length;

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
function pass(s){
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
}
function finishAttack(s){
 if(s.decision?.type==='block')act(s,'noBlock');
 drain(s);
}

test('Phase 1016 pins all three complete single-print official definitions',()=>{
 const m=read('tools/support-phase-1016.json'),refs=read('tools/image-reference-prints.json').prints;
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[JURAN,KILBILLY,SONIC]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const {id,name,faces}=row,[f]=faces,d=details.cards.find(x=>x.id===id),c=e.card(id);
  assert.deepEqual(faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:1016}),row.spec);
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'未知の能力。'}]},{phase:1016}));
  for(const [key,v] of Object.entries(row.spec))assert.deepEqual(c[key],v);
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [name,'creature',f.cost,parseInt(f.powerText,10),f.race,f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-1016');
  assert.equal(CARD_IMAGES[id],row.image);
  assert.ok(registry.get(id).supported&&row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[id],4);
  assert.deepEqual(refs.filter(x=>x.id===id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  for(const source of [data,details,snapshot])
   assert.deepEqual(source.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
 }
});

for(const n of [12,13])
 test('Jurandes checks its own grave at the start step '+n,()=>{
  const s=field(1),x=put(s,0,'battle',JURAN,{tapped:true});
  give(s,0,'grave',Array(n).fill(WATER));
  give(s,1,'grave',Array(14).fill(WATER));
  const grave=s.players[0].grave.slice(),all=physical(s);
  pass(s);
  assert.equal(s.active,0);
  assert.equal(x.tapped,n<13);
  assert.equal(shuffled(s,JURAN),Number(n>=13));
  assert.equal(s.players[1].grave.length,14);
  assert.equal(s.players[0].grave.length,n<13?n:0);
  assert.ok(grave.every(y=>has(s,0,n<13?'grave':'deck',y)||has(s,0,'hand',y)));
  assert.deepEqual(physical(s),all);
 });

for(const n of [12,13])
 test('Jurandes checks the threshold for a card effect as well as natural untaps (QA 37803) '+n,()=>{
  const s=field();
  give(s,0,'grave',Array(n).fill(WATER));
  const x=play(s,JURAN),ally=put(s,0,'battle',NATURE,{tapped:true});
  assert.equal(x.tapped,true);
  assert.equal(shuffled(s,JURAN),0);
  play(s,UNTAPPER);
  drain(s);
  assert.equal(x.tapped,n<13);
  assert.equal(ally.tapped,false);
  assert.equal(shuffled(s,JURAN),Number(n>=13));
  assert.equal(s.players[0].grave.length,n<13?n:0);
 });

test('Jurandes still shuffles at untap while an effect prevents cards from leaving the grave',()=>{
 const s=field();
 give(s,0,'grave',Array(13).fill(WATER));
 put(s,1,'battle',APLE);
 const x=play(s,JURAN);
 play(s,UNTAPPER);
 drain(s);
 assert.equal(x.tapped,false);
 assert.equal(s.players[0].grave.length,13);
 assert.equal(shuffled(s,JURAN),1);
});

test('Jurandes can attack after its grave returns and uses World Breaker',()=>{
 const s=field(1),x=put(s,0,'battle',JURAN,{tapped:true});
 give(s,0,'grave',Array(13).fill(WATER));
 pass(s);
 assert.equal(s.players[0].grave.length,0);
 attack(s,x.uid);
 finishAttack(s);
 assert.equal(s.players[1].shields.length,0);
 assert.equal(s.metrics[0].breaks,5);
 assert.equal(s.winner,null);
});

for(const mode of ['below threshold','decline','accept','grave locked'])
 test('Kilbilly checks eight cards and only applies the power loss after accepting '+mode,()=>{
  const s=field(),x=put(s,0,'battle',KILBILLY),ally=power(s,0,3000);
  const equal=power(s,1,8000),survivor=power(s,1,9000),hidden=power(s,1,4000);
  hidden.g34Grants=[{turn:s.turn,untargetable:true}];
  if(mode==='grave locked')put(s,1,'battle',APLE);
  give(s,0,'grave',Array(mode==='below threshold'?7:8).fill(WATER));
  const grave=s.players[0].grave.slice(),all=physical(s);
  attack(s,x.uid);
  const accept=mode==='accept'||mode==='grave locked';
  if(mode==='below threshold')assert.notEqual(s.decision?.task?.op,'g34_Offer');
  else {
   assert.deepEqual(choices(s),[true,null]);
   pick(s,accept?true:null);
  }
  finishAttack(s);
  assert.equal(shuffled(s,KILBILLY),Number(accept));
  assert.equal(s.players[0].grave.length,mode==='accept'?0:grave.length);
  assert.ok(grave.every(y=>has(s,0,mode==='accept'?'deck':'grave',y)));
  assert.equal(has(s,1,'grave',equal),accept);
  assert.equal(has(s,1,'grave',hidden),accept);
  assert.equal(e.power(ally,false,s),3000);
  assert.equal(e.power(survivor,false,s),accept?1000:9000);
  assert.equal(s.players[1].shields.length,3);
  assert.deepEqual(physical(s),all);
  pass(s);
  assert.ok(!(survivor.powerModifiers||[]).some(x=>x.amount===-8000));
 });

for(const n of [0,1,2])
 test('Sonic Boom leaves all shields when there are at most two on entry '+n,()=>{
  const s=field();
  give(s,1,'shields',Array(n).fill(NATURE));
  const original=s.players[1].shields.map(x=>x.uid),x=play(s,SONIC);
  assert.equal(s.decision,null);
  assert.deepEqual(s.players[1].shields.map(y=>y.uid),original);
  assert.equal(s.metrics[0].breaks,0);
  assert.ok(has(s,0,'battle',x));
 });

test('Sonic Boom keeps two distinct shields across save and breaks all other groups before shield triggers',()=>{
 let s=field();
 give(s,1,'shields',[NATURE,HAND,NATURE,NATURE,WATER]);
 const [keep,trigger,first,stack,otherKeep]=s.players[1].shields;
 const stacked=inst(WATER);
 stack.shieldStack=[stacked];
 const x=play(s,SONIC),all=physical(s);
 assert.equal(s.decision.player,0);
 assert.deepEqual(choices(s),[keep.uid,trigger.uid,first.uid,stack.uid,otherKeep.uid]);
 assert.ok(s.decision.choices.every(c=>c.cardId===undefined));
 pick(s,keep.uid);
 assert.deepEqual(choices(s),[trigger.uid,first.uid,stack.uid,otherKeep.uid]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,otherKeep.uid);
 assert.equal(s.decision.type,'trigger');
 assert.deepEqual(s.players[1].shields.map(y=>y.uid),[keep.uid,otherKeep.uid]);
 assert.equal(s.metrics[0].breaks,3);
 for(const y of [trigger,first,stack,stacked])assert.ok(has(s,1,'hand',y));
 act(s,'useTrigger',a=>a.uid===trigger.uid);
 act(s,'effect',a=>a.targets.some(t=>t.uid===x.uid));
 drain(s);
 assert.ok(has(s,0,'grave',x));
 assert.deepEqual(physical(s),all);
});

test('Sonic Boom can attack on entry and separately breaks two shields in combat',()=>{
 const s=field(),x=play(s,SONIC),[a,b]=s.players[1].shields;
 pick(s,a.uid);
 pick(s,b.uid);
 assert.equal(s.players[1].shields.length,2);
 attack(s,x.uid);
 finishAttack(s);
 assert.equal(s.players[1].shields.length,0);
 assert.equal(s.metrics[0].breaks,5);
 assert.equal(s.winner,null);
});

test('Sonic Boom breaks for the creature-break watcher once per simultaneous break (QA 45462)',()=>{
 const s=field();
 put(s,0,'battle',ASH);
 const x=play(s,SONIC),[a,b]=s.players[1].shields;
 pick(s,a.uid);
 pick(s,b.uid);
 assert.equal(s.decision.source,ASH);
 pick(s,true);
 drain(s);
 assert.equal(s.players[0].hand.length,1);
 assert.equal(s.metrics[0].breaks,3);
 assert.ok(has(s,0,'battle',x));
});

test('Sonic Boom resolves its pending break after the turn player removes it (QA 35971)',()=>{
 const s=field(1),x=put(s,0,'hand',SONIC);
 give(s,0,'mana',[]);
 put(s,1,'battle',MIXEL);
 s.extTasks=[{op:'putCreature',p:0,source:SONIC,origin:'hand',uid:x.uid}];
 act(s,'toAttack');
 assert.equal(s.players[0].deck.at(-1).uid,x.uid);
 assert.equal(s.decision.player,0);
 assert.equal(s.decision.source,SONIC);
 drain(s);
 assert.equal(s.players[1].shields.length,2);
 assert.equal(s.metrics[0].breaks,3);
});
