import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const DURAN='dm25rp3-043',HARINSEN='dmrp05-016',PARADISO='dmrp09-s04',JEEP='dmrp03-046',SIEGE='dm25rp3-034';
const LIGHT='dm01-075',WATER='dm01-083',FIRE='dm01-097',GREEN='dm01-108',DARK='dm01-090';
const SPELL='dm01-102',GATE='dm01-086',EXPENSIVE='dm01-109',FIELD='dmrp08-005';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
const ids=(s,p,zone)=>s.players[p][zone].map(x=>x.uid);
const values=s=>(s.decision?.choices??[]).map(x=>x.value?.uid??x.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const canPlay=(s,x)=>e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===x.uid);
const tappedMana=s=>s.players[0].mana.filter(x=>x.tapped).length;

function field(active=0){
 const s=setup();
 s.active=active;
 for(const p of [0,1]){
  give(s,p,'deck',Array(12).fill(GREEN));
  give(s,p,'grave',[]);
 }
 return s;
}
function add(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
function play(s,x,base){
 act(s,'play',a=>a.uid===x.uid);
 if(e.card(x).neoEvolution)act(s,'evolve',a=>a.baseUid===base?.uid);
}
function finishAttack(s){
 if(s.decision?.type==='block')act(s,'noBlock');
 drain(s);
}
function end(s){
 s.phase='attack';
 act(s,'endTurn');
}

test('Five verified official cards preserve single canonical IDs, art, limits and corrected text',()=>{
 const m=read('tools/support-phase-1068.json');
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(c=>c.id),[DURAN,HARINSEN,PARADISO,JEEP,SIEGE]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const {id,name,faces:[f],spec}=row,c=e.card(id);
  assert.ok(row.verification.facesMatched&&catalogue.get(id).supported);
  assert.deepEqual(standardCardSpec(details.cards.find(r=>r.id===id),{phase:1068}),spec);
  for(const [k,v] of Object.entries(spec))assert.deepEqual(c[k],v);
  assert.deepEqual([c.type,c.cost,c.race,c.power,e.civilizations(c),c.manaValue,c.limit],
   ['creature',f.cost,f.race,Number(f.powerText),f.civilizations,1,m.regulationVerification.limits[id]]);
  assert.equal(c.limit,4);
  for(const rows of [data.cards,details.cards,snapshot.cards])
   assert.deepEqual(rows.filter(r=>nameKey(r.name)===nameKey(name)).map(r=>r.id),[id]);
  assert.deepEqual(refs.filter(r=>r.id===id).map(r=>[r.canonicalId,r.image]),[[id,row.image]]);
  assert.equal(CARD_IMAGES[id],row.image);
 }
 const jeep=m.cards.find(c=>c.id===JEEP);
 assert.match(jeep.errata.source,/\/rulechange\/31423\//);
 assert.match(jeep.errata.abilityText,/終わりに、自分の進化ではないクリーチャー/);
 assert.equal(e.card(JEEP).text,jeep.errata.abilityText);
 assert.equal(catalogue.get(JEEP).faces[0].abilityText,jeep.errata.abilityText);
});

test('Duran DDD can evolve the attacker and offer an untap only at the first attack end',()=>{
 let s=field();
 const base=add(s,0,'battle',FIRE),duran=add(s,0,'hand',DURAN),all=physical(s);
 attack(s,base.uid);
 act(s,'declareDDD');
 act(s,'summonDDD',a=>a.baseUid===base.uid);
 assert.equal(tappedMana(s),2);
 assert.equal(s.attack.attacker,duran.uid);
 assert.ok(duran.tapped);
 act(s,'noBlock');
 assert.equal(s.players[1].shields.length,4);
 assert.equal(s.decision?.task?.op,'g34_Offer');
 s=decodeBattleData(encodeBattleData(s));
 pick(s,true);
 const attacker=s.players[0].battle[0];
 assert.equal(attacker.tapped,false);
 attack(s,attacker.uid);
 finishAttack(s);
 assert.equal(attacker.tapped,true);
 assert.equal(s.players[1].shields.length,3);
 assert.deepEqual(physical(s),all);
});

test('Duran can decline its first attack end untap while still breaking shields',()=>{
 const s=field(),duran=add(s,0,'battle',DURAN);
 attack(s,duran.uid);
 act(s,'noBlock');
 assert.equal(s.decision?.task?.op,'g34_Offer');
 pick(s,null);
 assert.equal(duran.tapped,true);
 assert.equal(s.players[1].shields.length,4);
});

test('Duran still triggers at attack end against evolved GG (QA 48740)',()=>{
 const s=field(),duran=add(s,0,'battle',DURAN);
 add(s,1,'battle','dm25rp3-S09',{under:[inst(GREEN)]});
 attack(s,duran.uid);
 act(s,'noBlock');
 assert.equal(s.decision?.task?.op,'g34_Offer');
 pick(s,true);
 assert.equal(duran.tapped,false);
});

test('Harinsen counts only its own creatures and casts a spell exactly at the free cost limit',()=>{
 const s=field();
 const harinsen=add(s,0,'battle',HARINSEN);
 add(s,0,'battle',GREEN);
 add(s,0,'battle',FIELD);
 add(s,0,'battle',WATER,{sealed:true});
 const enemy=add(s,1,'battle',WATER);
 add(s,1,'battle',FIRE);
 const low=add(s,0,'hand',SPELL),gate=add(s,0,'hand',GATE);
 const high=add(s,0,'hand',EXPENSIVE),creature=add(s,0,'hand',WATER);
 const before=physical(s);
 attack(s,harinsen.uid);
 assert.deepEqual(new Set(values(s)),new Set([low.uid,gate.uid,null]));
 pick(s,gate.uid);
 act(s,'effect',a=>a.targets[0].uid===enemy.uid);
 finishAttack(s);
 assert.equal(tappedMana(s),0);
 assert.ok(ids(s,1,'hand').includes(enemy.uid));
 assert.ok(ids(s,0,'grave').includes(gate.uid));
 assert.deepEqual(ids(s,0,'hand'),[low.uid,high.uid,creature.uid]);
 assert.deepEqual(physical(s),before);
});

test('Harinsen can cast the spell face of an eligible twinpact',()=>{
 const s=field(),harinsen=add(s,0,'battle',HARINSEN);
 for(let i=0;i<3;i++)add(s,0,'battle',GREEN);
 const twinpact=add(s,0,'hand','dmex06-024');
 attack(s,harinsen.uid);
 const [spell,decline]=s.decision.choices;
 assert.equal(spell.value.uid,twinpact.uid);
 assert.equal(spell.value.face,1);
 assert.equal(decline.value,null);
 pick(s,twinpact.uid);
 finishAttack(s);
 assert.ok(ids(s,0,'grave').includes(twinpact.uid));
 assert.equal(tappedMana(s),0);
});

test('Harinsen can decline a legal spell without consuming it or mana',()=>{
 const s=field(),harinsen=add(s,0,'battle',HARINSEN),spell=add(s,0,'hand',SPELL);
 attack(s,harinsen.uid);
 pick(s,null);
 finishAttack(s);
 assert.deepEqual(ids(s,0,'hand'),[spell.uid]);
 assert.equal(tappedMana(s),0);
 assert.equal(s.players[1].shields.length,4);
});

test('Paradiso returns exactly two own water creatures including itself, or as many as available',()=>{
 for(const hasAlly of [false,true]){
  const s=field();
  const enemy=add(s,1,'battle',WATER),nonWater=add(s,0,'battle',FIRE);
  const ally=hasAlly?add(s,0,'battle',WATER):null;
  const base=hasAlly?add(s,0,'battle',WATER):null;
  const paradiso=add(s,0,'hand',PARADISO),all=physical(s);
  play(s,paradiso,base);
  assert.deepEqual(new Set(values(s)),new Set(hasAlly?[paradiso.uid,ally.uid]:[paradiso.uid]));
  pick(s,paradiso.uid);
  if(ally)pick(s,ally.uid);
  drain(s);
  assert.deepEqual(new Set(ids(s,0,'hand')),new Set([paradiso.uid,...(ally?[ally.uid,base.uid]:[])]));
  assert.deepEqual(ids(s,0,'battle'),[nonWater.uid]);
  assert.deepEqual(ids(s,1,'battle'),[enemy.uid]);
  assert.deepEqual(physical(s),all);
 }
});

test('Paradiso offers exactly three draws followed by one discard and breaks three shields',()=>{
 for(const take of [false,true]){
  const s=field(),paradiso=add(s,0,'battle',PARADISO),first=add(s,0,'hand',SPELL);
  const [a,b,c]=ids(s,0,'deck');
  attack(s,paradiso.uid);
  pick(s,take?true:null);
  if(take){
   assert.deepEqual(new Set(values(s)),new Set([first.uid,a,b,c]));
   pick(s,b);
  }
  finishAttack(s);
  assert.deepEqual(ids(s,0,'hand'),take?[first.uid,a,c]:[first.uid]);
  assert.deepEqual(ids(s,0,'grave'),take?[b]:[]);
  assert.equal(s.players[1].shields.length,2);
 }
});

test('Jeep enforces its errata, excluding opposing and evolved creatures while allowing ordinary NEO',()=>{
 const s=field();
 const base=add(s,0,'battle',FIRE),jeep=add(s,0,'hand',JEEP);
 play(s,jeep,base);
 const own=add(s,0,'battle',DURAN),enemy=add(s,1,'battle',FIRE);
 end(s);
 assert.deepEqual(values(s),[own.uid]);
 pick(s,own.uid);
 drain(s);
 assert.deepEqual(ids(s,0,'hand'),[own.uid]);
 assert.deepEqual(ids(s,0,'battle'),[jeep.uid]);
 assert.deepEqual(ids(s,1,'battle'),[enemy.uid]);
 end(s);
 assert.equal(s.decision,null);
 const ordinary=field(),other=add(ordinary,0,'hand',JEEP);
 play(ordinary,other);
 end(ordinary);
 pick(ordinary,other.uid);
 drain(ordinary);
 assert.ok(ids(ordinary,0,'hand').includes(other.uid));
});

test('Steam Operation requires a current-turn noncreature execution for a normal summon',()=>{
 const s=field(),siege=add(s,0,'hand',SIEGE);
 assert.equal(canPlay(s,siege),false);
 const unit=add(s,0,'hand',WATER);
 play(s,unit);
 assert.equal(canPlay(s,siege),false);
 const fieldCard=add(s,0,'hand',FIELD);
 play(s,fieldCard);
 drain(s);
 assert.equal(canPlay(s,siege),true);
 end(s);
 drain(s);
 end(s);
 drain(s);
 s.phase='main';
 assert.equal(canPlay(s,siege),false);
 const spell=add(s,0,'hand',GATE);
 play(s,spell);
 drain(s);
 assert.equal(canPlay(s,siege),true);
 play(s,siege);
 assert.ok(ids(s,0,'battle').includes(siege.uid));
});

test('Steam Operation can declare DDD before a spell and checks its condition when DDD resolves',()=>{
 for(const castFirst of [false,true]){
  const s=field(),base=add(s,0,'battle',HARINSEN),siege=add(s,0,'hand',SIEGE);
  const spell=add(s,0,'hand',SPELL);
  attack(s,base.uid);
  act(s,'declareDDD');
  assert.equal(s.decision?.type,'effectOrder');
  act(s,'orderEffect',a=>a.cardId===(castFirst?HARINSEN:SIEGE));
  if(castFirst){
   pick(s,spell.uid);
   act(s,'effect',a=>a.targets[0].uid===base.uid);
   assert.equal(s.decision?.type,'dddSummon');
   act(s,'summonDDD',a=>a.baseUid===base.uid);
   assert.equal(tappedMana(s),1);
   assert.equal(s.attack.attacker,siege.uid);
   finishAttack(s);
   assert.equal(s.players[1].shields.length,3);
  }else{
   assert.deepEqual(e.getLegalActions(s).map(a=>a.kind),['skipDDDSummon']);
   assert.equal(tappedMana(s),0);
   act(s,'skipDDDSummon');
   pick(s,null);
   finishAttack(s);
   assert.ok(ids(s,0,'hand').includes(siege.uid));
  }
 }
});

test('Steam Operation can be put into the battle zone by a non-summon effect',()=>{
 const s=field(),siege=add(s,0,'hand',SIEGE);
 assert.equal(canPlay(s,siege),false);
 s.extTasks=[{op:'g34_Put',p:0,source:HARINSEN,owner:0,origin:'hand',target:siege.uid}];
 act(s,'toAttack');
 pick(s,null);
 drain(s);
 assert.ok(ids(s,0,'battle').includes(siege.uid));
 assert.equal(tappedMana(s),0);
});
