import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,cast,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const GAIZEKI='dmrp17-009',GUARD='dmrp17-034',CRIME='dmrp16-013';
const SMALL='dm01-108',WATER='dm01-083',HAND='dm01-027',FORTRESS='dm06-008';
const DOG='dmrp14-087',EX='dmrp18-s10',KALEIKO='dm22ex1-086',FUJIN='dmrp22-037';
const NOVA='dmbd15-be1',SWORD='dmr21-l02';
function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(16).fill(SMALL));
 return s;
}
function add(s,p,zone,id,props){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const choices=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>choices(s)[a.choice]===(value?.uid??value));
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const restore=s=>JSON.parse(JSON.stringify(s));
function burn(s,p,shield){
 s.phase='main';
 s.extTasks=[{op:'g61_Core',p,source:FORTRESS}];
 act(s,'toAttack');
 pick(s,shield);
}

test('Phase 884 verifies three complete official definitions and distinct existing catalogue IDs',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-884.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[GAIZEKI,GUARD,CRIME]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const detail=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(detail.faces,row.faces);
  assert.deepEqual(standardCardSpec(detail,{phase:884}),row.spec);
  assert.throws(()=>standardCardSpec(detail,{phase:883}));
  const changed=structuredClone(detail);
  changed.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(changed,{phase:884}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.civilizations,c.power,c.race,c.manaValue,c.limit],
   [row.id===GAIZEKI?'creature':'spell',f.cost,f.civilizations,Number(f.powerText),f.race,1,4]);
  assert.ok(registry.get(row.id).supported);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);
 }
});

test('Gaizeki gains EX Life from the top card and can attack immediately to break two shields',()=>{
 const s=field(),top=s.players[0].deck[0];
 cast(s,GAIZEKI);
 const creature=s.players[0].battle[0];
 assert.deepEqual(e.exLifeShields(s,0,creature).map(x=>x.uid),[top.uid]);
 attack(s,creature.uid);
 act(s,'noBlock');
 act(s,'breakShields',a=>a.shields.length===2);
 drain(s);
 assert.equal(s.metrics[0].breaks,2);
 assert.equal(s.players[1].shields.length,3);
});

test('Gaizeki sees its own EX Life shield actually hit the grave and can draw',()=>{
 const s=field();
 cast(s,GAIZEKI);
 const creature=s.players[0].battle[0],shield=e.exLifeShields(s,0,creature)[0];
 const draw=s.players[0].deck[0];
 s.active=1;
 cast(s,HAND);
 act(s,'effect',a=>a.targets.some(t=>t.uid===creature.uid));
 assert.deepEqual(choices(s),[0,1,2]);
 assert.ok(has(s,0,'battle',creature)&&has(s,0,'grave',shield));
 pick(s,0);
 assert.ok(has(s,0,'hand',draw));
 assert.equal(e.exLifeShields(s,0,creature).length,0);
});

test('Gaizeki’s EX Life skips four revealed cards and works with no unrevealed card (QA 40495)',()=>{
 for(const fifth of [false,true]){
  const s=field();
  give(s,0,'deck',[GAIZEKI,SMALL,SMALL,SMALL,...(fifth?[WATER]:[])]);
  const [gaizeki,,,,fifthCard]=s.players[0].deck;
  s.extTasks=[{op:'g8_Final',p:0,source:NOVA}];
  act(s,'toAttack');
  pick(s,gaizeki);
  pick(s,null);
  pick(s,gaizeki);
  drain(s);
  assert.ok(has(s,0,'battle',gaizeki));
  assert.deepEqual(e.exLifeShields(s,0,gaizeki).map(x=>x.uid),fifth?[fifthCard.uid]:[]);
  assert.equal(s.players[0].deck.length,3);
 }
});

test('Gaizeki keeps its EX Life shield when Revolution Change fails (QA 39685)',()=>{
 const s=field();
 cast(s,GAIZEKI);
 const attacker=s.players[0].battle[0],shield=e.exLifeShields(s,0,attacker)[0];
 const sword=add(s,0,'hand',SWORD);
 attack(s,attacker.uid);
 pick(s,true);
 pick(s,attacker);
 assert.ok(has(s,0,'battle',attacker)&&has(s,0,'hand',sword)&&has(s,0,'shields',shield));
 assert.equal(s.attack.attacker,attacker.uid);
 assert.equal(s.players[0].grave.length,0);
});

test('Each physical card in a buried stack gives Gaizeki one independent mode',()=>{
 let s=field();
 add(s,0,'battle',GAIZEKI);
 const root=s.players[0].shields[0],under=inst(WATER);
 root.shieldStack=[under];
 const enemy=add(s,1,'battle',SMALL);
 const first=add(s,1,'hand',SMALL),second=add(s,1,'hand',WATER);
 burn(s,1,root);
 assert.ok(has(s,0,'grave',root)&&has(s,0,'grave',under));
 act(s,'orderEffect',a=>a.cardId===GAIZEKI);
 s=restore(s);
 pick(s,1);
 assert.equal(s.decision.player,1);
 pick(s,second);
 assert.ok(has(s,1,'hand',first)&&has(s,1,'grave',second));
 pick(s,2);
 pick(s,enemy);
 assert.ok(s.players[1].battle.find(x=>x.uid===enemy.uid).tapped);
 assert.equal(s.players[0].hand.length,0);
 assert.equal(s.decision,null);
});

