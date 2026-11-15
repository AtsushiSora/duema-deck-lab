import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,cast,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';

const SPIRAL='dm25ex4-056',TORNADO='dm25ex4-062',RED='dm25ex4-045',GREEN='dm25ex4-048',BLUE='dm25ex4-039';
const BASIC='dm01-108',LIGHT='dm01-075',WATER='dm01-083',FIRE='dm01-097',DARK='dm01-090';
const PSYCHIC='dm25ex4-040',RED_PSYCHIC='dm25ex4-046',GREEN_PSYCHIC='dm25ex4-049',BIG='dm01-008';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
function field(){
 const s=setup();
 s.active=0;
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(BASIC));
 return s;
}
function add(s,p,z,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][z].push(x);
 return x;
}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const value=c=>c.value?.uid??c.value;
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
const choices=s=>s.decision?.choices?.map(value)??[];

test('five verified original IDs resolve with the current limits, image and complete ability',()=>{
 const m=read('tools/support-phase-1322.json'),registry=createCatalogue(snapshot,data.cards,details);
 const {prints}=read('tools/image-reference-prints.json');
 assert.deepEqual(m.cards.map(c=>c.id),[SPIRAL,TORNADO,RED,GREEN,BLUE]);
 assert.deepEqual(m.printAliases,[]);
 for(const {id,name,image,source,faces,spec} of m.cards){
  const c=e.card(id),f=faces[0];
  assert.deepEqual(standardCardSpec({id,name,faces,status:'complete'},{phase:1322}),spec);
  assert.deepEqual(prints.find(x=>x.id===id),{id,canonicalId:id,name,image,source});
  assert.deepEqual(registry.resolveRows([{id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.limit,e.manaValue(c)],
   [f.cost,Number(f.powerText)||0,f.race,f.civilizations,4,1]);
  for(const [key,v] of Object.entries(spec))assert.deepEqual(c[key],v);
  assert.equal(CARD_IMAGES[id],image);
  assert.equal(e.playFaces(c).length,faces.length);
  assert.deepEqual(e.playFaces(c).map(f=>[f.name,f.cost]),faces.map(f=>[f.name,f.cost]));
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id,count:1});
  assert.deepEqual(e.validateDeck({...deck,cards:registry.resolveRows(deck.cards)}),[]);
 }
});

const play=(s,id,face=0)=>{
 const x=add(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&(a.face||0)===face);
 return x;
};
const targetCard=(s,x)=>s.decision.type==='effect'?
 act(s,'effect',a=>a.targets[0]?.uid===x.uid):pick(s,x.uid);
const manaSpent=(s,p)=>s.players[p].mana.filter(x=>x.tapped).length;
const asBack=(s,target)=>act(s,'extended',a=>{
 const v=s.decision.choices[a.choice].value;
 return v?.uid===target.uid&&v.g1104Back;
});

for(const bounce of [true,false])test('Spiral can return a creature to its owner or skip and still summon '+bounce,()=>{
 const s=field(),target=add(s,1,'battle',LIGHT,{cardOwner:0}),extra=add(s,0,'extra',PSYCHIC);
 const c=play(s,SPIRAL);
 assert.deepEqual(choices(s),[target.uid,null]);
 pick(s,bounce?target.uid:null);
 assert.equal(has(s,0,'hand',target),bounce);
 assert.equal(has(s,1,'battle',target),!bounce);
 assert.deepEqual(choices(s),[extra.uid,null]);
 pick(s,extra.uid);
 assert.ok(has(s,0,'battle',extra)&&has(s,0,'grave',c));
 assert.equal(manaSpent(s,0),2);
});

test('Tornado must destroy one enemy at current power 4000 or less before its summon',()=>{
 const s=field();
 const below=add(s,1,'battle',BIG,{powerModifiers:[{amount:-2000}]});
 const above=add(s,1,'battle','dm01-059',{powerModifiers:[{amount:1000}]});
 const ally=add(s,0,'battle',LIGHT);
 const extra=add(s,0,'extra',RED_PSYCHIC);
 play(s,TORNADO);
 assert.equal(e.power(below,false,s),4000);
 assert.deepEqual(choices(s),[below.uid]);
 pick(s,below.uid);
 assert.ok(has(s,1,'grave',below)&&has(s,1,'battle',above)&&has(s,0,'battle',ally));
 pick(s,extra.uid);
 assert.ok(has(s,0,'battle',extra));
});

test('Tornado continues to the optional summon when there are no destruction targets',()=>{
 const s=field(),extra=add(s,0,'extra',RED_PSYCHIC);
 play(s,TORNADO);
 assert.deepEqual(choices(s),[extra.uid,null]);
 pick(s,null);
 assert.ok(has(s,0,'extra',extra));
});

