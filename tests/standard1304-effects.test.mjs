import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {shieldCards,shieldGroup} from '../dist/shield-state.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,cast,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';

const GALAXY='dm28-002',MYOO='dmex19-048',HEART='dmr01-020';
const BASIC='dm01-108',SLAYER='dm01-088',DEMON='dm01-027',SHUFFLE='dm22-029';
const MAFI='dmrp07-072',DES='dmrp04m-m02',MELA='dmrp07-006';
const STEEL='dmr10-008';
const pick=(s,value)=>act(s,'extended',a=>{
 const choice=s.decision.choices[a.choice].value;
 return (choice?.uid??choice)===(value?.uid??value);
});
function field(){
 const s=setup();
 s.active=0;
 for(const p of [0,1])give(s,p,'deck',Array(24).fill(BASIC));
 return s;
}
const add=(s,p,z,id,props={})=>{
 const x=Object.assign(inst(id),props);
 s.players[p][z].push(x);
 return x;
};
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);

test('fourteen official prints verify and resolve to three canonical IDs in deck lists',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-1304.json',import.meta.url)));
 const {prints}=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[GALAXY,MYOO,HEART]);
 assert.equal(m.printAliases.length,11);
 for(const {id,canonicalId=id,name,image,source,faces,spec} of [...m.cards,...m.printAliases]){
  const c=e.card(canonicalId),f=faces[0];
  assert.deepEqual(spec,standardCardSpec({id,name,faces,status:'complete'},{phase:1304}));
  for(const [key,value] of Object.entries(spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,c.race,c.limit,e.manaValue(c)],
   ['creature',f.cost,parseInt(f.powerText,10),f.race,4,1]);
  assert.deepEqual(prints.find(x=>x.id===id),{id,canonicalId,name,image,source});
  if(id===canonicalId)assert.equal(CARD_IMAGES[id],image);
  assert.equal(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).length,1);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id,count:1});
  assert.deepEqual(e.validateDeck({...deck,cards:registry.resolveRows(deck.cards)}),[]);
 }
});

test('Shield Force is optional and is chosen before Galaxy enters the battle zone',()=>{
 for(const skip of [false,true]){
  const s=field(),shield=s.players[0].shields[2];
  cast(s,GALAXY);
  assert.equal(s.decision.task.op,'g34_EntryShieldForce1304');
  assert.ok(!s.players[0].battle.length);
  const restored=JSON.parse(JSON.stringify(s));
  for(const position of [s,restored]){
   pick(position,skip?null:shield);
   const galaxy=position.players[0].battle[0];
   assert.equal(!!e.effectiveCard(galaxy,position).blocker,!skip);
   assert.equal(e.effectiveCard(galaxy,position).breaker,2);
   position.active=1;
   cast(position,DEMON);
   act(position,'effect',a=>a.targets[0].uid===galaxy.uid);
   drain(position);
   assert.equal(has(position,0,'battle',galaxy),!skip);
  }
 }
});

test('Netherworld Hand preserves the actual Galaxy’s chosen shield position (QA 37439)',()=>{
 const s=field(),shield=s.players[0].shields[2];
 shield.shieldStack=[inst(BASIC),inst(BASIC)];
 cast(s,GALAXY);pick(s,shield);
 const galaxy=s.players[0].battle[0];
 cast(s,SHUFFLE);
 const root=s.players[0].shields[2];
 assert.equal(shieldCards(root).length,3);
 assert.equal(galaxy.g35ShieldForce,shieldGroup(root));
 assert.ok(e.effectiveCard(galaxy,s).blocker);
 s.players[0].shields=[root];
 const attacker=add(s,1,'battle',BASIC);
 s.active=1;attack(s,attacker.uid);act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields',a=>a.shields.includes(root.uid));
 assert.ok(!e.effectiveCard(galaxy,s).blocker);
 assert.ok(has(s,0,'battle',galaxy));
 s.phase='main';cast(s,DEMON);
 act(s,'effect',a=>a.targets[0].uid===galaxy.uid);
 assert.ok(has(s,0,'grave',galaxy));
});

test('Galaxy stays at zero power until the linked shield leaves (QA 35636)',()=>{
 const s=field(),shield=s.players[0].shields[0];
 s.players[0].shields=[shield];
 cast(s,GALAXY);pick(s,shield);
 const galaxy=s.players[0].battle[0],attacker=add(s,1,'battle',BASIC);
 galaxy.powerModifiers=[{amount:-9000}];
 s.active=1;attack(s,attacker.uid);
 assert.equal(e.power(galaxy,false,s),0);
 assert.ok(has(s,0,'battle',galaxy));
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===galaxy.uid));
 act(s,'noBlock');drain(s);
 assert.ok(has(s,0,'grave',galaxy));
});

