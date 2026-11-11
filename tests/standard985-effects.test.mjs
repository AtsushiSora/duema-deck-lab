import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const LINK='dmr16s-029',GOLD='dmr16g-038',HEAT='dmr16s-054',VAL='dmr16s-002',JET='dmr16g-028';
const NATURE='dm01-108',FIRE='dm01-097',WATER='dm01-083',HOLY='dm01-015',TWIN='dm22ex1-074';
const BELL='dmr16g-016',GENMU='dmrp15-km1',GAGA='dmx05-s01',FRANZ='dm28-082',SEED='dm22ex1-086';
const DRAGON_RACE='ガイアール・コマンド・ドラゴン';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const value=c=>c.value?.uid??c.value;
const choices=s=>s.decision.choices.map(value);
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);

function field(){
 const s=setup();
 for(const p of [0,1]){give(s,p,'deck',Array(20).fill(NATURE));give(s,p,'grave',[]);}
 return s;
}

function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}

function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}

test('Phase 985 registers five complete official definitions under the existing catalogue IDs',()=>{
 const m=read('tools/support-phase-985.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[LINK,GOLD,HEAT,VAL,JET]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const {id,name,faces}=row,[f]=faces,d=details.cards.find(x=>x.id===id),c=e.card(id);
  assert.deepEqual(faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:985}),row.spec);
  const altered=structuredClone(d);
  altered.faces[0].abilityText+='未知の追加能力。';
  assert.throws(()=>standardCardSpec(altered,{phase:985}));
  for(const [key,v] of Object.entries(row.spec))assert.deepEqual(c[key],v);
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [name,[LINK,GOLD,HEAT].includes(id)?'spell':'creature',f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-985');
  assert.equal(CARD_IMAGES[id],row.image);
  assert.ok(catalogue.get(id).supported);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
 }
 for(const row of m.cards){
  assert.ok(row.verification.facesMatched);
  assert.match(row.verification.sha256,/^[a-f0-9]{64}$/);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[row.id,row.image]]);
 }
});

const tappedMana=(s,p=0)=>s.players[p].mana.filter(x=>x.tapped).length;
const unit=(s,x)=>s.players.flatMap(p=>p.battle).find(y=>y.uid===x.uid);
const stats=(s,x)=>[e.power(unit(s,x),false,s),e.effectiveCard(unit(s,x),s).race.split('/')];
function breakShields(s,uid){
 attack(s,uid);
 act(s,'noBlock');
 drain(s);
}
function end(s){
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
}

test('Linkwood adds power and the Dragon race to its existing allies, stacks power, and expires',()=>{
 let s=field();
 const first=put(s,0,'battle',NATURE),second=put(s,0,'battle',FIRE),enemy=put(s,1,'battle',NATURE);
 const sealed=put(s,0,'battle',WATER,{sealed:true});
 put(s,0,'seals',FIRE,{sealOf:sealed.uid,faceDown:true});
 const original=e.card(NATURE).race;
 play(s,LINK);
 assert.deepEqual(stats(s,first),[5000,[original,DRAGON_RACE]]);
 assert.deepEqual(stats(s,second),[5000,[e.card(FIRE).race,DRAGON_RACE]]);
 assert.deepEqual(stats(s,enemy),[2000,[original]]);
 assert.equal(stats(s,sealed)[1].includes(DRAGON_RACE),false);
 const late=play(s,NATURE);
 assert.deepEqual(stats(s,late),[2000,[original]]);
 play(s,LINK);
 s=restore(s);
 assert.deepEqual(stats(s,first),[8000,[original,DRAGON_RACE]]);
 assert.deepEqual(stats(s,late),[5000,[original,DRAGON_RACE]]);
 end(s);
 assert.deepEqual(stats(s,first),[2000,[original]]);
 assert.deepEqual(stats(s,late),[2000,[original]]);
});

test('Linkwood follows an evolving creature and spell suppression disables both modifiers',()=>{
 const s=field(),base=put(s,0,'battle',NATURE);
 play(s,LINK);
 const bell=play(s,BELL);
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.deepEqual(stats(s,bell),[9000,[e.card(BELL).race,DRAGON_RACE]]);
 const genmu=put(s,1,'battle',GENMU);
 assert.deepEqual(stats(s,bell),[6000,[e.card(BELL).race]]);
 s.players[1].battle=s.players[1].battle.filter(x=>x.uid!==genmu.uid);
 assert.deepEqual(stats(s,bell),[9000,[e.card(BELL).race,DRAGON_RACE]]);
});

