import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const DYNA='dmrp20-s05',LATO='dmrp20-037',GUG='dmrp20-033',MANI='dmrp20-s02';
const FIRE='dm01-100',WATER='dm01-083',DARK='dm01-090',NATURE='dm01-108';
const KIRIN='dmrp20-023',BLOCKER='dmrp20-025',HAND='dm01-027';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(24).fill(NATURE));
 return s;
}
function add(s,p,zone,id,fields={}){
 const x=Object.assign(inst(id),fields);s.players[p][zone].push(x);return x;
}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const options=s=>s.decision?.choices.map(x=>x.value?.uid??x.value)??[];
const pick=(s,v)=>act(s,'extended',a=>options(s)[a.choice]===v);
const save=s=>JSON.parse(JSON.stringify(s));

test('four verified prints match the original battle definitions',()=>{
 const m=read('tools/support-phase-1269.json'),refs=read('tools/image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[DYNA,LATO,GUG,MANI]);
 assert.equal(m.printAliases.length,0);
 for(const row of [...m.cards,...m.printAliases]){
  const {id,canonicalId=id,name,faces:[f],image}=row;
  const def={id,status:'complete',faces:row.faces},c=e.card(canonicalId);
  if(id===canonicalId)assert.deepEqual(row.faces,details.cards.find(x=>x.id===id).faces);
  assert.deepEqual(standardCardSpec(def,{phase:1269}),row.spec);
  assert.throws(()=>standardCardSpec(def,{phase:1268}));
  def.faces=structuredClone(def.faces);def.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(def,{phase:1269}));
  assert.deepEqual(cat.resolveRows([{id,count:1}]),[{id:canonicalId,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[canonicalId]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,m.regulationVerification.limits[id]]);
  for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
  if(id===canonicalId)assert.equal(CARD_IMAGES[id],image);
  assert.ok(refs.some(x=>x.id===id&&x.canonicalId===canonicalId&&x.image===image));
 }
});

function evolve(s,id,base,{reduced=false}={}) {
 const x=add(s,s.active,'hand',id);
 const choice=e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===x.uid&&
  (reduced?a.role==='paidAlt568'&&a.baseUid===base.uid:!a.alternative));
 assert.ok(choice, id+' evolution is available');
 if(reduced)assert.equal(choice.cost,e.card(id).cost-2);
 e.step(s,choice);
 if(!reduced)act(s,'evolve',a=>a.baseUid===base.uid);
 drain(s);
 return x;
}
function endTurn(s){if(s.phase==='main')act(s,'toAttack');act(s,'endTurn');drain(s);}
function resolveAttack(s){if(s.decision?.type==='block')act(s,'noBlock');drain(s);}

for(const [id,color,to] of [[GUG,WATER,'hand'],[MANI,WATER,'hand'],[LATO,DARK,'grave']]){
 test(id+' schedules an end-of-turn move only for the optional reduced summon',()=>{
  for(const reduced of [false,true]){
   let s=field();const base=add(s,0,'battle',color),x=evolve(s,id,base,{reduced});
   assert.ok(has(s,0,'battle',x));
   assert.equal(s.players[0].mana.filter(y=>y.tapped).length,e.card(id).cost-(reduced?2:0));
   s=save(s);endTurn(s);
   assert.equal(has(s,0,to,x),reduced);
   assert.equal(has(s,0,'battle',base),reduced);
  }
 });
 test(id+' keeps the reduced-summon effect after early Star Evolution reconstruction (QA40652)',()=>{
  let s=field();const base=add(s,0,'battle',color),x=evolve(s,id,base,{reduced:true});
  cast(s,'dmrp09-053');pick(s,x.uid);drain(s);
  assert.ok(has(s,0,'grave',x)&&has(s,0,'battle',base));
  s=save(s);endTurn(s);
  assert.ok(has(s,0,to,base));
 });
}

test('Latelier can recover any one card from its own graveyard when attacking',()=>{
 const s=field();const x=evolve(s,LATO,add(s,0,'battle',DARK)),spell=add(s,0,'grave',HAND);
 attack(s,x.uid);pick(s,spell.uid);resolveAttack(s);
 assert.ok(has(s,0,'hand',spell));
});

