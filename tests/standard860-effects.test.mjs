import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const ANVIL='dm36-025',VC='dm36-025VC',RENJIN='dm36-036',AINRAD='dm36-100';
const BODY='dm01-108',KURT='dm38-020',WORM='dm36-091',DOPPEL='dm36-021';
const TAKEO='dm36-106',PON='dm36-099',WIRAPON='dm36-032',BIG='dm03-015';
const DEMON='dm01-027',TRAP='dm01-039',FIGHT='dm24rp1-045';
function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(12).fill(BODY));
 return s;
}
function add(s,p,zone,id,props){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const play=(s,id)=>{const x=add(s,s.active,'hand',id);act(s,'play',a=>a.uid===x.uid);return x;};
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,x)=>act(s,'extended',a=>values(s)[a.choice]===x.uid);
function destroy(s,x){
 play(s,DEMON);
 act(s,'effect',a=>a.targets.some(t=>t.uid===x.uid));
}

test('Phase 860 registers the whole official cards with their original IDs',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-860.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(row=>row.id),[ANVIL,RENJIN,AINRAD]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[[VC,ANVIL]]);
 assert.deepEqual(registry.resolveRows([{id:VC,count:2},{id:ANVIL,count:2}]),[{id:ANVIL,count:4}]);
 const ref=m.printAliases[0];
 assert.deepEqual(standardCardSpec({...ref,status:'complete'},{phase:860}),m.cards[0].spec);
 assert.equal(m.regulationVerification.limits[VC],4);
 assert.notEqual(ref.image,CARD_IMAGES[ANVIL]);
 assert.ok(!data.cards.some(c=>c.id===VC));
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(d.faces,row.faces);
  assert.deepEqual(standardCardSpec(d,{phase:860}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:859}));
  const unknown=structuredClone(d);
  unknown.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:860}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   ['creature',f.cost,Number.parseInt(f.powerText,10),f.race,f.civilizations,1,4]);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);
  assert.deepEqual(registry.resolveRows([{id:row.id,count:4}]),[{id:row.id,count:4}]);
 }
});

test('Anvil lets the opponent choose their own creature after an allied E Soul is destroyed',()=>{
 let s=field();
 const a=add(s,0,'battle',BODY),b=add(s,0,'battle',BODY);
 const anvil=add(s,1,'battle',ANVIL),worm=add(s,1,'battle',WORM,{g35Ignored:s.turn});
 destroy(s,worm);
 assert.equal(s.decision.player,0);
 assert.deepEqual(values(s),[a.uid,b.uid]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,b);
 assert.deepEqual(s.players[0].grave.filter(x=>x.cardId===BODY).map(x=>x.uid),[b.uid]);
 assert.ok(s.players[0].battle.some(x=>x.uid===a.uid));
 assert.ok(s.players[1].battle.some(x=>x.uid===anvil.uid));
});

test('Anvil triggers for another copy, but not for itself alone (QA 36041)',()=>{
 for(const another of [false,true]){
  const s=field(),body=add(s,0,'battle',BODY),anvil=add(s,1,'battle',ANVIL);
  if(another)add(s,1,'battle',ANVIL);
  destroy(s,anvil);
  if(another)pick(s,body);
  assert.equal(s.players[0].grave.includes(body),another);
 }
});

test('Anvil sees an allied E Soul destroyed in the same batch as itself (QA 34917)',()=>{
 const s=field();
 const body=add(s,0,'battle',BODY),anvil=add(s,1,'battle',ANVIL),worm=add(s,1,'battle',WORM);
 (s.extTasks??=[]).push({op:'g34_Sweep',p:0,source:DEMON,filter:{creature:true},to:'grave'});
 act(s,'toAttack');
 assert.deepEqual(s.players[1].grave.map(x=>x.uid),[anvil.uid,worm.uid]);
 assert.equal(s.decision.player,0);
 pick(s,body);
 assert.ok(s.players[0].grave.includes(body));
});

test('Anvil ignores non-E creatures, opponents and moves that are not destruction',()=>{
 const s=field();
 add(s,0,'battle',ANVIL);
 const worm=add(s,1,'battle',WORM),plain=add(s,0,'battle',BODY),ownWorm=add(s,0,'battle',WORM);
 destroy(s,worm);
 assert.equal(s.decision,null);
 s.active=1;
 destroy(s,plain);
 assert.equal(s.decision,null);
 play(s,TRAP);
 act(s,'effect',a=>a.targets.some(t=>t.uid===ownWorm.uid));
 assert.ok(s.players[0].mana.includes(ownWorm));
 assert.equal(s.decision,null);
});

test('Renjin counts other friendly W Souls only during combat and retains W-Breaker',()=>{
 const s=field(),renjin=add(s,0,'battle',RENJIN),enemy=add(s,1,'battle',BIG,{tapped:true});
 const w=add(s,0,'battle',TAKEO,{g35Ignored:s.turn});
 add(s,1,'battle',TAKEO);
 add(s,0,'battle',BODY,{under:[inst(TAKEO)]});
 assert.equal(e.power(renjin,false,s),8000);
 assert.equal(e.power(renjin,true,s),8000);
 assert.equal(e.matchupPower(renjin,enemy,true,s),10000);
 assert.equal(e.matchupPower(renjin,enemy,false),8000);
 assert.equal(e.effectiveCard(renjin,s).breaker,2);
 attack(s,renjin.uid,enemy.uid);
 drain(s);
 assert.ok(s.players[1].grave.includes(enemy));
 assert.ok(s.players[0].battle.includes(w));
 assert.equal(e.power(renjin,false,s),8000);
});

test('Renjin also gains power in a battle started by a spell',()=>{
 const s=field(),renjin=add(s,0,'battle',RENJIN),enemy=add(s,1,'battle',BIG);
 add(s,0,'battle',TAKEO);
 add(s,0,'battle',DOPPEL);
 assert.equal(e.power(renjin,false,s),9000);
 assert.equal(e.matchupPower(renjin,enemy,false,s),13000);
 play(s,FIGHT);
 pick(s,renjin);
 pick(s,enemy);
 assert.ok(s.players[0].battle.includes(renjin));
 assert.ok(s.players[1].grave.includes(enemy));
});

test('Ainrad gains Power Attacker once when another friendly K Soul is present (QA 36048)',()=>{
 const s=field(),a=add(s,0,'battle',AINRAD),enemy=add(s,1,'battle',BODY,{tapped:true});
 add(s,1,'battle',PON);
 assert.equal(e.power(a,true,s),2000);
 add(s,0,'battle',PON,{g35Ignored:s.turn});
 add(s,0,'battle',WIRAPON);
 assert.equal(e.power(a,false,s),2000);
 assert.equal(e.power(a,true,s),4000);
 attack(s,a.uid,enemy.uid);
 drain(s);
 assert.ok(s.players[0].battle.includes(a));
 assert.ok(s.players[1].grave.includes(enemy));
});

test('Ainrad loses the bonus if ignored, and does not gain it in a spell battle',()=>{
 const s=field(),a=add(s,0,'battle',AINRAD),enemy=add(s,1,'battle',BODY);
 add(s,0,'battle',PON);
 a.g35Ignored=s.turn;
 assert.equal(e.power(a,true,s),2000);
 delete a.g35Ignored;
 play(s,FIGHT);
 pick(s,a);
 pick(s,enemy);
 assert.ok(s.players[0].grave.includes(a));
 assert.ok(s.players[1].grave.includes(enemy));
});
