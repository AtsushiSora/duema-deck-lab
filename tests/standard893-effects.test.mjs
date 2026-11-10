import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain,GEN} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const OODATE='dmrp15-069',KIRI='dmrp14-054',ZENI='dmrp15-041';
const SMALL='dm01-108',WATER='dm01-083',FIRE='dm01-097',ST='dm01-086',MOON='dmrp15-km3';
function field(p=0){const s=setup();s.active=p;for(const q of [0,1])give(s,q,'deck',Array(20).fill(SMALL));return s;}
function add(s,p,z,id,props){const x=Object.assign(inst(id),props);s.players[p][z].push(x);return x;}
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===(v?.uid??v));
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const ids=s=>e.physicalCards(s).map(x=>x.uid).sort();
function shields(s,p,own,other){give(s,p,'shields',Array(own).fill(SMALL));give(s,1-p,'shields',Array(other).fill(SMALL));}
function play(s,id){s.phase='main';const x=add(s,s.active,'hand',id);act(s,'play',a=>a.uid===x.uid&&!a.alternative);return x;}
function end(s){s.phase='attack';act(s,'endTurn');}
function invoke(s,p,defs){s.phase='main';s.extTasks=[{op:'g34_Sequence',p,source:ST,defs}];act(s,'toAttack');}
function schedule(s,p,defs){invoke(s,p,[{op:'Schedule537',when:'turnEnd',defs}]);}
function seal(s,p,x){x.sealed=true;add(s,p,'seals',SMALL,{sealOf:x.uid,faceDown:true});}

test('Phase 893 verifies all printed abilities, images, limits and original canonical IDs',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-893.json',import.meta.url))),registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[OODATE,KIRI,ZENI]);assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(row.faces,d.faces);assert.deepEqual(standardCardSpec(d,{phase:893}),row.spec);assert.throws(()=>standardCardSpec(d,{phase:892}));
  const unknown=structuredClone(d);unknown.faces[0].abilityText+='\n未知の能力。';assert.throws(()=>standardCardSpec(unknown,{phase:893}));
  for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
  assert.deepEqual([c.type,c.cost,c.civilizations,c.power,c.race,c.manaValue,c.limit],['creature',f.cost,f.civilizations,Number(f.powerText),f.race,1,4]);
  assert.equal(m.regulationVerification.limits[row.id],4);assert.ok(row.verification.facesMatched);assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(registry.resolveRows([{id:row.id,count:4}]),[{id:row.id,count:4}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);
 }
 const deck={id:'phase893',name:'鬼タイム',cards:[OODATE,KIRI,ZENI,SMALL,WATER,FIRE,ST,'dm01-090','dm01-076','dm01-027'].map(id=>({id,count:4}))};
 assert.deepEqual(e.validateDeck(deck),[]);assert.equal(registry.coverage(deck).unsupported,0);
});

for(const id of [OODATE,KIRI])for(const p of [0,1])test(e.card(id).name+' destroys itself only when tapped and Oni Time is off, at either player end '+p,()=>{
 for(const active of [p,1-p])for(const total of [0,6,7,10])for(const tapped of [false,true]){
  const s=field(active),host=add(s,p,'battle',id,{tapped});shields(s,p,Math.min(total,3),Math.max(0,total-3));
  const before=ids(s);end(s);drain(s);
  const destroyed=total>6&&tapped;
  assert.equal(has(s,p,'grave',host),destroyed);assert.equal(has(s,p,'battle',host),!destroyed);assert.deepEqual(ids(s),before);
 }
});

for(const id of [OODATE,KIRI])test(e.card(id).name+' keeps Blocker in Oni Time and can block without self-destructing at the end',()=>{
 const s=field(1),host=add(s,0,'battle',id),enemy=add(s,1,'battle',SMALL);shields(s,0,3,3);
 assert.ok(e.effectiveCard(host,s).blocker);attack(s,enemy.uid);act(s,'block',a=>a.uid===host.uid);drain(s);
 assert.ok(has(s,0,'battle',host)&&has(s,1,'grave',enemy));assert.equal(host.tapped,true);
 end(s);drain(s);assert.ok(has(s,0,'battle',host));
});

