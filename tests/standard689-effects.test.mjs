import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-689.json',import.meta.url)));

test('Phase 689 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:689}));
  assert.throws(()=>standardCardSpec(detail,{phase:688}));
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
  if(row.currentPrint){
   assert.deepEqual(row.spec,standardCardSpec({...row.currentPrint,status:'complete'},{phase:689}));
   assert.ok(row.currentPrint.verification.facesMatched);
   assert.ok(!data.cards.some(c=>c.id===row.currentPrint.id));
  }
 }
});

const POPPY='dm22-007',LAYRA='dm01-002',HAND='dm34-047';
const SMALL='dm01-108',DRAGON='dmr07-045',DEATH='dm33-045',DEATH_TWIN='dm24bd4-014';
const SPELL='dm01-015',TWIN='dm22ex1-128';
const field=(p=0)=>Object.assign(setup(),{active:p});
const put=(s,p,id)=>{const x=inst(id);s.players[p].battle.push(x);return x;};
const play=(s,id)=>{s.players[s.active].hand.push(inst(id));act(s,'play',a=>a.cardId===id);};
const values=s=>(s.decision?.choices||[]).map(x=>x.value?.uid??x.value);
const pick=(s,uid)=>act(s,'extended',a=>values(s)[a.choice]===uid);
const has=(s,p,z,uid)=>s.players[p][z].some(x=>x.uid===uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();

test('Poppy reprints use the original card identity and verified full abilities',()=>{
 const {printAliases}=JSON.parse(readFileSync(new URL('../tools/support-phase-689.json',import.meta.url)));
 assert.equal(printAliases.length,2);
 for(const row of printAliases){
  assert.equal(row.canonicalId,POPPY);
  assert.ok(row.verification.facesMatched);
  assert.equal(regulationVerification.limits[row.id],regulationVerification.limits[POPPY]);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:689}),cards.find(c=>c.id===POPPY).spec);
  assert.ok(!data.cards.some(c=>c.id===row.id));
 }
});

for(const enabled of [true,false])test('Poppy protects only allied Dragons from an opponent selecting them '+enabled,()=>{
 const s=field(1);
 play(s,POPPY);
 const poppy=s.players[1].battle[0],dragon=put(s,1,DRAGON),nonDragon=put(s,1,SMALL);
 if(!enabled)poppy.g35Ignored=s.turn;
 s.active=0;
 play(s,HAND);
 assert.deepEqual(values(s),enabled?[poppy.uid,nonDragon.uid]:[poppy.uid,dragon.uid,nonDragon.uid]);
 pick(s,nonDragon.uid);
 assert.ok(has(s,1,'battle',dragon.uid));
});

test('Poppy still allows the protected Dragon to be attacked and to block normally',()=>{
 const s=field(),attacker=put(s,0,SMALL),other=put(s,0,SMALL);
 put(s,1,POPPY);
 const dragon=put(s,1,DRAGON);
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===dragon.uid);
 assert.ok(has(s,0,'grave',attacker.uid));
 assert.ok(dragon.tapped);
 attack(s,other.uid,dragon.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 assert.ok(has(s,0,'grave',other.uid));
});

for(const id of [SPELL,TWIN])test('Layra requires a spell from the library and reveals only the chosen card '+id,()=>{
 let s=field();
 give(s,0,'deck',[SMALL,SPELL,SMALL,TWIN,SMALL]);
 const spell=s.players[0].deck[1],twin=s.players[0].deck[3],choice=id===SPELL?spell:twin;
 play(s,LAYRA);
 const all=physical(s),rng=s.rng;
 assert.deepEqual(values(s),[spell.uid,twin.uid]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,choice.uid);
 assert.ok(has(s,0,'hand',choice.uid));
 assert.notEqual(s.rng,rng);
 assert.deepEqual(s.log.filter(x=>x.type==='reveal').map(x=>x.cardId),[id]);
 assert.deepEqual(physical(s),all);
});

test('Layra finishes the summon and still shuffles when the library contains no spell (QA 35398)',()=>{
 const s=field();
 give(s,0,'deck',[SMALL,DRAGON,SMALL]);
 const rng=s.rng,remaining=s.players[0].deck.map(x=>x.uid).sort();
 play(s,LAYRA);
 assert.equal(s.decision,null);
 assert.ok(s.players[0].battle.some(x=>x.cardId===LAYRA));
 assert.notEqual(s.rng,rng);
 assert.deepEqual(s.players[0].deck.map(x=>x.uid).sort(),remaining);
 assert.ok(!s.log.some(x=>x.type==='reveal'));
});

for(const id of [DEATH,DEATH_TWIN,SMALL])test('Death Hand first destroys and then lets the opponent choose the discard when a Death God is present '+id,()=>{
 let s=field(),target=put(s,1,SMALL);
 put(s,0,id);
 give(s,1,'hand',[SMALL,TWIN]);
 const discarded=s.players[1].hand[1].uid;
 play(s,HAND);
 assert.deepEqual(values(s),[target.uid]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,target.uid);
 assert.ok(has(s,1,'grave',target.uid));
 if(id!==SMALL){
  assert.equal(s.decision.player,1);
  act(s,'extended',a=>values(s)[a.choice]===discarded);
  assert.ok(has(s,1,'grave',discarded));
 }else assert.ok(has(s,1,'hand',discarded));
 assert.equal(s.decision,null);
});

test('Death Hand can make the opponent discard with no destruction target',()=>{
 const s=field(1);
 put(s,1,DEATH);
 give(s,0,'hand',[SMALL]);
 const discarded=s.players[0].hand[0].uid;
 play(s,HAND);
 if(s.decision)pick(s,discarded);
 assert.ok(has(s,0,'grave',discarded));
 assert.equal(s.decision,null);
});
