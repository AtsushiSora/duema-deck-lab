import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const KAISER='dm22rp2-OR1',WAG='dm23rp1-060',STECK='dm23rp1-037',SAD='dm23rp1-056';
const BALA='dm22rp2-S6',BOL='dm01-008',F='dm01-097',N='dm01-108',W='dm01-083',SEED='dmsd21-014';
const KILL='dm01-027',BIG='dm01-s09',NEO='dm24ex2-068';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const manifest=read('tools/support-phase-1286.json');
function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(25).fill(N));
 return s;
}
function add(s,p,zone,id,extra={}){
 const x=Object.assign(inst(id),extra);s.players[p][zone].push(x);return x;
}
function play(s,id,face=0){
 const x=add(s,s.active,'hand',id);act(s,'play',a=>a.uid===x.uid&&(a.face??0)===face);return x;
}
const picks=s=>s.decision.choices.map(({value})=>value?.uid??value);
const pick=(s,value)=>act(s,'extended',a=>Object.is(picks(s)[a.choice],value));
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
function passBlock(s){if(s.decision?.type==='block')act(s,'noBlock');}

test('seven official prints share four canonical definitions and exact printed faces',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(manifest.cards.map(x=>x.id),[KAISER,WAG,STECK,SAD]);
 assert.equal(manifest.printAliases.length,3);
 for(const x of [...manifest.cards,...manifest.printAliases]){
  const id=x.canonicalId??x.id,c=e.card(id),[front,back]=x.faces;
  assert.deepEqual([c.cost,c.power,c.manaValue,c.civilizations,c.race,c.limit],
   [front.cost,parseInt(front.powerText,10),1,front.civilizations,front.race,4]);
  assert.equal(manifest.regulationVerification.limits[x.id],4);
  assert.equal(nameKey(c.name),nameKey(x.name));
  assert.deepEqual(standardCardSpec({...x,status:'complete'},{phase:1286}),x.spec);
  if(back){
   assert.deepEqual([c.spellFace.name,c.spellFace.cost,c.spellFace.civilizations,c.spellFace.text],
    [back.name,back.cost,back.civilizations,back.abilityText]);
  }
  assert.equal(registry.get(x.id).id,id);
  if(!x.canonicalId)assert.equal(CARD_IMAGES[id],x.image);
  assert.deepEqual(refs.find(y=>y.id===x.id),{id:x.id,canonicalId:id,name:x.name,image:x.image,source:x.source});
  const deck=structuredClone(PRESETS[0]);deck.cards[0].count--;deck.cards.push({id,count:1});
  assert.deepEqual(e.validateDeck(deck),[]);
 }
});

test('Kaiser counts fire creatures and seeds once and gains power only in battle',()=>{
 const s=field();
 const kaiser=add(s,0,'battle',KAISER,{entered:s.turn});
 add(s,0,'battle',F);
 add(s,0,'battle',W);
 add(s,0,'battle',BALA,{faceDown:true});
 const enemy=add(s,1,'battle',BIG,{tapped:true});
 add(s,1,'battle',F);
 assert.equal(e.matchupPower(kaiser,enemy,true,s),5000);
 assert.equal(e.canCreatureAttack(s,0,kaiser),false);
 add(s,0,'battle',SEED);
 assert.equal(e.canCreatureAttack(s,0,kaiser),true);
 assert.equal(e.power(kaiser,true,s),5000);
 assert.equal(e.matchupPower(kaiser,enemy,true,s),55000);
 assert.equal(e.effectiveCard(kaiser,s).breaker??1,1);
 attack(s,kaiser.uid,enemy.uid);passBlock(s);drain(s);
 assert.ok(has(s,0,'battle',kaiser)&&has(s,1,'grave',enemy));
});

