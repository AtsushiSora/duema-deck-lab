import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-730.json',import.meta.url)));

test('Phase 730 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:730}));
  assert.throws(()=>standardCardSpec(detail,{phase:729}));
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
  const incomplete=structuredClone(detail);
  incomplete.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(incomplete,{phase:730}));
 }
});

const TIARA='dm07-028', REGI='dm14-043', RANSEN='dm14-065';
const FIRE='dm01-097', DARK='dm01-055', WATER='dm01-049', BEAST='dm01-108';
const FIRE_DARK='dmex14-108', WATER_DARK='dm10-064', FIRE_GEAR='dm28-033', WATER_GEAR='dm16-026';
const BLOCKER='dm01-011', GUARD='dmrp01-027', HAND='dm01-027';
const field=()=>Object.assign(setup(),{active:0});
const restore=s=>JSON.parse(JSON.stringify(s));
function put(s,p,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
}
const inZone=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const noBlock=s=>act(s,'noBlock');
function play(s,id){
 s.phase='main';
 const x=inst(id);
 s.players[s.active].hand.push(x);
 act(s,'play',a=>a.uid===x.uid&&!a.alternative);
 return x;
}

test('Tiara gains Slayer when attacked directly and destroys the surviving attacker',()=>{
 let s=field();
 const tiara=put(s,1,TIARA,{tapped:true}),attacker=put(s,0,BLOCKER);
 assert.ok(!e.effectiveCard(tiara,s).slayer);
 attack(s,attacker.uid,tiara.uid);
 assert.equal(e.effectiveCard(tiara,s).slayer,true);
 s=restore(s);
 noBlock(s);
 drain(s);
 assert.ok(inZone(s,0,'grave',attacker)&&inZone(s,1,'grave',tiara));
});

test('Tiara keeps the grant for the turn after a Guardman redirects the attack',()=>{
 const s=field(),attacker=put(s,0,BLOCKER),tiara=put(s,1,TIARA,{tapped:true});
 const guard=put(s,1,GUARD);
 attack(s,attacker.uid,tiara.uid);
 act(s,'guardman',a=>a.uid===guard.uid);
 drain(s);
 assert.ok(inZone(s,1,'battle',tiara)&&inZone(s,1,'battle',guard));
 assert.equal(e.effectiveCard(tiara,s).slayer,true);
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
 assert.ok(!e.effectiveCard(tiara,s).slayer);
});

test('Tiara does not gain Slayer if a block redirects a player attack to it',()=>{
 const s=field(),attacker=put(s,0,'dm08-049'),tiara=put(s,1,TIARA);
 tiara.g34Grants=[{turn:s.turn,blocker:true}];
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===tiara.uid);
 drain(s);
 assert.ok(inZone(s,1,'grave',tiara)&&inZone(s,0,'battle',attacker));
});

test('Regi counts each creature once across both battle zones, ignoring sealed cards and gears',()=>{
 const s=field(),regi=put(s,0,REGI);
 put(s,0,FIRE_DARK);
 put(s,1,DARK);
 put(s,1,FIRE,{sealed:true});
 put(s,1,FIRE_GEAR);
 put(s,0,WATER);
 assert.equal(e.power(regi,false,s),2000);
 assert.ok(e.effectiveCard(regi,s).blocker);
 s.phase='attack';
 put(s,1,BEAST,{tapped:true});
 const attacks=e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===regi.uid);
 assert.ok(attacks.length);
 assert.ok(attacks.every(a=>a.target!=='player'));
});

test('Regi can block and battles at the reduced power',()=>{
 const s=field(),attacker=put(s,0,FIRE,{buff:1000}),regi=put(s,1,REGI);
 put(s,0,FIRE_DARK);
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===regi.uid);
 drain(s);
 assert.ok(inZone(s,1,'grave',regi));
 assert.equal(s.players[1].shields.length,5);
});

test('Regi is destroyed by the rules when the fourth qualifying creature enters',()=>{
 const s=field(),regi=put(s,0,REGI);
 put(s,0,DARK);
 put(s,1,FIRE_DARK);
 put(s,1,FIRE);
 assert.equal(e.power(regi,false,s),1000);
 const fourth=play(s,FIRE);
 drain(s);
 assert.ok(inZone(s,0,'grave',regi)&&inZone(s,0,'battle',fourth));
});

test('Ransen counts a dual-civilization creature once and updates when it leaves',()=>{
 const s=field(),ransen=put(s,0,RANSEN);
 const target=put(s,1,WATER_DARK);
 put(s,0,WATER_GEAR);
 assert.equal(e.power(ransen,false,s),5000);
 assert.equal(e.effectiveCard(ransen,s).breaker,1);
 play(s,HAND);
 act(s,'effect',a=>a.targets.some(t=>t.uid===target.uid));
 assert.equal(e.power(ransen,false,s),6000);
 assert.equal(e.effectiveCard(ransen,s).breaker,2);
});

for(const [penalty,boost,breaks] of [[false,0,2],[true,0,1],[true,1000,2]])test('Ransen breaks according to its current power '+[penalty,boost,breaks].join(','),()=>{
 const s=field(),ransen=put(s,0,RANSEN,{buff:boost});
 if(penalty)put(s,0,WATER_DARK);
 attack(s,ransen.uid);
 noBlock(s);
 drain(s);
 assert.equal(s.players[1].shields.length,5-breaks);
});

test('Ransen is destroyed by the rules at zero power with qualifying creatures on both sides',()=>{
 const s=field(),ransen=put(s,0,RANSEN);
 for(let p=0;p<2;p++)for(let i=0;i<(p===0?2:3);i++)put(s,p,WATER);
 assert.equal(e.power(ransen,false,s),1000);
 const sixth=play(s,WATER);
 drain(s);
 assert.ok(inZone(s,0,'grave',ransen)&&inZone(s,0,'battle',sixth));
});
