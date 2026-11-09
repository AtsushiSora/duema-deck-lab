import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,cast,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-755.json',import.meta.url)));
const HIT='dmrp01-050',BLUES='dm38-029',MU='dmrp06-091';
const FIRE='dm01-097',NATURE='dm01-108',DEPLOY='dm25rp3-057',UNTAP='dm26rp2-057';
function base(){
 const s=setup();
 s.active=0;
 for(const p of [0,1])give(s,p,'deck',Array(25).fill(NATURE));
 return s;
}
function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}
const power=(s,x)=>e.power(x,false,s);
const pickUID=(s,uid)=>act(s,'extended',a=>{
 const v=s.decision.choices[a.choice].value;
 return (v?.uid??v)===uid;
});

test('three verified cards and two alternate prints resolve without duplicate registrations',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 assert.equal(registry.cards.length,snapshot.registeredNameCount);
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:755}));
  assert.throws(()=>standardCardSpec(detail,{phase:754}));
  const incomplete=structuredClone(detail);
  incomplete.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(incomplete,{phase:755}));
  for(const [field,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[field],value);
  assert.deepEqual(registry.cards.filter(c=>key(c.name)===key(row.name)).map(c=>c.id),[row.id]);
  assert.ok(row.verification.facesMatched);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:row.id,count:1});
  assert.deepEqual(registry.resolveRows(deck.cards),deck.cards);
  assert.deepEqual(e.validateDeck(deck),[]);
 }
 for(const row of printAliases){
  const original=cards.find(c=>c.id===row.canonicalId);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:755}),original.spec);
  assert.ok(row.verification.facesMatched);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
  assert.equal(registry.get(row.id).id,row.canonicalId);
  assert.deepEqual(registry.resolveRows([{id:row.id,count:1},{id:row.canonicalId,count:2}]),[{id:row.canonicalId,count:3}]);
 }
 assert.equal(key(registry.get('dmsd03-010').name),key(String.raw`\"BC\" ヒット`));
 const {entries}=JSON.parse(readFileSync(new URL('../dist/image-index.json',import.meta.url)));
 assert.deepEqual(entries.filter(([, , print])=>print==='dmsd03-010').map(([id])=>id),[HIT]);
});

test('BC Hit counts itself before payment and can W-break with two cards in hand',()=>{
 for(const count of [1,2,3]){
  const s=base();
  give(s,0,'hand',Array(count-1).fill(FIRE));
  const hit=put(s,0,'hand',HIT);
  const legal=e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===hit.uid);
  assert.equal(legal,count<=2);
  if(!legal)continue;
  act(s,'play',a=>a.uid===hit.uid);
  assert.ok(s.players[0].battle.includes(hit));
  assert.equal(s.players[0].hand.length,count-1);
  assert.equal(e.effectiveCard(hit,s).breaker,2);
  end(s);
  end(s);
  attack(s,hit.uid);
  drain(s);
  assert.equal(s.players[1].shields.length,3);
 }
});

test('an effect can put BC Hit in play even when summoning it would be illegal',()=>{
 const s=base(),hit=put(s,0,'hand',HIT);
 for(let i=0;i<3;i++)put(s,0,'hand',FIRE);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===hit.uid));
 cast(s,DEPLOY);
 pickUID(s,hit.uid);
 drain(s);
 assert.ok(s.players[0].battle.includes(hit));
 assert.equal(s.players[0].hand.length,3);
});

test('Blues stays tapped at own turn start but an untapping spell still untaps it',()=>{
 const s=base();
 cast(s,BLUES);
 const blues=s.players[0].battle[0],other=put(s,0,'battle',FIRE,{tapped:true});
 assert.deepEqual(e.card(blues).g558Souls,['K']);
 end(s);
 end(s);
 attack(s,blues.uid);
 drain(s);
 end(s);
 end(s);
 assert.ok(blues.tapped&&!other.tapped);
 s.phase='main';
 cast(s,UNTAP);
 pickUID(s,blues.uid);
 drain(s);
 assert.ok(!blues.tapped);
});

test('Muoom only boosts a different friendly creature, and the boosts add and expire',()=>{
 let s=base();
 cast(s,MU);
 const first=s.players[0].battle[0],untouched=put(s,0,'battle',FIRE);
 assert.equal(power(s,first),3000);
 cast(s,MU);
 const second=s.players[0].battle.at(-1);
 assert.equal(power(s,second),6000);
 assert.equal(power(s,first),3000);
 cast(s,FIRE);
 const boosted=s.players[0].battle.at(-1);
 assert.ok(['effectOrder','entryOrder'].includes(s.decision?.type));
 s=JSON.parse(JSON.stringify(s));
 drain(s);
 const find=ref=>s.players[0].battle.find(x=>x.uid===ref.uid);
 assert.equal(power(s,find(boosted)),8000);
 assert.equal(power(s,find(untouched)),2000);
 assert.equal(power(s,find(second)),6000);
 end(s);
 assert.equal(power(s,find(boosted)),2000);
 assert.equal(power(s,find(second)),3000);
 s.phase='main';
 cast(s,FIRE);
 assert.equal(power(s,s.players[1].battle.at(-1)),2000);
});
