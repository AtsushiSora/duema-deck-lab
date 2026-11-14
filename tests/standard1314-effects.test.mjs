import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,cast,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';

const GALATIA='dm37-013',GAWARA='dmsd15-005',DOBEL='dm37-045';
const BASIC='dm01-108',VEHICLE='dm01-083',SHROUDED='dmrp01-041',ONI_CLOCK='dmex10-024';
const Z_FULL='dmx10-007',Z_TWIN='dm23rp1-S3',BOUNCE='dm01-086';
const BATTLE_TO_BOTTOM='dmrp07-057';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
const value=c=>c.value?.uid??c.value;
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
function field(){
 const s=setup();
 s.active=0;
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(BASIC));
 return s;
}
function add(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const inZone=(s,p,zone,x)=>s.players[p][zone].find(y=>y.uid===x.uid);
const block=(s,x)=>act(s,'block',a=>a.uid===x.uid);
function bounce(s,x){
 cast(s,BOUNCE);
 act(s,'effect',a=>a.targets[0].uid===x.uid);
}

test('three verified prints map to their original playable IDs and names',()=>{
 const m=read('tools/support-phase-1314.json'),registry=createCatalogue(snapshot,data.cards,details);
 const {prints}=read('tools/image-reference-prints.json');
 assert.deepEqual(m.cards.map(c=>c.id),[GALATIA,GAWARA,DOBEL]);
 assert.deepEqual(m.printAliases,[]);
 for(const {id,name,image,source,faces,spec} of m.cards){
  const c=e.card(id),f=faces[0];
  assert.deepEqual(standardCardSpec({id,name,faces,status:'complete'},{phase:1314}),spec);
  assert.deepEqual(prints.find(x=>x.id===id),{id,canonicalId:id,name,image,source});
  assert.deepEqual(registry.resolveRows([{id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.limit,e.manaValue(c)],
   [f.cost,Number(f.powerText),f.race,f.civilizations,4,1]);
  for(const [key,v] of Object.entries(spec))assert.deepEqual(c[key],v);
  assert.equal(CARD_IMAGES[id],image);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id,count:1});
  assert.deepEqual(e.validateDeck({...deck,cards:registry.resolveRows(deck.cards)}),[]);
 }
});

test('Galatia may lower a different opponent creature and its attacker continues to battle',()=>{
 const s=field(),attacker=add(s,0,'battle',BASIC),victim=add(s,0,'battle',VEHICLE);
 const shrouded=add(s,0,'battle',SHROUDED),galatia=add(s,1,'battle',GALATIA);
 attack(s,attacker.uid);
 block(s,galatia);
 assert.equal(s.decision.player,1);
 assert.deepEqual(s.decision.choices.map(value),[0,1]);
 pick(s,0);
 assert.ok(!s.decision.choices.some(c=>value(c)===shrouded.uid));
 pick(s,victim.uid);
 drain(s);
 assert.ok(inZone(s,0,'grave',victim));
 assert.ok(inZone(s,0,'battle',attacker));
 assert.ok(inZone(s,1,'grave',galatia));
});

test('Galatia can lower the blocked unselectable attacker by 2000 before battle',()=>{
 let s=field();
 const attacker=add(s,0,'battle',SHROUDED),galatia=add(s,1,'battle',GALATIA);
 attack(s,attacker.uid);
 block(s,galatia);
 s=JSON.parse(JSON.stringify(s));
 pick(s,1);
 drain(s);
 assert.ok(inZone(s,0,'grave',attacker));
 assert.ok(inZone(s,1,'battle',galatia)?.tapped);
 assert.equal(s.players[1].shields.length,5);
});

test('Galatia and Dobel cannot attack, including during Oni Time',()=>{
 const s=field(),galatia=add(s,0,'battle',GALATIA),dobel=add(s,0,'battle',DOBEL);
 s.players[0].shields.length=3;
 s.players[1].shields.length=3;
 s.phase='attack';
 assert.ok(e.getLegalActions(s).every(a=>a.kind!=='attack'||![galatia.uid,dobel.uid].includes(a.uid)));
});

test('Gawara can attack at six shields or with Oni Clock, but cannot attack at seven shields',()=>{
 const s=field(),gawara=add(s,0,'battle',GAWARA);
 s.players[0].shields.length=3;
 s.players[1].shields.length=4;
 const canAttack=()=>{
  s.phase='attack';
  return e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===gawara.uid);
 };
 assert.equal(canAttack(),false);
 s.players[1].shields.pop();
 s.players[1].shields[0].shieldStack=[inst(BASIC)];
 assert.equal(canAttack(),true);
 s.players[1].shields.push(inst(BASIC));
 s.phase='main';
 cast(s,ONI_CLOCK);
 drain(s);
 assert.equal(canAttack(),true);
});

