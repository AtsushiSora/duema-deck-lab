import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {shieldCards} from '../dist/shield-state.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const GIGA='dm17-013',DENDEN='dm17-028',KALCHIA='dm17-038',RATIUS='dm32-046';
const NATURE='dm01-108',FIRE='dm01-097',WATER='dm01-080',DARK='dm01-088';
const SPIRAL='dm01-086',HAND='dm01-027',SURFER='dm05-024',EVOLUTION='dm02-024';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));

function field(){
 const s=setup();s.active=0;
 for(const p of [0,1])give(s,p,'deck',Array(24).fill(NATURE));
 return s;
}
function add(s,p,z,id,fields={}){
 const x=Object.assign(inst(id),fields);
 s.players[p][z].push(x);return x;
}
const has=(s,p,z,x)=>s.players[p][z].some(y=>x.uid===y.uid);
const options=s=>s.decision?.choices.map(x=>x.value?.uid??x.value)??[];
const pick=(s,value)=>act(s,'extended',a=>options(s)[a.choice]===value);
const target=(s,x)=>act(s,'effect',a=>a.targets?.some(t=>t.uid===x.uid));

test('the seven official prints resolve to four cards with verified stats, abilities, limits and art',()=>{
 const m=read('tools/support-phase-1262.json'),refs=read('tools/image-reference-prints.json').prints;
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[GIGA,DENDEN,KALCHIA,RATIUS]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[['promoy4-035',GIGA],['dmc42-047',DENDEN],['dmx22a-029',DENDEN]]);
 for(const row of [...m.cards,...m.printAliases]){
  const {id,canonicalId=id,name,faces:[f],image}=row,c=e.card(canonicalId);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1262}),row.spec);
  const unknown=structuredClone({...row,status:'complete'});
  unknown.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:1262}));
  assert.deepEqual(registry.resolveRows([{id,count:1}]),[{id:canonicalId,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[canonicalId]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,m.regulationVerification.limits[id]]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  if(id===canonicalId){
   assert.equal(CARD_IMAGES[id],image);
   assert.equal(c.text,f.abilityText);
  }
  assert.ok(refs.some(x=>x.id===id&&x.canonicalId===canonicalId&&x.image===image));
 }
});

for(const id of [GIGA,DENDEN])test(id+' remains a legal target and stays against enemy destruction, bounce and mana movement',()=>{
 for(const spell of [SPIRAL,HAND,'dmbd09-011']){
  let s=field();
  const x=add(s,1,'battle',id),deck=s.players[0].deck.length;
  cast(s,spell);
  s=JSON.parse(JSON.stringify(s));
  if(spell==='dmbd09-011')pick(s,x.uid);else target(s,x);
  drain(s);
  assert.ok(has(s,1,'battle',x));
  assert.ok(s.log.some(x=>x.kind==='stay577'||x.text?.includes('とどま')));
  if(spell==='dmbd09-011')assert.equal(s.players[0].deck.length,deck-1);
 }
});

test('own spells, opposing creature abilities, combat and state-based destruction can remove both creatures',()=>{
 for(const id of [GIGA,DENDEN]){
  for(const spell of [SPIRAL,SURFER]){
   const s=field(),p=spell===SPIRAL?0:1,x=add(s,p,'battle',id);
   cast(s,spell);target(s,x);drain(s);
   assert.ok(has(s,p,'hand',x));
  }
  for(const spell of ['dmrp15-072','dmr14-030']){
   const s=field(),x=add(s,1,'battle',id);
   const fighter=add(s,0,'battle',NATURE);
   cast(s,spell);
   if(spell==='dmr14-030')pick(s,fighter.uid);
   pick(s,x.uid);drain(s);
   assert.ok(has(s,1,'grave',x));
  }
  const s=field(),x=add(s,1,'battle',id,{tapped:true}),fighter=add(s,0,'battle','dm05-s04');
  attack(s,fighter.uid,x.uid);act(s,'noBlock');drain(s);
  assert.ok(has(s,1,'grave',x));
 }
});

test('opposing caster protection applies when the opponent uses the protected player’s own spell (QA35384)',()=>{
 const s=field(),x=add(s,1,'battle',DENDEN),spell=add(s,1,'hand',SPIRAL),base=add(s,0,'battle',WATER);
 const violet=add(s,0,'hand','dm26ex1-N015');
 act(s,'play',a=>a.uid===violet.uid);
 act(s,'evolve',a=>a.baseUid===base.uid);
 pick(s,true);
 target(s,x);drain(s);
 assert.ok(has(s,1,'battle',x));
 assert.ok(has(s,1,'grave',spell));
});

