import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const DEVO='dmx16-024',ONION='dmrp04s-026',PALM='dmrp22-018';
const NATURE='dm01-108',FIRE='dm01-097',WATER='dm01-083',SEED='dm22ex1-086';
const ONIKAMASU='dmrp01-041',EX='dm23ex2-016';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>decodeBattleData(encodeBattleData(s));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const choices=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>choices(s)[a.choice]===v);
const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);
const live=(s,p,z,x)=>s.players[p][z].find(y=>y.uid===x.uid);

function add(s,p,z,id){
 const x=inst(id);
 s.players[p][z].push(x);
 return x;
}
function field(){
 const s=setup();
 for(const p of [0,1]){
  give(s,p,'deck',Array(12).fill(NATURE));
  give(s,p,'grave',[]);
 }
 return s;
}
function end(s){
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
}

test('Official definitions and alternate print IDs resolve to three unique supported names',()=>{
 const manifest=read('tools/support-phase-1051.json'),catalogue=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(manifest.cards.map(x=>x.id),[DEVO,ONION,PALM]);
 assert.deepEqual(manifest.printAliases.map(x=>[x.id,x.canonicalId]),[['promoy17-052',DEVO],['promoy11-042',DEVO]]);
 assert.deepEqual(catalogue.resolveRows([DEVO,...manifest.printAliases.map(x=>x.id)].map(id=>({id,count:1}))),
  [{id:DEVO,count:3}]);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0],base=manifest.cards.find(x=>x.id===id);
  assert.equal(catalogue.get(row.id).id,id);
  assert.ok(catalogue.get(row.id).supported&&row.verification.facesMatched);
  assert.deepEqual([c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,manifest.regulationVerification.limits[row.id]]);
  assert.equal(CARD_IMAGES[id],base.image);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1051}),row.spec);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
 }
 assert.equal(e.card(DEVO).breaker,2);
 assert.equal(e.card(ONION).breaker,3);
});

test('Devolution resolves each compulsory destruction and discard in printed order',()=>{
 let s=field();
 const devo=add(s,0,'hand',DEVO),mine=add(s,0,'hand',FIRE),theirs=add(s,1,'hand',WATER);
 const own=add(s,0,'battle',FIRE),enemy=add(s,1,'battle',ONIKAMASU),seed=add(s,1,'battle',SEED);
 add(s,0,'hand',WATER);
 add(s,1,'hand',FIRE);
 const all=physical(s);
 play(s,devo);
 assert.equal(s.decision.player,1);
 assert.deepEqual(choices(s),[enemy.uid]);
 pick(s,enemy.uid);
 assert.ok(live(s,1,'grave',enemy));
 assert.equal(s.decision.player,0);
 assert.deepEqual(new Set(choices(s)),new Set([own.uid,devo.uid]));
 s=restore(s);
 pick(s,devo.uid);
 assert.ok(live(s,0,'grave',devo));
 assert.equal(s.decision.player,1);
 pick(s,theirs.uid);
 assert.equal(s.decision.player,0);
 pick(s,mine.uid);
 assert.ok(live(s,1,'grave',theirs)&&live(s,0,'grave',mine)&&live(s,1,'battle',seed));
 assert.deepEqual(physical(s),all);
});

test('Devolution still performs its own actions when the opponent has no creature or hand',()=>{
 const s=field(),devo=add(s,0,'hand',DEVO),mine=add(s,0,'hand',FIRE);
 play(s,devo);
 assert.deepEqual(choices(s),[devo.uid]);
 pick(s,devo.uid);
 if(s.decision)pick(s,mine.uid);
 assert.ok(live(s,0,'grave',devo)&&live(s,0,'grave',mine));
});