test('Kaiser checks Civil Count at the attack declaration with Balafior (QA 42519)',()=>{
 for(const count of [4,5]){
  const s=field(),kaiser=add(s,0,'battle',KAISER),bala=add(s,0,'battle',BALA);
  for(let n=2;n<count;n++)add(s,0,'battle',F);
  give(s,0,'deck',[F,...Array(15).fill(N)]);
  const top=s.players[0].deck[0];
  attack(s,kaiser.uid);
  if(s.decision?.type==='effectOrder')act(s,'orderEffect',a=>a.uid===bala.uid);
  passBlock(s);drain(s);
  assert.ok(has(s,0,'battle',top));
  assert.equal(kaiser.tapped,count===4);
  assert.equal(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===kaiser.uid),count===5);
  assert.equal(s.players[1].shields.length,4);
  if(count===5){
   attack(s,kaiser.uid);passBlock(s);drain(s);
   assert.equal(kaiser.tapped,false);
   assert.equal(s.players[1].shields.length,3);
  }
 }
});

test('Kaiser draws before an optional non-evolution Bolshack Dragon deployment',()=>{
 for(const accept of [false,true]){
  const s=field(1),kaiser=add(s,0,'battle',KAISER);
  give(s,0,'deck',[BOL,...Array(15).fill(N)]);
  const dragon=s.players[0].deck[0];
  const evo=add(s,0,'hand','dmrp17-km1');
  const bird=add(s,0,'hand','dm24rp1-070');
  const unrelated=add(s,0,'hand','dm08-049');
  assert.ok(e.card(unrelated.cardId).race.includes('ドラゴン'));
  play(s,KILL);act(s,'effect',a=>a.targets[0].uid===kaiser.uid);
  assert.ok(has(s,0,'grave',kaiser));
  assert.ok(has(s,0,'hand',dragon));
  assert.equal(s.decision.player,0);
  assert.deepEqual(new Set(picks(s)),new Set([dragon.uid,null]));
  pick(s,accept?dragon.uid:null);drain(s);
  assert.ok(has(s,0,accept?'battle':'hand',dragon));
  assert.ok([evo,bird,unrelated].every(x=>has(s,0,'hand',x)));
  assert.ok(s.players[0].mana.every(x=>!x.tapped));
 }
});

test('Kaiser can deploy a NEO Bolshack Dragon as an evolution (QA 31571)',()=>{
 const s=field(1),kaiser=add(s,0,'battle',KAISER),base=add(s,0,'battle',F);
 const neo=add(s,0,'hand',NEO);
 play(s,KILL);act(s,'effect',a=>a.targets[0].uid===kaiser.uid);pick(s,neo.uid);pick(s,base.uid);drain(s);
 assert.ok(has(s,0,'battle',neo));
 assert.ok(e.isEvolution(s.players[0].battle.find(x=>x.uid===neo.uid)));
});

test('Wag may mill the top four and its creature side blocks and breaks three shields',()=>{
 for(const accept of [false,true]){
  const s=field(),before=s.players[0].deck.slice();
  const x=play(s,WAG);
  pick(s,accept?true:null);drain(s);
  assert.deepEqual(s.players[0].deck.map(x=>x.uid),before.slice(accept?4:0).map(x=>x.uid));
  assert.deepEqual(s.players[0].grave.map(x=>x.uid),before.slice(0,accept?4:0).map(x=>x.uid));
  const enemy=add(s,1,'battle',F);
  s.phase='attack';act(s,'endTurn');act(s,'skipCharge');
  attack(s,enemy.uid);act(s,'block',a=>a.uid===x.uid);drain(s);
  assert.ok(has(s,1,'grave',enemy));
  s.phase='attack';act(s,'endTurn');act(s,'skipCharge');
  attack(s,x.uid);passBlock(s);drain(s);
  assert.equal(s.players[1].shields.length,2);
 }
});

