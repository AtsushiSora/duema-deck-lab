import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-779.json',import.meta.url)));
const MARS="dm24rp3-030",ASH="dm24rp3-S08",WORDS="dm24rp2-036";
const BODY="dm01-108",FIRE="dm01-097",BIG="dm01-007",SPELL="dm01-110",SURFER="dm05-024";
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 779 definitions and alternate prints preserve the canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:779}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:779}));
  assert.deepEqual(registry.cards.filter(c=>canonicalCardName(c.name)===canonicalCardName(row.name)).map(c=>c.id),[row.id]);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[key],value);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
  const prints=printAliases.filter(x=>x.canonicalId===row.id);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:prints[0]?.id??row.id,count:1});
  deck.cards=registry.resolveRows(deck.cards);
  assert.equal(deck.cards.at(-1).id,row.id);
  assert.deepEqual(e.validateDeck(deck),[]);
  for(const print of prints){
   assert.equal(regulationVerification.limits[print.id],regulationVerification.limits[row.id]);
   assert.equal(print.verification.facesMatched,true);
   assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:779}),row.spec);
   assert.equal(registry.get(print.id).id,row.id);
   assert.equal(registry.get(print.id.toLowerCase()).id,row.id);
   assert.equal(refs.find(x=>x.id===print.id.toLowerCase()).image,print.image);
  }
 }
});

const ids=(s,p,zone)=>s.players[p][zone].map(x=>x.uid);
const values=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
function summon(s,id,alt){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&(alt?a.role==='paidAlt568'&&a.cost===alt:!a.alternative));
 return x;
}
function breakShields(s,attacker){
 attack(s,attacker.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields');
}

test('Marsias alternative summon gives its opponent a private optional deployment of cost at most three',()=>{
 let s=setup();
 put(s,1,'battle','dmrp16-s05');
 const x=put(s,1,'hand',BODY),big=put(s,1,'hand',BIG),spell=put(s,1,'hand',SPELL);
 const mars=summon(s,MARS,2);
 assert.ok(has(s,0,'battle',mars));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,2);
 assert.equal(s.decision.player,1);
 assert.deepEqual(values(s),[x.uid,null]);
 s=restore(s);
 pick(s,x.uid);
 assert.ok(has(s,1,'battle',x));
 assert.deepEqual(ids(s,1,'hand'),[big.uid,spell.uid]);
 assert.ok(s.players[1].mana.every(x=>!x.tapped));
});

test('Marsias regular summon, declined deployment, and no valid creature all leave the opposing hand intact',()=>{
 for(const [paid,valid] of [[false,true],[true,true],[true,false]]){
  const s=setup(),x=put(s,1,'hand',valid?BODY:BIG);
  summon(s,MARS,paid?2:0);
  if(paid&&valid)pick(s,null);
  assert.equal(s.decision,null);
  assert.ok(has(s,1,'hand',x));
 }
});

test('Ash alternate summon lets the opponent shield both top cards or decline; regular summon leaves shields alone',()=>{
 for(const [paid,accept] of [[true,true],[true,false],[false,false]]){
  const s=setup(),shields=ids(s,1,'shields'),deck=ids(s,1,'deck');
  const ash=summon(s,ASH,paid?4:0);
  if(paid){assert.equal(s.decision.player,1);pick(s,accept?true:null);}
  assert.equal(s.decision,null);
  assert.deepEqual(ids(s,1,'shields'),[...shields,...(accept?deck.slice(0,2):[])]);
  assert.deepEqual(ids(s,1,'deck'),deck.slice(accept?2:0));
  assert.ok(s.players[1].shields.every(x=>!x.faceUp));
  s.phase='attack';
  assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===ash.uid));
 }
});

test('Ash waits for the S-Trigger creature to enter, draws once for a simultaneous W-break, then its entry ability resolves',()=>{
 let s=setup();
 const ash=summon(s,ASH,0);
 give(s,1,'shields',[SURFER,BODY]);
 const first=s.players[0].deck[0];
 breakShields(s,ash);
 assert.equal(s.decision.type,'trigger');
 assert.ok(!has(s,0,'hand',first));
 act(s,'useTrigger');
 assert.equal(s.players[1].battle[0].cardId,SURFER);
 assert.equal(s.decision.task.op,'g34_Offer');
 assert.equal(s.decision.player,0);
 s=restore(s);
 pick(s,true);
 assert.ok(has(s,0,'hand',first));
 assert.equal(s.decision.player,1);
 act(s,'effect',a=>a.targets.some(x=>x.uid===ash.uid));
 assert.ok(has(s,0,'hand',ash));
 assert.equal(s.decision,null);
 assert.equal(s.players[0].hand.length,2);
});

