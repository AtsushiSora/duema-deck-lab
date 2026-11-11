import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,cast,drain,attack} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const SPIRAL='dmrp03-038',TUNE='dmrp03-051',DOBER='dmrp08-022',REPRINT='dmsd11-012';
const WATER='dm01-083',FIRE='dm01-097',NATURE='dm01-108',DUAL='dmr04-048',CHUZA='dm20-031',GENMU='dmrp15-km1';
const TOOL='dmrp05-078',TOOL_SPELL='dmrp07-071',TRIGGER='dmrp07-070',SIGN='dmc44-001',GRAVE_LOCK='dmrp08-014';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const value=c=>c.value?.uid??c.value;
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
const alternate=(s,x)=>act(s,'play',a=>a.uid===x.uid&&a.role==='tapCast976');
const paid=(s,x)=>act(s,'play',a=>a.uid===x.uid&&!a.alternative);

function field(){
 const s=setup();
 for(const p of [0,1]){give(s,p,'deck',Array(20).fill(NATURE));give(s,p,'grave',[]);}
 return s;
}

function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}

test('Phase 976 registers three canonical cards and the Synchro Spiral reprint',()=>{
 const m=read('tools/support-phase-976.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[SPIRAL,TUNE,DOBER]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[[REPRINT,SPIRAL]]);
 assert.deepEqual(catalogue.resolveRows([{id:REPRINT,count:1},{id:SPIRAL,count:2}]),[{id:SPIRAL,count:3}]);
 for(const row of m.cards){
  const {id,name}=row,f=row.faces[0],d={...row,status:'complete'},c=e.card(id);
  assert.deepEqual(standardCardSpec(d,{phase:976}),row.spec);
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'未知の能力。'}]},{phase:976}));
  for(const [key,v] of Object.entries(row.spec))assert.deepEqual(c[key],v);
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [name,id===DOBER?'creature':'spell',f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-976');
  assert.equal(CARD_IMAGES[id],row.image);
  assert.ok(catalogue.get(id).supported);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(r=>nameKey(r.name)===nameKey(name)).map(r=>r.id),[id]);
 }
 const print=m.printAliases[0];
 assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:976}),m.cards[0].spec);
 for(const row of [...m.cards,print]){
  assert.ok(row.verification.facesMatched);
  assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(refs.filter(r=>r.id===row.id).map(r=>[r.canonicalId,r.image]),[[row.canonicalId??row.id,row.image]]);
 }
});

test('Spiral pays two different untapped allied water creatures, including a newly summoned one',()=>{
 let s=field();
 give(s,0,'mana',[]);
 const fresh=put(s,0,'battle',WATER,{entered:s.turn}),multi=put(s,0,'battle',DUAL);
 const tapped=put(s,0,'battle',WATER,{tapped:true}),sealed=put(s,0,'battle',WATER,{sealed:true});
 put(s,0,'seals',NATURE,{sealOf:sealed.uid,faceDown:true});
 const fire=put(s,0,'battle',FIRE),enemy=put(s,1,'battle',WATER),spell=put(s,0,'hand',SPIRAL);
 const ids=physical(s);
 alternate(s,spell);
 assert.deepEqual(s.decision.choices.map(value),[fresh.uid,multi.uid,null]);
 pick(s,fresh.uid);
 assert.equal(fresh.tapped,false);
 assert.deepEqual(s.decision.choices.map(value),[multi.uid,null]);
 s=restore(s);
 pick(s,multi.uid);
 assert.deepEqual(s.decision.choices.map(value),[enemy.uid]);
 pick(s,enemy.uid);
 assert.ok(has(s,1,'hand',enemy));
 assert.ok(has(s,0,'grave',spell));
 assert.deepEqual(s.players[0].battle.filter(x=>x.tapped).map(x=>x.uid),[fresh.uid,multi.uid,tapped.uid]);
 assert.ok(has(s,0,'battle',sealed)&&has(s,0,'battle',fire));
 assert.equal(s.noManaUse[0],true);
 assert.deepEqual(physical(s),ids);
});

test('Declining the second tap returns to normal play with neither creature tapped',()=>{
 const s=field(),a=put(s,0,'battle',WATER),b=put(s,0,'battle',WATER),spell=put(s,0,'hand',SPIRAL);
 alternate(s,spell);
 pick(s,a.uid);
 pick(s,null);
 assert.equal(a.tapped,false);
 assert.equal(b.tapped,false);
 assert.ok(has(s,0,'hand',spell));
 assert.equal(s.decision,null);
});

test('Spiral also casts for three mana with no creature tapped',()=>{
 const s=field(),a=put(s,0,'battle',WATER),b=put(s,0,'battle',WATER);
 const enemy=put(s,1,'battle',FIRE),spell=put(s,0,'hand',SPIRAL);
 paid(s,spell);
 pick(s,enemy.uid);
 assert.ok(has(s,1,'hand',enemy));
 assert.equal(a.tapped,false);
 assert.equal(b.tapped,false);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,3);
});

test('Ignored spells and prohibited casts cannot offer the tap cost',()=>{
 for(const [id,attrs] of [[GENMU,{}],[CHUZA,{tapped:true}]]){
  const s=field(),a=put(s,0,'battle',WATER),b=put(s,0,'battle',WATER),spell=put(s,0,'hand',SPIRAL);
  put(s,1,'battle',id,attrs);
  assert.ok(!e.getLegalActions(s).some(x=>x.uid===spell.uid&&x.role==='tapCast976'));
  assert.equal(a.tapped||b.tapped,false);
 }
});

