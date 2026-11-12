import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const GUITAR='dm25rp4-069',GENJI='dmex17-036',ZO='dm25rp4-038',BABANKU='dmrp07-039';
const LIGHT='dm01-075',WATER='dm01-083',DARK='dm01-090',FIRE='dm01-097',GREEN='dm01-108';
const EAGLE='dm37-032',BLOCKER='dm01-001',BLOCKER2='dm10-062',TURBO='promoy24-063';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url)));
const restore=s=>decodeBattleData(encodeBattleData(s));
const live=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const tappedMana=s=>s.players[0].mana.filter(x=>x.tapped).length;
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);

function add(s,p,zone,id,properties={}){
 const x=Object.assign(inst(id),properties);
 s.players[p][zone].push(x);
 return x;
}

function end(s){
 s.phase='attack';
 act(s,'endTurn');
}

test('Four official NEO cards retain their official names, types, stats, images and unrestricted limits',()=>{
 const m=read('tools/support-phase-1059.json'),cat=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(x=>x.id),[GUITAR,GENJI,ZO,BABANKU]);
 for(const row of m.cards){
  const c=e.card(row.id),f=row.faces[0];
  assert.ok(cat.get(row.id).supported&&row.verification.facesMatched);
  assert.equal(cat.get(row.id).id,row.id);
  assert.deepEqual([c.cost,c.power,c.race,c.manaValue,e.civilizations(c),c.limit,c.breaker],
   [f.cost,Number(f.powerText),f.race,1,f.civilizations,4,2]);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(details.cards.find(x=>x.id===row.id).faces,row.faces);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1059}),row.spec);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[row.id,row.image]]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);
 }
});

test('The Guitar and GENJI can use three mana only with a legal evolution base',()=>{
 for(const [id,colors] of [[GUITAR,[DARK,FIRE,GREEN]],[GENJI,[FIRE]]]){
  let s=setup();
  give(s,0,'mana',[FIRE,FIRE,FIRE]);
  const body=add(s,0,'hand',id);
  const others=[DARK,FIRE,GREEN,WATER].map(color=>add(s,0,'battle',color));
  add(s,1,'battle',FIRE);
  assert.equal(e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===body.uid).cost,3);
  act(s,'play',a=>a.uid===body.uid);
  const bases=others.filter(x=>colors.includes(x.cardId));
  assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),bases.map(x=>x.uid));
  s=restore(s);
  act(s,'evolve',a=>a.baseUid===bases[0].uid);
  assert.equal(tappedMana(s),3);
  const summoned=s.players[0].battle.find(x=>x.uid===body.uid);
  assert.equal(summoned.under[0].uid,bases[0].uid);
  assert.ok(e.isEvolution(summoned));
 }
});

test('Each normal summon pays printed cost and has summoning sickness',()=>{
 for(const id of [GUITAR,GENJI]){
  const s=setup(),body=add(s,0,'hand',id);
  add(s,0,'battle',FIRE);
  act(s,'play',a=>a.uid===body.uid);
  act(s,'evolve',a=>!a.baseUid);
  assert.equal(tappedMana(s),e.card(id).cost);
  s.phase='attack';
  assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===body.uid));
 }
});

test('Guitar does not get the reduction from an opponent base or a Water base',()=>{
 const s=setup(),body=add(s,0,'hand',GUITAR);
 give(s,0,'mana',[FIRE,FIRE,FIRE]);
 add(s,0,'battle',WATER);
 add(s,1,'battle',FIRE);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===body.uid));
});

test('Eagle applies its optional Double Cross discount in addition to the GENJI evolution discount',()=>{
 const s=setup(),eagle=add(s,0,'battle',EAGLE),body=add(s,0,'hand',GENJI);
 give(s,0,'mana',[FIRE,FIRE,FIRE]);
 assert.equal(e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===body.uid).cost,2);
 act(s,'play',a=>a.uid===body.uid);
 act(s,'evolve',a=>a.baseUid===eagle.uid);
 pick(s,1);
 assert.equal(tappedMana(s),2);
 assert.ok(live(s,0,'battle',body));
});

