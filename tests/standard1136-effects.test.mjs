import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const FAD='dm25rp2-006',ARG='dm25rp2-007',THIEF='dm25rp2-019';
const NATURE='dm01-108',FIRE='dm01-097',GEAR='dm14-110',DEMON_HAND='dm01-027';
const ANGEL='dm01-s01',NEO='dm25rp2-020';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const put=(s,p,zone,id,attrs)=>{const x=Object.assign(inst(id),attrs);s.players[p][zone].push(x);return x;};
const play=(s,id)=>{const x=put(s,s.active,'hand',id);act(s,'play',a=>a.uid===x.uid);return x;};
const values=s=>(s.decision?.choices??[]).map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);
const field=()=>{
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(15).fill(NATURE));
 return s;
};

test('three official definitions and all six prints resolve without duplicate card IDs',()=>{
 const manifest=read('tools/support-phase-1136.json');
 const refs=read('tools/image-reference-prints.json').prints;
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(manifest.cards.map(row=>row.id),[FAD,ARG,THIEF]);
 assert.equal(manifest.printAliases.length,3);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  const detail={...details.cards.find(c=>c.id===id),id:row.id,faces:row.faces};
  const spec=manifest.cards.find(c=>c.id===id).spec;
  assert.deepEqual(standardCardSpec(detail,{phase:1136}),spec);
  for(const [key,value] of Object.entries(spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,c.race,c.manaValue,c.limit],
   ['creature',f.cost,Number(f.powerText),f.race,1,4]);
  assert.equal(registry.get(row.id).id,id);
  assert.equal(registry.byName.get(nameKey(row.name)).id,id);
  assert.ok(refs.some(ref=>ref.id===row.id&&ref.canonicalId===id&&ref.image===row.image));
  assert.equal(manifest.regulationVerification.limits[row.id],4);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  detail.faces=structuredClone(row.faces);
  detail.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(detail,{phase:1136}));
 }
});

test('Fadioal reveals four, accepts either an Angel Command or a NEO, and orders the rest',()=>{
 for(const chosen of [ANGEL,NEO]){
  const s=field();
  give(s,0,'deck',[NATURE,ANGEL,NEO,GEAR,FIRE,NATURE]);
  const [a,b,c,d,next,last]=s.players[0].deck;
  const source=play(s,FAD);
  assert.equal(e.effectiveCard(source,s).blocker,true);
  assert.deepEqual(values(s),[b.uid,c.uid]);
  const taken=chosen===ANGEL?b:c,other=taken===b?c:b;
  pick(s,taken.uid);
  pick(s,d.uid);pick(s,other.uid);
  assert.ok(s.players[0].hand.includes(taken));
  assert.deepEqual(s.players[0].deck.map(x=>x.uid),[next.uid,last.uid,d.uid,other.uid,a.uid]);
 }
});

for(const inherited of [false,true])test('Fadioal can replace a departure once per turn and never uses the shield S-Trigger: '+inherited,()=>{
 const s=field();
 give(s,1,'shields',[DEMON_HAND,NATURE]);
 const host=put(s,1,'battle',inherited?THIEF:FAD,inherited?{under:[inst(FAD)]}:{});
 const [shield]=s.players[1].shields;
 play(s,DEMON_HAND);act(s,'effect');
 assert.equal(s.decision.type,'leaveReplace');
 act(s,'g1088Kent',a=>a.choice.shield===shield.uid);
 assert.equal(s.decision,null);
 assert.ok(s.players[1].hand.includes(shield));
 assert.ok(s.players[1].battle.includes(host));
 play(s,DEMON_HAND);act(s,'effect');
 assert.ok(s.players[1].grave.includes(host));
 assert.equal(s.players[1].shields.length,1);
});

test('two inherited Fadioal copies supply separate replacements and preserve the real stack',()=>{
 const s=field(),host=put(s,1,'battle',THIEF,{under:[inst(FAD),inst(FAD)]});
 const [a,b]=s.players[1].shields;
 for(const shield of [a,b]){
  play(s,DEMON_HAND);act(s,'effect');
  act(s,'g1088Kent',a=>a.choice.shield===shield.uid);
  assert.ok(s.players[1].battle.includes(host));
  assert.equal(host.under.length,2);
 }
 play(s,DEMON_HAND);act(s,'effect');
 assert.ok(s.players[1].grave.includes(host));
});

