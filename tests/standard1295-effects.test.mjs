import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {boardChoice,manualModel,newManualUI} from '../dist/manual-ui.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';

const OTTOMAR='dm24rp1-029',METEORA='dmrp04s-058',HAYASHITSU='dmrp09-066',MORGEN='dmrp01-061';
const IDS=[OTTOMAR,METEORA,HAYASHITSU,MORGEN];
const ATTACKER='dm01-097',ALLY='dm01-108',BLOCKER='dm01-011';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url)));
const inZone=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
function add(s,p,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p].battle.push(x);
 return x;
}
function field(attacking=ATTACKER){
 const s=setup();
 s.active=0;
 return {s,a:add(s,0,attacking)};
}
function choose(s,predicate){
 act(s,'extended',a=>predicate(s.decision.choices[a.choice].value));
}
function useRedirect(s,x){
 act(s,'untapRedirect1295',a=>a.uid===x.uid);
 assert.equal(s.decision.task.op,'g16DefenseTarget1295');
 assert.equal(s.decision.player,1);
}
const targets=s=>s.decision.choices.map(({value})=>value?.uid??value);
const blocks=s=>s.log.filter(x=>x.type==='block');

test('the four official prints use their canonical IDs, complete specs, images and four-copy limits',()=>{
 const manifest=read('tools/support-phase-1295.json'),registry=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(manifest.cards.map(x=>x.id),IDS);
 assert.deepEqual(manifest.printAliases,[]);
 for(const row of manifest.cards){
  const {id,name,image,source}=row,c=e.card(id),front=row.faces[0];
  assert.deepEqual([c.cost,c.power,c.manaValue,c.civilizations,c.race,c.limit],
   [front.cost,Number(front.powerText),1,front.civilizations,front.race,4]);
  assert.equal(c.text,front.abilityText);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1295}),row.spec);
  assert.deepEqual(registry.resolveRows([{id,count:1}]),[{id,count:1}]);
  assert.equal(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).length,1);
  assert.deepEqual(refs.find(x=>x.id===id),{id,canonicalId:id,name,image,source});
  assert.equal(CARD_IMAGES[id],image);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id,count:1});
  assert.deepEqual(e.validateDeck(deck),[]);
 }
});

for(const id of IDS){
 test(id+' untaps to intercept a player attack itself or redirect it to another tapped ally',()=>{
  for(const intercept of [false,true]){
   const {s,a}=field(),source=add(s,1,id,{tapped:true});
   const ally=add(s,1,ALLY,{tapped:true});
   add(s,1,ALLY);
   add(s,0,ALLY,{tapped:true});
   attack(s,a.uid);
   useRedirect(s,source);
   assert.deepEqual(targets(s),[source.uid,ally.uid]);
   choose(s,v=>v===(intercept?source.uid:ally.uid));
   assert.equal(source.tapped,false);
   if(intercept)assert.equal(ally.tapped,true);
   assert.equal(s.players[1].shields.length,5);
   assert.equal(inZone(s,0,'grave',a),true);
   assert.equal(inZone(s,1,'grave',ally),!intercept);
   assert.equal(inZone(s,1,'battle',source),true);
   assert.deepEqual(blocks(s),[]);
  }
 });
}

test('Ottomar can tap an opposing creature when it attacks, or decline the trigger',()=>{
 for(const tap of [false,true]){
  const {s,a}=field(OTTOMAR),enemy=add(s,1,ALLY),own=add(s,0,ALLY);
  attack(s,a.uid);
  assert.equal(s.decision.player,0);
  assert.equal(s.decision.type,'extended');
  assert.ok(targets(s).includes(enemy.uid));
  assert.ok(!targets(s).includes(own.uid));
  choose(s,v=>tap?v?.uid===enemy.uid:v===null);
  assert.equal(enemy.tapped,tap);
  assert.equal(a.tapped,true);
  act(s,'noBlock');
  drain(s);
  assert.equal(s.players[1].shields.length,4);
 }
});

test('the defender may decline, and availability requires a tapped, active source that can untap',()=>{
 for(const props of [{tapped:true},{tapped:false},{tapped:true,tapLocks:[0]},{tapped:true,sealed:true},{tapped:true,g35Ignored:1}]){
  const {s,a}=field(),source=add(s,1,MORGEN,props);
  if(props.g35Ignored)source.g35Ignored=s.turn;
  if(props.sealed){
   const seal=Object.assign(inst(ALLY),{faceDown:true,sealOf:source.uid});
   s.players[1].seals=[seal];
  }
  attack(s,a.uid);
  assert.equal(e.getLegalActions(s).some(x=>x.kind==='untapRedirect1295'),Object.keys(props).length===1&&props.tapped);
  act(s,'noBlock');
  drain(s);
  assert.equal(source.tapped,props.tapped);
  assert.equal(s.players[1].shields.length,4);
 }
});

