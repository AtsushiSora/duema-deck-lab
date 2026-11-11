import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,cast,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const VOCH='dmr20-034',ZABEL='dmrp21-060',YOICHI='dm23ex1-077';
const BODY='dm01-108',BLACK_SEED='dm22ex1-086',LIGHT_SEED='dmsd20-013',MILL_SEED='dm22ex2-067';
const GEAR='dm28-033',CHEAP_GEAR='dm14-110',APUL='dmrp22-042',DIAMOND='dmrp22-027',GENMU='dmrp15-km1';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const paid=(s,p)=>s.players[p].mana.filter(x=>x.tapped).length;
const find=(s,p,zone,uid)=>s.players[p][zone].find(x=>x.uid===uid);
const plays=(s,x,origin)=>e.getLegalActions(s).filter(a=>a.kind==='play'&&a.uid===x.uid&&
 (origin===undefined||(a.origin||'hand')===origin));
const choose=(s,value)=>act(s,'extended',a=>s.decision.choices[a.choice].value===value);
function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
function deploy(s,x,p=0){
 s.extTasks=[{op:'putCreature',p,source:x.cardId,origin:'hand',uid:x.uid}];
 act(s,'toAttack');
}

test('Phase 978 verifies full definitions, official art, unrestricted copies, and original deck IDs',()=>{
 const m=read('tools/support-phase-978.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[VOCH,ZABEL,YOICHI]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const {id,name}=row,detail=details.cards.find(x=>x.id===id),c=e.card(id),f=row.faces[0];
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(standardCardSpec(detail,{phase:978}),row.spec);
  assert.throws(()=>standardCardSpec({...detail,faces:[{...f,abilityText:f.abilityText+'未知の能力。'}]},{phase:978}));
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [name,'creature',f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
  assert.equal(m.regulationVerification.limits[id],4);
  assert.equal(row.verification.facesMatched,true);
  assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);
  assert.equal(CARD_IMAGES[id],row.image);
  assert.deepEqual(refs.filter(x=>x.id===id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  assert.ok(catalogue.get(id).supported);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id,count:1});
  assert.deepEqual(e.validateDeck({...deck,cards:catalogue.resolveRows(deck.cards)}),[]);
 }
});

test('Voch pays five from the grave exactly at the inclusive threshold and remains a normal hand summon',()=>{
 let s=setup();
 give(s,0,'shields',[BODY,BODY]);
 const grave=put(s,0,'grave',VOCH),hand=put(s,0,'hand',VOCH),other=put(s,0,'grave',BODY);
 put(s,0,'battle',BODY);
 put(s,0,'battle',BODY,{sealed:true});
 put(s,0,'battle',BLACK_SEED);
 put(s,1,'battle',BODY);
 assert.equal(plays(s,grave,'grave').length,0);
 assert.equal(plays(s,hand,'hand')[0].cost,5);
 put(s,0,'battle',BODY);
 assert.equal(plays(s,grave,'grave')[0].cost,5);
 assert.equal(plays(s,other,'grave').length,0);
 s=restore(s);
 act(s,'play',a=>a.uid===grave.uid&&a.origin==='grave');
 assert.equal(paid(s,0),5);
 assert.equal(find(s,0,'battle',grave.uid).summonedTurn,s.turn);
 assert.ok(!find(s,0,'grave',grave.uid));
});

test('Voch can summon with zero creatures and shields and respects source zone, mana and grave restrictions',()=>{
 for(const mode of ['available','mana','faceDown','locked','wrongMana']){
  const s=setup();
  give(s,0,'shields',[]);
  const x=put(s,0,mode==='mana'?'mana':'grave',VOCH,{faceDown:mode==='faceDown'});
  if(mode==='locked')put(s,1,'battle',APUL);
  if(mode==='wrongMana')give(s,0,'mana',Array(5).fill(BODY));
  assert.equal(plays(s,x).length,mode==='available'?1:0,mode);
 }
});

test('Voch can summon two copies in the same turn when both are legal',()=>{
 const s=setup();
 give(s,1,'shields',[]);
 s.active=1;
 const first=put(s,1,'grave',VOCH),second=put(s,1,'grave',VOCH);
 for(const x of [first,second])act(s,'play',a=>a.uid===x.uid&&a.origin==='grave');
 assert.equal(paid(s,1),10);
 assert.deepEqual(s.players[1].battle.map(x=>x.uid),[first.uid,second.uid]);
});

