import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const SERVO='dm22-042',KIRA='dm21-s04',ENERGION='dm22-038',RYUON='dm21-051';
const PLAIN='dm01-108',DRAGON='dm36-087',GELROOM='dm22-027',CAPTAIN='dm21-s01';
const FIONA='dm25ex4-S01',BOUNCE='dm01-086',SEED='dmrp21-014';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
const ids=cards=>cards.map(x=>x.uid);
const find=(s,p,zone,x)=>s.players[p][zone].find(y=>y.uid===x.uid);
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===(value?.uid??value));
const legal=(s,kind,filter)=>e.getLegalActions(s).some(a=>a.kind===kind&&filter(a));

function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}

function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(18).fill(PLAIN));
 return s;
}

function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}

function end(s){
 s.phase='attack';
 act(s,'endTurn');
}

test('Phase 942 verifies the three official definitions and uses the existing canonical IDs',()=>{
 const m=read('tools/support-phase-942.json'),refs=read('tools/image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[SERVO,KIRA,ENERGION]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const {id}=row,d=details.cards.find(x=>x.id===id),f=row.faces[0],c=e.card(id);
  assert.deepEqual(row.faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:942}),row.spec);
  const changed={...d,faces:[{...f,abilityText:f.abilityText+'\n未知の能力。'}]};
  assert.throws(()=>standardCardSpec(changed,{phase:942}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   ['creature',f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-942');
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[id],4);
  assert.equal(CARD_IMAGES[id],row.image);
  assert.deepEqual(refs.filter(x=>x.id===id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  assert.equal(cat.resolveRows([{id,count:1}])[0].id,id);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
 }
 const cards=[SERVO,KIRA,ENERGION,RYUON,PLAIN,DRAGON,GELROOM,CAPTAIN,FIONA,BOUNCE].map(id=>({id,count:4}));
 assert.deepEqual(e.validateDeck({name:'進化とブロッカー',cards:cat.resolveRows(cards)}),[]);
 assert.equal(cat.coverage({cards}).unsupported,0);
});

for(const [attackerId,canBlock] of [[PLAIN,true],[KIRA,true],[DRAGON,false],[GELROOM,false]])
 test('Servo Bolt uses current creature race and evolution to restrict blocks '+attackerId,()=>{
  const s=field(),attacker=put(s,0,'battle',attackerId),servo=put(s,1,'battle',SERVO);
  const other=put(s,1,'battle',ENERGION);
  attack(s,attacker.uid);
  assert.equal(legal(s,'block',a=>a.uid===servo.uid),canBlock);
  assert.ok(legal(s,'block',a=>a.uid===other.uid));
  if(attackerId===PLAIN){
   act(s,'block',a=>a.uid===servo.uid);
   drain(s);
   assert.equal(servo.tapped,true);
   assert.ok(find(s,0,'grave',attacker));
  }
 });

test('Servo Bolt keeps the blocking restriction under a second Blocker grant until its abilities are ignored',()=>{
 const s=field(),dragon=put(s,0,'battle',DRAGON),servo=put(s,1,'battle',SERVO);
 put(s,1,'battle',CAPTAIN);
 attack(s,dragon.uid);
 assert.equal(e.effectiveCard(servo,s).blocker,true);
 assert.ok(!legal(s,'block',a=>a.uid===servo.uid));
 servo.g35Ignored=s.turn;
 assert.equal(e.effectiveCard(servo,s).g942NoEvolutionDragonBlock,undefined);
 assert.ok(!legal(s,'block',a=>a.uid===servo.uid));
});

test('Servo Bolt cannot declare an attack and Energion can attack a tapped creature only',()=>{
 const s=field(),servo=put(s,0,'battle',SERVO),energion=put(s,0,'battle',ENERGION);
 const enemy=put(s,1,'battle',PLAIN,{tapped:true});
 s.phase='attack';
 assert.ok(!legal(s,'attack',a=>a.uid===servo.uid));
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===energion.uid).map(a=>a.target),[enemy.uid]);
});

