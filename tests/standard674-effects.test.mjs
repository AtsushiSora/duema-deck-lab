import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-674.json',import.meta.url)));

test('Phase 674 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:674}));
  assert.throws(()=>standardCardSpec(detail,{phase:673}));
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
   assert.deepEqual(row.spec,standardCardSpec({...row.currentPrint,status:'complete'},{phase:674}));
   assert.ok(row.currentPrint.verification.facesMatched);
   assert.ok(!data.cards.some(c=>c.id===row.currentPrint.id));
  }
 }
});

const DECA='dmr11-015',COBBLE='dmr11-049',PATCH='dmr11-037';
const NAT='dm01-108',SPELL='dm01-086',TWIN='dmex12-074';
const values=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const play=(s,id)=>act(s,'play',a=>a.cardId===id);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();

for(const mode of ['deploy','decline','absent'])test('Decabull searches the full library and shuffles after '+mode,()=>{
 let s=setup();
 give(s,0,'hand',[DECA,COBBLE]);
 give(s,0,'deck',[NAT,SPELL,NAT,mode==='absent'?NAT:COBBLE,NAT]);
 const target=s.players[0].deck[3].uid,original=physical(s),rng=s.rng;
 play(s,DECA);
 if(mode!=='absent'){
  assert.equal(s.decision.task.op,'g34_Select');
  assert.deepEqual(values(s),[target,null]);
  assert.ok(s.log.filter(l=>l.type==='look').every(l=>!l.text.includes(e.card(COBBLE).name)));
  assert.equal(s.rng,rng);
  s=JSON.parse(JSON.stringify(s));
  pick(s,mode==='deploy'?target:null);
 }
 assert.equal(s.decision,null);
 assert.notEqual(s.rng,rng);
 assert.equal(s.players[0].deck.length,mode==='deploy'?4:5);
 assert.equal(s.players[0].battle.some(x=>x.uid===target),mode==='deploy');
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,7);
 assert.equal(s.players[0].hand[0].cardId,COBBLE);
 assert.equal(e.effectiveCard(s.players[0].battle[0],s).breaker,2);
 assert.equal(s.players[0].g34Protected?.length??0,0);
 assert.deepEqual(physical(s),original);
});

test('Cobble gains power and W Breaker only while its own unsealed Decabull is in battle',()=>{
 const s=setup();
 give(s,0,'battle',[COBBLE]);
 give(s,1,'battle',[DECA]);
 const [cobble]=s.players[0].battle;
 const stats=()=>{const c=e.effectiveCard(cobble,s);return [c.power,c.breaker??1];};
 const a=inst(DECA),b=inst(DECA);
 assert.deepEqual(stats(),[3000,1]);
 s.players[0].battle.push(a,b);
 assert.deepEqual(stats(),[6000,2]);
 a.sealed=true;
 b.g35Ignored=s.turn;
 assert.deepEqual(stats(),[6000,2]);
 s.players[0].grave.push(s.players[0].battle.pop());
 assert.deepEqual(stats(),[3000,1]);
 a.sealed=false;
 cobble.g35Ignored=s.turn;
 assert.deepEqual(stats(),[3000,1]);
});

for(const n of [0,1,2])test('Patchigi reveals the full opposing hand, then draws '+n+' of two possible cards',()=>{
 let s=setup();
 give(s,0,'hand',[PATCH]);
 give(s,1,'hand',[NAT,SPELL,TWIN]);
 const enemy=s.players[1].hand.map(x=>x.uid),before=physical(s),top=s.players[0].deck.slice(0,n).map(x=>x.uid);
 play(s,PATCH);
 assert.equal(e.effectiveCard(s.players[0].battle[0],s).unblockable,true);
 assert.equal(s.decision.task.op,'g34_InspectHand');
 assert.deepEqual(s.decision.task.seen,[NAT,SPELL,TWIN]);
 assert.ok(s.log.some(l=>l.type==='reveal'&&[NAT,SPELL,TWIN].every(id=>l.text.includes(e.card(id).name))));
 s=JSON.parse(JSON.stringify(s));
 pick(s,true);
 assert.equal(s.decision.task.n,2);
 for(let i=0;i<n;i++)pick(s,true);
 if(n<2)pick(s,null);
 assert.equal(s.decision,null);
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),top);
 assert.deepEqual(s.players[1].hand.map(x=>x.uid),enemy);
 assert.deepEqual(physical(s),before);
});

for(const hand of [[],[NAT]])test('Patchigi cannot draw without a spell in the opposing hand ('+hand.length+')',()=>{
 const s=setup();
 give(s,0,'hand',[PATCH]);
 give(s,1,'hand',hand);
 const n=s.players[0].deck.length;
 play(s,PATCH);
 if(hand.length)pick(s,true);
 assert.equal(s.decision,null);
 assert.equal(s.players[0].deck.length,n);
});
