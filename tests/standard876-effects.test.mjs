import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,cast,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const BOX='dmr05-027',ANYA='dmr06-025',FLEECE='dmr09-015',LEMON='dmr07-018';
const SMALL='dm01-108',WATER='dm01-083',LIGHT='dm01-075';
const COLORLESS='dmx13-011',SEED='dmsd20-016',SPELL='dm01-086',TWIN='dmrp12-s01';
const SIGN='dmc44-001',LOCK='dmrp08-014',BIG='dm01-s01';

function field(){
 const s=setup();
 for(const p of [0,1]){
  give(s,p,'deck',Array(12).fill(SMALL));
 }
 return s;
}
function add(s,p,zone,id,props){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
function seal(s,p,x){
 x.sealed=true;
 add(s,p,'seals',SMALL,{sealOf:x.uid});
}
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===(value?.uid??value));
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const restore=s=>JSON.parse(JSON.stringify(s));
test('Phase 876 uses four verified original card IDs and full official definitions',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-876.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[BOX,ANYA,FLEECE,LEMON]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(d.faces,row.faces);
  assert.deepEqual(standardCardSpec(d,{phase:876}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:875}));
  const changed=structuredClone(d);
  changed.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(changed,{phase:876}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.civilizations,c.power,c.race,c.manaValue,c.limit],
   ['creature',f.cost,f.civilizations,Number(f.powerText),f.race,1,4]);
  assert.ok(registry.get(row.id).supported);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);
 }
});



test('Tobibako counts only other live allied copies for its power and extra shield breaks',()=>{
 const s=field(),box=add(s,0,'battle',BOX);
 add(s,1,'battle',BOX);
 seal(s,0,add(s,0,'battle',BOX));
 add(s,0,'grave',BOX);
 assert.equal(e.power(box,false,s),3000);
 const first=add(s,0,'battle',BOX),second=add(s,0,'battle',BOX);
 assert.equal(e.power(box,false,s),9000);
 assert.equal(e.effectiveCard(box,s).extraBreak,2);
 first.sealed=true;
 assert.equal(e.power(box,false,s),6000);
 assert.equal(e.effectiveCard(box,s).extraBreak,1);
 first.sealed=false;
 attack(s,box.uid);
 act(s,'noBlock');
 act(s,'breakShields',a=>a.shields.length===3);
 drain(s);
 assert.equal(s.metrics[0].breaks,3);
 assert.ok(has(s,0,'battle',second));
});

test('Tobibako loses its own bonuses when its ability is ignored',()=>{
 const s=field(),box=add(s,0,'battle',BOX);
 add(s,0,'battle',BOX);
 add(s,1,'battle','dmrp15-km1');
 assert.equal(e.power(box,false,s),3000);
 assert.equal(e.effectiveCard(box,s).extraBreak??0,0);
});

test('Anyaku chooses a spell from either graveyard, including a Twinpact, and chooses its owner’s deck end',()=>{
 for(const [owner,end] of [[0,'deckTop'],[1,'deck']]){
  let s=field();
  const anya=add(s,0,'battle',ANYA),spell=add(s,0,'grave',SPELL),twin=add(s,1,'grave',TWIN);
  const body=add(s,1,'grave',BOX);
  const target=owner===0?spell:twin;
  const deck=s.players[owner].deck.map(x=>x.uid);
  attack(s,anya.uid);
  assert.deepEqual(new Set(values(s)),new Set([spell.uid,twin.uid,null]));
  pick(s,target);
  assert.deepEqual(values(s),['deckTop','deck']);
  assert.equal(s.decision.player,0);
  s=restore(s);
  pick(s,end);
  assert.deepEqual(s.players[owner].deck.map(x=>x.uid),end==='deckTop'?[target.uid,...deck]:[...deck,target.uid]);
  assert.ok(has(s,1,'grave',body));
  assert.equal(s.decision.type,'block');
 }
});

test('Anyaku can decline and a graveyard lock prevents using either graveyard',()=>{
 for(const locked of [false,true]){
  const s=field(),anya=add(s,0,'battle',ANYA);
  const ally=add(s,0,'grave',SPELL),enemy=add(s,1,'grave',TWIN);
  if(locked)for(const p of [0,1])add(s,p,'battle',LOCK,{tapped:true});
  attack(s,anya.uid);
  if(!locked)pick(s,null);
  assert.equal(s.decision.type,'block');
  assert.ok(has(s,0,'grave',ally)&&has(s,1,'grave',enemy));
 }
});

