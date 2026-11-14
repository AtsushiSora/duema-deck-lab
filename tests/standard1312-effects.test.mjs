import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,cast,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';

const KAMIKAZE='dmc45-008',BUSHIDO='dmc45-009',MIST='dm26-016',VOETE='dmex13-016';
const BASIC='dm01-108',FIRE='dm01-097',SAMURAI='dm36-103',SAME_POWER='dmrp22-027';
const MULTICOLOR='dmrp13-084',MULTICOLOR_SPELL='dmx11-012',MONO_SPELL='dm01-052';
const MADONNA='dmx08-006',REMOVAL='dm01-027',LARGE='dmx16-001';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
const field=()=>{
 const s=setup();
 s.active=0;
 for(const p of [0,1])give(s,p,'deck',Array(25).fill(BASIC));
 return s;
};
const add=(s,p,z,id,props={})=>{
 const x=Object.assign(inst(id),props);
 s.players[p][z].push(x);
 return x;
};
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const value=c=>c.value?.uid??c.value;
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
const crossOptions=(s,gear,host)=>e.getLegalActions(s).filter(a=>a.kind==='crossGear'&&a.uid===gear.uid&&a.target===host.uid);
const cross=(s,gear,host,mana)=>act(s,'crossGear',a=>a.uid===gear.uid&&a.target===host.uid&&a.cost===mana);
const payOptions=(s,gear,host)=>crossOptions(s,gear,host).map(a=>a.cost).sort((a,b)=>a-b);

test('the four official prints are unique playable names with full definitions and legal identities',()=>{
 const m=read('tools/support-phase-1312.json'), registry=createCatalogue(snapshot,data.cards,details);
 const {prints}=read('tools/image-reference-prints.json');
 assert.deepEqual(m.cards.map(c=>c.id),[KAMIKAZE,BUSHIDO,MIST,VOETE]);
 assert.deepEqual(m.printAliases,[]);
 for(const {id,name,image,source,faces,spec} of m.cards){
  const c=e.card(id),f=faces[0];
  assert.deepEqual(standardCardSpec({id,name,faces,status:'complete'},{phase:1312}),spec);
  assert.deepEqual(prints.find(x=>x.id===id),{id,canonicalId:id,name,image,source});
  assert.deepEqual(registry.resolveRows([{id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
  assert.equal(CARD_IMAGES[id],image);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.limit,e.manaValue(c)],
   [f.cost,Number(f.powerText),f.race,f.civilizations,4,1]);
  for(const [key,v] of Object.entries(spec))assert.deepEqual(c[key],v);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id,count:1});
  assert.deepEqual(e.validateDeck({...deck,cards:registry.resolveRows(deck.cards)}),[]);
 }
});

test('both gears offer optional Samurai cross reductions with a one-mana floor',()=>{
 const s=field(),samurai=add(s,0,'battle',SAMURAI),other=add(s,0,'battle',BASIC);
 const kamikaze=add(s,0,'battle',KAMIKAZE),bushido=add(s,0,'battle',BUSHIDO);
 assert.deepEqual(payOptions(s,kamikaze,samurai),[1,2,3]);
 assert.deepEqual(payOptions(s,bushido,samurai),[1,2]);
 assert.deepEqual(payOptions(s,kamikaze,other),[3]);
 assert.deepEqual(payOptions(s,bushido,other),[2]);
 cross(s,kamikaze,samurai,1);
 cross(s,bushido,samurai,1);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,2);
});

test('a cost-reduction prohibition and ignored gear remove their Samurai discount',()=>{
 const s=field(),samurai=add(s,0,'battle',SAMURAI),kamikaze=add(s,0,'battle',KAMIKAZE);
 const lock=add(s,1,'battle',SAME_POWER);
 assert.deepEqual(payOptions(s,kamikaze,samurai),[3]);
 lock.g35Ignored=s.turn;
 kamikaze.g35Ignored=s.turn;
 assert.deepEqual(payOptions(s,kamikaze,samurai),[3]);
});

test('Kamikaze grants speed to the crossed creature, including a non-Samurai that just entered',()=>{
 const s=field(),kamikaze=add(s,0,'battle',KAMIKAZE);
 const host=add(s,0,'battle',BASIC,{entered:s.turn}),other=add(s,0,'battle',BASIC,{entered:s.turn});
 assert.equal(e.effectiveCard(host,s).speedAttacker,undefined);
 cross(s,kamikaze,host,3);
 assert.equal(e.effectiveCard(host,s).speedAttacker,true);
 assert.equal(e.effectiveCard(other,s).speedAttacker,undefined);
 attack(s,host.uid);
 assert.equal(s.attack.attacker,host.uid);
});

for(const accept of [false,true])test('Bushido uses strictly smaller power and accepting attempts both destructions '+accept,()=>{
 const s=field(),host=add(s,0,'battle',SAMURAI);
 const bushido=add(s,0,'battle',BUSHIDO),small=add(s,1,'battle',MADONNA);
 const equal=add(s,1,'battle',SAMURAI),big=add(s,1,'battle',LARGE);
 cross(s,bushido,host,1);
 attack(s,host.uid);
 assert.ok(s.decision.choices.some(c=>value(c)===small.uid));
 assert.ok(s.decision.choices.every(c=>![equal.uid,big.uid].includes(value(c))));
 pick(s,accept?small.uid:null);
 assert.ok(has(s,1,'battle',small));
 assert.equal(has(s,0,'grave',host),accept);
 assert.ok(has(s,0,'battle',bushido));
 assert.equal(!!bushido.crossedTo,!accept);
});

