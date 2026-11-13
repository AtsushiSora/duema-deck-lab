import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,cast,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const PHOTON='dm25-038',BURST='dmrp20-043',IZANTO='dmex07-m08';
const NATURE='dm01-108',FIRE='dm01-097',TWIN='dmrp05-011',ANGEL='dm12-021';
const MULTI='dm24ex1-012',SEED='dm24rp4-008',LOCK='dmrp20-012',BRAND='dmrp06-m01';
const read=name=>JSON.parse(readFileSync(new URL('../tools/'+name,import.meta.url)));
function field(active=0){
 const s=Object.assign(setup(),{active});
 for(const p of [0,1])give(s,p,'deck',Array(15).fill(NATURE));
 return s;
}
function add(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,x)=>act(s,'extended',a=>values(s)[a.choice]===(x?.uid??x));
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function breakShield(s,id){
 give(s,0,'shields',[id]);
 const [shield]=s.players[0].shields;
 const attacker=add(s,1,'battle',FIRE);
 attack(s,attacker.uid);
 act(s,'noBlock');
 return {attacker,shield};
}

test('three official spell names and three print IDs resolve to three supported definitions',()=>{
 const manifest=read('support-phase-1187.json'),refs=read('image-reference-prints.json').prints;
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(manifest.cards.map(x=>x.id),[PHOTON,BURST,IZANTO]);
 assert.deepEqual(manifest.printAliases,[]);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),[face]=row.faces;
  assert.deepEqual(registry.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.deepEqual([c.type,c.cost,c.civilizations,c.race,c.manaValue,c.limit],['spell',face.cost,face.civilizations,face.race,1,4]);
  assert.equal(manifest.regulationVerification.limits[row.id],4);
  assert.equal(refs.find(x=>x.id===row.id)?.image,row.image);
  const parsed={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(parsed,{phase:1187}),row.spec);
  const changed=structuredClone(parsed);
  changed.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(changed,{phase:1187}));
  if(!row.canonicalId){
   assert.equal(CARD_IMAGES[id],row.image);
   assert.deepEqual(details.cards.find(x=>x.id===id).faces,row.faces);
  }
 }
});

test('Photon taps the chosen opponent and untaps at most one multicolor card from the two zones',()=>{
 for(const origin of ['battle','mana']){
  let s=field();
  const enemy=add(s,1,'battle',NATURE),other=add(s,1,'battle',FIRE);
  const battle=add(s,0,'battle',SEED,{tapped:true});
  const mana=add(s,0,'mana',MULTI,{tapped:true});
  add(s,0,'battle',NATURE,{tapped:true});
  add(s,0,'mana',MULTI,{tapped:true,faceDown:true});
  add(s,1,'mana',MULTI,{tapped:true});
  cast(s,PHOTON);
  assert.deepEqual(values(s),[enemy.uid,other.uid]);
  pick(s,enemy);
  assert.ok(enemy.tapped&&!other.tapped);
  assert.deepEqual(values(s),[battle.uid,mana.uid,null]);
  s=JSON.parse(JSON.stringify(s));
  pick(s,origin==='battle'?battle:mana);
  assert.equal(s.players[0].battle.find(x=>x.uid===battle.uid).tapped,origin!=='battle');
  assert.equal(s.players[0].mana.find(x=>x.uid===mana.uid).tapped,origin!=='mana');
 }
});

test('Photon offers optional untapping with no selectable opposing creature',()=>{
 const s=field();
 const immune=add(s,1,'battle','dm23ex1-003',{justDiverActive:true});
 const mana=add(s,0,'mana',MULTI,{tapped:true});
 cast(s,PHOTON);
 assert.deepEqual(values(s),[mana.uid,null]);
 pick(s,null);
 assert.ok(mana.tapped&&!immune.tapped);
 assert.equal(s.decision,null);
});

test('Photon casts as a Shield Trigger without spending mana',()=>{
 const s=field(1);
 give(s,0,'mana',[]);
 const ready=add(s,0,'mana',MULTI,{tapped:true});
 const other=add(s,1,'battle',NATURE);
 const {shield}=breakShield(s,PHOTON);
 act(s,'useTrigger',a=>a.uid===shield.uid);
 pick(s,other);
 pick(s,ready);
 assert.ok(other.tapped&&!ready.tapped&&has(s,0,'grave',shield));
});

