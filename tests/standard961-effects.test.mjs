import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,cast} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const TRAP='dm19-028',REPRINT='dmx08-009',VANGUARD='dm31-009',FLAIL='dm04-022';
const PLAIN='dm01-108',DREAM='dm34-052',MIXED_DREAM='dm32-106',KNIGHT='dm31-040';
const DARK_SPELL='dm01-027',DARK_CREATURE='dm20-044',MULTICOLOR='dmex13-076',LIGHT_SPELL='dm01-015';
const TWIN='dmex17-111',STRIKE='dmrp20-017';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const values=s=>(s.decision?.choices??[]).map(x=>x.value?.uid??x.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);
const zone=(s,p,z)=>s.players[p][z].map(x=>x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const triggers=s=>e.getLegalActions(s).filter(a=>a.kind==='useTrigger').map(a=>a.uid);

function field(active=0){
 const s=setup();
 s.active=active;
 for(const p of [0,1]){
  give(s,p,'deck',Array(16).fill(PLAIN));
  give(s,p,'grave',[]);
 }
 return s;
}

function put(s,p,z,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][z].push(x);
 return x;
}

function attack(s,x,target='player'){
 s.phase='attack';
 act(s,'attack',a=>a.uid===x.uid&&a.target===target);
}

function breakOnlyShield(s){
 const attacker=put(s,s.active,'battle',PLAIN);
 attack(s,attacker);
 act(s,'noBlock');
}

test('Phase 961 verifies three official identities and preserves the Trap Commune reprint alias',()=>{
 const m=read('tools/support-phase-961.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(r=>r.id),[TRAP,VANGUARD,FLAIL]);
 assert.deepEqual(m.printAliases.map(r=>[r.id,r.canonicalId]),[[REPRINT,TRAP]]);
 for(const row of m.cards){
  const {id}=row,c=e.card(id),d=details.cards.find(x=>x.id===id),f=d.faces[0];
  assert.deepEqual(d.faces,row.faces);
  assert.deepEqual(standardCardSpec(d,{phase:961}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:960}));
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'未知の能力。'}]},{phase:961}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.race,e.civilizations(c),c.manaValue,c.limit],
   [id===TRAP?'spell':'creature',f.cost,f.race,f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-961');
  assert.equal(row.verification.facesMatched,true);
  assert.equal(m.regulationVerification.limits[id],4);
  assert.equal(CARD_IMAGES[id],row.image);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(r=>nameKey(r.name)===nameKey(row.name)).map(r=>r.id),[id]);
 }
 for(const row of [...m.cards,...m.printAliases]){
  assert.equal(row.verification.facesMatched,true);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(refs.filter(r=>r.id===row.id).map(r=>[r.canonicalId,r.image]),[[row.canonicalId??row.id,row.image]]);
 }
 assert.deepEqual(catalogue.resolveRows([{id:REPRINT,count:2},{id:TRAP,count:1}]),[{id:TRAP,count:3}]);
});

test('Trap Commune destroys the chosen exact race together, then chooses up to the same number of opponents',()=>{
 let s=field();
 const ally1=put(s,0,'battle',DREAM),ally2=put(s,0,'battle',MIXED_DREAM),ally3=put(s,0,'battle',DREAM);
 const other=put(s,0,'battle',PLAIN),foe1=put(s,1,'battle',KNIGHT),foe2=put(s,1,'battle',FLAIL),foe3=put(s,1,'battle',DREAM);
 const spell=put(s,0,'hand',TRAP),before=physical(s);
 act(s,'play',a=>a.uid===spell.uid);
 assert.equal(s.decision.task.op,'g34_ChooseRace724');
 pick(s,'ドリームメイト');
 assert.deepEqual(values(s),[ally1.uid,ally2.uid,ally3.uid,null]);
 pick(s,ally1.uid);
 assert.deepEqual(zone(s,0,'battle'),[ally1.uid,ally2.uid,ally3.uid,other.uid]);
 pick(s,ally2.uid);
 s=JSON.parse(JSON.stringify(s));
 pick(s,null);
 assert.deepEqual(zone(s,0,'battle'),[ally3.uid,other.uid]);
 assert.deepEqual(values(s),[foe1.uid,foe2.uid,foe3.uid,null]);
 pick(s,foe1.uid);
 assert.deepEqual(zone(s,1,'battle'),[foe1.uid,foe2.uid,foe3.uid]);
 pick(s,foe2.uid);
 assert.deepEqual(zone(s,1,'battle'),[foe3.uid]);
 assert.deepEqual(zone(s,0,'grave'),[ally1.uid,ally2.uid,spell.uid]);
 assert.deepEqual(physical(s),before);
});

test('Trap Commune counts a selected creature whose destruction is replaced',()=>{
 const s=field(),protectedAlly=put(s,0,'battle',DREAM,{g26Stay:true}),foe=put(s,1,'battle',PLAIN);
 cast(s,TRAP);
 pick(s,'ドリームメイト');
 pick(s,protectedAlly.uid);
 assert.deepEqual(zone(s,0,'battle'),[protectedAlly.uid]);
 assert.deepEqual(values(s),[foe.uid,null]);
 pick(s,foe.uid);
 assert.deepEqual(zone(s,1,'grave'),[foe.uid]);
});