test('Kiri keeps Speed Attacker in Oni Time while Oodate and Zeni still have summoning sickness',()=>{
 for(const id of [OODATE,KIRI,ZENI]){
  const s=field();shields(s,0,3,3);const host=play(s,id);s.phase='attack';
  const canAttack=e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===host.uid);
  assert.equal(canAttack,id===KIRI);
  if(canAttack){attack(s,host.uid);act(s,'noBlock');drain(s);assert.equal(s.players[1].shields.length,2);}
 }
});

for(const id of [OODATE,KIRI])test(e.card(id).name+' queued end ability survives Oni Time becoming active (QA34236)',()=>{
 let s=field(),host=add(s,0,'battle',id,{tapped:true});add(s,0,'battle',MOON);shields(s,0,3,4);
 const selected=s.players[0].shields[0],before=ids(s);end(s);assert.equal(s.decision.type,'effectOrder');
 act(s,'orderEffect',a=>a.cardId===MOON);pick(s,selected);
 s=JSON.parse(JSON.stringify(s));
 // Moon counterbreak and the queued self-destruction may be ordered independently.
 for(let i=0;s.decision;i++){
  assert.ok(i<20);
  if(s.decision.type==='effectOrder')act(s,'orderEffect');
  else if(s.decision.task?.op==='g159S_MoonEnemy')pick(s,null);
  else e.step(s,e.chooseAI(s));
 }
 assert.ok(has(s,0,'grave',host));assert.equal(s.players[0].shields.length+s.players[1].shields.length,6);assert.deepEqual(ids(s),before);
});

for(const id of [OODATE,KIRI])test(e.card(id).name+' cannot trigger retroactively if Oni Time ends after the end step begins',()=>{
 const s=field(),host=add(s,0,'battle',id,{tapped:true});shields(s,0,3,3);
 schedule(s,0,[{op:'ShieldTop',n:1}]);end(s);drain(s);
 assert.equal(s.players[0].shields.length+s.players[1].shields.length,7);assert.ok(has(s,0,'battle',host));
});

for(const id of [OODATE,KIRI])test(e.card(id).name+' tests its tap state when its queued end ability resolves',()=>{
 for(const initiallyTapped of [false,true]){
  const s=field(),host=add(s,0,'battle',id,{tapped:initiallyTapped});shields(s,0,3,4);
  schedule(s,0,initiallyTapped?[{op:'GroupUntap',owner:'self',filter:{creature:true}}]:[{op:'ExactMove',owner:0,target:host.uid,tap:true}]);
  end(s);act(s,'orderEffect',a=>a.cardId===ST);drain(s);
  assert.equal(has(s,0,'grave',host),!initiallyTapped);
 }
});

for(const id of [OODATE,KIRI])test(e.card(id).name+' queued destruction remains pending if the source is later ignored',()=>{
 const s=field(),host=add(s,0,'battle',id,{tapped:true});shields(s,0,3,4);
 schedule(s,0,[{op:'Draw',n:1}]);end(s);assert.equal(s.decision.type,'effectOrder');host.g35Ignored=s.turn;
 act(s,'orderEffect',a=>a.cardId===id);drain(s);assert.ok(has(s,0,'grave',host));
});

for(const id of [OODATE,KIRI])test(e.card(id).name+' obeys a native destruction prevention and does not move if prevented',()=>{
 const s=field(),host=add(s,0,'battle',id,{tapped:true,g26Stay:true});shields(s,0,3,4);end(s);drain(s);
 assert.ok(has(s,0,'battle',host)&&!has(s,0,'grave',host));
});

for(const p of [0,1])test('Zeni takes exactly one required own shield before attacking only above six total shields '+p,()=>{
 for(const total of [6,7,8]){
  const s=field(p),host=add(s,p,'battle',ZENI);shields(s,p,3,total-3);
  const chosen=s.players[p].shields[1],before=ids(s);attack(s,host.uid);
  if(total>=7){assert.deepEqual(values(s),s.players[p].shields.map(x=>x.uid));pick(s,chosen);assert.ok(has(s,p,'hand',chosen));}
  else assert.equal(s.decision.type,'block');
  assert.equal(s.players[p].hand.length,total>=7?1:0);act(s,'noBlock');drain(s);assert.deepEqual(ids(s),before);
 }
});

