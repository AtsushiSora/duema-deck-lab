import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,cast,drain,attack} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const PIMAN='dmrp03-088',GIKO='dmrp01-007',DIVE='dmrp05-004';
const GREEN='dm01-108',SEED='dmsd20-016',KING='dmrp01-008',LARGE='dmr23-072';
const THRESHOLD='dmrp03-087',LUTZ='dmrp03-010',INFERNO='dmc44-001';
const TAP='dm01-085',BOUNCE='dm01-086';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const value=c=>c.value?.uid??c.value;
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
const turnEnd=s=>{s.phase='attack';act(s,'endTurn');drain(s);};

function field(){
 const s=setup();
 for(const p of [0,1]){give(s,p,'deck',Array(20).fill(GREEN));give(s,p,'grave',[]);}
 return s;
}

function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}

test('Phase 975 registers three full official definitions under existing canonical IDs',()=>{
 const m=read('tools/support-phase-975.json');
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(x=>x.id),[PIMAN,GIKO,DIVE]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const {id,name}=row,f=row.faces[0],d={...row,status:'complete'},c=e.card(id);
  assert.deepEqual(standardCardSpec(d,{phase:975}),row.spec);
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'未知の能力。'}]},{phase:975}));
  for(const [key,v] of Object.entries(row.spec))assert.deepEqual(c[key],v);
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [name,'creature',f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-975');
  assert.equal(CARD_IMAGES[id],row.image);
  assert.ok(catalogue.get(id).supported);
  assert.ok(row.verification.facesMatched);
  assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);
  assert.equal(m.regulationVerification.limits[id],4);
  assert.deepEqual(refs.filter(r=>r.id===id).map(r=>[r.canonicalId,r.image]),[[id,row.image]]);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(r=>nameKey(r.name)===nameKey(name)).map(r=>r.id),[id]);
 }
});

test('Piman can leave its own mana after a summon with exactly 12000 power',()=>{
 let s=field();
 const piman=put(s,0,'mana',PIMAN,{tapped:true}),opposing=put(s,1,'mana',PIMAN);
 const hidden=put(s,0,'mana',PIMAN,{faceDown:true}),other=put(s,0,'grave',PIMAN);
 const big=put(s,0,'hand',THRESHOLD),before=physical(s);
 act(s,'play',a=>a.uid===big.uid);
 assert.ok(has(s,0,'battle',big));
 assert.match(s.decision.title,/ぴーまんどりるをマナから出す/);
 s=restore(s);
 pick(s,true);
 assert.ok(has(s,0,'battle',piman));
 assert.ok(!has(s,0,'mana',piman));
 assert.ok(has(s,1,'mana',opposing));
 assert.ok(has(s,0,'mana',hidden));
 assert.ok(has(s,0,'grave',other));
 assert.equal(s.players[0].battle.find(x=>x.uid===piman.uid).tapped,false);
 assert.equal(s.decision,null);
 assert.deepEqual(physical(s),before);
});

test('Piman ignores opposing summons, small summons, and deployments by an effect',()=>{
 const s=field(),piman=put(s,0,'mana',PIMAN);
 cast(s,GREEN);
 assert.equal(s.decision,null);
 const lutz=put(s,0,'grave',LUTZ);
 cast(s,INFERNO);
 pick(s,lutz.uid);
 drain(s);
 assert.ok(has(s,0,'battle',lutz));
 assert.ok(has(s,0,'mana',piman));
 s.active=1;
 cast(s,THRESHOLD);
 assert.ok(has(s,0,'mana',piman));
 assert.equal(s.decision,null);
});

test('Piman sees continuous power bonuses and can decline',()=>{
 const s=field(),piman=put(s,0,'mana',PIMAN);
 put(s,0,'battle',KING,{tapped:true});
 cast(s,LARGE);
 assert.match(s.decision.title,/ぴーまんどりるをマナから出す/);
 const decline=s.decision.choices.find(x=>x.value!==true).value;
 pick(s,decline);
 assert.ok(has(s,0,'mana',piman));
 assert.equal(s.decision,null);
});

