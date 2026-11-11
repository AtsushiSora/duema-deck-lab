import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const ROSE='dmr14-s01',FUDOU='dmr14-003',RYUO='dmr13-034';
const PRINTS=[['dmx26-s01',ROSE],...['dmx20-031','dmd18-016','promoy13-036'].map(id=>[id,RYUO])];
const FIRE='dm01-097',NATURE='dm01-108',WATER='dm01-083',BOUNCE='dm01-086';
const LIGHT='dm11-039',LIGHT_MULTI='dmr21-049',BOUNCER='dm02-010';
const DRAGON='dm01-008',NIGHTMARE='dmr13-087',OVER='dm24ex4-014',EVO='dmr17-041',KATSU='dm26rp2-S011';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const value=c=>c.value?.uid??c.value;
const choices=s=>s.decision.choices.map(value);
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);

function field(){
 const s=setup();
 for(const p of [0,1]){give(s,p,'deck',Array(20).fill(NATURE));give(s,p,'grave',[]);}
 return s;
}

function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}

function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}

test('Phase 996 registers three official definitions and maps four reprints to their canonical IDs',()=>{
 const m=read('tools/support-phase-996.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[ROSE,FUDOU,RYUO]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),PRINTS);
 assert.deepEqual(catalogue.resolveRows(PRINTS.map(([id])=>({id,count:1}))),
  [{id:ROSE,count:1},{id:RYUO,count:3}]);
 for(const row of m.cards){
  const {id,name,faces}=row,[f]=faces,d=details.cards.find(x=>x.id===id),c=e.card(id);
  assert.deepEqual(faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:996}),row.spec);
  const altered=structuredClone(d);
  altered.faces[0].abilityText+='未知の追加能力。';
  assert.throws(()=>standardCardSpec(altered,{phase:996}));
  for(const [key,v] of Object.entries(row.spec))assert.deepEqual(c[key],v);
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [name,f.typeText==='呪文'?'spell':'creature',f.cost,Number(f.powerText),f.race,f.civilizations.filter(color=>color!=='無色'),1,4]);
  assert.equal(c.supportBatch,'phase-996');
  assert.equal(CARD_IMAGES[id],row.image);
  assert.ok(catalogue.get(id).supported);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
 }
 for(const row of [...m.cards,...m.printAliases]){
  assert.ok(row.verification.facesMatched);
  assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[row.canonicalId??row.id,row.image]]);
  if(row.canonicalId)assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:996}),m.cards.find(x=>x.id===row.canonicalId).spec);
 }
});

const endTurn=s=>{s.phase='attack';act(s,'endTurn');};
const withPower=(s,p,n)=>put(s,p,'battle',FIRE,{powerModifiers:[{amount:n-e.card(FIRE).power}]});
const effectTargets=s=>s.decision.choices?s.decision.choices.map(value):s.decision.targets.map(x=>x.uid);
const chooseTarget=(s,x)=>s.decision.type==='effect'?act(s,'effect',a=>a.targets.some(t=>t.uid===x.uid)):pick(s,x.uid);

test('Rose offers a face-down shield when its own Dragon attacks and can decline',()=>{
 for(const take of [true,false]){
  const s=field(),rose=put(s,0,'battle',ROSE),dragon=put(s,0,'battle',DRAGON);
  const top=s.players[0].deck[0];
  assert.equal(e.effectiveCard(rose,s).blocker,true);
  assert.equal(e.effectiveCard(rose,s).breaker,2);
  attack(s,dragon.uid);assert.deepEqual(choices(s),[true,null]);pick(s,take?true:null);drain(s);
  assert.equal(has(s,0,'shields',top),take);
  if(take)assert.ok(!s.players[0].shields.find(x=>x.uid===top.uid).faceUp);
 }
});

test('Rose counts itself blocking and ignores a non-Dragon or an opponent Dragon',()=>{
 const blocker='dm01-076';
 for(const mode of ['self','nonDragon','opponentDragon']){
  const s=field(),rose=put(s,0,'battle',ROSE),ordinary=put(s,0,'battle',blocker);
  const top=s.players[0].deck[0];
  if(mode==='opponentDragon'){
   const attacker=put(s,0,'battle',FIRE);
   const enemy=put(s,1,'battle',ROSE);
   attack(s,attacker.uid);act(s,'block',a=>a.uid===enemy.uid);drain(s);
   assert.ok(has(s,0,'deck',top));
  }else{
   s.active=1;
   const attacker=put(s,1,'battle',FIRE);
   attack(s,attacker.uid);act(s,'block',a=>a.uid===(mode==='self'?rose.uid:ordinary.uid));
   if(mode==='self'){assert.deepEqual(choices(s),[true,null]);pick(s,true);}
   drain(s);
   assert.equal(has(s,0,'shields',top),mode==='self');
  }
 }
});

