import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const HYPER='dm24rp2-S07',IMPACT='dm16-008',KOBO='dm23rp1-003',BAJURA='dm15-s04',YUUKI='dm14-105';
const N='dm01-108',W='dm01-083',L='dm01-075',F='dm01-097',D='dm01-090',HIGH='dm01-s06';
const GUARD='dm36-086',TIDE='dm23rp1-026',KAKU='dm23rp3-OR2',KU='dmrp20-026';
const YABA='dm24rp1-S05',DOLF='dmrp17-km2',MOGI='dm23rp1-058';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
function field(p=0){
 const s=setup();s.active=p;
 for(const who of [0,1]){give(s,who,'deck',Array(20).fill(N));give(s,who,'grave',[]);}
 return s;
}
function add(s,p,z,id,props={}){const x=Object.assign(inst(id),props);s.players[p][z].push(x);return x;}
const choices=s=>s.decision?.choices?.map(x=>x.value?.uid??x.value)??[];
const pick=(s,v)=>act(s,'extended',a=>choices(s)[a.choice]===v);
const has=(s,p,z,x)=>s.players[p][z].some(y=>x.uid===y.uid);
function cross(s,gear,host){act(s,'crossGear',a=>a.uid===gear.uid&&a.target===host.uid);}
function activate(s,x,donor){act(s,'hyper',a=>a.uid===x.uid);pick(s,donor.uid);}
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}
const pending=(s,x)=>s.pendingEffects.filter(y=>y.source===x.cardId&&y.uid===x.uid);
function breakPending(s){
 if(s.decision?.type==='block')act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields');
}

test('five official versions preserve canonical IDs and both printed Hyper modes',()=>{
 const m=read('tools/support-phase-1231.json'),refs=read('tools/image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(c=>c.id),[HYPER,IMPACT,KOBO]);
 assert.deepEqual(m.printAliases.map(c=>c.canonicalId),[HYPER,HYPER]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0],parsed={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(parsed,{phase:1231}),row.spec);
  for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
  const changed=structuredClone(parsed);changed.faces.at(-1).abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(changed,{phase:1231}));
  assert.deepEqual(cat.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],[f.cost,+f.powerText,f.race,f.civilizations,1,4]);
  if(!row.canonicalId){assert.equal(CARD_IMAGES[id],row.image);assert.deepEqual(details.cards.find(x=>x.id===id).faces,row.faces);}
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===id)?.image,row.image);
 }
});

test('Voljaak destroys a creature of 5000 or less and Hyper taps another ally until next own turn',()=>{
 const s=field(),small=add(s,1,'battle',N),large=add(s,1,'battle',HIGH),donor=add(s,0,'battle',L);
 const paid=add(s,0,'hand',HYPER);act(s,'play',a=>a.uid===paid.uid);
 assert.deepEqual(choices(s),[small.uid]);pick(s,small.uid);
 assert.ok(has(s,1,'grave',small)&&has(s,1,'battle',large));
 assert.equal(e.power(paid,false,s),4000);
 activate(s,paid,donor);
 assert.equal(donor.tapped,true);
 assert.equal(e.power(paid,false,s),9000);
 assert.equal(e.effectiveCard(paid,s).breaker,2);
 end(s);assert.equal(e.power(paid,false,s),9000);
 end(s);assert.equal(e.power(paid,false,s),4000);
});

test('Crossing Bajura on Hyper Voljaak triggers the gear exactly once (QA45138)',()=>{
 const s=field(),vol=add(s,0,'battle',HYPER),donor=add(s,0,'battle',N),gear=add(s,0,'battle',BAJURA);
 const selected=add(s,1,'mana',W);
 cross(s,gear,vol);activate(s,vol,donor);
 attack(s,vol.uid);assert.equal(s.decision.source,BAJURA);
 pick(s,selected.uid);pick(s,null);
 assert.notEqual(s.decision?.source,BAJURA);
 assert.ok(has(s,1,'grave',selected));breakPending(s);drain(s);
 assert.equal(s.players[1].shields.length,2);
});

test('Hyper Voljaak doubles an attacking ally’s own trigger once even with two copies',()=>{
 for(const on of [false,true]){
  const s=field(),host=add(s,0,'battle',KU),v=add(s,0,'battle',HYPER),other=add(s,0,'battle',HYPER);
  if(on){activate(s,v,add(s,0,'battle',L));activate(s,other,add(s,0,'battle',F));}
  attack(s,host.uid);drain(s);
  assert.equal(s.players[0].hand.length,on?2:1);
 }
});

test('Voljaak does not double an attacker’s tap trigger (analogous QA45139)',()=>{
 const s=field(),vol=add(s,0,'battle',HYPER),host=add(s,0,'battle','dm24rp1-034');
 activate(s,vol,add(s,0,'battle',L));
 const deck=s.players[0].deck.length;
 attack(s,host.uid);drain(s);
 assert.equal(s.players[0].deck.length,deck-3);
 assert.equal(s.players[0].grave.length,2);
});

test('Dolf entry can resolve between two Yabadan attack triggers (QA45137)',()=>{
 const s=field(),v=add(s,0,'battle',HYPER),y=add(s,0,'battle',YABA),dolf=add(s,0,'grave',DOLF);
 activate(s,v,add(s,0,'battle',L));activate(s,y,add(s,0,'battle',F));
 const opposing=add(s,1,'battle',W);
 attack(s,y.uid);
 assert.equal(pending(s,y).length,2);
 act(s,'orderEffect',a=>a.cardId===YABA);pick(s,dolf.uid);
 assert.equal(pending(s,y).length,1);
 act(s,'orderEffect',a=>a.cardId===DOLF);
 assert.ok(has(s,1,'grave',opposing));
 drain(s);
});

