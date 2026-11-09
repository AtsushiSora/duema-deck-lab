import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-701.json',import.meta.url)));

test('Phase 701 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:701}));
  assert.throws(()=>standardCardSpec(detail,{phase:700}));
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
  assert.throws(()=>standardCardSpec(incomplete,{phase:701}));
 }
});

const NAGA='dm12-s03',XENO='dm12-019',JAGA='dm12-020';
const BODY='dm01-108',BLOCKER='dm01-076',BOUNCE='dm01-086',SEED='dmsd20-016';
const MERFOLK='dm12-032',CHIMERA='dm01-025',PART='dmrp05-085',INSECT='dm01-066';
const VEG='dm10-106',PHANTOM='dm10-075';
const put=(s,p,id,attrs={})=>{
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
};
const find=(s,p,zone,uid)=>s.players[p][zone].find(x=>x.uid===uid);
const restore=s=>JSON.parse(JSON.stringify(s));
const value=x=>x.value?.uid??x.value;
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
const end=s=>{s.phase='attack';act(s,'endTurn');};
const play=(s,id)=>{
 const x=inst(id);
 s.players[s.active].hand.push(x);
 act(s,'play',a=>a.uid===x.uid);
 return x;
};

test('Reprints share the original battle definition and deck limit',()=>{
 assert.deepEqual(printAliases.map(x=>x.id),['promoy3-019','dmc34-018']);
 for(const row of printAliases){
  const original=cards.find(x=>x.id===row.canonicalId);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:701}),original.spec);
  assert.equal(regulationVerification.limits[row.id],regulationVerification.limits[original.id]);
  assert.ok(row.verification.facesMatched);
  assert.ok(!data.cards.some(c=>c.id===row.id));
 }
});

test('Naga requires separate Merfolk and Chimera bases and is unblockable with W-Breaker',()=>{
 let s=setup();
 const merfolk=put(s,0,MERFOLK),plain=put(s,0,BODY),blocker=put(s,1,BLOCKER);
 put(s,1,CHIMERA);
 const naga=inst(NAGA);
 s.players[0].hand.push(naga);
 assert.ok(!e.getLegalActions(s).some(a=>a.uid===naga.uid));
 const chimera=put(s,0,CHIMERA);
 act(s,'play',a=>a.uid===naga.uid);
 assert.deepEqual(new Set(s.decision.choices.map(value)),new Set([merfolk.uid,chimera.uid]));
 pick(s,merfolk.uid);
 s=restore(s);
 assert.deepEqual(s.decision.choices.map(value),[chimera.uid]);
 pick(s,chimera.uid);
 assert.deepEqual(find(s,0,'battle',naga.uid).under.map(x=>x.uid),[merfolk.uid,chimera.uid]);
 assert.ok(find(s,0,'battle',plain.uid));
 give(s,1,'shields',[BODY,BODY]);
 attack(s,naga.uid);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'));
 if(s.decision?.type==='block')act(s,'noBlock');
 assert.equal(s.players[1].shields.length,0);
 assert.equal(blocker.tapped,false);
});

test('Naga wipes both sides when bounced with its bases and leaves noncreature elements alone',()=>{
 const s=setup(),bases=[inst(MERFOLK),inst(CHIMERA)],naga=put(s,0,NAGA,{under:bases});
 const left=put(s,0,BODY),right=put(s,1,BODY),seed=put(s,0,SEED);
 s.active=1;
 play(s,BOUNCE);
 act(s,'effect',a=>a.targets?.[0]?.uid===naga.uid);
 for(const x of [naga,...bases])assert.ok(find(s,0,'hand',x.uid));
 assert.ok(find(s,0,'grave',left.uid));
 assert.ok(find(s,1,'grave',right.uid));
 assert.ok(find(s,0,'battle',seed.uid));
});

