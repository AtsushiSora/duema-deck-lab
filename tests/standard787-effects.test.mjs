import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-787.json',import.meta.url)));
const NIGHT="dm24ex4-069",ILLUSION="dm24ex4-050",LUCK="dm24ex4-055";
const BODY="dm01-108",FIRE="dm01-097",WATER="dm01-083",DARK="dm01-090";
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 787 definitions and alternate prints preserve the canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:787}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:787}));
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
   assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:787}),row.spec);
   assert.equal(registry.get(print.id).id,row.id);
   assert.equal(registry.get(print.id.toLowerCase()).id,row.id);
   assert.equal(refs.find(x=>x.id===print.id.toLowerCase()).image,print.image);
  }
 }
});

const BAT='dm24ex4-092',SITO='dmrp16-062',ANGEL_SEED='dm25ex1-051',DEMON='dm01-s06';
const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);
const choices=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const canAttack=(s,x)=>e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid);

test('Night distinguishes the shield owners, honors summoning sickness and resets next turn',()=>{
 let s=setup();
 const night=put(s,0,'battle',NIGHT),newNight=put(s,0,'battle',NIGHT),bat=put(s,0,'hand',BAT),attacker=put(s,0,'battle',FIRE);
 newNight.entered=s.turn;
 s.phase='attack';
 assert.ok(!canAttack(s,night));
 attack(s,attacker.uid);
 act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields');
 assert.ok(!canAttack(s,night));
 s.phase='main';
 play(s,bat);
 pick(s,s.players[0].shields[0].uid);
 s=restore(s);
 s.phase='attack';
 assert.ok(canAttack(s,night)&&!canAttack(s,newNight));
 act(s,'endTurn');
 s.phase='attack';
 act(s,'endTurn');
 s.phase='attack';
 assert.ok(!canAttack(s,night)&&!canAttack(s,newNight));
});

test('Night can attack after a single shield card is exchanged without losing a shield group',()=>{
 const s=setup(),night=put(s,0,'battle',NIGHT),sito=put(s,0,'hand',SITO);
 const shield=s.players[0].shields[0],layer=inst(BODY),count=s.players[0].shields.length;
 shield.shieldStack=[layer];
 play(s,sito);
 pick(s,layer.uid);
 pick(s,true);
 assert.equal(s.players[0].shields.length,count);
 assert.equal(s.players[0].deck[0].uid,layer.uid);
 s.phase='attack';
 assert.ok(canAttack(s,night));
});

test('Night can attack while its printed restriction is ignored',()=>{
 const s=setup(),night=put(s,0,'battle',NIGHT);
 night.g35Ignored=s.turn;
 s.phase='attack';
 assert.ok(canAttack(s,night));
});

test('Illusion deploys a light noncreature and a dark Demon Command sequentially',()=>{
 let s=setup();
 const spell=put(s,0,'hand',ILLUSION),seed=put(s,0,'hand',ANGEL_SEED),wrongOrigin=put(s,0,'hand',DEMON);
 const demon=put(s,0,'grave',DEMON),wrongColor=put(s,0,'grave','dm24rp4-S02'),overCost=put(s,0,'grave','dm03-s03');
 play(s,spell);
 assert.deepEqual(choices(s),[seed.uid,null]);
 pick(s,seed.uid);
 assert.ok(has(s,0,'battle',seed)&&!e.isCreature(s,seed));
 assert.deepEqual(choices(s),[demon.uid,null]);
 s=restore(s);
 pick(s,demon.uid);
 assert.ok(has(s,0,'battle',demon)&&has(s,0,'grave',spell));
 assert.ok(has(s,0,'hand',wrongOrigin)&&has(s,0,'grave',wrongColor)&&has(s,0,'grave',overCost));
});

test('Illusion can skip its first deployment and still resolve its second as an S-Trigger',()=>{
 const s=setup(),attacker=put(s,1,'battle',FIRE);
 const seed=put(s,0,'hand',ANGEL_SEED),demon=put(s,0,'grave',DEMON);
 give(s,0,'shields',[ILLUSION]);
 s.active=1;
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 pick(s,null);
 assert.deepEqual(choices(s),[demon.uid,null]);
 pick(s,demon.uid);
 assert.ok(has(s,0,'hand',seed)&&has(s,0,'battle',demon));
 assert.ok(s.players[0].mana.every(x=>!x.tapped));
});

for(const n of [0,1,2])test('Luck bottoms only the chosen cards in order and draws one more: '+n,()=>{
 let s=setup();
 const spell=put(s,0,'hand',LUCK),a=put(s,0,'hand',BODY),b=put(s,0,'hand',WATER),c=put(s,0,'hand',DARK);
 const old=s.players[0].deck.map(x=>x.uid),chosen=[c.uid,a.uid].slice(0,n);
 play(s,spell);
 pick(s,0);
 for(const uid of chosen){
  pick(s,uid);
  s=restore(s);
 }
 if(n<2)pick(s,null);
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),[...old.slice(n+1),...chosen]);
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),[...[a,b,c].map(x=>x.uid).filter(uid=>!chosen.includes(uid)),...old.slice(0,n+1)]);
 assert.ok(has(s,0,'grave',spell));
});

test('Luck can bounce only an opposing creature as an S-Trigger',()=>{
 const s=setup(),attacker=put(s,1,'battle',FIRE),ally=put(s,0,'battle',BODY),seed=put(s,1,'battle',ANGEL_SEED);
 const deck=s.players[0].deck.length;
 give(s,0,'shields',[LUCK]);
 s.active=1;
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 pick(s,1);
 assert.deepEqual(choices(s),[attacker.uid]);
 pick(s,attacker.uid);
 assert.ok(has(s,1,'hand',attacker)&&has(s,0,'battle',ally)&&has(s,1,'battle',seed));
 assert.equal(s.players[0].deck.length,deck);
});
