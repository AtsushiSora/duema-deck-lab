import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,cast,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-828.json',import.meta.url)));
const CASCADE='dm32-104',LULUKE='dm34-031',SMASH='dm35-019',GIZA='dm35-013';
const FAIRY='dm06-108',TWIN='dm23rp3-013',LAND='dm01-108',WATER='dm01-083',SHIDEN='dm34+1s-001';
const DRAGON='dm01-s08',MEDIUM='dm01-011',DESTROY='dm01-027',GRAVE_LOCK='dmrp20-020';
function put(s,p,z,id){const x=inst(id);s.players[p][z].push(x);return x;}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const resume=s=>JSON.parse(JSON.stringify(s));

test('Phase 828 registers four canonical cards and resolves the five official reprints',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 assert.deepEqual(cards.map(x=>x.id),[CASCADE,LULUKE,SMASH,GIZA]);
 for(const row of cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),f=d.faces[0];
  assert.deepEqual(row.faces,d.faces);
  assert.deepEqual(row.spec,standardCardSpec(d,{phase:828}));
  assert.throws(()=>standardCardSpec(d,{phase:827}));
  const unknown=structuredClone(d);unknown.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:828}));
  assert.deepEqual([c.name,c.cost,c.power,c.race,c.manaValue??1,c.limit],[f.name,f.cost,Number(f.powerText),f.race,1,4]);
  assert.equal(CARD_IMAGES[row.id],row.image);
  for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:row.id,count:1});
  deck.cards=registry.resolveRows(deck.cards);
  assert.deepEqual(e.validateDeck(deck),[]);
 }
 assert.deepEqual(printAliases.map(x=>x.id),['dmex12-100','dm24ex1-082','dm24bd5-054','dm26ex5-036','dmc67-011']);
 for(const print of printAliases){
  assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:828}),cards.find(x=>x.id===print.canonicalId).spec);
  assert.equal(registry.resolveRows([{id:print.id,count:1}])[0].id,print.canonicalId);
  assert.equal(refs.find(x=>x.id===print.id).image,print.image);
  assert.ok(!data.cards.some(x=>x.id===print.id));
 }
 for(const row of [...cards,...printAliases])assert.equal(regulationVerification.limits[row.id],4);
});

for(const mode of ['exchange','decline','empty mana matches','grave lock'])test('Cascade evolves from mana before its optional all-card exchange: '+mode,()=>{
 let s=setup();
 const base=put(s,0,'mana',FAIRY),hidden=put(s,0,'mana',FAIRY);hidden.faceDown=true;
 const [graveFairy,graveTwin,other]=give(s,0,'grave',[FAIRY,TWIN,LAND]);
 const enemy=put(s,1,'grave',FAIRY);
 const additional=mode==='empty mana matches'?[]:[put(s,0,'mana',FAIRY),put(s,0,'mana',TWIN)];
 if(mode==='grave lock')put(s,1,'battle',GRAVE_LOCK);
 cast(s,CASCADE);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='evolve'&&(a.baseUid===hidden.uid||a.baseUid===additional[1]?.uid)));
 act(s,'evolve',a=>a.baseUid===base.uid);
 const entered=s.players[0].battle.find(x=>x.cardId===CASCADE);
 assert.deepEqual(entered.under.map(x=>x.uid),[base.uid]);
 assert.ok(!has(s,0,'mana',base));
 if(mode==='empty mana matches')assert.equal(s.decision,null);
 else{
  assert.deepEqual(values(s),[true,null]);
  s=resume(s);
  pick(s,mode==='decline'?null:true);
 }
 assert.ok(has(s,0,'mana',hidden)&&has(s,0,'grave',other)&&has(s,1,'grave',enemy));
 for(const x of additional)assert.equal(has(s,0,'hand',x),mode!=='decline');
 for(const x of [graveFairy,graveTwin])assert.equal(has(s,0,'mana',x),mode==='exchange');
 assert.deepEqual(s.players[0].battle.find(x=>x.cardId===CASCADE).under.map(x=>x.uid),[base.uid]);
});

test('Luluke compares current attacker power and stops an attack whose target it destroys',()=>{
 let s=setup();
 put(s,0,'battle',LULUKE);
 const dragon=put(s,0,'battle',SHIDEN);
 dragon.powerModifiers=[{amount:2000,attackOnly:true}];
 const target=put(s,1,'battle',DRAGON),equal=put(s,1,'battle',DRAGON),sealed=put(s,1,'battle',LAND);
 target.tapped=true;equal.powerModifiers=[{amount:2000}];sealed.sealed=true;
 s.players[1].seals=[{...inst(WATER),sealOf:sealed.uid,faceDown:true}];
 const n=s.players[1].shields.length;
 attack(s,dragon.uid,target.uid);
 act(s,'orderEffect',a=>a.cardId===LULUKE);
 assert.deepEqual(values(s),[target.uid]);
 s=resume(s);
 pick(s,target.uid);
 assert.ok(has(s,1,'grave',target));
 assert.ok(has(s,1,'battle',equal)&&has(s,1,'battle',sealed));
 assert.equal(s.attack,null);
 assert.equal(s.players[1].shields.length,n);
 assert.ok(!s.log.some(x=>x.type==='battle'));
});