test('Tune still resolves when tapping Chuza to pay, then discards before drawing',()=>{
 const s=field(),a=put(s,0,'battle',CHUZA),b=put(s,0,'battle',FIRE);
 const discarded=put(s,0,'hand',NATURE),spell=put(s,0,'hand',TUNE);
 const next=s.players[0].deck.slice(0,2);
 const ids=physical(s);
 alternate(s,spell);
 pick(s,a.uid);
 pick(s,b.uid);
 drain(s);
 assert.ok(a.tapped&&b.tapped);
 assert.ok(has(s,0,'grave',discarded));
 assert.ok(has(s,0,'grave',spell));
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),next.map(x=>x.uid));
 assert.ok(!s.players[0].mana.some(x=>x.tapped));
 assert.deepEqual(physical(s),ids);
});

test('Tune draws two after a normal cast from an otherwise empty hand',()=>{
 const s=field(),spell=put(s,0,'hand',TUNE);
 paid(s,spell);
 drain(s);
 assert.equal(s.players[0].hand.length,2);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,3);
 assert.ok(has(s,0,'grave',spell));
});

test('Dober offers after an allied Magic Tool summon but its deployment is not a summon',()=>{
 let s=field();
 const dober=put(s,0,'grave',DOBER),other=put(s,0,'grave',DOBER),tool=put(s,0,'hand',TOOL);
 const ids=physical(s);
 paid(s,tool);
 for(let n=0;s.decision&&s.decision.task?.op!=='g34_Offer';n++){
  assert.ok(n<8);
  e.step(s,e.chooseAI(s));
 }
 assert.ok(has(s,0,'battle',tool));
 s=restore(s);
 const first=s.decision.task.uid;
 pick(s,true);
 if(s.decision?.type==='effectOrder'){
  const second=s.pendingEffects.find(x=>x.source===DOBER&&x.uid!==first);
  assert.ok(second);
  act(s,'orderEffect',a=>a.effectId===second.effectId);
 }
 assert.notEqual(s.decision.task.uid,first);
 pick(s,null);
 drain(s);
 assert.equal([dober,other].filter(x=>has(s,0,'battle',x)).length,1);
 assert.equal(s.decision,null);
 assert.deepEqual(physical(s),ids);
});

test('Dober offers after its own Magic Tool spell resolves',()=>{
 const s=field(),dob=put(s,0,'grave',DOBER),discarded=put(s,0,'hand',NATURE);
 cast(s,TOOL_SPELL);
 assert.equal(s.players[0].hand.length,3);
 assert.ok(has(s,0,'grave',dob));
 for(let n=0;s.decision&&s.decision.task?.op!=='g34_Offer';n++){
  assert.ok(n<6);
  e.step(s,e.chooseAI(s));
 }
 assert.equal(s.players[0].hand.length,2);
 assert.equal(s.decision.task.uid,dob.uid);
 pick(s,true);
 assert.ok(has(s,0,'battle',dob));
 assert.equal(s.players[0].hand.length,2);
 assert.ok(physical(s).includes(discarded.uid));
});

test('Dober discarded by the spell itself waits for a subsequent Magic Tool use',()=>{
 const s=field(),dob=put(s,0,'hand',DOBER);
 cast(s,TOOL_SPELL);
 pick(s,dob.uid);
 assert.ok(has(s,0,'grave',dob));
 assert.equal(s.decision,null);
 cast(s,TRIGGER);
 assert.equal(s.decision.task.uid,dob.uid);
 pick(s,true);
 assert.ok(has(s,0,'battle',dob));
});

test('Dober ignores another player, non-Magic Tool cards and Magic Tools put into play by effects',()=>{
 const s=field(),dob=put(s,0,'grave',DOBER),tool=put(s,0,'grave',TOOL);
 cast(s,NATURE);
 assert.equal(s.decision,null);
 cast(s,SIGN);
 pick(s,tool.uid);
 drain(s);
 assert.ok(has(s,0,'battle',tool));
 assert.ok(has(s,0,'grave',dob));
 s.active=1;
 cast(s,TOOL);
 drain(s);
 assert.ok(has(s,0,'grave',dob));
 cast(s,TRIGGER);
 drain(s);
 assert.ok(has(s,0,'grave',dob));
});

test('Dober does not leave a locked graveyard',()=>{
 const s=field(),dob=put(s,0,'grave',DOBER);
 put(s,1,'battle',GRAVE_LOCK);
 cast(s,TOOL_SPELL);
 drain(s);
 assert.ok(has(s,0,'grave',dob));
 assert.equal(s.decision,null);
});

test('Dober watches an allied Magic Tool shield-trigger spell on the opposing turn',()=>{
 const s=field(),dob=put(s,0,'grave',DOBER),source=put(s,1,'battle',FIRE);
 give(s,0,'shields',[TRIGGER]);
 s.active=1;
 attack(s,source.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.cardId===TRIGGER);
 for(let n=0;s.decision&&s.decision.task?.op!=='g34_Offer';n++){
  assert.ok(n<12);
  e.step(s,e.chooseAI(s));
 }
 assert.equal(s.decision.task.uid,dob.uid);
 pick(s,true);
 drain(s);
 assert.ok(has(s,0,'battle',dob));
 assert.ok(has(s,1,'hand',source));
});
