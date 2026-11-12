import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const LOCK='dmr17-s08',PRISON='dmx11-020',OVI='dmrp03-014';
const LIGHT='dm01-075',WATER='dm01-083',DARK='dm01-090',FIRE='dm01-097',GREEN='dm01-108';
const MULTI='dm23bd5-003',COURTNEY='dm13-015',DEMON='dmr07-036';
const SEED='dm22ex1-086',ONIKAMASU='dmrp01-041';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>decodeBattleData(encodeBattleData(s));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const choices=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>choices(s)[a.choice]===v);
const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);
const live=(s,p,z,x)=>s.players[p][z].find(y=>y.uid===x.uid);
const frozen=(s,p,z,x)=>e.skipsStartUntap(s,live(s,p,z,x));

function add(s,p,z,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][z].push(x);
 return x;
}
function field(){
 const s=setup();
 for(const p of [0,1]){
  give(s,p,'deck',Array(12).fill(GREEN));
  give(s,p,'grave',[]);
 }
 return s;
}
function end(s){
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
}
function breakShield(s,x,shield){
 attack(s,x.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields',a=>a.shields.includes(shield.uid));
}

test('The three canonical IDs and all three alternate prints retain their official stats, limits and images',()=>{
 const m=read('tools/support-phase-1054.json'),cat=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(x=>x.id),[LOCK,PRISON,OVI]);
 assert.deepEqual(m.printAliases.map(x=>x.id),['dm24bd1-007','dm23ex2-ChoG006','dmart06-004']);
 const printIds=[LOCK,...m.printAliases.map(x=>x.id)];
 assert.deepEqual(cat.resolveRows(printIds.map(id=>({id,count:1}))),[{id:LOCK,count:4}]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0],base=m.cards.find(x=>x.id===id);
  assert.equal(cat.get(row.id).id,id);
  assert.ok(cat.get(row.id).supported&&row.verification.facesMatched);
  assert.deepEqual([c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,m.regulationVerification.limits[row.id]]);
  assert.equal(c.limit,id===LOCK?1:4);
  assert.equal(CARD_IMAGES[id],base.image);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1054}),base.spec);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
 }
});

test('Mana Lock uses distinct physical cards and keeps the maximum number of civilization choices',()=>{
 let s=field();
 give(s,1,'mana',[]);
 const dragon=add(s,0,'hand',LOCK),light=add(s,1,'mana',LIGHT),multi=add(s,1,'mana',MULTI,{tapped:true});
 const fire=add(s,1,'mana',FIRE),green=add(s,1,'mana',GREEN);
 const hidden=add(s,1,'mana',WATER,{faceDown:true}),unused=add(s,1,'mana',GREEN,{tapped:true});
 const all=physical(s);
 play(s,dragon);
 assert.deepEqual(choices(s),[light.uid]);
 pick(s,light.uid);
 assert.ok(!live(s,1,'mana',light).tapped);
 s=restore(s);
 assert.deepEqual(choices(s),[multi.uid]);
 pick(s,multi.uid);
 pick(s,fire.uid);
 pick(s,green.uid);
 assert.ok([light,multi,fire,green].every(x=>live(s,1,'mana',x).tapped&&frozen(s,1,'mana',x)));
 assert.ok(!live(s,1,'mana',hidden).tapped&&!frozen(s,1,'mana',unused));
 assert.deepEqual(physical(s),all);
 end(s);
 assert.ok([light,multi,fire,green].every(x=>live(s,1,'mana',x).tapped&&!frozen(s,1,'mana',x)));
 assert.ok(!live(s,1,'mana',unused).tapped);
 end(s);
 end(s);
 assert.ok(s.players[1].mana.every(x=>!x.tapped));
});