test('Trap Commune allows zero at either selection and permits a race absent from the battlefield',()=>{
 for(const mode of ['absent','no ally','no opponent']){
  const s=field(),ally=put(s,0,'battle',DREAM),foe=put(s,1,'battle',PLAIN);
  cast(s,TRAP);
  pick(s,mode==='absent'?'ナイト':'ドリームメイト');
  if(mode==='no ally')pick(s,null);
  if(mode==='no opponent'){pick(s,ally.uid);pick(s,null);}
  assert.equal(s.decision,null);
  assert.deepEqual(zone(s,0,'battle'),mode==='no opponent'?[]:[ally.uid]);
  assert.deepEqual(zone(s,1,'battle'),[foe.uid]);
 }
});

test('Trap Commune can be cast from a broken shield and uses the shield owner’s creatures',()=>{
 const s=field();
 const ally=put(s,1,'battle',MIXED_DREAM);
 give(s,1,'shields',[TRAP]);
 const [shield]=s.players[1].shields;
 give(s,1,'mana',[]);
 breakOnlyShield(s);
 const [foe]=s.players[0].battle;
 assert.deepEqual(triggers(s),[shield.uid]);
 act(s,'useTrigger');
 assert.equal(s.decision.player,1);
 pick(s,'ドリームメイト');
 pick(s,ally.uid);
 pick(s,foe.uid);
 assert.deepEqual(zone(s,1,'grave'),[ally.uid,shield.uid]);
 assert.deepEqual(zone(s,0,'grave'),[foe.uid]);
});

test('Vanguard evolves on a Knight and can draw once on a declared attack with three graveyard spells',()=>{
 for(const take of [true,false]){
  const s=field(),base=put(s,0,'battle',KNIGHT),other=put(s,0,'battle',DREAM);
  give(s,0,'grave',[DARK_SPELL,TWIN,TRAP,PLAIN]);
  const before=s.players[0].deck[0].uid,creature=put(s,0,'hand',VANGUARD);
  act(s,'play',a=>a.uid===creature.uid);
  assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[base.uid]);
  act(s,'evolve',a=>a.baseUid===base.uid);
  assert.equal(creature.under[0].uid,base.uid);
  assert.equal(e.effectiveCard(creature,s).breaker,2);
  assert.ok(zone(s,0,'battle').includes(other.uid));
  attack(s,creature);
  assert.equal(s.decision.task.op,'g34_Draw');
  pick(s,take?1:0);
  assert.deepEqual(zone(s,0,'hand'),take?[before]:[]);
  assert.equal(s.decision.type,'block');
  act(s,'noBlock');
  assert.equal(s.decision.type,'breakChoice');
  assert.equal(s.decision.count,2);
 }
});

test('Vanguard ignores other graveyards and non-spells, including before a creature-targeted attack',()=>{
 for(const enough of [false,true]){
  const s=field(1),creature=put(s,1,'battle',VANGUARD,{under:[inst(KNIGHT)]}),victim=put(s,0,'battle',DREAM,{tapped:true});
  give(s,0,'grave',[TRAP,DARK_SPELL,TWIN]);
  give(s,1,'grave',[TRAP,TWIN,enough?DARK_SPELL:PLAIN]);
  attack(s,creature,victim.uid);
  assert.equal(s.decision?.task?.op,enough?'g34_Draw':undefined);
  if(enough)pick(s,0);
  assert.equal(s.decision.type,'block');
  act(s,'noBlock');
  assert.deepEqual(zone(s,0,'grave').slice(-1),[victim.uid]);
 }
});

for(const holder of [0,1])for(const shieldId of [DARK_SPELL,DARK_CREATURE,MULTICOLOR,LIGHT_SPELL])
 test('Flail blocks only Darkness trigger faces with holder '+holder+' and shield '+shieldId,()=>{
  const s=field();
  put(s,holder,'battle',FLAIL);
  give(s,1,'shields',[shieldId]);
  const [shield]=s.players[1].shields;
  breakOnlyShield(s);
  assert.deepEqual(triggers(s),shieldId===LIGHT_SPELL?[shield.uid]:[]);
  assert.deepEqual(zone(s,1,'hand'),[shield.uid]);
 });

test('Flail leaves G Strike available and does not prevent paying for a Darkness trigger spell from hand',()=>{
 const s=field(),flail=put(s,1,'battle',FLAIL);
 give(s,1,'shields',[STRIKE]);
 breakOnlyShield(s);
 assert.equal(s.decision.task.op,'gsDeclare');
 pick(s,false);
 s.phase='main';
 const spell=put(s,0,'hand',DARK_SPELL);
 act(s,'play',a=>a.uid===spell.uid);
 act(s,'effect',a=>a.targets.some(x=>x.uid===flail.uid));
 assert.deepEqual(zone(s,0,'grave'),[spell.uid]);
 assert.deepEqual(zone(s,1,'grave'),[flail.uid]);
});

test('An ignored Flail does not prevent either side from using Darkness triggers',()=>{
 for(const holder of [0,1]){
  const s=field();
  put(s,holder,'battle',FLAIL,{g35Ignored:s.turn});
  give(s,1,'shields',[TRAP]);
  const [shield]=s.players[1].shields;
  breakOnlyShield(s);
  assert.deepEqual(triggers(s),[shield.uid]);
 }
});
