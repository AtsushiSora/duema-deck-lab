import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const LUNA='dm22rp2-012',NEX='dm22rp2-006',RICH='dm22rp2-003';
const PLAIN='dm01-108',DARK='dm01-090',FIRE='dm01-097',SPIRAL='dm01-086',HAND='dm01-027';
const SEED='dm22rp2-048',DUAL='dm22rp2-050',HYBRID='dm22rp1-3A',LIONEL='dmrp21-1A',JAOU='dmrp15-028';
const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-1283.json',import.meta.url)));
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
const lunaCost=(s,p=0)=>e.summonCost(s,p,e.card(LUNA));
function nextTurn(s){s.phase='attack';act(s,'endTurn');drain(s);}
function passBlock(s){if(s.decision?.type==='block')act(s,'noBlock');}

test('eight official prints share three canonical definitions and preserve deck limits',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 assert.deepEqual(manifest.cards.map(x=>x.id),[LUNA,NEX,RICH]);
 assert.equal(manifest.printAliases.length,5);
 for(const x of [...manifest.cards,...manifest.printAliases]){
  const id=x.canonicalId??x.id,c=e.card(id),face=x.faces[0];
  assert.deepEqual([c.cost,c.power,c.manaValue,c.civilizations,c.race,c.limit],
   [face.cost,Number(face.powerText),1,face.civilizations,face.race,4]);
  assert.equal(manifest.regulationVerification.limits[x.id],4);
  assert.equal(nameKey(c.name),nameKey(x.name));
  assert.deepEqual(standardCardSpec({...x,status:'complete'},{phase:1283}),x.spec);
  assert.equal(registry.get(x.id).id,id);
  if(!x.canonicalId)assert.equal(CARD_IMAGES[id],x.image);
  assert.deepEqual(refs.find(y=>y.id===x.id),{id:x.id,canonicalId:id,name:x.name,image:x.image,source:x.source});
  const deck=structuredClone(PRESETS[0]);deck.cards[0].count--;deck.cards.push({id,count:1});
  assert.deepEqual(e.validateDeck(deck),[]);
 }
});

test('Luna counts own spell and seed executions, including a hybrid, and floors a paid summon at one',()=>{
 let s=field();assert.equal(lunaCost(s),7);
 play(s,PLAIN);assert.equal(lunaCost(s),7);
 cast(s,SPIRAL);drain(s);assert.equal(lunaCost(s),4);
 play(s,SEED);assert.equal(lunaCost(s),1);
 play(s,HYBRID);drain(s);assert.equal(lunaCost(s),1);
 s=JSON.parse(JSON.stringify(s));
 give(s,0,'mana',['dm01-083']);
 const luna=play(s,LUNA);drain(s);
 assert.ok(has(s,0,'battle',luna));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,1);
 nextTurn(s);assert.equal(lunaCost(s),7);
});

test('Luna counts the owner’s spell even when the other player casts it (QA 32503)',()=>{
 const s=field(1),spell=add(s,1,'hand',SPIRAL,{cardOwner:0});
 act(s,'play',a=>a.uid===spell.uid);drain(s);
 assert.deepEqual([lunaCost(s),lunaCost(s,1)],[4,7]);
});

test('a directly deployed seed triggers NEX and leaves Luna’s cost unchanged (QA 42046)',()=>{
 const s=field(),seed=add(s,0,'hand','dm22rp1-031'),nex=add(s,0,'battle',NEX);
 const base=add(s,0,'battle','dm01-075');
 cast(s,LIONEL);act(s,'evolve',a=>a.baseUid===base.uid);
 pick(s,seed.uid);
 assert.ok(has(s,0,'battle',seed));
 if(s.decision?.type==='effectOrder')act(s,'orderEffect',a=>a.uid===nex.uid);
 assert.equal(s.decision?.source,NEX,JSON.stringify(s.decision));pick(s,1);drain(s);
 assert.equal(lunaCost(s),7);
});