test('Argent can pick no targets, send one to mana, or assign both with a gear eligible',()=>{
 for(const count of [0,1,2]){
  const s=field(),gear=put(s,1,'battle',GEAR),creature=put(s,1,'battle',NATURE);
  play(s,ARG);
  assert.deepEqual(values(s),[gear.uid,creature.uid,null]);
  if(count)pick(s,gear.uid);
  if(count<2)pick(s,null);
  else{pick(s,creature.uid);pick(s,creature.uid);}
  assert.equal(s.players[1].mana.includes(gear),count===1);
  assert.equal(s.players[1].mana.includes(creature),count===2);
  assert.equal(s.players[1].shields.includes(gear),count===2);
 }
 assert.equal(e.card(ARG).trigger,true);
});

test('Argent sends an opposing element to the physical owner’s mana',()=>{
 const s=field(),borrowed=put(s,1,'battle',NATURE,{cardOwner:0});
 play(s,ARG);
 pick(s,borrowed.uid);
 assert.ok(s.players[0].mana.includes(borrowed));
 assert.ok(!s.players[1].mana.includes(borrowed));
});

test('the printed and inherited Argent look stays private and resolves before the shield break',()=>{
 for(const inherited of [false,true]){
  const s=field(),host=put(s,0,'battle',inherited?NATURE:ARG,inherited?{under:[inst(ARG)]}:{});
  give(s,1,'shields',[NATURE]);
  const top=s.players[0].deck[0];
  attack(s,host.uid);act(s,'noBlock');
  assert.equal(s.decision.task.op,'g34_LookPick');
  assert.equal(s.log.at(-1).type,'look');
  assert.equal(s.players[1].shields.length,1);
  pick(s,top.uid);pick(s,inherited?'shields':'mana');
  assert.ok(s.players[0][inherited?'shields':'mana'].includes(top));
  assert.equal(s.players[1].shields.length,0);
 }
});

test('Thief quotes and pays one plus other hand cards, including another copy, when NEO evolving',()=>{
 const s=field(),base=put(s,0,'battle',NATURE);
 const x=put(s,0,'hand',THIEF);
 put(s,0,'hand',THIEF);put(s,0,'hand',FIRE);
 give(s,0,'mana',[FIRE,FIRE,FIRE]);
 act(s,'play',a=>a.uid===x.uid&&a.cost===3);
 act(s,'evolve',a=>a.baseUid===base.uid&&a.cost===3);
 assert.ok(s.players[0].battle.includes(x));
 assert.ok(x.under.includes(base));
 assert.ok(s.players[0].mana.every(y=>y.tapped));
});

test('Thief can draw or decline once per actual shield, with all choices before shields move',()=>{
 const s=field(),x=put(s,0,'battle',THIEF);
 give(s,1,'shields',[NATURE,NATURE,NATURE]);
 const first=s.players[0].deck[0];
 attack(s,x.uid);act(s,'noBlock');act(s,'breakShields');
 pick(s,1);
 assert.equal(s.players[1].shields.length,3);
 assert.ok(s.players[0].hand.includes(first));
 pick(s,0);
 assert.equal(s.players[0].hand.length,1);
 assert.equal(s.players[1].shields.length,1);
});

test('the attacking Thief chooses the order of its draw and inherited Argent abilities',()=>{
 const s=field(),host=put(s,0,'battle',THIEF,{under:[inst(ARG)]});
 give(s,1,'shields',[NATURE]);
 const [first,second]=s.players[0].deck;
 attack(s,host.uid);act(s,'noBlock');
 assert.equal(s.decision.task.op,'g34_BreakOrder1136');
 pick(s,1);
 pick(s,first.uid);pick(s,'mana');
 assert.ok(s.players[0].mana.includes(first));
 assert.equal(s.players[1].shields.length,1);
 pick(s,1);
 assert.ok(s.players[0].hand.includes(second));
 assert.equal(s.players[1].shields.length,0);
});

for(const [id,alternative] of [['dm26ex2-012','replaceStar'],['dm25rp1-S06','replaceGneo']])
 test('Fadioal’s inherited replacement can be chosen alongside evolution protection: '+id,()=>{
  const s=field(),base=inst(FAD),host=put(s,1,'battle',id,{under:[base]});
  const shield=s.players[1].shields[0];
  play(s,DEMON_HAND);act(s,'effect');
  assert.ok(e.getLegalActions(s).some(a=>a.kind===alternative));
  act(s,'g1088Kent',a=>a.choice.shield===shield.uid);
  assert.ok(s.players[1].battle.includes(host));
  assert.deepEqual(host.under,[base]);
  assert.ok(s.players[1].hand.includes(shield));
 });

test('Fadioal offers no shield replacement without a shield that can leave',()=>{
 const s=field(),host=put(s,1,'battle',FAD);
 for(const shield of s.players[1].shields)shield.g37ShieldHeld=true;
 play(s,DEMON_HAND);act(s,'effect');
 assert.ok(s.players[1].grave.includes(host));
 assert.equal(s.players[1].shields.length,5);
});
