import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-679.json',import.meta.url)));

test('Phase 679 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:679}));
  assert.throws(()=>standardCardSpec(detail,{phase:678}));
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
   assert.deepEqual(row.spec,standardCardSpec({...row.currentPrint,status:'complete'},{phase:679}));
   assert.ok(row.currentPrint.verification.facesMatched);
   assert.ok(!data.cards.some(c=>c.id===row.currentPrint.id));
  }
 }
});

const NYAN='dmr15-026',HACHI='dmr13-053',SONG='dmr15-037';
const NAT='dm01-108',LOW='dm01-083',GENMU='dmrp15-km1';
const play=(s,id)=>act(s,'play',a=>a.cardId===id);
const values=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);

for(const n of [1,2])test('Destruction watchers count each destroyed creature on either side '+n,()=>{
 let s=setup();
 give(s,0,'battle',n===2?[NYAN,HACHI,NAT]:[NYAN,HACHI]);
 give(s,1,'battle',[NAT]);
 const [nyan,hachi]=s.players[0].battle;
 s.extTasks=[{op:'g34_Sweep',p:0,source:SONG,both:true,filter:{creature:true,exactId:NAT}}];
 act(s,'toAttack');
 for(let i=0;s.decision&&i<6;i++){
  s=JSON.parse(JSON.stringify(s));
  e.step(s,e.getLegalActions(s)[0]);
 }
 const [cat,bear]=s.players[0].battle;
 assert.equal(s.decision,null);
 assert.equal(cat.uid,nyan.uid);
 assert.equal(bear.uid,hachi.uid);
 assert.equal(e.power(cat,false,s),2000+n*2000);
 assert.equal(e.power(bear,false,s),4000+n*4000);
 assert.equal(e.effectiveCard(cat,s).breaker??1,n===2?2:1);
 assert.equal(e.effectiveCard(bear,s).breaker,2);
 act(s,'endTurn');
 assert.equal(e.power(cat,false,s),2000);
 assert.equal(e.power(bear,false,s),4000);
 assert.equal(e.effectiveCard(cat,s).breaker??1,1);
 assert.equal(e.effectiveCard(bear,s).breaker??1,1);
});

test('Bouncing a creature and moving a card from deck to grave do not trigger destruction watchers',()=>{
 const s=setup();
 give(s,0,'battle',[NYAN,HACHI]);
 give(s,1,'battle',[NAT]);
 give(s,0,'deck',[NAT,LOW,NAT]);
 s.extTasks=[{op:'g34_Mill',p:0,source:SONG,n:1},
  {op:'g34_ExactMove',p:0,source:SONG,target:s.players[1].battle[0].uid,to:'hand'}];
 act(s,'toAttack');
 assert.equal(s.decision,null);
 assert.deepEqual(s.players[0].battle.map(x=>e.power(x,false,s)),[2000,4000]);
 assert.deepEqual(s.players[1].hand.map(x=>x.cardId),[NAT]);
});

for(const mode of ['normal','reentered','spell ignored after resolving'])test('Song grants power and targets the same creature at the end step '+mode,()=>{
 let s=setup();
 give(s,0,'battle',[NAT,LOW]);
 give(s,1,'battle',[NAT]);
 give(s,0,'hand',[SONG]);
 const uid=s.players[0].battle[0].uid;
 play(s,SONG);
 assert.deepEqual(values(s),s.players[0].battle.map(x=>x.uid));
 s=JSON.parse(JSON.stringify(s));
 pick(s,uid);
 s=JSON.parse(JSON.stringify(s));
 const [ally,other]=s.players[0].battle;
 assert.equal(e.power(ally,false,s),4000);
 assert.equal(e.power(other,false,s),1000);
 if(mode==='reentered'){ally.incarnation=(ally.incarnation||0)+1;delete ally.powerModifiers;}
 if(mode==='spell ignored after resolving'){
  s.players[1].battle.push(inst(GENMU));
  assert.equal(e.power(ally,false,s),2000);
 }
 ally.tapped=true;
 other.tapped=true;
 act(s,'toAttack');
 act(s,'endTurn');
 assert.equal(ally.tapped,mode!=='normal');
 assert.ok(other.tapped);
 assert.equal(e.power(ally,false,s),2000);
});
