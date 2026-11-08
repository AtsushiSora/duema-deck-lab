import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-675.json',import.meta.url)));

test('Phase 675 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:675}));
  assert.throws(()=>standardCardSpec(detail,{phase:674}));
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
   assert.deepEqual(row.spec,standardCardSpec({...row.currentPrint,status:'complete'},{phase:675}));
   assert.ok(row.currentPrint.verification.facesMatched);
   assert.ok(!data.cards.some(c=>c.id===row.currentPrint.id));
  }
 }
});

const DAN='dmr10-015',DUMP='dmr09-097',DONIDE='dmr11-033';
const NAT='dm01-108',LOW='dm01-083',MULTI='dmr11-053';
const values=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();

for(const indices of [[],[3],[3,1],[0,1,2,3,4]])test('Dan Crowley breaks exactly the chosen shields '+indices.join(','),()=>{
 let s=setup();
 give(s,0,'battle',[DAN]);
 const [dan]=s.players[0].battle,before=physical(s),shields=s.players[1].shields.map(x=>x.uid);
 attack(s,dan.uid);
 act(s,'noBlock');
 assert.equal(s.decision.type,'infinityCount');
 act(s,'infinityCount',a=>a.n===indices.length);
 for(const [i,index] of indices.entries()){
  act(s,'infinityShield',a=>a.shield===shields[index]);
  if(i+1<indices.length){
   assert.deepEqual(s.players[1].shields.map(x=>x.uid),shields);
   s=JSON.parse(JSON.stringify(s));
  }
 }
 assert.deepEqual(s.players[1].hand.map(x=>x.uid).sort(),indices.map(i=>shields[i]).sort());
 assert.deepEqual(s.players[1].shields.map(x=>x.uid),shields.filter((_,i)=>!indices.includes(i)));
 assert.deepEqual(physical(s),before);
});

for(const origin of ['deck','hand','mana','battle'])test('Dump Tank triggers from the graveyard after moving from '+origin,()=>{
 let s=setup();
 if(origin==='deck')give(s,0,'deck',[DUMP,NAT,NAT]);
 else give(s,0,origin,[DUMP]);
 give(s,1,'battle',[LOW,NAT,LOW]);
 const [low,high,boosted]=s.players[1].battle,uid=s.players[0][origin][0].uid,before=physical(s);
 boosted.powerModifiers=[{amount:1000}];
 if(origin==='battle')s.players[0].battle[0].g35Ignored=s.turn;
 const def=origin==='deck'?{op:'g34_Mill',n:1}:origin==='hand'?{op:'g34_Discard',n:1,owner:'self'}:
  origin==='mana'?{op:'g34_Select',origin,to:'grave',n:1}:{op:'g34_ExactMove',owner:0,target:uid,to:'grave'};
 s.extTasks=[{p:0,source:NAT,...def}];
 act(s,'toAttack');
 if(origin==='hand'||origin==='mana')pick(s,uid);
 assert.equal(s.players[0].grave[0].uid,uid);
 assert.equal(s.decision.task.op,'g34_Target');
 assert.deepEqual(values(s),[low.uid]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,low.uid);
 assert.equal(s.decision,null);
 assert.deepEqual(s.players[1].grave.map(x=>x.uid),[low.uid]);
 assert.deepEqual(s.players[1].battle.map(x=>x.uid),[high.uid,boosted.uid]);
 assert.deepEqual(physical(s),before);
});

for(const index of [0,1])test('Donide offers only hidden hand positions, then moves the selected card to mana '+index,()=>{
 let s=setup();
 give(s,0,'battle',[DONIDE]);
 give(s,1,'hand',[NAT,MULTI]);
 const before=physical(s),hand=s.players[1].hand.map(x=>x.uid),mana=s.players[1].mana.length;
 attack(s,s.players[0].battle[0].uid);
 assert.equal(s.decision.task.op,'g34_BlindHandMana675');
 assert.deepEqual(values(s),[0,1]);
 assert.ok(s.decision.choices.every(c=>!c.cardId&&/^裏向きの手札 /.test(c.label)));
 assert.ok(e.getLegalActions(s).every(a=>!a.cardId||a.cardId===DONIDE));
 s=JSON.parse(JSON.stringify(s));
 pick(s,index);
 assert.deepEqual(s.players[1].hand.map(x=>x.uid),[hand[1-index]]);
 assert.equal(s.players[1].mana.length,mana+1);
 assert.equal(s.players[1].mana.at(-1).uid,hand[index]);
 assert.equal(s.players[1].mana.at(-1).tapped,index===1);
 assert.equal(s.players[1].grave.length,0);
 assert.deepEqual(physical(s),before);
 act(s,'noBlock');
 assert.equal(s.decision.count,2);
});

test('Donide attacks normally against an empty hand',()=>{
 const s=setup();
 give(s,0,'battle',[DONIDE]);
 attack(s,s.players[0].battle[0].uid);
 assert.equal(s.decision.type,'block');
 act(s,'noBlock');
 assert.equal(s.decision.count,2);
});
