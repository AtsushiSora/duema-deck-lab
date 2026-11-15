import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const TEE='dmrp12-008',BAK='dmrp03-075',JITAN='dmrp14-010',APP='dmrp01-085',EVO='dm02-s05';
const HAND='dm01-027',SPIRAL='dm01-086',FIRE='dm01-097',WYVERN='dm01-007',DISCARD='dm01-094';
const add=(s,p,z,id,props={})=>{const x=Object.assign(inst(id),props);s.players[p][z].push(x);return x;};
const pick=(s,value)=>act(s,'extended',a=>{
 const v=s.decision.choices[a.choice].value;
 return (v?.uid??v)===value;
});
const choose=(s,x)=>act(s,'effect',a=>a.targets.some(y=>y.uid===x.uid));

test('Teezoris has one official print and the original card ID',()=>{
 const {cards:[row],printAliases}=JSON.parse(readFileSync(new URL('../tools/support-phase-1345.json',import.meta.url)));
 const catalogue=createCatalogue(snapshot,data.cards,details),c=e.card(TEE);
 assert.equal(row.id,TEE);
 assert.deepEqual(printAliases,[]);
 assert.deepEqual(catalogue.resolveRows([{id:TEE,count:1}]),[{id:TEE,count:1}]);
 assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[TEE]);
 assert.equal(CARD_IMAGES[TEE],row.image);
 assert.deepEqual([c.cost,c.power,c.race,c.civ,c.limit,c.breaker],[6,7000,'ドラゴンギルド/マフィ・ギャング','闇',4,2]);
});

test('Teezoris offers the full two-mana discount and destroys a creature only after taking it',()=>{
 for(const amount of [0,2]){
  const s=setup(),ally=add(s,0,'battle',FIRE);
  cast(s,TEE);
  assert.equal(s.decision.task.op,'g34_PayCount499');
  assert.deepEqual(s.decision.choices.map(x=>x.value),[2,0,false]);
  pick(s,amount);
  assert.equal(s.players[0].mana.filter(x=>x.tapped).length,6-amount);
  if(amount)pick(s,ally.uid);
  assert.equal(s.players[0].grave.includes(ally),!!amount);
  assert.equal(s.players[0].battle.includes(ally),!amount);
  assert.ok(s.players[0].battle.some(x=>x.cardId===TEE));
 }
});

test('two Teezoris still cause only two triggers when Bombard is destroyed in battle (QA33064)',()=>{
 const s=setup(),bak=add(s,0,'battle',BAK),target=add(s,1,'battle',WYVERN);
 add(s,0,'battle',TEE);add(s,0,'battle',TEE);
 s.active=1;
 cast(s,HAND);choose(s,bak);
 assert.equal(s.decision.type,'effectOrder');
 assert.equal(s.pendingEffects.filter(x=>x.source===BAK).length,2);
 act(s,'orderEffect');pick(s,target.uid);pick(s,target.uid);
 assert.equal(e.power(target,false,s),3000);
});

test('Bombard discarded from hand or removed from under an evolution triggers once (QA33064)',()=>{
 for(const origin of ['hand','under']){
  const s=setup(),target=add(s,1,'battle',WYVERN);
  add(s,0,'battle',TEE);
  s.active=1;
  if(origin==='hand'){
   give(s,0,'hand',[BAK]);
   cast(s,DISCARD);
  }else{
   const host=add(s,0,'battle',EVO,{under:[inst(BAK)]});
   cast(s,HAND);choose(s,host);
  }
  assert.notEqual(s.decision?.type,'effectOrder');
  pick(s,target.uid);
  assert.equal(s.decision,null);
  assert.equal(e.power(target,false,s),5000);
 }
});

test('the allied creature’s death ability and another creature’s bounce watcher both trigger twice',()=>{
 for(const mode of ['destroy','bounce']){
  const s=setup(),ally=add(s,0,'battle',mode==='destroy'?APP:FIRE);
  add(s,0,'battle',TEE);
  if(mode==='bounce')add(s,0,'battle',JITAN);
  s.active=1;
  const before=s.players[0].deck.length;
  cast(s,mode==='destroy'?HAND:SPIRAL);choose(s,ally);
  assert.equal(s.decision.type,'effectOrder');
  assert.equal(s.pendingEffects.length,2);
  drain(s);
  assert.equal(s.players[0].deck.length,before-2);
 }
});
