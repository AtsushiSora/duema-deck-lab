import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const UN='dm29-026',GIRL='dm23-045',IZA='dm30-049';
const LAND='dm01-108',WATER='dm01-083',FIRE='dm01-097',BLOCK='dm01-076';
const DRAKE='dm19-089',SPIRIT='dm21-046',GEAR='dm14-110',GEAR2='dm23ex1-058';
const LOCK='dm25rp2-022',QX='dm25ex1-049',DEMON='dm01-027',BOUNCE='dm01-086';
const pick=(s,v)=>act(s,'extended',a=>{
 const value=s.decision.choices[a.choice].value;
 return (value?.uid??value)===v;
});
function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(12).fill(LAND));
 return s;
}
function put(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&!a.alternative);
 return x;
}

test('Phase 852 preserves the three official original IDs and recognizes complete text',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-852.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[UN,GIRL,IZA]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(row.faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:852}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:851}));
  const unknown=structuredClone(d);
  unknown.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:852}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,c.civilizations,c.limit],
   [f.name,'creature',f.cost,Number(f.powerText),f.race,f.civilizations,4]);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);
  assert.deepEqual(registry.resolveRows([{id:row.id,count:4}]),[{id:row.id,count:4}]);
 }
});

for(const accept of [false,true])test('Unryu offers deployment and untapping together '+accept,()=>{
 let s=field(),attacker=put(s,0,'battle',UN);
 give(s,0,'deck',[GEAR,LAND,FIRE]);
 const [gear,next]=s.players[0].deck,rng=s.rng;
 attack(s,attacker.uid);
 assert.deepEqual(s.decision.task.g585Peek.map(x=>x.id),[GEAR]);
 assert.ok(!s.log.some(x=>x.type==='reveal'||x.cardId===GEAR));
 assert.equal(attacker.tapped,true);
 s=structuredClone(s);
 pick(s,accept?true:null);
 assert.equal(s.players[0].battle.find(x=>x.uid===attacker.uid).tapped,!accept);
 assert.equal(s.players[0].battle.some(x=>x.uid===gear.uid),accept);
 assert.equal(s.players[0].deck[0].uid,accept?next.uid:gear.uid);
 assert.equal(s.rng,rng);
 assert.equal(s.decision.type,'block');
});

for(const [top,gate] of [[LAND,null],[GEAR,LOCK],[GEAR,QX]])test('Unryu cannot deploy or untap through an unavailable top '+top+'/'+gate,()=>{
 const s=field(),attacker=put(s,0,'battle',UN);
 if(gate)put(s,1,'battle',gate);
 give(s,0,'deck',[top,FIRE,LAND]);
 const [first]=s.players[0].deck;
 attack(s,attacker.uid);
 if(gate!==QX){
  assert.equal(s.decision.task.op,'g34_PeekRead585');
  assert.deepEqual(s.decision.task.g585Peek.map(x=>x.id),[top]);
  pick(s,null);
 }
 assert.equal(s.decision.type,'block');
 assert.equal(attacker.tapped,true);
 assert.equal(s.players[0].deck[0],first);
});

for(const [id,creatureAttack] of [[DRAKE,false],[SPIRIT,true],[GIRL,true]])test('Girlipay sees qualifying unblocked attacks before battle or shield break '+id,()=>{
 const s=field();
 const attacker=put(s,0,'battle',id);
 if(id!==GIRL)put(s,0,'battle',GIRL);
 const target=creatureAttack?put(s,1,'battle',WATER,{tapped:true}):null;
 const kept=put(s,1,'hand',WATER),lost=put(s,1,'hand',LAND);
 attack(s,attacker.uid,target?.uid??'player');
 act(s,'noBlock');
 assert.equal(s.decision.player,1);
 assert.equal(s.decision.source,GIRL);
 assert.ok(!s.log.some(x=>x.type==='battle'));
 pick(s,lost.uid);
 assert.deepEqual(s.players[1].grave.filter(x=>x===lost),[lost]);
 assert.ok(s.players[1].hand.includes(kept));
 if(target)assert.ok(s.players[1].grave.includes(target));
 else assert.equal(s.players[1].shields.length,4);
});

for(const mode of ['blocked','wrong race','ignored'])test('Girlipay does not trigger if '+mode,()=>{
 const s=field(),attacker=put(s,0,'battle',mode==='wrong race'?LAND:DRAKE);
 put(s,0,'battle',GIRL,mode==='ignored'?{g35Ignored:s.turn}:{});
 const hand=put(s,1,'hand',LAND);
 if(mode==='blocked')put(s,1,'battle',BLOCK);
 attack(s,attacker.uid);
 act(s,mode==='blocked'?'block':'noBlock');
 assert.ok(s.players[1].hand.includes(hand));
 assert.ok(!s.players[1].grave.includes(hand));
 assert.ok(s.decision?.source!==GIRL);
});

for(const take of [false,true])test('Izayoi searches its full library on destruction and then shuffles '+take,()=>{
 let s=field(1),source=put(s,0,'battle',IZA);
 give(s,0,'deck',[LAND,GEAR,WATER,GEAR2,FIRE]);
 const [land,gear,water,selected,fire]=s.players[0].deck,rng=s.rng;
 play(s,DEMON);
 act(s,'effect',a=>a.targets.some(x=>x.uid===source.uid));
 assert.ok(s.players[0].grave.includes(source));
 assert.equal(s.decision.player,0);
 assert.deepEqual(s.decision.task.g585Peek.map(x=>x.id),[LAND,GEAR,WATER,GEAR2,FIRE]);
 assert.deepEqual(s.decision.choices.map(c=>c.value?.uid??c.value),[gear.uid,selected.uid,null]);
 assert.ok(!s.log.some(x=>x.type==='reveal'||x.cardId===GEAR));
 s=structuredClone(s);
 pick(s,take?selected.uid:null);
 assert.equal(s.players[0].battle.some(x=>x.uid===selected.uid),take);
 assert.deepEqual(s.players[0].deck.map(x=>x.uid).sort(),
  [land,gear,water,...(take?[]:[selected]),fire].map(x=>x.uid).sort());
 assert.notEqual(s.rng,rng);
 assert.deepEqual(s.players[0].g34Protected,[]);
 assert.equal(s.decision,null);
});

test('Izayoi does not search when moved to hand and does not see through a deck lock',()=>{
 for(const id of [BOUNCE,DEMON]){
  const s=field(1),source=put(s,0,'battle',IZA);
  if(id===DEMON)put(s,1,'battle',QX);
  give(s,0,'deck',[LAND,GEAR,WATER]);
  const before=[...s.players[0].deck],rng=s.rng;
  play(s,id);
  act(s,'effect',a=>a.targets.some(x=>x.uid===source.uid));
  assert.equal(s.decision,null);
  assert.deepEqual(s.players[0].deck,before);
  assert.equal(s.rng,rng);
  assert.ok(s.players[0][id===DEMON?'grave':'hand'].includes(source));
 }
});
