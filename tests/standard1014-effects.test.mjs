import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const CAPTAIN='dmr20-006',DANTE='dmr20-012',JIGOKU='dmr21-s03',REPRINT='dmx23-023';
const NATURE='dm01-108',WATER='dm01-083',FIRE='dm01-097',HAND='dm01-027',BOUNCE='dm01-086';
const LIGHT='dm06-085',TWIN='dm22ex1-030',FIELD='dmr21-036',LOCK='dmrp08-014',QX='dmrp07-m01';
const METEOR='dm01-s08',EVOLUTION='dm32-007',MULTI='dm24ex2-019',FOREIGN_DRAGON='dmr22-008',BIG='dm05-s04',MAGMA='dmr18-s07';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
const value=c=>c.value?.uid??c.value;
const choices=s=>s.decision?.choices?.map(value)??[];
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function field(active=0){
 const s=Object.assign(setup(),{active});
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
test('Phase 1014 pins three official definitions and the Dante reprint',()=>{
 const m=read('tools/support-phase-1014.json'),refs=read('tools/image-reference-prints.json').prints;
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[CAPTAIN,DANTE,JIGOKU]);
 assert.deepEqual(m.printAliases.map(x=>x.id),[REPRINT]);
 for(const row of m.cards){
  const {id,name,faces}=row,[f]=faces,d=details.cards.find(x=>x.id===id),c=e.card(id);
  assert.deepEqual(faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:1014}),row.spec);
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'未知の能力。'}]},{phase:1014}));
  for(const [key,v] of Object.entries(row.spec))assert.deepEqual(c[key],v);
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [name,'creature',f.cost,parseInt(f.powerText,10),f.race,f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-1014');
  assert.equal(CARD_IMAGES[id],row.image);
  assert.ok(registry.get(id).supported&&row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[id],4);
  assert.deepEqual(refs.filter(x=>x.id===id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  for(const source of [data,details,snapshot])
   assert.deepEqual(source.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
 }
 for(const row of m.printAliases){
  assert.equal(row.canonicalId,DANTE);
  assert.equal(registry.get(row.id).id,DANTE);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.ok(row.verification.facesMatched);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1014}),m.cards.find(c=>c.id===DANTE).spec);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[DANTE,row.image]]);
 }
 assert.deepEqual(registry.resolveRows([DANTE,REPRINT].map(id=>({id,count:1}))),[{id:DANTE,count:2}]);
});



function destroy(s,x){
 play(s,HAND);
 act(s,'effect',a=>a.targets.some(t=>t.uid===x.uid));
}

for(const [mode,first] of [['fire dragon',METEOR],['multicolor fire dragon',MULTI],['fire without dragon',FIRE],['non-fire dragon',FOREIGN_DRAGON],['inspection locked',METEOR]])test('Captain attacks immediately and resolves its top card '+mode,()=>{
 const s=field();
 give(s,0,'deck',[first,NATURE,WATER]);
 const [top,...rest]=s.players[0].deck;
 if(mode==='inspection locked')put(s,1,'battle',QX);
 const x=play(s,CAPTAIN);
 assert.equal(x.entered,s.turn);
 attack(s,x.uid);
 drain(s);
 const hit=mode.endsWith('fire dragon')&&mode!=='non-fire dragon';
 assert.ok(has(s,0,hit?'hand':'deck',top));
 assert.deepEqual(s.players[0].deck,hit?rest:[...rest,top]);
 assert.equal(s.log.some(y=>y.type==='reveal'&&y.cardId===CAPTAIN),mode!=='inspection locked');
});

for(const mode of ['five','four','face down fifth','decline'])test('Captain deploys a matching Dragon only with five Fire mana '+mode,()=>{
 const s=field(1),x=put(s,0,'battle',CAPTAIN);
 const a=put(s,0,'hand',METEOR),b=put(s,0,'hand',MULTI);
 for(const id of [FIRE,FOREIGN_DRAGON,BIG,EVOLUTION])put(s,0,'hand',id);
 give(s,0,'mana',[FIRE,FIRE,FIRE,FIRE,mode==='four'?NATURE:MULTI]);
 if(mode==='face down fifth')s.players[0].mana.at(-1).faceDown=true;
 destroy(s,x);
 assert.ok(has(s,0,'grave',x));
 if(mode==='five'||mode==='decline'){
  assert.equal(s.decision.player,0);
  assert.deepEqual(new Set(choices(s)),new Set([a.uid,b.uid,null]));
  pick(s,mode==='five'?a.uid:null);
 }
 drain(s);
 assert.equal(has(s,0,'battle',a),mode==='five');
 assert.ok(has(s,0,'hand',b));
});

test('Captain can deploy an evolution Dragon with a legal base (QA 37804)',()=>{
 let s=field(1);
 const x=put(s,0,'battle',CAPTAIN),base=put(s,0,'battle',METEOR),evolution=put(s,0,'hand',EVOLUTION);
 give(s,0,'mana',Array(5).fill(FIRE));
 destroy(s,x);
 assert.ok(choices(s).includes(evolution.uid));
 pick(s,evolution.uid);
 assert.deepEqual(choices(s),[base.uid]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,base.uid);
 drain(s);
 assert.deepEqual(s.players[0].battle.map(y=>[y.uid,y.under?.[0]?.uid]),[[evolution.uid,base.uid]]);
});

