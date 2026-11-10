import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const MIEZO='dm36-067',URANUS='dm15-022',SILK='dm37-006';
const BODY='dm01-108',TAKEO='dm36-106',BANDAM='dm20-054',SHIIKAI='dm36-082';
const GEAR='dm15-008',PLAIN_GEAR='dm14-110',LAW='dm14-077',LANCE='dm15-043',ZEMEKIS='dm32-013',STOMACH='dm16-034';
const BOUNCE='dm05-024',TERROR='dm01-030';
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
const pick=(s,uid)=>act(s,'extended',a=>{
 const v=s.decision.choices[a.choice].value;
 return (v?.uid??v)===uid;
});
const options=s=>s.decision?.choices?.map(({value:v})=>v?.uid??v)??[];
function move(s,p,x,to='grave'){
 s.phase='main';
 (s.extTasks??=[]).push({op:'g34_ExactMove',p:s.active,source:TERROR,owner:p,target:x.uid,to});
 act(s,'toAttack');
 drain(s);
}
const attach=(g,x)=>{g.crossedTo={uid:x.uid,incarnation:x.incarnation||0};};

test('Phase 858 registers the whole official cards with their original IDs',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-858.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(row=>row.id),[MIEZO,URANUS,SILK]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(d.faces,row.faces);
  assert.deepEqual(standardCardSpec(d,{phase:858}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:857}));
  const unknown=structuredClone(d);
  unknown.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:858}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   ['creature',f.cost,Number.parseInt(f.powerText,10),f.race,f.civilizations,1,4]);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);
  assert.deepEqual(registry.resolveRows([{id:row.id,count:4}]),[{id:row.id,count:4}]);
 }
});

test('Miezo moves other friendly W Soul creatures to mana even if their abilities are ignored',()=>{
 const s=field();
 const miezo=add(s,0,'battle',MIEZO),takeo=add(s,0,'battle',TAKEO,{g35Ignored:s.turn});
 const bandam=add(s,0,'battle',BANDAM);
 const enemy=add(s,1,'battle',TAKEO),plain=add(s,0,'battle',BODY);
 move(s,0,takeo);
 assert.ok(s.players[0].mana.includes(takeo));
 assert.equal(takeo.tapped,false);
 assert.equal(e.power(bandam,false,s),3000);
 move(s,1,enemy);
 move(s,0,plain);
 assert.ok(s.players[1].grave.includes(enemy));
 assert.ok(s.players[0].grave.includes(plain));
 move(s,0,miezo);
 assert.ok(s.players[0].grave.includes(miezo));
});

test('Miezo protects another copy in a simultaneous destruction (QA 36080)',()=>{
 const s=field(),a=add(s,0,'battle',MIEZO),b=add(s,0,'battle',MIEZO);
 (s.extTasks??=[]).push({op:'g34_Sweep',p:0,source:TERROR,owner:'self',filter:{creature:true},to:'grave'});
 act(s,'toAttack');
 drain(s);
 assert.ok([a,b].every(x=>s.players[0].mana.includes(x)));
});

test('Miezo does not change other moves and loses its replacement when ignored',()=>{
 const s=field(),miezo=add(s,0,'battle',MIEZO),a=add(s,0,'battle',TAKEO);
 move(s,0,a,'hand');
 assert.ok(s.players[0].hand.includes(a));
 const b=add(s,0,'battle',TAKEO),c=add(s,0,'battle',TAKEO);
 s.phase='main';
 (s.extTasks??=[]).push({op:'g34_Sweep',p:0,source:TERROR,owner:'self',filter:{creature:true,max:3},to:'grave',g815PutInGrave:true});
 act(s,'toAttack');
 drain(s);
 assert.ok(s.players[0].grave.includes(b));
 assert.ok(s.players[0].grave.includes(c));
 miezo.g35Ignored=s.turn;
 const d=add(s,0,'battle',TAKEO);
 move(s,0,d);
 assert.ok(s.players[0].grave.includes(d));
});

test('Uranus protects only a gear crossed onto itself from an opposing choice',()=>{
 let s=field();
 const uranus=add(s,1,'battle',URANUS),body=add(s,1,'battle',BODY);
 const protectedGear=add(s,1,'battle',GEAR),otherGear=add(s,1,'battle',GEAR),looseGear=add(s,1,'battle',GEAR);
 attach(protectedGear,uranus);
 attach(otherGear,body);
 play(s,LAW);
 assert.deepEqual(options(s),[otherGear.uid,looseGear.uid]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,otherGear.uid);
 assert.ok(s.players[1].grave.some(x=>x.uid===otherGear.uid));
 assert.ok(s.players[1].battle.some(x=>x.uid===protectedGear.uid));
});

