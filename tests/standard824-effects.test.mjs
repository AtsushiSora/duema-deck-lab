import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,inst,act,cast,drain,GEN} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-824.json',import.meta.url)));
const DRAKE='dm32-099',PANYA='dm35-026',SAGA='dm32-010';
const SMALL='dm01-108',BIG='dmr02-054',EVO='dm02-033',NEO='dmrp01-087';
const HEAVY='dmex17-033',METAL='dmex17-059',GOD_EVO='dmex16-056',HAND='dm01-027';

function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);
const effect=(s,target)=>act(s,'effect',a=>a.targets.some(x=>x.uid===target.uid));

test('Phase 824 uses canonical deck IDs and keeps the verified Saga reprint as an alias',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 assert.equal(cards.length,3);
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:824}));
  assert.throws(()=>standardCardSpec(detail,{phase:823}));
  const unknown=structuredClone(detail);
  unknown.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(unknown,{phase:824}));
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[key],value);
  assert.equal(CARD_IMAGES[row.id],row.image);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:row.id,count:1});
  deck.cards=registry.resolveRows(deck.cards);
  assert.equal(deck.cards.at(-1).id,row.id);
  assert.deepEqual(e.validateDeck(deck),[]);
 }
 assert.equal(printAliases.length,1);
 const [print]=printAliases;
 assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:824}),cards.find(x=>x.id===SAGA).spec);
 assert.equal(registry.resolveRows([{id:print.id,count:1}])[0].id,SAGA);
 assert.equal(refs.find(x=>x.id===print.id).image,print.image);
 assert.ok(!data.cards.some(x=>x.id===print.id));
});

test('Fire Smoke protects itself and allies at their current power with a friendly evolution',()=>{
 const s=setup(),attacker=put(s,0,'battle',SMALL);
 put(s,0,'battle',EVO);
 const drake=put(s,1,'battle',DRAKE),small=put(s,1,'battle',SMALL),big=put(s,1,'battle',BIG);
 for(const x of [drake,small,big])x.tapped=true;
 s.phase='attack';
 const targets=()=>[...new Set(e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===attacker.uid).map(a=>a.target))];
 assert.deepEqual(targets(),['player',drake.uid,small.uid,big.uid]);
 const evolution=put(s,1,'battle',NEO);
 assert.ok(targets().includes(drake.uid));
 evolution.under=[inst(SMALL)];
 assert.deepEqual(targets(),['player',big.uid]);
 drake.powerModifiers=[{amount:1000}];
 big.powerModifiers=[{amount:-1000}];
 assert.deepEqual(targets(),['player',drake.uid]);
 evolution.sealed=true;
 assert.deepEqual(targets(),['player',drake.uid,small.uid,big.uid]);
 evolution.sealed=false;
 put(s,0,'battle',GEN);
 assert.deepEqual(targets(),['player',drake.uid,small.uid,big.uid]);
});

test('Fire Smoke still allows spell targeting, and a qualifying low-power evolution is protected',()=>{
 const s=setup(),attacker=put(s,0,'battle',SMALL);
 const drake=put(s,1,'battle',DRAKE),evolution=put(s,1,'battle',EVO);
 evolution.powerModifiers=[{amount:-2000}];
 evolution.tapped=true;
 s.phase='attack';
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===attacker.uid&&a.target===evolution.uid));
 s.phase='main';
 cast(s,HAND);
 effect(s,drake);
 assert.ok(has(s,1,'grave',drake));
 s.phase='attack';
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===attacker.uid&&a.target===evolution.uid));
});

