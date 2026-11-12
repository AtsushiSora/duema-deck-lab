import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const ARAYA='dm24sp2-006',CROM='dm23ex3-044',CLAP='dm23ex3-045',FUNK='dm23ex3-063',BLUEPRINT='dm24sp2-010';
const N='dm01-108',DARK='dm01-090',SPARK='dm01-015',SPOON='dm22rp1-062',STRONG='dm01-107';
const ZENITH='dm23ex1-010',COLORLESS='dmrp07-001',COLORED='dm24ex2-019';

function add(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const choose=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const cast=(s,x)=>act(s,'play',a=>a.uid===x.uid&&!a.alternative);
const restore=s=>decodeBattleData(encodeBattleData(s));
const zoneHas=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function end(s){
 if(s.phase==='charge')act(s,'skipCharge');
 if(s.phase==='main')act(s,'toAttack');
 act(s,'endTurn');
}
function crystal(s,n,p=0){
 for(const x of s.players[p].mana.slice(0,n))x.faceDown=true;
}
function ownAttacks(s,x){
 return e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid);
}

test('five whole official definitions and six alternate prints retain canonical IDs, art and limits',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-1036.json',import.meta.url)));
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[ARAYA,CROM,CLAP,FUNK,BLUEPRINT]);
 assert.equal(m.printAliases.length,6);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=registry.get(row.id),f=row.faces[0],base=m.cards.find(r=>r.id===id);
  assert.equal(c.id,id);
  assert.equal(c.supported,true);
  assert.equal(c.limit,m.regulationVerification.limits[row.id]);
  assert.equal(c.manaValue,1);
  assert.equal(c.cost,f.cost);
  assert.equal(c.power,Number(f.powerText));
  assert.equal(CARD_IMAGES[id],base.image);
  assert.equal(refs.find(r=>r.id===row.id).image,row.image);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1036}),base.spec);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[id]);
 }
});

for(const flipFirst of [true,false])test('Arayashiki may order the mana flip before or after its crystal armor draw '+flipFirst,()=>{
 let s=setup();
 crystal(s,1);
 const body=add(s,0,'hand',ARAYA),mana=s.players[0].mana[1],top=s.players[0].deck.slice(0,2),all=physical(s);
 cast(s,body);
 const pending=s.pendingEffects.filter(x=>x.uid===body.uid);
 assert.equal(pending.length,2);
 const first=pending.find(x=>flipFirst?x.label!=='水晶武装2':x.label==='水晶武装2');
 s=restore(s);
 act(s,'orderEffect',a=>a.effectId===first.effectId);
 choose(s,mana.uid);
 assert.ok(s.players[0].mana.find(x=>x.uid===mana.uid).faceDown);
 assert.equal(s.players[0].hand.length,flipFirst?2:0);
 assert.equal(top.every(x=>zoneHas(s,0,'hand',x)),flipFirst);
 assert.deepEqual(physical(s),all);
});

test('Arayashiki can decline the flip and still draws if two mana are already face-down',()=>{
 const s=setup(),body=add(s,0,'hand',ARAYA);
 crystal(s,2);
 cast(s,body);
 const flip=s.pendingEffects.find(x=>x.uid===body.uid&&x.label!=='水晶武装2');
 act(s,'orderEffect',a=>a.effectId===flip.effectId);
 choose(s,null);
 assert.equal(s.players[0].mana.filter(x=>x.faceDown).length,2);
 assert.equal(s.players[0].hand.length,2);
});

test('Cromwell attacks on entry, takes a shield without triggering it and flips one mana at its own end',()=>{
 let s=setup();
 give(s,0,'shields',[SPARK,N]);
 const root=s.players[0].shields[0],leaf=inst(SPARK);
 root.shieldStack=[leaf];
 const crom=add(s,0,'hand',CROM),mana=s.players[0].mana.at(-1),enemy=add(s,1,'battle',N);
 cast(s,crom);
 attack(s,crom.uid);
 choose(s,root.uid);
 act(s,'noBlock');
 drain(s);
 assert.ok(zoneHas(s,0,'hand',root)&&zoneHas(s,0,'hand',leaf));
 assert.equal(enemy.tapped,false);
 s=restore(s);
 end(s);
 assert.equal(s.decision.task.op,'g34_ManaDown426');
 choose(s,mana.uid);
 assert.ok(s.players[0].mana.find(x=>x.uid===mana.uid).faceDown);
 end(s);
 assert.equal(s.decision,null);
});

