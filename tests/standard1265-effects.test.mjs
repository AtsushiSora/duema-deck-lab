import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const TRAP='dmrp20-021',JET='dmrp20-041',TAG='dmrp20-067',LAMBDA='dmrp20-022';
const FIRE='dm01-097',NATURE='dm01-108',HAND='dm01-027',SPIRAL='dm01-086',BLOCK='dm01-001';
const BIG='dm01-s04',GAP='dm01-012',GS='dmsd17-014',BOLSHACK='dm01-008',DIVER='dm23rp1-058';
const RYUSEI='dmr02-s03',SWEEP='dmex15-b017';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));

function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(24).fill(NATURE));
 return s;
}
function add(s,p,zone,id,fields={}){
 const x=Object.assign(inst(id),fields);s.players[p][zone].push(x);return x;
}
function top(s,ids){
 const rows=ids.map(inst);s.players[0].deck.unshift(...rows);return rows;
}
const inZone=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const options=s=>s.decision?.choices.map(x=>x.value?.uid??x.value)??[];
const pick=(s,v)=>act(s,'extended',a=>options(s)[a.choice]===v);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const target=(s,x)=>act(s,'effect',a=>a.targets?.some(t=>t.uid===x.uid));
const end=s=>{act(s,'toAttack');act(s,'endTurn');};

