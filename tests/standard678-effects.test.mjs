import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-678.json',import.meta.url)));

test('Phase 678 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:678}));
  assert.throws(()=>standardCardSpec(detail,{phase:677}));
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
   assert.deepEqual(row.spec,standardCardSpec({...row.currentPrint,status:'complete'},{phase:678}));
   assert.ok(row.currentPrint.verification.facesMatched);
   assert.ok(!data.cards.some(c=>c.id===row.currentPrint.id));
  }
 }
});

const PRIN='dmr11-034',YAMI='dmr06-034',MOEL='dmr07-051';
const NAT='dm01-108',SPARK='dm01-015',DRAW='dm06-085',HUNTER='dmx04-013';
const play=(s,id)=>act(s,'play',a=>a.cardId===id);
const values=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);

for(const mode of ['own turn','enemy turn','muted'])test('Tap-watching Prin reacts only to new opposing taps on its own turn '+mode,()=>{
 let s=setup();
 give(s,0,'battle',[PRIN]);
 give(s,1,'battle',[NAT,NAT,NAT]);
 s.players[1].battle[1].tapped=true;
 if(mode==='muted')s.players[0].battle[0].g35Ignored=s.turn;
 s.active=mode==='enemy turn'?1:0;
 const before=s.players[0].deck.length;
 s.extTasks=[{op:'g34_TapAll',p:0,source:SPARK}];
 act(s,'toAttack');
 if(mode==='own turn'){
  if(s.decision.type==='effectOrder')e.step(s,e.getLegalActions(s)[0]);
  assert.equal(s.decision.source,PRIN);
  pick(s,1);
  assert.equal(s.decision.source,PRIN);
  s=JSON.parse(JSON.stringify(s));
  pick(s,0);
 }
 assert.equal(s.decision,null);
 assert.ok(s.players[1].battle.every(x=>x.tapped));
 assert.equal(s.players[0].deck.length,before-Number(mode==='own turn'));
});

test('Tap-watching Prin also triggers when an opponent actually taps a blocker',()=>{
 const s=setup();
 give(s,0,'battle',[PRIN,NAT]);
 give(s,1,'battle',['dmr08-022']);
 attack(s,s.players[0].battle[1].uid);
 act(s,'block');
 assert.equal(s.decision.source,PRIN);
 pick(s,0);
 assert.equal(s.decision,null);
});

for(const mode of ['first draw only','draw two','after first','watcher turn','muted'])test('Yamikabachi detects only extra opposing draws during the opposing turn '+mode,()=>{
 const s=setup();
 give(s,0,'battle',[YAMI]);
 s.active=mode==='watcher turn'?0:1;
 if(mode==='muted')s.players[0].battle[0].g35Ignored=s.turn;
 if(mode==='after first')s.players[1].drawsThisTurn=1;
 const before=s.players[0].deck.length;
 const n=mode==='first draw only'||mode==='after first'?1:2;
 if(n===2&&s.active===1){give(s,1,'hand',[DRAW]);play(s,DRAW);}
 else{s.extTasks=[{op:'g34_Draw',p:1,source:DRAW,n}];act(s,'toAttack');}
 const triggers=mode==='draw two'||mode==='after first';
 if(triggers){
  assert.equal(s.decision.source,YAMI);
  assert.equal(s.decision.player,0);
  pick(s,1);
 }
 assert.equal(s.decision,null);
 assert.equal(s.players[0].deck.length,before-Number(triggers));
});

for(const mode of ['take','decline','missing'])test('Moel searches for one Hunter, then always shuffles '+mode,()=>{
 let s=setup();
 give(s,0,'hand',[MOEL]);
 give(s,0,'deck',[NAT,SPARK,NAT,mode==='missing'?NAT:HUNTER,NAT]);
 const target=s.players[0].deck[3].uid,rng=s.rng;
 play(s,MOEL);
 if(mode!=='missing'){
  assert.equal(s.decision.task.op,'g34_LookPick');
  assert.deepEqual(values(s),[target,null]);
  assert.equal(s.rng,rng);
  s=JSON.parse(JSON.stringify(s));
  pick(s,mode==='take'?target:null);
 }
 assert.equal(s.decision,null);
 assert.notEqual(s.rng,rng);
 assert.equal(s.players[0].hand.some(x=>x.uid===target),mode==='take');
 assert.equal(s.log.some(l=>l.type==='reveal'&&l.text.includes(e.card(HUNTER).name)),mode==='take');
 assert.equal(s.players[0].deck.length,mode==='take'?4:5);
 assert.equal(s.players[0].g34Protected?.length??0,0);
});
