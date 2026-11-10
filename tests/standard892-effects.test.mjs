import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain,GEN,GG} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const BEAT='dmrp14-059',SLAVE='dmrp14-071',WOOD='dmrp14-094';
const SMALL='dm01-108',WATER='dm01-083',FIRE='dm01-097',DARK='dm01-090',BIG='dm05-s04';
function field(p=0){const s=setup();s.active=p;for(const q of [0,1])give(s,q,'deck',Array(20).fill(SMALL));return s;}
function add(s,p,zone,id,props){const x=Object.assign(inst(id),props);s.players[p][zone].push(x);return x;}
function play(s,id){s.phase='main';const x=add(s,s.active,'hand',id);act(s,'play',a=>a.uid===x.uid&&!a.alternative);return x;}
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===(v?.uid??v));
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const ids=s=>e.physicalCards(s).map(x=>x.uid).sort();
function invoke(s,p,defs){s.phase='main';s.extTasks=[{op:'g34_Sequence',p,source:WOOD,defs}];act(s,'toAttack');}
const exact=(p,x,extra)=>({op:'ExactMove',owner:p,target:x.uid,targetIncarnation:x.incarnation||0,...extra});
function tap(s,p,x){invoke(s,1-p,[exact(p,x,{tap:true})]);}
function untap(s,p){invoke(s,p,[{op:'GroupUntap',owner:'self',filter:{creature:true}}]);}
function destroy(s,p,x){invoke(s,1-p,[exact(p,x,{to:'grave'})]);}
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}
const revealed=s=>s.log.filter(x=>x.type==='reveal');
function clean(s,p){assert.equal((s.players[p].g34Protected||[]).length,0);}

test('Phase 892 verifies whole official definitions, images, limits and preserved canonical deck IDs',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-892.json',import.meta.url))),registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[BEAT,SLAVE,WOOD]);assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(row.faces,d.faces);assert.deepEqual(standardCardSpec(d,{phase:892}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:891}));const changed=structuredClone(d);changed.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(changed,{phase:892}));
  for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
  assert.deepEqual([c.type,c.cost,c.civilizations,c.power,c.race,c.manaValue,c.limit],['creature',f.cost,f.civilizations,Number(f.powerText),f.race,1,4]);
  assert.equal(m.regulationVerification.limits[row.id],4);assert.ok(row.verification.facesMatched);assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(registry.resolveRows([{id:row.id,count:4}]),[{id:row.id,count:4}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);
 }
 const deck={id:'phase892',name:'不死樹王国',cards:[BEAT,SLAVE,WOOD,SMALL,WATER,FIRE,DARK,BIG,'dm01-076','dm01-027'].map(id=>({id,count:4}))};
 assert.deepEqual(e.validateDeck(deck),[]);assert.equal(registry.coverage(deck).unsupported,0);
});

for(const p of [0,1])test('Beat untaps on its first attack with an allied Fire creature, then stays tapped '+p,()=>{
 const s=field(p),host=add(s,p,'battle',BEAT);add(s,p,'battle',FIRE);
 attack(s,host.uid);assert.equal(host.tapped,false);act(s,'noBlock');drain(s);
 attack(s,host.uid);assert.equal(host.tapped,true);act(s,'noBlock');drain(s);
 assert.equal(s.players[1-p].shields.length,3);
});

for(const p of [0,1])test('Beat blocks twice on the opposing turn when Fire is present (QA36400) '+p,()=>{
 const s=field(1-p),host=add(s,p,'battle',BEAT);add(s,p,'battle',FIRE);
 const enemies=[add(s,1-p,'battle',SMALL),add(s,1-p,'battle',WATER),add(s,1-p,'battle',SMALL)];
 for(let i=0;i<2;i++){
  attack(s,enemies[i].uid);act(s,'block',a=>a.uid===host.uid);drain(s);assert.equal(host.tapped,i===1);
 }
 attack(s,enemies[2].uid);assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===host.uid));act(s,'noBlock');drain(s);
 assert.ok(has(s,p,'battle',host));assert.equal(s.players[p].shields.length,4);
});

