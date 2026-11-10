import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,cast,attack,drain} from './target-fixture.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const HANNYA='dm38-004',EAGLE='dm37-032',MAGMA='dm36-030',GRAVITZ='dm37-002';
const LAND='dm01-108',GIANT_INSECT='dm01-066',AT_LIMIT='dm30-024',OVER_LIMIT='dm36-103';
const EVO='dm02-033',SEED='dm22ex1-086',TRIGGER='dm36-073',XX='dm38-048';
function put(s,p,z,id){
 const x=inst(id);
 s.players[p][z].push(x);
 return x;
}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const choices=s=>s.decision.choices.map(o=>o.value?.uid??o.value);
const pick=(s,v)=>act(s,'extended',a=>choices(s)[a.choice]===v);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const resume=s=>JSON.parse(JSON.stringify(s));
function end(s){s.phase='attack';act(s,'endTurn');}

test('Phase 836 pins four official definitions and maps all three alternate pages to existing IDs',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-836.json',import.meta.url)));
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[HANNYA,EAGLE,MAGMA,GRAVITZ]);
 assert.deepEqual(m.printAliases.map(x=>x.id),['dmc67-010','dm37-032VC','dm36-030VC']);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),f=d.faces[0];
  assert.deepEqual(row.faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:836}),row.spec);
  assert.deepEqual([c.name,c.cost,c.power,c.race,c.manaValue,c.limit],[f.name,f.cost,Number(f.powerText),f.race,1,4]);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.ok(row.verification.facesMatched);
  assert.deepEqual(data.cards.filter(x=>x.name===c.name).map(x=>x.id),[row.id]);
  const unknown=structuredClone(d);unknown.faces[0].abilityText+='未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:836}));
 }
 for(const row of m.printAliases){
  const canonical=m.cards.find(c=>c.id===row.canonicalId);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:836}),canonical.spec);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1},{id:canonical.id,count:3}]),[{id:canonical.id,count:4}]);
  assert.equal(m.regulationVerification.limits[row.id],4);
 }
});

test('Hannya evolves on an allied Giant Insect and moves eligible creatures and evolution bases to their owners’ mana',()=>{
 let s=setup();
 const hannya=put(s,0,'hand',HANNYA),base=put(s,0,'battle',GIANT_INSECT),ally=put(s,0,'battle',AT_LIMIT);
 const enemy=put(s,1,'battle',AT_LIMIT),large=put(s,1,'battle',OVER_LIMIT),seed=put(s,1,'battle',SEED);
 const evolution=put(s,1,'battle',EVO),layer=inst(LAND);evolution.under=[layer];
 const before=physical(s);
 act(s,'play',a=>a.uid===hannya.uid);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[base.uid]);
 s=resume(s);act(s,'evolve',a=>a.baseUid===base.uid);drain(s);
 assert.equal(s.players[0].battle.find(x=>x.uid===hannya.uid).under[0].uid,base.uid);
 assert.ok(has(s,0,'mana',ally)&&has(s,1,'mana',enemy)&&has(s,1,'mana',evolution)&&has(s,1,'mana',layer));
 assert.ok(has(s,1,'battle',large)&&has(s,1,'battle',seed));
 assert.deepEqual(physical(s),before);
 attack(s,hannya.uid);drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('Hannya uses live power and requires a legal Giant evolution base',()=>{
 const s=setup(),hannya=put(s,0,'hand',HANNYA),small=put(s,0,'battle',LAND);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===hannya.uid));
 const base=put(s,0,'battle',OVER_LIMIT);
 const raised=put(s,1,'battle',AT_LIMIT),lowered=put(s,1,'battle',OVER_LIMIT);
 raised.powerModifiers=[{amount:1000}];lowered.powerModifiers=[{amount:-3000}];
 act(s,'play',a=>a.uid===hannya.uid);act(s,'evolve',a=>a.baseUid===base.uid);drain(s);
 assert.ok(has(s,0,'mana',small)&&has(s,1,'mana',lowered)&&has(s,1,'battle',raised));
});

