import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const LUNAND='dmrp20-075',CORTEO='dmrp20-064',KNIGHTS='dmrp20-063',PLAN='dmrp20-090';
const NATURE='dm01-108',HAND='dm01-027',WATER='dm01-083',DIVER='dm23rp1-058',SEED='dmsd20-016';
const LOW='dm01-048',GAP='dm01-012',HIGH='dm01-s04',SMALL='dm01-087',BLOCK='dm01-001',EVO='dm10-017';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));

function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(12).fill(NATURE));
 return s;
}
function add(s,p,z,id,fields={}){
 const x=Object.assign(inst(id),fields);
 s.players[p][z].push(x);return x;
}
function top(s,ids){
 const rows=ids.map(inst);s.players[0].deck.unshift(...rows);return rows;
}
const inZone=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const options=s=>s.decision?.choices.map(x=>x.value?.uid??x.value)??[];
const pick=(s,v)=>act(s,'extended',a=>options(s)[a.choice]===v);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const reveals=(s,p)=>s.log.filter(x=>x.type==='reveal'&&x.player===p).map(x=>x.cardId);
function breakShield(s,cardId){
 give(s,0,'shields',[cardId,NATURE]);give(s,0,'mana',[]);
 const attacker=add(s,1,'battle',NATURE),shield=s.players[0].shields[0];
 attack(s,attacker.uid);act(s,'noBlock');
 return {attacker,shield};
}