test('Giko loses at the start of the opposing turn when it is the only allied creature',()=>{
 const s=field(),giko=put(s,0,'battle',GIKO);
 put(s,0,'battle',SEED);
 put(s,1,'battle',GREEN);
 s.active=1;
 turnEnd(s);
 assert.equal(s.active,0);
 assert.equal(s.winner,null);
 turnEnd(s);
 assert.ok(has(s,0,'battle',giko));
 assert.equal(s.winner,1);
 assert.match(s.reason,/ギーコギルス/);
});

test('Giko is safe alongside another allied creature and breaks three shields',()=>{
 const s=field(),giko=put(s,0,'battle',GIKO);
 put(s,0,'battle',GREEN);
 attack(s,giko.uid);
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,2);
 turnEnd(s);
 assert.equal(s.active,1);
 assert.equal(s.winner,null);
});

test('Giko checks its condition at resolution after an active player turn-start effect',()=>{
 const s=field(),giko=put(s,0,'battle',GIKO),ally=put(s,0,'battle',GREEN);
 const turnStarter='dm28-020';
 const original=data.cards.find(c=>c.id===turnStarter);
 const source={...original,g174Start:[{op:'Target',to:'grave'}]};
 e.setCards(data.cards.map(c=>c.id===turnStarter?source:c));
 try{
  put(s,1,'battle',turnStarter);
  s.phase='attack';
  act(s,'endTurn');
  pick(s,ally.uid);
  drain(s);
  assert.ok(has(s,0,'battle',giko));
  assert.equal(s.winner,1);
 }finally{e.setCards(data.cards);}
});

for(const reduction of [0,1,2])test('Diveao permits spell reduction of '+reduction+' and bounces an enemy after the spell',()=>{
 let s=field();
 const dive=put(s,0,'battle',DIVE),enemy=put(s,1,'battle',GREEN),spell=put(s,0,'hand',TAP);
 const ids=physical(s);
 act(s,'play',a=>a.uid===spell.uid);
 assert.equal(s.decision.task.op,'g34_PaySpell485');
 assert.deepEqual(s.decision.choices.map(value),[2,1,0,false]);
 s=restore(s);
 pick(s,reduction);
 act(s,'effect',a=>a.targets[0].uid===enemy.uid);
 pick(s,enemy.uid);
 assert.ok(has(s,0,'battle',dive));
 assert.ok(has(s,1,'hand',enemy));
 assert.ok(has(s,0,'grave',spell));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,3-reduction);
 assert.deepEqual(physical(s),ids);
});

test('Diveao maintains the one mana minimum and watches neither enemy spells nor ordinary summons',()=>{
 const s=field(),dive=put(s,0,'battle',DIVE);
 give(s,0,'mana',['dm01-083']);
 assert.equal(e.summonCost(s,0,e.card(BOUNCE)),1);
 cast(s,BOUNCE);
 pick(s,2);
 act(s,'effect',a=>a.targets[0].uid===dive.uid);
 assert.ok(has(s,0,'hand',dive));
 const live=put(s,0,'battle',DIVE);
 s.active=1;
 cast(s,TAP);
 act(s,'effect',a=>a.targets[0].uid===live.uid);
 cast(s,GREEN);
 assert.equal(s.decision,null);
 assert.equal(s.players[1].mana.filter(x=>x.tapped).length,5);
});

test('Diveao blocks in combat and can break two shields on its own attack',()=>{
 const s=field(),dive=put(s,0,'battle',DIVE),opponent=put(s,1,'battle',GREEN);
 s.active=1;
 attack(s,opponent.uid);
 act(s,'block',a=>a.uid===dive.uid);
 drain(s);
 assert.ok(has(s,1,'grave',opponent));
 assert.equal(s.players[0].shields.length,5);
 s.active=0;
 dive.tapped=false;
 attack(s,dive.uid);
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,3);
});
