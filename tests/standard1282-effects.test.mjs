import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {manaZoneHTML} from '../dist/manual-ui.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const DRIFT='dm22rp2-055',FAIRY='dm22rp2-S7',DEVICE='dm22rp2-064',DIG='dm22rp2-032';
const PLAIN='dm01-108',THREE='dm01-105',FIRE='dm01-s08',SPIRAL='dm01-086';
const SEED='dm22rp2-048',DUAL='dm22rp2-050',HYBRID='dm22rp1-3A',BIRD='dmex18-029',AMO='dmrp19-s10';
const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-1282.json',import.meta.url)));
function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(25).fill(PLAIN));
 return s;
}
function add(s,p,zone,id,extra={}){
 const x=Object.assign(inst(id),extra);s.players[p][zone].push(x);return x;
}
function play(s,id){
 const x=add(s,s.active,'hand',id);act(s,'play',a=>a.uid===x.uid);return x;
}
const pick=(s,wanted)=>act(s,'extended',a=>{
 const value=s.decision.choices[a.choice].value;
 return typeof wanted==='function'?wanted(value):(value?.uid??value)===wanted;
});
const options=s=>s.decision.choices.map(({value})=>value?.uid??value);
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
function nextTurn(s){s.phase='attack';act(s,'endTurn');drain(s);}
function exposeShield(s,id){
 const attacker=add(s,1,'battle',PLAIN);
 give(s,0,'shields',[id]);
 const shield=s.players[0].shields[0];
 attack(s,attacker.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 if(s.decision?.type==='breakShields')act(s,'breakShields',a=>a.shields.includes(shield.uid));
 return shield;
}

test('four original cards and ten official alternate prints resolve with one definition per name',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 assert.deepEqual(manifest.cards.map(x=>x.id),[DRIFT,FAIRY,DEVICE,DIG]);
 assert.equal(manifest.printAliases.length,10);
 for(const x of [...manifest.cards,...manifest.printAliases]){
  const id=x.canonicalId??x.id,definition=e.card(id);
  assert.equal(manifest.regulationVerification.limits[x.id],4);
  assert.equal(definition.limit,4);
  assert.equal(nameKey(definition.name),nameKey(x.name));
  if(x.canonicalId)assert.equal(snapshot.aliases[x.id],id);
  else assert.equal(CARD_IMAGES[id],x.image);
  assert.deepEqual(refs.find(y=>y.id===x.id),{id:x.id,canonicalId:id,name:x.name,image:x.image,source:x.source});
  assert.deepEqual(standardCardSpec({status:'complete',id:x.id,faces:x.faces},{phase:1282}),x.spec);
  const deck=structuredClone(PRESETS[0]);deck.cards[0].count--;deck.cards.push({id,count:1});
  assert.deepEqual(e.validateDeck(deck),[]);
  assert.equal(registry.get(x.id).id,id);
 }
});

test('Drift untaps only its selected ally and gives power and Blocker until its own start',()=>{
 const s=field(),ally=add(s,0,'battle',PLAIN,{tapped:true}),other=add(s,0,'battle',PLAIN,{tapped:true});
 add(s,0,'battle',SEED);add(s,1,'battle',FIRE);
 play(s,DRIFT);assert.deepEqual(options(s),[ally.uid,other.uid]);pick(s,ally.uid);
 assert.equal(ally.tapped,false);assert.equal(other.tapped,true);
 assert.equal(e.power(ally,false,s),5000);assert.ok(e.effectiveCard(ally,s).blocker);
 nextTurn(s);assert.equal(e.power(ally,false,s),5000);assert.ok(e.effectiveCard(ally,s).blocker);
 nextTurn(s);assert.equal(e.power(ally,false,s),2000);assert.ok(!e.effectiveCard(ally,s).blocker);
});

test('Drift still grants both benefits when the selected creature stays tapped or was already untapped',()=>{
 for(const tapped of [true,false]){
  const s=field(),ally=add(s,0,'battle',PLAIN,{tapped,tapLocks:tapped?[0]:[]});
  play(s,DRIFT);pick(s,ally.uid);
  assert.equal(ally.tapped,tapped);
  assert.equal(e.power(ally,false,s),5000);assert.ok(e.effectiveCard(ally,s).blocker);
 }
});

test('Drift’s power and Blocker follow its creature through evolution',()=>{
 const s=field(),ally=add(s,0,'battle',PLAIN,{tapped:true});
 play(s,DRIFT);pick(s,ally.uid);
 // Nature evolution deck fixture: the base has the Beast Folk race.
 const evolution=add(s,0,'hand','dm02-s05');
 act(s,'play',a=>a.uid===evolution.uid);act(s,'evolve',a=>a.baseUid===ally.uid);drain(s);
 assert.equal(e.power(evolution,false,s),e.card(evolution).power+3000);
 assert.ok(e.effectiveCard(evolution,s).blocker);
 nextTurn(s);nextTurn(s);
 assert.equal(e.power(evolution,false,s),e.card(evolution).power);
 assert.ok(!e.effectiveCard(evolution,s).blocker);
});

