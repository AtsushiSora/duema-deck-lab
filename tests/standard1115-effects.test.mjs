import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const SWORD='dm25ex2-082',TESTA='dm25ex2-095',STRIE='dm25ex2-098';
const KNIGHT_SEED='dm22ex2-067',STEAM_KNIGHT='dm25rp3-065',NIGHTMARE='dmbd10-009';
const WATER='dm01-083',DARK='dm01-090',FIRE='dm01-097',NATURE='dm01-108';
const PSYCHIC='dm36-s07',TRIGGER='dm01-094';
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>x.uid===y.uid);
const values=s=>s.decision?.choices?.map(x=>x.value)??[];
const pick=(s,value)=>act(s,'extended',a=>(values(s)[a.choice]?.uid??values(s)[a.choice])===value);

function add(s,p,zone,id,props={}){
 const x={...inst(id),...props};
 s.players[p][zone].push(x);
 return x;
}

function play(s,id,match=()=>true){
 const x=add(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&match(a));
 return x;
}

test('three official definitions have distinct canonical IDs and reject unrecognized abilities',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-1115.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 for(const row of manifest.cards){
  const detail=details.cards.find(d=>d.id===row.id);
  assert.deepEqual(detail.faces,row.faces);
  assert.deepEqual(standardCardSpec(detail,{phase:1115}),row.spec);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[row.id]);
  assert.deepEqual(registry.resolveRows([{id:row.id,count:1}]),[{id:row.id,count:1}]);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(e.card(row.id).limit,manifest.regulationVerification.limits[row.id]);
  const changed=structuredClone(detail);
  changed.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(changed,{phase:1115}));
 }
});

test('Eternal Sword returns an opponent seed, then offers a concealed hand choice even without Knights',()=>{
 const s=setup(),seed=add(s,1,'battle',KNIGHT_SEED),oldHand=add(s,1,'hand',FIRE);
 const sword=play(s,SWORD);
 pick(s,seed.uid);
 assert.ok(has(s,1,'hand',seed));
 assert.deepEqual(s.decision.choices.map(x=>[x.label,x.value,x.cardId]),[
  ['裏向きの手札 1',0,undefined],['裏向きの手札 2',1,undefined]
 ]);
 pick(s,1);
 assert.ok(has(s,1,'grave',seed)&&has(s,1,'hand',oldHand)&&has(s,0,'grave',sword));
 assert.equal(s.decision,null);
});

test('Eternal Sword repeats a complete bounce and discard per Knight without casting again',()=>{
 let s=setup();
 add(s,0,'battle',KNIGHT_SEED);
 add(s,0,'battle',STEAM_KNIGHT);
 add(s,0,'battle',NIGHTMARE,{faceDown:true});
 const sealed=add(s,0,'battle',NIGHTMARE,{sealed:true});
 add(s,0,'seals',NATURE,{faceDown:true,sealOf:sealed.uid});
 add(s,1,'battle',NIGHTMARE);
 const enemies=[WATER,FIRE,NATURE].map(id=>add(s,1,'battle',id));
 const sword=play(s,SWORD);
 pick(s,enemies[0].uid);
 pick(s,0);
 assert.deepEqual(values(s),[0,1,2]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,2);
 for(const enemy of enemies.slice(1)){
  assert.ok(has(s,1,'battle',enemy));
  pick(s,enemy.uid);
  assert.ok(has(s,1,'hand',enemy));
  pick(s,0);
  assert.ok(has(s,1,'grave',enemy));
 }
 assert.ok(has(s,0,'grave',sword));
 assert.equal(s.log.filter(x=>x.type==='play'&&x.cardId===SWORD).length,1);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,5);
});

test('Eternal Sword discards with no return target and can decline all extra uses',()=>{
 const s=setup();
 add(s,0,'battle',NIGHTMARE);
 const first=add(s,1,'hand',WATER),second=add(s,1,'hand',DARK);
 play(s,SWORD);
 pick(s,0);
 assert.ok(has(s,1,'grave',first));
 assert.deepEqual(values(s),[0,1]);
 pick(s,0);
 assert.ok(has(s,1,'hand',second));
 assert.equal(s.decision,null);
});

test('Eternal Sword returns a controlled element to its owner before discarding from the opponent',()=>{
 const s=setup(),borrowed=add(s,1,'battle',WATER,{cardOwner:0}),hand=add(s,1,'hand',DARK);
 play(s,SWORD);
 pick(s,borrowed.uid);
 assert.ok(has(s,0,'hand',borrowed));
 pick(s,0);
 assert.ok(has(s,1,'grave',hand));
});

test('Testa has haste and breaks two shields at seven opposing extra cards, three at eight',()=>{
 for(const count of [0,7,8]){
  const s=setup();
  s.format='advance';
  give(s,1,'extra',Array(count).fill(PSYCHIC));
  add(s,0,'extra',PSYCHIC);
  const testa=play(s,TESTA);
  assert.equal(e.power(testa,false,s),4000+count*1000);
  if(count){
   const returned=s.players[1].extra.pop();
   assert.equal(e.power(testa,false,s),3000+count*1000);
   s.players[1].extra.push(returned);
  }
  act(s,'toAttack');
  act(s,'attack',a=>a.uid===testa.uid&&a.target==='player');
  drain(s);
  assert.equal(s.players[1].shields.length,5-(count===8?3:count===7?2:1));
 }
});

test('Strie uses the ordinary summon when only its own extra zone has cards',()=>{
 const s=setup(),shield=add(s,0,'shields',TRIGGER);
 add(s,0,'extra',PSYCHIC);
 const strie=add(s,0,'hand',STRIE);
 const actions=e.getLegalActions(s).filter(a=>a.kind==='play'&&a.uid===strie.uid);
 assert.deepEqual(actions.map(a=>a.cost),[2]);
 e.step(s,actions[0]);
 assert.ok(has(s,0,'battle',strie));
 pick(s,shield.uid);
 assert.ok(has(s,0,'hand',shield));
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='useTrigger'&&a.uid===shield.uid));
});

test('Strie alternative requires an opposing extra card and one usable Fire mana',()=>{
 let s=setup();
 s.format='advance';
 const strie=add(s,0,'hand',STRIE);
 const psychic=add(s,1,'battle',PSYCHIC);
 play(s,SWORD);
 pick(s,psychic.uid);
 assert.ok(has(s,1,'extra',psychic));
 give(s,0,'mana',[WATER]);
 const actions=()=>e.getLegalActions(s).filter(a=>a.kind==='play'&&a.uid===strie.uid);
 assert.deepEqual(actions(),[]);
 give(s,0,'mana',[FIRE,WATER]);
 const [fire,water]=s.players[0].mana;
 assert.deepEqual(actions().map(a=>[a.cost,a.role]),[[2,undefined],[1,'paidAlt568']]);
 e.step(s,actions()[1],{manualMana:true});
 assert.equal(s.decision.cost,1);
 assert.deepEqual(s.decision.colors,['火']);
 s=JSON.parse(JSON.stringify(s));
 act(s,'selectMana',a=>a.uid===fire.uid);
 assert.equal(e.manaSelectionStatus(s.decision).valid,true);
 act(s,'confirmMana');
 assert.ok(has(s,0,'battle',strie));
 assert.deepEqual(s.players[0].mana.filter(x=>x.tapped).map(x=>x.uid),[fire.uid]);
 assert.ok(has(s,0,'mana',water));
 pick(s,s.players[0].shields[0].uid);
 assert.equal(s.players[0].shields.length,4);
 assert.equal(e.card(strie).cost,2);
});