test('Zeni returns an entire stacked shield and never uses its S Triggers at the seven-to-six boundary (QA34259)',()=>{
 let s=field(),host=add(s,0,'battle',ZENI);shields(s,0,3,4);
 const chosen=s.players[0].shields[0];chosen.cardId=ST;const extra=inst(ST);chosen.shieldStack=[extra];
 const before=ids(s);attack(s,host.uid);s=JSON.parse(JSON.stringify(s));pick(s,chosen);
 assert.ok(has(s,0,'hand',chosen)&&has(s,0,'hand',extra));assert.equal(s.players[0].shields.length+s.players[1].shields.length,6);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='useTrigger'));
 act(s,'noBlock');drain(s);assert.equal(s.players[0].grave.length,0);assert.deepEqual(ids(s),before);
});

test('Zeni queued shield return still resolves after the source is ignored',()=>{
 let s=field(),host=add(s,0,'battle',ZENI);shields(s,0,3,4);const chosen=s.players[0].shields[0];attack(s,host.uid);
 host.g35Ignored=s.turn;s=JSON.parse(JSON.stringify(s));pick(s,chosen);assert.ok(has(s,0,'hand',chosen));act(s,'noBlock');drain(s);
});

test('Zeni ignores a gained shield after an Oni Time attack has already begun',()=>{
 const s=field(),host=add(s,0,'battle',ZENI);shields(s,0,3,3);attack(s,host.uid);
 // A shield appearing while the attack is waiting for blockers cannot create a past trigger.
 add(s,1,'shields',SMALL);assert.equal(s.players[0].hand.length,0);assert.equal(s.decision.type,'block');act(s,'noBlock');drain(s);
 assert.equal(s.players[0].shields.length,3);
});

test('Zeni still attacks legally with no own shield when only the opposing player has seven shields',()=>{
 const s=field(),host=add(s,0,'battle',ZENI);shields(s,0,0,7);attack(s,host.uid);assert.equal(s.decision.type,'block');
 act(s,'noBlock');drain(s);assert.equal(s.players[1].shields.length,6);assert.equal(s.players[0].hand.length,0);
});

test('Oni Time counts shields as groups rather than the number of physical stacked cards',()=>{
 const s=field(),host=add(s,0,'battle',OODATE,{tapped:true});shields(s,0,3,3);
 s.players[0].shields[0].shieldStack=[inst(WATER),inst(FIRE)];assert.ok(!e.effectiveCard(host,s).g474AnyEnd);end(s);drain(s);assert.ok(has(s,0,'battle',host));
});

for(const id of [OODATE,KIRI,ZENI])test(e.card(id).name+' has no printed triggered ability or Blocker when sealed or ignored',()=>{
 for(const mode of ['sealed','ignored','genmu']){
  const s=field(),host=add(s,0,'battle',id,{tapped:id!==ZENI});shields(s,0,3,4);
  if(mode==='sealed')seal(s,0,host);if(mode==='ignored')host.g35Ignored=s.turn;if(mode==='genmu')add(s,1,'battle',GEN);
  if(id===ZENI){
   assert.ok(!e.effectiveCard(host,s).g34Attack);
   if(mode!=='sealed'){attack(s,host.uid);assert.equal(s.decision.type,'block');act(s,'noBlock');drain(s);}
  }else {assert.ok(!e.effectiveCard(host,s).blocker);end(s);drain(s);assert.ok(has(s,0,'battle',host));}
  assert.equal(s.players[0].hand.length,0);
 }
});

for(const id of [OODATE,KIRI,ZENI])test(e.card(id).name+' charges as one mana with its printed orientation',()=>{
 const s=field();s.phase='charge';give(s,0,'hand',[id]);const host=s.players[0].hand[0];act(s,'charge',a=>a.uid===host.uid);
 assert.ok(has(s,0,'mana',host));assert.equal(host.tapped,id===KIRI);assert.equal(e.card(host).manaValue,1);
});
