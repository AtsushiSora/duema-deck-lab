import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const RANCHU='dmrp03-067',KONYAKU='dmex14-049',TANK='dmrp03-091';
const SMALL='dm01-108',HIGH='dmrp03-087',STRONG='dm01-s08',FIRE='dm01-097';
const LOCK='dmrp20-020',AURA='dmrp02-089';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(SMALL));
 return s;
}
function put(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{
 const v=s.decision.choices[a.choice].value;
 return (v?.uid??v)===(value?.uid??value);
});
const end=s=>{s.phase='attack';act(s,'endTurn');};

test('phase 1167 verifies three complete official cards with stable IDs and no extra prints',()=>{
 const m=read('tools/support-phase-1167.json'),registry=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(x=>x.id),[RANCHU,KONYAKU,TANK]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const {id}=row,c=e.card(id),f=row.faces[0],d=details.cards.find(x=>x.id===id);
  assert.deepEqual(d.faces,row.faces);
  assert.deepEqual(standardCardSpec(d,{phase:1167}),row.spec);
  assert.deepEqual([c.type,c.cost,c.civilizations,c.race,c.power,c.manaValue,c.limit],
   ['creature',f.cost,f.civilizations,f.race,Number(f.powerText),1,4]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.equal(registry.get(id).id,id);
  assert.equal(registry.byName.get(nameKey(row.name)).id,id);
  assert.equal(CARD_IMAGES[id],row.image);
  assert.ok(refs.some(x=>x.id===id&&x.canonicalId===id&&x.image===row.image));
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'\n未知の能力。'}]},{phase:1167}));
 }
});

test('Ranchu can block, and may bounce only an enemy within cost 4 when destroyed',()=>{
 for(const mode of ['attacker','owner','decline']){
  const s=field(),own=s.players[0],opp=s.players[1];
  const blocker=put(s,0,'battle',RANCHU);
  const attacker=put(s,1,'battle',FIRE);
  const borrowed=put(s,1,'battle',SMALL,{cardOwner:0});
  const expensive=put(s,1,'battle',STRONG);
  const ally=put(s,0,'battle',SMALL);
  s.active=1;
  attack(s,attacker.uid);
  act(s,'block',a=>a.uid===blocker.uid);
  assert.ok(own.grave.includes(blocker));
  const eligible=s.decision.choices.map(x=>x.value?.uid??x.value);
  assert.deepEqual(new Set(eligible),new Set([attacker.uid,borrowed.uid,null]));
  pick(s,mode==='decline'?null:mode==='owner'?borrowed:attacker);
  drain(s);
  assert.equal(own.hand.includes(borrowed),mode==='owner');
  assert.equal(opp.hand.includes(attacker),mode==='attacker');
  assert.equal(opp.battle.includes(borrowed),mode!=='owner');
  assert.equal(opp.battle.includes(attacker),mode!=='attacker');
  assert.ok(opp.battle.includes(expensive)&&own.battle.includes(ally));
  assert.equal(own.shields.length,5);
 }
});

test('Ranchu may attack and bouncing it does not trigger its destruction ability',()=>{
 const s=field(),x=put(s,0,'battle',RANCHU);
 s.phase='attack';
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target==='player'));
 s.active=1;
 s.phase='main';
 cast(s,'dm01-020');
 drain(s);
 assert.ok(s.players[0].hand.includes(x));
 assert.equal(s.decision,null);
});

test('Konyaku returns only from its owner turn-end, after the chosen shield goes to grave',()=>{
 for(const mode of ['pay','decline','opponent turn','empty shields','grave lock']){
  const s=field(),own=s.players[0],x=put(s,0,'grave',KONYAKU);
  const root=own.shields[0],child=inst(FIRE);
  root.shieldStack=[child];
  if(mode==='opponent turn')s.active=1;
  if(mode==='empty shields')own.shields=[];
  if(mode==='grave lock')put(s,1,'battle',LOCK);
  end(s);
  if(['pay','decline','grave lock'].includes(mode)){
   assert.equal(s.decision.task.op,'g34_ShieldGrave');
   pick(s,mode==='decline'?null:root);
  }
  drain(s);
  assert.equal(own.hand.includes(x),mode==='pay');
  assert.equal(own.grave.includes(x),mode!=='pay');
  assert.equal(own.grave.includes(root),['pay','grave lock'].includes(mode));
  assert.equal(own.grave.includes(child),['pay','grave lock'].includes(mode));
 }
});

test('Konyaku destroys the battle winner with Slayer after losing its own battle',()=>{
 const s=field(),x=put(s,0,'battle',KONYAKU),y=put(s,1,'battle',STRONG,{tapped:true});
 attack(s,x.uid,y.uid);
 drain(s);
 assert.ok(s.players[0].grave.includes(x));
 assert.ok(s.players[1].grave.includes(y));
});

test('Tank checks allied entrants at their current power and stacks only the power bonus',()=>{
 const s=field(),tank=put(s,0,'battle',TANK);
 cast(s,SMALL);
 assert.equal(e.power(tank,false,s),2000);
 s.active=1;
 cast(s,HIGH);
 assert.equal(e.power(tank,false,s),2000);
 s.active=0;
 cast(s,HIGH);
 assert.equal(e.power(tank,false,s),6000);
 cast(s,HIGH);
 assert.equal(e.power(tank,false,s),10000);
 assert.equal(e.effectiveCard(tank,s).breaker,2);
 attack(s,tank.uid);
 drain(s);
 assert.equal(s.players[1].shields.length,3);
 end(s);
 assert.equal(e.power(tank,false,s),2000);
 assert.equal(e.effectiveCard(tank,s).breaker,undefined);
});

test('Tank can see its own arrival when a continuous aura makes it reach 12000',()=>{
 const s=field();
 for(let i=0;i<4;i++)put(s,0,'battle',AURA);
 cast(s,TANK);
 drain(s);
 const tank=s.players[0].battle.find(x=>x.cardId===TANK);
 assert.ok(tank);
 assert.equal(e.effectiveCard(tank,s).breaker,2);
 assert.equal(e.power(tank,false,s),18000);
});

test('Tank keeps its resolved power and breaker bonuses after a seal is removed that turn',()=>{
 const s=field(),tank=put(s,0,'battle',TANK);
 cast(s,HIGH);
 assert.equal(e.power(tank,false,s),6000);
 s.active=1;
 cast(s,'dm25ex4-058');
 pick(s,tank);
 assert.equal(tank.sealed,true);
 s.active=0;
 cast(s,'dmr19-080');
 drain(s);
 assert.equal(!!tank.sealed,false);
 assert.equal(e.power(tank,false,s),6000);
 assert.equal(e.effectiveCard(tank,s).breaker,2);
});