test('an unblockable attacker can be redirected, while an attacker whose target cannot change cannot',()=>{
 for(const [id,redirect] of [['dm01-081',true],['dm26ex1-N002',false]]){
  const {s,a}=field(id),source=add(s,1,METEORA,{tapped:true});
  add(s,1,BLOCKER);
  attack(s,a.uid);
  assert.ok(!e.getLegalActions(s).some(x=>x.kind==='block'));
  assert.equal(e.getLegalActions(s).some(x=>x.kind==='untapRedirect1295'),redirect);
  if(redirect){
   useRedirect(s,source);
   choose(s,v=>v===source.uid);
   assert.equal(source.tapped,false);
   assert.ok(inZone(s,0,'grave',a));
  }
 }
});

test('a creature attack can be redirected, and the current target cannot be selected again',()=>{
 for(const self of [false,true]){
  const {s,a}=field(),source=add(s,1,METEORA,{tapped:true}),ally=add(s,1,ALLY,{tapped:true});
  attack(s,a.uid,self?source.uid:ally.uid);
  useRedirect(s,source);
  assert.deepEqual(targets(s),[self?ally.uid:source.uid]);
  choose(s,v=>v===(self?ally.uid:source.uid));
  assert.equal(source.tapped,false);
  assert.equal(inZone(s,1,'grave',ally),self);
 }
});

test('the source still untaps when it is already the sole attack target',()=>{
 const {s,a}=field(),source=add(s,1,MORGEN,{tapped:true});
 attack(s,a.uid,source.uid);
 act(s,'untapRedirect1295');
 assert.equal(source.tapped,false);
 assert.ok(inZone(s,0,'grave',a));
 assert.ok(inZone(s,1,'battle',source));
 assert.ok(s.log.some(x=>x.type==='untap'&&x.cardId===MORGEN));
 assert.deepEqual(blocks(s),[]);
});

test('only a final blocker is designated when a blocker and an untap redirect are both used',()=>{
 for(const blockLast of [false,true]){
  let {s,a}=field();
  const source=add(s,1,HAYASHITSU,{tapped:true}),blocker=add(s,1,BLOCKER);
  const ordered=[{kind:'untapRedirect1295',uid:source.uid},{kind:'block',uid:blocker.uid}];
  attack(s,a.uid);
  act(s,'defendMany');
  for(const row of blockLast?ordered:ordered.toReversed())
   choose(s,v=>v?.kind===row.kind&&v.uid===row.uid);
  choose(s,v=>v===null);
  assert.equal(s.decision.task.op,'g16DefenseTarget1295');
  s=JSON.parse(JSON.stringify(s));
  choose(s,v=>v===source.uid);
  drain(s);
  assert.equal(s.players[1].battle.find(x=>x.uid===source.uid).tapped,false);
  assert.equal(s.players[1].battle.find(x=>x.uid===blocker.uid).tapped,true);
  assert.deepEqual(blocks(s).map(x=>x.cardId),blockLast?[BLOCKER]:[]);
  assert.equal(s.players[1].shields.length,5);
 }
});

test('two untap redirects resolve in the declared order and each pays its own untap',()=>{
 const {s,a}=field(),meteora=add(s,1,METEORA,{tapped:true}),morgen=add(s,1,MORGEN,{tapped:true});
 attack(s,a.uid);
 act(s,'defendMany');
 for(const x of [meteora,morgen])choose(s,v=>v?.uid===x.uid);
 choose(s,v=>v===null);
 assert.deepEqual(targets(s),[meteora.uid,morgen.uid]);
 choose(s,v=>v===meteora.uid);
 assert.deepEqual(targets(s),[morgen.uid]);
 choose(s,v=>v===morgen.uid);
 assert.equal(meteora.tapped,false);
 assert.equal(morgen.tapped,false);
 assert.deepEqual(blocks(s),[]);
 assert.ok(inZone(s,0,'grave',a));
 assert.deepEqual(s.log.filter(x=>x.type==='guardman').map(x=>x.cardId),[METEORA,MORGEN]);
});

test('the manual board offers the same redirect source and destination actions as the engine',()=>{
 const s=setup();
 s.active=1;
 const attacker=add(s,1,ATTACKER),source=add(s,0,MORGEN,{tapped:true});
 const tapped=add(s,0,ALLY,{tapped:true}),untapped=add(s,0,ALLY);
 const ui=newManualUI();
 attack(s,attacker.uid);
 assert.match(manualModel(s,ui).title,/攻撃先を変更する能力/);
 const redirect=boardChoice(s,ui,0,'battle',source.uid);
 assert.equal(redirect?.kind,'untapRedirect1295');
 e.step(s,redirect);
 assert.equal(boardChoice(s,ui,0,'battle',untapped.uid),null);
 const destination=boardChoice(s,ui,0,'battle',tapped.uid);
 assert.equal(destination?.kind,'extended');
 assert.equal(s.decision.choices[destination.choice].value,tapped.uid);
 e.step(s,destination);
 assert.ok(inZone(s,0,'grave',tapped));
});
