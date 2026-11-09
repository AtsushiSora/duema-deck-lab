import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-728.json',import.meta.url)));

test('Phase 728 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:728}));
  assert.throws(()=>standardCardSpec(detail,{phase:727}));
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
  assert.throws(()=>standardCardSpec(incomplete,{phase:728}));
 }
});

const MARIANNA='dm15-001', SURFIE='dm17-037', CROCO='dm23ex2-065';
const GEAR='dm16-035', DEVICE='dm16-026', DEMON_HAND='dm01-027', TWIN='dmrp06-006';
const NON_TRIGGER='dm01-040', SURFER='dm05-024', BEAST='dm01-108', BLOCKER='dm01-011';
const field=()=>Object.assign(setup(),{active:0});
const restore=s=>JSON.parse(JSON.stringify(s));
const options=s=>s.decision.choices.map(c=>c.value);
const pick=(s,v)=>act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===v);
const put=(s,p,id,attrs={})=>{
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
};
const link=(s,p,id,x)=>put(s,p,id,{crossedTo:{uid:x.uid,incarnation:x.incarnation||0}});
function play(s,id){
 s.phase='main';
 const x=inst(id);
 s.players[s.active].hand.push(x);
 act(s,'play',a=>a.uid===x.uid&&!a.alternative);
 return x;
}
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);

test('Surfie promo keeps its original battle ID, statistics, artwork reference and copy limit',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const [print]=printAliases, original=cards.find(r=>r.id===SURFIE);
 const stats=({abilityText,...rest})=>rest;
 assert.deepEqual(print.faces.map(stats),original.faces.map(stats));
 assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:728}),original.spec);
 assert.equal(regulationVerification.limits[print.id],regulationVerification.limits[SURFIE]);
 assert.ok(print.verification.facesMatched);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 assert.equal(refs.find(x=>x.id===print.id).image,print.image);
 assert.deepEqual(catalogue.resolveRows([{id:print.id,count:2},{id:SURFIE,count:2}]),[{id:SURFIE,count:4}]);
 assert.ok(!data.cards.some(x=>x.id===print.id));
});

test('Marianna shuffles before casting the selected trigger spell face by UID and before blockers',()=>{
 let s=field();
 const attacker=put(s,0,MARIANNA),blocker=put(s,1,BLOCKER);
 link(s,0,GEAR,attacker);
 assert.equal(e.card(SURFER).trigger,true);
 give(s,0,'deck',[DEMON_HAND,TWIN,DEMON_HAND,NON_TRIGGER,SURFER,BEAST]);
 give(s,0,'mana',[]);
 const [first,twin,second]=s.players[0].deck,rng=s.rng;
 attack(s,attacker.uid);
 assert.deepEqual(options(s),[{uid:first.uid,face:0},{uid:twin.uid,face:1},{uid:second.uid,face:0},null]);
 s=restore(s);
 pick(s,twin.uid);
 assert.notEqual(s.rng,rng);
 assert.deepEqual(s.players[0].g34Protected,[]);
 assert.equal(s.decision.task.op,'g34_MariannaCast728');
 assert.equal(s.attack.attacker,attacker.uid);
 s=restore(s);
 pick(s,true);
 act(s,'effect',a=>a.targets.some(x=>x.uid===blocker.uid));
 drain(s);
 assert.ok(has(s,1,'grave',blocker));
 assert.ok(has(s,0,'grave',twin));
 assert.ok(has(s,0,'deck',first)&&has(s,0,'deck',second));
 assert.equal(s.players[1].shields.length,3);
});

for(const scenario of ['uncrossed','no target','skip search','skip cast'])test('Marianna '+scenario,()=>{
 const s=field(),attacker=put(s,0,MARIANNA);
 if(scenario!=='uncrossed')link(s,0,GEAR,attacker);
 give(s,0,'deck',[scenario==='no target'?NON_TRIGGER:DEMON_HAND,BEAST,BEAST]);
 const [spell]=s.players[0].deck,rng=s.rng;
 attack(s,attacker.uid);
 if(scenario==='skip search')pick(s,null);
 if(scenario==='skip cast'){pick(s,spell.uid);pick(s,null);}
 assert.equal(s.rng===rng,scenario==='uncrossed');
 assert.equal((s.players[0].g34Protected||[]).length,0);
 assert.ok(has(s,0,'deck',spell));
 drain(s);
 assert.equal(s.players[1].shields.length,3);
});