for(const [attackerId,attackerDies] of [[BASIC,false],[VEHICLE,true]])test('Gawara returns tapped after a battle loss against '+attackerId,()=>{
 const s=field(),attacker=add(s,0,'battle',attackerId);
 const gawara=add(s,1,'battle',GAWARA,{incarnation:2,zoneSerial:3});
 const graveCopy=add(s,1,'grave',GAWARA);
 attack(s,attacker.uid);
 block(s,gawara);
 drain(s);
 const returned=inZone(s,1,'battle',gawara);
 assert.ok(returned?.tapped);
 assert.equal(returned.incarnation,3);
 assert.ok(inZone(s,1,'grave',graveCopy));
 assert.equal(!!inZone(s,0,'grave',attacker),attackerDies);
});

test('Gawara has no loss trigger when removed by an unrelated spell',()=>{
 const s=field(),gawara=add(s,1,'battle',GAWARA);
 bounce(s,gawara);
 drain(s);
 assert.ok(inZone(s,1,'hand',gawara));
 assert.equal(inZone(s,1,'battle',gawara),undefined);
});

test('Gawara stays in the library when a battle loss sends it to the bottom',()=>{
 const s=field(),attacker=add(s,0,'battle',BATTLE_TO_BOTTOM),gawara=add(s,1,'battle',GAWARA);
 attack(s,attacker.uid);
 block(s,gawara);
 drain(s);
 assert.equal(s.players[1].deck.at(-1).uid,gawara.uid);
 assert.equal(inZone(s,1,'battle',gawara),undefined);
});

for(const accept of [true,false])test('Dobel decides whether to reveal after an opposing creature leaves on its turn '+accept,()=>{
 const s=field();
 add(s,0,'battle',DOBEL);
 const victim=add(s,1,'battle',BASIC);
 give(s,0,'deck',[Z_FULL,Z_TWIN,BASIC,BASIC,BASIC]);
 const [chosen,unchosen,nonmatch]=s.players[0].deck;
 bounce(s,victim);
 assert.ok(inZone(s,1,'hand',victim));
 assert.equal(s.decision?.task?.source,DOBEL);
 pick(s,accept?true:null);
 if(!accept){
  assert.deepEqual(s.players[0].deck.slice(0,3),[chosen,unchosen,nonmatch]);
  return;
 }
 assert.ok(s.decision.choices.some(c=>value(c)===unchosen.uid));
 assert.ok(s.decision.choices.every(c=>value(c)!==nonmatch.uid));
 const reveal=s.log.find(l=>l.type==='reveal'&&l.cardId===DOBEL);
 assert.ok([chosen,unchosen,nonmatch].every(x=>reveal?.text.includes(e.card(x).name)));
 pick(s,chosen.uid);
 pick(s,null);
 drain(s);
 assert.ok(inZone(s,0,'hand',chosen));
 assert.ok(inZone(s,0,'grave',unchosen));
 assert.ok(inZone(s,0,'grave',nonmatch));
});

test('Dobel cannot reveal for an opponent leaving during the opponent’s turn',()=>{
 const s=field();
 add(s,0,'battle',DOBEL);
 const theirCreature=add(s,1,'battle',BASIC);
 s.active=1;
 bounce(s,theirCreature);
 assert.ok(inZone(s,1,'hand',theirCreature));
 assert.equal(s.decision,null);
});