test('Kamikaze saves the shared cross host from Bushido but leaves it open to other destruction',()=>{
 const s=field(),host=add(s,0,'battle',SAMURAI),small=add(s,1,'battle',BASIC);
 cross(s,add(s,0,'battle',BUSHIDO),host,1);
 cross(s,add(s,0,'battle',KAMIKAZE),host,1);
 attack(s,host.uid);
 pick(s,small.uid);
 assert.ok(has(s,0,'battle',host)&&has(s,1,'grave',small));
 assert.equal(s.attack.attacker,host.uid);
 drain(s);
 s.active=1;
 s.phase='main';
 cast(s,REMOVAL);
 act(s,'effect',a=>a.targets.some(x=>x.uid===host.uid));
 assert.ok(has(s,0,'grave',host));
});

test('Kamikaze on a different creature does not save the Bushido host',()=>{
 const s=field(),host=add(s,0,'battle',SAMURAI),other=add(s,0,'battle',SAMURAI),small=add(s,1,'battle',BASIC);
 cross(s,add(s,0,'battle',BUSHIDO),host,1);
 cross(s,add(s,0,'battle',KAMIKAZE),other,1);
 attack(s,host.uid);
 pick(s,small.uid);
 assert.ok(has(s,0,'grave',host)&&has(s,0,'battle',other)&&has(s,1,'grave',small));
});

for(const active of [0,1])test('Mist allows the owner to draw for either player’s multicolored use or entry '+active,()=>{
 const s=field();
 add(s,0,'battle',MIST);
 s.active=active;
 for(const id of [MULTICOLOR,MULTICOLOR_SPELL]){
  const before=s.players[0].hand.length;
  cast(s,id);
  const top=s.players[0].deck[0];
  assert.equal(s.decision?.task?.source,MIST);
  assert.equal(s.decision.player,0);
  pick(s,1);
  assert.ok(has(s,0,'hand',top));
  assert.equal(s.players[0].hand.length,before+1);
 }
});

test('Mist enters the mana zone tapped when charged',()=>{
 const s=field(),mist=add(s,0,'hand',MIST);
 s.phase='charge';
 act(s,'charge',a=>a.uid===mist.uid);
 assert.ok(has(s,0,'mana',mist));
 assert.equal(mist.tapped,true);
});

test('Mist excludes itself, a monocolor entry and spell, and supports declining the draw',()=>{
 const s=field(),top=s.players[0].deck[0];
 cast(s,MIST);
 assert.equal(s.decision,null);
 cast(s,FIRE);
 assert.equal(s.decision,null);
 cast(s,MONO_SPELL);
 assert.equal(s.decision?.source,MONO_SPELL);
 drain(s);
 assert.equal(s.decision,null);
 const next=s.players[0].deck[0];
 cast(s,MULTICOLOR);
 pick(s,0);
 assert.equal(s.players[0].deck[0].uid,next.uid);
 assert.ok(has(s,0,'hand',top));
});

for(const replacement of [false,true])test('Voete must revive below the selected cost even if the return is replaced (QA34326) '+replacement,()=>{
 const s=field();
 const target=add(s,1,'battle',replacement?MADONNA:'dm01-048');
 const large=add(s,1,'battle',SAMURAI);
 const ally=add(s,0,'battle',FIRE);
 const otherOwner=add(s,1,'grave',FIRE);
 const cheap=add(s,0,'grave',BASIC),equal=add(s,0,'grave',target.cardId);
 cast(s,VOETE);
 assert.ok(s.decision.choices.some(c=>value(c)===target.uid));
 assert.ok(s.decision.choices.every(c=>![large.uid,ally.uid].includes(value(c))));
 pick(s,target.uid);
 assert.equal(has(s,1,'battle',target),replacement);
 assert.equal(has(s,1,'hand',target),!replacement);
 assert.ok(s.decision.choices.some(c=>value(c)===cheap.uid));
 assert.ok(s.decision.choices.every(c=>![equal.uid,otherOwner.uid,null].includes(value(c))));
 pick(s,cheap.uid);
 assert.ok(has(s,0,'battle',cheap)&&has(s,0,'grave',equal));
});

test('Voete returns a foreign-controlled creature to its owner rather than its controller',()=>{
 const s=field(),borrowed=add(s,1,'battle','dm01-048',{cardOwner:0});
 cast(s,VOETE);
 pick(s,borrowed.uid);
 assert.ok(has(s,0,'hand',borrowed));
 assert.equal(has(s,1,'hand',borrowed),false);
});

test('Voete cannot revive without a selected opposing creature',()=>{
 const s=field();
 add(s,1,'battle',SAMURAI);
 const cheap=add(s,0,'grave',BASIC);
 cast(s,VOETE);
 assert.equal(s.decision,null);
 assert.ok(has(s,0,'grave',cheap));
});