test('GENJI must destroy an opposing blocker before the blocking decision',()=>{
 const s=setup(),body=add(s,0,'battle',GENJI,{under:[inst(FIRE)]});
 const ally=add(s,0,'battle',BLOCKER),enemy=add(s,1,'battle',BLOCKER);
 const second=add(s,1,'battle',BLOCKER2),other=add(s,1,'battle',WATER);
 const protectedBlocker=add(s,1,'battle','dmrp01-041',{tapped:true,g34Grants:[{turn:s.turn,blocker:true}]});
 assert.ok(e.effectiveCard(protectedBlocker,s).blocker);
 assert.ok(e.card(BLOCKER).blocker&&e.card(BLOCKER2).blocker&&!e.card(WATER).blocker);
 attack(s,body.uid);
 assert.deepEqual(new Set(values(s)),new Set([enemy.uid,second.uid]));
 pick(s,enemy.uid);
 assert.ok(live(s,1,'grave',enemy)&&live(s,0,'battle',ally)&&live(s,1,'battle',other)&&live(s,1,'battle',protectedBlocker));
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('Zo discards exactly one chosen card on untap as a normal creature',()=>{
 for(const evolved of [false,true]){
  let s=setup();
  const body=add(s,0,'battle',ZO,{tapped:true,...(evolved?{under:[inst(WATER)]}:{})});
  const chosen=add(s,0,'hand',DARK),kept=add(s,0,'hand',GREEN);
  end(s);
  end(s);
  assert.ok(!s.players[0].battle.find(x=>x.uid===body.uid).tapped);
  if(!evolved){
   assert.ok(values(s).includes(chosen.uid)&&!values(s).includes(null));
   s=restore(s);
   pick(s,chosen.uid);
  }
  drain(s);
  assert.equal(live(s,0,'grave',chosen),!evolved);
  assert.ok(live(s,0,'hand',kept));
 }
});

test('Zo does not discard if it was already untapped at the beginning of the turn',()=>{
 const s=setup(),kept=add(s,0,'hand',GREEN);
 add(s,0,'battle',ZO);
 end(s);
 end(s);
 drain(s);
 assert.ok(live(s,0,'hand',kept));
});

test('Babanku discards exactly one chosen card when attacking as a normal creature',()=>{
 for(const evolved of [false,true]){
  const s=setup(),body=add(s,0,'battle',BABANKU,evolved?{under:[inst(DARK)]}:{});
  const chosen=add(s,0,'hand',DARK),kept=add(s,0,'hand',GREEN);
  attack(s,body.uid);
  if(!evolved){
   assert.deepEqual(new Set(values(s)),new Set([chosen.uid,kept.uid]));
   pick(s,chosen.uid);
  }
  drain(s);
  assert.equal(live(s,0,'grave',chosen),!evolved);
  assert.ok(live(s,0,'hand',kept));
  assert.equal(s.players[1].shields.length,3);
 }
});

test('Babanku checks NEO status at resolution after evolving during its attack',()=>{
 const s=setup(),body=add(s,0,'battle',BABANKU),kept=add(s,0,'hand',GREEN);
 const turbo=add(s,0,'hand',TURBO);
 attack(s,body.uid);
 act(s,'declareDDD',a=>a.uid===turbo.uid);
 if(s.decision?.type==='effectOrder')
  act(s,'orderEffect',a=>s.pendingEffects.find(x=>x.effectId===a.effectId)?.source===TURBO);
 act(s,'summonDDD',a=>a.baseUid===body.uid);
 drain(s);
 assert.ok(live(s,0,'hand',kept));
});

test('Zo uses the last evolution status when an effect untaps it and removes it before resolution',()=>{
 for(const evolved of [false,true]){
  const s=setup(),body=add(s,0,'battle',ZO,{tapped:true,...(evolved?{under:[inst(WATER)]}:{})});
  const chosen=add(s,0,'hand',DARK),kept=add(s,0,'hand',GREEN);
  s.extTasks=[{op:'g23_FEnd',p:0,source:ZO,uid:body.uid,incarnation:0}];
  act(s,'toAttack');
  assert.ok(live(s,0,'grave',body));
  if(!evolved)pick(s,chosen.uid);
  drain(s);
  assert.equal(live(s,0,'grave',chosen),!evolved);
  assert.ok(live(s,0,'hand',kept));
 }
});

test('Diamon disables the evolution summon discount without changing eligible bases',()=>{
 const s=setup(),body=add(s,0,'hand',GUITAR),base=add(s,0,'battle',FIRE);
 add(s,1,'battle','dmrp22-027');
 give(s,0,'mana',[FIRE,FIRE,FIRE,FIRE,FIRE]);
 assert.equal(e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===body.uid).cost,5);
 act(s,'play',a=>a.uid===body.uid);
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.equal(tappedMana(s),5);
 assert.ok(live(s,0,'battle',body));
});