test('Luluke uses the attacker’s last power if an earlier trigger removes it',()=>{
 let s=setup();
 const source=put(s,0,'battle',LULUKE),dragon=put(s,0,'battle',SHIDEN),foe=put(s,1,'battle',DRAGON);
 dragon.powerModifiers=[{amount:2000,attackOnly:true}];
 attack(s,dragon.uid);
 const watcher=s.pendingEffects.find(x=>x.uid===source.uid);
 const first=s.pendingEffects.find(x=>x.uid===dragon.uid);
 // Use a preceding zone move while the two actual attack triggers are waiting.
 first.task.defs=[{op:'ExactMove',owner:0,to:'hand',target:dragon.uid}];
 act(s,'orderEffect',a=>a.effectId===first.effectId);
 assert.ok(has(s,0,'hand',dragon));
 assert.equal(watcher.task.g692LastPower,8000);
 s=resume(s);
 if(s.decision?.type==='effectOrder')act(s,'orderEffect',a=>a.effectId===watcher.effectId);
 assert.deepEqual(values(s),[foe.uid]);
 pick(s,foe.uid);
 assert.ok(has(s,1,'grave',foe));
});

for(const mode of ['own other Dragon','opposing Shiden'])test('Luluke does not react to an unrelated attacker: '+mode,()=>{
 const s=setup(),p=mode==='opposing Shiden'?1:0;
 put(s,0,'battle',LULUKE);
 const attacker=put(s,p,'battle',p?SHIDEN:DRAGON);
 put(s,1-p,'battle',LAND);
 s.active=p;
 attack(s,attacker.uid);
 assert.notEqual(s.decision?.task?.op,'g34_Target');
});

for(const mode of ['save','decline','other Dragon'])test('Luluke Saver offers its own destruction for a matching Dragon: '+mode,()=>{
 const s=setup(),l=put(s,0,'battle',LULUKE),d=put(s,0,'battle',mode==='other Dragon'?DRAGON:SHIDEN);
 s.active=1;
 cast(s,DESTROY);
 act(s,'effect',a=>a.targets?.[0]?.uid===d.uid);
 if(mode==='save')act(s,'replaceUltra',a=>a.uid===l.uid);
 else if(mode==='decline')act(s,'allowLeave');
 assert.equal(has(s,0,'battle',d),mode==='save');
 assert.equal(has(s,0,'grave',l),mode==='save');
 assert.equal(has(s,0,'grave',d),mode!=='save');
});

for(const bonus of [0,1000])test('Gizasmash compares the power at the win, including its +2000: defender bonus '+bonus,()=>{
 const s=setup(),winner=put(s,0,'battle',DRAGON),foe=put(s,1,'battle',LAND);
 foe.tapped=true;foe.powerModifiers=[{amount:2000+bonus}];
 cast(s,SMASH);
 assert.equal(e.power(winner,false,s),8000);
 assert.equal(e.power(put(s,0,'battle',WATER),false,s),1000);
 attack(s,winner.uid,foe.uid);
 act(s,'noBlock');
 if(bonus===0)pick(s,s.players[1].shields[0].uid);
 assert.ok(has(s,1,'grave',foe));
 assert.equal(s.players[1].shields.length,bonus===0?4:5);
});

test('Gizasmash still requires the printed power lead when an effect forces the win',()=>{
 const s=setup(),winner=put(s,0,'battle','dm14-s01'),foe=put(s,1,'battle',DRAGON);
 foe.tapped=true;
 cast(s,SMASH);
 assert.equal(e.power(winner,false,s),4000);
 attack(s,winner.uid,foe.uid);
 act(s,'noBlock');
 assert.ok(has(s,1,'grave',foe)&&has(s,0,'battle',winner));
 assert.equal(s.decision,null);
 assert.equal(s.players[1].shields.length,5);
});

test('Gizasmash watches a later entrant without adding power to it',()=>{
 const s=setup(),foe=put(s,1,'battle',WATER);
 foe.tapped=true;
 cast(s,SMASH);
 const speedAttacker='dmex08-015';
 cast(s,speedAttacker);
 const winner=s.players[0].battle.find(x=>x.cardId===speedAttacker);
 assert.equal(e.power(winner,false,s),7000);
 attack(s,winner.uid,foe.uid);
 act(s,'noBlock');
 pick(s,s.players[1].shields[0].uid);
 assert.equal(s.players[1].shields.length,4);
});

test('Gizabakkal can block and break on the opponent turn at a 4000 power lead',()=>{
 const s=setup(),blocker=put(s,0,'battle',GIZA),foe=put(s,1,'battle',MEDIUM);
 foe.powerModifiers=[{amount:-1000}];
 s.active=1;
 // The attacker cannot attack a player, so it attacks a tapped ally.
 const target=put(s,0,'battle',LAND);target.tapped=true;
 attack(s,foe.uid,target.uid);
 act(s,'block',a=>a.uid===blocker.uid);
 assert.ok(has(s,1,'grave',foe));
 pick(s,s.players[1].shields[0].uid);
 assert.equal(s.players[1].shields.length,4);
 assert.equal(e.card(GIZA).breaker,2);
});

for(const first of [SMASH,GIZA])test('The two Giza triggers resolve separately even if a shield trigger removes the winner: '+first,()=>{
 let s=setup();
 const winner=put(s,0,'battle',GIZA),foe=put(s,1,'battle',MEDIUM);
 foe.tapped=true;
 const [trap,next]=give(s,1,'shields',[DESTROY,LAND]);
 cast(s,SMASH);
 attack(s,winner.uid,foe.uid);
 act(s,'noBlock');
 assert.equal(s.decision.type,'battleWinOrder');
 s=resume(s);
 act(s,'battleWinOrder',a=>a.cardId===first);
 pick(s,trap.uid);
 act(s,'useTrigger');
 act(s,'effect',a=>a.targets?.[0]?.uid===winner.uid);
 assert.ok(has(s,0,'grave',winner));
 s=resume(s);
 pick(s,next.uid);
 assert.equal(s.players[1].shields.length,0);
 assert.ok(has(s,1,'hand',next));
});
