import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const BASIL='dm23ex3-033',MINT='dm23ex3-019',PARA='dm23ex3-040',MATRIX='dm23ex3-037';
const N='dm01-108',SPARK='dm01-015',DEMON='dm01-027',SEED='dm22ex1-086';
const GHOST='dm01-094',CRYSTAL='dm25ex2-086',SASUKE='dmbd02-008',BAIKEN='dm29-s02';

function add(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const choose=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const cast=(s,x)=>act(s,'play',a=>a.uid===x.uid&&!a.alternative);
const restore=s=>decodeBattleData(encodeBattleData(s));
const inZone=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function end(s){
 if(s.phase==='charge')act(s,'skipCharge');
 if(s.phase==='main')act(s,'toAttack');
 act(s,'endTurn');
}
function crystal(s,n,p=0){
 for(const x of s.players[p].mana.slice(0,n))x.faceDown=true;
}

test('four whole official definitions and the Basil alternate print retain canonical IDs, art and limits',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-1037.json',import.meta.url)));
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[BASIL,MINT,PARA,MATRIX]);
 assert.equal(m.printAliases.length,1);
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
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1037}),base.spec);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[id]);
 }
});

test('Basil draws only for another allied matching race, including an Oracle Tamaseed',()=>{
 const s=setup(),basil=add(s,0,'hand',BASIL);
 cast(s,basil);
 assert.equal(s.decision,null);
 assert.equal(e.effectiveCard(basil,s).blocker,true);
 cast(s,add(s,0,'hand',N));
 assert.equal(s.decision,null);
 const top=s.players[0].deck[0];
 cast(s,add(s,0,'hand',SEED));
 assert.deepEqual(values(s),[0,1]);
 choose(s,1);
 assert.ok(inZone(s,0,'hand',top));
 end(s);
 act(s,'skipCharge');
 cast(s,add(s,1,'hand',SEED));
 assert.equal(s.decision,null);
});

for(const mana of [1,2])test('Basil gets Escape exactly at two crystals and retrieving the shield cannot use its S-Trigger '+mana,()=>{
 const s=Object.assign(setup(),{active:1}),basil=add(s,0,'battle',BASIL);
 give(s,0,'shields',[SPARK,N]);
 crystal(s,mana);
 const shield=s.players[0].shields[0],other=add(s,1,'battle',N);
 assert.equal(!!e.effectiveCard(basil,s).escape,mana===2);
 cast(s,add(s,1,'hand',DEMON));
 act(s,'effect',a=>a.targets.some(x=>x.uid===basil.uid));
 if(mana===2)act(s,'replaceEscape',a=>a.shield===shield.uid);
 drain(s);
 assert.equal(inZone(s,0,'battle',basil),mana===2);
 assert.equal(inZone(s,0,'hand',shield),mana===2);
 assert.equal(other.tapped,false);
 assert.equal(s.decision,null);
});

test('Basil declares S-Back before repeat destruction and resolves it afterwards (QA42523)',()=>{
 const s=setup(),basil=add(s,0,'battle',BASIL,{powerModifiers:[{amount:-2500}]});
 const back=add(s,0,'hand','dmex12-035'),enemy=add(s,1,'battle',N);
 give(s,0,'shields',['dm01-090',N]);
 const [shield]=s.players[0].shields;
 crystal(s,2);
 act(s,'toAttack');
 act(s,'replaceEscape',a=>a.shield===shield.uid);
 assert.equal(s.decision.task.op,'g13_SB');
 act(s,'extended',a=>s.decision.choices[a.choice].value?.cost===shield.uid);
 assert.ok(inZone(s,0,'grave',shield)&&inZone(s,0,'battle',basil));
 assert.ok(!enemy.sealed);
 act(s,'allowLeave');
 drain(s);
 assert.ok(inZone(s,0,'grave',basil)&&inZone(s,0,'grave',back));
 assert.ok(enemy.sealed);
});

test('Mint draws on the first actual opponent discard of each turn, including its own entry effect',()=>{
 const s=setup(),mint=add(s,0,'hand',MINT),top=s.players[0].deck[0];
 give(s,1,'hand',[N,N]);
 cast(s,mint);
 assert.equal(s.players[1].hand.length,1);
 assert.deepEqual(values(s),[0,1]);
 choose(s,1);
 assert.ok(inZone(s,0,'hand',top));
 cast(s,add(s,0,'hand',GHOST));
 assert.equal(s.players[1].hand.length,0);
 assert.equal(s.decision,null);
 end(s);
 act(s,'skipCharge');
 const discarded=add(s,1,'hand',N);
 cast(s,add(s,1,'hand',SASUKE));
 choose(s,discarded.uid);
 choose(s,discarded.uid);
 assert.equal(s.decision.player,0);
 assert.deepEqual(values(s),[0,1]);
 choose(s,0);
 assert.equal(s.players[0].hand.length,1);
});

