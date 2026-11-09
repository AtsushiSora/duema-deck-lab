import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-727.json',import.meta.url)));

test('Phase 727 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:727}));
  assert.throws(()=>standardCardSpec(detail,{phase:726}));
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
  assert.throws(()=>standardCardSpec(incomplete,{phase:727}));
 }
});

const DEVICE='dm16-026', SHINKAI='dm28-083', HARUSA='dm30-s05', HELIX='dm16-035';
const MULTI='dm35-054', BEAST='dm01-108', PREFIX='dmr16s-052', BLOCKER='dm01-011';
const field=()=>Object.assign(setup(),{active:0});
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,v)=>act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===v);

function put(s,p,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
}

function play(s,id){
 s.phase='main';
 const x=inst(id);
 s.players[s.active].hand.push(x);
 act(s,'play',a=>a.uid===x.uid&&!a.alternative);
 return x;
}

const cross=(s,g,x)=>act(s,'crossGear',a=>a.uid===g.uid&&a.target===x.uid);

function noBlock(s){
 if(e.getLegalActions(s).some(a=>a.kind==='noBlock'))act(s,'noBlock');
}

test('Harusa reprint shares the battle definition and four-copy limit with its original',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const [print]=printAliases, original=cards.find(r=>r.id===HARUSA);
 assert.equal(print.canonicalId,HARUSA);
 const stats=({abilityText,...rest})=>rest;
 assert.deepEqual(print.faces.map(stats),original.faces.map(stats));
 assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:727}),original.spec);
 assert.equal(regulationVerification.limits[print.id],regulationVerification.limits[HARUSA]);
 assert.ok(print.verification.facesMatched);
 assert.deepEqual(catalogue.resolveRows([{id:print.id,count:2},{id:HARUSA,count:2}]),[{id:HARUSA,count:4}]);
 assert.ok(!data.cards.some(x=>x.id===print.id));
});

for(const attackerOwner of [0,1])test('Command Device boosts both sides once and lets its controller draw for attacker '+attackerOwner,()=>{
 let s=field();
 const host=put(s,0,MULTI), enemy=put(s,1,MULTI), prefix=put(s,1,PREFIX);
 const gear=play(s,DEVICE);
 cross(s,gear,host);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,6);
 for(const x of [host,enemy])assert.equal(e.power(x,false,s),e.card(x).power+1000);
 assert.equal(e.power(prefix,false,s),e.card(prefix).power);
 const top=s.players[0].deck[0], otherDeck=s.players[1].deck.length;
 s.active=attackerOwner;
 attack(s,attackerOwner?enemy.uid:host.uid);
 assert.equal(s.decision.source,DEVICE);
 assert.equal(s.decision.player,0);
 s=restore(s);
 pick(s,true);
 noBlock(s);
 drain(s);
 assert.ok(s.players[0].hand.some(y=>y.uid===top.uid));
 assert.equal(s.players[1].deck.length,otherDeck);
});

test('Command Device checks the current cross and permits declining a shared-race draw',()=>{
 const s=field(), host=put(s,0,MULTI), enemy=put(s,1,MULTI), different=put(s,1,PREFIX);
 const gear=play(s,DEVICE);
 s.active=1;
 attack(s,enemy.uid);
 assert.notEqual(s.decision?.source,DEVICE);
 noBlock(s);
 drain(s);
 s.active=0;
 s.phase='main';
 cross(s,gear,host);
 s.active=1;
 attack(s,different.uid);
 assert.notEqual(s.decision?.source,DEVICE);
 noBlock(s);
 drain(s);
 enemy.tapped=false;
 const before=s.players[0].deck.length;
 attack(s,enemy.uid);
 pick(s,null);
 noBlock(s);
 drain(s);
 assert.equal(s.players[0].deck.length,before);
});

test('Shinkai compares current attack power, allows either side, and excludes equal power and itself',()=>{
 for(const player of [0,1]){
  let s=field();
  const shinkai=put(s,0,SHINKAI,{buff:4000}), ally=put(s,0,BEAST), enemy=put(s,1,BEAST);
  const equal=put(s,1,BLOCKER), gear=play(s,HELIX);
  cross(s,gear,shinkai);
  equal.powerModifiers=[{amount:e.power(shinkai,true,s)-e.card(equal).power,expires:'end',who:0}];
  attack(s,shinkai.uid);
  act(s,'noBlock');
  const choices=s.decision.choices.map(x=>x.value?.uid??x.value);
  assert.ok(choices.includes(ally.uid)&&choices.includes(enemy.uid));
  assert.ok(!choices.includes(equal.uid)&&!choices.includes(shinkai.uid));
  const target=player===0?ally:enemy;
  s=restore(s);
  pick(s,target.uid);
  drain(s);
  assert.ok(s.players[player].hand.some(x=>x.uid===target.uid));
 }
});

test('Shinkai skips its effect without a cross, on a blocked attack, and when attacking a creature',()=>{
 for(const mode of ['uncrossed','blocked','creature']){
  const s=field(), shinkai=put(s,0,SHINKAI);
  const target=put(s,1,BEAST,{tapped:mode==='creature'}), blocker=put(s,1,BLOCKER);
  if(mode!=='uncrossed')cross(s,play(s,HELIX),shinkai);
  attack(s,shinkai.uid,mode==='creature'?target.uid:'player');
  if(mode==='blocked')act(s,'block',a=>a.uid===blocker.uid);
  else noBlock(s);
  assert.notEqual(s.decision?.source,SHINKAI);
  drain(s);
  assert.ok(!s.players[1].hand.includes(target));
 }
});

test('Harusa evolves on a Samurai, generates a gear without payment, and retains an existing cross',()=>{
 const s=field(), samurai=put(s,0,SHINKAI), gear=play(s,HELIX);
 cross(s,gear,samurai);
 const enemy=put(s,1,BEAST), second=inst(DEVICE);
 s.players[0].hand.push(second);
 const spent=s.players[0].mana.filter(x=>x.tapped).length;
 put(s,0,BEAST);
 const harusa=play(s,HARUSA);
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[samurai.uid]);
 act(s,'evolve',a=>a.baseUid===samurai.uid);
 assert.equal(s.decision.task.op,'g18_Generate');
 pick(s,second.uid);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,spent+5);
 assert.ok(s.players[0].battle.includes(second));
 assert.equal(second.crossedTo,undefined);
 assert.equal(gear.crossedTo.uid,harusa.uid);
 attack(s,harusa.uid);
 assert.equal(s.decision.source,HARUSA);
 pick(s,enemy.uid);
 noBlock(s);
 drain(s);
 assert.ok(s.players[1].mana.includes(enemy));
 assert.equal(s.players[1].shields.length,3);
});

test('Harusa still breaks two shields without a cross and may decline its generation',()=>{
 const s=field(), samurai=put(s,0,SHINKAI), enemy=put(s,1,BEAST);
 const gear=inst(HELIX);
 s.players[0].hand.push(gear);
 const harusa=play(s,HARUSA);
 act(s,'evolve',a=>a.baseUid===samurai.uid);
 pick(s,null);
 assert.ok(s.players[0].hand.includes(gear));
 attack(s,harusa.uid);
 assert.notEqual(s.decision?.source,HARUSA);
 noBlock(s);
 drain(s);
 assert.ok(s.players[1].battle.includes(enemy));
 assert.equal(s.players[1].shields.length,3);
});
