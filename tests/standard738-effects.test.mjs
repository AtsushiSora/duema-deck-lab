import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-738.json',import.meta.url)));

test('Phase 738 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:738}));
  assert.throws(()=>standardCardSpec(detail,{phase:737}));
  for(const [field,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[field],value);
  assert.deepEqual(data.cards.filter(c=>key(c.name)===key(row.name)).map(c=>c.id),[row.id]);
  assert.ok(row.verification.facesMatched);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:row.id,count:1});
  assert.deepEqual(catalogue.resolveRows(deck.cards),deck.cards);
  assert.deepEqual(e.validateDeck(deck),[]);
  const incomplete=structuredClone(detail);
  incomplete.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(incomplete,{phase:738}));
 }
});

const MIK='dm09-007',AZA='dm09-003',CAL='dm09-038';
const GUARDIAN='dm01-076',GUARDIAN2='dm01-013',GHOST='dm32-094',DARKLORD='dmrp14-069';
const NATURE='dm01-108',WATER='dm01-083',BURST='dm02-032',FEATHER='dm01-092',YAMATA='dmbd18-003';
const field=(active=0)=>Object.assign(setup(),{active});
const restore=s=>JSON.parse(JSON.stringify(s));
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const val=o=>o.value?.uid??o.value;
const offered=s=>s.decision.choices.map(val);
const pick=(s,v)=>act(s,'extended',a=>val(s.decision.choices[a.choice])===v);
function put(s,p,id,z='battle',attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][z].push(x);
 return x;
}
function play(s,id){
 const x=put(s,s.active,id,'hand');
 act(s,'play',a=>a.uid===x.uid&&!a.alternative);
 return x;
}
function startTarget(s){
 if(['entryOrder','effectOrder'].includes(s.decision?.type))e.step(s,e.getLegalActions(s)[0]);
 assert.equal(s.decision?.task?.op,'g34_Target');
}

test('Mikyute watches only friendly Guardians and the tap is optional after restoring the choice',()=>{
 let s=field();
 const source=play(s,MIK);
 const foe=put(s,1,NATURE),alreadyTapped=put(s,1,WATER,'battle',{tapped:true});
 play(s,NATURE);
 assert.equal(s.decision,null);
 s.active=1;
 play(s,GUARDIAN);
 assert.equal(s.decision,null);
 s.active=0;
 play(s,GUARDIAN);
 assert.deepEqual(new Set(offered(s)),new Set([foe.uid,alreadyTapped.uid,s.players[1].battle.at(-1).uid,null]));
 s=restore(s);
 pick(s,foe.uid);
 assert.ok(s.players[1].battle.find(y=>y.uid===foe.uid).tapped);
 s.players[1].battle.find(y=>y.uid===foe.uid).tapped=false;
 play(s,GUARDIAN);
 pick(s,null);
 assert.equal(s.players[1].battle.find(y=>y.uid===foe.uid).tapped,false);
 assert.ok(has(s,0,'battle',source));
});

test('Mikyute triggers twice for two Guardians from Heaven Gate and selects at resolution',()=>{
 const s=field(),a=put(s,0,GUARDIAN,'hand'),b=put(s,0,GUARDIAN2,'hand');
 put(s,0,MIK);
 const first=put(s,1,NATURE),second=put(s,1,WATER);
 play(s,'dm16-007');
 pick(s,a.uid);
 pick(s,b.uid);
 startTarget(s);
 pick(s,first.uid);
 startTarget(s);
 pick(s,second.uid);
 assert.ok(first.tapped&&second.tapped&&has(s,0,'battle',a)&&has(s,0,'battle',b));
 assert.equal(s.decision,null);
});

test('Mikyute with ignored abilities does not react to Guardian entry',()=>{
 const s=field();
 put(s,0,MIK,'battle',{g35Ignored:s.turn});
 const foe=put(s,1,NATURE);
 play(s,GUARDIAN);
 assert.equal(s.decision,null);
 assert.equal(foe.tapped,false);
});

