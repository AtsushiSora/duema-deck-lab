import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {e,data,details,snapshot,setup,inst,act,attack,drain,GEN} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const {cards,printAliases,regulationVerification}=JSON.parse(fs.readFileSync(new URL('../tools/support-phase-1179.json',import.meta.url)));
const AVA='dm23bd5-006',REX='dm23bd5-007',ALM='dmd16-003',PROMO='promoy13-068';
const LIGHT='dm01-075',WATER='dm01-083',DIS='dmrp19-036',NEO='dm25rp2-054';
const EVO='dmrp18-058',LARGE='dm01-s01',APUR='dmrp22-042',FATHER='dmr02-005';
const add=(s,p,zone,id)=>{const x=inst(id);s.players[p][zone].push(x);return x;};
const play=(s,x,filter=()=>true)=>act(s,'play',a=>a.uid===x.uid&&filter(a));
const choices=s=>s.decision?.choices??[];
const pick=(s,v)=>act(s,'extended',a=>{const val=choices(s)[a.choice].value;return (val?.uid??val)===v;});

test('all prints match official stats, limits, images and one canonical identity',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(fs.readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of [...cards,...printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1179}),row.spec);
  assert.deepEqual(row.faces[0].civilizations,c.civilizations);
  for(const key of ['cost','power'])assert.equal(c[key],Number(row.faces[0][key==='power'?'powerText':key]));
  assert.equal(c.manaValue,1);
  assert.equal(c.limit,regulationVerification.limits[row.id]);
  assert.equal(refs.find(r=>r.id===row.id).image,row.image);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  const unknown=structuredClone(row);
  unknown.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec({...unknown,status:'complete'},{phase:1179}));
 }
 assert.deepEqual(catalogue.resolveRows([{id:PROMO,count:2},{id:ALM,count:2}]),[{id:ALM,count:4}]);
});

for(const theirs of [0,1,2,5]){
 test('Ava compares remaining hand sizes at the entry effect, opposing size '+theirs,()=>{
  const s=setup(),p=s.active,source=add(s,p,'hand',AVA);
  add(s,p,'hand',LIGHT);
  for(let i=0;i<theirs;i++)add(s,1-p,'hand',WATER);
  play(s,source);
  assert.equal(s.players[p].hand.length,theirs>1?2:1);
  assert.equal(s.decision,null);
 });
}

test('Ava draws for an opponent with a card when summoned as the only card in hand',()=>{
 const s=setup(),p=s.active,x=add(s,p,'hand',AVA),drawn=s.players[p].deck[0];
 add(s,1-p,'hand',WATER);
 play(s,x);
 assert.deepEqual(s.players[p].hand.map(y=>y.uid),[drawn.uid]);
});

test('Rexei gives the controller anonymous indexed choices without revealing other cards',()=>{
 let s=setup();const p=s.active,x=add(s,p,'hand',REX),first=add(s,1-p,'hand',LIGHT),second=add(s,1-p,'hand',WATER);
 play(s,x);
 assert.equal(s.decision.player,p);
 assert.deepEqual(choices(s).map(c=>[c.label,c.value,c.cardId??null]),[['裏向きの手札 1',0,null],['裏向きの手札 2',1,null]]);
 assert.ok(!JSON.stringify(s.decision).includes(first.cardId));
 s=JSON.parse(JSON.stringify(s));pick(s,1);drain(s);
 assert.deepEqual(s.players[1-p].hand.map(y=>y.uid),[first.uid]);
 assert.ok(s.players[1-p].grave.some(y=>y.uid===second.uid));
 assert.equal(s.players[p].grave.length,0);
});

test('Rexei respects hand protection and allows a selected Alien Father discard replacement',()=>{
 for(const protectedHand of [true,false]){
  const s=setup(),p=s.active,x=add(s,p,'hand',REX),target=add(s,1-p,'hand',FATHER);
  if(protectedHand)add(s,1-p,'battle','dm23rp2-029');
  play(s,x);pick(s,0);
  if(protectedHand)assert.ok(s.players[1-p].hand.includes(target));
  else{
   assert.equal(s.decision.player,1-p);
   pick(s,true);
   assert.ok(s.players[1-p].mana.includes(target));
   assert.equal(target.tapped,true);
  }
  assert.ok(!s.players[1-p].grave.includes(target));
 }
});