test('Ash watches other allied creatures, but not opposing creatures or a shield-breaking spell',()=>{
 for(const kind of ['ally','enemy','spell']){
  const s=setup();
  put(s,0,'battle',ASH);
  if(kind==='enemy')s.active=1;
  give(s,1-s.active,'shields',[BODY]);
  const first=s.players[0].deck[0];
  if(kind==='spell'){
   const spell=put(s,0,'hand','dm24rp4-020');
   act(s,'play',a=>a.uid===spell.uid);
   assert.equal(s.decision.task.op,'g19Yobi');   pick(s,null);
   assert.equal(s.decision.task.op,'g34_Choose');
   pick(s,0);
   pick(s,s.players[1].shields[0].uid);
  }else breakShields(s,put(s,s.active,'battle',FIRE));
  if(kind==='ally'){
   assert.equal(s.decision.task.op,'g34_Offer');
   pick(s,true);
   assert.ok(has(s,0,'hand',first));
  }else{
   assert.equal(s.decision,null);
   assert.ok(!has(s,0,'hand',first));
  }
 }
});

test('Words selects at most one of each tap state, moving neither until both choices are made',()=>{
 for(const tappedFirst of [true,false]){
  let s=setup();
  const a=put(s,1,'battle',FIRE),b=put(s,0,'battle',BODY),c=put(s,1,'battle',BIG);
  a.tapped=c.tapped=true;
  summon(s,WORDS,0);
  assert.ok(values(s).includes(null));
  pick(s,tappedFirst?a.uid:b.uid);
  assert.ok(has(s,1,'battle',a)&&has(s,0,'battle',b));
  assert.deepEqual(values(s).filter(Boolean).sort(),(tappedFirst?[b.uid]:[a.uid,c.uid]).sort());
  s=restore(s);
  pick(s,tappedFirst?b.uid:a.uid);
  assert.ok(has(s,1,'hand',a)&&has(s,0,'hand',b));
  assert.ok(has(s,1,'battle',c));
 }
});

test('Words can use S-Trigger at no mana cost and can return only one creature or skip all',()=>{
 for(const accept of [true,false]){
  const s=setup();
  s.active=1;
  give(s,0,'shields',[WORDS]);
  const x=put(s,1,'battle',FIRE),y=put(s,1,'battle',BODY);
  breakShields(s,x);
  act(s,'useTrigger');
  pick(s,accept?x.uid:null);
  if(accept)pick(s,null);
  assert.equal(s.decision,null);
  assert.ok(has(s,1,accept?'hand':'battle',x));
  assert.ok(has(s,1,'battle',y));
  assert.ok(s.players[0].mana.every(x=>!x.tapped));
 }
});

test('Ash keeps its pending draw if an S-Trigger spell destroys it before the draw resolves',()=>{
 const s=setup(),ash=put(s,0,'battle',ASH),ally=put(s,0,'battle',FIRE);
 give(s,1,'shields',['dm01-027']);
 breakShields(s,ally);
 act(s,'useTrigger');
 assert.equal(s.decision.effect,'destroy');
 act(s,'effect',a=>a.targets.some(x=>x.uid===ash.uid));
 assert.ok(has(s,0,'grave',ash));
 assert.equal(s.decision.task.op,'g34_Offer');
 const first=s.players[0].deck[0];
 pick(s,true);
 assert.ok(has(s,0,'hand',first));
});

test('Ash shieldizes as much as possible and then checks for deck-out',()=>{
 const s=setup();
 give(s,1,'deck',[BODY]);
 const last=s.players[1].deck[0],shields=ids(s,1,'shields');
 summon(s,ASH,4);
 pick(s,true);
 assert.deepEqual(ids(s,1,'shields'),[...shields,last.uid]);
 assert.equal(s.winner,0);
});
