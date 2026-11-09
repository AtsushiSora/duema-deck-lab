import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-715.json',import.meta.url)));

test('Phase 715 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:715}));
  assert.throws(()=>standardCardSpec(detail,{phase:714}));
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
  assert.throws(()=>standardCardSpec(incomplete,{phase:715}));
 }
 for(const row of printAliases){
  const canonical=cards.find(x=>x.id===row.canonicalId);
  assert.equal(row.name,canonical.name);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:715}),canonical.spec);
  assert.ok(row.verification.facesMatched);
  assert.match(row.image,/^https:\/\/dm\.takaratomy\.co\.jp\/.*\.jpg$/);
  assert.equal(regulationVerification.limits[row.id],regulationVerification.limits[canonical.id]);
  assert.ok(!data.cards.some(c=>c.id===row.id));
 }
});

const CAIN='dm09-049',ISAAC='dm10-013',DOL='dm15-003';
const FIRE='dm01-097',LIGHT='dm01-075',NATURE='dm01-108',DARK='dm01-090';
const DARK_FIRE='dmex14-108',LIGHT_NATURE='dm12-035',SHIELD_SPELL='dm01-052',SHIELD_CREATURE='dm09-053';
const NO_BATTLE='dm06-032';
const restore=s=>JSON.parse(JSON.stringify(s));
const find=(s,p,z,x)=>s.players[p][z].find(y=>y.uid===x.uid);
const field=()=>Object.assign(setup(),{active:0,phase:'attack'});
function put(s,p,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{
 const v=s.decision.choices[a.choice].value;
 return (v?.uid??v)===(value?.uid??value);
});
const block=(s,x)=>act(s,'block',a=>a.uid===x.uid);
const options=s=>s.decision.choices.map(c=>c.value);

test('Cain must choose a shield without seeing hidden cards, moving the selected stack without a trigger',()=>{
 let s=field();
 const x=put(s,0,CAIN);
 give(s,0,'shields',[LIGHT,SHIELD_SPELL]);
 const [safe,root]=s.players[0].shields,extra=inst(SHIELD_CREATURE);
 root.shieldStack=[extra];
 attack(s,x.uid);
 assert.equal(s.decision.task.op,'g34_ShieldGrave');
 assert.deepEqual(options(s),[safe.uid,root.uid]);
 assert.ok(s.decision.choices.every(c=>!c.cardId));
 s=restore(s);
 pick(s,root);
 assert.ok(find(s,0,'shields',safe));
 assert.deepEqual(s.players[0].grave.map(c=>c.uid),[root.uid,extra.uid]);
 assert.equal(s.players[0].hand.length,0);
 assert.equal(s.metrics[0].triggers,0);
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,4);
});

test('Cain can attack without its own shields',()=>{
 const s=field(),x=put(s,0,CAIN);
 give(s,0,'shields',[]);
 attack(s,x.uid);
 assert.equal(s.decision.type,'block');
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,4);
 assert.equal(s.players[0].grave.length,0);
});

test('Isaac can choose itself and untaps only after winning the block battle (QA 35171)',()=>{
 let s=field(),attacker=put(s,0,FIRE),b=put(s,1,ISAAC);
 const untapped=put(s,1,NATURE);
 attack(s,attacker.uid);
 block(s,b);
 assert.equal(s.decision.player,1);
 assert.deepEqual(options(s),[b.uid,untapped.uid,null]);
 assert.equal(b.tapped,true);
 assert.ok(!s.log.some(row=>row.type==='battle'));
 s=restore(s);
 pick(s,b);
 drain(s);
 assert.ok(find(s,0,'grave',attacker));
 assert.equal(find(s,1,'battle',b).tapped,false);
 assert.ok(s.log.findIndex(r=>r.type==='afterBattle')>s.log.findIndex(r=>r.type==='battle'));
});