test('Energion can block and its destruction untaps one chosen friendly creature',()=>{
 let s=field();
 const attacker=put(s,0,'battle',DRAGON),energion=put(s,1,'battle',ENERGION);
 const ready=put(s,1,'battle',PLAIN),tapped=put(s,1,'battle',PLAIN,{tapped:true});
 put(s,1,'battle',SEED,{tapped:true});
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===energion.uid);
 assert.ok(find(s,1,'grave',energion));
 assert.equal(s.decision.player,1);
 assert.deepEqual(new Set(values(s)),new Set([ready.uid,tapped.uid]));
 s=JSON.parse(JSON.stringify(s));
 pick(s,tapped);
 assert.equal(find(s,1,'battle',tapped).tapped,false);
 assert.equal(find(s,0,'battle',attacker).tapped,true);
 assert.equal(s.decision,null);
});

test('Energion does not untap a creature after a bounce',()=>{
 const s=field(),energion=put(s,1,'battle',ENERGION),ally=put(s,1,'battle',PLAIN,{tapped:true});
 play(s,BOUNCE);
 act(s,'effect',a=>a.targets.some(x=>x.uid===energion.uid));
 assert.ok(find(s,1,'hand',energion));
 assert.equal(ally.tapped,true);
 assert.equal(s.decision,null);
});

test('Kira gains haste from a live friendly Ryuon and breaks two shields',()=>{
 const s=field(),ally=put(s,0,'battle',RYUON);
 put(s,1,'battle',RYUON);
 const kira=play(s,KIRA);
 s.phase='attack';
 const canAttack=()=>legal(s,'attack',a=>a.uid===kira.uid&&a.target==='player');
 assert.ok(canAttack());
 ally.sealed=true;
 assert.ok(!canAttack());
 ally.sealed=false;
 attack(s,kira.uid);
 act(s,'noBlock');
 act(s,'breakShields');
 drain(s);
 assert.equal(s.players[1].shields.length,3);
});

for(const amount of [0,1,3])test('Kira puts up to the mandatory two available mana cards into the grave before drawing '+amount,()=>{
 let s=field();
 const mana=give(s,1,'mana',Array(amount).fill(PLAIN)).slice();
 put(s,1,'battle',KIRA);
 put(s,1,'battle',PLAIN,{under:[inst(RYUON)]});
 put(s,0,'battle',RYUON);
 if(amount)mana[0].faceDown=true;
 end(s);
 assert.equal(s.active,1);
 if(amount){
  assert.equal(s.phase,'start');
  assert.deepEqual(values(s),ids(mana));
  assert.equal(s.decision.choices[0].cardId,undefined);
  pick(s,mana[0]);
  if(amount===3){
   assert.deepEqual(ids(s.players[1].mana),ids(mana));
   assert.deepEqual(values(s),ids(mana.slice(1)));
   s=JSON.parse(JSON.stringify(s));
   pick(s,mana[1]);
  }
 }
 assert.deepEqual(ids(s.players[1].grave),ids(mana.slice(0,2)));
 assert.deepEqual(ids(s.players[1].mana),ids(mana.slice(2)));
 assert.ok(s.players[1].grave.every(x=>!x.faceDown));
 assert.equal(s.players[1].hand.length,1);
 assert.equal(s.phase,'charge');
});

test('Kira checks for Ryuon at resolution after another turn-start ability deploys it',()=>{
 const s=field();
 put(s,1,'battle',KIRA);
 put(s,1,'battle',FIONA);
 const ally=put(s,1,'hand',RYUON),before=s.players[1].mana.length;
 end(s);
 assert.equal(s.decision.type,'effectOrder');
 act(s,'orderEffect',a=>s.pendingEffects.some(x=>x.effectId===a.effectId&&x.source===FIONA));
 pick(s,null);
 pick(s,ally);
 assert.ok(find(s,1,'battle',ally));
 assert.equal(s.players[1].mana.length,before);
 assert.equal(s.players[1].grave.length,0);
 assert.equal(s.phase,'charge');
});