test('Burst mills before choosing a Twinpact cost and applies an inclusive cost cap',()=>{
 for(const reference of [2,5]){
  let s=field();
  give(s,0,'deck',[TWIN,NATURE,FIRE]);
  const [top]=s.players[0].deck;
  const cheap=add(s,1,'battle',NATURE),exact=add(s,1,'battle',ANGEL);
  const big=add(s,1,'battle',BRAND),seed=add(s,1,'battle',SEED);
  const spell=add(s,0,'hand',BURST),all=physical(s);
  act(s,'play',a=>a.uid===spell.uid);
  assert.ok(has(s,0,'grave',top));
  assert.deepEqual(values(s),[2,5]);
  s=JSON.parse(JSON.stringify(s));
  pick(s,reference);
  assert.deepEqual(values(s),reference===2?[cheap.uid]:[cheap.uid,exact.uid]);
  const victim=reference===2?cheap:exact;
  pick(s,victim);
  drain(s);
  assert.ok(has(s,1,'grave',victim)&&has(s,1,'battle',big)&&has(s,1,'battle',seed));
  assert.deepEqual(physical(s),all);
 }
});

test('Burst can trigger from a shield and uses the milled spell cost without a face choice',()=>{
 const s=field(1);
 give(s,0,'mana',[]);
 give(s,0,'deck',[PHOTON,NATURE,FIRE]);
 const [top]=s.players[0].deck;
 const {shield,attacker}=breakShield(s,BURST);
 act(s,'useTrigger',a=>a.uid===shield.uid);
 assert.deepEqual(values(s),[attacker.uid]);
 pick(s,attacker);
 assert.ok(has(s,0,'grave',top)&&has(s,0,'grave',shield)&&has(s,1,'grave',attacker));
});

test('Burst still mills when no legal target exists and does not destroy after deck-out',()=>{
 for(const deckOut of [false,true]){
  const s=field();
  give(s,0,'deck',deckOut?[PHOTON]:[PHOTON,NATURE]);
  const [top]=s.players[0].deck;
  const enemy=add(s,1,'battle',deckOut?NATURE:ANGEL);
  cast(s,BURST);
  assert.ok(has(s,0,'grave',top)&&has(s,1,'battle',enemy));
  assert.equal(s.decision,null);
  assert.equal(s.winner,deckOut?1:null);
 }
});

test('Izanto has a free spell action only when it is the only card in hand and remains subject to spell locks',()=>{
 const s=field(),spell=add(s,0,'hand',IZANTO);
 const options=()=>e.getLegalActions(s).filter(a=>a.kind==='play'&&a.uid===spell.uid);
 assert.deepEqual(options().map(a=>a.cost).sort((a,b)=>a-b),[0,6]);
 const extra=add(s,0,'hand',NATURE);
 assert.deepEqual(options().map(a=>a.cost),[6]);
 s.players[0].hand=[extra];
 s.players[0].mana.push(spell);
 assert.ok(options().every(a=>a.freeSummon===undefined));
 s.players[0].mana.pop();
 s.players[0].hand=[spell];
 add(s,1,'battle',LOCK);
 assert.deepEqual(options(),[]);
});

test('Izanto destroys all eligible opposing creatures by current power and draws only with fire mana',()=>{
 for(const fire of ['absent','present','face-down']){
  const s=field();
  give(s,0,'mana',[]);
  if(fire!=='absent')add(s,0,'mana',FIRE,{tapped:true,faceDown:fire==='face-down'});
  const near=add(s,1,'battle',NATURE,{powerModifiers:[{amount:1000,expires:'end',who:0}]});
  const under=add(s,1,'battle','dmrp01-041');
  const over=add(s,1,'battle',NATURE,{powerModifiers:[{amount:2000,expires:'end',who:0}]});
  const own=add(s,0,'battle',NATURE),seed=add(s,1,'battle',SEED);
  const spell=add(s,0,'hand',IZANTO),next=s.players[0].deck[0],all=physical(s);
  act(s,'play',a=>a.uid===spell.uid&&a.cost===0&&a.freeSummon==='マスターG・G・G');
  drain(s);
  assert.ok(has(s,1,'grave',near)&&has(s,1,'grave',under));
  assert.ok(has(s,1,'battle',over)&&has(s,1,'battle',seed)&&has(s,0,'battle',own));
  assert.equal(has(s,0,'hand',next),fire==='present');
  assert.ok(has(s,0,'grave',spell));
  assert.deepEqual(physical(s),all);
 }
});
