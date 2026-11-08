import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-654.json',import.meta.url)));
const DIG='dm26rp2-017',GUARD='dm26rp2-013',HIT='dm26rp2-019';
const PLAIN='dm01-108',HIGH='dmbd16-009',SPELL='dm01-027',SEED='dmsd20-016';
const valueOf=c=>c.value?.uid??c.value;
const pick=(s,v)=>act(s,'extended',a=>valueOf(s.decision.choices[a.choice])===v);
const has=(xs,uid)=>xs.some(x=>x.uid===uid);

test('Phase 654 preserves canonical IDs for three official prints',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 assert.equal(cards.length,3);
 for(const row of cards){
  const detail=details.cards.find(d=>d.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:654}));
  assert.throws(()=>standardCardSpec(detail,{phase:653}));
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
});

const choices=s=>s.decision.choices.map(valueOf);
const targets=['dm01-042',SEED,PLAIN,'dm01-s01'];
const INFINITE='dmrp15-km1';
const REDIRECT='dm22ex1-086',APUL='dmrp22-042',METEOR='dm23sd1-003';

for(const recovered of [HIGH,PLAIN,INFINITE])test('Dig mills before recovery and checks the chosen creature face '+recovered,()=>{
 let s=setup();
 give(s,0,'hand',[DIG]);
 give(s,0,'deck',[SPELL,PLAIN,recovered===INFINITE?INFINITE:HIGH,SPELL,PLAIN,PLAIN]);
 give(s,1,'battle',[PLAIN,SEED]);
 const [spell]=s.players[0].hand,[milled,low,high]=s.players[0].deck,[enemy,seed]=s.players[1].battle;
 act(s,'play');
 assert.deepEqual(choices(s),[low.uid,high.uid]);
 assert.ok(has(s.players[0].grave,milled.uid));
 assert.equal(s.players[0].deck.length,3);
 const picked=recovered===PLAIN?low:high;
 s=JSON.parse(JSON.stringify(s));
 pick(s,picked.uid);
 assert.ok(has(s.players[0].hand,picked.uid));
 if(recovered!==PLAIN){
  assert.deepEqual(choices(s),[enemy.uid]);
  pick(s,enemy.uid);
  assert.ok(has(s.players[1].grave,enemy.uid));
 }else assert.equal(s.decision,null);
 assert.ok(has(s.players[1].battle,seed.uid));
 assert.ok(has(s.players[0].grave,spell.uid));
});

test('Dig still mills three when Apul prevents grave recovery',()=>{
 const s=setup();
 give(s,0,'hand',[DIG]);
 give(s,0,'deck',[HIGH,HIGH,HIGH,PLAIN]);
 give(s,1,'battle',[APUL]);
 act(s,'play');
 assert.equal(s.players[0].deck.length,1);
 assert.equal(s.players[0].hand.length,0);
 assert.equal(s.decision,null);
});

for(const variant of ['accept','decline','low','redirect'])test('Guard only follows a successful high-power shield placement '+variant,()=>{
 const s=setup(),high=variant!=='low';
 give(s,0,'hand',[GUARD]);
 give(s,0,'deck',[high?HIGH:PLAIN,PLAIN,PLAIN]);
 give(s,1,'battle',[PLAIN,variant==='redirect'?REDIRECT:SEED]);
 const [top]=s.players[0].deck,[enemy]=s.players[1].battle;
 act(s,'play');
 if(variant==='redirect'){
  assert.ok(has(s.players[0].grave,top.uid));
  assert.ok(!has(s.players[0].shields,top.uid));
 }else assert.equal(s.players[0].shields.find(x=>x.uid===top.uid).faceUp,true);
 if(['accept','decline'].includes(variant)){
  assert.deepEqual(choices(s),[enemy.uid,null]);
  pick(s,variant==='accept'?enemy.uid:null);
 }
 assert.equal(s.decision,null);
 assert.equal(has(s.players[1].shields,enemy.uid),variant==='accept');
});

test('Hit draws first, then can destroy two creatures with total cost exactly six',()=>{
 let s=setup();
 give(s,0,'hand',[HIT,HIGH]);
 give(s,0,'deck',[PLAIN,PLAIN,PLAIN,PLAIN]);
 give(s,1,'battle',targets);
 const [,discard]=s.players[0].hand,[four,seed,two,seven]=s.players[1].battle;
 act(s,'play');
 pick(s,discard.uid);
 assert.ok(has(s.players[0].grave,discard.uid));
 assert.equal(s.players[0].hand.length,2);
 assert.deepEqual(choices(s),[four.uid,seed.uid,two.uid,null]);
 pick(s,four.uid);
 assert.deepEqual(choices(s),[seed.uid,two.uid,null]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,two.uid);
 assert.equal(s.decision,null);
 assert.ok(has(s.players[1].grave,four.uid));
 assert.ok(has(s.players[1].grave,two.uid));
 assert.ok(has(s.players[1].battle,seed.uid));
 assert.ok(has(s.players[1].battle,seven.uid));
});

test('Hit can destroy a Tamaseed and lets the player stop below six',()=>{
 const s=setup();
 give(s,0,'hand',[HIT,HIGH]);
 give(s,1,'battle',[SEED,PLAIN]);
 const [seed,keep]=s.players[1].battle;
 act(s,'play');
 pick(s,s.players[0].hand[0].uid);
 pick(s,seed.uid);
 pick(s,null);
 assert.ok(has(s.players[1].grave,seed.uid));
 assert.ok(has(s.players[1].battle,keep.uid));
});

for(const hand of [[],[PLAIN],[SPELL]])test('Hit draws two without the destruction option for hand '+hand,()=>{
 const s=setup();
 give(s,0,'hand',[HIT,...hand]);
 give(s,1,'battle',[PLAIN]);
 const deck=s.players[0].deck.length;
 act(s,'play');
 if(hand.length)pick(s,s.players[0].hand[0].uid);
 assert.equal(s.players[0].hand.length,2);
 assert.equal(s.players[0].deck.length,deck-2);
 assert.equal(s.decision,null);
 assert.equal(s.players[1].battle.length,1);
});

test('Hit from S Trigger still draws when the selected creature replaces its discard',()=>{
 const s=setup();
 give(s,0,'shields',[HIT]);
 give(s,0,'hand',[METEOR]);
 give(s,1,'battle',[PLAIN]);
 const [meteor]=s.players[0].hand,deck=s.players[0].deck.length;
 s.active=1;
 attack(s);
 act(s,'noBlock');
 act(s,'useTrigger');
 pick(s,meteor.uid);
 assert.ok(has(s.players[0].battle,meteor.uid));
 assert.ok(!has(s.players[0].grave,meteor.uid));
 assert.equal(s.players[0].deck.length,deck-2);
 assert.notEqual(s.decision?.task?.op,'g34_Select');
 drain(s);
});
