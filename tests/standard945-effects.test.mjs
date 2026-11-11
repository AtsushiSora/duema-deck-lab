import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const NOTICE='dm31-046',YES='dm31-019',SPIRAL='dm32-047',DRAG='dm32-s07';
const YES_PRINTS=['dmc64-027','dmx14-046','dmx22a-019','dmex15-b078','dmex17-w15'];
const DRAG_PRINT='dmc62-009',PLAIN='dm01-108',SMALL='dm01-098',BIG='dm01-s01';
const STEALTH='dmrp01-041',SPELL='dm01-027',BOUNCE='dm01-086',EVO='dm02-024',BASE='dm01-080';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===(v?.uid??v));
const legal=(s,k,pred=()=>true)=>e.getLegalActions(s).some(a=>a.kind===k&&pred(a));
const restore=s=>JSON.parse(JSON.stringify(s));

function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1]){give(s,p,'deck',Array(18).fill(PLAIN));give(s,p,'grave',[]);}
 return s;
}

function put(s,p,z,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][z].push(x);
 return x;
}

function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}

function cross(s,gear,host){
 act(s,'crossGear',a=>a.uid===gear.uid&&a.target===host.uid&&a.cost===2);
}

function shields(s,n){
 act(s,'noBlock');
 act(s,'breakShields',a=>a.shields.length===n);
 drain(s);
}

