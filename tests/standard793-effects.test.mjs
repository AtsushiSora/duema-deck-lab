import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-793.json',import.meta.url)));
const MEIDO="dm24ex4-059",HEAT="dm24ex4-051",ZANO="dm24ex4-020",KAISER="dm24ex4-023";
const SMALL="dm01-108",FAIRY="dm24ex4-037",SEED="dmsd20-015",SUGO="dm24ex4-074";
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 793 definitions and alternate prints preserve the canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:793}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:793}));
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
   assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:793}),row.spec);
   assert.equal(registry.get(print.id).id,row.id);
   assert.equal(registry.get(print.id.toLowerCase()).id,row.id);
   assert.equal(refs.find(x=>x.id===print.id.toLowerCase()).image,print.image);
  }
 }
});

const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);
const choices=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const taskIs=(s,op)=>assert.equal(s.decision?.task?.op,op,JSON.stringify(s.decision));
const end=s=>{s.phase='attack';act(s,'endTurn');};
function trigger(s,id,attacker){
 give(s,0,'shields',[id]);
 attack(s,attacker.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields');
 act(s,'useTrigger');
}

test('冥土の絆 grants an opponent power and powered breaker for this turn',()=>{
 const s=setup(),spell=put(s,0,'hand',MEIDO);
 const ally=put(s,0,'battle',SMALL),enemy=put(s,1,'battle',SMALL),base=e.power(enemy,false,s);
 play(s,spell);
 assert.ok(choices(s).includes(ally.uid)&&choices(s).includes(enemy.uid));
 pick(s,enemy.uid);
 assert.equal(e.power(enemy,false,s),base+6000);
 assert.equal(e.effectiveCard(enemy,s).poweredBreaker,true);
 pick(s,null);
 end(s);
 assert.equal(e.power(enemy,false,s),base);
 assert.ok(!e.effectiveCard(enemy,s).poweredBreaker);
});

test('冥土の絆 can skip its buff and destroy the attacking creature via S・トリガー',()=>{
 const s=setup();s.active=1;
 const ally=put(s,0,'battle',SMALL),enemy=put(s,1,'battle',SMALL);
 trigger(s,MEIDO,enemy);
 pick(s,null);
 assert.ok(!choices(s).includes(ally.uid));
 pick(s,enemy.uid);
 assert.ok(has(s,1,'grave',enemy)&&has(s,0,'battle',ally));
});

test('熱血の絆 destroys at 6000 current power and taps all remaining enemies even without a target',()=>{
 for(const matching of [true,false]){
  const s=setup(),spell=put(s,0,'hand',HEAT);
  const ally=put(s,0,'battle',SMALL),enemy=put(s,1,'battle',SMALL),large=put(s,1,'battle',KAISER);
  enemy.powerModifiers=[{amount:(matching?6000:6001)-e.power(enemy,false,s),expires:'end',who:0}];
  play(s,spell);
  pick(s,0);
  if(matching){
   assert.deepEqual(choices(s),[enemy.uid]);
   pick(s,enemy.uid);
  }
  assert.equal(has(s,1,'grave',enemy),matching);
  assert.ok(large.tapped&&!ally.tapped);
  if(!matching)assert.ok(enemy.tapped);
 }
});

test('熱血の絆 S・トリガー puts only an eligible Dragon into play and fights with that Dragon',()=>{
 const s=setup();s.active=1;
 const dragon=put(s,0,'hand',KAISER),wrong=put(s,0,'hand',SMALL),expensive=put(s,0,'hand',ZANO);
 const other=put(s,0,'battle',SMALL),attacker=put(s,1,'battle',SMALL);
 const light=put(s,0,'hand','dm26rp1-S002'),water=put(s,0,'hand','dmr14-038');
 trigger(s,HEAT,attacker);
 pick(s,1);
 assert.deepEqual(new Set(choices(s)),new Set([dragon.uid,light.uid]));
 pick(s,dragon.uid);
 taskIs(s,'g34_FightEnemy240');
 assert.ok(has(s,0,'battle',dragon)&&has(s,0,'hand',wrong)&&has(s,0,'hand',expensive)&&has(s,0,'hand',water));
 assert.equal(e.effectiveCard(dragon,s).blocker,true);
 assert.ok(!e.effectiveCard(other,s).blocker);
 pick(s,attacker.uid);
 assert.ok(has(s,1,'grave',attacker)&&has(s,0,'battle',dragon));
 end(s);
 assert.equal(s.active,0);
 assert.ok(!e.effectiveCard(dragon,s).blocker);
});

test('熱血の絆 may skip the battle and does not fight when the deployment is replaced',()=>{
 for(const replaced of [false,true]){
  const s=setup(),spell=put(s,0,'hand',HEAT),dragon=put(s,0,'hand',KAISER),enemy=put(s,1,'battle',SMALL);
  if(replaced){
   put(s,1,'battle',SUGO);
   s.players[0].enteredThisTurn=2;
  }
  play(s,spell);
  pick(s,1);
  pick(s,dragon.uid);
  if(replaced){
   assert.ok(has(s,0,'mana',dragon));
   assert.ok(!s.decision);
   assert.ok(!e.effectiveCard(dragon,s).blocker);
  }else{
   taskIs(s,'g34_FightEnemy240');
   pick(s,null);
   assert.ok(has(s,0,'battle',dragon));
  }
  assert.ok(has(s,1,'battle',enemy));
 }
});

test('ザノウハウ counts allied Snow Fairy elements, draws up to three and can immediately attack a creature',()=>{
 const s=setup(),x=put(s,0,'hand',ZANO);
 assert.equal(e.summonCost(s,0,e.card(ZANO)),8);
 put(s,0,'battle',FAIRY);
 put(s,0,'battle',SEED);
 put(s,0,'mana',FAIRY);
 put(s,1,'battle',FAIRY);
 const enemy=put(s,1,'battle',SMALL);
 assert.equal(e.summonCost(s,0,e.card(ZANO)),6);
 play(s,x);
 const drawn=s.players[0].hand.length;
 for(let i=0;i<3;i++)pick(s,true);
 assert.equal(s.players[0].hand.length,drawn+3);
 assert.ok(!s.decision);
 assert.equal(e.effectiveCard(x,s).breaker,3);
 assert.equal(e.effectiveCard(x,s).machFighter,true);
 attack(s,x.uid,enemy.uid);
 if(s.decision?.task?.op==='g38_Sycrill')pick(s,null);
 if(s.decision?.type==="block")act(s,"noBlock");
 assert.ok(has(s,1,'grave',enemy),JSON.stringify(s.decision));
 for(let i=0;i<8;i++)put(s,0,'battle',SEED);
 assert.equal(e.summonCost(s,0,e.card(ZANO)),1);
});

test('ザノウハウ can decline all draws and grants Saver for a noncreature Snow Fairy',()=>{
 const s=setup(),x=put(s,0,'hand',ZANO),seed=put(s,0,'battle',SEED),fairy=put(s,0,'battle',FAIRY);
 play(s,x);
 pick(s,null);
 assert.equal(s.players[0].hand.length,0);
 assert.equal(e.effectiveCard(x,s).g793SnowSaver,true);
 assert.equal(e.effectiveCard(fairy,s).g793SnowSaver,true);
 assert.ok(!e.effectiveCard(seed,s).g793SnowSaver);
 s.extTasks=[{op:'g34_ExactMove',p:1,source:HEAT,owner:0,target:seed.uid,to:'grave'}];
 act(s,'toAttack');
 act(s,'replaceUltra',a=>a.uid===fairy.uid);
 assert.ok(has(s,0,'battle',seed)&&has(s,0,'grave',fairy));
});

test('ザノウハウ lets a Snow Fairy in the same destruction batch save it once',()=>{
 let s=setup();
 const x=put(s,0,'battle',ZANO),fairy=put(s,0,'battle',FAIRY),plain=put(s,0,'battle',SMALL);
 const before=e.physicalCards(s).map(x=>x.uid).sort();
 s.extTasks=[{op:'g34_Sweep',p:1,source:HEAT,filter:{creature:true}}];
 act(s,'toAttack');
 assert.equal(s.decision.uid,x.uid);
 s=restore(s);
 act(s,'replaceUltra',a=>a.uid===fairy.uid);
 while(s.decision?.type==='leaveReplace')act(s,'allowLeave');
 assert.ok(has(s,0,'battle',x)&&has(s,0,'grave',fairy)&&has(s,0,'grave',plain));
 assert.deepEqual(e.physicalCards(s).map(x=>x.uid).sort(),before);
});

test('熱血の絆 uses post-break Z Rush power when selecting its S・トリガー destroy target',()=>{
 const s=setup();s.active=1;
 const chakura=put(s,1,'battle','dm26rp1-S002'),other=put(s,1,'battle',SMALL);
 assert.equal(e.power(chakura,false,s),4000);
 trigger(s,HEAT,chakura);
 assert.equal(e.power(chakura,false,s),7500);
 pick(s,0);
 assert.deepEqual(choices(s),[other.uid]);
 pick(s,other.uid);
 assert.ok(has(s,1,'battle',chakura)&&has(s,1,'grave',other));
});

test('ザノウハウ adds a Saver without replacing a Snow Fairy’s printed Saver',()=>{
 const s=setup(),zano=put(s,0,'battle',ZANO),maruru=put(s,0,'battle','dm14-107');
 const earthDragon=data.cards.find(c=>c.type==='creature'&&c.race==='アース・ドラゴン'&&!c.evolution&&!c.ultraSaver&&!c.g571Saver);
 assert.ok(earthDragon);
 const dragon=put(s,0,'battle',earthDragon.id);
 assert.equal(e.effectiveCard(maruru,s).g793SnowSaver,true);
 assert.deepEqual(e.effectiveCard(maruru,s).g571Saver,e.card(maruru).g571Saver);
 s.extTasks=[{op:'g34_ExactMove',p:1,source:HEAT,owner:0,target:dragon.uid,to:'grave'}];
 act(s,'toAttack');
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='replaceUltra').map(a=>a.uid),[maruru.uid]);
 act(s,'replaceUltra',a=>a.uid===maruru.uid);
 assert.ok(has(s,0,'battle',dragon)&&has(s,0,'battle',zano)&&has(s,0,'grave',maruru));
});