for(const mode of ['friendly','opposing','unlinked evolution God','linked God','decline'])test('Panya offers an optional return after destruction: '+mode,()=>{
 let s=setup();
 s.players[0].mana=s.players[0].mana.filter(x=>x.cardId==='dm01-090').slice(0,6);
 const source=put(s,1,'battle',PANYA),friendly=put(s,1,'battle',SMALL),enemy=put(s,0,'battle',SMALL);
 const evo=put(s,0,'battle',EVO),god=put(s,0,'battle',GOD_EVO),linked=put(s,0,'battle',HEAVY);
 const link=inst(METAL);
 linked.godLinks=[link];
 const gear=put(s,0,'battle','dm14-110');
 cast(s,HAND);
 effect(s,source);
 assert.equal(s.decision.player,1);
 assert.ok(has(s,1,'grave',source));
 assert.deepEqual(new Set(values(s)),new Set([null,friendly.uid,enemy.uid,god.uid,linked.uid]));
 assert.ok(![evo.uid,gear.uid].some(uid=>values(s).includes(uid)));
 s=JSON.parse(JSON.stringify(s));
 const target={friendly,opposing:enemy,'unlinked evolution God':god,'linked God':linked,decline:null}[mode];
 pick(s,target?.uid??null);
 if(mode==='linked God'){
  assert.equal(s.decision.type,'godLeave');
  act(s,'godLeave',a=>a.cardId===METAL);
  assert.ok(has(s,0,'hand',link));
  assert.ok(has(s,0,'battle',linked));
 }else if(target)assert.ok(has(s,mode==='friendly'?1:0,'hand',target));
 else assert.ok(has(s,1,'battle',friendly));
 assert.equal(s.decision,null);
});

for(const mode of ['bounce','ignored'])test('Panya does not offer a return on '+mode,()=>{
 const s=setup(),source=put(s,1,'battle',PANYA);
 put(s,0,'battle',SMALL);
 if(mode==='ignored')source.g35Ignored=s.turn;
 cast(s,mode==='bounce'?'dm01-086':HAND);
 effect(s,source);
 assert.equal(s.decision,null);
 assert.ok(has(s,1,mode==='bounce'?'hand':'grave',source));
});

for(const count of [0,1,2])test('Saga selects up to two Gods from its own mana and can resume mid-selection: '+count,()=>{
 let s=setup();
 const heavy=put(s,0,'mana',HEAVY),metal=put(s,0,'mana',METAL),third=put(s,0,'mana',METAL);
 const enemy=put(s,1,'mana',HEAVY),hand=put(s,0,'hand',METAL),hidden=put(s,0,'mana',METAL);
 hidden.faceDown=true;
 const before=e.physicalCards(s).length;
 cast(s,SAGA);
 assert.deepEqual(new Set(values(s)),new Set([heavy.uid,metal.uid,third.uid,null]));
 if(count){
  pick(s,metal.uid);
  assert.ok(has(s,0,'mana',metal));
  assert.ok(!values(s).includes(metal.uid));
  s=JSON.parse(JSON.stringify(s));
 }
 if(count===2){
  pick(s,heavy.uid);
  assert.ok(!has(s,0,'mana',metal));
  pick(s,metal.uid);
 }else pick(s,null);
 drain(s);
 assert.equal(s.players[0].battle.length,count?1:0);
 if(count===2)assert.deepEqual(s.players[0].battle[0].godLinks.map(x=>x.uid),[heavy.uid]);
 assert.equal(has(s,0,'mana',heavy),count!==2);
 assert.equal(has(s,0,'mana',metal),count===0);
 assert.ok(has(s,0,'mana',third)&&has(s,0,'mana',hidden)&&has(s,1,'mana',enemy)&&has(s,0,'hand',hand));
 assert.equal(e.physicalCards(s).length,before+1);
 if(count)assert.equal(s.players[0].battle[0].summonedTurn,undefined);
});

test('Saga cannot move mana under the opponent’s mana lock',()=>{
 const s=setup(),god=put(s,0,'mana',HEAVY);
 put(s,1,'battle','dmrp22-042');
 cast(s,SAGA);
 assert.ok(has(s,0,'mana',god));
 assert.equal(s.players[0].battle.length,0);
 assert.equal(s.decision,null);
});