test('Phase 945 verifies four battle definitions and six reprints at their canonical IDs',()=>{
 const m=read('tools/support-phase-945.json'),refs=read('tools/image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[NOTICE,YES,SPIRAL,DRAG]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[...YES_PRINTS.map(id=>[id,YES]),[DRAG_PRINT,DRAG]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0],original=m.cards.find(x=>x.id===id);
  const printed={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(printed,{phase:945}),original.spec);
  assert.throws(()=>standardCardSpec({...printed,faces:[{...f,abilityText:f.abilityText+'\n未知の能力。'}]},{phase:945}));
  for(const [k,v] of Object.entries(original.spec))assert.deepEqual(c[k],v);
  assert.deepEqual([c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [id===YES?'gear':id===NOTICE?'spell':'creature',f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-945');
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  assert.deepEqual(cat.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
 }
 const cards=[NOTICE,YES_PRINTS[0],SPIRAL,DRAG_PRINT,PLAIN,SMALL,BIG,BASE,EVO,SPELL].map(id=>({id,count:4}));
 assert.deepEqual(e.validateDeck({name:'クロスギアと究極進化',cards:cat.resolveRows(cards)}),[]);
 assert.equal(cat.coverage({cards}).unsupported,0);
 assert.deepEqual(cat.resolveRows([{id:YES,count:2},{id:YES_PRINTS[4],count:2}]),[{id:YES,count:4}]);
});

test('Notice destroys a unique opposing minimum even if it cannot be chosen',()=>{
 const s=field(),ally=put(s,0,'battle',SMALL),small=put(s,1,'battle',STEALTH),big=put(s,1,'battle',BIG);
 play(s,NOTICE);
 assert.equal(s.decision,null);
 assert.ok(has(s,1,'grave',small)&&has(s,1,'battle',big)&&has(s,0,'battle',ally));
});

for(const protectedCount of [0,1,2])test('Notice filters untargetable creatures only after finding the tied minimum '+protectedCount,()=>{
 let s=field(),first=put(s,1,'battle',protectedCount>0?STEALTH:PLAIN);
 const second=put(s,1,'battle',protectedCount===2?STEALTH:PLAIN),big=put(s,1,'battle',BIG);
 play(s,NOTICE);
 if(protectedCount<2){
  assert.deepEqual(values(s),protectedCount===0?[first.uid,second.uid]:[second.uid]);
  s=restore(s);
  pick(s,second);
 }
 assert.equal(s.decision,null);
 assert.equal(has(s,1,'grave',second),protectedCount<2);
 assert.ok(has(s,1,'battle',first)&&has(s,1,'battle',big));
});

test('Notice can be cast for free from a shield and compares the current attacking power',()=>{
 const s=field(1),attacker=put(s,1,'battle',SMALL),second=put(s,1,'battle',PLAIN);
 give(s,0,'mana',[]);give(s,0,'shields',[NOTICE,PLAIN]);
 attack(s,attacker.uid);act(s,'noBlock');
 if(legal(s,'breakShields'))act(s,'breakShields',x=>x.shields.includes(s.players[0].shields[0].uid));
 act(s,'useTrigger',x=>x.cardId===NOTICE);
 assert.ok(has(s,1,'grave',second)&&has(s,1,'battle',attacker));
 assert.equal(s.players[0].mana.length,0);
});

test('Notice resolves without targets when only friendly creatures are in the battle zone',()=>{
 const s=field(),x=put(s,0,'battle',PLAIN);
 play(s,NOTICE);
 assert.equal(s.decision,null);
 assert.ok(has(s,0,'battle',x));
});

test('All Yes enters mana tapped and crossing costs two mana after generating it',()=>{
 const s=field(),mana=put(s,0,'hand',YES),host=put(s,0,'battle',PLAIN),other=put(s,0,'battle',PLAIN);
 s.phase='charge';act(s,'charge',a=>a.uid===mana.uid);
 assert.ok(has(s,0,'mana',mana)&&mana.tapped);
 const before=s.players[0].mana.filter(x=>x.tapped).length;
 const gear=play(s,YES);
 assert.equal(e.power(host,false,s),2000);
 assert.ok(!e.effectiveCard(host,s).blocker);
 cross(s,gear,host);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,before+4);
 assert.equal(e.power(host,false,s),6000);
 assert.equal(e.effectiveCard(host,s).blocker,true);
 assert.equal(e.power(other,false,s),2000);
 assert.ok(!e.effectiveCard(other,s).blocker);
 s.active=1;
 const attacker=put(s,1,'battle',PLAIN);
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===host.uid);drain(s);
 assert.ok(has(s,1,'grave',attacker)&&has(s,0,'battle',host));
});

test('All Yes stays after the crossed host leaves and can be crossed to another creature',()=>{
 const s=field(),host=put(s,0,'battle',PLAIN),next=put(s,0,'battle',PLAIN);
 const gear=play(s,YES);cross(s,gear,host);
 play(s,BOUNCE);act(s,'effect',a=>a.targets.some(t=>t.uid===host.uid));
 assert.ok(has(s,0,'hand',host)&&has(s,0,'battle',gear));
 assert.equal(gear.crossedTo,undefined);
 cross(s,gear,next);
 assert.equal(e.effectiveCard(next,s).blocker,true);
});

test('All Yes grants Blocker only while both abilities are live and owns the power and blind discard',()=>{
 let s=field();
 const host=put(s,0,'battle',PLAIN),gear=play(s,YES),a=put(s,1,'hand',PLAIN),b=put(s,1,'hand',SPELL);
 cross(s,gear,host);
 gear.g35Ignored=s.turn;
 assert.equal(e.power(host,false,s),2000);
 assert.ok(!e.effectiveCard(host,s).blocker);
 delete gear.g35Ignored;
 host.g35Ignored=s.turn;
 assert.equal(e.power(host,false,s),6000);
 assert.ok(!e.effectiveCard(host,s).blocker);
 attack(s,host.uid);
 assert.equal(s.decision.source,YES);
 assert.deepEqual(values(s),[0,1]);
 assert.ok(s.decision.choices.every(x=>!x.cardId&&x.label.startsWith('裏向き')));
 s=restore(s);
 pick(s,1);
 assert.ok(has(s,1,'hand',a)&&has(s,1,'grave',b));
 assert.equal(s.players[1].hand.length,1);
 assert.equal(s.decision.type,'block');
});

for(const [id,n] of [[SPIRAL,2],[DRAG,3]])test(id+' requires an allied evolution base and has the printed breaker',()=>{
 const s=field(),x=put(s,0,'hand',id),normal=put(s,0,'battle',BASE);
 put(s,1,'battle',EVO,{under:[inst(BASE)]});
 assert.ok(!legal(s,'play',a=>a.uid===x.uid));
 const base=put(s,0,'battle',EVO,{under:[inst(BASE)]});
 act(s,'play',a=>a.uid===x.uid);
 assert.ok(!legal(s,'evolve',a=>a.baseUid===normal.uid));
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.ok(has(s,0,'battle',x));
 assert.equal(x.under[0].uid,base.uid);
 attack(s,x.uid);
 if(id===SPIRAL)pick(s,null);
 shields(s,n);
 assert.equal(s.players[1].shields.length,5-n);
});

for(const target of ['ally','opponent','self'])test('Spiral Moon may return a creature from either side, including itself '+target,()=>{
 const s=field(),base=inst(EVO),x=put(s,0,'battle',SPIRAL,{under:[base]});
 const ally=put(s,0,'battle',PLAIN),opponent=put(s,1,'battle',PLAIN);
 attack(s,x.uid);
 const selected={ally,opponent,self:x}[target];
 pick(s,selected);
 assert.ok(has(s,target==='opponent'?1:0,'hand',selected));
 if(target==='self'){
  assert.ok(has(s,0,'hand',base));
  assert.equal(s.attack,null);
 }else assert.ok(has(s,0,'battle',x));
});

for(const n of [0,1,2])test('Drag Moon destroys up to two chosen opposing creatures within the live 6000 limit '+n,()=>{
 let s=field();
 const x=put(s,0,'battle',DRAG),ally=put(s,0,'battle',PLAIN);
 const six=put(s,1,'battle',PLAIN,{powerModifiers:[{amount:4000,expires:'end',who:s.active}]}),low=put(s,1,'battle',PLAIN);
 const tooBig=put(s,1,'battle',PLAIN,{powerModifiers:[{amount:5000,expires:'end',who:s.active}]}),protectedOne=put(s,1,'battle',STEALTH);
 assert.deepEqual([e.power(six,false,s),e.power(tooBig,false,s)],[6000,7000]);
 attack(s,x.uid);
 assert.deepEqual(values(s),[six.uid,low.uid,null]);
 if(n){pick(s,six);s=restore(s);}
 if(n===2)pick(s,low);else pick(s,null);
 assert.equal(has(s,1,'grave',six),n>0);
 assert.equal(has(s,1,'grave',low),n===2);
 assert.ok(has(s,1,'battle',tooBig)&&has(s,1,'battle',protectedOne)&&has(s,0,'battle',ally));
});