test('Cromwell sees a shield broken by the opponent and may decline flipping',()=>{
 const s=Object.assign(setup(),{active:1}),crom=add(s,0,'battle',CROM),enemy=add(s,1,'battle',N);
 give(s,0,'shields',[N]);
 attack(s,enemy.uid);
 act(s,'noBlock');
 drain(s);
 end(s);
 assert.equal(s.decision.player,0);
 assert.equal(s.decision.task.uid,crom.uid);
 choose(s,null);
 assert.ok(s.players[0].mana.every(x=>!x.faceDown));
});

test('Cromwell does not see a shield depart when only one card leaves its stack',()=>{
 const s=setup(),root=s.players[0].shields[0],leaf=inst(N),crom=add(s,0,'battle',CROM);
 root.shieldStack=[leaf];
 cast(s,add(s,0,'hand',SPOON));
 choose(s,leaf.uid);
 assert.ok(zoneHas(s,0,'hand',leaf)&&zoneHas(s,0,'shields',root));
 assert.ok(zoneHas(s,0,'battle',crom));
 end(s);
 assert.equal(s.decision,null);
});

test('Clap grants one chosen allied creature speed for this turn only',()=>{
 const s=setup(),clap=add(s,0,'battle',CLAP);
 const ally=add(s,0,'battle',N,{entered:s.turn}),other=add(s,0,'battle',N,{entered:s.turn}),enemy=add(s,1,'battle',N);
 attack(s,clap.uid);
 assert.deepEqual(values(s),[clap.uid,ally.uid,other.uid]);
 choose(s,ally.uid);
 act(s,'noBlock');
 drain(s);
 assert.ok(ownAttacks(s,ally));
 assert.ok(!ownAttacks(s,other)&&!e.effectiveCard(enemy,s).speedAttacker);
 end(s);
 assert.ok(!e.effectiveCard(ally,s).speedAttacker);
});

test('Clap continuously gives speed to every ally including itself while crystal armor is active',()=>{
 const s=setup(),clap=add(s,0,'hand',CLAP),ally=add(s,0,'battle',N,{entered:s.turn}),enemy=add(s,1,'battle',N);
 crystal(s,2);
 cast(s,clap);
 act(s,'toAttack');
 assert.ok(ownAttacks(s,clap)&&ownAttacks(s,ally));
 assert.ok(!e.effectiveCard(enemy,s).speedAttacker);
 s.players[0].mana[0].faceDown=false;
 assert.ok(!ownAttacks(s,clap)&&!ownAttacks(s,ally));
});

test('Funk needs two face-down mana and a paid darkness summon from the grave, then slays a stronger creature',()=>{
 let s=setup();
 give(s,0,'mana',[N,N,DARK]);
 const funk=add(s,0,'grave',FUNK),enemy=add(s,1,'battle',STRONG);
 const available=()=>e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===funk.uid&&a.origin==='grave');
 crystal(s,1);
 assert.equal(available(),false);
 crystal(s,3);
 assert.equal(available(),false);
 s.players[0].mana[2].faceDown=false;
 assert.equal(available(),true);
 act(s,'play',a=>a.uid===funk.uid&&a.origin==='grave');
 assert.ok(zoneHas(s,0,'battle',funk));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,3);
 s=restore(s);
 end(s);
 s.players[0].battle.find(x=>x.uid===funk.uid).tapped=true;
 attack(s,enemy.uid,funk.uid);
 drain(s);
 assert.ok(zoneHas(s,0,'grave',funk)&&zoneHas(s,1,'grave',enemy));
});

for(const selected of [ZENITH,COLORLESS,null])test('Blueprint takes at most one Zenith or colorless card and orders the rest before flipping mana '+selected,()=>{
 let s=setup();
 give(s,0,'deck',[ZENITH,N,COLORLESS,COLORED,N,N,N]);
 const [zenith,nonMatch,colorless,multi,...tail]=s.players[0].deck,mana=s.players[0].mana.at(-1);
 cast(s,add(s,0,'hand',BLUEPRINT));
 assert.deepEqual(values(s),[zenith.uid,colorless.uid,null]);
 const take=[zenith,colorless].find(x=>x.cardId===selected);
 choose(s,take?.uid??null);
 const order=[multi,colorless,nonMatch,zenith].filter(x=>x.uid!==take?.uid);
 assert.equal(s.decision.task.op,'g34_Order');
 s=restore(s);
 for(const x of order)if(s.decision?.task?.op==='g34_Order')choose(s,x.uid);
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),[...tail,...order].map(x=>x.uid));
 assert.equal(s.players[0].hand.length,Number(!!take));
 if(take)assert.ok(zoneHas(s,0,'hand',take));
 assert.equal(s.decision.task.op,'g34_ManaDown426');
 choose(s,mana.uid);
 assert.ok(s.players[0].mana.find(x=>x.uid===mana.uid).faceDown);
});
