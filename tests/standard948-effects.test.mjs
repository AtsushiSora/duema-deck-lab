import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain,cast} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const OFFICER='dm14-017',MARSHAL='dm10-022',REPRINT='dmx10-024',CROW='dm30-030';
const MEDUSA='dm07-s02',WATER='dm01-083',HALKAS='dm01-080',PLAIN='dm01-108',LIGHT='dm01-075';
const JELLY='dm02-045',GHOST='dm03-045',SAMURAI='dm29-054',GEAR='dm14-110',BLOCKER='dm22-038',DIRGE='dm13-025';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const choices=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>choices(s)[a.choice]===(value?.uid??value));
const legal=(s,kind,pred=()=>true)=>e.getLegalActions(s).some(a=>a.kind===kind&&pred(a));
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const extra=(s,x)=>e.effectiveCard(x,s).extraBreak||0;

function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1]){give(s,p,'deck',Array(18).fill(PLAIN));give(s,p,'grave',[]);}
 return s;
}

function put(s,p,z,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][z].push(x);
 return x;
}

function endTurn(s){
 s.phase='attack';
 act(s,'endTurn');
}

function evolve(s,id,base){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 act(s,'evolve',a=>a.baseUid===base.uid);
 return x;
}

function cross(s,gear,target){
 act(s,'crossGear',a=>a.uid===gear.uid&&a.target===target.uid);
}

function unblocked(s,n){
 act(s,'noBlock');
 if(n>1)act(s,'breakShields',a=>a.shields.length===n);
 drain(s);
}

test('Phase 948 verifies all three complete names and preserves the first-print ID for Marshal',()=>{
 const m=read('tools/support-phase-948.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[OFFICER,MARSHAL,CROW]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[[REPRINT,MARSHAL]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,f=row.faces[0],c=e.card(id),canonical=m.cards.find(x=>x.id===id);
  const d={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(d,{phase:948}),canonical.spec);
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'不明な能力。'}]},{phase:948}));
  for(const [key,value] of Object.entries(canonical.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   ['creature',f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-948');
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
 }
});

for(const amount of [0,1,2])test('Officer offers zero to two extra cards only on its controller’s turn '+amount,()=>{
 let s=field(1);
 put(s,0,'battle',OFFICER);put(s,0,'battle',MEDUSA,{under:[inst(WATER)]});
 endTurn(s);
 assert.equal(s.decision.source,OFFICER);
 assert.deepEqual(choices(s),[0,1,2]);
 s=restore(s);pick(s,amount);
 assert.equal(s.decision.source,MEDUSA);pick(s,true);
 assert.equal(s.players[0].hand.length,2+amount);
 assert.equal(s.players[1].hand.length,0);
 act(s,'skipCharge');
 cast(s,HALKAS);act(s,'draw',a=>a.n===1);
 assert.equal(s.decision,null);
 assert.equal(s.players[0].hand.length,3+amount);
});

test('Officer’s end-step tap is mandatory, accepts its own already-tapped body and a second distinct creature',()=>{
 let s=field();
 const source=put(s,0,'battle',OFFICER,{tapped:true}),ally=put(s,0,'battle',PLAIN),other=put(s,0,'battle',LIGHT);
 const enemy=put(s,1,'battle',PLAIN);
 endTurn(s);
 assert.deepEqual(choices(s),[source.uid,ally.uid,other.uid]);
 pick(s,source);
 assert.deepEqual(choices(s),[ally.uid,other.uid]);
 assert.equal(ally.tapped,false);
 s=restore(s);pick(s,ally);
 assert.deepEqual(s.players[0].battle.map(x=>x.tapped),[true,true,false]);
 assert.equal(s.players[1].battle.find(x=>x.uid===enemy.uid).tapped,false);
 assert.equal(s.active,1);
 assert.equal(s.players[1].hand.length,1);
});

test('Officer taps its only creature at end of turn and ability ignoring disables both effects',()=>{
 const s=field(),officer=put(s,0,'battle',OFFICER);
 endTurn(s);pick(s,officer);
 assert.equal(officer.tapped,true);
 officer.g35Ignored=s.turn+1;
 endTurn(s);
 assert.equal(s.active,0);
 assert.equal(s.decision,null);
 assert.equal(s.players[0].hand.length,1);
 endTurn(s);
 assert.equal(s.active,1);
 assert.equal(s.decision,null);
});

