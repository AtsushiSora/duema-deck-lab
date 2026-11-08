import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,act} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-639.json',import.meta.url)));
const SHINAIGA='dmrp22-061',SWEEP='dm24-026',MAGIN='dm02-003';
const SEED='dmsd20-016',FIRE='dm01-097',DARK='dm01-090',NATURE='dm01-108';
const POWER_3000='dm01-103',POWER_4000='dm01-066',POWER_6000='dmr05-079',POWER_9500='dm01-s01';

function valueOf(choice){return choice.value?.uid??choice.value;}
function pick(s,value){act(s,'extended',a=>valueOf(s.decision.choices[a.choice])===value);}
function physical(s){return e.physicalCards(s).map(x=>x.uid).sort();}

test('Phase 639 verifies the complete original prints and their saved deck identities',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 assert.equal(cards.length,2);
 for(const row of cards){
  const detail=details.cards.find(d=>d.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:639}));
  assert.throws(()=>standardCardSpec(detail,{phase:638}));
  for(const [field,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[field],value);
  assert.deepEqual(data.cards.filter(c=>key(c.name)===key(row.name)).map(c=>c.id),[row.id]);
  assert.ok(row.verification.facesMatched);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].id=row.id;
  assert.deepEqual(catalogue.resolveRows(deck.cards),deck.cards);
  assert.deepEqual(e.validateDeck(deck),[]);
 }
 assert.ok(!data.cards.some(c=>c.id===MAGIN));
});

test('Shinaiga offers only friendly Tamaseeds and draws two only when the sacrifice is chosen',()=>{
 for(const mode of ['choose','decline','no target']){
  let s=setup();
  give(s,0,'hand',[SHINAIGA]);
  give(s,0,'mana',Array(2).fill(DARK));
  give(s,0,'deck',Array(5).fill(NATURE));
  give(s,0,'battle',mode==='no target'?[FIRE]:[FIRE,SEED]);
  give(s,1,'battle',[SEED]);
  const seed=s.players[0].battle[1],enemySeed=s.players[1].battle[0],before=physical(s);
  const top=s.players[0].deck.slice(0,2).map(x=>x.uid);
  act(s,'play');
  if(mode==='no target')assert.equal(s.decision,null);
  else{
   assert.deepEqual(s.decision.choices.map(valueOf),[seed.uid,null]);
   s=JSON.parse(JSON.stringify(s));
   pick(s,mode==='choose'?seed.uid:null);
  }
  assert.deepEqual(s.players[0].hand.map(x=>x.uid),mode==='choose'?top:[]);
  assert.equal(s.players[0].grave.some(x=>x.uid===seed?.uid),mode==='choose');
  assert.ok(s.players[1].battle.some(x=>x.uid===enemySeed.uid));
  assert.deepEqual(physical(s),before);
 }
});

test('Tenchi Bakuen applies exactly one chosen threshold to both sides and leaves Tamaseeds alone',()=>{
 for(const mode of [0,1]){
  let s=setup();
  give(s,0,'hand',[SWEEP]);
  give(s,0,'mana',Array(8).fill(FIRE));
  for(const p of [0,1]){
   give(s,p,'battle',[POWER_6000,POWER_9500,POWER_3000,POWER_4000,SEED]);
   const [first,second]=s.players[p].battle;
   first.tapped=second.tapped=true;
  }
  const before=physical(s),spell=s.players[0].hand[0];
  const victims=s.players.map(p=>p.battle[mode===0?0:2].uid);
  act(s,'play');
  assert.deepEqual(s.decision.choices.map(valueOf),[0,1]);
  s=JSON.parse(JSON.stringify(s));
  pick(s,mode);
  assert.deepEqual(s.players.map((p,i)=>p.grave.filter(x=>x.uid!==spell.uid).map(x=>x.uid)),victims.map(x=>[x]));
  assert.ok(s.players.every(p=>p.battle.length===4&&p.battle.some(x=>x.cardId===SEED)));
  assert.deepEqual(physical(s),before);
 }
});