test('four complete official definitions and two reprints resolve to one identity each',()=>{
 const m=read('tools/support-phase-1265.json'),refs=read('tools/image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[TRAP,JET,TAG,LAMBDA]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[['promoy20-066',JET],['dm23bd7-046',LAMBDA]]);
 for(const row of [...m.cards,...m.printAliases]){
  const {id,canonicalId=id,name,faces:[f],image}=row,c=e.card(canonicalId),d=details.cards.find(x=>x.id===canonicalId);
  if(id===canonicalId)assert.deepEqual(d.faces,row.faces);
  const printed={id,status:'complete',faces:row.faces};
  assert.deepEqual(standardCardSpec(printed,{phase:1265}),row.spec);
  assert.throws(()=>standardCardSpec(printed,{phase:1264}));
  const extra=structuredClone(printed);extra.faces[0].abilityText+='\n未知の追加能力。';
  assert.throws(()=>standardCardSpec(extra,{phase:1265}));
  assert.deepEqual(cat.resolveRows([{id,count:1}]),[{id:canonicalId,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[canonicalId]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,m.regulationVerification.limits[id]]);
  for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
  if(id===canonicalId)assert.equal(CARD_IMAGES[id],image);
  assert.ok(refs.some(x=>x.id===id&&x.canonicalId===canonicalId&&x.image===image));
 }
});

test('Trap looks at five privately and only makes its mandatory mana choice after ordering the bottom',()=>{
 let s=field();
 const [hi,low,spell,one,two]=top(s,[BIG,GAP,HAND,NATURE,FIRE]);
 const enemy=add(s,1,'battle',NATURE),diver=add(s,1,'battle',DIVER,{justDiverActive:true});
 const source=add(s,0,'hand',TRAP),before=physical(s);
 act(s,'play',a=>a.uid===source.uid);
 assert.deepEqual(options(s),[hi.uid,low.uid,one.uid,two.uid,null]);
 assert.deepEqual(s.decision.task.g585Peek.map(x=>x.id),[hi,low,spell,one,two].map(x=>x.cardId));
 assert.ok(!JSON.stringify(e.observation(s,1)).includes(hi.uid));
 pick(s,hi.uid);assert.ok(inZone(s,0,'hand',hi)&&inZone(s,1,'battle',enemy));
 assert.equal(s.decision.task.op,'g34_Order');
 s=JSON.parse(JSON.stringify(s));
 for(const x of [two,low,spell])pick(s,x.uid);
 assert.deepEqual(s.players[0].deck.slice(-4).map(x=>x.uid),[two,low,spell,one].map(x=>x.uid));
 assert.deepEqual(options(s),[enemy.uid]);pick(s,enemy.uid);
 assert.ok(inZone(s,1,'mana',enemy)&&inZone(s,1,'battle',diver));
 assert.deepEqual(s.log.filter(x=>x.type==='reveal').map(x=>x.cardId),[BIG]);
 assert.deepEqual(physical(s),before);
});

for(const selected of [true,false])test('Trap below 6000 or a skipped reveal leaves the enemy in battle: '+selected,()=>{
 const s=field(),[low]=top(s,[GAP,HAND,HAND,HAND,BIG]),enemy=add(s,1,'battle',FIRE);
 cast(s,TRAP);pick(s,selected?low.uid:null);
 while(s.decision?.task?.op==='g34_Order')pick(s,options(s)[0]);
 assert.equal(s.decision,null);
 assert.equal(inZone(s,0,'hand',low),selected);
 assert.ok(inZone(s,1,'battle',enemy));
});

test('Trap can be cast from a broken shield without mana, then moves the current attacker to mana',()=>{
 const s=field(1),[hi]=top(s,[BIG]),enemy=add(s,1,'battle',NATURE);
 give(s,0,'shields',[TRAP]);give(s,0,'mana',[]);
 const [shield]=s.players[0].shields;
 attack(s,enemy.uid);act(s,'noBlock');act(s,'useTrigger',a=>a.uid===shield.uid);
 pick(s,hi.uid);while(s.decision?.task?.op==='g34_Order')pick(s,options(s)[0]);
 pick(s,enemy.uid);drain(s);
 assert.ok(inZone(s,0,'grave',shield)&&inZone(s,1,'mana',enemy));
 assert.equal(s.players[0].mana.length,0);
});

test('Jet evolves on a Fire or RexStars creature and can attack immediately to break two',()=>{
 const s=field(),fire=add(s,0,'battle',FIRE),rex=add(s,0,'battle',TAG),wrong=add(s,0,'battle',NATURE);
 assert.ok(!e.card(rex).civilizations.includes('火'));
 cast(s,JET);
 const bases=e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid);
 assert.deepEqual(new Set(bases),new Set([fire.uid,rex.uid]));assert.ok(!bases.includes(wrong.uid));
 act(s,'evolve',a=>a.baseUid===fire.uid);
 const jet=s.players[0].battle.find(x=>x.cardId===JET);
 assert.equal(jet.under[0].uid,fire.uid);
 attack(s,jet.uid);act(s,'noBlock');drain(s);
 assert.equal(s.players[1].shields.length,3);
});

for(const side of [0,1])test('Jet untaps for actual destruction on side '+side+' but not for return to hand',()=>{
 const s=field(1-side),jet=add(s,side,'battle',JET,{tapped:true,under:[inst(FIRE)]});
 if(side===1){
  const foe=add(s,1,'battle',NATURE);
  cast(s,SPIRAL);target(s,foe);drain(s);assert.ok(jet.tapped);
  const victim=add(s,1,'battle',NATURE);
  cast(s,HAND);target(s,victim);drain(s);assert.ok(!jet.tapped);
 }else{
  const victim=add(s,1,'battle',NATURE),attacker=add(s,0,'battle',BIG);
  s.active=0;s.phase='attack';victim.tapped=true;
  attack(s,attacker.uid,victim.uid);act(s,'noBlock');drain(s);assert.ok(!jet.tapped);
 }
});

test('Jet stays tapped when EX Life replaces the destruction of another creature',()=>{
 const s=field(),jet=add(s,0,'battle',JET,{tapped:true,under:[inst(FIRE)]});
 const victim=add(s,1,'battle',LAMBDA,{exLifeShieldUid:s.players[1].shields[0].uid});
 const [shield]=e.exLifeShields(s,1,victim);
 cast(s,HAND);target(s,victim);drain(s);
 assert.ok(jet.tapped&&inZone(s,1,'battle',victim)&&inZone(s,1,'grave',shield));
});

test('Jet copies destroyed together leave both bases tapped (QA40650)',()=>{
 const s=field(),base1=inst(FIRE),base2=inst(FIRE);
 const a=add(s,1,'battle',JET,{tapped:true,under:[base1]});
 const b=add(s,1,'battle',JET,{tapped:true,under:[base2]});
 cast(s,SWEEP);drain(s);
 assert.ok(inZone(s,1,'grave',a)&&inZone(s,1,'grave',b));
 for(const base of [base1,base2])assert.ok(s.players[1].battle.find(x=>x.uid===base.uid)?.tapped);
});

test('Tag is mandatory only when eligible and leaves other creatures legal for attacks and blocks',()=>{
 const s=field(),tag=add(s,1,'battle',TAG),other=add(s,1,'battle',BLOCK,{tapped:true}),x=add(s,0,'battle',BIG);
 cast(s,HAND);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='effect').flatMap(a=>a.targets.map(t=>t.uid)),[tag.uid]);
 target(s,tag);drain(s);
 assert.ok(inZone(s,1,'grave',tag));
 const second=add(s,1,'battle',TAG,{justDiverActive:true}),blocker=add(s,1,'battle',BLOCK);
 cast(s,HAND);target(s,other);drain(s);
 assert.ok(inZone(s,1,'battle',second)&&inZone(s,1,'grave',other));
 second.justDiverActive=false;blocker.tapped=true;
 attack(s,x.uid,blocker.uid);act(s,'noBlock');drain(s);
 blocker.tapped=false;
 const y=add(s,0,'battle',FIRE);attack(s,y.uid);act(s,'block',a=>a.uid===blocker.uid);drain(s);
 assert.ok(inZone(s,1,'battle',second));
});