test('Kalchia inspects only the selected shield and may decline without moving a card',()=>{
 const s=field(),hidden='dm25rp3-S09',shield=add(s,0,'shields',hidden);
 cast(s,KALCHIA);
 pick(s,shield.uid);
 assert.deepEqual(s.decision.task.g585Peek.map(x=>x.id),[hidden]);
 assert.ok(!JSON.stringify(s.log).includes(hidden));
 assert.ok(!JSON.stringify(e.observation(s,1)).includes(hidden));
 pick(s,null);
 assert.ok(has(s,0,'shields',shield));
 assert.equal(s.players[0].deck.length,24);
});

function summonEvolution(s,p){
 s.active=p;
 const base=add(s,p,'battle',WATER);
 cast(s,EVOLUTION);
 act(s,'evolve',a=>a.baseUid===base.uid);
}
const ids=rows=>rows.map(x=>x.uid);
for(const id of [KALCHIA,RATIUS])test(id+' adds one face-down shield and orders every card from the old stack (official Q&A)',()=>{
 let s=field();
 const old=add(s,0,'shields',WATER,{shieldStack:[inst(DARK),inst(FIRE)]}),stack=shieldCards(old);
 const oldCount=s.players[0].shields.length,top=s.players[0].deck[0];
 if(id===KALCHIA)cast(s,id);else {add(s,0,'battle',id);summonEvolution(s,0);}
 pick(s,old.uid);
 assert.deepEqual(s.decision.task.g585Peek.map(x=>x.id),[WATER,DARK,FIRE]);
 pick(s,true);
 pick(s,stack[2].uid);
 s=JSON.parse(JSON.stringify(s));
 pick(s,stack[1].uid);
 assert.deepEqual(ids(s.players[0].deck.slice(0,3)),[stack[2].uid,stack[1].uid,stack[0].uid]);
 assert.equal(s.players[0].shields.length,oldCount);
 const incoming=s.players[0].shields.find(x=>x.uid===top.uid);
 assert.ok(incoming&&!incoming.faceUp&&!incoming.shieldStack);
 assert.ok(stack.every(x=>!has(s,0,'shields',x)));
 assert.equal(e.physicalCards(s).filter(x=>x.uid===stack[0].uid).length,1);
});

test('without a shield to see, the optional new shield can still be added (rule 101.3)',()=>{
 for(const id of [KALCHIA,RATIUS]){
  const s=field(),top=s.players[0].deck[0];
  s.players[0].shields=[];
  if(id===KALCHIA)cast(s,id);else {add(s,0,'battle',id);summonEvolution(s,0);}
  assert.deepEqual(options(s),[true,null]);
  pick(s,true);
  assert.deepEqual(ids(s.players[0].shields),[top.uid]);
  assert.equal(s.players[0].deck.length,23);
 }
});

test('a face-up G Castle is a valid shield to see and goes to grave instead of deck (rule 822.3)',()=>{
 const s=field(),castle=add(s,0,'shields','dm26rp1-072',{faceUp:true});
 const top=s.players[0].deck[0],next=s.players[0].deck[1];
 cast(s,KALCHIA);pick(s,castle.uid);pick(s,true);
 assert.ok(has(s,0,'shields',top)&&has(s,0,'grave',castle));
 assert.equal(s.players[0].deck[0].uid,next.uid);
});

test('Kalchia loses immediately if the new shield is the last card of the deck (QA35366)',()=>{
 const s=field(),old=s.players[0].shields[0],top=s.players[0].deck[0];
 s.players[0].deck=[top];
 cast(s,KALCHIA);
 pick(s,old.uid);pick(s,true);
 assert.equal(s.winner,1);
 assert.ok(has(s,0,'shields',old)&&has(s,0,'shields',top));
 assert.equal(s.players[0].deck.length,0);
});

test('a replacement of the incoming shield still allows moving the shield that was seen (rule 101.3a)',()=>{
 const s=field(),shield=s.players[0].shields[0],top=s.players[0].deck[0];
 add(s,1,'battle','dm22ex1-086');
 cast(s,KALCHIA);pick(s,shield.uid);pick(s,true);
 assert.ok(has(s,0,'grave',top));
 assert.equal(s.players[0].deck[0].uid,shield.uid);
 assert.ok(!has(s,0,'shields',shield));
});

test('a prohibition on placing the new shield still allows moving the shield that was seen (QA40275)',()=>{
 const s=field(),old=s.players[0].shields[0],top=s.players[0].deck[0],n=s.players[0].shields.length;
 add(s,1,'battle','dmrp22-037');
 cast(s,KALCHIA);pick(s,old.uid);
 assert.deepEqual(options(s),[true,null]);
 pick(s,true);
 assert.deepEqual(ids(s.players[0].deck.slice(0,2)),[old.uid,top.uid]);
 assert.equal(s.players[0].shields.length,n-1);
});

test('Ratius does not trigger for ordinary summons or the opponent’s evolution summon',()=>{
 for(const target of ['ordinary','opponent']){
  const s=field();
  add(s,0,'battle',RATIUS);
  if(target==='ordinary')cast(s,NATURE);
  else summonEvolution(s,1);
  assert.notEqual(s.decision?.task?.op,'g34_Peek585');
 }
});