test('Gaizeki does not react to an opposing shield or to its own ordinary break',()=>{
 const s=field();
 add(s,0,'battle',GAIZEKI);
 burn(s,0,s.players[1].shields[0]);
 assert.equal(s.decision,null);
 const attacker=add(s,1,'battle',SMALL);
 s.active=1;
 attack(s,attacker.uid);
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[0].hand.length,1);
 assert.equal(s.decision,null);
});

test('Guard places the friendly choice first, then the opposing choice, face up in their respective zones',()=>{
 let s=field();
 const ally=add(s,0,'battle',SMALL),enemy=add(s,1,'battle',WATER);
 const protect=add(s,1,'battle',WATER,{justDiverActive:true});
 cast(s,GUARD);
 assert.deepEqual(choices(s),[ally.uid]);
 pick(s,ally);
 assert.equal(s.players[0].shields.at(-1).uid,ally.uid);
 assert.equal(s.players[0].shields.at(-1).faceUp,true);
 assert.deepEqual(choices(s),[enemy.uid]);
 s=restore(s);
 pick(s,enemy);
 assert.equal(s.players[1].shields.at(-1).uid,enemy.uid);
 assert.equal(s.players[1].shields.at(-1).faceUp,true);
 assert.ok(has(s,1,'battle',protect));
});

test('Guard still shields an enemy if no friendly target exists or EX Life replaces the friendly move',()=>{
 for(const withEx of [false,true]){
  const s=field();
  if(withEx)cast(s,EX);
  const ally=s.players[0].battle[0],shield=ally&&e.exLifeShields(s,0,ally)[0];
  const enemy=add(s,1,'battle',WATER);
  cast(s,GUARD);
  if(withEx){
   pick(s,ally);
   assert.ok(has(s,0,'battle',ally)&&has(s,0,'grave',shield));
  }
  assert.deepEqual(choices(s),[enemy.uid]);
  pick(s,enemy);
  assert.ok(has(s,1,'shields',enemy));
 }
});

test('Guard casts for free as a Shield Trigger and removes the attacker',()=>{
 const s=field(),enemy=add(s,1,'battle',SMALL);
 give(s,0,'mana',[]);
 give(s,0,'shields',[GUARD]);
 const shield=s.players[0].shields[0];
 s.active=1;
 attack(s,enemy.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.uid===shield.uid);
 pick(s,enemy);
 assert.ok(has(s,0,'grave',shield)&&has(s,1,'shields',enemy));
 assert.equal(s.players[1].shields.at(-1).faceUp,true);
 assert.equal(s.attack,null);
});

test('Crime adds two separate face-down shields and returns all cards in one chosen stack',()=>{
 let s=field();
 give(s,0,'shields',[WATER]);
 const root=s.players[0].shields[0],under=inst(SMALL);
 root.shieldStack=[under];
 const [first,second]=s.players[0].deck;
 cast(s,CRIME);
 assert.deepEqual(s.players[0].shields.map(x=>x.uid),[root.uid,first.uid,second.uid]);
 assert.ok(!first.faceUp&&!second.faceUp);
 assert.deepEqual(choices(s),[root.uid,first.uid,second.uid]);
 s=restore(s);
 pick(s,root);
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),[root.uid,under.uid]);
 assert.equal(s.metrics[0].breaks,0);
 assert.equal(s.players[0].brokenThisTurn||0,0);
});

test('Crime allows an actual S Trigger from a new shield, without a break or a second Watchdog draw',()=>{
 const s=field();
 add(s,0,'battle',DOG);
 const enemy=add(s,1,'battle',SMALL),trigger=inst(HAND);
 s.players[0].deck.unshift(trigger);
 const drawn=s.players[0].deck[2];
 cast(s,CRIME);
 pick(s,trigger);
 act(s,'useTrigger',a=>a.uid===trigger.uid);
 act(s,'effect',a=>a.targets.some(t=>t.uid===enemy.uid));
 drain(s);
 assert.ok(has(s,0,'grave',trigger)&&has(s,1,'grave',enemy));
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),[drawn.uid]);
 assert.equal(s.metrics[0].breaks,0);
 assert.ok(!s.log.some(x=>x.type==='break'));
});

test('Crime still takes a shield if placement is prohibited or redirected to the grave',()=>{
 for(const limit of [KALEIKO,FUJIN]){
  const s=field();
  add(s,1,'battle',limit);
  const [first,second]=s.players[0].deck,old=s.players[0].shields[0];
  cast(s,CRIME);
  assert.equal(s.players[0].shields.length,5);
  assert.equal(has(s,0,'grave',first)&&has(s,0,'grave',second),limit===KALEIKO);
  pick(s,old);
  assert.ok(has(s,0,'hand',old));
 }
});
