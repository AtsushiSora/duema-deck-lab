import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,cast,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';

const LUPIA='dm26ex2-052',WADA='dm26ex2-029',ZERO='dm26ex2-045';
const BASIC='dm01-108',EVEN_BLOCK='dm01-089',ODD_BLOCK='dm01-084',EVOLUTION='dm10-017';
const DRAGON='dm01-008',TWIN='dm23rp3-020',DRAGON_WORD='dm26ex2-031';
const GHOST='dm01-094',SCALE='dmr19-046';
const INFERNO='dmc44-001',END_RECURSION='dmrp06-s07',RAMP='dm06-108';
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
function end(s){
 if(s.phase==='charge')act(s,'skipCharge');
 if(s.phase==='main')act(s,'toAttack');
 act(s,'endTurn');
}
const blocks=s=>e.getLegalActions(s).filter(a=>a.kind==='block').map(a=>a.uid);

test('three verified original IDs resolve and use the official stats, limits and images',()=>{
 const m=read('tools/support-phase-1315.json'),registry=createCatalogue(snapshot,data.cards,details);
 const {prints}=read('tools/image-reference-prints.json');
 assert.deepEqual(m.cards.map(c=>c.id),[LUPIA,WADA,ZERO]);
 assert.deepEqual(m.printAliases,[]);
 for(const {id,name,image,source,faces,spec} of m.cards){
  const c=e.card(id),f=faces[0];
  assert.deepEqual(standardCardSpec({id,name,faces,status:'complete'},{phase:1315}),spec);
  assert.deepEqual(prints.find(x=>x.id===id),{id,canonicalId:id,name,image,source});
  assert.deepEqual(registry.resolveRows([{id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[id]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.limit,e.manaValue(c)],
   [f.cost,Number(f.powerText),f.race,f.civilizations,4,1]);
  for(const [key,v] of Object.entries(spec))assert.deepEqual(c[key],v);
  assert.equal(CARD_IMAGES[id],image);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id,count:1});
  assert.deepEqual(e.validateDeck({...deck,cards:registry.resolveRows(deck.cards)}),[]);
 }
});

for(const accept of [true,false])test('Lupia optionally turns up one card in an own stacked shield '+accept,()=>{
 const s=field(),root=s.players[0].shields[0],under=inst(DRAGON_WORD);
 root.shieldStack=[under];
 const enemy=s.players[1].shields[0];
 cast(s,LUPIA);
 const choices=s.decision.choices;
 assert.ok(choices.some(c=>value(c)===root.uid));
 assert.ok(choices.some(c=>value(c)===under.uid&&!c.cardId));
 assert.ok(choices.every(c=>value(c)!==enemy.uid));
 pick(s,accept?under.uid:null);
 assert.equal(!!under.faceUp,accept);
 assert.equal(!!root.faceUp,false);
 assert.equal(!!enemy.faceUp,false);
 assert.equal(s.players[0].shields.length,5);
 assert.equal(e.summonCost(s,0,e.card(DRAGON)),accept?4:5);
 assert.equal(e.summonCost(s,0,e.card(DRAGON_WORD)),accept?4:5);
 assert.equal(e.summonCost(s,0,e.card(BASIC)),2);
 add(s,0,'battle',LUPIA);
 add(s,0,'battle',LUPIA);
 assert.equal(e.summonCost(s,0,e.card(TWIN)),1);
});

for(const accept of [true,false])test('Wada reaches the grave before the optional revival from an opposing discard '+accept,()=>{
 const s=field(),wada=add(s,1,'hand',WADA);
 cast(s,GHOST);
 assert.ok(has(s,1,'grave',wada));
 assert.equal(s.decision?.player,1);
 assert.equal(s.decision?.source,WADA);
 pick(s,accept?true:null);
 if(accept){
  assert.ok(has(s,1,'battle',wada));
  assert.equal(e.effectiveCard(wada,s).blocker,true);
  assert.equal(e.effectiveCard(wada,s).breaker,2);
  pick(s,0);
 }else assert.ok(has(s,1,'grave',wada));
});