for(const owner of [0,1])test('Uncrossed Impact caps a Bajura attack at one shield regardless of its controller '+owner,()=>{
 const s=field(),y=add(s,0,'battle',YUUKI),gear=add(s,0,'battle',BAJURA);
 add(s,owner,'battle',IMPACT);cross(s,gear,y);
 attack(s,y.uid);pick(s,null);breakPending(s);drain(s);
 assert.equal(s.players[1].shields.length,4);
});

test('Crossed Impact shields its destroyed host and leaves the gear in play',()=>{
 const s=field(),x=add(s,0,'battle',D),impact=add(s,0,'battle',IMPACT);
 cross(s,impact,x);s.active=1;
 cast(s,'dm01-027');act(s,'effect',a=>a.targets.some(t=>t.uid===x.uid));drain(s);
 assert.ok(has(s,0,'shields',x)&&has(s,0,'battle',impact));
 assert.equal(x.faceDown,true);
 assert.equal(impact.crossedTo,undefined);
 assert.ok(!has(s,0,'grave',x));
});

test('Impact shields evolution cards separately and does not replace a bounce',()=>{
 const s=field(),base=inst(N),x=add(s,0,'battle','dm02-s05',{under:[base]}),gear=add(s,0,'battle',IMPACT);
 cross(s,gear,x);s.active=1;
 cast(s,'dm01-027');act(s,'effect',a=>a.targets.some(t=>t.uid===x.uid));drain(s);
 for(const row of [x,base]){
  assert.ok(has(s,0,'shields',row));
  assert.equal(row.faceDown,true);
 }
 assert.ok(has(s,0,'battle',gear)&&!gear.crossedTo);
 const t=field(),y=add(t,0,'battle',D),second=add(t,0,'battle',IMPACT);
 cross(t,second,y);t.active=1;
 cast(t,'dm01-086');act(t,'effect',a=>a.targets.some(row=>row.uid===y.uid));drain(t);
 assert.ok(has(t,0,'hand',y));
 assert.equal(t.players[0].shields.length,5);
});

test('Uncrossed Impact allows Gejira’s two effect breaks (old QA35360)',()=>{
 const s=field(1),gejira=add(s,0,'battle','dm10-004',{tapped:true});
 add(s,1,'battle',IMPACT);
 s.phase='attack';act(s,'endTurn');
 act(s,'silent496',a=>a.yes===true);
 const [one,two]=s.players[1].shields;pick(s,one.uid);pick(s,two.uid);drain(s);
 assert.ok(gejira.tapped);
 assert.equal(s.players[1].shields.length,3);
});

test('Impact does not cap effect breaks, and the attack cap stops once it is crossed',()=>{
 const s=field(),tide=add(s,0,'battle',TIDE),gear=add(s,0,'battle',BAJURA),impact=add(s,0,'battle',IMPACT);
 cross(s,gear,tide);
 const [one,two]=s.players[1].shields;
 cast(s,GUARD);pick(s,1);pick(s,one.uid);pick(s,two.uid);drain(s);
 assert.equal(s.players[1].shields.length,3);
 cross(s,impact,tide);attack(s,tide.uid);pick(s,null);breakPending(s);drain(s);
 assert.equal(s.players[1].shields.length,0);
});

test('Kobo draws three and places exactly two hand cards at the bottom in the chosen order',()=>{
 const s=field(),first=add(s,0,'hand',L),second=add(s,0,'hand',F),top=s.players[0].deck.slice(0,3);
 cast(s,KOBO);const kobo=s.players[0].battle[0];
 assert.equal(kobo.justDiverActive,true);
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),[first,second,...top].map(x=>x.uid));
 pick(s,second.uid);pick(s,first.uid);
 assert.deepEqual(s.players[0].deck.slice(-2).map(x=>x.uid),[second.uid,first.uid]);
});

test('Kobo counts an earlier first spell and lets its controller decline the next turn’s first spell',()=>{
 const s=field();cast(s,GUARD);
 cast(s,KOBO);
 const [one,two]=s.players[0].hand;pick(s,one.uid);pick(s,two.uid);
 cast(s,GUARD);assert.ok(!s.decision);
 end(s);end(s);s.phase='main';
 cast(s,GUARD);assert.equal(s.decision.source,KOBO);
 const hand=s.players[0].hand.map(x=>x.uid);pick(s,null);
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),hand);
 cast(s,GUARD);assert.ok(!s.decision);
});

test('Kakumeijin resolves both before-break spells before Kobo, then breaks after Mekraid entry (QA43799)',()=>{
 const s=field(),kaku=add(s,0,'battle',KAKU),a=add(s,0,'hand',GUARD),b=add(s,0,'hand',GUARD),payment=add(s,0,'hand',L);
 add(s,0,'battle',KOBO);
 const [one,two]=s.players[1].shields;
 const top=[inst(N),inst(N),inst(MOGI),inst(W),inst(F)];
 s.players[0].deck.unshift(...top);
 attack(s,kaku.uid);breakPending(s);
 assert.equal(s.decision.task.op,'g9Kaku');pick(s,a.uid);
 assert.equal(s.decision.task.op,'g9Kaku');pick(s,b.uid);
 assert.equal(s.decision.source,KOBO);assert.equal(s.players[1].shields.length,5);
 pick(s,payment.uid);assert.equal(s.decision.task.max,5);pick(s,top[2].uid);pick(s,top[4].uid);
 drain(s);
 assert.ok(has(s,0,'grave',payment)&&has(s,0,'battle',top[2]));
 assert.ok(top[2].justDiverActive);
 assert.equal(s.players[1].shields.length,3);
 assert.ok([one,two].every(x=>has(s,1,'hand',x)));
});
