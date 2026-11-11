import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,cast,drain,GEN} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const EN='dmrp08-028',KANI='dmrp06-075',VAI='dmrp05-045',TWIN='dm23ex3-024';
const GREEN='dm01-108',BLUE='dm01-083',DEATH='dm01-027',LOCK='dmrp22-042';
const MADO='dmrp07-076',MADO_SPELL='dmrp07-071',MADO_HEAVY='dmrp06-073';
const GATE='promoy16-104',END_GATE='dm26ex4-004';

const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const inZone=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const pick=(s,predicate)=>act(s,'extended',a=>predicate(s.decision.choices[a.choice].value));
const select=(s,x)=>pick(s,v=>v?.uid===x.uid);
const end=s=>{s.phase='attack';act(s,'endTurn');};

function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(GREEN));
 return s;
}

function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}

test('Phase 972 verifies three canonical cards and both Vaising reprints',()=>{
 const m=read('tools/support-phase-972.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[EN,KANI,VAI]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[['dmsd06-011',VAI],['dmbd08-b-010',VAI]]);
 for(const row of m.cards){
  const {id}=row,f=row.faces[0],d={...row,status:'complete'},c=e.card(id);
  assert.deepEqual(standardCardSpec(d,{phase:972}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:971}));
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'未知の能力。'}]},{phase:972}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   ['creature',f.cost,Number.parseInt(f.powerText,10),f.race,f.civilizations.filter(x=>x!=='無色'),1,4]);
  assert.equal(c.supportBatch,'phase-972');
  assert.equal(CARD_IMAGES[id],row.image);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(r=>nameKey(r.name)===nameKey(row.name)).map(r=>r.id),[id]);
 }
 for(const {id,canonicalId,faces} of m.printAliases){
  assert.deepEqual(catalogue.resolveRows([{id,count:1},{id:canonicalId,count:1}]),[{id:canonicalId,count:2}]);
  assert.deepEqual(standardCardSpec({id,faces,status:'complete'},{phase:972}),m.cards.find(row=>row.id===canonicalId).spec);
 }
 const rows=[...m.cards,...m.printAliases];
 for(const row of rows){
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(refs.filter(r=>r.id===row.id).map(r=>[r.canonicalId,r.image]),[[row.canonicalId??row.id,row.image]]);
 }
});

const ALL=['光','水','闇','火','自然'];
test('Enremen ramps the actual top card and changes only its controller’s Twinpact mana',()=>{
 const s=field(),top=inst(TWIN),other=put(s,0,'mana',GREEN);
 s.players[0].deck.unshift(top);
 put(s,1,'mana',TWIN);
 cast(s,EN);
 assert.equal(s.players[0].mana.at(-1).uid,top.uid);
 assert.equal(s.players[0].mana.at(-1).tapped,false);
 assert.deepEqual(e.manaColors(e.card(top),s,0),ALL);
 assert.deepEqual(e.manaColors(e.card(top),s,1),['自然']);
 assert.deepEqual(e.manaColors(e.card(other),s,0),['自然']);
 assert.equal(e.manaValueAt(s,0,top),1);
 const hidden=put(s,0,'mana',TWIN,{faceDown:true});
 assert.deepEqual(e.manaColors(e.card(hidden),s,0),[]);
});

for(const manualMana of [false,true])test('Enremen supplies water through a Twinpact for payment '+manualMana,()=>{
 let s=field();
 put(s,0,'battle',EN);
 give(s,0,'mana',[TWIN,GREEN]);
 const [twin,green]=s.players[0].mana,blue=put(s,0,'hand',BLUE);
 const action=e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===blue.uid);
 assert.ok(action);
 const before=physical(s);
 e.step(s,action,{manualMana});
 if(manualMana){
  s=restore(s);
  act(s,'selectMana',a=>a.uid===green.uid);
  assert.ok(!e.getLegalActions(s).some(a=>a.kind==='confirmMana'));
  act(s,'selectMana',a=>a.uid===twin.uid);
  act(s,'confirmMana');
 }
 assert.ok(inZone(s,0,'battle',blue));
 assert.ok(s.players[0].mana.every(x=>x.tapped));
 assert.deepEqual(physical(s),before);
});

test('Enremen stops granting civilizations when ignored or when it leaves',()=>{
 const s=field(),x=put(s,0,'battle',EN),blue=put(s,0,'hand',BLUE);
 give(s,0,'mana',[TWIN,GREEN]);
 const canPlay=()=>e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===blue.uid);
 assert.equal(canPlay(),true);
 const gen=put(s,1,'battle',GEN);
 assert.equal(canPlay(),false);
 s.players[1].battle.splice(s.players[1].battle.indexOf(gen),1);
 assert.equal(canPlay(),true);
 s.players[0].battle.splice(s.players[0].battle.indexOf(x),1);
 assert.equal(canPlay(),false);
});

