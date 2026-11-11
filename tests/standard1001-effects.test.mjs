import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const PAN='dmr18-040',ROSE='dmr19-053',PEN='dmr18-004',MIKE='dmr18-019';
const DARK='dm01-090',FIRE='dm01-097',WATER='dm01-083',NATURE='dm01-108';
const EVO='dmr17-010',DARK_EVO='dmr17-041',LIGHT_EVO='dm32-073',NEO='promoy24-070';
const LIGHT_7='dmr13-001',LIGHT_9='dmr18-045',FIELD='dmrp08-005',HAND='dm01-027',SHARK='dm01-018',GIFT='dm14-069';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
const value=c=>c.value?.uid??c.value;
const choices=s=>s.decision.choices.map(value);
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
const tapped=s=>s.players[0].mana.filter(x=>x.tapped).length;
const shown=s=>s.log.filter(l=>l.type==='reveal'&&l.source===PAN);
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
function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}
const end=s=>{s.phase='attack';act(s,'endTurn');drain(s);};

test('Phase 1001 registers exactly four unique official cards and no reprints',()=>{
 const m=read('tools/support-phase-1001.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[PAN,ROSE,PEN,MIKE]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const {id,name,faces}=row,[f]=faces,d=details.cards.find(x=>x.id===id),c=e.card(id);
  assert.deepEqual(faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:1001}),row.spec);
  const altered=structuredClone(d);
  altered.faces[0].abilityText+='未知の追加能力。';
  assert.throws(()=>standardCardSpec(altered,{phase:1001}));
  for(const [key,v] of Object.entries(row.spec))assert.deepEqual(c[key],v);
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [name,'creature',f.cost,parseInt(f.powerText,10),f.race,f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-1001');
  assert.equal(CARD_IMAGES[id],row.image);
  assert.ok(catalogue.get(id).supported);
  assert.ok(row.verification.facesMatched);
  assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);
  assert.equal(m.regulationVerification.limits[id],4);
  assert.deepEqual(refs.filter(x=>x.id===id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
 }
});

test('Panchow reveals a true evolution for exactly two and combines with Gift at the one-mana floor',()=>{
 let s=field();
 play(s,GIFT);
 const evo=put(s,0,'hand',EVO);
 put(s,0,'hand',NEO);put(s,0,'grave',EVO);
 const source=play(s,PAN);
 assert.deepEqual(choices(s),[evo.uid,null,false]);
 pick(s,evo.uid);
 assert.deepEqual(choices(s),[2,false]);
 assert.equal(shown(s).length,0);
 s=JSON.parse(JSON.stringify(s));pick(s,2);drain(s);
 assert.ok(has(s,0,'battle',source)&&has(s,0,'hand',evo));
 assert.deepEqual(shown(s).map(x=>x.cardId),[EVO]);
 assert.equal(tapped(s),2);
});

test('Panchow can decline to reveal and pays five without showing the Evolution',()=>{
 const s=field(),evo=put(s,0,'hand',EVO);
 const source=play(s,PAN);
 pick(s,null);drain(s);
 assert.equal(tapped(s),5);
 assert.equal(shown(s).length,0);
 assert.ok(has(s,0,'battle',source)&&has(s,0,'hand',evo));
});

function destroy(s,target){
 play(s,HAND);
 act(s,'effect',a=>a.targets.some(x=>x.uid===target.uid));
}

for(const count of [2,3])test('Rose draws on entry and its death deploys an eligible Light creature at '+count+' shields',()=>{
 const s=field(),rose=play(s,ROSE),drawn=s.players[0].hand[0];
 assert.ok(drawn&&drawn.cardId===NATURE);
 give(s,0,'shields',Array(count).fill(NATURE));
 s.players[0].shields[0].shieldStack=[inst(NATURE)];
 const eligible=put(s,0,'hand',LIGHT_7),wrong=[
  put(s,0,'hand',LIGHT_EVO),put(s,0,'hand',LIGHT_9),put(s,0,'hand',WATER)
 ];
 s.active=1;destroy(s,rose);
 assert.ok(has(s,0,'grave',rose));
 if(count===2){
  assert.deepEqual(choices(s),[eligible.uid,null]);
  pick(s,eligible.uid);
  assert.ok(has(s,0,'battle',eligible));
 }else{
  assert.equal(s.decision,null);
  assert.ok(has(s,0,'hand',eligible));
 }
 assert.ok(wrong.every(x=>has(s,0,'hand',x)));
});