test('Luna counts a real unpaid shield trigger in the turn it is used',()=>{
 const s=field(1),attacker=add(s,1,'battle',PLAIN);
 give(s,0,'shields',[SPIRAL]);
 attack(s,attacker.uid);passBlock(s);
 if(s.decision?.type==='breakShields')act(s,'breakShields');
 act(s,'useTrigger');drain(s);
 assert.deepEqual([lunaCost(s),lunaCost(s,1)],[4,7]);
 nextTurn(s);assert.equal(lunaCost(s),7);
});

test('Luna draws before selecting an opponent and returns a borrowed creature to its owner',()=>{
 const s=field(),top=s.players[0].deck[0];
 const borrowed=add(s,1,'battle',PLAIN,{cardOwner:0});
 add(s,1,'battle',SEED);add(s,0,'battle',PLAIN);
 const luna=play(s,LUNA);
 assert.ok(has(s,0,'hand',top));
 assert.deepEqual(options(s),[borrowed.uid]);pick(s,borrowed.uid);drain(s);
 assert.ok(has(s,0,'hand',borrowed)&&!has(s,1,'hand',borrowed));
 assert.equal(e.effectiveCard(luna,s).blocker,true);
 assert.equal(e.effectiveCard(luna,s).breaker,2);
});

test('NEX sees its own entry as the first seed and draws even from an empty hand',()=>{
 const s=field(),top=s.players[0].deck[0];
 play(s,NEX);
 assert.deepEqual(options(s),[0,1,2]);
 pick(s,0);drain(s);assert.ok(has(s,0,'hand',top));
 play(s,SEED);assert.equal(s.decision,null);
 play(s,NEX);assert.equal(s.decision,null);
});

test('NEX discards a selected card before its mandatory draw',()=>{
 const s=field(),payment=add(s,0,'hand',PLAIN),top=s.players[0].deck[0];
 play(s,NEX);pick(s,0);assert.deepEqual(options(s),[payment.uid]);
 pick(s,payment.uid);drain(s);
 assert.ok(has(s,0,'grave',payment)&&has(s,0,'hand',top));
});

test('NEX destroys only an opposing creature or Tamaseed with cost up to two',()=>{
 const s=field(),low=add(s,1,'battle',PLAIN),seed=add(s,1,'battle',SEED);
 add(s,1,'battle',RICH);add(s,1,'battle','dm14-028');add(s,0,'battle',PLAIN);
 play(s,NEX);pick(s,1);
 assert.deepEqual(options(s),[low.uid,seed.uid]);pick(s,seed.uid);drain(s);
 assert.ok(has(s,1,'grave',seed)&&has(s,1,'battle',low));
});

test('NEX picks either side for Speed Attacker and the grant ends this turn',()=>{
 const s=field(),ally=play(s,PLAIN),foe=add(s,1,'battle',FIRE);
 play(s,NEX);pick(s,2);assert.deepEqual(new Set(options(s)),new Set([ally.uid,foe.uid]));
 pick(s,ally.uid);act(s,'toAttack');
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===ally.uid&&a.target==='player'));
 nextTurn(s);assert.ok(!e.effectiveCard(ally,s).speedAttacker);
});

test('NEX triggers for a shield Tamaseed on the opponent’s turn and for a hybrid on the next turn',()=>{
 const s=field(1),first=add(s,0,'battle',NEX),second=add(s,0,'battle',NEX);
 play(s,SEED);assert.equal(s.decision,null);
 const attacker=add(s,1,'battle',PLAIN);give(s,0,'shields',['dmrp22-013']);
 attack(s,attacker.uid);passBlock(s);
 if(s.decision?.type==='breakShields')act(s,'breakShields');
 act(s,'useTrigger');
 const shieldSeed=s.players[0].battle.find(x=>x.cardId==='dmrp22-013');
 assert.ok(shieldSeed);
 for(const watcher of [first,second]){
  if(s.decision?.type==='entryOrder')act(s,'orderEntry',a=>a.uid===watcher.uid);
  if(s.decision?.type==='effectOrder')act(s,'orderEffect',a=>a.uid===watcher.uid);
  assert.equal(s.decision?.source,NEX,JSON.stringify(s.decision));
  pick(s,0);
 }
 drain(s);
 nextTurn(s);act(s,'skipCharge');play(s,HYBRID);
 assert.equal(lunaCost(s),4);
 assert.ok(s.pendingEffects.some(x=>x.source===NEX)||s.decision?.source===NEX);
 drain(s);
});

