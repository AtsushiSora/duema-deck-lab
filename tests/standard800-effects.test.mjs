import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-800.json',import.meta.url)));
const FLAME="dm24-057",RAJA="dm24-044",SNIPER="dm24-053";
const FIRE="dm01-097",NATURE="dm01-108",DARK="dm01-090",LIGHT="dm01-075",DARK_FIRE="dmrp13-090",WATER_NATURE="dm23rp3-007";
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 800 definitions and alternate prints preserve the canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:800}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:800}));
  assert.deepEqual(registry.cards.filter(c=>canonicalCardName(c.name)===canonicalCardName(row.name)).map(c=>c.id),[row.id]);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[key],value);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
  const prints=printAliases.filter(x=>x.canonicalId===row.id);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:prints[0]?.id??row.id,count:1});
  deck.cards=registry.resolveRows(deck.cards);
  assert.equal(deck.cards.at(-1).id,row.id);
  assert.deepEqual(e.validateDeck(deck),[]);
  for(const print of prints){
   assert.equal(regulationVerification.limits[print.id],regulationVerification.limits[row.id]);
   assert.equal(print.verification.facesMatched,true);
   assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:800}),row.spec);
   assert.equal(registry.get(print.id).id,row.id);
   assert.equal(registry.get(print.id.toLowerCase()).id,row.id);
   assert.equal(refs.find(x=>x.id===print.id.toLowerCase()).image,print.image);
  }
 }
});

const play=(s,x)=>act(s,'play',a=>a.uid===x.uid&&!a.alternative);
const choices=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const task=(s,op)=>assert.equal(s.decision?.task?.op,op,JSON.stringify(s.decision));
const finish=s=>{if(s.decision?.type==='block')act(s,'noBlock');drain(s);};
const payment=(s,first,second)=>{
 task(s,'g34_TapManaColors698');
 assert.ok(choices(s).includes(first.uid));
 pick(s,first.uid);
 assert.ok(!first.tapped&&!second.tapped);
 assert.ok(!choices(s).includes(first.uid));
 pick(s,second.uid);
 assert.ok(first.tapped&&second.tapped);
};

for(const [id,mono,multi] of [[FLAME,FIRE,DARK_FIRE],[RAJA,NATURE,WATER_NATURE],[SNIPER,DARK,DARK_FIRE]]){
 test(e.card(id).name+' requires two distinct untapped cards of the right civilization',()=>{
  const s=setup();s.active=1;
  const source=put(s,1,'battle',id),target=put(s,0,'battle','dm01-084');
  put(s,0,'hand',DARK);
  give(s,1,'mana',[mono,multi,LIGHT,mono,mono]);
  const [a,b,wrong,tapped,hidden]=s.players[1].mana;
  tapped.tapped=true;hidden.faceDown=true;
  attack(s,source.uid);
  assert.deepEqual(choices(s),[a.uid,b.uid,null]);
  payment(s,a,b);
  assert.ok(!wrong.tapped&&!hidden.tapped);
  if(id===FLAME)pick(s,target.uid);
  if(id===SNIPER)pick(s,s.players[0].hand[0].uid);
  finish(s);
 });
 test(e.card(id).name+' can decline after one choice and cannot partially pay when only one card is eligible',()=>{
  for(const shortage of [true,false]){
   const s=setup(),source=put(s,0,'battle',id),blocker=put(s,1,'battle','dm01-084'),victim=put(s,1,'hand',DARK);
   give(s,0,'mana',[mono,multi,LIGHT]);
   const [a,b]=s.players[0].mana;
   b.tapped=shortage;
   attack(s,source.uid);
   if(shortage)assert.notEqual(s.decision?.task?.op,'g34_TapManaColors698');
   else {pick(s,a.uid);pick(s,null);}
   assert.ok(!a.tapped);
   assert.equal(b.tapped,shortage);
   assert.ok(has(s,1,'battle',blocker)&&has(s,1,'hand',victim));
   assert.equal(e.power(source,false,s),e.card(id).power);
   finish(s);
  }
 });
}

test('Flame destroys one of the enemy’s current blockers before the blocking window',()=>{
 const s=setup(),source=put(s,0,'battle',FLAME),other=put(s,1,'battle',LIGHT);
 const native=put(s,1,'battle','dm01-084'),granted=put(s,1,'battle',LIGHT);
 const friendly=put(s,0,'battle','dm01-084');
 granted.g34Grants=[{turn:s.turn,blocker:true}];
 give(s,0,'mana',[FIRE,FIRE]);
 attack(s,source.uid);
 payment(s,...s.players[0].mana);
 task(s,'g34_Target');
 assert.deepEqual(choices(s),[native.uid,granted.uid]);
 pick(s,granted.uid);
 assert.ok(has(s,1,'grave',granted));
 assert.ok(has(s,1,'battle',other)&&has(s,0,'battle',friendly));
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===granted.uid));
 finish(s);
});

test('Rajasta uses the boost for a creature battle and loses it at the end of the turn',()=>{
 const s=setup(),source=put(s,0,'battle',RAJA),enemy=put(s,1,'battle','dm01-042');
 enemy.tapped=true;
 give(s,0,'mana',[NATURE,NATURE]);
 attack(s,source.uid,enemy.uid);
 payment(s,...s.players[0].mana);
 assert.equal(e.power(source,true,s),4500);
 finish(s);
 assert.ok(has(s,1,'grave',enemy)&&has(s,0,'battle',source));
 assert.equal(e.power(source,false,s),4500);
 act(s,'endTurn');
 drain(s);
 assert.equal(e.power(source,false,s),1500);
});

test('Rajasta can tap cards whose civilizations were added by a mana aura',()=>{
 const s=setup(),source=put(s,0,'battle',RAJA);
 put(s,0,'battle','dm13-015');
 give(s,0,'mana',[FIRE,LIGHT]);
 attack(s,source.uid);
 payment(s,...s.players[0].mana);
 assert.equal(e.power(source,false,s),4500);
 finish(s);
});

test('Mimizook sees the opposing hand only after paying and discards the selected physical card',()=>{
 let s=setup();const source=put(s,0,'battle',SNIPER),first=put(s,1,'hand',FIRE),second=put(s,1,'hand',FIRE);
 give(s,0,'mana',[DARK,DARK]);
 const [a,b]=s.players[0].mana;
 attack(s,source.uid);
 assert.ok(s.decision.choices.every(x=>x.cardId!==FIRE));
 pick(s,a.uid);
 s=JSON.parse(JSON.stringify(s));
 pick(s,b.uid);
 task(s,'s6Inspect');
 assert.equal(s.decision.player,0);
 assert.deepEqual(choices(s),[first.uid,second.uid]);
 pick(s,second.uid);
 finish(s);
 assert.ok(has(s,1,'hand',first)&&has(s,1,'grave',second));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,2);
});