test('Drift casts from a broken shield and its creature can block a subsequent attack',()=>{
 const s=field(1),ally=add(s,0,'battle',PLAIN,{tapped:true});
 const next=add(s,1,'battle',PLAIN),shield=exposeShield(s,DRIFT);
 act(s,'useTrigger');pick(s,ally.uid);drain(s);
 assert.ok(has(s,0,'grave',shield));assert.equal(ally.tapped,false);
 attack(s,next.uid);act(s,'block',a=>a.uid===ally.uid);
 assert.ok(has(s,0,'battle',ally)&&has(s,1,'grave',next));
});

test('Fairy puts the top card into mana tapped and counts its own nature Tamaseeds once each',()=>{
 const s=field();give(s,0,'battle',[PLAIN,THREE,'dm22rp2-S8']);
 const top=s.players[0].deck[0];add(s,1,'battle',PLAIN);
 play(s,FAIRY);drain(s);
 assert.equal(s.players[0].mana.at(-1).uid,top.uid);assert.equal(top.tapped,true);
 assert.equal(e.manaValueAt(s,0,top),1);
 const seed=add(s,0,'battle',DUAL);assert.equal(e.manaValueAt(s,0,top),2);
 assert.equal(e.manaValueAt(s,1,s.players[1].mana.at(-1)),1);
 seed.sealed=true;assert.equal(e.manaValueAt(s,0,top),1);
});

test('Fairy permits paying an odd cost with two mana cards in normal and manual play (QA 42509)',()=>{
 for(const manualMana of [false,true]){
  let s=field();give(s,0,'battle',[FAIRY,PLAIN,PLAIN,SEED,DUAL]);
  give(s,0,'mana',Array(3).fill(PLAIN));const hand=add(s,0,'hand',THREE);
  const a=e.getLegalActions(s).find(x=>x.kind==='play'&&x.uid===hand.uid);
  assert.equal(a.cost,3);e.step(s,a,{manualMana});
  if(manualMana){
   const [first,second,third]=s.players[0].mana;
   act(s,'selectMana',v=>v.uid===first.uid);
   assert.equal(e.manaSelectionStatus(s.decision).valid,false);
   s=JSON.parse(JSON.stringify(s));act(s,'selectMana',v=>v.uid===second.uid);
   assert.deepEqual([e.manaSelectionStatus(s.decision).amount,e.manaSelectionStatus(s.decision).valid],[4,true]);
   act(s,'selectMana',v=>v.uid===third.uid);
   assert.equal(e.manaSelectionStatus(s.decision).valid,false);
   act(s,'selectMana',v=>v.uid===third.uid);act(s,'confirmMana');
  }
  assert.ok(has(s,0,'battle',hand));
  assert.equal(s.players[0].mana.filter(x=>x.tapped).length,2);
 }
});

test('Fairy changes zero and face-down mana but keeps one civilization per card and Birds at one (QA 43061)',()=>{
 const s=field();give(s,0,'battle',[FAIRY,PLAIN,PLAIN,SEED,DUAL,BIRD]);
 const zero=add(s,0,'mana','dm27-055'),hidden=add(s,0,'mana',PLAIN,{faceDown:true});
 s.players[0].mana=[zero,hidden];
 const pool=e.paymentPool(s,0),bird=pool.find(x=>x.paymentBird);
 assert.deepEqual(pool.map(x=>e.manaValueAt(s,0,x)),[2,2,1]);
 assert.equal(e.manaValue(e.card(zero)),0);
 assert.equal(e.manaPayment([pool[0]],{cost:2,civilizations:['自然','水']}),null);
 assert.ok(e.manaPayment([pool[0],bird],{cost:3,civilizations:['自然','水']}));
 const origin={...e.card('dm34-034'),cost:3};
 const originPool=e.paymentPool(s,0,[],origin);
 assert.equal(e.manaPayment(originPool,origin)?.length,2);
 const html=manaZoneHTML(pool,{art:()=>'',state:s});
 assert.match(html,/すべての文明 · 1マナ/);assert.match(html,/無色 · 2マナ/);
});

test('only mana present on World Barom’s entry is set to zero (QA 45911)',()=>{
 const s=field(),world=data.cards.find(c=>c.g35Role==='world').id;
 give(s,0,'battle',Array(5).fill('dm24ex2-066'));
 give(s,1,'battle',[FAIRY,PLAIN,PLAIN,SEED,DUAL]);give(s,1,'mana',[PLAIN]);
 cast(s,world);
 while(s.decision?.task?.op==='g31_Bases')pick(s,v=>!!v);
 drain(s);
 assert.equal(e.manaValueAt(s,1,s.players[1].mana[0]),0);
 nextTurn(s);
 const charge=add(s,1,'hand',PLAIN);act(s,'charge',a=>a.uid===charge.uid);
 assert.deepEqual(s.players[1].mana.map(x=>e.manaValueAt(s,1,x)),[0,2]);
});