for(const [id,a,b] of [[XENO,PART,INSECT],[JAGA,VEG,PHANTOM]])test(id+' can evolve from either allied race and boosts other allies only',()=>{
 const s=setup(),first=put(s,0,a),second=put(s,0,b),plain=put(s,0,BODY),enemy=put(s,1,b);
 const x=play(s,id);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[first.uid,second.uid]);
 act(s,'evolve',a=>a.baseUid===first.uid);
 assert.equal(x.under[0].uid,first.uid);
 assert.equal(e.power(x,false,s),e.card(id).power);
 assert.equal(e.power(second,false,s),e.card(b).power+2000);
 assert.equal(e.power(plain,false,s),e.card(BODY).power);
 assert.equal(e.power(enemy,false,s),e.card(b).power);
});

test('Xenomenon makes the defender select their own mana before breaking any shield',()=>{
 for(const id of [XENO,PART,INSECT]){
  let s=setup();
  const attacker=put(s,0,id);
  if(id!==XENO)put(s,0,XENO);
  give(s,1,'mana',[BODY,BOUNCE]);
  const wanted=s.players[1].mana[1];
  attack(s,attacker.uid);
  act(s,'noBlock');
  assert.equal(s.decision.player,1);
  assert.equal(s.decision.task.source,XENO);
  assert.equal(s.players[1].shields.length,5);
  assert.deepEqual(s.decision.choices.map(value),s.players[1].mana.map(x=>x.uid));
  s=restore(s);
  pick(s,wanted.uid);
  assert.ok(find(s,1,'grave',wanted.uid));
  assert.equal(s.players[1].shields.length,4);
 }
});

test('Xenomenon does not trigger on a block, a creature attack, or an unrelated attacker',()=>{
 for(const kind of ['block','creature','unrelated']){
  const s=setup(),attacker=put(s,0,kind==='unrelated'?BODY:INSECT),target=put(s,1,BODY,{tapped:true});
  put(s,0,XENO);
  const blocker=put(s,1,BLOCKER),mana=s.players[1].mana.length;
  attack(s,attacker.uid,kind==='creature'?target.uid:'player');
  if(kind==='block')act(s,'block',a=>a.uid===blocker.uid);
  else act(s,'noBlock');
  assert.equal(s.decision,null);
  assert.equal(s.players[1].mana.length,mana);
 }
});

test('Two Xenomenons trigger once each, and an empty opposing mana zone does not stall the attack',()=>{
 for(const count of [0,2]){
  const s=setup(),attacker=put(s,0,XENO);
  put(s,0,XENO);
  give(s,1,'mana',Array(count).fill(BODY));
  attack(s,attacker.uid);
  act(s,'noBlock');
  assert.equal(s.decision.type,'effectOrder');
  e.step(s,e.getLegalActions(s)[0]);
  for(let i=0;i<count;i++)pick(s,s.players[1].mana[0].uid);
  assert.equal(s.decision,null);
  assert.equal(s.players[1].mana.length,0);
  assert.equal(s.players[1].shields.length,4);
 }
});

test('Jagastar untaps any chosen subset at its controller’s end step, including itself',()=>{
 let s=setup();
 const jaga=put(s,0,JAGA,{tapped:true}),veg=put(s,0,VEG,{tapped:true}),phantom=put(s,0,PHANTOM,{tapped:true});
 const unrelated=put(s,0,BODY,{tapped:true}),enemy=put(s,1,VEG,{tapped:true});
 end(s);
 assert.equal(s.decision.player,0);
 assert.deepEqual(new Set(s.decision.choices.map(value)),new Set([jaga.uid,veg.uid,phantom.uid,null]));
 pick(s,jaga.uid);
 s=restore(s);
 pick(s,phantom.uid);
 pick(s,null);
 for(const x of [jaga,phantom])assert.equal(find(s,0,'battle',x.uid).tapped,false);
 for(const x of [veg,unrelated])assert.equal(find(s,0,'battle',x.uid).tapped,true);
 assert.ok(find(s,1,'battle',enemy.uid));
});

test('Jagastar can select zero and does not prompt on the opponent’s turn',()=>{
 const s=setup(),jaga=put(s,0,JAGA,{tapped:true});
 end(s);
 pick(s,null);
 assert.equal(s.active,1);
 assert.equal(jaga.tapped,true);
 end(s);
 assert.equal(s.active,0);
 assert.equal(s.decision,null);
});
