import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-813.json',import.meta.url)));
const MARG='dm28-019',WASSHOI='dm28-030',FLY='dm27-034';
const WATER='dm01-083',NATURE='dm01-108',ENERGY='dm06-085',CONCERTO='dm10-048';
const DEATH='dm01-027',BOUNCE='dm01-086',SPEED='dm05-015',EVO='dm24bd3-009',GEAR='dm14-110';
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 813 definitions preserve their canonical saved deck IDs',()=>{
 assert.equal(cards.length,3);
 assert.deepEqual(printAliases,[]);
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:813}));
  assert.throws(()=>standardCardSpec(detail,{phase:812}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:813}));
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

const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);
const native=(s,x)=>act(s,'effect',a=>a.targets.some(t=>t.uid===x.uid));
const values=s=>s.decision.choices.map(x=>x.value);
const tapped=(s,p)=>s.players[p].mana.filter(x=>x.tapped).length;

for(const destination of ['own gear','opposing base','decline'])test('Margarete can bounce one eligible physical card: '+destination,()=>{
 let s=setup();
 const source=put(s,0,'battle',MARG),gear=put(s,0,'battle',GEAR),evo=put(s,1,'battle',EVO);
 const base=inst(NATURE),evolutionBase=inst(EVO);
 evo.under=[evolutionBase,base];
 const spell=put(s,0,'hand',ENERGY),top=s.players[0].deck[0];
 play(s,spell);
 assert.ok(has(s,0,'hand',top));
 assert.ok(has(s,0,'grave',spell));
 assert.equal(s.decision?.task?.op,'g34_BattleCardMove579');
 assert.deepEqual(new Set(values(s)),new Set([source.uid,gear.uid,base.uid,null]));
 s=JSON.parse(JSON.stringify(s));
 pick(s,destination==='own gear'?gear.uid:destination==='opposing base'?base.uid:null);
 assert.equal(has(s,0,'hand',gear),destination==='own gear');
 assert.equal(has(s,1,'hand',base),destination==='opposing base');
 assert.ok(has(s,1,'battle',evo));
 assert.ok(s.players[1].battle[0].under.some(x=>x.uid===evolutionBase.uid));
});

test('Margarete ignores an opponent cast and an ordinary creature summon',()=>{
 const s=setup();
 put(s,0,'battle',MARG);
 play(s,put(s,0,'hand',NATURE));
 assert.equal(s.decision,null);
 s.active=1;
 play(s,put(s,1,'hand',ENERGY));
 assert.equal(s.decision,null);
});

test('Margarete can select a face-down seal without seeing its evolution identity',()=>{
 const s=setup();
 put(s,0,'battle',MARG);
 const hidden=put(s,1,'seals',EVO),host=put(s,1,'battle',NATURE);
 host.sealed=true;
 hidden.faceDown=true;
 hidden.sealOf=host.uid;
 play(s,put(s,0,'hand',ENERGY));
 const option=s.decision.choices.find(c=>c.value===hidden.uid);
 assert.match(option.label,/封印/);
 assert.equal(option.cardId,undefined);
 pick(s,hidden.uid);
 assert.ok(has(s,1,'hand',hidden));
 assert.ok(has(s,1,'battle',host));
 assert.ok(!s.players[1].battle[0].sealed);
});

test('Wasshoi stacks both bonuses on an older allied speed attacker and preserves its W-breaker',()=>{
 const s=setup(),speed=put(s,0,'battle',SPEED),normal=put(s,0,'battle',NATURE),enemy=put(s,1,'battle',SPEED);
 const first=put(s,0,'battle',WASSHOI),second=put(s,0,'hand',WASSHOI);
 play(s,second);
 assert.ok(speed.entered<s.turn);
 assert.equal(e.power(speed,false,s),e.card(SPEED).power+4000);
 assert.equal(e.power(normal,false,s),e.card(NATURE).power);
 assert.equal(e.power(enemy,false,s),e.card(SPEED).power);
 assert.equal(e.power(first,false,s),1000);
 attack(s,speed.uid);
 act(s,'noBlock');
 assert.equal(s.decision.count,4);
 act(s,'breakShields');
 drain(s);
 assert.equal(s.players[1].shields.length,1);
});

