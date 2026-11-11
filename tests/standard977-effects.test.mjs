import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,cast,drain,attack} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const HIYOKU='dmrp03-035',HAZURE='dmrp04s-057',ZAFIVO='dmrp08-019';
const NEO='dmrp01-087',GREEN='dm01-108',WATER='dm01-083',FIRE='dm01-097';
const TUNE='dmrp03-051',SPIRAL='dmrp03-038',NEW_WORLD='dmrp08-005',DIVE='dmrp05-004';
const TRIGGER='dm01-027',SURFER='dm05-024',GENMU='dmrp15-km1',JAO='dm24rp4-DM1';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const value=c=>c.value?.uid??c.value;
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
const decline=s=>pick(s,s.decision.choices.find(x=>!x.value).value);

function field(){
 const s=setup();
 for(const p of [0,1]){give(s,p,'deck',Array(20).fill(GREEN));give(s,p,'grave',[]);}
 return s;
}

function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}

test('Phase 977 pins three canonical names, four reprints and the Zafivo correction',()=>{
 const m=read('tools/support-phase-977.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[HIYOKU,HAZURE,ZAFIVO]);
 const aliases=['dmrp04m-040','dmex03-062','dmex03-063','dmex08-128'];
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),aliases.map(id=>[id,HAZURE]));
 assert.deepEqual(catalogue.resolveRows(aliases.map(id=>({id,count:10}))),[{id:HAZURE,count:40}]);
 assert.deepEqual(e.validateDeck({name:'はずれポンの助',cards:[{id:HAZURE,count:40}]}),[]);
 assert.match(m.cards[2].errata.abilityText,/手札から/);
 assert.equal(e.card(ZAFIVO).text,m.cards[2].errata.abilityText);
 assert.equal(catalogue.get(ZAFIVO).faces[0].abilityText,m.cards[2].errata.abilityText);
 for(const row of m.cards){
  const {id,name}=row,f=row.faces[0],d={...row,status:'complete'},c=e.card(id);
  assert.deepEqual(standardCardSpec(d,{phase:977}),row.spec);
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'未知の能力。'}]},{phase:977}));
  for(const [key,v] of Object.entries(row.spec))assert.deepEqual(c[key],v);
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [name,id===ZAFIVO?'spell':'creature',f.cost,Number(f.powerText),f.race,f.civilizations.filter(x=>x!=='無色'),1,id===HAZURE?40:4]);
  assert.equal(c.supportBatch,'phase-977');
  assert.equal(CARD_IMAGES[id],row.image);
  assert.ok(catalogue.get(id).supported);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(r=>nameKey(r.name)===nameKey(name)).map(r=>r.id),[id]);
 }
 for(const row of [...m.cards,...m.printAliases]){
  assert.ok(row.verification.facesMatched);
  assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(refs.filter(r=>r.id===row.id).map(r=>[r.canonicalId,r.image]),[[row.canonicalId??row.id,row.image]]);
  if(row.canonicalId)assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:977}),m.cards[1].spec);
 }
});

test('Hiyoku becomes a base of an allied NEO creature of another civilization',()=>{
 let s=field();
 const h=put(s,0,'hand',HIYOKU),neo=put(s,0,'battle',NEO,{entered:s.turn});
 put(s,0,'battle',GREEN);put(s,1,'battle',NEO);
 const before=physical(s);
 cast(s,TUNE);
 pick(s,h.uid);
 assert.equal(s.decision.type,'extended');
 assert.deepEqual(s.decision.choices.map(value),[neo.uid,false]);
 s=restore(s);
 pick(s,neo.uid);
 const host=s.players[0].battle.find(x=>x.uid===neo.uid);
 assert.equal(host.under[0].uid,h.uid);
 assert.ok(e.isEvolution(host));
 assert.ok(!has(s,0,'grave',h)&&!has(s,0,'hand',h));
 assert.equal(s.players[0].hand.length,2);
 assert.equal(s.phase,'main');
 assert.deepEqual(physical(s).filter(uid=>before.includes(uid)),before);
});

test('Hiyoku can be discarded normally, and ignores opposing and sealed NEO creatures',()=>{
 for(const valid of [true,false]){
  const s=field(),h=put(s,0,'hand',HIYOKU);
  if(valid)put(s,0,'battle',NEO);
  else{
   const sealed=put(s,0,'battle',NEO,{sealed:true});
   put(s,0,'seals',GREEN,{sealOf:sealed.uid,faceDown:true});
   put(s,1,'battle',NEO);
  }
  cast(s,TUNE);
  pick(s,h.uid);
  if(valid)decline(s);
  assert.ok(has(s,0,'grave',h));
  assert.equal(s.players[0].hand.length,2);
 }
});