test('Mana Lock triggers again before an attack and can mark an already tapped mana card',()=>{
 const s=field(),dragon=add(s,0,'battle',LOCK);
 give(s,1,'mana',[]);
 const tapped=add(s,1,'mana',WATER,{tapped:true}),other=add(s,1,'mana',WATER);
 attack(s,dragon.uid);
 assert.deepEqual(choices(s),[tapped.uid,other.uid]);
 pick(s,tapped.uid);
 assert.ok(frozen(s,1,'mana',tapped)&&!other.tapped);
 drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('All-civilization effects make face-down mana eligible without revealing printed cards',()=>{
 const s=field(),dragon=add(s,0,'hand',LOCK);
 add(s,1,'battle',COURTNEY);
 give(s,1,'mana',[]);
 const hidden=add(s,1,'mana',WATER,{faceDown:true}),other=add(s,1,'mana',GREEN);
 play(s,dragon);
 const option=s.decision.choices.find(x=>x.value===hidden.uid);
 assert.match(option.label,/^裏向きのマナ/);
 assert.equal(option.cardId,undefined);
 pick(s,hidden.uid);
 pick(s,other.uid);
 assert.ok(hidden.tapped&&other.tapped&&frozen(s,1,'mana',hidden)&&frozen(s,1,'mana',other));
});

test('Prison Spark taps and locks enemy creatures when cast on its caster’s turn',()=>{
 const s=field(),spell=add(s,0,'hand',PRISON);
 const target=add(s,1,'battle',ONIKAMASU),already=add(s,1,'battle',WATER,{tapped:true}),seed=add(s,1,'battle',SEED);
 play(s,spell);
 assert.ok([target,already].every(x=>x.tapped&&frozen(s,1,'battle',x)));
 assert.ok(!seed.tapped&&!frozen(s,1,'battle',seed));
 end(s);
 assert.ok(target.tapped&&already.tapped);
});

for(const hasDemon of [true,false])test('Prison Spark Shield Trigger condition and other-turn effect: '+hasDemon,()=>{
 const s=field(),attacker=add(s,0,'battle',FIRE),target=add(s,0,'battle',WATER);
 add(s,1,'battle',hasDemon?DEMON:LIGHT);
 add(s,0,'battle',DEMON);
 give(s,1,'shields',[PRISON]);
 const shield=s.players[1].shields[0];
 breakShield(s,attacker,shield);
 assert.equal(e.getLegalActions(s).some(a=>a.kind==='useTrigger'&&a.uid===shield.uid),hasDemon);
 if(hasDemon){
  act(s,'useTrigger',a=>a.uid===shield.uid);
  assert.ok(target.tapped&&!frozen(s,0,'battle',target)&&live(s,1,'grave',shield));
 }else assert.ok(!target.tapped&&live(s,1,'hand',shield));
});

for(const last of [true,false])test('Ovidence locks every enemy only when used on the last shield: '+last,()=>{
 let s=field();
 const attacker=add(s,0,'battle',FIRE),a=add(s,0,'battle',WATER),b=add(s,0,'battle',GREEN);
 const safe=add(s,0,'battle',ONIKAMASU),seed=add(s,0,'battle',SEED);
 give(s,1,'shields',last?[OVI]:[OVI,GREEN]);
 const shield=s.players[1].shields[0],all=physical(s);
 breakShield(s,attacker,shield);
 act(s,'useTrigger',x=>x.uid===shield.uid);
 assert.deepEqual(new Set(choices(s)),new Set([attacker.uid,a.uid,b.uid]));
 pick(s,attacker.uid);
 s=restore(s);
 pick(s,a.uid);
 pick(s,b.uid);
 assert.ok([attacker,a,b].every(x=>live(s,0,'battle',x).tapped));
 assert.ok(!live(s,0,'battle',safe).tapped&&!frozen(s,0,'battle',seed));
 for(const x of [attacker,a,b,safe])assert.equal(frozen(s,0,'battle',x),last);
 assert.ok(live(s,1,'grave',shield));
 assert.deepEqual(physical(s),all);
});

test('Ovidence cast from hand with no shields taps the available targets and receives no Super bonus',()=>{
 const s=field(),spell=add(s,0,'hand',OVI),target=add(s,1,'battle',WATER);
 s.players[0].shields=[];
 play(s,spell);
 assert.deepEqual(choices(s),[target.uid]);
 pick(s,target.uid);
 assert.ok(target.tapped&&!frozen(s,1,'battle',target));
});