for(const id of [AVA,REX]){
 test(id+' provides an optional one-mana Sasage payment only to Dispectors',()=>{
  const s=setup(),p=s.active,source=add(s,p,'battle',id),target=add(s,p,'hand',DIS),normal=add(s,p,'hand',LIGHT);
  const actions=e.getLegalActions(s);
  assert.ok(!actions.some(a=>a.uid===normal.uid&&a.alternative==='sasage'));
  assert.ok(actions.some(a=>a.uid===target.uid&&!a.alternative&&a.cost===5));
  play(s,target,a=>a.alternative==='sasage'&&a.sasage.includes(source.uid)&&a.cost===4);
  drain(s);
  assert.ok(s.players[p].grave.includes(source)&&s.players[p].battle.includes(target));
  assert.equal(s.players[p].mana.filter(x=>x.tapped).length,4);
 });
}

test('multiple Distass can contribute to the same summoning cost without reducing it to zero',()=>{
 const s=setup(),p=s.active,target=add(s,p,'hand',DIS);
 const providers=[AVA,AVA,AVA,REX,REX].map(id=>add(s,p,'battle',id));
 const uids=providers.map(x=>x.uid);
 play(s,target,a=>a.alternative==='sasage'&&a.sasage.length===uids.length&&
  uids.every(uid=>a.sasage.includes(uid))&&a.cost===1);
 drain(s);
 assert.ok(providers.every(x=>s.players[p].grave.includes(x)));
 assert.ok(s.players[p].battle.includes(target));
 assert.equal(s.players[p].mana.filter(x=>x.tapped).length,1);
});

test('Genmu ignores the low-cost Distass entry ability and Sasage while it is present',()=>{
 for(const id of [AVA,REX]){
  const s=setup(),p=s.active,source=add(s,p,'hand',id);
  add(s,1-p,'battle',GEN);
  const privateCard=add(s,1-p,'hand',WATER);
  play(s,source);
  assert.equal(s.decision,null);
  assert.equal(s.players[p].hand.length,0);
  assert.ok(s.players[1-p].hand.includes(privateCard));
  const target=add(s,p,'hand',DIS);
  assert.ok(!e.getLegalActions(s).some(a=>a.uid===target.uid&&a.alternative==='sasage'));
 }
});

test('Almiul revives one eligible creature before shields break and attacks with W-Breaker',()=>{
 const s=setup(),p=s.active,source=add(s,p,'battle',ALM),accepted=add(s,p,'grave',LIGHT);
 const rejected=[WATER,LARGE,EVO].map(id=>add(s,p,'grave',id));
 const rival=add(s,1-p,'grave',LIGHT);
 attack(s,source.uid);
 assert.deepEqual(choices(s).map(x=>x.value?.uid??x.value),[accepted.uid,null]);
 pick(s,accepted.uid);act(s,'noBlock');drain(s);
 assert.ok(s.players[p].battle.includes(accepted));
 assert.ok(rejected.every(x=>s.players[p].grave.includes(x)));
 assert.ok(s.players[1-p].grave.includes(rival));
 assert.equal(s.players[1-p].shields.length,3);
});

test('Almiul may put a Light NEO creature from grave into play',()=>{
 const s=setup(),p=s.active,source=add(s,p,'battle',ALM),neo=add(s,p,'grave',NEO);
 attack(s,source.uid);pick(s,neo.uid);pick(s,null);drain(s);
 assert.ok(s.players[p].battle.includes(neo));
 assert.equal(e.isEvolution(neo),false);
});

test('Almiul may decline and cannot move any grave card through Apul',()=>{
 for(const lock of [false,true]){
  const s=setup(),p=s.active,source=add(s,p,'battle',ALM),target=add(s,p,'grave',LIGHT);
  if(lock)add(s,1-p,'battle',APUR);
  attack(s,source.uid);
  if(!lock)pick(s,null);
  assert.ok(!choices(s).some(c=>c.value?.uid===target.uid));
  act(s,'noBlock');drain(s);
  assert.ok(s.players[p].grave.includes(target));
  assert.equal(s.players[1-p].shields.length,3);
 }
});
