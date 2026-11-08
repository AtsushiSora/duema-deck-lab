import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-677.json',import.meta.url)));

test('Phase 677 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:677}));
  assert.throws(()=>standardCardSpec(detail,{phase:676}));
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
   assert.deepEqual(row.spec,standardCardSpec({...row.currentPrint,status:'complete'},{phase:677}));
   assert.ok(row.currentPrint.verification.facesMatched);
   assert.ok(!data.cards.some(c=>c.id===row.currentPrint.id));
  }
 }
});

const TESTA='dmr09-032',PRIN='dmr09-037',BRAIN='dmr08-043';
const NAT='dm01-108',SPELL='dm01-086',GENMU='dmrp15-km1';
const play=(s,id)=>act(s,'play',a=>a.cardId===id);
const values=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();

for(const origin of ['deck','hand','battle'])test('Testa stacks Power Attacker once per allied creature reaching the grave from '+origin,()=>{
 const s=setup();
 give(s,0,'battle',[TESTA]);
 const [testa]=s.players[0].battle;
 if(origin==='deck')give(s,0,'deck',[NAT,NAT,SPELL,NAT,NAT]);
 if(origin==='hand')give(s,0,'hand',[NAT,NAT,SPELL]);
 if(origin==='battle')s.players[0].battle.push(inst(NAT),inst(NAT));
 const def=origin==='deck'?{op:'g34_Mill',n:3}:origin==='hand'?{op:'g34_DiscardAll244'}:
  {op:'g34_Sweep',both:true,filter:{creature:true,exactId:NAT}};
 s.extTasks=[{...def,p:0,source:TESTA}];
 const before=physical(s);
 act(s,'toAttack');
 for(let i=0;s.decision&&i<3;i++)e.step(s,e.getLegalActions(s)[0]);
 assert.equal(s.decision,null);
 assert.equal(e.power(testa,false,s),4000);
 assert.equal(e.power(testa,true,s),14000);
 assert.equal(e.effectiveCard(testa,s).breaker,2);
 assert.deepEqual(physical(s),before);
 act(s,'endTurn');
 assert.equal(e.power(testa,true,s),4000);
 assert.equal(e.effectiveCard(testa,s).breaker??1,1);
});

test('Prin allows the first attacker to attack again and restricts new enemy creatures after Prin leaves',()=>{
 let s=setup();
 give(s,0,'battle',[NAT,NAT]);
 give(s,1,'battle',[PRIN]);
 const [first,other]=s.players[0].battle;
 s.phase='attack';
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===other.uid));
 attack(s,first.uid);
 act(s,'noBlock');
 assert.ok(s.extLimits.some(l=>l.kind==='g677OnlyAttacker'));
 s=JSON.parse(JSON.stringify(s));
 s.players[1].grave.push(s.players[1].battle.pop());
 const current=s.players[0].battle[0],late=inst(NAT);
 current.tapped=false;
 s.players[0].battle.push(late);
 const legal=()=>e.getLegalActions(s).filter(a=>a.kind==='attack').map(a=>a.uid);
 assert.deepEqual([...new Set(legal())],[first.uid]);
 assert.ok(!legal().includes(late.uid));
 act(s,'endTurn');
 assert.ok(!s.extLimits.some(l=>l.kind==='g677OnlyAttacker'));
});

test('Prin allows no exemption for a card that leaves and re-enters as a new creature',()=>{
 const s=setup();
 give(s,0,'battle',[NAT,NAT]);
 give(s,1,'battle',[PRIN]);
 const [first]=s.players[0].battle;
 attack(s,first.uid);
 act(s,'noBlock');
 first.incarnation=(first.incarnation||0)+1;
 first.tapped=false;
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'));
});

for(const mode of ['reorder','decline','suppressed'])test('Eternal Brain uses the updated optional text and its own finishing replacement '+mode,()=>{
 let s=setup();
 give(s,0,'hand',[BRAIN]);
 give(s,0,'deck',[NAT,SPELL,NAT]);
 const [spell]=s.players[0].hand,[first,second,last]=s.players[0].deck;
 second.g11Sideways=true;
 if(mode==='suppressed')give(s,1,'battle',[GENMU]);
 const before=physical(s);
 play(s,BRAIN);
 if(mode!=='suppressed'){
  assert.equal(s.decision.task.op,'g34_Offer');
  pick(s,mode==='reorder'?true:null);
  if(mode==='reorder'){
   assert.equal(s.decision.task.op,'g34_Order');
   s=JSON.parse(JSON.stringify(s));
   pick(s,second.uid);
  }
 }
 assert.equal(s.decision,null);
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),mode==='reorder'?[second.uid,first.uid,last.uid]:[first.uid,second.uid,last.uid]);
 assert.equal(s.players[0].deck.find(x=>x.uid===second.uid).g11Sideways,true);
 assert.ok(s.players[0][mode==='suppressed'?'grave':'hand'].some(x=>x.uid===spell.uid));
 assert.deepEqual(physical(s),before);
});
