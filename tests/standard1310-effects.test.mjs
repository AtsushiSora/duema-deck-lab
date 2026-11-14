import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,cast,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';

const DEATHMETA='dmx21-020',EDGEARM='dm28-059',STABACK='dmx15-011';
const BASIC='dm01-108',HEAVY='dmex17-033',METAL='dmex17-059',DEMON='dm01-027',MIKADOREO='dmrp20-km2';
const KNIGHT='dmc46-012',NIGHTMARE='dmr14-044',ARAGONITE='dm25-032',GEAR='dm28-033';
const SPARK='dm01-015',TWIN='dmex04-016',UNTAP_MANA='dm10-058';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url)));
const value=c=>c.value?.uid??c.value;
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
function field(){
 const s=setup();
 s.active=0;
 for(const p of [0,1])give(s,p,'deck',Array(26).fill(BASIC));
 return s;
}
function add(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
function destroy(s,by,target){
 s.active=by;
 s.phase='main';
 cast(s,DEMON);
 act(s,'effect',a=>a.targets.some(x=>x.uid===target.uid));
}

test('three official prints resolve to original playable IDs with the confirmed rules and limits',()=>{
 const m=read('tools/support-phase-1310.json'),registry=createCatalogue(snapshot,data.cards,details);
 const {prints}=read('tools/image-reference-prints.json');
 assert.deepEqual(m.cards.map(c=>c.id),[DEATHMETA,EDGEARM,STABACK]);
 assert.deepEqual(m.printAliases,[]);
 for(const {id,name,faces,image,source,spec} of m.cards){
  const card=e.card(id),face=faces[0];
  assert.deepEqual(standardCardSpec({id,name,faces,status:'complete'},{phase:1310}),spec);
  assert.deepEqual(prints.find(x=>x.id===id),{id,canonicalId:id,name,image,source});
  assert.equal(CARD_IMAGES[id],image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
  assert.deepEqual([card.type,card.civilizations,card.race,card.cost,card.power,e.manaValue(card),card.limit],
   ['creature',face.civilizations,face.race,face.cost,Number(face.powerText),1,4]);
  for(const [k,v] of Object.entries(spec))assert.deepEqual(card[k],v);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id,count:1});
  assert.deepEqual(e.validateDeck({...deck,cards:registry.resolveRows(deck.cards)}),[]);
 }
});

for(const amount of [0,1])test('Deathmeta may apply or decline its one-mana God discount: '+amount,()=>{
 let s=field();
 add(s,0,'battle',DEATHMETA);
 const god=add(s,0,'hand',HEAVY);
 act(s,'play',a=>a.uid===god.uid);
 assert.equal(s.decision.task.op,'g34_PayAura560');
 assert.deepEqual(s.decision.choices.map(value),[1,0,false]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,amount);
 drain(s);
 assert.ok(has(s,0,'battle',god));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,e.card(HEAVY).cost-amount);
});

test('Deathmeta discounts only its controller’s Gods and preserves the one-mana floor',()=>{
 const s=field();
 for(let i=0;i<5;i++)add(s,0,'battle',DEATHMETA);
 assert.equal(e.summonCost(s,0,e.card(HEAVY)),1);
 assert.equal(e.summonCost(s,1,e.card(HEAVY)),e.card(HEAVY).cost);
 assert.equal(e.summonCost(s,0,e.card(BASIC)),e.card(BASIC).cost);
});

test('Deathmeta recovers a God from its own grave after an actual God death',()=>{
 const s=field(),source=add(s,0,'battle',DEATHMETA),victim=add(s,0,'battle',HEAVY);
 const buried=add(s,0,'grave',METAL),unrelated=add(s,0,'grave',BASIC),opponent=add(s,1,'grave',HEAVY);
 destroy(s,1,victim);
 assert.equal(s.decision.task.op,'g34_Select');
 assert.deepEqual(s.decision.choices.map(value),[buried.uid,victim.uid]);
 pick(s,buried.uid);
 drain(s);
 assert.ok(has(s,0,'battle',source)&&has(s,0,'grave',victim)&&has(s,0,'hand',buried));
 assert.ok(has(s,0,'grave',unrelated)&&has(s,1,'grave',opponent));
});

test('Deathmeta does not trigger for non-Gods, opposing Gods or an EX Life replacement',()=>{
 const s=field();
 add(s,0,'battle',DEATHMETA);
 const ally=add(s,0,'battle',BASIC),enemy=add(s,1,'battle',HEAVY),buried=add(s,0,'grave',METAL);
 cast(s,MIKADOREO);
 drain(s);
 const protectedGod=s.players[0].battle.find(x=>x.cardId===MIKADOREO);
 assert.equal(e.exLifeShields(s,0,protectedGod).length,1);
 destroy(s,1,ally);
 assert.equal(s.decision,null);
 destroy(s,0,enemy);
 assert.equal(s.decision,null);
 destroy(s,1,protectedGod);
 drain(s);
 assert.ok(has(s,0,'battle',protectedGod)&&has(s,0,'grave',buried));
 assert.equal(e.exLifeShields(s,0,protectedGod).length,0);
});