test('Beat needs an allied unsealed Fire creature, excluding opposite-side Fire and spell-side civilizations',()=>{
 for(const type of ['none','opponent','seed','sealed','twin']){
  const s=field(),host=add(s,0,'battle',BEAT);
  if(type==='opponent')add(s,1,'battle',FIRE);
  if(type==='seed')add(s,0,'battle','dmrp21-040');
  if(type==='sealed'){const ally=add(s,0,'battle',FIRE);ally.sealed=true;add(s,0,'seals',SMALL,{faceDown:true,sealOf:ally.uid});}
  if(type==='twin')add(s,0,'battle','dm26ex4-079');
  tap(s,0,host);assert.equal(host.tapped,true);assert.equal(s.decision,null);
 }
});

test('Beat consumes its first tap even if Fire is absent and repeated taps are not transitions (QA37192)',()=>{
 const s=field(),host=add(s,0,'battle',BEAT);tap(s,0,host);add(s,0,'battle',FIRE);
 tap(s,0,host);assert.equal(host.tapped,true);untap(s,0);tap(s,0,host);assert.equal(host.tapped,true);
 end(s);untap(s,0);tap(s,0,host);assert.equal(host.tapped,false);
});

test('Beat evaluates allied Fire when resolving, after all instructions in the tapping effect',()=>{
 const s=field(),host=add(s,0,'battle',BEAT),fire=add(s,0,'battle',FIRE);
 invoke(s,1,[exact(0,host,{tap:true}),exact(0,fire,{to:'hand'})]);
 assert.equal(host.tapped,true);assert.ok(has(s,0,'hand',fire));
});

test('Beat cannot untap through an untap lock and cannot retry its first tap later that turn',()=>{
 const s=field(),host=add(s,0,'battle',BEAT,{tapLocks:[{who:1,afterTurns:999}]});add(s,0,'battle',FIRE);
 tap(s,0,host);assert.equal(host.tapped,true);host.tapLocks=[];untap(s,0);tap(s,0,host);assert.equal(host.tapped,true);
});

test('Beat records ignored taps and preserves that first-tap record through JSON',()=>{
 let s=field(),host=add(s,0,'battle',BEAT,{g35Ignored:s.turn});add(s,0,'battle',FIRE);
 tap(s,0,host);assert.equal(host.tapped,true);delete host.g35Ignored;
 const before=ids(s);s=JSON.parse(JSON.stringify(s));untap(s,0);host=s.players[0].battle.find(x=>x.cardId===BEAT);
 tap(s,0,host);assert.equal(host.tapped,true);assert.deepEqual(ids(s),before);
});

test('Beat entering tapped does not consume the first actual tap, and re-entry gives a fresh incarnation',()=>{
 const s=field();add(s,1,'battle','dmr02-s03');add(s,0,'battle',FIRE);
 const host=play(s,BEAT);assert.equal(host.tapped,true);untap(s,0);tap(s,0,host);assert.equal(host.tapped,false);
 invoke(s,0,[exact(0,host,{to:'hand'})]);s.phase='main';act(s,'play',a=>a.uid===host.uid);drain(s);
 const again=s.players[0].battle.find(x=>x.uid===host.uid);assert.ok(again);untap(s,0);tap(s,0,again);assert.equal(again.tapped,false);
});

for(const p of [0,1])test('Slave mana replacement prevents death triggers while ordinary destruction still triggers them '+p,()=>{
 for(const nature of [false,true]){
  const s=field(p),host=add(s,p,'battle',SLAVE);if(nature)add(s,p,'battle',SMALL);
  add(s,p,'battle','dmex14-006');add(s,p,'battle','dmrp13-084');const before=ids(s);destroy(s,p,host);drain(s);
  assert.ok(has(s,p,nature?'mana':'grave',host));assert.equal(s.players[p].hand.length,nature?0:1);
  if(nature)assert.equal(host.tapped,false);assert.deepEqual(ids(s),before);
 }
});