test('Isaac untaps the selected ally even when it loses the block battle (QA 35170)',()=>{
 const s=field(),a=put(s,0,CAIN),b=put(s,1,ISAAC);
 const ally=put(s,1,NATURE,{tapped:true}),other=put(s,1,FIRE,{tapped:true});
 attack(s,a.uid);
 pick(s,s.players[0].shields[0]);
 block(s,b);
 pick(s,ally);
 drain(s);
 assert.ok(find(s,1,'grave',b));
 assert.equal(ally.tapped,false);
 assert.equal(other.tapped,true);
});

test('Isaac may decline, and a canceled battle cannot untap the chosen target',()=>{
 for(const attacker of [FIRE,NO_BATTLE]){
  const s=field(),a=put(s,0,attacker),b=put(s,1,ISAAC),ally=put(s,1,NATURE,{tapped:true});
  attack(s,a.uid);
  block(s,b);
  pick(s,attacker===NO_BATTLE?ally:null);
  drain(s);
  assert.equal(ally.tapped,true);
  assert.equal(b.tapped,true);
  assert.equal(s.log.some(r=>r.type==='battle'),attacker!==NO_BATTLE);
 }
});

test('Isaac’s saved untap resolves only if it remains a participant in the replacement battle',()=>{
 for(const guardOwner of [0,1]){
  let s=field();
  const a=put(s,0,FIRE),b=put(s,1,ISAAC);
  const ally=put(s,1,NATURE,{tapped:true}),guard=put(s,guardOwner,'dm26rp3-010');
  attack(s,a.uid);
  block(s,b);
  pick(s,ally);
  assert.equal(s.decision.task.op,'g393SG_Battle');
  s=restore(s);
  pick(s,guard);
  drain(s);
  assert.equal(find(s,1,'battle',ally).tapped,guardOwner===1);
  assert.ok(s.log.some(r=>r.type==='battle'));
 }
});

test('Isaac may attack a tapped creature but cannot attack the opponent player',()=>{
 const s=field(),b=put(s,0,ISAAC),target=put(s,1,FIRE,{tapped:true});
 const actions=e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===b.uid);
 assert.deepEqual(actions.map(a=>a.target),[target.uid]);
});

test('Dolberros adds two to both players’ non-Dark summons, including paid non-hand summons',()=>{
 const s=field(),a=put(s,0,DOL),b=put(s,1,DOL);
 for(const p of [0,1]){
  for(const id of [FIRE,LIGHT_NATURE,DARK,DARK_FIRE,SHIELD_SPELL]){
   const c=e.card(id),tax=[FIRE,LIGHT_NATURE].includes(id)?4:0;
   assert.equal(e.summonCost(s,p,c),c.cost+tax);
   assert.equal(e.summonCost(s,p,{...c,summonOrigin:'mana'}),c.cost+tax);
  }
 }
 a.g35Ignored=s.turn;
 assert.equal(e.summonCost(s,0,e.card(FIRE)),e.card(FIRE).cost+2);
 s.players[1].battle.splice(s.players[1].battle.indexOf(b),1);
 assert.equal(e.summonCost(s,0,e.card(FIRE)),e.card(FIRE).cost);
});

test('Dolberros tax is included in both legality and the paid amount',()=>{
 const s=field();
 put(s,0,DOL);
 give(s,0,'hand',[FIRE]);
 const price=e.card(FIRE).cost+2;
 give(s,0,'mana',Array(price-1).fill(FIRE));
 s.phase='main';
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&a.cardId===FIRE));
 s.players[0].mana.push(inst(FIRE));
 act(s,'play',a=>a.cardId===FIRE&&a.cost===price);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,price);
 assert.ok(s.players[0].battle.some(x=>x.cardId===FIRE));
});

test('Dolberros retains W Breaker and a non-Dark S-Trigger summon remains free',()=>{
 const s=field(),x=put(s,0,DOL);
 give(s,1,'shields',[SHIELD_CREATURE,NATURE]);
 give(s,1,'mana',[]);
 attack(s,x.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.cardId===SHIELD_CREATURE);
 drain(s);
 assert.equal(s.players[1].shields.length,0);
 assert.ok(s.players[1].battle.some(y=>y.cardId===SHIELD_CREATURE));
 assert.equal(s.players[1].mana.length,0);
});