test('Onion Ring keeps a creature on each side in order and moves each remaining group to mana',()=>{
 let s=field();
 const onion=add(s,0,'hand',ONION),mine=add(s,0,'battle',FIRE),other=add(s,0,'battle',WATER);
 const enemy=add(s,1,'battle',ONIKAMASU),remainder=add(s,1,'battle',WATER),seed=add(s,1,'battle',SEED);
 const all=physical(s);
 play(s,onion);
 assert.equal(s.decision.player,0);
 pick(s,onion.uid);
 assert.ok(live(s,0,'mana',mine)&&live(s,0,'mana',other));
 assert.equal(s.decision.player,1);
 assert.deepEqual(new Set(choices(s)),new Set([enemy.uid,remainder.uid]));
 s=restore(s);
 pick(s,enemy.uid);
 assert.ok(live(s,1,'mana',remainder)&&live(s,1,'battle',seed)&&live(s,1,'battle',enemy));
 assert.deepEqual(physical(s),all);
 live(s,0,'battle',onion).entered=s.turn-1;
 attack(s,onion.uid);
 if(e.getLegalActions(s).some(a=>a.kind==='noBlock'))act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,2);
});

test('Onion Ring can send itself to mana and completes when the opponent has no creature',()=>{
 const s=field(),onion=add(s,0,'hand',ONION),mine=add(s,0,'battle',FIRE);
 const seed=add(s,1,'battle',SEED);
 play(s,onion);
 pick(s,mine.uid);
 assert.ok(live(s,0,'mana',onion)&&live(s,0,'battle',mine)&&live(s,1,'battle',seed));
 assert.equal(s.decision,null);
});

test('Palm lets the opponent choose to tap all current mana through the next start only',()=>{
 let s=field();
 const spell=add(s,0,'hand',PALM),enemy=add(s,1,'battle',ONIKAMASU);
 const existing=s.players[1].mana;
 existing[0].tapped=true;
 existing[1].faceDown=true;
 play(s,spell);
 assert.equal(s.decision.player,1);
 assert.deepEqual(choices(s),[0,1]);
 s=restore(s);
 pick(s,0);
 assert.ok(s.players[1].mana.every(x=>x.tapped&&e.skipsStartUntap(s,x)&&e.canUntap(x)));
 assert.ok(live(s,1,'battle',enemy));
 assert.ok(live(s,0,'grave',spell));
 const newMana=add(s,1,'mana',NATURE);
 newMana.tapped=true;
 end(s);
 assert.equal(s.active,1);
 assert.equal(live(s,1,'mana',newMana).tapped,false);
 assert.ok(s.players[1].mana.filter(x=>x.uid!==newMana.uid).every(x=>x.tapped&&!e.skipsStartUntap(s,x)));
 end(s);
 end(s);
 assert.equal(s.active,1);
 assert.ok(s.players[1].mana.every(x=>!x.tapped));
});

test('Palm destroys only opposing creatures and honors an EX Life replacement',()=>{
 const s=field(),spell=add(s,0,'hand',PALM),mine=add(s,0,'battle',FIRE);
 const enemy=add(s,1,'battle',ONIKAMASU),ex=add(s,1,'battle',EX),seed=add(s,1,'battle',SEED);
 const shield=s.players[1].shields[0];
 ex.exLifeShieldUid=shield.uid;
 const all=physical(s);
 play(s,spell);
 assert.equal(s.decision.player,1);
 pick(s,1);
 drain(s);
 assert.ok(live(s,1,'grave',enemy)&&live(s,1,'battle',ex)&&live(s,1,'grave',shield));
 assert.ok(live(s,0,'battle',mine)&&live(s,1,'battle',seed));
 assert.ok(s.players[1].mana.every(x=>!x.tapped));
 assert.deepEqual(physical(s),all);
});

test('Palm permits the opponent to choose destruction with an empty battle zone',()=>{
 const s=field(),spell=add(s,0,'hand',PALM);
 play(s,spell);
 pick(s,1);
 assert.ok(live(s,0,'grave',spell));
 assert.ok(s.players[1].mana.every(x=>!x.tapped));
});