test('Slave ignores opposing Nature, sealed Nature and a noncreature Nature tamaseed',()=>{
 for(const type of ['opponent','sealed','seed']){
  const s=field(),host=add(s,0,'battle',SLAVE);
  if(type==='opponent')add(s,1,'battle',SMALL);
  if(type==='seed')add(s,0,'battle','dmsd20-015');
  if(type==='sealed'){const ally=add(s,0,'battle',SMALL);ally.sealed=true;add(s,0,'seals',WATER,{faceDown:true,sealOf:ally.uid});}
  destroy(s,0,host);drain(s);assert.ok(has(s,0,'grave',host));
 }
});

for(const p of [0,1])test('Slave checks Nature before the simultaneous destruction batch (QA35145 and QA39667) '+p,()=>{
 const s=field(p),host=add(s,p,'battle',SLAVE),nature=add(s,p,'battle',SMALL);
 invoke(s,p,[{op:'Sweep',owner:'self',to:'grave',filter:{creature:true}}]);drain(s);
 assert.ok(has(s,p,'mana',host)&&has(s,p,'grave',nature));assert.equal(s.players[p].battle.length,0);
});

test('Slave does not replace bounce or putting a creature into the grave without destroying it',()=>{
 for(const to of ['hand','mana','grave']){
  const s=field(),host=add(s,0,'battle',SLAVE);add(s,0,'battle',SMALL);
  if(to==='grave')invoke(s,1,[{op:'Sweep',to:'grave',g815PutInGrave:true,filter:{exactId:SLAVE,creature:true}}]);
  else invoke(s,1,[exact(0,host,{to})]);
  drain(s);assert.ok(has(s,0,to,host));
 }
});

test('Slave cannot replace destruction caused by a replacement sacrifice a second time',()=>{
 const s=field(),host=add(s,0,'battle',SLAVE),nature=add(s,0,'battle',SMALL),spell=add(s,0,'hand','dm26rp3-011');
 act(s,'play',a=>a.uid===spell.uid&&a.alternative==='sixPhoto'&&a.role==='reiai');pick(s,host);pick(s,nature);
 assert.ok(has(s,0,'grave',host)&&has(s,0,'grave',nature));drain(s);
});

for(const p of [0,1])test('Slave Slayer destroys a larger battle opponent even when Slave goes to mana '+p,()=>{
 for(const nature of [false,true]){
  const s=field(p),host=add(s,p,'battle',SLAVE),enemy=add(s,1-p,'battle',BIG,{tapped:true});if(nature)add(s,p,'battle',SMALL);
  attack(s,host.uid,enemy.uid);drain(s);
  assert.ok(has(s,p,nature?'mana':'grave',host)&&has(s,1-p,'grave',enemy));
 }
});

test('Slave has no Slayer or mana replacement when ignored, and sealed sources expose neither ability',()=>{
 const s=field(),host=add(s,0,'battle',SLAVE,{g35Ignored:s.turn});add(s,0,'battle',SMALL);
 assert.ok(!e.effectiveCard(host,s).slayer&&!e.effectiveCard(host,s).destroyToMana);destroy(s,0,host);assert.ok(has(s,0,'grave',host));
 const t=field(),sealed=add(t,0,'battle',SLAVE,{sealed:true});add(t,0,'seals',WATER,{faceDown:true,sealOf:sealed.uid});
 assert.ok(!e.effectiveCard(sealed,t).slayer&&!e.effectiveCard(sealed,t).destroyToMana);
});

