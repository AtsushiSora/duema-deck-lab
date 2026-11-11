import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const YO='dmr21-006',GENE='dmr21-024',CATASTROPHE='dmr22-004';
const NATURE='dm01-108',ONE='dmrp19-094',WATER='dm01-083',TWIN='dmrp06-006',SPELL='dm01-027';
const DARK_DRAGON='dmr15-042',FIRE_DRAGON='dmr21-005',FIELD='dmr21-036',MULTI='dm24ex2-019';
const BLOCKER='dm01-001',COMPLEX='dm23rp4-S02',LOCK='dmrp08-014',GENMU='dmrp15-km1';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
const value=c=>c.value?.uid??c.value;
const choices=s=>s.decision?.choices?.map(value)??[];
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function field(){
 const s=setup();
 for(const p of [0,1]){give(s,p,'deck',Array(22).fill(NATURE));give(s,p,'grave',[]);}
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
function seal(s,p,x){
 x.sealed=true;
 (s.players[p].seals??=[]).push({...inst(NATURE),sealOf:x.uid,faceDown:true});
 return x;
}
const manaPlay=(s,x)=>e.getLegalActions(s).find(a=>a.kind==='play'&&a.origin==='mana'&&a.uid===x.uid);

test('Phase 1011 pins three official single prints, characteristics, art and limits',()=>{
 const m=read('tools/support-phase-1011.json'),refs=read('tools/image-reference-prints.json').prints;
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[YO,GENE,CATASTROPHE]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const {id,name,faces}=row,[f]=faces,d=details.cards.find(x=>x.id===id),c=e.card(id);
  assert.deepEqual(faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:1011}),row.spec);
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'未知の能力。'}]},{phase:1011}));
  for(const [key,v] of Object.entries(row.spec))assert.deepEqual(c[key],v);
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [name,'creature',f.cost,parseInt(f.powerText,10),f.race,f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-1011');
  assert.equal(CARD_IMAGES[id],row.image);
  assert.ok(registry.get(id).supported&&row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[id],4);
  assert.deepEqual(refs.filter(x=>x.id===id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  for(const source of [data,details,snapshot])
   assert.deepEqual(source.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
 }
});

test('Yo grants paid summons from mana even without a field and can pay with the entering card itself',()=>{
 const s=field();
 put(s,0,'battle',YO);
 give(s,0,'mana',[ONE]);
 const [one]=s.players[0].mana;
 assert.equal(manaPlay(s,one)?.cost,1);
 const before=physical(s);
 act(s,'play',a=>a.origin==='mana'&&a.uid===one.uid);
 drain(s);
 assert.ok(has(s,0,'battle',one)&&!one.tapped&&!has(s,0,'mana',one));
 assert.deepEqual(physical(s),before);
});

test('Yo limits mana summons to visible cost-one creatures and loses the permission when ignored',()=>{
 const s=field(),yo=put(s,0,'battle',YO);
 const eligible=put(s,0,'mana',ONE),wrongCost=put(s,0,'mana',NATURE);
 const faceDown=put(s,0,'mana',ONE,{faceDown:true}),spell=put(s,0,'mana',SPELL);
 assert.ok(manaPlay(s,eligible));
 for(const x of [wrongCost,faceDown,spell])assert.ok(!manaPlay(s,x));
 put(s,1,'battle',GENMU);
 assert.ok(e.abilitiesIgnored(s,yo)&&!manaPlay(s,eligible));
});

test('Yo counts other current natural creatures with an own D2 field, including another Yo',()=>{
 const s=field(),a=put(s,0,'battle',YO),b=put(s,0,'battle',YO);
 put(s,0,'battle',MULTI);
 put(s,0,'battle',WATER);
 seal(s,0,put(s,0,'battle',NATURE));
 seal(s,0,put(s,0,'battle',FIELD));
 put(s,1,'battle',NATURE);
 put(s,1,'battle',FIELD);
 assert.equal(e.power(a,false,s),1000);
 assert.equal(e.effectiveCard(a,s).extraBreak??0,0);
 play(s,FIELD);
 assert.equal(e.power(a,false,s),13000);
 assert.equal(e.power(b,false,s),13000);
 assert.equal(e.effectiveCard(a,s).extraBreak,2);
 attack(s,a.uid);
 drain(s);
 assert.equal(s.players[1].shields.length,2);
 s.players[0].battle=s.players[0].battle.filter(x=>x.cardId!==FIELD);
 assert.equal(e.power(a,false,s),1000);
});

test('Gene charges as tapped multicolor mana',()=>{
 const s=field(),x=put(s,0,'hand',GENE);
 s.phase='charge';
 act(s,'charge',a=>a.uid===x.uid);
 assert.ok(has(s,0,'mana',x)&&x.tapped);
});

for(const mode of ['accept','decline','locked','insufficient'])test('Gene offers exactly two own graveyard creatures to its opponent '+mode,()=>{
 let s=field();
 const a=put(s,1,'grave',WATER),spell=put(s,1,'grave',SPELL);
 const b=mode==='insufficient'?null:put(s,1,'grave',TWIN);
 put(s,0,'grave',NATURE);
 if(mode==='locked')put(s,0,'battle',LOCK);
 play(s,GENE);
 const before=physical(s);
 if(b){
  assert.equal(s.decision.player,1);
  assert.deepEqual(choices(s),[true,null]);
  pick(s,mode==='decline'?null:true);
 }
 if(mode==='accept'||mode==='locked'){
  assert.equal(s.decision.player,1);
  assert.deepEqual(choices(s),[a.uid,b.uid]);
  pick(s,b.uid);
  assert.ok(has(s,1,'grave',b));
  assert.deepEqual(choices(s),[a.uid]);
  s=JSON.parse(JSON.stringify(s));
  pick(s,a.uid);
  assert.ok([a,b].every(x=>has(s,1,mode==='locked'?'grave':'hand',x)));
  assert.equal(s.players[0].hand.length,0);
 }else{
  assert.equal(s.players[0].hand.length,2);
  assert.ok(has(s,1,'grave',a));
 }
 assert.ok(has(s,1,'grave',spell));
 assert.deepEqual(physical(s),before);
});

for(const [id,eligible] of [[DARK_DRAGON,true],[FIRE_DRAGON,false],[WATER,false]])test('Gene revolution change checks attacking race and civilization '+id,()=>{
 const s=field(),a=put(s,0,'battle',id),x=put(s,0,'hand',GENE);
 attack(s,a.uid);
 if(eligible){
  assert.equal(s.decision.task.op,'revDeclare');
  pick(s,true);
  pick(s,a.uid);
 }
 drain(s);
 assert.ok(has(s,0,eligible?'battle':'hand',x));
 assert.ok(has(s,0,eligible?'hand':'battle',a));
 assert.equal(s.players[1].shields.length,5-(eligible?2:(e.card(id).breaker||1)));
});

test('Catastrophe tries to destroy all opponent blockers and breaks for both attempts',()=>{
 let s=field();
 const ordinary=put(s,1,'battle',BLOCKER,{g34Grants:[{turn:s.turn,untargetable:true}]});
 const protectedBlocker=put(s,1,'battle',COMPLEX,{tapped:true,g34Grants:[{turn:s.turn,blocker:true}]});
 const sealed=seal(s,1,put(s,1,'battle',BLOCKER)),nonblocker=put(s,1,'battle',WATER),ally=put(s,0,'battle',BLOCKER);
 const dragon=play(s,CATASTROPHE);
 const before=physical(s);
 assert.equal(s.decision.task.op,'g34_Break497');
 assert.equal(s.decision.task.n,2);
 assert.ok(has(s,1,'grave',ordinary)&&has(s,1,'battle',protectedBlocker));
 assert.ok(has(s,1,'battle',sealed)&&has(s,1,'battle',nonblocker)&&has(s,0,'battle',ally));
 const shields=s.players[1].shields.slice(0,2);
 pick(s,shields[0].uid);
 assert.equal(s.players[1].shields.length,5);
 s=JSON.parse(JSON.stringify(s));
 pick(s,shields[1].uid);
 drain(s);
 assert.ok(shields.every(x=>has(s,1,'hand',x)));
 assert.equal(s.players[1].shields.length,3);
 assert.ok(has(s,0,'battle',dragon));
 assert.deepEqual(physical(s),before);
});

test('Catastrophe skips effect breaks without blockers and uses Speed Attacker and T Breaker',()=>{
 const s=field(),dragon=play(s,CATASTROPHE);
 assert.ok(!s.decision);
 assert.equal(s.players[1].shields.length,5);
 attack(s,dragon.uid);
 drain(s);
 assert.equal(s.players[1].shields.length,2);
});