test('Zabel optionally returns for its own Dark seed on either turn, including direct deployment',()=>{
 for(const active of [0,1]){
  let s=setup();
  s.active=active;
  const zabel=put(s,0,'grave',ZABEL);
  if(active===0)cast(s,BLACK_SEED);
  else deploy(s,put(s,0,'hand',BLACK_SEED));
  assert.equal(s.decision?.player,0);
  assert.equal(s.decision?.task?.uid,zabel.uid);
  s=restore(s);
  choose(s,true);
  assert.ok(find(s,0,'battle',zabel.uid));
  assert.equal(find(s,0,'battle',zabel.uid).summonedTurn,undefined);
  assert.ok(!find(s,0,'grave',zabel.uid));
  assert.equal(paid(s,0),active===0?3:0);
 }
});

test('Zabel only sees its own Dark seeds and skips a source milled by the seed’s entry ability',()=>{
 for(const [id,p] of [[BLACK_SEED,1],[LIGHT_SEED,0],[VOCH,0]]){
  const s=setup(),x=put(s,0,'grave',ZABEL);
  s.active=p;
  cast(s,id);
  drain(s);
  assert.ok(find(s,0,'grave',x.uid));
 }
 const s=setup(),x=inst(ZABEL);
 give(s,0,'deck',[BODY,BODY,BODY]);
 s.players[0].deck.unshift(x);
 cast(s,MILL_SEED);
 assert.equal(s.decision,null);
 assert.ok(find(s,0,'grave',x.uid));
});

test('Zabel choices are independent and validate the same visit to the grave',()=>{
 let s=setup();
 const first=put(s,0,'grave',ZABEL,{zoneSerial:7}),second=put(s,0,'grave',ZABEL);
 cast(s,BLACK_SEED);
 assert.equal(s.decision.type,'effectOrder');
 const pending=s.pendingEffects.find(x=>x.uid===first.uid);
 act(s,'orderEffect',a=>a.effectId===pending.effectId);
 s=restore(s);
 find(s,0,'grave',first.uid).zoneSerial++;
 choose(s,true);
 assert.equal(s.decision?.task?.uid,second.uid);
 choose(s,null);
 assert.ok(find(s,0,'grave',first.uid));
 assert.ok(find(s,0,'grave',second.uid));
});

test('Zabel respects the existing grave movement ban',()=>{
 const s=setup(),x=put(s,0,'grave',ZABEL);
 put(s,1,'battle',APUL);
 cast(s,BLACK_SEED);
 assert.equal(s.decision,null);
 assert.ok(find(s,0,'grave',x.uid));
});

test('Yoichi stacks on generation and the subsequent paid cross uses the full cost',()=>{
 let s=setup();
 const first=put(s,0,'battle',YOICHI),second=put(s,0,'battle',YOICHI),gear=put(s,0,'hand',GEAR);
 first.tapped=true;
 put(s,1,'battle',YOICHI);
 assert.equal(plays(s,gear)[0].cost,2);
 s=restore(s);
 act(s,'play',a=>a.uid===gear.uid);
 assert.equal(paid(s,0),2);
 const cross=e.getLegalActions(s).find(a=>a.kind==='crossGear'&&a.uid===gear.uid&&a.target===second.uid);
 assert.equal(cross.cost,4);
 e.step(s,cross);
 assert.equal(paid(s,0),6);
 assert.equal(find(s,0,'battle',gear.uid).crossedTo.uid,second.uid);
});

test('Yoichi applies to non-Samurai gear and preserves a one-mana floor and civilization payment',()=>{
 const s=setup();
 give(s,0,'battle',[YOICHI,YOICHI]);
 const cheap=put(s,0,'hand',CHEAP_GEAR),creature=put(s,0,'hand',BODY);
 assert.equal(plays(s,cheap)[0].cost,1);
 assert.equal(plays(s,creature)[0].cost,2);
 give(s,0,'mana',['dm01-097']);
 assert.equal(plays(s,cheap).length,0);
 give(s,0,'mana',[BODY]);
 act(s,'play',a=>a.uid===cheap.uid);
 assert.equal(paid(s,0),1);
});

test('Yoichi stops reducing when ignored, sealed, or off the battlefield',()=>{
 for(const mode of ['ignored','sealed','grave','opponent','reductionBan']){
  const s=setup(),gear=put(s,0,'hand',GEAR);
  put(s,mode==='opponent'?1:0,mode==='grave'?'grave':'battle',YOICHI,{sealed:mode==='sealed'});
  if(mode==='ignored')put(s,1,'battle',GENMU);
  if(mode==='reductionBan')put(s,1,'battle',DIAMOND);
  assert.equal(plays(s,gear)[0].cost,4,mode);
 }
});