test('Uranus does not protect a gear after recrossing or from its own player',()=>{
 const s=field(),uranus=add(s,0,'battle',URANUS),body=add(s,0,'battle',BODY),gear=add(s,0,'battle',GEAR);
 attach(gear,uranus);
 play(s,LANCE);
 assert.deepEqual(options(s),[gear.uid]);
 pick(s,gear.uid);
 assert.ok(s.players[0].hand.includes(gear));
 act(s,'play',a=>a.uid===gear.uid);
 act(s,'crossGear',a=>a.uid===gear.uid&&a.target===uranus.uid);
 act(s,'crossGear',a=>a.uid===gear.uid&&a.target===body.uid);
 s.active=1;
 play(s,LAW);
 assert.deepEqual(options(s),[gear.uid]);
 pick(s,gear.uid);
 assert.ok(s.players[0].grave.includes(gear));
});

test('Uranus cannot protect against a gear sweep or a choice of the creature itself',()=>{
 for(const sweeper of [ZEMEKIS,STOMACH]){
  const s=field(),uranus=add(s,1,'battle',URANUS),gear=add(s,1,'battle',PLAIN_GEAR);
  attach(gear,uranus);
  play(s,sweeper);
  if(sweeper===STOMACH){
   assert.deepEqual(options(s),[uranus.uid]);
   pick(s,uranus.uid);
   assert.ok(s.players[1].mana.includes(uranus));
  }
  drain(s);
  assert.ok(s.players[1][sweeper===STOMACH?'mana':'grave'].includes(gear));
 }
});

test('Uranus stops protecting gear when its ability is ignored or it leaves the battlefield',()=>{
 for(const leave of [false,true]){
  const s=field(),uranus=add(s,1,'battle',URANUS),gear=add(s,1,'battle',PLAIN_GEAR);
  attach(gear,uranus);
  if(leave){
   move(s,1,uranus,'hand');
   s.phase='main';
   assert.equal(gear.crossedTo,undefined);
  }else uranus.g35Ignored=s.turn;
  play(s,LAW);
  assert.deepEqual(options(s),[gear.uid]);
  pick(s,gear.uid);
  assert.ok(s.players[1].grave.includes(gear));
 }
});

test('Silk grants blockers to other friendly H or M Soul creatures and has W-Breaker',()=>{
 const s=field();
 const silk=add(s,0,'battle',SILK),other=add(s,0,'battle',SILK);
 const m=add(s,0,'battle',SHIIKAI),plain=add(s,0,'battle',BODY),enemy=add(s,1,'battle',SHIIKAI);
 assert.equal(e.effectiveCard(silk,s).breaker,2);
 assert.equal(e.effectiveCard(silk,s).blocker,true);
 assert.equal(e.effectiveCard(m,s).blocker,true);
 assert.ok(!e.effectiveCard(plain,s).blocker);
 assert.ok(!e.effectiveCard(enemy,s).blocker);
 move(s,0,other,'hand');
 assert.ok(!e.effectiveCard(silk,s).blocker);
 assert.equal(e.effectiveCard(m,s).blocker,true);
 silk.g35Ignored=s.turn;
 assert.ok(!e.effectiveCard(m,s).blocker);
});

test('Silk grants a newly deployed M Soul creature a legal block on the same turn (QA 34918)',()=>{
 const s=field(),attacker=add(s,1,'battle',BODY);
 add(s,0,'battle',SILK);
 s.active=1;
 const m=add(s,0,'hand',SHIIKAI),other=add(s,0,'battle',SHIIKAI);
 (s.extTasks??=[]).push({op:'g34_Put',p:0,source:BOUNCE,origin:'hand',target:m.uid,execution:false});
 act(s,'toAttack');
 pick(s,other.uid);
 assert.equal(m.entered,s.turn);
 assert.ok(s.players[0].battle.includes(m));
 assert.ok(s.players[0].hand.includes(other));
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===m.uid);
 assert.ok(m.tapped||s.players[0].grave.includes(m));
});