for(const effect of [BOUNCE,LIGHT,LIGHT_MULTI,BOUNCER])test('Rose rejects only non-Light opposing spell choices, '+effect,()=>{
 const s=field();s.active=1;
 const x=put(s,0,'battle',ROSE),other=put(s,0,'battle',FIRE);
 play(s,effect);
 assert.ok(effectTargets(s).includes(other.uid));
 assert.equal(effectTargets(s).includes(x.uid),effect!==BOUNCE);
 if(effect!==BOUNCE)chooseTarget(s,x);else chooseTarget(s,other);
 drain(s);
});

test('Fudou forces one attack without fixing its priority and deploys only on the first attack',()=>{
 let s=field();
 const x=put(s,0,'battle',FUDOU),forced=put(s,1,'battle',WATER),other=put(s,1,'battle',FIRE);
 const chosen=put(s,0,'hand',NIGHTMARE);put(s,0,'hand',OVER);put(s,0,'hand',EVO);put(s,0,'hand',FIRE);
 assert.equal(e.effectiveCard(x,s).breaker,2);
 endTurn(s);
 assert.deepEqual(choices(s),[forced.uid,other.uid]);pick(s,forced.uid);
 act(s,'skipCharge');s.phase='attack';
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='endTurn'));
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===other.uid));
 attack(s,other.uid);
 assert.deepEqual(choices(s),[chosen.uid,null]);pick(s,chosen.uid);drain(s);
 assert.ok(has(s,0,'battle',chosen));
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='endTurn'));
 s=restore(s);attack(s,forced.uid);drain(s);
 s.players[1].battle.find(y=>y.uid===forced.uid).tapped=false;
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='endTurn'));
 endTurn(s);drain(s);
 assert.ok(has(s,0,'grave',chosen));
});

test('Fudou delayed destruction resolves even after Fudou is destroyed in the first attack',()=>{
 const s=field();
 const x=put(s,0,'battle',FUDOU,{tapped:true}),attacker=withPower(s,1,9000),chosen=put(s,0,'hand',NIGHTMARE);
 endTurn(s);pick(s,attacker.uid);act(s,'skipCharge');
 attack(s,attacker.uid,x.uid);pick(s,chosen.uid);drain(s);
 assert.ok(has(s,0,'grave',x)&&has(s,0,'battle',chosen));
 endTurn(s);drain(s);
 assert.ok(has(s,0,'grave',chosen));
});

for(const armed of [false,true])test('Ryuo inspects five privately, reveals one Fire creature, then shuffles, armed '+armed,()=>{
 let s=field();
 give(s,0,'mana',[...Array(4).fill(FIRE),armed?FIRE:WATER]);
 give(s,0,'deck',[FIRE,RYUO,WATER,NATURE,WATER,DRAGON,...Array(8).fill(NATURE)]);
 const [candidate,fireSpell,other]=s.players[0].deck;
 const equal=withPower(s,1,e.card(FIRE).power),strong=withPower(s,1,e.card(FIRE).power+1);
 const rng=s.rng,spell=play(s,RYUO);
 assert.equal(e.card(RYUO).trigger,true);
 assert.deepEqual(choices(s),[candidate.uid]);
 assert.ok(!s.log.some(r=>r.type==='reveal'&&r.cardId===fireSpell.cardId));
 pick(s,candidate.uid);s=restore(s);
 assert.deepEqual(choices(s),[equal.uid,null]);
 pick(s,armed?null:equal.uid);drain(s);
 assert.equal(has(s,0,'hand',candidate),armed);
 assert.equal(has(s,0,'deck',candidate),!armed);
 assert.equal(has(s,1,'grave',equal),!armed);
 assert.ok(has(s,1,'battle',strong)&&has(s,0,'deck',other)&&has(s,0,'grave',spell));
 assert.notEqual(s.rng,rng);
 assert.equal(s.players[0].g34Protected.length,0);
});

test('Ryuo counts Katsu Mugen as infinite while revealed and can recover it without a legal target',()=>{
 for(const hasFoe of [true,false]){
  const s=field();give(s,0,'deck',[KATSU,...Array(9).fill(WATER)]);
  const top=s.players[0].deck[0],foe=hasFoe?withPower(s,1,100000):null;
  play(s,RYUO);pick(s,top.uid);
  if(foe){assert.deepEqual(choices(s),[foe.uid,null]);pick(s,foe.uid);assert.ok(has(s,1,'grave',foe));}
  drain(s);
  assert.ok(has(s,0,'hand',top),String(hasFoe));
  assert.equal(s.decision,null);
 }
});

test('Ryuo still shuffles when none of the five inspected cards is eligible',()=>{
 const s=field();give(s,0,'deck',[...Array(5).fill(WATER),FIRE]);
 const rng=s.rng;
 play(s,RYUO);
 assert.equal(s.decision,null);
 assert.notEqual(s.rng,rng);
 assert.equal(s.players[0].hand.length,0);
 assert.equal(s.players[0].g34Protected.length,0);
});