test('Tag itself uses G Strike from a broken shield and stays in hand',()=>{
 const s=field(1),attacker=add(s,1,'battle',NATURE),later=add(s,1,'battle',FIRE);
 give(s,0,'shields',[TAG]);
 const [shield]=s.players[0].shields;
 attack(s,attacker.uid);act(s,'noBlock');
 assert.equal(s.decision.task.op,'gsDeclare');pick(s,true);
 assert.equal(s.decision.task.op,'gsTarget');pick(s,later.uid);drain(s);
 assert.ok(inZone(s,0,'hand',shield)&&e.attackLocked(s,1,later)&&!later.tapped);
});

test('Having declared Demon Hand and G Strike together, destroying Tag first frees the G Strike target (QA40640)',()=>{
 const s=field(1),attacker=add(s,1,'battle',BOLSHACK),tag=add(s,1,'battle',TAG),later=add(s,1,'battle',FIRE);
 give(s,0,'shields',[HAND,GS]);
 attack(s,attacker.uid);act(s,'noBlock');drainBreak(s);
 act(s,'useTrigger',a=>a.cardId===HAND);assert.equal(s.decision.task.op,'gsDeclare');pick(s,true);
 act(s,'orderTrigger',a=>a.cardId===HAND);target(s,tag);
 assert.ok(inZone(s,1,'grave',tag));
 assert.equal(s.decision.task.op,'gsTarget');pick(s,later.uid);drain(s);
 assert.ok(e.attackLocked(s,1,later));
});

function drainBreak(s){
 while(s.decision?.type==='selectShield'||s.decision?.type==='shieldBreak'){
  e.step(s,e.chooseAI(s));
 }
}

test('Lambda creates EX Life, which protects it from leaving, and does not discard on its own turn end',()=>{
 const s=field();cast(s,LAMBDA);
 const x=s.players[0].battle.find(x=>x.cardId===LAMBDA),[shield]=e.exLifeShields(s,0,x);
 assert.ok(shield);assert.equal(s.players[0].shields.length,6);assert.equal(e.card(x).breaker,2);
 give(s,1,'hand',[NATURE]);end(s);
 assert.equal(s.players[1].hand.filter(y=>y.cardId===NATURE).length,2);
 act(s,'skipCharge');cast(s,HAND);target(s,x);drain(s);
 assert.ok(inZone(s,0,'battle',x)&&inZone(s,0,'grave',shield));
});

for(const accept of [true,false])test('Lambda discards the entire hand, counts a replaced discard, then offers an all-or-none draw: '+accept,()=>{
 let s=field(1);
 add(s,0,'battle',LAMBDA);
 give(s,1,'hand',[FIRE,RYUSEI,HAND,NATURE]);
 const [a,ryusei,b,c]=s.players[1].hand,deck=s.players[0].deck.length;
 end(s);
 assert.equal(s.decision.task.op,'discardChosen');
 assert.equal(s.decision.player,1);
 pick(s,true);
 assert.ok(inZone(s,1,'battle',ryusei)&&[a,b,c].every(x=>inZone(s,1,'grave',x)));
 assert.equal(s.players[1].hand.length,0);
 assert.equal(s.decision.task.op,'g34_Offer');
 assert.equal(s.decision.task.defs[0].n,4);
 assert.deepEqual(options(s),[true,null]);
 s=JSON.parse(JSON.stringify(s));pick(s,accept?true:null);drain(s);
 assert.equal(s.players[0].deck.length,deck-Number(accept)*4-1); // Includes the normal turn-start draw.
});