test('Fleece can be shield summoned without mana only with an own unsealed colorless creature',()=>{
 for(const [owner,sealed,expected] of [[0,false,true],[0,true,false],[1,false,false]]){
  const s=field();
  s.active=1;
  give(s,0,'mana',[]);
  give(s,0,'shields',[FLEECE]);
  const fleece=s.players[0].shields[0];
  const colorless=add(s,owner,'battle',COLORLESS);
  if(sealed)seal(s,owner,colorless);
  const attacker=add(s,1,'battle',SMALL),enemy=add(s,1,'battle',WATER,{justDiverActive:true});
  attack(s,attacker.uid);
  act(s,'noBlock');
  assert.equal(e.getLegalActions(s).some(a=>a.kind==='useTrigger'&&a.uid===fleece.uid),expected);
  if(expected){
   act(s,'useTrigger',a=>a.uid===fleece.uid);
   drain(s);
   assert.ok(has(s,0,'battle',fleece));
   assert.ok(!colorless.tapped&&enemy.tapped);
  }else{
   drain(s);
   assert.ok(has(s,0,'hand',fleece));
   assert.ok(!enemy.tapped);
  }
 }
});

test('Fleece taps all enemy creatures on normal and effect entry without any colorless ally (QA 36831)',()=>{
 for(const origin of ['hand','grave']){
  const s=field(),fleece=add(s,0,origin,FLEECE),ally=add(s,0,'battle',LIGHT);
  const enemy=add(s,1,'battle',WATER),sealed=add(s,1,'battle',SMALL);
  seal(s,1,sealed);
  const seed=add(s,1,'battle',SEED);
  if(origin==='hand')act(s,'play',a=>a.uid===fleece.uid);
  else{
   cast(s,SIGN);
   pick(s,fleece);
  }
  assert.ok(has(s,0,'battle',fleece)&&enemy.tapped);
  assert.ok(!ally.tapped&&!sealed.tapped&&!seed.tapped);
  assert.equal(s.decision,null);
 }
});

test('Lemon can be the second summon and offers every amount on the third only (QA 36722)',()=>{
 for(const amount of [0,1,2,3]){
  let s=field();
  cast(s,WATER);
  cast(s,LEMON);
  const first=s.players[0].battle.find(x=>x.cardId===WATER);
  cast(s,SPELL);
  act(s,'effect',a=>a.targets[0].uid===first.uid);
  assert.ok(has(s,0,'hand',first));
  assert.equal(s.g463Summons[0].n,2);
  const third=add(s,0,'hand',BIG),mana=s.players[0].mana.filter(x=>x.tapped).length;
  act(s,'play',a=>a.uid===third.uid);
  assert.deepEqual(values(s),[3,2,1,0,false]);
  s=restore(s);
  pick(s,amount);
  assert.ok(has(s,0,'battle',third));
  assert.equal(s.players[0].mana.filter(x=>x.tapped).length-mana,7-amount);
  assert.equal(e.summonCost(s,0,e.card(BIG)),7);
  assert.equal(s.g463Summons[0].n,3);
 }
});

test('Lemon respects the one-mana floor and ignores non-summon entries',()=>{
 const s=field();
 cast(s,LEMON);
 const dropped=add(s,0,'grave',WATER);
 cast(s,SIGN);
 pick(s,dropped);
 assert.ok(has(s,0,'battle',dropped));
 assert.equal(s.g463Summons[0].n,1);
 assert.equal(e.summonCost(s,0,e.card(SMALL)),2);
 cast(s,WATER);
 const next=add(s,0,'hand',SMALL),before=s.players[0].mana.filter(x=>x.tapped).length;
 assert.equal(e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===next.uid).cost,1);
 act(s,'play',a=>a.uid===next.uid);
 pick(s,3);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length-before,1);
 assert.ok(has(s,0,'battle',next));
 assert.equal(s.g463Summons[0].n,3);
});
