import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-673.json',import.meta.url)));

test('Phase 673 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:673}));
  assert.throws(()=>standardCardSpec(detail,{phase:672}));
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
   assert.deepEqual(row.spec,standardCardSpec({...row.currentPrint,status:'complete'},{phase:673}));
   assert.ok(row.currentPrint.verification.facesMatched);
   assert.ok(!data.cards.some(c=>c.id===row.currentPrint.id));
  }
 }
});

const VELVET='dmr09-s01',CYBER='dmr09-s03',TESTA='dmr11-053';
const NAT='dm01-108',WATER='dm01-080',EX='dmrp18-km3',HAND='dm01-027';
const has=(xs,uid)=>xs.some(x=>x.uid===uid);
const play=(s,id)=>act(s,'play',a=>a.cardId===id);
const values=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);

test('Velvet keeps its original print ID and taps only opposing creatures as they enter',()=>{
 const s=setup();
 give(s,0,'battle',[VELVET]);
 give(s,0,'hand',[NAT]);
 const [velvet]=s.players[0].battle;
 const [ally]=s.players[0].hand;
 assert.equal(e.effectiveCard(velvet,s).blocker,true);
 assert.equal(e.effectiveCard(velvet,s).breaker,2);
 play(s,NAT);
 assert.equal(s.players[0].battle.find(x=>x.uid===ally.uid).tapped,false);
 give(s,1,'hand',[NAT,NAT]);
 const [enemy,second]=s.players[1].hand;
 s.active=1;
 play(s,NAT);
 assert.equal(s.players[1].battle.find(x=>x.uid===enemy.uid).tapped,true);
 const base=inst('dm01-042');
 s.players[1].battle.push(base);
 s.players[1].hand.push(inst('dmr09-013'));
 play(s,'dmr09-013');
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.equal(s.players[1].battle.find(x=>x.cardId==='dmr09-013').tapped,true);
 velvet.g35Ignored=s.turn;
 play(s,NAT);
 assert.equal(s.players[1].battle.find(x=>x.uid===second.uid).tapped,false);
 assert.notEqual(e.card('dm22ex1-062').name,e.card(VELVET).name);
});

for(const mode of ['both','decline','replaced','partial'])test('Cyber shuffles only when a chosen creature actually enters the deck: '+mode,()=>{
 let s=setup();
 give(s,0,'hand',[CYBER]);
 const protectedTarget=mode==='replaced'||mode==='partial';
 give(s,1,'battle',protectedTarget?[EX,NAT]:[NAT,WATER]);
 const [first,second]=s.players[1].battle,[life]=s.players[1].shields;
 if(protectedTarget)first.exLifeShieldUid=life.uid;
 const originalDeck=s.players[1].deck.map(x=>x.uid),rng=s.rng;
 play(s,CYBER);
 assert.deepEqual(values(s),[first.uid,second.uid,null]);
 if(mode==='decline')pick(s,null);
 else{
  pick(s,first.uid);
  s=JSON.parse(JSON.stringify(s));
  pick(s,mode==='both'||mode==='partial'?second.uid:null);
  if(s.decision?.type==='leave')act(s,'replaceEx');
  if(s.decision?.task?.op==='g34_Draw'){
   assert.equal(s.rng!==rng,mode==='partial');
   pick(s,0);
  }
  if(s.decision?.task?.op==='g34_Execute')pick(s,null);
 }
 assert.equal(s.decision,null);
 const moved=mode==='both'?[first.uid,second.uid]:mode==='partial'?[second.uid]:[];
 assert.equal(s.rng!==rng,!!moved.length);
 if(moved.length){
  assert.deepEqual(s.players[1].deck.map(x=>x.uid).sort(),[...originalDeck,...moved].sort());
  assert.equal(s.players[1].battle.length,2-moved.length);
 }else{
  assert.deepEqual(s.players[1].deck.map(x=>x.uid),originalDeck);
  assert.ok(has(s.players[1].battle,first.uid));
 }
 if(protectedTarget)assert.ok(has(s.players[1].grave,life.uid));
 const cyber=s.players[0].battle.find(x=>x.cardId===CYBER);
 assert.equal(e.effectiveCard(cyber,s).unblockable,true);
 assert.equal(e.effectiveCard(cyber,s).breaker,2);
});

for(const mode of ['bounce','discard','empty'])test('Unyielding Testa Rosa resolves its chosen destruction ability: '+mode,()=>{
 const s=setup();
 give(s,0,'battle',[TESTA]);
 give(s,0,'hand',mode==='empty'?[]:[NAT]);
 give(s,1,'battle',[NAT]);
 give(s,1,'hand',[HAND]);
 const [source]=s.players[0].battle,[enemy]=s.players[1].battle;
 const [top]=s.players[0].deck,[discard]=s.players[0].hand;
 s.active=1;
 play(s,HAND);
 act(s,'effect',a=>a.targets[0]?.uid===source.uid);
 assert.equal(s.decision?.task?.op,'g34_Choose');
 pick(s,mode==='bounce'?0:1);
 if(mode==='bounce')pick(s,enemy.uid);
 if(mode==='discard')pick(s,discard.uid);
 assert.ok(has(s.players[0].grave,source.uid));
 assert.equal(has(s.players[1].hand,enemy.uid),mode==='bounce');
 assert.equal(has(s.players[0].hand,top.uid),mode!=='bounce');
 if(mode==='discard')assert.ok(has(s.players[0].grave,discard.uid));
});

test('Unyielding Testa Rosa enters mana tapped',()=>{
 const s=setup();
 give(s,0,'hand',[TESTA]);
 const [source]=s.players[0].hand;
 s.phase='charge';
 act(s,'charge',a=>a.uid===source.uid);
 assert.equal(s.players[0].mana.find(x=>x.uid===source.uid)?.tapped,true);
});