test('Wasshoi sees granted speed, including its own, and stops when an ability is ignored',()=>{
 const s=setup(),source=put(s,0,'battle',WASSHOI),ally=put(s,0,'battle',NATURE);
 put(s,0,'battle','dmr11-s04');
 assert.equal(e.power(source,false,s),3000);
 assert.equal(e.power(ally,false,s),4000);
 assert.equal(e.effectiveCard(ally,s).extraBreak,1);
 ally.g35Ignored=s.turn;
 assert.equal(e.power(ally,false,s),2000);
 assert.equal(e.effectiveCard(ally,s).extraBreak,undefined);
 delete ally.g35Ignored;
 source.g35Ignored=s.turn;
 assert.equal(e.power(ally,false,s),2000);
 assert.equal(e.effectiveCard(ally,s).extraBreak,undefined);
});

for(const amount of [0,1,2])test('Fly Love can decline or stack its paid spell reduction: '+amount,()=>{
 let s=setup();
 put(s,0,'battle',FLY);
 put(s,0,'battle',FLY);
 give(s,0,'mana',[WATER,WATER,WATER]);
 const spell=put(s,0,'hand',ENERGY);
 play(s,spell);
 assert.equal(s.decision?.task?.op,'g34_PaySpell485');
 assert.deepEqual(values(s),[2,1,0,false]);
 s=JSON.parse(JSON.stringify(s));
 pick(s,amount);
 assert.equal(tapped(s,0),3-amount);
 assert.ok(has(s,0,'grave',spell));
});

test('Fly Love enters mana tapped, keeps a one-mana floor and only reduces its owner’s spells',()=>{
 const s=setup();
 put(s,0,'battle',FLY);
 s.phase='charge';
 const charge=put(s,0,'hand',FLY);
 act(s,'charge',a=>a.uid===charge.uid);
 assert.equal(s.players[0].mana.find(x=>x.uid===charge.uid).tapped,true);
 assert.equal(e.summonCost(s,0,e.card(CONCERTO)),1);
 assert.equal(e.summonCost(s,0,e.card(NATURE)),e.card(NATURE).cost);
 assert.equal(e.summonCost(s,1,e.card(ENERGY)),3);
});

for(const spell of [DEATH,BOUNCE])test('Fly Love offers a mandatory hidden hand choice only when destroyed: '+spell,()=>{
 let s=setup();
 const source=put(s,0,'battle',FLY);
 s.active=1;
 const first=put(s,1,'hand',WATER),second=put(s,1,'hand',NATURE);
 play(s,put(s,1,'hand',spell));
 native(s,source);
 if(spell===DEATH){
  assert.ok(has(s,0,'grave',source));
  assert.equal(s.decision?.player,0);
  assert.equal(s.decision?.task?.op,'g34_BlindDiscard773');
  assert.deepEqual(values(s),[0,1]);
  assert.ok(s.decision.choices.every(x=>!x.cardId&&/^裏向きの手札/.test(x.label)));
  s=JSON.parse(JSON.stringify(s));
  pick(s,1);
  assert.ok(has(s,1,'grave',second));
 }else{
  assert.ok(has(s,0,'hand',source));
  assert.equal(s.decision,null);
  assert.ok(has(s,1,'hand',second));
 }
 assert.ok(has(s,1,'hand',first));
});

test('Wasshoi also adds a shield to a break performed by the speed attacker’s effect',()=>{
 const s=setup(),source=put(s,0,'battle','dmrp14-004'),target=put(s,1,'battle',NATURE);
 put(s,0,'battle',WASSHOI);
 target.tapped=true;
 const [first,second]=s.players[1].shields;
 attack(s,source.uid,target.uid);
 act(s,'noBlock');
 assert.ok(has(s,1,'grave',target));
 assert.equal(s.decision?.task?.op,'g34_Break497');
 pick(s,first.uid);
 assert.equal(s.decision?.task?.op,'g34_Break497');
 pick(s,second.uid);
 drain(s);
 assert.equal(s.players[1].shields.length,3);
 assert.ok(has(s,1,'hand',first)&&has(s,1,'hand',second));
});