for(const discount of [0,1,4])test('Eagle lets its owner choose the Double Cross discount and respects the one-mana floor '+discount,()=>{
 const s=setup();
 for(let i=0;i<(discount===4?4:1);i++)put(s,0,'battle',EAGLE);
 const summon=put(s,0,'hand',XX);
 act(s,'play',a=>a.uid===summon.uid);
 pick(s,discount);drain(s);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,Math.max(1,4-discount));
 assert.ok(has(s,0,'battle',summon));
});

test('Eagle checks all the verified Double Cross readings and excludes Triple Cross, Phoenix, and Twenty-Two',()=>{
 const s=setup();
 put(s,0,'battle',EAGLE);
 const ids=['dm24rp4-040','dm24rp4-004','dm38-003','dmd08-018',XX,'dm24rp4-019','dmr16g-004','dmrp13-001','dmrp18-km3',LAND];
 const rows=ids.map(id=>put(s,0,'hand',id));
 for(const [i,row] of rows.entries()){
  const action=e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===row.uid&&!a.alternative);
  assert.ok(action,row.cardId);
  assert.equal(action.cost,e.card(row.cardId).cost-Number(i<6),row.cardId);
 }
});

test('Eagle grants speed only to allied Flame Commands while present',()=>{
 const s=setup(),eagle=put(s,0,'battle',EAGLE),flame=put(s,0,'battle','dm24rp4-004');
 const foe=put(s,1,'battle','dm24rp4-004'),other=put(s,0,'battle',XX);
 flame.entered=foe.entered=other.entered=s.turn;
 assert.equal(e.effectiveCard(flame,s).speedAttacker,true);
 for(const row of [foe,other,eagle])assert.ok(!e.effectiveCard(row,s).speedAttacker);
 s.phase='attack';assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===flame.uid));
 s.players[0].battle=s.players[0].battle.filter(x=>x!==eagle);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===flame.uid));
});

for(const target of ['self','ally','decline'])test('Magma attacks immediately and can return an allied creature at its own turn end '+target,()=>{
 const s=setup(),ally=put(s,0,'battle',LAND),enemy=put(s,1,'battle',LAND),seed=put(s,0,'battle',SEED);
 cast(s,MAGMA);
 const magma=s.players[0].battle.find(x=>x.cardId===MAGMA);
 attack(s,magma.uid);drain(s);
 assert.equal(s.players[1].shields.length,3);
 end(s);
 assert.deepEqual(choices(s),[ally.uid,magma.uid,null]);
 const selected=target==='self'?magma:target==='ally'?ally:null;
 pick(s,selected?.uid??null);drain(s);
 assert.equal(has(s,0,'hand',magma),target==='self');
 assert.equal(has(s,0,'hand',ally),target==='ally');
 assert.ok(has(s,1,'battle',enemy)&&has(s,0,'battle',seed));
 end(s);assert.equal(s.decision,null);
});

test('Gravitz lets the opponent destroy their new creature and does not retrigger for the second entry',()=>{
 const s=setup();put(s,0,'battle',GRAVITZ);
 const old=put(s,1,'battle',LAND);
 s.active=1;cast(s,SEED);drain(s);
 cast(s,LAND);
 const first=s.players[1].battle.at(-1);
 assert.equal(s.decision.player,1);assert.deepEqual(choices(s),[old.uid,first.uid]);
 pick(s,first.uid);drain(s);assert.ok(has(s,1,'grave',first));
 cast(s,LAND);assert.equal(s.decision,null);
 assert.equal(s.players[1].battle.filter(x=>x.cardId===LAND).length,2);
});

test('Gravitz reacts to an opposing Shield Trigger entry on its own turn and resets next turn',()=>{
 const s=setup(),gravitz=put(s,0,'battle',GRAVITZ);
 give(s,1,'shields',[TRIGGER,LAND,LAND]);
 const trigger=s.players[1].shields[0];
 attack(s,gravitz.uid);act(s,'noBlock');
 act(s,'breakShields',a=>a.shields.includes(trigger.uid));
 act(s,'useTrigger');pick(s,trigger.uid);drain(s);
 assert.ok(has(s,1,'grave',trigger));
 assert.equal(s.players[1].shields.length,1);
 end(s);drain(s);s.phase='main';
 cast(s,LAND);
 assert.equal(s.decision.player,1);pick(s,s.players[1].battle.at(-1).uid);drain(s);
 assert.equal(s.players[1].battle.length,0);
});
