import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-784.json',import.meta.url)));
const TRI="dm24rp2-011",ARX="dm24rp2-021",SHIN="dm24rp2-007";
const BODY="dm01-108",FIRE="dm01-097",SPELL="dm01-110";
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 784 definitions and alternate prints preserve the canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:784}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:784}));
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
   assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:784}),row.spec);
   assert.equal(registry.get(print.id).id,row.id);
   assert.equal(registry.get(print.id.toLowerCase()).id,row.id);
   assert.equal(refs.find(x=>x.id===print.id.toLowerCase()).image,print.image);
  }
 }
});
const EINE='dm24rp2-015',HEAVY='dm01-001',LIMIT='dmr05-081';
const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);
const activate=(s,x,donor)=>{act(s,'hyper',a=>a.uid===x.uid);pick(s,donor.uid);};
const end=s=>{s.phase='attack';act(s,'endTurn');};
const choices=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const finishAttack=s=>{
 if(s.decision?.type==='block')act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields');
};
const trigger=(s,id,attacker)=>{
 s.active=1;
 give(s,0,'shields',[id]);
 attack(s,attacker.uid);
 finishAttack(s);
 act(s,'useTrigger');
};

test('Tricerati’s S-Trigger moves the selected creature into a new face-down enemy shield',()=>{
 const s=setup(),attacker=put(s,1,'battle',FIRE),enemy=put(s,1,'battle',BODY);
 trigger(s,TRI,attacker);
 assert.deepEqual(choices(s),[attacker.uid,enemy.uid]);
 pick(s,enemy.uid);
 assert.ok(has(s,1,'shields',enemy)&&!has(s,1,'battle',enemy));
 assert.equal(s.players[1].shields.length,6);
 assert.equal(!!s.players[1].shields.at(-1).faceUp,false);
 assert.ok(s.players[0].mana.every(x=>!x.tapped));
});

test('Tricerati only triggers on the first allied attack and keeps its target tapped through the opponent’s next untap',()=>{
 let s=setup();
 const tri=put(s,0,'battle',TRI),donor=put(s,0,'battle',BODY),first=put(s,0,'battle',FIRE);
 const enemy=put(s,1,'battle',BODY),other=put(s,1,'battle',BODY);
 activate(s,tri,donor);
 assert.equal(e.power(tri,false,s),8500);
 assert.equal(e.effectiveCard(tri,s).breaker,2);
 attack(s,first.uid);
 assert.equal(s.decision.task.op,'g34_Target');
 s=restore(s);
 pick(s,enemy.uid);
 finishAttack(s);
 const locked=s.players[1].battle.find(x=>x.uid===enemy.uid);
 assert.ok(locked.tapped&&locked.skipUntap);
 attack(s,tri.uid);
 assert.notEqual(s.decision?.task?.op,'g34_Target');
 finishAttack(s);
 assert.equal(s.players[1].battle.find(x=>x.uid===other.uid).tapped,false);
 end(s);
 assert.equal(locked.tapped,true);
 end(s);
 end(s);
 assert.equal(locked.tapped,false);
});

test('the first-attack count includes attacks made before Tricerati’s Hyper Mode was released',()=>{
 const s=setup(),first=put(s,0,'battle',FIRE),tri=put(s,0,'battle',TRI),donor=put(s,0,'battle',BODY);
 put(s,1,'battle',BODY);
 attack(s,first.uid);
 assert.notEqual(s.decision?.task?.op,'g34_Target');
 finishAttack(s);
 s.phase='main';
 activate(s,tri,donor);
 attack(s,tri.uid);
 assert.notEqual(s.decision?.task?.op,'g34_Target');
});

test('Arxzeos’s S-Trigger chooses at most two with total current power up to 7000, then destroys them together',()=>{
 let s=setup();
 const attacker=put(s,1,'battle',FIRE),extra=put(s,1,'battle',BODY),exact=put(s,1,'battle',BODY);
 const limit=put(s,1,'battle',LIMIT),heavy=put(s,1,'battle',HEAVY);
 exact.powerModifiers=[{amount:3000,expires:'end',who:1}];
 assert.equal(e.power(exact,false,s),5000);
 trigger(s,ARX,attacker);
 assert.deepEqual(choices(s),[attacker.uid,extra.uid,exact.uid,limit.uid,null]);
 assert.ok(!choices(s).includes(heavy.uid));
 pick(s,exact.uid);
 assert.ok(has(s,1,'battle',exact));
 assert.deepEqual(choices(s),[attacker.uid,extra.uid,null]);
 s=restore(s);
 pick(s,extra.uid);
 assert.ok(has(s,1,'grave',exact)&&has(s,1,'grave',extra));
 assert.ok(has(s,1,'battle',attacker)&&has(s,1,'battle',limit));
});