test('Azagast evolves only on a Dark Lord, then may destroy an untapped enemy on Ghost entry',()=>{
 let s=field(),wrong=put(s,0,NATURE);
 const spell=put(s,0,AZA,'hand'),untapped=put(s,1,NATURE),tapped=put(s,1,WATER,'battle',{tapped:true});
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===spell.uid));
 const base=put(s,0,DARKLORD);
 act(s,'play',a=>a.uid===spell.uid);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='evolve'&&a.baseUid===wrong.uid));
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.deepEqual(spell.under.map(x=>x.uid),[base.uid]);
 assert.equal(s.decision,null);
 play(s,GUARDIAN);
 assert.equal(s.decision,null);
 play(s,GHOST);
 assert.deepEqual(offered(s),[untapped.uid,null]);
 s=restore(s);
 pick(s,untapped.uid);
 drain(s);
 assert.ok(has(s,1,'grave',untapped)&&has(s,1,'battle',tapped));
 assert.equal(e.card(AZA).breaker,2);
 attack(s,spell.uid);
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('Azagast can decline the destruction and ignores an opposing Ghost',()=>{
 const s=field(),source=put(s,0,AZA),foe=put(s,1,NATURE);
 s.active=1;
 play(s,GHOST);
 assert.equal(s.decision,null);
 s.active=0;
 play(s,GHOST);
 pick(s,null);
 assert.ok(has(s,1,'battle',foe)&&has(s,0,'battle',source));
});

test('Calyute resolves the official Burst Shot ruling from the shared pre-move board',()=>{
 for(const owner of [0,1]){
  const s=field(1),a=put(s,0,CAL),b=put(s,owner,CAL),unrelated=put(s,0,WATER);
  a.g34Grants=[{turn:s.turn,g172Death:[{op:'Draw',n:1}]}];
  const deck=s.players[0].deck.length;
  play(s,BURST);
  drain(s);
  assert.ok(has(s,0,'hand',a)&&has(s,owner,'hand',b)&&has(s,0,'grave',unrelated));
  assert.equal(s.players[0].deck.length,deck);
 }
});

test('A lone Calyute, one whose partner is sealed, and one with ignored abilities go to the grave',()=>{
 for(const mode of ['lone','sealed','ignored']){
  const s=field(1),a=put(s,0,CAL);
  if(mode!=='lone'){
   const b=put(s,0,CAL);
   if(mode==='sealed'){
    b.sealed=true;
    put(s,0,NATURE,'seals',{faceDown:true,sealOf:b.uid});
   }else a.g35Ignored=s.turn;
  }
  play(s,BURST);
  drain(s);
  assert.ok(has(s,0,'grave',a));
 }
});

test('Calyute redirects a non-destruction move to grave from Black Feather',()=>{
 const s=field(),a=put(s,0,CAL),b=put(s,0,CAL);
 play(s,FEATHER);
 assert.equal(s.decision.task.op,'g50_Feather');
 pick(s,a.uid);
 drain(s);
 assert.ok(has(s,0,'hand',a)&&has(s,0,'battle',b));
 assert.ok(!has(s,0,'grave',a));
});

test('Calyute offers the existing replacement choice against Yamata and restores it from a save',()=>{
 for(const destination of ['hand','mana']){
  let s=field(1);
  const a=put(s,0,CAL),b=put(s,0,CAL);
  put(s,0,YAMATA);
  play(s,'dm01-027');
  act(s,'effect',x=>x.targets[0].uid===a.uid);
  assert.equal(s.decision.type,'leaveReplace');
  assert.equal(s.decision.mandatory,true);
  const kinds=e.getLegalActions(s).map(x=>x.kind);
  assert.ok(kinds.includes('replaceOmega')&&kinds.includes('replaceYamata')&&!kinds.includes('replaceLeave'));
  s=restore(s);
  act(s,destination==='hand'?'replaceOmega':'replaceYamata');
  drain(s);
  assert.ok(has(s,0,destination,a)&&has(s,0,'battle',b));
 }
});