test('NEX records a muted first entry and only triggers for pure Tamaseed through Brakkio (QA 42061)',()=>{
 const s=field();
 add(s,1,'battle','dmrp14-s05');
 give(s,0,'battle',[NEX,...Array(3).fill('dm01-083')]);
 play(s,HYBRID);assert.equal(s.decision,null);
 play(s,SEED);assert.equal(s.decision,null);
 nextTurn(s);nextTurn(s);act(s,'skipCharge');
 play(s,SEED);assert.equal(s.decision?.source,NEX);pick(s,0);drain(s);
});

test('Richie returns zero, one or two darkness cards including spells and multicolored cards',()=>{
 for(const n of [0,1,2]){
  const s=field(),dark=add(s,0,'grave',HAND),dual=add(s,0,'grave',DUAL),light=add(s,0,'grave',SPIRAL);
  const rich=play(s,RICH);
  assert.deepEqual(options(s),[dark.uid,dual.uid,null]);
  if(n>0)pick(s,dark.uid);
  if(n>1)pick(s,dual.uid);
  else pick(s,null);
  drain(s);
  assert.deepEqual([has(s,0,'hand',dark),has(s,0,'hand',dual),has(s,0,'grave',light)],[n>0,n>1,true]);
  const card=e.effectiveCard(rich,s);
  assert.deepEqual([card.blocker,card.slayer,card.breaker],[true,true,2]);
 }
});

test('Richie can summon with Abyss Rush, attack a player, and goes to deck bottom even without attacking',()=>{
 for(const attacks of [false,true]){
  const s=field(),rich=add(s,0,'grave',RICH);
  act(s,'play',a=>a.uid===rich.uid&&a.origin==='grave');drain(s);
  assert.ok(has(s,0,'battle',rich));act(s,'toAttack');
  assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===rich.uid&&a.target==='player'));
  if(attacks){attack(s,rich.uid);drain(s);}
  nextTurn(s);assert.equal(s.players[0].deck.at(-1).uid,rich.uid);
 }
});

test('Richie’s attack checks its own darkness creatures and seeds and discards the opponent’s whole hand',()=>{
 for(const ready of [false,true]){
  const s=field(),rich=add(s,0,'battle',RICH);
  for(let n=0;n<3;n++)add(s,0,'battle',DARK);
  if(ready)add(s,0,'battle',DUAL);
  const hand=add(s,1,'hand',DARK);const second=add(s,1,'hand',FIRE);add(s,1,'battle',DARK);
  attack(s,rich.uid);
  assert.deepEqual([has(s,1,'grave',hand),has(s,1,'grave',second)],[ready,ready]);
  drain(s);
 }
});

test('Richie and Jaoumon can resolve in either order, checking Civil Count on resolution (QA 42949)',()=>{
 for(const jaouFirst of [false,true]){
  const s=field(),rich=add(s,0,'battle',RICH);
  for(let n=0;n<3;n++)add(s,0,'battle',DARK);
  const spell=add(s,0,'hand',JAOU),dark=inst(DARK),enemyHand=add(s,1,'hand',FIRE);
  s.players[0].deck.unshift(dark);give(s,0,'shields',[]);
  attack(s,rich.uid);pick(s,true);
  act(s,'orderEffect',a=>a.uid===(jaouFirst?spell.uid:rich.uid));
  if(s.decision?.type==='extended'&&s.decision.task.op==='g3_AttackSpell')pick(s,true);
  if(s.decision?.type==='extended'&&s.decision.task.op==='g3_JaouDeploy')pick(s,dark.uid);
  drain(s);
  assert.ok(has(s,0,'battle',dark));
  assert.equal(has(s,1,'grave',enemyHand),jaouFirst);
 }
});