test('Rose does not deploy a creature when it leaves without being destroyed',()=>{
 const s=field(),rose=play(s,ROSE),eligible=put(s,0,'hand',LIGHT_7);
 give(s,0,'shields',[NATURE,NATURE]);
 s.active=1;play(s,'dm01-021');
 pick(s,rose.uid);drain(s);
 assert.ok(has(s,0,'hand',rose)&&has(s,0,'hand',eligible));
});

for(const count of [2,3])test('Penicillin sweeps only opposing creatures at '+count+' shields',()=>{
 const s=field(),friend=put(s,0,'battle',DARK),first=put(s,1,'battle',WATER,{justDiverActive:true});
 const second=put(s,1,'battle',EVO,{under:[inst(NATURE)]}),other=put(s,1,'battle',FIELD);
 give(s,0,'shields',Array(count).fill(NATURE));
 s.players[0].shields[0].shieldStack=[inst(NATURE),inst(NATURE)];
 const pen=play(s,PEN);
 assert.equal(e.effectiveCard(pen,s).breaker,2);
 assert.ok(has(s,0,'battle',friend)&&has(s,1,'battle',other));
 assert.ok([first,second].every(x=>has(s,1,count===2?'hand':'battle',x)));
});

test('Penicillin offers a separate optional draw for each opposing creature entry',()=>{
 const s=field();play(s,PEN);play(s,WATER);
 assert.equal(s.decision,null);
 s.active=1;play(s,FIELD);
 assert.equal(s.decision,null);
 const top=s.players[0].deck[0];play(s,WATER);
 assert.equal(s.decision.player,0);
 assert.deepEqual(choices(s),[0,1]);pick(s,1);
 assert.ok(has(s,0,'hand',top));
 play(s,DARK);pick(s,0);
 assert.equal(s.players[0].hand.length,1);
});

test('Mikenyanko offers only eligible grave creatures and can decline',()=>{
 const s=field(),eligible=put(s,0,'grave',DARK),wrong=[
  put(s,0,'grave',DARK_EVO),put(s,0,'grave',ROSE),put(s,0,'grave',MIKE),put(s,0,'grave',HAND)
 ];
 play(s,MIKE);
 assert.deepEqual(choices(s),[eligible.uid,null]);
 pick(s,null);
 assert.ok(!s.g537Delays?.some(x=>x.source===MIKE));
 end(s);
 assert.ok([eligible,...wrong].every(x=>has(s,0,'grave',x)));
});

test('Mikenyanko can enter from a shield and destroys the evolved creature on the next opposing turn',()=>{
 let s=field();
 const revived=put(s,0,'grave',DARK),evo=put(s,0,'hand',DARK_EVO),attacker=put(s,1,'battle',NATURE);
 give(s,0,'shields',[MIKE]);const mike=s.players[0].shields[0];
 s.active=1;attack(s,attacker.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 if(e.getLegalActions(s).some(a=>a.kind==='breakShields'))act(s,'breakShields');
 act(s,'useTrigger',a=>a.uid===mike.uid);
 assert.deepEqual(choices(s),[revived.uid,null]);
 pick(s,revived.uid);
 assert.ok(has(s,0,'battle',mike)&&has(s,0,'battle',revived));
 end(s);
 assert.equal(s.active,0);
 assert.ok(has(s,0,'battle',revived));
 act(s,'skipCharge');act(s,'play',a=>a.uid===evo.uid);act(s,'evolve',a=>a.baseUid===revived.uid);
 assert.deepEqual(evo.under.map(x=>x.uid),[revived.uid]);
 s=JSON.parse(JSON.stringify(s));end(s);
 assert.equal(s.active,1);
 assert.ok(has(s,0,'grave',evo)&&has(s,0,'grave',revived)&&has(s,0,'battle',mike));
});

test('Mikenyanko does not destroy the same physical card after it leaves and enters again',()=>{
 const s=field(),revived=put(s,0,'grave',DARK);
 play(s,MIKE);pick(s,revived.uid);
 play(s,SHARK);drain(s);
 assert.ok(has(s,0,'hand',revived));
 act(s,'play',a=>a.uid===revived.uid);
 end(s);
 assert.ok(has(s,0,'battle',revived));
});

test('Mikenyanko creates the delayed destruction independently of its own presence',()=>{
 const s=field(),revived=put(s,0,'grave',DARK),mike=play(s,MIKE);
 pick(s,revived.uid);
 s.active=1;destroy(s,mike);s.active=0;
 assert.ok(has(s,0,'grave',mike)&&has(s,0,'battle',revived));
 end(s);
 assert.equal(s.active,1);
 assert.ok(has(s,0,'grave',revived));
});
