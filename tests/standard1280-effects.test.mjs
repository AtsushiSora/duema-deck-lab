import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const BLASTER='dm39-035',MASA='dm22rp2-013',DRIVER='dm22rp2-050',GLASSES='dm22rp2-024';
const NATURE='dm01-108',WATER='dm01-083',SEED='dmsd20-016';
const BOUNCE='dmrp20-036',SPIRAL='dm01-086';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(24).fill(NATURE));
 return s;
}
function add(s,p,zone,id,fields={}){
 const x=Object.assign(inst(id),fields);s.players[p][zone].push(x);return x;
}
function play(s,id){
 const x=add(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);return x;
}
const values=s=>s.decision.choices.map(c=>c.value);
const pick=(s,predicate)=>act(s,'extended',a=>predicate(s.decision.choices[a.choice].value));
const choose=(s,value)=>pick(s,v=>(v?.uid??v)===value);
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const GUARD='dm01-084',GEAR2='dm15-s04',WATER_SEED='dmrp21-057';
const end=s=>{s.phase='attack';act(s,'endTurn');drain(s);};

test('the five official printings preserve three definitions, their canonical IDs and images',()=>{
 const m=read('tools/support-phase-1280.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[BLASTER,MASA,DRIVER]);
 assert.equal(m.printAliases.length,2);
 for(const row of [...m.cards,...m.printAliases]){
  const {id,canonicalId=id,name,faces:[f],image}=row,c=e.card(canonicalId);
  const official={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(official,{phase:1280}),row.spec);
  const changed=structuredClone(official);changed.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(changed,{phase:1280}));
  assert.deepEqual(catalogue.resolveRows([{id,count:1}]),[{id:canonicalId,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[canonicalId]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.ok(refs.some(x=>x.id===id&&x.canonicalId===canonicalId&&x.image===image));
  if(id===canonicalId)assert.equal(CARD_IMAGES[id],image);
  const deck=structuredClone(PRESETS[0]);deck.cards[0].count--;deck.cards.push({id:canonicalId,count:1});
  assert.deepEqual(e.validateDeck(deck),[]);
 }
});

for(const blocked of [false,true])test('Glasses and Bajula distinguish creature and Blaster breaks (QA 42497) '+blocked,()=>{
 const s=field(),glasses=add(s,0,'battle',GLASSES),gear=add(s,0,'battle',GEAR2);
 const blocker=add(s,1,'battle',GUARD);
 add(s,0,'battle',NATURE);add(s,0,'battle',SEED);
 act(s,'crossGear',a=>a.uid===gear.uid&&a.target===glasses.uid);
 cast(s,BLASTER);
 assert.equal(e.power(glasses,false,s),9000);
 assert.equal(e.effectiveCard(glasses,s).extraBreak,2);
 const shields=s.players[1].shields.slice(0,3);
 attack(s,glasses.uid);choose(s,null);
 if(blocked){
  act(s,'block',a=>a.uid===blocker.uid);choose(s,shields[0].uid);
  drain(s);
  assert.ok(has(s,1,'hand',shields[0])&&!has(s,1,'mana',shields[0]));
 }else{
  act(s,'noBlock');
  act(s,'breakShields',a=>shields.every(x=>a.shields.includes(x.uid)));
  drain(s);
  assert.ok(shields.every(x=>has(s,1,'mana',x)));
 }
 assert.equal(s.players[1].brokenThisTurn,blocked?1:3);
});

test('Kakumeijin casting Blaster before breaking keeps the original two shields (QA 43803)',()=>{
 const s=field(),attacker=add(s,0,'battle','dm23rp3-OR2'),spell=add(s,0,'hand',BLASTER);
 const shields=s.players[1].shields.slice(0,2);
 attack(s,attacker.uid);if(s.decision?.type==='block')act(s,'noBlock');
 act(s,'breakShields',a=>shields.every(x=>a.shields.includes(x.uid)));
 assert.equal(s.decision.task.op,'g9Kaku');choose(s,spell.uid);
 assert.equal(e.effectiveCard(attacker,s).extraBreak,1);
 if(s.decision?.task?.op==='g9Kaku')choose(s,null);
 drain(s);
 assert.equal(s.players[1].shields.length,3);
 assert.ok(shields.every(x=>has(s,1,'hand',x)));
});

test('Blaster protects later entrants from an opponent spell and the protection expires',()=>{
 const s=field(),before=add(s,0,'battle',WATER);
 cast(s,BLASTER);const after=play(s,WATER);
 assert.deepEqual([e.power(before,false,s),e.power(after,false,s)],[5000,1000]);
 assert.equal(e.effectiveCard(after,s).extraBreak,undefined);
 const self=add(s,1,'battle',NATURE);
 s.active=1;cast(s,SPIRAL);
 assert.deepEqual(s.decision.targets.map(x=>x.uid),[self.uid]);
 act(s,'effect',a=>a.targets[0].uid===self.uid);
 s.active=0;end(s);s.phase='main';cast(s,SPIRAL);
 assert.deepEqual(new Set(s.decision.targets.map(x=>x.uid)),new Set([before.uid,after.uid]));
 assert.equal(e.power(before,false,s),1000);
});

test('a later non-Nature attacker gets the Blaster spell break when blocked',()=>{
 const s=field(),guard=add(s,1,'battle',GUARD);
 cast(s,BLASTER);
 const attacker=play(s,'dm05-049');
 assert.equal(e.effectiveCard(attacker,s).extraBreak,undefined);
 attack(s,attacker.uid);act(s,'block',a=>a.uid===guard.uid);
 const shield=s.players[1].shields[0];choose(s,shield.uid);drain(s);
 assert.ok(has(s,1,'hand',shield));
 assert.equal(s.players[1].brokenThisTurn,1);
});

test('Masaoka offers the draw for every allied attack on the opponent, including its own',()=>{
 const s=field(),masa=add(s,0,'battle',MASA),ally=add(s,0,'battle',NATURE);
 const rival=add(s,1,'battle',WATER,{tapped:true});
 attack(s,ally.uid,rival.uid);drain(s);
 assert.equal(s.players[0].hand.length,0);
 attack(s,masa.uid);assert.deepEqual(values(s),[0,1]);choose(s,1);drain(s);
 assert.equal(s.players[0].hand.length,1);
 const next=add(s,0,'battle',WATER);
 attack(s,next.uid);assert.deepEqual(values(s),[0,1]);choose(s,0);drain(s);
 assert.equal(s.players[0].hand.length,1);
});

test('Masaoka counts water Tamaseeds and protects itself only through another source',()=>{
 const s=field(),masa=add(s,0,'battle',MASA,{tapped:true});
 const ally=add(s,0,'battle',WATER,{tapped:true}),seed=add(s,0,'battle',WATER_SEED);
 add(s,0,'battle',WATER_SEED);add(s,1,'battle',WATER_SEED);
 const attacker=add(s,1,'battle',NATURE);
 const attackTargets=()=>e.getLegalActions(s).filter(x=>x.kind==='attack'&&x.uid===attacker.uid).map(x=>x.target);
 s.active=1;s.phase='attack';
 assert.ok(attackTargets().includes(ally.uid));
 const fifth=add(s,0,'battle',WATER_SEED);
 assert.ok(!attackTargets().includes(ally.uid)&&attackTargets().includes(masa.uid));
 s.phase='main';cast(s,BOUNCE);assert.deepEqual(values(s).map(x=>x.uid),[masa.uid]);
 choose(s,masa.uid);drain(s);
 assert.ok(has(s,0,'hand',masa)&&has(s,0,'battle',seed)&&has(s,0,'battle',fifth));
});

test('Masaoka’s protection excludes its own Tamaseeds from explicit choices on both sides',()=>{
 for(const player of [0,1]){
  const s=field(player),masa=add(s,0,'battle',MASA);
  const allies=[add(s,0,'battle',WATER),...Array.from({length:3},()=>add(s,0,'battle',WATER_SEED))];
  const rivalSeed=add(s,1,'battle',WATER_SEED);
  const flame=play(s,'dmrp22-070');
  const selectable=player===0?[rivalSeed.uid]:[rivalSeed.uid,flame.uid];
  assert.deepEqual(new Set(values(s).map(x=>x.uid)),new Set(selectable));
  choose(s,rivalSeed.uid);
  assert.ok(has(s,0,'battle',masa)&&allies.every(x=>has(s,0,'battle',x)));
  assert.ok(has(s,1,'grave',rivalSeed));
 }
});

test('Driver mills two and reserves its optional replacement once in a simultaneous departure',()=>{
 const s=field(),first=add(s,0,'battle',WATER),second=add(s,0,'battle',NATURE);
 const top=s.players[0].deck.slice(0,2);
 const driver=play(s,DRIVER);
 assert.ok(top.every(x=>has(s,0,'grave',x)));
 for(let i=0;i<4;i++)add(s,1,'battle',WATER);
 s.active=1;cast(s,'dm14-015');
 assert.equal(s.decision.uid,first.uid);
 act(s,'replaceYamata',a=>a.cardId===DRIVER);
 drain(s);
 assert.ok(has(s,0,'mana',first)&&first.tapped&&has(s,0,'grave',second));
 assert.ok(has(s,0,'battle',driver));
 const third=add(s,0,'battle',WATER);
 s.phase='main';cast(s,BOUNCE);choose(s,third.uid);drain(s);
 assert.ok(has(s,0,'hand',third));
 end(s);s.phase='main';
 const fourth=add(s,0,'battle',NATURE);
 cast(s,SPIRAL);act(s,'effect',a=>a.targets[0].uid===fourth.uid);
 act(s,'replaceYamata',a=>a.cardId===DRIVER);
 assert.ok(has(s,0,'mana',fourth)&&fourth.tapped);
});

test('Driver can decline the first leave and choose between EX Life and tapped mana on the next leave',()=>{
 const s=field(),first=add(s,0,'battle',WATER),driver=play(s,DRIVER);
 const shield=s.players[0].shields[0];
 const host=add(s,0,'battle','dm22ex1-057',{exLifeShieldUid:shield.uid});
 s.active=1;cast(s,BOUNCE);choose(s,first.uid);act(s,'allowLeave');drain(s);
 s.phase='main';cast(s,BOUNCE);choose(s,host.uid);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='replaceEx'));
 act(s,'replaceYamata',a=>a.cardId===driver.cardId);drain(s);
 assert.ok(has(s,0,'hand',first)&&has(s,0,'mana',host)&&host.tapped&&has(s,0,'shields',shield));
});

test('Driver puts a creature in tapped mana before Ningyo can replace that movement',()=>{
 const s=field(),creature=add(s,0,'battle',WATER);
 play(s,DRIVER);
 add(s,1,'battle','dmrp22-033');
 cast(s,SPIRAL);act(s,'effect',a=>a.targets[0].uid===creature.uid);
 act(s,'replaceYamata',a=>a.cardId===DRIVER);drain(s);
 assert.ok(has(s,0,'mana',creature)&&creature.tapped);
});

test('Driver sends just the selected part of a linked God to tapped mana',()=>{
 const s=field(),metal=add(s,0,'battle','dmex17-059');
 const heavy=play(s,'dmex17-033');
 choose(s,metal.uid);choose(s,null);drain(s);
 assert.deepEqual(metal.godLinks.map(x=>x.uid),[heavy.uid]);
 play(s,DRIVER);
 s.active=1;cast(s,SPIRAL);act(s,'effect',a=>a.targets[0].uid===metal.uid);
 act(s,'replaceYamata',a=>a.cardId===DRIVER);
 act(s,'godLeave',a=>a.uid===heavy.uid);drain(s);
 assert.ok(has(s,0,'mana',heavy)&&heavy.tapped&&has(s,0,'battle',metal));
 assert.equal(metal.godLinks,undefined);
});