test('Marshal requires a friendly Ghost, forces a blind discard for its own attack and breaks two shields',()=>{
 let s=field(),marshal=put(s,0,'hand',MARSHAL);
 const ally=put(s,0,'battle',PLAIN);
 put(s,1,'battle',GHOST);
 assert.ok(!legal(s,'play',a=>a.uid===marshal.uid));
 const base=put(s,0,'battle',GHOST);
 act(s,'play',a=>a.uid===marshal.uid);
 assert.ok(!legal(s,'evolve',a=>a.baseUid===ally.uid));
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.equal(marshal.under[0].uid,base.uid);
 const [first,second]=give(s,1,'hand',[LIGHT,WATER]);
 attack(s,marshal.uid);
 assert.equal(s.decision.player,0);
 assert.deepEqual(choices(s),[0,1]);
 assert.ok(s.decision.choices.every(x=>!x.cardId&&x.label.startsWith('裏向き')));
 s=restore(s);pick(s,1);
 assert.ok(has(s,1,'hand',first)&&has(s,1,'grave',second));
 unblocked(s,2);
 assert.equal(s.players[1].shields.length,3);
});

test('Marshal’s watcher and Jelly Worm’s attack ability discard a card each before blocking',()=>{
 const s=field(),marshal=put(s,0,'battle',MARSHAL,{under:[inst(GHOST)]}),jelly=put(s,0,'battle',JELLY);
 give(s,1,'hand',[LIGHT,WATER,PLAIN]);
 attack(s,jelly.uid);
 assert.equal(s.decision.type,'effectOrder');
 act(s,'orderEffect',a=>a.uid===marshal.uid);
 pick(s,0);
 assert.equal(s.players[1].hand.length,1);
 assert.equal(s.players[1].grave.length,2);
 assert.equal(s.decision.type,'block');
});

test('Marshal only watches its own creatures and still resolves cleanly with an empty opposing hand',()=>{
 for(const active of [0,1]){
  const s=field(active),a=put(s,active,'battle',PLAIN);
  put(s,0,'battle',MARSHAL,{under:[inst(GHOST)]});
  if(active===1)put(s,0,'hand',LIGHT);
  attack(s,a.uid);
  assert.equal(s.decision.type,'block');
  assert.equal(s.players[0].hand.length,active);
 }
});

test('Crow requires a Samurai, inherits the cross and gains a second shield as its attack taps it',()=>{
 const s=field(),crow=put(s,0,'hand',CROW),other=put(s,0,'battle',PLAIN),gear=put(s,0,'battle',GEAR);
 assert.ok(!legal(s,'play',a=>a.uid===crow.uid));
 const base=put(s,0,'battle',SAMURAI);
 cross(s,gear,base);
 act(s,'play',a=>a.uid===crow.uid);
 assert.ok(!legal(s,'evolve',a=>a.baseUid===other.uid));
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.equal(gear.crossedTo.uid,crow.uid);
 assert.equal(extra(s,crow),0);
 attack(s,crow.uid);
 assert.ok(crow.tapped);
 assert.equal(extra(s,crow),1);
 unblocked(s,2);
 assert.equal(s.players[1].shields.length,3);
});

test('Each tapped Crow grants one additional break per crossed ally regardless of gear count',()=>{
 const s=field(),a=put(s,0,'battle',PLAIN),other=put(s,0,'battle',PLAIN),b=put(s,1,'battle',PLAIN);
 const crows=[0,1].map(()=>put(s,0,'battle',CROW,{tapped:true,under:[inst(SAMURAI)]}));
 for(const target of [a,a,b]){
  const p=target===b?1:0,gear=put(s,p,'battle',GEAR);
  if(p===0)cross(s,gear,a);
  else gear.crossedTo={uid:b.uid,incarnation:b.incarnation||0};
 }
 assert.deepEqual([extra(s,a),extra(s,other),extra(s,b)],[2,0,0]);
 a.g35Ignored=s.turn;
 assert.equal(extra(s,a),2);
 crows[0].tapped=false;
 assert.equal(extra(s,a),1);
 crows[1].g35Ignored=s.turn;
 assert.equal(extra(s,a),0);
});

test('Crow’s bonus applies to a crossed ally’s effect break before a blocked battle',()=>{
 const s=field(),a=put(s,0,'battle',PLAIN),b=put(s,1,'battle',BLOCKER);
 put(s,0,'battle',CROW,{tapped:true,under:[inst(SAMURAI)]});
 cross(s,put(s,0,'battle',GEAR),a);
 cast(s,DIRGE);
 attack(s,a.uid);act(s,'block',x=>x.uid===b.uid);
 assert.equal(s.decision.task.op,'g34_Break497');
 for(let i=0;i<2;i++)pick(s,s.players[1].shields[i]);
 assert.equal(s.players[1].shields.length,3);
 assert.ok(has(s,1,'grave',b));
});