for(const opponent of [KNIGHT,NIGHTMARE])test('Edgearm searches for one Cross Gear before battle with '+opponent,()=>{
 const s=field();
 const edgearm=add(s,0,'battle',EDGEARM),knight=add(s,1,'battle',opponent,{tapped:true});
 const gear=add(s,0,'deck',GEAR),other=add(s,0,'deck',BASIC);
 const library=s.players[0].deck.map(x=>x.uid);
 attack(s,edgearm.uid,knight.uid);
 act(s,'noBlock');
 assert.equal(s.decision.task.op,'g34_LookPick');
 assert.deepEqual(s.decision.choices.map(value),[gear.uid,null]);
 assert.ok(!s.log.some(x=>x.type==='battle'));
 assert.ok(has(s,0,'battle',edgearm)&&has(s,1,'battle',knight));
 const restored=JSON.parse(JSON.stringify(s));
 pick(restored,gear.uid);
 drain(restored);
 assert.ok(has(restored,0,'hand',gear)&&has(restored,0,'deck',other));
 assert.ok(restored.log.some(x=>x.type==='reveal'));
 assert.ok(restored.log.some(x=>x.type==='battle'));
 assert.notDeepEqual(restored.players[0].deck.map(x=>x.uid),library.filter(uid=>uid!==gear.uid));
 pick(s,null);
 drain(s);
 assert.ok(has(s,0,'deck',gear)&&!has(s,0,'hand',gear));
 assert.notDeepEqual(s.players[0].deck.map(x=>x.uid),library);
});

test('Edgearm can search while defending but ignores the word Knight in a card name (QA 40411)',()=>{
 const s=field(),edgearm=add(s,1,'battle',EDGEARM,{tapped:true}),knight=add(s,0,'battle','dmr13-087');
 const gear=add(s,1,'deck',GEAR);
 attack(s,knight.uid,edgearm.uid);
 act(s,'noBlock');
 assert.equal(s.decision.player,1);
 pick(s,gear.uid);
 drain(s);
 assert.ok(has(s,1,'hand',gear)&&has(s,1,'grave',edgearm));
 const t=field(),otherEdgearm=add(t,0,'battle',EDGEARM),named=add(t,1,'battle',ARAGONITE,{tapped:true});
 const unseen=add(t,0,'deck',GEAR);
 attack(t,otherEdgearm.uid,named.uid);
 act(t,'noBlock');
 drain(t);
 assert.ok(has(t,0,'deck',unseen)&&!t.log.some(x=>x.type==='look'));
});

test('Edgearm also searches during a battle caused by a spell',()=>{
 const s=field(),edgearm=add(s,0,'battle',EDGEARM),knight=add(s,1,'battle',NIGHTMARE);
 const gear=add(s,0,'deck',GEAR);
 cast(s,'dmrp19-085');
 for(const x of [edgearm,knight])pick(s,x.uid);
 assert.equal(s.decision.task.op,'g34_LookPick');
 assert.ok(!s.log.some(x=>x.type==='battle'));
 pick(s,gear.uid);
 drain(s);
 assert.ok(has(s,0,'hand',gear)&&has(s,1,'grave',knight));
});

test('Staback prevents turn-start untaps of spells and Twinpacts for both players',()=>{
 for(const who of [0,1]){
  const s=field();
  s.active=1-who;
  const source=add(s,0,'battle',STABACK);
  const spell=add(s,who,'mana',SPARK,{tapped:true}),twin=add(s,who,'mana',TWIN,{tapped:true});
  const creature=add(s,who,'mana',BASIC,{tapped:true}),hidden=add(s,who,'mana',SPARK,{tapped:true,faceDown:true});
  assert.equal(e.effectiveCard(source,s).breaker,2);
  s.phase='attack';
  act(s,'endTurn');
  drain(s);
  assert.deepEqual([spell.tapped,twin.tapped,creature.tapped,hidden.tapped],[true,true,false,false]);
 }
});

for(const untapper of [UNTAP_MANA,'dmx04-s05'])test('Staback stops the mana untap of '+untapper+' until ignored (QA 36964)',()=>{
 for(const suppressed of [false,true]){
  const s=field();
  add(s,1,'battle',STABACK,suppressed?{g35Ignored:s.turn}:{});
  const spell=add(s,0,'mana',SPARK,{tapped:true}),ordinary=add(s,0,'mana',BASIC,{tapped:true});
  cast(s,untapper);
  drain(s);
  assert.equal(spell.tapped,!suppressed);
  assert.equal(ordinary.tapped,false);
 }
});