test('Galaxy can give itself up to a Shield Saver replacement while Shield Force is active',()=>{
 const s=field(),shield=s.players[0].shields[0],steel=add(s,0,'shields',STEEL,{faceUp:true});
 s.players[0].shields=[shield,steel];
 cast(s,GALAXY);pick(s,shield);
 const galaxy=s.players[0].battle[0],attacker=add(s,1,'battle','dm01-s01');
 s.active=1;attack(s,attacker.uid);act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields');
 act(s,'saveShield',a=>a.uid===galaxy.uid&&a.shield===shield.uid);
 drain(s);
 assert.ok(has(s,0,'shields',shield));
 assert.ok(has(s,0,'grave',galaxy));
});

test('Myoo mills two and grants Magic Tool to allied Mafi Gang in battle and grave',()=>{
 const s=field(),battle=add(s,0,'battle',MAFI),grave=add(s,0,'grave',MAFI);
 const hand=add(s,0,'hand',MAFI),opponent=add(s,1,'battle',MAFI);
 const milled=s.players[0].deck.slice(0,2);
 cast(s,MYOO);
 const myoo=s.players[0].battle.find(x=>x.cardId===MYOO);
 assert.ok(milled.every(x=>has(s,0,'grave',x)));
 assert.ok(e.effectiveCard(myoo,s).blocker);
 assert.ok(e.effectiveCard(myoo,s).noAttack);
 assert.match(e.effectiveCard(battle,s).race,/魔導具/);
 assert.match(e.zoneCard(s,0,grave,'grave').race,/魔導具/);
 assert.doesNotMatch(e.zoneCard(s,0,hand,'hand').race,/魔導具/);
 assert.doesNotMatch(e.effectiveCard(opponent,s).race,/魔導具/);
 s.active=1;cast(s,DEMON);act(s,'effect',a=>a.targets[0].uid===myoo.uid);
 assert.doesNotMatch(e.effectiveCard(battle,s).race,/魔導具/);
 assert.doesNotMatch(e.zoneCard(s,0,grave,'grave').race,/魔導具/);
});

test('Myoo enables the official Mela Volgar Gate to use all eight physical ritual cards (QA 41806)',()=>{
 const s=field(),des=add(s,0,'battle',DES),g1=add(s,0,'grave',MAFI),g2=add(s,0,'grave',MAFI);
 const under=Array.from({length:4},()=>inst(BASIC));
 des.under=[...under];
 add(s,0,'hand',MELA);cast(s,MYOO);
 const myoo=s.players[0].battle.find(x=>x.cardId===MYOO);
 assert.equal(s.decision.task.op,'g4_Declare');pick(s,true);
 act(s,'orderEffect',a=>a.cardId===MELA);
 assert.equal(s.decision.task.op,'g4_Gate');
 for(const x of [des,myoo,g1,g2])pick(s,x);
 drain(s);
 const mela=s.players[0].battle.find(x=>x.cardId===MELA);
 assert.ok(mela);
 assert.deepEqual(mela.under.map(x=>x.uid).sort(),[des,myoo,...under,g1,g2].map(x=>x.uid).sort());
});

test('Lovely Heart obtains power and Blocker only with up to two of its own shields',()=>{
 const s=field();cast(s,HEART);
 const heart=s.players[0].battle[0];
 assert.ok(!e.effectiveCard(heart,s).blocker);
 assert.equal(e.power(heart,false,s),4000);
 s.players[0].shields.length=2;
 assert.ok(e.effectiveCard(heart,s).blocker);
 assert.equal(e.power(heart,false,s),6000);
});

test('Lovely Heart can end a battle before comparing power while preserving Slayer (QA 36321–36323)',()=>{
 for(const [id,useBounce] of [[BASIC,true],[SLAYER,true],[BASIC,false]]){
  const s=field(),heart=add(s,0,'battle',HEART),target=add(s,1,'battle',id,{tapped:true});
  attack(s,heart.uid,target.uid);act(s,'noBlock');
  assert.equal(s.decision.task.op,'g34_Offer');pick(s,useBounce?true:null);
  drain(s);
  assert.ok(has(s,1,useBounce?'hand':'grave',target));
  assert.equal(has(s,0,'grave',heart),id===SLAYER);
 }
});
