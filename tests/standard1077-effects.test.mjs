import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot,GG} from './target-fixture.mjs';

const GEO='dmc49-004',NANO='dmrp09-s02',NARGLE='dmd35-007';
const NATURE='dm01-108',DRAGON='dm10-006',BAHAM='promoy2-014',DRAGONOID='dm01-095';
const BLOCKER='dm01-076',MANTIS='promoy2-023',SEED='dmrp22-049';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url)));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();

function field(){
 const s=setup();
 for(const p of [0,1]){
  give(s,p,'deck',Array(12).fill(NATURE));
  give(s,p,'grave',[]);
 }
 return s;
}
function add(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
function choose(s,value){
 act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===value);
}
function noBlock(s){
 if(s.decision?.type==='block')act(s,'noBlock');
}
function finishAttack(s,count){
 noBlock(s);
 if(s.decision?.type==='breakChoice')act(s,'breakShields',a=>a.shields.length===count);
 drain(s);
}
const inZone=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);

test('Three new battle definitions and all twelve official prints preserve one ID per name',()=>{
 const manifest=read('tools/support-phase-1077.json'),cat=createCatalogue(snapshot,data.cards,details);
 const images=read('tools/image-reference-prints.json').prints;
 const ids=[GEO,NANO,NARGLE];
 assert.deepEqual(manifest.cards.map(c=>c.id),ids);
 assert.equal(manifest.printAliases.length,9);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,card=e.card(id),f=row.faces[0],main=manifest.cards.find(c=>c.id===id);
  assert.ok(row.verification.facesMatched&&cat.get(id).supported);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1077}),main.spec);
  assert.deepEqual([card.cost,card.race,card.power,card.civ,card.manaValue,card.limit],
   [f.cost,f.race,+f.powerText,f.civilizationText,1,4]);
  assert.equal(manifest.regulationVerification.limits[row.id],4);
  assert.deepEqual(cat.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(images.filter(r=>r.id===row.id).map(r=>[r.canonicalId,r.image]),[[id,row.image]]);
  if(row.id===id)assert.equal(CARD_IMAGES[id],row.image);
 }
 for(const id of ids)assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(e.card(id).name)).map(c=>c.id),[id]);
 assert.equal(e.card(GEO).breaker,2);
 assert.equal(e.card(NANO).breaker,3);
});

test('Geometheus puts only a chosen Dragon from hand before the break and does not spend mana',()=>{
 const s=field(),geo=add(s,0,'battle',GEO),dragon=add(s,0,'hand',DRAGON),other=add(s,0,'hand',DRAGONOID);
 add(s,0,'hand',MANTIS);
 add(s,1,'battle',GG,{under:[inst(NATURE)]});
 const all=physical(s);
 attack(s,geo.uid);
 noBlock(s);
 assert.equal(s.decision.task.source,GEO);
 assert.deepEqual(s.decision.choices.flatMap(o=>o.value?[o.value.uid]:[]),[dragon.uid]);
 choose(s,dragon.uid);
 assert.ok(inZone(s,0,'battle',dragon)&&inZone(s,0,'hand',other));
 assert.ok(s.players[0].mana.every(x=>!x.tapped));
 assert.equal(s.players[1].shields.length,5);
 finishAttack(s,2);
 assert.equal(s.metrics[0].breaks,2);
 assert.deepEqual(physical(s),all);
});

test('Geometheus can evolve itself mid-attack and the new top creature performs the break',()=>{
 let s=field();
 const geo=add(s,0,'battle',GEO),evolution=add(s,0,'hand',BAHAM);
 add(s,0,'battle',DRAGONOID);
 add(s,0,'battle',DRAGONOID);
 const all=physical(s);
 attack(s,geo.uid);
 noBlock(s);
 choose(s,evolution.uid);
 assert.equal(s.decision.task.op,'g34_Put');
 assert.deepEqual(s.decision.choices.map(o=>o.value),[geo.uid]);
 s=JSON.parse(JSON.stringify(s));
 choose(s,geo.uid);
 const top=s.players[0].battle.find(x=>x.uid===evolution.uid);
 assert.equal(top.under[0].uid,geo.uid);
 assert.ok(top.tapped);
 finishAttack(s,3);
 assert.equal(s.metrics[0].breaks,3);
 assert.deepEqual(physical(s),all);
});

