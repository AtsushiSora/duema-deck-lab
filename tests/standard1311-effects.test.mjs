import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,cast,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';

const INFINITY='dmc45-007',HARMEE='dmrp21-054',GRAVITY='promoy4-002';
const BASIC='dm01-108',SAMURAI='dm36-103',DRAGON_SEED='dm25ex1-054',DRAGON_FIELD='dmex12-011';
const LARGE_DRAGON='dmx16-001',GEAR='dm28-033',CHEAP_GEAR='dm14-110',NO_REDUCTION='dmrp22-027';
const EX_LIFE_DRAGON='dmsd18-008',JACK='dmbd01-008',CELESTIAL_FRAME='dm23ex3-069';
const DEMON='dm01-027',SPELL='dm01-052',SEED='dmsd20-015';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url)));
const value=c=>c.value?.uid??c.value;
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const offer=s=>assert.equal(s.decision?.task?.op,'g34_Offer');
function field(){
 const s=setup();
 s.active=0;
 for(const p of [0,1])give(s,p,'deck',Array(24).fill(BASIC));
 return s;
}
function add(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
function destroy(s,by,target){
 s.active=by;
 s.phase='main';
 cast(s,DEMON);
 act(s,'effect',a=>a.targets.some(x=>x.uid===target.uid));
}

test('six official prints resolve to three unique playable names and preserve the same abilities',()=>{
 const m=read('tools/support-phase-1311.json'),registry=createCatalogue(snapshot,data.cards,details);
 const {prints}=read('tools/image-reference-prints.json');
 assert.deepEqual(m.cards.map(c=>c.id),[INFINITY,HARMEE,GRAVITY]);
 assert.deepEqual(m.printAliases.map(c=>c.id),['dmc49-005','promoy6-041','promoy6-042']);
 for(const {id,canonicalId=id,name,image,source,faces,spec} of [...m.cards,...m.printAliases]){
  const c=e.card(canonicalId),f=faces[0];
  assert.deepEqual(standardCardSpec({id,name,faces,status:'complete'},{phase:1311}),spec);
  assert.deepEqual(prints.find(x=>x.id===id),{id,canonicalId,name,image,source});
  assert.deepEqual(registry.resolveRows([{id,count:1}]),[{id:canonicalId,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[canonicalId]);
  assert.deepEqual([c.type,c.cost,c.power,c.race,c.civilizations,c.limit,e.manaValue(c)],
   ['creature',f.cost,Number.parseInt(f.powerText,10),f.race,f.civilizations,4,1]);
  for(const [k,v] of Object.entries(spec))assert.deepEqual(c[k],v);
  if(id===canonicalId)assert.equal(CARD_IMAGES[id],image);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id,count:1});
  assert.deepEqual(e.validateDeck({...deck,cards:registry.resolveRows(deck.cards)}),[]);
 }
});

for(const topId of [SAMURAI,GRAVITY,DRAGON_SEED])test('Infinity may reveal and must deploy an eligible top card '+topId,()=>{
 let s=field();
 add(s,0,'battle',INFINITY);
 const dragon=add(s,0,'battle',GRAVITY),top=inst(topId);
 s.players[0].deck.unshift(top);
 const manaBefore=s.players[0].mana.filter(x=>x.tapped).length;
 destroy(s,1,dragon);
 offer(s);
 s=JSON.parse(JSON.stringify(s));
 pick(s,true);
 drain(s);
 assert.ok(has(s,0,'battle',top)&&has(s,0,'grave',dragon));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,manaBefore);
 assert.ok(s.log.some(x=>x.type==='reveal'&&x.cardId===INFINITY));
});

for(const [topId,accept] of [[LARGE_DRAGON,true],[GEAR,true],[GRAVITY,false]])test('Infinity leaves the top card in place when it does not enter: '+topId+' '+accept,()=>{
 const s=field(),infinity=add(s,0,'battle',INFINITY),top=inst(topId);
 s.players[0].deck.unshift(top);
 destroy(s,1,infinity);
 offer(s);
 pick(s,accept?true:null);
 drain(s);
 assert.equal(s.players[0].deck[0].uid,top.uid);
 assert.ok(has(s,0,'grave',infinity));
 assert.equal(s.log.some(x=>x.type==='reveal'&&x.cardId===INFINITY),accept);
});

test('Infinity triggers when its controller’s Dragon field is destroyed',()=>{
 const s=field();
 add(s,0,'battle',INFINITY);
 const dragon=add(s,0,'battle',DRAGON_FIELD),top=inst(GRAVITY);
 s.players[0].deck.unshift(top);
 s.active=1;
 cast(s,CELESTIAL_FRAME);
 pick(s,dragon.uid);
 assert.equal(s.decision?.task?.op,'g34_ManaDown426');
 pick(s,null);
 offer(s);
 pick(s,true);
 drain(s);
 assert.ok(has(s,0,'grave',dragon)&&has(s,0,'battle',top));
});