test('Gold Proof offers each paid reduction from zero to five and persists the selection through JSON',()=>{
 for(const amount of [0,2,5,false]){
  let s=field();
  give(s,0,'mana',[WATER,WATER,WATER,...Array(5).fill(FIRE)]);
  const target=put(s,1,'battle',WATER),spell=play(s,GOLD),all=physical(s);
  assert.deepEqual(choices(s),[5,4,3,2,1,0,false]);
  assert.equal(tappedMana(s),0);
  s=restore(s);
  pick(s,amount);
  if(amount===false){
   assert.ok(has(s,0,'hand',spell));
   assert.equal(tappedMana(s),0);
  }else{
   assert.equal(tappedMana(s),8-amount);
   assert.deepEqual(choices(s),[target.uid]);
   pick(s,target.uid);
   assert.ok(has(s,1,'hand',target));
   assert.ok(has(s,0,'grave',spell));
  }
  assert.deepEqual(physical(s),all);
 }
});

test('Gold Proof counts tapped Water and stacks its reduction with spell auras',()=>{
 const s=field();
 give(s,0,'mana',[WATER,WATER,WATER,FIRE]);
 s.players[0].mana[0].tapped=true;
 s.players[0].mana[1].tapped=true;
 const spell=put(s,0,'hand',GOLD);
 const legal=()=>e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===spell.uid);
 assert.ok(!legal());
 const franz=put(s,0,'battle',FRANZ);
 assert.ok(legal());
 act(s,'play',a=>a.uid===spell.uid);
 assert.deepEqual(choices(s),[6,false]);
 pick(s,6);
 assert.equal(tappedMana(s),4);
 assert.deepEqual(choices(s),[franz.uid]);
 pick(s,franz.uid);
 assert.ok(has(s,0,'hand',franz)&&has(s,0,'grave',spell));
});

test('Gold Proof requires three Water cards for its own reduction and respects reduction prohibition',()=>{
 for(const stopped of [false,true]){
  const s=field();
  give(s,0,'mana',[WATER,WATER,stopped?WATER:FIRE,...Array(5).fill(FIRE)]);
  if(stopped)put(s,1,'battle','dmrp22-027');
  play(s,GOLD);
  assert.equal(tappedMana(s),8);
  if(stopped)assert.match(s.decision.title,/進化ではないカード/);
  else assert.equal(s.decision,null);
 }
});

test('Gold Proof chooses an individual non-evolution base, seed, or seal from either side',()=>{
 for(const select of ['base','seed','seal']){
  const s=field(),base=inst(NATURE),lower=inst(BELL);
  const top=put(s,1,'battle',BELL,{under:[lower,base]});
  const host=put(s,1,'battle',FIRE,{sealed:true});
  const seal=put(s,1,'seals',BELL,{sealOf:host.uid,faceDown:true});
  const seed=put(s,0,'battle',SEED);
  play(s,GOLD);
  pick(s,5);
  assert.deepEqual(new Set(choices(s)),new Set([base.uid,seed.uid,seal.uid]));
  assert.equal(s.decision.choices.find(c=>c.value===seal.uid).cardId,undefined);
  pick(s,{base,seed,seal}[select].uid);
  assert.ok(has(s,1,'battle',top)&&has(s,1,'battle',host));
  assert.ok(has(s,select==='seed'?0:1,'hand',{base,seed,seal}[select]));
  assert.equal(!!host.sealed,select!=='seal');
 }
});

test('Fervor adds 3000 and an extra break to the chosen ally, then offers a draw only with more shields',()=>{
 for(const [advantage,draw] of [[false,0],[true,0],[true,1]]){
  let s=field();
  if(advantage)give(s,1,'shields',Array(4).fill(NATURE));
  const ally=put(s,0,'battle',JET),other=put(s,0,'battle',FIRE),enemy=put(s,1,'battle',FIRE);
  const top=s.players[0].deck[0],shields=s.players[1].shields.length;
  play(s,HEAT);
  assert.deepEqual(choices(s),[ally.uid,other.uid]);
  pick(s,ally.uid);
  assert.equal(e.power(ally,false,s),8000);
  assert.equal(e.power(other,false,s),2000);
  assert.equal(e.power(enemy,false,s),2000);
  s=restore(s);
  if(advantage){
   assert.deepEqual(choices(s),[0,1]);
   pick(s,draw);
  }
  assert.equal(has(s,0,'hand',top),!!draw);
  breakShields(s,ally.uid);
  assert.equal(s.players[1].shields.length,shields-2);
  end(s);
  assert.equal(e.power(unit(s,ally),false,s),5000);
  assert.equal(e.effectiveCard(unit(s,ally),s).extraBreak??0,0);
 }
});