test('Hiyoku can choose its NEO host when the opposing Jao discards it',()=>{
 const s=field(),neo=put(s,0,'battle',NEO),h=put(s,0,'hand',HIYOKU);
 const hand=[put(s,0,'hand',GREEN),put(s,0,'hand',WATER)];
 give(s,0,'shields',[]);
 s.active=1;
 cast(s,JAO);
 for(const x of hand)pick(s,x.uid);
 assert.match(s.decision.title,/NEO/);
 pick(s,neo.uid);
 drain(s);
 assert.equal(neo.under[0].uid,h.uid);
 assert.ok(e.isEvolution(neo));
 assert.ok(!has(s,0,'grave',h));
});

test('Hazure can attack a player without breaking shields even when granted a breaker',()=>{
 const s=field(),x=put(s,0,'battle',HAZURE,{g34Grants:[{turn:1,breaker:2,extraBreak:1}]});
 attack(s,x.uid);
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,5);
 assert.ok(x.tapped);
 assert.equal(s.winner,null);
});

test('Hazure can still battle a creature and win a direct attack',()=>{
 const s=field(),x=put(s,0,'battle',HAZURE),enemy=put(s,1,'battle',WATER,{tapped:true});
 attack(s,x.uid,enemy.uid);
 act(s,'noBlock');
 drain(s);
 assert.ok(has(s,0,'grave',x));
 assert.ok(has(s,1,'battle',enemy));
 const y=put(s,0,'battle',HAZURE);
 give(s,1,'shields',[]);
 attack(s,y.uid);
 act(s,'noBlock');
 assert.equal(s.winner,0);
});

for(const id of [TRIGGER,SURFER])test('Hazure suppresses its controller’s shield trigger '+id,()=>{
 const s=field(),source=put(s,1,'battle',FIRE);
 put(s,0,'battle',HAZURE);
 give(s,0,'shields',[id]);
 s.active=1;
 attack(s,source.uid);
 act(s,'noBlock');
 assert.ok(s.players[0].hand.some(x=>x.cardId===id));
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='useTrigger'));
});

test('Hazure leaves the opponent’s shield triggers available and loses its restrictions under Genmu',()=>{
 for(const ignored of [false,true]){
  const s=field(),source=put(s,1,'battle',FIRE);
  put(s,ignored?0:1,'battle',HAZURE);
  if(ignored)put(s,1,'battle',GENMU);
  give(s,0,'shields',[SURFER]);
  s.active=1;
  attack(s,source.uid);
  act(s,'noBlock');
  assert.ok(e.getLegalActions(s).some(a=>a.kind==='useTrigger'));
 }
});

test('Zafivo draws first and offers only eligible water noncreatures from hand',()=>{
 let s=field();
 const drawn=put(s,0,'deck',SPIRAL),enemy=put(s,1,'battle',FIRE);
 s.players[0].deck.unshift(s.players[0].deck.pop());
 const spell=put(s,0,'hand',ZAFIVO),permanent=put(s,0,'hand',NEW_WORLD);
 put(s,0,'hand',WATER);put(s,0,'hand',TUNE);put(s,0,'hand',DIVE);
 put(s,0,'mana',SPIRAL);put(s,0,'grave',SPIRAL);
 const all=physical(s);
 act(s,'play',a=>a.uid===spell.uid);
 assert.ok(has(s,0,'hand',drawn));
 assert.deepEqual(s.decision.choices.map(value),[permanent.uid,drawn.uid,null]);
 s=restore(s);
 pick(s,drawn.uid);
 pick(s,enemy.uid);
 assert.ok(has(s,1,'hand',enemy)&&has(s,0,'grave',drawn)&&has(s,0,'grave',spell));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,4);
 assert.deepEqual(physical(s),all);
});

test('Zafivo can deploy New World and is then placed under the new field per QA40424',()=>{
 const s=field(),newWorld=put(s,0,'hand',NEW_WORLD),spell=put(s,0,'hand',ZAFIVO);
 act(s,'play',a=>a.uid===spell.uid);
 pick(s,newWorld.uid);
 drain(s);
 assert.ok(has(s,0,'battle',newWorld));
 assert.ok(e.physicalCards(s).some(x=>x.uid===spell.uid));
 assert.ok(!has(s,0,'grave',spell));
 assert.ok(newWorld.under?.some(x=>x.uid===spell.uid));
 assert.equal(s.players[0].hand.length,3);
});
