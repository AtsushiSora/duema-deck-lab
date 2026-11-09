import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,cast,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {attachShield,detachShieldCard} from '../dist/shield-state.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-757.json',import.meta.url)));
const TRIO='dmrp05-082',MIRA='dmx14-002',NIGHT='dm23-014';
const NATURE='dm01-108',FIRE='dm01-097',BLOCK='dm01-001',GATE='dm01-086',AQUA='dm04-042';
function base(){
 const s=setup();
 s.active=0;
 for(const p of [0,1])give(s,p,'deck',Array(24).fill(NATURE));
 return s;
}
function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const pick=(s,value)=>act(s,'extended',a=>s.decision.choices[a.choice].value===value);

test('three cards keep their original IDs, verified images and complete definitions',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:757}));
  assert.throws(()=>standardCardSpec(detail,{phase:756}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:757}));
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
});

test('Ojamakin Trio may attack on entry, and only the other Trio returns on that attack',()=>{
 const s=base();
 const other=put(s,0,'battle',TRIO);
 cast(s,TRIO);
 const attacker=s.players[0].battle.at(-1);
 put(s,1,'battle',BLOCK);
 assert.equal(attacker.entered,s.turn);
 attack(s,attacker.uid);
 assert.equal(s.decision?.type,'block');
 assert.ok(has(s,0,'hand',other));
 assert.ok(has(s,0,'battle',attacker));
});

test('Trio returns before blocking even against a creature, and stays on an enemy attack',()=>{
 const s=base();
 const trio=put(s,0,'battle',TRIO),ally=put(s,0,'battle',FIRE);
 const enemy=put(s,1,'battle',FIRE,{tapped:true});
 put(s,1,'battle',BLOCK);
 attack(s,ally.uid,enemy.uid);
 assert.equal(s.decision?.type,'block');
 assert.ok(has(s,0,'hand',trio));
 const t=base(),other=put(t,0,'battle',TRIO),opponent=put(t,1,'battle',FIRE);
 t.active=1;
 attack(t,opponent.uid);
 drain(t);
 assert.ok(has(t,0,'battle',other));
});

test('Mirajino only gains Speed Attacker from a face-up card in its own shield zone',()=>{
 const s=base();
 cast(s,MIRA);
 const mira=s.players[0].battle[0];
 s.phase='attack';
 const canAttack=()=>e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===mira.uid&&a.target==='player');
 assert.equal(mira.entered,s.turn);
 assert.equal(canAttack(),false);
 s.players[1].shields[0].faceUp=true;
 assert.equal(canAttack(),false);
 const own=s.players[0],root=own.shields[0],attached=inst(NATURE);
 assert.ok(attachShield(own,root.uid,attached,{faceUp:true}));
 assert.equal(canAttack(),true);
 assert.equal(detachShieldCard(own,attached.uid).card.uid,attached.uid);
 assert.equal(canAttack(),false);
 root.faceUp=true;
 assert.equal(canAttack(),true);
 attack(s,mira.uid);
 drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('Nightmare waits for an opposing S-Trigger spell and its opponent chooses the discard',()=>{
 let s=base();
 const attacker=put(s,0,'battle',NATURE),night=put(s,0,'battle',NIGHT);
 const spare=put(s,1,'hand',NATURE),discard=put(s,1,'hand',FIRE);
 give(s,1,'shields',[GATE]);
 attack(s,attacker.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 act(s,'useTrigger');
 assert.equal(s.decision.type,'effect');
 act(s,'effect',a=>a.targets?.[0]?.uid===night.uid);
 assert.ok(has(s,0,'hand',night));
 assert.equal(s.decision.player,1);
 s=JSON.parse(JSON.stringify(s));
 pick(s,discard.uid);
 assert.ok(has(s,1,'grave',discard));
 assert.ok(has(s,1,'hand',spare));
});

test('Nightmare reacts to a used creature S-Trigger but not to a declined one or normal casting',()=>{
 for(const use of [false,true]){
  const s=base();
  const attacker=put(s,0,'battle',NATURE);
  put(s,0,'battle',NIGHT);
  const spare=put(s,1,'hand',FIRE);
  give(s,1,'shields',[AQUA]);
  attack(s,attacker.uid);
  if(s.decision?.type==='block')act(s,'noBlock');
  act(s,use?'useTrigger':'skipTrigger');
  if(use)pick(s,spare.uid);
  assert.equal(has(s,1,'grave',spare),use);
 }
 const s=base();
 put(s,0,'battle',NIGHT);
 const spare=put(s,1,'hand',FIRE);
 s.active=1;
 cast(s,AQUA);
 assert.ok(has(s,1,'hand',spare));
});