test('Geometheus skips the deployment after blocking, on another attacker, or when declined',()=>{
 for(const mode of ['blocked','other','creature','decline']){
  const s=field(),geo=add(s,0,'battle',GEO),dragon=add(s,0,'hand',DRAGON);
  const attacker=mode==='other'?add(s,0,'battle',NATURE):geo;
  const blocker=add(s,1,'battle',BLOCKER,{tapped:mode==='creature'});
  attack(s,attacker.uid,mode==='creature'?blocker.uid:'player');
  if(mode==='blocked')act(s,'block',a=>a.uid===blocker.uid);
  else noBlock(s);
  if(mode==='decline')choose(s,null);
  else assert.notEqual(s.decision?.task?.source,GEO);
  finishAttack(s,mode==='other'?1:mode==='decline'?2:0);
  assert.ok(inZone(s,0,'hand',dragon),mode);
 }
});

test('Nanoclone discounts by own visible creatures down to one and grants a shield for an unblocked ally',()=>{
 const s=field(),nano=add(s,0,'hand',NANO),ally=add(s,0,'battle',NATURE);
 add(s,0,'battle',SEED);
 const sealed=add(s,0,'battle',NATURE,{sealed:1});
 add(s,0,'seals',NATURE,{faceDown:true,sealOf:sealed.uid});
 add(s,1,'battle',NATURE);
 assert.equal(e.summonCost(s,0,e.card(NANO)),10);
 for(let i=0;i<11;i++)add(s,0,'battle',NATURE);
 assert.equal(e.summonCost(s,0,e.card(NANO)),1);
 act(s,'play',a=>a.uid===nano.uid);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,1);
 assert.ok(e.effectiveCard(nano,s).blocker);
 const top=s.players[0].deck[0].uid;
 attack(s,ally.uid);
 noBlock(s);
 assert.equal(s.decision.task.source,NANO);
 choose(s,true);
 finishAttack(s,1);
 assert.ok(s.players[0].shields.some(x=>x.uid===top&&!x.faceUp));
});

test('Nanoclone may decline the shield after its own attack and breaks three shields',()=>{
 const s=field(),nano=add(s,0,'battle',NANO);
 const top=s.players[0].deck[0].uid;
 attack(s,nano.uid);
 noBlock(s);
 assert.equal(s.decision.task.source,NANO);
 choose(s,null);
 finishAttack(s,3);
 assert.equal(s.metrics[0].breaks,3);
 assert.equal(s.players[0].deck[0].uid,top);
});

test('Nargle enters the mana zone tapped and provides one mana of either printed civilization',()=>{
 const s=field(),source=add(s,0,'hand',NARGLE);
 s.phase='charge';
 act(s,'charge',a=>a.uid===source.uid);
 assert.ok(inZone(s,0,'mana',source)&&source.tapped);
 assert.equal(e.manaValueAt(s,0,source),1);
 assert.deepEqual(e.manaCivilizations(e.card(source)),['闇','火']);
});

test('Nargle destroys itself and the attacker before a player or creature attack can finish',()=>{
 for(const target of ['player','creature','nargle']){
  const s=field(),attacker=add(s,0,'battle',DRAGON),source=add(s,1,'battle',NARGLE,{tapped:target==='nargle'});
  const creature=add(s,1,'battle',NATURE,{tapped:true});
  attack(s,attacker.uid,target==='player'?target:(target==='nargle'?source:creature).uid);
  finishAttack(s,0);
  assert.ok(inZone(s,1,'grave',source)&&inZone(s,0,'grave',attacker),target);
  assert.ok(inZone(s,1,'battle',creature),target);
  assert.equal(s.metrics[0].breaks,0);
 }
});

test('Nargle still destroys the attacker if self-destruction fails, but skips a blocked attack',()=>{
 for(const blocked of [false,true]){
  const s=field(),attacker=add(s,0,'battle',DRAGON),source=add(s,1,'battle',NARGLE,{g19Protected:true});
  const defender=add(s,1,'battle',BLOCKER);
  attack(s,attacker.uid);
  if(blocked)act(s,'block',a=>a.uid===defender.uid);
  finishAttack(s,0);
  assert.ok(inZone(s,1,'battle',source));
  assert.equal(inZone(s,0,'grave',attacker),!blocked);
  assert.equal(s.metrics[0].breaks,0);
 }
});

test('Nargle follows Geometheus when it evolves before the defender resolves its unblocked trigger',()=>{
 const s=field(),geo=add(s,0,'battle',GEO),nargle=add(s,1,'battle',NARGLE);
 const evolution=add(s,0,'hand',BAHAM),all=physical(s);
 attack(s,geo.uid);
 noBlock(s);
 assert.equal(s.decision.task.source,GEO);
 choose(s,evolution.uid);
 choose(s,geo.uid);
 finishAttack(s,0);
 assert.ok(inZone(s,0,'grave',geo)&&inZone(s,0,'grave',evolution)&&inZone(s,1,'grave',nargle));
 assert.equal(s.metrics[0].breaks,0);
 assert.deepEqual(physical(s),all);
});