for(const mode of ['mana','grave','decline','grave locked'])test('Dante recovers up to one spell from mana or grave '+mode,()=>{
 let s=field();
 const mana=put(s,0,'mana',LIGHT),grave=put(s,0,'grave',TWIN);
 put(s,0,'grave',NATURE);
 put(s,0,'mana',HAND,{faceDown:true});
 if(mode==='grave locked')put(s,1,'battle',LOCK);
 play(s,DANTE);
 assert.deepEqual(new Set(choices(s)),new Set(mode==='grave locked'?[mana.uid,null]:[mana.uid,grave.uid,null]));
 s=JSON.parse(JSON.stringify(s));
 pick(s,mode==='grave'?grave.uid:mode==='decline'?null:mana.uid);
 assert.equal(has(s,0,'hand',mana),mode==='mana'||mode==='grave locked');
 assert.equal(has(s,0,'hand',grave),mode==='grave');
 assert.equal(s.decision,null);
});

test('Dante blocks and replaces its destruction with a mandatory top-deck move',()=>{
 const s=field(1),d=put(s,0,'battle',DANTE),a=put(s,1,'battle',BIG);
 const top=s.players[0].deck[0],before=physical(s);
 attack(s,a.uid);
 act(s,'block',z=>z.uid===d.uid);
 drain(s);
 assert.deepEqual(s.players[0].deck.slice(0,2).map(y=>y.uid),[d.uid,top.uid]);
 assert.ok(!has(s,0,'grave',d)&&!d.tapped);
 assert.equal(s.metrics[1].breaks,0);
 assert.deepEqual(physical(s),before);
});

test('Dante may attack a creature, and other zone moves are unchanged',()=>{
 const s=field(),d=put(s,0,'battle',DANTE),victim=put(s,1,'battle',NATURE,{tapped:true});
 s.phase='attack';
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===d.uid).map(a=>a.target),[victim.uid]);
 const t=field(1),x=put(t,0,'battle',DANTE);
 play(t,BOUNCE);
 act(t,'effect',a=>a.targets.some(z=>z.uid===x.uid));
 assert.ok(has(t,0,'hand',x));
 assert.equal(t.decision,null);
});

test('Dante cannot decline a mandatory replacement when another replacement is available',()=>{
 const s=field(1),x=put(s,0,'battle',DANTE),saver=put(s,0,'battle','dm28-100');
 destroy(s,x);
 assert.equal(s.decision.type,'leaveReplace');
 assert.equal(s.decision.mandatory,true);
 assert.deepEqual(e.getLegalActions(s).map(a=>a.kind).sort(),['replaceDeckTop846','replaceUltra'].sort());
 act(s,'replaceUltra',a=>a.uid===saver.uid);
 drain(s);
 assert.ok(has(s,0,'battle',x)&&has(s,0,'grave',saver));
});

for(const mode of ['sacrifice ally','sacrifice self','decline','replacement'])test('Jigokushivaku chooses whether to destroy an ally and draw two '+mode,()=>{
 const s=field(),ally=put(s,0,'battle',mode==='replacement'?DANTE:NATURE),foe=put(s,1,'battle',WATER);
 put(s,0,'battle',FIELD);
 const x=play(s,JIGOKU);
 assert.deepEqual(new Set(choices(s)),new Set([ally.uid,x.uid,null]));
 pick(s,mode==='decline'?null:mode==='sacrifice self'?x.uid:ally.uid);
 assert.equal(s.players[0].hand.length,mode==='decline'?0:2);
 if(mode.startsWith('sacrifice')){
  assert.ok(has(s,0,'grave',mode==='sacrifice self'?x:ally));
  assert.equal(s.decision.player,0);
  pick(s,foe.uid);
  assert.ok(has(s,1,'grave',foe));
 }else{
  assert.ok(has(s,1,'battle',foe));
  if(mode==='replacement')assert.equal(s.players[0].deck.includes(ally),false);
 }
 drain(s);
 assert.equal(s.decision,null);
 if(mode==='replacement')assert.ok(has(s,0,'hand',ally));
});

for(const ownField of [false,true])test('Jigokushivaku requires a friendly D2 field after a destruction '+ownField,()=>{
 const s=field(1),j=put(s,0,'battle',JIGOKU),ally=put(s,0,'battle',NATURE),foe=put(s,1,'battle',WATER);
 put(s,ownField?0:1,'battle',FIELD);
 destroy(s,ally);
 if(ownField){
  assert.equal(s.decision.player,0);
  pick(s,foe.uid);
 }
 assert.ok(has(s,0,'battle',j)&&has(s,0,'grave',ally));
 assert.equal(has(s,1,'grave',foe),ownField);
});

for(const dies of [false,true])test('Jigokushivaku counts simultaneous destructions that it can observe '+dies,()=>{
 const s=field(1),x=put(s,0,'battle',JIGOKU,dies?{powerModifiers:[{amount:-3000,expires:'end',who:1}]}:{});
 const ally=put(s,0,'battle',NATURE),other=put(s,0,'battle',WATER);
 put(s,0,'battle',FIELD);
 const foe=put(s,1,'battle',BIG),sweeper=play(s,MAGMA);
 assert.ok(has(s,0,'grave',ally)&&has(s,0,'grave',other));
 assert.equal(has(s,0,'grave',x),dies);
 if(!dies)act(s,'orderEffect');
 assert.deepEqual(new Set(choices(s)),new Set([foe.uid,sweeper.uid]));
 pick(s,foe.uid);
 if(!dies)pick(s,sweeper.uid);
 assert.ok(has(s,1,'grave',foe));
 assert.equal(has(s,1,'grave',sweeper),!dies);
});

test('Jigokushivaku can double break',()=>{
 const s=field(),x=play(s,JIGOKU);
 pick(s,null);
 x.entered=0;
 attack(s,x.uid);
 drain(s);
 assert.equal(s.metrics[0].breaks,2);
});