test('Fervor can draw with more shields even when there is no friendly creature',()=>{
 const s=field();
 give(s,1,'shields',[]);
 const top=s.players[0].deck[0];
 play(s,HEAT);
 assert.deepEqual(choices(s),[0,1]);
 pick(s,1);
 assert.ok(has(s,0,'hand',top));
});

test('Valhalla checks untapped opposing creatures continuously, including an empty field',()=>{
 const s=field(),val=play(s,VAL);
 const check=(power,breaks)=>{
  assert.equal(e.power(val,false,s),power);
  assert.equal(e.effectiveCard(val,s).breaker??1,breaks);
 };
 check(11000,2);
 const enemy=put(s,1,'battle',FIRE);
 check(5500,1);
 enemy.tapped=true;
 check(11000,2);
 enemy.tapped=false;
 put(s,1,'seals',NATURE,{sealOf:enemy.uid,faceDown:true});
 enemy.sealed=true;
 put(s,1,'battle',SEED);
 check(11000,2);
});

test('Valhalla can cast either eligible Spark spell face without payment and gets W-Breaker before breaking shields',()=>{
 for(const id of [HOLY,TWIN]){
  let s=field(),val=put(s,0,'battle',VAL),enemy=put(s,1,'battle',FIRE);
  const spark=put(s,0,'hand',id),creature=put(s,0,'hand','dmr05-002'),spell=put(s,0,'hand',HEAT);
  const all=physical(s);
  attack(s,val.uid);
  assert.deepEqual(choices(s),[spark.uid,null]);
  assert.equal(s.decision.choices[0].value.face,Number(id===TWIN));
  s=restore(s);
  pick(s,spark.uid);
  assert.ok(unit(s,enemy).tapped&&has(s,0,'grave',spark));
  assert.ok(has(s,0,'hand',creature)&&has(s,0,'hand',spell));
  assert.equal(tappedMana(s),0);
  assert.equal(e.power(unit(s,val),true,s),11000);
  act(s,'noBlock');
  drain(s);
  assert.equal(s.players[1].shields.length,3);
  assert.deepEqual(physical(s),all);
 }
});

test('Valhalla may decline the free cast and cannot cast through an opposing spell lock',()=>{
 for(const locked of [false,true]){
  const s=field(),val=put(s,0,'battle',VAL),spark=put(s,0,'hand',HOLY);
  if(locked)put(s,1,'battle',GAGA);
  attack(s,val.uid);
  assert.deepEqual(choices(s),locked?[null]:[spark.uid,null]);
  pick(s,null);
  assert.ok(has(s,0,'hand',spark));
  act(s,'noBlock');
  drain(s);
  assert.equal(s.players[1].shields.length,locked?4:3);
 }
});

test('Thrilling Jet mills three on entry and breaks once plus each newly milled Dragon until turn end',()=>{
 for(const count of [0,1,2,3]){
  let s=field();
  give(s,0,'grave',[VAL]);
  const dragons=[VAL,'dm22ex1-030',JET];
  give(s,0,'deck',[...dragons.slice(0,count),...Array(3-count).fill(WATER),NATURE,FIRE]);
  const expected=s.players[0].deck.slice(0,3).map(x=>x.uid);
  const jet=play(s,JET),all=physical(s);
  assert.deepEqual(s.players[0].grave.slice(1).map(x=>x.uid),expected);
  assert.equal(e.effectiveCard(jet,s).extraBreak??0,count);
  s=restore(s);
  breakShields(s,jet.uid);
  assert.equal(s.players[1].shields.length,4-count);
  end(s);
  assert.equal(e.effectiveCard(unit(s,jet),s).extraBreak??0,0);
  assert.deepEqual(physical(s),all);
 }
});