test('four official spells resolve under their existing catalogue IDs with matched text, print, metadata and limits',()=>{
 const m=read('tools/support-phase-1264.json'),refs=read('tools/image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[LUNAND,CORTEO,KNIGHTS,PLAN]);
 for(const row of m.cards){
  const {id,name,faces:[f],image}=row,c=e.card(id),d=details.cards.find(x=>x.id===id);
  assert.deepEqual(d.faces,row.faces);
  assert.deepEqual(standardCardSpec(d,{phase:1264}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:1263}));
  const extra=structuredClone(d);extra.faces[0].abilityText+='\n未知の追加能力。';
  assert.throws(()=>standardCardSpec(extra,{phase:1264}));
  assert.deepEqual(cat.resolveRows([{id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
  assert.deepEqual([c.type,c.cost,c.civilizations,c.manaValue,c.limit],['spell',f.cost,f.civilizations,1,m.regulationVerification.limits[id]]);
  for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
  assert.equal(CARD_IMAGES[id],image);
  assert.equal(c.text,f.abilityText);
  assert.ok(refs.some(x=>x.id===id&&x.canonicalId===id&&x.image===image));
 }
});

test('Lunand first mills, counts all own grave cards except itself, and power loss ends this turn',()=>{
 const s=field(),[milled]=top(s,[NATURE]),own=add(s,0,'battle',SMALL);
 const high=add(s,1,'battle',LOW),other=add(s,1,'battle',SMALL);
 const immune=add(s,1,'battle',DIVER,{justDiverActive:true});
 give(s,0,'grave',[HAND,WATER]);give(s,1,'grave',[HAND,NATURE]);
 const spell=add(s,0,'hand',LUNAND),before=physical(s);
 act(s,'play',a=>a.uid===spell.uid);
 assert.ok(inZone(s,0,'grave',milled)&&!inZone(s,0,'grave',spell));
 assert.deepEqual(new Set(options(s)),new Set([high.uid,other.uid]));
 pick(s,high.uid);drain(s);
 assert.equal(e.power(high,false,s),2000);
 assert.ok(inZone(s,0,'battle',own)&&inZone(s,1,'battle',other)&&inZone(s,1,'battle',immune));
 assert.ok(inZone(s,0,'grave',spell));
 act(s,'toAttack');act(s,'endTurn');drain(s);
 assert.equal(e.power(high,false,s),5000);
 assert.deepEqual(physical(s),before);
});

test('Lunand shield trigger needs no mana and destroys an opposing creature at power zero',()=>{
 const s=field(1),enemy=add(s,1,'battle',SMALL);
 give(s,0,'grave',[HAND,WATER]);
 const {shield}=breakShield(s,LUNAND),before=physical(s);
 act(s,'useTrigger',a=>a.cardId===LUNAND);
 pick(s,enemy.uid);drain(s);
 assert.ok(inZone(s,1,'grave',enemy)&&inZone(s,0,'grave',shield));
 assert.equal(s.players[0].mana.length,0);
 assert.deepEqual(physical(s),before);
});

test('Lunand still mills if there is no creature; an empty library ends the game before the reduction',()=>{
 const a=field(),topA=a.players[0].deck[0];cast(a,LUNAND);drain(a);
 assert.ok(inZone(a,0,'grave',topA));assert.equal(a.winner,null);
 const b=field(),opponent=add(b,1,'battle',SMALL);
 give(b,0,'deck',[WATER]);cast(b,LUNAND);drain(b);
 assert.equal(b.winner,1);assert.equal(e.power(opponent,false,b),3000);
});

test('Corteo taps a chosen subset of allies, then counts newly and previously tapped creatures',()=>{
 const s=field(),ally=add(s,0,'battle',NATURE),old=add(s,0,'battle',WATER,{tapped:true});
 const spare=add(s,0,'battle',WATER),seed=add(s,0,'battle',SEED,{tapped:true});
 const sealed=add(s,0,'battle',WATER,{tapped:true,sealed:true});
 (s.players[0].seals??=[]).push({...inst(NATURE),faceDown:true,sealOf:sealed.uid});
 const enemy=add(s,1,'battle',NATURE),other=add(s,1,'battle',WATER),last=add(s,1,'battle',WATER,{tapped:true});
 const immune=add(s,1,'battle',DIVER,{justDiverActive:true});
 cast(s,CORTEO);assert.deepEqual(options(s),[ally.uid,spare.uid,null]);
 pick(s,ally.uid);assert.equal(ally.tapped,false);
 pick(s,null);assert.equal(ally.tapped,true);assert.equal(spare.tapped,false);
 assert.equal(s.decision.task.n,2);
 assert.deepEqual(new Set(options(s)),new Set([enemy.uid,other.uid,last.uid]));
 pick(s,last.uid);assert.ok(!options(s).includes(last.uid));assert.equal(enemy.tapped,false);
 pick(s,enemy.uid);drain(s);
 assert.ok(enemy.tapped&&old.tapped&&seed.tapped&&sealed.tapped&&last.tapped);
 assert.ok(!immune.tapped&&!other.tapped);
});

test('Corteo shield trigger can skip all allies and still tap up to the legal opponents',()=>{
 const s=field(1),ally=add(s,0,'battle',NATURE),old=add(s,0,'battle',WATER,{tapped:true});
 add(s,0,'battle',WATER,{tapped:true});add(s,0,'battle',WATER,{tapped:true});
 const later=add(s,1,'battle',WATER),{attacker,shield}=breakShield(s,CORTEO);
 const before=physical(s);
 act(s,'useTrigger',a=>a.cardId===CORTEO);
 assert.deepEqual(options(s),[ally.uid,null]);pick(s,null);
 assert.deepEqual(new Set(options(s)),new Set([attacker.uid,later.uid]));
 pick(s,attacker.uid);pick(s,later.uid);drain(s);
 assert.ok(old.tapped&&later.tapped&&!ally.tapped&&inZone(s,0,'grave',shield));
 assert.deepEqual(physical(s),before);
});

test('Knights privately sees four cards and reveals only selected blockers, ordering the others at the bottom',()=>{
 let s=field();
 const [a,b,spell,nonblock]=top(s,[BLOCK,EVO,HAND,NATURE]),before=physical(s);
 assert.ok(e.card(a).blocker&&e.card(b).blocker&&e.card(b).evolution);
 cast(s,KNIGHTS);
 assert.deepEqual(options(s),[a.uid,b.uid,null]);
 assert.deepEqual(s.decision.task.g585Peek.map(x=>x.id),[a.cardId,b.cardId,spell.cardId,nonblock.cardId]);
 assert.ok(!JSON.stringify(e.observation(s,1)).includes(b.uid));
 pick(s,a.uid);assert.ok(inZone(s,0,'deck',a));
 s=JSON.parse(JSON.stringify(s));pick(s,null);
 assert.equal(s.decision.task.op,'g34_Order');pick(s,nonblock.uid);pick(s,b.uid);drain(s);
 assert.ok(inZone(s,0,'hand',a)&&!inZone(s,0,'hand',b));
 assert.deepEqual(s.players[0].deck.slice(-3).map(x=>x.uid),[nonblock.uid,b.uid,spell.uid]);
 assert.deepEqual(reveals(s,0),[a.cardId]);
 assert.deepEqual(physical(s).filter(x=>before.includes(x)),before);
});

test('Knights can take every blocker or skip all blockers',()=>{
 for(const choose of [true,false]){
  const s=field(),[a,b]=top(s,[BLOCK,EVO,HAND,NATURE]);
  cast(s,KNIGHTS);
  if(choose){pick(s,a.uid);pick(s,b.uid);}else pick(s,null);
  drain(s);
  assert.equal(s.players[0].hand.length,choose?2:0);
  assert.deepEqual(reveals(s,0),choose?[a.cardId,b.cardId]:[]);
  assert.equal(s.players[0].deck.length,choose?14:16);
 }
});

test('Blueprint reveals four, takes exactly one at each inclusive threshold and orders the rest',()=>{
 let s=field();const [hi,lo,gap,other]=top(s,[HIGH,LOW,GAP,NATURE]);
 const spell=add(s,0,'hand',PLAN),before=physical(s);
 act(s,'play',a=>a.uid===spell.uid);
 assert.deepEqual(reveals(s,0),[PLAN]);
 const publicEvent=s.log.find(x=>x.type==='reveal'&&x.cardId===PLAN);
 assert.ok([hi,lo,gap,other].every(x=>publicEvent.text.includes(e.card(x).name)));
 assert.deepEqual(options(s),[hi.uid]);pick(s,hi.uid);
 assert.ok(inZone(s,0,'deck',hi)&&!inZone(s,0,'hand',hi));
 assert.deepEqual(options(s),[lo.uid,other.uid]);
 s=JSON.parse(JSON.stringify(s));pick(s,lo.uid);
 assert.ok(inZone(s,0,'hand',hi)&&inZone(s,0,'hand',lo));
 assert.equal(s.decision.task.op,'g34_Order');
 pick(s,other.uid);drain(s);
 assert.deepEqual(s.players[0].deck.slice(-2).map(x=>x.uid),[other.uid,gap.uid]);
 assert.deepEqual(physical(s),before);
});

test('Blueprint takes the available category independently of the missing one',()=>{
 for(const id of [HIGH,LOW]){
  const s=field(),[target]=top(s,[id,HAND,GAP,HAND]);
  cast(s,PLAN);assert.deepEqual(options(s),[target.uid]);pick(s,target.uid);drain(s);
  assert.deepEqual(s.players[0].hand.map(x=>x.uid),[target.uid]);
  assert.equal(s.winner,null);
 }
});

for(const id of [KNIGHTS,PLAN])test(id+' G Strike stays in hand and stops the targeted attacker without resolving the spell',()=>{
 const s=field(1),later=add(s,1,'battle',NATURE),before=s.players[0].deck.map(x=>x.uid);
 const {shield}=breakShield(s,id);
 assert.equal(s.decision.task.op,'gsDeclare');pick(s,true);
 assert.equal(s.decision.task.op,'gsTarget');pick(s,later.uid);drain(s);
 assert.ok(e.attackLocked(s,1,later)&&!later.tapped&&inZone(s,0,'hand',shield));
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),before);
});