test('the delay follows the creature through another evolution',()=>{
 const s=field();const originalBase=add(s,0,'battle',DARK);
 const first=evolve(s,LATO,originalBase,{reduced:true}),second=evolve(s,LATO,first);
 endTurn(s);
 assert.ok(has(s,0,'grave',second));
 assert.ok(has(s,0,'battle',first));
});

test('a reduction prohibition removes only the reduced summon option',()=>{
 const s=field(),x=add(s,0,'hand',GUG);add(s,0,'battle',WATER);
 add(s,1,'battle','dmrp22-027');
 const actions=e.getLegalActions(s).filter(a=>a.kind==='play'&&a.uid===x.uid);
 assert.ok(actions.some(a=>!a.alternative&&a.cost===5));
 assert.ok(!actions.some(a=>a.role==='paidAlt568'));
});

test('Gugguppy cannot be blocked and breaks two shields',()=>{
 const s=field();const x=evolve(s,GUG,add(s,0,'battle',WATER));
 add(s,1,'battle',BLOCKER);
 attack(s,x.uid);assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'));resolveAttack(s);
 assert.equal(s.players[1].shields.length,3);
});

test('Manifest searches all cards privately, takes up to two, and shuffles on completion',()=>{
 let s=field();const x=evolve(s,MANI,add(s,0,'battle',WATER));
 const deck=s.players[0].deck,first=deck.at(-1),second=deck[5];
 const remaining=deck.filter(y=>y!==first&&y!==second).map(y=>y.uid);
 attack(s,x.uid);assert.ok(options(s).includes(first.uid));pick(s,first.uid);
 s=save(s);pick(s,second.uid);resolveAttack(s);
 assert.ok(has(s,0,'hand',first)&&has(s,0,'hand',second));
 const after=s.players[0].deck.map(y=>y.uid);
 assert.notDeepEqual(after,remaining);
 assert.deepEqual([...after].sort(),[...remaining].sort());
 assert.ok(!s.log.some(l=>l.type==='reveal'&&l.cardId===first.cardId));
});

test('Dyna Bolt can accept the second-attack draw with an empty hand',()=>{
 const s=field();const x=evolve(s,DYNA,add(s,0,'battle',FIRE)),ally=add(s,0,'battle',FIRE);
 attack(s,ally.uid);resolveAttack(s);
 attack(s,x.uid);assert.equal(s.players[0].hand.length,0);pick(s,true);resolveAttack(s);
 assert.equal(s.players[0].hand.length,3);
});

for(const count of [1,2,3,4,5])test('Dyna Bolt resolves the cumulative abilities of team attack '+count,()=>{
 let s=field();const x=evolve(s,DYNA,add(s,0,'battle',FIRE));
 // The earlier attackers each battle a larger tapped creature so the shield count stays fixed.
 const priorVictim=add(s,1,'battle',KIRIN,{tapped:true});
 for(let n=1;n<count;n++){
  const ally=add(s,0,'battle',FIRE);
  attack(s,ally.uid,priorVictim.uid);resolveAttack(s);
  assert.ok(has(s,0,'grave',ally));
 }
 const weak=add(s,1,'battle',FIRE),blocker=add(s,1,'battle',BLOCKER),before=add(s,0,'hand',NATURE);
 attack(s,x.uid);
 if(count>=3){
  assert.equal(s.decision.type,'effectOrder');
  assert.equal(s.pendingEffects.filter(y=>y.source===DYNA).length,count>=4?3:2);
  s=save(s);
  act(s,'orderEffect',a=>s.pendingEffects.some(y=>y.effectId===a.effectId&&y.task.defs[0].op==='Sweep'));
  assert.ok(has(s,1,'grave',weak)&&has(s,1,'battle',blocker));
  if(count>=4)act(s,'orderEffect',a=>s.pendingEffects.some(y=>y.effectId===a.effectId&&y.task.defs[0].op==='AttackLock1269'));
 }
 if(count>=2){assert.equal(s.decision.task.op,'g34_Offer');pick(s,true);}
 assert.equal(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===blocker.uid),count<4);
 resolveAttack(s);
 assert.equal(has(s,0,'grave',before),count>=2);
 assert.equal(s.players[0].hand.length,count>=2?3:1);
 assert.equal(s.players[0].battle.find(y=>y.uid===x.uid).tapped,count<4);
});