test('Wada cannot revive when its owner discards it to their own spell',()=>{
 const s=field(),wada=add(s,0,'hand',WADA);
 cast(s,SCALE);
 drain(s);
 assert.ok(has(s,0,'grave',wada));
 assert.equal(has(s,0,'battle',wada),false);
});

test('Wada forbids blocking based on current parity and retains the restriction through evolution',()=>{
 const s=field(),odd=add(s,1,'battle',ODD_BLOCK),even=add(s,1,'battle',EVEN_BLOCK);
 cast(s,WADA);
 pick(s,0);
 const oldAttacker=add(s,0,'battle',BASIC);
 attack(s,oldAttacker.uid);
 assert.deepEqual(blocks(s),[odd.uid]);
 act(s,'noBlock');
 drain(s);
 end(s);
 act(s,'skipCharge');
 const evolution=add(s,1,'hand',EVOLUTION);
 act(s,'play',a=>a.uid===evolution.uid);
 act(s,'evolve',a=>a.baseUid===odd.uid);
 act(s,'toAttack');
 assert.ok(e.getLegalActions(s).every(a=>a.kind!=='attack'||a.uid!==evolution.uid));
 end(s);
 const wada=s.players[0].battle.find(x=>x.cardId===WADA);
 attack(s,wada.uid);
 pick(s,1);
 assert.deepEqual(blocks(s).sort(),[even.uid,evolution.uid].sort());
});

test('Wada restricts existing opponents, and a newly summoned attacker is outside that effect',()=>{
 const s=field(),old=add(s,1,'battle',BASIC);
 cast(s,WADA);
 pick(s,0);
 end(s);
 act(s,'skipCharge');
 const fresh=add(s,1,'hand',BASIC);
 act(s,'play',a=>a.uid===fresh.uid);
 if(s.decision)drain(s);
 assert.equal(e.attackLocked(s,1,old),true);
 assert.equal(e.attackLocked(s,1,fresh),false);
 end(s);
 assert.equal(e.attackLocked(s,1,old),false);
});

test('ZERO declares each copy after active end effects and casts chosen copies in order',()=>{
 let s=field();
 const target=add(s,0,'grave',END_RECURSION),first=add(s,1,'hand',ZERO),second=add(s,1,'hand',ZERO);
 end(s);
 assert.ok(has(s,0,'battle',target));
 assert.equal(s.decision?.task?.op,'g34_InvasionZeroDeclare1315');
 assert.equal(s.decision?.task?.uid,first.uid);
 s=JSON.parse(JSON.stringify(s));
 pick(s,true);
 assert.equal(s.decision?.task?.uid,second.uid);
 assert.equal(has(s,0,'battle',target),true);
 pick(s,true);
 act(s,'orderEffect',a=>a.effectId===s.pendingEffects.find(e=>e.uid===second.uid).effectId);
 drain(s);
 assert.equal(has(s,0,'grave',target),true);
 assert.deepEqual(s.players[1].grave.filter(x=>x.cardId===ZERO).map(x=>x.uid),[second.uid,first.uid]);
 assert.ok(s.players[1].mana.every(x=>!x.tapped));
});

for(const accept of [true,false])test('ZERO checks an actual free entrant and allows an optional declaration '+accept,()=>{
 const s=field();
 const target=add(s,0,'grave',BASIC),high=add(s,0,'battle',DRAGON),self=add(s,1,'battle',BASIC);
 const sweep=add(s,1,'hand',ZERO);
 cast(s,INFERNO);
 pick(s,target.uid);
 assert.ok(has(s,0,'battle',target));
 end(s);
 assert.equal(s.decision?.source,ZERO);
 pick(s,accept?true:null);
 drain(s);
 assert.equal(has(s,0,'grave',target),accept);
 assert.ok(has(s,0,'battle',high));
 assert.ok(has(s,1,'battle',self));
 assert.equal(has(s,1,accept?'grave':'hand',sweep),true);
});

test('ZERO does not declare for a paid summon or a spell being cast',()=>{
 const s=field(),sweep=add(s,1,'hand',ZERO);
 cast(s,BASIC);
 cast(s,RAMP);
 drain(s);
 end(s);
 assert.equal(s.decision,null);
 assert.equal(s.active,1);
 assert.ok(has(s,1,'hand',sweep));
});
