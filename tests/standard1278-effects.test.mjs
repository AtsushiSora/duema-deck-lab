import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const ALDORA='dm32-s02',CLAW='dmrp16-071',BOARD='dm22rp2-022',GEAR='dm14-046';
const LIGHT='dm01-075',WATER='dm01-083',NATURE='dm01-108',HEAVY='dm01-s06';
const BOUNCE='dmrp20-036',GUARD='dm01-084',MELANIYA='dm14-002';
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
function pick(s,uid){
 act(s,'extended',a=>s.decision.choices[a.choice].value?.uid===uid);
}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const blocker=(s,x)=>!!e.effectiveCard(x,s).blocker;
function attacks(s,x,target){
 s.phase='attack';
 return e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target===target);
}
const endTurn=s=>{s.phase='attack';act(s,'endTurn');drain(s);};

test('four card definitions preserve all eight official print IDs, images and full rules',()=>{
 const m=read('tools/support-phase-1278.json'), refs=read('tools/image-reference-prints.json').prints;
 const catalog=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[ALDORA,CLAW,BOARD,GEAR]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[
  ['dmc64-005',ALDORA],['dmc68-s02',ALDORA],['dmx19-s04',ALDORA],['dm22rp2x-022',BOARD]
 ]);
 for(const row of [...m.cards,...m.printAliases]){
  const {id,name,faces:[f],image,canonicalId=id}=row,c=e.card(canonicalId);
  const official={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(official,{phase:1278}),row.spec);
  const altered=structuredClone(official);altered.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(altered,{phase:1278}));
  assert.deepEqual(catalog.resolveRows([{id,count:1}]),[{id:canonicalId,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[canonicalId]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.ok(refs.some(ref=>ref.id===id&&ref.canonicalId===canonicalId&&ref.image===image));
  if(id===canonicalId)assert.equal(CARD_IMAGES[id],image);
  const deck=structuredClone(PRESETS[0]);deck.cards[0].count--;deck.cards.push({id:canonicalId,count:1});
  assert.deepEqual(e.validateDeck(deck),[]);
 }
});

test('Aldora can attack a creature and block before a Blocker enters (QA 35806)',()=>{
 const s=field(),aldora=add(s,0,'battle',ALDORA);
 const rival=add(s,1,'battle',WATER,{tapped:true});
 assert.equal(attacks(s,aldora,'player'),false);
 assert.equal(attacks(s,aldora,rival.uid),true);
 s.active=1;rival.tapped=false;
 attack(s,rival.uid);act(s,'block',a=>a.uid===aldora.uid);drain(s);
 assert.ok(aldora.tapped&&has(s,1,'grave',rival));
});

test('Aldora needs its own turn entry event and keeps it after the new Blocker leaves',()=>{
 let s=field(1);
 const aldora=add(s,0,'battle',ALDORA);
 play(s,GUARD);endTurn(s);assert.equal(s.active,0);
 assert.equal(attacks(s,aldora,'player'),false);
 s.phase='main';play(s,WATER);
 assert.equal(attacks(s,aldora,'player'),false);
 s.phase='main';const guard=play(s,GUARD);
 assert.equal(attacks(s,aldora,'player'),true);
 s.phase='main';cast(s,'dm01-086');act(s,'effect',a=>a.targets[0].uid===guard.uid);
 assert.ok(has(s,0,'hand',guard));
 s=JSON.parse(JSON.stringify(s));
 assert.equal(attacks(s,aldora,'player'),true);
 attack(s,aldora.uid);if(s.decision?.type==='block')act(s,'noBlock');drain(s);
 assert.equal(s.players[1].shields.length,2);
 endTurn(s);endTurn(s);
 assert.equal(attacks(s,aldora,'player'),false);
});

test('Aldora sees a Blocker entering with an aura and does not count a later cross',()=>{
 const s=field(),aldora=add(s,0,'battle',ALDORA),other=play(s,WATER),gear=play(s,GEAR);
 assert.equal(attacks(s,aldora,'player'),false);
 s.phase='main';act(s,'crossGear',a=>a.uid===gear.uid&&a.target===other.uid);
 assert.ok(blocker(s,other));assert.equal(attacks(s,aldora,'player'),false);
 s.phase='main';give(s,0,'shields',[]);add(s,0,'battle',MELANIYA);
 const fresh=play(s,WATER);
 assert.ok(blocker(s,fresh));assert.equal(attacks(s,aldora,'player'),true);
});

test('Aldora’s own entry qualifies while summoning sickness still applies',()=>{
 const s=field(),prior=add(s,0,'battle',ALDORA),fresh=play(s,ALDORA);
 assert.equal(attacks(s,prior,'player'),true);
 assert.equal(attacks(s,fresh,'player'),false);
});

test('Claw grants itself a Blocker with an allied Light creature and destroys its larger rival with Slayer',()=>{
 const s=field(1),claw=add(s,0,'battle',CLAW),enemy=add(s,1,'battle',HEAVY);
 add(s,1,'battle',LIGHT);
 assert.ok(!blocker(s,claw)&&e.effectiveCard(claw,s).slayer);
 add(s,0,'battle',LIGHT);
 assert.ok(blocker(s,claw));
 attack(s,enemy.uid);act(s,'block',a=>a.uid===claw.uid);drain(s);
 assert.ok(has(s,0,'grave',claw)&&has(s,1,'grave',enemy));
});

test('Claw loses Blocker when its last allied Light creature leaves',()=>{
 const s=field(1),claw=add(s,0,'battle',CLAW),light=add(s,0,'battle',LIGHT);
 assert.ok(blocker(s,claw));
 cast(s,BOUNCE);pick(s,light.uid);
 assert.ok(has(s,0,'hand',light)&&!blocker(s,claw)&&e.effectiveCard(claw,s).slayer);
});

test('Board immediately Mach Fights and grants both keywords and power to another creature',()=>{
 const s=field(),fresh=play(s,NATURE),board=play(s,BOARD);
 const victim=add(s,1,'battle',WATER),later=add(s,1,'battle',WATER);
 assert.equal(e.effectiveCard(board,s).breaker,2);
 assert.equal(attacks(s,board,'player'),false);
 assert.equal(attacks(s,fresh,later.uid),false);
 attack(s,board.uid,victim.uid);
 assert.deepEqual(s.decision.choices.map(c=>c.value?.uid),[fresh.uid]);
 pick(s,fresh.uid);drain(s);
 assert.ok(has(s,1,'grave',victim));
 assert.equal(e.power(fresh,false,s),8000);
 assert.equal(e.effectiveCard(fresh,s).breaker,2);
 assert.equal(attacks(s,fresh,'player'),false);
 attack(s,fresh.uid,later.uid);drain(s);
 assert.ok(has(s,1,'grave',later));
 endTurn(s);
 assert.equal(e.power(fresh,false,s),2000);
 assert.ok(!e.effectiveCard(fresh,s).machFighter&&!e.effectiveCard(fresh,s).poweredBreaker);
});

test('Board keeps its W Breaker and gives a second Board a choice of two or three shields (QA 31924)',()=>{
 const s=field(),first=add(s,0,'battle',BOARD),second=add(s,0,'battle',BOARD);
 attack(s,first.uid);pick(s,second.uid);drain(s);
 assert.equal(s.players[1].shields.length,3);
 assert.equal(e.power(second,false,s),12000);
 assert.deepEqual(e.effectiveCard(second,s).g633BreakerChoices,[2,3]);
 attack(s,second.uid);pick(s,first.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 assert.deepEqual(s.decision.choices.map(c=>c.value),[2,3]);
 act(s,'extended',a=>s.decision.choices[a.choice].value===2);
 act(s,'breakShields',a=>a.shields.length===2);drain(s);
 assert.equal(s.players[1].shields.length,1);
});

test('Board resolves the attack even when there is no other allied creature',()=>{
 const s=field(),board=add(s,0,'battle',BOARD);
 attack(s,board.uid);drain(s);
 assert.equal(s.players[1].shields.length,3);
 assert.equal(e.power(board,false,s),6000);
});

test('Shining Defense grants power and Blocker only to its paid cross target and remains after the host leaves',()=>{
 const s=field(),a=add(s,0,'battle',WATER),b=add(s,0,'battle',NATURE),gear=play(s,GEAR);
 const mana=()=>s.players[0].mana.filter(x=>x.tapped).length;
 assert.equal(mana(),1);
 assert.equal(e.power(a,false,s),1000);assert.ok(!blocker(s,a)&&!blocker(s,b));
 act(s,'crossGear',x=>x.uid===gear.uid&&x.target===a.uid);
 assert.equal(mana(),2);
 assert.equal(e.power(a,false,s),2500);assert.ok(blocker(s,a)&&!blocker(s,b));
 act(s,'crossGear',x=>x.uid===gear.uid&&x.target===b.uid);
 assert.equal(mana(),3);
 assert.equal(e.power(a,false,s),1000);assert.equal(e.power(b,false,s),3500);
 assert.ok(!blocker(s,a)&&blocker(s,b));
 s.active=1;cast(s,BOUNCE);pick(s,b.uid);
 assert.ok(has(s,0,'hand',b)&&has(s,0,'battle',gear));assert.equal(gear.crossedTo,undefined);
});

test('Five Star Blaster records power at resolution and keeps the grant after recrossing (QA 34925)',()=>{
 const s=field(),a=add(s,0,'battle',WATER),b=add(s,0,'battle','dm01-103');
 const first=add(s,1,'battle',HEAVY,{tapped:true}),second=add(s,1,'battle',HEAVY,{tapped:true});
 const gear=play(s,GEAR);
 assert.equal(e.power(b,false,s),3000);
 act(s,'crossGear',x=>x.uid===gear.uid&&x.target===a.uid);
 cast(s,'dm39-023');
 act(s,'crossGear',x=>x.uid===gear.uid&&x.target===b.uid);
 assert.equal(e.power(a,false,s),1000);assert.equal(e.power(b,false,s),4500);
 attack(s,a.uid,first.uid);if(s.decision?.type==='block')act(s,'noBlock');drain(s);
 assert.ok(has(s,0,'battle',a)&&has(s,1,'grave',first));
 attack(s,b.uid,second.uid);if(s.decision?.type==='block')act(s,'noBlock');drain(s);
 assert.ok(has(s,0,'grave',b)&&has(s,1,'battle',second));
});
