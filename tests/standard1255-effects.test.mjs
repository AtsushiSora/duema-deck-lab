import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const PIPE='dmrp12-078',GUNNER='dmrp21-027',SPEED='dm25rp3-070',REPRINT='dm25ex3-076';
const SMALL='dm01-108',JOKER='dmrp03-082',JOKERSEED='dmsd20-016',SEED='dmsd20-015';
const ALT='dm01-015',EVO='dm10-032',GRAVE_LOCK='dmrp20-020';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url)));
function field(active=0){
 const s=Object.assign(setup(),{active});
 for(const p of [0,1])give(s,p,'deck',Array(22).fill(SMALL));
 return s;
}
function add(s,p,z,id,fields={}){
 const x=Object.assign(inst(id),fields);
 s.players[p][z].push(x);return x;
}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const values=s=>s.decision?.choices?.map(o=>o.value?.uid??o.value)??[];
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);
const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);
const haste=(s,x)=>!!e.effectiveCard(x,s).speedAttacker;

test('four official prints resolve to three IDs with the verified ability text, stats and art',()=>{
 const m=read('tools/support-phase-1255.json'),refs=read('tools/image-reference-prints.json').prints;
 const cat=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[PIPE,GUNNER,SPEED]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[[REPRINT,SPEED]]);
 for(const {id,canonicalId=id,name,faces:[f],image} of [...m.cards,...m.printAliases]){
  const c=e.card(canonicalId);
  assert.deepEqual(cat.resolveRows([{id,count:1}]),[{id:canonicalId,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[canonicalId]);
  assert.deepEqual([c.text,c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [f.abilityText,f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  if(id===canonicalId)assert.equal(CARD_IMAGES[id],image);
  assert.equal(refs.find(x=>x.id===id&&x.canonicalId===canonicalId)?.image,image);
 }
});

test('Piper continues after returning another allied Joker creature to its owner',()=>{
 const s=field(),pipe=add(s,0,'battle',PIPE),ally=add(s,0,'battle',JOKER,{cardOwner:1});
 add(s,0,'battle',SMALL);add(s,0,'battle',JOKERSEED);add(s,1,'battle',JOKER);
 attack(s,pipe.uid);
 assert.deepEqual(values(s),[ally.uid,null]);
 pick(s,ally.uid);
 assert.ok(has(s,1,'hand',ally));
 act(s,'noBlock');drain(s);
 assert.equal(s.players[1].shields.length,4);
});

test('Piper cancels when declined or unavailable, leaves the attacker tapped, and keeps public attack triggers',()=>{
 for(const available of [false,true]){
  const s=field(),pipe=add(s,0,'battle',PIPE);
  if(available)add(s,0,'battle',JOKER,{tapped:true});
  const victim=add(s,0,'battle',SMALL);
  add(s,1,'battle','dm24rp3-022');
  attack(s,pipe.uid);
  if(available)pick(s,null);
  assert.equal(s.decision?.source,'dm24rp3-022');
  pick(s,victim.uid);drain(s);
  assert.ok(pipe.tapped&&!s.attack&&has(s,0,'grave',victim));
  assert.equal(s.players[1].shields.length,5);
 }
});

test('Piper continues after the attempted J Tornado return is replaced by EX Life',()=>{
 const s=field(),pipe=add(s,0,'battle',PIPE);
 const shield=s.players[0].shields[0],ally=add(s,0,'battle','dm26rp3-042',{exLifeShieldUid:shield.uid});
 attack(s,pipe.uid);pick(s,ally.uid);
 assert.ok(has(s,0,'battle',ally)&&has(s,0,'grave',shield));
 act(s,'noBlock');drain(s);
 assert.equal(s.players[1].shields.length,4);
});

test('Gunner can block and attack a tapped creature but cannot attack the opposing player',()=>{
 const s=field(),gunner=add(s,0,'battle',GUNNER),enemy=add(s,1,'battle',SMALL,{tapped:true});
 s.phase='attack';
 const attacks=e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===gunner.uid);
 assert.deepEqual(attacks.map(a=>a.target),[enemy.uid]);
 const defending=field(1),blocker=add(defending,0,'battle',GUNNER),attacker=add(defending,1,'battle',SMALL);
 attack(defending,attacker.uid);
 act(defending,'block',a=>a.uid===blocker.uid);drain(defending);
 assert.ok(blocker.tapped&&has(defending,1,'grave',attacker));
});

test('Gunner requires tapping an enemy for both allied evolution and Tamaseed entries',()=>{
 for(const id of [EVO,SEED]){
  const s=field(),gunner=add(s,0,'battle',GUNNER);
  const ally=add(s,0,'battle',SMALL),enemy=add(s,1,'battle',SMALL);
  const entry=add(s,0,'hand',id);
  play(s,entry);
  if(id===EVO)act(s,'evolve',a=>a.baseUid===ally.uid);
  if(s.decision?.type==='effectOrder')act(s,'orderEffect',a=>s.pendingEffects.find(x=>x.effectId===a.effectId)?.source===GUNNER);
  assert.deepEqual(values(s),[enemy.uid]);
  pick(s,enemy.uid);drain(s);
  assert.ok(enemy.tapped&&has(s,0,'battle',gunner));
 }
 const s=field(1),gunner=add(s,0,'battle',GUNNER),enemy=add(s,1,'hand',SEED);
 play(s,enemy);drain(s);
 assert.equal(gunner.tapped,false);
});

test('Speed can give itself and other allied entrants speed for this turn, for any graveyard card',()=>{
 for(const self of [false,true]){
  const s=field();
  if(!self)add(s,0,'battle',SPEED);
  const entrant=add(s,0,'hand',self?SPEED:SMALL),prior=add(s,0,'battle',SMALL);
  const payment=add(s,0,'grave',ALT);
  play(s,entrant);
  assert.deepEqual(values(s),[payment.uid,null]);
  pick(s,payment.uid);
  assert.equal(s.players[0].deck.at(-1).uid,payment.uid);
  assert.ok(haste(s,entrant)&&!haste(s,prior));
  s.phase='attack';
  assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===entrant.uid));
  act(s,'endTurn');drain(s);
  assert.equal(haste(s,entrant),false);
 }
});

test('Speed can decline, ignores opponents, and still grants speed when a graveyard lock blocks the attempted move',()=>{
 for(const mode of ['empty','decline','locked','opponent']){
  const s=field(mode==='opponent'?1:0),player=s.active;
  add(s,0,'battle',SPEED);
  if(mode==='locked')add(s,1,'battle',GRAVE_LOCK);
  const payment=mode!=='empty'&&add(s,0,'grave',ALT),entrant=add(s,player,'hand',SMALL);
  play(s,entrant);
  if(mode==='locked')pick(s,payment.uid);
  else if(mode==='decline')pick(s,null);
  else assert.equal(s.decision,null);
  assert.equal(haste(s,entrant),mode==='locked');
  if(payment)assert.ok(has(s,0,'grave',payment));
 }
});