test('Arxzeos may select zero on entry and only destroys a blocker on a Hyper Mode attack',()=>{
 for(const active of [false,true]){
  const s=setup(),arx=put(s,0,'hand',ARX),donor=put(s,0,'battle',BODY);
  const enemy=put(s,1,'battle',BODY),blocker=put(s,1,'battle',HEAVY);
  play(s,arx);
  pick(s,null);
  assert.ok(has(s,1,'battle',enemy));
  s.turn++;
  if(active)activate(s,arx,donor);
  attack(s,arx.uid);
  if(active){
   assert.deepEqual(choices(s),[blocker.uid]);
   pick(s,blocker.uid);
   assert.ok(has(s,1,'grave',blocker));
   assert.equal(e.effectiveCard(arx,s).breaker,2);
  }else{
   assert.equal(s.decision?.type,'block');
   assert.ok(has(s,1,'battle',blocker));
  }
 }
});

test('Shinberom privately shields the chosen top card and puts the other in mana across a save',()=>{
 for(const chosen of [0,1]){
  let s=setup();
  const shin=put(s,0,'hand',SHIN);
  give(s,0,'deck',[FIRE,TRI,BODY]);
  const top=s.players[0].deck.slice();
  play(s,shin);
  assert.deepEqual(choices(s),top.slice(0,2).map(x=>x.uid));
  s=restore(s);
  pick(s,top[chosen].uid);
  assert.ok(has(s,0,'shields',top[chosen]));
  assert.equal(!!s.players[0].shields.at(-1).faceUp,false);
  assert.ok(has(s,0,'mana',top[1-chosen]));
  assert.deepEqual(s.players[0].deck.map(x=>x.uid),[top[2].uid]);
  assert.equal(e.effectiveCard(shin,s).blocker,true);
  assert.equal(e.effectiveCard(shin,s).breaker,2);
 }
});

test('Shinberom may deploy the just-ramped S-Trigger creature and choose W or T before selecting shields',()=>{
 for(const amount of [2,3]){
  let s=setup();
  const shin=put(s,0,'battle',SHIN),donor=put(s,0,'battle',BODY);
  const plus=put(s,0,'mana','dm23sd2-003'),superCard=put(s,0,'mana','dmrp04s-025');
  const hidden=put(s,0,'mana',EINE);
  hidden.faceDown=true;
  put(s,0,'mana',SPELL);
  give(s,0,'deck',[EINE,BODY,BODY]);
  const ramped=s.players[0].deck[0];
  activate(s,shin,donor);
  assert.equal(e.power(shin,false,s),12000);
  attack(s,shin.uid);
  assert.ok(has(s,0,'mana',ramped));
  assert.deepEqual(choices(s),[plus.uid,superCard.uid,ramped.uid,null]);
  s=restore(s);
  pick(s,ramped.uid);
  assert.ok(has(s,0,'battle',ramped));
  act(s,'noBlock');
  assert.equal(s.decision.task.op,'g34_GrantedBreaker633');
  assert.deepEqual(choices(s),[2,3]);
  pick(s,amount);
  const shields=s.players[1].shields.map(x=>x.uid),selected=shields.slice(-amount);
  assert.equal(s.decision.count,amount);
  act(s,'breakShields',a=>a.shields.join()===selected.join());
  assert.deepEqual(s.players[1].shields.map(x=>x.uid),shields.slice(0,-amount));
 }
});

test('Shinberom with only one card left must shield it and loses to deckout',()=>{
 const s=setup(),shin=put(s,0,'hand',SHIN);
 give(s,0,'deck',[BODY]);
 const last=s.players[0].deck[0];
 play(s,shin);
 pick(s,last.uid);
 assert.ok(has(s,0,'shields',last));
 assert.equal(s.winner,1);
});