test('Mamma can use only its three NEO base colors and attack immediately on a base',()=>{
 const s=field();
 const bases=[DARK,FIRE,BASIC,LIGHT,WATER].map(id=>add(s,0,'battle',id));
 const x=play(s,RED);
 const plays=e.getLegalActions(s).filter(a=>a.kind==='evolve'&&a.uid===x.uid);
 assert.deepEqual(new Set(plays.map(a=>a.baseUid??null)),new Set([null,...bases.slice(0,3).map(y=>y.uid)]));
 act(s,'evolve',a=>a.baseUid===bases[0].uid);
 assert.deepEqual(x.under.map(y=>y.uid),[bases[0].uid]);
 const extra=add(s,0,'extra',RED_PSYCHIC);
 attack(s,x.uid);
 assert.equal(s.decision.task.op,'g34_Smash320');
 const spent=manaSpent(s,0);
 pick(s,true);
 assert.ok(choices(s).includes(extra.uid));
 asBack(s,extra);
 assert.ok(has(s,0,'battle',x)&&has(s,0,'battle',extra));
 assert.equal(e.card(extra).name,e.card(RED_PSYCHIC).g1085Back.name);
 assert.equal(manaSpent(s,0),spent);
 assert.equal(extra.summonedTurn,s.turn);
 assert.ok(e.physicalCards(s).some(y=>y.uid===bases[0].uid));
});

test('Mamma without a NEO base has summoning sickness, and the spell half can be cast from hand',()=>{
 const s=field(),x=play(s,RED);
 act(s,'evolve',a=>!a.baseUid);
 s.phase='attack';
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid));
 const fresh=field(),extra=add(fresh,0,'extra',RED_PSYCHIC);
 const c=play(fresh,RED,1);
 asBack(fresh,extra);
 assert.ok(has(fresh,0,'grave',c)&&has(fresh,0,'battle',extra));
 assert.equal(manaSpent(fresh,0),3);
});

for(const smash of [true,false])test('Gouriki can Mach Fight on entry and choose whether to use Smash Burst '+smash,()=>{
 const s=field(),x=play(s,GREEN),foe=add(s,1,'battle',LIGHT);
 const extra=add(s,0,'extra',GREEN_PSYCHIC),spent=manaSpent(s,0);
 assert.equal(e.card(GREEN).breaker,2);
 attack(s,x.uid,foe.uid);
 assert.equal(s.decision.task.op,'g34_Smash320');
 pick(s,smash?true:null);
 if(smash)asBack(s,extra);
 drain(s);
 assert.equal(has(s,0,'battle',extra),smash);
 assert.ok(has(s,0,'battle',x)&&has(s,1,'grave',foe));
 assert.equal(manaSpent(s,0),spent);
});

test('Magoakuman can block',()=>{
 const s=field(),x=add(s,0,'battle',BLUE),attacker=add(s,1,'battle',WATER);
 s.active=1;
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===x.uid);
 drain(s);
 assert.ok(x.tapped&&has(s,0,'battle',x));
});

for(const [origin,removal] of [['hand','dm01-086'],['mana','dmc27-055'],['grave','dm01-027'],['shields','dm22rp1-030']])
 test('Magoakuman offers Mega Last Burst only from the listed destinations '+origin,()=>{
  const s=field(),x=add(s,0,'battle',BLUE),extra=add(s,0,'extra',PSYCHIC);
  s.active=1;
  play(s,removal);
  targetCard(s,x);
  if(origin==='shields'){
   drain(s);
   assert.ok(has(s,0,'shields',x)&&has(s,0,'extra',extra));
   return;
  }
  assert.equal(s.decision.task.op,'g21Mega');
  assert.equal(s.decision.task.origin,origin);
  const resumed=JSON.parse(JSON.stringify(s));
  pick(resumed,true);
  asBack(resumed,extra);
  assert.ok(has(resumed,0,'grave',x)&&has(resumed,0,'battle',extra));
  assert.equal(manaSpent(resumed,0),0);
  assert.notEqual(resumed.g1315UnpaidEntryTurns?.[0],resumed.turn);
 });

test('Spiral’s paid teleport still qualifies the opponent’s Gaia for its end-turn summon (QA48153)',()=>{
 const s=field(),gaia=add(s,1,'hand','dmex17-021'),extra=add(s,0,'extra',PSYCHIC);
 play(s,SPIRAL);
 pick(s,null);
 pick(s,extra.uid);
 assert.ok(has(s,0,'battle',extra));
 assert.equal(manaSpent(s,0),2);
 s.phase='attack';
 act(s,'endTurn');
 assert.equal(s.decision.type,'gaiaDeclare');
 act(s,'declareGaia');
 act(s,'summonGaia');
 assert.ok(has(s,1,'battle',gaia));
 assert.equal(manaSpent(s,1),0);
});

for(const [spell,psychic] of [[GREEN,GREEN_PSYCHIC],[BLUE,PSYCHIC]])
 test('the spell half can also be cast from hand and summons an eligible cost-four Psychic '+spell,()=>{
  const s=field(),target=add(s,0,'extra',psychic),expensive=add(s,0,'extra',BIG);
  const opponent=add(s,1,'extra',psychic);
  const card=play(s,spell,1);
  assert.ok(!choices(s).includes(expensive.uid)&&!choices(s).includes(opponent.uid));
  asBack(s,target);
  assert.ok(has(s,0,'grave',card)&&has(s,0,'battle',target));
  assert.ok(has(s,0,'extra',expensive)&&has(s,1,'extra',opponent));
  assert.equal(manaSpent(s,0),3);
 });