for(const p of [0,1])test('Wood reveals one card and uses total mana count rather than untapped mana or printed mana '+p,()=>{
 for(const [id,hit] of [[SMALL,true],[FIRE,true],['dm01-106',true],[BEAT,false],['dm01-110',false],['dmrp21-040',false]]){
  const s=field(p);give(s,p,'mana',[DARK,SMALL,FIRE]);give(s,p,'deck',[id,SMALL,SMALL]);
  const top=s.players[p].deck[0],before=ids(s),host=play(s,WOOD);drain(s);
  assert.ok(has(s,p,hit?'hand':'grave',top));assert.ok(has(s,p,'battle',host));
  assert.equal(revealed(s).length,1);assert.deepEqual(ids(s),[...before,host.uid].sort());clean(s,p);
 }
});

test('Wood refers only to the creature cost of a twinpact (QA40463), and accepts evolution and tamaseed-creatures',()=>{
 for(const [id,mana,hit] of [['dm22ex1-059',2,false],['dm22ex1-059',7,true],['dmex12-045',2,true],['dm02-024',8,true],['dm22rp2-S8',4,true]]){
  const s=field();give(s,0,'mana',[DARK,SMALL,...Array(mana-2).fill(SMALL)]);give(s,0,'deck',[id,SMALL,SMALL]);
  const top=s.players[0].deck[0];play(s,WOOD);drain(s);assert.ok(has(s,0,hit?'hand':'grave',top));clean(s,0);
 }
});

test('Wood uses current mana after an earlier simultaneous entry ability and JSON restore',()=>{
 let s=field();give(s,0,'mana',[DARK,SMALL]);give(s,0,'hand',[WOOD,'dm01-106']);give(s,0,'deck',[SMALL,'dm01-106',SMALL,SMALL]);
 const wood=s.players[0].hand[0],bronze=s.players[0].hand[1],ramp=s.players[0].deck[0],revealedCard=s.players[0].deck[1];
 invoke(s,0,[{op:'Select',origin:'hand',n:2,deploy:true,filter:{creature:true}}]);pick(s,wood);pick(s,bronze);
 const before=ids(s);s=JSON.parse(JSON.stringify(s));
 act(s,'orderEffect',a=>a.cardId==='dm01-106');drain(s);
 assert.ok(has(s,0,'mana',ramp)&&has(s,0,'hand',revealedCard));assert.equal(s.players[0].mana.length,3);assert.deepEqual(ids(s),before);clean(s,0);
});

test('Wood can still take a matching creature through Kaleiko statue and obeys a library reveal lock',()=>{
 const s=field();add(s,1,'battle','dm22ex1-086');give(s,0,'deck',[SMALL,SMALL]);const top=s.players[0].deck[0];play(s,WOOD);drain(s);
 assert.ok(has(s,0,'hand',top));clean(s,0);
 const t=field();add(t,1,'battle','dmrp07-m01');give(t,0,'deck',[SMALL,SMALL]);const locked=t.players[0].deck[0];play(t,WOOD);drain(t);
 assert.ok(has(t,0,'deck',locked));assert.equal(revealed(t).length,0);clean(t,0);
});

test('Wood respects ignored and suppressed entry abilities without moving or revealing its top card',()=>{
 for(const suppressor of [GEN,GG]){
  const s=field(),stop=add(s,1,'battle',suppressor);if(suppressor===GG)stop.under=[inst(SMALL)];
  const top=s.players[0].deck[0];play(s,WOOD);drain(s);assert.ok(has(s,0,'deck',top));assert.equal(revealed(s).length,0);clean(s,0);
 }
});

test('Wood loses normally on an empty library or after either mandatory branch consumes the final card',()=>{
 for(const id of [null,SMALL,'dm01-110']){
  const s=field();give(s,0,'deck',id?[id]:[]);play(s,WOOD);drain(s);assert.equal(s.winner,1);clean(s,0);
 }
});

for(const id of [BEAT,SLAVE,WOOD])test(e.card(id).name+' charges as one mana in its official orientation',()=>{
 const s=field();s.phase='charge';give(s,0,'hand',[id]);const card=s.players[0].hand[0];act(s,'charge',a=>a.uid===card.uid);
 assert.ok(has(s,0,'mana',card));assert.equal(card.tapped,id===WOOD);assert.equal(e.card(card).manaValue,1);
});