test('Device offers only creatures to discard and its minus power expires at end of turn',()=>{
 const s=field(),payment=add(s,0,'hand',PLAIN),spell=add(s,0,'hand',SPIRAL);
 const foe=add(s,1,'battle',FIRE);add(s,1,'battle',SEED);add(s,0,'battle',PLAIN);
 play(s,DEVICE);assert.deepEqual(options(s),[payment.uid,null]);pick(s,payment.uid);
 assert.deepEqual(options(s),[foe.uid]);pick(s,foe.uid);drain(s);
 assert.ok(has(s,0,'grave',payment)&&has(s,0,'hand',spell));
 assert.equal(e.power(foe,false,s),e.card(foe).power-2000);
 nextTurn(s);assert.equal(e.power(foe,false,s),e.card(foe).power);
});

test('Device can decline and destroys at zero after an actual discard',()=>{
 for(const pay of [false,true]){
  const s=field(),payment=add(s,0,'hand',PLAIN),foe=add(s,1,'battle',PLAIN);
  play(s,DEVICE);pick(s,pay?payment.uid:null);
  if(pay)pick(s,foe.uid);
  drain(s);assert.equal(has(s,0,'grave',payment),pay);assert.equal(has(s,1,'grave',foe),pay);
 }
});

test('Device still chooses a creature after Amodegoras replaces the discard and applies no power loss',()=>{
 const s=field(),payment=add(s,0,'hand',PLAIN),foe=add(s,1,'battle',PLAIN);
 add(s,0,'battle',AMO);
 play(s,DEVICE);pick(s,payment.uid);pick(s,v=>v?.g1090Mana);
 assert.deepEqual(options(s),[foe.uid]);pick(s,foe.uid);drain(s);
 assert.ok(has(s,0,'mana',payment)&&has(s,1,'battle',foe));
 assert.equal(e.power(foe,false,s),2000);
});

test('Device serializes an unlimited power reduction through the target choice',()=>{
 for(const targetId of [FIRE,'dm25bd2-007']){
  let s=field();const payment=add(s,0,'hand','dmrp15-km1'),foe=add(s,1,'battle',targetId);
  play(s,DEVICE);pick(s,payment.uid);
  assert.ok(s.decision.choices.every(x=>Number.isFinite(x.score)));
  s=JSON.parse(JSON.stringify(s));pick(s,foe.uid);drain(s);
  assert.ok(has(s,0,'grave',payment)&&has(s,1,'grave',foe));
 }
});

test('Diggle reduces costs to use both kinds of Tamaseed without reducing other card types',()=>{
 const s=field();const dig=play(s,DIG);drain(s);
 const ids=[HYBRID,SEED,SPIRAL,THREE,'dm22rp2-S8'];
 const costs=()=>ids.map(id=>e.summonCost(s,0,e.card(id)));
 assert.deepEqual(costs(),[2,1,2,3,2]);
 for(const id of ids) add(s,0,'hand',id);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='play'&&a.cardId===HYBRID&&a.cost===2));
 play(s,DIG);drain(s);assert.deepEqual(costs(),[1,1,2,3,1]);
 assert.equal(e.summonCost(s,1,e.card(HYBRID)),4);
 assert.ok(dig.justDiverActive);
});

test('Diggle Just Diver prevents opposing choices and attacks until its controller starts a turn',()=>{
 const s=field(),dig=play(s,DIG),plain=add(s,0,'battle',PLAIN);
 drain(s);nextTurn(s);act(s,'skipCharge');
 dig.tapped=true;
 cast(s,SPIRAL);
 assert.ok(s.decision.targets.every(t=>t.uid!==dig.uid));
 act(s,'effect',a=>a.targets[0].uid===plain.uid);
 const enemy=add(s,1,'battle',PLAIN);act(s,'toAttack');
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===enemy.uid&&a.target===dig.uid));
 nextTurn(s);assert.ok(!dig.justDiverActive);
});

test('Diggle declares G-Strike from a broken shield',()=>{
 const s=field(1),future=add(s,1,'battle',PLAIN),shield=exposeShield(s,DIG);
 assert.equal(s.decision.task.op,'gsDeclare');pick(s,true);
 assert.equal(s.decision.task.op,'gsTarget');pick(s,future.uid);drain(s);
 assert.ok(has(s,0,'hand',shield)&&e.attackLocked(s,1,future));
});