test('Wag spell requires one hidden opposing hand choice, including after a save',()=>{
 let s=field();
 const keep=add(s,1,'hand',F),lose=add(s,1,'hand',W);
 const spell=play(s,WAG,1);
 assert.deepEqual(picks(s),[0,1]);
 assert.ok(s.decision.choices.every(x=>!x.cardId&&/^裏向き/.test(x.label)));
 s=JSON.parse(JSON.stringify(s));pick(s,1);drain(s);
 assert.ok(has(s,1,'hand',keep)&&has(s,1,'grave',lose)&&has(s,0,'grave',spell));
 assert.equal(s.players[0].battle.length,0);
 play(s,WAG,1);drain(s);
 assert.equal(s.players[1].hand.length,0);
 play(s,WAG,1);drain(s);
 assert.equal(s.players[1].grave.length,2);
});

test('Steck Abyss Rush is a creature summon, breaks two shields and returns to the deck bottom',()=>{
 const s=field(),x=add(s,0,'grave',STECK);
 const actions=e.getLegalActions(s).filter(a=>a.uid===x.uid);
 assert.ok(actions.some(a=>a.kind==='play'&&a.manaPermit==='abyssRush'&&(a.face??0)===0));
 assert.ok(!actions.some(a=>a.face===1));
 act(s,'play',a=>a.uid===x.uid&&a.manaPermit==='abyssRush');drain(s);
 assert.ok(has(s,0,'battle',x));
 assert.ok(e.canCreatureAttack(s,0,s.players[0].battle.find(y=>x.uid===y.uid)));
 attack(s,x.uid);passBlock(s);drain(s);
 assert.equal(s.players[1].shields.length,3);
 act(s,'endTurn');drain(s);
 assert.equal(s.players[0].deck.at(-1).uid,x.uid);
});

test('Steck spell lowers opposing power by 7000 until turn end',()=>{
 for(const [id,remaining] of [[BOL,0],[BIG,1000]]){
  const s=field(),own=add(s,0,'battle',F),enemy=add(s,1,'battle',id);
  const spell=play(s,STECK,1);
  assert.deepEqual(picks(s),[enemy.uid]);
  pick(s,enemy.uid);drain(s);
  assert.ok(has(s,0,'battle',own)&&has(s,0,'grave',spell));
  if(!remaining){assert.ok(has(s,1,'grave',enemy));continue;}
  assert.equal(e.power(enemy,false,s),remaining);
  s.phase='attack';act(s,'endTurn');drain(s);
  assert.equal(e.power(enemy,false,s),8000);
 }
});

test('Sadaie cannot attack and gets 4000 extra power only while blocking',()=>{
 const s=field(1),blocker=add(s,0,'battle',SAD),attacker=add(s,1,'battle','dm02-010');
 assert.equal(e.power(blocker,false,s),2000);
 assert.ok(!e.canCreatureAttack(s,0,blocker));
 attacker.buff=5000-e.power(attacker,false,s);
 attack(s,attacker.uid);act(s,'block',a=>a.uid===blocker.uid);drain(s);
 assert.ok(has(s,0,'battle',blocker)&&has(s,1,'grave',attacker));
 assert.equal(e.power(blocker,false,s),2000);
});

test('Sadaie has a free spell-only S Trigger that can return either side to the owner',()=>{
 for(const target of [0,1]){
  const s=field(1);give(s,0,'mana',[]);give(s,0,'shields',[SAD]);
  const shield=s.players[0].shields[0];
  const ally=add(s,0,'battle',W,{cardOwner:1}),attacker=add(s,1,'battle',F);
  attack(s,attacker.uid);passBlock(s);
  assert.equal(e.getLegalActions(s).filter(a=>a.kind==='useTrigger'&&a.cardId===SAD).length,1);
  act(s,'useTrigger',a=>a.cardId===SAD);
  assert.deepEqual(new Set(picks(s)),new Set([ally.uid,attacker.uid]));
  const chosen=target===0?ally:attacker;
  pick(s,chosen.uid);drain(s);
  assert.ok(has(s,1,'hand',chosen));
  assert.ok(has(s,0,'grave',shield));
  assert.ok(!has(s,target,'battle',chosen)&&!has(s,0,'battle',shield));
  assert.equal(s.metrics[0].triggers,1);
 }
});
