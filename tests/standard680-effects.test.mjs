import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-680.json',import.meta.url)));

test('Phase 680 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:680}));
  assert.throws(()=>standardCardSpec(detail,{phase:679}));
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
   assert.deepEqual(row.spec,standardCardSpec({...row.currentPrint,status:'complete'},{phase:680}));
   assert.ok(row.currentPrint.verification.facesMatched);
   assert.ok(!data.cards.some(c=>c.id===row.currentPrint.id));
  }
 }
});

const HACK='dmr05-052',BUSOU='dmr05-056',FARM='dmr06-019';
const LOW='dm01-108',SPELL='dm02-029',TWIN='dmbd17-007',GENMU='dmrp15-km1';
const play=(s,id)=>act(s,'play',a=>a.cardId===id);
const values=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();

function field(){
 const s=setup();
 s.active=0;
 return s;
}

test('Hacker offers a separate optional draw per friendly attack and expires at turn end',()=>{
 let s=field();
 give(s,0,'hand',[HACK]);
 give(s,0,'battle',[LOW,LOW]);
 const [first,second]=s.players[0].battle;
 const top=s.players[0].deck[0];
 play(s,HACK);
 attack(s,first.uid);
 assert.equal(s.decision.task.op,'g34_Draw');
 assert.deepEqual(values(s),[0,1]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,0);
 assert.equal(s.players[0].hand.length,0);
 if(s.decision?.type==='block')act(s,'noBlock');
 attack(s,second.uid);
 pick(s,1);
 assert.equal(s.players[0].hand[0].uid,top.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 act(s,'endTurn');
 assert.ok(!s.extLimits.some(l=>l.kind==='g613AttackDraw'));
});

test('Hacker does not offer a draw while the resolved spell is ignored',()=>{
 const s=field();
 give(s,0,'hand',[HACK]);
 give(s,0,'battle',[LOW]);
 play(s,HACK);
 give(s,1,'battle',[GENMU]);
 attack(s);
 assert.notEqual(s.decision?.task?.op,'g34_Draw');
 assert.equal(s.players[0].hand.length,0);
});

test('Hacker optional draw does not make CPU avoid attacking with one card left',()=>{
 const s=field();
 give(s,0,'hand',[HACK]);
 give(s,0,'battle',[LOW]);
 give(s,0,'deck',[LOW]);
 play(s,HACK);
 s.phase='attack';
 assert.equal(e.chooseAI(s).kind,'attack');
 attack(s);
 assert.equal(values(s)[e.chooseAI(s).choice],0);
});

for(const count of [0,1,2])test('Busou puts only selected graveyard creatures on top in chosen order '+count,()=>{
 let s=field();
 give(s,0,'hand',[BUSOU]);
 give(s,0,'grave',[LOW,SPELL,TWIN]);
 const [low,spell,twin]=s.players[0].grave;
 const previousTop=s.players[0].deck[0].uid,before=physical(s);
 play(s,BUSOU);
 assert.deepEqual(values(s),[low.uid,twin.uid,null]);
 const selected=[twin.uid,low.uid].slice(0,count);
 for(const uid of selected){
  pick(s,uid);
  s=JSON.parse(JSON.stringify(s));
 }
 if(s.decision?.task?.op==='g34_Select')pick(s,null);
 assert.deepEqual(s.players[0].deck.slice(0,count+1).map(x=>x.uid),[...selected,previousTop]);
 assert.ok(s.players[0].grave.some(x=>x.uid===spell.uid));
 assert.equal(s.players[0].grave.length,3-count);
 assert.deepEqual(physical(s),before);
});

for(const count of [0,1,2])test('Farm reveals selected physical hand cards and moves matching top cards to tapped mana '+count,()=>{
 let s=field();
 give(s,0,'hand',[FARM,TWIN,SPELL,LOW]);
 const [,twin,spell,low]=s.players[0].hand;
 const deck=s.players[0].deck.map(x=>x.uid),before=physical(s);
 play(s,FARM);
 assert.deepEqual(values(s),[twin.uid,spell.uid,null]);
 for(const uid of [twin.uid,spell.uid].slice(0,count)){
  pick(s,uid);
  s=JSON.parse(JSON.stringify(s));
 }
 if(s.decision?.task?.op==='g34_HandReveal462')pick(s,null);
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),[twin.uid,spell.uid,low.uid]);
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),deck.slice(count));
 for(const uid of deck.slice(0,count))assert.ok(s.players[0].mana.some(x=>x.uid===uid&&x.tapped));
 assert.equal(s.log.filter(x=>x.type==='reveal').length,count);
 assert.deepEqual(physical(s),before);
});