for(const [count,accept] of [[0,false],[1,true],[2,true],[2,false]])test('Surfie destroyed with '+count+' crossed gears, draw='+accept,()=>{
 let s=field();
 const surfie=put(s,0,SURFIE),gears=Array.from({length:count},()=>link(s,0,GEAR,surfie));
 s.active=1;
 const deck=s.players[0].deck.length;
 play(s,DEMON_HAND);
 act(s,'effect',a=>a.targets.some(x=>x.uid===surfie.uid));
 assert.ok(has(s,0,'grave',surfie));
 for(const g of gears){
  assert.ok(has(s,0,'battle',g));
  assert.equal(g.crossedTo,undefined);
 }
 if(count){
  assert.match(s.decision.title,new RegExp(count+'枚'));
  assert.deepEqual(options(s),[true,null]);
  s=restore(s);
  pick(s,accept?true:null);
 }
 assert.equal(s.players[0].deck.length,deck-(accept?count:0));
});

test('Surfie draws nothing when bounced, even with a gear attached',()=>{
 const s=field(),surfie=put(s,0,SURFIE);
 link(s,0,GEAR,surfie);
 s.active=1;
 const deck=s.players[0].deck.length;
 play(s,SURFER);
 act(s,'effect',a=>a.targets.some(x=>x.uid===surfie.uid));
 drain(s);
 assert.ok(has(s,0,'hand',surfie));
 assert.equal(s.players[0].deck.length,deck);
});

test('Croco crosses two gears simultaneously for free and gains Accel once',()=>{
 let s=field();
 const host=put(s,0,BEAST),first=link(s,0,GEAR,host),second=put(s,0,GEAR);
 put(s,1,DEVICE);
 give(s,0,'mana',[]);
 const croco=play(s,CROCO);
 assert.ok(!has(s,0,'battle',croco));
 assert.deepEqual(options(s),[first.uid,second.uid,null]);
 pick(s,first.uid);
 assert.equal(first.crossedTo.uid,host.uid);
 assert.deepEqual(options(s),[second.uid,null]);
 s=restore(s);
 pick(s,second.uid);
 pick(s,null);
 const entered=s.players[0].battle.find(x=>x.uid===croco.uid);
 assert.ok(entered);
 assert.equal(e.effectiveCard(entered,s).power,500);
 for(const uid of [first.uid,second.uid]){
  const g=s.players[0].battle.find(x=>x.uid===uid);
  assert.deepEqual(g.crossedTo,{uid:croco.uid,incarnation:entered.incarnation});
 }
 assert.deepEqual(s.players[0].mana,[]);
 assert.equal(s.players[0].g34Holding.length,0);
 assert.equal(e.physicalCards(s).filter(x=>x.uid===croco.uid).length,1);
});

for(const withGear of [false,true])test('Croco is destroyed at zero power if no gear is crossed '+withGear,()=>{
 const s=field();
 if(withGear)put(s,0,GEAR);
 const croco=play(s,CROCO);
 if(withGear)pick(s,null);
 assert.ok(has(s,0,'grave',croco));
 assert.ok(!has(s,0,'battle',croco));
});

test('Surfie uses the count before a single effect destroys it and both gears together',()=>{
 const s=field(),surfie=put(s,0,SURFIE),first=link(s,0,GEAR,surfie),second=link(s,0,DEVICE,surfie);
 const deck=s.players[0].deck.length;
 s.extTasks=[{op:'g34_Sweep',p:1,source:DEMON_HAND,filter:{}}];
 act(s,'toAttack');
 for(const card of [surfie,first,second])assert.ok(has(s,0,'grave',card));
 assert.match(s.decision.title,/2枚/);
 pick(s,true);
 assert.equal(s.players[0].deck.length,deck-2);
});

test('Marianna still shuffles if a continuous restriction prevents the free cast',()=>{
 const s=field(),attacker=put(s,0,MARIANNA);
 link(s,0,GEAR,attacker);
 put(s,1,'dmx11-009');
 give(s,0,'deck',[DEMON_HAND,BEAST,BEAST]);
 const [spell]=s.players[0].deck,rng=s.rng;
 attack(s,attacker.uid);
 pick(s,spell.uid);
 assert.notEqual(s.rng,rng);
 assert.notEqual(s.decision?.task?.op,'g34_MariannaCast728');
 assert.ok(has(s,0,'deck',spell));
 assert.deepEqual(s.players[0].g34Protected,[]);
 drain(s);
});
