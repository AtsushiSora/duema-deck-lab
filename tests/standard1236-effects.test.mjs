import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const BLOOD='dm24rp2-S06',SUMIRE='dm24rp2-S08',MOON='dm24rp2-023';
const JASHIN='dm24rp1-OR2',INVASION='dm22rp1-017',ABYSS='dm22rp1-060',HIGH='dm24rp1-S06';
const NON='dm01-108',DARK='dm01-090',DOUBLE='dmrp07-045';
const WORM='dm32-088',KIN='dm23bd1-007',BOUNCE='dmr15-041',TWIN='dm23rp3-050';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));

function field(p=0){
 const s=setup();s.active=p;
 for(const who of [0,1]){give(s,who,'deck',Array(20).fill(NON));give(s,who,'grave',[]);}
 return s;
}
function add(s,p,z,id,props={}){const x=Object.assign(inst(id),props);s.players[p][z].push(x);return x;}
function pick(s,wanted){
 act(s,'extended',a=>{
  const value=s.decision.choices[a.choice].value;
  return typeof wanted==='function'?wanted(value):(value?.uid??value)===wanted;
 });
}
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}
const has=(s,p,z,x)=>s.players[p][z].some(y=>x.uid===y.uid);
const choices=s=>s.decision?.choices?.map(x=>x.value?.uid??x.value)??[];

test('the official versions preserve the three original IDs and link all related prints',()=>{
 const m=read('tools/support-phase-1236.json'),refs=read('tools/image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[BLOOD,SUMIRE,MOON]);
 assert.deepEqual(m.printAliases.map(x=>x.id),['dm24rp2-Sec04','dm24ex3-rp2S06','dm24ex3-rp2Sec04','dm26ex1-018','dm24ex3-rp2S08','dm24ex3-Sec06','dm24ex3-031']);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1236}),row.spec);
  assert.deepEqual(cat.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [f.cost,parseInt(f.powerText,10)||0,f.race,f.civilizations,1,4]);
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===id)?.image,row.image);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
 }
});

function finishAttack(s){if(s.decision?.type==='block')act(s,'noBlock');drain(s);}
const playerAttack=(s,x)=>e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target==='player');