test('Enremen lets Minmei summon a Twinpact from mana using five cards including itself',()=>{
 const s=field();
 put(s,0,'battle',EN);
 put(s,0,'battle','dm24-s05');
 give(s,0,'mana',ALL.map(()=>TWIN));
 const x=s.players[0].mana[0];
 const action=e.getLegalActions(s).find(a=>a.kind==='play'&&a.origin==='mana'&&a.uid===x.uid);
 assert.ok(action);
 assert.equal(action.cost,5);
 e.step(s,action,{manualMana:true});
 assert.deepEqual(s.decision.colors,ALL);
 assert.ok(s.decision.pool.some(y=>y.uid===x.uid));
 for(const y of s.players[0].mana)act(s,'selectMana',a=>a.uid===y.uid);
 act(s,'confirmMana');
 assert.ok(inZone(s,0,'battle',x));
 assert.deepEqual(e.civilizations(e.card(x)),['自然']);
});

test('Kani Nika draws exactly one card when destroyed',()=>{
 const s=field(),x=put(s,0,'battle',KANI),top=s.players[0].deck[0];
 s.active=1;
 cast(s,DEATH);
 act(s,'effect',a=>a.targets[0].uid===x.uid);
 assert.ok(inZone(s,0,'grave',x));
 assert.deepEqual(s.players[0].hand.map(y=>y.uid),[top.uid]);
});

function gateState(id){
 const s=field();
 const kani=put(s,0,'grave',KANI,{zoneSerial:7}),enemy=put(s,1,'grave',KANI);
 put(s,0,'hand',id);
 if(id===GATE){
  put(s,0,'battle',MADO);
  for(let i=0;i<2;i++)put(s,0,'grave',MADO_SPELL);
  cast(s,MADO);
 }else{
  for(let i=0;i<6;i++)put(s,0,'grave',MADO_SPELL);
  end(s);
 }
 return {s,kani,enemy};
}

function useGate(s){
 assert.equal(s.decision?.task?.op,'g4_Declare');
 pick(s,v=>v===true);
 while(s.decision?.task?.op==='g4_Gate')pick(s,v=>v?.uid!==undefined);
}

for(const [id,accept] of [[GATE,true],[GATE,false],[END_GATE,true]])test('Kani Nika can return tapped after actual gate use '+id+' '+accept,()=>{
 let {s,kani,enemy}=gateState(id);
 const before=physical(s);
 useGate(s);
 if(['effectOrder','entryOrder'].includes(s.decision?.type))
  act(s,s.decision.type==='entryOrder'?'orderEntry':'orderEffect',a=>
   (s.triggers?.entries||s.pendingEffects).find(x=>x.effectId===a.effectId)?.task?.op==='g30_Tin');
 assert.match(s.decision.title,/カニ★ニカ/);
 s=restore(s);
 pick(s,v=>accept?v===true:v===null);
 assert.equal(inZone(s,0,'battle',kani),accept);
 assert.equal(inZone(s,0,'grave',kani),!accept);
 if(accept)assert.equal(s.players[0].battle.find(y=>y.uid===kani.uid).tapped,true);
 assert.ok(inZone(s,1,'grave',enemy));
 drain(s);
 assert.deepEqual(physical(s),before);
});

test('Kani Nika stays in the grave on a regular summon of a creature with a gate',()=>{
 const s=field(),kani=put(s,0,'grave',KANI);
 cast(s,GATE);
 drain(s);
 assert.ok(inZone(s,0,'grave',kani));
});

for(const [id,to] of [[MADO,'battle'],[MADO_HEAVY,'hand'],[BLUE,'hand']])test('Vaising uses the printed branch for the chosen creature '+id,()=>{
 let s=field();
 const x=put(s,0,'grave',id),spell=put(s,0,'grave',MADO_SPELL),other=put(s,0,'grave',KANI);
 const before=physical(s);
 cast(s,VAI);
 assert.ok(s.decision.choices.every(c=>c.value?.uid&&c.value.uid!==spell.uid));
 s=restore(s);
 select(s,x);
 assert.ok(inZone(s,0,to,x));
 assert.ok(inZone(s,0,'grave',spell));
 assert.ok(inZone(s,0,'grave',other));
 assert.deepEqual(physical(s).filter(uid=>before.includes(uid)),before);
});

test('Vaising keeps a qualifying card in the grave when entry is forbidden',()=>{
 const s=field(),mado=put(s,0,'grave',MADO);
 put(s,0,'grave',BLUE);
 const lock=data.cards.find(c=>c.g607HandOnly);
 assert.ok(lock);
 put(s,1,'battle',lock.id);
 cast(s,VAI);
 select(s,mado);
 assert.ok(inZone(s,0,'grave',mado));
 assert.ok(!inZone(s,0,'hand',mado));
});

test('Vaising respects a prohibition on moving cards out of the grave',()=>{
 const s=field(),mado=put(s,0,'grave',MADO);
 put(s,1,'battle',LOCK);
 cast(s,VAI);
 assert.ok(inZone(s,0,'grave',mado));
});
