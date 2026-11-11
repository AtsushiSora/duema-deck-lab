import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const BUSTER='dmr21-057',WARUS='dmr21-014',MARIA='dmr21-001',DON='dmr21-s10';
const NATURE='dm01-108',LIGHT='dm01-075',FIRE='dm01-008',MULTI='dm24ex2-019';
const HAND='dm01-027',FIELD='dmrp08-005';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
const value=choice=>choice.value?.uid??choice.value;
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
function field(){
 const s=setup();
 for(const p of [0,1]){give(s,p,'deck',Array(12).fill(NATURE));give(s,p,'grave',[]);}
 return s;
}
function put(s,p,z,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][z].push(x);
 return x;
}
function seal(s,p,x){
 x.sealed=true;
 put(s,p,'seals',NATURE,{faceDown:true,sealOf:x.uid});
}
function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}
function end(s){s.phase='attack';act(s,'endTurn');}

test('Phase 1004 registers four unique official cards and their art',()=>{
 const m=read('tools/support-phase-1004.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[BUSTER,WARUS,MARIA,DON]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const {id,name,faces}=row,[f]=faces,d=details.cards.find(x=>x.id===id),c=e.card(id);
  assert.deepEqual(faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:1004}),row.spec);
  const altered=structuredClone(d);
  altered.faces[0].abilityText+='未知の追加能力。';
  assert.throws(()=>standardCardSpec(altered,{phase:1004}));
  for(const [key,v] of Object.entries(row.spec))assert.deepEqual(c[key],v);
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [name,id===BUSTER?'spell':'creature',f.cost,parseInt(f.powerText,10)||0,f.race,f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-1004');
  assert.equal(CARD_IMAGES[id],row.image);
  assert.ok(catalogue.get(id).supported);
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[id],4);
  assert.deepEqual(refs.filter(x=>x.id===id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
 }
});

test('Buster gives one ally +5000 at rest and adds a third break to its W-Breaker',()=>{
 const s=field(),ally=put(s,0,'battle',FIRE),other=put(s,0,'battle',NATURE),foe=put(s,1,'battle',NATURE);
 const spell=play(s,BUSTER);
 assert.deepEqual(s.decision.choices.map(value).sort(),[ally.uid,other.uid].sort());
 pick(s,ally.uid);
 assert.equal(e.power(ally,false,s),11000);
 assert.equal(e.power(other,false,s),2000);
 assert.equal(e.power(foe,false,s),2000);
 assert.ok(has(s,0,'mana',spell));
 assert.equal(spell.tapped,true);
 assert.ok(!has(s,0,'grave',spell));
 attack(s,ally.uid);
 drain(s);
 assert.equal(s.players[1].shields.length,2);
 end(s);
 assert.equal(e.power(ally,false,s),6000);
 assert.equal(e.effectiveCard(ally,s).extraBreak||0,0);
});

test('Buster still finishes as a tapped Charger with no friendly creatures',()=>{
 const s=field(),spell=play(s,BUSTER);
 assert.equal(s.decision,null);
 assert.ok(has(s,0,'mana',spell));
 assert.equal(spell.tapped,true);
});

for(const n of [2,3])test('Warus counts visible friendly creatures for attack, defense and protection '+n,()=>{
 const s=field(),warus=put(s,0,'battle',WARUS),blocker=put(s,1,'battle',MARIA);
 for(let i=1;i<n;i++)put(s,0,'battle',NATURE);
 seal(s,0,put(s,0,'battle',NATURE));
 put(s,0,'battle',FIELD);
 const active=n===3,def=e.effectiveCard(warus,s);
 assert.equal(!!def.untargetable,active);
 assert.equal(!!def.unblockable,active);
 attack(s,warus.uid);
 assert.equal(s.players[0].hand.length,active?2:0);
 assert.equal(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===blocker.uid),!active);
 if(!active)act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,4);
 s.active=1;s.phase='main';
 play(s,HAND);
 assert.equal(e.getLegalActions(s).some(a=>a.kind==='effect'&&a.targets.some(x=>x.uid===warus.uid)),!active);
 drain(s);
 s.phase='attack';
 assert.equal(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===blocker.uid&&a.target===warus.uid),active);
});

test('Maria taps all non-Light creatures on both sides and has W-Breaker',()=>{
 const s=field(),maria=put(s,0,'battle',MARIA),ally=put(s,0,'battle',NATURE),enemy=put(s,1,'battle',FIRE);
 const light=put(s,0,'battle',LIGHT),multi=put(s,1,'battle',MULTI),nonCreature=put(s,1,'battle',FIELD);
 const sealed=put(s,1,'battle',NATURE);
 seal(s,1,sealed);
 attack(s,maria.uid);
 assert.ok(ally.tapped&&enemy.tapped);
 assert.ok(!light.tapped&&!multi.tapped&&!nonCreature.tapped&&!sealed.tapped);
 drain(s);
 assert.equal(s.players[1].shields.length,3);
});

for(const tapped of [false,true])test('Maria stays in place if untapped when destroyed or bounced '+tapped,()=>{
 for(const spell of [HAND,'dm01-021']){
  const s=field(),maria=put(s,0,'battle',MARIA,{tapped});
  s.active=1;
  play(s,spell);
  if(s.decision?.type==='effect')act(s,'effect',a=>a.targets.some(x=>x.uid===maria.uid));
  else if(s.decision?.type==='extended')pick(s,maria.uid);
  drain(s);
  assert.equal(has(s,0,'battle',maria),!tapped,spell);
 }
});

test('An untapped zero-power Maria stays until it becomes tapped',()=>{
 const s=field(),maria=put(s,0,'battle',MARIA);
 maria.powerModifiers=[{amount:-7000}];
 act(s,'toAttack');
 assert.ok(has(s,0,'battle',maria));
 attack(s,maria.uid);
 drain(s);
 assert.ok(has(s,0,'grave',maria));
});

for(const mode of ['accept','decline','empty'])test('Don moves the whole hand before drawing at its own turn end '+mode,()=>{
 let s=field();
 put(s,0,'battle',DON);
 put(s,1,'battle',DON);
 const oldHand=mode==='empty'?[]:[put(s,0,'hand',DON),put(s,0,'hand',NATURE)];
 const top=s.players[0].deck.slice(0,3).map(x=>x.uid);
 end(s);
 assert.equal(s.decision.player,0);
 assert.match(s.decision.title,/手札.*3枚/);
 s=JSON.parse(JSON.stringify(s));
 if(mode==='decline')pick(s,null);
 else pick(s,true);
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),mode==='decline'?oldHand.map(x=>x.uid):top);
 for(const x of oldHand)assert.equal(has(s,0,'mana',x),mode!=='decline');
 if(mode==='accept'){
  assert.equal(s.players[0].mana.find(x=>x.uid===oldHand[0].uid).tapped,true);
  assert.equal(s.players[0].mana.find(x=>x.uid===oldHand[1].uid).tapped,false);
 }
 assert.equal(s.active,1);
 assert.equal(s.decision,null);
});