for(const underCreature of [false,true])test('Infinity distinguishes a destroyed Dragon field from an evolution layer: '+underCreature,()=>{
 const s=field();
 add(s,0,'battle',INFINITY);
 const dragon=inst(DRAGON_FIELD);
 if(underCreature)add(s,0,'battle','dm22ex1-007',{under:[dragon]});
 else s.players[0].battle.push(dragon);
 s.active=1;
 cast(s,JACK);
 pick(s,dragon.uid);
 assert.ok(has(s,0,'grave',dragon));
 if(underCreature)assert.equal(s.decision,null);
 else offer(s);
});

test('Infinity does not trigger for a replaced destruction, an ordinary ally, or an enemy Dragon',()=>{
 const s=field();
 add(s,0,'battle',INFINITY);
 const ordinary=add(s,0,'battle',BASIC),opponent=add(s,1,'battle',GRAVITY);
 cast(s,EX_LIFE_DRAGON);
 drain(s);
 const protectedDragon=s.players[0].battle.find(x=>x.cardId===EX_LIFE_DRAGON);
 destroy(s,1,protectedDragon);
 assert.equal(s.decision,null);
 assert.ok(has(s,0,'battle',protectedDragon));
 assert.equal(s.log.filter(x=>x.type==='reveal'&&x.cardId===INFINITY).length,0);
 destroy(s,1,ordinary);
 assert.equal(s.decision,null);
 destroy(s,0,opponent);
 assert.equal(s.decision,null);
});

test('Jack triggers Sonkun only when Force Dragon was a creature (QA42130)',()=>{
 for(const creature of [false,true]){
  const s=field(),dragon=add(s,0,'battle','dm22rp1-6A'),sonkun=add(s,0,'battle','dm22rp1-006');
  if(creature){
   add(s,0,'battle','dm01-097');
   add(s,0,'battle','dm22rp1-068');
  }
  assert.equal(e.isCreature(s,dragon),creature);
  s.active=1;
  cast(s,JACK);
  pick(s,dragon.uid);
  assert.ok(has(s,0,'grave',dragon)&&has(s,0,'battle',sonkun));
  assert.equal(s.decision?.task?.source===sonkun.cardId,creature);
 }
});

test('Harmee gains +3000 from each own spell and Tamaseed use, increases breaks and resets at end of turn',()=>{
 const s=field(),harmee=add(s,0,'battle',HARMEE);
 cast(s,SPELL);
 drain(s);
 assert.equal(e.power(harmee,false,s),6000);
 cast(s,SEED);
 drain(s);
 assert.equal(e.power(harmee,false,s),9000);
 cast(s,SPELL);
 drain(s);
 assert.equal(e.power(harmee,false,s),12000);
 attack(s,harmee.uid);
 act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields');
 drain(s);
 assert.equal(s.players[1].shields.length,2);
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
 assert.equal(e.power(harmee,false,s),3000);
});

test('Harmee ignores opponent spells and Tamaseeds and its ignored ability does not trigger',()=>{
 const s=field(),harmee=add(s,0,'battle',HARMEE);
 s.active=1;
 cast(s,SPELL);
 drain(s);
 cast(s,SEED);
 drain(s);
 assert.equal(e.power(harmee,false,s),3000);
 s.active=0;
 harmee.g35Ignored=s.turn;
 cast(s,SPELL);
 drain(s);
 assert.equal(e.power(harmee,false,s),3000);
});

const crossActions=(s,gear,target)=>e.getLegalActions(s).filter(a=>a.kind==='crossGear'&&a.uid===gear.uid&&a.target===target.uid);

test('Gravity requires the one-mana cross reduction only for itself and pays the displayed cost',()=>{
 const s=field(),gravity=add(s,0,'battle',GRAVITY),other=add(s,0,'battle',BASIC);
 const gear=add(s,0,'battle',GEAR),cheap=add(s,0,'battle',CHEAP_GEAR);
 assert.equal(e.effectiveCard(gravity,s).breaker,2);
 assert.deepEqual(crossActions(s,gear,gravity).map(a=>a.cost),[3]);
 assert.deepEqual(crossActions(s,gear,other).map(a=>a.cost),[4]);
 assert.deepEqual(crossActions(s,cheap,gravity).map(a=>a.cost),[1]);
 act(s,'crossGear',a=>a.uid===gear.uid&&a.target===gravity.uid);
 assert.equal(gear.crossedTo.uid,gravity.uid);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,3);
});

for(const reason of ['ignored','opponent forbids reductions'])test('Gravity’s cross costs full price when '+reason,()=>{
 const s=field(),gravity=add(s,0,'battle',GRAVITY),gear=add(s,0,'battle',GEAR);
 if(reason==='ignored')gravity.g35Ignored=s.turn;
 else add(s,1,'battle',NO_REDUCTION);
 assert.deepEqual(crossActions(s,gear,gravity).map(a=>a.cost),[4]);
});