test('Jashin previously revived by Evil Invasion and Blood itself may both attack the player (QA45142)',()=>{
 const s=field(),j=add(s,0,'grave',JASHIN),blood=add(s,0,'grave',BLOOD);
 const hand=add(s,0,'hand',NON),enemy=add(s,1,'battle',NON,{tapped:true});
 cast(s,INVASION);pick(s,j.uid);act(s,'play',a=>a.uid===hand.uid);
 act(s,'play',a=>a.uid===blood.uid&&a.manaPermit?.startsWith('g294:'));
 assert.ok(has(s,0,'battle',j)&&has(s,0,'battle',blood));
 assert.equal(e.effectiveCard(blood,s).blocker,true);
 s.phase='attack';
 assert.ok(playerAttack(s,j)&&playerAttack(s,blood)&&!playerAttack(s,hand));
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===j.uid&&a.target===enemy.uid));
 blood.sealed=true;assert.ok(!playerAttack(s,j));blood.sealed=false;
 const loaded=JSON.parse(JSON.stringify(s));
 assert.ok(playerAttack(loaded,j)&&playerAttack(loaded,blood));
});
test('a grave evolution base reconstructed in the same turn can attack the player (QA45141 with Gowalski)',()=>{
 const s=field(),kin=add(s,0,'grave',KIN),blood=add(s,0,'battle',BLOOD);
 cast(s,WORM);pick(s,kin.uid);
 const top=s.players[0].battle.find(x=>x.cardId===WORM);
 assert.equal(top.under[0],kin);
 cast(s,BOUNCE);pick(s,top.uid);
 assert.ok(has(s,0,'battle',kin)&&has(s,0,'hand',top));
 s.phase='attack';assert.ok(playerAttack(s,kin));
 blood.sealed=true;assert.ok(!playerAttack(s,kin));
});
test('Blood Hyper watches only the first allied Abyss attack, after non-Abyss attacks, and revives at most one',()=>{
 const s=field(),blood=add(s,0,'battle',BLOOD),pay=add(s,0,'battle',NON);
 const plain=add(s,0,'battle',NON),first=add(s,0,'battle',ABYSS),second=add(s,0,'battle',ABYSS);
 const eligible=add(s,0,'grave',TWIN),expensive=add(s,0,'grave',HIGH),wrong=add(s,0,'grave',DARK);
 act(s,'hyper',a=>a.uid===blood.uid);pick(s,pay.uid);
 assert.ok(pay.tapped&&blood.hyperActive);
 assert.equal(e.power(blood,false,s),10000);assert.equal(e.effectiveCard(blood,s).breaker,2);
 attack(s,plain.uid);finishAttack(s);assert.equal(s.players[0].grave.length,3);
 attack(s,first.uid);
 assert.equal(s.players[0].grave.length,5);assert.deepEqual(choices(s),[eligible.uid,null]);pick(s,eligible.uid);
 finishAttack(s);attack(s,second.uid);finishAttack(s);
 assert.equal(s.players[0].grave.length,4);
 assert.ok(has(s,0,'battle',eligible)&&has(s,0,'grave',wrong)&&has(s,0,'grave',expensive));
});
test('Blood ignores later Abyss attacks even if the first happened before the watcher entered',()=>{
 const s=field(),first=add(s,0,'battle',ABYSS),second=add(s,0,'battle',ABYSS);
 attack(s,first.uid);finishAttack(s);
 add(s,0,'battle',BLOOD,{hyperActive:true});attack(s,second.uid);finishAttack(s);
 assert.equal(s.players[0].grave.length,0);
});
test('Sumire quotes low-cost visible mana including one eligible twinpact face; ramp is two or none',()=>{
 for(const accept of [true,false]){
  const s=field(),sumire=add(s,0,'hand',SUMIRE);
  give(s,0,'mana',Array(10).fill(HIGH));
  add(s,0,'mana',NON);add(s,0,'mana','dmbd16-009');add(s,0,'mana',NON,{faceDown:true});
  const [a]=e.getLegalActions(s).filter(a=>a.kind==='play'&&a.uid===sumire.uid);
  assert.equal(a.cost,7);e.step(s,a);
  const before=s.players[0].mana.length;
  assert.deepEqual(choices(s),[true,null]);pick(s,accept?true:null);
  assert.equal(s.players[0].mana.length,before+(accept?2:0));
  const c=e.effectiveCard(sumire,s);
  assert.ok(c.machFighter);assert.equal(c.breaker,2);
 }
});
test('Sumire when tapped may put up to three visible low-cost creatures, including tapped mana',()=>{
 for(const n of [0,2,3]){
  const s=field(),sumire=add(s,0,'battle',SUMIRE);
  give(s,0,'mana',[NON,DARK,TWIN,NON,HIGH,'dm01-086']);
  const rows=s.players[0].mana;rows[1].tapped=true;
  const hidden=add(s,0,'mana',NON,{faceDown:true});
  attack(s,sumire.uid);
  assert.deepEqual(new Set(choices(s)),new Set([...rows.slice(0,4).map(x=>x.uid),null]));
  const selected=rows.slice(0,n);
  for(const card of selected)pick(s,card.uid);
  if(n<3)pick(s,null);
  assert.deepEqual(selected.map(c=>has(s,0,'battle',c)),Array(n).fill(true));
  assert.ok(has(s,0,'mana',hidden));
  finishAttack(s);
 }
});
test('Moon and Sun responds to a simultaneous creature break once per copy and expires at the next own start',()=>{
 const s=field(),atk=add(s,1,'battle',DOUBLE),latter=add(s,1,'battle',NON);
 cast(s,MOON);end(s);
 const [ownBefore,enemyBefore]=s.players.map(p=>p.shields.length);
 const chosen=s.players[1].shields[0];
 attack(s,atk.uid);if(s.decision?.type==='block')act(s,'noBlock');act(s,'breakShields');
 assert.equal(s.decision.player,0);
 assert.ok(choices(s).includes(chosen.uid)&&!choices(s).includes(null));pick(s,chosen.uid);drain(s);
 assert.equal(s.players[0].shields.length,ownBefore-2);
 assert.equal(s.players[1].shields.length,enemyBefore-1);
 assert.ok(has(s,1,'grave',chosen)&&!s.triggers);
 end(s);
 assert.ok(!(s.extLimits||[]).some(x=>x.kind==='g1236ShieldRetaliate'));
 end(s);attack(s,latter.uid);finishAttack(s);assert.equal(s.players[1].shields.length,enemyBefore-1);
});
test('Moon and Sun can be used as a trigger, reacting only to a later break',()=>{
 const s=field(1),atk=add(s,1,'battle',NON),later=add(s,1,'battle',NON);
 give(s,0,'shields',[MOON,NON,NON]);const trigger=s.players[0].shields[0];
 s.phase='attack';act(s,'attack',a=>a.uid===atk.uid&&a.shield===trigger.uid);act(s,'noBlock');
 act(s,'useTrigger');drain(s);
 assert.equal(s.players[1].shields.length,5);
 attack(s,later.uid);act(s,'noBlock');
 assert.equal(s.decision.task.source,MOON);pick(s,s.players[1].shields[0].uid);drain(s);
 assert.equal(s.players[1].shields.length,4);
});

test('Moon and Sun does not respond to a spell breaking a shield',()=>{
 const s=field();cast(s,MOON);end(s);
 act(s,'skipCharge');cast(s,'dm26rp1-071');drain(s);
 assert.equal(s.players[0].shields.length,4);
 assert.equal(s.players[1].shields.length,5);
});

test('the first Abyss attack is counted anew each turn',()=>{
 const s=field(),blood=add(s,0,'battle',BLOOD,{hyperActive:true}),first=add(s,0,'battle',ABYSS);
 attack(s,first.uid);finishAttack(s);
 assert.equal(s.players[0].grave.length,2);
 end(s);end(s);
 assert.ok(!blood.hyperActive);act(s,'skipCharge');
 const pay=add(s,0,'battle',NON);
 act(s,'hyper',a=>a.uid===blood.uid);pick(s,pay.uid);
 attack(s,first.uid);finishAttack(s);assert.equal(s.players[0].grave.length,4);
});
