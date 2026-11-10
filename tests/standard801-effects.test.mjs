import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-801.json',import.meta.url)));
const SEA="dm24-048",PULSE="dm24-104",PUNCH="dm26-012";
const FIRE="dm01-097",NATURE="dm01-108",DARK="dm01-090",LIGHT="dm01-075",WATER="dm01-083",GENMU="dmrp15-km1";
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 801 definitions preserve their canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:801}));
  assert.throws(()=>standardCardSpec(detail,{phase:800}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:801}));
  assert.deepEqual(registry.cards.filter(c=>canonicalCardName(c.name)===canonicalCardName(row.name)).map(c=>c.id),[row.id]);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[key],value);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:row.id,count:1});
  deck.cards=registry.resolveRows(deck.cards);
  assert.equal(deck.cards.at(-1).id,row.id);
  assert.deepEqual(e.validateDeck(deck),[]);

 }
});

const play=(s,x)=>act(s,'play',a=>a.uid===x.uid&&!a.alternative);
const finish=s=>{if(s.decision?.type==='block')act(s,'noBlock');drain(s);};
const beginEnd=s=>{s.phase='attack';act(s,'endTurn');};
const end=s=>{beginEnd(s);finish(s);};

for(const mode of ['paid','declined','insufficient','left and returned','evolved']){
 test('Sea Spin Crawler tracks its optional light payment and same creature through '+mode,()=>{
  let s=setup();
  const source=put(s,0,'battle',SEA);
  give(s,0,'mana',[LIGHT,LIGHT,WATER,WATER,WATER,WATER]);
  const [first,second]=s.players[0].mana;
  second.tapped=mode==='insufficient';
  attack(s,source.uid);
  if(mode==='insufficient')assert.notEqual(s.decision?.task?.op,'g34_TapManaColors698');
  else {
   assert.equal(s.decision?.task?.op,'g34_TapManaColors698');
   assert.deepEqual(s.decision.choices.map(c=>c.value?.uid??c.value),[first.uid,second.uid,null]);
   pick(s,first.uid);
   assert.ok(!first.tapped&&!second.tapped);
   pick(s,mode==='declined'?null:second.uid);
  }
  const paid=!['declined','insufficient'].includes(mode);
  assert.equal(first.tapped,paid);
  finish(s);
  assert.equal(source.tapped,true);
  if(mode==='left and returned'){
   s.phase='main';
   s.extTasks=[{op:'g34_ExactMove',p:0,source:SEA,owner:0,target:source.uid,to:'hand'}];
   act(s,'toAttack');
   finish(s);
   assert.ok(has(s,0,'hand',source));
   s.phase='main';
   play(s,source);
   finish(s);
   const returned=s.players[0].battle.find(x=>x.uid===source.uid);
   assert.notEqual(returned.incarnation,s.g537Delays[0].incarnation);
   returned.tapped=true;
  }
  let uid=source.uid;
  if(mode==='evolved'){
   const evolved=put(s,0,'hand','dmr16g-021');
   s.phase='main';
   play(s,evolved);
   act(s,'evolve',a=>a.baseUid===source.uid);
   finish(s);
   assert.equal(s.players[0].battle.find(x=>x.uid===evolved.uid).tapped,true);
   uid=evolved.uid;
  }
  s=JSON.parse(JSON.stringify(s));
  end(s);
  assert.equal(s.players[0].battle.find(x=>x.uid===uid).tapped,!paid||mode==='left and returned');
  assert.equal(s.g537Delays?.length??0,0);
 });
}

for(const [targetId,qualifies] of [['dm01-s04',true],[DARK,true],['dm12-032',true],[LIGHT,false],[null,false]]){
 test('Pulse Totem applies the turn boost and untap on the matching declared attack '+(targetId??'player'),()=>{
  const s=setup(),source=put(s,0,'battle',PULSE);
  const target=targetId?put(s,1,'battle',targetId):null;
  if(target)target.tapped=true;
  attack(s,source.uid,target?.uid);
  finish(s);
  assert.equal(e.power(source,false,s),qualifies?7000:4000);
  if(targetId==='dm01-s04')assert.ok(has(s,1,'grave',target));
  assert.equal(source.tapped,true);
  end(s);
  assert.equal(e.power(source,false,s),4000);
  assert.equal(source.tapped,!qualifies);
 });
}

test('Punch and Slap counts both sides at the end and may stop after the first draw',()=>{
 let s=setup();
 const source=put(s,0,'hand',PUNCH),ally=put(s,0,'battle',FIRE),enemy=put(s,1,'battle',DARK);
 const seed=put(s,0,'battle','dmsd20-016'),sealed=put(s,1,'battle',FIRE),untapped=put(s,1,'battle',WATER);
 s.players[1].seals=[{...inst(NATURE),sealOf:sealed.uid}];
 untapped.tapped=true;
 play(s,source);
 finish(s);
 assert.ok(has(s,0,'grave',source));
 assert.equal(s.players[0].hand.length,0);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,3);
 untapped.tapped=false;
 ally.tapped=enemy.tapped=seed.tapped=sealed.tapped=true;
 s=JSON.parse(JSON.stringify(s));
 beginEnd(s);
 assert.equal(s.decision?.task?.op,'g34_DrawUpTo');
 assert.equal(s.decision.task.n,2);
 pick(s,true);
 assert.equal(s.decision.task.n,1);
 pick(s,null);
 assert.equal(s.players[0].hand.length,1);
 assert.equal(s.active,1);
});

test('Punch and Slap is cast for free from a broken shield and draws at the opponent turn end',()=>{
 const s=setup();
 s.active=1;
 const enemy=put(s,1,'battle',FIRE);
 give(s,0,'shields',[PUNCH]);
 give(s,0,'mana',[]);
 const source=s.players[0].shields[0];
 attack(s,enemy.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 finish(s);
 assert.equal(s.metrics[0].triggers,1);
 assert.ok(has(s,0,'grave',source));
 assert.equal(s.players[0].hand.length,0);
 beginEnd(s);
 assert.equal(s.decision.player,0);
 assert.equal(s.decision.task.n,1);
 pick(s,true);
 assert.equal(s.active,0);
 assert.equal(s.players[0].hand.length,2);
});

test('Punch and Slap enters mana tapped, skips zero creatures and respects later Genmu',()=>{
 const charged=setup(),manaCard=put(charged,0,'hand',PUNCH);
 charged.phase='charge';
 act(charged,'charge',a=>a.uid===manaCard.uid);
 assert.equal(charged.players[0].mana.find(x=>x.uid===manaCard.uid).tapped,true);
 for(const blocked of [false,true]){
  const s=setup(),source=put(s,0,'hand',PUNCH);
  play(s,source);
  finish(s);
  if(blocked)put(s,1,'battle',GENMU).tapped=true;
  end(s);
  assert.equal(s.players[0].hand.length,0);
  assert.equal(s.g537Delays.length,0);
 }
});