test('Mint arriving after the first discard cannot draw for the next discard that turn',()=>{
 const s=setup();
 give(s,1,'hand',[N,N]);
 cast(s,add(s,0,'hand',GHOST));
 cast(s,add(s,0,'hand',MINT));
 assert.equal(s.decision,null);
 assert.equal(s.players[1].grave.length,2);
 assert.equal(s.players[0].hand.length,0);
});

for(const mana of [1,2])test('Mint gives the opponent its own destruction choice only with two crystals '+mana,()=>{
 const s=setup(),mint=add(s,0,'battle',MINT),a=add(s,1,'battle',N),b=add(s,1,'battle',N);
 crystal(s,mana);
 attack(s,mint.uid);
 if(mana===2){
  assert.equal(s.decision.player,1);
  assert.deepEqual(values(s),[a.uid,b.uid]);
  choose(s,b.uid);
 }
 act(s,'noBlock');
 drain(s);
 assert.equal(inZone(s,1,'grave',b),mana===2);
 assert.ok(inZone(s,1,'battle',a));
});

test('Paranormal offers to flip mana after its blind discard and on the opponent turn after their discard',()=>{
 let s=setup();
 give(s,1,'hand',[N]);
 const para=add(s,0,'hand',PARA),mana=s.players[0].mana.at(-1);
 cast(s,para);
 assert.equal(e.effectiveCard(para,s).blocker,true);
 assert.equal(s.players[1].hand.length,0);
 end(s);
 assert.equal(s.decision.player,0);
 assert.equal(s.decision.task.op,'g34_ManaDown426');
 s=restore(s);
 choose(s,mana.uid);
 assert.ok(s.players[0].mana.find(x=>x.uid===mana.uid).faceDown);
 act(s,'skipCharge');
 const discarded=add(s,1,'hand',N);
 cast(s,add(s,1,'hand',SASUKE));
 choose(s,discarded.uid);
 choose(s,discarded.uid);
 end(s);
 assert.equal(s.decision.player,0);
 assert.equal(s.decision.task.uid,para.uid);
 choose(s,null);
 end(s);
 assert.equal(s.decision,null);
});

test('Baiken replacing the discard gives neither Mint a draw nor Paranormal a mana flip',()=>{
 const s=setup();
 add(s,0,'battle',MINT);
 const baiken=add(s,1,'hand',BAIKEN);
 cast(s,add(s,0,'hand',PARA));
 assert.equal(s.decision.player,1);
 choose(s,true);
 assert.equal(s.decision.task.op,'bounceAny');
 choose(s,null);
 assert.ok(inZone(s,1,'battle',baiken));
 assert.ok(!s.players[1].discardedThisTurn);
 assert.equal(s.players[0].hand.length,0);
 end(s);
 assert.equal(s.decision,null);
});

for(const origin of ['hand','grave'])test('Matrix may cast a cheap spell from '+origin+' then may flip one mana at end',()=>{
 let s=setup();
 const matrix=add(s,0,'hand',MATRIX),spell=add(s,0,origin,CRYSTAL),top=s.players[0].deck[0];
 const big=add(s,0,origin,SPARK),nonSpell=add(s,0,origin,N),all=physical(s);
 cast(s,matrix);
 assert.deepEqual(values(s),[spell.uid,null]);
 const spent=s.players[0].mana.filter(x=>x.tapped).length;
 s=restore(s);
 choose(s,spell.uid);
 assert.ok(inZone(s,0,'hand',top));
 choose(s,null);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,spent);
 assert.ok(inZone(s,0,origin,big)&&inZone(s,0,origin,nonSpell));
 end(s);
 assert.equal(s.decision.task.uid,matrix.uid);
 choose(s,s.players[0].mana.at(-1).uid);
 assert.equal(s.players[0].mana.filter(x=>x.faceDown).length,1);
 assert.deepEqual(physical(s),all);
});

test('Matrix does not trigger at turn end when its owner declined casting and only the opponent cast',()=>{
 const s=setup(),matrix=add(s,0,'hand',MATRIX);
 add(s,0,'hand',CRYSTAL);
 cast(s,matrix);
 choose(s,null);
 end(s);
 assert.equal(s.decision,null);
 act(s,'skipCharge');
 cast(s,add(s,1,'hand',CRYSTAL));
 choose(s,null);
 end(s);
 assert.equal(s.decision,null);
});

test('Matrix also flips at the opponent turn end after its owner casts a Shield Trigger',()=>{
 const s=Object.assign(setup(),{active:1}),matrix=add(s,0,'battle',MATRIX),enemy=add(s,1,'battle',N);
 give(s,0,'shields',[CRYSTAL]);
 attack(s,enemy.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 choose(s,null);
 end(s);
 assert.equal(s.decision.player,0);
 assert.equal(s.decision.task.uid,matrix.uid);
 choose(s,null);
});
